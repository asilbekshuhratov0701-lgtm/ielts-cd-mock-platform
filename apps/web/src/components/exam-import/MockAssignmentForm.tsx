"use client";

import { useState } from "react";
import { Search, Users } from "lucide-react";
import { setMockAssignmentsAction } from "@/lib/mock-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";

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
  assignedCandidateIds: string[];
  assignedGroupIds: string[];
}) {
  const assignedCandidates = new Set(assignedCandidateIds);
  const assignedGroups = new Set(assignedGroupIds);
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const hits = (text: string) => q === "" || text.toLowerCase().includes(q);

  const groupHits = groups.filter((g) => hits(g.name)).length;
  const candidateHits = candidates.filter((c) => hits(`${c.name ?? ""} ${c.email}`)).length;

  return (
    <form action={setMockAssignmentsAction} className="space-y-5">
      <input type="hidden" name="mockExamId" value={mockId} />

      <div className="relative min-w-[14rem] max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search candidate, email or group…"
          aria-label="Search candidates and groups"
          className="pl-9"
        />
      </div>

      {q ? (
        <p className="-mt-3 text-xs text-muted">
          Showing {candidateHits} of {candidates.length} candidates and {groupHits} of{" "}
          {groups.length} groups. Ticks outside the search are kept when you save.
        </p>
      ) : null}

      {groups.length > 0 ? (
        <div className={cn(q !== "" && groupHits === 0 && "hidden")}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Groups</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((g) => (
              <label key={g.id} className={cn(checkboxRow, !hits(g.name) && "hidden")}>
                <input
                  type="checkbox"
                  name="groupId"
                  value={g.id}
                  defaultChecked={assignedGroups.has(g.id)}
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
          <>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {candidates.map((c) => (
                <label
                  key={c.id}
                  className={cn(checkboxRow, !hits(`${c.name ?? ""} ${c.email}`) && "hidden")}
                >
                  <input
                    type="checkbox"
                    name="candidateId"
                    value={c.id}
                    defaultChecked={assignedCandidates.has(c.id)}
                    className="rounded text-brand-600"
                  />
                  <span className="truncate">{c.name ?? c.email}</span>
                </label>
              ))}
            </div>
            {candidateHits === 0 ? (
              <p className="text-sm text-muted">No candidate matches “{query}”.</p>
            ) : null}
          </>
        )}
      </div>

      <Button type="submit" variant="secondary">
        <Users className="h-4 w-4" /> Save assignments
      </Button>
    </form>
  );
}
