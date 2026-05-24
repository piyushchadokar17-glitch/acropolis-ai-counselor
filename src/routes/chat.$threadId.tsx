import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";
import { z } from "zod";
import { ChatSidebar } from "@/components/ChatSidebar";
import { ChatWindow } from "@/components/ChatWindow";
import { InquiryGate } from "@/components/InquiryGate";
import { ParticleField } from "@/components/ParticleField";
import { useThreads } from "@/hooks/use-threads";

const searchSchema = z.object({ q: z.string().optional() }).optional();

export const Route = createFileRoute("/chat/$threadId")({
  validateSearch: (s) => searchSchema.parse(s),
  component: ChatPage,
});

function ChatPage() {
  const { threadId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { threads, create, remove, updateMessages, get } = useThreads();

  const active = get(threadId);

  const handleNew = useCallback(() => {
    const id = create();
    navigate({ to: "/chat/$threadId", params: { threadId: id } });
  }, [create, navigate]);

  const handleDelete = useCallback(
    (id: string) => {
      remove(id);
      if (id === threadId) {
        const remaining = threads.filter((t) => t.id !== id);
        const next = remaining[0]?.id;
        if (next) navigate({ to: "/chat/$threadId", params: { threadId: next } });
        else navigate({ to: "/chat" });
      }
    },
    [remove, threadId, threads, navigate],
  );

  const handleTopic = useCallback(
    (topic: string) => {
      const id = create();
      navigate({
        to: "/chat/$threadId",
        params: { threadId: id },
        search: { q: topic },
      });
    },
    [create, navigate],
  );

  return (
    <div className="relative flex h-screen w-full overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <ParticleField density={35} />
      </div>
      <ChatSidebar
        threads={threads}
        activeId={threadId}
        onNew={handleNew}
        onDelete={handleDelete}
        onPickTopic={handleTopic}
      />
      <main className="relative flex-1">
        {active && (
          <ChatWindow
            key={threadId}
            threadId={threadId}
            initialMessages={active.messages}
            initialQuery={search?.q}
            onMessagesChange={updateMessages}
          />
        )}
      </main>
    </div>
  );
}
