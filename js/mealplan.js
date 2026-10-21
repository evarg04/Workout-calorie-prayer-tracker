// Daily menu planner: picks a breakfast, lunch, dinner, snack and healthy dessert that
// fit the diet, then scales portions so the day lands on calories and protein.

import { RECIPES, fitsDiet } from "./recipes.js";

export const SLOTS = [
  { id: "breakfast", label: "Breakfast", meal: "Breakfast", range: [0.5, 2] },
  { id: "lunch", label: "Lunch", meal: "Lunch", range: [0.5, 2] },
  { id: "dinner", label: "Dinner", meal: "Dinner", range: [0.5, 2] },
  { id: "snack", label: "Snack", meal: "Snacks", range: [0.5, 1.5] },
  { id: "dessert", label: "Healthy dessert", meal: "Snacks", range: [0.5, 1.5] },
];
const STEPS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

// Deterministic RNG so a day's plan is stable until the user asks for a new one.
function rng(seedText) {
  let h = 2166136261;
  for (const ch of seedText) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

export function recipePool(webRecipes = []) {
  return [...RECIPES, ...webRecipes.map((r) => ({ ...r, flags: new Set(r.flags || []) }))];
}

export function scaled(recipe, mult) {
  const p = recipe.per;
  return { cal: p.cal * mult, p: p.p * mult, c: p.c * mult, f: p.f * mult };
}

function dayTotals(items) {
  return items.reduce((t, { recipe, mult }) => {
    const m = scaled(recipe, mult);
    return { cal: t.cal + m.cal, p: t.p + m.p, c: t.c + m.c, f: t.f + m.f };
  }, { cal: 0, p: 0, c: 0, f: 0 });
}

// Lower is better. Being under on protein hurts more than being over.
function score(t, target) {
  const rel = (have, want) => (have - want) / want;
  const protein = rel(t.p, target.protein);
  return 6 * rel(t.cal, target.calories) ** 2
    + (protein < 0 ? 5 : 0.5) * protein ** 2
    + 1 * rel(t.c, target.carbs) ** 2
    + 1 * rel(t.f, target.fat) ** 2;
}

// Coordinate descent over portion sizes.
function fitPortions(items, target) {
  for (let pass = 0; pass < 4; pass++) {
    let improved = false;
    for (const item of items) {
      const slot = SLOTS.find((s) => s.id === item.slot);
      let best = { mult: item.mult, s: score(dayTotals(items), target) };
      for (const m of STEPS.filter((x) => x >= slot.range[0] && x <= slot.range[1])) {
        item.mult = m;
        const s = score(dayTotals(items), target);
        if (s < best.s - 1e-9) { best = { mult: m, s }; improved = true; }
      }
      item.mult = best.mult;
    }
    if (!improved) break;
  }
  return items;
}

function candidates(pool, slot, diet, meatless) {
  return pool.filter((r) => r.slot === slot && fitsDiet(r, diet, meatless));
}

export function buildPlan({ target, diet, meatless, seed, webRecipes, keep = {} }) {
  const pool = recipePool(webRecipes);
  const rand = rng(seed);
  const options = Object.fromEntries(SLOTS.map((s) => [s.id, candidates(pool, s.id, diet, meatless)]));
  let best = null;
  for (let trial = 0; trial < 80; trial++) {
    const items = [];
    for (const s of SLOTS) {
      const list = options[s.id];
      if (!list.length) continue;
      const kept = keep[s.id] && list.find((r) => r.id === keep[s.id]);
      items.push({ slot: s.id, recipe: kept || list[Math.floor(rand() * list.length)], mult: 1 });
    }
    fitPortions(items, target);
    const s = score(dayTotals(items), target);
    if (!best || s < best.s) best = { s, items };
  }
  return serialize(best?.items || []);
}

// Swap one slot for the best-fitting alternative, keeping the rest of the day.
export function swapSlot({ plan, slotId, target, diet, meatless, webRecipes }) {
  const pool = recipePool(webRecipes);
  const current = hydrate(plan, pool);
  const others = current.filter((i) => i.slot !== slotId);
  const tried = new Set(plan.tried?.[slotId] || []);
  const currentId = current.find((i) => i.slot === slotId)?.recipe.id;
  if (currentId) tried.add(currentId);
  let list = candidates(pool, slotId, diet, meatless).filter((r) => !tried.has(r.id));
  if (!list.length) { tried.clear(); if (currentId) tried.add(currentId); list = candidates(pool, slotId, diet, meatless).filter((r) => r.id !== currentId); }
  if (!list.length) return plan;
  let best = null;
  for (const recipe of list) {
    const items = [...others.map((i) => ({ ...i })), { slot: slotId, recipe, mult: 1 }];
    fitPortions(items, target);
    const s = score(dayTotals(items), target);
    if (!best || s < best.s) best = { s, items, id: recipe.id };
  }
  tried.add(best.id);
  const order = SLOTS.map((s) => s.id);
  best.items.sort((a, b) => order.indexOf(a.slot) - order.indexOf(b.slot));
  return { ...serialize(best.items), tried: { ...plan.tried, [slotId]: [...tried] } };
}

function serialize(items) {
  return { items: items.map((i) => ({ slot: i.slot, recipeId: i.recipe.id, mult: i.mult })) };
}

export function hydrate(plan, pool) {
  return (plan?.items || [])
    .map((i) => ({ ...i, recipe: pool.find((r) => r.id === i.recipeId) }))
    .filter((i) => i.recipe);
}

export function planTotals(items) {
  return dayTotals(items);
}

// Sum ingredients across several days' plans for a grocery list.
export function groceryList(plans, pool) {
  const grams = {};
  const extras = new Set();
  for (const plan of plans) {
    for (const { recipe, mult } of hydrate(plan, pool)) {
      for (const ing of recipe.ingredients || []) {
        if (typeof ing === "string") extras.add(`${ing} (${recipe.name})`);
        else grams[ing.name] = (grams[ing.name] || 0) + ing.g * mult;
      }
    }
  }
  return {
    items: Object.entries(grams).sort((a, b) => a[0].localeCompare(b[0])).map(([name, g]) => ({ name, g: Math.round(g) })),
    extras: [...extras],
  };
}
