import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Shell } from "@/components/shell";
import { HOW_TO } from "@/lib/playbook/constants";
import { moveSlug } from "@/lib/playbook/helpers";

export const Route = createFileRoute("/moves")({ component: MovesPage });

function MovesPage() {
  const [q, setQ] = useState("");
  const items = useMemo(() => {
    const rows = Object.entries(HOW_TO).map(([name, how]) => ({ name, how, slug: moveSlug(name) }));
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(s) || r.how.toLowerCase().includes(s));
  }, [q]);

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (!hash) return;
    const el = document.getElementById(hash);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <Shell>
      <p className="text-xs font-medium tracking-[0.18em] text-muted uppercase">Moves</p>
      <h1 className="font-display mt-2 text-4xl font-semibold tracking-tight">How to do it</h1>
      <p className="mt-2 text-muted">Tap a lift name in the book. Land here. Brace, full range, stop 2–3 reps short.</p>
      <input
        className="field mt-6"
        placeholder="Search a pattern"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div className="mt-6 grid gap-3">
        {items.map((m) => (
          <section
            key={m.slug}
            id={m.slug}
            className="scroll-mt-28 rounded-lg bg-surface p-5 shadow-[var(--shadow-border)]"
          >
            <h2 className="font-display text-2xl font-semibold">{m.name}</h2>
            <ol className="mt-3 grid gap-1.5 text-sm text-muted">
              <li>Brace.</li>
              <li>{m.how}</li>
              <li>Stop 2–3 reps short.</li>
            </ol>
            <a
              className="mt-3 inline-flex min-h-11 items-center text-sm text-sport hover:underline"
              href={`https://www.youtube.com/results?search_query=${encodeURIComponent(m.name + " how to form")}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Watch a demo
            </a>
          </section>
        ))}
      </div>
    </Shell>
  );
}
