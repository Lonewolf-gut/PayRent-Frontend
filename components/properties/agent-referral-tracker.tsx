"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { persistAuthReturnUrl } from "@/lib/utils/auth-callback-url";

function TrackerInner() {
  const searchParams = useSearchParams();
  const ref = searchParams.get("ref");

  useEffect(() => {
    if (!ref) return;
    const params = new URLSearchParams({ ref });
    fetch(`/api/marketer/referral/track?${params.toString()}`, {
      method: "POST",
      credentials: "include",
    }).catch(() => undefined);
  }, [ref]);

  return null;
}

function ReturnPathCapture() {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (typeof window === "undefined") return;
    persistAuthReturnUrl(`${window.location.pathname}${window.location.search}`);
  }, [searchParams]);

  return null;
}

export function AgentReferralTracker() {
  return (
    <Suspense fallback={null}>
      <TrackerInner />
      <ReturnPathCapture />
    </Suspense>
  );
}
