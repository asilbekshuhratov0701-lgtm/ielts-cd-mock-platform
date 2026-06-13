import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Headphones,
  PenLine,
  ShieldCheck,
  Sparkles,
  Timer
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";

const FEATURES = [
  {
    icon: Headphones,
    title: "True Computer-Delivered feel",
    body: "Listening, Reading and Writing under real exam conditions — play-once audio, split reading, question navigator and flagging."
  },
  {
    icon: Timer,
    title: "Server-authoritative timing",
    body: "Section timers run on the server with auto-submit and refresh recovery — your time and answers are never lost."
  },
  {
    icon: BarChart3,
    title: "Instant Listening & Reading scores",
    body: "Automatic marking against official band tables the moment you submit, with a clear per-skill breakdown."
  },
  {
    icon: PenLine,
    title: "Examiner-marked Writing",
    body: "Task 1 & 2 graded by real examiners on the four IELTS criteria, then combined into your overall band."
  },
  {
    icon: ShieldCheck,
    title: "Exam integrity built in",
    body: "Single active attempt, locked runner, and secure scoring keep every mock fair and trustworthy."
  },
  {
    icon: Sparkles,
    title: "AI-assisted exam import",
    body: "Admins turn real IELTS materials into ready-to-run mock exams — with full human review before publishing."
  }
];

const STATS = [
  { value: "3", label: "Skills tested" },
  { value: "40+", label: "Question types" },
  { value: "9.0", label: "Band scale" },
  { value: "100%", label: "Exam-condition" }
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/80 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Logo />
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Login
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm">Sign Up</Button>
            </Link>
          </div>
        </nav>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-hero-grid [background-size:24px_24px]" />
        <div className="mx-auto max-w-4xl px-6 py-24 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-brand-700 shadow-soft">
            <Sparkles className="h-3.5 w-3.5" /> Computer-Delivered IELTS mock platform
          </span>
          <h1 className="mt-6 text-balance text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
            Practice IELTS that feels like{" "}
            <span className="bg-brand-gradient bg-clip-text text-transparent">the real test</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-muted">
            Listening, Reading and Writing under genuine exam conditions — automatic scoring,
            examiner-marked Writing, and detailed band reports to track your progress.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link href="/register">
              <Button size="lg">
                Get started free <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg">
                I have an account
              </Button>
            </Link>
          </div>

          <div className="mx-auto mt-14 grid max-w-2xl grid-cols-2 gap-4 sm:grid-cols-4">
            {STATS.map((s) => (
              <div
                key={s.label}
                className="rounded-2xl border border-border bg-surface p-4 shadow-soft"
              >
                <p className="text-2xl font-bold tracking-tight text-brand-700">{s.value}</p>
                <p className="mt-1 text-xs text-muted">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Everything a real mock needs
          </h2>
          <p className="mt-3 text-muted">
            Built as a full examination system — not a practice quiz.
          </p>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="group rounded-2xl border border-border bg-surface p-6 shadow-soft transition-shadow hover:shadow-card"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 transition-colors group-hover:bg-brand-600 group-hover:text-white">
                <f.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-semibold text-foreground">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="overflow-hidden rounded-3xl bg-brand-gradient px-8 py-14 text-center shadow-card">
          <h2 className="text-3xl font-bold tracking-tight text-white">Ready to find your band?</h2>
          <p className="mx-auto mt-3 max-w-xl text-brand-100">
            Create an account and take your first full mock under exam conditions today.
          </p>
          <Link href="/register" className="mt-8 inline-block">
            <Button size="lg" className="bg-white text-brand-700 hover:bg-brand-50">
              Start your first mock <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
          <Logo />
          <p className="text-sm text-muted">© {new Date().getFullYear()} IELTS Mock Platform</p>
          <div className="flex gap-4 text-sm text-muted">
            <Link href="/login" className="hover:text-brand-700">
              Login
            </Link>
            <Link href="/register" className="hover:text-brand-700">
              Sign Up
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
