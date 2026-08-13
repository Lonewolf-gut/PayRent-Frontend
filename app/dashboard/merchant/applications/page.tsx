"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { APPLICATION_STATUS_LABELS } from "@/constants/platform";
import { SecureFileLink } from "@/components/shared/secure-file-link";

export default function LandlordApplicationsPage() {
  const queryClient = useQueryClient();

  const { data: applications, isLoading } = useQuery({
    queryKey: ["applications"],
    queryFn: async () => {
      const res = await fetch("/api/applications");
      const json = await res.json();
      return json.data ?? [];
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, decision }: { id: string; decision: "APPROVE" | "REJECT" | "CLARIFICATION" }) => {
      const res = await fetch(`/api/applications/${id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
    },
    onSuccess: () => {
      toast.success("Application updated");
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Buyer applications</h1>
        <p className="text-muted-foreground">
          Review applications, request clarification, and approve buyer decisions.
        </p>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : !applications?.length ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No applications yet.</CardContent></Card>
      ) : (
        applications.map((app: {
          id: string;
          status: string;
          notes?: string;
          property?: { name: string };
          tenant?: { fullName: string; user?: { email: string } };
          documents?: { id: string; fileName: string; fileUrl: string }[];
        }) => (
          <Card key={app.id}>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="text-base">{app.property?.name}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {app.tenant?.fullName} · {app.tenant?.user?.email}
                </p>
              </div>
              <StatusBadge status={app.status} label={APPLICATION_STATUS_LABELS[app.status]} />
            </CardHeader>
            <CardContent className="space-y-4">
              {app.notes && <p className="text-sm text-muted-foreground">{app.notes}</p>}
              {app.documents && app.documents.length > 0 && (
                <div className="space-y-1">
                  <p className="text-sm font-medium">Supporting documents</p>
                  <ul className="space-y-1">
                    {app.documents.map((doc) => (
                      <li key={doc.id}>
                        <SecureFileLink
                          request={{ scope: "application", documentId: doc.id }}
                          className="text-sm text-emerald-700 hover:underline"
                        >
                          {doc.fileName}
                        </SecureFileLink>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {["SUBMITTED", "UNDER_REVIEW", "CLARIFICATION_REQUIRED"].includes(app.status) && (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => reviewMutation.mutate({ id: app.id, decision: "APPROVE" })}>Approve</Button>
                  <Button size="sm" variant="outline" onClick={() => reviewMutation.mutate({ id: app.id, decision: "CLARIFICATION" })}>Request clarification</Button>
                  <Button size="sm" variant="destructive" onClick={() => reviewMutation.mutate({ id: app.id, decision: "REJECT" })}>Reject</Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
