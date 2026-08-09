"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Circle, Clock3, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getVerificationChecklist,
  isAccountFullyVerified,
  type VerificationStatusSnapshot,
} from "@/lib/utils/account-verification";
import { useDashboardTheme } from "@/components/dashboard/dashboard-theme-provider";
import { cn } from "@/lib/utils";
import type { UserRole } from "@prisma/client";

const KYC_ROUTES: Partial<Record<UserRole, string>> = {
  BUYER: "/dashboard/buyer/kyc",
  MERCHANT: "/dashboard/merchant/kyc",
  MARKETER: "/dashboard/marketer/kyc",
  LENDER: "/dashboard/lender/kyc",
};

const FRESH_LOGIN_KEY = "fresh-dashboard-login";

function getDismissedSessionKey(userId: string) {
  return `verification-prompt-dismissed:${userId}`;
}

function getCompleteStorageKey(userId: string) {
  return `verification-prompt-complete:${userId}`;
}

export function VerificationPromptDialog() {
  const pathname = usePathname();
  const { data: session, update } = useSession();
  const dashboardTheme = useDashboardTheme();
  const isDark = dashboardTheme?.theme === "dark";
  const role = session?.user?.role;
  const userId = session?.user?.id;
  const [open, setOpen] = useState(false);

  const showVerificationUi = !!role && role in KYC_ROUTES;

  const { data: status, isFetched } = useQuery({
    queryKey: ["kyc-status"],
    queryFn: async () => {
      const res = await fetch("/api/kyc");
      const json = await res.json();
      if (!res.ok || json.success === false) return null;
      return (json.data ?? null) as VerificationStatusSnapshot | null;
    },
    enabled: showVerificationUi && !!userId,
    staleTime: 0,
    refetchOnMount: "always",
  });

  const emailVerified =
    Boolean(session?.user?.emailVerified) || Boolean(status?.emailVerified);
  const phoneVerified =
    Boolean(session?.user?.phoneVerified) || Boolean(status?.phoneVerified);

  const mergedStatus = useMemo<VerificationStatusSnapshot>(
    () => ({
      ...(status ?? {}),
      emailVerified,
      phoneVerified,
    }),
    [status, emailVerified, phoneVerified]
  );

  const kycRoute = role ? KYC_ROUTES[role] : undefined;
  const checklist = getVerificationChecklist(mergedStatus);
  const fullyVerified = isAccountFullyVerified(
    mergedStatus,
    emailVerified,
    phoneVerified
  );
  const needsVerificationPrompt =
    !emailVerified ||
    !phoneVerified ||
    checklist.some((item) => !item.complete);
  const continueHref = !emailVerified
    ? "/verify-email"
    : !phoneVerified
      ? "/verify-phone"
      : kycRoute;
  const continueLabel = !emailVerified
    ? "Verify email first"
    : !phoneVerified
      ? "Verify mobile number"
      : "Continue verification";

  useEffect(() => {
    if (!emailVerified || session?.user?.emailVerified) return;
    void update();
  }, [emailVerified, session?.user?.emailVerified, update]);

  useEffect(() => {
    if (!phoneVerified || session?.user?.phoneVerified) return;
    void update();
  }, [phoneVerified, session?.user?.phoneVerified, update]);

  useEffect(() => {
    if (!showVerificationUi || !userId || !isFetched) return;
    if (!pathname.startsWith("/dashboard")) return;

    const completeKey = getCompleteStorageKey(userId);
    const dismissedKey = getDismissedSessionKey(userId);
    const freshLogin = sessionStorage.getItem(FRESH_LOGIN_KEY) === "1";

    if (!needsVerificationPrompt || fullyVerified) {
      localStorage.setItem(completeKey, "true");
      sessionStorage.removeItem(FRESH_LOGIN_KEY);
      sessionStorage.removeItem(dismissedKey);
      setOpen(false);
      return;
    }

    localStorage.removeItem(completeKey);

    if (freshLogin) {
      sessionStorage.removeItem(dismissedKey);
      sessionStorage.removeItem(FRESH_LOGIN_KEY);
      setOpen(true);
      return;
    }

    const dismissedThisSession = sessionStorage.getItem(dismissedKey) === "true";
    setOpen(!dismissedThisSession);
  }, [
    showVerificationUi,
    userId,
    isFetched,
    pathname,
    fullyVerified,
    needsVerificationPrompt,
    status,
    emailVerified,
    phoneVerified,
  ]);

  const dismissDialog = () => {
    if (userId) {
      sessionStorage.setItem(getDismissedSessionKey(userId), "true");
    }
    setOpen(false);
  };

  if (!showVerificationUi || !kycRoute) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) dismissDialog();
      }}
    >
      <DialogContent
        className={cn(
          "max-h-[min(92vh,640px)] gap-4 overflow-y-auto border-border bg-popover p-4 text-popover-foreground sm:max-w-lg sm:p-6",
          isDark && "dark"
        )}
      >
        <DialogHeader className="space-y-1.5 text-left">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold sm:text-lg">
            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600 sm:h-5 sm:w-5" />
            Complete your verification
          </DialogTitle>
          <DialogDescription className="text-xs leading-relaxed sm:text-sm">
            Finish these steps to unlock the full PayForMe experience and keep your account in good
            standing.
          </DialogDescription>
        </DialogHeader>

        <ul className="max-h-[min(46vh,320px)] space-y-2 overflow-y-auto overscroll-contain py-1 sm:space-y-2.5">
          <li className="flex items-start gap-2.5 rounded-md border border-border px-2.5 py-2 sm:gap-3 sm:px-3 sm:py-2.5">
            {emailVerified ? (
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 sm:h-4 sm:w-4" />
            ) : (
              <Circle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground sm:h-4 sm:w-4" />
            )}
            <div className="min-w-0">
              <p className="text-xs font-medium sm:text-sm">Verify your email</p>
              <p className="text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
                {emailVerified
                  ? "Your email address is verified."
                  : "Check your inbox for the verification code or open the verify email page."}
              </p>
            </div>
          </li>

          {checklist.map((item) => (
            <li
              key={item.id}
              className="flex items-start gap-2.5 rounded-md border border-border px-2.5 py-2 sm:gap-3 sm:px-3 sm:py-2.5"
            >
              {item.complete ? (
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 sm:h-4 sm:w-4" />
              ) : item.pending ? (
                <Clock3 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-600 sm:h-4 sm:w-4" />
              ) : (
                <Circle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground sm:h-4 sm:w-4" />
              )}
              <div className="min-w-0">
                <p className="text-xs font-medium sm:text-sm">{item.label}</p>
                <p className="text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
                  {item.complete
                    ? "Completed."
                    : item.pending
                      ? "Submitted and awaiting review."
                      : "Required before you can use all platform features."}
                </p>
              </div>
            </li>
          ))}
        </ul>

        <DialogFooter className="gap-2 pt-1 sm:gap-0">
          <Button type="button" variant="outline" size="sm" className="h-9 sm:h-10" onClick={dismissDialog}>
            Remind me later
          </Button>
          <Button asChild size="sm" className="h-9 bg-emerald-600 hover:bg-emerald-700 sm:h-10">
            <Link href={continueHref ?? "/verify-email"} onClick={dismissDialog}>
              {continueLabel}
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
