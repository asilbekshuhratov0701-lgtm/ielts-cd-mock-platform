import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hash } from "@node-rs/argon2";

const ARGON_OPTS = { memoryCost: 19456, timeCost: 2, outputLen: 32, parallelism: 1 } as const;

function arg(name: string): string | undefined {
  const eq = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (eq) return eq.slice(name.length + 3);
  const i = process.argv.indexOf(`--${name}`);
  if (i !== -1 && process.argv[i + 1] && !process.argv[i + 1]!.startsWith("--")) {
    return process.argv[i + 1];
  }
  return undefined;
}

function fail(message: string): never {
  console.error(`\n  ✖ ${message}\n`);
  process.exit(1);
}

const currentEmail = (arg("current") ?? "admin@demo.test").trim().toLowerCase();
const newEmail = arg("email")?.trim().toLowerCase();
const newPassword = arg("password");
const newName = arg("name")?.trim();

if (!newEmail && !newPassword) {
  fail(
    "Nothing to change. Pass --email and/or --password.\n" +
      "  Example: pnpm --filter @ielts/db run set-admin --email you@domain.com --password 'YourPass123!'"
  );
}
if (newEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) fail(`'${newEmail}' is not a valid email.`);
if (newPassword !== undefined && newPassword.length < 8) fail("Password must be at least 8 characters.");

if (!process.env.DATABASE_URL) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
  const envPath = path.join(root, "apps", "web", ".env");
  if (existsSync(envPath)) {
    const m = readFileSync(envPath, "utf8").match(/^DATABASE_URL="?([^"\n]+)"?/m);
    if (m) process.env.DATABASE_URL = m[1];
  }
}
if (!process.env.DATABASE_URL) {
  fail(
    "DATABASE_URL is not set and apps/web/.env has none.\n" +
      "  Local: run `pnpm db:local` first. Prod: set DATABASE_URL to your Postgres URL."
  );
}

const { prisma } = await import("../src/index");

const target = await prisma.user.findUnique({ where: { email: currentEmail } });
if (!target) fail(`No user found with email '${currentEmail}'. Pass --current <existing email>.`);
if (target.role !== "ADMIN" && target.role !== "SUPER_ADMIN") {
  fail(`'${currentEmail}' is a ${target.role}, not an admin. Refusing to change (pass --current for the right account).`);
}

if (newEmail && newEmail !== currentEmail) {
  const clash = await prisma.user.findUnique({ where: { email: newEmail } });
  if (clash && clash.id !== target.id) fail(`Email '${newEmail}' is already in use by another account.`);
}

const data: { email?: string; passwordHash?: string; name?: string } = {};
if (newEmail) data.email = newEmail;
if (newPassword !== undefined) data.passwordHash = await hash(newPassword, ARGON_OPTS);
if (newName) data.name = newName;

await prisma.user.update({ where: { id: target.id }, data });

console.log("\n  ✓ Admin account updated.");
console.log(`    email:    ${data.email ?? target.email}`);
console.log(`    password: ${newPassword !== undefined ? "(changed)" : "(unchanged)"}`);
console.log("");
await prisma.$disconnect();
