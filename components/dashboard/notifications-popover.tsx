"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { Bell, CheckCheck, ChevronLeft, Sparkles, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useDashboardTheme } from "@/components/dashboard/dashboard-theme-provider";

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
};

type NotificationsAllResponse = {
  items: NotificationItem[];
  unreadCount: number;
};

function formatUnreadLabel(count: number) {
  if (count <= 0) return "You're all caught up";
  if (count === 1) return "1 unread update";
  return `${count} unread updates`;
}

function formatBadgeCount(count: number) {
  if (count <= 0) return null;
  return count > 9 ? "9+" : String(count);
}

export function NotificationsPopover() {
  const { data: session } = useSession();
  const dashboardTheme = useDashboardTheme();
  const isDark = dashboardTheme?.theme === "dark";
  const queryClient = useQueryClient();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);

  const { data: unreadNotifications = [] } = useQuery({
    queryKey: ["notifications", "unread"],
    queryFn: async () => {
      const res = await fetch("/api/notifications");
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Unable to load notifications");
      return (json.data ?? []) as NotificationItem[];
    },
    refetchInterval: 60000,
    enabled: !!session?.user?.id,
  });

  const { data: allData, isLoading } = useQuery({
    queryKey: ["notifications", "all"],
    queryFn: async () => {
      const res = await fetch("/api/notifications?all=true");
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Unable to load notifications");
      return json.data as NotificationsAllResponse;
    },
    enabled: !!session?.user?.id,
  });

  const allNotifications = allData?.items ?? [];
  const unreadCount = allData?.unreadCount ?? unreadNotifications.length;

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    },
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ["notifications", "unread"] });
      await queryClient.cancelQueries({ queryKey: ["notifications", "all"] });

      queryClient.setQueryData<NotificationItem[]>(["notifications", "unread"], (current) =>
        current?.filter((item) => item.id !== id) ?? []
      );

      queryClient.setQueryData<NotificationsAllResponse>(["notifications", "all"], (current) => {
        if (!current) return current;
        return {
          items: current.items.map((item) =>
            item.id === id ? { ...item, read: true } : item
          ),
          unreadCount: Math.max(0, current.unreadCount - 1),
        };
      });

      setSelectedNotification((current) =>
        current?.id === id ? { ...current, read: true } : current
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", "unread"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "all"] });
    },
  });

  const clearAll = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/notifications", { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Unable to clear notifications");
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["notifications", "unread"] });
      await queryClient.cancelQueries({ queryKey: ["notifications", "all"] });
      queryClient.setQueryData<NotificationItem[]>(["notifications", "unread"], []);
      queryClient.setQueryData<NotificationsAllResponse>(["notifications", "all"], {
        items: [],
        unreadCount: 0,
      });
      setSelectedNotification(null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", "unread"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "all"] });
    },
  });

  const hasNotifications = allNotifications.length > 0;
  const badgeLabel = formatBadgeCount(unreadCount);
  const showingDetail = Boolean(selectedNotification);

  const markAllRead = async () => {
    const unread = allNotifications.filter((item) => !item.read);
    await Promise.all(unread.map((item) => markRead.mutateAsync(item.id)));
  };

  const openNotification = (notification: NotificationItem) => {
    setSelectedNotification(notification);
    if (!notification.read) {
      markRead.mutate(notification.id);
    }
  };

  const closeDetail = () => {
    setSelectedNotification(null);
  };

  const handlePopoverOpenChange = (open: boolean) => {
    if (open) {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      setPopoverOpen(true);
      return;
    }

    if (selectedNotification) {
      setSelectedNotification(null);
      return;
    }

    setPopoverOpen(false);
  };

  return (
    <Popover open={popoverOpen} onOpenChange={handlePopoverOpenChange}>
      <PopoverTrigger
        render={
          <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
            <Bell className="h-4 w-4" />
            {badgeLabel ? (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] font-semibold text-white">
                {badgeLabel}
              </span>
            ) : null}
          </Button>
        }
      />
      <PopoverContent
        align="end"
        sideOffset={8}
        className={cn(
          "flex max-h-[min(28rem,78vh)] flex-col overflow-hidden border-border bg-popover p-0 text-popover-foreground transition-[width] duration-200 sm:max-h-[min(32rem,85vh)]",
          showingDetail
            ? "w-[min(calc(100vw-1.5rem),20rem)] sm:w-[min(100vw-2rem,44rem)]"
            : "w-[min(calc(100vw-1.5rem),20rem)] sm:w-[min(100vw-2rem,24rem)]",
          isDark && "dark"
        )}
      >
        <div
          className={cn(
            "shrink-0 border-b px-3 py-2.5 text-white sm:px-4 sm:py-3",
            isDark
              ? "border-emerald-800/40 bg-gradient-to-r from-emerald-900 to-emerald-950"
              : "border-emerald-700/30 bg-gradient-to-r from-emerald-600 to-teal-600"
          )}
        >
          <PopoverHeader className="gap-0.5 sm:gap-1">
            <div className="flex items-center justify-between gap-2 sm:gap-3">
              <PopoverTitle className="flex items-center gap-1.5 text-sm text-white sm:gap-2 sm:text-base">
                <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Notifications
              </PopoverTitle>
              {!showingDetail && unreadCount > 0 ? (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="h-7 bg-white/15 px-2 text-[11px] text-white hover:bg-white/25 sm:px-3 sm:text-xs"
                  onClick={() => void markAllRead()}
                >
                  <CheckCheck className="mr-1 h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  Mark all read
                </Button>
              ) : null}
            </div>
            <p className={cn("text-[11px] sm:text-xs", isDark ? "text-emerald-200/80" : "text-emerald-50/90")}>
              {formatUnreadLabel(unreadCount)}
            </p>
          </PopoverHeader>
        </div>

        <div className="flex min-h-0 flex-1">
          <div
            className={cn(
              "flex min-h-0 flex-col border-border",
              showingDetail ? "hidden w-full sm:flex sm:w-56 sm:border-r" : "w-full"
            )}
          >
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-popover">
              {isLoading ? (
                <p className="px-3 py-6 text-center text-xs text-muted-foreground sm:px-4 sm:py-8 sm:text-sm">
                  Loading notifications...
                </p>
              ) : !allNotifications.length ? (
                <div className="flex flex-col items-center px-3 py-8 text-center sm:px-4 sm:py-10">
                  <div
                    className={cn(
                      "mb-2.5 flex h-10 w-10 items-center justify-center rounded-full sm:mb-3 sm:h-12 sm:w-12",
                      isDark ? "bg-emerald-950/60" : "bg-emerald-100"
                    )}
                  >
                    <Bell
                      className={cn("h-4 w-4 sm:h-5 sm:w-5", isDark ? "text-emerald-400" : "text-emerald-600")}
                    />
                  </div>
                  <p className="text-xs font-medium text-foreground sm:text-sm">No notifications yet</p>
                  <p className="mt-1 text-[11px] text-muted-foreground sm:text-xs">
                    Updates about your account will appear here.
                  </p>
                </div>
              ) : (
                <ul>
                  {allNotifications.map((notification) => (
                    <li key={notification.id} className="border-b border-border last:border-b-0">
                      <button
                        type="button"
                        onClick={() => openNotification(notification)}
                        className={cn(
                          "w-full px-3 py-2.5 text-left transition hover:bg-muted/60 sm:px-4 sm:py-3",
                          selectedNotification?.id === notification.id && "bg-muted/70",
                          !notification.read &&
                            (isDark ? "bg-emerald-950/40" : "bg-emerald-50/70")
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={cn(
                              "text-xs sm:text-sm",
                              notification.read
                                ? "font-medium text-muted-foreground"
                                : "font-semibold text-foreground"
                            )}
                          >
                            {notification.title}
                          </p>
                          {!notification.read ? (
                            <span
                              className={cn(
                                "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                                isDark ? "bg-emerald-400" : "bg-emerald-500"
                              )}
                            />
                          ) : null}
                        </div>
                        <p
                          className={cn(
                            "mt-0.5 line-clamp-2 text-[11px] leading-relaxed sm:mt-1 sm:text-xs",
                            notification.read ? "text-muted-foreground/80" : "text-muted-foreground"
                          )}
                        >
                          {notification.body}
                        </p>
                        <p className="mt-1.5 text-[10px] text-muted-foreground sm:mt-2 sm:text-[11px]">
                          {new Date(notification.createdAt).toLocaleString()}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {!showingDetail && hasNotifications ? (
              <div className="shrink-0 border-t border-border bg-popover p-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                  disabled={clearAll.isPending}
                  onClick={() => clearAll.mutate()}
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  Clear all notifications
                </Button>
              </div>
            ) : null}
          </div>

          {selectedNotification ? (
            <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-popover">
              <div className="flex items-start justify-between gap-2 border-b border-border px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3">
                <div className="flex min-w-0 items-start gap-2">
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    className="shrink-0 sm:hidden"
                    onClick={closeDetail}
                    aria-label="Back to notifications"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground sm:text-sm">
                      {selectedNotification.title}
                    </p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground sm:mt-1 sm:text-[11px]">
                      {new Date(selectedNotification.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  className="hidden shrink-0 sm:inline-flex"
                  onClick={closeDetail}
                  aria-label="Close message details"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 sm:px-4 sm:py-4">
                <p className="text-xs leading-6 whitespace-pre-wrap text-foreground sm:text-sm sm:leading-7">
                  {selectedNotification.body}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
