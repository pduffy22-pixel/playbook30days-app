import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { usePlaybookStore } from "@/lib/playbook/store";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/intake", label: "Intake" },
  { to: "/playbook", label: "Playbook" },
  { to: "/meal", label: "Meal" },
  { to: "/moves", label: "Moves" },
] as const;

export function Shield({ className }: { className?: string }) {
  return (
    <img src="/brand-shield.svg?v=81" alt="" className={cn("h-11 w-9 object-contain", className)} />
  );
}

export function Shell({ children, wide }: { children: ReactNode; wide?: boolean }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const markHydrated = usePlaybookStore((s) => s.markHydrated);
  useEffect(() => {
    void Promise.resolve(usePlaybookStore.persist.rehydrate()).then(() => markHydrated());
  }, [markHydrated]);
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="stripe no-print" />
      <header className="no-print sticky top-0 z-20 border-b border-line bg-background/92 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <Link to="/" className="flex min-h-11 items-center gap-2.5">
            <Shield />
            <span className="font-display text-lg font-semibold leading-none tracking-wide">
              30 DAY <span className="font-medium text-muted">PLAYBOOK</span>
            </span>
          </Link>
          <nav className="ml-auto flex items-center gap-1 overflow-x-auto">
            {NAV.map((item) => {
              const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "inline-flex min-h-11 items-center px-2.5 text-sm",
                    active ? "text-foreground" : "text-muted hover:text-foreground",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className={cn("mx-auto px-4 py-8", wide ? "max-w-5xl" : "max-w-3xl")}>{children}</main>
      <footer className="no-print mx-auto max-w-5xl px-4 py-10 text-xs leading-relaxed text-faint">
        © 2026 30 Day Fitness Playbook™. All rights reserved. Not medical care. A physician should review training, food, and vitamins before you run the month.
      </footer>
    </div>
  );
}
