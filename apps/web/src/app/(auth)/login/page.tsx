import { CheckCircle2 } from "lucide-react";
import { LoginForm } from "@/components/LoginForm";

export const metadata = { title: "Login" };

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ reset?: string }>;
}) {
  const { reset } = await searchParams;

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Login</h1>
      <p className="mt-1.5 text-sm leading-relaxed text-muted">
        Enter your email and password below to log into your account.
      </p>
      {reset ? (
        <p className="mt-5 flex items-start gap-2 rounded-lg bg-emerald-50 px-3 py-3 text-sm text-emerald-700">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> Your password has been reset. Sign in
          with your new password.
        </p>
      ) : null}
      <div className="mt-6">
        <LoginForm />
      </div>
    </div>
  );
}
