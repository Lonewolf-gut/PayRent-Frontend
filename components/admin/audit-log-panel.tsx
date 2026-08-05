"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils/format-datetime";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type AuditLogPanelProps = {
  title?: string;
  actionFilter?: string;
  entityFilter?: string;
  apiPath?: string;
  limit?: number;
};

export function AuditLogPanel({
  title = "Audit log",
  actionFilter,
  entityFilter,
  apiPath = "/api/admin/audit-logs",
  limit = 20,
}: AuditLogPanelProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs", apiPath, actionFilter, entityFilter, limit],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: String(limit) });
      if (actionFilter?.trim()) params.set("action", actionFilter.trim());
      if (entityFilter?.trim()) params.set("entity", entityFilter.trim());
      const res = await fetch(`${apiPath}?${params}`);
      const json = await res.json();
      return json.data as {
        logs: Array<{
          id: string;
          action: string;
          entity?: string | null;
          createdAt: string;
          user?: { email?: string };
        }>;
      };
    },
  });

  const logs = data?.logs ?? [];

  return (
    <Card className="rounded-none">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading audit log…</p>
        ) : !logs.length ? (
          <p className="text-sm text-muted-foreground">No audit events yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>User</TableHead>
                <TableHead>When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-medium">{log.action}</TableCell>
                  <TableCell>{log.entity ?? "—"}</TableCell>
                  <TableCell>{log.user?.email ?? "—"}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {formatDateTime(log.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
