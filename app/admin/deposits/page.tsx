"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils/format-datetime";
import { AuditLogPanel } from "@/components/admin/audit-log-panel";
import {
  downloadTransactionCsv,
  downloadTransactionPdf,
  transactionExportFilename,
  transactionsToCsv,
} from "@/lib/utils/transaction-export";

export default function AdminDepositsPage() {
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-deposits", page],
    queryFn: async () => {
      const res = await fetch(`/api/admin/transactions?page=${page}`);
      const json = await res.json();
      return json.data;
    },
  });

  const deposits =
    data?.transactions?.filter((tx: { type: string }) => tx.type === "DEPOSIT") ?? [];
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / (data?.limit ?? 30)));

  async function handleExport(format: "csv" | "pdf") {
    setExporting(true);
    try {
      const res = await fetch("/api/admin/transactions?page=1&limit=500");
      const json = await res.json();
      const rows = (json.data?.transactions ?? []).filter(
        (tx: { type: string }) => tx.type === "DEPOSIT"
      );
      if (!rows.length) return;
      if (format === "csv") {
        downloadTransactionCsv(
          transactionsToCsv(rows),
          transactionExportFilename("deposits", "csv")
        );
      } else {
        await downloadTransactionPdf(rows, transactionExportFilename("deposits", "pdf"));
      }
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Deposits</h1>
          <p className="text-sm text-muted-foreground">Wallet deposit activity across the platform.</p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="rounded-none"
            disabled={exporting}
            onClick={() => handleExport("csv")}
          >
            Download CSV
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="rounded-none"
            disabled={exporting}
            onClick={() => handleExport("pdf")}
          >
            Download PDF
          </Button>
        </div>
      </div>

      <Card className="rounded-none">
        <CardHeader>
          <CardTitle>Recent deposits</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : !deposits.length ? (
            <p className="text-sm text-muted-foreground">No deposits on this page.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deposits.map((tx: {
                  id: string;
                  reference: string;
                  amount: number;
                  status: string;
                  createdAt: string;
                  wallet?: { user?: { email?: string } };
                }) => (
                  <TableRow key={tx.id}>
                    <TableCell className="font-mono text-xs">{tx.reference}</TableCell>
                    <TableCell>{tx.wallet?.user?.email ?? "Platform"}</TableCell>
                    <TableCell>GHS {Number(tx.amount).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="rounded-none">
                        {tx.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {formatDateTime(tx.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <div className="mt-4 flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="rounded-none"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <span className="self-center text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              className="rounded-none"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </CardContent>
      </Card>

      <AuditLogPanel title="Deposit audit log" actionFilter="DEPOSIT" limit={15} />
    </div>
  );
}
