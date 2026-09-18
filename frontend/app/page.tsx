"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

import { BURST_LEFT, BURST_RIGHT, POT, SCATTERED, type Sprite } from "./sprites";

const REF_W = 1586;
const REF_H = 992;

// Sizes are written in reference pixels and resolved through --u / --uc, so the
// page is exact at 1586x992 and scales down as one piece on smaller screens.
const u = (n: number) => `calc(${n} * var(--u))`;

// The hero is deliberately drawn smaller than the reference: at full reference
// size the mascot, headline and greeting dominated the screen and left little
// room for the chat itself. One factor keeps the whole block in proportion --
// the accent bursts stay aligned to the headline because they scale with it.
const HERO = 0.85;
const h = (n: number) => u(n * HERO);
const uc = (n: number) => `calc(${n} * var(--uc))`;

// A sprite sits where it sat on the reference canvas: position as a percentage
// of the viewport, size fixed in px so it never distorts.
function FoodSprite({ sprite, className, style }: { sprite: Sprite; className?: string; style?: React.CSSProperties }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/food/${sprite.name}.png`}
      alt=""
      aria-hidden
      width={sprite.w}
      height={sprite.h}
      className={className}
      style={{ position: "absolute", left: `${(sprite.x / REF_W) * 100}%`, top: `${(sprite.y / REF_H) * 100}%`, width: u(sprite.w), height: u(sprite.h), ...style }}
    />
  );
}

type Message = {
  role: "user" | "chef";
  content: string;
};

function CameraIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <path d="M4 7h3l2-2h6l2 2h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}

function SendIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <path d="M22 2 11 13" />
      <path d="M22 2 15 22l-4-9-9-4 20-7z" />
    </svg>
  );
}

function CloseIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className={className} style={style}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

// Blue-outlined hat with its own tiny face, as in the reference — the old
// navy-on-white version disappeared against the pale blue avatar circle.
function ChefHatIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style}>
      <path
        d="M7 20h10v-3.2c2-.6 3.3-2.3 3.3-4.3 0-2.1-1.5-3.8-3.5-4.2C16.4 6.2 14.4 4.5 12 4.5S7.6 6.2 7.2 8.3c-2 .4-3.5 2.1-3.5 4.2 0 2 1.3 3.7 3.3 4.3V20z"
        fill="#ffffff"
        stroke="#2478B8"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M7 17.2c1.6.5 3.3.8 5 .8s3.4-.3 5-.8" fill="none" stroke="#2478B8" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="10.2" cy="13.3" r="0.8" fill="#2478B8" />
      <circle cx="13.8" cy="13.3" r="0.8" fill="#2478B8" />
      <path d="M11 14.8q1 .9 2 0" stroke="#2478B8" strokeWidth="0.8" fill="none" strokeLinecap="round" />
      <ellipse cx="8.4" cy="14.3" rx="1.1" ry="0.7" fill="#F9A8C0" opacity="0.8" />
      <ellipse cx="15.6" cy="14.3" rx="1.1" ry="0.7" fill="#F9A8C0" opacity="0.8" />
    </svg>
  );
}

const softShadow = "0 12px 30px rgba(30,70,100,0.10)";
const softShadowSm = "0 5px 15px rgba(30,70,100,0.08)";

export default function Home() {
  // Kept in localStorage so a page reload continues the same conversation
  // instead of silently starting a new one the backend will never be asked for.
  // The guard is for the server render, where localStorage does not exist; the
  // value is never rendered, so the placeholder cannot cause a hydration
  // mismatch, and the initialiser runs again in the browser with the real id.
  const [threadId, setThreadId] = useState(() => {
    if (typeof window === "undefined") return "";
    const KEY = "chef-thread-id";
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(KEY, id);
    }
    return id;
  });
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasConversation = messages.length > 0;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // The backend remembers the thread, but the transcript lives in React state,
  // so without this a reload would show an empty screen over a full history.
  useEffect(() => {
    if (!threadId) return;
    let cancelled = false;
    fetch(`http://localhost:8000/history/${threadId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.messages?.length) setMessages(data.messages);
      })
      .catch(() => {
        // an unreachable backend is already reported when sending; staying
        // quiet here avoids an error on a page the user has not used yet
      });
    return () => {
      cancelled = true;
    };
  }, [threadId]);

  // Abandons the thread rather than deleting it: the old conversation stays in
  // the database, it simply stops being the one this browser asks for.
  function startNewConversation() {
    const fresh = crypto.randomUUID();
    localStorage.setItem("chef-thread-id", fresh);
    setThreadId(fresh);
    setMessages([]);
    setInput("");
    setImage(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function sendMessage() {
    if (loading) return;
    if (!threadId) return; // only possible during a server render
    if (!input.trim() && !image) return;

    const outgoingInput = input;
    const outgoingImage = image;

    setMessages((prev) => [...prev, { role: "user", content: outgoingInput }]);
    setLoading(true);
    setError(null);

    setInput("");
    setImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    try {
      const formData = new FormData();
      formData.append("message", outgoingInput);
      formData.append("thread_id", threadId);
      if (outgoingImage) {
        formData.append("image", outgoingImage);
      }

      const res = await fetch("http://localhost:8000/chat", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`Server responded with ${res.status}`);
      }

      const data = await res.json();
      setMessages((prev) => [...prev, { role: "chef", content: data.reply }]);
    } catch (err) {
      console.error(err);
      setError("Couldn't reach the chef. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* The soft corner wash, sampled off the reference with every drawn
          element masked out — a 64x40 image the browser stretches back up.
          Cheaper and more faithful than trying to redraw it with CSS blobs. */}
      <div
        className="fixed inset-0 -z-20 pointer-events-none"
        style={{
          backgroundImage: "url(/food/background.png)",
          backgroundSize: "100% 100%",
          backgroundRepeat: "no-repeat",
        }}
      />

      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        {SCATTERED.map((sprite) => (
          <FoodSprite
            key={sprite.name}
            sprite={sprite}
            className="float-icon"
            style={{ animationDelay: `${sprite.delay}s` }}
          />
        ))}
      </div>

      <main
        className={`relative isolate flex flex-col ${
          hasConversation ? "h-screen" : "min-h-screen"
        } max-w-[810px] mx-auto w-full px-6`}
      >
        {!hasConversation && (
          <div className="relative flex flex-col" style={{ paddingTop: h(67) }}>
            <div className="flex flex-col items-center">
              {/* the pale blue glow behind the bowl is baked into the sprite */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/food/${POT.name}.png`} alt="" aria-hidden width={POT.w} height={POT.h} style={{ width: h(POT.w), height: h(POT.h), marginLeft: h(1) }} />

              <span
                className="inline-flex items-center rounded-full font-semibold uppercase tracking-[0.12em]"
                style={{
                  marginTop: h(1),
                  height: h(58),
                  paddingInline: h(28),
                  fontSize: h(20),
                  background: "var(--color-leaf-bg)",
                  color: "var(--color-leaf)",
                }}
              >
                {"Personal\u2002Chef"}
              </span>

              <div className="relative w-full" style={{ marginTop: h(6) }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/food/${BURST_LEFT.name}.png`} alt="" aria-hidden className="absolute" style={{ left: `calc(50% - ${h(793 - BURST_LEFT.x)})`, top: h(BURST_LEFT.y - 324), width: h(BURST_LEFT.w), height: h(BURST_LEFT.h) }} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/food/${BURST_RIGHT.name}.png`} alt="" aria-hidden className="absolute" style={{ left: `calc(50% + ${h(BURST_RIGHT.x - 793)})`, top: h(BURST_RIGHT.y - 324), width: h(BURST_RIGHT.w), height: h(BURST_RIGHT.h) }} />
                <h1 className="text-center font-[family-name:var(--font-display)] font-semibold leading-[1.2] text-[var(--color-ink)]" style={{ fontSize: h(60) }}>
                  What can we make
                  <br />
                  today?
                </h1>
              </div>
            </div>

            <div className="flex items-start" style={{ gap: h(14), marginTop: h(40), paddingLeft: h(9) }}>
              <span
                className="flex items-center justify-center rounded-full shrink-0"
                style={{ marginTop: h(2), width: h(70), height: h(70), background: "var(--color-leaf-bg)" }}
              >
                <ChefHatIcon style={{ width: h(44), height: h(44) }} />
              </span>
              <div className="relative">
                <div
                  className="flex items-center text-[var(--color-ink)] font-medium"
                  style={{
                    borderRadius: h(28),
                    paddingInline: h(30),
                    height: h(86),
                    fontSize: h(24),
                    background: "var(--color-leaf-bg)",
                    boxShadow: softShadowSm,
                  }}
                >
                  Hi! What are we cooking today?
                </div>
              </div>
            </div>
          </div>
        )}

        {hasConversation && (
          <div className="flex items-center gap-4 pt-6 pb-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/food/${POT.name}.png`} alt="" aria-hidden className="shrink-0" style={{ width: 104, height: Math.round((104 * POT.h) / POT.w) }} />
            <div>
              <span
                className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-[0.08em]"
                style={{ background: "var(--color-leaf-bg)", color: "var(--color-leaf)" }}
              >
                Personal Chef
              </span>
              <h1 className="mt-1 font-[family-name:var(--font-display)] font-semibold text-2xl text-[var(--color-ink)]">
                Let&apos;s make something delicious!
              </h1>
            </div>
          </div>
        )}

        <div className={`flex-1 min-h-0 flex flex-col gap-5 ${hasConversation ? "overflow-y-auto py-8" : ""}`}>
          {messages.map((m, i) =>
            m.role === "user" ? (
              <div key={i} className="self-end max-w-[75%]">
                <div
                  className="animate-pop-in rounded-[22px] px-5 py-3.5 text-white font-semibold text-[1.05rem]"
                  style={{ background: "var(--color-tomato)", boxShadow: softShadowSm }}
                >
                  {m.content}
                </div>
              </div>
            ) : (
              <div key={i} className="self-start max-w-[75%] flex items-end gap-3">
                <span
                  className="animate-pop-in flex items-center justify-center w-[60px] h-[60px] rounded-full shrink-0"
                  style={{ background: "var(--color-leaf-bg)" }}
                >
                  <ChefHatIcon className="w-8 h-8" />
                </span>
                <div className="relative animate-pop-in">
                  <div
                    className="chef-markdown rounded-[26px] px-6 py-4 text-[var(--color-ink)] text-[1.05rem] font-medium"
                    style={{ background: "var(--color-leaf-bg)", boxShadow: softShadowSm }}
                  >
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                </div>
              </div>
            )
          )}

          {loading && (
            <div className="self-start flex items-end gap-3 animate-pop-in">
              <span className="flex items-center justify-center w-[60px] h-[60px] rounded-full shrink-0" style={{ background: "var(--color-leaf-bg)" }}>
                <ChefHatIcon className="w-8 h-8" />
              </span>
              <div
                className="rounded-[26px] px-6 py-4 flex gap-1.5 items-center"
                style={{ background: "var(--color-leaf-bg)" }}
              >
                <span className="w-2.5 h-2.5 rounded-full dot-bounce" style={{ background: "var(--color-leaf)", animationDelay: "0ms" }} />
                <span className="w-2.5 h-2.5 rounded-full dot-bounce" style={{ background: "var(--color-leaf)", animationDelay: "150ms" }} />
                <span className="w-2.5 h-2.5 rounded-full dot-bounce" style={{ background: "var(--color-leaf)", animationDelay: "300ms" }} />
              </div>
            </div>
          )}

          {error && (
            <div
              className="self-start max-w-[85%] rounded-2xl border-2 px-5 py-3.5 font-semibold text-[1.05rem] animate-pop-in"
              style={{ borderColor: "var(--color-tomato-dark)", color: "var(--color-tomato-dark)", background: "#fff3f0" }}
            >
              {error}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Card 762x174 sitting 76px off the bottom edge — measured off the
            reference, where it was 672x142 sitting 24px off the bottom. */}
        <div className="pt-2" style={{ paddingBottom: uc(44) }}>
          <div
            className="w-full flex flex-col"
            style={{
              borderRadius: uc(32),
              padding: uc(16),
              gap: uc(16),
              background: "var(--color-cream)",
              boxShadow: softShadow,
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="What ingredients do you have?"
              className="w-full rounded-full border-2 border-[var(--color-border)] bg-white font-medium text-[var(--color-ink)] placeholder:text-[#8FB3DA] placeholder:font-medium outline-none focus:border-[var(--color-leaf)] transition-colors"
              style={{ height: uc(68), paddingInline: uc(30), fontSize: uc(22) }}
            />

            <div className="flex items-center justify-between gap-2 flex-nowrap">
              <div className="flex items-center gap-2 min-w-0">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImage(e.target.files?.[0] ?? null)}
                  className="hidden"
                  id="photo-upload"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center rounded-full font-medium text-[var(--color-ink)] shrink-0 transition-all hover:bg-[var(--color-leaf-bg)] active:translate-y-0.5"
                  style={{ gap: uc(10), height: uc(58), paddingInline: uc(24), fontSize: uc(19), background: "#F6FAFE", boxShadow: softShadowSm }}
                >
                  <CameraIcon style={{ width: uc(22), height: uc(22) }} />
                  Add photo
                </button>

                {/* Only offered once there is something to clear, so it cannot be
                    hit by accident on the opening screen. */}
                {messages.length > 0 && (
                  <button
                    type="button"
                    onClick={startNewConversation}
                    aria-label="Start a new conversation"
                    title="Start a new conversation"
                    className="flex items-center justify-center rounded-full text-[var(--color-ink)] shrink-0 transition-all hover:bg-[var(--color-leaf-bg)] active:translate-y-0.5"
                    style={{ width: uc(58), height: uc(58), background: "#F6FAFE", boxShadow: softShadowSm }}
                  >
                    <CloseIcon style={{ width: uc(20), height: uc(20) }} />
                  </button>
                )}

                {image && (
                  <span
                    className="flex items-center gap-1.5 min-w-0 rounded-full px-3 py-1.5 text-sm font-semibold"
                    style={{ background: "var(--color-leaf-bg)", color: "var(--color-ink)" }}
                  >
                    <span className="truncate max-w-[8rem]">{image.name}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setImage(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      aria-label="Remove photo"
                      className="shrink-0"
                    >
                      <CloseIcon className="w-3.5 h-3.5" />
                    </button>
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={sendMessage}
                disabled={loading}
                className="flex items-center justify-center rounded-full font-medium text-white shrink-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:translate-y-0.5 disabled:active:translate-y-0"
                style={{ gap: uc(10), height: uc(58), paddingInline: uc(32), fontSize: uc(22), background: "var(--color-tomato)", boxShadow: loading ? "none" : softShadowSm }}
              >
                {loading ? "Cooking..." : "Send"}
                {!loading && <SendIcon style={{ width: uc(26), height: uc(26) }} />}
              </button>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
