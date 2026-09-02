import type { VitItem, VitPlanDict } from "./types";
import {
  MULTI_WORDS,
  D_WORDS,
  MG_WORDS,
  OMEGA_WORDS,
  CREATINE_WORDS,
  B12_WORDS,
  IRON_WORDS,
  PROGRAM_DOSE,
} from "./constants";
import { ageBand, blobOf, hasWord, rdaFor, sexKey } from "./helpers";

function item(name: string, dose: string, when: string, why: string, status: VitItem["status"]): VitItem {
  return { name, dose, when, why, status };
}

export function vitPlan(opts: {
  age: number | null;
  sex: string | null | undefined;
  listed?: Array<Record<string, unknown> | string> | null;
  no_supps?: boolean;
  adjust?: boolean;
  vegetarian?: boolean;
  lifts?: boolean;
  indoor_or_evening?: boolean;
  eats_fatty_fish_weekly?: boolean;
  dairy_ok?: boolean;
  meds?: string;
}): VitPlanDict {
  const rda = rdaFor(opts.age, opts.sex);
  const sk = sexKey(opts.sex);
  const band = ageBand(opts.age);
  const rows = opts.listed || [];
  const blob = blobOf(rows as Array<Record<string, unknown> | string>);
  const names: string[] = [];
  for (const row of rows) {
    if (row && typeof row === "object" && !Array.isArray(row)) {
      names.push(String((row as { type?: string; name?: string }).type || (row as { name?: string }).name || "").trim());
    } else {
      names.push(String(row).trim());
    }
  }
  const listedNames = names.filter(Boolean);
  const noSupps = Boolean(opts.no_supps);
  const adjust = opts.adjust !== false;
  const vegetarian = Boolean(opts.vegetarian);
  const lifts = opts.lifts !== false;
  const eatsFish = Boolean(opts.eats_fatty_fish_weekly);
  const dairyOk = opts.dairy_ok !== false;
  const meds = String(opts.meds || "");

  const keep: VitItem[] = [];
  const add: VitItem[] = [];
  const optional: VitItem[] = [];
  const notes: string[] = [];

  const hasMulti = hasWord(blob, MULTI_WORDS) && !noSupps;
  const hasD = hasWord(blob, D_WORDS);
  const hasMg = hasWord(blob, MG_WORDS);
  const hasOmega = hasWord(blob, OMEGA_WORDS);
  const hasCreatine = hasWord(blob, CREATINE_WORDS);
  const hasB12 = hasWord(blob, B12_WORDS);
  const hasIron = hasWord(blob, IRON_WORDS);

  notes.push("Not a prescription. A physician should review this stack, especially with meds.");
  if (meds.trim() && !["none", "n/a", "no", "na"].includes(meds.trim().toLowerCase())) {
    notes.push(`Medications stay as written: ${meds.trim()}. Do not change them.`);
  }

  if (noSupps || listedNames.length === 0) {
    add.push(
      item(
        "Adult multivitamin",
        PROGRAM_DOSE.multi,
        "Breakfast with food",
        `Covers the RDA floor for your group (${sk}, band ${band}). ISSN: a low-dose daily multi is reasonable when training food is short. Not a performance drug.`,
        "ADD",
      ),
    );
  } else if (hasMulti) {
    const label = listedNames.find((n) => hasWord(n.toLowerCase(), MULTI_WORDS)) || "Your multi";
    keep.push(
      item(
        label,
        "Keep the dose on your label. Do not stack a second complete multi.",
        "With food, as you already take it",
        "Already covering the basic vitamin / mineral floor.",
        "KEEP",
      ),
    );
  } else {
    add.push(
      item(
        "Adult multivitamin",
        PROGRAM_DOSE.multi,
        "Breakfast with food",
        "Your list has no complete multi. Food plus one basic adult multi is the 30-day floor.",
        "ADD",
      ),
    );
  }

  if (hasD) {
    const label = listedNames.find((n) => hasWord(n.toLowerCase(), D_WORDS)) || "Vitamin D";
    keep.push(
      item(
        label,
        "Keep yours. Total D from multi + extra should stay under 4000 IU unless a clinician set a higher dose.",
        "With a meal that has fat",
        `RDA is ${rda.vitamin_d_iu} IU. UL is 4000 IU.`,
        "KEEP",
      ),
    );
  } else {
    add.push(
      item(
        "Vitamin D3",
        PROGRAM_DOSE.vitamin_d3,
        "Any meal with fat",
        `RDA is ${rda.vitamin_d_iu} IU (${rda.vitamin_d_mcg} mcg). Most basic multis only put 400–800 IU in the pack. Indoor or night sessions make food + sun a weak bet.`,
        "ADD",
      ),
    );
  }

  if (hasMg) {
    const label = listedNames.find((n) => hasWord(n.toLowerCase(), MG_WORDS)) || "Magnesium";
    keep.push(
      item(
        label,
        "Keep. Stay at or under 350 mg extra elemental Mg if your stomach complains (that is the supplement UL).",
        "Night",
        `Food RDA is ${rda.magnesium_mg} mg. Training and sweat raise the practical need.`,
        "KEEP",
      ),
    );
  } else {
    add.push(
      item(
        "Magnesium glycinate",
        PROGRAM_DOSE.magnesium_glycinate,
        "Night",
        `Food RDA is ${rda.magnesium_mg} mg. A multi rarely covers it. We add 200–350 mg glycinate at night, under the 350 mg supplement UL.`,
        "ADD",
      ),
    );
  }

  if (hasOmega) {
    const label = listedNames.find((n) => hasWord(n.toLowerCase(), OMEGA_WORDS)) || "Fish oil";
    keep.push(
      item(label, "Keep 1–2 g EPA+DHA. More than ~3 g/day is a clinician conversation.", "With a meal", "Already on the list.", "KEEP"),
    );
  } else if (!eatsFish) {
    add.push(
      item(
        "Fish oil or algae oil",
        PROGRAM_DOSE.omega3,
        "With a meal",
        "Not in a multi. Useful when fatty fish is not on the week. Algae oil if they do not do fish.",
        "ADD",
      ),
    );
  } else {
    optional.push(
      item("Fish oil", PROGRAM_DOSE.omega3, "With a meal", "You already eat fatty fish. Optional, not required this month.", "OPTIONAL"),
    );
  }

  if (lifts) {
    if (hasCreatine) {
      const label = listedNames.find((n) => hasWord(n.toLowerCase(), CREATINE_WORDS)) || "Creatine";
      keep.push(
        item(label, "5 g every eating day. Pause on water-only fast days.", "Any meal", "Already on the list. ISSN: most effective strength supplement we will name.", "KEEP"),
      );
    } else {
      const it = item(
        "Creatine monohydrate",
        PROGRAM_DOSE.creatine,
        "Any meal, eating days only",
        "Not a vitamin. It is the one strength extra this program will name if you lift. Pause on water-only fasts.",
        adjust ? "ADD" : "OPTIONAL",
      );
      (adjust ? add : optional).push(it);
    }
  }

  const needB12 = vegetarian || (opts.age !== null && opts.age >= 51);
  if (needB12 && !hasB12 && !hasMulti) {
    add.push(
      item(
        "Vitamin B12",
        PROGRAM_DOSE.b12,
        "Morning",
        "RDA is 2.4 mcg. Plant-only plates and age 51+ absorb it poorly from food alone. A multi that already lists B12 covers this.",
        "ADD",
      ),
    );
  } else if (needB12 && hasMulti) {
    notes.push(
      "B12: your multi should cover the 2.4 mcg RDA. If the label has none and you eat little or no animal food, add 250–500 mcg.",
    );
  }

  if (hasIron) {
    keep.push(
      item(
        "Iron",
        "Keep only the dose a clinician set. Do not add more from a second multi.",
        "As prescribed",
        `RDA is ${rda.iron_mg} mg. Extra iron is not a training upgrade.`,
        "KEEP",
      ),
    );
  } else if (sk === "F" && (opts.age === null || opts.age < 51)) {
    notes.push(
      `Iron: RDA is ${rda.iron_mg} mg for women 19–50. Get it from food plus the multi. Do not add a separate iron pill unless bloodwork already said so.`,
    );
  } else {
    notes.push(PROGRAM_DOSE.iron_note);
  }

  if (!dairyOk) {
    notes.push(
      `Calcium: RDA is ${rda.calcium_mg} mg. No dairy this month — use fortified alt-milk or canned fish with bones. Do not stack calcium pills on top of a multi without a reason.`,
    );
  } else {
    notes.push(PROGRAM_DOSE.calcium_note);
  }

  const classified = [...MULTI_WORDS, ...D_WORDS, ...MG_WORDS, ...OMEGA_WORDS, ...CREATINE_WORDS, ...B12_WORDS, ...IRON_WORDS];
  for (const n of listedNames) {
    if (n && !hasWord(n.toLowerCase(), classified)) {
      keep.push(item(n, "Keep the dose you already use.", "As you already take it", "On your form. Not part of the vitamin floor. Left alone.", "KEEP"));
    }
  }

  notes.push(
    "Water-only fast days: pause food-bound pills (multi, D, fish oil, creatine). Keep meds on the schedule a clinician set.",
  );

  const listedStr = listedNames.length ? listedNames.join(", ") : "nothing";
  const addNames = add.map((i) => i.name);
  const keepNames = keep.map((i) => i.name);
  let head: string;
  if (!listedNames.length) {
    head = "Your form listed no vitamins. This month still gets a basic floor so training food does not leave a hole.";
  } else if (addNames.length) {
    head = `You listed ${listedStr}. We keep what already covers the floor and add only the gaps below.`;
  } else {
    head = `You listed ${listedStr}. That already covers the vitamin floor for this month, so the routine stays yours.`;
  }
  const bits: string[] = [];
  if (addNames.length) bits.push("Added: " + addNames.join(", ") + ".");
  if (keepNames.length) bits.push("Kept: " + keepNames.join(", ") + ".");
  bits.push("We do not stack two complete multis. We do not change medications.");
  const changeSummary = head + " " + bits.join(" ");
  const changes = [...keep, ...add, ...optional].map((i) => ({ action: i.status, name: i.name, why: i.why }));

  const page_lines: [string, string, string, string][] = [];
  for (const i of keep) page_lines.push(["KEEP", i.name, `${i.dose}  ·  ${i.when}`, i.why]);
  for (const i of add) page_lines.push(["ADD", i.name, `${i.dose}  ·  ${i.when}`, i.why]);
  for (const i of optional) page_lines.push(["OPT", i.name, `${i.dose}  ·  ${i.when}`, i.why]);

  return {
    band,
    sex: sk,
    has_multi: hasMulti,
    keep,
    add,
    optional,
    notes,
    page_lines,
    why_we_changed: changeSummary,
    changes,
    rda_highlights: {
      vitamin_d_iu: rda.vitamin_d_iu,
      vitamin_c_mg: rda.vitamin_c_mg,
      calcium_mg: rda.calcium_mg,
      iron_mg: rda.iron_mg,
      magnesium_mg: rda.magnesium_mg,
      zinc_mg: rda.zinc_mg,
      b12_mcg: rda.vitamin_b12_mcg,
      folate_mcg: rda.folate_mcg,
    },
  };
}
