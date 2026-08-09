"use client";

import { conversationTitle } from "@/lib/messaging/display";
import { cn } from "@/lib/utils";
import { ChatThread, useMessaging } from "./messaging-shared";
import { MessagingListPanel } from "./messaging-list-panel";

export function MessagesInbox({
  startRecipientId,
}: {
  startRecipientId?: string | null;
}) {
  const {
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
  } = useMessaging(startRecipientId);

  const title = activeConversation
    ? conversationTitle(activeConversation.participants, currentUserId)
    : "Select a conversation";

  return (
    <div className="-mx-4 -mb-4 flex h-[calc(100dvh-7rem)] min-h-[460px] overflow-hidden border-t bg-card sm:-mx-6 sm:-mb-6 sm:h-[calc(100dvh-7.5rem)] sm:min-h-[520px] lg:mx-0 lg:mb-0 lg:h-[calc(100dvh-8.5rem)] lg:rounded-xl lg:border">
      <aside
        className={cn(
          "flex w-full flex-col border-r lg:w-[min(360px,38%)] lg:shrink-0",
          activeId ? "hidden lg:flex" : "flex"
        )}
      >
        <div className="border-b px-3 py-2.5 sm:px-4 sm:py-3">
          <h2 className="text-base font-semibold sm:text-lg">Messaging</h2>
        </div>
        <MessagingListPanel
          conversations={conversations}
          activeId={activeId}
          currentUserId={currentUserId}
          onSelect={setActiveId}
          className="flex-1"
        />
      </aside>

      <section
        className={cn(
          "min-w-0 flex-1 flex-col",
          activeId ? "flex" : "hidden lg:flex"
        )}
      >
        {activeId ? (
          <ChatThread
            messages={messages}
            currentUserId={currentUserId}
            title={title}
            content={content}
            onContentChange={setContent}
            onSend={() => sendMutation.mutate()}
            sending={sendMutation.isPending}
            typers={typers}
            heightClass="min-h-0 flex-1"
          />
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            Select a conversation to start chatting
          </div>
        )}
      </section>
    </div>
  );
}
