import { ForgotForm } from "@/components/ForgotForm";

export const metadata = { title: "Forgot Password" };

export default function ForgotPasswordPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Forgot password</h1>
      <p className="mt-1.5 text-sm leading-relaxed text-muted">
        Enter your email and we'll send you a link to reset your password.
      </p>
      <div className="mt-6">
        <ForgotForm />
      </div>
    </div>
  );
}
