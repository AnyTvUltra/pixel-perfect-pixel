import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { LayoutDashboard, Users, Camera, Receipt, Settings, ScanFace } from "lucide-react";

const nav = [
  { to: "/", label: "الرئيسية", icon: LayoutDashboard },
  { to: "/people", label: "الأشخاص", icon: Users },
  { to: "/camera", label: "الكاميرا", icon: Camera },
  { to: "/payments", label: "الدفعات", icon: Receipt },
  { to: "/settings", label: "الإعدادات", icon: Settings },
] as const;

export function AppShell({ title, actions, children }: { title: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="border-sidebar-border bg-sidebar text-sidebar-foreground md:sticky md:top-0 md:h-screen md:w-60 md:border-l">
        <div className="flex items-center gap-2 px-5 py-4">
          <div className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            <ScanFace className="size-5" />
          </div>
          <span className="text-lg font-bold">رقيب المحاسب</span>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: n.to === "/" }}
              className="flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              activeProps={{ className: "bg-sidebar-accent !text-sidebar-primary font-semibold" }}
            >
              <n.icon className="size-4" />
              {n.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-4 md:p-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">{title}</h1>
          {actions}
        </div>
        {children}
      </main>
    </div>
  );
}

export function Stat({ label, value, tone = "primary" }: { label: string; value: ReactNode; tone?: "primary" | "success" | "warning" | "destructive" }) {
  const tones = { primary: "text-primary", success: "text-success", warning: "text-warning", destructive: "text-destructive" };
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className={`mt-2 text-3xl font-bold ${tones[tone]}`}>{value}</div>
    </div>
  );
}
