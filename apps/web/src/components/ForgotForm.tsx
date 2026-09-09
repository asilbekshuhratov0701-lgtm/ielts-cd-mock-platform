"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { CheckCircle2, Mail } from "lucide-react";
import { forgotPasswordAction } from "@/lib/password-reset-actions";
import type { ResetFormState } from "@/lib/auth-types";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

const initialState: ResetFormState = {};
const CODE_LENGTH = 6;

function SubmitButton({
  idle,
  busy,
  disabled,
  variant,
  size,
  className
}: {
  idle: string;
  busy: string;
  disabled?: boolean;
  variant?: "ghost";
  size?: "sm";
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant={variant}
      size={size}
      disabled={pending || disabled}
      className={className}
    >
      {pending ? busy : idle}
    </Button>
  );
}

function CodeInput({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  const boxes = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(CODE_LENGTH, " ").slice(0, CODE_LENGTH).split("");

  const replaceFrom = (index: number, typed: string) => {
    const chars = value.padEnd(CODE_LENGTH, " ").split("");
    for (let k = 0; k < typed.length && index + k < CODE_LENGTH; k += 1) {
      chars[index + k] = typed[k]!;
    }
    onChange(chars.join("").trimEnd());
  };

  return (
    <div className="flex justify-between gap-2">
      {digits.map((digit, i) => (
        <input
          key={i}
          id={i === 0 ? "code-0" : undefined}
          ref={(el) => {
            boxes.current[i] = el;
          }}
          value={digit.trim()}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={1}
          aria-label={`Digit ${i + 1} of ${CODE_LENGTH}`}
          className="h-14 w-full rounded-xl border border-border bg-surface text-center text-xl font-bold tabular-nums text-foreground outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          onChange={(e) => {
            const typed = e.target.value.replace(/\D/g, "");
            if (!typed) {
              replaceFrom(i, " ");
              return;
            }
            replaceFrom(i, typed);
            boxes.current[Math.min(CODE_LENGTH - 1, i + typed.length)]?.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !digit.trim() && i > 0) {
              replaceFrom(i - 1, " ");
              boxes.current[i - 1]?.focus();
            }
            if (e.key === "ArrowLeft" && i > 0) boxes.current[i - 1]?.focus();
            if (e.key === "ArrowRight" && i < CODE_LENGTH - 1) boxes.current[i + 1]?.focus();
          }}
          onPaste={(e) => {
            e.preventDefault();
            const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, CODE_LENGTH);
            if (!pasted) return;
            onChange(pasted);
            boxes.current[Math.min(CODE_LENGTH - 1, pasted.length - 1)]?.focus();
          }}
        />
      ))}
    </div>
  );
}

export function ForgotForm() {
  const [state, action] = useActionState(forgotPasswordAction, initialState);
  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState(0);

  const email = state.email ?? "";

  useEffect(() => {
    if (state.cooldownSec) setCooldown(state.cooldownSec);
    if (state.error) setCode("");
  }, [state]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  if (state.step === "code") {
    return (
      <div className="space-y-5">
        {state.success ? (
          <p className="flex items-start gap-2 rounded-lg bg-emerald-50 px-3 py-3 text-sm text-emerald-700">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> {state.success}
          </p>
        ) : (
          <p className="flex items-start gap-2 rounded-lg bg-brand-50 px-3 py-3 text-sm text-brand-700">
            <Mail className="mt-0.5 h-4 w-4 shrink-0" /> Enter the 6-digit code sent to {email}.
          </p>
        )}

        <form action={action} className="space-y-5">
          <input type="hidden" name="intent" value="verify" />
          <input type="hidden" name="email" value={email} />
          <input type="hidden" name="code" value={code} />
          <div className="space-y-2">
            <Label htmlFor="code-0">Verification code</Label>
            <CodeInput value={code} onChange={setCode} />
          </div>
          {state.error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
          ) : null}
          <SubmitButton
            idle="Continue"
            busy="Checking…"
            disabled={code.length < CODE_LENGTH}
            className="h-11 w-full text-sm"
          />
        </form>

        <form action={action} className="text-center">
          <input type="hidden" name="intent" value="request" />
          <input type="hidden" name="email" value={email} />
          <SubmitButton
            idle={cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
            busy="Sending…"
            disabled={cooldown > 0}
            variant="ghost"
            size="sm"
            className="text-sm"
          />
        </form>

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
      <input type="hidden" name="intent" value="request" />
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          defaultValue={email}
          placeholder="you@example.com"
        />
      </div>
      {state.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
      ) : null}
      <SubmitButton idle="Send code" busy="Sending…" className="h-11 w-full text-sm" />
      <p className="text-center text-sm text-muted">
        Remembered it?{" "}
        <Link href="/login" className="font-semibold text-brand-700 hover:underline">
          Login
        </Link>
      </p>
    </form>
  );
}
