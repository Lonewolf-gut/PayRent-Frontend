"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type WithdrawalStep = "otp" | "twofa" | "confirm";

type WithdrawalFlowDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amount: number;
  payoutLabel: string;
  step: WithdrawalStep;
  onStepChange: (step: WithdrawalStep) => void;
  onVerifyOtp: (code: string) => Promise<void>;
  onConfirm: (twoFaToken: string) => Promise<void>;
  verifyingOtp?: boolean;
  confirming?: boolean;
};

export function WithdrawalFlowDialog({
  open,
  onOpenChange,
  amount,
  payoutLabel,
  step,
  onStepChange,
  onVerifyOtp,
  onConfirm,
  verifyingOtp = false,
  confirming = false,
}: WithdrawalFlowDialogProps) {
  const [otpCode, setOtpCode] = useState("");
  const [twoFaToken, setTwoFaToken] = useState("");

  useEffect(() => {
    if (!open) {
      setOtpCode("");
      setTwoFaToken("");
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-none border-border bg-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === "otp"
              ? "Verify OTP"
              : step === "twofa"
                ? "Two-factor authentication"
                : "Confirm withdrawal"}
          </DialogTitle>
          <DialogDescription>
            {step === "otp"
              ? "Enter the OTP sent to your email or phone."
              : step === "twofa"
                ? "Enter the 6-digit code from your authenticator app."
                : `Withdraw GHS ${amount.toLocaleString()} to ${payoutLabel}?`}
          </DialogDescription>
        </DialogHeader>

        {step === "otp" ? (
          <div className="space-y-4">
            <div>
              <Label>OTP code</Label>
              <Input
                className="rounded-none border-border bg-background"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                placeholder="Enter OTP from email/SMS"
                autoFocus
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" className="rounded-none" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                className="rounded-none bg-emerald-600 hover:bg-emerald-700"
                disabled={!otpCode || verifyingOtp}
                onClick={async () => {
                  await onVerifyOtp(otpCode);
                  onStepChange("twofa");
                }}
              >
                {verifyingOtp ? "Verifying…" : "Verify OTP"}
              </Button>
            </DialogFooter>
          </div>
        ) : null}

        {step === "twofa" ? (
          <div className="space-y-4">
            <div>
              <Label>2FA token</Label>
              <Input
                className="rounded-none border-border bg-background"
                value={twoFaToken}
                onChange={(e) => setTwoFaToken(e.target.value)}
                maxLength={6}
                placeholder="6-digit authenticator code"
                autoFocus
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" className="rounded-none" onClick={() => onStepChange("otp")}>
                Back
              </Button>
              <Button
                className="rounded-none bg-emerald-600 hover:bg-emerald-700"
                disabled={twoFaToken.length < 6}
                onClick={() => onStepChange("confirm")}
              >
                Continue
              </Button>
            </DialogFooter>
          </div>
        ) : null}

        {step === "confirm" ? (
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" className="rounded-none" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              className="rounded-none bg-emerald-600 hover:bg-emerald-700"
              disabled={!twoFaToken || confirming}
              onClick={() => void onConfirm(twoFaToken)}
            >
              {confirming ? "Processing…" : "Confirm withdrawal"}
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
