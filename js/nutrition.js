// Calorie/macro targets and "am I on pace?" logic for a lean cut that keeps muscle.

import { addDays, dateKey, parseKey } from "./store.js";

export const ACTIVITY_LEVELS = [
  [1.2, "Sedentary (desk job, little walking)"],
  [1.375, "Light (training 1–3 days/week)"],
  [1.55, "Moderate (training 3–5 days/week)"],
  [1.725, "Very active (training 6–7 days/week)"],
  [1.9, "Athlete / physical job + training"],
];

// What the person is training for. Each sets the calorie direction and protein,
// and tells the pace check what "on track" looks like.
export const GOALS = {
  cut: {
    label: "Lose fat, keep muscle", short: "Fat loss",
    expect: "Lose about 0.5–1% of your body weight a week. High protein and heavy lifting protect your muscle while the fat comes off; newer lifters often gain some muscle too.",
  },
  recomp: {
    label: "Recomp: lose fat, build muscle", short: "Recomp",
    expect: "Eat just under maintenance (about 250 kcal) with high protein. The scale moves slowly, 0–0.5 lb a week, while your lifts climb. Works best if you're newer to lifting, coming back from a break, or have more fat to lose. Judge it by strength, your waist and photos, not the scale.",
  },
  bulk: {
    label: "Build muscle (lean bulk)", short: "Lean bulk",
    expect: "A small surplus for slow, steady gain (about 0.25–0.5 lb a week). Going slower keeps fat gain low. Best when you're already fairly lean.",
  },
  maintain: {
    label: "Maintain", short: "Maintain",
    expect: "Eat at maintenance and hold your weight while you keep getting stronger. A good break between a cut and a bulk.",
  },
};

export const RATE_OPTIONS = { cut: [0.5, 0.75, 1, 1.25, 1.5, 2], bulk: [0.25, 0.5] };

// Saved choice, or inferred from goal weight for people who set up before the picker existed.
export function goalMode(profile, w = profile.weightLb) {
  if (GOALS[profile.goal]) return profile.goal;
  return profile.goalWeightLb < w ? "cut" : profile.goalWeightLb > w ? "bulk" : "maintain";
}

// Mifflin–St Jeor BMR, then TDEE × activity, then a deficit or surplus for the chosen goal
// (~500 kcal a day per lb a week). Protein is high (1 g per lb of goal weight) when eating
// below maintenance, because that is what protects muscle; 0.8 g/lb (~1.8 g/kg) otherwise.
// Fat gets a hormone-friendly floor; carbs fill the rest to fuel lifting.
export function computeTargets(profile, currentWeightLb) {
  const w = currentWeightLb || profile.weightLb;
  const kg = w * 0.453592;
  const cm = profile.heightIn * 2.54;
  const bmr = 10 * kg + 6.25 * cm - 5 * profile.age + (profile.sex === "male" ? 5 : -161);
  const tdee = bmr * profile.activity;
  const mode = goalMode(profile, w);

  // Cap the cut at ~1% of bodyweight per week; faster than that costs muscle.
  const maxRate = Math.round(w * 0.01 * 4) / 4;
  const losing = mode === "cut" || mode === "recomp";
  const gaining = mode === "bulk";
  const asked = +profile.rateLbPerWeek || 0.5;
  const rate = mode === "cut" ? Math.min(asked, maxRate)
    : mode === "recomp" ? 0.5
    : gaining ? Math.min(RATE_OPTIONS.bulk.includes(asked) ? asked : 0.5, 0.5) : 0;
  const floor = profile.sex === "male" ? 1500 : 1200;
  let calories = Math.max(floor, tdee + (losing ? -rate : rate) * 500);

  const below = profile.goalWeightLb && profile.goalWeightLb < w;
  const proteinBase = losing && below ? profile.goalWeightLb : w;
  let protein = Math.round(proteinBase * (losing ? 1.0 : 0.8));
  let fat = Math.round(Math.max(proteinBase * 0.3, (calories * 0.25) / 9));
  let carbs = Math.max(50, Math.round((calories - protein * 4 - fat * 9) / 4));
  calories = Math.round(calories / 10) * 10;

  const o = profile.overrides;
  if (o) {
    calories = o.calories || calories;
    protein = o.protein || protein;
    carbs = o.carbs || carbs;
    fat = o.fat || fat;
  }

  return {
    bmr: Math.round(bmr), tdee: Math.round(tdee), calories, protein, carbs, fat,
    rate, maxRate, rateCapped: mode === "cut" && asked > maxRate, losing, gaining, mode,
  };
}

export function totals(entries = []) {
  return entries.reduce(
    (t, e) => ({ cal: t.cal + (+e.cal || 0), p: t.p + (+e.p || 0), c: t.c + (+e.c || 0), f: t.f + (+e.f || 0) }),
    { cal: 0, p: 0, c: 0, f: 0 },
  );
}

// Least-squares slope of weight over time, in lb/week, using the last `days` days.
export function weightTrend(weights, days = 21, today = dateKey()) {
  const start = addDays(today, -days);
  const pts = Object.entries(weights)
    .filter(([k]) => k > start && k <= today)
    .map(([k, v]) => [parseKey(k).getTime() / 86400000, +v])
    .sort((a, b) => a[0] - b[0]);
  if (pts.length < 4 || pts[pts.length - 1][0] - pts[0][0] < 6) return null;
  const n = pts.length;
  const mx = pts.reduce((s, p) => s + p[0], 0) / n;
  const my = pts.reduce((s, p) => s + p[1], 0) / n;
  const num = pts.reduce((s, p) => s + (p[0] - mx) * (p[1] - my), 0);
  const den = pts.reduce((s, p) => s + (p[0] - mx) ** 2, 0);
  const slopePerDay = num / den;
  const lastX = pts[n - 1][0];
  return { perWeek: slopePerDay * 7, current: my + slopePerDay * (lastX - mx), n };
}

export function latestWeight(weights) {
  const keys = Object.keys(weights).sort();
  return keys.length ? +weights[keys[keys.length - 1]] : null;
}

export function movingAverage(weights, window = 7) {
  const keys = Object.keys(weights).sort();
  return keys.map((k) => {
    const from = addDays(k, -(window - 1));
    const vals = keys.filter((j) => j >= from && j <= k).map((j) => +weights[j]);
    return { key: k, y: vals.reduce((a, b) => a + b, 0) / vals.length };
  });
}

// Summarise the last 7 days of logging against targets.
export function weeklyAdherence(foods, target, today = dateKey()) {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const k = addDays(today, -i);
    if (foods[k]?.length) days.push(totals(foods[k]));
  }
  if (!days.length) return null;
  const avg = (key) => days.reduce((s, d) => s + d[key], 0) / days.length;
  const proteinHits = days.filter((d) => d.p >= target.protein * 0.9).length;
  return { logged: days.length, cal: avg("cal"), p: avg("p"), c: avg("c"), f: avg("f"), proteinHits };
}

// The verdict that combines food, scale and strength — the whole point of a recomp-style cut.
export function paceVerdict({ target, trend, adherence, strength, profile }) {
  const msgs = [];
  let level = "good";
  const bump = (l) => {
    const order = { good: 0, warning: 1, serious: 2 };
    if (order[l] > order[level]) level = l;
  };

  if (adherence) {
    const diff = adherence.cal - target.calories;
    if (Math.abs(diff) <= target.calories * 0.07) msgs.push(`Calories averaging ${Math.round(adherence.cal)} — right on target.`);
    else if (diff > 0) { msgs.push(`Calories averaging ${Math.round(diff)} over target this week.`); bump("warning"); }
    else { msgs.push(`Calories averaging ${Math.round(-diff)} under target — don't under-eat, it costs muscle.`); bump("warning"); }
    if (adherence.proteinHits < adherence.logged) {
      msgs.push(`Protein goal hit ${adherence.proteinHits}/${adherence.logged} logged days. Protein is the muscle-keeper — make it non-negotiable.`);
      bump("warning");
    } else msgs.push(`Protein goal hit every logged day.`);
  } else {
    msgs.push("Log your food for a few days to see your weekly pace.");
  }

  const per = trend?.perWeek;
  if (trend && target.mode === "recomp") {
    const pctWk = (-per / trend.current) * 100;
    if (pctWk > 1.1) { msgs.push(`Losing ${(-per).toFixed(1)} lb/week. That's a cut, not a recomp; add ~200 kcal to keep building muscle.`); bump("warning"); }
    else if (per > 0.3) { msgs.push(`Gaining ${per.toFixed(1)} lb/week. For a recomp, trim ~150 kcal so the gain isn't fat.`); bump("warning"); }
    else msgs.push(`Weight ${per < -0.1 ? `down ${(-per).toFixed(1)} lb/week` : "steady"}: right for a recomp. Your strength trend is the real scoreboard.`);
  } else if (trend && target.mode === "bulk") {
    const fast = Math.max(0.75, target.rate * 1.6);
    if (per < 0.1) { msgs.push(`${per < -0.1 ? `Losing ${(-per).toFixed(1)} lb/week.` : "Not gaining yet."} To build muscle, add ~150 kcal.`); bump("warning"); }
    else if (per > fast) { msgs.push(`Gaining ${per.toFixed(1)} lb/week. Faster than muscle can be built, so the extra is mostly fat. Trim ~150 kcal.`); bump("warning"); }
    else msgs.push(`Gaining ${per.toFixed(1)} lb/week: a lean, steady bulk.`);
    const toGo = profile.goalWeightLb - trend.current;
    if (toGo > 0 && per > 0.1) msgs.push(`At this pace you reach ${profile.goalWeightLb} lb around ${new Date(Date.now() + (toGo / per) * 7 * 86400000).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}.`);
  } else if (trend && target.mode === "maintain") {
    if (Math.abs(per) <= 0.3) msgs.push(`Weight steady (${per >= 0 ? "+" : ""}${per.toFixed(1)} lb/week): right where maintenance should be.`);
    else { msgs.push(`Weight ${per > 0 ? "up" : "down"} ${Math.abs(per).toFixed(1)} lb/week. Adjust ~150 kcal ${per > 0 ? "down" : "up"} to hold steady.`); bump("warning"); }
  } else if (trend && target.losing) {
    const lossRate = -trend.perWeek;
    const pct = (lossRate / trend.current) * 100;
    if (lossRate < target.rate * 0.5) { msgs.push(`Losing ${lossRate.toFixed(1)} lb/week — slower than your ${target.rate} lb goal.`); bump("warning"); }
    else if (pct > 1.1) { msgs.push(`Losing ${lossRate.toFixed(1)} lb/week (${pct.toFixed(1)}% of bodyweight) — too fast to keep all your muscle. Add ~200 kcal.`); bump("serious"); }
    else msgs.push(`Losing ${lossRate.toFixed(1)} lb/week — on pace.`);
    const remaining = trend.current - profile.goalWeightLb;
    if (remaining > 0 && lossRate > 0.1) {
      const weeks = remaining / lossRate;
      const eta = new Date(Date.now() + weeks * 7 * 86400000);
      msgs.push(`At this pace you reach ${profile.goalWeightLb} lb around ${eta.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}.`);
    }
  } else if (!trend) {
    msgs.push("Weigh in most mornings (after the restroom, before eating) — the trend needs ~1 week of data.");
  }

  if (strength) {
    if (strength.up >= strength.down) msgs.push(`Strength holding or rising on ${strength.up} of ${strength.total} lifts — you're keeping your muscle.`);
    else { msgs.push(`Strength dropping on ${strength.down} of ${strength.total} lifts. Check sleep, protein, and whether the deficit is too steep.`); bump("serious"); }
  }

  return { level, msgs };
}
