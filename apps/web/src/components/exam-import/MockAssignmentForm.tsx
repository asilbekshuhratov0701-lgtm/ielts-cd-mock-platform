import { Users } from "lucide-react";
import { setMockAssignmentsAction } from "@/lib/mock-actions";
import { Button } from "@/components/ui/button";

const checkboxRow =
  "flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:bg-brand-50/40";

export function MockAssignmentForm({
  mockId,
  candidates,
  groups,
  assignedCandidateIds,
  assignedGroupIds
}: {
  mockId: string;
  candidates: { id: string; name: string | null; email: string }[];
  groups: { id: string; name: string }[];
  assignedCandidateIds: Set<string>;
  assignedGroupIds: Set<string>;
}) {
  return (
    <form action={setMockAssignmentsAction} className="space-y-5">
      <input type="hidden" name="mockExamId" value={mockId} />

      {groups.length > 0 ? (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Groups</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((g) => (
              <label key={g.id} className={checkboxRow}>
                <input
                  type="checkbox"
                  name="groupId"
                  value={g.id}
                  defaultChecked={assignedGroupIds.has(g.id)}
                  className="rounded text-brand-600"
                />
                {g.name}
              </label>
            ))}
          </div>
        </div>
      ) : null}

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Candidates</p>
        {candidates.length === 0 ? (
          <p className="text-sm text-muted">No candidates in this organisation yet.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {candidates.map((c) => (
              <label key={c.id} className={checkboxRow}>
                <input
                  type="checkbox"
                  name="candidateId"
                  value={c.id}
                  defaultChecked={assignedCandidateIds.has(c.id)}
                  className="rounded text-brand-600"
                />
                <span className="truncate">{c.name ?? c.email}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      <Button type="submit" variant="secondary">
        <Users className="h-4 w-4" /> Save assignments
      </Button>
    </form>
  );
}
