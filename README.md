# IELTS Computer-Delivered Mock Platform

A production-grade IELTS CD mock-exam platform — **Listening, Reading, Writing** (no
Speaking). Automatic L/R scoring, examiner-marked Writing, a full admin CMS, and an
AI-assisted exam-import pipeline (Anthropic Claude) under strict admin review.

> **Status:** runnable monorepo with **working authentication** (register / login / logout,
> Argon2id, role-based guards) and a **functional exam engine** (start attempt, server-
> authoritative timer, answer autosave + heartbeat, resume on refresh, section advance &
> submit) on top of the full scaffold. Remaining features are typed stubs. Architecture
> blueprint in [`/docs`](docs/README.md).
>
> **To run it:** follow [`SETUP.md`](SETUP.md) (Neon Postgres + seed demo users + demo exam).

## Tech stack

Next.js 15 (App Router, TypeScript) · PostgreSQL + Prisma · Redis (Upstash) + BullMQ ·
separate Node worker · Cloudflare R2 · Anthropic Claude · Turborepo + pnpm.
Deployed on Vercel (web/API) + Railway/Fly (worker) + Neon/Supabase (Postgres).

## Quick start

```bash
corepack enable                       # provides pnpm
pnpm install
docker compose up -d                  # local Postgres + Redis
cp .env.example .env                  # fill in values
pnpm db:generate                      # generate Prisma client
pnpm --filter @ielts/db run migrate   # apply schema (needs a running Postgres)
pnpm dev                              # web (3000) + worker via Turbo
```

## Useful commands

| Command | What |
|---|---|
| `pnpm dev` | Run web + worker |
| `pnpm typecheck` | Typecheck all packages |
| `pnpm lint` | ESLint across the repo |
| `pnpm format` | Prettier write |
| `pnpm build` | Build all apps |
| `pnpm db:studio` | Prisma Studio |
| `WORKER_DRY_RUN=1 pnpm --filter @ielts/worker start` | Boot the worker without Redis |

## Layout

```
apps/web        Next.js full-stack (UI + /api)
apps/worker     BullMQ consumers, cron, AI pipeline
packages/db     Prisma schema + client
packages/core   scoring, band calc, state machines, timing
packages/ai     AIProvider interface + Claude adapter
packages/ui     components + question-type registry
packages/validators  shared Zod schemas
packages/config      tsconfig base + Tailwind preset
docs/           architecture blueprint
```

See [`docs/README.md`](docs/README.md) for the full blueprint (sitemap, ERD, API, flows,
security, deployment, AI import, admin CMS, and the E1–E14 extensions).
