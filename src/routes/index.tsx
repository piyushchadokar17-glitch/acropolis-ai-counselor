import { createFileRoute } from "@tanstack/react-router";
import { Landing } from "@/components/Landing";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "CollegeGPT · AI Admission Counselor — Acropolis Institute, Indore" },
      {
        name: "description",
        content:
          "Your smart AI college admission counselor for Acropolis Institute of Technology & Research, Indore. Admissions, fees, scholarships, placements & hostel — answered instantly.",
      },
      { property: "og:title", content: "CollegeGPT · AI Admission Counselor" },
      {
        property: "og:description",
        content:
          "AI-powered admission guidance for Acropolis Institute of Technology & Research, Indore.",
      },
    ],
  }),
});
