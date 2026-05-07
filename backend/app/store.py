"""Pluggable storage. Pilot uses JSON files; swap for Postgres later behind the same interface."""
from __future__ import annotations

import json
import secrets
import threading
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Optional

from .config import SESSION_DIR


SEED_USERS = {
    "testuser1@email.com": {"password": "datauser12!", "name": "Test User 1"},
    "testuser2@email.com": {"password": "datauser12!", "name": "Test User 2"},
}


@dataclass
class UploadedFile:
    file_id: str
    filename: str
    kind: str
    path: str
    extracted_text: str = ""
    tables: list[dict] = field(default_factory=list)


@dataclass
class ChatMessage:
    role: str
    content: str
    charts: list[dict] = field(default_factory=list)


@dataclass
class Session:
    user_email: str
    files: list[UploadedFile] = field(default_factory=list)
    messages: list[ChatMessage] = field(default_factory=list)


class Store:
    """In-memory + JSON-backed store. Single-process only — fine for the pilot."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._tokens: dict[str, str] = {}
        self._sessions: dict[str, Session] = {}

    def authenticate(self, email: str, password: str) -> Optional[str]:
        user = SEED_USERS.get(email)
        if not user or user["password"] != password:
            return None
        token = secrets.token_urlsafe(32)
        with self._lock:
            self._tokens[token] = email
            if email not in self._sessions:
                self._sessions[email] = self._load_session(email)
        return token

    def user_for_token(self, token: str) -> Optional[str]:
        return self._tokens.get(token)

    def logout(self, token: str) -> None:
        with self._lock:
            self._tokens.pop(token, None)

    def session(self, email: str) -> Session:
        with self._lock:
            if email not in self._sessions:
                self._sessions[email] = self._load_session(email)
            return self._sessions[email]

    def add_file(self, email: str, f: UploadedFile) -> None:
        with self._lock:
            self._sessions[email].files.append(f)
            self._persist(email)

    def delete_file(self, email: str, file_id: str) -> Optional[UploadedFile]:
        with self._lock:
            s = self._sessions.get(email)
            if not s:
                return None
            for i, f in enumerate(s.files):
                if f.file_id == file_id:
                    removed = s.files.pop(i)
                    self._persist(email)
                    return removed
        return None

    def add_message(self, email: str, m: ChatMessage) -> None:
        with self._lock:
            self._sessions[email].messages.append(m)
            self._persist(email)

    def reset_messages(self, email: str) -> None:
        with self._lock:
            self._sessions[email].messages = []
            self._persist(email)

    def _path(self, email: str) -> Path:
        safe = email.replace("/", "_").replace("\\", "_")
        return SESSION_DIR / f"{safe}.json"

    def _load_session(self, email: str) -> Session:
        p = self._path(email)
        if not p.exists():
            return Session(user_email=email)
        try:
            data = json.loads(p.read_text())
            return Session(
                user_email=email,
                files=[UploadedFile(**f) for f in data.get("files", [])],
                messages=[ChatMessage(**m) for m in data.get("messages", [])],
            )
        except Exception:
            return Session(user_email=email)

    def _persist(self, email: str) -> None:
        s = self._sessions[email]
        self._path(email).write_text(
            json.dumps(
                {
                    "files": [asdict(f) for f in s.files],
                    "messages": [asdict(m) for m in s.messages],
                },
                indent=2,
            )
        )


store = Store()
