"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import { RentVestLogo } from "@/components/rentvest/logo";
import { AuthSplitLayout } from "@/components/rentvest/auth-split-layout";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getPostAuthRoute } from "@/lib/auth/post-auth-route";
import {
  appendCallbackUrl,
  clearPersistedAuthReturnUrl,
  persistAuthReturnUrl,
  resolveAuthReturnUrl,
} from "@/lib/utils/auth-callback-url";
import type { UserRole } from "@prisma/client";

type VerificationDelivery = {
  deliveryMode?: "smtp" | "ethereal" | "log" | null;
  previewUrl?: string | null;
  devCode?: string | null;
  realEmailExpected?: boolean;
  hasPendingCode?: boolean;
};

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { data: session, update } = useSession();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [realEmailExpected, setRealEmailExpected] = useState(false);

  const email = session?.user?.email ?? "";

  useEffect(() => {
    persistAuthReturnUrl(searchParams.get("callbackUrl"));
  }, [searchParams]);

  const applyDelivery = useCallback((data: VerificationDelivery | null | undefined) => {
    if (!data) return;

    setPreviewUrl(data.previewUrl ?? null);
    setDevCode(data.devCode ?? null);
    setRealEmailExpected(Boolean(data.realEmailExpected));

    if (data.devCode) {
      setCode(data.devCode);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadVerification() {
      try {
        const statusRes = await fetch("/api/auth/resend-verification");
        const statusJson = await statusRes.json();
        if (cancelled) return;

        if (statusJson.success) {
          const statusData = statusJson.data as VerificationDelivery;
          applyDelivery(statusData);

          if (statusData.hasPendingCode || statusData.realEmailExpected) {
            setBootstrapping(false);
            return;
          }

          if (statusData.devCode) {
            setBootstrapping(false);
            return;
          }
        }

        const res = await fetch("/api/auth/resend-verification", { method: "POST" });
        const json = await res.json();
        if (cancelled) return;

        if (json.success) {
          applyDelivery(json.data as VerificationDelivery);
        }
      } catch {
        if (!cancelled) {
          toast.error("Could not load your verification code. Click resend to try again.");
        }
      } finally {
        if (!cancelled) {
          setBootstrapping(false);
        }
      }
    }

    if (session?.user) {
      void loadVerification();
    } else {
      setBootstrapping(false);
    }

    return () => {
      cancelled = true;
    };
  }, [session?.user, applyDelivery]);

  const onVerify = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim(), purpose: "EMAIL_VERIFY" }),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.errors?.[0]?.message ?? "Invalid or expired code");
        return;
      }

      await update();
      await queryClient.invalidateQueries({ queryKey: ["kyc-status"] });
      toast.success("Email verified successfully");

      const returnUrl = resolveAuthReturnUrl(searchParams.get("callbackUrl"));
      const role = session?.user?.role as UserRole | undefined;
      if (session?.user?.id) {
        sessionStorage.removeItem(`verification-prompt-dismissed:${session.user.id}`);
      }
      sessionStorage.setItem("fresh-dashboard-login", "1");
      const destination = role
        ? getPostAuthRoute({
            role,
            emailVerified: true,
            phoneVerified: Boolean(session?.user?.phoneVerified),
            returnUrl,
          })
        : appendCallbackUrl("/verify-phone", returnUrl);
      if (returnUrl && destination === returnUrl) {
        clearPersistedAuthReturnUrl();
      }
      router.push(destination);
      router.refresh();
    } catch {
      toast.error("Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const onResend = async () => {
    setResending(true);
    try {
      const res = await fetch("/api/auth/resend-verification", { method: "POST" });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.errors?.[0]?.message ?? "Could not resend code");
        return;
      }

      const data = json.data as VerificationDelivery;
      applyDelivery(data);

      if (data.devCode) {
        toast.success("Your verification code is shown below.");
        return;
      }

      if (data.previewUrl) {
        toast.success("Open the preview link below to view your verification email.");
        return;
      }

      if (data.realEmailExpected) {
        toast.success("A new verification code was sent to your email inbox.");
        return;
      }

      toast.success("Verification code updated.");
    } catch {
      toast.error("Could not resend code");
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthSplitLayout
      hero={
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1400&q=80')] bg-cover bg-center">
          <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/60 via-emerald-900/20 to-transparent" />
        </div>
      }
    >
      <div className="relative mx-auto w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <RentVestLogo showIcon={false} />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-slate-900">Verify your email</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {realEmailExpected ? (
              <>
                Enter the 6-digit code sent to{" "}
                <span className="font-medium text-foreground">{email || "your email"}</span>.
              </>
            ) : (
              <>
                Local development mode — use the code below for{" "}
                <span className="font-medium text-foreground">{email || "your email"}</span>.
              </>
            )}
          </p>
        </div>

        {bootstrapping ? (
          <p className="mt-6 text-center text-sm text-muted-foreground">Loading your code…</p>
        ) : null}

        {!realEmailExpected && devCode ? (
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
            <p className="text-xs font-medium uppercase tracking-wide text-amber-800">
              Your verification code
            </p>
            <p className="mt-2 font-mono text-3xl font-bold tracking-[0.35em] text-amber-950">
              {devCode}
            </p>
            <p className="mt-2 text-xs text-amber-900/80">
              In local development, codes are shown here. They are not sent to your real inbox
              unless SMTP is fully configured with a verified sending domain.
            </p>
          </div>
        ) : null}

        <form onSubmit={onVerify} className="mt-8 space-y-4">
          <div>
            <Label htmlFor="code">Verification code</Label>
            <Input
              id="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              className="h-11 bg-white text-slate-900"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
            />
          </div>
          <Button
            type="submit"
            className="h-11 w-full rounded-full bg-emerald-600 hover:bg-emerald-700"
            disabled={loading || code.length !== 6 || bootstrapping}
          >
            {loading ? "Verifying..." : "Verify email"}
          </Button>
        </form>

        <div className="mt-4 flex flex-col gap-2 text-center text-sm">
          {previewUrl ? (
            <a
              href={previewUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 font-medium text-emerald-800 hover:bg-emerald-100"
            >
              Open email preview
            </a>
          ) : null}
          <button
            type="button"
            className="text-emerald-700 hover:text-emerald-900 disabled:opacity-60"
            onClick={onResend}
            disabled={resending || bootstrapping}
          >
            {resending ? "Sending..." : "Resend code"}
          </button>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => {
              const returnUrl = resolveAuthReturnUrl(searchParams.get("callbackUrl"));
              const role = session?.user?.role as UserRole | undefined;
              sessionStorage.setItem("fresh-dashboard-login", "1");
              const destination = role
                ? getPostAuthRoute({
                    role,
                    emailVerified: true,
                    phoneVerified: Boolean(session?.user?.phoneVerified),
                    returnUrl,
                  })
                : appendCallbackUrl("/verify-phone", returnUrl);
              if (returnUrl && destination === returnUrl) {
                clearPersistedAuthReturnUrl();
              }
              router.push(destination);
            }}
          >
            Skip for now
          </button>
        </div>
      </div>
    </AuthSplitLayout>
  );
}
