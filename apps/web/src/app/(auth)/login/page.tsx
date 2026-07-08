import { LoginForm } from "@/components/LoginForm";

export const metadata = { title: "Login" };

export default function LoginPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Login</h1>
      <p className="mt-1.5 text-sm leading-relaxed text-muted">
        Enter your email and password below to log into your account.
      </p>
      <div className="mt-6">
        <LoginForm />
      </div>
    </div>
  );
}
