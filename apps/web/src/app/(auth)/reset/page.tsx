import Link from "next/link";

export const metadata = { title: "Reset Password" };

export default function ResetPasswordPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold text-foreground">Reset password</h1>
      <p className="mt-1 text-sm text-muted">
        This page will let you set a new password from an email link (coming soon).
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
