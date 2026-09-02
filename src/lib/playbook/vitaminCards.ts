/** 30-day why-cards for printed vitamins. Not a prescription. */

export type VitaminCard = {
  slug: string;
  aliases: string[];
  title: string;
  bullets: string[];
};

export const VITAMIN_CARDS: VitaminCard[] = [
  {
    slug: "adult-multivitamin",
    aliases: ["adult multivitamin", "multi", "multivitamin", "adult multi"],
    title: "Adult multivitamin",
    bullets: [
      "A cut month is short on food volume. A low-dose multi covers the RDA floor so a gap does not sneak in.",
      "ISSN: reasonable when training adults eat less. It is coverage, not a strength drug.",
      "Take with breakfast food. Pause on water-only fast days.",
      "Not a stand-in for protein, sleep, or the sessions.",
    ],
  },
  {
    slug: "vitamin-d",
    aliases: ["vitamin d", "d3", "vit d", "cholecalciferol"],
    title: "Vitamin D",
    bullets: [
      "RDA is 600 IU for most adults (800 IU over 70). Desk months and indoor training often undershoot sun.",
      "We add 1000–2000 IU only when the form does not already list D. Stay under the 4000 IU UL.",
      "Helps the month by covering bone and the immune floor while calories are down.",
      "A blood test beats guessing. We do not treat deficiency from a form.",
    ],
  },
  {
    slug: "magnesium",
    aliases: ["magnesium", "magnesium glycinate", "mg"],
    title: "Magnesium",
    bullets: [
      "Food RDA is 310–420 mg. A multi rarely puts enough in the pill. Sweat plus a cut makes the gap wider.",
      "Glycinate at night, 200–350 mg elemental. Under the 350 mg supplement UL if the stomach complains.",
      "The 30-day job: sleep and a quieter nervous system so the next session is not junk.",
      "Do not stack a second Mg pill on top of a multi plus a lot of dairy without a reason.",
    ],
  },
  {
    slug: "omega-3",
    aliases: ["omega-3", "omega 3", "fish oil", "epa", "dha"],
    title: "Omega-3 (EPA + DHA)",
    bullets: [
      "If fatty fish is not on the week, 1–2 g EPA+DHA covers the gap the cut would miss.",
      "Not a fat-burner. It is the marine fat most people drop when they shrink the plate.",
      "Take with a meal that has fat. Pause on water-only fasts.",
    ],
  },
  {
    slug: "creatine",
    aliases: ["creatine", "creatine monohydrate"],
    title: "Creatine",
    bullets: [
      "ISSN: 3–5 g monohydrate on eating days. Best supported strength extra we will name unprompted.",
      "On a cut it helps keep the lifts honest while food is down.",
      "Water weight in the muscle is normal. That is not fat.",
      "Pause on water-only fast days. Resume the next meal day.",
    ],
  },
  {
    slug: "vitamin-b12",
    aliases: ["b12", "vitamin b12", "cobalamin"],
    title: "Vitamin B12",
    bullets: [
      "Needed if the protein list is vegetarian or light on animal food.",
      "Keeps nerve and blood work on the floor while calories drop.",
      "Food first when they eat meat or eggs daily. We only add when the form says the plate is short.",
    ],
  },
  {
    slug: "iron",
    aliases: ["iron", "ferrous"],
    title: "Iron",
    bullets: [
      "We do not add iron pills to men or post-menopausal women from a form.",
      "Women 19–50 have a higher RDA. Still a clinician call, not a 30-day guess.",
      "Too much iron is a real problem. Food first unless a lab already said otherwise.",
    ],
  },
];

export function vitaminSlug(name: string): string {
  const key = String(name || "").toLowerCase();
  const hit = VITAMIN_CARDS.find((c) => c.aliases.some((a) => key.includes(a)));
  return hit?.slug || key.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function vitaminCardFor(name: string): VitaminCard | undefined {
  const slug = vitaminSlug(name);
  return VITAMIN_CARDS.find((c) => c.slug === slug);
}

export function vitaminUrl(name: string): string {
  return `/vitamins#${vitaminSlug(name)}`;
}
