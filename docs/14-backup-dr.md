# 14 · Backup & Disaster Recovery (E12)

Every critical operation favours safety and recoverability. This runbook covers data
durability and recovery for an exam platform where lost work is unacceptable.

## What must survive

| Asset | Store | Protection |
|---|---|---|
| Relational data (attempts, answers, scores, content) | Postgres (Neon/Supabase) | PITR + automated snapshots |
| Media (audio, images, docs) | Cloudflare R2 | Object versioning + lifecycle |
| In-flight exam state | Postgres + client IndexedDB | Server is source of truth; client buffer for unsent answers |
| Job state | Redis (Upstash) | Reconstructable; jobs are idempotent |

## Backup policy

- **Postgres** — point-in-time recovery (PITR) enabled; **daily** automated snapshots
  retained 7–30 days; **weekly** long-retention backup retained 90+ days. Pre-migration
  snapshot before every schema change.
- **Media** — R2 **object versioning** on; lifecycle rules to retain prior versions;
  periodic cross-region/off-provider copy of critical media for high-stakes deployments.
- **Config** — infrastructure + env templates in git; secrets in the platform secret
  manager with its own backup.

## Restore procedures (documented & rehearsed)

1. **Point-in-time DB restore** — restore Postgres to a timestamp (e.g., just before an
   incident); repoint `DATABASE_URL`/`DIRECT_URL`; run `prisma migrate deploy` if needed.
2. **Single-record recovery** — use snapshots/audit log to recover specific attempts or
   submissions without a full restore.
3. **Media restore** — roll an R2 object back to a prior version by key.
4. **Worker recovery** — redeploy the worker; idempotent jobs and the finalize cron
   reconcile any in-flight attempts.

## Recovery testing

- **Quarterly** restore drill into a staging project; verify schema applies, `prisma
  studio` shows data, and a sample exam attempt replays end-to-end.
- Track **RPO** (target ≤ 5 min via PITR) and **RTO** (target ≤ 1 hour) per deployment.

## Disaster scenarios → response

| Scenario | Response |
|---|---|
| Accidental data deletion | PITR restore to pre-incident timestamp |
| DB corruption | Restore latest healthy snapshot; replay WAL to PITR point |
| Region outage (provider) | Fail over to standby region / restore from off-region backup |
| Media loss | Restore object versions from R2; re-copy from off-provider mirror |
| Mass disconnect during exam day | Server state intact; candidates resume (E7); cron auto-submits expired |

## Candidate-side resilience

The Emergency Recovery module (E7, [15-extensions.md](15-extensions.md)) means browser
refresh, crash, power loss, internet drop, restart, or disconnect do not lose answers,
remaining time, or audio state — the candidate logs back in and resumes.
