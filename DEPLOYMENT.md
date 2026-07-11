# Deployment

How to take the IELTS mock platform from local dev to a real, hosted deployment.
For local setup see [`SETUP.md`](./SETUP.md); for architecture see [`CLAUDE.md`](./CLAUDE.md) and `/docs`.

## What you need to provision

| Component | Purpose | Recommended provider |
|---|---|---|
| **Postgres** | Primary database (prod uses Postgres, not SQLite) | [Neon](https://neon.tech) (serverless, free tier) |
| **Object storage** | Listening audio + passage/writing images (`Media`) | [Cloudflare R2](https://developers.cloudflare.com/r2/) (S3-compatible) — or a persistent disk (Path A) |
| **Email** | Password-reset links | [Resend](https://resend.com) |
| **App host** | Runs the Next.js app | Railway / Render (Path A) or Vercel (Path B) |
| **Redis** *(optional)* | Only if you run the background worker | [Upstash](https://upstash.com) |

The app **degrades gracefully** when optional pieces are missing:
- No R2 configured → media is written to the local disk (`public/media`).
- No `RESEND_API_KEY` → reset emails are skipped (logged, not sent); admins can still reset candidate passwords from **Admin → Candidates**.
- No Redis / worker → scoring runs inline on submit (the worker is not required).

---

## Choose a path

- **Path A — Railway / Render + persistent volume (simplest).** One Node service, a persistent
  disk for media, and Neon Postgres. No R2 needed. Best for a single test centre / pilot.
  Trade-off: the local disk is per-instance, so you can't run multiple app replicas.
- **Path B — Vercel + Neon + R2 + Resend (scalable).** Serverless app; media must go to R2
  (the serverless filesystem is read-only). Scales horizontally; the intended production target.

---

## Environment variables

Set these in your host's secret manager (never commit real values). Fill-in template:
[`apps/web/.env.production.example`](./apps/web/.env.production.example) — copy it to
`apps/web/.env.production` (gitignored). Base template: [`.env.example`](./.env.example).

### Required (all deployments)

| Variable | Notes |
|---|---|
| `DATABASE_URL` | Pooled Postgres URL (Neon `-pooler` host). Used by the app at runtime. |
| `DIRECT_URL` | Direct (non-pooled) Postgres URL. Used by Prisma for migrations. |
| `AUTH_SECRET` | Long random string. Generate with `npx auth secret` or `openssl rand -base64 32`. |
| `AUTH_TRUST_HOST` | `true` behind a hosting proxy. |
| `APP_URL` | Public base URL, e.g. `https://exams.yourcentre.com`. **Used to build reset links** — must be correct. |

### Media on R2 (required for Path B; optional for Path A)

| Variable | Notes |
|---|---|
| `R2_ACCOUNT_ID` | Cloudflare account ID. |
| `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | R2 API token (S3 credentials). |
| `R2_BUCKET` | Bucket name, e.g. `ielts-media`. |
| `R2_PUBLIC_BASE_URL` | Public read URL for the bucket (R2 public bucket or custom domain), e.g. `https://media.yourcentre.com`. Media URLs are `${R2_PUBLIC_BASE_URL}/<key>`. |

> All four of `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` must be set for uploads to use R2; otherwise the app falls back to local disk.

### Email (required for self-service password reset)

| Variable | Notes |
|---|---|
| `RESEND_API_KEY` | Resend API key. |
| `EMAIL_FROM` | Verified sender, e.g. `IELTS Platform <noreply@yourcentre.com>`. |

### AI import (optional)

| Variable | Notes |
|---|---|
| `ANTHROPIC_API_KEY` | Enables real PDF→exam extraction. Without it, AI import runs in mock mode. |
| `AI_MODEL_PRIMARY` | e.g. `claude-opus-4-8`. |

---

## Database: migrate before first boot

The app expects the Postgres schema to already exist. From a machine with `DATABASE_URL` +
`DIRECT_URL` set (e.g. `packages/db/.env`, or exported in your shell):

```bash
pnpm install
pnpm db:generate                       # generate the Postgres Prisma client
pnpm --filter @ielts/db run migrate    # apply migrations to Postgres
pnpm --filter @ielts/db run seed       # OPTIONAL: default org + demo users + demo exam
```

Run migrations again (`pnpm --filter @ielts/db run migrate`) whenever the schema changes,
**before** deploying the code that depends on it.

> Skip `seed` for a clean production tenant, or run it once to get a starting admin and a
> sample exam, then change the demo passwords immediately.

---

## Path A — Railway / Render + persistent volume

1. **Create the Postgres** (Neon) and copy the pooled + direct URLs.
2. **Run migrations** (section above) against that database.
3. **Create the service** from this repo. Build/start commands:
   - Install: `corepack enable && pnpm install`
   - Build: `pnpm --filter @ielts/web build`
   - Start: `pnpm --filter @ielts/web start` (binds to `$PORT`)
4. **Attach a persistent volume** mounted at `apps/web/public/media` (so uploaded audio/images
   survive restarts and deploys). Leave the R2 variables unset — the app writes there.
5. **Set env vars**: the Required block above (you can omit the R2 block).
6. **Deploy**, then run the [smoke checklist](#post-deploy-smoke-checklist).

> Because media lives on the instance disk, keep this a **single replica**. To scale out later,
> switch to Path B (R2).

---

## Path B — Vercel + Neon + R2 + Resend

1. **Postgres (Neon)** — create it; copy pooled → `DATABASE_URL`, direct → `DIRECT_URL`.
   Run migrations (section above).
2. **R2 bucket**
   - Create bucket `ielts-media`.
   - Create an R2 **API token** (Object Read & Write) → `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY`.
   - Enable public access: either turn on the **r2.dev public URL** or attach a **custom domain**
     (e.g. `media.yourcentre.com`). Put that URL in `R2_PUBLIC_BASE_URL`.
3. **Resend** — add + verify your sending domain, create an API key → `RESEND_API_KEY`, and set
   `EMAIL_FROM` to a verified address.
4. **Import to Vercel** — framework auto-detected (Next.js). Root is the monorepo; the app is
   `apps/web`. Install command `pnpm install`, build `pnpm --filter @ielts/web build`.
5. **Set env vars** — the Required + R2 + Email blocks (+ AI if used).
6. **Deploy**, then run the smoke checklist.

---

## Post-deploy smoke checklist

- [ ] `/api/health` returns `200`.
- [ ] Log in as an admin (change the seeded demo password immediately if you seeded).
- [ ] Create/publish an exam; **upload a Listening audio file** and confirm it plays in the
      runner (verifies media storage: R2 or disk).
- [ ] Take an exam end-to-end as a candidate → submit → Listening/Reading auto-score; Writing
      shows pending until marked.
- [ ] Mark Writing in **Admin → Writing Evaluation** → publish → candidate sees the overall band.
- [ ] **Forgot password** → email arrives → reset link works → old password rejected, new one works.
- [ ] Candidate **Analytics** and **Profile** pages load and save.

---

## Backups & operations

- **Database backups.** Enable your Postgres provider's automated backups / point-in-time
  restore (Neon has PITR). This is the source of truth for candidate results — do not skip it.
- **Media backups.** R2: enable versioning or periodic sync. Path A: back up the volume.
- **In-app export.** **Admin → Settings → Backup Data** exports the whole org as JSON/Excel — a
  useful secondary export, not a substitute for real DB backups.
- **Secrets rotation.** Rotate `AUTH_SECRET` only during a maintenance window (it invalidates
  active sessions). Rotate R2 / Resend / Anthropic keys via their dashboards.
- **Monitoring** *(recommended)*. `SENTRY_DSN` is reserved in the env template; wire an error
  monitor before opening to real cohorts.

---

## Optional: background worker

Only needed if/when scoring or cron is offloaded from the request path (currently scoring runs
inline). To run it, provision Redis (Upstash) and set `REDIS_URL`, then start
`pnpm --filter @ielts/worker start` as a **separate** service/process. The web app does not
depend on it.

---

## Troubleshooting

- **Uploads fail / audio 404s on Vercel** — media is trying to write to disk. Set the four
  `R2_*` variables (Path B); the serverless filesystem is read-only.
- **Reset emails never arrive** — check `RESEND_API_KEY` is set and `EMAIL_FROM` uses a
  Resend-verified domain; look for `[email] send failed` in logs. Unset key → emails are
  silently skipped by design.
- **Reset link points at `localhost`** — `APP_URL` is wrong; set it to the public URL.
- **Prisma can't reach the DB during migrate** — use `DIRECT_URL` (non-pooled) for migrations;
  the pooled URL is for the running app.
- **`next build` "Cannot find module for page"** — stale `.next`; delete `apps/web/.next` and
  rebuild (dev and build share that directory).
