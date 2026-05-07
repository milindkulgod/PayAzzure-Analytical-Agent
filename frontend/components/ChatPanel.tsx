"use client";

import { useEffect, useRef, useState } from "react";
import { sendChat, resetChat, type ChatMessage } from "@/lib/api";
import { ChartCard } from "./ChartCard";

export function ChatPanel({
  initial,
  onChartsUpdated,
}: {
  initial: ChatMessage[];
  onChartsUpdated: (charts: { spec: any; from: string }[]) => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initial);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

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

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    const userMsg: ChatMessage = { role: "user", content: text, charts: [] };
    setMessages((m) => [...m, userMsg]);
    setBusy(true);
    try {
      const { message } = await sendChat(text);
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
          <MessageBubble key={i} msg={m} />
        ))}
        {busy && <p className="text-sm text-muted">Thinking…</p>}
        <div ref={endRef} />
      </div>
      <div className="border-t border-border p-3 flex gap-2">
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
    </div>
  );
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === "user";
  return (
    <div className={isUser ? "text-right" : "text-left"}>
      <div
        className={
          "inline-block max-w-[90%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap " +
          (isUser ? "bg-accent text-black" : "bg-bg border border-border")
        }
      >
        {msg.content}
      </div>
      {!isUser && msg.charts?.length > 0 && (
        <div className="mt-2">
          {msg.charts.map((spec, i) => (
            <ChartCard key={i} spec={spec} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
