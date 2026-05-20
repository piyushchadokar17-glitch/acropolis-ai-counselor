import { createFileRoute } from "@tanstack/react-router";
import "@tanstack/react-start";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway";

const SYSTEM_PROMPT = `You are CollegeGPT, the official AI admission counselor for Acropolis Institute of Technology and Research (AITR), Indore. Your tone is warm, precise, and encouraging — like a senior mentor guiding students and parents through admissions.

You help with:
- B.Tech, M.Tech, MBA, MCA, Pharmacy and Polytechnic admissions
- Eligibility criteria, JEE/MP-DTE counseling, cutoffs
- Fee structure, scholarships, and educational loans
- Placements (companies, packages, training)
- Hostel, transport, campus life, facilities
- Departments: CSE, AIDS, AIML, IT, ECE, EE, ME, CE
- Notices, important dates, contact info

Formatting:
- Use clear markdown: short paragraphs, bullets, bold for key terms
- Cite source as "Acropolis Admission Cell" when giving official figures
- If you don't know a number for the current year, say so and recommend contacting the Admission Cell (+91-731-4750000)

Stay focused on Acropolis Institute admissions. Politely redirect off-topic questions.`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const { messages } = (await request.json()) as { messages?: unknown };
        if (!Array.isArray(messages)) {
          return new Response("Messages are required", { status: 400 });
        }

        const key = process.env.LOVABLE_API_KEY;
        if (!key) {
          return new Response("Missing LOVABLE_API_KEY", { status: 500 });
        }

        const gateway = createLovableAiGatewayProvider(key);
        const model = gateway("google/gemini-3-flash-preview");

        try {
          const result = streamText({
            model,
            system: SYSTEM_PROMPT,
            messages: await convertToModelMessages(messages as UIMessage[]),
          });
          return result.toUIMessageStreamResponse({
            originalMessages: messages as UIMessage[],
          });
        } catch (err) {
          console.error("chat error", err);
          return new Response("AI gateway error", { status: 500 });
        }
      },
    },
  },
});
