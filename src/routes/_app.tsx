import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";

export const Route = createFileRoute("/_app")({
  component: () => (
    <div className="dark">
      <AppShell />
    </div>
  ),
});

// Force outlet usage
void Outlet;
