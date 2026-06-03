import { createServerFn } from "@tanstack/react-start";

const ADMIN_EMAIL = "piyushchadokar06@gmail.com";

/**
 * Server-side admin dashboard read. The admin onboarding flow uses a
 * localStorage bypass (no Supabase auth session), which means anon-role
 * reads are blocked by RLS. This function validates the bypass email
 * server-side and uses the service-role client to return real data.
 */
export const getAdminDashboard = createServerFn({ method: "POST" })
  .inputValidator((input: { adminEmail: string }) => {
    if (!input || typeof input.adminEmail !== "string") {
      throw new Error("adminEmail required");
    }
    return { adminEmail: input.adminEmail.trim().toLowerCase() };
  })
  .handler(async ({ data }) => {
    if (data.adminEmail !== ADMIN_EMAIL) {
      throw new Error("Forbidden");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [leads, notices, courses, pdfs, kb, inquiryMessages] = await Promise.all([
      supabaseAdmin
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000),
      supabaseAdmin
        .from("notices")
        .select("*")
        .order("published_at", { ascending: false }),
      supabaseAdmin.from("courses").select("*").order("name"),
      supabaseAdmin
        .from("pdf_documents")
        .select("*")
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("knowledge_entries")
        .select("*")
        .order("pinned", { ascending: false })
        .order("updated_at", { ascending: false }),
      supabaseAdmin
        .from("inquiry_messages")
        .select("id,inquiry_id,email,role,content,created_at")
        .order("created_at", { ascending: false })
        .limit(2000),
    ]);

    return {
      leads: leads.data ?? [],
      notices: notices.data ?? [],
      courses: courses.data ?? [],
      pdfs: pdfs.data ?? [],
      kb: kb.data ?? [],
      inquiryMessages: inquiryMessages.data ?? [],
    };
  });
