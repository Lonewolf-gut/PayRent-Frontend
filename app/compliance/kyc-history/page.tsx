"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { SecureDocumentPreview } from "@/components/shared/secure-document-preview";
import { KYC_DOCUMENT_LABELS } from "@/lib/constants/financing-docs";
import {
  groupKycHistoryByUser,
  type KycHistoryItem,
} from "@/lib/utils/kyc-history-groups";

function reviewTypeLabel(type: string) {
  switch (type) {
    case "KYB":
      return "Business (KYB)";
    case "EMPLOYMENT":
      return "Employment";
    case "ADDRESS":
      return "Residential address";
    default:
      return "Identity (KYC)";
  }
}

export default function ComplianceKycHistoryPage() {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const { data: history = [], isLoading } = useQuery({
    queryKey: ["compliance-kyc-history"],
    queryFn: async () => {
      const res = await fetch("/api/compliance/kyc/history");
      const json = await res.json();
      return (json.data ?? []) as KycHistoryItem[];
    },
  });

  const grouped = groupKycHistoryByUser(history);
  const selectedGroup = grouped.find((group) => group.userId === selectedUserId) ?? null;
  const selectedItem =
    selectedGroup?.items.find((item) => item.id === selectedItemId) ??
    selectedGroup?.items[0] ??
    null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">KYC approval history</h1>
        <p className="text-muted-foreground">
          Review previously approved verifications grouped by user.
        </p>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading history...</p>
      ) : !grouped.length ? (
        <p className="text-muted-foreground">No approved KYC records yet.</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <ul className="divide-y divide-border rounded-none border border-border bg-card">
            {grouped.map((group) => (
              <li key={group.userId}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedUserId(group.userId);
                    setSelectedItemId(group.items[0]?.id ?? null);
                  }}
                  className="flex w-full items-start justify-between gap-3 px-4 py-4 text-left hover:bg-muted/40"
                >
                  <div>
                    <p className="font-medium">{group.displayName}</p>
                    <p className="text-sm text-muted-foreground">
                      {group.role} · {group.types.map(reviewTypeLabel).join(", ")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {group.items.length} approval{group.items.length === 1 ? "" : "s"}
                      {group.latestApprovedAt
                        ? ` · Latest ${new Date(group.latestApprovedAt).toLocaleString()}`
                        : ""}
                    </p>
                  </div>
                  <StatusBadge status="APPROVED" label="Approved" />
                </button>
              </li>
            ))}
          </ul>

          <div className="rounded-none border border-border bg-card p-4">
            {!selectedGroup ? (
              <p className="text-sm text-muted-foreground">
                Select a user to view approval details and documents.
              </p>
            ) : (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold">{selectedGroup.displayName}</h2>
                  <p className="text-sm text-muted-foreground">{selectedGroup.email}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {selectedGroup.items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedItemId(item.id)}
                      className={`rounded-none border px-3 py-1.5 text-sm ${
                        selectedItem?.id === item.id
                          ? "border-emerald-600 bg-emerald-600/10 text-foreground"
                          : "border-border text-muted-foreground hover:bg-muted/40"
                      }`}
                    >
                      {reviewTypeLabel(item.type)}
                    </button>
                  ))}
                </div>

                {selectedItem ? (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Provider: {selectedItem.providerName ?? "manual"}
                      {selectedItem.verifiedAt
                        ? ` · Approved ${new Date(selectedItem.verifiedAt).toLocaleString()}`
                        : ""}
                    </p>
                    {selectedItem.data ? (
                      <dl className="grid gap-2 text-sm">
                        {Object.entries(selectedItem.data)
                          .filter(([key]) =>
                            [
                              "fullName",
                              "address",
                              "employerName",
                              "ghanaCardNumber",
                            ].includes(key)
                          )
                          .map(([key, value]) => (
                            <div key={key} className="flex justify-between gap-3">
                              <dt className="text-muted-foreground">{key}</dt>
                              <dd className="text-right">{String(value)}</dd>
                            </div>
                          ))}
                      </dl>
                    ) : null}
                    <div className="space-y-3">
                      <h3 className="text-sm font-medium">Documents</h3>
                      {selectedItem.documents?.length ? (
                        selectedItem.documents.map((doc) => (
                          <div key={doc.id} className="rounded-none border border-border p-3">
                            <p className="text-sm font-medium">
                              {KYC_DOCUMENT_LABELS[
                                doc.documentType as keyof typeof KYC_DOCUMENT_LABELS
                              ] ?? doc.documentType}
                            </p>
                            <p className="text-xs text-muted-foreground">{doc.fileName}</p>
                            <SecureDocumentPreview
                              scope="kyc"
                              documentId={doc.id}
                              fileName={doc.fileName}
                              label={
                                KYC_DOCUMENT_LABELS[
                                  doc.documentType as keyof typeof KYC_DOCUMENT_LABELS
                                ] ?? doc.documentType
                              }
                            />
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No documents attached.</p>
                      )}
                    </div>
                  </>
                ) : null}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
