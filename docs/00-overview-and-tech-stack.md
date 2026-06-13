# 00 · Overview & Technology Recommendations

## Goal

Replicate the official **IELTS Computer-Delivered** experience for Listening, Reading and
Writing, for real candidates in educational centers. This is an **examination management
system**, not a practice site: server-authoritative timing, automatic objective scoring,
manual Writing evaluation, a full admin CMS, and AI-assisted exam import.

## Guiding principles

- **Administrative-automation principle** — automate repetitive admin work wherever
  practical, but **AI/automation never removes administrator authority**. Admins keep
  final approval on everything candidate-facing.
- **Universal publish gate** — nothing reaches candidates without explicit admin approval
  (see [15-extensions.md](15-extensions.md) · E4).
- **Final design principle** — prioritize **reliability, administrative efficiency, exam
  integrity, scalability, extensibility**; every critical operation favours **safety and
  recoverability over convenience**.

## Technology stack (recommended & chosen)

| Layer | Choice | Why |
|---|---|---|
| Frontend + API | **Next.js 15 (App Router, TypeScript)** full-stack | One codebase for UI + route handlers; SSR for marketing/dashboards, client runner for exams |
| Styling / UI | **Tailwind CSS + shadcn/ui (Radix)** | Accessible, themeable, dark-mode ready |
| Charts | **Recharts** | Analytics dashboards |
| Database | **PostgreSQL + Prisma** | Relational, ACID — essential for attempts/scoring; typed access |
| Cache / queue / rate-limit | **Redis (Upstash)** + **BullMQ** | Sessions, rate limiting, background jobs |
| Background worker | **Separate Node service** | Long-running AI import, scoring batches, scheduled auto-submit, email, reports |
| Object storage | **Cloudflare R2** (S3-compatible) | Audio, images, documents; signed URLs + CDN |
| AI | **Anthropic Claude** behind a modular `AIProvider` interface | Vision for scans, large context, structured tool-use output |
| Auth | **Auth.js (NextAuth v5)** + Argon2id | Credentials, role-based, httpOnly cookies |
| Email | **Resend / Postmark** | Transactional email |
| Observability | **Sentry** + Axiom/Logtail | Errors, logs |
| Monorepo | **Turborepo + pnpm** | Shared packages, fast CI |

### Why a separate worker on serverless

Vercel functions are short-lived and stateless. Anything long-running or stateful — the
AI import pipeline, scoring batches, the scheduled auto-submit finalizer, email and report
generation — runs in the **worker** (Railway/Fly.io). The web app only enqueues jobs to
Redis. Shared domain logic lives in `packages/core` so web and worker never diverge. See
[06-backend-architecture.md](06-backend-architecture.md).

## Modules at a glance

Landing · Authentication · Candidate dashboard · Exam engine (Listening → Reading →
Writing) · Result system · Progress analytics · Admin CMS · AI import · Question bank /
content library · Media library · Notifications · Live exam monitoring · Emergency
recovery.

## AI models

- `AI_MODEL_PRIMARY=claude-opus-4-8` — hard analysis / ambiguous content.
- `AI_MODEL_FAST=claude-sonnet-4-6` — cheap high-volume passes.

Hybrid pipeline = rule-based parsing first, AI only for low-confidence content (cost
control). See [07-ai-import-pipeline.md](07-ai-import-pipeline.md).
