"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

type Message = {
  role: "user" | "chef";
  content: string;
};

function CameraIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4 7h3l2-2h6l2 2h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}

function SendIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M22 2 11 13" />
      <path d="M22 2 15 22l-4-9-9-4 20-7z" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className={className}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

function ChefAvatarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4 11h16" />
      <path d="M5 11v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" />
      <path d="M9 5c0-1 .8-1.5 1-2.5" />
      <path d="M14 5c0-1-.8-1.5-1-2.5" />
    </svg>
  );
}

// --- Shared kawaii-face + sparkle building blocks -------------------------

function KawaiiFace({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g>
      <circle cx={cx - 4.2} cy={cy} r="2.1" fill="#28304a" />
      <circle cx={cx + 4.2} cy={cy} r="2.1" fill="#28304a" />
      <circle cx={cx - 4.8} cy={cy - 0.7} r="0.7" fill="#ffffff" />
      <circle cx={cx + 3.6} cy={cy - 0.7} r="0.7" fill="#ffffff" />
      <circle cx={cx - 7} cy={cy + 3.4} r="2.5" fill="#ff8f7a" opacity="0.65" />
      <circle cx={cx + 7} cy={cy + 3.4} r="2.5" fill="#ff8f7a" opacity="0.65" />
      <path d={`M${cx - 3.2} ${cy + 3} q3.2 3.2 6.4 0`} stroke="#28304a" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </g>
  );
}

function Shine({ cx, cy, rx = 3, ry = 4.5, rotate = -25 }: { cx: number; cy: number; rx?: number; ry?: number; rotate?: number }) {
  return <ellipse cx={cx} cy={cy} rx={rx} ry={ry} transform={`rotate(${rotate} ${cx} ${cy})`} fill="#ffffff" opacity="0.5" />;
}

function SparkleBurst({ cx, cy, color = "#F6C453", size = 4.5 }: { cx: number; cy: number; color?: string; size?: number }) {
  const angles = [0, 60, 120, 180, 240, 300];
  return (
    <g opacity="0.85">
      {angles.map((deg) => {
        const rad = (deg * Math.PI) / 180;
        // Rounded to 2 decimals: raw trig output can differ in the last
        // digit between server (Node) and client (browser) floating-point
        // implementations, which React flags as a hydration mismatch.
        const round = (n: number) => Math.round(n * 100) / 100;
        const x1 = round(cx + Math.cos(rad) * size * 0.5);
        const y1 = round(cy + Math.sin(rad) * size * 0.5);
        const x2 = round(cx + Math.cos(rad) * size);
        const y2 = round(cy + Math.sin(rad) * size);
        return <line key={deg} x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="1.4" strokeLinecap="round" />;
      })}
    </g>
  );
}

function StarSparkle({ className, color = "#8FB8F0" }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path d="M12 2c0 5 3 8 8 8-5 0-8 3-8 8 0-5-3-8-8-8 5 0 8-3 8-8z" fill={color} />
    </svg>
  );
}

// --- Kawaii food characters (scattered background) ------------------------

function TomatoChar({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className}>
      <SparkleBurst cx={33} cy={9} />
      <path d="M20 8c1.5-2 3.5-2 4-3.5M20 8c-1.5-2-3.5-2-4-3.5M20 8c0-2 .8-3 0-4.5" stroke="#4E9350" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <circle cx="20" cy="23" r="13" fill="#F04F43" stroke="#C63D34" strokeWidth="1.5" />
      <Shine cx={15} cy={16} />
      <KawaiiFace cx={20} cy={24} />
    </svg>
  );
}

function BroccoliChar({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className}>
      <SparkleBurst cx={33} cy={9} />
      <rect x="16" y="27" width="8" height="10" rx="3" fill="#9BCB7F" stroke="#579B49" strokeWidth="1.3" />
      <circle cx="13" cy="20" r="7" fill="#579B49" stroke="#3E7A28" strokeWidth="1.4" />
      <circle cx="27" cy="20" r="7" fill="#579B49" stroke="#3E7A28" strokeWidth="1.4" />
      <circle cx="20" cy="14" r="8" fill="#65A94B" stroke="#3E7A28" strokeWidth="1.4" />
      <Shine cx={16} cy={10} rx={2.4} ry={3.4} />
      <KawaiiFace cx={20} cy={21} />
    </svg>
  );
}

function EggplantChar({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className}>
      <SparkleBurst cx={33} cy={9} />
      <path d="M17 6c1 2 1 2 3 2s2 0 3-2" stroke="#4E9350" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <path d="M20 9c7 0 10 8 8 16-1.5 6-5 11-8 11s-6.5-5-8-11c-2-8 1-16 8-16z" fill="#68409B" stroke="#4E2F79" strokeWidth="1.5" />
      <Shine cx={16} cy={16} rx={2.4} ry={4} />
      <KawaiiFace cx={20} cy={24} />
    </svg>
  );
}

function BlueberryChar({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className}>
      <SparkleBurst cx={33} cy={9} />
      <circle cx="12" cy="28" r="6" fill="#5B6FDB" stroke="#3B4FB0" strokeWidth="1.3" />
      <circle cx="27" cy="28" r="6" fill="#4C5FCB" stroke="#3B4FB0" strokeWidth="1.3" />
      <circle cx="20" cy="18" r="9" fill="#6C7FE0" stroke="#3B4FB0" strokeWidth="1.5" />
      <Shine cx={16} cy={13} rx={2.2} ry={3} />
      <KawaiiFace cx={20} cy={19} />
    </svg>
  );
}

function LemonChar({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className}>
      <SparkleBurst cx={33} cy={9} />
      <path d="M18 8c1-1 3-1 4 0" stroke="#4E9350" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <ellipse cx="20" cy="22" rx="13" ry="11" fill="#FFD85C" stroke="#E0B33F" strokeWidth="1.5" />
      <Shine cx={15} cy={16} rx={2.6} ry={3.6} />
      <KawaiiFace cx={20} cy={23} />
    </svg>
  );
}

function CarrotChar({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className}>
      <SparkleBurst cx={33} cy={9} />
      <path d="M16 6c1.5 1.5 1.5 3 .8 4.5M20 5c-.8 2.2-.8 3.8 0 5.3M24 6.5c-1.5 1-2 2.3-2 4" stroke="#4E9350" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M15 13c1.5-1.5 8-1.5 9.5 0 2.5 2.5 3 15-2.5 24-1.2 2-2.8 2-4.5 0-5.5-9-3-21.5-2.5-24z" fill="#F58B35" stroke="#D9722D" strokeWidth="1.5" />
      <Shine cx={16} cy={18} rx={2} ry={4} rotate={-10} />
      <KawaiiFace cx={20} cy={22} />
    </svg>
  );
}

function BananaChar({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className}>
      <SparkleBurst cx={33} cy={9} />
      <path d="M10 12c8-3 20 2 20 14 0 6-5 9-10 8" stroke="#E0B33F" strokeWidth="11" fill="none" strokeLinecap="round" />
      <path d="M10 12c8-3 20 2 20 14 0 6-5 9-10 8" stroke="#FFD85C" strokeWidth="9" fill="none" strokeLinecap="round" />
      <path d="M12 13c6-2 15 1 17 10" stroke="#ffffff" strokeWidth="1.6" fill="none" strokeLinecap="round" opacity="0.5" />
      <circle cx="11" cy="12" r="2" fill="#B08655" />
      <KawaiiFace cx={20} cy={23} />
    </svg>
  );
}

function AppleChar({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className}>
      <SparkleBurst cx={33} cy={9} />
      <path d="M20 9v4" stroke="#8a5a34" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M20 10c1.5-2 4-2 4.5 0" stroke="#4E9350" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <path d="M20 13c-8 0-11 6-11 12a11 11 0 0 0 22 0c0-6-3-12-11-12z" fill="#EF4C4C" stroke="#C63D34" strokeWidth="1.5" />
      <Shine cx={15} cy={19} rx={2.6} ry={3.8} />
      <KawaiiFace cx={20} cy={25} />
    </svg>
  );
}

function AvocadoChar({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className}>
      <SparkleBurst cx={33} cy={9} />
      <path d="M20 7c-8 0-11 9-11 15 0 7 5 12 11 12s11-5 11-12c0-6-3-15-11-15z" fill="#6DAF55" stroke="#4C823A" strokeWidth="1.5" />
      <path d="M20 11c-5.5 0-7.5 7-7.5 11 0 5 3.3 9 7.5 9s7.5-4 7.5-9c0-4-2-11-7.5-11z" fill="#CFE29A" stroke="#A9C96A" strokeWidth="1.2" />
      <circle cx="20" cy="21" r="4.2" fill="#8a5a34" />
      <Shine cx={14} cy={13} rx={2} ry={3} rotate={-15} />
      <KawaiiFace cx={20} cy={30} />
    </svg>
  );
}

function RadishChar({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className}>
      <SparkleBurst cx={33} cy={9} />
      <path d="M15 7c2 2 2 4 1 6M20 6c0 2.5 0 4.5-1 6M25 7c-2 2-2 4-1 6" stroke="#5FA83D" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M13 16h14l-2 4H15z" fill="#F4F1E8" stroke="#D8D3C0" strokeWidth="1.2" />
      <path d="M14.5 20c-1.5 3-1.5 8 0 11 1.5 3 4 4 5.5 4s4-1 5.5-4c1.5-3 1.5-8 0-11z" fill="#E8556B" stroke="#C43850" strokeWidth="1.4" />
      <Shine cx={16} cy={24} rx={1.8} ry={2.8} />
      <KawaiiFace cx={20} cy={27} />
    </svg>
  );
}

function HeartDoodle({ className, color = "#F2A0B5" }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path d="M12 20s-7-4.5-7-10a4.5 4.5 0 0 1 7-3.7A4.5 4.5 0 0 1 19 10c0 5.5-7 10-7 10z" fill={color} />
    </svg>
  );
}

function YellowHeartDoodle({ className }: { className?: string }) {
  return <HeartDoodle className={className} color="#FFD85C" />;
}

function GreenHeartDoodle({ className }: { className?: string }) {
  return <HeartDoodle className={className} color="#9BCB7F" />;
}

function SquiggleDoodle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path d="M3 12c2-4 4 4 6 0s4 4 6 0 4 4 6 0" stroke="#A78BE0" strokeWidth="2.4" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function LeafDoodle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path d="M4 20c10 0 16-6 16-16-10 0-16 6-16 16z" fill="#7FBF6A" />
    </svg>
  );
}

function DotDoodle({ className, color = "#F6D34A" }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <circle cx="12" cy="12" r="8" fill={color} />
    </svg>
  );
}

function BlueDotDoodle({ className }: { className?: string }) {
  return <DotDoodle className={className} color="#9CC7EE" />;
}

function CookingSceneIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 160" className={className}>
      <SparkleBurst cx={132} cy={28} color="#8FB8F0" size={7} />
      <SparkleBurst cx={26} cy={40} color="#F6C453" size={5} />

      {/* steam */}
      <path className="steam-line" d="M65 45c-6-8 6-12 0-22" stroke="#6FA6E8" strokeWidth="6" fill="none" strokeLinecap="round" style={{ animationDelay: "0s" }} />
      <path className="steam-line" d="M82 42c-6-8 6-13 0-23" stroke="#8FB8F0" strokeWidth="6" fill="none" strokeLinecap="round" style={{ animationDelay: "0.7s" }} />
      <path className="steam-line" d="M99 45c-6-8 6-12 0-22" stroke="#6FA6E8" strokeWidth="6" fill="none" strokeLinecap="round" style={{ animationDelay: "1.3s" }} />

      {/* wooden spoon */}
      <path d="M113 55 92 88" stroke="#B08655" strokeWidth="6" strokeLinecap="round" />
      <ellipse cx="118" cy="48" rx="8" ry="11" transform="rotate(28 118 48)" fill="#C79868" />

      {/* pot */}
      <path
        d="M38 78h84l-6 28a14 14 0 0 1-14 12H58a14 14 0 0 1-14-12z"
        fill="#FF7657"
        stroke="#E35B3D"
        strokeWidth="3"
      />
      <rect x="34" y="68" width="92" height="14" rx="7" fill="#E35B3D" stroke="#C6431F" strokeWidth="2" />
      <path d="M30 72c0-6 6-9 9-4" stroke="#E35B3D" strokeWidth="6" fill="none" strokeLinecap="round" />
      <path d="M130 72c0-6-6-9-9-4" stroke="#E35B3D" strokeWidth="6" fill="none" strokeLinecap="round" />

      {/* soup surface, visible in the bowl's opening */}
      <ellipse cx="80" cy="75" rx="42" ry="7" fill="#FFE8B8" />
      <circle cx="66" cy="74" r="2.6" fill="#65A94B" />
      <circle cx="92" cy="73" r="2.2" fill="#F04F43" />
      <circle cx="78" cy="76" r="2" fill="#65A94B" />

      <Shine cx={54} cy={92} rx={7} ry={11} rotate={-15} />

      {/* face */}
      <circle cx="69" cy="97" r="4" fill="#28304a" />
      <circle cx="91" cy="97" r="4" fill="#28304a" />
      <circle cx="67.4" cy="95.6" r="1.3" fill="#ffffff" />
      <circle cx="89.4" cy="95.6" r="1.3" fill="#ffffff" />
      <circle cx="62" cy="102" r="5.2" fill="#ff8f7a" opacity="0.7" />
      <circle cx="98" cy="102" r="5.2" fill="#ff8f7a" opacity="0.7" />
      <path d="M71 104q9 8 18 0" stroke="#28304a" strokeWidth="2.6" fill="none" strokeLinecap="round" />
    </svg>
  );
}

type FloatSpec = {
  Icon: (props: { className?: string }) => React.JSX.Element;
  top: number;
  left: number;
  size: number;
  delay: number;
};

// Fixed composition mirroring the reference image's exact layout: each
// character's position/size is converted from the reference's 1586x992px
// coordinates to percentages, not randomized or re-derived.
const FLOATERS: FloatSpec[] = [
  { Icon: TomatoChar, top: 14, left: 10, size: 74, delay: 0 },
  { Icon: BroccoliChar, top: 21, left: 25, size: 90, delay: 0.5 },
  { Icon: EggplantChar, top: 45, left: 10, size: 100, delay: 1.1 },
  { Icon: BlueberryChar, top: 63, left: 10, size: 92, delay: 1.6 },
  { Icon: LemonChar, top: 82, left: 15, size: 82, delay: 0.3 },
  { Icon: CarrotChar, top: 15, left: 74, size: 88, delay: 0.8 },
  { Icon: BananaChar, top: 28, left: 88, size: 92, delay: 1.4 },
  { Icon: AppleChar, top: 44, left: 83, size: 104, delay: 0.2 },
  { Icon: AvocadoChar, top: 65, left: 89, size: 106, delay: 1.9 },
  { Icon: RadishChar, top: 74, left: 76, size: 82, delay: 1.0 },
  // small doodles filling the gaps
  { Icon: SquiggleDoodle, top: 5, left: 21, size: 22, delay: 0.4 },
  { Icon: YellowHeartDoodle, top: 8, left: 36, size: 18, delay: 1.2 },
  { Icon: LeafDoodle, top: 3, left: 71, size: 20, delay: 0.9 },
  { Icon: BlueDotDoodle, top: 29, left: 3, size: 14, delay: 1.7 },
  { Icon: GreenHeartDoodle, top: 54, left: 22, size: 18, delay: 0.6 },
  { Icon: LeafDoodle, top: 30, left: 58, size: 18, delay: 1.3 },
  { Icon: HeartDoodle, top: 46, left: 63, size: 16, delay: 0.1 },
  { Icon: BlueDotDoodle, top: 62, left: 96, size: 14, delay: 1.5 },
  { Icon: YellowHeartDoodle, top: 88, left: 26, size: 18, delay: 0.7 },
  { Icon: DotDoodle, top: 91, left: 8, size: 14, delay: 1.8 },
];

const softShadow = "0 12px 30px rgba(30,70,100,0.10)";
const softShadowSm = "0 5px 15px rgba(30,70,100,0.08)";

export default function Home() {
  const [threadId] = useState(() => crypto.randomUUID());
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

  async function sendMessage() {
    if (loading) return;
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
      <div className="corner-blob" style={{ top: "-9rem", left: "-9rem", background: "#FFF1CE" }} />
      <div className="corner-blob" style={{ top: "-9rem", right: "-9rem", background: "#E3F3E5" }} />
      <div className="corner-blob" style={{ bottom: "-9rem", left: "-9rem", background: "#DCEEFF" }} />
      <div className="corner-blob" style={{ bottom: "-9rem", right: "-9rem", background: "#DCEEFF" }} />

      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        {FLOATERS.map((v, i) => (
          <span
            key={i}
            className="float-icon absolute block"
            style={{
              top: `${v.top}%`,
              left: `${v.left}%`,
              width: v.size,
              height: v.size,
              animationDelay: `${v.delay}s`,
            }}
          >
            <v.Icon className="w-full h-full" />
          </span>
        ))}
      </div>

      <main className="relative isolate flex flex-col h-screen max-w-3xl mx-auto w-full">
        {!hasConversation && (
          <div className="relative flex flex-col items-center pt-8 pb-6">
            <div className="relative w-60 h-60 flex items-center justify-center">
              <div
                className="absolute inset-3 rounded-full"
                style={{ background: "radial-gradient(circle, var(--color-glow) 0%, transparent 72%)" }}
              />
              <CookingSceneIcon className="relative w-52 h-52 drop-shadow-sm" />
            </div>

            <span
              className="mt-2 px-5 py-2 rounded-full text-[13px] font-bold uppercase tracking-[0.08em]"
              style={{ background: "var(--color-leaf-bg)", color: "var(--color-leaf)" }}
            >
              Personal Chef
            </span>

            <div className="relative mt-4 px-4">
              <StarSparkle className="absolute -left-9 top-2 w-7 h-7" color="#FFD85C" />
              <StarSparkle className="absolute -right-9 bottom-2 w-7 h-7" color="#8FB8F0" />
              <h1
                className="text-center font-[family-name:var(--font-display)] font-extrabold leading-[1.1] text-[var(--color-ink)] text-[44px] md:text-[56px]"
              >
                What can we make
                <br />
                today?
              </h1>
            </div>

            <div className="flex items-end gap-3 mt-8 px-4">
              <span
                className="flex items-center justify-center w-[60px] h-[60px] rounded-full shrink-0"
                style={{ background: "var(--color-leaf-bg)" }}
              >
                <ChefAvatarIcon className="w-6 h-6" style={{ color: "var(--color-leaf)" }} />
              </span>
              <div className="relative">
                <div
                  className="rounded-[26px] px-6 py-4 text-[var(--color-ink)] text-[1.1rem] font-medium"
                  style={{ background: "var(--color-leaf-bg)", boxShadow: softShadowSm }}
                >
                  Hi! What are we cooking today?
                </div>
                <span
                  className="absolute -bottom-1 left-5 w-4 h-4 rounded-br-2xl"
                  style={{ background: "var(--color-leaf-bg)", transform: "rotate(10deg)" }}
                />
              </div>
            </div>
          </div>
        )}

        {hasConversation && (
          <div className="flex items-center gap-4 pt-6 pb-2 px-6 md:px-10">
            <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
              <div
                className="absolute inset-1 rounded-full"
                style={{ background: "radial-gradient(circle, var(--color-glow) 0%, transparent 72%)" }}
              />
              <CookingSceneIcon className="relative w-16 h-16" />
            </div>
            <div>
              <span
                className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-[0.08em]"
                style={{ background: "var(--color-leaf-bg)", color: "var(--color-leaf)" }}
              >
                Personal Chef
              </span>
              <h1 className="mt-1 font-[family-name:var(--font-display)] font-extrabold text-2xl text-[var(--color-ink)]">
                Let&apos;s make something delicious!
              </h1>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 md:px-10 py-8 flex flex-col gap-5">
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
                  <ChefAvatarIcon className="w-5 h-5" style={{ color: "var(--color-leaf)" }} />
                </span>
                <div className="relative animate-pop-in">
                  <div
                    className="chef-markdown rounded-[26px] px-6 py-4 text-[var(--color-ink)] text-[1.05rem] font-medium"
                    style={{ background: "var(--color-leaf-bg)", boxShadow: softShadowSm }}
                  >
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                  <span
                    className="absolute -bottom-1 left-5 w-4 h-4 rounded-br-2xl"
                    style={{ background: "var(--color-leaf-bg)", transform: "rotate(10deg)" }}
                  />
                </div>
              </div>
            )
          )}

          {loading && (
            <div className="self-start flex items-end gap-3 animate-pop-in">
              <span className="flex items-center justify-center w-[60px] h-[60px] rounded-full shrink-0" style={{ background: "var(--color-leaf-bg)" }}>
                <ChefAvatarIcon className="w-5 h-5" style={{ color: "var(--color-leaf)" }} />
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

        <div className="px-6 md:px-10 pb-6 pt-2">
          <div
            className="rounded-[32px] p-5 flex flex-col gap-4"
            style={{ background: "var(--color-cream)", boxShadow: softShadow }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="What ingredients do you have?"
              className="w-full h-[60px] rounded-[20px] border-2 border-[var(--color-border)] bg-white px-6 text-[20px] font-semibold text-[var(--color-ink)] placeholder:text-[var(--color-placeholder)] placeholder:font-normal outline-none focus:border-[var(--color-leaf)] transition-colors"
            />

            <div className="flex items-center justify-between gap-3 flex-wrap">
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
                  className="flex items-center justify-center gap-2 rounded-full bg-white px-6 h-[55px] font-semibold text-[17px] text-[var(--color-ink)] shrink-0 transition-all hover:bg-[var(--color-leaf-bg)] active:translate-y-0.5"
                  style={{ boxShadow: softShadowSm }}
                >
                  <CameraIcon className="w-5 h-5" />
                  Add photo
                </button>

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
                className="flex items-center justify-center gap-2 rounded-full px-8 h-[60px] min-w-[160px] font-[family-name:var(--font-display)] font-bold text-white text-[19px] shrink-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:translate-y-0.5 disabled:active:translate-y-0"
                style={{ background: "var(--color-tomato)", boxShadow: loading ? "none" : softShadowSm }}
              >
                {loading ? "Cooking..." : "Send"}
                {!loading && <SendIcon className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
