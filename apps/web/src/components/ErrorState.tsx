import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

export function ErrorState({
  code,
  title,
  description,
  primary,
  secondary,
  action
}: {
  code: string;
  title: string;
  description: string;
  primary?: { href: string; label: string };
  secondary?: { href: string; label: string };
  action?: ReactNode;
}) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6 py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-hero-grid opacity-[0.35]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[38rem] -translate-x-1/2 rounded-full bg-brand-500/15 blur-3xl"
      />

      <div className="relative w-full max-w-lg text-center">
        <p className="bg-brand-gradient bg-clip-text text-7xl font-extrabold tracking-tight text-transparent sm:text-8xl">
          {code}
        </p>
        <h1 className="mt-3 text-2xl font-bold text-foreground sm:text-3xl">{title}</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted">{description}</p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {action}
          {primary ? (
            <Link href={primary.href}>
              <Button size="sm">{primary.label}</Button>
            </Link>
          ) : null}
          {secondary ? (
            <Link href={secondary.href}>
              <Button variant="outline" size="sm">
                {secondary.label}
              </Button>
            </Link>
          ) : null}
        </div>
      </div>
    </main>
  );
}
