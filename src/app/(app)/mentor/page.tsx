"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Plus, Paperclip, ArrowUp, Loader2, CornerDownLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message { id: string; role: "user" | "assistant"; content: string; }
interface Conversation { id: string; title: string; messages: Message[]; updatedAt: string; }

const SUGGESTIONS = [
  "Explain basic structure doctrine",
  "Give me 10 Prelims MCQs on Polity",
  "Mains answer framework for federalism",
  "Why-in-news: latest SC verdict",
  "Evaluate my GS-II answer",
  "Explain economy chapter from today s editorial",
];

function groupConvs(convs: Conversation[]) {
  const now = Date.now();
  const DAY = 86400000;
  const today: Conversation[] = [], week: Conversation[] = [], older: Conversation[] = [];
  for (const c of convs) {
    const age = now - new Date(c.updatedAt).getTime();
    if (age < DAY) today.push(c);
    else if (age < 7 * DAY) week.push(c);
    else older.push(c);
  }
  return { today, week, older };
}

export default function MentorPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/mentor/conversations")
      .then((r) => r.json())
      .then((data: Conversation[]) => {
        setConversations(data);
        if (data.length > 0) { setActiveId(data[0].id); setMessages(data[0].messages); }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const selectConv = useCallback((c: Conversation) => { setActiveId(c.id); setMessages(c.messages); }, []);

  const newConversation = useCallback(async () => {
    const res = await fetch("/api/mentor/conversations", { method: "POST" });
    const conv: Conversation = await res.json();
    setConversations((prev) => [conv, ...prev]);
    setActiveId(conv.id);
    setMessages([]);
  }, []);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || streaming) return;
    let convId = activeId;
    if (!convId) {
      const res = await fetch("/api/mentor/conversations", { method: "POST" });
      const conv: Conversation = await res.json();
      setConversations((prev) => [conv, ...prev]);
      convId = conv.id; setActiveId(conv.id); setMessages([]);
    }
    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setStreaming(true);
    const aiMsg: Message = { id: crypto.randomUUID(), role: "assistant", content: "" };
    setMessages((prev) => [...prev, aiMsg]);

    const res = await fetch("/api/mentor/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: convId, message: text }),
    });
    if (!res.body) { setStreaming(false); return; }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let done = false;
    while (!done) {
      const { value, done: d } = await reader.read();
      done = d;
      if (value) {
        const chunk = decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { ...copy[copy.length - 1], content: copy[copy.length - 1].content + chunk };
          return copy;
        });
      }
    }
    setStreaming(false);
    fetch("/api/mentor/conversations").then((r) => r.json()).then(setConversations);
  }, [activeId, streaming]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(input); }
  };
  const groups = groupConvs(conversations);

  return (
    <div className="mx-auto grid h-[calc(100vh-64px-3.5rem)] max-w-[1280px] grid-cols-[240px_1fr] gap-4">
      <aside className="flex flex-col overflow-hidden rounded-2xl border border-line bg-surface">
        <div className="p-3">
          <button onClick={newConversation}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-accent py-2 text-[12.5px] font-medium text-accent transition-colors hover:bg-accent/10">
            <Plus size={14} /> New conversation
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-3">
          {loading && <p className="px-2 text-[11.5px] text-ink-3">Loading...</p>}
          {[{ label: "Today", items: groups.today }, { label: "This week", items: groups.week }, { label: "Earlier", items: groups.older }]
            .map(({ label, items }) => items.length === 0 ? null : (
              <div key={label} className="mb-3">
                <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.13em] text-ink-3">{label}</p>
                {items.map((c) => (
                  <button key={c.id} onClick={() => selectConv(c)}
                    className={cn("block w-full truncate rounded-lg px-2.5 py-1.5 text-left text-[12.5px] transition-colors",
                      c.id === activeId ? "bg-accent/12 font-medium text-accent" : "text-ink-2 hover:bg-surface-2 hover:text-ink")}>
                    {c.title}
                  </button>
                ))}
              </div>
            ))}
          {!loading && conversations.length === 0 && <p className="px-2 text-[11.5px] text-ink-3">No conversations yet.</p>}
        </div>
      </aside>

      <section className="flex flex-col overflow-hidden rounded-2xl border border-line bg-surface">
        <div className="flex-1 overflow-y-auto px-8 py-7 space-y-7">
          {messages.length === 0 && !streaming && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <span className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-accent to-accent-2 font-display text-[22px] font-semibold text-white">ल</span>
              <h3 className="font-display text-[20px] font-semibold text-ink">Lakshya UPSC Mentor</h3>
              <p className="mt-2 max-w-sm text-[13px] text-ink-2">Ask anything — a concept, a PYQ, an editorial, or paste your mains answer for evaluation.</p>
            </div>
          )}
          {messages.map((m) => m.role === "user"
            ? <UserMsg key={m.id}>{m.content}</UserMsg>
            : <AiMsg key={m.id} content={m.content} isStreaming={streaming && m === messages[messages.length - 1]} />
          )}
          <div ref={bottomRef} />
        </div>
        <div className="border-t border-line bg-bg-subtle px-6 py-4">
          <div className="mb-2.5 flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => { void send(s); }}
                className="rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[11.5px] text-ink-2 transition-colors hover:border-accent/50 hover:bg-accent/8 hover:text-accent">
                {s}
              </button>
            ))}
          </div>
          <div className="flex items-end gap-2 rounded-xl border border-line bg-surface p-2.5 focus-within:border-accent/50">
            <button className="grid h-8 w-8 place-items-center rounded-lg text-ink-3 hover:text-ink"><Paperclip size={15} /></button>
            <textarea rows={1} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKey}
              placeholder="Ask anything — concept, PYQ, editorial, answer evaluation..."
              className="max-h-40 flex-1 resize-none bg-transparent py-1.5 text-[13.5px] text-ink outline-none placeholder:text-ink-3" />
            <button onClick={() => { void send(input); }} disabled={streaming || !input.trim()}
              className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-white transition-all hover:scale-105 disabled:opacity-40">
              {streaming ? <Loader2 size={15} className="animate-spin" /> : <ArrowUp size={15} strokeWidth={2.5} />}
            </button>
          </div>
          <div className="mt-2 flex items-center justify-between px-1 text-[10.5px] text-ink-3">
            <span>Model: <strong className="text-ink-2">claude-sonnet-4-6</strong> · UPSC-grounded</span>
            <span className="flex items-center gap-1"><CornerDownLeft size={11} /> Enter to send</span>
          </div>
        </div>
      </section>
    </div>
  );
}

function UserMsg({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex max-w-3xl gap-3.5">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface-2 text-[11px] font-semibold text-ink-2">SP</span>
      <div>
        <p className="mb-1 text-[12px] font-semibold text-ink">You</p>
        <p className="text-[13.5px] leading-relaxed text-ink-2 whitespace-pre-wrap">{children}</p>
      </div>
    </div>
  );
}

function AiMsg({ content, isStreaming }: { content: string; isStreaming: boolean }) {
  return (
    <div className="flex max-w-3xl gap-3.5">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-accent to-accent-2 font-display text-[13px] font-semibold text-white">ल</span>
      <div className="min-w-0 flex-1">
        <p className="mb-1.5 text-[12px] font-semibold text-ink">Lakshya <span className="ml-1.5 text-[10px] font-normal uppercase tracking-[0.1em] text-ink-3">UPSC Mentor</span></p>
        <div className="prose-os text-[13.5px] whitespace-pre-wrap">
          {content}
          {isStreaming && <span className="ml-0.5 inline-block h-3.5 w-0.5 animate-pulse bg-accent align-middle" />}
        </div>
      </div>
    </div>
  );
}
