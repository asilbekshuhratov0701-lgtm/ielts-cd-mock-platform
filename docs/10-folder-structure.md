# 10 · Folder Structure

Turborepo + pnpm monorepo. The repository currently contains a **runnable skeleton with no
business logic** (typed stubs, full Prisma schema, configs) — verified to install,
typecheck, lint, build, and boot.

```
ielts-platform/
├─ apps/
│  ├─ web/                      Next.js 15 full-stack (UI + /api route handlers)
│  │  ├─ src/app/
│  │  │  ├─ (marketing)/        landing
│  │  │  ├─ (auth)/             login · register · forgot · reset
│  │  │  ├─ (candidate)/        dashboard · exams · results · analytics · profile
│  │  │  ├─ (exam)/exam/[attemptId]/   locked runner
│  │  │  ├─ (admin)/admin/      overview + all CMS sections
│  │  │  └─ api/                health + v1 catch-all (501 stubs)
│  │  ├─ src/components/        app-local composites (Shell helpers)
│  │  ├─ src/lib/               db · env · auth
│  │  ├─ src/middleware.ts      RBAC redirect (stub)
│  │  ├─ next.config.mjs · tailwind.config.cjs · postcss.config.mjs · tsconfig.json
│  └─ worker/                   Node worker: BullMQ consumers, cron, AI pipeline
│     └─ src/  index.ts · redis.ts · queues/ · jobs/ · cron/
├─ packages/
│  ├─ db/                       Prisma schema + client singleton + seed
│  │  └─ prisma/schema.prisma   ← single source of truth for the database
│  ├─ core/                     domain logic: scoring, band-calc, state machines, timing
│  ├─ ai/                       AIProvider interface + Claude adapter
│  ├─ ui/                       shadcn/Radix primitives + question-type registry
│  ├─ validators/               shared Zod schemas
│  └─ config/                   tsconfig base + Tailwind preset
├─ docs/                        this blueprint
├─ .github/workflows/ci.yml     lint · typecheck · build
├─ docker-compose.yml           local Postgres + Redis
├─ turbo.json · pnpm-workspace.yaml · package.json
├─ eslint.config.mjs · .prettierrc.json · .env.example · .gitignore
```

## Package boundaries

| Package | Depends on | Notes |
|---|---|---|
| `@ielts/core` | (none) | Pure logic; self-contained domain types — runs in web & worker |
| `@ielts/validators` | zod | Shared request schemas |
| `@ielts/ai` | core | Provider interface + adapters |
| `@ielts/ui` | core, react | Components + registry |
| `@ielts/db` | @prisma/client | Schema, migrations, client singleton |
| `@ielts/web` | all of the above | The app |
| `@ielts/worker` | core, ai, db | Background jobs |

Internal packages export TypeScript **source** (`main`/`types` → `src/index.ts`); Next
consumes them via `transpilePackages`, so there is no separate build step.

## Conventions

- Linting is a single root pass (`pnpm lint` → `eslint .`); typecheck is per-package via
  Turbo (`tsc --noEmit`).
- Prisma client is generated on install (`pnpm db:generate`) and re-exported from
  `@ielts/db`.
- Stubs return correct types and `throw new Error("Not implemented: …")` so the tree
  compiles end-to-end before features land.
