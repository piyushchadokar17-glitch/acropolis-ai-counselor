import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { z } from "zod";
import { useThreads } from "@/hooks/use-threads";

const searchSchema = z.object({ q: z.string().optional() }).optional();

export const Route = createFileRoute("/chat/")({
  validateSearch: (s) => searchSchema.parse(s),
  component: ChatIndex,
  head: () => ({
    meta: [{ title: "Chat · CollegeGPT" }],
  }),
});

function ChatIndex() {
  const { threads, create } = useThreads();
  const navigate = useNavigate();
  const search = Route.useSearch();

  useEffect(() => {
    const target = threads[0]?.id ?? create();
    navigate({
      to: "/chat/$threadId",
      params: { threadId: target },
      search: search?.q ? { q: search.q } : undefined,
      replace: true,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
