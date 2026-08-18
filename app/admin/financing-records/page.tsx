"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { FINANCING_DOC_LABELS } from "@/lib/constants/financing-docs";
import type { TenantFinancingDocType } from "@prisma/client";
import { FinancingDocumentPreview } from "@/components/admin/financing-document-preview";

type ApprovedRecord = {
  id: string;
  documentType: TenantFinancingDocType;
  fileName: string;
  reviewedAt?: string | null;
  financingRequest: {
    id: string;
    createdAt: string;
    property: { name: string; location: string };
  };
};

type TenantRecordGroup = {
  tenantId: string;
  fullName: string;
  email: string;
  phone?: string | null;
  records: ApprovedRecord[];
};

export default function AdminFinancingRecordsPage() {
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ["admin-financing-records"],
    queryFn: async () => {
      const res = await fetch("/api/admin/financing-records");
      const json = await res.json();
      return (json.data ?? []) as TenantRecordGroup[];
    },
  });

  const selectedGroup = useMemo(
    () => groups.find((group) => group.tenantId === selectedTenantId) ?? null,
    [groups, selectedTenantId]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Financing records</h1>
        <p className="text-muted-foreground">
          Approved financing documents for each customer, grouped by individual and linked to the
          request they were submitted with.
        </p>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : !groups.length ? (
        <p className="text-muted-foreground">No approved financing records yet.</p>
      ) : (
        <Card className="rounded-none">
          <CardContent className="divide-y p-0">
            {groups.map((group) => (
              <button
                key={group.tenantId}
                type="button"
                onClick={() => setSelectedTenantId(group.tenantId)}
                className="flex w-full items-center gap-4 px-4 py-4 text-left transition-colors hover:bg-muted/40"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="truncate font-medium">{group.fullName}</p>
                  <p className="text-sm text-muted-foreground">
                    {group.email}
                    {group.phone ? ` · ${group.phone}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {group.records.length} approved document
                    {group.records.length === 1 ? "" : "s"}
                  </p>
                </div>
                <Badge variant="secondary">{group.records.length}</Badge>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      <Sheet
        open={Boolean(selectedGroup)}
        onOpenChange={(open) => {
          if (!open) setSelectedTenantId(null);
        }}
      >
        <SheetContent side="right" variant="wide" className="gap-0 p-0">
          {selectedGroup ? (
            <>
              <SheetHeader className="border-b border-border px-6 py-5 pr-14">
                <SheetTitle>{selectedGroup.fullName}</SheetTitle>
                <SheetDescription>
                  {selectedGroup.email}
                  {selectedGroup.phone ? ` · ${selectedGroup.phone}` : ""}
                </SheetDescription>
              </SheetHeader>

              <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
                {selectedGroup.records.map((record) => (
                  <div
                    key={record.id}
                    className="space-y-3 rounded-none border border-border bg-muted/20 p-4"
                  >
                    <div>
                      <p className="font-medium">{FINANCING_DOC_LABELS[record.documentType]}</p>
                      <p className="text-sm text-muted-foreground">
                        {record.financingRequest.property.name.replace(/^\[Demo\]\s*/i, "")} ·{" "}
                        {record.fileName}
                      </p>
                      {record.reviewedAt ? (
                        <p className="text-xs text-muted-foreground">
                          Approved {new Date(record.reviewedAt).toLocaleString()}
                        </p>
                      ) : null}
                    </div>
                    <FinancingDocumentPreview documentId={record.id} fileName={record.fileName} />
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
