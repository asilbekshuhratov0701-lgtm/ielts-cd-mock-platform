import type { ReactNode } from "react";
import {
  Activity,
  BarChart3,
  Boxes,
  ClipboardCheck,
  FileBarChart,
  FileJson,
  FileText,
  LayoutDashboard,
  PenLine,
  ScrollText,
  Settings,
  Shield,
  Users,
  type LucideIcon
} from "lucide-react";
import { auth } from "@/auth";
import { Logo } from "@/components/Logo";
import { NavLink } from "@/components/NavLink";
import { LogoutButton } from "@/components/LogoutButton";

type NavItem = { href: string; label: string; icon: LucideIcon; exact?: boolean };

const NAV: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/candidates", label: "Candidates", icon: Users },
  { href: "/admin/groups", label: "Groups", icon: Boxes },
  { href: "/admin/exams", label: "Exams", icon: FileText },
  { href: "/admin/writing", label: "Writing Evaluation", icon: PenLine },
  { href: "/admin/results", label: "Results", icon: ClipboardCheck },
  { href: "/admin/live", label: "Live Exam Center", icon: Activity },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/exam-import", label: "Exam Builder", icon: FileJson },
  { href: "/admin/users", label: "Users & Roles", icon: Shield },
  { href: "/admin/reports", label: "Reports", icon: FileBarChart },
  { href: "/admin/logs", label: "System Logs", icon: ScrollText },
  { href: "/admin/settings", label: "Settings", icon: Settings }
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  const name = session?.user?.name ?? session?.user?.email ?? "Admin";

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-surface md:flex">
        <div className="px-5 py-4">
          <Logo href="/admin" />
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
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
        <div className="border-t border-border p-3">
          <div className="flex items-center justify-between gap-2 px-1">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{name}</p>
              <p className="text-xs text-muted">{session?.user?.role ?? ""}</p>
            </div>
            <LogoutButton withLabel={false} />
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-surface/80 px-6 py-3 backdrop-blur md:hidden">
          <Logo href="/admin" />
          <LogoutButton withLabel={false} />
        </header>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
