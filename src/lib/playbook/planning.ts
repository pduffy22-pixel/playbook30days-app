import type { Intake, Playbook, Session, WorkSet } from "./types";
import {
  SPORT_DAYS,
  STRENGTH_MENUS,
  HOW_TO,
  CARDIO_MENUS,
  HURT_DROPS,
  HARD_SETS_PER_MUSCLE_WEEK_GROW,
  HARD_SETS_PER_MUSCLE_WEEK_MAINTAIN,
  STRENGTH_SESSIONS_MIN,
  MOVE_BASE,
  MET_BY_TYPE,
  MET_STRENGTH_DEFAULT,
  MET_CARDIO_DEFAULT,
  EATBACK_CUT,
  EATBACK_HOLD,
  EATBACK_PUSH,
  KCAL_PER_LB,
  DAYS_PLAN,
  MARGINS,
  FASTING_KEY,
} from "./constants";
import {
  formWeek,
  kg,
  num,
  intNum,
  truthy,
  sexKey,
  parseHeightCm,
  parseFormHeightCm,
  parseISODate,
  toISO,
  addDays,
  mondayIndex,
  moveSlug,
  moveUrl,
  firstName,
  parseCalLabel,
  labelHasSport,
} from "./helpers";

export function equipment(form: Intake): string[] {
  const flags: Record<string, unknown> = {
    barbell: form.eq_barbell,
    dumbbell: form.eq_db,
    cable: form.eq_cable,
    machine: form.eq_machines,
    band: form.eq_bands,
    bodyweight: form.eq_body,
  };
  let have = Object.entries(flags)
    .filter(([, on]) => truthy(on))
    .map(([name]) => name);
  if (!have.length) {
    if (truthy(form.place_gym)) have = ["barbell", "dumbbell", "cable", "machine"];
    else if (truthy(form.place_home)) have = ["dumbbell", "band", "bodyweight"];
    else have = ["bodyweight"];
  }
  return have;
}

function setsFor(minutes: number, experience: string, intent: string): number {
  let sets = minutes >= 40 ? 3 : 2;
  if (["new", "beginner", "novice"].includes(experience.toLowerCase())) sets = Math.min(sets, 2);
  if (intent === "push" && minutes >= 45) sets = 3;
  return sets;
}

export function planWeek(form: Intake) {
  const days = formWeek(form);
  const sDays = days.filter((d) => d.kind === "S").length;
  const cDays = days.filter((d) => d.kind === "C").length;
  const sports = days.filter((d) => SPORT_DAYS.has(d.type));
  return {
    days,
    strength_days: sDays,
    cardio_days: cDays,
    sport_days: sports.map((d) => `${d.label} ${d.type}`),
    note: "Sport days are the sport. Do not add a lift under them.",
  };
}

export function planExercise(form: Intake) {
  const days = formWeek(form);
  let intent = String(form.month_intent || form.lean || "cut").toLowerCase();
  if (truthy(form.lean_cardio) && !truthy(form.lean_strength)) intent = "cut";
  if (truthy(form.lean_strength) && !truthy(form.lean_cardio)) {
    intent = intent.includes("push") || intent.includes("gain") ? "push" : "cut";
  }
  const experience = String(form.experience || "intermediate");
  const hurts = String(form.hurts || "").toLowerCase();
  const gear = equipment(form);
  const swimWhere = String(form.swim_where || "").toLowerCase();
  const sessions: Session[] = [];
  let lastReps = "8";

  for (const d of days) {
    if (d.kind === "R") {
      sessions.push({ ...d, title: "Off", work: [], note: "Walk if you want. No programmed session." });
      continue;
    }
    if (SPORT_DAYS.has(d.type)) {
      sessions.push({
        ...d,
        title: d.type,
        work: [],
        note: `${d.type} is the session. No lift under it.`,
      });
      continue;
    }
    if (d.kind === "C") {
      const mode = d.type.toLowerCase();
      let recipe = CARDIO_MENUS[mode] || "Steady cardio for the minutes on the form.";
      if (mode.includes("swim")) {
        const swim = planSwimSession(form, d.minutes);
        sessions.push({
          ...d,
          title: swim.title,
          work: swim.work,
          note: `${d.minutes} min. ${swim.note}`,
        });
        continue;
      }
      if (mode.includes("run") && !(truthy(form.run_yes) || mode.includes("run"))) {
        recipe = "They did not ask for running. Use the cardio they picked.";
      }
      sessions.push({
        ...d,
        title: d.type,
        work: [],
        note: `${d.minutes} min. ${recipe}`,
      });
      continue;
    }
    const key = d.type.toLowerCase();
    let menu = STRENGTH_MENUS[key] || STRENGTH_MENUS["full body"];
    const sets = setsFor(d.minutes, experience, intent);
    if (d.minutes < 35) menu = menu.slice(0, 4);
    const work: WorkSet[] = [];
    for (let [name, reps, cue] of menu) {
      lastReps = reps;
      let drop = false;
      for (const [word, banned] of Object.entries(HURT_DROPS)) {
        if (hurts.includes(word) && banned.some((b) => name.toLowerCase().includes(b) || cue.toLowerCase().includes(b))) {
          drop = true;
        }
      }
      if (cue.toLowerCase().includes("barbell") && !gear.includes("barbell") && gear.includes("dumbbell")) {
        cue = cue.replace(/barbell/gi, "dumbbell");
      }
      if (drop) continue;
      work.push({
        move: name,
        sets,
        reps,
        cue,
        how: HOW_TO[name] || "Brace. Full range. Stop 2–3 reps short.",
        slug: moveSlug(name),
        url: moveUrl(name),
      });
    }
    sessions.push({
      ...d,
      title: d.type,
      work,
      note: `${sets} sets × ${lastReps}. 2 min rest on the first two moves, 90 sec after that. RPE 7–8. Cap ${d.minutes} min. If time dies, keep the first compound and leave.`,
    });
  }

  return {
    intent,
    experience,
    equipment: gear,
    hurts,
    sessions,
    volume: (intent === "push" ? HARD_SETS_PER_MUSCLE_WEEK_GROW : HARD_SETS_PER_MUSCLE_WEEK_MAINTAIN) as [number, number],
    moves_url: MOVE_BASE,
    interactive: true,
    rule: "Tap a lift name for the how-to. Cap every session to that day's minutes. Sport days are the sport.",
    tap_banner: "TAP a lift name. Phone opens the how-to card.",
    tap_chip: "INTERACTIVE  ·  tap the lift  ·  see the movement",
    tap_hint: `Blue line = link. Opens ${MOVE_BASE}`,
    run_guide: planRunGuide(form),
  };
}


function parseRunDistance(text: string): "mile" | "5k" | "10k" | "half" | "marathon" {
  const raw = String(text || "").toLowerCase().replace(/\s+/g, "");
  if (raw.includes("marathon") && !raw.includes("half")) return "marathon";
  if (raw.includes("half") || raw.includes("13.1") || raw.includes("21k")) return "half";
  if (raw.includes("10k") || raw.includes("6.2")) return "10k";
  if (raw.includes("mile") || raw.includes("1600") || raw.includes("1.6k")) return "mile";
  return "5k";
}

export function planRunGuide(form: Intake) {
  if (!truthy(form.run_yes)) return null;
  const goal = String(form.run_goal || "").trim();
  if (!goal) return null;
  const dist = parseRunDistance(`${goal} ${form.run_race || ""} ${form.run_now || ""}`);
  let exp = String(form.experience || "intermediate").toLowerCase();
  if (["new", "novice"].includes(exp)) exp = "beginner";
  if (!["beginner", "intermediate", "advanced"].includes(exp)) exp = "intermediate";
  const table: Record<string, Record<string, [number, number]>> = {
    mile: { beginner: [8, 3], intermediate: [12, 3], advanced: [16, 4] },
    "5k": { beginner: [10, 3], intermediate: [16, 3], advanced: [22, 4] },
    "10k": { beginner: [14, 3], intermediate: [22, 4], advanced: [30, 4] },
    half: { beginner: [18, 3], intermediate: [28, 4], advanced: [38, 4] },
    marathon: { beginner: [22, 4], intermediate: [32, 4], advanced: [42, 5] },
  };
  const [startMi, days] = table[dist][exp];
  const labels = { mile: "1 mile", "5k": "5K", "10k": "10K", half: "half marathon", marathon: "marathon" };
  const weeks = [];
  let miles = startMi;
  let longMi = Math.round(startMi * 0.4 * 10) / 10;
  for (let w = 1; w <= 4; w++) {
    const easy = Math.max(2, Math.round(((miles - longMi) / Math.max(1, days - 1)) * 10) / 10);
    const quality =
      dist === "mile" || dist === "5k"
        ? "6×400 m easy jog recover"
        : dist === "10k"
          ? "4×800 m easy jog recover"
          : "20 min tempo after 10 min easy";
    weeks.push({
      week: w,
      miles: Math.round(miles * 10) / 10,
      easy: `${easy} miles easy, talk test`,
      quality,
      long: `${longMi} mile long run, easy`,
      fourth: days >= 4 ? `${easy} miles easy` : null,
    });
    miles = Math.round(miles * 1.1 * 10) / 10;
    longMi = Math.round(Math.min(longMi * 1.1, miles * 0.45) * 10) / 10;
  }
  return {
    on: true,
    distance: dist,
    label: labels[dist],
    goal,
    now: String(form.run_now || "").trim() || null,
    race: String(form.run_race || "").trim() || null,
    level: exp,
    days_per_week: days,
    start_miles: startMi,
    weeks,
    rules: [
      "Park this around the week you built. Do not stack a long run on a sport day.",
      "Easy means you can talk. Quality is the only hard day.",
      "Add about 10% miles per week. If anything hurts, repeat last week.",
    ],
    source: "RRCA / ACSM running frequency. 10% weekly load cap. Higdon-style easy + quality + long.",
  };
}

export function swimWantsProgram(form: Intake) {
  const raw = String(form.swim_program || "").trim().toLowerCase();
  if (["no", "n", "pro", "false"].includes(raw)) return false;
  if (["yes", "y", "program", "true"].includes(raw)) return true;
  return truthy(form.swim_program);
}

function swimItem(move: string, sets: number, reps: string, cue: string): WorkSet {
  return { move, sets, reps, cue, how: cue, slug: moveSlug(move), url: moveUrl(move) };
}

export function planSwimSession(form: Intake, minutes: number): { title: string; note: string; work: WorkSet[] } {
  const where = String(form.swim_where || "").toLowerCase();
  const lake = where.includes("lake") || where.includes("open");
  const bucket = [30, 45, 60, 90].reduce((b, n) => (Math.abs(n - minutes) < Math.abs(b - minutes) ? n : b), 30);
  if (!swimWantsProgram(form)) {
    return {
      title: "Swim — own routine",
      note: "Own routine. Stay inside the minutes you set. We do not write the sets.",
      work: [],
    };
  }
  if (lake) {
    const work =
      bucket <= 30
        ? [
            swimItem("Easy swim", 1, "8 min", "Smooth. Face in, long exhale."),
            swimItem("Sighting swim", 1, "12 min", "Eyes up every 8–10 strokes. No wall."),
            swimItem("Easy to shore", 1, "10 min", "Settle the stroke. Walk out, do not sprint the last 20 yards."),
          ]
        : bucket <= 45
          ? [
              swimItem("Easy swim", 1, "10 min", "Warm the shoulders. Sight twice just to mark a point."),
              swimItem("Loop with sighting", 3, "8 min", "Pick a tree or buoy. Sight every 8–10 strokes."),
              swimItem("Easy to shore", 1, "11 min", "Unbroken. Finish standing, not gasping."),
            ]
          : bucket <= 60
            ? [
                swimItem("Easy swim", 1, "12 min", "Find the line. No race pace."),
                swimItem("Pickup stretch", 4, "6 min", "4 min easy, 2 min a bit quicker. Sight the whole way."),
                swimItem("Easy to shore", 1, "12 min", "Same stroke you started with."),
              ]
            : [
                swimItem("Easy swim", 1, "15 min", "Long and quiet."),
                swimItem("Open water main", 1, "50 min", "Steady. Sight every 8–10. If chop picks up, shorten the stroke."),
                swimItem("Easy to shore", 1, "25 min", "Do not race the beach."),
              ];
    return {
      title: "Swim — open water",
      note: `${bucket} min lake / open water. No wall. Sighting is the set.`,
      work,
    };
  }
  const work =
    bucket <= 30
      ? [
          swimItem("Easy swim", 1, "200", "Warm the stroke. Stop if the first 50 feels rushed."),
          swimItem("Repeat 50s", 8, "50", "Pace you can hold. 20 sec on the wall."),
          swimItem("Easy swim", 1, "100", "Shake it out."),
        ]
      : bucket <= 45
        ? [
            swimItem("Easy swim", 1, "300", "200 free + 100 your choice."),
            swimItem("Repeat 50s", 10, "50", "Same send-off. 20 sec rest."),
            swimItem("Kick or drill", 4, "25", "Board optional. Easy."),
            swimItem("Easy swim", 1, "200", "Leave with something in the tank."),
          ]
        : bucket <= 60
          ? [
              swimItem("Easy swim", 1, "400", "Build from easy to steady."),
              swimItem("Repeat 100s", 8, "100", "Hold a pace you can talk after. 20–30 sec rest."),
              swimItem("Build 50s", 4, "50", "Each one a touch quicker. Last is strong, not all-out."),
              swimItem("Easy swim", 1, "200", "Long strokes."),
            ]
          : [
              swimItem("Easy swim", 1, "500", "First 200 very easy."),
              swimItem("Repeat 100s", 10, "100", "Aerobic. 20 sec rest."),
              swimItem("Repeat 50s", 8, "50", "A bit quicker than the 100s. 15 sec rest."),
              swimItem("Easy swim", 1, "300", "Done when the stroke looks like the first 500."),
            ];
  return {
    title: "Swim — pool",
    note: `${bucket} min indoor pool. Wall rest is written into the set.`,
    work,
  };
}

export function swimSessionNote(form: Intake, minutes: number) {
  return planSwimSession(form, minutes).note;
}

export function mifflinBmr(weightLb: number, heightCm: number, age: number | null, sex: string): number {
  const k = kg(weightLb);
  const a = age ?? 35;
  let bmr = 10 * k + 6.25 * heightCm - 5 * a;
  bmr += sexKey(sex) === "M" ? 5 : -161;
  return Math.round(bmr);
}

export function occupationalPal(form: Intake): [number, string] {
  const job = String(form.job_type || "").toLowerCase();
  if (["physical", "labor", "warehouse", "build", "landscap"].some((w) => job.includes(w))) return [1.55, "physical job"];
  if (["feet", "stand", "retail", "nurse", "server", "steps"].some((w) => job.includes(w))) return [1.375, "on feet"];
  return [1.2, "desk / sitting"];
}

export function eatbackFraction(intent: string): number {
  if (intent === "push") return EATBACK_PUSH;
  if (intent === "maintain") return EATBACK_HOLD;
  return EATBACK_CUT;
}

export function metFor(sessionType: string, kind: string): number {
  const key = String(sessionType || "").trim().toLowerCase();
  if (key in MET_BY_TYPE) return MET_BY_TYPE[key];
  for (const [name, met] of Object.entries(MET_BY_TYPE)) {
    if (key.includes(name)) return met;
  }
  if (kind === "S") return MET_STRENGTH_DEFAULT;
  if (kind === "C") return MET_CARDIO_DEFAULT;
  return 1.3;
}

export function sessionKcal(weightLb: number, met: number, minutes: number) {
  const hours = Math.max(0, minutes || 0) / 60;
  const k = kg(weightLb);
  const gross = met * k * hours;
  const net = Math.max(0, (met - 1) * k * hours);
  return { met, minutes: minutes || 0, gross: Math.round(gross), net: Math.round(net) };
}

export function planBurn(form: Intake) {
  const weight = num(form.weight ?? form.weight_lb, 0);
  const days = formWeek(form);
  const rows: Session[] = [];
  let weeklyNet = 0;
  let weeklyGross = 0;
  for (const d of days) {
    if (d.kind === "R") {
      rows.push({ ...d, title: d.type, work: [], note: "", met: 1.3, gross: 0, net: 0 });
      continue;
    }
    const met = metFor(d.type, d.kind);
    const burn = weight ? sessionKcal(weight, met, d.minutes) : { met, minutes: d.minutes, gross: 0, net: 0 };
    weeklyNet += burn.net;
    weeklyGross += burn.gross;
    rows.push({ ...d, title: d.type, work: [], note: "", ...burn });
  }
  return {
    days: rows,
    weekly_net: weeklyNet,
    weekly_gross: weeklyGross,
    daily_avg_net: weeklyNet ? Math.round(weeklyNet / 7) : 0,
    formula: "kcal = MET × kg × hours. Net = (MET − 1) × kg × hours.",
    source: "Herrmann et al. 2024 Adult Compendium; Ainsworth et al. 2011 Compendium. Med Sci Sports Exerc.",
  };
}

export function planCalories(form: Intake, numbers: Playbook["numbers"]) {
  const weight = num(form.weight ?? form.weight_lb, 0);
  const goal = num(form.goal_weight, 0);
  const ageRaw = form.age;
  let age: number | null = null;
  if (ageRaw !== null && ageRaw !== undefined && ageRaw !== "") {
    const a = intNum(ageRaw, NaN);
    age = Number.isFinite(a) ? a : null;
  }
  const sex = String(form.sex || "");
  const heightCm = parseFormHeightCm(form);
  const [occFactor, occLabel] = occupationalPal(form);
  const bmr = weight && heightCm ? mifflinBmr(weight, heightCm, age, sex) : null;
  const base = bmr != null ? Math.round(bmr * occFactor) : null;
  const burn = weight
    ? planBurn(form)
    : { days: [] as Session[], weekly_net: 0, weekly_gross: 0, daily_avg_net: 0, formula: "", source: "" };
  const intent = String(form.month_intent || "cut").toLowerCase();
  const eatback = eatbackFraction(intent);
  const trainAdd = Math.round((burn.daily_avg_net || 0) * eatback);
  const maintain = base != null ? base + trainAdd : null;
  const honest = numbers.cut_lb_30d || ([0, 0] as [number, number]);
  const wanted = weight && goal && goal < weight ? Math.max(0, weight - goal) : 0;
  let plannedLb = intent === "cut" && wanted ? Math.min(wanted, honest[1]) : 0;
  let surplus = 0;
  if (intent === "push") {
    plannedLb = 0;
    surplus = intNum(MARGINS.push_surplus_kcal, 250);
  }
  let deficit = plannedLb ? Math.round((plannedLb * KCAL_PER_LB) / DAYS_PLAN) : 0;
  deficit = Math.min(deficit, MARGINS.deficit_kcal_day_max);
  if (intent === "maintain" || (intent !== "cut" && wanted === 0 && intent !== "push")) deficit = 0;
  if (intent === "push") deficit = 0;
  let rec = maintain != null ? maintain + surplus - deficit : null;
  const floor = sexKey(sex) === "M" ? MARGINS.calorie_floor_m : MARGINS.calorie_floor_f;
  let floored = false;
  if (rec != null && rec < floor) {
    rec = floor;
    floored = true;
    deficit = Math.max(0, (maintain ?? rec) - rec);
  }
  // Rest is occupational minus deficit, never under the floor.
  // Train is that rest number PLUS eat-back. Do not glue train to the floor.
  let restDay = base != null ? base - deficit + (intent === "push" ? surplus : 0) : rec;
  if (restDay != null && restDay < floor) restDay = floor;
  const dayTargets = (burn.days || []).map((d) => {
    const extra = Math.round((d.net || 0) * eatback);
    let target = restDay != null ? restDay + extra : rec;
    if (target != null && target < floor) target = floor;
    return {
      label: d.label,
      kind: d.kind,
      type: d.type,
      met: d.met,
      minutes: d.minutes,
      net_kcal: d.net,
      eatback_kcal: extra,
      daily_kcal: target,
    };
  });
  const choice = String(form.calorie_choice || "keep").trim().toLowerCase();
  let custom: number | null = null;
  const customRaw = form.calorie_custom ?? form.calories;
  if (customRaw !== null && customRaw !== undefined && customRaw !== "") {
    const c = intNum(customRaw, NaN);
    if (Number.isFinite(c)) custom = c;
  }
  let useCustom = ["custom", "change", "set", "other"].includes(choice);
  if (["keep", "recommended", ""].includes(choice)) useCustom = false;
  const final = useCustom && custom != null ? custom : rec;
  if (useCustom && custom != null) {
    restDay = custom;
    for (const row of dayTargets) {
      row.daily_kcal = custom + (row.eatback_kcal || 0);
    }
  }
  let note =
    `${final} kcal printed. Rest ${restDay}. Train days sit above rest by the eat-back slice. ` +
    `Thirty-day sketch, not a promise.`;
  if (!useCustom && floored) note += ` Hit the ${floor} kcal floor. A clinician has to sign off below that.`;
  if (useCustom && custom != null && rec != null) {
    if (custom < rec) note += ` They keyed ${custom} kcal — under the recommended ${rec}.`;
    else if (custom > rec) note += ` They keyed ${custom} kcal — over the recommended ${rec}.`;
    else note += ` They keyed ${custom} kcal, same as the recommendation.`;
    if (custom < floor) note += ` That is under the ${floor} safety floor. Printed anyway. Not approved.`;
    if (custom > rec + 400) note += ` Well over the cut line — the scale may stall.`;
  }
  const trainDays = dayTargets.filter((t) => t.kind !== "R");
  const trainDayKcal = trainDays.length
    ? Math.round(trainDays.reduce((s, t) => s + (t.daily_kcal || 0), 0) / Math.max(1, trainDays.length))
    : rec;
  return {
    bmr,
    activity: occLabel,
    activity_factor: occFactor,
    occupational: base,
    maintain,
    burn,
    eatback,
    train_add: trainAdd,
    wanted_lb_30d: wanted,
    planned_lb_30d: plannedLb,
    deficit,
    surplus,
    recommended: rec,
    rest_day: restDay,
    day_targets: dayTargets,
    floor,
    floored,
    choice: useCustom && custom != null ? "custom" : "keep",
    custom,
    daily: final,
    rest_day_kcal: restDay,
    train_day_kcal: trainDayKcal,
    note,
    rule: "Occupational TDEE plus a fraction of programmed session burn. Print rest-day and train-day. Do not eat 100% of the watch. Custom number still wins if they set one.",
  };
}

export function planWater(form: Intake, numbers: Playbook["numbers"]) {
  const mug = num(form.mug_oz ?? form.mug, 32) || 32;
  return {
    rest_oz: numbers.water_oz_rest,
    train_oz: numbers.water_oz_train,
    mug_oz: mug,
    fills: numbers.water_fills,
    rule: "32 ml/kg plus 500 ml on a training day. Count fills of their jug. Food water is not in the printed fills.",
  };
}

function fastHours(raw: unknown): number {
  const digits = String(raw || "24").replace(/\D/g, "");
  const hours = digits ? parseInt(digits, 10) : 24;
  return Math.max(16, Math.min(hours, 96));
}

function dateBlocked(day: Date, label: string, never: string, blocked: Set<string>): boolean {
  if (blocked.has(toISO(day))) return true;
  const blob = `${day.toLocaleDateString("en-US", { weekday: "long" })} ${label} ${never}`.toLowerCase();
  for (const token of never.replace(/,/g, " ").split(/\s+/).map((t) => t.trim().toLowerCase()).filter(Boolean)) {
    if (token.length >= 3 && blob.includes(token) && !["the", "and", "day", "days"].includes(token)) {
      const weekday = day.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
      if (weekday.includes(token) || String(label).toLowerCase().includes(token)) return true;
    }
  }
  return false;
}

export function placeFasts(
  form: Intake,
  calendar: Record<string, string> | null,
  count: number,
  hours: number,
): Playbook["fasting"]["windows"] {
  if (!calendar) return [];
  const calMap = calendar;
  const when = String(form.fast_when || "").trim();
  if (when) return [];
  const never = String(form.fast_never || "");
  const blocked = new Set<string>();
  for (const chunk of String(form.blocked_dates || "").replace(/,/g, " ").split(/\s+/)) {
    const c = chunk.trim();
    if (c.length >= 8 && c[4] === "-") blocked.add(c.slice(0, 10));
  }
  const dates = Object.keys(calMap)
    .map((k) => parseISODate(k))
    .filter((d): d is Date => Boolean(d))
    .sort((a, b) => a.getTime() - b.getTime());
  if (!dates.length) return [];
  const start = dates[0];
  const coreLen = hours <= 36 ? 1 : hours <= 54 ? 2 : 3;

  function score(day: Date): number | null {
    const core = Array.from({ length: coreLen }, (_, i) => addDays(day, i));
    if (core.some((d) => !(toISO(d) in calMap))) return null;
    if ((day.getTime() - start.getTime()) / 86400000 < 6) return null;
    let pts = 0;
    for (const d of core) {
      const raw = calMap[toISO(d)];
      const [kind, typ] = parseCalLabel(raw);
      if (dateBlocked(d, raw, never, blocked)) return null;
      if (labelHasSport(raw, SPORT_DAYS) || SPORT_DAYS.has(typ)) return null;
      if (kind === "R") pts -= 8;
      else if (kind === "S") pts += 6;
      else if (kind === "C") pts += 4;
    }
    return pts;
  }

  const ranked: Array<[number, Date]> = [];
  for (const d of dates) {
    const s = score(d);
    if (s != null) ranked.push([s, d]);
  }
  ranked.sort((a, b) => b[0] - a[0] || a[1].getTime() - b[1].getTime());
  const picked: Playbook["fasting"]["windows"] = [];
  const used: Date[] = [];
  const gap = hours >= 36 ? 10 : 7;
  for (const [, d] of ranked) {
    if (used.some((u) => Math.abs((d.getTime() - u.getTime()) / 86400000) < gap)) continue;
    const core = Array.from({ length: coreLen }, (_, i) => addDays(d, i));
    const fedStart = addDays(d, -1);
    const breakDay = addDays(core[core.length - 1], 1);
    picked.push({
      empty: toISO(d),
      core: core.map(toISO),
      start_evening: toISO(fedStart) in calendar ? toISO(fedStart) : toISO(d),
      break_morning: toISO(breakDay) in calendar ? toISO(breakDay) : toISO(core[core.length - 1]),
      hours,
      why: "Off sport and rest when a training day was open.",
    });
    used.push(d);
    if (picked.length >= Math.max(1, count)) break;
  }
  return picked;
}

export function planFasting(form: Intake, calendar: Record<string, string> | null): Playbook["fasting"] {
  if (!truthy(form.fast_yes)) {
    return {
      wanted: false,
      days: [],
      windows: [],
      auto_placed: false,
      tips: [],
      key: FASTING_KEY,
      rule: "They did not ask. No fast.",
    };
  }
  const length = String(form.fast_length || form.fast_hours || "24");
  const hours = fastHours(length);
  let count = intNum(form.fast_count, 1);
  count = count >= 2 ? 2 : 1;
  const never = String(form.fast_never || "");
  const history = String(form.fast_history || "");
  const when = String(form.fast_when || "").trim();
  const windows = placeFasts(form, calendar, count, hours);
  const auto = Boolean(windows.length) && !when;
  const tips: string[] = [];
  if (!history.trim()) {
    tips.push(
      "Water and salt stay on.",
      "Pause food-bound pills (multi, D, fish oil, creatine).",
      "Keep medications on the clinician's schedule.",
      "Do not land a fast on a sport day, race day, or a date they marked protected.",
      "Break the fast with protein + salt + a normal meal. Not a giant first meal.",
    );
  }
  if (auto) tips.push("We placed the fasts off sport and rest when a training day was open.");
  return {
    wanted: true,
    length,
    hours,
    count,
    never,
    when,
    history,
    new: !Boolean(history.trim()),
    windows,
    days: windows.map((w) => w.empty),
    auto_placed: auto,
    tips,
    key: FASTING_KEY,
    rule: "1 or 2 sessions at the length they picked. Skip sport and rest days when a lift or cardio day is open.",
  };
}

export function planSportFuel(week: ReturnType<typeof planWeek>) {
  const out: { label?: string; type: string; when?: string; note: string }[] = [];
  for (const d of week.days) {
    if (!SPORT_DAYS.has(d.type)) continue;
    const when = String(d.when || "").toLowerCase();
    let eat = "Eat the sitting nearest this session. Sport day stays fed.";
    if (when.startsWith("morn")) eat = "Eat after. Do not skip the later meal.";
    else if (when.startsWith("eve")) eat = "Eat 3–4 hours before. No fast the night before.";
    out.push({ label: d.label, type: d.type, when: d.when, note: `${d.label} ${d.type}: ${eat}` });
  }
  return out;
}

export function planBlocked(form: Intake) {
  return {
    dates: String(form.blocked_dates || "").trim(),
    why: String(form.blocked_why || ""),
    plan: String(form.blocked_plan || "walk only"),
    food: String(form.blocked_food || "protein + starch + veg from a menu"),
    rule: "Blocked days follow their plan. Do not pretend they trained at home if they said skip.",
  };
}

export function planOpening(
  form: Intake,
  numbers: Playbook["numbers"],
  week: ReturnType<typeof planWeek>,
  calories: ReturnType<typeof planCalories>,
  fasting: Playbook["fasting"],
) {
  const weight = num(form.weight, 0);
  const asked = num(form.goal_weight, 0);
  const cut = numbers.cut_lb_30d || ([0, 0] as [number, number]);
  const first = firstName(form);
  const sDays = week.strength_days || 0;
  const sports = week.sport_days || [];
  let goal = String(form.goal || "").trim();
  if (goal.toLowerCase().startsWith("test client")) goal = "";
  const intent = String(form.month_intent || "cut").toLowerCase();
  let honest = true;
  const reasons: string[] = [];
  let want = 0;
  if (weight && asked && asked < weight) {
    want = weight - asked;
    if (want > cut[1] + 1) {
      honest = false;
      reasons.push(`${want.toFixed(0)} lb in 30 days is a movie. ${cut[0]}–${cut[1]} lb keeps the muscle.`);
    }
  }
  if (sDays < STRENGTH_SESSIONS_MIN && (intent === "push" || intent === "gain")) {
    honest = false;
    reasons.push("Not enough lift days on the form for a strength fairy tale.");
  }
  if (calories.floored && intent === "cut" && want) {
    honest = false;
    reasons.push("Calories parked at the safety floor. The scale will move slower than the wish.");
  }
  const sportBit = sports[0] ? sports[0].split(" ").slice(-1)[0] : "";
  const analog: Record<string, string> = {
    Hockey: "We kept hockey. The ice is not going to skate itself.",
    Boxing: "We kept boxing. The bag already heard all your jokes.",
    Soccer: "We kept soccer. That ball was not going to kick itself.",
    Basketball: "We kept basketball. The hoop is 10 feet. So is the bar. Both stay.",
    Tennis: "We kept tennis. Love means nothing. Showing up means dinner.",
    Golf: "We kept golf. Walk the course. The cart does not burn the calories for you.",
    Swim: "We kept swim. Chlorine is not a cologne. Laps still count.",
    Run: "We kept running. One foot, then the other. Revolutionary stuff.",
  };
  const hook = `${first}. ${analog[sportBit] || "The weights will not lift themselves. We checked."}`;
  let mid = "Eat the ounces. Drink the water. Yes, again. That is the whole bit.";
  if (goal) mid = `You wrote “${goal.slice(0, 48)}.” Nice. Now go be the person who packs lunch.`;
  if (fasting.wanted) mid = "Fasts sit on rest days. Hungry on game day is a dad joke nobody asked for.";
  let close = "Thirty days. We believe in you. The fridge believes in leftovers. Work it out.";
  if (!honest) close = reasons[0] + " We printed the number that keeps the muscle. The movie version is still in theaters.";
  return { honest, text: [hook, mid, close].join(" "), reasons, bits: [hook, mid, close] };
}

export function planGuide(
  form: Intake,
  week: ReturnType<typeof planWeek>,
  food: Playbook["food"],
  calories: ReturnType<typeof planCalories>,
  fasting: Playbook["fasting"],
): Playbook["guide"] {
  const meals = food.meals_per_day || 3;
  const daily = food.daily_kcal || calories.daily;
  const egg = food.eggs?.line || "";
  const budget = food.menu?.budget || "";
  const sports = week.sport_days || [];
  return {
    session: [
      "5 minutes easy first. Then the first compound on the list.",
      "2–3 minutes between heavy sets. 60–90 seconds on accessories.",
      "Stop 2–3 reps short of failure (ACSM 2026). Save the hero set for a meet week.",
      "If the clock hits the cap, drop the last accessory. Never drop the first compound.",
      "Write the top set. Next week add a little load or a rep — not both.",
    ],
    sport: [
      `Sport days this month: ${sports.join(", ") || "none listed"}. That day is the sport. No extra lift under it.`,
      ...planSportFuel(week).map((n) => n.note),
      "Water on. Salt on. Do not start a fast the night before a game.",
    ],
    food: [
      `${meals} sittings. Printed daily ${daily} kcal.` +
        (calories.rest_day ? ` Rest day ${calories.rest_day}.` : "") +
        (calories.train_day_kcal ? ` Train day ~${calories.train_day_kcal}.` : ""),
      food.fiber_g ? `Fiber cue about ${food.fiber_g} g from veg.` : "",
      egg ? `Breakfast eggs: ${egg}.` : "Hit the breakfast protein number even if you skip eggs.",
      budget || "Swap rice for potato, spinach for broccoli. Keep the cups and ounces.",
      "Scale the food, not your mood. A heavy dinner after a light lunch is fine if the day still hits protein.",
      "Eating out: order the protein first, a starch the size of a fist, a pile of veg. That is the meal.",
    ],
    miss: [
      "Miss a lift: do not double it tomorrow. Run the next day's page.",
      "Miss a sport day: that day becomes a walk. Do not invent a new lift.",
      "Travel: protein + starch + veg from a menu. Same ounces you can guess.",
      "Sick: walk and food. No hero session.",
    ],
    stack: [
      "Multi and D3 with a meal that has fat.",
      "Magnesium at night.",
      "Creatine 5 g on eating days. Pause on water-only fasts.",
      "Medications stay on the clinician's schedule. We do not touch those.",
    ],
    fast: fasting.wanted
      ? [
          "If a window is printed, that is the empty day. Start the evening before. Break the next morning.",
          "Water and salt stay on. Black coffee is fine.",
          "Pause multi, D, fish oil, creatine. Keep medications.",
          "Break with protein + salt + a normal meal. Not a giant first meal.",
        ]
      : ["No fast this month."],
    windows: fasting.windows,
    rule: "The pages win over memory. If a day is ugly, run the next page. Nobody gets graded.",
  };
}

export function planAssumptions(form: Intake): string[] {
  const out: string[] = [];
  if (!form.mug_oz && !form.mug) out.push("Jug size was blank. Used 32 oz.");
  if (!form.meals_per_day && !form.meals) out.push("Meal count was blank. Used 3.");
  if (!form.sex) out.push("Sex was blank. Water floor used the 32 ml/kg line only.");
  const nested = (form.week || {}) as Record<string, unknown>;
  const keys = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
  if (!keys.some((k) => form[`day_${k}_sc`] || nested[k])) {
    out.push("Week grid was thin. Strength/cardio flags were inferred where we could.");
  }
  return out;
}

export function weekdayMap(start: Date, template: Record<number, string>, days = 30): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < days; i++) {
    const d = addDays(start, i);
    out[toISO(d)] = template[mondayIndex(d)] || "REST";
  }
  return out;
}
