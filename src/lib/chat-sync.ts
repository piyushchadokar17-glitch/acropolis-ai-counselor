import type { UIMessage } from "ai";
import { supabase } from "@/integrations/supabase/client";

/**
 * Best-effort sync of a chat thread to Supabase. No-ops if not signed in.
 * Upserts the chat row and inserts any messages whose IDs aren't already stored.
 */
const syncedMessageIds = new Map<string, Set<string>>();

export async function syncThreadToSupabase(
  threadId: string,
  title: string,
  messages: UIMessage[],
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("chats")
      .upsert(
        { id: threadId, user_id: user.id, title, updated_at: new Date().toISOString() },
        { onConflict: "id" },
      );

    let seen = syncedMessageIds.get(threadId);
    if (!seen) {
      seen = new Set<string>();
      syncedMessageIds.set(threadId, seen);
      // hydrate from db so we don't double-insert across reloads
      const { data } = await supabase
        .from("messages")
        .select("id")
        .eq("chat_id", threadId);
      data?.forEach((r) => seen!.add(r.id as string));
    }

    const fresh = messages.filter((m) => !seen!.has(m.id));
    if (fresh.length === 0) return;

    const rows = fresh.map((m) => {
      const content = m.parts
        .filter((p) => p.type === "text")
        .map((p) => (p as { text: string }).text)
        .join("");
      return {
        id: m.id,
        chat_id: threadId,
        user_id: user.id,
        role: m.role,
        content,
        parts: m.parts as unknown as object,
      };
    });

    const { error } = await supabase.from("messages").insert(rows);
    if (!error) fresh.forEach((m) => seen!.add(m.id));
  } catch (e) {
    console.warn("chat sync failed", e);
  }
}
