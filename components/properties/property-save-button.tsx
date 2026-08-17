"use client";

import { useSession } from "next-auth/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bookmark } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { clearSavedPropertyViewed, refreshSavedPropertyCountQuery } from "@/lib/nav/saved-property-views";
import { Button } from "@/components/ui/button";

type PropertySaveButtonProps = {
  propertyId: string;
  className?: string;
  variant?: "overlay" | "button";
};

export function PropertySaveButton({
  propertyId,
  className,
  variant = "overlay",
}: PropertySaveButtonProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: savedIds = [] } = useQuery({
    queryKey: ["saved-property-ids"],
    queryFn: async () => {
      const res = await fetch("/api/properties/saved");
      const json = await res.json();
      if (!json.success) return [];
      return (json.data ?? []).map(
        (item: { propertyId: string }) => item.propertyId
      ) as string[];
    },
    enabled: !!session?.user && session.user.role === "BUYER",
  });

  const isSaved = savedIds.includes(propertyId);

  const mutation = useMutation({
    mutationFn: async (saved: boolean) => {
      if (saved) {
        const res = await fetch(
          `/api/properties/saved?propertyId=${encodeURIComponent(propertyId)}`,
          { method: "DELETE" }
        );
        if (!res.ok) throw new Error("Failed to remove save");
        return;
      }

      const res = await fetch("/api/properties/saved", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId }),
      });
      if (!res.ok) throw new Error("Failed to save");
    },
    onSuccess: (_data, saved) => {
      if (saved) {
        clearSavedPropertyViewed(propertyId);
      }
      queryClient.invalidateQueries({ queryKey: ["saved-property-ids"] });
      void refreshSavedPropertyCountQuery(queryClient);
      queryClient.invalidateQueries({ queryKey: ["saved-properties"] });
      toast.success(
        saved ? "Removed from saved listings" : "Saved to your bookmarks"
      );
    },
    onError: () => toast.error("Could not update saved listing"),
  });

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!session?.user) {
      toast.info("Sign in to save listings", {
        action: {
          label: "Sign in",
          onClick: () => router.push("/login"),
        },
      });
      return;
    }

    mutation.mutate(isSaved);
  };

  if (variant === "overlay") {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={mutation.isPending}
        aria-label={isSaved ? "Remove bookmark" : "Save listing"}
        className={cn(
          "absolute right-2 top-2 z-10 flex size-8 items-center justify-center rounded-full bg-white/90 shadow-sm transition hover:bg-white disabled:opacity-60",
          isSaved && "text-emerald-600",
          className
        )}
      >
        <Bookmark className={cn("size-4", isSaved && "fill-current")} />
      </button>
    );
  }

  return (
    <Button
      variant="outline"
      className={cn("w-full", className)}
      onClick={handleClick}
      disabled={mutation.isPending}
    >
      <Bookmark
        className={cn("mr-2 size-4", isSaved && "fill-current text-emerald-600")}
      />
      {isSaved ? "Saved" : "Save listing"}
    </Button>
  );
}
