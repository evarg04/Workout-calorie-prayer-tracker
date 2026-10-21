// Progressive overload: double progression.
// Work inside a rep range (e.g. 5–8). When every working set reaches the top of the range,
// add weight and drop back to the bottom. Otherwise keep the weight and beat last time by a rep.

import { addDays, dateKey } from "./store.js";

export const e1rm = (weight, reps) => (reps <= 1 ? weight : weight * (1 + reps / 30)); // Epley

const roundTo = (x, step) => Math.round(x / step) * step;

// Sessions for one exercise, newest first: [{ date, sets: [{weight,reps}] }]
export function history(workouts, exId) {
  return Object.entries(workouts)
    .map(([date, w]) => ({ date, sets: (w.sets || []).filter((s) => s.exId === exId && s.reps > 0) }))
    .filter((s) => s.sets.length)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function bestE1rm(sets) {
  return Math.max(...sets.map((s) => e1rm(+s.weight, +s.reps)));
}

// Working sets = the sets done at the session's heaviest weight.
function workingSets(sets) {
  const top = Math.max(...sets.map((s) => +s.weight));
  return { top, sets: sets.filter((s) => +s.weight === top) };
}

export function suggestNext(ex, workouts, beforeDate = dateKey()) {
  const past = history(workouts, ex.id).filter((h) => h.date < beforeDate);
  if (!past.length) {
    return { weight: null, reps: ex.repMin, sets: 3, note: `First time: pick a weight you could do for ${ex.repMax + 2} reps. Do 3 sets of ${ex.repMin}–${ex.repMax}.` };
  }
  const last = workingSets(past[0].sets);
  const reps = last.sets.map((s) => +s.reps);
  const setCount = Math.max(3, last.sets.length);

  if (reps.every((r) => r >= ex.repMax)) {
    const w = last.top + ex.increment;
    return { weight: w, reps: ex.repMin, sets: setCount, note: `You hit ${ex.repMax} on every set last time. Add ${ex.increment} lb → ${w} lb for ${ex.repMin}+ reps.`, kind: "up" };
  }

  // Two sessions in a row under the bottom of the range at the same weight → deload 10%.
  const prev = past[1] && workingSets(past[1].sets);
  const stalled = reps.some((r) => r < ex.repMin) && prev && prev.top === last.top && prev.sets.some((s) => +s.reps < ex.repMin);
  if (stalled) {
    const w = roundTo(last.top * 0.9, ex.kind === "lower" ? 5 : 2.5);
    return { weight: w, reps: ex.repMax, sets: setCount, note: `Stalled twice at ${last.top} lb. Deload to ${w} lb, build back up — this is how you break plateaus.`, kind: "deload" };
  }

  const goal = reps.map((r) => Math.min(ex.repMax, r + 1));
  return { weight: last.top, reps: goal[0], repsPerSet: goal, sets: setCount, note: `Last: ${last.top} lb × ${reps.join(", ")}. Today: beat it — ${last.top} lb × ${goal.join(", ")}.`, kind: "reps" };
}

// Is a given set a personal record (by estimated 1RM or by weight at ≥ those reps)?
export function isPR(workouts, exId, set, date) {
  const prior = history(workouts, exId).filter((h) => h.date < date).flatMap((h) => h.sets);
  if (!prior.length) return false;
  return e1rm(+set.weight, +set.reps) > bestE1rm(prior) + 0.01;
}

// Strength direction per lift over the last ~4 weeks vs the 4 before.
export function strengthSummary(workouts, exercises, today = dateKey()) {
  const mid = addDays(today, -28);
  const start = addDays(today, -56);
  let up = 0, down = 0, total = 0;
  for (const ex of exercises) {
    const h = history(workouts, ex.id);
    const recent = h.filter((s) => s.date > mid).map((s) => bestE1rm(s.sets));
    const before = h.filter((s) => s.date > start && s.date <= mid).map((s) => bestE1rm(s.sets));
    if (!recent.length || !before.length) continue;
    total++;
    const r = Math.max(...recent), b = Math.max(...before);
    if (r >= b * 0.99) up++;
    else down++;
  }
  return total ? { up, down, total } : null;
}
