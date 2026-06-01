import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Inquiry = {
  inquiryId: string;
  name: string;
  email: string;
  course?: string;
  createdAt: string;
};

const KEY = "collegegpt:inquiry";
const THREADS_KEY = "collegegpt.threads.v1";

function read(): Inquiry | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Inquiry) : null;
  } catch {
    return null;
  }
}

/** Wipe any per-student state so the new inquiry starts with a fresh slate. */
function resetStudentState() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(THREADS_KEY);
    // Best-effort: end any cached Supabase session so the new student
    // isn't accidentally attributed to a previously signed-in user.
    void supabase.auth.signOut().catch(() => {});
  } catch {
    // ignore
  }
}

export function useInquiry() {
  const [inquiry, setInquiry] = useState<Inquiry | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setInquiry(read());
    setReady(true);
  }, []);

  const save = useCallback(
    async (input: { name: string; email: string; course?: string; message?: string }) => {
      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const createdAt = new Date().toISOString();
      const email = input.email.trim().toLowerCase();

      // If a different student is starting an inquiry on this device,
      // purge the previous student's local chat threads + cached session.
      const prev = read();
      if (!prev || prev.email !== email) {
        resetStudentState();
      }

      const payload = {
        id,
        name: input.name.trim(),
        email,
        course_interest: input.course?.trim() || null,
        message: input.message ?? "Started chatbot inquiry",
        source: "chatbot",
      };

      const { error } = await supabase.from("leads").insert(payload);
      if (error) {
        // Best-effort: don't block the student from chatting if the lead
        // insert fails (RLS, network, etc.). The Admission Cell still gets
        // the conversation via inquiry_messages once chat starts.
        console.warn("[inquiry] lead insert failed, continuing locally", error);
      }

      const record: Inquiry = {
        inquiryId: id,
        name: payload.name,
        email: payload.email,
        course: payload.course_interest || undefined,
        createdAt,
      };
      localStorage.setItem(KEY, JSON.stringify(record));
      setInquiry(record);
      return record;
    },
    [],
  );

  const clear = useCallback(() => {
    localStorage.removeItem(KEY);
    resetStudentState();
    setInquiry(null);
  }, []);

  return { inquiry, ready, save, clear };
}
