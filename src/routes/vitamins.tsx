import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { Shell } from "@/components/shell";
import { VITAMIN_CARDS } from "@/lib/playbook/vitaminCards";

export const Route = createFileRoute("/vitamins")({ component: VitaminsPage });

function VitaminsPage() {
  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (!hash) return;
    const el = document.getElementById(hash);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <Shell>
      <p className="text-xs font-medium tracking-[0.18em] text-muted uppercase">Vitamins</p>
      <h1 className="font-display mt-2 text-4xl font-semibold tracking-tight">Why it is on the month</h1>
      <p className="mt-2 max-w-xl text-muted">
        Tap a vitamin in the playbook. Land here. Coverage for a 30-day cut or lift block — not a prescription.
      </p>
      <div className="mt-6 grid gap-3">
        {VITAMIN_CARDS.map((c) => (
          <section
            key={c.slug}
            id={c.slug}
            className="scroll-mt-28 rounded-lg bg-surface p-5 shadow-[var(--shadow-border)]"
          >
            <h2 className="font-display text-2xl font-semibold">{c.title}</h2>
            <ul className="mt-3 grid gap-2 text-sm">
              {c.bullets.map((b) => (
                <li key={b}>• {b}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Shell>
  );
}
