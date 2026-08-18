import { Suspense } from "react";
import { AdminFinancingPageClient } from "./financing-client";

export default function AdminFinancingPage() {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Loading financing…</p>}>
      <AdminFinancingPageClient />
    </Suspense>
  );
}
