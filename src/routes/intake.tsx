import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { ArrowLeft, ArrowRight, Plus } from "lucide-react";
import { Shell } from "@/components/shell";
import { Badge, Button, Card, Chip, Field, Input, Select, Textarea } from "@/components/ui";
import { WEEK_TYPE, WEEK_WHEN, WEEK_MINS } from "@/lib/playbook/constants";
import { DAY_KEYS, DAY_LABELS } from "@/lib/playbook/types";
import type { Intake, Kind } from "@/lib/playbook/types";
import { targets } from "@/lib/playbook/create";
import { planCalories } from "@/lib/playbook/planning";
import { usePlaybookStore } from "@/lib/playbook/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/intake")({ component: IntakePage });

function readFtIn(form: { height?: unknown; height_ft?: unknown; height_in?: unknown }): { ft: string; inch: string } {
  if (form.height_ft) return { ft: String(form.height_ft), inch: String(form.height_in ?? "0") };
  const s = String(form.height || "").trim();
  const marked = /^(\d)\s*['’]\s*(\d{1,2})?/.exec(s);
  if (marked) return { ft: marked[1], inch: marked[2] ?? "0" };
  const n = parseFloat(s);
  if (Number.isFinite(n) && n >= 4 && n <= 7) return { ft: String(Math.floor(n)), inch: "0" };
  return { ft: "", inch: "" };
}



const SUPP_MAX = 12;

function SuppRows({
  intake,
  setField,
}: {
  intake: Intake;
  setField: (key: string, value: unknown) => void;
}) {
  const filled = Array.from({ length: SUPP_MAX }, (_, i) => i + 1).filter((i) =>
    String(intake[`supp${i}_type`] || "").trim(),
  );
  const [rows, setRows] = useState(() => Math.max(1, filled.length));
  const show = Math.min(SUPP_MAX, Math.max(rows, filled.length, 1));
  return (
    <div className="grid gap-3">
      {Array.from({ length: show }, (_, n) => n + 1).map((i) => (
        <div key={i} className="grid gap-3 sm:grid-cols-3">
          <Input
            placeholder="Type (multi, D3, creatine)"
            value={String(intake[`supp${i}_type`] || "")}
            onChange={(e) => setField(`supp${i}_type`, e.target.value)}
          />
          <Input
            placeholder="Form"
            value={String(intake[`supp${i}_form`] || "")}
            onChange={(e) => setField(`supp${i}_form`, e.target.value)}
          />
          <Input
            placeholder="Dose"
            value={String(intake[`supp${i}_dose`] || "")}
            onChange={(e) => setField(`supp${i}_dose`, e.target.value)}
          />
        </div>
      ))}
      {show < SUPP_MAX ? (
        <button
          type="button"
          className="inline-flex min-h-11 w-11 items-center justify-center rounded-sm border border-line text-muted hover:text-foreground"
          onClick={() => setRows((n) => Math.min(SUPP_MAX, show + 1))}
          aria-label="Add another vitamin"
        >
          <Plus className="size-5" />
        </button>
      ) : null}
    </div>
  );
}

const STEPS = ["You", "Month", "Week", "Train", "Kitchen", "Vitamins", "Fasting", "Review"] as const;

const STRENGTH = ["Full body", "Upper", "Lower", "Push", "Pull", "Legs", "Chest", "Back", "Shoulders", "Arms", "Core"];
const CARDIO = ["Walk", "Run", "Bike", "Row", "Swim", "Elliptical", "Stairs"];
const SPORT = ["Hockey", "Boxing", "Basketball", "Soccer", "Tennis", "Golf"];
const SPORT_FLAGS = [
  ["sport_hockey", "Hockey"],
  ["sport_boxing", "Boxing"],
  ["sport_basketball", "Basketball"],
  ["sport_soccer", "Soccer"],
  ["sport_tennis", "Tennis"],
  ["sport_golf", "Golf"],
] as const;

function typesFor(kind: Kind): string[] {
  if (kind === "S") return [...STRENGTH, ...SPORT];
  if (kind === "C") return [...CARDIO, ...SPORT];
  return ["Off", ...SPORT];
}

function emailOk(value: unknown) {
  const email = String(value || "").trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function snapMin(raw: unknown, fallback: number) {
  const n = Number(raw);
  const v = Number.isFinite(n) && n > 0 ? n : fallback;
  return WEEK_MINS.reduce((best, m) => (Math.abs(m - v) < Math.abs(best - v) ? m : best), WEEK_MINS[0]);
}

function caloriePreview(intake: Intake) {
  const weight = Number(intake.weight);
  if (!Number.isFinite(weight) || weight <= 0) return null;
  if (!parseFloat(String(intake.height_ft || "")) && !String(intake.height || "").trim()) return null;
  const meals = Math.min(6, Math.max(2, Number(intake.meals_per_day) || 3));
  const mug = Number(intake.mug_oz) || 32;
  const intent = String(intake.month_intent || "cut");
  const nums = targets(weight, mug, meals, String(intake.sex || ""), intent);
  return planCalories(intake, nums);
}

function CalorieMeter({
  rec,
  missing,
  onKeep,
  onCustom,
  choice,
}: {
  rec: number | null;
  missing: boolean;
  onKeep: () => void;
  onCustom: () => void;
  choice: string;
}) {
  const keep = choice !== "custom";
  return (
    <div className="rounded-lg bg-surface p-4 shadow-[var(--shadow-border)]">
      <p className="text-xs font-medium tracking-[0.18em] text-muted uppercase">Recommended daily calories</p>
      {missing ? (
        <p className="mt-3 text-sm text-accent">Add height and weight on You first. Keep stays off until that number exists.</p>
      ) : (
        <p className="font-display mt-2 text-5xl font-semibold tracking-tight tabular-nums">
          {rec?.toLocaleString()} <span className="text-lg text-muted">kcal</span>
        </p>
      )}
      <p className="mt-2 text-sm text-muted">
        Daily target for the week you design. Keep it or set your own.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Chip on={keep} onClick={onKeep}>
          {rec ? `Keep ${rec.toLocaleString()}` : "Keep"}
        </Chip>
        <Chip on={!keep} onClick={onCustom}>
          Custom
        </Chip>
      </div>
    </div>
  );
}

function IntakePage() {
  const navigate = useNavigate();
  const intake = usePlaybookStore((s) => s.intake);
  const book = usePlaybookStore((s) => s.book);
  const step = usePlaybookStore((s) => s.step);
  const setField = usePlaybookStore((s) => s.setField);
  const setFields = usePlaybookStore((s) => s.setFields);
  const setStep = usePlaybookStore((s) => s.setStep);
  const generate = usePlaybookStore((s) => s.generate);
  const startNewIntake = usePlaybookStore((s) => s.startNewIntake);
  const markHydrated = usePlaybookStore((s) => s.markHydrated);
  const [emailError, setEmailError] = useState(false);

  useEffect(() => {
    void Promise.resolve(usePlaybookStore.persist.rehydrate()).then(() => markHydrated());
  }, [markHydrated]);

  const cal = useMemo(() => caloriePreview(intake), [intake]);
  const rec = cal?.recommended ?? null;
  const missingStats = !Number(intake.weight) || !String(intake.height_ft || intake.height || '').trim();
  const builtThis = Boolean(book?.who?.email && intake.email && book.who.email === intake.email && book.who.name === intake.name);

  const set = (key: string) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    if (key === "email" && emailError) setEmailError(false);
    setField(key, e.target.value);
  };
  const toggle = (key: string) => () => setField(key, !intake[key]);

  function pickLean(key: "lean_strength" | "lean_cardio" | "lean_both") {
    const on = Boolean(intake[key]);
    setFields({
      lean_strength: key === "lean_strength" && !on,
      lean_cardio: key === "lean_cardio" && !on,
      lean_both: key === "lean_both" && !on,
    });
  }

  function build() {
    if (String(intake.email || "").trim() && !emailOk(intake.email)) {
      setEmailError(true);
      setStep(0);
      return;
    }
    generate();
    void navigate({ to: "/playbook" });
  }

  return (
    <Shell>
      <p className="text-xs font-medium tracking-[0.18em] text-muted uppercase">Intake</p>
      <h1 className="font-display mt-2 text-4xl font-semibold tracking-tight">Tell us the month.</h1>
      <p className="mt-2 max-w-xl text-muted">Fill this out for the month you want, not the week you already lived. Blank fields get a safe default.</p>

      {builtThis ? (
        <Card className="mt-5 p-4">
          <p className="text-sm text-pretty">This form built the last book. Start a new client so those answers do not carry over.</p>
          <Button
            variant="ghost"
            className="mt-3"
            onClick={() => {
              startNewIntake();
              setEmailError(false);
            }}
          >
            New client
          </Button>
        </Card>
      ) : null}

      <div className="no-print mt-6">
        <p className="text-xs font-medium tracking-[0.18em] text-muted uppercase">{STEPS[step]}</p>
        <div className="mt-3 flex items-center gap-2">
          {STEPS.map((label, i) => (
            <button
              key={label}
              type="button"
              aria-label={label}
              onClick={() => setStep(i)}
              className={cn(
                "h-2.5 flex-1 rounded-full",
                i === step ? "bg-foreground" : i < step ? "bg-sport" : "bg-line",
              )}
            />
          ))}
        </div>
      </div>

      <div className="mt-8 grid gap-5 pb-8">
        {step === 0 && (
          <>
            <Card className="p-4">
              <p className="text-sm text-pretty">
                This product is not a doctor. Exercise, food, and supplement advice should be reviewed by your
                physician before you run the playbook.
              </p>
              <p className="mt-2 text-xs text-muted">About 5 minutes. Have supplements and medications handy if you take them.</p>
            </Card>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name">
                <Input value={String(intake.name || "")} onChange={set("name")} placeholder="First last" autoComplete="name" />
              </Field>
              <Field label="Email" hint="Optional. Only if you want this month saved to you." htmlFor="email">
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={String(intake.email || "")}
                  onChange={set("email")}
                  placeholder="you@email.com"
                  aria-invalid={emailError}
                />
              </Field>
              {emailError ? (
                <p className="text-sm text-accent sm:col-span-2">That email does not look right.</p>
              ) : null}
              <Field label="Start date">
                <Input type="date" value={String(intake.start_date || "")} onChange={set("start_date")} />
              </Field>
              <Field label="Age">
                <Input inputMode="numeric" value={String(intake.age ?? "")} onChange={set("age")} placeholder="36" />
              </Field>
              <Field label="Sex">
                <Select value={String(intake.sex || "M")} onChange={set("sex")}>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                </Select>
              </Field>
              <Field label="Height" hint="Feet and inches.">
                <div className="grid grid-cols-2 gap-2">
                  <Select
                    value={readFtIn(intake).ft}
                    onChange={(e) => {
                      const ft = e.target.value;
                      const inch = readFtIn(intake).inch || "0";
                      setFields({ height_ft: ft, height_in: inch, height: ft ? `${ft}'${inch}"` : "" });
                    }}
                  >
                    <option value="">ft</option>
                    {[4, 5, 6, 7].map((n) => (
                      <option key={n} value={String(n)}>{n} ft</option>
                    ))}
                  </Select>
                  <Select
                    value={readFtIn(intake).inch}
                    onChange={(e) => {
                      const inch = e.target.value;
                      const ft = readFtIn(intake).ft || "5";
                      setFields({ height_ft: ft, height_in: inch, height: `${ft}'${inch}"` });
                    }}
                  >
                    <option value="">in</option>
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i} value={String(i)}>{i} in</option>
                    ))}
                  </Select>
                </div>
              </Field>
              <Field label="Weight (lb)">
                <Input inputMode="decimal" value={String(intake.weight || "")} onChange={set("weight")} placeholder="185" />
              </Field>
              <Field label="Goal weight (lb)">
                <Input inputMode="decimal" value={String(intake.goal_weight || "")} onChange={set("goal_weight")} placeholder="175" />
              </Field>
              <Field label="Sleep (hours)">
                <Input inputMode="decimal" value={String(intake.sleep_hours || "")} onChange={set("sleep_hours")} />
              </Field>
              <Field label="Job" className="sm:col-span-2">
                <Select value={String(intake.job_type || "desk")} onChange={set("job_type")}>
                  <option value="desk">Desk / sitting</option>
                  <option value="on feet">On feet (retail, nurse, server)</option>
                  <option value="physical">Physical / labor</option>
                </Select>
              </Field>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <p className="text-sm text-muted">What you want this month to do. Food and training follow this.</p>
            <Field label="This month">
              <div className="flex flex-wrap gap-2">
                {(["cut", "maintain", "push"] as const).map((k) => (
                  <Chip key={k} on={String(intake.month_intent) === k} onClick={() => setField("month_intent", k)}>
                    {k === "cut" ? "Cut" : k === "push" ? "Push" : "Hold"}
                  </Chip>
                ))}
              </div>
            </Field>
            <Field label="In your words">
              <Textarea value={String(intake.goal || "")} onChange={set("goal")} placeholder="Drop the winter layer without losing the lifts" />
            </Field>
            <Field label="Meals per day">
              <div className="flex flex-wrap gap-2">
                {[2, 3, 4, 5, 6].map((n) => (
                  <Chip key={n} on={Number(intake.meals_per_day) === n} onClick={() => setField("meals_per_day", n)}>
                    {n}
                  </Chip>
                ))}
              </div>
            </Field>
            <Field label="Meal times" hint="When you actually sit down to eat.">
              <Input
                id="meal_times"
                value={String(intake.meal_times || "")}
                onChange={set("meal_times")}
                placeholder="morning and night"
              />
            </Field>
            <CalorieMeter
              rec={rec}
              missing={missingStats}
              choice={String(intake.calorie_choice || "keep")}
              onKeep={() => setFields({ calorie_choice: "keep" })}
              onCustom={() =>
                setFields({
                  calorie_choice: "custom",
                  calorie_custom: intake.calorie_custom || rec || "",
                })
              }
            />
            {String(intake.calorie_choice) === "custom" ? (
              <Field label="Custom kcal" hint="Your number for the month.">
                <Input
                  id="calorie_custom"
                  inputMode="numeric"
                  value={String(intake.calorie_custom || "")}
                  onChange={set("calorie_custom")}
                  placeholder={rec ? String(rec) : "2100"}
                />
              </Field>
            ) : null}
            <Field label="Jug size (oz)" hint="The bottle you refill so the day is easy to count.">
              <Input inputMode="numeric" value={String(intake.mug_oz || "")} onChange={set("mug_oz")} />
            </Field>
          </>
        )}

        {step === 2 && (
          <div className="grid gap-3">
            <p className="text-sm text-muted">
              Design the week you want to run — not the one you already do. Lift, cardio, sport, or off.
              Tap + if that day also gets a second session. Two sessions is the max.
            </p>
            {DAY_KEYS.map((key, i) => {
              const kind = (String(intake[`day_${key}_sc`] || "R").toUpperCase()[0] || "R") as Kind;
              const types = typesFor(kind);
              const detail = String(intake[`day_${key}_detail`] || types[0]);
              const hasSecond = Boolean(intake[`day_${key}_sc2`]);
              const kind2 = (String(intake[`day_${key}_sc2`] || "C").toUpperCase()[0] || "C") as Kind;
              const types2 = typesFor(kind2);
              const detail2 = String(intake[`day_${key}_detail2`] || types2[0]);
              return (
                <div key={key} className="rounded-lg bg-surface p-4 shadow-[var(--shadow-border)]">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-display text-xl font-semibold">{DAY_LABELS[i]}</span>
                    <div className="flex items-center gap-1">
                      {(["S", "C", "R"] as const).map((k) => (
                        <Chip
                          key={k}
                          on={kind === k}
                          onClick={() => {
                            setField(`day_${key}_sc`, k);
                            setField(`day_${key}_detail`, typesFor(k)[0]);
                          }}
                        >
                          {k === "S" ? "Lift" : k === "C" ? "Cardio" : "Off"}
                        </Chip>
                      ))}
                      {!hasSecond ? (
                        <button
                          type="button"
                          className="ml-1 grid size-11 place-items-center rounded-sm border border-line text-xl leading-none"
                          aria-label={`Add a second session on ${DAY_LABELS[i]}`}
                          onClick={() =>
                            setFields({
                              [`day_${key}_sc2`]: "C",
                              [`day_${key}_detail2`]: "Walk",
                              [`day_${key}_when2`]: String(intake[`day_${key}_when`] || "Evening") === "Evening" ? "Morning" : "Evening",
                              [`day_${key}_min2`]: 30,
                            })
                          }
                        >
                          +
                        </button>
                      ) : null}
                    </div>
                  </div>
                  {kind !== "R" ? (
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      <Select
                        value={types.includes(detail) ? detail : types[0]}
                        onChange={(e) => setField(`day_${key}_detail`, e.target.value)}
                      >
                        {types.map((t) => (
                          <option key={t}>{t}</option>
                        ))}
                      </Select>
                      <Select value={String(intake[`day_${key}_when`] || "Evening")} onChange={(e) => setField(`day_${key}_when`, e.target.value)}>
                        {WEEK_WHEN.map((w) => (
                          <option key={w}>{w}</option>
                        ))}
                      </Select>
                      <Select value={String(snapMin(intake[`day_${key}_min`], 45))} onChange={(e) => setField(`day_${key}_min`, Number(e.target.value))}>
                        {WEEK_MINS.map((m) => (
                          <option key={m} value={m}>{m} min</option>
                        ))}
                      </Select>
                    </div>
                  ) : null}
                  {hasSecond ? (
                    <div className="mt-4 border-t border-line pt-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-medium tracking-[0.14em] text-muted uppercase">Second session</span>
                        <button
                          type="button"
                          className="min-h-11 px-2 text-sm text-muted underline"
                          onClick={() =>
                            setFields({
                              [`day_${key}_sc2`]: "",
                              [`day_${key}_detail2`]: "",
                              [`day_${key}_when2`]: "",
                              [`day_${key}_min2`]: "",
                            })
                          }
                        >
                          Remove
                        </button>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {(["S", "C"] as const).map((k) => (
                          <Chip
                            key={k}
                            on={kind2 === k}
                            onClick={() => {
                              setField(`day_${key}_sc2`, k);
                              setField(`day_${key}_detail2`, typesFor(k)[0]);
                            }}
                          >
                            {k === "S" ? "Lift" : "Cardio"}
                          </Chip>
                        ))}
                      </div>
                      <div className="mt-3 grid gap-3 sm:grid-cols-3">
                        <Select
                          value={types2.includes(detail2) ? detail2 : types2[0]}
                          onChange={(e) => setField(`day_${key}_detail2`, e.target.value)}
                        >
                          {types2.map((opt) => (
                            <option key={opt}>{opt}</option>
                          ))}
                        </Select>
                        <Select value={String(intake[`day_${key}_when2`] || "Morning")} onChange={(e) => setField(`day_${key}_when2`, e.target.value)}>
                          {WEEK_WHEN.map((w) => (
                            <option key={w}>{w}</option>
                          ))}
                        </Select>
                        <Select value={String(snapMin(intake[`day_${key}_min2`], 30))} onChange={(e) => setField(`day_${key}_min2`, Number(e.target.value))}>
                          {WEEK_MINS.map((m) => (
                            <option key={m} value={m}>{m} min</option>
                          ))}
                        </Select>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}

        {step === 3 && (
          <>
            <p className="text-sm text-muted">Where you train and what you can use, so the sessions fit you.</p>
            <Field label="Experience">
              <Select value={String(intake.experience || "intermediate")} onChange={set("experience")}>
                <option value="beginner">New</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </Select>
            </Field>
            <Field label="Where">
              <div className="flex flex-wrap gap-2">
                <Chip on={Boolean(intake.place_gym)} onClick={toggle("place_gym")}>Gym</Chip>
                <Chip on={Boolean(intake.place_home)} onClick={toggle("place_home")}>Home</Chip>
                <Chip on={Boolean(intake.place_outdoor)} onClick={toggle("place_outdoor")}>Outdoor</Chip>
                <Chip on={Boolean(intake.place_track)} onClick={toggle("place_track")}>Track</Chip>
              </div>
            </Field>
            <Field label="Lean toward">
              <div className="flex flex-wrap gap-2">
                <Chip on={Boolean(intake.lean_strength)} onClick={() => pickLean("lean_strength")}>Strength</Chip>
                <Chip on={Boolean(intake.lean_cardio)} onClick={() => pickLean("lean_cardio")}>Cardio</Chip>
                <Chip on={Boolean(intake.lean_both)} onClick={() => pickLean("lean_both")}>Both</Chip>
              </div>
            </Field>
            <Field label="Run" hint="A goal distance writes a 4-week add-on after Sunday.">
              <div className="flex flex-wrap gap-2">
                <Chip on={Boolean(intake.run_yes)} onClick={toggle("run_yes")}>I run</Chip>
              </div>
            </Field>
            {intake.run_yes ? (
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Current">
                  <Input value={String(intake.run_now || "")} onChange={set("run_now")} placeholder="easy 5k" />
                </Field>
                <Field label="Goal distance">
                  <Input value={String(intake.run_goal || "")} onChange={set("run_goal")} placeholder="10k" />
                </Field>
                <Field label="Race" hint="If you have one on the calendar.">
                  <Input value={String(intake.run_race || "")} onChange={set("run_race")} placeholder="date or name" />
                </Field>
              </div>
            ) : null}
            <Field label="Pool access">
              <div className="flex flex-wrap gap-2">
                <Chip
                  on={intake.swim_access === true || intake.swim_access === "yes"}
                  onClick={() => setField("swim_access", true)}
                >
                  Yes
                </Chip>
                <Chip
                  on={intake.swim_access === false || intake.swim_access === "no"}
                  onClick={() => setFields({ swim_access: false, swim_where: "", swim_program: "no" })}
                >
                  No
                </Chip>
              </div>
            </Field>
            {intake.swim_access ? (
              <Field label="Where">
                <div className="flex flex-wrap gap-2">
                  <Chip on={String(intake.swim_where) === "indoor pool"} onClick={() => setField("swim_where", "indoor pool")}>
                    Indoor pool
                  </Chip>
                  <Chip on={String(intake.swim_where) === "lake"} onClick={() => setField("swim_where", "lake")}>
                    Lake / open water
                  </Chip>
                </div>
              </Field>
            ) : null}
            {DAY_KEYS.some(
              (k) =>
                String(intake[`day_${k}_detail`] || "").toLowerCase().includes("swim") ||
                String(intake[`day_${k}_detail2`] || "").toLowerCase().includes("swim"),
            ) ? (
              <Field
                label="If you selected swimming as part of your weekly routine, would you like a specific routine based on the time and water type?"
                hint="Yes writes the sets on the Exercise page. No lists the day as Swim — own routine."
              >
                <div className="flex flex-wrap gap-2">
                  <Chip on={String(intake.swim_program) === "yes"} onClick={() => setField("swim_program", "yes")}>
                    Yes
                  </Chip>
                  <Chip on={String(intake.swim_program) === "no"} onClick={() => setField("swim_program", "no")}>
                    No
                  </Chip>
                </div>
              </Field>
            ) : null}
            <Field label="Sports you play" hint="Sports you play this month. Put the game itself on the week grid.">
              <div className="flex flex-wrap gap-2">
                {SPORT_FLAGS.map(([k, lab]) => (
                  <Chip key={k} on={Boolean(intake[k])} onClick={toggle(k)}>
                    {lab}
                  </Chip>
                ))}
              </div>
            </Field>
            <Field label="Other sport">
              <Input value={String(intake.sport_other || "")} onChange={set("sport_other")} placeholder="if it is not on the list" />
            </Field>
            <Field label="Equipment">
              <div className="flex flex-wrap gap-2">
                {[
                  ["eq_barbell", "Barbell"],
                  ["eq_db", "Dumbbells"],
                  ["eq_cable", "Cable"],
                  ["eq_machines", "Machines"],
                  ["eq_bands", "Bands"],
                  ["eq_body", "Bodyweight"],
                ].map(([k, lab]) => (
                  <Chip key={k} on={Boolean(intake[k])} onClick={toggle(k)}>
                    {lab}
                  </Chip>
                ))}
              </div>
            </Field>
            <Field label="Anything that hurts">
              <Input value={String(intake.hurts || "")} onChange={set("hurts")} placeholder="knee, shoulder, low back" />
            </Field>
          </>
        )}

        {step === 4 && (
          <>
            <p className="text-sm text-muted">Foods you will actually eat. The meals stay inside this list.</p>
            <Field label="Protein">
              <div className="flex flex-wrap gap-2">
                {[
                  ["prot_chicken", "Chicken"],
                  ["prot_steak", "Steak"],
                  ["prot_turkey", "Turkey"],
                  ["prot_pork", "Pork"],
                  ["prot_fish", "Fish"],
                  ["prot_shrimp", "Shrimp"],
                  ["prot_eggs", "Eggs"],
                  ["prot_veg", "Vegetarian"],
                ].map(([k, lab]) => (
                  <Chip key={k} on={Boolean(intake[k])} onClick={toggle(k)}>
                    {lab}
                  </Chip>
                ))}
              </div>
            </Field>
            <Field label="Starch">
              <div className="flex flex-wrap gap-2">
                {[
                  ["starch_rice", "Rice"],
                  ["starch_potato", "Potato"],
                  ["starch_pasta", "Pasta"],
                  ["starch_bread", "Bread"],
                  ["starch_oats", "Oats"],
                ].map(([k, lab]) => (
                  <Chip key={k} on={Boolean(intake[k])} onClick={toggle(k)}>
                    {lab}
                  </Chip>
                ))}
              </div>
            </Field>
            <Field label="Veg">
              <div className="flex flex-wrap gap-2">
                {[
                  ["veg_greens", "Greens"],
                  ["veg_broccoli", "Broccoli"],
                  ["veg_beans", "Beans"],
                  ["veg_mixed", "Mixed"],
                ].map(([k, lab]) => (
                  <Chip key={k} on={Boolean(intake[k])} onClick={toggle(k)}>
                    {lab}
                  </Chip>
                ))}
              </div>
            </Field>
            <Field label="Cook">
              <Select value={String(intake.cook_mode || "home")} onChange={set("cook_mode")}>
                <option value="home">Home</option>
                <option value="prep">Prep</option>
                <option value="out">Eat out</option>
                <option value="mix">Mix</option>
              </Select>
            </Field>
            <Field label="Dairy / whey">
              <Select value={String(intake.dairy_whey || "yes")} onChange={set("dairy_whey")}>
                <option value="yes">Fine</option>
                <option value="no">Skip dairy and whey</option>
              </Select>
            </Field>
            <Field label="Allergies">
              <Input value={String(intake.allergies || "")} onChange={set("allergies")} placeholder="peanut, shellfish, gluten" />
            </Field>
            <Field label="Restrictions">
              <Input value={String(intake.restrictions || "")} onChange={set("restrictions")} />
            </Field>
            <Field label="Foods you actually like">
              <Textarea value={String(intake.likes || "")} onChange={set("likes")} />
            </Field>
          </>
        )}

        {step === 5 && (
          <>
            <Field label="Adjust the vitamins">
              <div className="flex flex-wrap gap-2">
                <Chip on={!intake.no_supps && Boolean(intake.adjust_stack !== false)} onClick={() => { setField("no_supps", false); setField("adjust_stack", true); }}>
                  Fill the gaps
                </Chip>
                <Chip on={Boolean(intake.no_supps)} onClick={() => setField("no_supps", !intake.no_supps)}>
                  Listed nothing — still give me the floor
                </Chip>
              </div>
            </Field>
            <p className="text-sm text-muted">What you already take. List it so we do not add the same thing twice.</p>
            <SuppRows intake={intake} setField={setField} />
            <Field label="Medications" hint="Write them as they are. We do not change medications.">
              <Input value={String(intake.medications || intake.meds || "")} onChange={set("medications")} />
            </Field>
          </>
        )}

        {step === 6 && (
          <>
            <p className="text-sm text-muted">Days you cannot train, and fasts you want in the month. Skip anything that is not you.</p>
            <Field label="Planned fast this month">
              <div className="flex flex-wrap gap-2">
                <Chip on={!intake.fast_yes} onClick={() => setField("fast_yes", false)}>No</Chip>
                <Chip on={Boolean(intake.fast_yes)} onClick={() => setField("fast_yes", true)}>Yes</Chip>
              </div>
            </Field>
            {intake.fast_yes ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Length">
                  <Select value={String(intake.fast_length || "24")} onChange={set("fast_length")}>
                    <option value="24">24 hours</option>
                    <option value="36">36 hours</option>
                    <option value="48">48 hours</option>
                  </Select>
                </Field>
                <Field label="How many fasting sessions" hint="Each session is the length you picked.">
                  <Select value={String(intake.fast_count || 1)} onChange={set("fast_count")}>
                    <option value="1">1</option>
                    <option value="2">2</option>
                  </Select>
                </Field>
                <Field label="Never land on" className="sm:col-span-2">
                  <Input value={String(intake.fast_never || "")} onChange={set("fast_never")} placeholder="Saturday, hockey, race day" />
                </Field>
                <Field label="History" className="sm:col-span-2">
                  <Input value={String(intake.fast_history || "")} onChange={set("fast_history")} placeholder="Blank = first fast, we go gentle" />
                </Field>
              </div>
            ) : null}
            <Field label="Blocked dates" hint="Dates you will be out. We plan around them.">
              <Input value={String(intake.blocked_dates || "")} onChange={set("blocked_dates")} />
            </Field>
            <Field label="Why blocked">
              <Input value={String(intake.blocked_why || "")} onChange={set("blocked_why")} />
            </Field>
            <Field label="Plan those days">
              <Input value={String(intake.blocked_plan || "")} onChange={set("blocked_plan")} placeholder="walk only" />
            </Field>
            <Field label="Food on blocked days">
              <Input
                id="blocked_food"
                value={String(intake.blocked_food || "")}
                onChange={set("blocked_food")}
                placeholder="protein + starch + veg from a menu"
              />
            </Field>
            <Field label="Notes">
              <Textarea value={String(intake.notes || "")} onChange={set("notes")} />
            </Field>
          </>
        )}

        {step === 7 && (
          <div className="grid gap-4">
            <div className="grid gap-2">
              {STEPS.slice(0, 7).map((label, i) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setStep(i)}
                  className="rounded-lg bg-surface px-4 py-3 text-left shadow-[var(--shadow-border)]"
                >
                  <p className="text-xs font-medium tracking-[0.16em] text-muted uppercase">{label}</p>
                  <p className="mt-1 text-sm">
                    {i === 0
                      ? `${intake.name || "Name"} · ${intake.height || "height"} · ${intake.weight || "—"} lb`
                      : i === 1
                        ? `${intake.month_intent || "cut"} · ${intake.meals_per_day || 3} meals`
                        : i === 2
                          ? "Week you designed"
                          : i === 3
                            ? "How you train"
                            : i === 4
                              ? "Kitchen"
                              : i === 5
                                ? intake.no_supps
                                  ? "No current vitamins"
                                  : "Vitamins listed"
                                : intake.fast_yes
                                  ? `${intake.fast_count || 1} × ${intake.fast_length || 24}h`
                                  : "No fast"}
                  </p>
                </button>
              ))}
            </div>
            <p className="text-lg text-pretty">
              {intake.name || "You"}
              {intake.email ? ` · ${intake.email}` : ""}. {intake.month_intent || "cut"} month. {intake.weight || "—"} lb
              {intake.goal_weight ? ` → ${intake.goal_weight}` : ""}. Meals {intake.meals_per_day || 3}
              {intake.meal_times ? ` · ${intake.meal_times}` : ""}. Jug {intake.mug_oz || 32} oz.
            </p>
            {String(intake.email || "").trim() && !emailOk(intake.email) ? (
              <p className="text-sm text-accent">That email does not look right.</p>
            ) : null}
            <CalorieMeter
              rec={rec}
              missing={missingStats}
              choice={String(intake.calorie_choice || "keep")}
              onKeep={() => setFields({ calorie_choice: "keep" })}
              onCustom={() =>
                setFields({
                  calorie_choice: "custom",
                  calorie_custom: intake.calorie_custom || rec || "",
                })
              }
            />
            {String(intake.calorie_choice) === "custom" ? (
              <Field label="Custom kcal">
                <Input
                  inputMode="numeric"
                  value={String(intake.calorie_custom || "")}
                  onChange={set("calorie_custom")}
                  placeholder={rec ? String(rec) : "2100"}
                />
              </Field>
            ) : null}
            <p className="text-sm text-muted">
              Look this over. The week you designed — including second sessions — sets the daily target.
            </p>
            <Button onClick={build} className="w-full sm:w-auto">
              Build the playbook
              <ArrowRight className="size-4" />
            </Button>
          </div>
        )}
      </div>

      <div className="no-print sticky bottom-0 z-20 -mx-4 mt-10 border-t border-line bg-background/95 px-4 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Button variant="ghost" className="min-w-24" disabled={step === 0} onClick={() => setStep(Math.max(0, step - 1))}>
            <ArrowLeft className="size-4" /> Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button
              className="flex-1"
              onClick={() => {
                if (step === 0 && String(intake.email || "").trim() && !emailOk(intake.email)) {
                  setEmailError(true);
                  return;
                }
                setStep(Math.min(STEPS.length - 1, step + 1));
              }}
            >
              Next <ArrowRight className="size-4" />
            </Button>
          ) : (
            <p className="flex-1 text-sm text-muted">Build is on this screen.</p>
          )}
        </div>
      </div>
    </Shell>
  );
}
