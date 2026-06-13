/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Consume workspace packages from source (no pre-build step).
  transpilePackages: ["@ielts/ui", "@ielts/core", "@ielts/db", "@ielts/ai", "@ielts/validators"],
  // Native / server-only deps must not be bundled into client/edge output.
  serverExternalPackages: ["@prisma/client", "@node-rs/argon2", "@anthropic-ai/sdk", "unpdf"],
  eslint: {
    // Linting is run from the repo root via `pnpm lint` (eslint .), not by `next build`.
    ignoreDuringBuilds: true
  }
};

export default nextConfig;
