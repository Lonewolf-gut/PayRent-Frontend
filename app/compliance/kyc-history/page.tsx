"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { SecureDocumentPreview } from "@/components/shared/secure-document-preview";
import { KYC_DOCUMENT_LABELS } from "@/lib/constants/financing-docs";
import { getProfileDisplayName } from "@/lib/utils/display-name";

type HistoryItem = {
  id: string;
  type: string;
  status: string;
  verifiedAt?: string | null;
  providerName?: string | null;
  user?: {
    email: string;
    role: string;
    tenant?: { fullName?: string | null; companyName?: string | null } | null;
    landlord?: { fullName?: string | null; companyName?: string | null } | null;
    lender?: { fullName?: string | null; institutionName?: string | null } | null;
    agentProfile?: { fullName?: string | null } | null;
  };
  documents?: Array<{ id: string; documentType: string; fileName: string }>;
  data?: Record<string, unknown>;
};

export default function ComplianceKycHistoryPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: history = [], isLoading } = useQuery({
    queryKey: ["compliance-kyc-history"],
    queryFn: async () => {
      const res = await fetch("/api/compliance/kyc/history");
      const json = await res.json();
      return (json.data ?? []) as HistoryItem[];
    },
  });

  const selected = history.find((item) => item.id === selectedId) ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">KYC approval history</h1>
        <p className="text-muted-foreground">
          Review previously approved verifications and open archived documents.
        </p>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading history...</p>
      ) : !history.length ? (
        <p className="text-muted-foreground">No approved KYC records yet.</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <ul className="divide-y divide-border rounded-none border border-border bg-card">
            {history.map((item) => {
              const profile =
                item.user?.tenant ??
                item.user?.landlord ??
                item.user?.lender ??
                item.user?.agentProfile;
              const displayName = getProfileDisplayName({
                entityType: "INDIVIDUAL",
                fullName: profile?.fullName ?? null,
                companyName:
                  "companyName" in (profile ?? {})
                    ? ((profile as { companyName?: string }).companyName ?? null)
                    : (profile as { institutionName?: string })?.institutionName ?? null,
              });

              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    className="flex w-full items-start justify-between gap-3 px-4 py-4 text-left hover:bg-muted/40"
                  >
                    <div>
                      <p className="font-medium">{displayName || item.user?.email}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.type} · {item.user?.role}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Approved{" "}
                        {item.verifiedAt
                          ? new Date(item.verifiedAt).toLocaleString()
                          : "—"}
                      </p>
                    </div>
                    <StatusBadge status="APPROVED" label="Approved" />
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="rounded-none border border-border bg-card p-4">
            {!selected ? (
              <p className="text-sm text-muted-foreground">
                Select an approved record to view documents and details.
              </p>
            ) : (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold">Approval details</h2>
                  <p className="text-sm text-muted-foreground">
                    Provider: {selected.providerName ?? "manual"}
                  </p>
                </div>
                {selected.data ? (
                  <dl className="grid gap-2 text-sm">
                    {Object.entries(selected.data)
                      .filter(([key]) =>
                        ["fullName", "address", "employerName", "bankName", "ghanaCardNumber"].includes(
                          key
                        )
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
                  {selected.documents?.length ? (
                    selected.documents.map((doc) => (
                      <div key={doc.id} className="rounded-none border border-border p-3">
                        <p className="text-sm font-medium">
                          {KYC_DOCUMENT_LABELS[doc.documentType as keyof typeof KYC_DOCUMENT_LABELS] ??
                            doc.documentType}
                        </p>
                        <p className="text-xs text-muted-foreground">{doc.fileName}</p>
                        <SecureDocumentPreview
                          scope="kyc"
                          documentId={doc.id}
                          fileName={doc.fileName}
                          label={
                            KYC_DOCUMENT_LABELS[doc.documentType as keyof typeof KYC_DOCUMENT_LABELS] ??
                            doc.documentType
                          }
                        />
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No documents attached.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
