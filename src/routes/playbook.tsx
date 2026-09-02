import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Mail, Printer } from "lucide-react";
import { Shell } from "@/components/shell";
import { Badge, Button, Card, Stat } from "@/components/ui";
import { CHAPTERS, FASTING_LENGTHS } from "@/lib/playbook/constants";
import { parseISODate } from "@/lib/playbook/helpers";
import { SAMPLE_INTAKE } from "@/lib/playbook/sample";
import { vitaminSlug } from "@/lib/playbook/vitaminCards";
import { sendCoachCopy, type CoachMailStatus } from "@/lib/playbook/beta-mail";
import { usePlaybookStore } from "@/lib/playbook/store";
import type { Playbook, Plate, Session } from "@/lib/playbook/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/playbook")({ component: PlaybookPage });

function PlaybookPage() {
  const navigate = useNavigate();
  const book = usePlaybookStore((s) => s.book);
  const loadSample = usePlaybookStore((s) => s.loadSample);
  const startNewIntake = usePlaybookStore((s) => s.startNewIntake);
  const markHydrated = usePlaybookStore((s) => s.markHydrated);
  const hydrated = usePlaybookStore((s) => s.hydrated);
  const [chapter, setChapter] = useState("01");
  const [coachMail, setCoachMail] = useState<CoachMailStatus>("idle");

  useEffect(() => {
    void Promise.resolve(usePlaybookStore.persist.rehydrate()).then(() => markHydrated());
  }, [markHydrated]);

  if (!hydrated) {
    return (
      <Shell>
        <p className="text-muted">Opening the book…</p>
      </Shell>
    );
  }

  if (!book) {
    return (
      <Shell>
        <h1 className="font-display text-4xl font-semibold">No playbook yet</h1>
        <p className="mt-2 text-muted">Fill the intake, or open the sample month.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/intake">
            <Button>Start intake</Button>
          </Link>
          <Button variant="ghost" onClick={() => loadSample(SAMPLE_INTAKE)}>
            Load sample
          </Button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell wide>
      <div className="no-print mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium tracking-[0.18em] text-muted uppercase">Playbook</p>
          <h1 className="font-display mt-1 text-4xl font-semibold tracking-tight">{book.who.name || "Your month"}</h1>
          {book.who.email ? <p className="mt-1 text-sm text-muted">{book.who.email}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="ghost"
            onClick={() => {
              startNewIntake();
              void navigate({ to: "/intake" });
            }}
          >
            New intake
          </Button>
          <Button variant="ghost" onClick={() => window.print()}>
            <Printer className="size-4" /> Print
          </Button>
          <Button
            variant="ghost"
            disabled={coachMail === "sending"}
            onClick={() => {
              const intake = usePlaybookStore.getState().intake;
              setCoachMail("sending");
              void sendCoachCopy(intake, book).then(setCoachMail);
            }}
          >
            <Mail className="size-4" /> Email to coach
          </Button>
        </div>
      </div>
      {coachMail === "sending" ? <p className="no-print mb-4 text-sm text-muted">Sending the book to the coach…</p> : null}
      {coachMail === "sent" ? <p className="no-print mb-4 text-sm text-muted">Sent to pduffy22@gmail.com. Open the HTML → Print → Save as PDF if you want a PDF.</p> : null}
      {coachMail === "limited" ? <p className="no-print mb-4 text-sm text-add">Inbox helper hit a rate limit. Wait and tap again.</p> : null}
      {coachMail === "error" ? <p className="no-print mb-4 text-sm text-add">Did not send. Check spam or tap again.</p> : null}

      <nav className="no-print sticky top-14 z-10 -mx-4 mb-8 flex gap-1 overflow-x-auto bg-background/92 px-4 py-2 backdrop-blur-sm">
        {CHAPTERS.map(([num, title]) => (
          <button
            key={num}
            type="button"
            onClick={() => {
              setChapter(num);
              document.getElementById(`ch-${num}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            className={cn(
              "min-h-11 shrink-0 rounded-sm px-3 text-xs font-medium tracking-wide uppercase",
              chapter === num ? "bg-foreground text-primary-fg" : "text-muted",
            )}
          >
            {num} {title}
          </button>
        ))}
      </nav>

      <article className="grid gap-16 print-sheet">
        <Cover book={book} />
        <Snapshot book={book} />
        <Calendar book={book} />
        <Exercise book={book} />
        <Energy book={book} />
        <Fasting book={book} />
        <Guide book={book} />
        <Sources book={book} />
      </article>
    </Shell>
  );
}

function ChapterHead({ num, title, blurb }: { num: string; title: string; blurb: string }) {
  return (
    <header id={`ch-${num}`} className="scroll-mt-28">
      <div className="flex items-baseline gap-3">
        <span className="font-display text-2xl font-semibold text-sport">{num}</span>
        <h2 className="font-display text-3xl font-semibold tracking-wide">{title}</h2>
      </div>
      <p className="mt-1 text-sm text-muted">{blurb}</p>
      <div className="mt-4 h-px bg-line" />
    </header>
  );
}

function Cover({ book }: { book: Playbook }) {
  return (
    <section className="rounded-xl bg-surface p-6 shadow-[var(--shadow-border)] sm:p-10">
      <p className="text-xs font-medium tracking-[0.22em] text-muted uppercase">30 Day Fitness Playbook</p>
      <h2 className="font-display mt-3 text-5xl leading-none font-semibold">{book.who.name || "You"}</h2>
      {book.who.email ? <p className="mt-2 text-sm text-muted">{book.who.email}</p> : null}
      <p className="mt-6 max-w-2xl text-lg text-pretty">{book.opening_note}</p>
      {!book.honest_cut ? (
        <p className="mt-4 text-sm text-add">Honest cut. The printed number keeps the muscle.</p>
      ) : null}
      {book.assumptions.length ? (
        <p className="mt-4 text-xs text-faint">{book.assumptions.join(" ")}</p>
      ) : null}
    </section>
  );
}

function WeekStrip({ days }: { days: Playbook["week"]["days"] }) {
  const order: string[] = [];
  const grouped = new Map<string, typeof days>();
  for (const d of days) {
    if (!grouped.has(d.key)) {
      grouped.set(d.key, []);
      order.push(d.key);
    }
    grouped.get(d.key)!.push(d);
  }
  return (
    <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
      {order.map((key) => {
        const slots = grouped.get(key) ?? [];
        const label = slots[0]?.label?.replace(/\s*·\s*2$/, "") || key;
        return (
          <div key={key} className="rounded-lg bg-surface p-3 shadow-[var(--shadow-border)]">
            <div className="text-xs font-medium tracking-wide text-muted uppercase">{label}</div>
            {slots.map((d, i) => (
              <div key={`${d.label}-${d.type}-${i}`} className={i ? "mt-2 border-t border-line pt-2" : "mt-1"}>
                <div className="font-display text-xl font-semibold">{d.kind === "R" ? "Off" : d.type}</div>
                <div className="mt-1 text-xs text-faint">{d.kind === "R" ? "Rest" : `${d.minutes} min · ${d.when}`}</div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function Snapshot({ book }: { book: Playbook }) {
  const n = book.numbers;
  const fills = n.water_fills;
  return (
    <section>
      <ChapterHead num="01" title="SNAPSHOT" blurb="Who they are this month. Vitamins. Water. The week." />
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <Stat
            label="Protein"
            value={n.protein_g ? `${n.protein_g[0]}–${n.protein_g[1]}` : "—"}
            sub={n.protein_mid ? `${n.protein_mid} g mid · ${n.protein_meals?.join(" / ")}` : undefined}
          />
        </Card>
        <Card>
          <Stat
            label="Water"
            value={n.water_oz_rest ? `${n.water_oz_rest}` : "—"}
            sub={
              n.water_oz_train
                ? `train ${n.water_oz_train} oz · ${fills?.[0] ?? "—"}–${fills?.[1] ?? "—"} fills of ${book.water.mug_oz} oz`
                : undefined
            }
          />
        </Card>
        <Card>
          <Stat
            label={book.who.month_intent === "push" ? "Surplus month" : book.who.month_intent === "maintain" ? "Hold" : "Honest 30-day cut"}
            value={n.cut_lb_30d && n.cut_lb_30d[1] ? `${n.cut_lb_30d[0]}–${n.cut_lb_30d[1]} lb` : book.calories.daily ?? "—"}
            sub={book.calories.daily ? `${book.calories.daily} kcal printed` : undefined}
          />
        </Card>
      </div>

      <WeekStrip days={book.week.days} />

      <Stack book={book} />
    </section>
  );
}

function Stack({ book }: { book: Playbook }) {
  const keep = book.stack.keep;
  const add = book.stack.add;
  return (
    <div className="mt-8">
      <p className="text-xs font-medium tracking-[0.18em] text-muted uppercase">How we changed the vitamins</p>
      <p className="mt-2 max-w-2xl text-sm text-muted">{book.why_we_changed}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {keep.map((item, i) => (
          <Link
            key={`keep-${item.name}-${i}`}
            to="/vitamins"
            hash={vitaminSlug(item.name)}
            className="rounded-lg bg-surface p-4 shadow-[var(--shadow-border)]"
          >
            <Badge tone="keep">Keep</Badge>
            <div className="font-display mt-1 text-xl font-semibold">{item.name}</div>
            <p className="text-sm text-muted">
              {item.dose} · {item.when}
            </p>
            <p className="mt-1 text-sm">{item.why}</p>
            <p className="mt-2 text-xs text-sport">Why this month →</p>
          </Link>
        ))}
        {add.map((item, i) => (
          <Link
            key={`add-${item.name}-${i}`}
            to="/vitamins"
            hash={vitaminSlug(item.name)}
            className="rounded-lg bg-surface p-4 shadow-[var(--shadow-border)]"
          >
            <Badge tone="add">Add</Badge>
            <div className="font-display mt-1 text-xl font-semibold">{item.name}</div>
            <p className="text-sm text-muted">
              {item.dose} · {item.when}
            </p>
            <p className="mt-1 text-sm">{item.why}</p>
            <p className="mt-2 text-xs text-sport">Why this month →</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Calendar({ book }: { book: Playbook }) {
  const cal = book.calendar;
  const entries = cal ? Object.entries(cal) : [];
  return (
    <section>
      <ChapterHead num="02" title="30 DAYS" blurb="One line per day. Sport is the sport." />
      {!entries.length ? (
        <p className="mt-4 text-muted">Set a start date on the intake to print the calendar.</p>
      ) : (
        <ol className="mt-6 grid gap-1 sm:grid-cols-2">
          {entries.map(([iso, label]) => (
            <li key={iso} className="flex items-baseline justify-between gap-3 rounded-sm px-2 py-2">
              <span className="text-sm text-muted tabular-nums">{iso}</span>
              <span className="font-medium">{label}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function RunGuide({ guide }: { guide: NonNullable<Playbook["exercise"]["run_guide"]> }) {
  return (
    <div className="mt-8 rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
      <p className="text-xs font-medium tracking-[0.18em] text-muted uppercase">After the week</p>
      <h3 className="font-display mt-1 text-2xl font-semibold">{guide.label} add-on</h3>
      <p className="mt-2 text-sm text-muted">
        Goal {guide.goal}
        {guide.now ? ` · now ${guide.now}` : ""}
        {guide.race ? ` · ${guide.race}` : ""}. {guide.days_per_week} run days. Start near {guide.start_miles} miles.
      </p>
      <ol className="mt-4 grid gap-3">
        {guide.weeks.map((w) => (
          <li key={w.week} className="border-t border-line pt-3">
            <p className="font-medium">Week {w.week} · {w.miles} miles</p>
            <p className="text-sm text-muted">{w.easy}</p>
            <p className="text-sm text-muted">Quality: {w.quality}</p>
            <p className="text-sm text-muted">Long: {w.long}</p>
            {w.fourth ? <p className="text-sm text-muted">Fourth: {w.fourth}</p> : null}
          </li>
        ))}
      </ol>
      <ul className="mt-4 grid gap-1 text-sm text-muted">
        {guide.rules.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
    </div>
  );
}

function Exercise({ book }: { book: Playbook }) {
  return (
    <section>
      <ChapterHead num="03" title="EXERCISE" blurb="The week you built. Minutes you can give." />
      <div className="mt-6 grid gap-4">
        {book.exercise.sessions.map((s, i) => (
          <SessionCard key={`${s.key}-${s.when}-${i}`} session={s} />
        ))}
      </div>
      {book.exercise.run_guide ? <RunGuide guide={book.exercise.run_guide} /> : null}
    </section>
  );
}

function SessionCard({ session }: { session: Session }) {
  return (
    <div className="rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <div className="text-xs font-medium tracking-wide text-muted uppercase">{session.label}</div>
          <h3 className="font-display text-2xl font-semibold">{session.title}</h3>
        </div>
        <p className="text-sm text-muted">
          {session.kind === "R" ? "Off" : `${session.minutes} min · ${session.when}`}
        </p>
      </div>
      {session.note ? <p className="mt-2 text-sm text-muted">{session.note}</p> : null}
      {session.work.length ? (
        <ul className="mt-4 grid gap-2">
          {session.work.map((w, i) => (
            <li key={`${w.slug}-${i}`} className="flex flex-wrap items-baseline justify-between gap-2 border-t border-line pt-2">
              <Link to="/moves" hash={w.slug} className="font-medium hover:text-sport">
                {w.move}
              </Link>
              <span className="text-sm text-muted">
                {w.sets} × {w.reps}
                {w.cue ? ` · ${w.cue}` : ""}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function Energy({ book }: { book: Playbook }) {
  const food = book.food;
  const meals = food.menu;
  return (
    <section>
      <ChapterHead num="04" title="ENERGY" blurb="Protein first. Meals in ounces and cups." />
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <Stat label="Daily" value={book.calories.daily ?? "—"} sub="kcal printed" />
        </Card>
        <Card>
          <Stat label="Rest day" value={book.calories.rest_day ?? "—"} sub={book.calories.floored ? "safe minimum for the month" : "days you do not train"} />
        </Card>
        <Card>
          <Stat label="Train day" value={book.calories.train_day_kcal ?? "—"} sub={`${Math.round((book.calories.eatback || 0) * 100)}% eat-back`} />
        </Card>
      </div>
      <p className="mt-4 max-w-3xl text-sm text-muted">{book.calories.note}</p>
      {food.macros ? (
        <div className="mt-6 grid grid-cols-3 gap-3">
          <Stat label="Protein" value={`${food.macros.protein_g} g`} sub={`${food.macros.protein_kcal} kcal`} />
          <Stat label="Fat" value={`${food.macros.fat_g} g`} sub={`${food.macros.fat_kcal} kcal`} />
          <Stat label="Carb" value={`${food.macros.carb_g} g`} sub={`${food.macros.carb_kcal} kcal`} />
        </div>
      ) : null}
      {food.eggs?.line ? <p className="mt-4 text-sm">{food.eggs.line}</p> : null}
      {food.menu?.budget ? <p className="mt-2 text-sm text-muted">{food.menu.budget}</p> : null}
      {food.menu?.variety ? <p className="mt-2 text-sm text-muted">{food.menu.variety}</p> : null}

      <div className="mt-8 grid gap-6">
        {(["breakfast", "lunch", "dinner"] as const).map((slot) => {
          const list = meals?.[slot] as Plate[] | undefined;
          if (!list?.length) return null;
          return (
            <div key={slot}>
              <p className="text-xs font-medium tracking-[0.18em] text-muted uppercase">{slot}</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {list.map((p, i) => (
                  <div key={`${slot}-${i}`} className="rounded-lg bg-surface p-4 shadow-[var(--shadow-border)]">
                    <div className="font-display text-lg font-semibold">{p.title}</div>
                    <ul className="mt-2 grid gap-1 text-sm">
                      {p.items.map((item, i) => (
                        <li key={`${p.title}-${i}`}>{item}</li>
                      ))}
                    </ul>
                    <p className="mt-3 text-xs text-faint">
                      {p.protein_g} g protein{p.kcal ? ` · ${p.kcal} kcal` : ""}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-6 text-sm">
        <Link to="/meal" className="text-sport underline-offset-2 hover:underline">
          Open the meal builder
        </Link>{" "}
        with the same USDA household numbers.
      </p>
    </section>
  );
}

function niceDay(iso?: string) {
  if (!iso) return "";
  const d = parseISODate(iso);
  if (!d) return iso;
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function Fasting({ book }: { book: Playbook }) {
  const f = book.fasting;
  const [open, setOpen] = useState<24 | 36 | 48 | null>(null);
  return (
    <section>
      <ChapterHead num="05" title="FASTING" blurb="Only if they asked. Sport stays fed." />
      {!f.wanted ? (
        <p className="mt-4 text-muted">No fast this month.</p>
      ) : (
        <div className="mt-6 grid gap-4">
          <p className="text-sm text-muted">
            {f.count} window{Number(f.count) === 1 ? "" : "s"} at {f.length} hours. Tap a length for what that window is doing.
          </p>
          {f.windows.length ? (
            <ul className="grid gap-3">
              {f.windows.map((w, i) => (
                <li key={w.empty} className="rounded-lg bg-surface px-4 py-4 shadow-[var(--shadow-border)]">
                  <p className="text-xs font-medium tracking-[0.16em] text-muted uppercase">Window {i + 1} · {w.hours || f.hours || f.length} hours</p>
                  <p className="mt-2 text-lg font-semibold">Start {niceDay(w.start_evening)} after dinner</p>
                  <p className="text-lg font-semibold">Break {niceDay(w.break_morning)} morning</p>
                  <p className="mt-2 text-sm text-muted">Water and salt stay on. Sport stays fed.</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-add">Wanted a fast, but no training day was free of sport.</p>
          )}
          <div className="grid gap-3 sm:grid-cols-3">
            {FASTING_LENGTHS.map((card) => {
              const on = open === card.hours;
              return (
                <button
                  key={card.hours}
                  type="button"
                  onClick={() => setOpen(on ? null : card.hours)}
                  className={cn(
                    "rounded-lg bg-surface px-4 py-4 text-left shadow-[var(--shadow-border)]",
                    on && "ring-1 ring-foreground",
                  )}
                >
                  <p className="font-display text-2xl font-semibold">{card.title}</p>
                  <p className="mt-1 text-xs text-muted">{on ? "Tap to close" : "Tap for ketones and repair"}</p>
                  {on ? (
                    <ul className="mt-3 grid gap-2 text-sm">
                      {card.bullets.map((b) => (
                        <li key={b}>• {b}</li>
                      ))}
                    </ul>
                  ) : null}
                </button>
              );
            })}
          </div>
          <ul className="grid gap-1 text-sm text-muted">
            {f.tips.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function Guide({ book }: { book: Playbook }) {
  const g = book.guide;
  const blocks = [
    ["Session", g.session],
    ["Sport", g.sport],
    ["Food", g.food],
    ["If you miss", g.miss],
    ["Vitamins", g.stack],
    ["Fast", g.fast],
  ] as const;
  return (
    <section>
      <ChapterHead num="06" title="HOW TO RUN IT" blurb="The pages win over memory." />
      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        {blocks.map(([title, lines]) => (
          <div key={title}>
            <p className="text-xs font-medium tracking-[0.18em] text-muted uppercase">{title}</p>
            <ul className="mt-3 grid gap-2 text-sm">
              {lines.filter(Boolean).map((line, i) => (
                <li key={`${title}-${i}`}>{line}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function Sources({ book }: { book: Playbook }) {
  return (
    <section>
      <ChapterHead num="07" title="SOURCES" blurb="What the numbers are allowed to say." />
      <div className="mt-6 grid gap-4">
        {book.sources.map(([title, cite, notes]) => (
          <div key={title} className="rounded-lg bg-surface p-4 shadow-[var(--shadow-border)]">
            <div className="font-display text-lg font-semibold">{title}</div>
            <p className="mt-1 text-sm text-muted">{cite}</p>
            <ul className="mt-2 grid gap-1 text-sm">
            {notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
            </ul>
          </div>
        ))}
      </div>
      {book.review?.summary ? <p className="mt-6 text-xs text-faint">{book.review.summary}</p> : null}
    </section>
  );
}
