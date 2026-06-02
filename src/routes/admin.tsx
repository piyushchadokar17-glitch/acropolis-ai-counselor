import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Users,
  MessageSquare,
  FileText,
  BookOpen,
  Megaphone,
  Upload,
  TrendingUp,
  Sparkles,
  Search,
  Loader2,
  Pin,
  Trash2,
  Download,
  Mail,
  Phone,
  Plus,
  LogOut,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

const ADMIN_EMAIL = "piyushchadokar06@gmail.com";
const ADMIN_BYPASS_KEY = "collegegpt:adminBypass";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard — CollegeGPT" },
      { name: "description", content: "Manage student inquiries, notices, courses and uploads." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminGate,
});

function AdminGate() {
  const [state, setState] = useState<"checking" | "ok" | "unauth" | "forbidden">("checking");

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      const { data: userRes } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!userRes.user) {
        setState("unauth");
        return;
      }
      const { data: roleRow, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userRes.user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (cancelled) return;
      if (error || !roleRow) setState("forbidden");
      else setState("ok");
    };
    void check();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      void check();
    });
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  if (state === "checking") {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-muted-foreground">
        <div className="flex items-center gap-3 text-sm">
          <Loader2 className="size-4 animate-spin" /> Verifying admin access…
        </div>
      </div>
    );
  }

  if (state === "unauth") {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-4 text-center">
        <div className="glass-strong max-w-md rounded-3xl p-8 ring-1 ring-white/10">
          <h1 className="font-display text-2xl font-bold">Admin sign-in required</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Please sign in with your admin account to access the dashboard.
          </p>
          <Link
            to="/auth"
            className="mt-5 inline-flex rounded-xl bg-gradient-to-r from-[oklch(0.62_0.22_285)] to-[oklch(0.78_0.15_200)] px-5 py-2.5 text-sm font-semibold text-white"
          >
            Go to sign in
          </Link>
        </div>
      </div>
    );
  }

  if (state === "forbidden") {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-4 text-center">
        <div className="glass-strong max-w-md rounded-3xl p-8 ring-1 ring-white/10">
          <h1 className="font-display text-2xl font-bold">Access denied</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your account doesn't have admin privileges. Contact the Acropolis Admission Cell if this is a mistake.
          </p>
          <Link to="/" className="mt-5 inline-flex text-sm text-accent hover:underline">
            ← Back to home
          </Link>
        </div>
      </div>
    );
  }

  return <AdminDashboard />;
}

type Lead = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  course_interest: string | null;
  message: string | null;
  source: string | null;
  created_at: string;
};

type Notice = {
  id: string;
  title: string;
  body: string | null;
  category: string | null;
  pinned: boolean;
  published_at: string;
};

type Course = {
  id: string;
  code: string;
  name: string;
  department: string | null;
  level: string | null;
  duration_years: number | null;
  fees_per_year: number | null;
  seats: number | null;
  eligibility: string | null;
  description: string | null;
};

type Pdf = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  storage_path: string;
  size_bytes: number | null;
  created_at: string;
};

function AdminDashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [pdfs, setPdfs] = useState<Pdf[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    const [l, n, c, p] = await Promise.all([
      supabase.from("leads").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("notices").select("*").order("published_at", { ascending: false }),
      supabase.from("courses").select("*").order("name"),
      supabase.from("pdf_documents").select("*").order("created_at", { ascending: false }),
    ]);
    if (l.data) setLeads(l.data as Lead[]);
    if (n.data) setNotices(n.data as Notice[]);
    if (c.data) setCourses(c.data as Course[]);
    if (p.data) setPdfs(p.data as Pdf[]);
    setLoading(false);
  };

  useEffect(() => {
    void refresh();
  }, []);

  // Analytics: leads per day for last 14 days
  const leadSeries = useMemo(() => {
    const days: { date: string; label: string; leads: number }[] = [];
    const today = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push({
        date: key,
        label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        leads: 0,
      });
    }
    const map = new Map(days.map((d) => [d.date, d]));
    for (const l of leads) {
      const k = l.created_at.slice(0, 10);
      const row = map.get(k);
      if (row) row.leads += 1;
    }
    return days;
  }, [leads]);

  const courseInterest = useMemo(() => {
    const counts = new Map<string, number>();
    for (const l of leads) {
      const k = (l.course_interest || "Undecided").trim() || "Undecided";
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [leads]);

  const stats = [
    {
      label: "Total Inquiries",
      value: leads.length,
      icon: Users,
      hint: `${leadSeries.at(-1)?.leads ?? 0} today`,
    },
    {
      label: "Active Notices",
      value: notices.length,
      icon: Megaphone,
      hint: `${notices.filter((n) => n.pinned).length} pinned`,
    },
    {
      label: "Courses",
      value: courses.length,
      icon: BookOpen,
      hint: "Catalog live",
    },
    {
      label: "PDF Resources",
      value: pdfs.length,
      icon: FileText,
      hint: "Public bucket",
    },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      {/* Aurora background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-80"
        style={{ background: "var(--gradient-aurora)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, oklch(1 0 0 / 0.06) 1px, transparent 0)",
          backgroundSize: "28px 28px",
        }}
      />

      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/40 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-[var(--shadow-glow-violet)]">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-lg font-semibold tracking-tight">
                Acropolis Admin
              </h1>
              <p className="text-xs text-muted-foreground">
                CollegeGPT control center
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
            </Button>
            <Link to="/">
              <Button size="sm" variant="ghost">Back to app</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6">
        {/* Stat cards */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card/40 p-5 backdrop-blur-xl"
            >
              <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br from-primary/30 to-accent/20 blur-2xl transition-opacity group-hover:opacity-100" />
              <div className="relative flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    {s.label}
                  </p>
                  <p className="mt-2 font-display text-3xl font-semibold">
                    {s.value}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{s.hint}</p>
                </div>
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary">
                  <s.icon className="h-5 w-5" />
                </div>
              </div>
            </motion.div>
          ))}
        </section>

        {/* Charts */}
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <GlassCard className="lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-display text-base font-semibold">Inquiries — last 14 days</h2>
                <p className="text-xs text-muted-foreground">Daily student inquiry volume</p>
              </div>
              <TrendingUp className="h-4 w-4 text-accent" />
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={leadSeries} margin={{ left: -20, right: 8, top: 8 }}>
                  <defs>
                    <linearGradient id="lg" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.7} />
                      <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.06)" />
                  <XAxis dataKey="label" stroke="oklch(0.7 0.02 260)" fontSize={11} />
                  <YAxis stroke="oklch(0.7 0.02 260)" fontSize={11} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: "oklch(0.18 0.05 268 / 0.95)",
                      border: "1px solid oklch(1 0 0 / 0.1)",
                      borderRadius: 12,
                      color: "oklch(0.97 0.01 250)",
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="leads"
                    stroke="var(--chart-1)"
                    strokeWidth={2}
                    fill="url(#lg)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>

          <GlassCard>
            <div className="mb-4">
              <h2 className="font-display text-base font-semibold">Top course interest</h2>
              <p className="text-xs text-muted-foreground">From student inquiries</p>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={courseInterest} margin={{ left: -20, right: 8, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.06)" />
                  <XAxis dataKey="name" stroke="oklch(0.7 0.02 260)" fontSize={10} interval={0} angle={-15} textAnchor="end" height={50} />
                  <YAxis stroke="oklch(0.7 0.02 260)" fontSize={11} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: "oklch(0.18 0.05 268 / 0.95)",
                      border: "1px solid oklch(1 0 0 / 0.1)",
                      borderRadius: 12,
                      color: "oklch(0.97 0.01 250)",
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="value" fill="var(--chart-2)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>
        </section>

        {/* Management tabs */}
        <Tabs defaultValue="leads" className="space-y-4">
          <TabsList className="bg-card/40 backdrop-blur-xl">
            <TabsTrigger value="leads">Leads</TabsTrigger>
            <TabsTrigger value="notices">Notices</TabsTrigger>
            <TabsTrigger value="courses">Courses</TabsTrigger>
            <TabsTrigger value="pdfs">PDFs</TabsTrigger>
          </TabsList>

          <TabsContent value="leads">
            <LeadsPanel leads={leads} loading={loading} />
          </TabsContent>
          <TabsContent value="notices">
            <NoticesPanel notices={notices} onChange={refresh} />
          </TabsContent>
          <TabsContent value="courses">
            <CoursesPanel courses={courses} onChange={refresh} />
          </TabsContent>
          <TabsContent value="pdfs">
            <PdfsPanel pdfs={pdfs} onChange={refresh} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-border/60 bg-card/40 p-5 backdrop-blur-xl ${className}`}
    >
      {children}
    </div>
  );
}

/* ---------------- Leads ---------------- */

function LeadsPanel({ leads, loading }: { leads: Lead[]; loading: boolean }) {
  const [q, setQ] = useState("");
  const filtered = leads.filter((l) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (
      l.name?.toLowerCase().includes(s) ||
      l.email?.toLowerCase().includes(s) ||
      l.course_interest?.toLowerCase().includes(s) ||
      l.phone?.toLowerCase().includes(s)
    );
  });

  const exportCsv = () => {
    const headers = ["name", "email", "phone", "course_interest", "source", "created_at"];
    const rows = filtered.map((l) =>
      headers.map((h) => JSON.stringify((l as any)[h] ?? "")).join(","),
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <GlassCard>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-semibold">Student inquiries</h2>
          <p className="text-xs text-muted-foreground">{filtered.length} of {leads.length} leads</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, email, course…"
              className="w-64 pl-8"
            />
          </div>
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="mr-2 h-4 w-4" /> CSV
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border/60">
        <div className="max-h-[480px] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-background/80 backdrop-blur">
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Interest</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                    No inquiries yet.
                  </td>
                </tr>
              ) : (
                filtered.map((l) => (
                  <tr key={l.id} className="border-t border-border/40 transition-colors hover:bg-primary/5">
                    <td className="px-4 py-3 font-medium">{l.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <div className="flex flex-col gap-0.5">
                        {l.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" /> {l.email}
                          </span>
                        )}
                        {l.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {l.phone}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {l.course_interest ? (
                        <Badge variant="secondary">{l.course_interest}</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{l.source ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(l.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </GlassCard>
  );
}

/* ---------------- Notices ---------------- */

function NoticesPanel({ notices, onChange }: { notices: Notice[]; onChange: () => void }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("");
  const [pinned, setPinned] = useState(false);
  const [busy, setBusy] = useState(false);

  const add = async () => {
    if (!title.trim()) return toast.error("Title required");
    setBusy(true);
    const { error } = await supabase.from("notices").insert({
      title: title.trim(),
      body: body.trim() || null,
      category: category.trim() || null,
      pinned,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Notice published");
    setTitle("");
    setBody("");
    setCategory("");
    setPinned(false);
    onChange();
  };

  const togglePin = async (n: Notice) => {
    const { error } = await supabase.from("notices").update({ pinned: !n.pinned }).eq("id", n.id);
    if (error) return toast.error(error.message);
    onChange();
  };

  const remove = async (n: Notice) => {
    if (!confirm(`Delete notice "${n.title}"?`)) return;
    const { error } = await supabase.from("notices").delete().eq("id", n.id);
    if (error) return toast.error(error.message);
    toast.success("Notice deleted");
    onChange();
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
      <GlassCard className="lg:col-span-2">
        <h2 className="mb-3 font-display text-base font-semibold">Publish a notice</h2>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Admissions open for 2026 batch" />
          </div>
          <div>
            <Label className="text-xs">Category</Label>
            <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="admissions, events, exams…" />
          </div>
          <div>
            <Label className="text-xs">Body</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Details…" rows={5} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
            Pin to top
          </label>
          <Button onClick={add} disabled={busy} className="w-full">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="mr-2 h-4 w-4" /> Publish</>}
          </Button>
        </div>
      </GlassCard>

      <GlassCard className="lg:col-span-3">
        <h2 className="mb-3 font-display text-base font-semibold">Notices ({notices.length})</h2>
        <div className="max-h-[480px] space-y-3 overflow-auto pr-1">
          {notices.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">No notices yet.</p>
          )}
          {notices.map((n) => (
            <div key={n.id} className="rounded-xl border border-border/60 bg-background/30 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {n.pinned && <Pin className="h-3.5 w-3.5 text-accent" />}
                    <h3 className="font-medium">{n.title}</h3>
                    {n.category && <Badge variant="secondary" className="text-[10px]">{n.category}</Badge>}
                  </div>
                  {n.body && <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{n.body}</p>}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(n.published_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button size="icon" variant="ghost" onClick={() => togglePin(n)} title="Toggle pin">
                    <Pin className={`h-4 w-4 ${n.pinned ? "text-accent" : ""}`} />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(n)} title="Delete">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

/* ---------------- Courses ---------------- */

function CoursesPanel({ courses, onChange }: { courses: Course[]; onChange: () => void }) {
  const [form, setForm] = useState({
    code: "",
    name: "",
    department: "",
    level: "",
    duration_years: "",
    fees_per_year: "",
    seats: "",
    eligibility: "",
    description: "",
  });
  const [busy, setBusy] = useState(false);

  const add = async () => {
    if (!form.code.trim() || !form.name.trim()) return toast.error("Code and name required");
    setBusy(true);
    const { error } = await supabase.from("courses").insert({
      code: form.code.trim(),
      name: form.name.trim(),
      department: form.department.trim() || null,
      level: form.level.trim() || null,
      duration_years: form.duration_years ? Number(form.duration_years) : null,
      fees_per_year: form.fees_per_year ? Number(form.fees_per_year) : null,
      seats: form.seats ? Number(form.seats) : null,
      eligibility: form.eligibility.trim() || null,
      description: form.description.trim() || null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Course added");
    setForm({ code: "", name: "", department: "", level: "", duration_years: "", fees_per_year: "", seats: "", eligibility: "", description: "" });
    onChange();
  };

  const remove = async (c: Course) => {
    if (!confirm(`Delete ${c.code}?`)) return;
    const { error } = await supabase.from("courses").delete().eq("id", c.id);
    if (error) return toast.error(error.message);
    onChange();
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
      <GlassCard className="lg:col-span-2">
        <h2 className="mb-3 font-display text-base font-semibold">Add course</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Code</Label>
            <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="BTECH-CSE" />
          </div>
          <div>
            <Label className="text-xs">Level</Label>
            <Input value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} placeholder="UG / PG" />
          </div>
          <div className="col-span-2">
            <Label className="text-xs">Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="B.Tech Computer Science" />
          </div>
          <div className="col-span-2">
            <Label className="text-xs">Department</Label>
            <Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder="Engineering" />
          </div>
          <div>
            <Label className="text-xs">Duration (yrs)</Label>
            <Input type="number" value={form.duration_years} onChange={(e) => setForm({ ...form, duration_years: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Seats</Label>
            <Input type="number" value={form.seats} onChange={(e) => setForm({ ...form, seats: e.target.value })} />
          </div>
          <div className="col-span-2">
            <Label className="text-xs">Fees / year (INR)</Label>
            <Input type="number" value={form.fees_per_year} onChange={(e) => setForm({ ...form, fees_per_year: e.target.value })} />
          </div>
          <div className="col-span-2">
            <Label className="text-xs">Eligibility</Label>
            <Input value={form.eligibility} onChange={(e) => setForm({ ...form, eligibility: e.target.value })} placeholder="10+2 with PCM, 60%+" />
          </div>
          <div className="col-span-2">
            <Label className="text-xs">Description</Label>
            <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="col-span-2">
            <Button onClick={add} disabled={busy} className="w-full">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="mr-2 h-4 w-4" /> Add course</>}
            </Button>
          </div>
        </div>
      </GlassCard>

      <GlassCard className="lg:col-span-3">
        <h2 className="mb-3 font-display text-base font-semibold">Catalog ({courses.length})</h2>
        <div className="max-h-[520px] space-y-2 overflow-auto pr-1">
          {courses.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">No courses yet.</p>
          )}
          {courses.map((c) => (
            <div key={c.id} className="flex items-start justify-between gap-3 rounded-xl border border-border/60 bg-background/30 p-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="font-mono text-[10px]">{c.code}</Badge>
                  <span className="font-medium">{c.name}</span>
                  {c.level && <Badge variant="secondary" className="text-[10px]">{c.level}</Badge>}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {[
                    c.department,
                    c.duration_years && `${c.duration_years} yrs`,
                    c.seats && `${c.seats} seats`,
                    c.fees_per_year && `₹${c.fees_per_year.toLocaleString()}/yr`,
                  ].filter(Boolean).join(" • ")}
                </p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => remove(c)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

/* ---------------- PDFs ---------------- */

function PdfsPanel({ pdfs, onChange }: { pdfs: Pdf[]; onChange: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);

  const upload = async () => {
    if (!file) return toast.error("Pick a PDF first");
    if (!title.trim()) return toast.error("Title required");
    setBusy(true);
    setProgress(20);
    const path = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { error: upErr } = await supabase.storage.from("pdfs").upload(path, file, {
      contentType: file.type || "application/pdf",
      upsert: false,
    });
    if (upErr) {
      setBusy(false);
      setProgress(0);
      return toast.error(upErr.message);
    }
    setProgress(70);
    const { error } = await supabase.from("pdf_documents").insert({
      title: title.trim(),
      description: description.trim() || null,
      category: category.trim() || null,
      storage_path: path,
      size_bytes: file.size,
    });
    setBusy(false);
    setProgress(100);
    if (error) return toast.error(error.message);
    toast.success("PDF uploaded");
    setFile(null);
    setTitle("");
    setCategory("");
    setDescription("");
    setTimeout(() => setProgress(0), 600);
    onChange();
  };

  const publicUrl = (path: string) =>
    supabase.storage.from("pdfs").getPublicUrl(path).data.publicUrl;

  const remove = async (p: Pdf) => {
    if (!confirm(`Delete "${p.title}"?`)) return;
    await supabase.storage.from("pdfs").remove([p.storage_path]);
    const { error } = await supabase.from("pdf_documents").delete().eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    onChange();
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
      <GlassCard className="lg:col-span-2">
        <h2 className="mb-3 font-display text-base font-semibold">Upload PDF</h2>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Admission Brochure 2026" />
          </div>
          <div>
            <Label className="text-xs">Category</Label>
            <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="brochure, syllabus, fees…" />
          </div>
          <div>
            <Label className="text-xs">Description</Label>
            <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div>
            <label
              htmlFor="pdf-file"
              className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/80 bg-background/30 p-6 text-center transition-colors hover:border-primary/60 hover:bg-primary/5"
            >
              <Upload className="h-6 w-6 text-accent" />
              <span className="text-sm">
                {file ? file.name : "Click to choose a PDF"}
              </span>
              {file && (
                <span className="text-xs text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </span>
              )}
            </label>
            <input
              id="pdf-file"
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          {progress > 0 && (
            <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full bg-gradient-to-r from-primary to-accent transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
          <Button onClick={upload} disabled={busy} className="w-full">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Upload className="mr-2 h-4 w-4" /> Upload</>}
          </Button>
        </div>
      </GlassCard>

      <GlassCard className="lg:col-span-3">
        <h2 className="mb-3 font-display text-base font-semibold">Library ({pdfs.length})</h2>
        <div className="grid max-h-[520px] grid-cols-1 gap-3 overflow-auto pr-1 sm:grid-cols-2">
          {pdfs.length === 0 && (
            <p className="col-span-full py-8 text-center text-sm text-muted-foreground">
              No PDFs uploaded yet.
            </p>
          )}
          {pdfs.map((p) => (
            <div key={p.id} className="group rounded-xl border border-border/60 bg-background/30 p-4 transition-colors hover:border-primary/40">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-medium">{p.title}</h3>
                  {p.category && (
                    <Badge variant="secondary" className="mt-1 text-[10px]">{p.category}</Badge>
                  )}
                  {p.description && (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{p.description}</p>
                  )}
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    {p.size_bytes ? `${(p.size_bytes / 1024 / 1024).toFixed(2)} MB` : ""}
                    {p.size_bytes ? " • " : ""}
                    {new Date(p.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-end gap-1">
                <a href={publicUrl(p.storage_path)} target="_blank" rel="noreferrer">
                  <Button variant="outline" size="sm">
                    <Download className="mr-2 h-3.5 w-3.5" /> View
                  </Button>
                </a>
                <Button size="icon" variant="ghost" onClick={() => remove(p)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
