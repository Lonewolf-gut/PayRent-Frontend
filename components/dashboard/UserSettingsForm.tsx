"use client";

import { useEffect, useRef, useState, FormEvent } from "react";
import { useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import { SETTINGS_PROFILE_QUERY_KEY } from "@/hooks/use-settings-profile";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { AccountNameConfirmation } from "@/components/dashboard/account-name-confirmation";
import { TwoFactorSetupDialog } from "@/components/dashboard/two-factor-setup-dialog";
import { TwoFactorSetupPanel } from "@/components/dashboard/two-factor-setup-panel";
import { getApiErrorMessage, readApiJson } from "@/lib/utils/api-message";
import { ProfileImage } from "@/components/shared/profile-image";

type BankAccount = {
  id: string;
  accountType: string;
  bankCode?: string | null;
  bankName: string;
  accountNumber: string;
  accountNumberMasked?: string | null;
  accountName: string;
  isVerified: boolean;
  isDefault: boolean;
};

type UserSettingsFormProps = {
  settingsApi?: string;
  imageApi?: string;
  bankApi?: string;
  updateSessionAfterUpload?: boolean;
  showBankSection?: boolean;
};

export default function UserSettingsForm({
  settingsApi = "/api/settings",
  imageApi = "/api/settings/image",
  bankApi = "/api/settings/bank-account",
  updateSessionAfterUpload = true,
  showBankSection = true,
}: UserSettingsFormProps) {
  const { update: updateSession } = useSession();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [fullName, setFullName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [accountType, setAccountType] = useState("BANK");
  const [bankName, setBankName] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [bankLoading, setBankLoading] = useState(false);
  const [deletingAccountId, setDeletingAccountId] = useState<string | null>(null);
  const [providers, setProviders] = useState<Array<{ code: string; name: string }>>([]);
  const [providersLoading, setProvidersLoading] = useState(false);
  const [resolveLoading, setResolveLoading] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [accountVerified, setAccountVerified] = useState(false);
  const resolveRequestRef = useRef(0);
  const [payoutVerificationConfigured, setPayoutVerificationConfigured] = useState(true);

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFaPending, setTwoFaPending] = useState(false);
  const [twoFaOtpauthUrl, setTwoFaOtpauthUrl] = useState<string | null>(null);
  const [twoFaSecret, setTwoFaSecret] = useState<string | null>(null);
  const [twoFaDialogOpen, setTwoFaDialogOpen] = useState(false);
  const [twoFaToken, setTwoFaToken] = useState("");
  const [twoFaLoading, setTwoFaLoading] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch(settingsApi);
        const json = await res.json();
        if (!res.ok) throw new Error(json?.message ?? "Unable to load settings");
        setEmail(json.data.user?.email ?? "");
        setEmailVerified(Boolean(json.data.user?.emailVerified));
        setFullName(json.data.user?.fullName ?? "");
        setImageUrl(json.data.user?.image ?? "");
        setPreviewUrl(json.data.user?.image ?? "");
        setBankAccounts(json.data.bankAccounts ?? []);
        setTwoFactorEnabled(Boolean(json.data.user?.twoFactorEnabled));
      } catch (error: unknown) {
        toast.error(error instanceof Error ? error.message : String(error));
      }
    }

    async function loadTwoFactorStatus() {
      try {
        const res = await fetch("/api/auth/2fa");
        const json = await res.json();
        if (!res.ok || !json.success) return;
        setTwoFactorEnabled(Boolean(json.data?.enabled));
        setTwoFaPending(Boolean(json.data?.pendingSetup));
      } catch {
        // Non-blocking; settings payload may still include enabled flag.
      }
    }

    loadSettings();
    loadTwoFactorStatus();
  }, [settingsApi]);

  useEffect(() => {
    if (!selectedFile) return;
    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  useEffect(() => {
    setBankName("");
    setBankCode("");
    setAccountNumber("");
    setAccountName("");
    setResolveError(null);
    setAccountVerified(false);

    async function loadProviders() {
      setProvidersLoading(true);
      try {
        const res = await fetch(`/api/bank-accounts/providers?accountType=${accountType}`);
        const json = await readApiJson(res);
        if (json.success) {
          const data = json.data as {
            configured?: boolean;
            providers?: Array<{ code: string; name: string }>;
          };
          setPayoutVerificationConfigured(data.configured !== false);
          setProviders(data.providers ?? []);
        } else {
          setPayoutVerificationConfigured(false);
          setProviders([]);
        }
      } catch {
        setPayoutVerificationConfigured(false);
        setProviders([]);
      } finally {
        setProvidersLoading(false);
      }
    }

    loadProviders();
  }, [accountType]);

  useEffect(() => {
    if (!payoutVerificationConfigured) {
      setAccountName("");
      setResolveError(null);
      setAccountVerified(false);
      return;
    }

    const minLength = accountType === "MOMO" ? 10 : 8;
    const trimmedAccountNumber = accountNumber.trim();
    if (!bankCode || trimmedAccountNumber.length < minLength) {
      setAccountName("");
      setResolveError(null);
      setAccountVerified(false);
      setResolveLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      const requestId = ++resolveRequestRef.current;
      setResolveLoading(true);
      setResolveError(null);
      setAccountVerified(false);
      setAccountName("");

      try {
        const params = new URLSearchParams({
          accountType,
          accountNumber: trimmedAccountNumber,
          bankCode,
        });
        const res = await fetch(`/api/bank-accounts/resolve?${params.toString()}`, {
          signal: controller.signal,
        });
        const json = await readApiJson(res);
        const data = json.data as {
          verified?: boolean;
          accountName?: string;
          error?: string;
        } | null;

        if (requestId !== resolveRequestRef.current) return;

        if (!res.ok || !json.success || !data?.verified) {
          throw new Error(
            data?.error ??
              getApiErrorMessage(json, "Could not verify this account. Check the details and try again.")
          );
        }

        setAccountName(data.accountName ?? "");
        setAccountVerified(true);
        setResolveError(null);
      } catch (error: unknown) {
        if (controller.signal.aborted) return;
        if (requestId !== resolveRequestRef.current) return;

        setAccountVerified(false);
        setAccountName("");
        const message =
          error instanceof Error
            ? error.message
            : "Could not verify this account. Check the details and try again.";
        setResolveError(message);
      } finally {
        if (requestId === resolveRequestRef.current) {
          setResolveLoading(false);
        }
      }
    }, 600);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [accountType, accountNumber, bankCode, payoutVerificationConfigured]);

  async function handleProfileSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (newPassword && newPassword !== confirmPassword) {
      toast.error("New password and confirmation do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(settingsApi, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl,
          currentPassword,
          newPassword,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message ?? "Request failed");
      toast.success("Profile updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      await queryClient.invalidateQueries({ queryKey: SETTINGS_PROFILE_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: ["kyc-status"] });
      if (updateSessionAfterUpload) await updateSession();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }

  async function handleUploadImage() {
    if (!selectedFile) {
      toast.error("Select an image file first.");
      return;
    }

    setUploadLoading(true);
    try {
      const formData = new FormData();
      formData.append("image", selectedFile);

      const res = await fetch(imageApi, {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message ?? json?.error?.message ?? "Image upload failed");
      const imageUrl = json.data.imageUrl as string;
      setImageUrl(imageUrl);
      setPreviewUrl(imageUrl);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      toast.success("Profile image saved.");
      queryClient.setQueryData(
        SETTINGS_PROFILE_QUERY_KEY,
        (current: { fullName?: string | null; email?: string; image?: string | null } | undefined) =>
          current ? { ...current, image: imageUrl } : { image: imageUrl, fullName: null, email }
      );
      await queryClient.invalidateQueries({ queryKey: ["admin-profile"] });
      await queryClient.invalidateQueries({ queryKey: SETTINGS_PROFILE_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: ["kyc-status"] });
      if (updateSessionAfterUpload) {
        await updateSession({
          user: {
            image: imageUrl,
          },
        });
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setUploadLoading(false);
    }
  }

  async function handleAddBankAccount(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!bankName.trim()) {
      toast.error("Select a bank or mobile money provider.");
      return;
    }

    const canSave =
      payoutVerificationConfigured
        ? accountVerified && accountName.trim()
        : accountName.trim().length >= 2;

    if (!canSave) {
      toast.error(
        payoutVerificationConfigured
          ? "Verify your account number first so we can confirm the account holder name."
          : "Enter the account holder name as it appears on the bank or MoMo account."
      );
      return;
    }

    setBankLoading(true);

    try {
      const res = await fetch(bankApi, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountType,
          bankCode: bankCode || undefined,
          bankName,
          accountNumber,
          accountName: accountName.trim(),
          isDefault,
        }),
      });
      const json = await readApiJson(res);
      if (!res.ok || !json.success) {
        throw new Error(
          getApiErrorMessage(json, "Could not save your bank or MoMo details. Please try again.")
        );
      }

      const savedAccount = json.data as BankAccount;
      setBankAccounts((current) => [savedAccount, ...current]);
      queryClient.invalidateQueries({ queryKey: ["settings-bank-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["kyc-status"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success(
        json.message ??
          (savedAccount?.isVerified
            ? "Account verified and saved successfully."
            : "Bank or MoMo details saved for review.")
      );
      setBankName("");
      setBankCode("");
      setAccountNumber("");
      setAccountName("");
      setIsDefault(false);
      setAccountVerified(false);
      setResolveError(null);
    } catch (error: unknown) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not save your bank or MoMo details. Please try again."
      );
    } finally {
      setBankLoading(false);
    }
  }

  async function handleDeleteBankAccount(accountId: string) {
    if (!window.confirm("Remove this saved account? You can add it again later.")) return;

    setDeletingAccountId(accountId);
    try {
      const res = await fetch(`${bankApi}/${accountId}`, { method: "DELETE" });
      const json = await readApiJson(res);
      if (!res.ok || !json.success) {
        throw new Error(getApiErrorMessage(json, "Could not remove this account."));
      }

      setBankAccounts((current) => current.filter((account) => account.id !== accountId));
      queryClient.invalidateQueries({ queryKey: ["settings-bank-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["kyc-status"] });
      toast.success("Account removed.");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setDeletingAccountId(null);
    }
  }

  async function startTwoFactorSetup() {
    setTwoFaLoading(true);
    try {
      const res = await fetch("/api/auth/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "enable" }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(getApiErrorMessage(json));
      const otpauthUrl = json.data.otpauthUrl as string | undefined;
      const secret = json.data.secret as string | undefined;
      setTwoFaOtpauthUrl(otpauthUrl ?? null);
      setTwoFaSecret(secret ?? null);
      setTwoFaPending(true);
      setTwoFaToken("");
      setTwoFaDialogOpen(true);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setTwoFaLoading(false);
    }
  }

  async function handleEnable2Fa() {
    await startTwoFactorSetup();
  }

  async function handleContinue2FaSetup() {
    await startTwoFactorSetup();
  }

  async function handleVerify2Fa() {
    if (!twoFaToken) {
      toast.error("Enter the 6-digit code from your authenticator app.");
      return;
    }
    setTwoFaLoading(true);
    try {
      const res = await fetch("/api/auth/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", token: twoFaToken }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(getApiErrorMessage(json));
      setTwoFactorEnabled(true);
      setTwoFaPending(false);
      setTwoFaOtpauthUrl(null);
      setTwoFaSecret(null);
      setTwoFaDialogOpen(false);
      setTwoFaToken("");
      await updateSession();
      toast.success("Two-factor authentication enabled.");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setTwoFaLoading(false);
    }
  }

  async function handleDisable2Fa() {
    if (twoFaToken.length !== 6) {
      toast.error("Enter your current 6-digit authenticator code to turn off 2FA.");
      return;
    }
    setTwoFaLoading(true);
    try {
      const res = await fetch("/api/auth/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disable", token: twoFaToken }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(getApiErrorMessage(json));
      setTwoFactorEnabled(false);
      setTwoFaPending(false);
      setTwoFaToken("");
      await updateSession();
      toast.success("Two-factor authentication turned off.");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setTwoFaLoading(false);
    }
  }

  const hasPayoutAccount = bankAccounts.length > 0;
  const verifiedAccounts = bankAccounts.filter((a) => a.isVerified).length;
  const minAccountDigits = accountType === "MOMO" ? 10 : 8;
  const canSubmitBankDetails =
    bankName.trim().length > 0 &&
    accountNumber.trim().length >= minAccountDigits &&
    (payoutVerificationConfigured
      ? accountVerified && accountName.trim().length > 0
      : accountName.trim().length >= 2);

  return (
    <div className="w-full">
      <Accordion type="single" collapsible className="border-y">
        <AccordionItem value="profile" className="border-0">
          <AccordionTrigger className="rounded-none border-0 px-0 py-5 hover:no-underline">
            <div className="flex flex-1 items-center justify-between gap-4 pr-2 text-left">
              <div>
                <p className="text-base font-medium text-foreground">Profile</p>
                <p className="text-sm font-normal text-muted-foreground">
                  Name, email, password, and profile picture.
                </p>
              </div>
              <StatusBadge
                status={imageUrl ? "APPROVED" : "PENDING"}
                label={imageUrl ? "Photo set" : "No photo"}
              />
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-0 pb-6">
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              {emailVerified ? (
                <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-muted/20 px-4 py-3">
                  <StatusBadge status="APPROVED" label="Email verified" />
                </div>
              ) : null}
              {fullName ? (
                <div className="grid gap-2">
                  <Label>Name</Label>
                  <Input
                    type="text"
                    value={fullName}
                    readOnly
                    disabled
                    className="bg-muted/40 text-foreground"
                  />
                  <p className="text-xs text-muted-foreground">
                    Your name is set at registration and cannot be changed here.
                  </p>
                </div>
              ) : null}

              <div className="grid gap-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={email}
                  readOnly
                  disabled
                  className="bg-muted/40 text-foreground"
                />
                <p className="text-xs text-muted-foreground">
                  Email is set at registration and cannot be changed here.
                  {emailVerified ? " Your email address has been verified." : null}
                </p>
              </div>

              <div className="grid gap-2">
                <Label>{imageUrl ? "Change profile image" : "Profile image"}</Label>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                />
                {imageUrl ? (
                  <p className="text-xs text-muted-foreground">
                    Choose a new photo and upload to replace your current one.
                  </p>
                ) : null}
              </div>

              {previewUrl || imageUrl ? (
                <div className="flex items-center gap-4 rounded-none border p-3">
                  <ProfileImage image={previewUrl || imageUrl} name={fullName} email={email} size="lg" />
                  <span className="text-sm text-muted-foreground">
                    Preview of your profile image.
                  </span>
                </div>
              ) : null}

              <Button
                type="button"
                variant="secondary"
                onClick={handleUploadImage}
                disabled={uploadLoading || !selectedFile}
              >
                {uploadLoading
                  ? "Uploading…"
                  : imageUrl
                    ? "Update profile image"
                    : "Upload profile image"}
              </Button>

              <div className="grid gap-2">
                <Label>Current password</Label>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label>New password</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label>Confirm new password</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {loading ? "Saving…" : "Save profile settings"}
              </Button>
            </form>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="security" className="border-0">
          <AccordionTrigger className="rounded-none border-0 px-0 py-5 hover:no-underline">
            <div className="flex flex-1 items-center justify-between gap-4 pr-2 text-left">
              <div>
                <p className="text-base font-medium text-foreground">Two-factor authentication</p>
                <p className="text-sm font-normal text-muted-foreground">
                  Required to confirm wallet withdrawals.
                </p>
              </div>
              <StatusBadge
                status={twoFactorEnabled ? "APPROVED" : twoFaPending ? "PENDING" : "DRAFT"}
                label={twoFactorEnabled ? "Enabled" : twoFaPending ? "Setup" : "Off"}
              />
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-0 pb-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              Use Google Authenticator, Authy, or a compatible TOTP app. Withdrawals will ask
              for a code after OTP verification.
            </p>

            <TwoFactorSetupPanel
              enabled={twoFactorEnabled}
              pending={twoFaPending}
              token={twoFaToken}
              loading={twoFaLoading}
              onTokenChange={setTwoFaToken}
              onEnable={handleEnable2Fa}
              onContinueSetup={handleContinue2FaSetup}
              onDisable={handleDisable2Fa}
            />

            <TwoFactorSetupDialog
              open={twoFaDialogOpen}
              onOpenChange={setTwoFaDialogOpen}
              otpauthUrl={twoFaOtpauthUrl}
              secret={twoFaSecret}
              token={twoFaToken}
              loading={twoFaLoading}
              onTokenChange={setTwoFaToken}
              onVerify={handleVerify2Fa}
            />
          </AccordionContent>
        </AccordionItem>

        {showBankSection ? (
        <>
        <AccordionItem value="bank" className="border-0">
          <AccordionTrigger className="rounded-none border-0 px-0 py-5 hover:no-underline">
            <div className="flex flex-1 items-center justify-between gap-4 pr-2 text-left">
              <div>
                <p className="text-base font-medium text-foreground">Bank & MoMo details</p>
                <p className="text-sm font-normal text-muted-foreground">
                  Payout destinations for withdrawals, mandates, and settlements.
                </p>
              </div>
              <StatusBadge
                status={verifiedAccounts > 0 ? "APPROVED" : hasPayoutAccount ? "PENDING" : "DRAFT"}
                label={
                  verifiedAccounts > 0
                    ? `${verifiedAccounts} verified`
                    : hasPayoutAccount
                      ? "Pending"
                      : "None added"
                }
              />
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-0 pb-6">
            <form onSubmit={handleAddBankAccount} className="space-y-4">
              <div className="grid gap-2">
                <Label>Account type</Label>
                <NativeSelect
                  value={accountType}
                  onChange={(e) => setAccountType(e.target.value)}
                >
                  <option value="BANK">Bank</option>
                  <option value="MOMO">MoMo</option>
                </NativeSelect>
              </div>

              <div className="grid gap-2">
                <Label>{accountType === "MOMO" ? "Mobile money network" : "Bank"}</Label>
                {providers.length > 0 ? (
                <NativeSelect
                  value={bankCode}
                  onChange={(e) => {
                    const selected = providers.find((item) => item.code === e.target.value);
                    setBankCode(e.target.value);
                    setBankName(selected?.name ?? "");
                  }}
                  disabled={providersLoading}
                >
                  <option value="">
                    {providersLoading
                      ? "Loading providers…"
                      : accountType === "MOMO"
                        ? "Select MTN, Telecel, or AirtelTigo"
                        : "Select your bank"}
                  </option>
                  {providers.map((provider) => (
                    <option key={provider.code} value={provider.code}>
                      {provider.name}
                    </option>
                  ))}
                </NativeSelect>
                ) : (
                  <Input
                    value={bankName}
                    onChange={(e) => {
                      setBankName(e.target.value);
                      setBankCode(e.target.value ? "MANUAL" : "");
                    }}
                    placeholder={accountType === "MOMO" ? "Mobile money network" : "Bank name"}
                  />
                )}
              </div>

              <div className="grid gap-2">
                <Label>{accountType === "MOMO" ? "Mobile number" : "Account number"}</Label>
                <Input
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder={accountType === "MOMO" ? "0551234567" : "Account number"}
                  inputMode={accountType === "MOMO" ? "tel" : "numeric"}
                />
              </div>

              {payoutVerificationConfigured ? (
                <>
                  {(resolveLoading || resolveError || accountVerified) && bankCode && accountNumber ? (
                    <AccountNameConfirmation
                      accountName={accountName}
                      accountNumber={accountNumber}
                      providerName={bankName || (accountType === "MOMO" ? "Mobile Money" : "Bank")}
                      loading={resolveLoading}
                      error={resolveError}
                    />
                  ) : bankCode && accountNumber.trim().length >= minAccountDigits ? (
                    <p className="text-xs text-muted-foreground">
                      Enter your {accountType === "MOMO" ? "MoMo number" : "account number"} and we&apos;ll
                      confirm the registered account name automatically.
                    </p>
                  ) : null}
                </>
              ) : (
                <div className="grid gap-2">
                  <Label>Account holder name</Label>
                  <Input
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="Name on the bank or MoMo account"
                  />
                  <p className="text-xs text-muted-foreground">
                    Automatic account lookup is unavailable. Enter the holder name exactly as it appears on
                    the account.
                  </p>
                </div>
              )}

              <input type="hidden" name="bankName" value={bankName} />
              <input type="hidden" name="accountName" value={accountName} />

              <div className="flex items-center gap-2">
                <input
                  id="isDefault"
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="h-4 w-4 rounded border-input text-emerald-600"
                />
                <Label htmlFor="isDefault" className="label-inline">Mark as default account</Label>
              </div>

              <Button
                type="submit"
                disabled={bankLoading || !canSubmitBankDetails}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {bankLoading ? "Saving…" : "Add Bank/MoMo details"}
              </Button>
            </form>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="saved" className="border-0">
          <AccordionTrigger className="rounded-none border-0 px-0 py-5 hover:no-underline">
            <div className="flex flex-1 items-center justify-between gap-4 pr-2 text-left">
              <div>
                <p className="text-base font-medium text-foreground">Saved accounts</p>
                <p className="text-sm font-normal text-muted-foreground">
                  Your active bank and MoMo destinations.
                </p>
              </div>
              <StatusBadge
                status={hasPayoutAccount ? "APPROVED" : "DRAFT"}
                label={hasPayoutAccount ? `${bankAccounts.length} saved` : "Empty"}
              />
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-0 pb-6">
            <div className="space-y-3">
              {bankAccounts.length ? (
                bankAccounts.map((account) => (
                  <div key={account.id} className="rounded-none border bg-background p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">{account.accountType}</p>
                        <p className="text-sm text-muted-foreground">{account.bankName}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge
                          status={account.isVerified ? "APPROVED" : "PENDING"}
                          label={account.isVerified ? "Verified" : "Pending"}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          disabled={deletingAccountId === account.id}
                          onClick={() => handleDeleteBankAccount(account.id)}
                        >
                          <Trash2 className="size-4" />
                          {deletingAccountId === account.id ? "Removing…" : "Remove"}
                        </Button>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-1 text-sm text-muted-foreground">
                      <p>{account.accountName}</p>
                      <p>{account.accountNumberMasked ?? account.accountNumber}</p>
                      {account.isDefault ? (
                        <p className="text-xs text-emerald-600">Default payout account</p>
                      ) : null}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No bank or MoMo details added yet.</p>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
        </>
        ) : null}
      </Accordion>
    </div>
  );
}
