const BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

export type ChartSpec = { data: any[]; layout: any };

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  charts: ChartSpec[];
};

export type FileMeta = {
  file_id: string;
  filename: string;
  kind: "pdf" | "docx" | "xlsx";
  tables: { sheet: string; rows: number; cols: number; columns: string[] }[];
};

export type SessionPayload = {
  files: FileMeta[];
  messages: ChatMessage[];
};

export type ModelOption = {
  id: string;
  label: string;
  hint: string;
  default: boolean;
};

function token(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

function authHeaders(): HeadersInit {
  const t = token();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function handle<T>(r: Response): Promise<T> {
  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new Error(text || `HTTP ${r.status}`);
  }
  return (await r.json()) as T;
}

export async function login(email: string, password: string) {
  const r = await fetch(`${BASE}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await handle<{ token: string; user: { email: string }; session: SessionPayload }>(r);
  localStorage.setItem("token", data.token);
  localStorage.setItem("email", data.user.email);
  return data;
}

export async function logout() {
  try {
    await fetch(`${BASE}/api/logout`, { method: "POST", headers: authHeaders() });
  } finally {
    localStorage.removeItem("token");
    localStorage.removeItem("email");
  }
}

export async function getSession() {
  const r = await fetch(`${BASE}/api/session`, { headers: authHeaders() });
  return handle<SessionPayload>(r);
}

export async function deleteFile(fileId: string) {
  const r = await fetch(`${BASE}/api/files/${encodeURIComponent(fileId)}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return handle<{ ok: true }>(r);
}

export async function uploadFile(file: File) {
  const fd = new FormData();
  fd.append("file", file);
  const r = await fetch(`${BASE}/api/upload`, {
    method: "POST",
    headers: authHeaders(),
    body: fd,
  });
  return handle<{ file: FileMeta }>(r);
}

export async function sendChat(message: string, model?: string) {
  const r = await fetch(`${BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ message, model }),
  });
  return handle<{ message: ChatMessage }>(r);
}

export async function getModels() {
  const r = await fetch(`${BASE}/api/models`, { headers: authHeaders() });
  return handle<{ models: ModelOption[] }>(r);
}

export async function resetChat() {
  const r = await fetch(`${BASE}/api/chat/reset`, { method: "POST", headers: authHeaders() });
  return handle<{ ok: true }>(r);
}

export function getEmail(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("email");
}

export function isLoggedIn(): boolean {
  return !!token();
}
