import type { UIMessage } from "ai";
import { supabase } from "@/integrations/supabase/client";

/**
 * Best-effort sync of a chat thread to Supabase. No-ops if not signed in.
 * Upserts the chat row and inserts any messages whose IDs aren't already stored.
 *
 * IMPORTANT: dedup IDs are reserved synchronously (before the await) so that
 * the many `updateMessages` calls fired during streaming don't all race past
 * the same `seen.has(id)` check and insert duplicate rows.
 */
const syncedMessageIds = new Map<string, Set<string>>();
const syncedInquiryMessageIds = new Map<string, Set<string>>();

type StoredInquiry = { inquiryId: string; email: string };

function readInquiry(): StoredInquiry | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("collegegpt:inquiry");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.inquiryId && parsed?.email) {
      return { inquiryId: parsed.inquiryId, email: parsed.email };
    }
    return null;
  } catch {
    return null;
  }
}

function isStreaming(m: UIMessage): boolean {
  // Skip assistant messages still streaming — wait until they're "done" so we
  // store the final content once, not one row per delta.
  return m.parts.some(
    (p) => (p as { state?: string }).state === "streaming",
  );
}

function messageContent(m: UIMessage): string {
  return m.parts
    .filter((p) => p.type === "text")
    .map((p) => (p as { text: string }).text)
    .join("");
}

/**
 * Best-effort sync of a guest student's chat to the inquiry_messages table.
 */
export async function syncInquiryMessages(threadId: string, messages: UIMessage[]) {
  try {
    const inq = readInquiry();
    if (!inq) return;

    let seen = syncedInquiryMessageIds.get(threadId);
    if (!seen) {
      seen = new Set<string>();
      syncedInquiryMessageIds.set(threadId, seen);
    }

    const fresh = messages.filter((m) => !seen!.has(m.id) && !isStreaming(m));
    if (fresh.length === 0) return;

    // Reserve IDs synchronously to prevent concurrent calls from re-inserting.
    fresh.forEach((m) => seen!.add(m.id));

    const rows = fresh.map((m) => ({
      inquiry_id: inq.inquiryId,
      email: inq.email,
      role: m.role,
      content: messageContent(m),
      parts: JSON.parse(JSON.stringify(m.parts)),
    }));

    const { error } = await supabase.from("inquiry_messages").insert(rows);
    if (error) {
      // Roll back so a retry can happen on the next update.
      fresh.forEach((m) => seen!.delete(m.id));
      console.warn("inquiry sync failed", error);
    }
  } catch (e) {
    console.warn("inquiry sync failed", e);
  }
}

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

    const fresh = messages.filter((m) => !seen!.has(m.id) && !isStreaming(m));
    if (fresh.length === 0) return;

    fresh.forEach((m) => seen!.add(m.id));

    const rows = fresh.map((m) => ({
      id: m.id,
      chat_id: threadId,
      user_id: user.id,
      role: m.role,
      content: messageContent(m),
      parts: JSON.parse(JSON.stringify(m.parts)),
    }));

    const { error } = await supabase.from("messages").insert(rows);
    if (error) {
      fresh.forEach((m) => seen!.delete(m.id));
      console.warn("chat sync failed", error);
    }
  } catch (e) {
    console.warn("chat sync failed", e);
  }
}
