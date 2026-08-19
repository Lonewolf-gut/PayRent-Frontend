"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { MessageCircleMore } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { conversationTitle } from "@/lib/messaging/display";
import type { ChatMessage, ConversationSummary, TypingUser } from "@/lib/messaging/types";
import { TypingIndicator } from "@/components/dashboard/messaging/typing-indicator";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function useConversationTyping(activeId: string | null, content: string) {
  const stopTypingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setTyping = useCallback(
    async (typing: boolean) => {
      if (!activeId) return;
      try {
        await fetch(`/api/messages/${activeId}/typing`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ typing }),
        });
      } catch {
        // Non-critical UI signal
      }
    },
    [activeId]
  );

  useEffect(() => {
    if (!activeId) return;

    if (stopTypingRef.current) {
      clearTimeout(stopTypingRef.current);
      stopTypingRef.current = null;
    }

    if (!content.trim()) {
      void setTyping(false);
      return;
    }

    void setTyping(true);
    stopTypingRef.current = setTimeout(() => {
      void setTyping(false);
    }, 3500);

    return () => {
      if (stopTypingRef.current) {
        clearTimeout(stopTypingRef.current);
      }
    };
  }, [activeId, content, setTyping]);

  useEffect(() => {
    return () => {
      if (activeId) {
        void setTyping(false);
      }
    };
  }, [activeId, setTyping]);

  const { data: typers = [] } = useQuery({
    queryKey: ["typing", activeId],
    queryFn: async () => {
      const res = await fetch(`/api/messages/${activeId}/typing`);
      const json = await res.json();
      return (json.data?.typers ?? []) as TypingUser[];
    },
    enabled: !!activeId,
    refetchInterval: 1500,
  });

  return typers;
}

export function useMessaging(startRecipientId?: string | null) {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const currentUserId = session?.user?.id ?? "";
  const [activeId, setActiveId] = useState<string | null>(null);
  const [content, setContent] = useState("");

  useEffect(() => {
    if (!startRecipientId) return;
    let cancelled = false;

    (async () => {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId: startRecipientId }),
      });
      const json = await res.json();
      if (!cancelled && json.success) {
        const conversationId = json.data?.conversationId;
        if (conversationId) {
          setActiveId(conversationId);
          queryClient.invalidateQueries({ queryKey: ["conversations"] });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [queryClient, startRecipientId]);

  const { data: conversations = [] } = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const res = await fetch("/api/messages");
      const json = await res.json();
      return (json.data ?? []) as ConversationSummary[];
    },
    refetchInterval: 15000,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["messages", activeId],
    queryFn: async () => {
      if (!activeId) return [];
      const res = await fetch(`/api/messages/${activeId}`);
      const json = await res.json();
      return (json.data ?? []) as ChatMessage[];
    },
    enabled: !!activeId,
    refetchInterval: 10000,
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!activeId || !content.trim()) return;
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: activeId, content }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message ?? "Failed to send message");
    },
    onSuccess: () => {
      setContent("");
      void fetch(`/api/messages/${activeId}/typing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ typing: false }),
      });
      queryClient.invalidateQueries({ queryKey: ["messages", activeId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["messages-unread-count"] });
      queryClient.invalidateQueries({ queryKey: ["typing", activeId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const activeConversation = conversations.find((c) => c.id === activeId) ?? null;
  const typers = useConversationTyping(activeId, content);

  return {
    currentUserId,
    conversations,
    messages,
    activeId,
    setActiveId,
    activeConversation,
    content,
    setContent,
    sendMutation,
    typers,
  };
}

export function ConversationList({
  conversations,
  activeId,
  currentUserId,
  onSelect,
  compact = false,
  variant = "default",
}: {
  conversations: ConversationSummary[];
  activeId: string | null;
  currentUserId: string;
  onSelect: (id: string) => void;
  compact?: boolean;
  variant?: "default" | "linkedin";
}) {
  if (!conversations.length) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center text-center",
          compact ? "px-4 py-10" : "px-6 py-14"
        )}
      >
        <div className="flex size-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
          <MessageCircleMore className="size-8" strokeWidth={1.75} />
        </div>
        <p className="mt-4 text-sm font-medium text-foreground">No messages yet</p>
        <p className="mt-1 max-w-[220px] text-xs text-muted-foreground">
          When you send or receive messages, they will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className={variant === "linkedin" ? "" : "divide-y"}>
      {conversations.map((conv) => {
        const title = conversationTitle(conv.participants, currentUserId);
        const other = conv.participants.find((p) => p.id !== currentUserId);
        const isActive = activeId === conv.id;
        const previewPrefix =
          conv.lastMessage?.senderId === currentUserId ? "You: " : "";

        return (
          <button
            key={conv.id}
            type="button"
            onClick={() => onSelect(conv.id)}
            className={cn(
              "flex w-full items-start gap-3 text-left transition-colors",
              compact ? "px-3 py-3" : "px-4 py-3",
              variant === "linkedin"
                ? isActive
                  ? "bg-muted/80"
                  : "hover:bg-muted/50"
                : isActive
                  ? "border-l-2 border-emerald-600 bg-muted"
                  : "border-l-2 border-transparent hover:bg-muted/70"
            )}
          >
            <div className="relative shrink-0">
              <Avatar className={variant === "linkedin" ? "size-12" : "size-10"}>
                {other?.image ? <AvatarImage src={other.image} alt={title} /> : null}
                <AvatarFallback>{getInitials(other?.displayName ?? title)}</AvatarFallback>
              </Avatar>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-semibold">{title}</p>
                {conv.lastMessage ? (
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {format(new Date(conv.lastMessage.createdAt), "MMM d")}
                  </span>
                ) : null}
              </div>
              <div className="mt-0.5 flex items-center justify-between gap-2">
                <p className="truncate text-xs text-muted-foreground">
                  {previewPrefix}
                  {conv.lastMessage?.content ?? "No messages"}
                </p>
                {conv.unreadCount > 0 ? (
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-semibold text-white">
                    {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                  </span>
                ) : null}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export function ChatThread({
  messages,
  currentUserId,
  title,
  content,
  onContentChange,
  onSend,
  sending,
  typers = [],
  heightClass = "h-[min(60vh,520px)]",
  showHeader = true,
  compact = false,
}: {
  messages: ChatMessage[];
  currentUserId: string;
  title: string;
  content: string;
  onContentChange: (value: string) => void;
  onSend: () => void;
  sending: boolean;
  typers?: TypingUser[];
  heightClass?: string;
  showHeader?: boolean;
  compact?: boolean;
}) {
  const scrollClass = compact ? "flex-1 min-h-0 overflow-y-auto p-3" : `flex-1 space-y-3 overflow-y-auto p-4 ${heightClass}`;
  const bubbleMaxClass = compact ? "max-w-[82%]" : "max-w-[60%]";

  return (
    <div className="flex h-full min-h-0 flex-col">
      {showHeader ? (
        <div className="border-b px-4 py-3">
          <p className="font-medium">{title}</p>
        </div>
      ) : null}
      <div className={`space-y-3 ${scrollClass}`}>
        {messages.length ? (
          messages.map((message) => {
            const isOwn = message.senderId === currentUserId;
            return (
              <div
                key={message.id}
                className={`flex gap-2 ${isOwn ? "justify-end" : "justify-start"}`}
              >
                {!isOwn ? (
                  <Avatar className={cn("mt-1 shrink-0", compact ? "size-7" : "size-8")}>
                    {message.sender.image ? (
                      <AvatarImage src={message.sender.image} alt={message.sender.displayName} />
                    ) : null}
                    <AvatarFallback className="text-xs">
                      {getInitials(message.sender.displayName)}
                    </AvatarFallback>
                  </Avatar>
                ) : null}
                <div
                  className={cn(
                    "w-fit rounded-2xl px-3 py-2 text-sm",
                    bubbleMaxClass,
                    isOwn ? "bg-emerald-600 text-white" : "bg-muted text-foreground"
                  )}
                >
                  {!isOwn ? (
                    <p className="mb-1 text-xs font-medium opacity-80">
                      {message.sender.displayName}
                    </p>
                  ) : null}
                  <p className="whitespace-pre-wrap break-words">{message.content}</p>
                  <p
                    className={`mt-1 text-[10px] ${
                      isOwn ? "text-emerald-100/80" : "text-muted-foreground"
                    }`}
                  >
                    {format(new Date(message.createdAt), "MMM d, h:mm a")}
                  </p>
                </div>
                {isOwn ? (
                  <Avatar className={cn("mt-1 shrink-0", compact ? "size-7" : "size-8")}>
                    {message.sender.image ? (
                      <AvatarImage src={message.sender.image} alt={message.sender.displayName} />
                    ) : null}
                    <AvatarFallback className="text-xs">
                      {getInitials(message.sender.displayName)}
                    </AvatarFallback>
                  </Avatar>
                ) : null}
              </div>
            );
          })
        ) : (
          <p className="text-sm text-muted-foreground">Start the conversation</p>
        )}
        {typers.length > 0 ? (
          <TypingIndicator
            displayName={typers.map((user) => user.displayName).join(", ")}
          />
        ) : null}
      </div>
      <div className={cn("flex gap-2 border-t", compact ? "p-2.5" : "p-3")}>
        <Input
          placeholder="Type a message..."
          value={content}
          onChange={(e) => onContentChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && content.trim() && !sending) onSend();
          }}
        />
        <Button
          className="bg-emerald-600 hover:bg-emerald-700"
          disabled={!content.trim() || sending}
          onClick={onSend}
        >
          Send
        </Button>
      </div>
    </div>
  );
}
