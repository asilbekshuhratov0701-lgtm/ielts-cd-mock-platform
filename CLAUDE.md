# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A production-oriented **IELTS Computer-Delivered mock-exam platform** (Listening, Reading, Writing — no Speaking). Turborepo + pnpm monorepo: a Next.js 15 full-stack web app, a background worker, and shared packages. Full architecture blueprint lives in `/docs`; local run guide in `SETUP.md`.

## Commands

```bash
corepack enable && pnpm install      # pnpm is pinned via packageManager; not global

# Local development (SQLite — works in ANY terminal, no Docker/Postgres/admin needed)
pnpm db:local                        # one-shot: generate SQLite schema+client, push, seed demo data
pnpm dev:web                         # Next.js dev server → http://localhost:3000
# (run db:local and dev:web in that order; see gotcha below)

pnpm typecheck                       # Turbo: tsc --noEmit across all packages
pnpm lint                            # root `eslint .` (flat config, scoped to **/*.{ts,tsx})
pnpm format        / pnpm format:check
pnpm --filter @ielts/web build       # production build (needs dummy AUTH_SECRET + DATABASE_URL env)

# Prisma (prod = Postgres)
pnpm db:generate                     # regenerate the POSTGRES client (prod)
pnpm --filter @ielts/db run migrate  # apply migrations to Postgres/Neon
pnpm db:studio

# Worker (boots without Redis for a smoke test)
WORKER_DRY_RUN=1 pnpm --filter @ielts/worker start
```

There is **no automated test suite yet** — "verification" means typecheck + lint + build (+ manual checks). Don't invent test commands.

Demo logins after `pnpm db:local`: `admin@demo.test` / `Admin12345!` and `candidate@demo.test` / `Candidate12345!` (seed also creates a published "IELTS Academic Mock 1").

## Dual database client (the most important thing to understand)

Prod uses **PostgreSQL**; local dev uses **SQLite**. There is one canonical schema, `packages/db/prisma/schema.prisma` (Postgres, with enums). `scripts/gen-sqlite-schema.mjs` transforms it into `schema.sqlite.prisma` (provider→sqlite, **enums→String**, drops `@db.Text`/`directUrl`). `pnpm db:local` generates the **SQLite** client; `pnpm db:generate` generates the **Postgres** client — they overwrite the same `@prisma/client`.

Consequences for all code touching the DB:
- It must **compile against both clients**. Under SQLite, Prisma enum fields are typed `string`; under Postgres they're enum unions.
- Because of this, the `Role` type is defined in **`@ielts/core`**, not imported from `@ielts/db`, and mapping helpers return **string-literal unions** (assignable to both). Follow this pattern when adding enum-typed code.
- Turbo's typecheck cache keys on source, not the generated client, so switching clients won't bust it. To force-check against the current client: `pnpm --filter @ielts/web exec tsc --noEmit`.

## Architecture

- **`apps/web`** — Next.js 15 (App Router) full-stack: UI **and** backend (route handlers under `src/app/api`, plus server actions in `src/lib/*-actions.ts`). Route groups: `(marketing) (auth) (candidate) (exam) (admin)`. **Next reads env from `apps/web/.env`, not the repo root.**
- **`apps/worker`** — BullMQ consumers + cron (stubs); queues are created **lazily** (`getQueue`) so importing the module never opens Redis.
- **`packages/core`** — pure domain logic (scoring, band tables, exam state machine, server-authoritative timing). No I/O, no Prisma, no framework code; reused by web and worker.
- **`packages/db`** — Prisma schema + client singleton (`prisma`) + seed. **`packages/ai`** — `generateExamDraft` (Anthropic tool-use + mock fallback) and a provider interface. **`packages/ui`** — shared component + question-type registry shape. **`packages/validators`** — shared Zod schemas. **`packages/config`** — base tsconfig + Tailwind preset.
- Internal packages export **TypeScript source** (no build step); the web app consumes them via `transpilePackages`.

Request pipeline: route handler / server action → Zod validation (`@ielts/validators`) → RBAC (middleware blocks `CANDIDATE` from `/admin`; user-management/AI-import actions additionally require ADMIN/SUPER_ADMIN) → service (`apps/web/src/lib/*.ts`) → Prisma.

### Auth (split config)
Auth.js (NextAuth v5). `apps/web/src/auth.config.ts` is **edge-safe** (no DB/native deps; holds JWT/session shaping + the `authorized` route-guard with role redirects) and is used by `middleware.ts`. `apps/web/src/auth.ts` adds the Credentials provider (Prisma lookup + Argon2id via `@node-rs/argon2`) and is used by the API route + server actions. Sessions are JWT carrying `role`.

### Exam engine (server-authoritative)
The timer is never a live process. On section start the server stores `SectionAttempt.deadlineAt`; the client renders a countdown from it, but the server **rejects answer writes after the deadline**. Server logic: `apps/web/src/lib/exam.ts`; REST: `app/api/v1/attempts/*`; client runner: `components/exam/ExamRunner.tsx` (debounced autosave + 15s heartbeat + auto-advance). Single active attempt enforced in code (and intended partial-unique index). On final submit, `lib/scoring.ts` auto-scores Listening/Reading against answer keys → bands; Writing is examiner-marked at `/admin/writing` (computes Writing + Overall band, then publishes).

### AI exam import
`/admin/imports`: PDF upload → `unpdf` extracts text → `packages/ai/src/import.ts#generateExamDraft` (Claude tool-use against a strict schema; falls back to a mock generator when `ANTHROPIC_API_KEY` is unset) → `apps/web/src/lib/ai-import.ts#importExamFromPdf` maps the draft into a **DRAFT** exam (`source: AI_IMPORT`) the admin reviews/edits/publishes in the exam builder. Answer keys are only filled when present in the source file. Runs inline in the server action (worker offload is future). `@anthropic-ai/sdk` and `unpdf` are in `serverExternalPackages` (next.config).

## Conventions & gotchas

- **No code comments** — the user prefers code written without comments (markdown docs are fine).
- **RSC boundary**: never pass a function/component (e.g. a `lucide-react` icon component) as a prop from a Server Component into a Client Component — pass a rendered element instead (`icon={<Icon className="..." />}`; client components take `icon?: ReactNode`). Passing a component function causes a 500.
- **Don't run `pnpm db:local` while `pnpm dev:web` is running** — the dev server locks the Prisma query-engine DLL (`EPERM` on regenerate). Stop the app first; kill stray `node` if `prisma generate` hits EPERM.
- Postgres refuses to start under an elevated Windows token — that's why local dev uses SQLite (don't reach for embedded Postgres).
- **UI**: design-system kit in `apps/web/src/components/ui/` (Button/Card/Badge/Input/StatCard) + `cn()` (`lib/cn.ts`, clsx + tailwind-merge), `lucide-react` icons, Inter font; tokens in `packages/config/tailwind.preset.cjs` + CSS vars in `app/globals.css`. Reuse these rather than hand-rolling.
- **Git**: commit + push per meaningful change to the private repo `ielts-cd-mock-platform`. `gh` is installed at `"/c/Program Files/GitHub CLI/gh.exe"` (not on the spawned-shell PATH). End commit messages with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- Secrets/artifacts are gitignored (`.env`, `.localdb/`, `node_modules`, `.next`, `schema.sqlite.prisma`); `.env.example` is the tracked template. `.gitattributes` enforces LF.
