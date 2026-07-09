import { RegisterForm } from "@/components/RegisterForm";

export const metadata = { title: "Register" };

export default function RegisterPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Register</h1>
      <p className="mt-1.5 text-sm leading-relaxed text-muted">
        Enter your credentials below to register an account.
      </p>
      <div className="mt-6">
        <RegisterForm />
      </div>
    </div>
  );
}
