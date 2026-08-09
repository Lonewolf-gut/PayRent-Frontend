"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RentVestLogo } from "@/components/rentvest/logo";
import { AuthFooter } from "@/components/rentvest/auth-footer";
import { DashboardThemeProvider } from "@/components/dashboard/dashboard-theme-provider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const fieldClassName =
  "h-11 border-input bg-background text-foreground placeholder:text-muted-foreground";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "reset">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [devResetCode, setDevResetCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onRequestCode = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) {
        toast.error(json.error?.message ?? "Could not send reset code. Try again.");
        return;
      }

      setDevResetCode(json.data?.devResetCode ?? null);
      setStep("reset");
      toast.success(
        json.data?.devResetCode
          ? "Development mode: use the reset code shown below."
          : "If your account exists, a reset code has been sent to your email."
      );
    } finally {
      setLoading(false);
    }
  };

  const onResetPassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email || !code || !password) return;
    setLoading(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code,
          password,
        }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) {
        toast.error(json.error?.message ?? "Could not reset password.");
        return;
      }

      toast.success("Password updated. You can sign in now.");
      router.push("/login/access");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardThemeProvider className="flex min-h-screen flex-col">
      <div className="flex flex-1 flex-col px-4 py-8 sm:px-8 sm:py-10">
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
          <div className="mb-6 flex justify-center">
            <RentVestLogo showIcon={false} />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-semibold text-foreground sm:text-2xl">
              {step === "email" ? "Forgot password" : "Reset password"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {step === "email"
                ? "Enter your email to receive a reset code."
                : "Enter the code and choose a new password."}
            </p>
          </div>

          {step === "email" ? (
            <form onSubmit={onRequestCode} className="mt-8 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">
                  Email address
                </Label>
                <Input
                  id="email"
                  type="email"
                  className={fieldClassName}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@example.com"
                />
              </div>
              <Button
                type="submit"
                className="h-11 w-full bg-emerald-600 hover:bg-emerald-700"
                disabled={loading || !email}
              >
                {loading ? "Sending..." : "Send reset code"}
              </Button>
            </form>
          ) : (
            <form onSubmit={onResetPassword} className="mt-8 space-y-4">
              {devResetCode ? (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-foreground">
                  <p className="font-medium">Development reset code</p>
                  <p className="mt-1 font-mono text-lg tracking-widest">{devResetCode}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Email is not configured locally, so the code is shown here instead.
                  </p>
                </div>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="email-readonly" className="text-foreground">
                  Email
                </Label>
                <Input
                  id="email-readonly"
                  type="email"
                  className={fieldClassName}
                  value={email}
                  readOnly
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code" className="text-foreground">
                  Reset code
                </Label>
                <Input
                  id="code"
                  inputMode="numeric"
                  maxLength={6}
                  className={fieldClassName}
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  placeholder="6-digit code"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground">
                  New password
                </Label>
                <Input
                  id="password"
                  type="password"
                  className={fieldClassName}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="At least 8 chars, 1 uppercase, 1 number"
                />
              </div>
              <Button
                type="submit"
                className="h-11 w-full bg-emerald-600 hover:bg-emerald-700"
                disabled={loading || !code || !password}
              >
                {loading ? "Updating..." : "Update password"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full border-input bg-background text-foreground hover:bg-muted"
                onClick={() => {
                  setStep("email");
                  setCode("");
                  setPassword("");
                  setDevResetCode(null);
                }}
              >
                Use a different email
              </Button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Remembered your password?{" "}
            <Link href="/login" className="font-medium text-emerald-600 hover:underline">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
      <AuthFooter className="mt-auto shrink-0" />
    </DashboardThemeProvider>
  );
}
