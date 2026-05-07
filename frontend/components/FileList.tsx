import type { FileMeta } from "@/lib/api";

const KIND_LABEL: Record<FileMeta["kind"], string> = {
  pdf: "PDF",
  docx: "DOCX",
  xlsx: "XLSX",
};

export function FileList({ files }: { files: FileMeta[] }) {
  if (files.length === 0) {
    return (
      <div className="card p-4 text-sm text-muted">No documents yet. Upload to get started.</div>
    );
  }
  return (
    <div className="card p-4">
      <h3 className="text-sm font-semibold mb-2">Documents</h3>
      <ul className="space-y-2">
        {files.map((f) => (
          <li key={f.file_id} className="text-sm flex items-start justify-between gap-2">
            <span className="truncate">{f.filename}</span>
            <span className="text-xs text-muted shrink-0">{KIND_LABEL[f.kind]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
