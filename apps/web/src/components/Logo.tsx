import Link from "next/link";
import { cn } from "@/lib/cn";

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link
      href={href}
      className={cn("inline-flex items-center gap-2 font-bold text-foreground", className)}
    >
      <span
        className="flex h-8 w-8 items-center justify-center rounded-xl font-extrabold text-white shadow-soft"
        style={{ background: "linear-gradient(135deg,#2563EB,#7C5CFC)" }}
      >
        Z
      </span>
      <span className="tracking-tight">
        Ziyo<span className="text-brand-600">Mock</span>
      </span>
    </Link>
  );
}
