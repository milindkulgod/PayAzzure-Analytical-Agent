"""Chat orchestration: build prompt from session files + history, call LLM, extract chart specs."""
from __future__ import annotations

import json
import re

from .llm import SYSTEM_PROMPT, get_client
from .store import ChatMessage, Session


CHART_BLOCK = re.compile(r"```chart-spec\s*(\{.*?\})\s*```", re.DOTALL)


def build_documents_context(session: Session) -> str:
    if not session.files:
        return "(no documents uploaded yet)"
    chunks = []
    for f in session.files:
        chunks.append(
            f"=== FILE: {f.filename} (kind={f.kind}, id={f.file_id}) ===\n{f.extracted_text}"
        )
    return "\n\n".join(chunks)


def build_messages(session: Session, user_message: str) -> list[dict]:
    docs = build_documents_context(session)
    history = [{"role": m.role, "content": m.content} for m in session.messages]
    history.append(
        {
            "role": "user",
            "content": f"<documents>\n{docs}\n</documents>\n\n<question>\n{user_message}\n</question>",
        }
    )
    return history


def extract_charts(text: str) -> tuple[str, list[dict]]:
    charts: list[dict] = []
    for match in CHART_BLOCK.finditer(text):
        try:
            charts.append(json.loads(match.group(1)))
        except json.JSONDecodeError:
            continue
    cleaned = CHART_BLOCK.sub("[chart rendered above]", text).strip()
    return cleaned, charts


def answer(session: Session, user_message: str) -> ChatMessage:
    client = get_client()
    raw = client.chat(SYSTEM_PROMPT, build_messages(session, user_message))
    text, charts = extract_charts(raw)
    return ChatMessage(role="assistant", content=text, charts=charts)
