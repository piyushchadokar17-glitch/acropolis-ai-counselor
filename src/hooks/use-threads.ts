import { useCallback, useEffect, useState } from "react";
import type { UIMessage } from "ai";

export type ChatThread = {
  id: string;
  title: string;
  updatedAt: number;
  messages: UIMessage[];
};

const KEY = "collegegpt.threads.v1";

const read = (): ChatThread[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const write = (t: ChatThread[]) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(t));
};

const newThread = (): ChatThread => ({
  id: crypto.randomUUID(),
  title: "New conversation",
  updatedAt: Date.now(),
  messages: [],
});

/** Idempotent bootstrap: creates one default thread on first run. */
export function useThreads() {
  const [threads, setThreads] = useState<ChatThread[]>(() => {
    const existing = read();
    if (existing.length === 0) {
      const t = newThread();
      write([t]);
      return [t];
    }
    return existing.sort((a, b) => b.updatedAt - a.updatedAt);
  });

  // sync to storage whenever threads change
  useEffect(() => {
    write(threads);
  }, [threads]);

  const create = useCallback(() => {
    const t = newThread();
    setThreads((prev) => [t, ...prev]);
    return t.id;
  }, []);

  const remove = useCallback((id: string) => {
    setThreads((prev) => {
      const next = prev.filter((t) => t.id !== id);
      if (next.length === 0) {
        const t = newThread();
        return [t];
      }
      return next;
    });
  }, []);

  const updateMessages = useCallback(
    (id: string, messages: UIMessage[]) => {
      setThreads((prev) =>
        prev.map((t) => {
          if (t.id !== id) return t;
          let title = t.title;
          if (title === "New conversation") {
            const firstUser = messages.find((m) => m.role === "user");
            if (firstUser) {
              const text = firstUser.parts
                .filter((p) => p.type === "text")
                .map((p) => (p as { text: string }).text)
                .join(" ")
                .trim();
              if (text) title = text.length > 48 ? text.slice(0, 48) + "…" : text;
            }
          }
          return { ...t, messages, title, updatedAt: Date.now() };
        }),
      );
    },
    [],
  );

  const get = useCallback(
    (id: string | undefined) => threads.find((t) => t.id === id),
    [threads],
  );

  return { threads, create, remove, updateMessages, get };
}
