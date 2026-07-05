/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Consume workspace packages from source (no pre-build step).
  transpilePackages: ["@ielts/ui", "@ielts/core", "@ielts/db", "@ielts/ai", "@ielts/validators"],
  // Native / server-only deps must not be bundled into client/edge output.
  serverExternalPackages: ["@prisma/client", "@node-rs/argon2", "@anthropic-ai/sdk", "unpdf"],
  experimental: {
    // Listening audio uploads (attachAudioAction) are large. Two separate
    // limits gate them: the Server Action body limit (default 1 MB) and, because
    // requests pass through middleware.ts, the middleware body limit (default
    // 10 MB, which truncates the multipart body -> "Unexpected end of form").
    // Raise both well above a full audio file.
    serverActions: {
      bodySizeLimit: "200mb"
    },
    middlewareClientMaxBodySize: "200mb"
  },
  eslint: {
    // Linting is run from the repo root via `pnpm lint` (eslint .), not by `next build`.
    ignoreDuringBuilds: true
  }
};

export default nextConfig;
