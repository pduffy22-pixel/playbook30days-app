import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowRight, BookOpen, Dumbbell, UtensilsCrossed } from "lucide-react";
import { Shell } from "@/components/shell";
import { Button, Card } from "@/components/ui";
import { CHAPTERS } from "@/lib/playbook/constants";
import { SAMPLE_INTAKE } from "@/lib/playbook/sample";
import { usePlaybookStore } from "@/lib/playbook/store";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const navigate = useNavigate();
  const book = usePlaybookStore((s) => s.book);
  const intake = usePlaybookStore((s) => s.intake);
  const loadSample = usePlaybookStore((s) => s.loadSample);
  const startNewIntake = usePlaybookStore((s) => s.startNewIntake);
  const markHydrated = usePlaybookStore((s) => s.markHydrated);
  const hydrated = usePlaybookStore((s) => s.hydrated);
  const hasDraft = Boolean(String(intake.email || intake.name || "").trim());

  useEffect(() => {
    void Promise.resolve(usePlaybookStore.persist.rehydrate()).then(() => markHydrated());
  }, [markHydrated]);

  return (
    <Shell wide>
      <section className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
        <div>
          <img
            src="/lockup.png"
            alt="30 Day Fitness Playbook"
            className="h-16 w-auto max-w-[min(100%,22rem)] object-contain object-left sm:h-20"
          />
          <h1 className="font-display mt-5 text-5xl leading-[0.92] font-semibold tracking-tight sm:text-7xl">
            Your rules.
            <br />
            Your results.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted text-pretty">
            Answer the form. Get a month that is actually yours — protein, water, sessions, meals, and
            vitamins. Not a template week. Not a calorie fairy tale.
          </p>
          <p className="mt-3 max-w-xl text-xs text-faint">
            © 2026 30 Day Fitness Playbook™. The form and planning rules are ours. Have a physician look at the month before you run it.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button
              className="w-full sm:w-auto"
              onClick={() => {
                if (book) startNewIntake();
                void navigate({ to: "/intake" });
              }}
            >
              {book ? "New intake" : hasDraft ? "Continue intake" : "Start the intake"}
              <ArrowRight className="size-4" />
            </Button>
            <Button
              variant="ghost"
              className="w-full sm:w-auto"
              onClick={() => {
                loadSample(SAMPLE_INTAKE);
                void navigate({ to: "/playbook" });
              }}
            >
              Preview a sample month
            </Button>
          </div>
          {hydrated && book?.who?.name ? (
            <p className="mt-4 text-sm text-muted">
              Last book on this device: {book.who.name}
              {book.who.email ? ` · ${book.who.email}` : ""}.{" "}
              <Link to="/playbook" className="text-sport underline-offset-2 hover:underline">
                Open it
              </Link>
            </p>
          ) : null}
        </div>
        <Card className="p-6">
          <p className="text-xs font-medium tracking-[0.18em] text-muted uppercase">What you get</p>
          <ul className="mt-4 grid gap-4">
            {[
              { icon: BookOpen, t: "Seven chapters", d: "Snapshot, your month, training, food, fasting if you asked, how to run it, and where the numbers came from." },
              { icon: Dumbbell, t: "Sessions designed for you", d: "The week you built. Minutes you can give. Time well spent." },
              { icon: UtensilsCrossed, t: "Meals done your way", d: "Meals from the foods you checked, in ounces and cups you can cook." },
            ].map((row) => (
              <li key={row.t} className="flex gap-3">
                <row.icon className="mt-0.5 size-5 shrink-0 text-sport" strokeWidth={1.75} />
                <div>
                  <div className="font-medium">{row.t}</div>
                  <p className="text-sm text-muted">{row.d}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      <section className="mt-16">
        <p className="text-xs font-medium tracking-[0.18em] text-muted uppercase">The book</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {CHAPTERS.map(([num, title, blurb]) => (
            <div key={num} className="flex gap-4 rounded-lg bg-surface px-4 py-4 shadow-[var(--shadow-border)]">
              <span className="font-display text-2xl font-semibold text-sport">{num}</span>
              <div>
                <div className="font-display text-lg font-semibold tracking-wide">{title}</div>
                <p className="text-sm text-muted">{blurb}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </Shell>
  );
}
