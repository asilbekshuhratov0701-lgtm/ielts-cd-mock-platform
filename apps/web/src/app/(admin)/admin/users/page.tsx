import { prisma } from "@ielts/db";
import { PageShell } from "@/components/Shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { changeRoleAction, createStaffAction, setStatusAction } from "@/lib/admin-users-actions";
import { requireAdminUser } from "@/lib/page-guards";

export const metadata = { title: "Users & Roles" };

const ROLES = ["SUPER_ADMIN", "ADMIN", "EXAMINER", "CANDIDATE"];
const selectClass =
  "h-9 rounded-lg border border-border bg-surface px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40";

function roleVariant(role: string): "brand" | "default" | "muted" {
  if (role === "SUPER_ADMIN" || role === "ADMIN") return "brand";
  if (role === "EXAMINER") return "default";
  return "muted";
}

export default async function AdminUsersPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const me = await requireAdminUser();
  const orgId = me.orgId;

  const users = await prisma.user.findMany({
    where: { orgId },
    orderBy: [{ role: "asc" }, { createdAt: "desc" }]
  });

  return (
    <PageShell title="Users & Roles" subtitle="Manage staff accounts and role-based access.">
      {error === "email" ? (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          A user with that email already exists.
        </div>
      ) : null}

      <Card className="p-5">
        <h2 className="mb-3 font-semibold text-foreground">Add staff member</h2>
        <form action={createStaffAction} className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required placeholder="Alex Examiner" className="w-44" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              placeholder="alex@example.com"
              className="w-52"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="password">Temp password</Label>
            <Input
              id="password"
              name="password"
              type="text"
              required
              minLength={8}
              placeholder="min 8 chars"
              className="w-40"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="role">Role</Label>
            <select
              id="role"
              name="role"
              defaultValue="EXAMINER"
              className={`${selectClass} block`}
            >
              <option value="EXAMINER">Examiner</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <Button type="submit">Create</Button>
        </form>
      </Card>

      <div className="space-y-3">
        {users.map((user) => {
          const isSelf = user.id === me?.id;
          return (
            <Card key={user.id} className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground">{user.name ?? user.email}</p>
                    <Badge variant={roleVariant(user.role)}>{user.role}</Badge>
                    <Badge variant={user.status === "ACTIVE" ? "success" : "danger"}>
                      {user.status}
                    </Badge>
                    {isSelf ? <span className="text-xs text-muted">(you)</span> : null}
                  </div>
                  <p className="text-xs text-muted">{user.email}</p>
                </div>

                {isSelf ? (
                  <span className="text-xs text-muted">Manage your own account in profile</span>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <form action={changeRoleAction} className="flex items-center gap-2">
                      <input type="hidden" name="userId" value={user.id} />
                      <select name="role" defaultValue={user.role} className={selectClass}>
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                      <Button type="submit" variant="outline" size="sm">
                        Update role
                      </Button>
                    </form>
                    <form action={setStatusAction}>
                      <input type="hidden" name="userId" value={user.id} />
                      <input
                        type="hidden"
                        name="status"
                        value={user.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE"}
                      />
                      <Button type="submit" variant="ghost" size="sm">
                        {user.status === "ACTIVE" ? "Suspend" : "Activate"}
                      </Button>
                    </form>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </PageShell>
  );
}
