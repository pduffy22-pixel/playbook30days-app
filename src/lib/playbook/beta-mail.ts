import type { Intake, Playbook } from "./types";
import { packIntake, weekCheckLine } from "./helpers";

/** Beta inbox. First FormSubmit mail asks this address to confirm. After that it just arrives. */
export const BETA_INBOX = "pduffy22@gmail.com";
const ENDPOINT = `https://formsubmit.co/ajax/${BETA_INBOX}`;

function summary(intake: Intake, book: Playbook) {
  const who = book.who || {};
  const cal = book.calories || {};
  const week = (book.week?.days || [])
    .map((d) => `${d.label} ${d.kind} ${d.type} ${d.minutes}m`)
    .join(" | ");
  return [
    `${who.name || "No name"} <${who.email || "no email"}>`,
    `${who.sex || "?"} ${who.age || "?"}  ${who.weight || "?"} → ${who.goal_weight || "?"} lb`,
    `Intent ${who.month_intent || intake.month_intent || "cut"}`,
    `Daily ${cal.daily ?? "—"} kcal  rest ${cal.rest_day ?? "—"}  train ${cal.train_day_kcal ?? "—"}`,
    `Meals ${intake.meals_per_day || 3}  jug ${intake.mug_oz || 32} oz`,
    `Week: ${week || "—"}`,
    intake.run_yes ? `Run goal ${intake.run_goal || "none"}` : "",
    `Goal in their words: ${intake.goal || who.goal || "—"}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function sendBetaCopy(intake: Intake, book: Playbook) {
  const name = String(book.who?.name || intake.name || "Unknown");
  try {
    await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        _subject: `30 Day Playbook beta — ${name}`,
        _template: "box",
        name,
        email: String(book.who?.email || intake.email || BETA_INBOX),
        message: summary(intake, book),
        intake_json: JSON.stringify(packIntake(intake)),
      }),
    });
  } catch {
    // Beta copy is best-effort. Do not block the book on the phone.
  }
}


export type CoachMailStatus = "idle" | "sending" | "sent" | "limited" | "error";

function playbookHtml(intake: Intake, book: Playbook) {
  const who = book.who || {};
  const cal = book.calories || {};
  const week = (book.week?.days || [])
    .map((d) => `<li>${d.label} — ${d.kind} ${d.type} ${d.minutes} min</li>`)
    .join("");
  const stack = [...(book.stack?.keep || []), ...(book.stack?.add || [])]
    .map((v) => `<li>${v.status || ""} ${v.name} — ${v.dose} (${v.when})</li>`)
    .join("");
  const sessions = (book.exercise?.sessions || [])
    .map((s) => `<li><strong>${s.title}</strong> ${s.note || ""}</li>`)
    .join("");
  const fasts = (book.fasting?.windows || [])
    .map((w) => `<li>Start ${w.start_evening || ""} — break ${w.break_morning || ""}</li>`)
    .join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>30 Day Playbook — ${who.name || ""}</title>
<style>body{font-family:sans-serif;max-width:40rem;margin:2rem auto;color:#111}h1{font-size:1.8rem}h2{margin-top:1.6rem}</style>
</head><body>
<p>30 DAY FITNESS PLAYBOOK</p>
<h1>${who.name || "Client"}</h1>
<p>${who.email || ""} · ${who.sex || ""} ${who.age || ""} · ${who.weight || ""} → ${who.goal_weight || ""} lb</p>
<p>${book.opening_note || ""}</p>
<h2>Energy</h2>
<p>Daily ${cal.daily ?? "—"} kcal · rest ${cal.rest_day ?? "—"} · train ${cal.train_day_kcal ?? "—"}</p>
<p>${cal.note || ""}</p>
<h2>Week</h2><ul>${week}</ul>
<h2>Exercise</h2><ul>${sessions}</ul>
<h2>Vitamins</h2><ul>${stack}</ul>
<h2>Fasting</h2><ul>${fasts || "<li>None</li>"}</ul>
<p>Print this file. Save as PDF if you want a PDF copy.</p>
</body></html>`;
}

export async function sendCoachCopy(intake: Intake, book: Playbook): Promise<CoachMailStatus> {
  const name = String(book.who?.name || intake.name || "Unknown");
  const html = playbookHtml(intake, book);
  const file = new File([html], `${name.replace(/\s+/g, "-")}-playbook.html`, { type: "text/html" });
  const fd = new FormData();
  fd.append("_subject", `30 Day Playbook — ${name} — email to coach`);
  fd.append("_template", "box");
  fd.append("_captcha", "false");
  fd.append("name", name);
  fd.append("email", String(book.who?.email || intake.email || BETA_INBOX));
  fd.append("message", `${summary(intake, book)}\n\nPrintable playbook attached as HTML. Open it → Print → Save as PDF.`);
  fd.append("intake_json", JSON.stringify(packIntake(intake)));
  fd.append(
    "book_check",
    `daily ${book.calories?.daily ?? "—"} rest ${book.calories?.rest_day ?? "—"} train ${book.calories?.train_day_kcal ?? "—"} | ${weekCheckLine(intake)}`,
  );
  fd.append("attachment", file);
  try {
    const res = await fetch(ENDPOINT, { method: "POST", headers: { Accept: "application/json" }, body: fd });
    const raw = await res.text();
    const low = raw.toLowerCase();
    if (low.includes("rate limit")) return "limited";
    if (!res.ok) return "error";
    try {
      const json = JSON.parse(raw) as { success?: boolean };
      if (json.success === false) return low.includes("rate") ? "limited" : "error";
    } catch { /* html confirm page */ }
    return "sent";
  } catch {
    return "error";
  }
}
