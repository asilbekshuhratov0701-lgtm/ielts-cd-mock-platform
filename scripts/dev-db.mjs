import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dbDir = path.join(root, ".localdb");
const dbFile = path.join(dbDir, "local.db");
const dbUrl = "file:" + dbFile.replace(/\\/g, "/");

function upsertEnvVar(contents, key, value) {
  const line = `${key}="${value}"`;
  const re = new RegExp(`^${key}=.*$`, "m");
  return re.test(contents) ? contents.replace(re, line) : `${contents.trimEnd()}\n${line}\n`;
}

const envPath = path.join(root, "apps", "web", ".env");
let env = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
if (!/^AUTH_SECRET=/m.test(env)) {
  env = `${env.trimEnd()}\nAUTH_SECRET="local-dev-only-secret-change-me-1234567890abcdef"\nAUTH_TRUST_HOST=true\n`;
}
env = upsertEnvVar(env, "DATABASE_URL", dbUrl);
env = upsertEnvVar(env, "DIRECT_URL", dbUrl);
writeFileSync(envPath, env);
console.log("[db:local] .env DATABASE_URL ->", dbUrl);

mkdirSync(dbDir, { recursive: true });

console.log("[db:local] generating SQLite schema...");
execSync("node scripts/gen-sqlite-schema.mjs", { cwd: root, stdio: "inherit" });

const childEnv = { ...process.env, DATABASE_URL: dbUrl, DIRECT_URL: dbUrl };

console.log("[db:local] applying schema + generating client (prisma db push)...");
execSync("pnpm --filter @ielts/db exec prisma db push --schema prisma/schema.sqlite.prisma", {
  cwd: root,
  env: childEnv,
  stdio: "inherit"
});

console.log("[db:local] seeding demo data...");
execSync("pnpm --filter @ielts/db run seed", { cwd: root, env: childEnv, stdio: "inherit" });

console.log("");
console.log("==================================================================");
console.log(" Local SQLite database is READY (no server, works in any terminal).");
console.log("   file: " + dbFile);
console.log("");
console.log(" Now start the web app (same or new terminal):");
console.log("   pnpm dev:web");
console.log("");
console.log(" Open http://localhost:3000 and log in:");
console.log("   candidate@demo.test / Candidate12345!   (or admin@demo.test / Admin12345!)");
console.log("==================================================================");
