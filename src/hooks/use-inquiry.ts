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

function read(): Inquiry | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Inquiry) : null;
  } catch {
    return null;
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

      const payload = {
        id,
        name: input.name.trim(),
        email: input.email.trim().toLowerCase(),
        course_interest: input.course?.trim() || null,
        message: input.message ?? "Started chatbot inquiry",
        source: "chatbot",
      };

      // RLS allows anon INSERT but not SELECT-back, so we skip .select()
      // and use the client-generated id instead.
      const { error } = await supabase.from("leads").insert(payload);
      if (error) {
        console.error("[inquiry] lead insert failed", error);
        throw new Error(error.message || "Could not save your details.");
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
    setInquiry(null);
  }, []);

  return { inquiry, ready, save, clear };
}
