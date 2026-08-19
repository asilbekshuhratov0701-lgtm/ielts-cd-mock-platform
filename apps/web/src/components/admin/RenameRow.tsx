"use client";

import { useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Check, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import { renameBlueprintAction } from "@/lib/exam-blueprint-actions";
import { renameMockAction } from "@/lib/mock-actions";

export type RenameKind = "blueprint" | "mock";

const ACTIONS: Record<RenameKind, (formData: FormData) => Promise<void>> = {
  blueprint: renameBlueprintAction,
  mock: renameMockAction
};

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" variant="secondary" disabled={pending}>
      <Check className="h-3.5 w-3.5" /> {pending ? "Saving…" : "Save"}
    </Button>
  );
}

function RenameForm({
  kind,
  id,
  title,
  redirectTo,
  onCancel
}: {
  kind: RenameKind;
  id: string;
  title: string;
  redirectTo: string;
  onCancel: () => void;
}) {
  return (
    <form action={ACTIONS[kind]} className="flex flex-1 flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <Input
        name="title"
        defaultValue={title}
        autoFocus
        required
        maxLength={200}
        aria-label="New title"
        onKeyDown={(e) => {
          if (e.key === "Escape") onCancel();
        }}
        className="h-9 min-w-[12rem] flex-1"
      />
      <SaveButton />
      <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
        <X className="h-3.5 w-3.5" /> Cancel
      </Button>
    </form>
  );
}

export function RenameRow({
  kind,
  id,
  title,
  redirectTo,
  children,
  className
}: {
  kind: RenameKind;
  id: string;
  title: string;
  redirectTo: string;
  children: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  if (open) {
    return (
      <div className={cn("flex items-center gap-2 py-3", className)}>
        <RenameForm
          kind={kind}
          id={id}
          title={title}
          redirectTo={redirectTo}
          onCancel={() => setOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-1 py-3", className)}>
      <div className="min-w-0 flex-1">{children}</div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={`Rename "${title}"`}
        aria-label={`Rename ${title}`}
        className="shrink-0 rounded-md p-1.5 text-muted transition-colors hover:bg-brand-50 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
      >
        <Pencil className="h-4 w-4" />
      </button>
    </div>
  );
}

export function RenameInline({
  kind,
  id,
  title,
  redirectTo,
  label = "Rename"
}: {
  kind: RenameKind;
  id: string;
  title: string;
  redirectTo: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);

  if (open) {
    return (
      <RenameForm
        kind={kind}
        id={id}
        title={title}
        redirectTo={redirectTo}
        onCancel={() => setOpen(false)}
      />
    );
  }

  return (
    <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
      <Pencil className="h-3.5 w-3.5" /> {label}
    </Button>
  );
}
