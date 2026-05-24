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
      const { data, error } = await supabase
        .from("leads")
        .insert({
          name: input.name.trim(),
          email: input.email.trim().toLowerCase(),
          course_interest: input.course?.trim() || null,
          message: input.message ?? "Started chatbot inquiry",
          source: "chatbot",
        })
        .select("id, created_at")
        .single();

      if (error) throw error;

      const record: Inquiry = {
        inquiryId: data.id as string,
        name: input.name.trim(),
        email: input.email.trim().toLowerCase(),
        course: input.course?.trim() || undefined,
        createdAt: data.created_at as string,
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
