"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  getModels,
  resetChat,
  sendChat,
  type ChatMessage,
  type ChartSpec,
  type ModelOption,
} from "@/lib/api";

const MODEL_PREF_KEY = "preferred_model";

export function ChatPanel({
  initial,
  onChartsUpdated,
  onViewDashboard,
}: {
  initial: ChatMessage[];
  onChartsUpdated: (charts: { spec: ChartSpec; from: string }[]) => void;
  onViewDashboard: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initial);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [models, setModels] = useState<ModelOption[]>([]);
  const [model, setModel] = useState<string>("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getModels()
      .then(({ models }) => {
        setModels(models);
        const saved = typeof window !== "undefined" ? localStorage.getItem(MODEL_PREF_KEY) : null;
        const valid = saved && models.some((m) => m.id === saved) ? saved : null;
        const fallback = models.find((m) => m.default)?.id ?? models[0]?.id ?? "";
        setModel(valid ?? fallback);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  useEffect(() => {
    const all = messages
      .filter((m) => m.role === "assistant")
      .flatMap((m, i) =>
        (m.charts ?? []).map((c) => ({ spec: c, from: `Reply ${i + 1}` })),
      );
    onChartsUpdated(all);
  }, [messages, onChartsUpdated]);

  function onModelChange(id: string) {
    setModel(id);
    if (typeof window !== "undefined") localStorage.setItem(MODEL_PREF_KEY, id);
  }

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    const userMsg: ChatMessage = { role: "user", content: text, charts: [] };
    setMessages((m) => [...m, userMsg]);
    setBusy(true);
    try {
      const { message } = await sendChat(text, model || undefined);
      setMessages((m) => [...m, message]);
    } catch (e: any) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: `Error: ${e?.message ?? "request failed"}`, charts: [] },
      ]);
    } finally {
      setBusy(false);
    }
  }

  async function clear() {
    await resetChat();
    setMessages([]);
  }

  const activeModel = models.find((m) => m.id === model);

  return (
    <div className="card flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h2 className="font-semibold">Chat</h2>
        <button className="btn-ghost text-xs" onClick={clear} disabled={busy}>
          Clear
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <p className="text-sm text-muted">
            Ask anything about your uploaded documents — summaries, comparisons, calculations,
            or charts.
          </p>
        )}
        {messages.map((m, i) => (
          <MessageBubble key={i} msg={m} onViewDashboard={onViewDashboard} />
        ))}
        {busy && (
          <p className="text-sm text-muted flex items-center gap-2">
            <span className="spinner" /> Thinking…
          </p>
        )}
        <div ref={endRef} />
      </div>
      <div className="border-t border-border p-3 space-y-2">
        <div className="flex items-center gap-2">
          <input
            className="input"
            placeholder="Ask about your documents…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            disabled={busy}
          />
          <button className="btn-primary" onClick={send} disabled={busy}>
            Send
          </button>
        </div>
        <div className="flex items-center justify-between gap-2">
          <label className="flex items-center gap-2 text-xs text-muted">
            Model
            <select
              className="bg-panel border border-border rounded-md px-2 py-1 text-xs text-fg focus:outline-none focus:border-accent"
              value={model}
              onChange={(e) => onModelChange(e.target.value)}
              disabled={busy || models.length === 0}
            >
              {models.length === 0 && <option value="">Loading…</option>}
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                  {m.default ? " (default)" : ""}
                </option>
              ))}
            </select>
          </label>
          {activeModel && <span className="text-xs text-muted truncate">{activeModel.hint}</span>}
        </div>
      </div>
    </div>
  );
}

function MessageBubble({
  msg,
  onViewDashboard,
}: {
  msg: ChatMessage;
  onViewDashboard: () => void;
}) {
  const isUser = msg.role === "user";
  const chartCount = msg.charts?.length ?? 0;

  return (
    <div className={isUser ? "text-right" : "text-left"}>
      <div
        className={
          "inline-block max-w-[90%] rounded-lg px-3 py-2 text-left " +
          (isUser
            ? "bg-accent text-white whitespace-pre-wrap text-sm"
            : "bg-bg border border-border")
        }
      >
        {isUser ? (
          msg.content
        ) : (
          <div className="markdown">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
          </div>
        )}
        {!isUser && chartCount > 0 && (
          <div className="mt-2">
            <button className="btn-ghost text-xs" onClick={onViewDashboard}>
              View {chartCount} chart{chartCount === 1 ? "" : "s"} on Dashboard →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
