import type { When } from "./types";

export const BRAND = {
  name: "30 Day Fitness Playbook",
  tagline: "Your rules. Your results.",
  mark: "30 Day Fitness Playbook™",
  copyright: "© 2026 30 Day Fitness Playbook. All rights reserved.",
  notice: "The intake, planning rules, and playbook layout are proprietary. Published equations (Mifflin, USDA, ISSN) are not.",
  disclaimer: "Not medical care. A physician should review this before you use it.",
  colors: {
    bg: "#101410",
    card: "#171C28",
    cream: "#F5F7FB",
    muted: "#A8B2C4",
    red: "#C41E3A",
    blue: "#3D6FDB",
    sport: "#7EB0FF",
  },
};

export const CHAPTERS: [string, string, string][] = [
  ["01", "SNAPSHOT", "Who they are this month. Vitamins. Water. The week."],
  ["02", "30 DAYS", "Calendar from the start date weekday. Travel and fasts marked."],
  ["03", "EXERCISE", "The week you built. Minutes you can give."],
  ["04", "ENERGY", "Meals in ounces and cups. Swap foods. Keep the amounts."],
  ["05", "FASTING", "Only if they asked. Off sport and rest when a training day can hold it."],
  ["06", "HOW TO RUN IT", "Session rules, miss days, scale, vitamin timing."],
  ["07", "SOURCES", "Where the numbers come from. Not a journal club."],
];

export const G_PER_OZ_COOKED_MEAT = 7.0;
export const G_PER_EGG = 6.3;
export const G_PER_CUP_GREEK_YOGURT = 23.0;
export const G_PER_CUP_COTTAGE = 25.0;
export const G_PER_CUP_COOKED_OATS = 6.0;
export const G_PER_WHEY_SCOOP = 24.0;
export const LB_PER_KG = 2.2046226218;
export const ML_PER_OZ = 29.5735;

export const PROTEIN_G_PER_KG: Record<string, [number, number]> = {
  maintain: [1.4, 2.0],
  cut: [1.6, 2.2],
  push: [1.6, 2.0],
};
export const PROTEIN_PER_SITTING_G_LOW = 20;
export const PROTEIN_PER_SITTING_G_HIGH = 40;
export const WATER_ML_PER_KG = 32.0;
export const WATER_TRAIN_BONUS_ML = 500.0;
export const WATER_IOM_DRINK_F_ML = 2160.0;
export const WATER_IOM_DRINK_M_ML = 2960.0;
export const CUT_PCT_PER_WEEK_LOW = 0.005;
export const CUT_PCT_PER_WEEK_HIGH = 0.008;
export const STRENGTH_SESSIONS_MIN = 2;
export const SETS_PER_EXERCISE: [number, number] = [2, 3];
export const HARD_SETS_PER_MUSCLE_WEEK_MAINTAIN: [number, number] = [6, 10];
export const HARD_SETS_PER_MUSCLE_WEEK_GROW: [number, number] = [10, 15];

export const MARGINS = {
  protein_g_per_kg: [1.4, 2.2] as [number, number],
  protein_sitting_g: [20, 60] as [number, number],
  water_ml_per_kg: [30, 40] as [number, number],
  cut_pct_week: [0.005, 0.01] as [number, number],
  strength_days_week: [2, 6] as [number, number],
  sets_per_exercise: [2, 3] as [number, number],
  hard_sets_muscle_week: [4, 16] as [number, number],
  vitamin_d_iu_add: [1000, 2000] as [number, number],
  vitamin_d_iu_ul: 4000,
  magnesium_elemental_mg: [200, 350] as [number, number],
  omega3_epa_dha_g: [1.0, 2.0] as [number, number],
  creatine_g: [3, 5] as [number, number],
  calorie_floor_m: 1500,
  calorie_floor_f: 1200,
  deficit_kcal_day_max: 1000,
  push_surplus_kcal: 250,
};

export const ACTIVITY_FACTOR: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very: 1.725,
};
export const KCAL_PER_LB = 3500.0;
export const DAYS_PLAN = 30;
export const KCAL_PER_G_PROTEIN = 4;
export const KCAL_PER_G_CARB = 4;
export const KCAL_PER_G_FAT = 9;
export const FAT_G_PER_LB = 0.35;
export const FIBER_G_PER_1000_KCAL = 14.0;
export const STARCH_CARB_G_PER_CUP = 45.0;
export const EGG_SIT_CAP = 4;
export const VEG_CUPS_PER_MEAL = 1.5;
export const VEG_CUPS_GREENS = 2.0;
export const EATBACK_CUT = 0.5;
export const EATBACK_HOLD = 0.7;
export const EATBACK_PUSH = 0.8;
export const MET_STRENGTH_DEFAULT = 3.5;
export const MET_CARDIO_DEFAULT = 5.0;
export const MET_SPORT_DEFAULT = 6.0;

export const MET_BY_TYPE: Record<string, number> = {
  "full body": 3.5,
  upper: 3.5,
  lower: 5.0,
  push: 3.5,
  pull: 3.5,
  legs: 5.0,
  chest: 3.5,
  back: 3.5,
  shoulders: 3.5,
  arms: 3.5,
  core: 3.0,
  walk: 3.5,
  run: 8.3,
  bike: 6.8,
  row: 5.0,
  swim: 5.8,
  elliptical: 5.0,
  stairs: 9.3,
  hockey: 8.0,
  boxing: 7.8,
  basketball: 6.5,
  soccer: 7.0,
  tennis: 7.3,
  golf: 4.8,
};

export const WEEK_KIND = ["S", "C", "R"] as const;
export const WEEK_MINS = [30, 45, 60, 90] as const;

export const WEEK_WHEN: When[] = ["Morning", "Afternoon", "Evening"];
export const WEEK_TYPE = [
  "Full body",
  "Upper",
  "Lower",
  "Push",
  "Pull",
  "Legs",
  "Chest",
  "Back",
  "Shoulders",
  "Arms",
  "Core",
  "Walk",
  "Run",
  "Bike",
  "Row",
  "Swim",
  "Elliptical",
  "Stairs",
  "Hockey",
  "Boxing",
  "Basketball",
  "Soccer",
  "Tennis",
  "Golf",
  "Other",
] as const;
export const SPORT_DAYS = new Set(["Hockey", "Boxing", "Basketball", "Soccer", "Tennis", "Golf"]);
export const MOVE_BASE = "/moves";
export const MEAL_BUILDER_URL = "/meal";

export const PLAYBOOK_CHROME = {
  moves_url: "/moves",
  meal_url: "/meal",
  exercise_banner: "Tap a lift name. Phone opens the how-to card.",
  exercise_chip: "Tap a lift name. Phone opens the how-to card.",
  exercise_hint: "White names are links. Grey lines are how to do it.",
  meal_title: "BUILD YOUR OWN MEAL",
  meal_blurb: "Pick foods and amounts. See calories, protein, carbs, fat.",
  meal_button: "OPEN MEAL BUILDER",
  meal_label: "Meal builder",
  cover_hint: "Tap a chapter to jump there.",
  nutrition_cite:
    "Plate numbers: USDA FoodData Central, household servings, rounded. fdc.nal.usda.gov",
  format: "Cream headings and lift names. Silver-grey supporting lines. Red and blue are side bars only.",
};

export const PROTEIN_FOODS_G = {
  meat_oz: 7.0,
  eggs: 6.3,
  yogurt_cups: 23.0,
  cottage_cups: 25.0,
  oats_cups: 6.0,
  whey_scoops: 24.0,
};

export type FoodFact = {
  name: string;
  kcal: number;
  p: number;
  c: number;
  f: number;
  unit: string;
  step: number;
  when: string;
};

export const FOOD_FACTS: Record<string, FoodFact> = {
  egg_large: { name: "Large egg", kcal: 72, p: 6.3, c: 0.4, f: 5.0, unit: "egg", step: 1, when: "breakfast lunch" },
  egg_white: { name: "Egg white", kcal: 17, p: 3.6, c: 0.2, f: 0.1, unit: "white", step: 1, when: "breakfast" },
  greek_yogurt_cup: { name: "Nonfat Greek yogurt", kcal: 130, p: 23.0, c: 9.0, f: 0.7, unit: "cup", step: 0.5, when: "breakfast snack" },
  cottage_cup: { name: "1–2% cottage cheese", kcal: 160, p: 25.0, c: 6.0, f: 2.3, unit: "cup", step: 0.5, when: "breakfast snack" },
  whey_scoop: { name: "Whey protein", kcal: 120, p: 24.0, c: 3.0, f: 1.5, unit: "scoop", step: 0.5, when: "breakfast snack" },
  meat_oz: { name: "Chicken or turkey, cooked", kcal: 43, p: 8.7, c: 0.0, f: 1.0, unit: "oz", step: 1, when: "lunch dinner" },
  steak_oz: { name: "Lean steak, cooked", kcal: 55, p: 8.7, c: 0.0, f: 2.3, unit: "oz", step: 1, when: "dinner" },
  pork_oz: { name: "Pork loin, cooked", kcal: 50, p: 8.3, c: 0.0, f: 1.8, unit: "oz", step: 1, when: "lunch dinner" },
  fish_oz: { name: "Fish, cooked", kcal: 40, p: 6.5, c: 0.0, f: 1.5, unit: "oz", step: 1, when: "lunch dinner" },
  shrimp_oz: { name: "Shrimp, cooked", kcal: 28, p: 6.8, c: 0.0, f: 0.3, unit: "oz", step: 1, when: "lunch dinner" },
  tuna_oz: { name: "Tuna, canned in water", kcal: 33, p: 7.3, c: 0.0, f: 0.3, unit: "oz", step: 1, when: "lunch" },
  tofu_oz: { name: "Firm tofu", kcal: 21, p: 2.3, c: 0.5, f: 1.3, unit: "oz", step: 1, when: "breakfast lunch dinner" },
  oats_cup_cooked: { name: "Oats, cooked", kcal: 166, p: 6.0, c: 28.0, f: 3.6, unit: "cup", step: 0.25, when: "breakfast" },
  rice_cup: { name: "Rice, cooked", kcal: 205, p: 4.3, c: 45.0, f: 0.4, unit: "cup", step: 0.25, when: "lunch dinner" },
  pasta_cup: { name: "Pasta, cooked", kcal: 220, p: 8.0, c: 43.0, f: 1.3, unit: "cup", step: 0.25, when: "lunch dinner" },
  potato_med: { name: "Potato, medium", kcal: 160, p: 4.0, c: 37.0, f: 0.2, unit: "potato", step: 0.5, when: "lunch dinner" },
  bread_slice: { name: "Bread slice", kcal: 80, p: 4.0, c: 14.0, f: 1.0, unit: "slice", step: 1, when: "breakfast lunch" },
  fruit_cup: { name: "Fruit", kcal: 80, p: 1.0, c: 20.0, f: 0.3, unit: "cup", step: 0.5, when: "breakfast snack" },
  veg_cup: { name: "Cooked vegetables", kcal: 35, p: 2.5, c: 7.0, f: 0.3, unit: "cup", step: 0.5, when: "lunch dinner breakfast" },
  greens_cup: { name: "Raw greens", kcal: 10, p: 1.0, c: 2.0, f: 0.1, unit: "cup", step: 1, when: "lunch dinner breakfast" },
  beans_cup: { name: "Beans, cooked", kcal: 110, p: 7.5, c: 20.0, f: 0.5, unit: "cup", step: 0.25, when: "lunch dinner" },
  avocado_half: { name: "Avocado, half", kcal: 120, p: 1.5, c: 6.0, f: 11.0, unit: "half", step: 0.5, when: "breakfast lunch" },
  olive_oil_tsp: { name: "Olive oil", kcal: 40, p: 0.0, c: 0.0, f: 4.5, unit: "tsp", step: 1, when: "lunch dinner breakfast" },
  peanut_tbsp: { name: "Peanut butter", kcal: 95, p: 4.0, c: 3.5, f: 8.0, unit: "tbsp", step: 0.5, when: "breakfast snack" },
  turkey_oz: { name: "Turkey, cooked", kcal: 43, p: 8.7, c: 0.0, f: 1.0, unit: "oz", step: 1, when: "lunch dinner" },
  broccoli_cup: { name: "Broccoli, cooked", kcal: 55, p: 3.7, c: 11.0, f: 0.6, unit: "cup", step: 0.5, when: "lunch dinner" },
  banana: { name: "Banana, medium", kcal: 105, p: 1.3, c: 27.0, f: 0.4, unit: "banana", step: 0.5, when: "breakfast snack" },
  milk_cup: { name: "Milk, 1%", kcal: 100, p: 8.0, c: 12.0, f: 2.4, unit: "cup", step: 0.5, when: "breakfast snack" },
  cheddar_oz: { name: "Cheddar", kcal: 110, p: 7.0, c: 0.4, f: 9.0, unit: "oz", step: 0.5, when: "breakfast snack lunch" },
};

export const MEAL_SLOTS: Record<number, string[]> = {
  2: ["Breakfast", "Dinner"],
  3: ["Breakfast", "Lunch", "Dinner"],
  4: ["Breakfast", "Lunch", "Snack", "Dinner"],
  5: ["Breakfast", "Morning snack", "Lunch", "Afternoon snack", "Dinner"],
  6: ["Breakfast", "Morning snack", "Lunch", "Afternoon snack", "Dinner", "Evening snack"],
};

export const PROTEIN_BANK: Record<string, string[]> = {
  chicken: ["Grilled chicken breast", "Baked chicken thighs", "Rotisserie chicken"],
  steak: ["Sirloin", "Flank steak", "Lean ground beef"],
  turkey: ["Turkey breast", "Ground turkey", "Sliced turkey"],
  pork: ["Pork tenderloin", "Center-cut pork chop"],
  fish: ["Salmon", "Cod", "Tilapia"],
  shrimp: ["Garlic shrimp", "Grilled shrimp"],
  eggs: ["Eggs", "Egg-white scramble"],
  veg: ["Whey shake", "Greek yogurt", "Cottage cheese", "Tofu", "Black beans"],
};

export const STARCH_BANK: Record<string, string[]> = {
  rice: ["White rice", "Brown rice", "Rice bowl"],
  potato: ["Baked potato", "Roasted potatoes"],
  pasta: ["Pasta", "Noodle bowl"],
  bread: ["Toast", "Wrap"],
  oats: ["Oats", "Overnight oats"],
};

export const VEG_BANK: Record<string, string[]> = {
  greens: ["Spinach", "Mixed greens"],
  broccoli: ["Broccoli", "Roasted broccoli"],
  beans: ["Green beans", "Black beans"],
  mixed: ["Mixed vegetables", "Peppers and onions"],
};

export const BREAKFAST_BANK: Record<string, string> = {
  eggs: "Eggs + starch + fruit",
  oats: "Oats + protein add-on + fruit",
  yogurt: "Greek yogurt + fruit + optional whey",
  shake: "Whey shake + fruit",
};

export const HURT_DROPS: Record<string, string[]> = {
  knee: ["barbell squat", "walking lunge", "jump"],
  shoulder: ["barbell bench", "overhead press", "dip"],
  back: ["barbell deadlift", "good morning", "bent-over barbell row"],
  hip: ["barbell squat", "lunge"],
  wrist: ["barbell bench", "barbell row"],
};

export const STRENGTH_MENUS: Record<string, [string, string, string][]> = {
  "full body": [
    ["Squat pattern", "8", "Goblet if no bar"],
    ["Hinge", "8", "RDL or hip hinge"],
    ["Press", "8", "Push-up or bench"],
    ["Row", "8", "Chest-supported if back hurts"],
    ["Carry or core", "8", "Stop short of failure"],
  ],
  upper: [
    ["Horizontal press", "8", "Bench or push-up"],
    ["Row", "8", "Pause 1 sec"],
    ["Vertical press", "8", "Skip if shoulder listed"],
    ["Pulldown or pull-up", "8", "Leave 1–2 reps"],
    ["Arm or carry", "10", "Optional if minutes are short"],
  ],
  lower: [
    ["Squat pattern", "8", "Box squat if knees"],
    ["Hinge", "8", "RDL"],
    ["Single-leg", "8/side", "Split squat"],
    ["Hamstring", "10", "Curl or slider"],
    ["Calf or carry", "10", "Skip if minutes are short"],
  ],
  push: [
    ["Main press", "6–8", "Heavier"],
    ["Second press", "8–10", "Incline or push-up"],
    ["Shoulder", "10", "Leave 2 reps"],
    ["Triceps", "10", "Not to failure"],
  ],
  pull: [
    ["Vertical pull", "8", "Pull-up or pulldown"],
    ["Row", "8", "Pause"],
    ["Rear shoulder", "12", "Light"],
    ["Biceps or carry", "10", "Optional"],
  ],
  legs: [
    ["Squat pattern", "8", "Compounds first"],
    ["Hinge", "8", "RDL"],
    ["Single-leg", "8/side", "Split squat"],
    ["Hamstring", "10", "Curl"],
  ],
  chest: [
    ["Main press", "6–8", "Heavier"],
    ["Incline or fly", "10", "Leave 2 reps"],
    ["Push-up or dip", "8", "Stop short"],
  ],
  back: [
    ["Vertical pull", "8", "Pull-up or pulldown"],
    ["Row", "8", "Pause"],
    ["Rear shoulder", "12", "Light"],
  ],
  shoulders: [
    ["Press", "8", "Skip if shoulder listed"],
    ["Lateral", "12", "Light"],
    ["Rear delt", "12", "Light"],
  ],
  arms: [
    ["Biceps", "10", "Leave 2 reps"],
    ["Triceps", "10", "Leave 2 reps"],
    ["Carry", "40 yd", "Optional"],
  ],
  core: [
    ["Anti-extension", "8", "Dead bug or roll-out"],
    ["Anti-rotation", "8/side", "Pallof"],
    ["Carry", "40 yd", "Suitcase"],
  ],
};

export const HOW_TO: Record<string, string> = {
  "Squat pattern": "Sit between the hips. Knees track toes. Stand up like you mean it.",
  Hinge: "Push the hips back. Shin quiet. Bar close. Stand tall, do not yank.",
  Press: "Ribs down. Elbows about 45. Lower with control. Press, do not bounce.",
  Row: "Chest proud. Pull to the hip. Pause one second. Lower slower than you want.",
  "Carry or core": "Walk like you are sneaking past a sleeping baby with groceries.",
  "Horizontal press": "Shoulder blades parked. Touch the chest. Press the floor away.",
  "Vertical press": "Bicep by the ear at the top. If it pinches, skip it.",
  "Pulldown or pull-up": "Elbows to the pockets. Chin over. Not a kip contest.",
  "Arm or carry": "Leave two reps. Arms are accessories.",
  "Single-leg": "Front heel owns it. Back knee kisses the floor and leaves.",
  Hamstring: "Hips stay put. Curl with the heels.",
  "Calf or carry": "Full down, full up. No bounce.",
  "Main press": "First lift. Heavy-ish. Leave two in the tank.",
  "Second press": "Same rules, lighter. Change the angle, not the ego.",
  Shoulder: "Soft elbows. Raise to eye height.",
  Triceps: "Elbows quiet. Stretch, squeeze, go home.",
  "Vertical pull": "Long arms at the bottom. Chest to the handle.",
  "Rear shoulder": "Tiny weights. Think coat-hanger.",
  "Biceps or carry": "Elbows glued. Do not swing a fishing rod.",
  "Incline or fly": "Soft elbows. Feel the chest, not the joint.",
  "Push-up or dip": "Body one board. Dips stop at the pinch.",
  Lateral: "Pour the pitcher. The dumbbell is not a helicopter.",
  "Rear delt": "Pinkies lead. Tiny range is still a set.",
  Biceps: "Lower for three seconds. That is the set.",
  "Anti-extension": "Ribs down. If it arches, you found the joke.",
  "Anti-rotation": "The cable tries to spin you. It loses.",
  Carry: "Tall. Quiet feet. Do not lean like a plant.",
};

export const CARDIO_MENUS: Record<string, string> = {
  walk: "Easy walk. Nose breathing. No bonus hills unless they asked.",
  run: "Easy run unless they named a race. Last 2 days before a race: taper, do not peak a workout they did not ask for.",
  bike: "Steady bike. Stay conversational.",
  row: "Steady row. 2 min easy / 1 min a bit quicker if minutes allow.",
  swim: "See swim_where. Pool: wall intervals. Lake: continuous swimming and sighting. No wall.",
  elliptical: "Steady. Same minutes as the form.",
  stairs: "Steady climbs. Stop if knees are on the hurt list.",
};

export const STARCH_OZ_PER_CUP: Record<string, number> = {
  rice: 6.2,
  potato: 5.5,
  pasta: 5.0,
  noodle: 5.0,
  bread: 2.0,
  toast: 2.0,
  wrap: 2.5,
  oat: 8.0,
};

export const VEG_OZ_PER_CUP: Record<string, number> = {
  spinach: 1.1,
  green: 1.1,
  lettuce: 1.0,
  broccoli: 3.3,
  bean: 3.2,
  pepper: 3.2,
  mixed: 3.5,
  onion: 3.2,
};


export const FASTING_LENGTHS: { hours: 24 | 36 | 48; title: string; bullets: string[] }[] = [
  {
    hours: 24,
    title: "24 hours",
    bullets: [
      "Liver glycogen is mostly gone by about 18–24 hours. Fat and early ketones pick up the slack.",
      "Ketones (BHB) start to show. The brain can use them. That is quiet energy, not a sugar spike.",
      "Good practice fast. Not the deep-repair window.",
      "Autophagy in humans is not a light switch at hour 24. Animal work shows it rising in this range; we do not promise a cleanup clock.",
    ],
  },
  {
    hours: 36,
    title: "36 hours",
    bullets: [
      "Ketones are steadier. Fat is the main fuel for most of the day.",
      "Bigger calorie gap than 24, so it helps the 30-day fat-loss number more.",
      "Still not the peak ketone day. Blood ketones in humans usually keep climbing toward 48.",
      "Keep it off sport. Break with protein + salt, not a giant first meal.",
    ],
  },
  {
    hours: 48,
    title: "48 hours",
    bullets: [
      "Ketones are in the range most papers call meaningful (about 1–2 mmol/L in humans by about 48 hours). Brain and muscle can run on that.",
      "This is where cell-repair talk belongs — with a limit: autophagy is proven biology. The exact human hour is not settled.",
      "Longer fast + low insulin is the signal, not a magic Tuesday.",
      "Protein sparing starts to improve as ketones cover more of the brain's need.",
      "Two of these in 30 days is the cap we print.",
    ],
  },
];

export const FASTING_KEY: [string, string][] = [
  [
    "24 hours",
    "Liver glycogen is mostly used. Fat burning rises and ketones start late in the window. A real assist to the month's cut with the smallest lean-mass cost of the three.",
  ],
  [
    "36 hours",
    "Ketones are steadier. Fat is the main fuel for most of the day. Bigger calorie gap than 24, so it helps the 30-day fat-loss number more. Keep it off sport days.",
  ],
  [
    "48 hours",
    "Deeper ketosis. Fat and ketones carry almost all of the work. Largest calorie hole of the three — that can move the scale if the week around it stays honest. Water and salt stay on. Not a first fast.",
  ],
];

export const SOURCES: [string, string, string[]][] = [
  [
    "Fasting",
    "Glycogen ~12–24 h. Ketones rise ~18–24 h and about 1–2 mmol/L by ~48 h in humans. Autophagy is real; the human hour is not a clock.",
    [
      "Anton et al. Flipping the metabolic switch. Obesity. 2018.",
      "de Cabo & Mattson. Effects of intermittent fasting on health, aging, and disease. NEJM. 2019.",
      "Cahill GF. Starvation in man. N Engl J Med. 1970;282:668–675.",
      "Rothman DL et al. Liver glycogen largely gone by about 24 hours. J Clin Invest. 1991.",
      "Browning JD et al. 48-hour fast: ketones much higher at 48 h than 24 h. J Lipid Res. 2012.",
    ],
  ],
  [
    "Protein",
    "1.6–2.2 g/kg when they lift and cut. 20–40 g per sitting.",
    [
      "Jäger et al. ISSN position stand: protein and exercise. J Int Soc Sports Nutr. 2017.",
      "Helms, Aragon, Fitschen. Evidence-based recommendations for natural bodybuilding contest preparation. JISSN. 2014.",
      "Meal count does not burn extra fat. ISSN meal-frequency position stand. 2011.",
    ],
  ],
  [
    "Water",
    "Drink target 32 ml/kg plus 500 ml on a training day. Printed as jug fills.",
    [
      "National Academies. Dietary Reference Intakes for Water, Potassium, Sodium, Chloride, and Sulfate. 2005.",
      "Adequate intake: 3.7 L/day men and 2.7 L/day women, food included. We print the drinking slice.",
    ],
  ],
  [
    "Fat loss",
    "Honest 30-day cut is 0.5–0.8% of bodyweight per week if they want to keep the lifts.",
    [
      "Garthe et al. Effect of two different weight-loss rates on body composition and strength. Int J Sport Nutr Exerc Metab. 2011.",
      "Faster than about 1%/week costs more lean mass. The opening note uses this range, not a wish.",
    ],
  ],
  [
    "Calories",
    "Mifflin-St Jeor × activity = maintain. Deficit from the honest 30-day cut, not the wish.",
    [
      "Mifflin et al. A new predictive equation for resting energy expenditure. Am J Clin Nutr. 1990;51:241–247.",
      "Activity factors: sedentary 1.2, light 1.375, moderate 1.55, very active 1.725.",
      "Planning deficit uses 3500 kcal per lb (Wishnofsky 1958). Hall et al. Lancet 2011: that overestimates long-term loss. We only use it for a 30-day sketch.",
      "ACSM weight-loss guidance: 500–1000 kcal/day deficit. We cap at 1000. Floor 1500 kcal men / 1200 women unless a clinician set lower.",
      "Session burn: kcal = MET × kg × hours (Ainsworth 2011; Herrmann 2024 Adult Compendium). Net = (MET − 1) × kg × hours so BMR is not counted twice.",
      "Eat-back is 50% on a cut, 70% maintain, 80% push. Do not eat 100% of a watch. Compensation and overestimation wipe the deficit.",
      "IOM 2005: dietary fiber adequate intake about 14 g per 1000 kcal. We print that as a veg-pile cue, not a separate diet.",
      "Plate facts: USDA FoodData Central household servings, rounded. Breakfast uses eggs/dairy/oats/whey. Steak and chicken are lunch and dinner.",
    ],
  ],
  [
    "Training",
    "At least 2 strength days/week. 2–3 sets. Compounds first. Cap the session to that day's minutes.",
    [
      "Currier et al. ACSM position stand: resistance training prescription for healthy adults. Med Sci Sports Exerc. 2026;58(4):851–872. First refresh in 17 years. 137 reviews.",
      "Any resistance work beats none. Hypertrophy likes ≥10 hard sets per muscle per week. Strength: 2–3 sets, ≥2 sessions, stop 2–3 reps short of failure. Participation beats perfect programming.",
      "ISSN 2025 omega-3 position stand: athletes often run low on EPA+DHA. We still add fish oil only when fatty fish is not on the form.",
    ],
  ],
  [
    "Vitamins",
    "Sex and age RDA from NASEM. Program floor if they listed nothing: multi + D3 + magnesium.",
    [
      "National Academies DRI tables. NIH Office of Dietary Supplements fact sheets. Vitamin D RDA 600 IU (800 IU over 70). UL 4000 IU.",
      "FDA Daily Values on the adult Supplement Facts label.",
      "Kreider et al. ISSN exercise & sport nutrition review. JISSN. 2010 / updates. A low-dose daily multi is coverage, not an ergogenic.",
      "Kreider et al. ISSN position stand: safety and efficacy of creatine. JISSN. 2017. 5 g/day eating days.",
    ],
  ],
  [
    "Plates and meal builder",
    "Every printed plate and the live meal builder use the same household-unit database.",
    [
      "USDA FoodData Central. https://fdc.nal.usda.gov  Household measures, rounded to the serving we print (1 large egg, 1 cup cooked oats, 1 oz cooked meat).",
      "U.S. Department of Agriculture, Agricultural Research Service. FoodData Central. 2019–.",
      "Builder totals: kcal / protein / carbs / fat = amount × those rounded values. Custom foods use the numbers the client types.",
      "Fiber cue: IOM 2005, about 14 g per 1000 kcal. Not a separate diet.",
    ],
  ],
  [
    "How to read this",
    "These papers set the numbers. They do not make this medical care.",
    [
      "A physician should review the training, food, and vitamins before they run the month.",
      "Medications stay as written. We do not diagnose deficiency from a form.",
      "If a later paper beats one of these, the next playbook version changes. This copy uses the list above.",
    ],
  ],
];

export const EVIDENCE_PASS = "2026-09-02";

type RdaRow = Record<string, number>;
export const RDA: Record<string, Record<"M" | "F", RdaRow>> = {
  "19_50": {
    M: {
      vitamin_a_mcg: 900,
      vitamin_c_mg: 90,
      vitamin_d_mcg: 15,
      vitamin_d_iu: 600,
      vitamin_e_mg: 15,
      vitamin_k_mcg: 120,
      thiamin_mg: 1.2,
      riboflavin_mg: 1.3,
      niacin_mg: 16,
      vitamin_b6_mg: 1.3,
      folate_mcg: 400,
      vitamin_b12_mcg: 2.4,
      pantothenic_mg: 5,
      biotin_mcg: 30,
      choline_mg: 550,
      calcium_mg: 1000,
      iron_mg: 8,
      magnesium_mg: 400,
      zinc_mg: 11,
      selenium_mcg: 55,
      potassium_mg: 3400,
      iodine_mcg: 150,
      copper_mcg: 900,
      phosphorus_mg: 700,
    },
    F: {
      vitamin_a_mcg: 700,
      vitamin_c_mg: 75,
      vitamin_d_mcg: 15,
      vitamin_d_iu: 600,
      vitamin_e_mg: 15,
      vitamin_k_mcg: 90,
      thiamin_mg: 1.1,
      riboflavin_mg: 1.1,
      niacin_mg: 14,
      vitamin_b6_mg: 1.3,
      folate_mcg: 400,
      vitamin_b12_mcg: 2.4,
      pantothenic_mg: 5,
      biotin_mcg: 30,
      choline_mg: 425,
      calcium_mg: 1000,
      iron_mg: 18,
      magnesium_mg: 310,
      zinc_mg: 8,
      selenium_mcg: 55,
      potassium_mg: 2600,
      iodine_mcg: 150,
      copper_mcg: 900,
      phosphorus_mg: 700,
    },
  },
  "51_70": {
    M: {
      vitamin_a_mcg: 900,
      vitamin_c_mg: 90,
      vitamin_d_mcg: 15,
      vitamin_d_iu: 600,
      vitamin_e_mg: 15,
      vitamin_k_mcg: 120,
      thiamin_mg: 1.2,
      riboflavin_mg: 1.3,
      niacin_mg: 16,
      vitamin_b6_mg: 1.7,
      folate_mcg: 400,
      vitamin_b12_mcg: 2.4,
      pantothenic_mg: 5,
      biotin_mcg: 30,
      choline_mg: 550,
      calcium_mg: 1000,
      iron_mg: 8,
      magnesium_mg: 420,
      zinc_mg: 11,
      selenium_mcg: 55,
      potassium_mg: 3400,
      iodine_mcg: 150,
      copper_mcg: 900,
      phosphorus_mg: 700,
    },
    F: {
      vitamin_a_mcg: 700,
      vitamin_c_mg: 75,
      vitamin_d_mcg: 15,
      vitamin_d_iu: 600,
      vitamin_e_mg: 15,
      vitamin_k_mcg: 90,
      thiamin_mg: 1.1,
      riboflavin_mg: 1.1,
      niacin_mg: 14,
      vitamin_b6_mg: 1.5,
      folate_mcg: 400,
      vitamin_b12_mcg: 2.4,
      pantothenic_mg: 5,
      biotin_mcg: 30,
      choline_mg: 425,
      calcium_mg: 1200,
      iron_mg: 8,
      magnesium_mg: 320,
      zinc_mg: 8,
      selenium_mcg: 55,
      potassium_mg: 2600,
      iodine_mcg: 150,
      copper_mcg: 900,
      phosphorus_mg: 700,
    },
  },
};

export const RDA_71_PLUS = {
  vitamin_d_mcg: 20,
  vitamin_d_iu: 800,
  calcium_mg: 1200,
};

export const PROGRAM_DOSE = {
  multi: "1 daily adult multivitamin / mineral with food (aim ~100% DV, not a mega pack)",
  vitamin_d3: "1000–2000 IU vitamin D3 with a meal that has fat",
  magnesium_glycinate:
    "200–350 mg elemental magnesium as glycinate at night. Start at 200. Do not exceed the 350 mg supplement UL.",
  omega3: "1–2 g combined EPA+DHA (fish oil or algae oil) with a meal",
  creatine: "5 g creatine monohydrate every eating day. No loading phase.",
  b12: "250–500 mcg methylcobalamin or cyanocobalamin daily",
  iron_note: "Do not add iron pills unless a clinician already prescribed them.",
  calcium_note:
    "Prefer food (dairy, fortified alt-milk, canned fish with bones). Do not stack calcium pills on top of a multi plus dairy.",
};

export const MULTI_WORDS = [
  "multi",
  "multivitamin",
  "multi-vitamin",
  "vitamin pack",
  "pak",
  "animal pak",
  "opti-men",
  "optimen",
  "opti-women",
  "centrum",
  "one a day",
  "one-a-day",
  "ritual",
  "athletic greens",
  "ag1",
  "greens",
  "mens multi",
  "womens multi",
  "women's multi",
] as const;
export const D_WORDS = ["vitamin d", "vit d", "d3", "d-3", "cholecalciferol"] as const;
export const MG_WORDS = ["magnesium", "mag glycinate", "mag threonate", "mag citrate"] as const;
export const OMEGA_WORDS = ["fish oil", "omega", "omega-3", "omega 3", "epa", "dha", "krill", "algae oil"] as const;
export const CREATINE_WORDS = ["creatine"] as const;
export const B12_WORDS = ["b12", "b-12", "cobalamin", "methylcobalamin"] as const;
export const IRON_WORDS = ["iron", "ferrous", "ferritin"] as const;
