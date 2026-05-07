"use client";

import { useRef, useState } from "react";
import { uploadFile, type FileMeta } from "@/lib/api";

const ACCEPT = ".pdf,.docx,.xlsx";

export function UploadZone({ onUploaded }: { onUploaded: (f: FileMeta) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    setBusy(true);
    try {
      for (const f of Array.from(files)) {
        const { file } = await uploadFile(f);
        onUploaded(file);
      }
    } catch (e: any) {
      setError(e?.message ?? "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="card p-4">
      <div
        className="border-2 border-dashed border-border rounded-md p-6 text-center cursor-pointer hover:border-accent"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFiles(e.dataTransfer.files);
        }}
      >
        <p className="text-sm">
          {busy ? "Uploading…" : "Drag & drop or click to upload PDF / DOCX / XLSX"}
        </p>
        <p className="text-xs text-muted mt-1">Multiple files supported</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      {error && <p className="text-sm text-red-400 mt-2">{error}</p>}
    </div>
  );
}
