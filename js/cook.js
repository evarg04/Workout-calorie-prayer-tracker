// "What can I make?": turn the ingredients someone has into the best macro fit for a
// pre-workout snack, post-workout meal, regular meal or snack. Works offline: it checks the
// built-in recipes first, then builds plates from the pantry and solves the portions.
// Macros come from the same USDA table as the recipes, so they're exact for these amounts.

import { ING, RECIPES, DIETS } from "./recipes.js";

export const COOK_TYPES = {
  pre: {
    label: "Pre-workout", when: "60–90 min before training",
    rule: "Carbs to fuel your sets, some protein, and low fat and fiber so it sits easy.",
    slots: ["preworkout", "snack", "breakfast"],
  },
  post: {
    label: "Post-workout", when: "Within a couple of hours after",
    rule: "Protein first (about 0.4 g per kg of body weight) plus carbs to refill your muscles.",
    slots: ["lunch", "dinner", "breakfast", "preworkout"],
  },
  meal: {
    label: "Meal", when: "Breakfast, lunch or dinner",
    rule: "A full plate: a solid protein, carbs for training, vegetables and a little fat.",
    slots: ["breakfast", "lunch", "dinner"],
  },
  snack: {
    label: "Snack", when: "Between meals",
    rule: "Protein-first and small, to keep you full without eating into your day.",
    slots: ["snack", "dessert", "preworkout"],
  },
};

// role: P protein, C carb, V vegetable, F fat, X sauce/sweetener, L liquid
// ctx: s savory, w sweet (an ingredient can be both). [min, max, step] are grams.
// tags: fib = fiber-heavy, fat = fatty, fast = quick carb, fruit, liq = needs a liquid
const META = {
  "chicken breast (raw)": ["P", "s", 100, 250, 10],
  "93% lean ground turkey (raw)": ["P", "s", 100, 250, 10],
  "93% lean ground beef (raw)": ["P", "s", 100, 220, 10],
  "top sirloin, trimmed (raw)": ["P", "s", 100, 250, 10],
  "deli turkey breast": ["P", "s", 56, 170, 14],
  "salmon (raw)": ["P", "s", 100, 200, 10, "fat"],
  "shrimp (raw)": ["P", "s", 100, 250, 10],
  "cod (raw)": ["P", "s", 120, 280, 10],
  "tuna in water (drained)": ["P", "s", 80, 200, 10],
  "eggs": ["P", "s", 50, 200, 50, "fat"],
  "liquid egg whites": ["P", "s", 100, 300, 25],
  "nonfat Greek yogurt": ["P", "w", 150, 350, 25],
  "2% cottage cheese": ["P", "sw", 110, 300, 10],
  "whey protein": ["P", "w", 15, 50, 5, "liq"],
  "pea protein powder": ["P", "w", 15, 50, 5, "liq"],
  "firm tofu": ["P", "s", 150, 300, 25],
  "shelled edamame": ["P", "s", 75, 200, 25, "fib"],
  "part-skim mozzarella": ["F", "s", 15, 40, 5, "fat"],
  "cheddar": ["F", "s", 15, 30, 5, "fat"],
  "feta": ["F", "s", 15, 40, 5, "fat"],
  "parmesan": ["F", "s", 5, 20, 5, "fat"],
  "black beans (cooked)": ["C", "s", 60, 200, 20, "fib"],
  "chickpeas (cooked)": ["C", "s", 60, 200, 20, "fib"],
  "lentils (cooked)": ["C", "s", 100, 250, 25, "fib"],
  "rolled oats": ["C", "w", 30, 100, 5, "liq"],
  "cream of rice (dry)": ["C", "w", 30, 80, 5, "liq fast"],
  "white rice (cooked)": ["C", "s", 75, 300, 25, "fast"],
  "quinoa (cooked)": ["C", "s", 75, 250, 25],
  "whole-wheat pasta (dry)": ["C", "s", 40, 120, 10],
  "whole-grain bread": ["C", "sw", 35, 105, 35],
  "whole-wheat tortilla": ["C", "s", 60, 120, 60],
  "corn tortillas": ["C", "s", 52, 156, 26],
  "rice cakes": ["C", "sw", 9, 45, 9, "fast"],
  "granola": ["C", "w", 20, 60, 5],
  "potato": ["C", "s", 100, 350, 25],
  "sweet potato": ["C", "s", 100, 350, 25],
  "banana": ["C", "w", 60, 180, 60, "fast fruit"],
  "blueberries": ["C", "w", 50, 200, 25, "fruit"],
  "strawberries": ["C", "w", 50, 250, 25, "fruit"],
  "apple": ["C", "w", 90, 180, 90, "fruit"],
  "broccoli": ["V", "s", 80, 200, 20, "fib"],
  "spinach": ["V", "s", 30, 120, 10],
  "mixed greens": ["V", "s", 40, 150, 10],
  "bell pepper": ["V", "s", 50, 150, 25],
  "onion": ["V", "s", 30, 80, 10],
  "tomato": ["V", "s", 50, 150, 25],
  "cucumber": ["V", "s", 50, 150, 25],
  "asparagus": ["V", "s", 80, 200, 20],
  "green beans": ["V", "s", 80, 200, 20],
  "cabbage / coleslaw mix": ["V", "s", 80, 250, 20, "fib"],
  "cauliflower rice": ["V", "s", 100, 250, 25],
  "frozen peas": ["V", "s", 50, 150, 25],
  "avocado": ["F", "s", 30, 100, 10, "fat"],
  "salsa": ["X", "s", 30, 120, 15],
  "marinara sauce": ["X", "s", 60, 150, 15],
  "hummus": ["X", "s", 20, 60, 10, "fat"],
  "peanut butter": ["F", "w", 8, 32, 8, "fat"],
  "powdered peanut butter": ["X", "w", 12, 30, 6],
  "chia seeds": ["F", "w", 10, 30, 5, "fib fat liq"],
  "olive oil": ["F", "s", 5, 15, 5, "fat"],
  "sesame oil": ["F", "s", 3, 10, 1, "fat"],
  "low-sodium soy sauce": ["X", "s", 15, 30, 15],
  "teriyaki sauce": ["X", "s", 15, 40, 5],
  "honey": ["X", "w", 7, 21, 7, "fast"],
  "maple syrup": ["X", "w", 10, 20, 10],
  "dark chocolate (70–85%)": ["F", "w", 10, 25, 5, "fat"],
  "unsweetened cocoa": ["X", "w", 5, 15, 5],
  "unsweetened soy milk": ["L", "w", 200, 300, 50],
  "skim milk": ["L", "w", 200, 300, 50],
  "unsweetened almond milk": ["L", "w", 200, 300, 50],
};
const meta = (name) => {
  const [role, ctx, min, max, step, tags = ""] = META[name];
  return { role, ctx, min, max, step, tags: new Set(tags.split(" ").filter(Boolean)) };
};
// Default amounts for the parts that aren't solved for.
const FIXED = { V: 100, X: 0 };
const SAUCE_G = { "salsa": 60, "marinara sauce": 100, "hummus": 30, "low-sodium soy sauce": 15, "teriyaki sauce": 20, "honey": 7, "maple syrup": 10, "powdered peanut butter": 12, "unsweetened cocoa": 5 };
// Assumed on hand when "I have the basics" is ticked.
const STAPLES = ["olive oil"];

// ---------- reading what someone typed ----------

// First match wins, so specific phrases come before general ones.
const ALIASES = [
  [/egg ?whites?/, "liquid egg whites"], [/\beggs?\b/, "eggs"],
  [/ground turkey|turkey mince/, "93% lean ground turkey (raw)"],
  [/deli|lunch ?meat|sliced turkey|turkey slices|turkey breast slices/, "deli turkey breast"],
  [/\bturkey\b/, "93% lean ground turkey (raw)"],
  [/ground beef|hamburger|beef mince/, "93% lean ground beef (raw)"],
  [/steak|sirloin|\bbeef\b/, "top sirloin, trimmed (raw)"],
  [/chicken/, "chicken breast (raw)"], [/salmon/, "salmon (raw)"], [/shrimp|prawn/, "shrimp (raw)"],
  [/\bcod\b|white ?fish|tilapia/, "cod (raw)"], [/tuna/, "tuna in water (drained)"],
  [/cottage/, "2% cottage cheese"], [/yogh?urt/, "nonfat Greek yogurt"],
  [/pea protein|plant protein|vegan protein/, "pea protein powder"], [/whey|protein powder|protein shake/, "whey protein"],
  [/soy ?milk/, "unsweetened soy milk"], [/almond ?milk/, "unsweetened almond milk"], [/\bmilk\b/, "skim milk"],
  [/mozz/, "part-skim mozzarella"], [/feta/, "feta"], [/parm/, "parmesan"], [/cheddar|cheese/, "cheddar"],
  [/tofu/, "firm tofu"], [/edamame/, "shelled edamame"],
  [/green beans?/, "green beans"], [/chickpea|garbanzo/, "chickpeas (cooked)"], [/lentil/, "lentils (cooked)"],
  [/black beans?|pinto|\bbeans?\b/, "black beans (cooked)"],
  [/cream of rice/, "cream of rice (dry)"], [/rice ?cakes?/, "rice cakes"], [/cauliflower rice|riced cauliflower/, "cauliflower rice"],
  [/\brice\b/, "white rice (cooked)"], [/quinoa/, "quinoa (cooked)"], [/oat/, "rolled oats"], [/granola/, "granola"],
  [/pasta|spaghetti|noodle|penne|macaroni/, "whole-wheat pasta (dry)"],
  [/corn tortilla/, "corn tortillas"], [/tortilla|\bwraps?\b/, "whole-wheat tortilla"], [/bread|toast/, "whole-grain bread"],
  [/sweet potato|\byams?\b/, "sweet potato"], [/potato/, "potato"],
  [/banana/, "banana"], [/blueberr|\bberries\b/, "blueberries"], [/strawberr/, "strawberries"], [/apple/, "apple"],
  [/broccoli/, "broccoli"], [/spinach/, "spinach"], [/lettuce|salad|greens|arugula|romaine|kale/, "mixed greens"],
  [/marinara|pasta sauce|tomato sauce/, "marinara sauce"], [/salsa/, "salsa"],
  [/pepper/, "bell pepper"], [/onion/, "onion"], [/tomato/, "tomato"], [/cucumber/, "cucumber"], [/asparagus/, "asparagus"],
  [/cabbage|slaw/, "cabbage / coleslaw mix"], [/\bpeas\b/, "frozen peas"],
  [/avocado|guac/, "avocado"], [/hummus/, "hummus"],
  [/powdered peanut|pb2|pb powder|peanut powder/, "powdered peanut butter"], [/peanut butter|\bpb\b|nut butter|almond butter/, "peanut butter"],
  [/chia/, "chia seeds"], [/sesame oil/, "sesame oil"], [/\boil\b/, "olive oil"],
  [/teriyaki/, "teriyaki sauce"], [/soy sauce|\bsoy\b|tamari/, "low-sodium soy sauce"],
  [/honey/, "honey"], [/maple|syrup/, "maple syrup"], [/chocolate/, "dark chocolate (70–85%)"], [/cocoa|cacao/, "unsweetened cocoa"],
];
const FILLER = /\b(\d+(\.\d+)?|a|an|some|of|the|few|lb|lbs|pounds?|oz|ounces?|g|grams?|cups?|cans?|bags?|packs?|packets?|scoops?|slices?|pieces?|large|medium|small|fresh|frozen|leftover|cooked|raw)\b/g;

export function parsePantry(text) {
  const have = [], unknown = [];
  for (const raw of String(text || "").toLowerCase().split(/[,;\n]|\band\b|\+/)) {
    const token = raw.replace(FILLER, " ").replace(/\s+/g, " ").trim();
    if (!token) continue;
    const hit = ALIASES.find(([re]) => re.test(token))?.[1] || Object.keys(ING).find((n) => n.toLowerCase() === token);
    if (hit) { if (!have.includes(hit)) have.push(hit); }
    else if (!unknown.includes(raw.trim())) unknown.push(raw.trim());
  }
  return { have, unknown };
}

// Short names for titles and chips: "chicken breast (raw)" → "Chicken Breast".
export function shortName(name) {
  const s = name.replace(/\(.*?\)/g, "").replace(/\b\d+%\s*(lean\s*)?/g, "").replace(/\b(nonfat|unsweetened|liquid|trimmed|shelled|firm|part-skim|whole-grain|whole-wheat|low-sodium|rolled|in water|drained|top)\b/g, "")
    .replace(/,/g, "").split("/")[0].replace(/\s+/g, " ").trim();
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

// ---------- what this meal should hit ----------

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

export function cookTarget({ type, day, eaten, weightLb, losing }) {
  const kg = (weightLb || 180) * 0.453592;
  let p, c, f;
  if (type === "pre") { p = clamp(0.25 * kg, 15, 30); c = clamp(0.6 * kg, 25, 60); f = 6; }
  else if (type === "post") { p = clamp(0.4 * kg, 25, 50); c = clamp((losing ? 0.6 : 0.9) * kg, 30, 90); f = 12; }
  else if (type === "snack") {
    const cal = 0.12 * day.calories;
    p = clamp(0.2 * kg, 15, 25); f = 0.12 * day.fat; c = Math.max(10, (cal - p * 4 - f * 9) / 4);
  } else {
    const cal = 0.3 * day.calories;
    p = clamp(Math.max(0.4 * kg, 0.3 * day.protein), 25, 60); f = 0.3 * day.fat; c = Math.max(20, (cal - p * 4 - f * 9) / 4);
  }
  let note = "";
  const left = day.calories - (eaten?.cal || 0);
  const cal = p * 4 + c * 4 + f * 9;
  if (left <= 100) {
    p *= 0.8; c *= 0.5; f *= 0.5;
    note = "You've reached today's calories, so this is the leanest version: protein first. If you're not hungry, it's fine to skip it.";
  } else if (left < cal) {
    const k = Math.max(left / cal, 0.4);
    p *= Math.max(k, 0.75); c *= k; f *= k;
    note = `Sized to fit the ${Math.round(left).toLocaleString()} kcal you have left today.`;
  }
  return { cal: Math.round(p * 4 + c * 4 + f * 9), p: Math.round(p), c: Math.round(c), f: Math.round(f), note };
}

// ---------- building and scoring options ----------

const sumMacros = (items) => items.reduce((t, { name, g }) => {
  const r = ING[name];
  return { cal: t.cal + (r[0] * g) / 100, p: t.p + (r[1] * g) / 100, c: t.c + (r[2] * g) / 100, f: t.f + (r[3] * g) / 100 };
}, { cal: 0, p: 0, c: 0, f: 0 });

function score(type, m, T, items) {
  const rel = (have, want) => (have - want) / Math.max(want, 1);
  const pr = rel(m.p, T.p);
  const fr = rel(m.f, T.f);
  // Less fat than planned is fine (before training it's better); more is what costs.
  const fatW = fr > 0 ? (type === "pre" ? 3 : 1.5) : (type === "pre" ? 0.05 : 0.4);
  let s = 4 * rel(m.cal, T.cal) ** 2 + (pr < 0 ? 6 : 0.6) * pr ** 2 + 1.5 * rel(m.c, T.c) ** 2 + fatW * fr ** 2;
  const tags = (n) => (META[n] ? meta(n).tags : new Set());
  if (type === "pre") {
    for (const { name, g } of items) {
      if (tags(name).has("fib")) s += 0.25;
      if (tags(name).has("fat") && !(name === "olive oil" && g <= 5)) s += 0.2;
      if (tags(name).has("fast")) s -= 0.08;
    }
  }
  s += 0.02 * items.length;
  return s;
}

const roundTo = (g, step) => Math.round(g / step) * step;

// Solve the amounts of the protein, carb and fat so the dish lands on the target.
function solve(combo, T) {
  const items = combo.map((name) => {
    const m = meta(name);
    const g = m.role === "V" ? FIXED.V : m.role === "X" ? (SAUCE_G[name] || m.min) : m.role === "L" ? (combo.some((n) => /oats|cream of rice|chia/.test(n)) ? 200 : 250) : m.min;
    return { name, g, m };
  });
  const solveFor = (role, macroIdx, key) => {
    const it = items.find((x) => x.m.role === role);
    if (!it) return;
    const others = sumMacros(items.filter((x) => x !== it));
    const per = ING[it.name][macroIdx] / 100;
    if (per <= 0) return;
    it.g = clamp((T[key] - others[key]) / per, role === "F" ? 0 : it.m.min, it.m.max);
  };
  for (let i = 0; i < 4; i++) { solveFor("P", 1, "p"); solveFor("C", 2, "c"); solveFor("F", 3, "f"); }
  const out = [];
  for (const it of items) {
    let g = roundTo(it.g, it.m.step);
    if (it.m.role === "F" && g < it.m.min) continue; // no room for added fat; leave it out
    g = clamp(g, it.m.min, it.m.max);
    out.push({ name: it.name, g });
  }
  return out;
}

function compatible(names) {
  const both = names.map((n) => meta(n).ctx);
  return ["s", "w"].some((c) => both.every((x) => x.includes(c)));
}

function styleOf(names) {
  const has = (re) => names.some((n) => re.test(n));
  if (has(/whey|pea protein/) && !has(/oats|cream of rice|granola|yogurt|cottage|bread|rice cakes/)) return "Shake";
  if (has(/oats/)) return "Oats";
  if (has(/cream of rice/)) return "Bowl";
  if (has(/yogurt|cottage/)) return "Bowl";
  if (has(/corn tortillas/)) return "Tacos";
  if (has(/tortilla/)) return "Wrap";
  if (has(/deli turkey/) && has(/bread/)) return "Sandwich";
  if (has(/bread/)) return "Toast";
  if (has(/rice cakes/)) return "Rice Cakes";
  if (has(/pasta/)) return "Pasta";
  if (has(/rice|quinoa|cauliflower rice/)) return "Bowl";
  return "Plate";
}

function titleFor(items) {
  const names = items.map((x) => x.name);
  const style = styleOf(names);
  const main = items.filter((x) => ["P", "C", "V"].includes(meta(x.name).role) && !(style === "Wrap" && /tortilla/.test(x.name)) && !(style === "Tacos" && /corn tortillas/.test(x.name)) && !(style === "Toast" && /bread/.test(x.name)) && !(style === "Rice Cakes" && /rice cakes/.test(x.name)) && !(style === "Oats" && /oats/.test(x.name)))
    .map((x) => shortName(x.name)).slice(0, 3);
  const list = main.length > 1 ? `${main.slice(0, -1).join(", ")} & ${main[main.length - 1]}` : main[0] || "";
  const suffix = { Toast: "on Toast", "Rice Cakes": "on Rice Cakes" }[style] || style;
  return `${list} ${suffix}`.trim();
}

// ---------- cooking steps for a built plate ----------

const scoops = (g) => { const n = Math.round((g / 30) * 2) / 2; return `${n} scoop${n <= 1 ? "" : "s"}`; };
const tsp = (g) => { const n = Math.max(1, Math.round(g / 4.5)); return `${n} tsp`; };
const tbsp = (g) => { const n = Math.round((g / 16) * 2) / 2; return `${n} tbsp`; };

function stepFor(name, g, liquid, cooking) {
  const sn = shortName(name).toLowerCase();
  switch (name) {
    case "chicken breast (raw)": return `Season the chicken with salt, pepper and garlic powder. Pan-sear in a hot nonstick pan 5–7 min per side, or air-fry at 400°F for 12–16 min, until it reaches 165°F inside. Rest 3 min, then slice.`;
    case "93% lean ground turkey (raw)": return `Brown the turkey in a nonstick pan over medium-high, breaking it up, 6–8 min until cooked through (165°F). Season with salt, pepper, garlic and onion powder.`;
    case "93% lean ground beef (raw)": return `Brown the beef in a nonstick pan over medium-high, breaking it up, 6–8 min until no pink remains (160°F). Season with salt and pepper; drain any fat.`;
    case "top sirloin, trimmed (raw)": return `Pat the steak dry and salt it well. Sear in a very hot pan 3–4 min per side, to at least 145°F, then rest 3–5 min and slice against the grain.`;
    case "salmon (raw)": return `Season the salmon and bake at 400°F for 12–15 min (or pan-sear skin-side down 4–5 min, flip for 2–3 min) until it flakes and reaches 145°F.`;
    case "shrimp (raw)": return `Pat the shrimp dry, season, and sauté in a hot pan 1–2 min per side until pink and opaque.`;
    case "cod (raw)": return `Season the cod and bake at 400°F for 10–12 min until it flakes easily (145°F).`;
    case "tuna in water (drained)": return `Drain the tuna well and flake it with a fork. Season with lemon, pepper and a little salt.`;
    case "deli turkey breast": return `Use ${g} g deli turkey (about ${Math.round(g / 28)} oz) as is.`;
    case "eggs": return `Scramble or fry ${g / 50} egg${g === 50 ? "" : "s"} in a nonstick pan with cooking spray over medium-low, 2–3 min.`;
    case "liquid egg whites": return `Cook the egg whites in a nonstick pan with cooking spray over medium-low, stirring, 2–3 min until just set.`;
    case "firm tofu": return `Press the tofu for 10 min, cut into cubes, season, and pan-fry or air-fry at 400°F for 12–15 min until golden.`;
    case "shelled edamame": return `Microwave or boil the edamame 3–4 min; salt lightly.`;
    case "nonfat Greek yogurt": case "2% cottage cheese": return `Spoon the ${sn} into a bowl.`;
    case "whey protein": case "pea protein powder": return `Mix the protein powder (about ${scoops(g)}) into ${liquid ? `the ${shortName(liquid).toLowerCase()}` : "water"} until smooth.`;
    case "rolled oats": return `Microwave the oats with ${liquid ? `the ${shortName(liquid).toLowerCase()}` : `${Math.round(g * 2.2)} ml water`} for 2–3 min, stirring halfway (or soak overnight in the fridge).`;
    case "cream of rice (dry)": return `Whisk the cream of rice into ${liquid ? `the hot ${shortName(liquid).toLowerCase()}` : "1 cup of boiling water"} and cook 30–60 s, stirring.`;
    case "white rice (cooked)": case "quinoa (cooked)": return `Warm ${g} g cooked ${sn} (measure it cooked; a microwave pouch or leftovers work).`;
    case "whole-wheat pasta (dry)": return `Boil the pasta in salted water 9–11 min, then drain.`;
    case "whole-grain bread": return `Toast ${g / 35} slice${g === 35 ? "" : "s"} of bread.`;
    case "whole-wheat tortilla": case "corn tortillas": return `Warm the tortilla${g > 60 ? "s" : ""} in a dry pan 20–30 s per side.`;
    case "rice cakes": return `Lay out ${g / 9} rice cake${g === 9 ? "" : "s"}.`;
    case "granola": return `Sprinkle the granola on top.`;
    case "potato": case "sweet potato": return `Cube the ${sn} and microwave 5–7 min, or roast at 425°F for 25–30 min, until fork-tender.`;
    case "black beans (cooked)": case "chickpeas (cooked)": case "lentils (cooked)": return `Rinse the ${sn} and warm them 1–2 min in the microwave; season with cumin, salt and pepper.`;
    case "broccoli": case "asparagus": case "green beans": return `Steam or microwave the ${sn} 3–5 min, or roast at 425°F for 12–15 min.`;
    case "spinach": return `Wilt the spinach in the pan for 1 min, or serve it raw.`;
    case "bell pepper": case "onion": return `Slice the ${sn} and sauté 3–4 min until soft.`;
    case "cabbage / coleslaw mix": return `Sauté the cabbage 4–5 min until just tender.`;
    case "cauliflower rice": case "frozen peas": return `Microwave the ${sn} 3–4 min.`;
    case "mixed greens": case "cucumber": case "tomato": return `Chop the ${sn} and add it raw.`;
    case "banana": case "apple": case "strawberries": case "blueberries": return `Wash and slice the ${sn}.`;
    case "olive oil": case "sesame oil": return cooking ? `Use ${tsp(g)} of ${sn} for cooking${name === "sesame oil" ? ", or drizzle it at the end" : ""}.` : `Drizzle ${tsp(g)} of ${sn} over the top.`;
    case "avocado": return `Slice or mash the avocado.`;
    case "peanut butter": return `Spread or stir in ${tbsp(g)} peanut butter.`;
    case "chia seeds": return `Stir in the chia seeds.`;
    case "honey": case "maple syrup": return `Drizzle with ${tsp(g)} ${sn}.`;
    default: return `Add the ${sn}.`;
  }
}

function stepsFor(items, style) {
  const order = { P: 0, C: 1, V: 2, L: 3, F: 4, X: 5 };
  const liquid = items.find((x) => meta(x.name).role === "L")?.name;
  const sorted = [...items].filter((x) => meta(x.name).role !== "L" || !items.some((y) => /whey|pea protein|oats|cream of rice/.test(y.name)))
    .sort((a, b) => order[meta(a.name).role] - order[meta(b.name).role]);
  const cooking = items.some((x) => /raw\)|^eggs$|egg whites|tofu|potato|pasta|broccoli|asparagus|green beans|cabbage|pepper|onion|spinach|cauliflower/.test(x.name));
  const steps = sorted.map((x) => stepFor(x.name, x.g, liquid, cooking));
  const finish = {
    Shake: "Blend or shake everything with a handful of ice.",
    Oats: "Top and eat warm, or refrigerate overnight and eat cold.",
    Bowl: "Add everything to a bowl and stir or layer it together.",
    Tacos: "Fill the tortillas and fold.",
    Wrap: "Fill the tortilla, fold in the sides and roll it up.",
    Sandwich: "Build the sandwich.",
    Toast: "Top the toast and serve.",
    "Rice Cakes": "Top the rice cakes and eat.",
    Pasta: "Toss the pasta with everything else and serve.",
    Plate: "Plate everything together. Season to taste.",
  }[style];
  return [...steps, finish];
}

// ---------- the search ----------

export function suggest({ type, have, staples = true, diet = "everything", meatless = false, target: T }) {
  const banned = (DIETS[diet]?.excludes || "") + (meatless ? "m" : "");
  const allowed = (n) => ING[n] && ![...ING[n][4]].some((fl) => banned.includes(fl));
  const pool = [...new Set([...have, ...(staples ? STAPLES : [])])].filter((n) => META[n]);
  const skipped = have.filter((n) => !allowed(n));
  const usable = pool.filter(allowed);
  const byRole = (r) => usable.filter((n) => meta(n).role === r);
  const results = [];

  // 1. Built-in recipes you can make (missing at most one minor ingredient).
  const cfg = COOK_TYPES[type];
  for (const r of RECIPES.filter((x) => cfg.slots.includes(x.slot))) {
    const names = r.ingredients.map((i) => i.name);
    if (!names.every(allowed)) continue;
    const missing = names.filter((n) => !usable.includes(n));
    if (missing.length > 1 || missing.some((n) => ["P", "C"].includes(meta(n).role))) continue;
    if (names.filter((n) => usable.includes(n)).length < 2) continue;
    let best = null;
    for (const mult of [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]) {
      const items = r.ingredients.map((i) => ({ name: i.name, g: i.g * mult }));
      const m = sumMacros(items);
      const sc = score(type, m, T, items) + (missing.length ? 0.35 : 0) - 0.12;
      if (!best || sc < best.score) best = { score: sc, mult, items, m };
    }
    results.push({
      kind: "recipe", id: r.id, name: r.name, mult: best.mult, items: best.items, macros: best.m, score: best.score,
      missing, steps: r.steps, pantry: r.pantry, prep: r.prep, cook: r.cook, note: r.note, meat: r.flags.has("m"),
    });
  }

  // 2. Plates built from your ingredients.
  const proteins = byRole("P"), carbs = byRole("C"), vegs = byRole("V"), fats = byRole("F"), extras = byRole("X"), liquids = byRole("L");
  const opt = (list) => [null, ...list];
  for (const p of proteins) {
    for (const c of opt(carbs)) {
      for (const v of type === "pre" ? [null] : opt(vegs.slice(0, 4))) {
        for (const f of opt(fats)) {
          for (const x of opt(extras)) {
            const combo = [p, c, v, f, x].filter(Boolean);
            if (!compatible(combo)) continue;
            if (combo.some((n) => meta(n).tags.has("liq")) && liquids.length) combo.push(liquids[0]);
            const items = solve(combo, T);
            const m = sumMacros(items);
            let sc = score(type, m, T, items);
            if ((type === "meal" || type === "post") && vegs.length && !v && meta(p).ctx.includes("s")) sc += 0.15;
            results.push({ kind: "built", name: titleFor(items), items, macros: m, score: sc, missing: [], meat: items.some((i) => ING[i.name][4].includes("m")), style: styleOf(items.map((i) => i.name)) });
          }
        }
      }
    }
  }

  // Best three, each led by a different protein so the choices actually differ.
  results.sort((a, b) => a.score - b.score);
  const picked = [], leads = new Set();
  const cutoff = results.length ? Math.max(1.2, results[0].score + 1) : 0;
  for (const r of results) {
    if (r.score > cutoff) break;
    const lead = r.items.find((i) => META[i.name] && meta(i.name).role === "P")?.name || r.name;
    if (leads.has(lead) || picked.some((x) => x.name === r.name)) continue;
    leads.add(lead);
    if (r.kind === "built") r.steps = stepsFor(r.items, r.style);
    picked.push(r);
    if (picked.length === 3) break;
  }
  return { options: picked, skipped, noProtein: !proteins.length };
}

// Why an option fits, in plain words.
export function whyItFits(type, m, T, weightLb) {
  const kg = (weightLb || 180) * 0.453592;
  const lines = [];
  if (type === "pre") {
    lines.push(`${Math.round(m.c)} g carbs to fuel your sets and ${Math.round(m.p)} g protein.`);
    lines.push(m.f <= 12 ? `Only ${Math.round(m.f)} g fat, so it digests before you train.` : `${Math.round(m.f)} g fat is on the high side before training; eat it closer to 2 hours before.`);
  } else if (type === "post") {
    lines.push(`${Math.round(m.p)} g protein (${(m.p / kg).toFixed(2)} g per kg) to repair and build muscle, plus ${Math.round(m.c)} g carbs to refill.`);
  } else if (type === "snack") {
    lines.push(`${Math.round(m.p)} g protein for ${Math.round(m.cal)} kcal keeps you full without eating into your day.`);
  } else {
    lines.push(`${Math.round(m.p)} g protein, ${Math.round(m.c)} g carbs and ${Math.round(m.f)} g fat: a balanced plate for your goal.`);
  }
  if (m.p < T.p * 0.85) lines.push(`A bit under the ${T.p} g protein target; add more of your protein if you can.`);
  return lines;
}

// An ingredient line with household amounts next to grams: "3 large eggs", "150 g chicken breast (5.3 oz), weighed raw".
export function describe(name, g) {
  const r = Math.round(g);
  const sn = shortName(name).toLowerCase();
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  if (name === "eggs") return plural(r / 50, "large egg", "large eggs");
  if (/whey|pea protein/.test(name)) return `${r} g ${sn} (${scoops(g)})`;
  if (name === "whole-grain bread") return `${plural(r / 35, "slice", "slices")} whole-grain bread`;
  if (name === "whole-wheat tortilla") return plural(r / 60, "large whole-wheat tortilla", "large whole-wheat tortillas");
  if (name === "corn tortillas") return plural(r / 26, "corn tortilla", "corn tortillas");
  if (name === "rice cakes") return plural(r / 9, "rice cake", "rice cakes");
  if (name === "banana") return `${r} g banana (about ${Math.round((g / 118) * 2) / 2} medium)`;
  if (/oil|honey|maple/.test(name)) return `${tsp(g)} ${sn}`;
  if (/peanut butter$/.test(name)) return `${tbsp(g)} ${sn} (${r} g)`;
  if (/raw\)|deli turkey|tuna/.test(name)) return `${r} g ${sn} (${(g / 28.35).toFixed(1)} oz)${/raw\)/.test(name) ? ", weighed raw" : ""}`;
  if (/\(cooked\)/.test(name)) return `${r} g cooked ${sn} (about ${(g / 160).toFixed(1).replace(/\.0$/, "")} cup)`;
  if (/\(dry\)/.test(name)) return `${r} g dry ${sn}`;
  return `${r} g ${sn}`;
}
