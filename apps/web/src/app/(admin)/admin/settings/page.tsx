import { auth } from "@/auth";
import { prisma } from "@ielts/db";
import { SETTING_KEYS, getNumberSetting, getReleaseMode } from "@/lib/settings";
import { saveSettingsAction } from "@/lib/settings-actions";
import { PageShell } from "@/components/Shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export const metadata = { title: "Settings" };

export default async function AdminSettingsPage() {
  const session = await auth();
  const me = session?.user?.id
    ? await prisma.user.findUnique({ where: { id: session.user.id } })
    : null;
  const orgId = me?.orgId ?? "";
  const [org, task2Weight, passBand, releaseMode] = await Promise.all([
    orgId ? prisma.organization.findUnique({ where: { id: orgId } }) : null,
    getNumberSetting(orgId, SETTING_KEYS.task2Weight, 2),
    getNumberSetting(orgId, SETTING_KEYS.passBand, 6.5),
    getReleaseMode(orgId)
  ]);

  return (
    <PageShell title="Settings" subtitle="Centre branding and scoring configuration.">
      <Card className="max-w-2xl p-6">
        <form action={saveSettingsAction} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="orgName">Centre / organisation name</Label>
            <Input
              id="orgName"
              name="orgName"
              defaultValue={org?.name ?? ""}
              className="max-w-sm"
            />
            <p className="text-xs text-muted">Shown to staff and used on reports.</p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="task2Weight">Writing Task 2 weight</Label>
              <Input
                id="task2Weight"
                name="task2Weight"
                type="number"
                min={1}
                step={0.5}
                defaultValue={task2Weight}
              />
              <p className="text-xs text-muted">
                Writing band = (Task 1 + weight × Task 2) ÷ (1 + weight). IELTS default is 2.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="passBand">Target / pass band</Label>
              <Input
                id="passBand"
                name="passBand"
                type="number"
                min={0}
                max={9}
                step={0.5}
                defaultValue={passBand}
              />
              <p className="text-xs text-muted">Used as the default goal in reports.</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="releaseMode">Result release</Label>
            <select
              id="releaseMode"
              name="releaseMode"
              defaultValue={releaseMode}
              className="h-10 w-full max-w-sm rounded-lg border border-border bg-surface px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
            >
              <option value="auto">Automatic — show bands as soon as they are scored</option>
              <option value="manual">Manual — hold results until released in Results</option>
            </select>
            <p className="text-xs text-muted">
              In manual mode, Listening &amp; Reading bands stay hidden until staff release each
              attempt; Writing is released when an examiner publishes.
            </p>
          </div>

          <Button type="submit">Save settings</Button>
        </form>
      </Card>

      <p className="text-xs text-muted">
        Band conversion tables (Listening/Reading raw → band) currently use the built-in IELTS
        defaults in <code>@ielts/core</code>; making them editable here is a future step.
      </p>
    </PageShell>
  );
}
