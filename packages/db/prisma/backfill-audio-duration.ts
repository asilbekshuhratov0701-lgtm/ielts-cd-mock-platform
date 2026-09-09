import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { probeAudioDurationSec } from "@ielts/core";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const dryRun = process.argv.includes("--dry-run");
const force = process.argv.includes("--force");

function fail(message: string): never {
  console.error(`\n  ✖ ${message}\n`);
  process.exit(1);
}

function envFromWeb(key: string): string | undefined {
  const envPath = path.join(root, "apps", "web", ".env");
  if (!existsSync(envPath)) return undefined;
  const m = readFileSync(envPath, "utf8").match(new RegExp(`^${key}="?([^"\\n]+)"?`, "m"));
  return m?.[1];
}

if (!process.env.DATABASE_URL) {
  const url = envFromWeb("DATABASE_URL");
  if (url) process.env.DATABASE_URL = url;
}
if (!process.env.DATABASE_URL) {
  fail(
    "DATABASE_URL is not set and apps/web/.env has none.\n" +
      "  Local: run `pnpm db:local` first. Prod: set DATABASE_URL to your Postgres URL."
  );
}

const publicBase = (process.env.R2_PUBLIC_BASE_URL ?? envFromWeb("R2_PUBLIC_BASE_URL"))?.replace(
  /\/$/,
  ""
);

async function loadBytes(r2Key: string): Promise<Uint8Array | null> {
  if (publicBase) {
    const res = await fetch(`${publicBase}/${r2Key.split("/").map(encodeURIComponent).join("/")}`);
    if (!res.ok) return null;
    return new Uint8Array(await res.arrayBuffer());
  }
  const local = path.join(root, "apps", "web", "public", "media", r2Key);
  if (!existsSync(local)) return null;
  return new Uint8Array(readFileSync(local));
}

function clock(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

const { prisma } = await import("../src/index");

const rows = await prisma.media.findMany({
  where: force ? { kind: "AUDIO" } : { kind: "AUDIO", durationSec: null },
  select: { id: true, r2Key: true, originalName: true, durationSec: true },
  orderBy: { createdAt: "asc" }
});

console.log(
  `[audio-length] ${rows.length} audio file(s) to inspect from ${publicBase ?? "public/media"}` +
    (dryRun ? " (dry run)" : "")
);

let written = 0;
let missing = 0;
let unreadable = 0;

for (const row of rows) {
  const label = row.originalName ?? row.r2Key;
  const bytes = await loadBytes(row.r2Key);
  if (!bytes) {
    missing += 1;
    console.log(`  · ${label} — file not found in storage, skipped`);
    continue;
  }
  const durationSec = probeAudioDurationSec(bytes);
  if (!durationSec) {
    unreadable += 1;
    console.log(`  · ${label} — length could not be read, skipped`);
    continue;
  }
  if (row.durationSec === durationSec) {
    console.log(`  · ${label} — already ${clock(durationSec)}`);
    continue;
  }
  if (!dryRun) await prisma.media.update({ where: { id: row.id }, data: { durationSec } });
  written += 1;
  console.log(`  ✓ ${label} — ${clock(durationSec)}`);
}

console.log(
  `\n[audio-length] ${dryRun ? "would update" : "updated"} ${written}, ` +
    `${missing} missing from storage, ${unreadable} unreadable.\n` +
    "Listening sections with a known length now run for exactly that long.\n"
);

await prisma.$disconnect();
