"use client";

import { Fragment, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { cn } from "@/lib/utils";
import {
  downloadUsersCsv,
  downloadUsersPdf,
  exportFilename,
} from "@/lib/utils/user-export";
import type { AdminUserExportRow } from "@/lib/admin/users-query";
import { toast } from "sonner";
import { Download, FileSpreadsheet } from "lucide-react";
import type { UserRole } from "@prisma/client";
import { ROLE_LABELS } from "@/constants/platform";
import { formatDateTime } from "@/lib/utils/format-datetime";

type RoleFilter = "ALL" | UserRole;
const ROLE_FILTERS: { value: RoleFilter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "MERCHANT", label: "Merchants" },
  { value: "BUYER", label: "Buyers" },
  { value: "MARKETER", label: "Affiliates" },
  { value: "LENDER", label: "Lenders" },
  { value: "COMPLIANCE_OFFICER", label: "Compliance" },
];
const DELETE_COUNTDOWN = 20;

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [exporting, setExporting] = useState<"excel" | "pdf" | null>(null);

  function buildExportParams(format?: "csv" | "json") {
    const params = new URLSearchParams();
    if (roleFilter !== "ALL") params.set("role", roleFilter);
    if (search.trim()) params.set("search", search.trim());
    if (format) params.set("format", format);
    return params;
  }

  async function handleExportExcel() {
    setExporting("excel");
    try {
      const res = await fetch(`/api/admin/users/export?${buildExportParams("csv")}`);
      if (!res.ok) throw new Error("Export failed");
      const csv = await res.text();
      downloadUsersCsv(csv, exportFilename("payrent-users", "csv"));
      toast.success("User list downloaded");
    } catch {
      toast.error("Could not export users to Excel");
    } finally {
      setExporting(null);
    }
  }

  async function handleExportPdf() {
    setExporting("pdf");
    try {
      const res = await fetch(`/api/admin/users/export?${buildExportParams("json")}`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message ?? "Export failed");
      const users = json.data.users as AdminUserExportRow[];
      await downloadUsersPdf(users, exportFilename("payrent-users", "pdf"));
      toast.success("PDF downloaded");
    } catch {
      toast.error("Could not export users to PDF");
    } finally {
      setExporting(null);
    }
  }

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", roleFilter, search, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page) });
      if (roleFilter !== "ALL") params.set("role", roleFilter);
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(`/api/admin/users?${params}`);
      const json = await res.json();
      return json.data as { users: any[]; total: number; limit: number };
    },
  });

  const { data: detail } = useQuery({
    queryKey: ["admin-user-detail", detailId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/users/${detailId}`);
      const json = await res.json();
      return json.data;
    },
    enabled: !!detailId,
  });

  useEffect(() => {
    if (!pendingDeleteId || countdown <= 0) return;
    const t = window.setTimeout(() => setCountdown((c) => Math.max(c - 1, 0)), 1000);
    return () => window.clearTimeout(t);
  }, [pendingDeleteId, countdown]);

  const patchMutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-user-detail"] });
      toast.success("User updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setPendingDeleteId(null);
      setCountdown(0);
      toast.success("User deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const users = data?.users ?? [];
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / (data?.limit ?? 20)));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">User management</h1>
        <p className="text-sm text-muted-foreground">
          {data?.total ?? 0} users · View sign-in history and account details
        </p>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {ROLE_FILTERS.map((f) => (
            <Button
              key={f.value}
              size="sm"
              variant={roleFilter === f.value ? "default" : "outline"}
              className={cn("rounded-none", roleFilter === f.value && "bg-emerald-600 hover:bg-emerald-700")}
              onClick={() => { setRoleFilter(f.value); setPage(1); }}
            >
              {f.label}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="rounded-none"
            disabled={!!exporting}
            onClick={handleExportExcel}
          >
            <FileSpreadsheet className="mr-1.5 h-4 w-4" />
            {exporting === "excel" ? "Exporting…" : "Export Excel"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="rounded-none"
            disabled={!!exporting}
            onClick={handleExportPdf}
          >
            <Download className="mr-1.5 h-4 w-4" />
            {exporting === "pdf" ? "Exporting…" : "Export PDF"}
          </Button>
          <Input
            placeholder="Search email…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="max-w-xs rounded-none"
          />
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (
        <div className="overflow-x-auto border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user: any) => {
                const protectedRole = user.role === "ADMIN";
                const isPendingDelete = pendingDeleteId === user.id;
                return (
                  <Fragment key={user.id}>
                    <TableRow>
                      <TableCell>{user.email}</TableCell>
                      <TableCell><Badge className="rounded-none" variant="secondary">{user.role}</Badge></TableCell>
                      <TableCell>
                        {user.isActive ? "Active" : "Suspended"}
                        {user.lockedUntil && new Date(user.lockedUntil) > new Date() ? " · Locked" : ""}
                      </TableCell>
                      <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button size="sm" variant="outline" className="rounded-none" onClick={() => setDetailId(user.id)}>View</Button>
                          {!protectedRole && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-none"
                                onClick={() => patchMutation.mutate({ userId: user.id, isActive: !user.isActive })}
                              >
                                {user.isActive ? "Suspend" : "Activate"}
                              </Button>
                              {(user.lockedUntil || user.failedLoginCount >= 5) && (
                                <Button size="sm" variant="outline" className="rounded-none" onClick={() => patchMutation.mutate({ userId: user.id, unlock: true })}>
                                  Unlock
                                </Button>
                              )}
                              {!isPendingDelete && (
                                <Button size="sm" variant="outline" className="rounded-none text-red-600" onClick={() => { setPendingDeleteId(user.id); setCountdown(DELETE_COUNTDOWN); }}>
                                  Delete
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                    {isPendingDelete && (
                      <TableRow>
                        <TableCell colSpan={5} className="bg-red-50/60 py-4">
                          <p className="text-sm text-red-800">Delete {user.email}?</p>
                          {countdown > 0 ? (
                            <p className="text-sm text-red-700">Confirm in <span className="font-semibold tabular-nums">{countdown}s</span></p>
                          ) : (
                            <div className="mt-2 flex gap-2">
                              <Button size="sm" variant="destructive" className="rounded-none" onClick={() => deleteMutation.mutate(user.id)}>Confirm delete</Button>
                              <Button size="sm" variant="outline" className="rounded-none" onClick={() => { setPendingDeleteId(null); setCountdown(0); }}>Cancel</Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="flex gap-2">
        <Button size="sm" variant="outline" className="rounded-none" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
        <span className="self-center text-sm text-muted-foreground">Page {page} of {totalPages}</span>
        <Button size="sm" variant="outline" className="rounded-none" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
      </div>

      <Dialog open={!!detailId} onOpenChange={(open) => !open && setDetailId(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-none sm:max-w-2xl">
          <DialogHeader><DialogTitle>User detail</DialogTitle></DialogHeader>
          {detail ? (
            <div className="space-y-4 text-sm">
              <p><strong>Email:</strong> {detail.email}</p>
              <p><strong>Role:</strong> {ROLE_LABELS[detail.role as UserRole] ?? detail.role}</p>
              <p><strong>Phone:</strong> {detail.phone ?? "—"}</p>
              <p><strong>Status:</strong> {detail.isActive ? "Active" : "Suspended"}</p>
              <p><strong>Theme:</strong> {detail.dashboardTheme === "dark" ? "Dark" : "Light"}</p>
              <p><strong>Last sign-in:</strong> {formatDateTime(detail.lastLoginAt)}</p>
              <p><strong>Joined:</strong> {formatDateTime(detail.createdAt)}</p>
              <p><strong>2FA:</strong> {detail.twoFactorEnabled ? "Enabled" : "Off"}</p>
              {detail.verifications?.length ? (
                <div>
                  <p className="font-medium">Recent verifications</p>
                  <ul className="mt-1 space-y-1">
                    {detail.verifications.map((v: any) => (
                      <li key={v.id} className="flex gap-2"><StatusBadge status={v.status} /> {v.type}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {detail.properties?.length ? (
                <div>
                  <p className="font-medium">Listings</p>
                  <ul className="mt-1 space-y-1 text-muted-foreground">
                    {detail.properties.map((p: any) => (
                      <li key={p.id}>{p.name} · {p.status}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-muted-foreground">Loading…</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
