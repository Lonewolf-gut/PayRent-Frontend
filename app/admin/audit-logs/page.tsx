"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDateTime } from "@/lib/utils/format-datetime";
import { ScrollableTable } from "@/components/ui/scrollable-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";

type AuditLogRow = {
  id: string;
  action: string;
  entity?: string | null;
  entityId?: string | null;
  userId?: string | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  createdAt: string;
  user?: { email: string; role: string } | null;
};

export default function AdminAuditLogsPage() {
  const [actionFilter, setActionFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-audit-logs", actionFilter, entityFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "100" });
      if (actionFilter.trim()) params.set("action", actionFilter.trim());
      if (entityFilter.trim()) params.set("entity", entityFilter.trim());
      const res = await fetch(`/api/admin/audit-logs?${params}`);
      const json = await res.json();
      return json.data as { logs: AuditLogRow[]; total: number };
    },
    refetchInterval: 30_000,
  });

  const logs = data?.logs ?? [];
  const total = data?.total ?? logs.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Audit logs</h1>
        <p className="text-sm text-muted-foreground">
          Platform audit trail for sign-ins, payments, approvals, and file access.
          {!isLoading ? ` ${total} event${total === 1 ? "" : "s"} on file.` : ""}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="action-filter">Filter by action</Label>
          <Input
            id="action-filter"
            className="rounded-none"
            placeholder="e.g. USER_SIGN_IN"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="entity-filter">Filter by entity</Label>
          <Input
            id="entity-filter"
            className="rounded-none"
            placeholder="e.g. WalletTransaction"
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
          />
        </div>
      </div>

      <Card className="rounded-none">
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          {isLoading ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground sm:px-0">Loading audit logs…</p>
          ) : !logs.length ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground sm:px-0">No audit logs found.</p>
          ) : (
            <ScrollableTable>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>When</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">{log.action}</TableCell>
                      <TableCell>
                        {log.entity ?? "—"}
                        {log.entityId ? (
                          <div className="font-mono text-xs text-muted-foreground">
                            {log.entityId.slice(0, 10)}…
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{log.user?.email ?? log.userId ?? "—"}</div>
                        {log.user?.role ? (
                          <div className="text-xs text-muted-foreground">{log.user.role}</div>
                        ) : null}
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                        {log.metadata ? JSON.stringify(log.metadata) : log.ipAddress ?? "—"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {formatDateTime(log.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollableTable>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
