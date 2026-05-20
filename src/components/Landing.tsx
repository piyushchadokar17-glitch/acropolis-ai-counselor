import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Sparkles,
  ArrowRight,
  GraduationCap,
  Wallet,
  Building2,
  Briefcase,
  BookOpen,
  Mic,
  ShieldCheck,
  Zap,
} from "lucide-react";
import heroOrb from "@/assets/hero-orb.jpg";
import { AcropolisLogo } from "@/components/AcropolisLogo";
import { ParticleField } from "@/components/ParticleField";
import { Button } from "@/components/ui/button";

const suggestions = [
  { icon: GraduationCap, title: "Admission Process", desc: "B.Tech, MBA, MCA — eligibility & dates" },
  { icon: Wallet, title: "Fee Structure", desc: "Course-wise fees, hostel, transport" },
  { icon: Sparkles, title: "Scholarships", desc: "Merit, JEE, reserved category" },
  { icon: Briefcase, title: "Placements", desc: "Top recruiters & packages" },
  { icon: Building2, title: "Hostel Life", desc: "Rooms, mess, facilities" },
  { icon: BookOpen, title: "Courses", desc: "CSE, AIDS, AIML, ECE, ME, CE" },
];

const stats = [
  { v: "30+", l: "Years of legacy" },
  { v: "8k+", l: "Active students" },
  { v: "500+", l: "Recruiter network" },
  { v: "24/7", l: "AI counselor" },
];

export function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Ambient layers */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0" style={{ background: "var(--gradient-aurora)" }} />
        <ParticleField density={60} />
      </div>

      {/* Nav */}
      <header className="sticky top-0 z-30 mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-5">
        <AcropolisLogo />
        <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          <a href="#features" className="hover:text-foreground transition-colors">Features</a>
          <a href="#explore" className="hover:text-foreground transition-colors">Explore</a>
          <a href="#about" className="hover:text-foreground transition-colors">About</a>
        </nav>
        <Link to="/chat">
          <Button className="bg-gradient-to-r from-[oklch(0.62_0.22_285)] to-[oklch(0.78_0.15_200)] text-white shadow-[0_0_30px_oklch(0.62_0.22_285/0.5)] hover:opacity-95">
            Start AI Chat <ArrowRight className="ml-1 size-4" />
          </Button>
        </Link>
      </header>

      {/* Hero */}
      <section className="relative mx-auto grid w-full max-w-7xl gap-12 px-6 pb-24 pt-12 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:pt-20">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="flex flex-col gap-7"
        >
          <span className="glass mx-0 inline-flex w-fit items-center gap-2 rounded-full px-3.5 py-1.5 text-xs uppercase tracking-[0.18em] text-accent">
            <Sparkles className="size-3.5" />
            AI-Powered Admission · Class of 2026
          </span>

          <h1 className="font-display text-5xl font-bold leading-[1.05] sm:text-6xl lg:text-7xl">
            Your Smart{" "}
            <span className="text-gradient">AI College</span>
            <br /> Admission Counselor.
          </h1>

          <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
            Explore admissions, placements, scholarships, hostel and complete
            campus guidance for{" "}
            <span className="text-foreground">Acropolis Institute of Technology &amp; Research, Indore</span>
            {" "}— powered by a specialized AI counselor that never sleeps.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Link to="/chat">
              <Button
                size="lg"
                className="h-12 bg-gradient-to-r from-[oklch(0.62_0.22_285)] to-[oklch(0.78_0.15_200)] px-6 text-base font-semibold text-white shadow-[0_0_40px_oklch(0.62_0.22_285/0.55)] hover:opacity-95"
              >
                Start AI Chat <ArrowRight className="ml-1.5 size-4" />
              </Button>
            </Link>
            <a href="#explore">
              <Button size="lg" variant="outline" className="h-12 border-white/15 bg-white/5 px-6 text-base backdrop-blur hover:bg-white/10">
                Explore Courses
              </Button>
            </a>
            <a href="#features">
              <Button size="lg" variant="ghost" className="h-12 px-4 text-base hover:bg-white/5">
                Admission Guide
              </Button>
            </a>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.l} className="glass rounded-2xl px-4 py-3">
                <div className="font-display text-2xl font-bold text-foreground">{s.v}</div>
                <div className="text-xs text-muted-foreground">{s.l}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Hero visual */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="relative mx-auto flex aspect-square w-full max-w-[520px] items-center justify-center"
        >
          <div className="absolute inset-8 rounded-full bg-[radial-gradient(circle_at_center,oklch(0.62_0.22_285/0.35),transparent_60%)] blur-2xl" />
          <motion.img
            src={heroOrb}
            alt="AI counselor orb"
            width={520}
            height={520}
            className="relative z-10 h-full w-full rounded-full object-cover ring-1 ring-white/10 glow-violet"
            animate={{ rotate: [0, 6, 0, -6, 0] }}
            transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          />
          {/* Floating chat bubble */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="glass-strong absolute -bottom-4 left-2 z-20 max-w-[260px] rounded-2xl p-3.5 text-xs sm:left-0"
          >
            <div className="mb-1.5 flex items-center gap-1.5 text-accent">
              <Sparkles className="size-3.5" /> CollegeGPT
            </div>
            <p className="leading-relaxed text-foreground/90">
              For <strong>B.Tech CSE</strong> at Acropolis you need <strong>10+2 with PCM</strong> &amp; min <strong>45%</strong>. Want me to walk through the JEE counseling steps?
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.9, duration: 0.6 }}
            className="glass absolute -top-2 right-0 z-20 flex items-center gap-2 rounded-full px-3 py-1.5 text-xs text-foreground/90"
          >
            <span className="size-2 animate-pulse rounded-full bg-accent shadow-[0_0_10px_var(--cyan-glow)]" />
            AI online · avg reply 1.2s
          </motion.div>
        </motion.div>
      </section>

      {/* Suggestion cards */}
      <section id="explore" className="relative mx-auto w-full max-w-7xl px-6 pb-24">
        <div className="mb-10 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-3xl font-bold sm:text-4xl">
              Ask anything. Get clarity in seconds.
            </h2>
            <p className="mt-2 max-w-xl text-muted-foreground">
              Tap a topic to jump straight into the counselor — or just type your question.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {suggestions.map((s, i) => (
            <Link
              key={s.title}
              to="/chat"
              search={{ q: s.title }}
              className="group glass relative overflow-hidden rounded-2xl p-5 transition-all hover:-translate-y-1 hover:border-white/20"
            >
              <div className="absolute inset-0 -z-10 opacity-0 transition-opacity group-hover:opacity-100"
                   style={{ background: "linear-gradient(135deg, oklch(0.62 0.22 285 / 0.18), oklch(0.78 0.15 200 / 0.12))" }} />
              <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-[oklch(0.62_0.22_285)]/30 to-[oklch(0.78_0.15_200)]/20 ring-1 ring-white/10">
                <s.icon className="size-5 text-accent" />
              </div>
              <h3 className="font-display text-lg font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
              <div className="mt-4 inline-flex items-center gap-1 text-sm text-accent/90 opacity-0 transition-opacity group-hover:opacity-100">
                Ask now <ArrowRight className="size-3.5" />
              </div>
              {i === 0 && <span className="sr-only">First card</span>}
            </Link>
          ))}
        </div>
      </section>

      {/* Features strip */}
      <section id="features" className="relative mx-auto w-full max-w-7xl px-6 pb-28">
        <div className="glass-strong grid gap-8 rounded-3xl p-8 sm:p-12 lg:grid-cols-3">
          {[
            { icon: Zap, t: "Instant, accurate replies", d: "Trained on Acropolis admission policies, fee structures, and placement data." },
            { icon: Mic, t: "Voice-first interaction", d: "Talk to the counselor. Hear the answer back. Hands-free guidance." },
            { icon: ShieldCheck, t: "Trusted source", d: "Always points you to the official Admission Cell for final confirmation." },
          ].map((f) => (
            <div key={f.t} className="flex flex-col gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10">
                <f.icon className="size-5 text-accent" />
              </div>
              <h3 className="font-display text-xl font-semibold">{f.t}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      <footer id="about" className="border-t border-white/5 py-10">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
          <AcropolisLogo />
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Acropolis Institute of Technology &amp; Research · CollegeGPT
          </p>
        </div>
      </footer>
    </div>
  );
}
