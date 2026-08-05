"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/dashboard/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { AuditLogPanel } from "@/components/admin/audit-log-panel";

export default function AdminWithdrawalsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("PENDING");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-withdrawals", statusFilter],
    queryFn: async () => {
      const params = statusFilter !== "ALL" ? `?status=${statusFilter}` : "";
      const res = await fetch(`/api/admin/withdrawals${params}`);
      const json = await res.json();
      return json.data as { requests: any[]; total: number };
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async ({ id, note }: { id: string; note?: string }) => {
      const res = await fetch("/api/admin/withdrawals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ withdrawalId: id, status: "REJECTED", note }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-withdrawals"] });
      toast.success("Withdrawal updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const requests = data?.requests ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Withdrawal queue</h1>
        <p className="text-sm text-muted-foreground">{data?.total ?? 0} requests</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {["PENDING", "OTP_VERIFIED", "PROCESSING", "COMPLETED", "REJECTED", "ALL"].map((s) => (
          <Button key={s} size="sm" variant={statusFilter === s ? "default" : "outline"} className="rounded-none" onClick={() => setStatusFilter(s)}>
            {s === "ALL" ? "All" : s.replace(/_/g, " ")}
          </Button>
        ))}
      </div>
      <Card className="rounded-none">
        <CardHeader><CardTitle>Requests</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : !requests.length ? (
            <p className="text-muted-foreground">No withdrawal requests.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((w: any) => (
                  <TableRow key={w.id}>
                    <TableCell>{w.user?.email ?? "—"}<br /><span className="text-xs text-muted-foreground">{w.user?.role}</span></TableCell>
                    <TableCell>GHS {Number(w.amount).toLocaleString()}</TableCell>
                    <TableCell>{w.bankAccount?.bankName} · {w.bankAccount?.accountNumberMasked ?? w.bankAccount?.accountNumber}</TableCell>
                    <TableCell><StatusBadge status={w.status} /></TableCell>
                    <TableCell>{new Date(w.createdAt).toLocaleString()}</TableCell>
                    <TableCell>
                      {["PENDING", "OTP_VERIFIED", "PROCESSING"].includes(w.status) && (
                        <Button size="sm" variant="outline" className="rounded-none text-red-600" onClick={() => cancelMutation.mutate({ id: w.id, note: "Rejected by admin" })}>
                          Reject
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AuditLogPanel title="Withdrawal audit log" actionFilter="WITHDRAW" limit={15} />
    </div>
  );
}
