"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SETTINGS_PROFILE_QUERY_KEY } from "@/hooks/use-settings-profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { UTILITY_BILL_LABELS } from "@/lib/constants/financing-docs";
import {
  EMPLOYMENT_STATUS_OPTIONS,
  getEmploymentStatusLabel,
  isEmploymentRecorded,
  requiresEmploymentDocuments,
} from "@/lib/constants/employment-status";
import { toast } from "sonner";

const PROFILE_COMPLETE_STATUSES = new Set([
  "PROFILE_COMPLETED",
  "KYC_PENDING",
  "KYC_VERIFIED",
]);

type EmploymentStatusValue =
  | "EMPLOYED"
  | "SELF_EMPLOYED"
  | "UNEMPLOYED"
  | "STUDENT"
  | "RETIRED"
  | "";

function applyStatusToForm(
  status: Record<string, unknown>,
  setEntityType: (value: EntityType) => void,
  setEmploymentStatus: (value: EmploymentStatusValue) => void,
  setProfile: Dispatch<
    SetStateAction<{
      dateOfBirth: string;
      occupation: string;
      employerName: string;
      monthlyIncome: string;
      residentialAddress: string;
      staffId: string;
      ssnitNumber: string;
      companyName: string;
      companyRegistrationNumber: string;
      companyRegisteredAddress: string;
      companyTin: string;
    }>
  >,
  setIdentity: Dispatch<
    SetStateAction<{
      documentType: DocumentType;
      idNumber: string;
      fullName: string;
      dateOfBirth: string;
    }>
  >
) {
  if (status.entityType) setEntityType(status.entityType as EntityType);
  setEmploymentStatus((status.employmentStatus as EmploymentStatusValue) ?? "");
  setProfile({
    dateOfBirth: (status.dateOfBirth as string) ?? "",
    occupation:
      (status.occupation as string) ?? (status.lenderType as string) ?? "",
    employerName:
      (status.employerName as string) ?? (status.institutionName as string) ?? "",
    monthlyIncome:
      status.monthlyIncome != null ? String(status.monthlyIncome) : "",
    residentialAddress: (status.residentialAddress as string) ?? "",
    staffId: (status.staffId as string) ?? "",
    ssnitNumber: (status.ssnitNumber as string) ?? "",
    companyName: (status.companyName as string) ?? "",
    companyRegistrationNumber: (status.companyRegistrationNumber as string) ?? "",
    companyRegisteredAddress: (status.companyRegisteredAddress as string) ?? "",
    companyTin: (status.companyTin as string) ?? "",
  });
  setIdentity((prev) => ({
    ...prev,
    fullName: (status.contactName as string) ?? (status.fullName as string) ?? prev.fullName,
    idNumber: (status.nationalId as string) ?? prev.idNumber,
  }));
}

type DocumentType = "GHANA_CARD" | "VOTER_ID" | "PASSPORT" | "DRIVERS_LICENSE";
type EntityType = "INDIVIDUAL" | "COMPANY";

const DOCUMENT_LABELS: Record<DocumentType, string> = {
  GHANA_CARD: "Ghana Card",
  VOTER_ID: "Voter ID",
  PASSPORT: "Passport",
  DRIVERS_LICENSE: "Driver's licence",
};

const ID_PLACEHOLDERS: Record<DocumentType, string> = {
  GHANA_CARD: "GHA-123456789-1",
  VOTER_ID: "1234567890",
  PASSPORT: "G1234567",
  DRIVERS_LICENSE: "V1234567",
};

export function UserKycForm({
  roleLabel = "User",
  supportsEntityType = false,
}: {
  roleLabel?: string;
  supportsEntityType?: boolean;
}) {
  const queryClient = useQueryClient();
  const [entityType, setEntityType] = useState<EntityType>("INDIVIDUAL");
  const [employmentStatus, setEmploymentStatus] = useState<EmploymentStatusValue>("");
  const [profile, setProfile] = useState({
    dateOfBirth: "",
    occupation: "",
    employerName: "",
    monthlyIncome: "",
    residentialAddress: "",
    staffId: "",
    ssnitNumber: "",
    companyName: "",
    companyRegistrationNumber: "",
    companyRegisteredAddress: "",
    companyTin: "",
  });
  const [identity, setIdentity] = useState({
    documentType: "GHANA_CARD" as DocumentType,
    idNumber: "",
    fullName: "",
    dateOfBirth: "",
  });
  const [idFront, setIdFront] = useState<File | null>(null);
  const [idBack, setIdBack] = useState<File | null>(null);
  const [facePhoto, setFacePhoto] = useState<File | null>(null);
  const [companyRegistration, setCompanyRegistration] = useState<File | null>(null);
  const [companyTin, setCompanyTin] = useState<File | null>(null);
  const [ssnitDocument, setSsnitDocument] = useState<File | null>(null);
  const [employmentLetter, setEmploymentLetter] = useState<File | null>(null);
  const [staffIdDocument, setStaffIdDocument] = useState<File | null>(null);
  const [addressProof, setAddressProof] = useState<File | null>(null);
  const [billType, setBillType] = useState<
    "ELECTRICITY" | "WATER" | "LANDLINE" | "INTERNET"
  >("ELECTRICITY");

  const { data: status, isLoading, refetch } = useQuery({
    queryKey: ["kyc-status"],
    queryFn: async () => {
      const res = await fetch("/api/kyc");
      const json = await res.json();
      return json.data;
    },
  });

  useEffect(() => {
    if (!status) return;
    applyStatusToForm(status, setEntityType, setEmploymentStatus, setProfile, setIdentity);
  }, [status]);

  const profileMutation = useMutation({
    mutationFn: async () => {
      const isCompanyProfile = supportsEntityType && entityType === "COMPANY";
      if (!isCompanyProfile && !employmentStatus) {
        throw new Error("Select your employment status before saving your profile.");
      }

      const payload: Record<string, unknown> = {
        entityType: supportsEntityType ? entityType : undefined,
      };

      if (supportsEntityType && entityType === "COMPANY") {
        payload.companyName = profile.companyName;
        payload.companyRegistrationNumber = profile.companyRegistrationNumber;
        payload.companyRegisteredAddress = profile.companyRegisteredAddress;
        if (profile.companyTin.trim()) payload.companyTin = profile.companyTin;
      } else {
        payload.employmentStatus = employmentStatus;
        payload.dateOfBirth = profile.dateOfBirth || undefined;
        payload.occupation = profile.occupation.trim() || undefined;
        payload.employerName = profile.employerName.trim() || undefined;
        if (profile.monthlyIncome.trim()) {
          payload.monthlyIncome = Number(profile.monthlyIncome);
        }
        payload.residentialAddress = profile.residentialAddress.trim() || undefined;
        payload.staffId = profile.staffId.trim() || undefined;
        payload.ssnitNumber = profile.ssnitNumber.trim() || undefined;
      }

      const res = await fetch("/api/kyc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "profile",
          data: payload,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message ?? "Request failed");
      return json;
    },
    onSuccess: async (json) => {
      toast.success(json.message ?? "Profile saved");
      await queryClient.invalidateQueries({ queryKey: ["kyc-status"] });
      await queryClient.invalidateQueries({ queryKey: SETTINGS_PROFILE_QUERY_KEY });
      const { data: fresh } = await refetch();
      if (fresh) {
        applyStatusToForm(fresh, setEntityType, setEmploymentStatus, setProfile, setIdentity);
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const employmentMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append("staffId", profile.staffId);
      formData.append("ssnitNumber", profile.ssnitNumber);
      if (profile.employerName.trim()) {
        formData.append("employerName", profile.employerName);
      }
      if (profile.occupation.trim()) {
        formData.append("occupation", profile.occupation);
      }
      if (!employmentLetter || !staffIdDocument || !ssnitDocument) {
        throw new Error("Employment letter, staff ID document, and SSNIT document are required.");
      }
      formData.append("employmentLetter", employmentLetter);
      formData.append("staffIdDocument", staffIdDocument);
      formData.append("ssnitDocument", ssnitDocument);

      const res = await fetch("/api/kyc/employment/submit", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message ?? "Submission failed");
      return json;
    },
    onSuccess: async (json) => {
      toast.success(json.message ?? "Employment documents submitted");
      setEmploymentLetter(null);
      setStaffIdDocument(null);
      setSsnitDocument(null);
      await queryClient.invalidateQueries({ queryKey: ["kyc-status"] });
      await refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addressMutation = useMutation({
    mutationFn: async () => {
      const address = isCompany
        ? profile.companyRegisteredAddress
        : profile.residentialAddress;
      if (!address.trim()) {
        throw new Error("Save your address in the profile section first.");
      }
      if (!addressProof) {
        throw new Error("Address proof document is required.");
      }

      const formData = new FormData();
      formData.append("entityType", entityType);
      formData.append("address", address);
      formData.append("billType", billType);
      formData.append("addressProof", addressProof);

      const res = await fetch("/api/kyc/address/submit", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message ?? "Submission failed");
      return json;
    },
    onSuccess: async (json) => {
      toast.success(json.message ?? "Address proof submitted");
      setAddressProof(null);
      await queryClient.invalidateQueries({ queryKey: ["kyc-status"] });
      await refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const verificationMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append("entityType", entityType);

      if (entityType === "COMPANY") {
        formData.append("companyName", profile.companyName);
        formData.append("companyRegistrationNumber", profile.companyRegistrationNumber);
        formData.append("companyRegisteredAddress", profile.companyRegisteredAddress);
        if (profile.companyTin) formData.append("companyTin", profile.companyTin);
        formData.append("fullName", identity.fullName || profile.companyName);
        if (!companyRegistration) {
          throw new Error("Company registration certificate is required.");
        }
        formData.append("companyRegistration", companyRegistration);
        if (companyTin) formData.append("companyTinDoc", companyTin);
      } else {
        if (!identity.fullName.trim()) {
          throw new Error("Enter your full name as it appears on your ID.");
        }
        if (!identity.idNumber.trim()) {
          throw new Error("Enter your ID number before submitting.");
        }
        if (identity.idNumber.trim().length < 3) {
          throw new Error("ID number must be at least 3 characters.");
        }
        if (
          identity.documentType === "GHANA_CARD" &&
          !/^GHA-\d{9}-\d$/.test(identity.idNumber.trim())
        ) {
          throw new Error("Ghana Card number must match GHA-XXXXXXXXX-X.");
        }
        if (identity.documentType === "DRIVERS_LICENSE" && !identity.dateOfBirth) {
          throw new Error("Date of birth is required for driver's licence verification.");
        }

        formData.append("documentType", identity.documentType);
        formData.append("idNumber", identity.idNumber.trim());
        formData.append("fullName", identity.fullName.trim());
        if (identity.dateOfBirth) formData.append("dateOfBirth", identity.dateOfBirth);
        if (!idFront || !idBack || !facePhoto) {
          throw new Error("ID front, ID back, and face photo are required.");
        }
        formData.append("idFront", idFront);
        formData.append("idBack", idBack);
        formData.append("facePhoto", facePhoto);
      }

      const res = await fetch("/api/kyc/identity/submit", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message ?? "Submission failed");
      return json;
    },
    onSuccess: async (json) => {
      toast.success(json.message ?? "Submitted for admin review");
      await queryClient.invalidateQueries({ queryKey: ["kyc-status"] });
      await refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const verificationPending =
    status?.verifications?.some(
      (v: { type: string; status: string }) =>
        (v.type === "IDENTITY" || v.type === "KYB") && v.status === "PENDING"
    ) ?? false;

  const employmentPending =
    status?.verifications?.some(
      (v: { type: string; status: string }) =>
        v.type === "EMPLOYMENT" && v.status === "PENDING"
    ) ?? false;

  const addressPending =
    status?.verifications?.some(
      (v: { type: string; status: string }) =>
        v.type === "ADDRESS" && v.status === "PENDING"
    ) ?? false;

  const profileComplete = PROFILE_COMPLETE_STATUSES.has(status?.profileStatus ?? "");
  const identityVerified = Boolean(status?.kycVerified);
  const employmentVerified = Boolean(status?.employmentVerified);
  const addressVerified = Boolean(status?.addressVerified);
  if (isLoading) {
    return <p className="text-muted-foreground">Loading verification status...</p>;
  }

  const isCompany = supportsEntityType && entityType === "COMPANY";
  const isIndividual = !isCompany;
  const needsEmploymentDocuments = requiresEmploymentDocuments(employmentStatus);
  const employmentRecorded = isEmploymentRecorded(
    employmentStatus,
    profileComplete,
    employmentVerified
  );
  const accountEmail = status?.email ?? "";

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Profile & {isCompany ? "KYB" : "KYC"}</h1>
        <p className="text-muted-foreground">
          Complete your {roleLabel.toLowerCase()} profile and submit documents for manual
          administrator verification. Add bank or MoMo details in Settings.
        </p>
      </div>

      <Accordion type="single" collapsible className="border-y">
        {supportsEntityType ? (
          <AccordionItem value="entity" className="border-0">
            <AccordionTrigger className="rounded-none border-0 px-0 py-5 hover:no-underline">
              <div className="flex flex-1 items-center justify-between gap-4 pr-2 text-left">
                <div>
                  <p className="text-base font-medium">Account type</p>
                  <p className="text-sm font-normal text-muted-foreground">
                    Register as an individual or a company.
                  </p>
                </div>
                <StatusBadge
                  status={profileComplete ? "APPROVED" : "PENDING"}
                  label={entityType === "COMPANY" ? "Company" : "Individual"}
                />
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-0 pb-6">
              <div className="max-w-sm space-y-3">
                <Label>Account type</Label>
                <Select
                  value={entityType}
                  onValueChange={(value) => setEntityType(value as EntityType)}
                  disabled={identityVerified || verificationPending}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                    <SelectItem value="COMPANY">Company</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </AccordionContent>
          </AccordionItem>
        ) : null}

        <AccordionItem value="profile" className="border-0">
          <AccordionTrigger className="rounded-none border-0 px-0 py-5 hover:no-underline">
            <div className="flex flex-1 items-center justify-between gap-4 pr-2 text-left">
              <div>
                <p className="text-base font-medium">{roleLabel} profile</p>
                <p className="text-sm font-normal text-muted-foreground">
                  {isCompany
                    ? "Company details and contact information."
                    : "Personal details, employment, and address information."}
                </p>
              </div>
              <StatusBadge
                status={profileComplete ? "APPROVED" : "PENDING"}
                label={profileComplete ? "Complete" : "Incomplete"}
              />
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-0 pb-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Account email</Label>
                <Input value={accountEmail} readOnly disabled className="bg-muted/40" />
                <p className="mt-1 text-xs text-muted-foreground">
                  Email is set at registration and cannot be changed here.
                </p>
              </div>
              {isCompany ? (
                <>
                  <div className="sm:col-span-2">
                    <Label>Company name</Label>
                    <Input
                      value={profile.companyName}
                      onChange={(e) =>
                        setProfile({ ...profile, companyName: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Registration number</Label>
                    <Input
                      value={profile.companyRegistrationNumber}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          companyRegistrationNumber: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label>Company TIN</Label>
                    <Input
                      value={profile.companyTin}
                      onChange={(e) =>
                        setProfile({ ...profile, companyTin: e.target.value })
                      }
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Registered address</Label>
                    <Input
                      value={profile.companyRegisteredAddress}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          companyRegisteredAddress: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Contact person name</Label>
                    <Input
                      value={identity.fullName}
                      onChange={(e) =>
                        setIdentity({ ...identity, fullName: e.target.value })
                      }
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="sm:col-span-2">
                    <Label>Employment status</Label>
                    <Select
                      value={employmentStatus || undefined}
                      onValueChange={(value) =>
                        setEmploymentStatus(value as EmploymentStatusValue)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select your employment status" />
                      </SelectTrigger>
                      <SelectContent>
                        {EMPLOYMENT_STATUS_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Date of birth</Label>
                    <Input
                      type="date"
                      value={profile.dateOfBirth}
                      onChange={(e) =>
                        setProfile({ ...profile, dateOfBirth: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>
                      {employmentStatus === "STUDENT"
                        ? "School / course"
                        : employmentStatus === "SELF_EMPLOYED"
                          ? "Business / trade"
                          : "Occupation"}
                    </Label>
                    <Input
                      value={profile.occupation}
                      onChange={(e) =>
                        setProfile({ ...profile, occupation: e.target.value })
                      }
                    />
                  </div>
                  {employmentStatus === "EMPLOYED" || employmentStatus === "SELF_EMPLOYED" ? (
                    <div>
                      <Label>
                        {employmentStatus === "SELF_EMPLOYED"
                          ? "Business name"
                          : "Employer / organization"}
                      </Label>
                      <Input
                        value={profile.employerName}
                        onChange={(e) =>
                          setProfile({ ...profile, employerName: e.target.value })
                        }
                      />
                    </div>
                  ) : null}
                  {employmentStatus === "EMPLOYED" ||
                  employmentStatus === "SELF_EMPLOYED" ||
                  employmentStatus === "RETIRED" ? (
                    <div>
                      <Label>Monthly income (GHS)</Label>
                      <Input
                        type="number"
                        value={profile.monthlyIncome}
                        onChange={(e) =>
                          setProfile({ ...profile, monthlyIncome: e.target.value })
                        }
                      />
                    </div>
                  ) : null}
                  <div className="sm:col-span-2">
                    <Label>Residential address</Label>
                    <Input
                      value={profile.residentialAddress}
                      onChange={(e) =>
                        setProfile({ ...profile, residentialAddress: e.target.value })
                      }
                    />
                  </div>
                  {employmentStatus === "EMPLOYED" ? (
                    <>
                      <div className="sm:col-span-2">
                        <Label>Staff ID number</Label>
                        <Input
                          value={profile.staffId}
                          onChange={(e) =>
                            setProfile({ ...profile, staffId: e.target.value })
                          }
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <Label>SSNIT number</Label>
                        <Input
                          value={profile.ssnitNumber}
                          onChange={(e) =>
                            setProfile({ ...profile, ssnitNumber: e.target.value })
                          }
                          placeholder="Enter your SSNIT membership number"
                        />
                        <p className="mt-1 text-xs text-muted-foreground">
                          Required for employed users. You will also submit an SSNIT registration
                          document in the employment verification step.
                        </p>
                      </div>
                    </>
                  ) : null}
                </>
              )}
              <Button
                className="sm:col-span-2 bg-emerald-600 hover:bg-emerald-700"
                onClick={() => profileMutation.mutate()}
                disabled={profileMutation.isPending}
              >
                Save profile
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>

        {isIndividual ? (
        <AccordionItem value="employment" className="border-0">
          <AccordionTrigger className="rounded-none border-0 px-0 py-5 hover:no-underline">
            <div className="flex flex-1 items-center justify-between gap-4 pr-2 text-left">
              <div>
                <p className="text-base font-medium">Employment verification</p>
                <p className="text-sm font-normal text-muted-foreground">
                  {needsEmploymentDocuments
                    ? "Submit your employment letter, staff ID, and SSNIT document for admin review."
                    : "Your employment status is recorded on your profile. Document upload is only required if you are employed."}
                </p>
              </div>
              <StatusBadge
                status={employmentRecorded ? "APPROVED" : "PENDING"}
                label={
                  needsEmploymentDocuments
                    ? employmentVerified
                      ? "Verified"
                      : employmentPending
                        ? "Pending review"
                        : "Not submitted"
                    : employmentStatus
                      ? "Recorded"
                      : "Not set"
                }
              />
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-0 pb-6">
            {needsEmploymentDocuments ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2 rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
                Status: {getEmploymentStatusLabel(employmentStatus)}
                {profile.employerName ? ` · ${profile.employerName}` : ""}
              </div>
              <div className="sm:col-span-2">
                <Label>Staff ID number</Label>
                <Input
                  value={profile.staffId}
                  onChange={(e) =>
                    setProfile({ ...profile, staffId: e.target.value })
                  }
                  disabled={employmentVerified || employmentPending}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>SSNIT number</Label>
                <Input
                  value={profile.ssnitNumber}
                  onChange={(e) =>
                    setProfile({ ...profile, ssnitNumber: e.target.value })
                  }
                  disabled={employmentVerified || employmentPending}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Employment letter</Label>
                <Input
                  type="file"
                  accept="image/*,.pdf"
                  disabled={employmentVerified || employmentPending}
                  onChange={(e) => setEmploymentLetter(e.target.files?.[0] ?? null)}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Staff ID document</Label>
                <Input
                  type="file"
                  accept="image/*,.pdf"
                  disabled={employmentVerified || employmentPending}
                  onChange={(e) => setStaffIdDocument(e.target.files?.[0] ?? null)}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>SSNIT registration document</Label>
                <Input
                  type="file"
                  accept="image/*,.pdf"
                  disabled={employmentVerified || employmentPending}
                  onChange={(e) => setSsnitDocument(e.target.files?.[0] ?? null)}
                />
              </div>
              <Button
                className="sm:col-span-2 bg-emerald-600 hover:bg-emerald-700"
                disabled={
                  employmentVerified ||
                  employmentPending ||
                  employmentMutation.isPending ||
                  !profileComplete ||
                  !profile.staffId.trim() ||
                  !profile.ssnitNumber.trim()
                }
                onClick={() => employmentMutation.mutate()}
              >
                {employmentPending
                  ? "Pending admin review"
                  : employmentVerified
                    ? "Verified"
                    : "Submit employment documents"}
              </Button>
              {!profileComplete ? (
                <p className="sm:col-span-2 text-xs text-muted-foreground">
                  Save your profile before submitting employment documents.
                </p>
              ) : null}
            </div>
            ) : (
              <div className="rounded-lg border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground">
                {employmentStatus ? (
                  <>
                    Your status is recorded as{" "}
                    <span className="font-medium text-foreground">
                      {getEmploymentStatusLabel(employmentStatus)}
                    </span>
                    . Employment letter and staff ID documents are not required. These details
                    appear on your dashboard and are included when you submit other verifications
                    to admin.
                  </>
                ) : (
                  <>Select your employment status in the profile section and save your profile.</>
                )}
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
        ) : null}

        <AccordionItem value="address" className="border-0">
          <AccordionTrigger className="rounded-none border-0 px-0 py-5 hover:no-underline">
            <div className="flex flex-1 items-center justify-between gap-4 pr-2 text-left">
              <div>
                <p className="text-base font-medium">
                  {isCompany ? "Business address verification" : "Residential address verification"}
                </p>
                <p className="text-sm font-normal text-muted-foreground">
                  Upload a recent utility bill (electricity, water, landline, or internet) as proof
                  of {isCompany ? "business" : "residential"} address.
                </p>
              </div>
              <StatusBadge
                status={addressVerified ? "APPROVED" : "PENDING"}
                label={
                  addressVerified
                    ? "Verified"
                    : addressPending
                      ? "Pending review"
                      : "Not submitted"
                }
              />
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-0 pb-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>{isCompany ? "Registered business address" : "Residential address"}</Label>
                <Input
                  value={
                    isCompany ? profile.companyRegisteredAddress : profile.residentialAddress
                  }
                  readOnly
                  disabled
                  className="bg-muted/40"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Update this in the profile section above, then submit your bill here.
                </p>
              </div>
              <div className="sm:col-span-2">
                <Label>Bill type</Label>
                <Select
                  value={billType}
                  onValueChange={(value) =>
                    setBillType(value as typeof billType)
                  }
                  disabled={addressVerified || addressPending}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(UTILITY_BILL_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label>Address proof document</Label>
                <Input
                  type="file"
                  accept="image/*,.pdf"
                  disabled={addressVerified || addressPending}
                  onChange={(e) => setAddressProof(e.target.files?.[0] ?? null)}
                />
              </div>
              <Button
                className="sm:col-span-2 bg-emerald-600 hover:bg-emerald-700"
                disabled={
                  addressVerified ||
                  addressPending ||
                  addressMutation.isPending ||
                  !profileComplete
                }
                onClick={() => addressMutation.mutate()}
              >
                {addressPending
                  ? "Pending admin review"
                  : addressVerified
                    ? "Verified"
                    : "Submit address proof"}
              </Button>
              {!profileComplete ? (
                <p className="sm:col-span-2 text-xs text-muted-foreground">
                  Save your profile before submitting address proof.
                </p>
              ) : null}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="identity" className="border-0">
          <AccordionTrigger className="rounded-none border-0 px-0 py-5 hover:no-underline">
            <div className="flex flex-1 items-center justify-between gap-4 pr-2 text-left">
              <div>
                <p className="text-base font-medium">
                  {isCompany ? "Business verification (KYB)" : "Identity verification (KYC)"}
                </p>
                <p className="text-sm font-normal text-muted-foreground">
                  {isCompany
                    ? "Upload company registration documents for admin review."
                    : "Upload your ID (front & back) and a face photo for admin review."}
                </p>
              </div>
              <StatusBadge
                status={identityVerified ? "APPROVED" : "PENDING"}
                label={
                  identityVerified
                    ? "Verified"
                    : verificationPending
                      ? "Pending review"
                      : "Not submitted"
                }
              />
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-0 pb-6">
            {isCompany ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label>Company registration certificate</Label>
                  <Input
                    type="file"
                    accept="image/*,.pdf"
                    disabled={identityVerified || verificationPending}
                    onChange={(e) =>
                      setCompanyRegistration(e.target.files?.[0] ?? null)
                    }
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label>Company TIN certificate (optional)</Label>
                  <Input
                    type="file"
                    accept="image/*,.pdf"
                    disabled={identityVerified || verificationPending}
                    onChange={(e) => setCompanyTin(e.target.files?.[0] ?? null)}
                  />
                </div>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label>Document type</Label>
                  <Select
                    value={identity.documentType}
                    onValueChange={(value) =>
                      setIdentity({
                        ...identity,
                        documentType: value as DocumentType,
                        idNumber: "",
                      })
                    }
                    disabled={identityVerified || verificationPending}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(DOCUMENT_LABELS) as DocumentType[]).map((type) => (
                        <SelectItem key={type} value={type}>
                          {DOCUMENT_LABELS[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{DOCUMENT_LABELS[identity.documentType]} number</Label>
                  <Input
                    placeholder={ID_PLACEHOLDERS[identity.documentType]}
                    value={identity.idNumber}
                    onChange={(e) =>
                      setIdentity({ ...identity, idNumber: e.target.value })
                    }
                    disabled={identityVerified || verificationPending}
                  />
                </div>
                <div>
                  <Label>Full name (as on ID)</Label>
                  <Input
                    value={identity.fullName}
                    onChange={(e) =>
                      setIdentity({ ...identity, fullName: e.target.value })
                    }
                    disabled={identityVerified || verificationPending}
                  />
                </div>
                {identity.documentType === "DRIVERS_LICENSE" ? (
                  <div className="sm:col-span-2">
                    <Label>Date of birth (required)</Label>
                    <Input
                      type="date"
                      value={identity.dateOfBirth}
                      onChange={(e) =>
                        setIdentity({ ...identity, dateOfBirth: e.target.value })
                      }
                      disabled={identityVerified || verificationPending}
                    />
                  </div>
                ) : null}
                <div>
                  <Label>ID front photo</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    disabled={identityVerified || verificationPending}
                    onChange={(e) => setIdFront(e.target.files?.[0] ?? null)}
                  />
                </div>
                <div>
                  <Label>ID back photo</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    disabled={identityVerified || verificationPending}
                    onChange={(e) => setIdBack(e.target.files?.[0] ?? null)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label>Face photo (selfie)</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    disabled={identityVerified || verificationPending}
                    onChange={(e) => setFacePhoto(e.target.files?.[0] ?? null)}
                  />
                </div>
              </div>
            )}

            <Button
              className="mt-4 w-full bg-emerald-600 hover:bg-emerald-700 sm:w-auto"
              disabled={
                identityVerified ||
                verificationPending ||
                verificationMutation.isPending ||
                !profileComplete
              }
              onClick={() => verificationMutation.mutate()}
            >
              {verificationPending
                ? "Pending admin review"
                : identityVerified
                  ? "Verified"
                  : "Submit for verification"}
            </Button>
            {!profileComplete ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Save your profile before submitting verification documents.
              </p>
            ) : null}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
