#!/usr/bin/env python3
"""Playbook Creator — source of truth for every 30 Day Fitness Playbook.

Copyright © 2026 30 Day Fitness Playbook. All rights reserved.
Proprietary. Do not copy, publish, or reuse this file or the intake
schema outside 30 Day Fitness Playbook without written permission.

Published equations we cite (Mifflin-St Jeor, USDA household units,
ISSN protein ranges, NASEM RDAs) are public science. This file is the
decision tree that turns a form into a 30-day book. That tree is ours.

Stay robust. Handle every form field. Defaults when blank, never by
deleting a path to make the file shorter. Form-driven only.

Evidence job: every time this file is opened for a playbook, search
ISSN, ACSM, NASEM/NIH ODS, Adult Compendium, Hall. If a later paper
beats a constant, change the constant AND the SOURCES card the same day.
Last evidence pass: 2026-09-01.
"""

from __future__ import annotations

import argparse
import calendar
import datetime as dt
import json
import re
from pathlib import Path
from dataclasses import dataclass, field


# ---------------------------------------------------------------------------
# NASEM RDA / AI for adults. Values are daily totals from food + pills.
# Age bands: 19_50 and 51_70. 71+ uses 51_70 except vitamin D and calcium.
# Units follow the current US label (mcg RAE, mcg DFE, mcg, mg).
# ---------------------------------------------------------------------------

RDA = {
    "19_50": {
        "M": {
            "vitamin_a_mcg": 900,
            "vitamin_c_mg": 90,
            "vitamin_d_mcg": 15,
            "vitamin_d_iu": 600,
            "vitamin_e_mg": 15,
            "vitamin_k_mcg": 120,  # AI
            "thiamin_mg": 1.2,
            "riboflavin_mg": 1.3,
            "niacin_mg": 16,
            "vitamin_b6_mg": 1.3,
            "folate_mcg": 400,
            "vitamin_b12_mcg": 2.4,
            "pantothenic_mg": 5,  # AI
            "biotin_mcg": 30,  # AI
            "choline_mg": 550,  # AI
            "calcium_mg": 1000,
            "iron_mg": 8,
            "magnesium_mg": 400,  # 19-30; 31-50 is 420 — we use 400-420
            "zinc_mg": 11,
            "selenium_mcg": 55,
            "potassium_mg": 3400,  # AI
            "iodine_mcg": 150,
            "copper_mcg": 900,
            "phosphorus_mg": 700,
        },
        "F": {
            "vitamin_a_mcg": 700,
            "vitamin_c_mg": 75,
            "vitamin_d_mcg": 15,
            "vitamin_d_iu": 600,
            "vitamin_e_mg": 15,
            "vitamin_k_mcg": 90,
            "thiamin_mg": 1.1,
            "riboflavin_mg": 1.1,
            "niacin_mg": 14,
            "vitamin_b6_mg": 1.3,
            "folate_mcg": 400,
            "vitamin_b12_mcg": 2.4,
            "pantothenic_mg": 5,
            "biotin_mcg": 30,
            "choline_mg": 425,
            "calcium_mg": 1000,
            "iron_mg": 18,
            "magnesium_mg": 310,  # 19-30; 31-50 is 320
            "zinc_mg": 8,
            "selenium_mcg": 55,
            "potassium_mg": 2600,
            "iodine_mcg": 150,
            "copper_mcg": 900,
            "phosphorus_mg": 700,
        },
    },
    "51_70": {
        "M": {
            "vitamin_a_mcg": 900,
            "vitamin_c_mg": 90,
            "vitamin_d_mcg": 15,
            "vitamin_d_iu": 600,
            "vitamin_e_mg": 15,
            "vitamin_k_mcg": 120,
            "thiamin_mg": 1.2,
            "riboflavin_mg": 1.3,
            "niacin_mg": 16,
            "vitamin_b6_mg": 1.7,
            "folate_mcg": 400,
            "vitamin_b12_mcg": 2.4,
            "pantothenic_mg": 5,
            "biotin_mcg": 30,
            "choline_mg": 550,
            "calcium_mg": 1000,
            "iron_mg": 8,
            "magnesium_mg": 420,
            "zinc_mg": 11,
            "selenium_mcg": 55,
            "potassium_mg": 3400,
            "iodine_mcg": 150,
            "copper_mcg": 900,
            "phosphorus_mg": 700,
        },
        "F": {
            "vitamin_a_mcg": 700,
            "vitamin_c_mg": 75,
            "vitamin_d_mcg": 15,
            "vitamin_d_iu": 600,
            "vitamin_e_mg": 15,
            "vitamin_k_mcg": 90,
            "thiamin_mg": 1.1,
            "riboflavin_mg": 1.1,
            "niacin_mg": 14,
            "vitamin_b6_mg": 1.5,
            "folate_mcg": 400,
            "vitamin_b12_mcg": 2.4,
            "pantothenic_mg": 5,
            "biotin_mcg": 30,
            "choline_mg": 425,
            "calcium_mg": 1200,
            "iron_mg": 8,
            "magnesium_mg": 320,
            "zinc_mg": 8,
            "selenium_mcg": 55,
            "potassium_mg": 2600,
            "iodine_mcg": 150,
            "copper_mcg": 900,
            "phosphorus_mg": 700,
        },
    },
}

# 71+ deltas on top of 51_70
RDA_71_PLUS = {
    "vitamin_d_mcg": 20,
    "vitamin_d_iu": 800,
    "calcium_mg": 1200,  # men also move to 1200 at 71
}

# Adult tolerable upper intake levels we refuse to exceed in a playbook.
UL_ADULT = {
    "vitamin_d_iu": 4000,
    "vitamin_d_mcg": 100,
    "vitamin_a_mcg": 3000,
    "vitamin_c_mg": 2000,
    "vitamin_e_mg": 1000,
    "niacin_mg": 35,  # UL is for supplemental nicotinic acid
    "vitamin_b6_mg": 100,
    "folate_mcg": 1000,  # supplemental folic acid
    "calcium_mg": 2500,  # 19-50; 2000 for 51+
    "iron_mg": 45,
    "magnesium_mg": 350,  # UL is for supplemental Mg only, not food
    "zinc_mg": 40,
    "selenium_mcg": 400,
}

# FDA Daily Values on adult Supplement Facts labels. A "complete multi"
# in this program means it hits most of these at ~100% DV, not a mega pack.
LABEL_DV = {
    "vitamin_a_mcg": 900,
    "vitamin_c_mg": 90,
    "vitamin_d_mcg": 20,
    "vitamin_d_iu": 800,
    "vitamin_e_mg": 15,
    "vitamin_k_mcg": 120,
    "thiamin_mg": 1.2,
    "riboflavin_mg": 1.3,
    "niacin_mg": 16,
    "vitamin_b6_mg": 1.7,
    "folate_mcg": 400,
    "vitamin_b12_mcg": 2.4,
    "biotin_mcg": 30,
    "pantothenic_mg": 5,
    "choline_mg": 550,
    "calcium_mg": 1300,
    "iron_mg": 18,
    "magnesium_mg": 420,
    "zinc_mg": 11,
    "selenium_mcg": 55,
    "copper_mcg": 0.9,
    "iodine_mcg": 150,
}


# What the 30-day program actually puts on the page.
# Food first. Pills cover the holes a training month usually leaves.
PROGRAM_DOSE = {
    "multi": "1 daily adult multivitamin / mineral with food (aim ~100% DV, not a mega pack)",
    "vitamin_d3": "1000–2000 IU vitamin D3 with a meal that has fat",
    "magnesium_glycinate": "200–350 mg elemental magnesium as glycinate at night. Start at 200. Do not exceed the 350 mg supplement UL.",
    "omega3": "1–2 g combined EPA+DHA (fish oil or algae oil) with a meal",
    "creatine": "5 g creatine monohydrate every eating day. No loading phase.",
    "b12": "250–500 mcg methylcobalamin or cyanocobalamin daily",
    "iron_note": "Do not add iron pills unless a clinician already prescribed them.",
    "calcium_note": "Prefer food (dairy, fortified alt-milk, canned fish with bones). Do not stack calcium pills on top of a multi plus dairy.",
}


MULTI_WORDS = (
    "multi", "multivitamin", "multi-vitamin", "vitamin pack", "pak",
    "animal pak", "opti-men", "optimen", "opti-women", "centrum",
    "one a day", "one-a-day", "ritual", "athletic greens", "ag1",
    "greens", "mens multi", "womens multi", "women's multi",
)

D_WORDS = ("vitamin d", "vit d", "d3", "d-3", "cholecalciferol")
MG_WORDS = ("magnesium", "mag glycinate", "mag threonate", "mag citrate")
OMEGA_WORDS = ("fish oil", "omega", "omega-3", "omega 3", "epa", "dha", "krill", "algae oil")
CREATINE_WORDS = ("creatine",)
B12_WORDS = ("b12", "b-12", "cobalamin", "methylcobalamin")
IRON_WORDS = ("iron", "ferrous", "ferritin")
C_WORDS = ("vitamin c", "vit c", "ascorbic")
ZINC_WORDS = ("zinc", "zma")
CALCIUM_WORDS = ("calcium", "cal-mag")


def age_band(age: int | None) -> str:
    if age is None:
        return "19_50"
    if age >= 71:
        return "71"
    if age >= 51:
        return "51_70"
    return "19_50"


def sex_key(sex: str | None) -> str:
    s = (sex or "").strip().lower()
    if s.startswith("f") or s in {"w", "woman", "female"}:
        return "F"
    return "M"


def rda_for(age: int | None, sex: str | None) -> dict:
    sk = sex_key(sex)
    band = age_band(age)
    if band == "71":
        base = dict(RDA["51_70"][sk])
        base.update(RDA_71_PLUS)
        if sk == "M":
            base["calcium_mg"] = 1200
        return base
    return dict(RDA[band][sk])


def _blob(listed: list[dict] | list[str]) -> str:
    parts = []
    for row in listed or []:
        if isinstance(row, dict):
            parts.append(" ".join(str(v) for v in row.values() if v))
        else:
            parts.append(str(row))
    return " ".join(parts).lower()


def _has(blob: str, words: tuple[str, ...]) -> bool:
    """Whole-token match so 'dha' does not fire inside 'ashwagandha'."""
    for w in words:
        if " " in w or "-" in w:
            if w in blob:
                return True
        else:
            if re.search(rf"(?<![a-z0-9]){re.escape(w)}(?![a-z0-9])", blob):
                return True
    return False


@dataclass
class VitItem:
    name: str
    dose: str
    when: str
    why: str
    status: str  # KEEP / ADD / OPTIONAL / SKIP


@dataclass
class VitPlan:
    band: str
    sex: str
    rda: dict
    has_multi: bool
    listed_names: list[str]
    keep: list[VitItem] = field(default_factory=list)
    add: list[VitItem] = field(default_factory=list)
    optional: list[VitItem] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)
    page_lines: list[tuple] = field(default_factory=list)
    change_summary: str = ""
    changes: list[dict] = field(default_factory=list)

    def as_dict(self) -> dict:
        return {
            "band": self.band,
            "sex": self.sex,
            "has_multi": self.has_multi,
            "keep": [i.__dict__ for i in self.keep],
            "add": [i.__dict__ for i in self.add],
            "optional": [i.__dict__ for i in self.optional],
            "notes": self.notes,
            "page_lines": self.page_lines,
            "why_we_changed": self.change_summary,
            "changes": self.changes,
            "rda_highlights": {
                "vitamin_d_iu": self.rda["vitamin_d_iu"],
                "vitamin_c_mg": self.rda["vitamin_c_mg"],
                "calcium_mg": self.rda["calcium_mg"],
                "iron_mg": self.rda["iron_mg"],
                "magnesium_mg": self.rda["magnesium_mg"],
                "zinc_mg": self.rda["zinc_mg"],
                "b12_mcg": self.rda["vitamin_b12_mcg"],
                "folate_mcg": self.rda["folate_mcg"],
            },
        }


def vit_plan(
    *,
    age: int | None,
    sex: str | None,
    listed: list | None = None,
    no_supps: bool = False,
    adjust: bool = True,
    vegetarian: bool = False,
    lifts: bool = True,
    indoor_or_evening: bool = True,
    eats_fatty_fish_weekly: bool = False,
    dairy_ok: bool = True,
    meds: str = "",
) -> VitPlan:
    """Build the 30-day vitamin block from the form.

    Vitamins are part of the program even if they left section 07 blank.
    Performance extras (citrulline, test boosters) stay off this list
    unless they already take them.
    """
    rda = rda_for(age, sex)
    sk = sex_key(sex)
    band = age_band(age)
    rows = listed or []
    blob = _blob(rows)
    names = []
    for row in rows:
        if isinstance(row, dict):
            names.append(str(row.get("type") or row.get("name") or "").strip())
        else:
            names.append(str(row).strip())
    names = [n for n in names if n]

    plan = VitPlan(band=band, sex=sk, rda=rda, has_multi=False, listed_names=names)

    has_multi = _has(blob, MULTI_WORDS) and not no_supps
    has_d = _has(blob, D_WORDS)
    has_mg = _has(blob, MG_WORDS)
    has_omega = _has(blob, OMEGA_WORDS)
    has_creatine = _has(blob, CREATINE_WORDS)
    has_b12 = _has(blob, B12_WORDS)
    has_iron = _has(blob, IRON_WORDS)
    plan.has_multi = has_multi

    plan.notes.append(
        "Not a prescription. A physician should review this stack, especially with meds."
    )
    if meds.strip() and meds.strip().lower() not in {"none", "n/a", "no", "na"}:
        plan.notes.append(f"Medications stay as written: {meds.strip()}. Do not change them.")

    # Multi — the floor of the program
    if no_supps or not names:
        plan.add.append(VitItem(
            "Adult multivitamin",
            PROGRAM_DOSE["multi"],
            "Breakfast with food",
            f"Covers the RDA floor for your group ({sk}, band {band}). ISSN: a low-dose daily multi is reasonable when training food is short. Not a performance drug.",
            "ADD",
        ))
    elif has_multi:
        label = next((n for n in names if _has(n.lower(), MULTI_WORDS)), "Your multi")
        plan.keep.append(VitItem(
            label,
            "Keep the dose on your label. Do not stack a second complete multi.",
            "With food, as you already take it",
            "Already covering the basic vitamin / mineral floor.",
            "KEEP",
        ))
    else:
        # They take things, but nothing that looks like a complete multi
        plan.add.append(VitItem(
            "Adult multivitamin",
            PROGRAM_DOSE["multi"],
            "Breakfast with food",
            "Your list has no complete multi. Food plus one basic adult multi is the 30-day floor.",
            "ADD",
        ))

    # Vitamin D — RDA 600–800 IU. Indoor / evening trainers and most adults
    # in the northern US fall short from food + a 400 IU multi.
    if has_d:
        label = next((n for n in names if _has(n.lower(), D_WORDS)), "Vitamin D")
        plan.keep.append(VitItem(
            label,
            "Keep yours. Total D from multi + extra should stay under 4000 IU unless a clinician set a higher dose.",
            "With a meal that has fat",
            f"RDA is {rda['vitamin_d_iu']} IU. UL is 4000 IU.",
            "KEEP",
        ))
    else:
        why = (
            f"RDA is {rda['vitamin_d_iu']} IU ({rda['vitamin_d_mcg']} mcg). "
            "Most basic multis only put 400–800 IU in the pack. Indoor or night sessions make food + sun a weak bet."
        )
        plan.add.append(VitItem(
            "Vitamin D3",
            PROGRAM_DOSE["vitamin_d3"],
            "Any meal with fat",
            why,
            "ADD",
        ))

    # Magnesium — food RDA 310–420. Multi usually 50–100. Night glycinate.
    if has_mg:
        label = next((n for n in names if _has(n.lower(), MG_WORDS)), "Magnesium")
        plan.keep.append(VitItem(
            label,
            "Keep. Stay at or under 350 mg extra elemental Mg if your stomach complains (that is the supplement UL).",
            "Night",
            f"Food RDA is {rda['magnesium_mg']} mg. Training and sweat raise the practical need.",
            "KEEP",
        ))
    else:
        plan.add.append(VitItem(
            "Magnesium glycinate",
            PROGRAM_DOSE["magnesium_glycinate"],
            "Night",
            f"Food RDA is {rda['magnesium_mg']} mg. A multi rarely covers it. We add 200–350 mg glycinate at night, under the 350 mg supplement UL.",
            "ADD",
        ))

    # Omega-3 — not an RDA vitamin. Add if they do not eat fatty fish.
    if has_omega:
        label = next((n for n in names if _has(n.lower(), OMEGA_WORDS)), "Fish oil")
        plan.keep.append(VitItem(
            label,
            "Keep 1–2 g EPA+DHA. More than ~3 g/day is a clinician conversation.",
            "With a meal",
            "Already on the list.",
            "KEEP",
        ))
    elif not eats_fatty_fish_weekly:
        plan.add.append(VitItem(
            "Fish oil or algae oil",
            PROGRAM_DOSE["omega3"],
            "With a meal",
            "Not in a multi. Useful when fatty fish is not on the week. Algae oil if they do not do fish.",
            "ADD",
        ))
    else:
        plan.optional.append(VitItem(
            "Fish oil",
            PROGRAM_DOSE["omega3"],
            "With a meal",
            "You already eat fatty fish. Optional, not required this month.",
            "OPTIONAL",
        ))

    # Creatine — only if they lift or play a power sport. Not a vitamin.
    if lifts:
        if has_creatine:
            label = next((n for n in names if _has(n.lower(), CREATINE_WORDS)), "Creatine")
            plan.keep.append(VitItem(
                label,
                "5 g every eating day. Pause on water-only fast days.",
                "Any meal",
                "Already on the list. ISSN: most effective strength supplement we will name.",
                "KEEP",
            ))
        else:
            item = VitItem(
                "Creatine monohydrate",
                PROGRAM_DOSE["creatine"],
                "Any meal, eating days only",
                "Not a vitamin. It is the one strength extra this program will name if you lift. Pause on water-only fasts.",
                "ADD" if adjust else "OPTIONAL",
            )
            (plan.add if adjust else plan.optional).append(item)

    # B12 — vegetarians and age 51+
    need_b12 = vegetarian or (age is not None and age >= 51)
    if need_b12 and not has_b12 and not has_multi:
        plan.add.append(VitItem(
            "Vitamin B12",
            PROGRAM_DOSE["b12"],
            "Morning",
            "RDA is 2.4 mcg. Plant-only plates and age 51+ absorb it poorly from food alone. A multi that already lists B12 covers this.",
            "ADD",
        ))
    elif need_b12 and has_multi:
        plan.notes.append(
            "B12: your multi should cover the 2.4 mcg RDA. If the label has none and you eat little or no animal food, add 250–500 mcg."
        )

    # Iron — warn, do not add
    if has_iron:
        plan.keep.append(VitItem(
            "Iron",
            "Keep only the dose a clinician set. Do not add more from a second multi.",
            "As prescribed",
            f"RDA is {rda['iron_mg']} mg. Extra iron is not a training upgrade.",
            "KEEP",
        ))
    elif sk == "F" and (age is None or age < 51):
        plan.notes.append(
            f"Iron: RDA is {rda['iron_mg']} mg for women 19–50. Get it from food plus the multi. "
            "Do not add a separate iron pill unless bloodwork already said so."
        )
    else:
        plan.notes.append(PROGRAM_DOSE["iron_note"])

    if not dairy_ok:
        plan.notes.append(
            f"Calcium: RDA is {rda['calcium_mg']} mg. No dairy this month — use fortified alt-milk or canned fish with bones. "
            "Do not stack calcium pills on top of a multi without a reason."
        )
    else:
        plan.notes.append(PROGRAM_DOSE["calcium_note"])

    classified = MULTI_WORDS + D_WORDS + MG_WORDS + OMEGA_WORDS + CREATINE_WORDS + B12_WORDS + IRON_WORDS
    for n in names:
        if n and not _has(n.lower(), classified):
            plan.keep.append(VitItem(
                n,
                "Keep the dose you already use.",
                "As you already take it",
                "On your form. Not part of the vitamin floor. Left alone.",
                "KEEP",
            ))

    # Fasting note always
    plan.notes.append(
        "Water-only fast days: pause food-bound pills (multi, D, fish oil, creatine). Keep meds on the schedule a clinician set."
    )

    explain_stack(plan)
    for item in plan.keep:
        plan.page_lines.append(("KEEP", item.name, f"{item.dose}  ·  {item.when}", item.why))
    for item in plan.add:
        plan.page_lines.append(("ADD", item.name, f"{item.dose}  ·  {item.when}", item.why))
    for item in plan.optional:
        plan.page_lines.append(("OPT", item.name, f"{item.dose}  ·  {item.when}", item.why))
    return plan


def explain_stack(plan: VitPlan) -> None:
    """Client-facing why. Snapshot prints change_summary, then each ADD/KEEP why."""
    listed = ", ".join(plan.listed_names) if plan.listed_names else "nothing"
    adds = [i.name for i in plan.add]
    keeps = [i.name for i in plan.keep]
    if not plan.listed_names:
        head = (
            "Your form listed no vitamins. This month still gets a basic floor "
            "so training food does not leave a hole."
        )
    elif adds:
        head = (
            f"You listed {listed}. We keep what already covers the floor "
            "and add only the gaps below."
        )
    else:
        head = (
            f"You listed {listed}. That already covers the vitamin floor for this month, "
            "so the routine stays yours."
        )
    bits = []
    if adds:
        bits.append("Added: " + ", ".join(adds) + ".")
    if keeps:
        bits.append("Kept: " + ", ".join(keeps) + ".")
    bits.append("We do not stack two complete multis. We do not change medications.")
    plan.change_summary = head + " " + " ".join(bits)
    plan.changes = [
        {"action": i.status, "name": i.name, "why": i.why}
        for i in (plan.keep + plan.add + plan.optional)
    ]


def print_plan(plan: VitPlan) -> None:
    print(f"group {plan.sex} / {plan.band}   multi_on_form={plan.has_multi}")
    print("RDA highlights", plan.as_dict()["rda_highlights"])
    print("WHY:", plan.change_summary)
    for row in plan.page_lines:
        tag, name, line = row[0], row[1], row[2]
        why = row[3] if len(row) > 3 else ""
        print(f"  [{tag}] {name} — {line}")
        if why:
            print(f"       why: {why}")
    for n in plan.notes:
        print("  note:", n)


# ---------------------------------------------------------------------------
# Playbook Creator — numbers, stack, calendar. PDF code lives in make_playbook.
# ---------------------------------------------------------------------------

G_PER_OZ_COOKED_MEAT = 7.0
G_PER_EGG = 6.3
G_PER_CUP_GREEK_YOGURT = 23.0
G_PER_CUP_COTTAGE = 25.0
G_PER_CUP_COTTAGE = 25.0
G_PER_CUP_COOKED_OATS = 6.0
G_PER_WHEY_SCOOP = 24.0

LB_PER_KG = 2.2046226218
ML_PER_OZ = 29.5735

# ISSN 2017: 1.4–2.0 g/kg most exercising adults. 2.3–3.1 only for lean
# trained athletes in a hard deficit. We stay at 1.4–2.0 maintain / push
# and 1.6–2.2 on a cut (Helms contest-prep band). Never print >2.2.
PROTEIN_G_PER_KG = {
    "maintain": (1.4, 2.0),
    "cut": (1.6, 2.2),
    "push": (1.6, 2.0),
}
PROTEIN_G_PER_KG_LOW = 1.6
PROTEIN_G_PER_KG_HIGH = 2.2
PROTEIN_PER_SITTING_G_LOW = 20
PROTEIN_PER_SITTING_G_HIGH = 40

WATER_ML_PER_KG = 32.0
WATER_TRAIN_BONUS_ML = 500.0
WATER_IOM_DRINK_F_ML = 2160.0
WATER_IOM_DRINK_M_ML = 2960.0

CUT_PCT_PER_WEEK_LOW = 0.005
CUT_PCT_PER_WEEK_HIGH = 0.008

STRENGTH_SESSIONS_MIN = 2
SETS_PER_EXERCISE = (2, 3)
HARD_SETS_PER_MUSCLE_WEEK_MAINTAIN = (6, 10)
HARD_SETS_PER_MUSCLE_WEEK_GROW = (10, 15)

# Evidence fences. audit_plan() flags anything that walks outside.
MARGINS = {
    "protein_g_per_kg": (1.4, 2.2),
    "protein_sitting_g": (20, 60),  # 60 only when they eat 2 meals
    "water_ml_per_kg": (30, 40),
    "cut_pct_week": (0.005, 0.010),
    "strength_days_week": (2, 6),
    "sets_per_exercise": (2, 3),
    "hard_sets_muscle_week": (4, 16),
    "vitamin_d_iu_add": (1000, 2000),
    "vitamin_d_iu_ul": 4000,
    "magnesium_elemental_mg": (200, 350),
    "omega3_epa_dha_g": (1.0, 2.0),
    "creatine_g": (3, 5),
    "calorie_floor_m": 1500,
    "calorie_floor_f": 1200,
    "deficit_kcal_day_max": 1000,
    "push_surplus_kcal": 250,
}

# Mifflin-St Jeor 1990. Best-validated office RMR for non-clinical adults.
# Activity factors are the standard Harris-Benedict / ACSM PAL multipliers.
ACTIVITY_FACTOR = {
    "sedentary": 1.20,   # desk, 0–1 hard days
    "light": 1.375,      # on feet some, 1–3 train days
    "moderate": 1.55,    # 3–5 train days
    "very": 1.725,       # physical job or 6–7 train days
}
KCAL_PER_LB = 3500.0  # Wishnofsky planning constant. Hall 2011: overestimates long term.
DAYS_PLAN = 30

BRAND = {
    "name": "30 Day Fitness Playbook",
    "tagline": "Your rules. Your results.",
    "disclaimer": "Not medical care. A physician should review this before you use it.",
    "wordmark": "/home/workdir/artifacts/brand/wordmark.png",
    "shield": "/home/workdir/artifacts/brand/shield.png",
    "stamp": "/home/workdir/artifacts/brand/stamp.png",
    "colors": {
        "bg": "#101410",
        "card": "#171C28",
        "cream": "#F5F7FB",
        "muted": "#A8B2C4",
        "red": "#C41E3A",
        "blue": "#3D6FDB",
        "sport": "#7EB0FF",
    },
}

CHAPTERS = (
    ("01", "SNAPSHOT", "Who they are this month. Stack. Water. The week."),
    ("02", "30 DAYS", "Calendar from the start date weekday. Travel and fasts marked."),
    ("03", "EXERCISE", "Sessions capped to that day's minutes. Sport days are the sport."),
    ("04", "ENERGY", "Meal options with ounces. Swap foods. Keep the amounts."),
    ("05", "FASTING", "Only if they asked. Off sport and rest when a training day can hold it."),
    ("06", "HOW TO RUN IT", "Session rules, miss days, scale, stack timing."),
    ("07", "SOURCES", "Where the numbers come from. Not a journal club."),
)

SOURCES = (
    (
        "Protein",
        "1.6–2.2 g/kg when they lift and cut. 20–40 g per sitting.",
        (
            "Jäger et al. ISSN position stand: protein and exercise. J Int Soc Sports Nutr. 2017.",
            "Helms, Aragon, Fitschen. Evidence-based recommendations for natural bodybuilding contest preparation. JISSN. 2014.",
            "Meal count does not burn extra fat. ISSN meal-frequency position stand. 2011.",
        ),
    ),
    (
        "Water",
        "Drink target 32 ml/kg plus 500 ml on a training day. Printed as jug fills.",
        (
            "National Academies. Dietary Reference Intakes for Water, Potassium, Sodium, Chloride, and Sulfate. 2005.",
            "Adequate intake: 3.7 L/day men and 2.7 L/day women, food included. We print the drinking slice.",
        ),
    ),
    (
        "Fat loss",
        "Honest 30-day cut is 0.5–0.8% of bodyweight per week if they want to keep the lifts.",
        (
            "Garthe et al. Effect of two different weight-loss rates on body composition and strength. Int J Sport Nutr Exerc Metab. 2011.",
            "Faster than about 1%/week costs more lean mass. The opening note uses this range, not a wish.",
        ),
    ),
    (
        "Calories",
        "Mifflin-St Jeor × activity = maintain. Deficit from the honest 30-day cut, not the wish.",
        (
            "Mifflin et al. A new predictive equation for resting energy expenditure. Am J Clin Nutr. 1990;51:241–247.",
            "Activity factors: sedentary 1.2, light 1.375, moderate 1.55, very active 1.725.",
            "Planning deficit uses 3500 kcal per lb (Wishnofsky 1958). Hall et al. Lancet 2011: that overestimates long-term loss. We only use it for a 30-day sketch.",
            "ACSM weight-loss guidance: 500–1000 kcal/day deficit. We cap at 1000. Floor 1500 kcal men / 1200 women unless a clinician set lower.",
            "Session burn: kcal = MET × kg × hours (Ainsworth 2011; Herrmann 2024 Adult Compendium). Net = (MET − 1) × kg × hours so BMR is not counted twice.",
            "Eat-back is 50% on a cut, 70% maintain, 80% push. Do not eat 100% of a watch. Compensation and overestimation wipe the deficit.",
            "IOM 2005: dietary fiber adequate intake about 14 g per 1000 kcal. We print that as a veg-pile cue, not a separate diet.",
            "Meal facts: USDA FoodData Central household servings, rounded. Breakfast uses eggs/dairy/oats/whey. Steak and chicken are lunch and dinner.",
        ),
    ),
    (
        "Training",
        "At least 2 strength days/week. 2–3 sets. Compounds first. Cap the session to that day's minutes.",
        (
            "Currier et al. ACSM position stand: resistance training prescription for healthy adults. Med Sci Sports Exerc. 2026;58(4):851–872. First refresh in 17 years. 137 reviews.",
            "Any resistance work beats none. Hypertrophy likes ≥10 hard sets per muscle per week. Strength: 2–3 sets, ≥2 sessions, stop 2–3 reps short of failure. Participation beats perfect programming.",
            "ISSN 2025 omega-3 position stand: athletes often run low on EPA+DHA. We still add fish oil only when fatty fish is not on the form.",
        ),
    ),
    (
        "Vitamins",
        "Sex and age RDA from NASEM. Program floor if they listed nothing: multi + D3 + magnesium.",
        (
            "National Academies DRI tables. NIH Office of Dietary Supplements fact sheets. Vitamin D RDA 600 IU (800 IU over 70). UL 4000 IU.",
            "FDA Daily Values on the adult Supplement Facts label.",
            "Kreider et al. ISSN exercise & sport nutrition review. JISSN. 2010 / updates. A low-dose daily multi is coverage, not an ergogenic.",
            "Kreider et al. ISSN position stand: safety and efficacy of creatine. JISSN. 2017. 5 g/day eating days.",
        ),
    ),
    (
        "Fasting",
        "24 / 36 / 48 hour key. Ketones and fat oxidation as an assist to the 30-day cut. Not autophagy theater.",
        (
            "Cahill GF. Starvation in man. N Engl J Med. 1970;282:668–675. Phases: glycogenolysis, gluconeogenesis, then protein conservation.",
            "Rothman DL et al. 13C NMR: liver glycogen is largely gone by about 24 hours in overnight-to-day fasts. J Clin Invest. 1991.",
            "Browning JD et al. 48-hour fast in healthy adults: free fatty acids and ketones rise; ketones much higher at 48 h than 24 h. J Lipid Res. 2012.",
            "Ketones are made from mobilized fat (Cahill). That fuel switch is why a planned fast can assist the 30-day cut without us promising a miracle.",
            "Early starvation still uses some amino acids for glucose (Cahill / Owen). Lean-mass risk is smaller at 24 h than at 48 h. We do not claim autophagy or medical treatment.",
        ),
    ),
    (
        "Meals and meal builder",
        "Every printed meal and the live meal builder use the same household-unit database.",
        (
            "USDA FoodData Central. https://fdc.nal.usda.gov  Household measures, rounded to the serving we print (1 large egg, 1 cup cooked oats, 1 oz cooked meat).",
            "U.S. Department of Agriculture, Agricultural Research Service. FoodData Central. 2019–.",
            "Builder totals: kcal / protein / carbs / fat = amount × those rounded values. Custom foods use the numbers the client types.",
            "Fiber cue: IOM 2005, about 14 g per 1000 kcal. Not a separate diet.",
        ),
    ),
    (
        "How to read this",
        "These papers set the numbers. They do not make this medical care.",
        (
            "A physician should review the training, food, and stack before they run the month.",
            "Medications stay as written. We do not diagnose deficiency from a form.",
            "If a later paper beats one of these, the next playbook version changes. This copy uses the list above.",
        ),
    ),
)

FASTING_KEY = (
    ("24 hours", "Liver glycogen is mostly used. Fat burning rises and ketones start late in the window. A real assist to the month's cut with the smallest lean-mass cost of the three."),
    ("36 hours", "Ketones are steadier. Fat is the main fuel for most of the day. Bigger calorie gap than 24, so it helps the 30-day fat-loss number more. Keep it off sport days."),
    ("48 hours", "Deeper ketosis. Fat and ketones carry almost all of the work. Largest calorie hole of the three — that can move the scale if the week around it stays honest. Water and salt stay on. Not a first fast."),
)

WEEK_KIND = ("S", "C", "R")
WEEK_WHEN = ("Morning", "Afternoon", "Evening")
WEEK_TYPE = (
    "Full body", "Upper", "Lower", "Push", "Pull",
    "Legs", "Chest", "Back", "Shoulders", "Arms", "Core",
    "Walk", "Run", "Bike", "Row", "Swim", "Elliptical", "Stairs",
    "Hockey", "Boxing", "Basketball", "Soccer", "Tennis", "Golf",
    "Other",
)
SPORT_DAYS = {"Hockey", "Boxing", "Basketball", "Soccer", "Tennis", "Golf"}

PROTEIN_FOODS_G = {
    "meat_oz": 7.0,
    "eggs": 6.3,
    "yogurt_cups": 23.0,
    "cottage_cups": 25.0,
    "oats_cups": 6.0,
    "whey_scoops": 24.0,
}

# USDA FoodData Central rounded. Used to print a facts line on each plate.
# Units match how the plate speaks: 1 large egg, 1 cup yogurt, 1 oz cooked meat.
# USDA FoodData Central rounded household units. Also drives meal.html.
FOOD_FACTS = {
    "egg_large": {"name": "Large egg", "kcal": 72, "p": 6.3, "c": 0.4, "f": 5.0, "unit": "egg", "step": 1, "when": "breakfast lunch"},
    "egg_white": {"name": "Egg white", "kcal": 17, "p": 3.6, "c": 0.2, "f": 0.1, "unit": "white", "step": 1, "when": "breakfast"},
    "greek_yogurt_cup": {"name": "Nonfat Greek yogurt", "kcal": 130, "p": 23.0, "c": 9.0, "f": 0.7, "unit": "cup", "step": 0.5, "when": "breakfast snack"},
    "cottage_cup": {"name": "1–2% cottage cheese", "kcal": 160, "p": 25.0, "c": 6.0, "f": 2.3, "unit": "cup", "step": 0.5, "when": "breakfast snack"},
    "whey_scoop": {"name": "Whey protein", "kcal": 120, "p": 24.0, "c": 3.0, "f": 1.5, "unit": "scoop", "step": 0.5, "when": "breakfast snack"},
    "meat_oz": {"name": "Chicken or turkey, cooked", "kcal": 43, "p": 8.7, "c": 0.0, "f": 1.0, "unit": "oz", "step": 1, "when": "lunch dinner"},
    "steak_oz": {"name": "Lean steak, cooked", "kcal": 55, "p": 8.7, "c": 0.0, "f": 2.3, "unit": "oz", "step": 1, "when": "dinner"},
    "pork_oz": {"name": "Pork loin, cooked", "kcal": 50, "p": 8.3, "c": 0.0, "f": 1.8, "unit": "oz", "step": 1, "when": "lunch dinner"},
    "fish_oz": {"name": "Fish, cooked", "kcal": 40, "p": 6.5, "c": 0.0, "f": 1.5, "unit": "oz", "step": 1, "when": "lunch dinner"},
    "shrimp_oz": {"name": "Shrimp, cooked", "kcal": 28, "p": 6.8, "c": 0.0, "f": 0.3, "unit": "oz", "step": 1, "when": "lunch dinner"},
    "tuna_oz": {"name": "Tuna, canned in water", "kcal": 33, "p": 7.3, "c": 0.0, "f": 0.3, "unit": "oz", "step": 1, "when": "lunch"},
    "tofu_oz": {"name": "Firm tofu", "kcal": 21, "p": 2.3, "c": 0.5, "f": 1.3, "unit": "oz", "step": 1, "when": "breakfast lunch dinner"},
    "oats_cup_cooked": {"name": "Oats, cooked", "kcal": 166, "p": 6.0, "c": 28.0, "f": 3.6, "unit": "cup", "step": 0.25, "when": "breakfast"},
    "rice_cup": {"name": "Rice, cooked", "kcal": 205, "p": 4.3, "c": 45.0, "f": 0.4, "unit": "cup", "step": 0.25, "when": "lunch dinner"},
    "pasta_cup": {"name": "Pasta, cooked", "kcal": 220, "p": 8.0, "c": 43.0, "f": 1.3, "unit": "cup", "step": 0.25, "when": "lunch dinner"},
    "potato_med": {"name": "Potato, medium", "kcal": 160, "p": 4.0, "c": 37.0, "f": 0.2, "unit": "potato", "step": 0.5, "when": "lunch dinner"},
    "bread_slice": {"name": "Bread slice", "kcal": 80, "p": 4.0, "c": 14.0, "f": 1.0, "unit": "slice", "step": 1, "when": "breakfast lunch"},
    "fruit_cup": {"name": "Fruit", "kcal": 80, "p": 1.0, "c": 20.0, "f": 0.3, "unit": "cup", "step": 0.5, "when": "breakfast snack"},
    "veg_cup": {"name": "Cooked vegetables", "kcal": 35, "p": 2.5, "c": 7.0, "f": 0.3, "unit": "cup", "step": 0.5, "when": "lunch dinner breakfast"},
    "greens_cup": {"name": "Raw greens", "kcal": 10, "p": 1.0, "c": 2.0, "f": 0.1, "unit": "cup", "step": 1, "when": "lunch dinner breakfast"},
    "beans_cup": {"name": "Beans, cooked", "kcal": 110, "p": 7.5, "c": 20.0, "f": 0.5, "unit": "cup", "step": 0.25, "when": "lunch dinner"},
    "avocado_half": {"name": "Avocado, half", "kcal": 120, "p": 1.5, "c": 6.0, "f": 11.0, "unit": "half", "step": 0.5, "when": "breakfast lunch"},
    "olive_oil_tsp": {"name": "Olive oil", "kcal": 40, "p": 0.0, "c": 0.0, "f": 4.5, "unit": "tsp", "step": 1, "when": "lunch dinner breakfast"},
    "peanut_tbsp": {"name": "Peanut butter", "kcal": 95, "p": 4.0, "c": 3.5, "f": 8.0, "unit": "tbsp", "step": 0.5, "when": "breakfast snack"},
    "turkey_oz": {"name": "Turkey, cooked", "kcal": 43, "p": 8.7, "c": 0.0, "f": 1.0, "unit": "oz", "step": 1, "when": "lunch dinner"},
    "broccoli_cup": {"name": "Broccoli, cooked", "kcal": 55, "p": 3.7, "c": 11.0, "f": 0.6, "unit": "cup", "step": 0.5, "when": "lunch dinner"},
    "banana": {"name": "Banana, medium", "kcal": 105, "p": 1.3, "c": 27.0, "f": 0.4, "unit": "banana", "step": 0.5, "when": "breakfast snack"},
    "milk_cup": {"name": "Milk, 1%", "kcal": 100, "p": 8.0, "c": 12.0, "f": 2.4, "unit": "cup", "step": 0.5, "when": "breakfast snack"},
    "cheddar_oz": {"name": "Cheddar", "kcal": 110, "p": 7.0, "c": 0.4, "f": 9.0, "unit": "oz", "step": 0.5, "when": "breakfast snack lunch"},
}


MEAL_BUILDER_URL = "https://playbook30days.netlify.app/meal.html"

# Copy every PDF drawer must print. No client names.
PLAYBOOK_CHROME = {
    "moves_url": "https://playbook30days.netlify.app/moves.html",
    "meal_url": "https://playbook30days.netlify.app/meal.html",
    "exercise_banner": "Tap a lift name. Phone opens the how-to card.",
    "exercise_chip": "Tap a lift name. Phone opens the how-to card.",
    "exercise_hint": "White names are links. Grey lines are how to do it.",
    "meal_title": "BUILD YOUR OWN MEAL",
    "meal_blurb": "Pick foods and amounts. See calories, protein, carbs, fat.",
    "meal_button": "OPEN MEAL BUILDER",
    "meal_label": "playbook30days.netlify.app/meal.html",
    "cover_hint": "Tap a chapter to jump there.",
    "nutrition_cite": "Meal numbers: USDA FoodData Central, household servings, rounded. fdc.nal.usda.gov",
    "format": "Cream headings and lift names. Silver-grey supporting lines. Red and blue are side bars only.",
}

BREAKFAST_MEATS = set()  # steak/chicken do not open breakfast
LUNCH_OK = {"chicken", "turkey", "fish", "shrimp", "tuna", "eggs", "pork"}
DINNER_OK = {"chicken", "steak", "turkey", "pork", "fish", "shrimp", "eggs"}

COOK_MODE = ("home", "prep", "out", "mix")
MONTH_INTENT = ("maintain", "cut", "push")

FORM_FIELDS = (
    "name", "email", "age", "sex", "height", "weight", "goal_weight",
    "start_date", "sleep_hours", "job_type", "month_intent", "goal",
    "day_{mon-sun}_sc", "day_{mon-sun}_detail", "day_{mon-sun}_when", "day_{mon-sun}_min",
    "experience", "hurts",
    "eq_barbell", "eq_db", "eq_cable", "eq_machines", "eq_bands", "eq_body",
    "place_gym", "place_home", "place_outdoor", "place_track",
    "sport_hockey", "sport_boxing", "sport_basketball", "sport_soccer",
    "sport_tennis", "sport_golf", "sport_other",
    "lean_strength", "lean_cardio", "lean_both",
    "run_yes", "run_now", "run_goal", "run_race", "run_priority",
    "swim_access", "swim_where", "swim_program",
    "blocked_dates", "blocked_why", "blocked_plan", "blocked_food",
    "meals_per_day", "meal_times",
    "prot_chicken", "prot_steak", "prot_turkey", "prot_pork",
    "prot_fish", "prot_shrimp", "prot_eggs", "prot_veg",
    "starch_rice", "starch_potato", "starch_pasta", "starch_bread", "starch_oats",
    "veg_greens", "veg_broccoli", "veg_beans", "veg_mixed",
    "cook_mode", "mug_oz", "likes",
    "allergies", "dairy_whey", "restrictions",
    "no_supps", "adjust_supps", "adjust_stack", "meds", "medications",
    "supp{1-4}_type", "supp{1-4}_form", "supp{1-4}_dose",
    "fast_yes", "fast_history", "fast_never",
    "notes",
)


def kg(weight_lb: float) -> float:
    return weight_lb / LB_PER_KG


def water_oz(weight_lb: float, sex: str = "", train: bool = False) -> tuple[float, float]:
    base_ml = WATER_ML_PER_KG * kg(weight_lb)
    if str(sex).lower().startswith("f"):
        base_ml = max(base_ml, WATER_IOM_DRINK_F_ML)
    elif str(sex).lower().startswith("m"):
        base_ml = max(base_ml, WATER_IOM_DRINK_M_ML)
    rest_oz = base_ml / ML_PER_OZ
    train_oz = (base_ml + WATER_TRAIN_BONUS_ML) / ML_PER_OZ
    return round(rest_oz, 1), round(train_oz, 1)


def _fills(oz: float, mug: float) -> str:
    n = oz / mug
    half = round(n * 2) / 2
    if half == int(half):
        return str(int(half))
    return f"{int(half)}½" if half - int(half) == 0.5 else str(half)


def water_fills(weight_lb: float, mug_oz: float, sex: str = "") -> tuple[str, str]:
    lo, hi = water_oz(weight_lb, sex=sex)
    if mug_oz <= 0:
        raise ValueError("mug_oz must be > 0")
    return _fills(lo, mug_oz), _fills(hi, mug_oz)


def protein_g(weight_lb: float, intent: str = "cut") -> tuple[int, int]:
    k = kg(weight_lb)
    key = str(intent or "cut").lower()
    if key not in PROTEIN_G_PER_KG:
        key = "cut"
    lo, hi = PROTEIN_G_PER_KG[key]
    return int(round(k * lo)), int(round(k * hi))


def split_protein(daily_g: int, meals: int) -> list[int]:
    if meals < 1:
        raise ValueError("meals must be >= 1")
    base = daily_g // meals
    extra = daily_g - base * meals
    parts = [base] * meals
    parts[-1] += extra
    return parts


def oz_meat_for_protein(grams: float) -> float:
    return round(grams / G_PER_OZ_COOKED_MEAT, 1)


def meal_protein(items: dict) -> float:
    g = 0.0
    g += items.get("meat_oz", 0) * PROTEIN_FOODS_G["meat_oz"]
    g += items.get("eggs", 0) * PROTEIN_FOODS_G["eggs"]
    g += items.get("yogurt_cups", 0) * PROTEIN_FOODS_G["yogurt_cups"]
    g += items.get("cottage_cups", 0) * PROTEIN_FOODS_G["cottage_cups"]
    g += items.get("oats_cups", 0) * PROTEIN_FOODS_G["oats_cups"]
    g += items.get("whey_scoops", 0) * PROTEIN_FOODS_G["whey_scoops"]
    return round(g, 1)


def check_day_adds_up(meals: list[dict], target: tuple[int, int]) -> tuple[float, bool]:
    total = sum(meal_protein(m) for m in meals)
    ok = target[0] - 10 <= total <= target[1] + 10
    return total, ok


def honest_cut_lb(weight_lb: float, days: int = 30) -> tuple[int, int]:
    weeks = days / 7
    lo = weight_lb * CUT_PCT_PER_WEEK_LOW * weeks
    hi = weight_lb * CUT_PCT_PER_WEEK_HIGH * weeks
    return int(round(lo)), int(round(hi))


def sitting_protein_ok(grams: float, weight_lb: float) -> bool:
    k = kg(weight_lb)
    lo = max(PROTEIN_PER_SITTING_G_LOW, 0.25 * k)
    hi = max(PROTEIN_PER_SITTING_G_HIGH, 0.40 * k)
    return lo - 5 <= grams <= hi + 10


def week_sets_ok(hard_sets_per_muscle: int, intent: str = "cut") -> bool:
    lo, hi = HARD_SETS_PER_MUSCLE_WEEK_GROW if intent == "push" else HARD_SETS_PER_MUSCLE_WEEK_MAINTAIN
    return lo <= hard_sets_per_muscle <= hi + 4


def vitals(
    age: int | None,
    sex: str,
    listed: list | None = None,
    no_supps: bool = False,
    adjust: bool = True,
    vegetarian: bool = False,
    lifts: bool = True,
    indoor_or_evening: bool = True,
    eats_fatty_fish_weekly: bool = False,
    dairy_ok: bool = True,
    meds: str = "",
) -> dict:
    """Vitamin block for Snapshot. Always run. Do not hand-write the stack."""
    return vit_plan(
        age=age,
        sex=sex,
        listed=listed or [],
        no_supps=no_supps,
        adjust=adjust,
        vegetarian=vegetarian,
        lifts=lifts,
        indoor_or_evening=indoor_or_evening,
        eats_fatty_fish_weekly=eats_fatty_fish_weekly,
        dairy_ok=dairy_ok,
        meds=meds,
    ).as_dict()


def targets(weight_lb: float, mug_oz: float, meals: int, sex: str = "", intent: str = "cut") -> dict:
    plo, phi = protein_g(weight_lb, intent=intent)
    mid = int(round((plo + phi) / 2))
    rest_oz, train_oz = water_oz(weight_lb, sex=sex)
    return {
        "kg": round(kg(weight_lb), 1),
        "protein_g": (plo, phi),
        "protein_mid": mid,
        "protein_meals": split_protein(mid, meals),
        "water_oz_rest": rest_oz,
        "water_oz_train": train_oz,
        "water_fills": water_fills(weight_lb, mug_oz, sex=sex),
        "cut_lb_30d": honest_cut_lb(weight_lb) if str(intent).lower() == "cut" else (0, 0),
        "sitting_g": (int(0.25 * kg(weight_lb)), int(0.40 * kg(weight_lb))),
        "strength_days_min": STRENGTH_SESSIONS_MIN,
        "sets_per_exercise": SETS_PER_EXERCISE,
    }


def weekday_map(start: dt.date, template: dict[int, str], days: int = 30) -> dict[dt.date, str]:
    out = {}
    for i in range(days):
        d = start + dt.timedelta(days=i)
        out[d] = template.get(d.weekday(), "REST")
    return out


def _truthy(val) -> bool:
    if val is True:
        return True
    s = str(val or "").strip().lower()
    return s in {"1", "y", "yes", "true", "on", "x"}


def _listed_from_form(form: dict) -> list[dict]:
    rows = []
    if form.get("listed"):
        return list(form["listed"])
    for i in range(1, 13):
        typ = str(form.get(f"supp{i}_type") or "").strip()
        if not typ:
            continue
        rows.append({
            "type": typ,
            "form": str(form.get(f"supp{i}_form") or "").strip(),
            "dose": str(form.get(f"supp{i}_dose") or "").strip(),
        })
    return rows


# ---------------------------------------------------------------------------
# How we plan. Encoded so a book is not written from memory.
# ---------------------------------------------------------------------------

DAY_NAMES = ("mon", "tue", "wed", "thu", "fri", "sat", "sun")
DAY_LABELS = ("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun")

MEAL_SLOTS = {
    2: ("Breakfast", "Dinner"),
    3: ("Breakfast", "Lunch", "Dinner"),
    4: ("Breakfast", "Lunch", "Snack", "Dinner"),
    5: ("Breakfast", "Morning snack", "Lunch", "Afternoon snack", "Dinner"),
    6: ("Breakfast", "Morning snack", "Lunch", "Afternoon snack", "Dinner", "Evening snack"),
}

PROTEIN_BANK = {
    "chicken": ["Grilled chicken breast", "Baked chicken thighs", "Rotisserie chicken"],
    "steak": ["Sirloin", "Flank steak", "Lean ground beef"],
    "turkey": ["Turkey breast", "Ground turkey", "Sliced turkey"],
    "pork": ["Pork tenderloin", "Center-cut pork chop"],
    "fish": ["Salmon", "Cod", "Tilapia"],
    "shrimp": ["Garlic shrimp", "Grilled shrimp"],
    "eggs": ["Eggs", "Egg-white scramble"],
    "veg": ["Whey shake", "Greek yogurt", "Cottage cheese", "Tofu", "Black beans"],
}

STARCH_BANK = {
    "rice": ["White rice", "Brown rice", "Rice bowl"],
    "potato": ["Baked potato", "Roasted potatoes"],
    "pasta": ["Pasta", "Noodle bowl"],
    "bread": ["Toast", "Wrap"],
    "oats": ["Oats", "Overnight oats"],
}

VEG_BANK = {
    "greens": ["Spinach", "Mixed greens"],
    "broccoli": ["Broccoli", "Roasted broccoli"],
    "beans": ["Green beans", "Black beans"],
    "mixed": ["Mixed vegetables", "Peppers and onions"],
}

BREAKFAST_BANK = {
    "eggs": "Eggs + starch + fruit",
    "oats": "Oats + protein add-on + fruit",
    "yogurt": "Greek yogurt + fruit + optional whey",
    "shake": "Whey shake + fruit",
}

HURT_DROPS = {
    "knee": ("barbell squat", "walking lunge", "jump"),
    "shoulder": ("barbell bench", "overhead press", "dip"),
    "back": ("barbell deadlift", "good morning", "bent-over barbell row"),
    "hip": ("barbell squat", "lunge"),
    "wrist": ("barbell bench", "barbell row"),
}

STRENGTH_MENUS = {
    "full body": [
        ("Squat pattern", "8", "Goblet if no bar"),
        ("Hinge", "8", "RDL or hip hinge"),
        ("Press", "8", "Push-up or bench"),
        ("Row", "8", "Chest-supported if back hurts"),
        ("Carry or core", "8", "Stop short of failure"),
    ],
    "upper": [
        ("Horizontal press", "8", "Bench or push-up"),
        ("Row", "8", "Pause 1 sec"),
        ("Vertical press", "8", "Skip if shoulder listed"),
        ("Pulldown or pull-up", "8", "Leave 1–2 reps"),
        ("Arm or carry", "10", "Optional if minutes are short"),
    ],
    "lower": [
        ("Squat pattern", "8", "Box squat if knees"),
        ("Hinge", "8", "RDL"),
        ("Single-leg", "8/side", "Split squat"),
        ("Hamstring", "10", "Curl or slider"),
        ("Calf or carry", "10", "Skip if minutes are short"),
    ],
    "push": [
        ("Main press", "6–8", "Heavier"),
        ("Second press", "8–10", "Incline or push-up"),
        ("Shoulder", "10", "Leave 2 reps"),
        ("Triceps", "10", "Not to failure"),
    ],
    "pull": [
        ("Vertical pull", "8", "Pull-up or pulldown"),
        ("Row", "8", "Pause"),
        ("Rear shoulder", "12", "Light"),
        ("Biceps or carry", "10", "Optional"),
    ],
    "legs": [
        ("Squat pattern", "8", "Compounds first"),
        ("Hinge", "8", "RDL"),
        ("Single-leg", "8/side", "Split squat"),
        ("Hamstring", "10", "Curl"),
    ],
    "chest": [
        ("Main press", "6–8", "Heavier"),
        ("Incline or fly", "10", "Leave 2 reps"),
        ("Push-up or dip", "8", "Stop short"),
    ],
    "back": [
        ("Vertical pull", "8", "Pull-up or pulldown"),
        ("Row", "8", "Pause"),
        ("Rear shoulder", "12", "Light"),
    ],
    "shoulders": [
        ("Press", "8", "Skip if shoulder listed"),
        ("Lateral", "12", "Light"),
        ("Rear delt", "12", "Light"),
    ],
    "arms": [
        ("Biceps", "10", "Leave 2 reps"),
        ("Triceps", "10", "Leave 2 reps"),
        ("Carry", "40 yd", "Optional"),
    ],
    "core": [
        ("Anti-extension", "8", "Dead bug or roll-out"),
        ("Anti-rotation", "8/side", "Pallof"),
        ("Carry", "40 yd", "Suitcase"),
    ],
}

MOVE_BASE = "https://playbook30days.netlify.app/moves.html"

def move_slug(name: str) -> str:
    return "".join(ch.lower() if ch.isalnum() else "-" for ch in name).strip("-")

def move_url(name: str) -> str:
    return f"{MOVE_BASE}#{move_slug(name)}"

HOW_TO = {
    "Squat pattern": "Sit between the hips. Knees track toes. Stand up like you mean it.",
    "Hinge": "Push the hips back. Shin quiet. Bar close. Stand tall, do not yank.",
    "Press": "Ribs down. Elbows about 45. Lower with control. Press, do not bounce.",
    "Row": "Chest proud. Pull to the hip. Pause one second. Lower slower than you want.",
    "Carry or core": "Walk like you are sneaking past a sleeping baby with groceries.",
    "Horizontal press": "Shoulder blades parked. Touch the chest. Press the floor away.",
    "Vertical press": "Bicep by the ear at the top. If it pinches, skip it.",
    "Pulldown or pull-up": "Elbows to the pockets. Chin over. Not a kip contest.",
    "Arm or carry": "Leave two reps. Arms are accessories.",
    "Single-leg": "Front heel owns it. Back knee kisses the floor and leaves.",
    "Hamstring": "Hips stay put. Curl with the heels.",
    "Calf or carry": "Full down, full up. No bounce.",
    "Main press": "First lift. Heavy-ish. Leave two in the tank.",
    "Second press": "Same rules, lighter. Change the angle, not the ego.",
    "Shoulder": "Soft elbows. Raise to eye height.",
    "Triceps": "Elbows quiet. Stretch, squeeze, go home.",
    "Vertical pull": "Long arms at the bottom. Chest to the handle.",
    "Rear shoulder": "Tiny weights. Think coat-hanger.",
    "Biceps or carry": "Elbows glued. Do not swing a fishing rod.",
    "Incline or fly": "Soft elbows. Feel the chest, not the joint.",
    "Push-up or dip": "Body one board. Dips stop at the pinch.",
    "Lateral": "Pour the pitcher. The dumbbell is not a helicopter.",
    "Rear delt": "Pinkies lead. Tiny range is still a set.",
    "Biceps": "Lower for three seconds. That is the set.",
    "Anti-extension": "Ribs down. If it arches, you found the joke.",
    "Anti-rotation": "The cable tries to spin you. It loses.",
    "Carry": "Tall. Quiet feet. Do not lean like a plant.",
}

CARDIO_MENUS = {
    "walk": "Easy walk. Nose breathing. No bonus hills unless they asked.",
    "run": "Easy run unless they named a race. Last 2 days before a race: taper, do not peak a workout they did not ask for.",
    "bike": "Steady bike. Stay conversational.",
    "row": "Steady row. 2 min easy / 1 min a bit quicker if minutes allow.",
    "swim": "See swim_where. Pool: wall intervals. Lake: continuous swimming and sighting. No wall.",
    "elliptical": "Steady. Same minutes as the form.",
    "stairs": "Steady climbs. Stop if knees are on the hurt list.",
}


def _form_week(form: dict) -> list[dict]:
    """Seven days from either nested week={} or day_mon_sc fields."""
    nested = form.get("week") or {}
    days = []
    for i, key in enumerate(DAY_NAMES):
        raw = nested.get(key) or nested.get(i) or form.get(f"day_{key}_sc") or "R"
        kind = str(raw).strip().upper()[:1] or "R"
        if kind not in WEEK_KIND:
            kind = "R"
        typ = (
            nested.get(f"{key}_type")
            or form.get(f"day_{key}_detail")
            or form.get(f"day_{key}_type")
            or ("Full body" if kind == "S" else "Walk" if kind == "C" else "Off")
        )
        when = nested.get(f"{key}_when") or form.get(f"day_{key}_when") or "Evening"
        if when not in WEEK_WHEN:
            when = "Evening"
        try:
            minutes = int(nested.get(f"{key}_min") or form.get(f"day_{key}_min") or form.get("session_min") or 45)
        except (TypeError, ValueError):
            minutes = 45
        minutes = min([30,45,60,90], key=lambda n: abs(n-minutes))
        days.append({
            "dow": i,
            "key": key,
            "label": DAY_LABELS[i],
            "kind": kind,
            "type": str(typ).strip() or "Other",
            "when": when,
            "minutes": minutes,
        })
        raw2 = form.get(f"day_{key}_sc2")
        if raw2 not in (None, ""):
            kind2 = str(raw2).strip().upper()[:1] or "R"
            if kind2 in WEEK_KIND and kind2 != "R":
                typ2 = form.get(f"day_{key}_detail2") or form.get(f"day_{key}_type2") or (
                    "Full body" if kind2 == "S" else "Walk"
                )
                when2 = form.get(f"day_{key}_when2") or "Morning"
                if when2 not in WEEK_WHEN:
                    when2 = "Morning"
                try:
                    minutes2 = int(form.get(f"day_{key}_min2") or 30)
                except (TypeError, ValueError):
                    minutes2 = 30
                minutes2 = min([30,45,60,90], key=lambda n: abs(n-minutes2))
                days.append({
                    "dow": i,
                    "key": key,
                    "label": f"{DAY_LABELS[i]} · 2",
                    "kind": kind2,
                    "type": str(typ2).strip() or "Other",
                    "when": when2,
                    "minutes": minutes2,
                })
    return days


def _equipment(form: dict) -> list[str]:
    flags = {
        "barbell": form.get("eq_barbell"),
        "dumbbell": form.get("eq_db"),
        "cable": form.get("eq_cable"),
        "machine": form.get("eq_machines"),
        "band": form.get("eq_bands"),
        "bodyweight": form.get("eq_body"),
    }
    have = [name for name, on in flags.items() if _truthy(on)]
    if not have:
        if _truthy(form.get("place_gym")):
            have = ["barbell", "dumbbell", "cable", "machine"]
        elif _truthy(form.get("place_home")):
            have = ["dumbbell", "band", "bodyweight"]
        else:
            have = ["bodyweight"]
    return have


def _sets_for(minutes: int, experience: str, intent: str) -> int:
    sets = 3 if minutes >= 40 else 2
    if str(experience).lower() in {"new", "beginner", "novice"}:
        sets = min(sets, 2)
    if intent == "push" and minutes >= 45:
        sets = 3
    return sets


def plan_week(form: dict) -> dict:
    days = _form_week(form)
    s_days = sum(1 for d in days if d["kind"] == "S")
    c_days = sum(1 for d in days if d["kind"] == "C")
    sports = [d for d in days if d["type"] in SPORT_DAYS]
    return {
        "days": days,
        "strength_days": s_days,
        "cardio_days": c_days,
        "sport_days": [f"{d['label']} {d['type']}" for d in sports],
        "note": "Sport days are the sport. Do not add a lift under them.",
    }


def plan_exercise(form: dict) -> dict:
    days = _form_week(form)
    intent = str(form.get("month_intent") or form.get("lean") or "cut").lower()
    if _truthy(form.get("lean_cardio")) and not _truthy(form.get("lean_strength")):
        intent = "cut"
    if _truthy(form.get("lean_strength")) and not _truthy(form.get("lean_cardio")):
        intent = "push" if "push" in intent or "gain" in intent else "cut"
    experience = str(form.get("experience") or "intermediate")
    hurts = str(form.get("hurts") or "").lower()
    gear = _equipment(form)
    swim_where = str(form.get("swim_where") or "").lower()
    sessions = []
    for d in days:
        if d["kind"] == "R":
            sessions.append({**d, "title": "Off", "work": [], "note": "Walk if you want. No programmed session."})
            continue
        if d["type"] in SPORT_DAYS:
            sessions.append({
                **d,
                "title": d["type"],
                "work": [],
                "note": f"{d['type']} is the session. No lift under it.",
            })
            continue
        if d["kind"] == "C":
            mode = d["type"].lower()
            recipe = CARDIO_MENUS.get(mode, "Steady cardio for the minutes on the form.")
            if "swim" in mode:
                swim = plan_swim_session(form, d["minutes"])
                sessions.append({**d, "title": swim["title"], "work": swim["work"], "note": f"{d['minutes']} min. {swim['note']}"})
                continue
            if "run" in mode and not (_truthy(form.get("run_yes")) or "run" in mode):
                recipe = "They did not ask for running. Use the cardio they picked."
            sessions.append({**d, "title": d["type"], "work": [], "note": f"{d['minutes']} min. {recipe}"})
            continue
        key = d["type"].lower()
        menu = STRENGTH_MENUS.get(key, STRENGTH_MENUS["full body"])
        sets = _sets_for(d["minutes"], experience, intent)
        if d["minutes"] < 35:
            menu = menu[:4]
        work = []
        for name, reps, cue in menu:
            drop = False
            for word, banned in HURT_DROPS.items():
                if word in hurts and any(b in name.lower() or b in cue.lower() for b in banned):
                    drop = True
            if "barbell" in cue.lower() and "barbell" not in gear and "dumbbell" in gear:
                cue = cue.replace("barbell", "dumbbell")
            if drop:
                continue
            work.append({
                "move": name,
                "sets": sets,
                "reps": reps,
                "cue": cue,
                "how": HOW_TO.get(name, "Brace. Full range. Stop 2–3 reps short."),
                "slug": move_slug(name),
                "url": move_url(name),
            })
        sessions.append({
            **d,
            "title": d["type"],
            "work": work,
            "note": (
                f"{sets} sets × {reps}. 2 min rest on the first two moves, 90 sec after that. "
                f"RPE 7–8. Cap {d['minutes']} min. If time dies, keep the first compound and leave."
            ),
        })
    return {
        "intent": intent,
        "experience": experience,
        "equipment": gear,
        "hurts": hurts,
        "sessions": sessions,
        "volume": HARD_SETS_PER_MUSCLE_WEEK_GROW if intent == "push" else HARD_SETS_PER_MUSCLE_WEEK_MAINTAIN,
        "moves_url": MOVE_BASE,
        "interactive": True,
        "rule": "Tap a lift name for the how-to. Cap every session to that day's minutes. Sport days are the sport.",
        "tap_banner": "TAP a blue lift name. Phone opens the how-to card.",
        "tap_chip": "INTERACTIVE  ·  tap the lift  ·  see the movement",
        "tap_hint": f"Blue line = link. Opens {MOVE_BASE}",
        "run_guide": plan_run_guide(form),
    }


def _parse_run_distance(text: str) -> str:
    t = str(text or "").lower().replace(" ", "")
    if any(w in t for w in ("marathon", "26.2", "42k", "42.2")) and "half" not in t:
        return "marathon"
    if any(w in t for w in ("half", "13.1", "21k", "21.1")):
        return "half"
    if any(w in t for w in ("10k", "10km", "6.2")):
        return "10k"
    if any(w in t for w in ("mile", "1600", "1.6k")) and "5" not in t:
        return "mile"
    return "5k"


def plan_run_guide(form: dict) -> dict | None:
    """30-day add-on after the week. Only if they run and named a goal."""
    if not _truthy(form.get("run_yes")):
        return None
    goal = str(form.get("run_goal") or "").strip()
    if not goal:
        return None
    dist = _parse_run_distance(goal + " " + str(form.get("run_race") or "") + " " + str(form.get("run_now") or ""))
    exp = str(form.get("experience") or "intermediate").lower()
    if exp in {"new", "novice"}:
        exp = "beginner"
    if exp not in {"beginner", "intermediate", "advanced"}:
        exp = "intermediate"
    # Weekly miles at the start of a 30-day block. ACSM/RRCA-style: 3-4 days,
    # long run ~35-45% of the week, +~10% per week, never a jump week after sport.
    table = {
        "mile": {"beginner": (8, 3), "intermediate": (12, 3), "advanced": (16, 4)},
        "5k": {"beginner": (10, 3), "intermediate": (16, 3), "advanced": (22, 4)},
        "10k": {"beginner": (14, 3), "intermediate": (22, 4), "advanced": (30, 4)},
        "half": {"beginner": (18, 3), "intermediate": (28, 4), "advanced": (38, 4)},
        "marathon": {"beginner": (22, 4), "intermediate": (32, 4), "advanced": (42, 5)},
    }
    start_mi, days = table[dist][exp]
    long1 = round(start_mi * 0.40, 1)
    labels = {"mile": "1 mile", "5k": "5K", "10k": "10K", "half": "half marathon", "marathon": "marathon"}
    weeks = []
    miles = start_mi
    long_mi = long1
    for w in range(1, 5):
        easy = max(2.0, round((miles - long_mi) / max(1, days - 1), 1))
        quality = "6×400 m easy jog recover" if dist in {"mile", "5k"} else (
            "4×800 m easy jog recover" if dist == "10k" else "20 min tempo after 10 min easy"
        )
        weeks.append({
            "week": w,
            "miles": round(miles, 1),
            "easy": f"{easy} miles easy, talk test",
            "quality": quality,
            "long": f"{long_mi} mile long run, easy",
            "fourth": f"{easy} miles easy" if days >= 4 else None,
        })
        miles = round(miles * 1.10, 1)
        long_mi = round(min(long_mi * 1.10, miles * 0.45), 1)
    now = str(form.get("run_now") or "").strip()
    race = str(form.get("run_race") or "").strip()
    return {
        "on": True,
        "distance": dist,
        "label": labels[dist],
        "goal": goal,
        "now": now or None,
        "race": race or None,
        "level": exp,
        "days_per_week": days,
        "start_miles": start_mi,
        "weeks": weeks,
        "rules": [
            "Park this around the week you built. Do not stack a long run on a sport day.",
            "Easy means you can talk. Quality is the only hard day.",
            "Add about 10% miles per week. If anything hurts, repeat last week.",
        ],
        "source": "RRCA / ACSM running frequency. 10% weekly load cap. 3–4 days for 5K–10K; extra day only if they already run.",
    }


def swim_wants_program(form: dict) -> bool:
    raw = str(form.get("swim_program") or "").strip().lower()
    if raw in {"no", "n", "pro", "false"}:
        return False
    if raw in {"yes", "y", "program", "true"}:
        return True
    return _truthy(form.get("swim_program"))


def plan_swim_session(form: dict, minutes: int) -> dict:
    where = str(form.get("swim_where") or "").lower()
    lake = "lake" in where or "open" in where
    bucket = min([30, 45, 60, 90], key=lambda n: abs(n - minutes))
    if not swim_wants_program(form):
        return {"title": "Swim — own routine", "note": "Own routine. Stay inside the minutes. We do not write the sets.", "work": []}
    def item(move, sets, reps, cue):
        return {"move": move, "sets": sets, "reps": reps, "cue": cue, "how": cue, "slug": "", "url": ""}
    if lake:
        work = {
            30: [item("Easy swim", 1, "8 min", "Smooth."), item("Sighting swim", 1, "12 min", "Eyes up every 8–10 strokes."), item("Easy to shore", 1, "10 min", "Walk out.")],
            45: [item("Easy swim", 1, "10 min", "Warm the shoulders."), item("Loop with sighting", 3, "8 min", "Sight every 8–10."), item("Easy to shore", 1, "11 min", "Unbroken.")],
            60: [item("Easy swim", 1, "12 min", "Find the line."), item("Pickup stretch", 4, "6 min", "4 easy, 2 quicker."), item("Easy to shore", 1, "12 min", "Same stroke.")],
            90: [item("Easy swim", 1, "15 min", "Long and quiet."), item("Open water main", 1, "50 min", "Sight every 8–10."), item("Easy to shore", 1, "25 min", "Do not race the beach.")],
        }[bucket]
        return {"title": "Swim — open water", "note": f"{bucket} min lake / open water.", "work": work}
    work = {
        30: [item("Easy swim", 1, "200", "Warm the stroke."), item("Repeat 50s", 8, "50", "20 sec on the wall."), item("Easy swim", 1, "100", "Shake it out.")],
        45: [item("Easy swim", 1, "300", "200 free + 100 choice."), item("Repeat 50s", 10, "50", "20 sec rest."), item("Kick or drill", 4, "25", "Easy."), item("Easy swim", 1, "200", "Leave some in the tank.")],
        60: [item("Easy swim", 1, "400", "Build easy to steady."), item("Repeat 100s", 8, "100", "20–30 sec rest."), item("Build 50s", 4, "50", "Last strong, not all-out."), item("Easy swim", 1, "200", "Long strokes.")],
        90: [item("Easy swim", 1, "500", "First 200 very easy."), item("Repeat 100s", 10, "100", "20 sec rest."), item("Repeat 50s", 8, "50", "15 sec rest."), item("Easy swim", 1, "300", "Same stroke as the first 500.")],
    }[bucket]
    return {"title": "Swim — pool", "note": f"{bucket} min indoor pool.", "work": work}


def swim_session_note(form: dict, minutes: int) -> str:
    return plan_swim_session(form, minutes)["note"]


def _checked_bank(form: dict, prefix: str, bank: dict) -> list[str]:
    picked = []
    for key, options in bank.items():
        if _truthy(form.get(f"{prefix}_{key}")) or _truthy(form.get(key)):
            picked.extend(options[:2])
    return picked


KCAL_PER_G_PROTEIN = 4
KCAL_PER_G_CARB = 4
KCAL_PER_G_FAT = 9
FAT_G_PER_LB = 0.35          # lean cut floor, not keto
FIBER_G_PER_1000_KCAL = 14.0  # IOM 2005 AI, printed as a veg cue
STARCH_CARB_G_PER_CUP = 45.0  # cooked rice / potato
MEAT_KCAL_PER_OZ = 40.0       # cooked chicken / lean beef ballpark


def _slot_calorie_weights(names: tuple[str, ...]) -> list[float]:
    out = []
    for name in names:
        low = name.lower()
        if "snack" in low:
            out.append(0.65)
        elif name == "Dinner":
            out.append(1.20)
        elif name == "Breakfast":
            out.append(1.00)
        else:
            out.append(1.05)
    return out


def split_calories(daily: int, names: tuple[str, ...]) -> list[int]:
    weights = _slot_calorie_weights(names)
    total = sum(weights) or 1
    parts = [int(daily * w / total) for w in weights]
    parts[-1] += daily - sum(parts)
    return parts


def plan_macros(daily: int, protein_g: int, weight_lb: float) -> dict:
    """Protein first. Fat at a lean-cut floor. Carbs take the rest."""
    p_kcal = protein_g * KCAL_PER_G_PROTEIN
    fat_g = int(round(max(FAT_G_PER_LB * weight_lb, 0.20 * daily / KCAL_PER_G_FAT)))
    fat_g = min(fat_g, int(0.35 * daily / KCAL_PER_G_FAT))
    fat_kcal = fat_g * KCAL_PER_G_FAT
    carb_kcal = max(0, daily - p_kcal - fat_kcal)
    carb_g = int(round(carb_kcal / KCAL_PER_G_CARB))
    tight = p_kcal + fat_kcal > daily
    if tight:
        fat_g = max(int(0.20 * daily / KCAL_PER_G_FAT), int((daily - p_kcal) / KCAL_PER_G_FAT))
        fat_kcal = fat_g * KCAL_PER_G_FAT
        carb_kcal = max(0, daily - p_kcal - fat_kcal)
        carb_g = int(round(carb_kcal / KCAL_PER_G_CARB))
    return {
        "daily_kcal": daily,
        "protein_g": protein_g,
        "protein_kcal": p_kcal,
        "fat_g": fat_g,
        "fat_kcal": fat_kcal,
        "carb_g": carb_g,
        "carb_kcal": carb_kcal,
        "tight": tight,
    }


def plan_food(form: dict, numbers: dict, calories: dict | None = None) -> dict:
    meals = int(form.get("meals_per_day") or form.get("meals") or 3)
    meals = min(6, max(2, meals))
    slots = MEAL_SLOTS[meals]
    split = numbers.get("protein_meals") or split_protein(numbers.get("protein_mid") or 140, meals)
    vegetarian = _truthy(form.get("prot_veg")) or "vegetar" in str(form.get("restrictions") or "").lower()
    dairy_ok = str(form.get("dairy_whey") or "yes").strip().lower() not in {"no", "n", "false"}
    proteins = _checked_bank(form, "prot", PROTEIN_BANK)
    if vegetarian:
        proteins = [p for p in PROTEIN_BANK["veg"] if dairy_ok or "yogurt" not in p.lower() and "cottage" not in p.lower() and "whey" not in p.lower()]
        if _truthy(form.get("prot_eggs")):
            proteins = PROTEIN_BANK["eggs"] + proteins
        if not dairy_ok:
            proteins = [p for p in proteins if "whey" not in p.lower() and "yogurt" not in p.lower() and "cottage" not in p.lower()]
            proteins += ["Tofu", "Tempeh", "Black beans"]
    if _truthy(form.get("prot_eggs")) or (form.get("prot_eggs") in (None, "") and not vegetarian):
        for e in PROTEIN_BANK.get("eggs") or ["Eggs"]:
            if e not in proteins:
                proteins = [e] + proteins
    if not proteins:
        proteins = PROTEIN_BANK["chicken"][:2] + PROTEIN_BANK["eggs"][:1]
    starches = _checked_bank(form, "starch", STARCH_BANK) or STARCH_BANK["rice"][:2] + STARCH_BANK["potato"][:1]
    vegs = _checked_bank(form, "veg", VEG_BANK) or VEG_BANK["greens"] + VEG_BANK["broccoli"][:1]
    likes = str(form.get("likes") or "")
    allergies = str(form.get("allergies") or "")
    restrictions = str(form.get("restrictions") or "")
    banned = (allergies + " " + restrictions).lower()

    def _ok(item: str) -> bool:
        low = item.lower()
        for word in ("peanut", "shellfish", "shrimp", "dairy", "gluten", "wheat", "soy"):
            if word in banned and word in low:
                return False
        if "gluten" in banned and any(w in low for w in ("pasta", "bread", "toast", "wrap", "oat")):
            return False
        return True

    proteins = [p for p in proteins if _ok(p)] or ["Grilled chicken breast"]
    starches = [s for s in starches if _ok(s)] or ["Rice"]
    vegs = [v for v in vegs if _ok(v)] or ["Mixed vegetables"]
    cook = str(form.get("cook_mode") or "home").lower()
    plate_style = "order from a menu" if cook in {"out", "restaurant"} else "cook at home"
    breakfasts = []
    if _truthy(form.get("prot_eggs")) or not vegetarian:
        breakfasts.append(BREAKFAST_BANK["eggs"])
    if _truthy(form.get("starch_oats")):
        breakfasts.append(BREAKFAST_BANK["oats"])
    if dairy_ok:
        breakfasts.append(BREAKFAST_BANK["yogurt"])
    if dairy_ok and (vegetarian or meals >= 4):
        breakfasts.append(BREAKFAST_BANK["shake"])
    breakfasts = breakfasts[:4] or ["Eggs + fruit"]
    snacks = []
    if meals >= 4:
        snacks = ["Greek yogurt + fruit"] if dairy_ok else ["Whey shake + fruit"] if dairy_ok else ["Meat leftover + fruit", "Cottage skip"]
        if dairy_ok:
            snacks = ["Greek yogurt + fruit", "Cottage cheese + fruit", "Whey shake + fruit"]
        else:
            snacks = ["3–4 oz leftover protein + fruit", "Tofu + fruit"]
        snacks = [s for s in snacks if _ok(s)][:4]
    daily_kcal = None
    if calories and calories.get("daily"):
        daily_kcal = int(calories["daily"])
    protein_mid = numbers.get("protein_mid") or sum(split)
    weight_lb = float(form.get("weight") or form.get("weight_lb") or 0)
    macros = plan_macros(daily_kcal, protein_mid, weight_lb) if daily_kcal and weight_lb else None
    kcal_parts = split_calories(daily_kcal, slots) if daily_kcal else [None] * meals
    fat_parts = split_protein(macros["fat_g"], meals) if macros else [None] * meals
    carb_parts = split_protein(macros["carb_g"], meals) if macros else [None] * meals

    slot_plan = []
    for i, name in enumerate(slots):
        grams = split[i] if i < len(split) else split[-1]
        starch_on = name in {"Breakfast", "Lunch", "Dinner"} and not name.endswith("snack")
        if name.endswith("snack") or name == "Snack":
            starch_on = False
        if meals == 2 and name == "Dinner":
            starch_on = True
        carb_g = carb_parts[i] if carb_parts[i] is not None else None
        starch_cups = None
        if starch_on and carb_g:
            starch_cups = round(carb_g / STARCH_CARB_G_PER_CUP, 1)
        meat = oz_meat_for_protein(grams) if "snack" not in name.lower() else None
        slot_plan.append({
            "name": name,
            "protein_g": grams,
            "meat_oz": meat,
            "kcal": kcal_parts[i],
            "fat_g": fat_parts[i],
            "carb_g": carb_g,
            "starch": starch_on,
            "starch_cups": starch_cups,
        })
    rule = (
        "Same daily protein no matter the meal count. Meal count does not burn extra fat. "
        "Rotate 3–4 options. Do not copy another client's meals."
    )
    if daily_kcal:
        src = "their custom number" if calories.get("choice") == "custom" else "the recommended 30-day target"
        rule += f" Meals are built to {daily_kcal} kcal ({src}). Protein first, then fat floor, carbs fill the rest."
        rule += " Starch and veg have cups and ounces. Swap foods. Do not change the amounts."
        fib = int(round(daily_kcal / 1000.0 * FIBER_G_PER_1000_KCAL))
        rule += f" Fiber cue about {fib} g from the veg pile (14 g per 1000 kcal)."
        if macros and macros["tight"]:
            rule += " Calories are tight against the protein target. Starch stays small. Do not cut protein to fake a deeper deficit."
    return {
        "meals_per_day": meals,
        "slots": slot_plan,
        "proteins": proteins[:4],
        "starches": starches[:4],
        "vegs": vegs[:4],
        "breakfasts": breakfasts,
        "snacks": snacks,
        "cook_mode": cook,
        "plate_style": plate_style,
        "vegetarian": vegetarian,
        "dairy_ok": dairy_ok,
        "likes": likes,
        "allergies": allergies,
        "restrictions": restrictions,
        "daily_kcal": daily_kcal,
        "macros": macros,
        "calorie_choice": (calories or {}).get("choice"),
        "fiber_g": int(round((daily_kcal or 0) / 1000.0 * FIBER_G_PER_1000_KCAL)) if daily_kcal else None,
        "rest_day_kcal": (calories or {}).get("rest_day"),
        "train_day_kcal": (calories or {}).get("train_day_kcal"),
        "eggs": eggs_for_protein(next((s["protein_g"] for s in slot_plan if s["name"] == "Breakfast"), split[0])),
        "menu": plan_menu(form, slot_plan, proteins, starches, vegs, dairy_ok, vegetarian),
        "rule": rule,
        "citation": PLAYBOOK_CHROME["nutrition_cite"],
        "source": "USDA FoodData Central. https://fdc.nal.usda.gov",
    }


EGG_SIT_CAP = 4  # 5+ eggs in one sitting is a diner plate, not this program
VEG_CUPS_PER_MEAL = 1.5
VEG_CUPS_GREENS = 2.0  # raw leaves take more bowl than cooked broccoli

# Cooked weight per cup, so the plate can say oz as well as cups.
STARCH_OZ_PER_CUP = {
    "rice": 6.2, "potato": 5.5, "pasta": 5.0, "noodle": 5.0,
    "bread": 2.0, "toast": 2.0, "wrap": 2.5, "oat": 8.0,
}
VEG_OZ_PER_CUP = {
    "spinach": 1.1, "green": 1.1, "lettuce": 1.0,
    "broccoli": 3.3, "bean": 3.2, "pepper": 3.2, "mixed": 3.5, "onion": 3.2,
}


def _match_oz(name: str, table: dict, default: float) -> float:
    low = (name or "").lower()
    for key, oz in table.items():
        if key in low:
            return oz
    return default


def starch_amount(name: str, cups: float | None) -> str:
    cups = float(cups or 0)
    if cups <= 0:
        return ""
    oz = round(cups * _match_oz(name, STARCH_OZ_PER_CUP, 6.0), 1)
    if "bread" in name.lower() or "toast" in name.lower():
        slices = max(1, int(round(cups * 2)))
        return f"{slices} slices {name} ({oz} oz)"
    if "wrap" in name.lower():
        n = max(1, int(round(cups)))
        return f"{n} wrap {name} ({oz} oz)"
    return f"{cups} cups cooked {name} ({oz} oz)"


def veg_amount(name: str, cups: float | None = None) -> str:
    low = (name or "vegetables").lower()
    cups = float(cups if cups is not None else (VEG_CUPS_GREENS if any(w in low for w in ("spinach", "green", "lettuce")) else VEG_CUPS_PER_MEAL))
    oz = round(cups * _match_oz(name, VEG_OZ_PER_CUP, 3.3), 1)
    raw = any(w in low for w in ("spinach", "green", "lettuce"))
    state = "raw" if raw else "cooked"
    return f"{cups} cups {state} {name} ({oz} oz)"


def eggs_for_protein(grams: int, cap: int = EGG_SIT_CAP) -> dict:
    """How many large eggs cover this sitting. Leftover grams become meat or whey."""
    grams = int(grams or 0)
    if grams <= 0:
        return {"eggs": 0, "from_eggs": 0, "leftover_g": 0, "leftover_oz": 0.0, "whey_scoops": 0, "line": ""}
    n = min(cap, max(2, int(round(min(grams, cap * G_PER_EGG) / G_PER_EGG))))
    from_eggs = int(n * G_PER_EGG)
    leftover = max(0, grams - from_eggs)
    oz = round(leftover / G_PER_OZ_COOKED_MEAT, 1) if leftover else 0.0
    scoops = round(leftover / G_PER_WHEY_SCOOP, 1) if leftover else 0.0
    if leftover >= 16:
        line = f"{n} large eggs + {oz} oz cooked meat (or {scoops} scoops whey)"
    elif leftover >= 8:
        line = f"{n} large eggs + {oz} oz cooked meat"
    else:
        line = f"{n} large eggs"
    return {
        "eggs": n,
        "from_eggs": from_eggs,
        "leftover_g": leftover,
        "leftover_oz": oz,
        "whey_scoops": scoops,
        "line": line,
    }


def _cycle(items: list[str], i: int, fallback: str) -> str:
    if not items:
        return fallback
    return items[i % len(items)]


def _plate(title: str, items: list[str], protein_g: int, kcal: int | None, starch_cups: float | None, facts: str = "") -> dict:
    items = [x for x in items if x]
    line = "  ·  ".join(items)
    if facts:
        line = f"{line}  ·  {facts}"
    return {
        "title": title,
        "items": items,
        "protein_g": protein_g,
        "kcal": kcal,
        "starch_cups": starch_cups,
        "facts": facts,
        "line": line,
    }


def _facts_line(parts: list[tuple[str, float]]) -> str:
    """parts: (FOOD_FACTS key, count). Prints a short USDA line."""
    kcal = p = c = f = 0.0
    for key, n in parts:
        row = FOOD_FACTS.get(key)
        if not row or not n:
            continue
        kcal += row["kcal"] * n
        p += row["p"] * n
        c += row["c"] * n
        f += row["f"] * n
    if not p:
        return ""
    return f"USDA ~{int(round(kcal))} kcal · {int(round(p))}g P · {int(round(c))}g C · {int(round(f))}g F"


def _meat_key(name: str) -> str:
    n = (name or "").lower()
    if "steak" in n or "beef" in n:
        return "steak_oz"
    if "shrimp" in n:
        return "shrimp_oz"
    if "fish" in n or "salmon" in n or "tuna" in n or "cod" in n:
        return "fish_oz"
    return "meat_oz"


def _is_dinner_meat(name: str) -> bool:
    n = (name or "").lower()
    return any(w in n for w in ("steak", "beef", "pork", "chicken", "turkey"))


def plan_menu(form: dict, slots: list[dict], proteins: list[str], starches: list[str], vegs: list[str], dairy_ok: bool, vegetarian: bool) -> dict:
    """Time-of-day plates. Breakfast is eggs/dairy/oats/whey. Steak and chicken wait until lunch or dinner."""
    by_name = {s["name"]: s for s in slots}
    b = by_name.get("Breakfast") or slots[0]
    d = by_name.get("Dinner") or slots[-1]
    lunch_slot = by_name.get("Lunch")
    if lunch_slot:
        l_p, l_k, l_st = lunch_slot["protein_g"], lunch_slot.get("kcal"), lunch_slot.get("starch_cups")
    else:
        l_p = max(28, int(round(b["protein_g"] * 0.55)))
        l_k = int(round((b.get("kcal") or 0) * 0.55)) or None
        l_st = 0.6

    egg = eggs_for_protein(b["protein_g"])
    dinner_meats = [p for p in proteins if p.lower() not in {"eggs", "egg-white scramble"}]
    lunch_meats = [p for p in dinner_meats if "steak" not in p.lower() and "beef" not in p.lower()]
    if not lunch_meats:
        lunch_meats = dinner_meats or ["Grilled chicken breast"]
    if not dinner_meats:
        dinner_meats = ["Grilled chicken breast"]
    starch_b = "oats" if any("oat" in s.lower() for s in starches) else _cycle(starches, 0, "oats")
    veg_b = _cycle(vegs, 0, "Spinach")
    b_st = b.get("starch_cups") or 0.8
    d_st = d.get("starch_cups") or 0.8
    egg_flag = form.get("prot_eggs")
    egg_said_no = str(egg_flag or "").strip().lower() in {"n", "no", "false", "0", "off"}
    egg_allergic = "egg" in str(form.get("allergies") or "").lower()
    want_eggs = (not egg_said_no and not egg_allergic and not vegetarian) or _truthy(egg_flag)

    breakfast = []
    if want_eggs:
        top = ""
        parts = [("egg_large", egg["eggs"]), ("oats_cup_cooked", b_st), ("veg_cup", 1.0)]
        if dairy_ok and egg["whey_scoops"]:
            top = f"{egg['whey_scoops']} scoops whey in coffee or oats"
            parts.append(("whey_scoop", egg["whey_scoops"]))
        elif dairy_ok and egg["leftover_g"] >= 12:
            cups = round(egg["leftover_g"] / G_PER_CUP_COTTAGE, 1)
            top = f"{cups} cups cottage cheese"
            parts.append(("cottage_cup", cups))
        breakfast.append(_plate(
            f"{egg['eggs']} eggs + oats",
            [f"{egg['eggs']} large eggs (scrambled or boiled)", top, starch_amount(starch_b, b_st), veg_amount(veg_b) + " in the pan or on the side"],
            b["protein_g"], b.get("kcal"), b_st, _facts_line(parts),
        ))
    if dairy_ok:
        cups_y = max(1.0, round(min(b["protein_g"], 46) / G_PER_CUP_GREEK_YOGURT, 1))
        rest = max(0, b["protein_g"] - int(cups_y * G_PER_CUP_GREEK_YOGURT))
        whey = f"{round(rest / G_PER_WHEY_SCOOP, 1)} scoops whey" if rest >= 8 else ""
        parts = [("greek_yogurt_cup", cups_y), ("fruit_cup", 1.0), ("oats_cup_cooked", min(b_st, 0.5))]
        if rest >= 8:
            parts.append(("whey_scoop", rest / G_PER_WHEY_SCOOP))
        breakfast.append(_plate(
            "Yogurt bowl",
            [f"{cups_y} cups plain Greek yogurt", whey, "1 cup fruit (5 oz)", starch_amount("oats", min(b_st, 0.5))],
            b["protein_g"], b.get("kcal"), b_st, _facts_line(parts),
        ))
    if dairy_ok and len(breakfast) < 2:
        cups_c = max(0.8, round(min(b["protein_g"], 50) / G_PER_CUP_COTTAGE, 1))
        breakfast.append(_plate(
            "Cottage bowl",
            [f"{cups_c} cups low-fat cottage cheese", "1 cup fruit (5 oz)", starch_amount(starch_b, b_st), "pepper or hot sauce"],
            b["protein_g"], b.get("kcal"), b_st,
            _facts_line([("cottage_cup", cups_c), ("fruit_cup", 1.0), ("oats_cup_cooked", b_st)]),
        ))
    if dairy_ok and len(breakfast) < 2:
        scoops = max(1.0, round(b["protein_g"] / G_PER_WHEY_SCOOP, 1))
        breakfast.append(_plate(
            "Oats + whey",
            [starch_amount("oats", b_st), f"{scoops} scoops whey stirred in", "1 cup fruit (5 oz)"],
            b["protein_g"], b.get("kcal"), b_st,
            _facts_line([("oats_cup_cooked", b_st), ("whey_scoop", scoops), ("fruit_cup", 1.0)]),
        ))
    if vegetarian and not dairy_ok and len(breakfast) < 2:
        breakfast.append(_plate(
            "Tofu scramble",
            [f"{round(b['protein_g'] / 10, 1)} oz firm tofu scramble", starch_amount(starch_b, b_st), veg_amount(veg_b)],
            b["protein_g"], b.get("kcal"), b_st, "",
        ))
    if len(breakfast) < 2:
        scoops = max(1.0, round(b["protein_g"] / G_PER_WHEY_SCOOP, 1)) if dairy_ok else 0
        extra = f"{scoops} scoops whey" if scoops else f"{egg['eggs']} eggs"
        breakfast.append(_plate(
            "Oats bowl",
            [starch_amount("oats", b_st), extra, "1 cup fruit (5 oz)"],
            b["protein_g"], b.get("kcal"), b_st, "",
        ))
    # Third breakfast: different structure than the first two.
    if len(breakfast) < 3 and dairy_ok:
        used = " ".join(p["title"].lower() for p in breakfast)
        if "cottage" not in used:
            cups_c = max(0.8, round(min(b["protein_g"], 50) / G_PER_CUP_COTTAGE, 1))
            breakfast.append(_plate(
                "Cottage bowl",
                [f"{cups_c} cups low-fat cottage cheese", "1 cup fruit (5 oz)", starch_amount(starch_b, b_st)],
                b["protein_g"], b.get("kcal"), b_st,
                _facts_line([("cottage_cup", cups_c), ("fruit_cup", 1.0), ("oats_cup_cooked", b_st)]),
            ))
        elif "oats" not in used:
            scoops = max(1.0, round(b["protein_g"] / G_PER_WHEY_SCOOP, 1))
            breakfast.append(_plate(
                "Oats + whey",
                [starch_amount("oats", b_st), f"{scoops} scoops whey stirred in", "1 cup fruit (5 oz)"],
                b["protein_g"], b.get("kcal"), b_st,
                _facts_line([("oats_cup_cooked", b_st), ("whey_scoop", scoops), ("fruit_cup", 1.0)]),
            ))
    if len(breakfast) < 3 and vegetarian:
        breakfast.append(_plate(
            "Tofu scramble",
            [f"{round(b['protein_g'] / 10, 1)} oz firm tofu scramble", starch_amount(starch_b, b_st), veg_amount(veg_b)],
            b["protein_g"], b.get("kcal"), b_st, "",
        ))
    if len(breakfast) < 3:
        scoops = max(1.0, round(b["protein_g"] / G_PER_WHEY_SCOOP, 1)) if dairy_ok else 0
        extra = f"{scoops} scoops whey" if scoops else f"{egg['eggs']} eggs"
        breakfast.append(_plate(
            "Shake + fruit",
            [extra, "1 banana or 1 cup fruit (5 oz)", starch_amount(starch_b, min(b_st, 0.5))],
            b["protein_g"], b.get("kcal"), b_st, "",
        ))
    breakfast = breakfast[:3]

    lunch = []
    if lunch_slot:
        for i in range(3):
            meat = _cycle(lunch_meats, i, lunch_meats[0])
            starch = _cycle(starches, i + 1, "Rice")
            veg = _cycle(vegs, i, "Mixed vegetables")
            oz = round(l_p / G_PER_OZ_COOKED_MEAT, 1)
            lunch.append(_plate(
                meat,
                [f"{oz} oz cooked {meat}", starch_amount(starch, l_st), veg_amount(veg)],
                l_p, l_k, l_st,
                _facts_line([(_meat_key(meat), oz), ("rice_cup", l_st or 0.6), ("veg_cup", 1.5)]),
            ))

    dinner = []
    for i in range(3):
        meat = _cycle(dinner_meats, i, dinner_meats[0])
        starch = _cycle(starches, i, "Rice")
        veg = _cycle(vegs, i, "Broccoli")
        oz = d.get("meat_oz") or round(d["protein_g"] / G_PER_OZ_COOKED_MEAT, 1)
        dinner.append(_plate(
            meat,
            [f"{oz} oz cooked {meat}", starch_amount(starch, d_st), veg_amount(veg)],
            d["protein_g"], d.get("kcal"), d_st,
            _facts_line([(_meat_key(meat), oz), ("rice_cup", d_st or 0.8), ("veg_cup", 1.5)]),
        ))

    sit = max(2, len(slots))
    starch_day = round(sum(float(s.get("starch_cups") or 0) for s in slots), 1)
    veg_day = round(VEG_CUPS_PER_MEAL * sit, 1)
    budget = (
        f"{starch_day} cups starch and {veg_day} cups veg across the day. "
        "3 plates per sitting. Rotate. Stay on the foods they listed."
    )
    return {
        "breakfast": breakfast,
        "lunch": lunch,
        "dinner": dinner,
        "eggs": egg,
        "starch_cups_day": starch_day,
        "veg_cups_day": veg_day,
        "budget": budget,
        "variety": "Rotate the 3 plates. Different protein or starch each day. Stay inside the foods they listed.",
        "source": "USDA FoodData Central rounded household servings.",
    }



def parse_height_cm(height) -> float | None:
    """Accept 6'0, 6'0\", 72, 72 in, 183 cm."""
    if height is None:
        return None
    s = str(height).strip().lower().replace("\"", "").replace("in", "").replace("inches", "").strip()
    if not s:
        return None
    if "cm" in s:
        try:
            return float(s.replace("cm", "").strip())
        except ValueError:
            return None
    if "'" in s or "’" in s or "ft" in s:
        s = s.replace("’", "'").replace("ft", "'").replace(" ", "")
        parts = s.split("'")
        try:
            feet = float(parts[0] or 0)
            inches = float(parts[1] or 0) if len(parts) > 1 else 0
            return (feet * 12 + inches) * 2.54
        except ValueError:
            return None
    try:
        n = float(s)
    except ValueError:
        return None
    if 4 <= n <= 7:
        return n * 12 * 2.54
    if n < 3:
        return n * 12 * 2.54
    if 48 <= n <= 90:
        return n * 2.54
    if 120 <= n <= 250:
        return n
    if n <= 84:
        return n * 2.54
    return n


def parse_form_height_cm(form: dict) -> float | None:
    try:
        ft = float(form.get("height_ft"))
    except (TypeError, ValueError):
        ft = None
    try:
        inch = float(form.get("height_in") or 0)
    except (TypeError, ValueError):
        inch = 0
    if ft is not None and 4 <= ft <= 7:
        inch = min(11, max(0, inch))
        return (ft * 12 + inch) * 2.54
    return parse_height_cm(form.get("height"))


def mifflin_bmr(weight_lb: float, height_cm: float, age: int | None, sex: str) -> int:
    k = kg(weight_lb)
    a = age if age else 35
    bmr = 10 * k + 6.25 * height_cm - 5 * a
    bmr += 5 if sex_key(sex) == "M" else -161
    return int(round(bmr))


def activity_key(form: dict) -> str:
    raw = str(form.get("activity_level") or form.get("activity") or "").strip().lower()
    if raw in ACTIVITY_FACTOR:
        return raw
    job = str(form.get("job_type") or "").lower()
    if "physical" in job or "labor" in job:
        return "very"
    if "feet" in job or "stand" in job:
        return "light"
    week = form.get("week") or {}
    train = 0
    for name in ("mon", "tue", "wed", "thu", "fri", "sat", "sun"):
        flag = week.get(name) or form.get(f"day_{name}_sc") or ""
        if str(flag).upper()[:1] in {"S", "C"}:
            train += 1
    if train >= 6:
        return "very"
    if train >= 3:
        return "moderate"
    if train >= 1:
        return "light"
    return "sedentary"


# 2024 Adult Compendium / Ainsworth 2011 MET values we actually program.
# kcal = MET × kg × hours (gross). Net session = (MET − 1) × kg × hours
# so resting cost already inside BMR is not counted twice.
MET_BY_TYPE = {
    "full body": 3.5, "upper": 3.5, "lower": 5.0, "push": 3.5, "pull": 3.5,
    "legs": 5.0, "chest": 3.5, "back": 3.5, "shoulders": 3.5, "arms": 3.5,
    "core": 3.0,
    "walk": 3.5, "run": 8.3, "bike": 6.8, "row": 5.0, "swim": 5.8,
    "elliptical": 5.0, "stairs": 9.3,
    "hockey": 8.0, "boxing": 7.8, "basketball": 6.5, "soccer": 7.0,
    "tennis": 7.3, "golf": 4.8,
}
MET_STRENGTH_DEFAULT = 3.5   # 02054 resistance, multiple exercises, 8–15 reps
MET_CARDIO_DEFAULT = 5.0
MET_SPORT_DEFAULT = 6.0
EATBACK_CUT = 0.50          # cut: half the net session. Wearables and compensation overshoot.
EATBACK_HOLD = 0.70
EATBACK_PUSH = 0.80


def met_for(session_type: str, kind: str) -> float:
    key = str(session_type or "").strip().lower()
    if key in MET_BY_TYPE:
        return MET_BY_TYPE[key]
    for name, met in MET_BY_TYPE.items():
        if name in key:
            return met
    if kind == "S":
        return MET_STRENGTH_DEFAULT
    if kind == "C":
        return MET_CARDIO_DEFAULT
    return 1.3


def session_kcal(weight_lb: float, met: float, minutes: int) -> dict:
    hours = max(0, int(minutes or 0)) / 60.0
    k = kg(weight_lb)
    gross = met * k * hours
    net = max(0.0, (met - 1.0) * k * hours)
    return {
        "met": met,
        "minutes": int(minutes or 0),
        "gross": int(round(gross)),
        "net": int(round(net)),
    }


def occupational_pal(form: dict) -> tuple[float, str]:
    job = str(form.get("job_type") or "").lower()
    if any(w in job for w in ("physical", "labor", "warehouse", "build", "landscap")):
        return 1.55, "physical job"
    if any(w in job for w in ("feet", "stand", "retail", "nurse", "server", "steps")):
        return 1.375, "on feet"
    return 1.20, "desk / sitting"


def eatback_fraction(intent: str) -> float:
    if intent == "push":
        return EATBACK_PUSH
    if intent == "maintain":
        return EATBACK_HOLD
    return EATBACK_CUT


def plan_burn(form: dict) -> dict:
    """Session burns from the week we will actually program."""
    weight = float(form.get("weight") or form.get("weight_lb") or 0)
    days = _form_week(form)
    rows = []
    weekly_net = 0
    weekly_gross = 0
    for d in days:
        if d["kind"] == "R":
            rows.append({**d, "met": 1.3, "gross": 0, "net": 0})
            continue
        met = met_for(d["type"], d["kind"])
        burn = session_kcal(weight, met, d["minutes"]) if weight else {"met": met, "minutes": d["minutes"], "gross": 0, "net": 0}
        weekly_net += burn["net"]
        weekly_gross += burn["gross"]
        rows.append({**d, **burn})
    return {
        "days": rows,
        "weekly_net": weekly_net,
        "weekly_gross": weekly_gross,
        "daily_avg_net": int(round(weekly_net / 7)) if weekly_net else 0,
        "formula": "kcal = MET × kg × hours. Net = (MET − 1) × kg × hours.",
        "source": "Herrmann et al. 2024 Adult Compendium; Ainsworth et al. 2011 Compendium. Med Sci Sports Exerc.",
    }


def plan_calories(form: dict, numbers: dict) -> dict:
    """Occupational TDEE + honest cut + partial eat-back of programmed sessions."""
    weight = float(form.get("weight") or form.get("weight_lb") or 0)
    goal = float(form.get("goal_weight") or 0)
    age_raw = form.get("age")
    try:
        age = int(age_raw) if age_raw not in (None, "") else None
    except (TypeError, ValueError):
        age = None
    sex = str(form.get("sex") or "")
    height_cm = parse_form_height_cm(form)
    occ_factor, occ_label = occupational_pal(form)
    bmr = mifflin_bmr(weight, height_cm, age, sex) if weight and height_cm else None
    base = int(round(bmr * occ_factor)) if bmr else None
    burn = plan_burn(form) if weight else {"days": [], "weekly_net": 0, "daily_avg_net": 0}
    intent = str(form.get("month_intent") or "cut").lower()
    eatback = eatback_fraction(intent)
    train_add = int(round((burn.get("daily_avg_net") or 0) * eatback))
    maintain = (base + train_add) if base else None
    honest = numbers.get("cut_lb_30d") or (0, 0)
    wanted = max(0.0, weight - goal) if weight and goal and goal < weight else 0.0
    planned_lb = min(wanted, float(honest[1])) if intent == "cut" and wanted else 0.0
    surplus = 0
    if intent == "push":
        planned_lb = 0.0
        surplus = int(MARGINS.get("push_surplus_kcal") or 250)
    deficit = int(round(planned_lb * KCAL_PER_LB / DAYS_PLAN)) if planned_lb else 0
    deficit = min(deficit, MARGINS["deficit_kcal_day_max"])
    if intent == "maintain" or (intent != "cut" and wanted == 0 and intent != "push"):
        deficit = 0
    if intent == "push":
        deficit = 0
    rec = maintain + surplus - deficit if maintain else None
    floor = MARGINS["calorie_floor_m"] if sex_key(sex) == "M" else MARGINS["calorie_floor_f"]
    floored = False
    if rec is not None and rec < floor:
        rec = floor
        floored = True
        deficit = max(0, (maintain or rec) - rec)
    rest_day = (base - deficit + (surplus if intent == "push" else 0)) if base else rec
    if rest_day is not None and rest_day < floor:
        rest_day = floor
    day_targets = []
    for d in burn.get("days") or []:
        extra = int(round((d.get("net") or 0) * eatback))
        target = (rest_day + extra) if rest_day is not None else rec
        if target and target < floor:
            target = floor
        day_targets.append({
            "label": d.get("label"),
            "kind": d.get("kind"),
            "type": d.get("type"),
            "met": d.get("met"),
            "minutes": d.get("minutes"),
            "net_kcal": d.get("net"),
            "eatback_kcal": extra,
            "daily_kcal": target,
        })
    choice = str(form.get("calorie_choice") or "keep").strip().lower()
    custom_raw = form.get("calorie_custom") or form.get("calories")
    custom = None
    try:
        if custom_raw not in (None, ""):
            custom = int(float(custom_raw))
    except (TypeError, ValueError):
        custom = None
    use_custom = choice in {"custom", "change", "set", "other"}
    if choice in {"keep", "recommended", ""}:
        use_custom = False
    final = custom if use_custom and custom is not None else rec
    if use_custom and custom is not None:
        rest_day = custom
        for row in day_targets:
            row["daily_kcal"] = custom + (row.get("eatback_kcal") or 0)
    note = (
        f"{final} kcal printed. Rest {rest_day}. Train days sit above rest by the eat-back slice. "
        "Thirty-day sketch, not a promise."
    )
    if not use_custom and floored:
        note += f" Hit the {floor} kcal floor. A clinician has to sign off below that."
    if use_custom and custom is not None and rec is not None:
        if custom < rec:
            note += f" They keyed {custom} kcal — under the recommended {rec}."
        elif custom > rec:
            note += f" They keyed {custom} kcal — over the recommended {rec}."
        else:
            note += f" They keyed {custom} kcal, same as the recommendation."
        if custom < floor:
            note += f" That is under the {floor} safety floor. Printed anyway. Not approved."
        if custom > rec + 400:
            note += " Well over the cut line — the scale may stall."
    return {
        "bmr": bmr,
        "activity": occ_label,
        "activity_factor": occ_factor,
        "occupational": base,
        "maintain": maintain,
        "burn": burn,
        "eatback": eatback,
        "train_add": train_add,
        "wanted_lb_30d": wanted,
        "planned_lb_30d": planned_lb,
        "deficit": deficit,
        "surplus": surplus,
        "recommended": rec,
        "rest_day": rest_day,
        "day_targets": day_targets,
        "floor": floor,
        "floored": floored,
        "choice": "custom" if use_custom and custom else "keep",
        "custom": custom,
        "daily": final,
        "rest_day_kcal": rest_day,
        "train_day_kcal": (
            int(round(sum(t["daily_kcal"] or 0 for t in day_targets if t.get("kind") != "R")
                      / max(1, sum(1 for t in day_targets if t.get("kind") != "R"))))
            if day_targets else rec
        ),
        "note": note,
        "rule": "Occupational TDEE plus a fraction of programmed session burn. Print rest-day and train-day. Do not eat 100% of the watch. Custom number still wins if they set one.",
    }


def plan_water(form: dict, numbers: dict) -> dict:
    mug = float(form.get("mug_oz") or form.get("mug") or 32)
    return {
        "rest_oz": numbers.get("water_oz_rest"),
        "train_oz": numbers.get("water_oz_train"),
        "mug_oz": mug,
        "fills": numbers.get("water_fills"),
        "rule": "32 ml/kg plus 500 ml on a training day. Count fills of their jug. Food water is not in the printed fills.",
    }


def _fast_hours(raw) -> int:
    digits = "".join(ch for ch in str(raw or "24") if ch.isdigit())
    hours = int(digits) if digits else 24
    return max(16, min(hours, 96))


def _parse_cal_label(label: str) -> tuple[str, str]:
    parts = str(label or "R Off").split(None, 1)
    if len(parts) == 1:
        kind = parts[0][:1].upper() if parts[0] else "R"
        return kind, parts[0]
    return parts[0][:1].upper(), parts[1]


def _date_blocked(day: dt.date, label: str, never: str, blocked: set[str]) -> bool:
    if day.isoformat() in blocked:
        return True
    blob = f"{day.strftime('%A')} {label} {never}".lower()
    for token in (t.strip().lower() for t in (never or "").replace(",", " ").split() if t.strip()):
        if len(token) >= 3 and token in blob and token not in {"the", "and", "day", "days"}:
            # weekday or sport name they typed
            if token in day.strftime("%A").lower() or token in str(label).lower():
                return True
    return False


def place_fasts(form: dict, calendar: dict | None, count: int, hours: int) -> list[dict]:
    """Pick empty days when they left fast_when blank. Sport days stay fed if a rest day exists."""
    if not calendar:
        return []
    when = str(form.get("fast_when") or "").strip()
    if when:
        return []
    never = str(form.get("fast_never") or "")
    blocked = set()
    raw_block = str(form.get("blocked_dates") or "")
    for chunk in raw_block.replace(",", " ").split():
        chunk = chunk.strip()
        if len(chunk) >= 8 and chunk[4] == "-":
            blocked.add(chunk[:10])
    dates = sorted(dt.date.fromisoformat(k) for k in calendar)
    if not dates:
        return []
    start = dates[0]
    core_len = 1 if hours <= 36 else 2 if hours <= 54 else 3

    def score(day: dt.date, allow_rest: bool, allow_sport: bool) -> int | None:
        core = [day + dt.timedelta(days=i) for i in range(core_len)]
        if any(d.isoformat() not in calendar for d in core):
            return None
        if (day - start).days < 6:
            return None
        pts = 0
        for d in core:
            raw = calendar[d.isoformat()]
            kind, typ = _parse_cal_label(raw)
            if _date_blocked(d, raw, never, blocked):
                return None
            blob = f" {raw} ".replace("+", " ").lower()
            sport = typ in SPORT_DAYS or any(n.lower() in blob for n in SPORT_DAYS)
            if sport and not allow_sport:
                return None
            if kind == "R" and not allow_rest:
                return None
            if sport:
                pts -= 20
            elif kind == "R":
                pts -= 8
            elif kind == "S":
                pts += 6
            elif kind == "C":
                pts += 4
        return pts

    def rank(allow_rest: bool, allow_sport: bool):
        rows = []
        for d in dates:
            s = score(d, allow_rest, allow_sport)
            if s is not None:
                rows.append((s, d))
        rows.sort(key=lambda row: (-row[0], row[1]))
        return rows

    ranked = rank(False, False)
    if len(ranked) < max(1, count):
        ranked = rank(True, False)
    if len(ranked) < max(1, count):
        ranked = rank(True, True)

    picked = []
    used = set()
    gap = 10 if hours >= 36 else 7
    for s, d in ranked:
        if any(abs((d - u).days) < gap for u in used):
            continue
        core = [d + dt.timedelta(days=i) for i in range(core_len)]
        fed_start = d - dt.timedelta(days=1)
        break_day = core[-1] + dt.timedelta(days=1)
        picked.append({
            "empty": d.isoformat(),
            "core": [x.isoformat() for x in core],
            "start_evening": fed_start.isoformat() if fed_start.isoformat() in calendar else d.isoformat(),
            "break_morning": break_day.isoformat() if break_day.isoformat() in calendar else core[-1].isoformat(),
            "hours": hours,
            "why": "Off sport and rest when a training day was open. Sport stays fed if we can.",
        })
        used.add(d)
        if len(picked) >= max(1, count):
            break
    return picked


def plan_fasting(form: dict, calendar: dict | None) -> dict:
    if not _truthy(form.get("fast_yes")):
        return {
            "wanted": False,
            "days": [],
            "windows": [],
            "auto_placed": False,
            "tips": [],
            "key": FASTING_KEY,
            "rule": "They did not ask. No fast.",
        }
    length = str(form.get("fast_length") or form.get("fast_hours") or "24")
    hours = _fast_hours(length)
    count = form.get("fast_count") or 1
    try:
        count = int(count)
    except (TypeError, ValueError):
        count = 1
    count = 2 if count >= 2 else 1
    never = str(form.get("fast_never") or "")
    history = str(form.get("fast_history") or "")
    when = str(form.get("fast_when") or "").strip()
    windows = place_fasts(form, calendar, count, hours)
    auto = bool(windows) and not when
    tips = []
    if not history.strip():
        tips = [
            "Water and salt stay on.",
            "Pause food-bound pills (multi, D, fish oil, creatine).",
            "Keep medications on the clinician's schedule.",
            "Do not land a fast on a sport day, race day, or a date they marked protected.",
            "Break the fast with protein + salt + a normal meal. Not a giant first meal.",
        ]
    if auto:
        tips.append("Each session is the length you picked. Off sport and rest when a training day was open.")
    return {
        "wanted": True,
        "length": length,
        "hours": hours,
        "count": count,
        "never": never,
        "when": when,
        "history": history,
        "new": not bool(history.strip()),
        "windows": windows,
        "days": [w["empty"] for w in windows],
        "auto_placed": auto,
        "tips": tips,
        "key": FASTING_KEY,
        "rule": "If they leave the start blank, place the empty day on rest. Never cover a sport day when a rest day exists.",
    }


def plan_sport_fuel(week: dict) -> list[dict]:
    """Fuel note for whatever sport days THEY checked. No assumed weekdays."""
    out = []
    for d in week.get("days") or []:
        typ = d.get("type") or ""
        if typ not in SPORT_DAYS:
            continue
        when = str(d.get("when") or "").lower()
        if when.startswith("morn"):
            eat = "Eat after. Do not skip the later plate."
        elif when.startswith("eve"):
            eat = "Eat 3–4 hours before. No fast the night before."
        else:
            eat = "Eat the sitting nearest this session. Sport day stays fed."
        out.append({
            "label": d.get("label"),
            "type": typ,
            "when": d.get("when"),
            "note": f"{d.get('label')} {typ}: {eat}",
        })
    return out


def plan_blocked(form: dict) -> dict:
    dates = str(form.get("blocked_dates") or "").strip()
    return {
        "dates": dates,
        "why": str(form.get("blocked_why") or ""),
        "plan": str(form.get("blocked_plan") or "walk only"),
        "food": str(form.get("blocked_food") or "protein + starch + veg from a menu"),
        "rule": "Blocked days follow their plan. Do not pretend they trained at home if they said skip.",
    }


def _first_name(form: dict) -> str:
    name = str(form.get("name") or "You").strip()
    if not name or name.lower() == "you":
        return "You"
    return name.split()[0]


def plan_opening(form: dict, numbers: dict, week: dict, food: dict, calories: dict | None = None, fasting: dict | None = None) -> dict:
    """Cover note. Three or four sentences. Their words. No inventory. No shame."""
    weight = float(form.get("weight") or 0)
    asked = float(form.get("goal_weight") or 0)
    cut = numbers.get("cut_lb_30d") or (0, 0)
    first = _first_name(form)
    s_days = week.get("strength_days") or 0
    sports = week.get("sport_days") or []
    goal = str(form.get("goal") or "").strip()
    if goal.lower().startswith("test client"):
        goal = ""
    intent = str(form.get("month_intent") or "cut").lower()
    honest = True
    reasons = []
    want = 0.0
    if weight and asked and asked < weight:
        want = weight - asked
        if want > cut[1] + 1:
            honest = False
            reasons.append(f"{want:.0f} lb in 30 days is a movie. {cut[0]}–{cut[1]} lb keeps the muscle.")
    if s_days < STRENGTH_SESSIONS_MIN and intent in {"push", "gain"}:
        honest = False
        reasons.append("Not enough lift days on the form for a strength fairy tale.")
    if (calories or {}).get("floored") and intent == "cut" and want:
        honest = False
        reasons.append("Calories parked at the safety floor. The scale will move slower than the wish.")

    sport_bit = sports[0].split()[-1] if sports else ""
    analog = {
        "Hockey": "We kept hockey. The ice is not going to skate itself.",
        "Boxing": "We kept boxing. The bag already heard all your jokes.",
        "Soccer": "We kept soccer. That ball was not going to kick itself.",
        "Basketball": "We kept basketball. The hoop is 10 feet. So is the bar. Both stay.",
        "Tennis": "We kept tennis. Love means nothing. Showing up means dinner.",
        "Golf": "We kept golf. Walk the course. The cart does not burn the calories for you.",
        "Swim": "We kept swim. Chlorine is not a cologne. Laps still count.",
        "Run": "We kept running. One foot, then the other. Revolutionary stuff.",
    }.get(sport_bit, "The weights will not lift themselves. We checked.")

    hook = f"{first}. {analog}"

    mid = "Eat the ounces. Drink the water. Yes, again. That is the whole bit."
    if goal:
        mid = f'You wrote “{goal[:48]}.” Nice. Now go be the person who packs lunch.'
    if fasting and fasting.get("wanted"):
        mid = "Fasts sit on rest days. Hungry on game day is a dad joke nobody asked for."

    close = "Thirty days. We believe in you. The fridge believes in leftovers. Work it out."
    if not honest:
        close = reasons[0] + " We printed the number that keeps the muscle. The movie version is still in theaters."

    text = " ".join([hook, mid, close])
    return {"honest": honest, "text": text, "reasons": reasons, "bits": [hook, mid, close]}


def audit_plan(book: dict) -> list[str]:
    """Flag any printed number that walked outside the evidence fences."""
    flags = []
    nums = book.get("numbers") or {}
    weight = (book.get("who") or {}).get("weight") or 0
    if weight and nums.get("protein_g"):
        lo, hi = nums["protein_g"]
        per_lo = lo / kg(weight)
        per_hi = hi / kg(weight)
        mlo, mhi = MARGINS["protein_g_per_kg"]
        if per_lo < mlo - 0.05 or per_hi > mhi + 0.05:
            flags.append(f"protein {per_lo:.2f}–{per_hi:.2f} g/kg outside {mlo}–{mhi}")
    if nums.get("water_oz_rest") and weight:
        ml = nums["water_oz_rest"] * ML_PER_OZ
        per = ml / kg(weight)
        if not (MARGINS["water_ml_per_kg"][0] <= per <= MARGINS["water_ml_per_kg"][1] + 8):
            flags.append(f"water {per:.0f} ml/kg off the 30–40 band (IOM floor can lift this)")
    cut = nums.get("cut_lb_30d")
    if cut and weight:
        weeks = 30 / 7
        hi_pct = (cut[1] / weight) / weeks
        if hi_pct > MARGINS["cut_pct_week"][1] + 0.001:
            flags.append(f"cut {hi_pct:.3f}/week faster than 1%")
    for change in book.get("vitamin_changes") or []:
        if change.get("action") != "ADD":
            continue
        name = str(change.get("name") or "").lower()
        why = str(change.get("why") or "").lower()
        if "magnesium" in name and "200–400" in why:
            flags.append("magnesium add above the 350 mg supplement UL")
        if "vitamin d" in name and "5000" in why:
            flags.append("vitamin D add looks above the 2000 IU program dose")
    return flags


def plan_guide(form: dict, week: dict, food: dict, calories: dict, fasting: dict) -> dict:
    """Hand-hold copy that every playbook prints. Built from their week and plates."""
    meals = food.get("meals_per_day") or 3
    daily = food.get("daily_kcal") or calories.get("daily")
    egg = (food.get("eggs") or {}).get("line") or ""
    budget = (food.get("menu") or {}).get("budget") or ""
    sports = week.get("sport_days") or []
    windows = fasting.get("windows") or []
    rest_kcal = calories.get("rest_day")
    return {
        "session": [
            "5 minutes easy first. Then the first compound on the list.",
            "2–3 minutes between heavy sets. 60–90 seconds on accessories.",
            "Stop 2–3 reps short of failure (ACSM 2026). Save the hero set for a meet week.",
            "If the clock hits the cap, drop the last accessory. Never drop the first compound.",
            "Write the top set. Next week add a little load or a rep — not both.",
        ],
        "sport": [
            f"Sport days this month: {', '.join(sports) or 'none listed'}. That day is the sport. No extra lift under it.",
            *[n["note"] for n in plan_sport_fuel(week)],
            "Water on. Salt on. Do not start a fast the night before a game.",
        ],
        "food": [
            f"{meals} sittings. Printed daily {daily} kcal."
            + (f" Rest day {calories.get('rest_day')}." if calories.get("rest_day") else "")
            + (f" Train day ~{calories.get('train_day_kcal')}." if calories.get("train_day_kcal") else ""),
            (f"Fiber cue about {food.get('fiber_g')} g from veg." if food.get("fiber_g") else ""),
            egg and f"Breakfast eggs: {egg}." or "Hit the breakfast protein number even if you skip eggs.",
            budget or "Swap rice for potato, spinach for broccoli. Keep the cups and ounces.",
            "Scale the food, not your mood. A heavy dinner after a light lunch is fine if the day still hits protein.",
            "Eating out: order the protein first, a starch the size of a fist, a pile of veg. That is the plate.",
        ],
        "miss": [
            "Miss a lift: do not double it tomorrow. Run the next day's page.",
            "Miss a sport day: that day becomes a walk. Do not invent a new lift.",
            "Travel: protein + starch + veg from a menu. Same ounces you can guess.",
            "Sick: walk and food. No hero session.",
        ],
        "stack": [
            "Multi and D3 with a meal that has fat.",
            "Magnesium at night.",
            "Creatine 5 g on eating days. Pause on water-only fasts.",
            "Medications stay on the clinician's schedule. We do not touch those.",
        ],
        "fast": [
            "If a window is printed, that is the empty day. Start the evening before. Break the next morning.",
            "Water and salt stay on. Black coffee is fine.",
            "Pause multi, D, fish oil, creatine. Keep medications.",
            "Break with protein + salt + a normal plate. Not a giant first meal.",
        ] if fasting.get("wanted") else ["No fast this month."],
        "windows": windows,
        "rule": "The pages win over memory. If a day is ugly, run the next page. Nobody gets graded.",
    }


def plan_assumptions(form: dict) -> list[str]:
    out = []
    if not form.get("mug_oz") and not form.get("mug"):
        out.append("Jug size was blank. Used 32 oz.")
    if not form.get("meals_per_day") and not form.get("meals"):
        out.append("Meal count was blank. Used 3.")
    if not form.get("sex"):
        out.append("Sex was blank. Water floor used the 32 ml/kg line only.")
    if not any(form.get(f"day_{k}_sc") or (form.get("week") or {}).get(k) for k in DAY_NAMES):
        out.append("Week grid was thin. Strength/cardio flags were inferred where we could.")
    return out


def create(form: dict) -> dict:
    """Playbook Creator entry point. Pass intake answers. Get the full plan.

    Returns numbers, stack, why_we_changed, week, exercise, food, water,
    fasting, blocked, opening note, sources. PDF drawers read this dict.

    The incoming form is copied, used once, then wiped. Nothing from
    that client becomes a default for the next call.
    """
    form = dict(form or {})
    try:
        return _create_from(form)
    finally:
        form.clear()


def _create_from(form: dict) -> dict:
    weight = float(form.get("weight") or form.get("weight_lb") or 0)
    mug = float(form.get("mug_oz") or form.get("mug") or 32)
    meals = int(form.get("meals_per_day") or form.get("meals") or 3)
    sex = str(form.get("sex") or "")
    age_raw = form.get("age")
    try:
        age = int(age_raw) if age_raw not in (None, "") else None
    except (TypeError, ValueError):
        age = None
    vegetarian = _truthy(form.get("prot_veg")) or "vegetar" in str(form.get("restrictions") or "").lower()
    dairy_ok = str(form.get("dairy_whey") or "yes").strip().lower() not in {"no", "n", "false"}
    week = plan_week(form)
    lifts = week["strength_days"] > 0 or bool(week["sport_days"])
    listed = _listed_from_form(form)
    no_supps = _truthy(form.get("no_supps")) or not listed
    adjust = _truthy(form.get("adjust_stack") if form.get("adjust_stack") not in (None, "") else True)
    fish = _truthy(form.get("prot_fish"))
    meds = str(form.get("medications") or form.get("meds") or "")

    intent = str(form.get("month_intent") or "cut").lower()
    if intent not in PROTEIN_G_PER_KG:
        intent = "cut"
    nums = targets(weight, mug, meals, sex=sex, intent=intent) if weight else {}
    stack = vitals(
        age=age,
        sex=sex,
        listed=listed,
        no_supps=no_supps,
        adjust=adjust,
        vegetarian=vegetarian,
        lifts=lifts,
        indoor_or_evening=True,
        eats_fatty_fish_weekly=fish,
        dairy_ok=dairy_ok,
        meds=meds,
    )
    calories = plan_calories(form, nums)
    food = plan_food(form, nums, calories)
    water = plan_water(form, nums)
    exercise = plan_exercise(form)
    blocked = plan_blocked(form)
    start = None
    raw_start = form.get("start_date")
    if raw_start:
        start = dt.datetime.strptime(str(raw_start), "%Y-%m-%d").date()
    cal = None
    if start:
        template = {d["dow"]: d["kind"] + " " + d["type"] for d in week["days"]}
        cal = {d.isoformat(): v for d, v in weekday_map(start, template).items()}
    fasting = plan_fasting(form, cal)
    opening = plan_opening(form, nums, week, food, calories, fasting)
    asked = float(form.get("goal_weight") or 0)

    book = {
        "brand": BRAND,
        "chapters": CHAPTERS,
        "sources": SOURCES,
        "who": {
            "name": form.get("name"),
            "email": form.get("email"),
            "age": age,
            "sex": sex,
            "height": form.get("height"),
            "weight": weight,
            "goal_weight": asked or None,
            "start_date": raw_start,
            "sleep_hours": form.get("sleep_hours"),
            "job_type": form.get("job_type"),
            "month_intent": form.get("month_intent"),
            "goal": form.get("goal"),
        },
        "numbers": nums,
        "water": water,
        "calories": calories,
        "food": food,
        "exercise": exercise,
        "run_guide": exercise.get("run_guide"),
        "week": week,
        "stack": stack,
        "why_we_changed": stack.get("why_we_changed", ""),
        "vitamin_changes": stack.get("changes", []),
        "fasting": fasting,
        "blocked": blocked,
        "chrome": PLAYBOOK_CHROME,
        "tools": {
            "moves": MOVE_BASE,
            "meal": MEAL_BUILDER_URL,
            "food_facts": FOOD_FACTS,
            "how_to": HOW_TO,
        },
        "sport_fuel": plan_sport_fuel(week),
        "calendar": cal,
        "honest_cut": opening["honest"],
        "opening_note": opening["text"],
        "assumptions": plan_assumptions(form),
        "guide": plan_guide(form, week, food, calories, fasting),
        "rda": rda_for(age, sex),
        "margins": MARGINS,
        "logic": {
            "protein": "ISSN 1.4–2.0 maintain/push. 1.6–2.2 on a cut. Split across their meal count. Count does not burn fat.",
            "water": "32 ml/kg + 500 ml train. Print jug fills.",
            "cut": "0.5–0.8% bodyweight/week. Opening note uses that range.",
            "calories": "Occupational TDEE + honest cut + partial eat-back of programmed MET burns. Custom number still wins.",
            "training": "ACSM 2026. Cap minutes. Sport is the sport. New lifters get 2 sets.",
            "food": "3 breakfast / 3 lunch / 3 dinner when that sitting exists. 2-meal plans skip lunch. Eggs first if they said yes.",
            "vitamins": "Always plan. Explain every KEEP/ADD. Never change meds.",
            "fasting": "Only if they asked. If when is blank, empty day lands on rest. Sport stays fed.",
            "protein": "ISSN 1.4–2.0 maintain/push. 1.6–2.2 on a cut. Never print above 2.2 g/kg.",
        },
    }
    book["audit"] = audit_plan(book)
    book["review"] = review_book(book)
    book.pop("form", None)
    book.pop("raw", None)
    write_tool_pages("/home/workdir/artifacts")
    return book


def write_tool_pages(out_dir: str = "/home/workdir/artifacts") -> dict:
    """Build moves.html and meal.html from HOW_TO + FOOD_FACTS only. No client names."""
    root = Path(out_dir)
    root.mkdir(parents=True, exist_ok=True)
    cards = []
    for name, how in HOW_TO.items():
        slug = move_slug(name)
        q = name.replace(" ", "+") + "+how+to+form"
        cards.append(
            f'<section class="card" id="{slug}"><div class="num">MOVE</div>'
            f"<h2>{name}</h2><p class=\"how\">{how}</p>"
            f"<ol><li>Brace.</li><li>{how}</li><li>Stop 2–3 reps short.</li></ol>"
            f'<p class="watch"><a href="https://www.youtube.com/results?search_query={q}" target="_blank" rel="noopener">Watch a demo →</a></p></section>'
        )
    moves = (
        "<!doctype html><html lang='en'><head><meta charset='utf-8'/>"
        "<meta name='viewport' content='width=device-width,initial-scale=1'/>"
        "<title>30 Day Fitness Playbook — Moves</title>"
        "<style>body{margin:0;background:#101410;color:#F5F7FB;font:16px/1.45 system-ui,sans-serif}"
        ".bar{height:6px;background:linear-gradient(90deg,#C41E3A,#fff,#3D6FDB)}"
        "main{max-width:720px;margin:0 auto;padding:16px;display:grid;gap:14px}"
        ".card{background:#171C28;border-radius:16px;padding:18px;border-left:6px solid #3D6FDB;scroll-margin-top:16px}"
        ".card:target{border-left-color:#C41E3A}h2{margin:4px 0 8px}.watch a{color:#7EB0FF}</style>"
        "</head><body><div class='bar'></div><main>"
        + "".join(cards)
        + "</main></body></html>"
    )
    (root / "moves.html").write_text(moves)
    ui = Path("/home/workdir/artifacts/meal_ui.html")
    if ui.exists():
        (root / "meal.html").write_text(ui.read_text().replace("__DB__", json.dumps(FOOD_FACTS)))
        return {"moves": str(root / "moves.html"), "meal": str(root / "meal.html")}

    polished = Path("/home/workdir/artifacts/meal.html")
    if polished.exists() and "BUILD A MEAL" in polished.read_text():
        txt = polished.read_text()
        if "__DB__" in txt:
            txt = txt.replace("__DB__", json.dumps(FOOD_FACTS))
        (root / "meal.html").write_text(txt)
    else:
        (root / "meal.html").write_text(meal)
    return {"moves": str(root / "moves.html"), "meal": str(root / "meal.html")}


def review_book(book: dict) -> dict:
    """Last pass before a playbook is sent. Re-run the math. Flag anything that drifted."""
    errors: list[str] = []
    warnings: list[str] = []
    checks: list[str] = []
    who = book.get("who") or {}
    nums = book.get("numbers") or {}
    food = book.get("food") or {}
    cal = book.get("calories") or {}
    water = book.get("water") or {}
    week = book.get("week") or {}
    weight = float(who.get("weight") or 0)
    meals = int(food.get("meals_per_day") or 3)

    def ok(name: str) -> None:
        checks.append(name)

    # Protein band
    if weight and nums.get("protein_g"):
        lo, hi = nums["protein_g"]
        per_lo, per_hi = lo / kg(weight), hi / kg(weight)
        mlo, mhi = MARGINS["protein_g_per_kg"]
        if per_lo < mlo - 0.05 or per_hi > mhi + 0.05:
            errors.append(f"protein {per_lo:.2f}–{per_hi:.2f} g/kg outside {mlo}–{mhi}")
        else:
            ok(f"protein {lo}–{hi} g ({per_lo:.2f}–{per_hi:.2f} g/kg)")

    # Slots add up
    slots = food.get("slots") or []
    if slots:
        psum = sum(s.get("protein_g") or 0 for s in slots)
        mid = nums.get("protein_mid") or psum
        if abs(psum - mid) > 2:
            errors.append(f"slot protein {psum} != mid {mid}")
        else:
            ok(f"slot protein {psum} = mid {mid}")
        ksum = sum(s.get("kcal") or 0 for s in slots)
        daily = food.get("daily_kcal") or cal.get("daily")
        if daily and abs(ksum - int(daily)) > meals + 2:
            errors.append(f"slot kcal {ksum} != daily {daily}")
        elif daily:
            ok(f"slot kcal {ksum} = daily {daily}")
        if food.get("daily_kcal") and cal.get("daily") and int(food["daily_kcal"]) != int(cal["daily"]):
            errors.append(f"food daily {food['daily_kcal']} != calorie daily {cal['daily']}")

    # Water
    if weight and water.get("rest_oz") and water.get("mug_oz"):
        rest, train = water["rest_oz"], water["train_oz"]
        if train < rest:
            errors.append("train water is under rest water")
        else:
            ok(f"water rest {rest} / train {train} oz")

    # Cut honesty
    cut = nums.get("cut_lb_30d")
    asked = who.get("goal_weight")
    if weight and asked and asked < weight and cut:
        want = weight - float(asked)
        if want > cut[1] + 1 and book.get("honest_cut") is True:
            errors.append("wanted cut is past honest range but opening treated it as honest")
        elif want > cut[1] + 1:
            ok(f"honest note set: wanted {want:.0f} vs {cut[0]}–{cut[1]}")
        else:
            ok(f"wanted cut {want:.0f} inside {cut[0]}–{cut[1]}")

    # Calories vs custom
    if cal.get("choice") == "custom" and cal.get("custom") and cal.get("daily") != cal.get("custom"):
        errors.append(f"custom {cal['custom']} was not the printed daily {cal['daily']}")
    if cal.get("recommended") and cal.get("floor") and cal["recommended"] < cal["floor"]:
        errors.append("recommended calories under the floor")
    if cal.get("rest_day") and cal.get("floor") and cal["rest_day"] < cal["floor"]:
        errors.append(f"rest day {cal['rest_day']} under the floor {cal['floor']}")
    if cal.get("daily"):
        ok(f"daily calories {cal['daily']} ({cal.get('choice')})")

    # Session burn rebuild
    if weight and cal.get("burn"):
        burn_bad = False
        for d in cal["burn"].get("days") or []:
            if d.get("kind") == "R":
                continue
            met = d.get("met") or met_for(d.get("type"), d.get("kind"))
            rebuilt = session_kcal(weight, met, d.get("minutes") or 0)
            if abs((d.get("net") or 0) - rebuilt["net"]) > 3:
                burn_bad = True
                errors.append(f"{d.get('label')} burn {d.get('net')} != rebuilt {rebuilt['net']}")
        if not burn_bad:
            ok(f"session burns rebuild ({cal['burn'].get('weekly_net')} net kcal / week)")

    # Eat-back math
    if cal.get("eatback") is not None and cal.get("train_add") is not None:
        expect = int(round((cal.get("burn") or {}).get("daily_avg_net", 0) * cal["eatback"]))
        if abs(expect - int(cal["train_add"])) > 2:
            errors.append(f"eat-back {cal['train_add']} != {expect}")
        else:
            ok(f"eat-back {int(cal['eatback']*100)}% → {cal['train_add']} kcal")

    # Week vs exercise
    s_days = week.get("strength_days") or 0
    if s_days < STRENGTH_SESSIONS_MIN and str(who.get("month_intent") or "").lower() in {"push", "gain"}:
        warnings.append("under 2 strength days on a push month")
    else:
        ok(f"week {s_days} strength / {week.get('cardio_days')} cardio")

    sport = set(week.get("sport_days") or [])
    fasting = book.get("fasting") or {}
    if fasting.get("wanted"):
        windows = fasting.get("windows") or []
        sport_hit = False
        cal_map = book.get("calendar") or {}
        for w in windows:
            for iso in w.get("core") or []:
                kind, typ = _parse_cal_label(cal_map.get(iso, ""))
                if typ in SPORT_DAYS:
                    sport_hit = True
                    errors.append(f"fast core {iso} sits on {typ}")
        if sport_hit:
            pass
        elif windows:
            ok(f"fast windows { [w['empty'] for w in windows] } off sport")
        elif fasting.get("when"):
            ok("fast when provided by them")
        else:
            warnings.append("fast wanted but no window could be placed off sport")

    # Vitamins
    adds = [c for c in (book.get("vitamin_changes") or []) if c.get("action") == "ADD"]
    multi_adds = [
        c for c in adds
        if "multivitamin" in (c.get("name") or "").lower()
        or (c.get("name") or "").lower().strip() in {"multi", "adult multi"}
    ]
    if len(multi_adds) > 1:
        errors.append("two complete multis on the ADD list")
    for change in book.get("vitamin_changes") or []:
        blob = f"{change.get('name','')} {change.get('why','')}".lower()
        if change.get("action") == "ADD" and "vitamin d" in blob and "5000" in blob:
            errors.append("vitamin D add looks like 5000 IU")
        if change.get("action") == "ADD" and "magnesium" in blob and "200–400" in blob:
            errors.append("magnesium add still shows the old 400 mg cap")
    ok(f"stack {len(book.get('vitamin_changes') or [])} change rows")

    # Calendar weekday
    raw = who.get("start_date")
    if raw and book.get("calendar"):
        try:
            start = dt.datetime.strptime(str(raw), "%Y-%m-%d").date()
            first = min(book["calendar"])
            if first != start.isoformat():
                errors.append(f"calendar starts {first} not {start.isoformat()}")
            else:
                ok(f"calendar starts {start.isoformat()} ({start.strftime('%A')})")
        except ValueError:
            warnings.append(f"start_date {raw} is not YYYY-MM-DD")

    if book.get("audit"):
        warnings.extend(f"audit: {a}" for a in book["audit"])

    ok_flag = not errors
    return {
        "ok": ok_flag,
        "ready": ok_flag,
        "errors": errors,
        "warnings": warnings,
        "checks": checks,
        "summary": (
            "READY — math holds across protein, plates, water, burns, stack."
            if ok_flag and not warnings
            else "READY WITH NOTES — send, but read the warnings."
            if ok_flag
            else "HOLD — fix errors before this book goes out."
        ),
    }


def publish_ready(book: dict) -> bool:
    """True only when review_book found no errors."""
    rev = book.get("review") or review_book(book)
    return bool(rev.get("ok"))


def print_report(weight: float, mug: float, meals: int, start: str | None, sex: str = "") -> None:
    lo_w, hi_w = water_oz(weight, sex=sex)
    flo, fhi = water_fills(weight, mug, sex=sex)
    plo, phi = protein_g(weight)
    mid = int(round((plo + phi) / 2))
    parts = split_protein(mid, meals)
    cut = honest_cut_lb(weight)
    print(f"weight {weight} lb   sex {sex or 'unspecified'}   {kg(weight):.1f} kg")
    print(f"model protein 1.6–2.2 g/kg → {plo}–{phi} g/day   mid {mid} g in {meals} meals → {parts}")
    print(f"model water 32 ml/kg + 500 ml train → rest {lo_w} oz / train {hi_w} oz   fills {flo}–{fhi} of {mug} oz")
    print(f"per sitting target ~{int(0.25*kg(weight))}–{int(0.40*kg(weight))} g")
    print(f"meat oz for mid daily protein if one plate: {oz_meat_for_protein(mid)}")
    print(f"honest 30-day cut {cut[0]}–{cut[1]} lb  (0.5–0.8%/week)")
    print("lift: ≥2 strength days/week, 2–3 sets, compounds first. Maintain 6–10 hard sets/muscle/week.")
    if start:
        d0 = dt.datetime.strptime(start, "%Y-%m-%d").date()
        print(f"start {d0.isoformat()} is a {d0.strftime('%A')}")
        cal = calendar.Calendar(firstweekday=0)
        print("first week (Mon-Sun):", cal.monthdayscalendar(d0.year, d0.month)[0])


def main() -> None:
    ap = argparse.ArgumentParser(description="30 Day Fitness Playbook Creator")
    ap.add_argument("--weight", type=float, default=None)
    ap.add_argument("--mug", type=float, default=32)
    ap.add_argument("--meals", type=int, default=3)
    ap.add_argument("--start", type=str, default=None)
    ap.add_argument("--sex", type=str, default="")
    ap.add_argument("--age", type=int, default=None)
    ap.add_argument("--demo-vits", action="store_true")
    args = ap.parse_args()
    if args.demo_vits:
        print("=== blank form, 34F ===")
        print_plan(vit_plan(age=34, sex="F", no_supps=True, lifts=True))
        return
    if args.weight:
        print_report(args.weight, args.mug, args.meals, args.start, sex=args.sex)
        if args.age is not None or args.sex:
            print("\nvitamin block")
            print_plan(vit_plan(age=args.age, sex=args.sex, no_supps=True, lifts=True))
        return
    print("Playbook Creator. Pass a form dict to create(form), or --weight 180 --mug 32 --sex M --age 40")


if __name__ == "__main__":
    main()
