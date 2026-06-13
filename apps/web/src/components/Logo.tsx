import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { cn } from "@/lib/cn";

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link
      href={href}
      className={cn("inline-flex items-center gap-2 font-bold text-foreground", className)}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-soft">
        <GraduationCap className="h-5 w-5" />
      </span>
      <span className="tracking-tight">
        IELTS<span className="text-brand-600"> Mock</span>
      </span>
    </Link>
  );
}
