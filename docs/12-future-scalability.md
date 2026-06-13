# 12 · Future Scalability

The architecture is built to grow from a single educational center to many, and from
hundreds to thousands of concurrent candidates, without a rewrite.

## Scaling levers

- **Multi-center / multi-tenant** — every tenant-scoped row already carries `orgId`. Going
  multi-tenant is row-level scoping + an org switcher, not a schema migration.
- **Horizontal scaling** — the web tier is stateless (Vercel autoscale); the worker scales
  by adding replicas (BullMQ distributes jobs across them).
- **Concurrent examinations** — server-authoritative timing is stateless (absolute
  `deadlineAt`), so concurrency scales with the database + Redis, not app memory.
- **Database** — add read replicas for analytics; precompute heavy dashboards into
  materialized rollup tables (the `analytics` worker queue).
- **Role expansion** — `StaffProfile.permissionsJson` + RBAC tables allow new roles
  (e.g., Center Manager, Reviewer) without code forks.
- **Plugin-style AI** — the `AIProvider` interface lets new providers/capabilities drop in
  (auto answer-key generation, audio-question linking, smart search) without architectural
  change.
- **Realtime** — Live Exam Center polls today; a realtime service (Ably/Pusher/Supabase
  Realtime) can replace polling for live proctoring with no core changes.
- **Media** — R2 + CDN already scales; large audio can move to HLS streaming.

## Capacity guidance (indicative)

| Stage | Setup |
|---|---|
| 1 center, < 500 candidates | Single worker replica; Neon/Upstash free–starter tiers |
| Several centers, thousands of candidates | 2–4 worker replicas; pooled Postgres + read replica; Redis paid tier |
| Exam-day spikes (mass concurrent) | Pre-warm worker replicas; QStash-scheduled finalize fan-out; CDN for audio |

## Extensibility principles

- New question types = one registry entry (UI) + one enum value (schema).
- New content modules ride the universal Draft→Review→Publish workflow (E4).
- New background work = a new BullMQ queue + consumer; no web changes.
- Everything tunable (timings, band tables, weighting, limits) lives in `Setting`, not code.
