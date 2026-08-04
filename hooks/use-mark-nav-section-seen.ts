"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import { markNavItemsSeen, extractNavItemIds } from "@/lib/nav/section-views";

export function useMarkNavSectionSeen(
  sectionKey: string,
  endpoint: string,
  statuses?: string[]
) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const userId = session?.user?.id;

  useEffect(() => {
    if (!userId) return;

    async function markSeen() {
      const res = await fetch(endpoint);
      const json = await res.json();
      const itemIds = extractNavItemIds(json.data, statuses);
      if (!itemIds.length) return;
      markNavItemsSeen(userId, sectionKey, itemIds);
      await queryClient.invalidateQueries({ queryKey: ["sidebar-badge", sectionKey] });
      await queryClient.invalidateQueries({ queryKey: ["sidebar-badge"] });
    }

    void markSeen();
  }, [endpoint, queryClient, sectionKey, statuses, userId]);
}
