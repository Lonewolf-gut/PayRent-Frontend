"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type LenderTagPanelProps = {
  financingRequestId: string;
  status: string;
};

export function LenderTagPanel({ financingRequestId, status }: LenderTagPanelProps) {
  const queryClient = useQueryClient();
  const [selectedLenderIds, setSelectedLenderIds] = useState<string[]>([]);
  const [reason, setReason] = useState("");

  const canTag = [
    "MANDATE_PENDING",
    "READY_FOR_LENDER_REVIEW",
    "PENDING",
    "UNDER_REVIEW",
    "APPROVED",
  ].includes(status);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-financing-lender-tags", financingRequestId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/financing/${financingRequestId}/lender-tags`);
      const json = await res.json();
      if (!json.success) throw new Error(json.message ?? "Failed to load lender tags");
      return json.data as {
        tags: Array<{
          id: string;
          lenderId: string;
          reason: string | null;
          lender: { fullName: string; institutionName: string | null; user: { email: string } };
        }>;
        suggestions: Array<{
          lenderId: string;
          email: string;
          fullName: string;
          institutionName: string | null;
          priorDeals: number;
          reason: string;
        }>;
        allLenders: Array<{
          id: string;
          fullName: string;
          institutionName: string | null;
          user: { email: string };
        }>;
      };
    },
    enabled: canTag,
  });

  const tagMutation = useMutation({
    mutationFn: async (lenderIds: string[]) => {
      const res = await fetch(`/api/admin/financing/${financingRequestId}/lender-tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lenderIds, reason: reason || undefined, notify: true }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message ?? "Failed to tag lenders");
    },
    onSuccess: () => {
      toast.success("Lenders tagged and notified");
      setSelectedLenderIds([]);
      setReason("");
      queryClient.invalidateQueries({ queryKey: ["admin-financing-lender-tags", financingRequestId] });
      queryClient.invalidateQueries({ queryKey: ["admin-financing"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeMutation = useMutation({
    mutationFn: async (lenderId: string) => {
      const res = await fetch(`/api/admin/financing/${financingRequestId}/lender-tags`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lenderId }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message ?? "Failed to remove tag");
    },
    onSuccess: () => {
      toast.success("Lender tag removed");
      queryClient.invalidateQueries({ queryKey: ["admin-financing-lender-tags", financingRequestId] });
      queryClient.invalidateQueries({ queryKey: ["admin-financing"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!canTag) return null;

  const taggedIds = new Set(data?.tags.map((t) => t.lenderId) ?? []);

  const toggleLender = (lenderId: string) => {
    setSelectedLenderIds((prev) =>
      prev.includes(lenderId) ? prev.filter((id) => id !== lenderId) : [...prev, lenderId]
    );
  };

  return (
    <div className="space-y-4 border-t pt-4">
      <div>
        <p className="font-medium text-foreground">Lender tags</p>
        <p className="text-xs text-muted-foreground">
          All lenders see published requests. Tagged lenders receive priority alerts based on
          sponsorship history.
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading lender tags…</p>
      ) : (
        <>
          {data?.tags?.length ? (
            <div className="flex flex-wrap gap-2">
              {data.tags.map((tag) => (
                <Badge key={tag.id} variant="secondary" className="rounded-none gap-2">
                  {tag.lender.fullName} ({tag.lender.user.email})
                  <button
                    type="button"
                    className="text-xs underline"
                    onClick={() => removeMutation.mutate(tag.lenderId)}
                  >
                    remove
                  </button>
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No lenders tagged yet.</p>
          )}

          {data?.suggestions?.length ? (
            <div className="space-y-2">
              <Label>Suggested from sponsorship history</Label>
              <div className="space-y-2">
                {data.suggestions.map((s) => (
                  <label
                    key={s.lenderId}
                    className="flex cursor-pointer items-start gap-2 rounded-none border p-3"
                  >
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={selectedLenderIds.includes(s.lenderId)}
                      disabled={taggedIds.has(s.lenderId)}
                      onChange={() => toggleLender(s.lenderId)}
                    />
                    <div className="text-sm">
                      <p className="font-medium text-foreground">
                        {s.fullName}
                        {s.institutionName ? ` · ${s.institutionName}` : ""}
                      </p>
                      <p className="text-muted-foreground">{s.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.priorDeals} prior deal{s.priorDeals === 1 ? "" : "s"} · {s.reason}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          {data?.allLenders?.length ? (
            <div className="space-y-2">
              <Label>Tag other lenders</Label>
              <div className="max-h-40 space-y-1 overflow-y-auto rounded-none border p-2">
                {data.allLenders
                  .filter((l) => !taggedIds.has(l.id))
                  .map((l) => (
                    <label key={l.id} className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedLenderIds.includes(l.id)}
                        onChange={() => toggleLender(l.id)}
                      />
                      <span>
                        {l.fullName} ({l.user.email})
                      </span>
                    </label>
                  ))}
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label>Tag note (optional)</Label>
            <Input
              className="rounded-none"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Strong track record with this merchant"
            />
          </div>

          <Button
            size="sm"
            className="rounded-none"
            disabled={!selectedLenderIds.length || tagMutation.isPending}
            onClick={() => tagMutation.mutate(selectedLenderIds)}
          >
            Tag selected lenders
          </Button>
        </>
      )}
    </div>
  );
}
