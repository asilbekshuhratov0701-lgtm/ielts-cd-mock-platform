import Link from "next/link";
import { Sora, Manrope } from "next/font/google";
import { Reveal } from "@/components/marketing/Reveal";

const sora = Sora({ subsets: ["latin"], weight: ["400", "600", "700", "800"], variable: "--font-sora" });
const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-manrope"
});

const FEATURES = [
  {
    num: "01",
    title: "Real CD Exam Interface",
    body: "Practice on a screen that mirrors the official computer-delivered IELTS — same layout, timer, highlighting, and navigation."
  },
  {
    num: "02",
    title: "Instant Band Feedback",
    body: "Listening and Reading are auto-marked the moment you finish, with a band estimate so you always know where you stand."
  },
  {
    num: "03",
    title: "Track Your Progress",
    body: "Every mock is saved to your profile. Watch your scores climb over time and see exactly which skills need work next."
  }
];

const CSS = `
.zm-root{min-height:100vh;background:#F4F7FE;color:#101a30;overflow-x:hidden;--accent:#2563EB;--accent2:#7C5CFC;font-family:var(--font-manrope),sans-serif;}
.zm-root a{text-decoration:none;}
.zm-root a:not(.zm-btn){color:#2563EB;}
.zm-sora{font-family:var(--font-sora),sans-serif;}
.zm-header{position:sticky;top:0;z-index:50;background:rgba(255,255,255,0.85);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border-bottom:1px solid rgba(37,99,235,0.10);}
.zm-navrow{max-width:1200px;margin:0 auto;padding:14px 32px;display:flex;align-items:center;justify-content:space-between;gap:24px;}
.zm-logo{border-radius:12px;background:linear-gradient(135deg,var(--accent),var(--accent2));display:flex;align-items:center;justify-content:center;color:#fff;font-family:var(--font-sora),sans-serif;font-weight:800;box-shadow:0 6px 16px rgba(37,99,235,0.28);}
.zm-brand{font-family:var(--font-sora),sans-serif;font-weight:700;letter-spacing:3px;color:#101a30;}
.zm-nav{display:flex;align-items:center;gap:28px;}
.zm-navlink{font-weight:600;font-size:15px;color:#46506b;transition:color .2s ease;}
.zm-navlink:hover{color:var(--accent);}
.zm-navlink.zm-active{color:#101a30;}
.zm-btn{font-weight:700;border-radius:999px;white-space:nowrap;display:inline-block;transition:transform .2s ease,box-shadow .2s ease,background .2s ease;}
.zm-btn-primary{background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff;box-shadow:0 6px 18px rgba(37,99,235,0.30);}
.zm-btn-primary:hover{transform:translateY(-2px);box-shadow:0 10px 24px rgba(37,99,235,0.40);color:#fff;}
.zm-btn-ghost{background:#fff;color:#101a30;border:1px solid rgba(37,99,235,0.18);box-shadow:0 4px 12px rgba(16,26,48,0.06);}
.zm-btn-ghost:hover{transform:translateY(-2px);color:var(--accent);}
.zm-btn-hero-ghost{background:rgba(255,255,255,0.75);color:var(--accent);border:1px solid rgba(37,99,235,0.25);}
.zm-btn-hero-ghost:hover{transform:translateY(-3px);background:#ffffff;}
.zm-btn-lg{padding:16px 34px;font-size:17px;box-shadow:0 10px 26px rgba(37,99,235,0.35);}
.zm-btn-lg.zm-btn-primary:hover{transform:translateY(-3px);box-shadow:0 16px 34px rgba(37,99,235,0.45);}
.zm-btn-md{padding:11px 26px;font-size:15px;}
.zm-btn-sm{padding:10px 22px;font-size:15px;}
.zm-btn-white{background:#fff;color:var(--accent);border:1px solid rgba(37,99,235,0.14);box-shadow:0 10px 26px rgba(16,26,48,0.14);}
.zm-btn-white:hover{transform:translateY(-3px);box-shadow:0 16px 34px rgba(16,26,48,0.22);color:var(--accent2);}
.zm-blob{position:absolute;border-radius:50%;pointer-events:none;filter:blur(10px);}
.zm-hero-card{border-radius:32px;padding:64px 60px 72px;background:linear-gradient(120deg,#dce9ff,#ebe4ff,#d6f0ff,#e6e0ff,#dce9ff);background-size:300% 300%;animation:zm-gradient 14s ease infinite;box-shadow:0 24px 60px rgba(37,99,235,0.14),0 2px 8px rgba(16,26,48,0.05);position:relative;overflow:hidden;}
.zm-h1{margin:0 0 26px;font-family:var(--font-sora),sans-serif;font-weight:800;font-size:clamp(52px,7.5vw,96px);line-height:1.02;letter-spacing:-2px;color:#0d1530;}
.zm-feature-card{background:#fff;border-radius:24px;padding:36px 32px;border:1px solid rgba(37,99,235,0.10);box-shadow:0 8px 24px rgba(16,26,48,0.05);transition:transform .25s ease,box-shadow .25s ease;height:100%;}
.zm-feature-card:hover{transform:translateY(-6px);box-shadow:0 18px 40px rgba(37,99,235,0.14);}
.zm-footlink{color:#97a6cc;font-size:15px;transition:color .2s ease;}
.zm-footlink:hover{color:#ffffff;}
.zm-footgrid{display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:48px;}
@keyframes zm-gradient{0%{background-position:0% 50%;}50%{background-position:100% 50%;}100%{background-position:0% 50%;}}
@keyframes zm-float{0%,100%{transform:translateY(0) translateX(0);}50%{transform:translateY(-26px) translateX(14px);}}
@keyframes zm-float2{0%,100%{transform:translateY(0);}50%{transform:translateY(22px);}}
@keyframes zm-pulse{0%,100%{transform:scale(1);opacity:.55;}50%{transform:scale(1.12);opacity:.85;}}
@keyframes zm-dot{0%,100%{opacity:.35;}50%{opacity:1;}}
@media (max-width:860px){.zm-hero-card{padding:40px 28px 52px;}.zm-footgrid{grid-template-columns:1fr;gap:32px;}.zm-hide-sm{display:none!important;}}
@media (prefers-reduced-motion: reduce){.zm-root *{animation:none!important;}}
`;

export default function LandingPage() {
  return (
    <div className={`zm-root ${sora.variable} ${manrope.variable}`}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* NAV */}
      <header className="zm-header">
        <div className="zm-navrow">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div className="zm-logo" style={{ width: 40, height: 40, fontSize: 20 }}>
              Z
            </div>
            <div className="zm-brand" style={{ fontSize: 18 }}>
              ZIYOMOCK
            </div>
          </div>
          <nav className="zm-nav">
            <Link href="/" className="zm-navlink zm-active">
              Home
            </Link>
            <a href="#features" className="zm-navlink zm-hide-sm">
              Features
            </a>
            <Link href="/login" className="zm-navlink zm-hide-sm">
              Login
            </Link>
            <Link href="/register" className="zm-btn zm-btn-primary zm-btn-sm">
              Sign up
            </Link>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section style={{ position: "relative", padding: "72px 32px 96px" }}>
        <div
          className="zm-blob"
          style={{
            top: 40,
            left: -120,
            width: 380,
            height: 380,
            background: "radial-gradient(circle, rgba(124,92,252,0.20), transparent 70%)",
            animation: "zm-float 9s ease-in-out infinite"
          }}
        />
        <div
          className="zm-blob"
          style={{
            bottom: -60,
            right: -100,
            width: 440,
            height: 440,
            background: "radial-gradient(circle, rgba(37,99,235,0.18), transparent 70%)",
            animation: "zm-float2 11s ease-in-out infinite"
          }}
        />

        <div style={{ maxWidth: 1200, margin: "0 auto", position: "relative" }}>
          {/* brand strip */}
          <Reveal
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 24,
              marginBottom: 36,
              flexWrap: "wrap"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div className="zm-logo" style={{ width: 48, height: 48, fontSize: 24, borderRadius: "50%" }}>
                Z
              </div>
              <div>
                <div className="zm-sora" style={{ fontWeight: 700, fontSize: 15, letterSpacing: 4, color: "#2563EB" }}>
                  ZIYOMOCK
                </div>
                <div style={{ fontSize: 16, color: "#46506b", fontStyle: "italic" }}>
                  ZiyoMock — Practice Real, Perform Better.
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Link href="/login" className="zm-btn zm-btn-ghost zm-btn-md">
                Login
              </Link>
              <Link href="/register" className="zm-btn zm-btn-primary zm-btn-md">
                Sign up
              </Link>
            </div>
          </Reveal>

          {/* hero card */}
          <Reveal delay={120}>
            <div className="zm-hero-card">
              <div
                style={{
                  position: "absolute",
                  top: -80,
                  right: -60,
                  width: 300,
                  height: 300,
                  borderRadius: "50%",
                  border: "2px dashed rgba(124,92,252,0.30)",
                  animation: "zm-pulse 8s ease-in-out infinite",
                  pointerEvents: "none"
                }}
              />
              <div
                style={{
                  position: "absolute",
                  bottom: -100,
                  right: 140,
                  width: 200,
                  height: 200,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.35)",
                  pointerEvents: "none"
                }}
              />
              <div style={{ maxWidth: 780, position: "relative" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: "#7C5CFC",
                      animation: "zm-dot 2s ease-in-out infinite"
                    }}
                  />
                  <span className="zm-sora" style={{ fontWeight: 700, fontSize: 16, letterSpacing: 4, color: "#7C5CFC" }}>
                    PARTICIPATE IN THE
                  </span>
                </div>
                <h1 className="zm-h1">
                  MOCK IELTS
                  <br />
                  EXAM
                </h1>
                <p
                  style={{
                    margin: "0 0 36px",
                    fontSize: 20,
                    lineHeight: 1.65,
                    color: "#333e5c",
                    maxWidth: 640
                  }}
                >
                  Practice realistic computer-delivered IELTS mock exams in a controlled learning
                  center environment. Experience the real exam interface, track your progress, and
                  improve with confidence.
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                  <Link href="/play" className="zm-btn zm-btn-white zm-btn-lg">
                    Enter Exam Dashboard
                  </Link>
                  <Link href="/register" className="zm-btn zm-btn-white zm-btn-lg">
                    Sign up
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" style={{ position: "relative", padding: "24px 32px 104px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <Reveal style={{ textAlign: "center", marginBottom: 56 }}>
            <div
              className="zm-sora"
              style={{ fontWeight: 700, fontSize: 14, letterSpacing: 4, color: "#7C5CFC", marginBottom: 14 }}
            >
              WHY PRACTICE WITH US
            </div>
            <h2
              className="zm-sora"
              style={{ margin: 0, fontWeight: 800, fontSize: "clamp(32px,4vw,46px)", letterSpacing: -1, color: "#0d1530" }}
            >
              Everything you need to feel
              <br />
              ready on exam day
            </h2>
          </Reveal>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
            {FEATURES.map((f, i) => (
              <Reveal key={f.num} delay={i * 120}>
                <div className="zm-feature-card">
                  <div
                    className="zm-sora"
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 16,
                      background: "linear-gradient(135deg, rgba(37,99,235,0.10), rgba(124,92,252,0.14))",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 800,
                      fontSize: 20,
                      color: "#2563EB",
                      marginBottom: 22
                    }}
                  >
                    {f.num}
                  </div>
                  <h3 className="zm-sora" style={{ margin: "0 0 12px", fontWeight: 700, fontSize: 21, color: "#0d1530" }}>
                    {f.title}
                  </h3>
                  <p style={{ margin: 0, fontSize: 16, lineHeight: 1.65, color: "#46506b" }}>{f.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: "#0d1530", color: "#c6d2ee", padding: "64px 32px 32px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div
            className="zm-footgrid"
            style={{ paddingBottom: 48, borderBottom: "1px solid rgba(198,210,238,0.15)" }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
                <div className="zm-logo" style={{ width: 40, height: 40, fontSize: 20 }}>
                  Z
                </div>
                <div className="zm-brand" style={{ fontSize: 18, color: "#fff" }}>
                  ZIYOMOCK
                </div>
              </div>
              <p style={{ margin: 0, fontSize: 15, lineHeight: 1.7, color: "#97a6cc", maxWidth: 320 }}>
                Computer-delivered IELTS mock exams that feel like the real thing — so nothing
                surprises you on test day.
              </p>
            </div>
            <div>
              <div className="zm-sora" style={{ fontWeight: 700, fontSize: 14, letterSpacing: 2, color: "#fff", marginBottom: 18 }}>
                QUICK LINKS
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <Link href="/" className="zm-footlink">
                  Home
                </Link>
                <a href="#features" className="zm-footlink">
                  Features
                </a>
                <Link href="/login" className="zm-footlink">
                  Login
                </Link>
                <Link href="/register" className="zm-footlink">
                  Sign up
                </Link>
              </div>
            </div>
            <div>
              <div className="zm-sora" style={{ fontWeight: 700, fontSize: 14, letterSpacing: 2, color: "#fff", marginBottom: 18 }}>
                CONTACT
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 15 }}>
                <a href="mailto:hello@ziyomock.uz" className="zm-footlink">
                  hello@ziyomock.uz
                </a>
                <a href="tel:+998901234567" className="zm-footlink">
                  +998 90 123 45 67
                </a>
                <a href="https://t.me/ziyomock" className="zm-footlink">
                  Telegram: @ziyomock
                </a>
              </div>
            </div>
          </div>
          <div
            style={{
              paddingTop: 24,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
              fontSize: 14,
              color: "#6d7ea8"
            }}
          >
            <span>© 2026 ZiyoMock. All rights reserved.</span>
            <span>Practice Real, Perform Better.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
