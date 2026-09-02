import type { Intake, Playbook } from "./types";
import {
  BRAND,
  CHAPTERS,
  SOURCES,
  PLAYBOOK_CHROME,
  MARGINS,
  PROTEIN_G_PER_KG,
  STRENGTH_SESSIONS_MIN,
  HOW_TO,
  FOOD_FACTS,
  MOVE_BASE,
  MEAL_BUILDER_URL,
  SPORT_DAYS,
  ML_PER_OZ,
} from "./constants";
import {
  kg,
  num,
  intNum,
  truthy,
  rdaFor,
  proteinG,
  splitProtein,
  waterOz,
  waterFills,
  honestCutLb,
  listedFromForm,
  parseISODate,
} from "./helpers";
import { metFor, sessionKcal } from "./planning";
import { vitPlan } from "./vitamins";
import { planFood } from "./food";
import {
  planWeek,
  planExercise,
  planCalories,
  planWater,
  planFasting,
  planBlocked,
  planOpening,
  planGuide,
  planAssumptions,
  planSportFuel,
  weekdayMap,
} from "./planning";

export function targets(weightLb: number, mugOz: number, meals: number, sex = "", intent = "cut") {
  const [plo, phi] = proteinG(weightLb, intent);
  const mid = Math.round((plo + phi) / 2);
  const [restOz, trainOz] = waterOz(weightLb, sex);
  return {
    kg: Math.round(kg(weightLb) * 10) / 10,
    protein_g: [plo, phi] as [number, number],
    protein_mid: mid,
    protein_meals: splitProtein(mid, meals),
    water_oz_rest: restOz,
    water_oz_train: trainOz,
    water_fills: waterFills(weightLb, mugOz, sex),
    cut_lb_30d: String(intent).toLowerCase() === "cut" ? honestCutLb(weightLb) : ([0, 0] as [number, number]),
    sitting_g: [Math.round(0.25 * kg(weightLb)), Math.round(0.4 * kg(weightLb))] as [number, number],
    strength_days_min: STRENGTH_SESSIONS_MIN,
    sets_per_exercise: [2, 3] as [number, number],
  };
}

function auditPlan(book: Playbook): string[] {
  const flags: string[] = [];
  const nums = book.numbers || {};
  const weight = book.who?.weight || 0;
  if (weight && nums.protein_g) {
    const [lo, hi] = nums.protein_g;
    const perLo = lo / kg(weight);
    const perHi = hi / kg(weight);
    const [mlo, mhi] = MARGINS.protein_g_per_kg;
    if (perLo < mlo - 0.05 || perHi > mhi + 0.05) {
      flags.push(`protein ${perLo.toFixed(2)}–${perHi.toFixed(2)} g/kg outside ${mlo}–${mhi}`);
    }
  }
  if (nums.water_oz_rest && weight) {
    const ml = nums.water_oz_rest * ML_PER_OZ;
    const per = ml / kg(weight);
    if (!(MARGINS.water_ml_per_kg[0] <= per && per <= MARGINS.water_ml_per_kg[1] + 8)) {
      flags.push(`water ${per.toFixed(0)} ml/kg off the 30–40 band (IOM floor can lift this)`);
    }
  }
  const cut = nums.cut_lb_30d;
  if (cut && weight) {
    const weeks = 30 / 7;
    const hiPct = cut[1] / weight / weeks;
    if (hiPct > MARGINS.cut_pct_week[1] + 0.001) flags.push(`cut ${hiPct.toFixed(3)}/week faster than 1%`);
  }
  for (const change of book.vitamin_changes || []) {
    if (change.action !== "ADD") continue;
    const name = String(change.name || "").toLowerCase();
    const why = String(change.why || "").toLowerCase();
    if (name.includes("magnesium") && why.includes("200–400")) flags.push("magnesium add above the 350 mg supplement UL");
    if (name.includes("vitamin d") && why.includes("5000")) flags.push("vitamin D add looks above the 2000 IU program dose");
  }
  return flags;
}

function parseCal(label: string): [string, string] {
  const parts = String(label || "R Off").split(/\s+/, 2);
  if (parts.length === 1) return [(parts[0][0] || "R").toUpperCase(), parts[0]];
  return [(parts[0][0] || "R").toUpperCase(), parts[1]];
}

export function reviewBook(book: Playbook): Playbook["review"] {
  const errors: string[] = [];
  const warnings: string[] = [];
  const checks: string[] = [];
  const who = book.who || { age: null, sex: "", weight: 0, goal_weight: null };
  const nums = book.numbers || {};
  const food = book.food;
  const cal = book.calories;
  const water = book.water;
  const week = book.week;
  const weight = Number(who.weight || 0);
  const meals = food.meals_per_day || 3;
  const ok = (name: string) => checks.push(name);

  if (weight && nums.protein_g) {
    const [lo, hi] = nums.protein_g;
    const perLo = lo / kg(weight);
    const perHi = hi / kg(weight);
    const [mlo, mhi] = MARGINS.protein_g_per_kg;
    if (perLo < mlo - 0.05 || perHi > mhi + 0.05) errors.push(`protein ${perLo.toFixed(2)}–${perHi.toFixed(2)} g/kg outside ${mlo}–${mhi}`);
    else ok(`protein ${lo}–${hi} g (${perLo.toFixed(2)}–${perHi.toFixed(2)} g/kg)`);
  }
  const slots = food.slots || [];
  if (slots.length) {
    const psum = slots.reduce((s, x) => s + (x.protein_g || 0), 0);
    const mid = nums.protein_mid || psum;
    if (Math.abs(psum - mid) > 2) errors.push(`slot protein ${psum} != mid ${mid}`);
    else ok(`slot protein ${psum} = mid ${mid}`);
    const ksum = slots.reduce((s, x) => s + (x.kcal || 0), 0);
    const daily = food.daily_kcal || cal.daily;
    if (daily && Math.abs(ksum - Number(daily)) > meals + 2) errors.push(`slot kcal ${ksum} != daily ${daily}`);
    else if (daily) ok(`slot kcal ${ksum} = daily ${daily}`);
    if (food.daily_kcal && cal.daily && Number(food.daily_kcal) !== Number(cal.daily)) {
      errors.push(`food daily ${food.daily_kcal} != calorie daily ${cal.daily}`);
    }
  }
  if (weight && water.rest_oz && water.mug_oz) {
    if (Number(water.train_oz) < Number(water.rest_oz)) errors.push("train water is under rest water");
    else ok(`water rest ${water.rest_oz} / train ${water.train_oz} oz`);
  }
  const cut = nums.cut_lb_30d;
  const asked = who.goal_weight;
  if (weight && asked && asked < weight && cut) {
    const want = weight - Number(asked);
    if (want > cut[1] + 1 && book.honest_cut === true) errors.push("wanted cut is past honest range but opening treated it as honest");
    else if (want > cut[1] + 1) ok(`honest note set: wanted ${want.toFixed(0)} vs ${cut[0]}–${cut[1]}`);
    else ok(`wanted cut ${want.toFixed(0)} inside ${cut[0]}–${cut[1]}`);
  }
  if (cal.choice === "custom" && cal.custom && cal.daily !== cal.custom) {
    errors.push(`custom ${cal.custom} was not the printed daily ${cal.daily}`);
  }
  if (cal.recommended && cal.floor && cal.recommended < cal.floor) errors.push("recommended calories under the floor");
  if (cal.rest_day && cal.floor && cal.rest_day < cal.floor) errors.push(`rest day ${cal.rest_day} under the floor ${cal.floor}`);
  if (cal.daily) ok(`daily calories ${cal.daily} (${cal.choice})`);
  if (weight && cal.burn) {
    let burnBad = false;
    for (const d of cal.burn.days || []) {
      if (d.kind === "R") continue;
      const met = d.met || metFor(d.type, d.kind);
      const rebuilt = sessionKcal(weight, met, d.minutes || 0);
      if (Math.abs((d.net || 0) - rebuilt.net) > 3) {
        burnBad = true;
        errors.push(`${d.label} burn ${d.net} != rebuilt ${rebuilt.net}`);
      }
    }
    if (!burnBad) ok(`session burns rebuild (${cal.burn.weekly_net} net kcal / week)`);
  }
  if (cal.eatback != null && cal.train_add != null) {
    const expect = Math.round((cal.burn?.daily_avg_net || 0) * cal.eatback);
    if (Math.abs(expect - Number(cal.train_add)) > 2) errors.push(`eat-back ${cal.train_add} != ${expect}`);
    else ok(`eat-back ${Math.round(cal.eatback * 100)}% → ${cal.train_add} kcal`);
  }
  const sDays = week.strength_days || 0;
  if (sDays < STRENGTH_SESSIONS_MIN && ["push", "gain"].includes(String(who.month_intent || "").toLowerCase())) {
    warnings.push("under 2 strength days on a push month");
  } else {
    ok(`week ${sDays} strength / ${week.cardio_days} cardio`);
  }
  const fasting = book.fasting;
  if (fasting.wanted) {
    const windows = fasting.windows || [];
    let sportHit = false;
    const calMap = book.calendar || {};
    for (const w of windows) {
      for (const iso of w.core || []) {
        const [, typ] = parseCal(calMap[iso] || "");
        if (SPORT_DAYS.has(typ)) {
          sportHit = true;
          errors.push(`fast core ${iso} sits on ${typ}`);
        }
      }
    }
    if (!sportHit) {
      if (windows.length) ok(`fast windows ${windows.map((w) => w.empty).join(", ")} off sport`);
      else if (fasting.when) ok("fast when provided by them");
      else warnings.push("fast wanted but no window could be placed off sport");
    }
  }
  const adds = (book.vitamin_changes || []).filter((c) => c.action === "ADD");
  const multiAdds = adds.filter((c) => {
    const n = (c.name || "").toLowerCase();
    return n.includes("multivitamin") || n.trim() === "multi" || n.trim() === "adult multi";
  });
  if (multiAdds.length > 1) errors.push("two complete multis on the ADD list");
  for (const change of book.vitamin_changes || []) {
    const blob = `${change.name || ""} ${change.why || ""}`.toLowerCase();
    if (change.action === "ADD" && blob.includes("vitamin d") && blob.includes("5000")) errors.push("vitamin D add looks like 5000 IU");
    if (change.action === "ADD" && blob.includes("magnesium") && blob.includes("200–400")) errors.push("magnesium add still shows the old 400 mg cap");
  }
  ok(`stack ${(book.vitamin_changes || []).length} change rows`);
  const raw = who.start_date;
  if (raw && book.calendar) {
    const start = parseISODate(String(raw));
    if (!start) warnings.push(`start_date ${raw} is not YYYY-MM-DD`);
    else {
      const first = Object.keys(book.calendar).sort()[0];
      const iso = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
      if (first !== iso) errors.push(`calendar starts ${first} not ${iso}`);
      else ok(`calendar starts ${iso} (${start.toLocaleDateString("en-US", { weekday: "long" })})`);
    }
  }
  if (book.audit?.length) warnings.push(...book.audit.map((a) => `audit: ${a}`));
  const okFlag = errors.length === 0;
  return {
    ok: okFlag,
    ready: okFlag,
    errors,
    warnings,
    checks,
    summary: okFlag && !warnings.length
      ? "READY — math holds across protein, meals, water, burns, stack."
      : okFlag
        ? "READY WITH NOTES — send, but read the warnings."
        : "HOLD — fix errors before this book goes out.",
  };
}

export function create(formIn: Intake): Playbook {
  const form: Intake = { ...formIn };
  const weight = num(form.weight ?? form.weight_lb, 0);
  const mug = num(form.mug_oz ?? form.mug, 32) || 32;
  const meals = Math.min(6, Math.max(2, intNum(form.meals_per_day ?? form.meals, 3)));
  const sex = String(form.sex || "");
  let age: number | null = null;
  if (form.age !== null && form.age !== undefined && form.age !== "") {
    const a = intNum(form.age, NaN);
    age = Number.isFinite(a) ? a : null;
  }
  const vegetarian = truthy(form.prot_veg) || String(form.restrictions || "").toLowerCase().includes("vegetar");
  const dairyOk = !["no", "n", "false"].includes(String(form.dairy_whey || "yes").trim().toLowerCase());
  const week = planWeek(form);
  const lifts = week.strength_days > 0 || Boolean(week.sport_days.length);
  const listed = listedFromForm(form);
  const noSupps = truthy(form.no_supps) || !listed.length;
  const adjust = form.adjust_stack === undefined || form.adjust_stack === null || form.adjust_stack === "" ? true : truthy(form.adjust_stack);
  const fish = truthy(form.prot_fish);
  const meds = String(form.medications || form.meds || "");
  let intent = String(form.month_intent || "cut").toLowerCase();
  if (!(intent in PROTEIN_G_PER_KG)) intent = "cut";
  const nums = weight ? targets(weight, mug, meals, sex, intent) : {};
  const stack = vitPlan({
    age,
    sex,
    listed,
    no_supps: noSupps,
    adjust,
    vegetarian,
    lifts,
    indoor_or_evening: true,
    eats_fatty_fish_weekly: fish,
    dairy_ok: dairyOk,
    meds,
  });
  const calories = planCalories(form, nums);
  const food = planFood(form, nums, calories);
  const water = planWater(form, nums);
  const exercise = planExercise(form);
  const blocked = planBlocked(form);
  let cal: Record<string, string> | null = null;
  const rawStart = form.start_date;
  if (rawStart) {
    const start = parseISODate(String(rawStart));
    if (start) {
      const template: Record<number, string> = {};
      for (const d of week.days) {
        const line = `${d.kind} ${d.type}`;
        template[d.dow] = template[d.dow] ? `${template[d.dow]} + ${d.type}` : line;
      }
      cal = weekdayMap(start, template);
    }
  }
  const fasting = planFasting(form, cal);
  const opening = planOpening(form, nums, week, calories, fasting);
  const asked = num(form.goal_weight, 0);

  const book: Playbook = {
    brand: {
      name: BRAND.name,
      tagline: BRAND.tagline,
      disclaimer: BRAND.disclaimer,
      colors: BRAND.colors,
    },
    chapters: CHAPTERS,
    sources: SOURCES,
    who: {
      name: form.name ? String(form.name) : undefined,
      email: form.email ? String(form.email) : undefined,
      age,
      sex,
      height: form.height as string | number | undefined,
      weight,
      goal_weight: asked || null,
      start_date: rawStart ? String(rawStart) : undefined,
      sleep_hours: form.sleep_hours,
      job_type: form.job_type ? String(form.job_type) : undefined,
      month_intent: form.month_intent ? String(form.month_intent) : undefined,
      goal: form.goal ? String(form.goal) : undefined,
    },
    numbers: nums,
    water,
    calories,
    food,
    exercise,
    week,
    stack,
    why_we_changed: stack.why_we_changed,
    vitamin_changes: stack.changes,
    fasting,
    blocked,
    chrome: PLAYBOOK_CHROME,
    tools: {
      moves: MOVE_BASE,
      meal: MEAL_BUILDER_URL,
      food_facts: FOOD_FACTS,
      how_to: HOW_TO,
    },
    sport_fuel: planSportFuel(week),
    calendar: cal,
    honest_cut: opening.honest,
    opening_note: opening.text,
    assumptions: planAssumptions(form),
    guide: planGuide(form, week, food, calories, fasting),
    rda: rdaFor(age, sex),
    margins: MARGINS as unknown as Record<string, unknown>,
    logic: {
      protein: "ISSN 1.4–2.0 maintain/push. 1.6–2.2 on a cut. Never print above 2.2 g/kg.",
      water: "32 ml/kg + 500 ml train. Print jug fills.",
      cut: "0.5–0.8% bodyweight/week. Opening note uses that range.",
      calories: "Occupational TDEE + honest cut + partial eat-back of programmed MET burns. Custom number still wins.",
      training: "ACSM 2026. Cap minutes. Sport is the sport. New lifters get 2 sets.",
      food: "3 breakfast / 3 lunch / 3 dinner when that sitting exists. 2-meal plans skip lunch. Eggs first if they said yes.",
      vitamins: "Always plan. Explain every KEEP/ADD. Never change meds.",
      fasting: "Only if they asked. If when is blank, empty day lands on rest. Sport stays fed.",
    },
    audit: [],
    review: { ok: true, ready: true, errors: [], warnings: [], checks: [], summary: "" },
  };
  book.audit = auditPlan(book);
  book.review = reviewBook(book);
  return book;
}

export function publishReady(book: Playbook): boolean {
  return Boolean((book.review || reviewBook(book)).ok);
}
