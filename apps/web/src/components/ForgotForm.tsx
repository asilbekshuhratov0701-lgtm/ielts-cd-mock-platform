"use client";

import { useActionState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { forgotPasswordAction } from "@/lib/password-reset-actions";
import type { ResetFormState } from "@/lib/auth-types";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

const initialState: ResetFormState = {};

export function ForgotForm() {
  const [state, action, pending] = useActionState(forgotPasswordAction, initialState);

  if (state.success) {
    return (
      <div className="space-y-5">
        <p className="flex items-start gap-2 rounded-lg bg-emerald-50 px-3 py-3 text-sm text-emerald-700">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> {state.success}
        </p>
        <Link
          href="/login"
          className="inline-block text-sm font-medium text-brand-700 hover:underline"
        >
          ← Back to login
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
        />
      </div>
      {state.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
      ) : null}
      <Button type="submit" disabled={pending} className="h-11 w-full text-sm">
        {pending ? "Sending…" : "Send reset link"}
      </Button>
      <p className="text-center text-sm text-muted">
        Remembered it?{" "}
        <Link href="/login" className="font-semibold text-brand-700 hover:underline">
          Login
        </Link>
      </p>
    </form>
  );
}
