"use client";

import { useEffect, useState } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";
import { RentVestLogo } from "@/components/rentvest/logo";
import { AuthFooter } from "@/components/rentvest/auth-footer";
import { AuthSplitLayout } from "@/components/rentvest/auth-split-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getPostAuthRoute } from "@/lib/auth/post-auth-route";
import { ADMIN_HOME_PATH, COMPLIANCE_HOME_PATH } from "@/lib/auth/route-guards";
import { stripSensitiveQueryParams } from "@/lib/utils/api-message";
import { getSignInErrorMessage } from "@/lib/utils/auth-toast-messages";
import type { UserRole } from "@prisma/client";
import { toast } from "sonner";

interface LoginFormProps {
  adminMode?: boolean;
  complianceMode?: boolean;
}

export default function LoginForm({ adminMode = false, complianceMode = false }: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [needs2Fa, setNeeds2Fa] = useState(false);
  const [twoFaCode, setTwoFaCode] = useState("");
  const rawCallbackUrl = searchParams.get("callbackUrl");
  const callbackUrl =
    rawCallbackUrl &&
    !rawCallbackUrl.startsWith("/admin/login") &&
    !rawCallbackUrl.startsWith("/compliance/login")
      ? rawCallbackUrl
      : "/";
  const role = (adminMode || complianceMode
    ? adminMode
      ? "ADMIN"
      : "COMPLIANCE_OFFICER"
    : (searchParams.get("role") ?? "BUYER")) as
    | "BUYER"
    | "MERCHANT"
    | "MARKETER"
    | "LENDER"
    | "ADMIN"
    | "COMPLIANCE_OFFICER";
  const roleImage =
    role === "MERCHANT"
      ? "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=1400&q=80"
      : role === "MARKETER"
        ? "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1400&q=80"
        : role === "LENDER"
          ? "https://images.unsplash.com/photo-1554224154-26032ffc0d07?auto=format&fit=crop&w=1400&q=80"
          : "https://images.unsplash.com/photo-1554224154-26032ffc0d07?auto=format&fit=crop&w=1400&q=80";

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });
  useEffect(() => {
    stripSensitiveQueryParams();
  }, []);

  useEffect(() => {
    if (!adminMode && !complianceMode) return;

    getSession()
      .then((session) => {
        if (adminMode && session?.user?.role === "ADMIN") {
          window.location.assign(
            rawCallbackUrl &&
              rawCallbackUrl.startsWith("/admin") &&
              rawCallbackUrl !== "/admin/login"
              ? rawCallbackUrl
              : ADMIN_HOME_PATH
          );
        }
        if (complianceMode && session?.user?.role === "COMPLIANCE_OFFICER") {
          window.location.assign(
            rawCallbackUrl &&
              rawCallbackUrl.startsWith("/compliance") &&
              rawCallbackUrl !== "/compliance/login"
              ? rawCallbackUrl
              : COMPLIANCE_HOME_PATH
          );
        }
      })
      .catch(() => undefined);
  }, [adminMode, complianceMode, rawCallbackUrl]);

  const onSubmit = async (data: LoginInput) => {
    setLoading(true);
    const toastId = toast.loading(needs2Fa ? "Verifying code…" : "Signing you in…");

    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        otp: needs2Fa ? twoFaCode : undefined,
        redirect: false,
      });

      if (result?.error) {
        if (result.code === "two_factor_required") {
          setNeeds2Fa(true);
          toast.info(
            "Enter the 6-digit code from your authenticator app to finish signing in.",
            { id: toastId }
          );
          return;
        }

        void fetch("/api/auth/login-attempt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: data.email }),
        }).catch(() => undefined);

        toast.error(getSignInErrorMessage(result.error, result.code), { id: toastId });
        return;
      }

      const session = await getSession();
      if (!session?.user) {
        toast.error("Signed in, but the session could not be loaded. Please try again.", {
          id: toastId,
        });
        return;
      }

      toast.success("Signed in successfully.", { id: toastId });
      sessionStorage.setItem("fresh-dashboard-login", "1");
      sessionStorage.setItem("fresh-dashboard-login:at", String(Date.now()));
      sessionStorage.removeItem(`verification-prompt-dismissed:${session.user.id}`);

      if (adminMode) {
        if (session.user.role !== "ADMIN") {
          toast.error("This account does not have administrator access.", { id: toastId });
          return;
        }

        const destination =
          rawCallbackUrl &&
          rawCallbackUrl.startsWith("/admin") &&
          rawCallbackUrl !== "/admin/login"
            ? rawCallbackUrl
            : ADMIN_HOME_PATH;
        window.location.assign(destination);
        return;
      }

      if (complianceMode) {
        if (session.user.role !== "COMPLIANCE_OFFICER") {
          toast.error("This account does not have compliance officer access.", { id: toastId });
          return;
        }

        const destination =
          rawCallbackUrl &&
          rawCallbackUrl.startsWith("/compliance") &&
          rawCallbackUrl !== "/compliance/login"
            ? rawCallbackUrl
            : COMPLIANCE_HOME_PATH;
        window.location.assign(destination);
        return;
      }

      const destination = getPostAuthRoute({
        role: session.user.role as UserRole,
        emailVerified: Boolean(session.user.emailVerified),
        phoneVerified: Boolean(session.user.phoneVerified),
      });
      window.location.assign(destination);
      return;
    } catch (error) {
      const isNetworkError =
        error instanceof TypeError ||
        (error instanceof Error &&
          /failed to fetch|network|fetch/i.test(error.message));
      toast.error(
        isNetworkError
          ? "Cannot reach the server. Confirm `npm run dev:webpack` is running and Docker (Postgres) is started, then try again."
          : "Something went wrong while signing in. Please try again.",
        { id: toastId }
      );
    } finally {
      setLoading(false);
    }
  };
  const formContent = (
    <div className="w-full max-w-md">
      <div className="mb-6 flex justify-center">
        <RentVestLogo showIcon={false} />
      </div>
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-slate-900">Welcome back</h1>
        <p className="mt-1 text-sm text-muted-foreground">Sign in to your PayForMe account</p>
      </div>
      <form method="post" onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5" autoComplete="on">
        <div className="space-y-2.5">
          <Label htmlFor="email" className="text-sm font-medium text-slate-700">
            Enter your email address <span className="text-emerald-600">*</span>
          </Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            className="h-11 bg-white text-slate-900 placeholder:text-slate-400"
            {...register("email")}
          />
          {errors.email ? (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          ) : null}
        </div>
        <div className="space-y-2.5">
          <Label htmlFor="password" className="text-sm font-medium text-slate-700">
            Enter your password <span className="text-emerald-600">*</span>
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              className="h-11 pr-10 bg-white text-slate-900 placeholder:text-slate-400"
              {...register("password")}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword((value) => !value)}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {errors.password ? (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          ) : null}
        </div>
        {needs2Fa ? (
          <div className="space-y-2.5 rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
            <Label htmlFor="twoFaCode" className="text-sm font-medium text-slate-700">
              Authenticator code <span className="text-emerald-600">*</span>
            </Label>
            <Input
              id="twoFaCode"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              className="h-11 bg-white text-slate-900 placeholder:text-slate-400"
              value={twoFaCode}
              onChange={(e) => setTwoFaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
            />
            <p className="text-xs text-muted-foreground">
              Open your authenticator app and enter the current 6-digit code for{" "}
              {getValues("email") || "your account"}.
            </p>
          </div>
        ) : null}
        <Button          type="submit"
          className="h-11 w-full rounded-full bg-emerald-600 text-base font-semibold hover:bg-emerald-700"
          disabled={loading || (needs2Fa && twoFaCode.length !== 6)}
        >
          {loading ? "Signing in..." : needs2Fa ? "Verify and sign in" : "Sign in"}        </Button>
      </form>
      <div className="mt-6 space-y-2 text-center text-sm text-muted-foreground">
        {!adminMode && !complianceMode ? (
          <>
            <p>
              Don&apos;t have an account?{" "}
              <Link href="/register" className="font-medium text-emerald-600 hover:underline">
                Register
              </Link>
            </p>
            <p>
              Select a different role?{" "}
              <Link href="/login" className="font-medium text-emerald-600 hover:underline">
                Change role
              </Link>
            </p>
          </>
        ) : null}
        <p>
          Forgot your password?{" "}
          <Link href="/forgot-password" className="font-medium text-emerald-600 hover:underline">
            Reset it
          </Link>
        </p>
      </div>
    </div>
  );

  if (complianceMode) {
    return (
      <div className="flex min-h-screen w-full flex-col bg-slate-50">
        <div className="flex w-full flex-1 items-center justify-center px-4 py-12">
          <div className="mx-auto w-full max-w-md space-y-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-slate-900">Compliance Portal</h1>
              <p className="mt-2 text-sm text-slate-600">Secure compliance officer access</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              {formContent}
            </div>
          </div>
        </div>
        <AuthFooter />
      </div>
    );
  }

  if (adminMode) {
    return (
      <div className="flex min-h-screen w-full flex-col bg-slate-50">
        <div className="flex w-full flex-1 items-center justify-center px-4 py-12">
          <div className="mx-auto w-full max-w-md space-y-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-slate-900">Admin Portal</h1>
              <p className="mt-2 text-sm text-slate-600">Secure administrator access</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              {formContent}
            </div>
          </div>
        </div>
        <AuthFooter />
      </div>
    );
  }

  return (
    <AuthSplitLayout
      hero={
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url('${roleImage}')` }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/40 via-transparent to-transparent" />
        </div>
      }
    >
      {formContent}
    </AuthSplitLayout>
  );
}
