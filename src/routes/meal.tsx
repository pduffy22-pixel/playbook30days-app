import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Shell } from "@/components/shell";
import { Button, Card, Stat } from "@/components/ui";
import { FOOD_FACTS, type FoodFact } from "@/lib/playbook/constants";
import { usePlaybookStore } from "@/lib/playbook/store";

export const Route = createFileRoute("/meal")({ component: MealPage });

type Line = { key: string; n: number };

const GROUPS: { label: string; when: string }[] = [
  { label: "Breakfast", when: "breakfast" },
  { label: "Lunch", when: "lunch" },
  { label: "Dinner", when: "dinner" },
  { label: "Snack", when: "snack" },
];

function MealPage() {
  const book = usePlaybookStore((s) => s.book);
  const [when, setWhen] = useState("breakfast");
  const [lines, setLines] = useState<Line[]>([]);
  const [extras, setExtras] = useState<Record<string, FoodFact>>({});
  const [custom, setCustom] = useState({ name: "", kcal: "", p: "", c: "", f: "" });

  const db = { ...FOOD_FACTS, ...extras };

  const foods = useMemo(
    () => Object.entries(FOOD_FACTS).filter(([, f]) => f.when.includes(when)),
    [when],
  );

  const totals = lines.reduce(
    (acc, line) => {
      const f = db[line.key];
      if (!f) return acc;
      acc.kcal += f.kcal * line.n;
      acc.p += f.p * line.n;
      acc.c += f.c * line.n;
      acc.f += f.f * line.n;
      return acc;
    },
    { kcal: 0, p: 0, c: 0, f: 0 },
  );

  function add(key: string) {
    setLines((prev) => {
      const found = prev.find((l) => l.key === key);
      const step = db[key]?.step || 1;
      if (found) return prev.map((l) => (l.key === key ? { ...l, n: round(l.n + step) } : l));
      return [...prev, { key, n: step }];
    });
  }
  function bump(key: string, dir: number) {
    setLines((prev) =>
      prev
        .map((l) => {
          if (l.key !== key) return l;
          const step = db[key]?.step || 1;
          return { ...l, n: round(l.n + dir * step) };
        })
        .filter((l) => l.n > 0),
    );
  }

  const slot = book?.food.slots.find((s) => s.name.toLowerCase().includes(when === "snack" ? "snack" : when));
  const cap = slot?.kcal ?? book?.calories?.daily ?? null;
  const built = Math.round(totals.kcal);
  const kcalTone =
    cap == null || built === 0
      ? "text-foreground"
      : built <= cap
        ? "text-keep"
        : "text-accent";

  return (
    <Shell>
      <p className="text-xs font-medium tracking-[0.18em] text-muted uppercase">Meal builder</p>
      <h1 className="font-display mt-2 text-4xl font-semibold tracking-tight">Build a sitting</h1>
      <p className="mt-2 text-muted">USDA household units. Same numbers as the meals in the book.</p>

      <div className="mt-6 flex flex-wrap gap-2">
        {GROUPS.map((g) => (
          <button
            key={g.when}
            type="button"
            onClick={() => setWhen(g.when)}
            className={
              when === g.when
                ? "min-h-11 rounded-sm bg-foreground px-3 text-sm text-primary-fg"
                : "min-h-11 rounded-sm px-3 text-sm text-muted"
            }
          >
            {g.label}
          </button>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <Stat
            label="kcal"
            value={<span className={kcalTone}>{built}</span>}
            sub={cap != null ? (built <= cap ? `at or under ${cap}` : `over ${cap}`) : undefined}
          />
        </Card>
        <Card>
          <Stat label="Protein" value={`${Math.round(totals.p)} g`} sub={slot ? `target ${slot.protein_g} g` : undefined} />
        </Card>
        <Card>
          <Stat label="Carbs" value={`${Math.round(totals.c)} g`} />
        </Card>
        <Card>
          <Stat label="Fat" value={`${Math.round(totals.f)} g`} />
        </Card>
      </div>

      {lines.length ? (
        <ul className="mt-6 grid gap-2">
          {lines.map((l) => {
            const f = db[l.key];
            if (!f) return null;
            return (
              <li key={l.key} className="flex items-center gap-3 rounded-md bg-surface px-3 py-2 shadow-[var(--shadow-border)]">
                <span className="flex-1 text-sm">
                  {f.name}
                  <span className="ml-2 text-muted">
                    {l.n} {f.unit}
                    {l.n === 1 ? "" : "s"}
                  </span>
                </span>
                <button type="button" className="grid size-11 place-items-center text-muted" onClick={() => bump(l.key, -1)} aria-label="less">
                  <Minus className="size-4" />
                </button>
                <button type="button" className="grid size-11 place-items-center text-muted" onClick={() => bump(l.key, 1)} aria-label="more">
                  <Plus className="size-4" />
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-6 text-sm text-muted">Tap a food. Amounts move by the household step on the label.</p>
      )}

      <h2 className="font-display mt-10 text-2xl font-semibold">Foods</h2>
      <div className="mt-3 grid gap-2">
        {foods.map(([key, f]) => (
          <FoodRow key={key} fact={f} onAdd={() => add(key)} />
        ))}
      </div>

      <h2 className="font-display mt-10 text-2xl font-semibold">Your own food</h2>
      <p className="text-sm text-muted">Type the label numbers. We add it to this sitting only.</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-5">
        <input className="field sm:col-span-2" placeholder="Name" value={custom.name} onChange={(e) => setCustom({ ...custom, name: e.target.value })} />
        <input className="field" placeholder="kcal" inputMode="numeric" value={custom.kcal} onChange={(e) => setCustom({ ...custom, kcal: e.target.value })} />
        <input className="field" placeholder="P g" inputMode="decimal" value={custom.p} onChange={(e) => setCustom({ ...custom, p: e.target.value })} />
        <input className="field" placeholder="C g" inputMode="decimal" value={custom.c} onChange={(e) => setCustom({ ...custom, c: e.target.value })} />
      </div>
      <div className="mt-2 flex gap-2">
        <input className="field max-w-32" placeholder="F g" inputMode="decimal" value={custom.f} onChange={(e) => setCustom({ ...custom, f: e.target.value })} />
        <Button
          variant="ghost"
          onClick={() => {
            if (!custom.name) return;
            const key = `custom_${Date.now()}`;
            const fact: FoodFact = {
              name: custom.name,
              kcal: Number(custom.kcal) || 0,
              p: Number(custom.p) || 0,
              c: Number(custom.c) || 0,
              f: Number(custom.f) || 0,
              unit: "serving",
              step: 1,
              when: "breakfast lunch dinner snack",
            };
            setExtras((prev) => ({ ...prev, [key]: fact }));
            setLines((prev) => [...prev, { key, n: 1 }]);
            setCustom({ name: "", kcal: "", p: "", c: "", f: "" });
          }}
        >
          Add
        </Button>
      </div>
      <p className="mt-8 text-xs text-faint">Meal numbers: USDA FoodData Central, household servings, rounded. fdc.nal.usda.gov</p>
    </Shell>
  );
}

function FoodRow({ fact, onAdd }: { fact: FoodFact; onAdd: () => void }) {
  return (
    <button
      type="button"
      onClick={onAdd}
      className="flex min-h-14 items-center justify-between gap-3 rounded-md bg-surface px-4 text-left shadow-[var(--shadow-border)]"
    >
      <span>
        <span className="block font-medium">{fact.name}</span>
        <span className="text-xs text-muted">
          {fact.kcal} kcal · {fact.p} g P · per {fact.unit}
        </span>
      </span>
      <Plus className="size-4 text-sport" />
    </button>
  );
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}
