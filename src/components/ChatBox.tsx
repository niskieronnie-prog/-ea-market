"use client";
import { useState, useRef, useEffect } from "react";

type M = { from: "user" | "bot"; text: string; ai?: boolean };

export default function ChatBox() {
  const [msgs, setMsgs] = useState<M[]>([{ from: "bot", text: "Hi! I'm an automated assistant (rules-based, not a person). Ask about selling, affiliates, shipping or refunds, or say \"human\" for support." }]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView(); }, [msgs]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const t = text.trim(); if (!t || busy) return;
    setMsgs((m) => [...m, { from: "user", text: t }]); setText(""); setBusy(true);
    try {
      const r = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: t }) });
      const j = await r.json();
      setMsgs((m) => [...m, { from: "bot", text: j.reply ?? "Something went wrong.", ai: j.source === "ai" }]);
      if (j.escalate) setMsgs((m) => [...m, { from: "bot", text: "Open a support ticket: /support/new" }]);
    } catch { setMsgs((m) => [...m, { from: "bot", text: "Network error. Please try again." }]); }
    setBusy(false);
  }
  return (
    <div className="card">
      <div className="chat-log" role="log" aria-live="polite">
        {msgs.map((m, i) => <div key={i} className={`msg ${m.from}`} style={{ whiteSpace: "pre-wrap" }}>{m.ai && <div className="muted" style={{ fontSize: ".75rem" }}>AI-generated answer. May contain mistakes.</div>}{m.text}</div>)}
        <div ref={end} />
      </div>
      <form onSubmit={send} style={{ display: "flex", gap: 8 }}>
        <label htmlFor="cm" style={{ position: "absolute", left: -999 }}>Message</label>
        <input id="cm" value={text} onChange={(e) => setText(e.target.value)} maxLength={500} placeholder="Type your question" />
        <button className="btn" disabled={busy}>Send</button>
      </form>
    </div>
  );
}
