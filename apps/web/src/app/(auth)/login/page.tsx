import { LoginForm } from "@/components/LoginForm";

export const metadata = { title: "Login" };

export default function LoginPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold text-foreground">Welcome back</h1>
      <p className="mt-1 text-sm text-muted">Log in to continue your IELTS practice.</p>
      <div className="mt-6">
        <LoginForm />
      </div>
    </div>
  );
}
