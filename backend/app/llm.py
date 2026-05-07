"""LLM provider interface. Pilot uses Anthropic; local-LLM impl can slot in here later."""
from __future__ import annotations

from typing import Optional, Protocol

from anthropic import Anthropic

from .config import ANTHROPIC_API_KEY, ANTHROPIC_MODEL


SYSTEM_PROMPT = """You are an analytical assistant for the user's uploaded documents (PDF, DOCX, XLSX).

You will be given the parsed contents of one or more uploaded files, plus the user's question. Answer with rigor: cite specific numbers and passages from the documents, perform calculations when asked, and clearly flag when something is not present in the documents.

When the user asks for a chart, plot, graph, or visual:
1. Pick a chart type that fits the data (bar, line, scatter, pie).
2. Emit a Plotly figure spec inside a fenced code block tagged ```chart-spec.
3. The code block must contain a single JSON object: {"data": [...], "layout": {...}}.
4. Keep titles concise; do not invent data — only chart what's in the documents.
5. You may include both a chart-spec block and a written explanation in the same answer.

If no documents have been uploaded, say so and ask the user to upload."""


class LLMClient(Protocol):
    def chat(self, system: str, messages: list[dict], model: Optional[str] = None) -> str: ...


class AnthropicClient:
    def __init__(self) -> None:
        if not ANTHROPIC_API_KEY:
            raise RuntimeError("ANTHROPIC_API_KEY is not set. Copy .env.example to .env and fill it in.")
        self._client = Anthropic(api_key=ANTHROPIC_API_KEY)
        self._default_model = ANTHROPIC_MODEL

    def chat(self, system: str, messages: list[dict], model: Optional[str] = None) -> str:
        resp = self._client.messages.create(
            model=model or self._default_model,
            max_tokens=4096,
            system=system,
            messages=messages,
        )
        parts = [b.text for b in resp.content if getattr(b, "type", "") == "text"]
        return "".join(parts)


def get_client() -> LLMClient:
    return AnthropicClient()
