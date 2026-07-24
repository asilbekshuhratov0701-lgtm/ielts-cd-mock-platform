"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Reveal } from "@/components/marketing/Reveal";

const MODULES = [
  {
    k: "L",
    t: "Listening",
    meta: "30 min · 40 questions",
    d: "Four recorded sections with auto-play audio, exactly one listen — like the real thing."
  },
  {
    k: "R",
    t: "Reading",
    meta: "60 min · 40 questions",
    d: "Academic & General passages with highlight, notes and split-screen tools."
  },
  {
    k: "W",
    t: "Writing",
    meta: "60 min · 2 tasks",
    d: "On-screen editor with live word count, assessed on the four official criteria."
  }
];

type Feature = { title: string; body: string; icon: React.ReactNode };

const FEATURES: Feature[] = [
  {
    title: "The real exam interface",
    body: "Pixel-accurate CD-IELTS screens — navigation, highlighting, notes and review flags all work as on test day.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20">
        <rect x="2" y="3" width="16" height="12" rx="2" fill="none" stroke="var(--accent-ink)" strokeWidth="2" />
        <rect x="7" y="17" width="6" height="2" rx="1" fill="var(--accent-ink)" />
      </svg>
    )
  },
  {
    title: "Strict, real timing",
    body: "Sections auto-start, lock and auto-submit on the official clock. Build real time pressure into your practice.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20">
        <circle cx="10" cy="10" r="8" fill="none" stroke="var(--accent-ink)" strokeWidth="2" />
        <path d="M10 5.5V10l3 2" stroke="var(--accent-ink)" strokeWidth="2" fill="none" strokeLinecap="round" />
      </svg>
    )
  },
  {
    title: "Instant band estimates",
    body: "Listening and Reading scored on submit with official raw-score-to-band conversion — no waiting.",
    icon: <span style={{ fontSize: 13, fontWeight: 800, color: "var(--accent-ink)" }}>7.5</span>
  },
  {
    title: "Examiner-style feedback",
    body: "Writing assessed against the four official criteria, with concrete steps to reach the next band.",
    icon: <span style={{ fontSize: 20, fontWeight: 800, color: "var(--accent-ink)", lineHeight: 1 }}>&#8220;</span>
  },
  {
    title: "Progress analytics",
    body: "Band trajectory across mocks, weak question types, and time-per-question breakdowns.",
    icon: (
      <span style={{ display: "flex", alignItems: "flex-end", gap: 3 }}>
        <span style={{ width: 4, height: 8, borderRadius: 2, background: "var(--accent-ink)" }} />
        <span style={{ width: 4, height: 14, borderRadius: 2, background: "var(--accent-ink)" }} />
        <span style={{ width: 4, height: 11, borderRadius: 2, background: "var(--accent-ink)" }} />
      </span>
    )
  },
  {
    title: "At the centre or at home",
    body: "Proctored sessions in your learning centre, or independent practice from any computer.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18">
        <rect x="2" y="2" width="14" height="14" rx="3" transform="rotate(45 9 9)" fill="none" stroke="var(--accent-ink)" strokeWidth="2" />
      </svg>
    )
  }
];

const CSS = `
.zm-root{--bg:#f7f8fc;--surface:#ffffff;--surface2:#f1f3fa;--ink:#10142e;--muted:#4b5268;--faint:#8a90a6;--border:#e7e9f2;--accent:#4f46e5;--accent-ink:#4f46e5;--accent-soft:#eef0fa;--btn:#4f46e5;--navbg:rgba(255,255,255,.85);--band:#10142e;--band-ink:#ffffff;--band-muted:#9aa1c0;--band-border:rgba(255,255,255,.09);--shadow:rgba(16,20,46,.12);--stripe1:#e8eaf3;--stripe2:#f3f4fa;--glow:rgba(79,70,229,.32);background:var(--bg);color:var(--ink);min-height:100vh;font-family:var(--font-sans,'Sora',sans-serif)}
.zm-root[data-theme="dark"]{--bg:#0b0e1e;--surface:#131735;--surface2:#191e42;--ink:#eef0fa;--muted:#aab0cc;--faint:#7c83a6;--border:rgba(255,255,255,.09);--accent:#818cf8;--accent-ink:#a5b0ff;--accent-soft:rgba(129,140,248,.13);--btn:#6366f1;--navbg:rgba(11,14,30,.82);--band:#131735;--band-ink:#eef0fa;--band-muted:#8f96bd;--band-border:rgba(255,255,255,.09);--shadow:rgba(0,0,0,.5);--stripe1:#212752;--stripe2:#181d40;--glow:rgba(129,140,248,.3)}
.zm-root *,.zm-root *::before,.zm-root *::after{transition:background-color .35s ease,border-color .35s ease,color .35s ease}
.zm-root a{color:inherit;text-decoration:none}
.zm-wrap{max-width:1400px;margin:0 auto;box-sizing:border-box}
.zm-nav{position:sticky;top:0;z-index:50;display:flex;justify-content:space-between;align-items:center;gap:28px;flex-wrap:wrap;padding:16px 48px;background:var(--navbg);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border-bottom:1px solid var(--border)}
.zm-brand{font-weight:800;font-size:19px;letter-spacing:-.02em;color:var(--ink)}
.zm-navlinks{display:flex;align-items:center;gap:30px;font-size:14px;font-weight:600;color:var(--muted)}
.zm-navlinks a:hover{color:var(--accent-ink)}
.zm-toggle{display:flex;align-items:center;gap:8px;padding:9px 16px;border-radius:999px;border:1.5px solid var(--border);font-size:13px;font-weight:700;color:var(--muted);cursor:pointer;user-select:none;background:transparent}
.zm-toggle:hover{border-color:var(--accent);color:var(--accent-ink)}
.zm-login{padding:10px 22px;border-radius:10px;font-size:14px;font-weight:700;color:var(--ink);border:1.5px solid var(--border);cursor:pointer}
.zm-login:hover{border-color:var(--accent);color:var(--accent-ink)}
.zm-signup{padding:11px 24px;border-radius:10px;font-size:14px;font-weight:700;color:#fff;background:var(--btn);box-shadow:0 6px 16px var(--glow);cursor:pointer;border:none}
.zm-signup:hover{transform:translateY(-2px);box-shadow:0 10px 22px var(--glow)}
.zm-hero{position:relative;overflow:hidden;padding:76px 64px 84px;display:grid;grid-template-columns:1.02fr .98fr;gap:60px;align-items:center}
.zm-blob{position:absolute;border-radius:50%;pointer-events:none}
.zm-eyebrow{font-size:12px;font-weight:700;letter-spacing:.22em;color:var(--accent-ink)}
.zm-h1{margin:0 0 22px;font-size:60px;line-height:1.06;font-weight:800;letter-spacing:-.03em}
.zm-shim{background:linear-gradient(90deg,#6366f1,#8b5cf6,#6366f1);background-size:200% auto;-webkit-background-clip:text;background-clip:text;color:transparent;animation:zm-shimmer 4s linear infinite}
.zm-lead{margin:0 0 32px;font-size:17px;line-height:1.65;color:var(--muted);max-width:480px}
.zm-cta1{padding:16px 30px;border-radius:12px;background:var(--btn);color:#fff;font-weight:700;font-size:15px;box-shadow:0 8px 20px var(--glow);cursor:pointer;border:none;display:inline-block}
.zm-cta1:hover{transform:translateY(-2px);box-shadow:0 14px 28px var(--glow)}
.zm-cta2{padding:16px 28px;border-radius:12px;border:1.5px solid var(--border);background:var(--surface);color:var(--ink);font-weight:700;font-size:15px;cursor:pointer;display:inline-block}
.zm-cta2:hover{border-color:var(--accent);color:var(--accent-ink)}
.zm-preview{background:var(--surface);border:1px solid var(--border);border-radius:18px;box-shadow:0 24px 60px var(--shadow);overflow:hidden}
.zm-float{position:absolute;background:var(--surface);border:1px solid var(--border);border-radius:12px;box-shadow:0 10px 26px var(--shadow)}
.zm-stats{display:grid;grid-template-columns:repeat(4,1fr);background:var(--band);color:var(--band-ink)}
.zm-stat{padding:36px 44px;border-right:1px solid var(--band-border)}
.zm-stat:last-child{border-right:none}
.zm-stat-num{font-size:38px;font-weight:800;letter-spacing:-.02em}
.zm-stat-lbl{font-size:13px;color:var(--band-muted);margin-top:5px;font-weight:500}
.zm-eyebrow2{font-size:12px;font-weight:700;letter-spacing:.22em;color:var(--accent-ink);margin-bottom:14px}
.zm-h2{margin:0 0 16px;font-size:38px;font-weight:800;letter-spacing:-.02em;line-height:1.15}
.zm-sec-lead{margin:0;font-size:16px;line-height:1.65;color:var(--muted)}
.zm-mods{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
.zm-mod{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:26px;height:100%;box-sizing:border-box}
.zm-mod:hover{transform:translateY(-5px);box-shadow:0 16px 34px var(--shadow);border-color:var(--accent)}
.zm-ico{width:42px;height:42px;border-radius:12px;background:var(--accent-soft);color:var(--accent-ink);display:grid;place-items:center;font-weight:800;font-size:17px;margin-bottom:16px}
.zm-feats{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
.zm-feat{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:28px;height:100%;box-sizing:border-box}
.zm-feat:hover{transform:translateY(-5px);box-shadow:0 16px 34px var(--shadow)}
.zm-fico{width:42px;height:42px;border-radius:12px;background:var(--accent-soft);display:grid;place-items:center;margin-bottom:18px}
.zm-mod,.zm-feat,.zm-signup,.zm-cta1,.zm-cta2,.zm-toggle,.zm-login,.zm-ctaBtn{transition:transform .25s ease,box-shadow .25s ease,border-color .25s ease,color .25s ease,background-color .25s ease}
.zm-ctaband{position:relative;overflow:hidden;background:linear-gradient(120deg,#4338ca,#6d28d9);border-radius:22px;padding:64px 72px;color:#fff;display:flex;justify-content:space-between;align-items:center;gap:40px}
.zm-ctaBtn{position:relative;padding:17px 34px;border-radius:12px;background:#fff;color:#4338ca;font-weight:800;font-size:15px;white-space:nowrap;cursor:pointer;box-shadow:0 10px 26px rgba(0,0,0,.2);border:none;display:inline-block}
.zm-ctaBtn:hover{transform:translateY(-2px);box-shadow:0 16px 34px rgba(0,0,0,.28)}
.zm-foot{background:var(--band);color:var(--band-ink)}
.zm-footgrid{display:grid;grid-template-columns:1.4fr 1fr 1fr 1.2fr;gap:48px;padding:64px 64px 0;max-width:1400px;margin:0 auto;box-sizing:border-box}
.zm-foot a{color:var(--band-ink)}
.zm-foot a:hover{color:var(--accent-ink)}
.zm-foot-h{font-size:12px;font-weight:700;letter-spacing:.18em;color:var(--band-muted);margin-bottom:4px}
.zm-foot-col{display:flex;flex-direction:column;gap:12px;font-size:14px}
.zm-foot-bottom{max-width:1400px;margin:48px auto 0;padding:28px 64px 32px;border-top:1px solid var(--band-border);display:flex;justify-content:space-between;gap:16px;font-size:13px;color:var(--band-muted);flex-wrap:wrap}
@keyframes zm-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
@keyframes zm-float2{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-9px) rotate(2deg)}}
@keyframes zm-blob{0%{transform:translate(0,0) scale(1)}100%{transform:translate(70px,-50px) scale(1.18)}}
@keyframes zm-blob2{0%{transform:translate(0,0) scale(1.1)}100%{transform:translate(-60px,40px) scale(.95)}}
@keyframes zm-pulse{0%,100%{opacity:1}50%{opacity:.3}}
@keyframes zm-shimmer{to{background-position:200% center}}
@keyframes zm-rise{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
.zm-rise{animation:zm-rise .8s ease-out both}
.zm-rise2{animation:zm-rise 1s .15s ease-out both}
@media (max-width:1024px){.zm-hero{grid-template-columns:1fr;gap:40px;padding:56px 40px 64px}.zm-feats{grid-template-columns:repeat(2,1fr)}.zm-footgrid{grid-template-columns:1fr 1fr;padding:56px 40px 0}.zm-foot-bottom{padding:28px 40px 32px}}
@media (max-width:720px){.zm-nav{padding:14px 22px}.zm-navlinks{display:none}.zm-hero{padding:44px 22px 52px}.zm-h1{font-size:44px}.zm-stats{grid-template-columns:repeat(2,1fr)}.zm-stat{border-right:none;border-bottom:1px solid var(--band-border)}.zm-mods{grid-template-columns:1fr}.zm-feats{grid-template-columns:1fr}.zm-ctaband{flex-direction:column;align-items:flex-start;padding:40px 32px}.zm-footgrid{grid-template-columns:1fr;padding:48px 22px 0}.zm-foot-bottom{padding:24px 22px 28px;flex-direction:column}.zm-sec{padding-left:22px!important;padding-right:22px!important}.zm-h2{font-size:30px}}
@media (prefers-reduced-motion:reduce){.zm-root *{animation:none!important}}
`;

function Logo({ size = 36, fill = "#4338ca" }: { size?: number; fill?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" aria-hidden>
      <rect width="36" height="36" rx="10" fill={fill} />
      <path d="M12 12h12L12 24h12" stroke="#fff" strokeWidth="3.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Stat({
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
  label,
  accent
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  label: string;
  accent?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [txt, setTxt] = useState(decimals ? (0).toFixed(decimals) : "0");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    let started = false;
    const run = () => {
      const t0 = performance.now();
      const dur = 1900;
      const tick = (now: number) => {
        const x = Math.min(1, (now - t0) / dur);
        const e = 1 - Math.pow(1 - x, 3);
        const v = value * e;
        setTxt(decimals ? v.toFixed(decimals) : Math.round(v).toLocaleString("en-US"));
        if (x < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    if (!("IntersectionObserver" in window)) {
      setTxt(decimals ? value.toFixed(decimals) : Math.round(value).toLocaleString("en-US"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !started) {
            started = true;
            run();
            io.disconnect();
          }
        }
      },
      { threshold: 0.35 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value, decimals]);

  return (
    <div className="zm-stat">
      <div ref={ref} className="zm-stat-num" style={accent ? { color: accent } : undefined}>
        {prefix}
        {txt}
        {suffix}
      </div>
      <div className="zm-stat-lbl">{label}</div>
    </div>
  );
}

export default function LandingPage() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem("zm-theme");
    } catch {
      saved = null;
    }
    if (saved === "dark" || saved === "light") setTheme(saved);
  }, []);

  const toggle = () => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      try {
        localStorage.setItem("zm-theme", next);
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  return (
    <div className="zm-root" data-theme={theme} id="top">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* NAV */}
      <div className="zm-nav">
        <a href="#top" style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Logo />
          <span className="zm-brand">
            Ziyo<span style={{ color: "var(--accent-ink)" }}>Mock</span>
          </span>
        </a>
        <div className="zm-navlinks">
          <a href="#top">Home</a>
          <a href="#features">Features</a>
          <a href="#modules">Modules</a>
          <a href="#contact">Contact</a>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button type="button" className="zm-toggle" onClick={toggle} aria-label="Toggle colour theme">
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--accent)" }} />
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>
          <Link href="/login" className="zm-login">
            Login
          </Link>
          <Link href="/register" className="zm-signup">
            Sign up free
          </Link>
        </div>
      </div>

      {/* HERO */}
      <div className="zm-hero zm-wrap zm-sec">
        <div
          className="zm-blob"
          style={{
            top: -140,
            right: -100,
            width: 440,
            height: 440,
            background: "radial-gradient(circle,var(--accent-soft),transparent 65%)",
            animation: "zm-blob 12s ease-in-out infinite alternate"
          }}
        />
        <div
          className="zm-blob"
          style={{
            bottom: -160,
            left: -120,
            width: 400,
            height: 400,
            background: "radial-gradient(circle,rgba(56,189,248,.12),transparent 65%)",
            animation: "zm-blob2 14s ease-in-out infinite alternate"
          }}
        />

        <div className="zm-rise" style={{ position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 22 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)", animation: "zm-pulse 1.8s infinite" }} />
            <span className="zm-eyebrow">COMPUTER-DELIVERED IELTS MOCK PLATFORM</span>
          </div>
          <h1 className="zm-h1">
            Practice Real.
            <br />
            <span className="zm-shim">Perform Better.</span>
          </h1>
          <p className="zm-lead">
            Sit realistic computer-delivered IELTS mock exams in the exact interface you&apos;ll face
            on test day. Timed sections, instant band estimates, and examiner-style feedback.
          </p>
          <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 30, flexWrap: "wrap" }}>
            <Link href="/register" className="zm-cta1">
              Create free account
            </Link>
            <a href="#features" className="zm-cta2">
              See how it works
            </a>
          </div>
          <div style={{ fontSize: 13, color: "var(--faint)", fontWeight: 500 }}>
            Trusted by 40+ learning centres · Cambridge-style question bank
          </div>
        </div>

        {/* EXAM PREVIEW MOCKUP */}
        <div style={{ position: "relative" }}>
          <div className="zm-preview zm-rise2">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#10142e", color: "#fff", padding: "14px 20px" }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>IELTS Academic — Reading · Part 1</span>
              <span style={{ display: "flex", alignItems: "center", gap: 7, background: "#4f46e5", borderRadius: 8, padding: "6px 12px", fontSize: 13, fontWeight: 700 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#a5f3fc", animation: "zm-pulse 1.4s infinite" }} />
                59:32
              </span>
            </div>
            <div style={{ padding: "24px 24px 20px" }}>
              <div style={{ display: "inline-block", background: "var(--accent-soft)", color: "var(--accent-ink)", fontSize: 11, fontWeight: 700, borderRadius: 6, padding: "4px 10px", marginBottom: 14 }}>
                QUESTION 4 OF 13
              </div>
              {[92, 78, 60].map((w, i) => (
                <div
                  key={i}
                  style={{
                    height: 11,
                    borderRadius: 6,
                    marginBottom: i === 2 ? 20 : 9,
                    width: `${w}%`,
                    background: "repeating-linear-gradient(45deg,var(--stripe1) 0 8px,var(--stripe2) 8px 16px)"
                  }}
                />
              ))}
              <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                {[
                  { sel: false, w: "55%" },
                  { sel: true, w: "64%" },
                  { sel: false, w: "48%" }
                ].map((o, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 11,
                      border: `1.5px solid ${o.sel ? "var(--accent)" : "var(--border)"}`,
                      background: o.sel ? "var(--accent-soft)" : "transparent",
                      borderRadius: 10,
                      padding: "11px 14px"
                    }}
                  >
                    <span style={{ width: 16, height: 16, borderRadius: "50%", border: `${o.sel ? "5px" : "2px"} solid ${o.sel ? "var(--accent)" : "var(--faint)"}`, boxSizing: "border-box" }} />
                    <span style={{ height: 9, borderRadius: 5, background: o.sel ? "var(--stripe1)" : "var(--surface2)", width: o.w }} />
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, padding: "14px 24px", borderTop: "1px solid var(--border)" }}>
              {[1, 2, 3, 4, 5, 6, 7].map((n) => {
                const done = n <= 3;
                const active = n === 4;
                return (
                  <span
                    key={n}
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 7,
                      fontSize: 11,
                      fontWeight: 700,
                      display: "grid",
                      placeItems: "center",
                      boxSizing: "border-box",
                      background: done ? "var(--btn)" : active ? "var(--accent-soft)" : "var(--surface2)",
                      color: done ? "#fff" : active ? "var(--accent-ink)" : "var(--faint)",
                      border: active ? "1.5px solid var(--accent)" : "none"
                    }}
                  >
                    {n}
                  </span>
                );
              })}
            </div>
          </div>

          <div className="zm-float" style={{ top: -18, left: -26, padding: "10px 16px", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 8, color: "var(--ink)", animation: "zm-float 5s ease-in-out infinite" }}>
            <span style={{ width: 26, height: 26, borderRadius: 8, background: "var(--accent-soft)", color: "var(--accent-ink)", display: "grid", placeItems: "center", fontSize: 12 }}>L</span>
            Listening · 30 min
          </div>
          <div style={{ position: "absolute", bottom: -16, right: -20, background: "linear-gradient(135deg,#4f46e5,#7c3aed)", color: "#fff", borderRadius: 14, padding: "12px 18px", boxShadow: "0 14px 30px var(--glow)", animation: "zm-float2 6s .5s ease-in-out infinite" }}>
            <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.8, letterSpacing: ".08em" }}>ESTIMATED BAND</div>
            <div style={{ fontSize: 26, fontWeight: 800 }}>7.5 ▲</div>
          </div>
        </div>
      </div>

      {/* STATS */}
      <div className="zm-stats">
        <Stat value={12400} suffix="+" label="Students trained" />
        <Stat value={58300} suffix="+" label="Mock exams delivered" />
        <Stat value={1.5} prefix="+" decimals={1} label="Average band improvement" accent="#a5b4fc" />
        <Stat value={96} suffix="%" label="Feel ready on exam day" />
      </div>

      {/* MODULES */}
      <div id="modules" className="zm-wrap zm-sec" style={{ padding: "88px 64px 40px" }}>
        <Reveal style={{ maxWidth: 640, marginBottom: 44 }}>
          <div className="zm-eyebrow2">FULL TEST COVERAGE</div>
          <h2 className="zm-h2">All the modules, exactly as delivered on test day</h2>
          <p className="zm-sec-lead">
            Complete mock exams or single-module practice — every question type in the official
            CD-IELTS format.
          </p>
        </Reveal>
        <div className="zm-mods">
          {MODULES.map((m, i) => (
            <Reveal key={m.k} delay={i * 90}>
              <div className="zm-mod">
                <div className="zm-ico">{m.k}</div>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>{m.t}</div>
                <div style={{ fontSize: 12.5, color: "var(--accent-ink)", fontWeight: 700, marginBottom: 10 }}>{m.meta}</div>
                <div style={{ fontSize: 13.5, lineHeight: 1.6, color: "var(--muted)" }}>{m.d}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      {/* FEATURES */}
      <div id="features" className="zm-wrap zm-sec" style={{ padding: "72px 64px 88px" }}>
        <Reveal style={{ maxWidth: 640, marginBottom: 44 }}>
          <div className="zm-eyebrow2">WHY ZIYOMOCK</div>
          <h2 className="zm-h2">Built to remove every surprise from exam day</h2>
          <p className="zm-sec-lead">
            Serious preparation needs serious realism. Everything here mirrors the official
            computer-delivered test.
          </p>
        </Reveal>
        <div className="zm-feats">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={(i % 3) * 90}>
              <div className="zm-feat">
                <div className="zm-fico">{f.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 16.5, marginBottom: 8 }}>{f.title}</div>
                <div style={{ fontSize: 14, lineHeight: 1.65, color: "var(--muted)" }}>{f.body}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="zm-wrap zm-sec" style={{ padding: "0 64px 88px" }}>
        <Reveal>
          <div className="zm-ctaband">
            <div
              className="zm-blob"
              style={{ top: -90, right: 120, width: 280, height: 280, background: "radial-gradient(circle,rgba(255,255,255,.14),transparent 65%)", animation: "zm-blob 10s ease-in-out infinite alternate" }}
            />
            <div style={{ position: "relative" }}>
              <h2 style={{ margin: "0 0 12px", fontSize: 36, fontWeight: 800, letterSpacing: "-.02em" }}>Ready for test day?</h2>
              <p style={{ margin: 0, fontSize: 16, lineHeight: 1.6, color: "rgba(255,255,255,.75)", maxWidth: 520 }}>
                Create a free account and sit your first full computer-delivered mock exam today.
              </p>
            </div>
            <Link href="/register" className="zm-ctaBtn">
              Sign up free →
            </Link>
          </div>
        </Reveal>
      </div>

      {/* FOOTER */}
      <div id="contact" className="zm-foot">
        <div className="zm-footgrid">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <Logo size={34} fill="#4f46e5" />
              <span style={{ fontWeight: 800, fontSize: 18 }}>ZiyoMock</span>
            </div>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: "var(--band-muted)", maxWidth: 300 }}>
              Practice Real, Perform Better. Computer-delivered IELTS mock exams for learning centres
              and independent students.
            </p>
          </div>
          <div className="zm-foot-col">
            <div className="zm-foot-h">PLATFORM</div>
            <a href="#features">Features</a>
            <a href="#modules">Test modules</a>
            <Link href="/register">Sign up</Link>
            <Link href="/login">Login</Link>
          </div>
          <div className="zm-foot-col">
            <div className="zm-foot-h">MODULES</div>
            <a href="#modules">Listening</a>
            <a href="#modules">Reading</a>
            <a href="#modules">Writing</a>
          </div>
          <div className="zm-foot-col" style={{ color: "var(--band-muted)" }}>
            <div className="zm-foot-h">CONTACT</div>
            <div>Qarshi, Uzbekistan</div>
            <div>+998 97 317 32 37</div>
            <div>Telegram · @PROGRAMMIST_7</div>
            <div>asilbekshuhratov0701@gmail.com</div>
          </div>
        </div>
        <div className="zm-foot-bottom">
          <span>© 2026 ZiyoMock. All rights reserved.</span>
          <span>Computer-delivered IELTS mock exam platform</span>
        </div>
      </div>
    </div>
  );
}
