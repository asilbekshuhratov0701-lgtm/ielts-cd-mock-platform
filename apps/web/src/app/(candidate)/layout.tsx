import type { ReactNode } from "react";
import Link from "next/link";
import {
  BarChart3,
  Bell,
  LayoutDashboard,
  Play,
  User,
  type LucideIcon
} from "lucide-react";
import { auth } from "@/auth";
import { countUnread } from "@/lib/notifications";
import { Logo } from "@/components/Logo";
import { NavLink } from "@/components/NavLink";
import { LogoutButton } from "@/components/LogoutButton";

type NavItem = { href: string; label: string; icon: LucideIcon; exact?: boolean };

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/play", label: "Exams", icon: Play },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/profile", label: "Profile", icon: User }
];

export default async function CandidateLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  const name = session?.user?.name ?? session?.user?.email ?? "User";
  const initials = name.slice(0, 2).toUpperCase();
  const unread = session?.user?.id ? await countUnread(session.user.id) : 0;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-border bg-surface/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-6">
            <Logo />
            <nav className="hidden items-center gap-1 md:flex">
              {NAV.map((item) => (
                <NavLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  exact={item.exact}
                  icon={<item.icon className="h-4 w-4" />}
                />
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/notifications"
              aria-label="Notifications"
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-foreground/70 hover:bg-brand-50 hover:text-brand-700"
            >
              <Bell className="h-5 w-5" />
              {unread > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-semibold text-white">
                  {unread > 9 ? "9+" : unread}
                </span>
              ) : null}
            </Link>
            <span className="hidden items-center gap-2 sm:flex">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
                {initials}
              </span>
              <span className="text-sm text-muted">{name}</span>
            </span>
            <LogoutButton withLabel={false} />
          </div>
        </div>
        <nav className="flex items-center gap-1 overflow-x-auto px-4 pb-2 md:hidden">
          {NAV.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              exact={item.exact}
              icon={<item.icon className="h-4 w-4" />}
            />
          ))}
        </nav>
      </header>
      {children}
    </div>
  );
}
