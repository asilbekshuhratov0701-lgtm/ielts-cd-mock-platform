import Link from "next/link";
import { ResetForm } from "@/components/ResetForm";

export const metadata = { title: "Reset Password" };

export default async function ResetPasswordPage({
  searchParams
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Reset password</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">
          This link is missing its reset token. Request a new link from the forgot-password page.
        </p>
        <Link
          href="/forgot"
          className="mt-6 inline-block text-sm font-medium text-brand-700 hover:underline"
        >
          ← Request a new link
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Reset password</h1>
      <p className="mt-1.5 text-sm leading-relaxed text-muted">
        Choose a new password for your account.
      </p>
      <div className="mt-6">
        <ResetForm token={token} />
      </div>
    </div>
  );
}
