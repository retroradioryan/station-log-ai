import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Radio, FileText, Activity, Sparkles, Settings, Waves } from "lucide-react";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/stations", label: "Stations", icon: Radio },
  { to: "/logs", label: "Daily Logs", icon: FileText },
  { to: "/live", label: "Live Monitor", icon: Activity },
  { to: "/insights", label: "AI Insights", icon: Sparkles },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function AppShell() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <aside className="w-60 shrink-0 border-r border-border bg-sidebar flex flex-col">
        <div className="px-5 py-5 flex items-center gap-2 border-b border-border">
          <div className="size-8 rounded-md bg-primary/15 grid place-items-center text-primary">
            <Waves className="size-4" />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-tight">Station Log</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Radio Intel</div>
          </div>
        </div>
        <nav className="flex-1 p-2 space-y-0.5">
          {NAV.map(({ to, label, icon: Icon, exact }) => {
            const active = exact ? path === to : path.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60"
                )}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-border text-[11px] text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-primary live-dot" />
            All systems operational
          </div>
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
      <Toaster theme="dark" position="top-right" />
    </div>
  );
}
