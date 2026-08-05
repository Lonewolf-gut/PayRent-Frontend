"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin] page error:", error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold">Admin page failed to load</h1>
      <p className="text-sm text-muted-foreground">
        {error.message || "An unexpected error occurred while loading the admin dashboard."}
      </p>
      {error.digest ? (
        <p className="font-mono text-xs text-muted-foreground">Error ID: {error.digest}</p>
      ) : null}
      <div className="flex gap-2">
        <Button className="rounded-none" onClick={() => reset()}>
          Try again
        </Button>
        <Button className="rounded-none" variant="outline" onClick={() => window.location.assign("/admin/login")}>
          Back to login
        </Button>
      </div>
    </div>
  );
}
