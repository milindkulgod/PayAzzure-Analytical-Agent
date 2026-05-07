"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getEmail,
  getSession,
  isLoggedIn,
  logout,
  type ChartSpec,
  type ChatMessage,
  type FileMeta,
} from "@/lib/api";
import { UploadZone } from "@/components/UploadZone";
import { FileList } from "@/components/FileList";
import { ChatPanel } from "@/components/ChatPanel";
import { ChartCard } from "@/components/ChartCard";

export default function DashboardPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [files, setFiles] = useState<FileMeta[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [charts, setCharts] = useState<{ spec: ChartSpec; from: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace("/login");
      return;
    }
    setEmail(getEmail());
    getSession()
      .then((s) => {
        setFiles(s.files);
        setMessages(s.messages);
      })
      .catch(() => router.replace("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  const onUploaded = useCallback((f: FileMeta) => {
    setFiles((prev) => [...prev, f]);
  }, []);

  const onChartsUpdated = useCallback((c: { spec: ChartSpec; from: string }[]) => {
    setCharts(c);
  }, []);

  async function onLogout() {
    await logout();
    router.replace("/login");
  }

  if (loading) {
    return <main className="p-6 text-muted">Loading…</main>;
  }

  const greeting = `Hello, ${email?.split("@")[0] ?? "there"} 👋`;

  return (
    <main className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div>
          <h1 className="text-xl font-semibold">PayAzzure Analytical Agent</h1>
          <p className="text-sm text-muted">{greeting}</p>
        </div>
        <button className="btn-ghost text-xs" onClick={onLogout}>
          Sign out
        </button>
      </header>

      <div className="flex-1 grid grid-cols-12 gap-4 p-4">
        <aside className="col-span-12 lg:col-span-3 space-y-4">
          <UploadZone onUploaded={onUploaded} />
          <FileList files={files} />
        </aside>

        <section className="col-span-12 lg:col-span-5">
          <h2 className="text-sm font-semibold mb-2">Dashboard</h2>
          {charts.length === 0 ? (
            <div className="card p-6 text-sm text-muted">
              Charts you ask the agent for will appear here. Try:{" "}
              <em>&ldquo;Plot total revenue by month&rdquo;</em>.
            </div>
          ) : (
            <div className="space-y-3">
              {charts.map((c, i) => (
                <div key={i}>
                  <p className="text-xs text-muted mb-1">{c.from}</p>
                  <ChartCard spec={c.spec} index={i} />
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="col-span-12 lg:col-span-4 h-[80vh]">
          <ChatPanel initial={messages} onChartsUpdated={onChartsUpdated} />
        </section>
      </div>
    </main>
  );
}
