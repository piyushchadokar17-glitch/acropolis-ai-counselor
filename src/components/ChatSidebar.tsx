import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Plus,
  MessageSquare,
  Trash2,
  BookOpen,
  GraduationCap,
  Wallet,
  Briefcase,
  Building2,
  Bell,
  Library,
  Phone,
  Home as HomeIcon,
  LogIn,
  LogOut,
  User as UserIcon,
} from "lucide-react";
import type { ChatThread } from "@/hooks/use-threads";
import { AcropolisLogo } from "@/components/AcropolisLogo";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

const nav = [
  { icon: BookOpen, label: "Admission Guide" },
  { icon: GraduationCap, label: "Courses" },
  { icon: Wallet, label: "Scholarships" },
  { icon: Briefcase, label: "Placements" },
  { icon: Building2, label: "Hostel" },
  { icon: Bell, label: "Notices" },
  { icon: Library, label: "Departments" },
  { icon: Phone, label: "Contact" },
];

export function ChatSidebar({
  threads,
  activeId,
  onNew,
  onDelete,
  onPickTopic,
}: {
  threads: ChatThread[];
  activeId: string | undefined;
  onNew: () => void;
  onDelete: (id: string) => void;
  onPickTopic: (topic: string) => void;
}) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  return (
    <aside className="relative z-20 hidden h-full w-72 shrink-0 flex-col border-r border-white/5 bg-[oklch(0.11_0.04_265)]/80 backdrop-blur-xl md:flex">
      <div className="flex items-center justify-between p-4">
        <AcropolisLogo />
      </div>

      <div className="mx-3 mb-3 flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.025] px-3 py-2 text-[11px] text-muted-foreground">
        <span className="relative flex size-2">
          <span className="absolute inset-0 animate-ping rounded-full bg-accent/60" />
          <span className="relative size-2 rounded-full bg-accent shadow-[0_0_8px_var(--cyan-glow)]" />
        </span>
        AI counselor · online
      </div>

      <div className="px-3">
        <button
          onClick={onNew}
          className="group flex w-full items-center gap-2 rounded-xl bg-gradient-to-r from-[oklch(0.62_0.22_285)] to-[oklch(0.78_0.15_200)] px-3.5 py-2.5 text-sm font-semibold text-white shadow-[0_0_25px_oklch(0.62_0.22_285/0.45)] transition-all hover:scale-[1.01] hover:shadow-[0_0_35px_oklch(0.62_0.22_285/0.65)]"
        >
          <Plus className="size-4 transition-transform group-hover:rotate-90" />
          New Chat
        </button>
      </div>


      <div className="mt-5 flex-1 overflow-y-auto scrollbar-thin px-2 pb-4">
        <div className="px-2 pb-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Chat History
        </div>
        <ul className="flex flex-col gap-1">
          {threads.map((t) => {
            const active = t.id === activeId;
            return (
              <li key={t.id} className="group/row relative">
                <div
                  onClick={() => navigate({ to: "/chat/$threadId", params: { threadId: t.id } })}
                  className={cn(
                    "flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-white/10 text-foreground ring-1 ring-accent/40 shadow-[0_0_20px_oklch(0.78_0.15_200/0.15)]"
                      : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
                  )}
                >
                  <MessageSquare className={cn("size-3.5 shrink-0", active && "text-accent")} />
                  <span className="truncate">{t.title}</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(t.id);
                  }}
                  aria-label="Delete chat"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground opacity-0 transition hover:bg-white/10 hover:text-destructive group-hover/row:opacity-100"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </li>
            );
          })}
        </ul>

        <div className="mt-6 px-2 pb-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Quick Topics
        </div>
        <ul className="flex flex-col gap-0.5">
          {nav.map((n) => (
            <li key={n.label}>
              <button
                onClick={() => onPickTopic(n.label)}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
              >
                <n.icon className="size-3.5" /> {n.label}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="border-t border-white/5 p-3 space-y-1">
        <AccountRow />
        <Link
          to="/"
          className={cn(
            "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition hover:bg-white/5 hover:text-foreground",
            pathname === "/" && "text-foreground",
          )}
        >
          <HomeIcon className="size-3.5" /> Back to home
        </Link>
      </div>
    </aside>
  );
}

function AccountRow() {
  const { user, signOut } = useAuth();
  if (!user) {
    return (
      <Link
        to="/auth"
        className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition hover:bg-white/5 hover:text-foreground"
      >
        <LogIn className="size-3.5" /> Sign in to sync
      </Link>
    );
  }
  return (
    <div className="flex items-center gap-2 rounded-lg px-2 py-2">
      <div className="grid size-7 place-items-center rounded-full bg-gradient-to-br from-[oklch(0.62_0.22_285)] to-[oklch(0.78_0.15_200)] text-white">
        <UserIcon className="size-3.5" />
      </div>
      <div className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{user.email}</div>
      <button
        onClick={() => signOut()}
        aria-label="Sign out"
        className="rounded p-1 text-muted-foreground hover:bg-white/10 hover:text-foreground"
      >
        <LogOut className="size-3.5" />
      </button>
    </div>
  );
}
