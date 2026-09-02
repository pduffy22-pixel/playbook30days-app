import type { Intake, Plate, Slot } from "./types";
import {
  MEAL_SLOTS,
  PROTEIN_BANK,
  STARCH_BANK,
  VEG_BANK,
  BREAKFAST_BANK,
  KCAL_PER_G_PROTEIN,
  KCAL_PER_G_CARB,
  KCAL_PER_G_FAT,
  FAT_G_PER_LB,
  FIBER_G_PER_1000_KCAL,
  STARCH_CARB_G_PER_CUP,
  G_PER_OZ_COOKED_MEAT,
  G_PER_EGG,
  G_PER_CUP_GREEK_YOGURT,
  G_PER_CUP_COTTAGE,
  G_PER_WHEY_SCOOP,
  EGG_SIT_CAP,
  VEG_CUPS_PER_MEAL,
  VEG_CUPS_GREENS,
  STARCH_OZ_PER_CUP,
  VEG_OZ_PER_CUP,
  FOOD_FACTS,
  PLAYBOOK_CHROME,
} from "./constants";
import { intNum, num, ozMeatForProtein, splitProtein, truthy } from "./helpers";

function checkedBank(form: Intake, prefix: string, bank: Record<string, string[]>): string[] {
  const picked: string[] = [];
  for (const [key, options] of Object.entries(bank)) {
    if (truthy(form[`${prefix}_${key}`]) || truthy(form[key])) picked.push(...options.slice(0, 2));
  }
  return picked;
}

function slotCalorieWeights(names: string[]): number[] {
  return names.map((name) => {
    const low = name.toLowerCase();
    if (low.includes("snack")) return 0.65;
    if (name === "Dinner") return 1.2;
    if (name === "Breakfast") return 1.0;
    return 1.05;
  });
}

export function splitCalories(daily: number, names: string[]): number[] {
  const weights = slotCalorieWeights(names);
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  const parts = weights.map((w) => Math.floor((daily * w) / total));
  parts[parts.length - 1] += daily - parts.reduce((a, b) => a + b, 0);
  return parts;
}

export function planMacros(daily: number, proteinGrams: number, weightLb: number) {
  const pKcal = proteinGrams * KCAL_PER_G_PROTEIN;
  let fatG = Math.round(Math.max(FAT_G_PER_LB * weightLb, (0.2 * daily) / KCAL_PER_G_FAT));
  fatG = Math.min(fatG, Math.floor((0.35 * daily) / KCAL_PER_G_FAT));
  let fatKcal = fatG * KCAL_PER_G_FAT;
  let carbKcal = Math.max(0, daily - pKcal - fatKcal);
  let carbG = Math.round(carbKcal / KCAL_PER_G_CARB);
  const tight = pKcal + fatKcal > daily;
  if (tight) {
    fatG = Math.max(Math.floor((0.2 * daily) / KCAL_PER_G_FAT), Math.floor((daily - pKcal) / KCAL_PER_G_FAT));
    fatKcal = fatG * KCAL_PER_G_FAT;
    carbKcal = Math.max(0, daily - pKcal - fatKcal);
    carbG = Math.round(carbKcal / KCAL_PER_G_CARB);
  }
  return {
    daily_kcal: daily,
    protein_g: proteinGrams,
    protein_kcal: pKcal,
    fat_g: fatG,
    fat_kcal: fatKcal,
    carb_g: carbG,
    carb_kcal: carbKcal,
    tight,
  };
}

function matchOz(name: string, table: Record<string, number>, fallback: number): number {
  const low = (name || "").toLowerCase();
  for (const [key, oz] of Object.entries(table)) {
    if (low.includes(key)) return oz;
  }
  return fallback;
}

export function starchAmount(name: string, cups: number | null | undefined): string {
  const c = Number(cups || 0);
  if (c <= 0) return "";
  const oz = Math.round(c * matchOz(name, STARCH_OZ_PER_CUP, 6.0) * 10) / 10;
  if (name.toLowerCase().includes("bread") || name.toLowerCase().includes("toast")) {
    const slices = Math.max(1, Math.round(c * 2));
    return `${slices} slices ${name} (${oz} oz)`;
  }
  if (name.toLowerCase().includes("wrap")) {
    const n = Math.max(1, Math.round(c));
    return `${n} wrap ${name} (${oz} oz)`;
  }
  return `${c} cups cooked ${name} (${oz} oz)`;
}

export function vegAmount(name: string, cups?: number | null): string {
  const low = (name || "vegetables").toLowerCase();
  const c = Number(
    cups != null
      ? cups
      : ["spinach", "green", "lettuce"].some((w) => low.includes(w))
        ? VEG_CUPS_GREENS
        : VEG_CUPS_PER_MEAL,
  );
  const oz = Math.round(c * matchOz(name, VEG_OZ_PER_CUP, 3.3) * 10) / 10;
  const raw = ["spinach", "green", "lettuce"].some((w) => low.includes(w));
  return `${c} cups ${raw ? "raw" : "cooked"} ${name} (${oz} oz)`;
}

export function eggsForProtein(grams: number, cap = EGG_SIT_CAP) {
  const g = Math.round(grams || 0);
  if (g <= 0) return { eggs: 0, from_eggs: 0, leftover_g: 0, leftover_oz: 0, whey_scoops: 0, line: "" };
  const n = Math.min(cap, Math.max(2, Math.round(Math.min(g, cap * G_PER_EGG) / G_PER_EGG)));
  const fromEggs = Math.round(n * G_PER_EGG);
  const leftover = Math.max(0, g - fromEggs);
  const oz = leftover ? Math.round((leftover / G_PER_OZ_COOKED_MEAT) * 10) / 10 : 0;
  const scoops = leftover ? Math.round((leftover / G_PER_WHEY_SCOOP) * 10) / 10 : 0;
  let line = `${n} large eggs`;
  if (leftover >= 16) line = `${n} large eggs + ${oz} oz cooked meat (or ${scoops} scoops whey)`;
  else if (leftover >= 8) line = `${n} large eggs + ${oz} oz cooked meat`;
  return { eggs: n, from_eggs: fromEggs, leftover_g: leftover, leftover_oz: oz, whey_scoops: scoops, line };
}

function cycle(items: string[], i: number, fallback: string): string {
  if (!items.length) return fallback;
  return items[i % items.length];
}

function plate(title: string, items: string[], proteinG: number, kcal: number | null, starchCups: number | null | undefined, facts = ""): Plate {
  const clean = items.filter(Boolean);
  let line = clean.join("  ·  ");
  if (facts) line = `${line}  ·  ${facts}`;
  return { title, items: clean, protein_g: proteinG, kcal, starch_cups: starchCups, facts, line };
}

function factsLine(parts: Array<[string, number]>): string {
  let kcal = 0,
    p = 0,
    c = 0,
    f = 0;
  for (const [key, n] of parts) {
    const row = FOOD_FACTS[key];
    if (!row || !n) continue;
    kcal += row.kcal * n;
    p += row.p * n;
    c += row.c * n;
    f += row.f * n;
  }
  if (!p) return "";
  return `USDA ~${Math.round(kcal)} kcal · ${Math.round(p)}g P · ${Math.round(c)}g C · ${Math.round(f)}g F`;
}

function meatKey(name: string): string {
  const n = (name || "").toLowerCase();
  if (n.includes("steak") || n.includes("beef")) return "steak_oz";
  if (n.includes("shrimp")) return "shrimp_oz";
  if (n.includes("fish") || n.includes("salmon") || n.includes("tuna") || n.includes("cod")) return "fish_oz";
  return "meat_oz";
}

export function planMenu(
  form: Intake,
  slots: Slot[],
  proteins: string[],
  starches: string[],
  vegs: string[],
  dairyOk: boolean,
  vegetarian: boolean,
) {
  const byName: Record<string, Slot> = {};
  for (const s of slots) byName[s.name] = s;
  const b = byName.Breakfast || slots[0];
  const d = byName.Dinner || slots[slots.length - 1];
  const lunchSlot = byName.Lunch;
  let lP: number, lK: number | null, lSt: number;
  if (lunchSlot) {
    lP = lunchSlot.protein_g;
    lK = lunchSlot.kcal;
    lSt = lunchSlot.starch_cups || 0.6;
  } else {
    lP = Math.max(28, Math.round(b.protein_g * 0.55));
    lK = Math.round((b.kcal || 0) * 0.55) || null;
    lSt = 0.6;
  }
  const egg = eggsForProtein(b.protein_g);
  let dinnerMeats = proteins.filter((p) => !["eggs", "egg-white scramble"].includes(p.toLowerCase()));
  let lunchMeats = dinnerMeats.filter((p) => !p.toLowerCase().includes("steak") && !p.toLowerCase().includes("beef"));
  if (!lunchMeats.length) lunchMeats = dinnerMeats.length ? dinnerMeats : ["Grilled chicken breast"];
  if (!dinnerMeats.length) dinnerMeats = ["Grilled chicken breast"];
  const starchB = starches.some((s) => s.toLowerCase().includes("oat")) ? "oats" : cycle(starches, 0, "oats");
  const vegB = cycle(vegs, 0, "Spinach");
  const bSt = b.starch_cups || 0.8;
  const dSt = d.starch_cups || 0.8;
  const eggFlag = form.prot_eggs;
  const eggSaidNo = ["n", "no", "false", "0", "off"].includes(String(eggFlag || "").trim().toLowerCase());
  const eggAllergic = String(form.allergies || "").toLowerCase().includes("egg");
  const wantEggs = (!eggSaidNo && !eggAllergic && !vegetarian) || truthy(eggFlag);

  const breakfast: Plate[] = [];
  if (wantEggs) {
    let top = "";
    const parts: Array<[string, number]> = [
      ["egg_large", egg.eggs],
      ["oats_cup_cooked", bSt],
      ["veg_cup", 1.0],
    ];
    if (dairyOk && egg.whey_scoops) {
      top = `${egg.whey_scoops} scoops whey in coffee or oats`;
      parts.push(["whey_scoop", egg.whey_scoops]);
    } else if (dairyOk && egg.leftover_g >= 12) {
      const cups = Math.round((egg.leftover_g / G_PER_CUP_COTTAGE) * 10) / 10;
      top = `${cups} cups cottage cheese`;
      parts.push(["cottage_cup", cups]);
    }
    breakfast.push(
      plate(
        `${egg.eggs} eggs + oats`,
        [`${egg.eggs} large eggs (scrambled or boiled)`, top, starchAmount(starchB, bSt), vegAmount(vegB) + " in the pan or on the side"],
        b.protein_g,
        b.kcal,
        bSt,
        factsLine(parts),
      ),
    );
  }
  if (dairyOk) {
    const cupsY = Math.max(1.0, Math.round((Math.min(b.protein_g, 46) / G_PER_CUP_GREEK_YOGURT) * 10) / 10);
    const rest = Math.max(0, b.protein_g - Math.round(cupsY * G_PER_CUP_GREEK_YOGURT));
    const whey = rest >= 8 ? `${Math.round((rest / G_PER_WHEY_SCOOP) * 10) / 10} scoops whey` : "";
    const parts: Array<[string, number]> = [
      ["greek_yogurt_cup", cupsY],
      ["fruit_cup", 1.0],
      ["oats_cup_cooked", Math.min(bSt, 0.5)],
    ];
    if (rest >= 8) parts.push(["whey_scoop", rest / G_PER_WHEY_SCOOP]);
    breakfast.push(
      plate(
        "Yogurt bowl",
        [`${cupsY} cups plain Greek yogurt`, whey, "1 cup fruit (5 oz)", starchAmount("oats", Math.min(bSt, 0.5))],
        b.protein_g,
        b.kcal,
        bSt,
        factsLine(parts),
      ),
    );
  }
  if (dairyOk && breakfast.length < 2) {
    const cupsC = Math.max(0.8, Math.round((Math.min(b.protein_g, 50) / G_PER_CUP_COTTAGE) * 10) / 10);
    breakfast.push(
      plate(
        "Cottage bowl",
        [`${cupsC} cups low-fat cottage cheese`, "1 cup fruit (5 oz)", starchAmount(starchB, bSt), "pepper or hot sauce"],
        b.protein_g,
        b.kcal,
        bSt,
        factsLine([
          ["cottage_cup", cupsC],
          ["fruit_cup", 1.0],
          ["oats_cup_cooked", bSt],
        ]),
      ),
    );
  }
  if (dairyOk && breakfast.length < 2) {
    const scoops = Math.max(1.0, Math.round((b.protein_g / G_PER_WHEY_SCOOP) * 10) / 10);
    breakfast.push(
      plate(
        "Oats + whey",
        [starchAmount("oats", bSt), `${scoops} scoops whey stirred in`, "1 cup fruit (5 oz)"],
        b.protein_g,
        b.kcal,
        bSt,
        factsLine([
          ["oats_cup_cooked", bSt],
          ["whey_scoop", scoops],
          ["fruit_cup", 1.0],
        ]),
      ),
    );
  }
  if (vegetarian && !dairyOk && breakfast.length < 2) {
    breakfast.push(
      plate(
        "Tofu scramble",
        [`${Math.round((b.protein_g / 10) * 10) / 10} oz firm tofu scramble`, starchAmount(starchB, bSt), vegAmount(vegB)],
        b.protein_g,
        b.kcal,
        bSt,
        "",
      ),
    );
  }
  if (breakfast.length < 2) {
    const scoops = dairyOk ? Math.max(1.0, Math.round((b.protein_g / G_PER_WHEY_SCOOP) * 10) / 10) : 0;
    const extra = scoops ? `${scoops} scoops whey` : `${egg.eggs} eggs`;
    breakfast.push(
      plate("Oats bowl", [starchAmount("oats", bSt), extra, "1 cup fruit (5 oz)"], b.protein_g, b.kcal, bSt, ""),
    );
  }
  if (breakfast.length < 3 && dairyOk) {
    const used = breakfast.map((p) => p.title.toLowerCase()).join(" ");
    if (!used.includes("cottage")) {
      const cupsC = Math.max(0.8, Math.round((Math.min(b.protein_g, 50) / G_PER_CUP_COTTAGE) * 10) / 10);
      breakfast.push(
        plate(
          "Cottage bowl",
          [`${cupsC} cups low-fat cottage cheese`, "1 cup fruit (5 oz)", starchAmount(starchB, bSt)],
          b.protein_g,
          b.kcal,
          bSt,
          factsLine([
            ["cottage_cup", cupsC],
            ["fruit_cup", 1.0],
            ["oats_cup_cooked", bSt],
          ]),
        ),
      );
    } else if (!used.includes("oats")) {
      const scoops = Math.max(1.0, Math.round((b.protein_g / G_PER_WHEY_SCOOP) * 10) / 10);
      breakfast.push(
        plate(
          "Oats + whey",
          [starchAmount("oats", bSt), `${scoops} scoops whey stirred in`, "1 cup fruit (5 oz)"],
          b.protein_g,
          b.kcal,
          bSt,
          factsLine([
            ["oats_cup_cooked", bSt],
            ["whey_scoop", scoops],
            ["fruit_cup", 1.0],
          ]),
        ),
      );
    }
  }
  if (breakfast.length < 3 && vegetarian) {
    breakfast.push(
      plate(
        "Tofu scramble",
        [`${Math.round((b.protein_g / 10) * 10) / 10} oz firm tofu scramble`, starchAmount(starchB, bSt), vegAmount(vegB)],
        b.protein_g,
        b.kcal,
        bSt,
        "",
      ),
    );
  }
  if (breakfast.length < 3) {
    const scoops = dairyOk ? Math.max(1.0, Math.round((b.protein_g / G_PER_WHEY_SCOOP) * 10) / 10) : 0;
    const extra = scoops ? `${scoops} scoops whey` : `${egg.eggs} eggs`;
    breakfast.push(
      plate(
        "Shake + fruit",
        [extra, "1 banana or 1 cup fruit (5 oz)", starchAmount(starchB, Math.min(bSt, 0.5))],
        b.protein_g,
        b.kcal,
        bSt,
        "",
      ),
    );
  }
  const breakfastOut = breakfast.slice(0, 3);

  const lunch: Plate[] = [];
  if (lunchSlot) {
    for (let i = 0; i < 3; i++) {
      const meat = cycle(lunchMeats, i, lunchMeats[0]);
      const starch = cycle(starches, i + 1, "Rice");
      const veg = cycle(vegs, i, "Mixed vegetables");
      const oz = Math.round((lP / G_PER_OZ_COOKED_MEAT) * 10) / 10;
      lunch.push(
        plate(
          meat,
          [`${oz} oz cooked ${meat}`, starchAmount(starch, lSt), vegAmount(veg)],
          lP,
          lK,
          lSt,
          factsLine([
            [meatKey(meat), oz],
            ["rice_cup", lSt || 0.6],
            ["veg_cup", 1.5],
          ]),
        ),
      );
    }
  }

  const dinner: Plate[] = [];
  for (let i = 0; i < 3; i++) {
    const meat = cycle(dinnerMeats, i, dinnerMeats[0]);
    const starch = cycle(starches, i, "Rice");
    const veg = cycle(vegs, i, "Broccoli");
    const oz = d.meat_oz || Math.round((d.protein_g / G_PER_OZ_COOKED_MEAT) * 10) / 10;
    dinner.push(
      plate(
        meat,
        [`${oz} oz cooked ${meat}`, starchAmount(starch, dSt), vegAmount(veg)],
        d.protein_g,
        d.kcal,
        dSt,
        factsLine([
          [meatKey(meat), oz],
          ["rice_cup", dSt || 0.8],
          ["veg_cup", 1.5],
        ]),
      ),
    );
  }

  const sit = Math.max(2, slots.length);
  const starchDay = Math.round(slots.reduce((s, x) => s + Number(x.starch_cups || 0), 0) * 10) / 10;
  const vegDay = Math.round(VEG_CUPS_PER_MEAL * sit * 10) / 10;
  const budget = `${starchDay} cups starch and ${vegDay} cups veg across the day. 3 meal options per sitting. Rotate. Stay on the foods they listed.`;
  return {
    breakfast: breakfastOut,
    lunch,
    dinner,
    eggs: egg,
    starch_cups_day: starchDay,
    veg_cups_day: vegDay,
    budget,
    variety: "Rotate the 3 meal options. Different protein or starch each day. Stay inside the foods they listed.",
    source: "USDA FoodData Central rounded household servings.",
  };
}

export function planFood(
  form: Intake,
  numbers: { protein_meals?: number[]; protein_mid?: number },
  calories: { daily?: number | null; choice?: string; rest_day?: number | null; train_day_kcal?: number | null } | null,
) {
  let meals = intNum(form.meals_per_day ?? form.meals, 3);
  meals = Math.min(6, Math.max(2, meals));
  const slotsNames = MEAL_SLOTS[meals] || MEAL_SLOTS[3];
  const split = numbers.protein_meals || splitProtein(numbers.protein_mid || 140, meals);
  const vegetarian = truthy(form.prot_veg) || String(form.restrictions || "").toLowerCase().includes("vegetar");
  const dairyOk = !["no", "n", "false"].includes(String(form.dairy_whey || "yes").trim().toLowerCase());
  let proteins = checkedBank(form, "prot", PROTEIN_BANK);
  if (vegetarian) {
    proteins = PROTEIN_BANK.veg.filter(
      (p) => dairyOk || (!p.toLowerCase().includes("yogurt") && !p.toLowerCase().includes("cottage") && !p.toLowerCase().includes("whey")),
    );
    if (truthy(form.prot_eggs)) proteins = [...PROTEIN_BANK.eggs, ...proteins];
    if (!dairyOk) {
      proteins = proteins.filter((p) => !/whey|yogurt|cottage/i.test(p));
      proteins.push("Tofu", "Tempeh", "Black beans");
    }
  }
  if (truthy(form.prot_eggs) || ((form.prot_eggs === undefined || form.prot_eggs === null || form.prot_eggs === "") && !vegetarian)) {
    for (const e of PROTEIN_BANK.eggs || ["Eggs"]) {
      if (!proteins.includes(e)) proteins = [e, ...proteins];
    }
  }
  if (!proteins.length) proteins = [...PROTEIN_BANK.chicken.slice(0, 2), ...PROTEIN_BANK.eggs.slice(0, 1)];
  let starches = checkedBank(form, "starch", STARCH_BANK);
  if (!starches.length) starches = [...STARCH_BANK.rice.slice(0, 2), ...STARCH_BANK.potato.slice(0, 1)];
  let vegs = checkedBank(form, "veg", VEG_BANK);
  if (!vegs.length) vegs = [...VEG_BANK.greens, ...VEG_BANK.broccoli.slice(0, 1)];
  const likes = String(form.likes || "");
  const allergies = String(form.allergies || "");
  const restrictions = String(form.restrictions || "");
  const banned = (allergies + " " + restrictions).toLowerCase();

  function ok(item: string): boolean {
    const low = item.toLowerCase();
    for (const word of ["peanut", "shellfish", "shrimp", "dairy", "gluten", "wheat", "soy"]) {
      if (banned.includes(word) && low.includes(word)) return false;
    }
    if (banned.includes("gluten") && ["pasta", "bread", "toast", "wrap", "oat"].some((w) => low.includes(w))) return false;
    return true;
  }

  proteins = proteins.filter(ok);
  if (!proteins.length) proteins = ["Grilled chicken breast"];
  starches = starches.filter(ok);
  if (!starches.length) starches = ["Rice"];
  vegs = vegs.filter(ok);
  if (!vegs.length) vegs = ["Mixed vegetables"];
  const cook = String(form.cook_mode || "home").toLowerCase();
  const plateStyle = cook === "out" || cook === "restaurant" ? "order from a menu" : "cook at home";
  const breakfasts: string[] = [];
  if (truthy(form.prot_eggs) || !vegetarian) breakfasts.push(BREAKFAST_BANK.eggs);
  if (truthy(form.starch_oats)) breakfasts.push(BREAKFAST_BANK.oats);
  if (dairyOk) breakfasts.push(BREAKFAST_BANK.yogurt);
  if (dairyOk && (vegetarian || meals >= 4)) breakfasts.push(BREAKFAST_BANK.shake);
  const breakfastsOut = (breakfasts.length ? breakfasts : ["Eggs + fruit"]).slice(0, 4);
  let snacks: string[] = [];
  if (meals >= 4) {
    if (dairyOk) snacks = ["Greek yogurt + fruit", "Cottage cheese + fruit", "Whey shake + fruit"];
    else snacks = ["3–4 oz leftover protein + fruit", "Tofu + fruit"];
    snacks = snacks.filter(ok).slice(0, 4);
  }
  const dailyKcal = calories?.daily ? intNum(calories.daily, 0) : null;
  const proteinMid = numbers.protein_mid || split.reduce((a, b) => a + b, 0);
  const weightLb = num(form.weight ?? form.weight_lb, 0);
  const macros = dailyKcal && weightLb ? planMacros(dailyKcal, proteinMid, weightLb) : null;
  const kcalParts = dailyKcal ? splitCalories(dailyKcal, slotsNames) : slotsNames.map(() => null as number | null);
  const fatParts = macros ? splitProtein(macros.fat_g, meals) : slotsNames.map(() => null as number | null);
  const carbParts = macros ? splitProtein(macros.carb_g, meals) : slotsNames.map(() => null as number | null);

  const slotPlan: Slot[] = slotsNames.map((name, i) => {
    const grams = i < split.length ? split[i] : split[split.length - 1];
    let starchOn = (name === "Breakfast" || name === "Lunch" || name === "Dinner") && !name.endsWith("snack");
    if (name.endsWith("snack") || name === "Snack") starchOn = false;
    if (meals === 2 && name === "Dinner") starchOn = true;
    const carbG = carbParts[i];
    let starchCups: number | null = null;
    if (starchOn && carbG) starchCups = Math.round((carbG / STARCH_CARB_G_PER_CUP) * 10) / 10;
    const meat = !name.toLowerCase().includes("snack") ? ozMeatForProtein(grams) : null;
    return {
      name,
      protein_g: grams,
      meat_oz: meat,
      kcal: kcalParts[i],
      fat_g: fatParts[i],
      carb_g: carbG,
      starch: starchOn,
      starch_cups: starchCups,
    };
  });

  let rule =
    "Same daily protein no matter the meal count. Meal count does not burn extra fat. Rotate 3–4 options. Do not copy another client's meals.";
  if (dailyKcal) {
    const src = calories?.choice === "custom" ? "their custom number" : "the recommended 30-day target";
    rule += ` Meals are built to ${dailyKcal} kcal (${src}). Protein first, then fat floor, carbs fill the rest.`;
    rule += " Starch and veg have cups and ounces. Swap foods. Do not change the amounts.";
    const fib = Math.round((dailyKcal / 1000) * FIBER_G_PER_1000_KCAL);
    rule += ` Fiber cue about ${fib} g from the veg pile (14 g per 1000 kcal).`;
    if (macros?.tight) rule += " Calories are tight against the protein target. Starch stays small. Do not cut protein to fake a deeper deficit.";
  }

  const breakfastSlot = slotPlan.find((s) => s.name === "Breakfast") || slotPlan[0];
  return {
    meals_per_day: meals,
    slots: slotPlan,
    proteins: proteins.slice(0, 4),
    starches: starches.slice(0, 4),
    vegs: vegs.slice(0, 4),
    breakfasts: breakfastsOut,
    snacks,
    cook_mode: cook,
    plate_style: plateStyle,
    vegetarian,
    dairy_ok: dairyOk,
    likes,
    allergies,
    restrictions,
    daily_kcal: dailyKcal,
    macros,
    calorie_choice: calories?.choice,
    fiber_g: dailyKcal ? Math.round((dailyKcal / 1000) * FIBER_G_PER_1000_KCAL) : null,
    rest_day_kcal: calories?.rest_day ?? null,
    train_day_kcal: calories?.train_day_kcal ?? null,
    eggs: eggsForProtein(breakfastSlot.protein_g),
    menu: planMenu(form, slotPlan, proteins, starches, vegs, dairyOk, vegetarian),
    rule,
    citation: PLAYBOOK_CHROME.nutrition_cite,
    source: "USDA FoodData Central. https://fdc.nal.usda.gov",
  };
}
