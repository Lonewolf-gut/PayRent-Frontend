"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { toast } from "sonner";

type PropertyRow = {
  id: string;
  name: string;
  status: string;
  agentUserId: string | null;
  assignedAgent?: {
    id: string;
    fullName: string;
    agencyName?: string | null;
    user: { email: string; phone?: string | null };
  } | null;
};

type AgentOption = {
  id: string;
  fullName: string;
  agencyName?: string | null;
  region?: string | null;
  user: { email: string; phone?: string | null };
};

export default function LandlordAgentsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["landlord-agents"],
    queryFn: async () => {
      const res = await fetch("/api/merchant/agents");
      const json = await res.json();
      if (!json.success) throw new Error(json.message ?? "Failed to load Affiliates");
      return json.data as {
        properties: PropertyRow[];
        availableAgents: AgentOption[];
      };
    },
  });

  const assignMutation = useMutation({
    mutationFn: async ({
      propertyId,
      agentProfileId,
    }: {
      propertyId: string;
      agentProfileId: string | null;
    }) => {
      const res = await fetch("/api/merchant/agents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId, agentProfileId }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message ?? "Assignment failed");
    },
    onSuccess: () => {
      toast.success("Affiliate assignment updated");
      queryClient.invalidateQueries({ queryKey: ["landlord-agents"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const properties = data?.properties ?? [];
  const agents = data?.availableAgents ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Manage Affiliates</h1>
        <p className="text-muted-foreground">
          Assign registered Affiliates to your property listings.
        </p>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : !properties.length ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No listings yet. Create a property first.
          </CardContent>
        </Card>
      ) : (
        properties.map((property) => {
          const affiliateLocked =
            property.status === "ACTIVE" && Boolean(property.agentUserId);

          return (
          <Card key={property.id}>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="text-base">{property.name}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {property.assignedAgent
                    ? `Assigned: ${property.assignedAgent.fullName} (${property.assignedAgent.user.email})`
                    : "No Affiliate assigned"}
                </p>
                {affiliateLocked ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Affiliate is locked because this listing is approved.
                  </p>
                ) : null}
              </div>
              <StatusBadge status={property.status} />
            </CardHeader>
            <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <Select
                  value={property.agentUserId ?? "none"}
                  onValueChange={(value) =>
                    assignMutation.mutate({
                      propertyId: property.id,
                      agentProfileId: value === "none" ? null : value,
                    })
                  }
                  disabled={affiliateLocked || assignMutation.isPending || !agents.length}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Affiliate" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Affiliate</SelectItem>
                    {agents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.fullName}
                        {agent.agencyName ? ` · ${agent.agencyName}` : ""} · {agent.user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {property.agentUserId && !affiliateLocked ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={assignMutation.isPending}
                  onClick={() =>
                    assignMutation.mutate({
                      propertyId: property.id,
                      agentProfileId: null,
                    })
                  }
                >
                  Remove Affiliate
                </Button>
              ) : null}
            </CardContent>
          </Card>
          );
        })
      )}
    </div>
  );
}
