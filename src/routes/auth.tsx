import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { AcropolisLogo } from "@/components/AcropolisLogo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({ component: AuthPage });

function AuthPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) nav({ to: "/chat" });
    });
  }, [nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: name },
          },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      nav({ to: "/chat" });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setErr(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/chat",
    });
    if (result.error) setErr(String(result.error));
  };

  return (
    <div className="relative grid min-h-screen place-items-center bg-[oklch(0.10_0.04_265)] px-4">
      <div className="pointer-events-none absolute inset-0 chat-aurora opacity-60" />
      <div className="glass-strong relative z-10 w-full max-w-md rounded-3xl p-7 ring-1 ring-white/10 shadow-[0_0_60px_oklch(0.62_0.22_285/0.25)]">
        <div className="mb-5 flex items-center justify-center">
          <AcropolisLogo variant="lockup" />
        </div>
        <h1 className="text-center font-display text-2xl font-bold">
          {mode === "signin" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          {mode === "signin" ? "Sign in to sync your conversations." : "Save your CollegeGPT chats across devices."}
        </p>

        <button
          onClick={google}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-white/95 px-4 py-2.5 text-sm font-medium text-gray-900 transition hover:bg-white"
        >
          <Sparkles className="size-4" /> Continue with Google
        </button>

        <div className="my-5 flex items-center gap-3 text-[10px] uppercase tracking-widest text-muted-foreground">
          <div className="h-px flex-1 bg-white/10" /> or <div className="h-px flex-1 bg-white/10" />
        </div>

        <form onSubmit={submit} className="flex flex-col gap-3">
          {mode === "signup" && (
            <input
              required
              type="text"
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-xl bg-white/5 px-4 py-2.5 text-sm outline-none ring-1 ring-white/10 placeholder:text-muted-foreground/70 focus:ring-accent/50"
            />
          )}
          <input
            required
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-xl bg-white/5 px-4 py-2.5 text-sm outline-none ring-1 ring-white/10 placeholder:text-muted-foreground/70 focus:ring-accent/50"
          />
          <input
            required
            minLength={6}
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-xl bg-white/5 px-4 py-2.5 text-sm outline-none ring-1 ring-white/10 placeholder:text-muted-foreground/70 focus:ring-accent/50"
          />
          {err && <p className="text-xs text-destructive">{err}</p>}
          <button
            disabled={busy}
            className={cn(
              "mt-1 rounded-xl bg-gradient-to-r from-[oklch(0.62_0.22_285)] to-[oklch(0.78_0.15_200)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_0_25px_oklch(0.62_0.22_285/0.45)] transition hover:shadow-[0_0_35px_oklch(0.62_0.22_285/0.65)]",
              busy && "opacity-60",
            )}
          >
            {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-muted-foreground">
          {mode === "signin" ? "New here? " : "Already have an account? "}
          <button
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="text-accent hover:underline"
          >
            {mode === "signin" ? "Create one" : "Sign in"}
          </button>
        </p>
        <p className="mt-3 text-center text-[11px] text-muted-foreground">
          <Link to="/" className="hover:text-foreground">← Back to home</Link>
        </p>
      </div>
    </div>
  );
}
