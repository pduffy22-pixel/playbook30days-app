import type { Intake, Kind, When } from "./types";
import { DAY_KEYS, DAY_LABELS } from "./types";
import {
  LB_PER_KG,
  ML_PER_OZ,
  WATER_ML_PER_KG,
  WATER_TRAIN_BONUS_ML,
  WATER_IOM_DRINK_F_ML,
  WATER_IOM_DRINK_M_ML,
  PROTEIN_G_PER_KG,
  CUT_PCT_PER_WEEK_LOW,
  CUT_PCT_PER_WEEK_HIGH,
  G_PER_OZ_COOKED_MEAT,
  WEEK_KIND,
  WEEK_WHEN,
  WEEK_MINS,
  RDA,
  RDA_71_PLUS,
  MOVE_BASE,
} from "./constants";

export function kg(weightLb: number): number {
  return weightLb / LB_PER_KG;
}

export function num(v: unknown, fallback = 0): number {
  if (v === null || v === undefined || v === "") return fallback;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : fallback;
}

export function intNum(v: unknown, fallback = 0): number {
  return Math.round(num(v, fallback));
}

export function truthy(val: unknown): boolean {
  if (val === true) return true;
  const s = String(val ?? "").trim().toLowerCase();
  return s === "1" || s === "y" || s === "yes" || s === "true" || s === "on" || s === "x";
}

export function sexKey(sex: string | null | undefined): "M" | "F" {
  const s = (sex || "").trim().toLowerCase();
  if (s.startsWith("f") || s === "w" || s === "woman" || s === "female") return "F";
  return "M";
}

export function ageBand(age: number | null): "19_50" | "51_70" | "71" {
  if (age === null) return "19_50";
  if (age >= 71) return "71";
  if (age >= 51) return "51_70";
  return "19_50";
}

export function rdaFor(age: number | null, sex: string | null | undefined): Record<string, number> {
  const sk = sexKey(sex);
  const band = ageBand(age);
  if (band === "71") {
    const base = { ...RDA["51_70"][sk], ...RDA_71_PLUS };
    if (sk === "M") base.calcium_mg = 1200;
    return base;
  }
  return { ...RDA[band][sk] };
}

export function blobOf(listed: Array<Record<string, unknown> | string> | undefined): string {
  const parts: string[] = [];
  for (const row of listed || []) {
    if (row && typeof row === "object" && !Array.isArray(row)) {
      parts.push(
        Object.values(row)
          .filter((v) => v)
          .map(String)
          .join(" "),
      );
    } else {
      parts.push(String(row));
    }
  }
  return parts.join(" ").toLowerCase();
}

export function hasWord(blob: string, words: readonly string[]): boolean {
  for (const w of words) {
    if (w.includes(" ") || w.includes("-")) {
      if (blob.includes(w)) return true;
    } else if (new RegExp(`(?<![a-z0-9])${escapeReg(w)}(?![a-z0-9])`).test(blob)) {
      return true;
    }
  }
  return false;
}

function escapeReg(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function waterOz(weightLb: number, sex = "", _train = false): [number, number] {
  let baseMl = WATER_ML_PER_KG * kg(weightLb);
  if (sex.toLowerCase().startsWith("f")) baseMl = Math.max(baseMl, WATER_IOM_DRINK_F_ML);
  else if (sex.toLowerCase().startsWith("m")) baseMl = Math.max(baseMl, WATER_IOM_DRINK_M_ML);
  const restOz = baseMl / ML_PER_OZ;
  const trainOz = (baseMl + WATER_TRAIN_BONUS_ML) / ML_PER_OZ;
  return [Math.round(restOz * 10) / 10, Math.round(trainOz * 10) / 10];
}

function fills(oz: number, mug: number): string {
  const n = oz / mug;
  const half = Math.round(n * 2) / 2;
  if (half === Math.trunc(half)) return String(Math.trunc(half));
  if (half - Math.trunc(half) === 0.5) return `${Math.trunc(half)}½`;
  return String(half);
}

export function waterFills(weightLb: number, mugOz: number, sex = ""): [string, string] {
  const mug = mugOz > 0 ? mugOz : 32;
  const [lo, hi] = waterOz(weightLb, sex);
  return [fills(lo, mug), fills(hi, mug)];
}

export function proteinG(weightLb: number, intent = "cut"): [number, number] {
  const k = kg(weightLb);
  let key = String(intent || "cut").toLowerCase();
  if (!(key in PROTEIN_G_PER_KG)) key = "cut";
  const [lo, hi] = PROTEIN_G_PER_KG[key];
  return [Math.round(k * lo), Math.round(k * hi)];
}

export function splitProtein(dailyG: number, meals: number): number[] {
  const m = Math.max(1, meals);
  const base = Math.floor(dailyG / m);
  const extra = dailyG - base * m;
  const parts = Array.from({ length: m }, () => base);
  parts[parts.length - 1] += extra;
  return parts;
}

export function ozMeatForProtein(grams: number): number {
  return Math.round((grams / G_PER_OZ_COOKED_MEAT) * 10) / 10;
}

export function honestCutLb(weightLb: number, days = 30): [number, number] {
  const weeks = days / 7;
  const lo = weightLb * CUT_PCT_PER_WEEK_LOW * weeks;
  const hi = weightLb * CUT_PCT_PER_WEEK_HIGH * weeks;
  return [Math.round(lo), Math.round(hi)];
}

export function parseHeightCm(height: unknown): number | null {
  if (height === null || height === undefined) return null;
  let s = String(height).trim().toLowerCase().replace(/"/g, "").replace(/in(ches)?/g, "").trim();
  if (!s) return null;
  if (s.includes("cm")) {
    const n = parseFloat(s.replace("cm", "").trim());
    return Number.isFinite(n) ? n : null;
  }
  if (s.includes("'") || s.includes("’") || s.includes("ft")) {
    s = s.replace(/’/g, "'").replace(/ft/g, "'").replace(/\s/g, "");
    const parts = s.split("'");
    const feet = parseFloat(parts[0] || "0");
    const inches = parts.length > 1 ? parseFloat(parts[1] || "0") : 0;
    if (!Number.isFinite(feet) || !Number.isFinite(inches)) return null;
    return (feet * 12 + inches) * 2.54;
  }
  const n = parseFloat(s);
  if (!Number.isFinite(n)) return null;
  // Bare 4–7 is feet ("6" from the form). 48–90 is inches. 120+ is cm.
  if (n >= 4 && n <= 7) return n * 12 * 2.54;
  if (n < 3) return n * 12 * 2.54;
  if (n >= 48 && n <= 90) return n * 2.54;
  if (n >= 120 && n <= 250) return n;
  if (n <= 84) return n * 2.54;
  return n;
}


export function parseFormHeightCm(form: { height?: unknown; height_ft?: unknown; height_in?: unknown } | Record<string, unknown>): number | null {
  const ft = parseFloat(String(form.height_ft ?? ""));
  const inch = parseFloat(String(form.height_in ?? "0"));
  if (Number.isFinite(ft) && ft >= 4 && ft <= 7) {
    const inn = Number.isFinite(inch) ? Math.min(11, Math.max(0, inch)) : 0;
    return (ft * 12 + inn) * 2.54;
  }
  return parseHeightCm(form.height);
}

export function parseISODate(raw: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(raw).trim());
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export function toISO(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${day}`;
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

/** Python date.weekday(): Mon=0. JS getDay(): Sun=0. */
export function mondayIndex(d: Date): number {
  return (d.getDay() + 6) % 7;
}

export function moveSlug(name: string): string {
  return Array.from(name)
    .map((ch) => (/[a-z0-9]/i.test(ch) ? ch.toLowerCase() : "-"))
    .join("")
    .replace(/^-+|-+$/g, "");
}

export function moveUrl(name: string): string {
  return `${MOVE_BASE}#${moveSlug(name)}`;
}

export function listedFromForm(form: Intake): Array<{ type: string; form: string; dose: string }> {
  if (form.listed && Array.isArray(form.listed)) {
    return form.listed.map((row) => ({
      type: String(row.type || row.name || "").trim(),
      form: String(row.form || "").trim(),
      dose: String(row.dose || "").trim(),
    }));
  }
  const rows: Array<{ type: string; form: string; dose: string }> = [];
  for (let i = 1; i <= 12; i++) {
    const typ = String(form[`supp${i}_type`] || "").trim();
    if (!typ) continue;
    rows.push({
      type: typ,
      form: String(form[`supp${i}_form`] || "").trim(),
      dose: String(form[`supp${i}_dose`] || "").trim(),
    });
  }
  return rows;
}

export type FormDay = {
  dow: number;
  key: (typeof DAY_KEYS)[number];
  label: string;
  kind: Kind;
  type: string;
  when: When;
  minutes: number;
};

function parseDaySlot(form: Intake, key: (typeof DAY_KEYS)[number], i: number, suffix: "" | "2"): FormDay | null {
  const nested = (form.week || {}) as Record<string, unknown>;
  const scKey = suffix ? `day_${key}_sc${suffix}` : `day_${key}_sc`;
  const raw = suffix
    ? form[scKey]
    : nested[key] ?? nested[String(i)] ?? form[scKey] ?? "R";
  if (suffix && (raw === undefined || raw === null || raw === "")) return null;
  let kind = String(raw ?? "R").trim().toUpperCase().slice(0, 1) || "R";
  if (!(WEEK_KIND as readonly string[]).includes(kind)) kind = "R";
  if (suffix && kind === "R") return null;
  const typ =
    form[`day_${key}_detail${suffix}`] ||
    form[`day_${key}_type${suffix}`] ||
    (kind === "S" ? "Full body" : kind === "C" ? "Walk" : "Off");
  let when = String(form[`day_${key}_when${suffix}`] || (suffix ? "Morning" : "Evening"));
  if (!(WEEK_WHEN as readonly string[]).includes(when)) when = suffix ? "Morning" : "Evening";
  let minutes = intNum(form[`day_${key}_min${suffix}`] ?? form.session_min, suffix ? 30 : 45);
  minutes = WEEK_MINS.reduce((best, n) => (Math.abs(n - minutes) < Math.abs(best - minutes) ? n : best), WEEK_MINS[0]);
  return {
    dow: i,
    key,
    label: suffix ? `${DAY_LABELS[i]} · 2` : DAY_LABELS[i],
    kind: kind as Kind,
    type: String(typ).trim() || "Other",
    when: when as When,
    minutes,
  };
}


/** Two sessions per day. Drop sc3+ junk so coach email can rebuild the same book. */
export function packIntake(form: Intake): Intake {
  const out: Record<string, unknown> = { ...form };
  for (const key of Object.keys(out)) {
    const extra = /^day_(mon|tue|wed|thu|fri|sat|sun)_(sc|detail|when|min)(\d+)$/.exec(key);
    if (extra && extra[3] !== "2") delete out[key];
  }
  if (!out.height_ft && out.height != null) {
    const s = String(out.height);
    const marked = /^(\d)\s*['’]\s*(\d{1,2})?/.exec(s);
    if (marked) {
      out.height_ft = marked[1];
      out.height_in = marked[2] ?? "0";
      out.height = `${marked[1]}'${marked[2] ?? "0"}"`;
    }
  }
  return out as Intake;
}

export function weekCheckLine(form: Intake): string {
  return formWeek(form)
    .map((d) => `${d.label} ${d.kind} ${d.type} ${d.minutes}m`)
    .join(" | ");
}

export function formWeek(form: Intake): FormDay[] {
  const days: FormDay[] = [];
  DAY_KEYS.forEach((key, i) => {
    const first = parseDaySlot(form, key, i, "");
    if (first) days.push(first);
    const second = parseDaySlot(form, key, i, "2");
    if (second) days.push(second);
  });
  return days;
}

export function firstName(form: Intake): string {
  const name = String(form.name || "You").trim();
  if (!name || name.toLowerCase() === "you") return "You";
  return name.split(/\s+/)[0] || "You";
}

export function parseCalLabel(label: string): [string, string] {
  const parts = String(label || "R Off").split(/\s+/, 2);
  if (parts.length === 1) {
    const kind = (parts[0][0] || "R").toUpperCase();
    return [kind, parts[0]];
  }
  return [(parts[0][0] || "R").toUpperCase(), parts[1]];
}

export function labelHasSport(label: string, sports: Set<string>) {
  const blob = ` ${String(label || "").replace(/\+/g, " ")} `;
  for (const name of sports) {
    if (blob.toLowerCase().includes(name.toLowerCase())) return true;
  }
  return false;
}
