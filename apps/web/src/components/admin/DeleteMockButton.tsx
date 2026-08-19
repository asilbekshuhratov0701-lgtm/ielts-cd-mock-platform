"use client";

import { useEffect, useState } from "react";
import { createPortal, useFormStatus } from "react-dom";
import { AlertTriangle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { deleteMockAction } from "@/lib/mock-actions";

function ConfirmButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="destructive" size="sm" disabled={pending}>
      <Trash2 className="h-3.5 w-3.5" />
      {pending ? "Deleting…" : "Delete mock"}
    </Button>
  );
}

export function DeleteMockButton({
  id,
  title,
  attempts,
  assignments
}: {
  id: string;
  title: string;
  attempts: number;
  assignments: number;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <Button type="button" variant="ghost" onClick={() => setOpen(true)}>
        <Trash2 className="h-4 w-4" /> Delete
      </Button>

      {open && mounted
        ? createPortal(
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Confirm mock deletion"
              className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4"
            >
              <Card className="w-full max-w-lg p-6">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600">
                    <AlertTriangle className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold text-foreground">Delete this mock?</h2>
                    <p className="mt-1 break-words text-sm text-muted">
                      <span className="font-medium text-foreground">{title}</span> and everything
                      recorded against it. This cannot be undone.
                    </p>
                  </div>
                </div>

                <ul className="mt-4 space-y-1.5 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                  <li>
                    <strong>{attempts}</strong> candidate attempt{attempts === 1 ? "" : "s"} —
                    answers, marks and released bands go with them
                  </li>
                  <li>
                    <strong>{assignments}</strong> assignment{assignments === 1 ? "" : "s"} to
                    candidates or groups
                  </li>
                  <li>
                    The uploaded parts themselves are <strong>kept</strong> and stay reusable in
                    other mocks
                  </li>
                </ul>

                <div className="mt-5 flex justify-end gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <form action={deleteMockAction}>
                    <input type="hidden" name="id" value={id} />
                    <input type="hidden" name="confirmAttempts" value="1" />
                    <ConfirmButton />
                  </form>
                </div>
              </Card>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
