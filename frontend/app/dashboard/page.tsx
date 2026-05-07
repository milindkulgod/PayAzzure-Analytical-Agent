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
import { ThemeToggle } from "@/components/ThemeToggle";

type Tab = "chat" | "dashboard";

export default function DashboardPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [files, setFiles] = useState<FileMeta[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [charts, setCharts] = useState<{ spec: ChartSpec; from: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("chat");

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

  const goDashboard = useCallback(() => setTab("dashboard"), []);

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
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button className="btn-ghost text-xs" onClick={onLogout}>
            Sign out
          </button>
        </div>
      </header>

      <nav className="flex items-center gap-2 px-6 py-3 border-b border-border">
        <button
          className="tab"
          data-active={tab === "chat"}
          onClick={() => setTab("chat")}
        >
          Chat
        </button>
        <button
          className="tab"
          data-active={tab === "dashboard"}
          onClick={() => setTab("dashboard")}
        >
          Dashboard{charts.length > 0 ? ` (${charts.length})` : ""}
        </button>
      </nav>

      <div className="flex-1 p-4">
        {tab === "chat" ? (
          <div className="grid grid-cols-12 gap-4 h-[calc(100vh-9rem)]">
            <aside className="col-span-12 lg:col-span-3 space-y-4 overflow-y-auto">
              <UploadZone onUploaded={onUploaded} />
              <FileList files={files} />
            </aside>
            <section className="col-span-12 lg:col-span-9 h-full">
              <ChatPanel
                initial={messages}
                onChartsUpdated={onChartsUpdated}
                onViewDashboard={goDashboard}
              />
            </section>
          </div>
        ) : (
          <DashboardTab charts={charts} onBackToChat={() => setTab("chat")} />
        )}
      </div>
    </main>
  );
}

function DashboardTab({
  charts,
  onBackToChat,
}: {
  charts: { spec: ChartSpec; from: string }[];
  onBackToChat: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Dashboard</h2>
        <button className="btn-ghost text-xs" onClick={onBackToChat}>
          ← Back to chat
        </button>
      </div>

      {charts.length === 0 ? (
        <div className="card p-8 text-center text-sm text-muted">
          No charts yet. Ask the agent to plot something — e.g.{" "}
          <em>&ldquo;Plot total revenue by month&rdquo;</em> — and it&apos;ll appear here.
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {charts.map((c, i) => (
            <div key={i} className="space-y-1">
              <p className="text-xs text-muted">{c.from}</p>
              <ChartCard spec={c.spec} index={i} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
