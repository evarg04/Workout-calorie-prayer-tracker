// Progressive overload: double progression.
// Work inside a rep range (e.g. 5–8). When every working set reaches the top of the range,
// add weight and drop back to the bottom. Otherwise keep the weight and beat last time by a rep.

import { addDays, dateKey } from "./store.js";

export const e1rm = (weight, reps) => (reps <= 1 ? weight : weight * (1 + reps / 30)); // Epley

const roundTo = (x, step) => Math.round(x / step) * step;

// Sessions for one exercise, newest first: [{ date, sets: [{weight,reps}] }]
// `rx` ("8-12") limits it to sessions done in that rep range, so a 5×5 day and an
// 8–12 day on the same lift each progress on their own.
export function history(workouts, exId, rx) {
  const all = Object.entries(workouts)
    .map(([date, w]) => ({ date, sets: (w.sets || []).filter((s) => s.exId === exId && s.reps > 0) }))
    .filter((s) => s.sets.length)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  if (!rx) return all;
  const matching = all
    .map((h) => ({ ...h, sets: h.sets.filter((s) => s.rx === rx) }))
    .filter((h) => h.sets.length);
  return matching.length ? matching : all.filter((h) => h.sets.every((s) => !s.rx));
}

export function bestE1rm(sets) {
  return Math.max(...sets.map((s) => e1rm(+s.weight, +s.reps)));
}

// Working sets = the sets done at the session's heaviest weight.
function workingSets(sets) {
  const top = Math.max(...sets.map((s) => +s.weight));
  return { top, sets: sets.filter((s) => +s.weight === top) };
}

// Working weight for a rep range from an estimated 1RM, leaving ~2 reps in reserve.
export function workingWeight(oneRm, repMin, increment) {
  return roundTo(oneRm / (1 + (repMin + 2) / 30), increment >= 5 ? 5 : 2.5);
}

export function suggestNext(ex, workouts, beforeDate = dateKey(), rx, baseline) {
  const past = history(workouts, ex.id, rx).filter((h) => h.date < beforeDate);
  if (!past.length) {
    const n = ex.sets || 3;
    const range = ex.repMin === ex.repMax ? `${ex.repMin}` : `${ex.repMin}–${ex.repMax}`;
    // New rep range (e.g. after switching programs): carry strength over from any past sessions.
    const earlier = rx ? history(workouts, ex.id).filter((h) => h.date < beforeDate).slice(0, 3) : [];
    if (earlier.length) {
      const best = Math.max(...earlier.map((h) => bestE1rm(h.sets)));
      const w = workingWeight(best, ex.repMin, ex.increment);
      return {
        weight: w, reps: ex.repMin, sets: n, kind: "carry",
        note: `New rep range for you. From your history (est. 1RM ${Math.round(best)} lb), start at ${w} lb × ${range}, leaving about 2 reps in the tank. The app adjusts from there.`,
      };
    }
    // Never logged: start from the max the user entered, if any.
    if (baseline?.e1rm && !history(workouts, ex.id).some((h) => h.date < beforeDate)) {
      const w = workingWeight(baseline.e1rm, ex.repMin, ex.increment);
      const from = baseline.reps > 1 ? `${baseline.weight} × ${baseline.reps}` : `${baseline.weight} max`;
      return {
        weight: w, reps: ex.repMin, sets: n, kind: "carry",
        note: `From your numbers (${from}, est. 1RM ${Math.round(baseline.e1rm)} lb): start at ${w} lb × ${range}, leaving about 2 reps in the tank.`,
      };
    }
    return { weight: null, reps: ex.repMin, sets: n, note: `First time: pick a weight you could do for ${ex.repMax + 2} reps, then ${n} × ${range}.` };
  }
  const last = workingSets(past[0].sets);
  const reps = last.sets.map((s) => +s.reps);
  const setCount = ex.sets || Math.max(3, last.sets.length);

  if (reps.every((r) => r >= ex.repMax)) {
    if (!ex.increment) {
      return { weight: last.top, reps: ex.repMax, sets: setCount, note: `You own ${ex.repMax} reps. Make it harder: add a weight vest or plate, or move to a harder variation.`, kind: "up" };
    }
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

  const goal = Array.from({ length: setCount }, (_, i) => Math.min(ex.repMax, Math.max(ex.repMin, (reps[i] ?? reps[reps.length - 1]) + 1)));
  return { weight: last.top, reps: goal[0], repsPerSet: goal, sets: setCount, note: `Last: ${last.top} lb × ${reps.join(", ")}. Today: beat it — ${last.top} lb × ${goal.join(", ")}.`, kind: "reps" };
}

// Is a given set a personal record (by estimated 1RM or by weight at ≥ those reps)?
// With no logged history yet, the max the user entered is the bar to beat.
export function isPR(workouts, exId, set, date, baseline) {
  const prior = history(workouts, exId).filter((h) => h.date < date).flatMap((h) => h.sets);
  const best = Math.max(prior.length ? bestE1rm(prior) : 0, baseline?.e1rm || 0);
  if (!best) return false;
  return e1rm(+set.weight, +set.reps) > best + 0.01;
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

// ---------- Coach feedback ----------

const COMPOUND = /squat|deadlift|press|row|pull-?up|chin-?up|dip|lunge|thrust/i;
const pct = (a, b) => ((a - b) / b) * 100;

// Feedback for one logged set against the same set last session (same rep range).
export function setFeedback({ ex, set, index, prev, repMin, repMax, totalSets }) {
  const notes = [];
  let level = "good";
  const worse = (l) => { if (l === "warn" || (l === "ok" && level === "good")) level = l; };
  const w = +set.weight, r = +set.reps;

  if (repMax && r > repMax) {
    notes.push(ex.increment ? `${r} reps is above your ${repMin}–${repMax} range: add ${ex.increment} lb on the next set.` : `Above your ${repMin}–${repMax} range: make it harder next set.`);
    worse("ok");
  } else if (repMin && r < repMin) {
    const drop = Math.round((w * 0.9) / 5) * 5;
    notes.push(`Below your ${repMin}–${repMax} range. Rest the full time, or drop to ~${drop} lb so every set counts.`);
    worse("warn");
  }

  const p = prev?.sets?.[index];
  let delta = "", dir = "none";
  if (p) {
    const now = e1rm(w, r), then = e1rm(+p.weight, +p.reps);
    const diff = pct(now, then);
    const plural = (n) => (Math.abs(n) === 1 ? "rep" : "reps");
    const what = w > +p.weight ? `+${w - p.weight} lb` : w < +p.weight ? `−${p.weight - w} lb` : r > +p.reps ? `+${r - p.reps} ${plural(r - p.reps)}` : r < +p.reps ? `−${p.reps - r} ${plural(r - p.reps)}` : "";
    delta = what || "=";
    if (diff > 0.4) { dir = "up"; notes.unshift(`Progressive overload: ${what} vs last time (${p.weight}×${p.reps}).`); }
    else if (diff >= -0.4) { dir = "same"; delta = "="; notes.unshift(`Matched last time (${p.weight}×${p.reps}). Next time beat it by one rep.`); worse("ok"); }
    else { dir = "down"; notes.unshift(`Down vs last time (${p.weight}×${p.reps}). Rest longer between sets; if it happens two sessions running, the app will deload you.`); worse("warn"); }
  } else if (!prev) {
    notes.unshift("Baseline recorded. Next session, beat this set.");
  }

  if (set.rir !== undefined && set.rir !== "") {
    const rir = +set.rir;
    if (rir >= 4) { notes.push(`${rir}+ reps left in the tank is too easy to drive growth. Work sets should end 1–3 reps short of failure. Add weight or reps.`); worse("ok"); }
    else if (rir === 0 && COMPOUND.test(ex.name) && index < totalSets - 1) { notes.push("Failure on an early set of a big lift costs your later sets. Leave 1–2 reps in the tank until the last set."); worse("ok"); }
    else if (rir === 0) notes.push("Taken to failure: fine on a final set, but don't make it a habit on the big lifts.");
    else if (rir <= 3) notes.push(`${rir} rep${rir === 1 ? "" : "s"} in reserve: right in the growth zone.`);
  }
  return { level, notes, delta, dir };
}

const volumeOf = (sets) => sets.reduce((t, s) => t + (+s.weight || 1) * +s.reps, 0);

// Verdict for an exercise today vs its previous session.
export function exerciseVerdict(sets, prev, baseline) {
  if (!sets.length) return null;
  const best = bestE1rm(sets);
  if (!prev && baseline?.e1rm) {
    const vs = Math.round((best / baseline.e1rm) * 100);
    if (best > baseline.e1rm + 0.01) return { kind: "up", text: `New best: est. 1RM ${Math.round(best)} lb beats the ${Math.round(baseline.e1rm)} lb max you entered.` };
    // Hard working sets (a couple of reps in reserve) land around 85–100% of a true 1RM estimate.
    const read = vs >= 85 ? "That's right where hard working sets should be."
      : vs >= 65 ? "A lighter day than your max. Fine for settling in; push a little closer next time."
      : "Much lighter than the max you entered. If that max was on a different machine or variation, that's normal.";
    return { kind: "new", text: `First logged session: est. 1RM ${Math.round(best)} lb, ${vs}% of your ${Math.round(baseline.e1rm)} lb max. ${read} This is your baseline.` };
  }
  if (!prev) return { kind: "new", text: `First session logged: best set ≈ ${Math.round(best)} lb est. 1RM. This is your baseline.` };
  const vol = pct(volumeOf(sets), volumeOf(prev.sets));
  const strength = pct(best, bestE1rm(prev.sets));
  const fmt = (x) => `${x >= 0 ? "+" : ""}${x.toFixed(1)}%`;
  if (strength > 0.4 || (vol > 2 && strength > -0.4)) return { kind: "up", text: `Est. 1RM ${fmt(strength)}, volume ${fmt(vol)} vs last session.` };
  if (strength >= -0.4 && vol >= -2) return { kind: "same", text: `Est. 1RM ${fmt(strength)}, volume ${fmt(vol)}. Add one rep to a set next time.` };
  return { kind: "down", text: `Est. 1RM ${fmt(strength)}, volume ${fmt(vol)} vs last session. Check sleep, food, and rest times. One off day is normal.` };
}
