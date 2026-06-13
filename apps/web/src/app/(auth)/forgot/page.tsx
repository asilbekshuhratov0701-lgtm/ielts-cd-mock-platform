import Link from "next/link";

export const metadata = { title: "Forgot Password" };

export default function ForgotPasswordPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold text-foreground">Forgot password</h1>
      <p className="mt-1 text-sm text-muted">
        Password reset by email is coming soon. For now, ask an administrator to reset it.
      </p>
      <Link
        href="/login"
        className="mt-6 inline-block text-sm font-medium text-brand-700 hover:underline"
      >
        ← Back to login
      </Link>
    </div>
  );
}
