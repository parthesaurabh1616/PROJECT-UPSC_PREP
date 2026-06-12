"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Plus, Paperclip, ArrowUp, Loader2, CornerDownLeft, Zap, Brain } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message { id: string; role: "user" | "assistant"; content: string; }
interface Conversation { id: string; title: string; messages: Message[]; updatedAt: string; }

type ModelId = "gemini-2.5-flash" | "llama-3.3-70b-versatile";

const MODELS: Record<ModelId, { label: string; badge: string; description: string; icon: React.ElementType; badgeClass: string; note?: string }> = {
  "llama-3.3-70b-versatile": {
    label: "Llama 3.3 70B",
    badge: "Fast",
    description: "Ultra-fast via Groq — 500+ tokens/sec",
    icon: Zap,
    badgeClass: "bg-success/15 text-success border-success/30",
  },
  "gemini-2.5-flash": {
    label: "Gemini 2.0 Flash",
    badge: "Deep",
    description: "NCERTs, books, long docs — 1M token context",
    icon: Brain,
    badgeClass: "bg-accent-2/15 text-accent-2 border-accent-2/30",
    note: "Resets daily — use for NCERT/book analysis",
  },
};

const SUGGESTIONS = [
  "Explain basic structure doctrine",
  "Generate 10 Prelims MCQs on Polity",
  "Mains answer framework for federalism",
  "Summarise NCERT Economy Ch.3",
  "Evaluate my GS-II answer",
  "Today's editorial UPSC angle",
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
  const [modelId, setModelId] = useState<ModelId>("llama-3.3-70b-versatile");
  const [showModelPicker, setShowModelPicker] = useState(false);
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
      body: JSON.stringify({ conversationId: convId, message: text, modelId }),
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
  }, [activeId, streaming, modelId]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(input); }
  };

  const groups = groupConvs(conversations);
  const currentModel = MODELS[modelId];
  const ModelIcon = currentModel.icon;

  return (
    <div className="mx-auto grid h-[calc(100vh-56px-3rem)] max-w-[1280px] grid-cols-[240px_1fr] gap-4">
      {/* Sidebar */}
      <aside className="flex flex-col overflow-hidden rounded-2xl border border-line bg-surface">
        <div className="p-3">
          <button onClick={newConversation}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-accent py-2 text-[12.5px] font-medium text-accent transition-colors hover:bg-accent/10">
            <Plus size={14} /> New conversation
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-3">
          {loading && <p className="px-2 text-[11.5px] text-ink-3 py-2">Loading...</p>}
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
          {!loading && conversations.length === 0 && <p className="px-2 text-[11.5px] text-ink-3 py-2">No conversations yet.</p>}
        </div>
      </aside>

      {/* Chat */}
      <section className="flex flex-col overflow-hidden rounded-2xl border border-line bg-surface">
        {/* Top model badge */}
        <div className="flex items-center justify-between border-b border-line px-6 py-2.5">
          <div className="flex items-center gap-2 text-[11px] text-ink-3">
            <ModelIcon size={13} className={modelId === "gemini-2.5-flash" ? "text-accent-2" : "text-success"} />
            <span className="font-medium text-ink-2">{currentModel.label}</span>
            <span className={cn("rounded-full border px-2 py-0.5 text-[9.5px] uppercase tracking-widest", currentModel.badgeClass)}>
              {currentModel.badge}
            </span>
            <span className="text-ink-3">· {currentModel.description}</span>
          </div>
          <div className="relative">
            <button onClick={() => setShowModelPicker(!showModelPicker)}
              className="rounded-lg border border-line px-2.5 py-1 text-[11px] text-ink-2 hover:border-accent/40 hover:text-ink transition-colors">
              Switch model
            </button>
            {showModelPicker && (
              <div className="absolute right-0 top-full z-50 mt-1.5 w-72 rounded-xl border border-line bg-surface shadow-soft">
                {(Object.entries(MODELS) as [ModelId, typeof MODELS[ModelId]][]).map(([id, m]) => {
                  const Icon = m.icon;
                  return (
                    <button key={id} onClick={() => { setModelId(id); setShowModelPicker(false); }}
                      className={cn("flex w-full items-start gap-3 px-4 py-3 text-left transition-colors first:rounded-t-xl last:rounded-b-xl hover:bg-surface-2",
                        id === modelId && "bg-accent/8")}>
                      <Icon size={16} className={id === "gemini-2.5-flash" ? "mt-0.5 shrink-0 text-accent-2" : "mt-0.5 shrink-0 text-success"} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-semibold text-ink">{m.label}</span>
                          <span className={cn("rounded-full border px-1.5 py-0.5 text-[9px] uppercase tracking-widest", m.badgeClass)}>{m.badge}</span>
                        </div>
                        <p className="mt-0.5 text-[11.5px] text-ink-3">{m.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-8 py-7 space-y-7" onClick={() => setShowModelPicker(false)}>
          {messages.length === 0 && !streaming && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <span className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-accent to-accent-2 font-display text-[22px] font-semibold text-white">ल</span>
              <h3 className="font-display text-[20px] font-semibold text-ink">Lakshya UPSC Mentor</h3>
              <p className="mt-2 max-w-sm text-[13px] text-ink-2">
                Ask anything — concept, PYQ, editorial, NCERT, or paste your mains answer for evaluation.
              </p>
              <div className="mt-4 flex items-center gap-2 text-[11px]">
                <span className={cn("rounded-full border px-2 py-1", MODELS["gemini-2.5-flash"].badgeClass)}>Gemini: Deep analysis + 1M context</span>
                <span className={cn("rounded-full border px-2 py-1", MODELS["llama-3.3-70b-versatile"].badgeClass)}>Groq: 500+ tokens/sec</span>
              </div>
            </div>
          )}
          {messages.map((m) => m.role === "user"
            ? <UserMsg key={m.id}>{m.content}</UserMsg>
            : <AiMsg key={m.id} content={m.content} modelId={modelId} isStreaming={streaming && m === messages[messages.length - 1]} />
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
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
              placeholder="Ask anything — concept, PYQ, editorial, NCERT content, answer evaluation..."
              className="max-h-40 flex-1 resize-none bg-transparent py-1.5 text-[13.5px] text-ink outline-none placeholder:text-ink-3" />
            <button onClick={() => { void send(input); }} disabled={streaming || !input.trim()}
              className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-white transition-all hover:scale-105 disabled:opacity-40">
              {streaming ? <Loader2 size={15} className="animate-spin" /> : <ArrowUp size={15} strokeWidth={2.5} />}
            </button>
          </div>
          <div className="mt-2 flex items-center justify-between px-1 text-[10.5px] text-ink-3">
            <span>
              Using: <strong className="text-ink-2">{currentModel.label}</strong>
              <span className={cn("ml-2 rounded-full border px-1.5 py-0.5 text-[9px] uppercase tracking-widest", currentModel.badgeClass)}>{currentModel.badge}</span>
            </span>
            <span className="flex items-center gap-1"><CornerDownLeft size={11} /> Enter to send · Shift+Enter new line</span>
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

function AiMsg({ content, isStreaming, modelId }: { content: string; isStreaming: boolean; modelId: ModelId }) {
  return (
    <div className="flex max-w-3xl gap-3.5">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-accent to-accent-2 font-display text-[13px] font-semibold text-white">ल</span>
      <div className="min-w-0 flex-1">
        <p className="mb-1.5 text-[12px] font-semibold text-ink">
          Lakshya
          <span className="ml-1.5 text-[10px] font-normal uppercase tracking-[0.1em] text-ink-3">UPSC Mentor</span>
          <span className={cn("ml-2 rounded-full border px-1.5 py-0.5 text-[9px] uppercase tracking-widest", MODELS[modelId].badgeClass)}>{MODELS[modelId].badge}</span>
        </p>
        <div className="prose-os text-[13.5px] whitespace-pre-wrap">
          {content}
          {isStreaming && <span className="ml-0.5 inline-block h-3.5 w-0.5 animate-pulse bg-accent align-middle" />}
        </div>
      </div>
    </div>
  );
}
