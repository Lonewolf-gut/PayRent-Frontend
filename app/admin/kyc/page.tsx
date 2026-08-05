"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/dashboard/status-badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { KYC_DOCUMENT_LABELS, UTILITY_BILL_LABELS } from "@/lib/constants/financing-docs";
import { getEmploymentStatusLabel } from "@/lib/constants/employment-status";
import { SecureDocumentPreview } from "@/components/shared/secure-document-preview";
import { getProfileDisplayName } from "@/lib/utils/display-name";
import { toast } from "sonner";

type KycDocument = {
  id: string;
  documentType: string;
  fileName: string;
  fileUrl: string;
};

type ReviewUser = {
  id: string;
  email: string;
  phone?: string | null;
  role: string;
  tenant?: {
    fullName?: string | null;
    companyName?: string | null;
    entityType?: string | null;
    employmentStatus?: string | null;
    occupation?: string | null;
    employerName?: string | null;
  } | null;
  landlord?: {
    fullName?: string | null;
    companyName?: string | null;
    entityType?: string | null;
    employmentStatus?: string | null;
    occupation?: string | null;
    employerName?: string | null;
  } | null;
  lender?: {
    fullName?: string | null;
    employmentStatus?: string | null;
    lenderType?: string | null;
    institutionName?: string | null;
  } | null;
  agentProfile?: {
    fullName?: string | null;
    employmentStatus?: string | null;
  } | null;
};

type ReviewItem = {
  id: string;
  userId: string;
  type: string;
  status: string;
  providerName?: string | null;
  providerReference?: string | null;
  failureReason?: string | null;
  user?: ReviewUser;
  documents?: KycDocument[];
  data?: {
    bankAccountId?: string;
    ghanaCardNumber?: string;
    idNumber?: string;
    documentType?: string;
    fullName?: string;
    entityType?: string;
    companyName?: string;
    companyRegistrationNumber?: string;
    companyRegisteredAddress?: string;
    companyTin?: string;
    staffId?: string;
    employerName?: string;
    occupation?: string;
    address?: string;
    billType?: string;
    employmentStatus?: string;
  };
};

type UserReviewGroup = {
  userId: string;
  user: ReviewUser;
  displayName: string;
  reviews: ReviewItem[];
  pendingCount: number;
};

function getReviewEmploymentContext(review: ReviewItem) {
  const roleProfile =
    review.user?.tenant ??
    review.user?.landlord ??
    review.user?.lender ??
    review.user?.agentProfile;

  return {
    employmentStatus:
      review.data?.employmentStatus ?? roleProfile?.employmentStatus ?? null,
    occupation:
      review.data?.occupation ??
      (roleProfile && "occupation" in roleProfile ? roleProfile.occupation : null) ??
      (roleProfile && "lenderType" in roleProfile ? roleProfile.lenderType : null),
    employerName:
      review.data?.employerName ??
      (roleProfile && "employerName" in roleProfile ? roleProfile.employerName : null) ??
      (roleProfile && "institutionName" in roleProfile
        ? roleProfile.institutionName
        : null),
  };
}

function reviewTypeLabel(type: string) {
  switch (type) {
    case "KYB":
      return "Business (KYB)";
    case "EMPLOYMENT":
      return "Employment";
    case "ADDRESS":
      return "Residential address";
    case "BANK":
      return "Bank account";
    default:
      return "Identity (KYC)";
  }
}

function getUserDisplayNameFromReview(user: ReviewUser) {
  const roleProfile = user.tenant ?? user.landlord ?? user.lender ?? user.agentProfile;
  const entityType = user.tenant?.entityType ?? user.landlord?.entityType ?? "INDIVIDUAL";
  const companyName = user.tenant?.companyName ?? user.landlord?.companyName ?? null;

  return (
    getProfileDisplayName({
      entityType,
      fullName: roleProfile?.fullName ?? null,
      companyName,
    }) ?? user.email
  );
}

function groupReviewsByUser(reviews: ReviewItem[]): UserReviewGroup[] {
  const groups = new Map<string, UserReviewGroup>();

  for (const review of reviews) {
    const user = review.user;
    if (!user) continue;

    const existing = groups.get(review.userId);
    if (existing) {
      existing.reviews.push(review);
      if (review.status === "PENDING") existing.pendingCount += 1;
      continue;
    }

    groups.set(review.userId, {
      userId: review.userId,
      user,
      displayName: getUserDisplayNameFromReview(user),
      reviews: [review],
      pendingCount: review.status === "PENDING" ? 1 : 0,
    });
  }

  return Array.from(groups.values()).sort((a, b) =>
    a.displayName.localeCompare(b.displayName)
  );
}

function DocumentPreview({ doc }: { doc: KycDocument }) {
  const label = KYC_DOCUMENT_LABELS[doc.documentType] ?? doc.documentType;
  return (
    <SecureDocumentPreview
      documentId={doc.id}
      fileName={doc.fileName}
      label={label}
      scope="kyc"
    />
  );
}

function ReviewDetail({
  review,
  onValidateBank,
  onApprove,
  onReject,
  isApproving,
  isRejecting,
  isValidating,
}: {
  review: ReviewItem;
  onValidateBank: (bankAccountId: string) => void;
  onApprove: (verificationId: string) => void;
  onReject: (verificationId: string) => void;
  isApproving: boolean;
  isRejecting: boolean;
  isValidating: boolean;
}) {
  const employment = getReviewEmploymentContext(review);

  return (
    <div className="space-y-4 rounded-none border border-border bg-card p-4 text-card-foreground">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium">{reviewTypeLabel(review.type)}</p>
          {employment.employmentStatus ? (
            <p className="text-sm text-muted-foreground">
              Employment: {getEmploymentStatusLabel(employment.employmentStatus)}
              {employment.occupation ? ` · ${employment.occupation}` : ""}
              {employment.employerName ? ` · ${employment.employerName}` : ""}
            </p>
          ) : null}
        </div>
        <StatusBadge status={review.status} />
      </div>

      {review.type === "EMPLOYMENT" ? (
        <div className="text-sm">
          {review.data?.employerName ? (
            <p className="font-medium">{review.data.employerName}</p>
          ) : null}
          {review.data?.occupation ? (
            <p className="text-muted-foreground">Occupation: {review.data.occupation}</p>
          ) : null}
          {review.data?.staffId ? (
            <p className="text-muted-foreground">Staff ID: {review.data.staffId}</p>
          ) : null}
        </div>
      ) : null}

      {review.type === "ADDRESS" ? (
        <div className="text-sm">
          <p className="font-medium">{review.data?.address}</p>
          {review.data?.billType ? (
            <p className="text-muted-foreground">
              Bill type: {UTILITY_BILL_LABELS[review.data.billType] ?? review.data.billType}
            </p>
          ) : null}
        </div>
      ) : null}

      {review.data?.entityType === "COMPANY" || review.type === "KYB" ? (
        <div className="text-sm">
          <p className="font-medium">{review.data?.companyName}</p>
          <p className="text-muted-foreground">
            Reg. {review.data?.companyRegistrationNumber}
            {review.data?.companyTin ? ` · TIN ${review.data.companyTin}` : ""}
          </p>
          <p className="text-muted-foreground">{review.data?.companyRegisteredAddress}</p>
          <p className="text-muted-foreground">Contact: {review.data?.fullName}</p>
        </div>
      ) : review.data?.fullName ? (
        <p className="text-sm">
          {review.data.fullName}
          {review.data.documentType ? ` · ${review.data.documentType.replace(/_/g, " ")}` : ""}
          {review.data.idNumber || review.data.ghanaCardNumber
            ? ` · ${review.data.idNumber ?? review.data.ghanaCardNumber}`
            : ""}
        </p>
      ) : null}

      {review.failureReason ? (
        <p className="text-sm text-amber-700 dark:text-amber-300">{review.failureReason}</p>
      ) : null}

      {review.documents?.length ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {review.documents.map((doc) => (
            <DocumentPreview key={doc.id} doc={doc} />
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {review.type === "BANK" &&
          review.data?.bankAccountId &&
          review.status === "PENDING" && (
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={isValidating}
              onClick={() => onValidateBank(review.data!.bankAccountId!)}
            >
              Validate bank account
            </Button>
          )}
        {(review.type === "IDENTITY" ||
          review.type === "KYB" ||
          review.type === "EMPLOYMENT" ||
          review.type === "ADDRESS") &&
          review.status === "PENDING" && (
            <>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700"
                disabled={isApproving}
                onClick={() => onApprove(review.id)}
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={isRejecting}
                onClick={() => onReject(review.id)}
              >
                Reject
              </Button>
            </>
          )}
      </div>
    </div>
  );
}

export default function AdminKycPage() {
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const { data: reviews, isLoading } = useQuery({
    queryKey: ["admin-kyc"],
    queryFn: async () => {
      const res = await fetch("/api/admin/reviews?type=kyc");
      const json = await res.json();
      return (json.data ?? []) as ReviewItem[];
    },
  });

  const groupedReviews = useMemo(
    () => groupReviewsByUser((reviews ?? []).filter((review) => review.type !== "BANK")),
    [reviews]
  );

  const selectedGroup = useMemo(
    () => groupedReviews.find((group) => group.userId === selectedUserId) ?? null,
    [groupedReviews, selectedUserId]
  );

  useEffect(() => {
    if (selectedUserId && !selectedGroup) {
      setSelectedUserId(null);
    }
  }, [selectedUserId, selectedGroup]);

  const validateMutation = useMutation({
    mutationFn: async (bankAccountId: string) => {
      const res = await fetch("/api/admin/reviews", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bankAccountId }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
    },
    onSuccess: () => {
      toast.success("Bank account validated");
      queryClient.invalidateQueries({ queryKey: ["admin-kyc"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const approveIdentityMutation = useMutation({
    mutationFn: async (verificationId: string) => {
      const res = await fetch("/api/admin/reviews", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verificationId }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
    },
    onSuccess: () => {
      toast.success("Verification approved");
      queryClient.invalidateQueries({ queryKey: ["admin-kyc"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rejectIdentityMutation = useMutation({
    mutationFn: async (verificationId: string) => {
      const reason =
        window.prompt("Enter a rejection reason for the user:")?.trim() ||
        "Documents could not be verified.";
      const res = await fetch("/api/admin/reviews", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verificationId, rejectReason: reason }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
    },
    onSuccess: () => {
      toast.success("Verification rejected");
      queryClient.invalidateQueries({ queryKey: ["admin-kyc"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">KYC / KYB review queue</h1>
        <p className="text-muted-foreground">
          Pending verifications are grouped by user. Select a row to open the review
          panel and approve or reject each verification type.
        </p>
      </div>
      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : !groupedReviews.length ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No pending KYC or KYB submissions.
          </CardContent>
        </Card>
      ) : (
        <Card className="gap-0 rounded-none py-0 shadow-xs">
          <CardContent className="divide-y p-0">
            {groupedReviews.map((group) => (
              <button
                key={group.userId}
                type="button"
                onClick={() => setSelectedUserId(group.userId)}
                className="flex w-full items-center gap-4 px-4 py-4 text-left transition-colors hover:bg-muted/40"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="truncate font-medium">{group.displayName}</p>
                  <p className="text-sm text-muted-foreground">
                    {group.user.email}
                    {group.user.phone ? ` · ${group.user.phone}` : ""}
                    {" · "}
                    {group.user.role}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {group.reviews.map((review) => reviewTypeLabel(review.type)).join(" · ")}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950/60 dark:text-amber-200">
                    {group.pendingCount} pending
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      <Sheet
        open={Boolean(selectedGroup)}
        onOpenChange={(open) => {
          if (!open) setSelectedUserId(null);
        }}
      >
        <SheetContent side="right" variant="wide" className="gap-0 border-border bg-background p-0 text-foreground">
          {selectedGroup ? (
            <>
              <SheetHeader className="border-b border-border bg-background px-6 py-5 pr-14">
                <SheetTitle>{selectedGroup.displayName}</SheetTitle>
                <SheetDescription className="space-y-1">
                  <span className="block">
                    {selectedGroup.user.email}
                    {selectedGroup.user.phone ? ` · ${selectedGroup.user.phone}` : ""}
                  </span>
                  <span className="block">
                    {selectedGroup.user.role} · {selectedGroup.pendingCount} pending review
                    {selectedGroup.pendingCount === 1 ? "" : "s"}
                  </span>
                </SheetDescription>
              </SheetHeader>

              <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
                {selectedGroup.reviews.map((review) => (
                  <ReviewDetail
                    key={review.id}
                    review={review}
                    onValidateBank={(id) => validateMutation.mutate(id)}
                    onApprove={(id) => approveIdentityMutation.mutate(id)}
                    onReject={(id) => rejectIdentityMutation.mutate(id)}
                    isApproving={approveIdentityMutation.isPending}
                    isRejecting={rejectIdentityMutation.isPending}
                    isValidating={validateMutation.isPending}
                  />
                ))}
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
