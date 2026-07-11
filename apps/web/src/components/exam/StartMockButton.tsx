"use client";

import { Play } from "lucide-react";
import { startMockAttemptAction } from "@/lib/mock-actions";
import { Button } from "@/components/ui/button";

export function StartMockButton({ mockExamId }: { mockExamId: string }) {
  return (
    <form action={startMockAttemptAction}>
      <input type="hidden" name="mockExamId" value={mockExamId} />
      <Button
        type="submit"
        onClick={() => {
          void document.documentElement.requestFullscreen?.().catch(() => {});
        }}
      >
        <Play className="h-4 w-4" /> Start exam
      </Button>
    </form>
  );
}
