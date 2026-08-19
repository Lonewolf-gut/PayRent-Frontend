"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, ChevronRight, Circle, Clock3, ShieldCheck } from "lucide-react";
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
  getVerificationItemDescription,
  getVerificationItemHref,
  isAccountFullyVerified,
  type VerificationChecklistItem,
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

type VerificationDialogItem = VerificationChecklistItem & {
  href: string;
  description: string;
};

function getDismissedSessionKey(userId: string) {
  return `verification-prompt-dismissed:${userId}`;
}

function getCompleteStorageKey(userId: string) {
  return `verification-prompt-complete:${userId}`;
}

function VerificationChecklistRow({
  item,
  onNavigate,
}: {
  item: VerificationDialogItem;
  onNavigate: () => void;
}) {
  const icon = item.complete ? (
    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 sm:h-4 sm:w-4" />
  ) : item.pending ? (
    <Clock3 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-600 sm:h-4 sm:w-4" />
  ) : (
    <Circle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground sm:h-4 sm:w-4" />
  );

  const content = (
    <>
      {icon}
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium sm:text-sm">{item.label}</p>
        <p className="text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
          {item.description}
        </p>
      </div>
      <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
    </>
  );

  return (
    <li>
      <Link
        href={item.href}
        onClick={onNavigate}
        className={cn(
          "flex items-start gap-2.5 rounded-md border border-border px-2.5 py-2 transition-colors sm:gap-3 sm:px-3 sm:py-2.5",
          "hover:border-emerald-500/40 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/40"
        )}
      >
        {content}
      </Link>
    </li>
  );
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

  const verificationItems = useMemo<VerificationDialogItem[]>(() => {
    if (!role || !kycRoute) return [];

    const emailItem: VerificationDialogItem = {
      id: "email",
      label: "Verify your email",
      complete: emailVerified,
      href: getVerificationItemHref("email", role, kycRoute),
      description: emailVerified
        ? "Your email address is verified."
        : "Open the verify email page to enter your code.",
    };

    const otherItems = checklist.map((item) => ({
      ...item,
      href: getVerificationItemHref(item.id, role, kycRoute),
      description: getVerificationItemDescription(item),
    }));

    return [emailItem, ...otherItems];
  }, [role, kycRoute, emailVerified, checklist]);

  const nextIncompleteItem = verificationItems.find((item) => !item.complete);
  const continueHref = nextIncompleteItem?.href ?? kycRoute ?? "/verify-email";
  const continueLabel = nextIncompleteItem?.label ?? "Continue verification";

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

  if (!showVerificationUi || !kycRoute || !role) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) dismissDialog();
      }}
    >
      <DialogContent
        className={cn(
          "border-border bg-popover text-popover-foreground sm:max-w-lg",
          isDark && "dark"
        )}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            Complete your verification
          </DialogTitle>
<<<<<<< HEAD
          <DialogDescription>
            Finish these steps to unlock the full PayForMe experience and keep your account in good
            standing.
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-3 py-2">
          <li className="flex items-start gap-3 rounded-lg border border-border px-3 py-2.5">
            {emailVerified ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            ) : (
              <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            <div>
              <p className="text-sm font-medium">Verify your email</p>
              <p className="text-xs text-muted-foreground">
                {emailVerified
                  ? "Your email address is verified."
                  : "Check your inbox for the verification code or open the verify email page."}
              </p>
            </div>
          </li>

          {checklist.map((item) => (
            <li
              key={item.id}
              className="flex items-start gap-3 rounded-lg border border-border px-3 py-2.5"
            >
              {item.complete ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              ) : item.pending ? (
                <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
              ) : (
                <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <div>
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground">
                  {item.complete
                    ? "Completed."
                    : item.pending
                      ? "Submitted and awaiting review."
                      : "Required before you can use all platform features."}
                </p>
              </div>
            </li>
=======
          <DialogDescription className="text-xs leading-relaxed sm:text-sm">
            Finish these steps to unlock the full PayForMe experience. Tap any item below to go
            directly to where you can complete it.
          </DialogDescription>
        </DialogHeader>

        <ul className="max-h-[min(46vh,320px)] space-y-2 overflow-y-auto overscroll-contain py-1 sm:space-y-2.5">
          {verificationItems.map((item) => (
            <VerificationChecklistRow key={item.id} item={item} onNavigate={dismissDialog} />
>>>>>>> 1c2c3f0 (Make verification prompt items clickable with direct navigation links)
          ))}
        </ul>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={dismissDialog}>
            Remind me later
          </Button>
<<<<<<< HEAD
          <Button asChild className="bg-emerald-600 hover:bg-emerald-700">
            <Link href={continueHref ?? "/verify-email"} onClick={dismissDialog}>
=======
          <Button asChild size="sm" className="h-9 bg-emerald-600 hover:bg-emerald-700 sm:h-10">
            <Link href={continueHref} onClick={dismissDialog}>
>>>>>>> 1c2c3f0 (Make verification prompt items clickable with direct navigation links)
              {continueLabel}
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
