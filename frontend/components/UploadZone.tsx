"use client";

import { useEffect, useRef, useState } from "react";
import { uploadFile, type FileMeta } from "@/lib/api";

const ACCEPT = ".pdf,.docx,.xlsx";

type Status = "pending" | "success" | "error";
type Job = { id: number; name: string; status: Status; error?: string };

export function UploadZone({ onUploaded }: { onUploaded: (f: FileMeta) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const seq = useRef(0);

  useEffect(() => {
    if (!confirmation) return;
    const t = setTimeout(() => setConfirmation(null), 3500);
    return () => clearTimeout(t);
  }, [confirmation]);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;

    const newJobs: Job[] = Array.from(files).map((f) => ({
      id: ++seq.current,
      name: f.name,
      status: "pending",
    }));
    setJobs((prev) => [...prev, ...newJobs]);

    let succeeded = 0;
    let failed = 0;

    for (const [idx, f] of Array.from(files).entries()) {
      const jobId = newJobs[idx].id;
      try {
        const { file } = await uploadFile(f);
        onUploaded(file);
        succeeded += 1;
        setJobs((prev) =>
          prev.map((j) => (j.id === jobId ? { ...j, status: "success" } : j)),
        );
      } catch (e: any) {
        failed += 1;
        setJobs((prev) =>
          prev.map((j) =>
            j.id === jobId ? { ...j, status: "error", error: e?.message ?? "failed" } : j,
          ),
        );
      }
    }

    if (inputRef.current) inputRef.current.value = "";

    if (succeeded > 0 && failed === 0) {
      setConfirmation(`${succeeded} file${succeeded === 1 ? "" : "s"} uploaded successfully`);
    } else if (succeeded > 0 && failed > 0) {
      setConfirmation(`${succeeded} uploaded · ${failed} failed`);
    } else if (failed > 0) {
      setConfirmation(`Upload failed`);
    }

    // remove successful jobs from the queue after a short delay
    setTimeout(() => {
      setJobs((prev) => prev.filter((j) => j.status !== "success"));
    }, 2500);
  }

  const inFlight = jobs.some((j) => j.status === "pending");

  return (
    <div className="card p-4 space-y-3">
      <div
        className={
          "border-2 border-dashed rounded-md p-6 text-center cursor-pointer transition " +
          "border-border hover:border-accent " +
          (inFlight ? "opacity-70" : "")
        }
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFiles(e.dataTransfer.files);
        }}
      >
        <p className="text-sm">
          {inFlight ? "Uploading…" : "Drag & drop or click to upload PDF / DOCX / XLSX"}
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

      {jobs.length > 0 && (
        <ul className="space-y-1.5">
          {jobs.map((j) => (
            <li key={j.id} className="text-xs flex items-center gap-2">
              <StatusIcon status={j.status} />
              <span className="truncate flex-1" title={j.name}>{j.name}</span>
              <span
                className={
                  "text-[11px] " +
                  (j.status === "error" ? "text-red-400" : "text-muted")
                }
              >
                {j.status === "pending"
                  ? "uploading"
                  : j.status === "success"
                    ? "done"
                    : (j.error ?? "failed")}
              </span>
            </li>
          ))}
        </ul>
      )}

      {confirmation && (
        <div
          className="text-xs rounded-md px-3 py-2 border"
          style={{
            background: "color-mix(in srgb, var(--accent) 12%, var(--panel))",
            borderColor: "var(--accent)",
          }}
        >
          {confirmation}
        </div>
      )}
    </div>
  );
}

function StatusIcon({ status }: { status: Status }) {
  if (status === "pending") return <span className="spinner" />;
  if (status === "success")
    return (
      <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-[10px]" style={{ background: "var(--accent)", color: "white" }}>
        ✓
      </span>
    );
  return (
    <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-[10px] bg-red-500 text-white">
      !
    </span>
  );
}
