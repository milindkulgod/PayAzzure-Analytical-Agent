from __future__ import annotations

import secrets
from dataclasses import asdict
from pathlib import Path

from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from . import chat as chat_svc
from .config import CORS_ORIGIN, UPLOAD_DIR
from .parsers import parse
from .store import ChatMessage, UploadedFile, store


app = FastAPI(title="PayAzzure Analytical Agent — Pilot")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[CORS_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


KIND_BY_EXT = {".pdf": "pdf", ".docx": "docx", ".xlsx": "xlsx"}


class LoginBody(BaseModel):
    email: str
    password: str


def current_user(authorization: str | None = Header(default=None)) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Missing or invalid Authorization header")
    token = authorization.split(" ", 1)[1].strip()
    user = store.user_for_token(token)
    if not user:
        raise HTTPException(401, "Invalid or expired token")
    return user


@app.post("/api/login")
def login(body: LoginBody):
    token = store.authenticate(body.email, body.password)
    if not token:
        raise HTTPException(401, "Invalid credentials")
    s = store.session(body.email)
    return {"token": token, "user": {"email": body.email}, "session": _session_payload(s)}


@app.post("/api/logout")
def logout(authorization: str | None = Header(default=None)):
    if authorization and authorization.lower().startswith("bearer "):
        store.logout(authorization.split(" ", 1)[1].strip())
    return {"ok": True}


@app.get("/api/session")
def get_session(user: str = Depends(current_user)):
    return _session_payload(store.session(user))


@app.post("/api/upload")
async def upload(file: UploadFile = File(...), user: str = Depends(current_user)):
    suffix = Path(file.filename or "").suffix.lower()
    kind = KIND_BY_EXT.get(suffix)
    if not kind:
        raise HTTPException(400, f"Unsupported file type: {suffix}. Allowed: pdf, docx, xlsx")

    file_id = secrets.token_hex(8)
    user_dir = UPLOAD_DIR / user.replace("/", "_")
    user_dir.mkdir(parents=True, exist_ok=True)
    dest = user_dir / f"{file_id}{suffix}"
    dest.write_bytes(await file.read())

    try:
        text, tables = parse(dest, kind)
    except Exception as e:
        dest.unlink(missing_ok=True)
        raise HTTPException(400, f"Failed to parse file: {e}")

    f = UploadedFile(
        file_id=file_id,
        filename=file.filename or dest.name,
        kind=kind,
        path=str(dest),
        extracted_text=text,
        tables=tables,
    )
    store.add_file(user, f)
    return {"file": _file_payload(f)}


class ChatBody(BaseModel):
    message: str


@app.post("/api/chat")
def post_chat(body: ChatBody, user: str = Depends(current_user)):
    if not body.message.strip():
        raise HTTPException(400, "Empty message")
    session = store.session(user)
    user_msg = ChatMessage(role="user", content=body.message)
    store.add_message(user, user_msg)
    try:
        reply = chat_svc.answer(session, body.message)
    except Exception as e:
        raise HTTPException(500, f"LLM call failed: {e}")
    store.add_message(user, reply)
    return {"message": asdict(reply)}


@app.post("/api/chat/reset")
def reset_chat(user: str = Depends(current_user)):
    store.reset_messages(user)
    return {"ok": True}


@app.get("/api/health")
def health():
    return {"ok": True}


def _file_payload(f: UploadedFile) -> dict:
    return {
        "file_id": f.file_id,
        "filename": f.filename,
        "kind": f.kind,
        "tables": f.tables,
    }


def _session_payload(s) -> dict:
    return {
        "files": [_file_payload(f) for f in s.files],
        "messages": [asdict(m) for m in s.messages],
    }
