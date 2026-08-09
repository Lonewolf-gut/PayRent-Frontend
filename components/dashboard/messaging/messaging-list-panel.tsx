"use client";

import { useMemo, useState } from "react";
import { Check, Search, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { conversationTitle } from "@/lib/messaging/display";
import type { ConversationSummary } from "@/lib/messaging/types";
import { cn } from "@/lib/utils";
import { ConversationList } from "./messaging-shared";

const TABS = ["Focused", "Other"] as const;
type MessagingTab = (typeof TABS)[number];
type ReadFilter = "all" | "unread" | "read";
type SortOrder = "newest" | "oldest";

export function MessagingListPanel({
  conversations,
  activeId,
  currentUserId,
  onSelect,
  compact = false,
  className,
}: {
  conversations: ConversationSummary[];
  activeId: string | null;
  currentUserId: string;
  onSelect: (id: string) => void;
  compact?: boolean;
  className?: string;
}) {
  const [tab, setTab] = useState<MessagingTab>("Focused");
  const [search, setSearch] = useState("");
  const [readFilter, setReadFilter] = useState<ReadFilter>("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");

  const filtered = useMemo(() => {
    let list = conversations;
    if (tab === "Focused") {
      const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;
      list = list.filter(
        (conv) =>
          conv.unreadCount > 0 || new Date(conv.updatedAt).getTime() >= cutoff
      );
    } else {
      const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;
      list = list.filter(
        (conv) =>
          conv.unreadCount === 0 && new Date(conv.updatedAt).getTime() < cutoff
      );
    }

    if (readFilter === "unread") {
      list = list.filter((conv) => conv.unreadCount > 0);
    } else if (readFilter === "read") {
      list = list.filter((conv) => conv.unreadCount === 0);
    }

    if (search.trim()) {
      const query = search.trim().toLowerCase();
      list = list.filter((conv) => {
        const title = conversationTitle(conv.participants, currentUserId).toLowerCase();
        const preview = conv.lastMessage?.content.toLowerCase() ?? "";
        return title.includes(query) || preview.includes(query);
      });
    }

    return [...list].sort((a, b) => {
      const aTime = new Date(a.updatedAt).getTime();
      const bTime = new Date(b.updatedAt).getTime();
      return sortOrder === "newest" ? bTime - aTime : aTime - bTime;
    });
  }, [conversations, currentUserId, readFilter, search, sortOrder, tab]);

  const filtersActive = readFilter !== "all" || sortOrder !== "newest";

  return (
    <div className={cn("flex h-full min-h-0 flex-col bg-card", className)}>
      <div className={cn("shrink-0 border-b", compact ? "px-2.5 py-2 sm:px-3 sm:py-3" : "px-3 py-3 sm:px-4 sm:py-4")}>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground sm:left-3 sm:h-4 sm:w-4" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search messages"
            className={cn(
              "rounded-full border-muted bg-muted/50 pl-8 pr-9 text-xs sm:pl-9 sm:pr-10 sm:text-sm",
              compact ? "h-8 sm:h-9" : "h-9 sm:h-10"
            )}
          />
          <DropdownMenu>
            <DropdownMenuTrigger
              type="button"
              className={cn(
                "absolute right-1 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-md hover:bg-muted",
                filtersActive ? "text-emerald-600" : "text-muted-foreground"
              )}
              aria-label="Filter messages"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>Read status</DropdownMenuLabel>
              {(
                [
                  ["all", "All messages"],
                  ["unread", "Unread only"],
                  ["read", "Read only"],
                ] as const
              ).map(([value, label]) => (
                <DropdownMenuItem key={value} onClick={() => setReadFilter(value)}>
                  <span className="flex-1">{label}</span>
                  {readFilter === value ? <Check className="h-4 w-4" /> : null}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Sort by</DropdownMenuLabel>
              {(
                [
                  ["newest", "Newest first"],
                  ["oldest", "Oldest first"],
                ] as const
              ).map(([value, label]) => (
                <DropdownMenuItem key={value} onClick={() => setSortOrder(value)}>
                  <span className="flex-1">{label}</span>
                  {sortOrder === value ? <Check className="h-4 w-4" /> : null}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-2 flex gap-4 border-b sm:mt-3 sm:gap-6">
          {TABS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTab(item)}
              className={cn(
                "pb-1.5 text-xs font-semibold transition-colors sm:pb-2 sm:text-sm",
                tab === item
                  ? "border-b-2 border-emerald-700 text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <ConversationList
          conversations={filtered}
          activeId={activeId}
          currentUserId={currentUserId}
          onSelect={onSelect}
          compact={compact}
          variant="linkedin"
        />
      </div>
    </div>
  );
}
