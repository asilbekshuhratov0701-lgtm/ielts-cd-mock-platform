import { RegisterForm } from "@/components/RegisterForm";

export const metadata = { title: "Sign Up" };

export default function RegisterPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold text-foreground">Create your account</h1>
      <p className="mt-1 text-sm text-muted">Start taking full IELTS mock exams.</p>
      <div className="mt-6">
        <RegisterForm />
      </div>
    </div>
  );
}
