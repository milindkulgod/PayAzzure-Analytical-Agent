"""Document parsing. Returns extracted text and (for spreadsheets) lightweight table summaries."""
from __future__ import annotations

from pathlib import Path

import pdfplumber
import pandas as pd
from docx import Document


MAX_TEXT_CHARS = 200_000  # hard cap per file to keep prompts manageable


def parse(path: Path, kind: str) -> tuple[str, list[dict]]:
    if kind == "pdf":
        return _pdf(path), []
    if kind == "docx":
        return _docx(path), []
    if kind == "xlsx":
        return _xlsx(path)
    raise ValueError(f"Unsupported file kind: {kind}")


def _pdf(path: Path) -> str:
    out = []
    with pdfplumber.open(path) as pdf:
        for i, page in enumerate(pdf.pages, start=1):
            text = page.extract_text() or ""
            out.append(f"--- Page {i} ---\n{text}")
    return _trim("\n\n".join(out))


def _docx(path: Path) -> str:
    doc = Document(str(path))
    paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
    tables = []
    for t in doc.tables:
        rows = []
        for row in t.rows:
            rows.append(" | ".join(cell.text.strip() for cell in row.cells))
        tables.append("\n".join(rows))
    return _trim("\n\n".join(paragraphs + tables))


def _xlsx(path: Path) -> tuple[str, list[dict]]:
    sheets = pd.read_excel(path, sheet_name=None, engine="openpyxl")
    text_parts: list[str] = []
    table_summaries: list[dict] = []
    for name, df in sheets.items():
        df = df.dropna(how="all").dropna(axis=1, how="all")
        preview = df.head(50).to_csv(index=False)
        text_parts.append(f"--- Sheet: {name} ---\nShape: {df.shape}\nColumns: {list(df.columns)}\n\n{preview}")
        table_summaries.append(
            {
                "sheet": name,
                "rows": int(df.shape[0]),
                "cols": int(df.shape[1]),
                "columns": [str(c) for c in df.columns],
            }
        )
    return _trim("\n\n".join(text_parts)), table_summaries


def _trim(s: str) -> str:
    return s if len(s) <= MAX_TEXT_CHARS else s[:MAX_TEXT_CHARS] + "\n... [truncated]"
