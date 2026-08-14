"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ErrorState";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ErrorState
      code="500"
      title="Something went wrong on our side"
      description={
        error.digest
          ? `The page could not be loaded. Quote reference ${error.digest} if you report this.`
          : "The page could not be loaded. Try again — if it keeps happening, contact your centre administrator."
      }
      action={
        <Button size="sm" onClick={reset}>
          Try again
        </Button>
      }
      secondary={{ href: "/", label: "Back to home" }}
    />
  );
}
