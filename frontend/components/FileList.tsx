"use client";

import { useState } from "react";
import { deleteFile, type FileMeta } from "@/lib/api";

const KIND_LABEL: Record<FileMeta["kind"], string> = {
  pdf: "PDF",
  docx: "DOCX",
  xlsx: "XLSX",
};

export function FileList({
  files,
  onDeleted,
}: {
  files: FileMeta[];
  onDeleted: (fileId: string) => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function remove(f: FileMeta) {
    if (!window.confirm(`Delete ${f.filename}?`)) return;
    setBusyId(f.file_id);
    setError(null);
    try {
      await deleteFile(f.file_id);
      onDeleted(f.file_id);
    } catch (e: any) {
      setError(e?.message ?? "Failed to delete");
    } finally {
      setBusyId(null);
    }
  }

  if (files.length === 0) {
    return (
      <div className="card p-4 text-sm text-muted">No documents yet. Upload to get started.</div>
    );
  }

  return (
    <div className="card p-4">
      <h3 className="text-sm font-semibold mb-2">Documents</h3>
      <ul className="space-y-1.5">
        {files.map((f) => (
          <li key={f.file_id} className="text-sm flex items-center gap-2">
            <span className="truncate flex-1" title={f.filename}>
              {f.filename}
            </span>
            <span className="text-[11px] text-muted shrink-0">{KIND_LABEL[f.kind]}</span>
            <button
              className="icon-btn-sm text-muted hover:text-fg"
              onClick={() => remove(f)}
              disabled={busyId === f.file_id}
              aria-label={`Delete ${f.filename}`}
              title="Delete"
            >
              {busyId === f.file_id ? <span className="spinner" /> : <TrashIcon />}
            </button>
          </li>
        ))}
      </ul>
      {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
    </div>
  );
}

function TrashIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    </svg>
  );
}
