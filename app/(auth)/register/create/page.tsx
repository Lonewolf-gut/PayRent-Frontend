"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, type RegisterInput } from "@/lib/validations/auth";
import { RentVestLogo } from "@/components/rentvest/logo";
import { AuthBackLink, AuthSplitLayout, registerStep2Url } from "@/components/rentvest/auth-split-layout";
import { RegisterStepIndicator } from "@/components/auth/register-flow";
import { PasswordRequirementsChecklist } from "@/components/auth/password-requirements-checklist";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { signIn, getSession } from "next-auth/react";
import { readApiJson, stripSensitiveQueryParams } from "@/lib/utils/api-message";
import { getRegisterErrorMessage } from "@/lib/utils/auth-toast-messages";
import { toast } from "sonner";
import { ROLE_LABELS } from "@/constants/platform";

const roleImages: Record<"BUYER" | "MERCHANT" | "MARKETER" | "LENDER", string> = {
  BUYER:
    "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1400&q=80",
  MERCHANT:
    "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=1400&q=80",
  MARKETER:
    "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1400&q=80",
  LENDER:
    "https://images.unsplash.com/photo-1554224154-26032ffc0d07?auto=format&fit=crop&w=1400&q=80",
};

const roleLabels: Record<"BUYER" | "MERCHANT" | "MARKETER" | "LENDER", string> = {
  BUYER: "Customer",
  MERCHANT: "merchant",
  MARKETER: "Affiliate",
  LENDER: "investor",
};

function firstFormError(errors: FieldErrors<RegisterInput>) {
  for (const value of Object.values(errors)) {
    if (value && typeof value === "object" && "message" in value && value.message) {
      return String(value.message);
    }
  }
  return "Please check the highlighted fields and try again.";
}

function RegisterCreateForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleParam = searchParams.get("role");
  const entityParam = searchParams.get("entityType");
  const role = (["BUYER", "MERCHANT", "MARKETER", "LENDER"].includes(roleParam ?? "")
    ? roleParam
    : "BUYER") as "BUYER" | "MERCHANT" | "MARKETER" | "LENDER";
  const entityType: "INDIVIDUAL" | "COMPANY" =
    entityParam === "COMPANY" ? "COMPANY" : "INDIVIDUAL";
  const [loading, setLoading] = useState(false);
  const showEntityType = role === "BUYER" || role === "MERCHANT";
  const requiresDateOfBirth = entityType !== "COMPANY";

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role,
      entityType,
    },
  });

  const passwordValue = watch("password") ?? "";

  useEffect(() => {
    stripSensitiveQueryParams();
  }, []);

  useEffect(() => {
    setValue("role", role);
    setValue("entityType", entityType);
  }, [entityType, role, setValue]);

  useEffect(() => {
    if (roleParam) return;
    router.replace("/register");
  }, [roleParam, router]);

  const onInvalid = (formErrors: FieldErrors<RegisterInput>) => {
    toast.error(firstFormError(formErrors));
  };

  const onSubmit = async (data: RegisterInput) => {
    setLoading(true);
    const toastId = toast.loading("Creating your account…");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          role,
          entityType,
        }),
      });
      const json = await readApiJson(res);
      if (!json.success) {
        toast.error(getRegisterErrorMessage(json, res.status), { id: toastId });
        return;
      }

      toast.loading("Signing you in…", { id: toastId });

      const signInResult = await signIn("credentials", {
        email: data.email.trim().toLowerCase(),
        password: data.password,
        redirect: false,
      });

      if (signInResult?.error) {
        toast.success(
          "Your account was created. Sign in with your email and password to verify your email.",
          { id: toastId }
        );
        router.push(`/login/access?role=${role}&registered=1`);
        return;
      }

      const session = await getSession();
      if (!session?.user) {
        toast.success(
          "Your account was created. Sign in to continue to email verification.",
          { id: toastId }
        );
        router.push(`/login/access?role=${role}&registered=1`);
        return;
      }

      toast.success("Welcome! Verify your email to continue.", { id: toastId });
      sessionStorage.setItem("fresh-dashboard-login", "1");
      window.location.assign("/verify-email");
    } catch (error) {
      const isNetworkError =
        error instanceof TypeError ||
        (error instanceof Error && /failed to fetch|network/i.test(error.message));
      toast.error(
        isNetworkError
          ? "Cannot reach the server. Confirm the backend is running, then try again."
          : "Something went wrong while creating your account. Please try again.",
        { id: toastId }
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthSplitLayout
      hero={
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url('${roleImages[role]}')` }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/60 via-emerald-900/20 to-transparent" />
        </div>
      }
    >
      <div className="relative w-full max-w-md">
        <div className="absolute left-0 top-0">
          <AuthBackLink href={registerStep2Url(entityType)} />
        </div>

        <div className="mb-6 flex justify-center">
          <RentVestLogo showIcon={false} />
        </div>

        <RegisterStepIndicator step={3} />

        <div className="text-center">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Badge variant="secondary" className="rounded-full">
              {entityType === "COMPANY" ? "Business" : "Individual"}
            </Badge>
            <Badge className="rounded-full bg-emerald-600 hover:bg-emerald-600">
              {ROLE_LABELS[role]}
            </Badge>
          </div>
          <h1 className="mt-4 text-2xl font-semibold text-slate-900">Create your account</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter your details to finish signing up as a {roleLabels[role]}.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="mt-8 space-y-5" autoComplete="on">
          {showEntityType && entityType === "COMPANY" ? (
            <div className="space-y-2.5">
              <Label htmlFor="companyName" className="text-sm font-medium text-slate-700">
                Company name <span className="text-emerald-600">*</span>
              </Label>
              <Input id="companyName" className="h-11" {...register("companyName")} />
              {errors.companyName ? (
                <p className="text-xs text-destructive">{errors.companyName.message}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  This business name will appear on your profile after registration.
                </p>
              )}
            </div>
          ) : null}
          <div className="space-y-2.5">
            <Label htmlFor="fullName" className="text-sm font-medium text-slate-700">
              {entityType === "COMPANY" && showEntityType ? "Contact person name" : "Full name"}{" "}
              <span className="text-emerald-600">*</span>
            </Label>
            <Input id="fullName" className="h-11" {...register("fullName")} />
            {errors.fullName ? (
              <p className="text-xs text-destructive">{errors.fullName.message}</p>
            ) : null}
          </div>
          {requiresDateOfBirth ? (
            <div className="space-y-2.5">
              <Label htmlFor="dateOfBirth" className="text-sm font-medium text-slate-700">
                Date of birth <span className="text-emerald-600">*</span>
              </Label>
              <Input
                id="dateOfBirth"
                type="date"
                className="h-11"
                max={new Date().toISOString().slice(0, 10)}
                {...register("dateOfBirth")}
              />
              <p className="text-xs text-muted-foreground">
                You must be at least 18 years old to create an account.
              </p>
              {errors.dateOfBirth ? (
                <p className="text-xs text-destructive">{errors.dateOfBirth.message}</p>
              ) : null}
            </div>
          ) : null}
          <div className="space-y-2.5">
            <Label htmlFor="email" className="text-sm font-medium text-slate-700">
              Email address <span className="text-emerald-600">*</span>
            </Label>
            <Input id="email" type="email" className="h-11" {...register("email")} />
            {errors.email ? (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            ) : null}
          </div>
          <div className="space-y-2.5">
            <Label htmlFor="phone" className="text-sm font-medium text-slate-700">
              Phone number
            </Label>
            <Input id="phone" className="h-11" {...register("phone")} />
            {errors.phone ? (
              <p className="text-xs text-destructive">{errors.phone.message}</p>
            ) : null}
          </div>
          <div className="space-y-2.5">
            <Label htmlFor="password" className="text-sm font-medium text-slate-700">
              Password <span className="text-emerald-600">*</span>
            </Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              className="h-11"
              {...register("password")}
            />
            <PasswordRequirementsChecklist password={passwordValue} />
            {errors.password ? (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            ) : null}
          </div>
          <div className="space-y-3 rounded-md border border-slate-200 p-4 text-sm">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                className="mt-1"
                checked={watch("dataProcessingConsent") === true}
                onChange={(e) =>
                  setValue("dataProcessingConsent", e.target.checked ? true : (undefined as never), {
                    shouldValidate: true,
                  })
                }
              />
              <span>
                I consent to PayForMe collecting and processing my personal data as described in the{" "}
                <Link href="/privacy" className="text-emerald-600 hover:underline">
                  privacy policy
                </Link>
                .
              </span>
            </label>
            {errors.dataProcessingConsent ? (
              <p className="text-xs text-destructive">{errors.dataProcessingConsent.message}</p>
            ) : null}
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                className="mt-1"
                checked={watch("termsAccepted") === true}
                onChange={(e) =>
                  setValue("termsAccepted", e.target.checked ? true : (undefined as never), {
                    shouldValidate: true,
                  })
                }
              />
              <span>
                I accept the PayForMe{" "}
                <Link href="/terms" className="text-emerald-600 hover:underline">
                  terms of service
                </Link>
                .
              </span>
            </label>
            {errors.termsAccepted ? (
              <p className="text-xs text-destructive">{errors.termsAccepted.message}</p>
            ) : null}
          </div>
          <Button
            type="submit"
            className="h-11 w-full rounded-full bg-emerald-600 text-base font-semibold hover:bg-emerald-700"
            disabled={loading}
          >
            {loading ? "Creating account..." : "Create account"}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-600">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-emerald-600 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </AuthSplitLayout>
  );
}

export default function RegisterCreatePage() {
  return (
    <Suspense fallback={<p className="p-8 text-center text-sm text-muted-foreground">Loading…</p>}>
      <RegisterCreateForm />
    </Suspense>
  );
}
