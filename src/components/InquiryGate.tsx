import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, Mail, Sparkles, User } from "lucide-react";
import { AcropolisLogo } from "@/components/AcropolisLogo";
import { ParticleField } from "@/components/ParticleField";
import { Button } from "@/components/ui/button";
import { useInquiry, type Inquiry } from "@/hooks/use-inquiry";

const ADMIN_EMAIL = "piyushchadokar06@gmail.com";
const ADMIN_BYPASS_KEY = "collegegpt:adminBypass";

const COURSES = [
  "B.Tech — CSE",
  "B.Tech — CSE (AI & DS)",
  "B.Tech — CSE (AI & ML)",
  "B.Tech — IT",
  "B.Tech — ECE",
  "B.Tech — EE",
  "B.Tech — ME",
  "B.Tech — CE",
  "MBA",
  "MCA",
  "M.Tech",
  "B.Pharm / D.Pharm",
  "Polytechnic",
  "Not sure yet",
];

export function InquiryGate({
  onReady,
  children,
}: {
  children: React.ReactNode;
  onReady?: (i: Inquiry) => void;
}) {
  const { inquiry, ready, save } = useInquiry();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [course, setCourse] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!ready) return null;
  if (inquiry) return <>{children}</>;

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const canSubmit = name.trim().length >= 2 && isValidEmail && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setLoading(true);
    try {
      const trimmedEmail = email.trim().toLowerCase();
      // Admin bypass: redirect directly to dashboard
      if (trimmedEmail === ADMIN_EMAIL) {
        localStorage.setItem(ADMIN_BYPASS_KEY, JSON.stringify({ email: trimmedEmail, ts: Date.now() }));
        navigate({ to: "/admin" });
        return;
      }
      const rec = await save({ name, email, course: course || undefined });
      onReady?.(rec);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start your chat. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative grid min-h-screen w-full place-items-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0" style={{ background: "var(--gradient-aurora)" }} />
        <ParticleField density={40} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: "easeOut" }}
        className="glass-strong relative w-full max-w-md rounded-3xl p-7 shadow-[0_0_60px_oklch(0.62_0.22_285/0.18)] ring-1 ring-white/10"
      >
        <div className="mb-6 flex flex-col items-center text-center">
          <AcropolisLogo variant="mark" size="sm" />
          <div className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-accent ring-1 ring-white/10">
            <Sparkles className="size-3" />
            Quick start
          </div>
          <h1 className="mt-3 font-display text-2xl font-bold leading-tight sm:text-3xl">
            Say hello to your <span className="text-gradient">AI counselor</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Just two details and you&apos;re in. No password, no OTP.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <Field icon={<User className="size-4" />}>
            <input
              type="text"
              required
              autoFocus
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
            />
          </Field>

          <Field icon={<Mail className="size-4" />}>
            <input
              type="email"
              required
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
            />
          </Field>

          <Field icon={<Sparkles className="size-4" />}>
            <select
              value={course}
              onChange={(e) => setCourse(e.target.value)}
              className="w-full bg-transparent text-sm text-foreground focus:outline-none"
            >
              <option value="" className="bg-[oklch(0.14_0.04_265)]">
                Interested course (optional)
              </option>
              {COURSES.map((c) => (
                <option key={c} value={c} className="bg-[oklch(0.14_0.04_265)]">
                  {c}
                </option>
              ))}
            </select>
          </Field>

          {error && (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-300 ring-1 ring-red-500/20">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={!canSubmit}
            className="mt-1 h-11 w-full bg-gradient-to-r from-[oklch(0.62_0.22_285)] to-[oklch(0.78_0.15_200)] text-sm font-semibold text-white shadow-[0_0_30px_oklch(0.62_0.22_285/0.45)] hover:opacity-95 disabled:opacity-50"
          >
            {loading ? "Starting…" : (
              <>
                Start chatting <ArrowRight className="ml-1 size-4" />
              </>
            )}
          </Button>

          <p className="mt-1 text-center text-[10px] text-muted-foreground">
            Your details help the Acropolis Admission Cell follow up.
            We&apos;ll never spam you.
          </p>
        </form>
      </motion.div>
    </div>
  );
}

function Field({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="glass flex items-center gap-2.5 rounded-xl px-3.5 py-3 ring-1 ring-white/10 transition focus-within:ring-accent/40 focus-within:shadow-[0_0_24px_oklch(0.78_0.15_200/0.18)]">
      <span className="text-accent/80">{icon}</span>
      {children}
    </label>
  );
}
