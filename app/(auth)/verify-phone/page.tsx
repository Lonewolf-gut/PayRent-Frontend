"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import { RentVestLogo } from "@/components/rentvest/logo";
import { AuthSplitLayout } from "@/components/rentvest/auth-split-layout";
import { DevVerificationCodeBox } from "@/components/auth/dev-verification-code-box";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { resetDevVerificationToast, showDevVerificationCodeToast } from "@/lib/utils/dev-verification-toast";
import { fetchDevVerificationCode } from "@/lib/utils/fetch-dev-verification-code";
import {
  FRESH_DASHBOARD_LOGIN_KEY,
  getVerificationDismissedKey,
  skipToDashboard,
} from "@/lib/auth/verification-flow";
import type { UserRole } from "@prisma/client";

type PhoneVerificationDelivery = {
  phone?: string | null;
  devCode?: string | null;
  code?: string | null;
  hasPendingCode?: boolean;
  smsConfigured?: boolean;
  isDevelopment?: boolean;
};

export default function VerifyPhonePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session, update } = useSession();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [smsConfigured, setSmsConfigured] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);

  const applyOtpCode = useCallback(
    (
      otpCode: string | null | undefined,
      data?: PhoneVerificationDelivery | null,
      options?: { forceToast?: boolean }
    ) => {
      if (!otpCode) return;
      setCode(otpCode);
      setDevCode(otpCode);
      if (data?.smsConfigured !== undefined) {
        setSmsConfigured(Boolean(data.smsConfigured));
      }
      showDevVerificationCodeToast(otpCode, "phone", {
        force: options?.forceToast,
        isDevelopment: data?.isDevelopment,
      });
    },
    []
  );

  const applyDelivery = useCallback(
    async (
      data: PhoneVerificationDelivery | null | undefined,
      options?: { forceToast?: boolean }
    ) => {
      if (!data) return;
      if (data.phone) setPhone(data.phone);
      if (data.smsConfigured !== undefined) {
        setSmsConfigured(Boolean(data.smsConfigured));
      }

      let otpCode = data.devCode ?? data.code ?? null;
      if (!otpCode) {
        otpCode = await fetchDevVerificationCode("PHONE_VERIFY");
      }

      applyOtpCode(otpCode, data, options);
    },
    [applyOtpCode]
  );

  const sendCode = useCallback(async (targetPhone?: string) => {
    const normalized = (targetPhone ?? phone).trim();
    if (normalized.length < 10) {
      toast.error("Enter a valid mobile number first.");
      return;
    }

    setResending(true);
    resetDevVerificationToast("phone");
    try {
      const res = await fetch("/api/auth/resend-phone-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalized }),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.errors?.[0]?.message ?? json.message ?? "Could not send code");
        return;
      }

      await applyDelivery(json.data as PhoneVerificationDelivery, { forceToast: true });

      const data = json.data as PhoneVerificationDelivery;
      if (!data.devCode && !data.code) {
        toast.success(`Verification code sent to ${data.phone ?? normalized}.`);
      }
    } catch {
      toast.error("Could not send verification code");
    } finally {
      setResending(false);
    }
  }, [applyDelivery, phone]);

  useEffect(() => {
    let cancelled = false;

    async function requestCode(targetPhone: string) {
      const res = await fetch("/api/auth/resend-phone-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: targetPhone }),
      });
      const json = await res.json();
      if (cancelled || !json.success) return;

      await applyDelivery(json.data as PhoneVerificationDelivery);
    }

    async function loadVerification() {
      try {
        const statusRes = await fetch("/api/auth/resend-phone-verification");
        const statusJson = await statusRes.json();
        if (cancelled) return;

        if (statusJson.success) {
          const statusData = statusJson.data as PhoneVerificationDelivery;
          await applyDelivery(statusData);

          const targetPhone = statusData.phone?.trim() ?? "";
          const pendingOtp = statusData.devCode ?? statusData.code ?? null;
          if (!statusData.hasPendingCode && !pendingOtp && targetPhone.length >= 10) {
            await requestCode(targetPhone);
          }
        }
      } catch {
        if (!cancelled) {
          toast.error("Could not load your verification status.");
        }
      } finally {
        if (!cancelled) setBootstrapping(false);
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
    if (code.trim().length !== 6) return;

    setLoading(true);
    try {
      const res = await fetch("/api/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim(), purpose: "PHONE_VERIFY" }),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.errors?.[0]?.message ?? "Invalid or expired code");
        return;
      }

      const updated = await update({ user: { phoneVerified: true } });
      await queryClient.invalidateQueries({ queryKey: ["kyc-status"] });
      toast.success("Mobile number verified successfully");

      const role = (updated?.user?.role ?? session?.user?.role) as UserRole | undefined;
      if (session?.user?.id) {
        sessionStorage.removeItem(getVerificationDismissedKey(session.user.id));
      }
      sessionStorage.setItem(FRESH_DASHBOARD_LOGIN_KEY, "1");

      const destination = role ? skipToDashboard(role) : "/";

      router.refresh();
      router.push(destination);
    } catch {
      toast.error("Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthSplitLayout
      hero={
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=1400&q=80')] bg-cover bg-center">
          <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/60 via-emerald-900/20 to-transparent" />
        </div>
      }
    >
      <div className="relative mx-auto w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <RentVestLogo showIcon={false} />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-slate-900">Verify your mobile number</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            We&apos;ll send a 6-digit code by SMS to confirm your number.
          </p>
        </div>

        {bootstrapping ? (
          <p className="mt-6 text-center text-sm text-muted-foreground">Loading…</p>
        ) : null}

        {devCode ? (
          <DevVerificationCodeBox
            code={devCode}
            channel="phone"
            smsConfigured={smsConfigured}
          />
        ) : null}

        <form onSubmit={onVerify} className="mt-8 space-y-4">
          <div>
            <Label htmlFor="phone">Mobile number</Label>
            <Input
              id="phone"
              inputMode="tel"
              autoComplete="tel"
              className="h-11 bg-white text-slate-900"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0551234567"
            />
          </div>
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
            {loading ? "Verifying..." : "Verify mobile number"}
          </Button>
        </form>

        <div className="mt-4 flex flex-col gap-2 text-center text-sm">
          <button
            type="button"
            className="text-emerald-700 hover:text-emerald-900 disabled:opacity-60"
            onClick={() => sendCode()}
            disabled={resending || bootstrapping || phone.trim().length < 10}
          >
            {resending ? "Sending..." : "Send verification code"}
          </button>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => {
              const role = session?.user?.role as UserRole | undefined;
              if (session?.user?.id) {
                sessionStorage.setItem(
                  getVerificationDismissedKey(session.user.id),
                  "true"
                );
              }
              sessionStorage.setItem(FRESH_DASHBOARD_LOGIN_KEY, "1");
              router.push(skipToDashboard(role));
              router.refresh();
            }}
          >
            Skip for now
          </button>
        </div>
      </div>
    </AuthSplitLayout>
  );
}
