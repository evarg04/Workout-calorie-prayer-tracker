// Proven training programs, wired into the progressive-overload engine.
// Each day lists exercises as [name, sets, repMin, repMax, restSeconds, note].

import { addDays } from "./store.js";
import { EXERCISES } from "./exercise-db.js";

// Library metadata for every exercise a program can add: [kind, primary muscle, lb increment].
export const CATALOG = Object.fromEntries(EXERCISES.map((e) => [e.name, [e.kind, e.muscle, e.increment]]));

export const MUSCLES = ["chest", "back", "shoulders", "biceps", "triceps", "quads", "hamstrings", "glutes", "calves", "abs"];

const FST = "FST-7 finisher: 7 sets, 30–45 s rest. Stretch and flex the muscle between sets; sip water.";

export const PROGRAMS = {
  fst7: {
    name: "FST-7 Bodybuilding Split",
    author: "Hany Rambod's Fascia Stretch Training",
    days: 5, level: "Intermediate–advanced", deloadEvery: 6,
    bestFor: "Maximum muscle size and fullness; great for keeping muscle during a cut.",
    about: "FST-7 is the method Hany Rambod used with Mr. Olympia winners including Jay Cutler and Phil Heath. Each body part gets heavy, progressive straight sets (3 × 8–12), then one finisher of 7 sets with short rest for a big pump. No study has tested FST-7 by name, but its volume (10–20 sets per muscle per week) and rep ranges sit right in the range research supports for growth.",
    schedule: "Train days 1–3, rest, days 4–5, rest. Repeat.",
    plan: [
      { name: "Chest & Triceps", ex: [
        ["Incline Barbell Press", 3, 8, 12, 120], ["Flat Dumbbell Press", 3, 8, 12, 120], ["Dips", 3, 8, 12, 90],
        ["Pec Deck Fly", 7, 8, 12, 40, FST], ["Skull Crusher", 3, 8, 12, 90], ["Triceps Rope Pushdown", 7, 8, 12, 40, FST]] },
      { name: "Back & Rear Delts", ex: [
        ["Lat Pulldown", 3, 8, 12, 120], ["Barbell Row", 3, 8, 12, 120], ["Chest-Supported Row", 3, 8, 12, 90],
        ["Straight-Arm Pulldown", 7, 10, 12, 40, FST], ["Rear Delt Fly", 3, 12, 15, 60]] },
      { name: "Legs", ex: [
        ["Back Squat", 4, 8, 10, 150], ["Leg Press", 3, 10, 12, 120], ["Leg Extension", 7, 10, 12, 40, FST],
        ["Romanian Deadlift", 3, 8, 10, 120], ["Lying Leg Curl", 7, 10, 12, 40, FST], ["Standing Calf Raise", 7, 10, 15, 40, FST]] },
      { name: "Shoulders & Abs", ex: [
        ["Seated Dumbbell Shoulder Press", 3, 8, 12, 120], ["Dumbbell Lateral Raise", 3, 12, 15, 60], ["Rear Delt Fly", 3, 12, 15, 60],
        ["Cable Lateral Raise", 7, 10, 12, 40, FST], ["Hanging Leg Raise", 3, 10, 15, 60]] },
      { name: "Arms & Calves", ex: [
        ["Barbell Curl", 3, 8, 12, 90], ["Preacher Curl", 3, 8, 12, 90], ["Cable Curl", 7, 10, 12, 40, FST],
        ["Overhead Cable Triceps Extension", 3, 10, 12, 90], ["Triceps Rope Pushdown", 7, 10, 12, 40, FST], ["Seated Calf Raise", 4, 12, 15, 60]] },
    ],
  },

  ppl: {
    name: "Push / Pull / Legs (6-day)",
    author: "The r/Fitness beginner PPL (Metallicadpa)",
    days: 6, level: "Beginner–intermediate", deloadEvery: 8,
    bestFor: "Fast strength and size gains with a lot of practice on the big lifts.",
    about: "One of the most-used free programs online. Each muscle is trained twice a week (research shows 2× beats 1× for growth). Main lifts use linear progression: when you hit every 5-rep set, add weight next session. Accessories use 8–12 double progression. On the last set of each main lift, do as many good reps as you can.",
    schedule: "Pull, Push, Legs, Pull, Push, Legs, rest.",
    plan: [
      { name: "Pull A (Deadlift)", ex: [
        ["Deadlift", 1, 5, 5, 180, "One heavy set of 5+ (as many good reps as you can)."], ["Lat Pulldown", 3, 8, 12, 90], ["Seated Cable Row", 3, 8, 12, 90],
        ["Face Pull", 5, 15, 20, 60], ["Hammer Curl", 4, 8, 12, 60], ["Dumbbell Curl", 4, 8, 12, 60]] },
      { name: "Push A (Bench)", ex: [
        ["Bench Press", 5, 5, 5, 180, "Last set: as many good reps as you can."], ["Overhead Press", 3, 8, 12, 120], ["Incline Dumbbell Press", 3, 8, 12, 90],
        ["Triceps Rope Pushdown", 3, 8, 12, 60], ["Dumbbell Lateral Raise", 3, 15, 20, 60], ["Overhead Cable Triceps Extension", 3, 8, 12, 60]] },
      { name: "Legs A", ex: [
        ["Back Squat", 3, 5, 5, 180, "Last set: as many good reps as you can."], ["Romanian Deadlift", 3, 8, 12, 120], ["Leg Press", 3, 8, 12, 120],
        ["Lying Leg Curl", 3, 8, 12, 60], ["Standing Calf Raise", 5, 8, 12, 60]] },
      { name: "Pull B (Row)", ex: [
        ["Barbell Row", 5, 5, 5, 150, "Last set: as many good reps as you can."], ["Lat Pulldown", 3, 8, 12, 90], ["Seated Cable Row", 3, 8, 12, 90],
        ["Face Pull", 5, 15, 20, 60], ["Hammer Curl", 4, 8, 12, 60], ["Dumbbell Curl", 4, 8, 12, 60]] },
      { name: "Push B (Overhead Press)", ex: [
        ["Overhead Press", 5, 5, 5, 180, "Last set: as many good reps as you can."], ["Bench Press", 3, 8, 12, 120], ["Incline Dumbbell Press", 3, 8, 12, 90],
        ["Triceps Rope Pushdown", 3, 8, 12, 60], ["Dumbbell Lateral Raise", 3, 15, 20, 60], ["Overhead Cable Triceps Extension", 3, 8, 12, 60]] },
      { name: "Legs B", ex: [
        ["Back Squat", 3, 5, 5, 180, "Last set: as many good reps as you can."], ["Romanian Deadlift", 3, 8, 12, 120], ["Leg Press", 3, 8, 12, 120],
        ["Lying Leg Curl", 3, 8, 12, 60], ["Standing Calf Raise", 5, 8, 12, 60]] },
    ],
  },

  upperLower: {
    name: "Upper / Lower Hypertrophy (4-day)",
    author: "Built on peer-reviewed hypertrophy research (Schoenfeld et al.)",
    days: 4, level: "All levels", deloadEvery: 6,
    bestFor: "Best all-round choice while cutting: strength, size, and recovery in 4 days.",
    about: "Every muscle is trained twice a week (Schoenfeld, Ogborn & Krieger 2016: twice weekly beats once), with 10–20 hard sets per muscle per week (Schoenfeld, Ogborn & Krieger 2017: more weekly sets, more growth, up to a point). Heavy compound lifts at 6–8 reps, then 8–15 rep accessories, every set taken to 1–3 reps short of failure. Lifting volume like this is the strongest signal to keep muscle in a calorie deficit.",
    schedule: "Upper, Lower, rest, Upper, Lower, rest, rest.",
    plan: [
      { name: "Upper A (Strength focus)", ex: [
        ["Bench Press", 4, 6, 8, 180], ["Barbell Row", 4, 6, 8, 150], ["Incline Dumbbell Press", 3, 8, 12, 120],
        ["Lat Pulldown", 3, 8, 12, 90], ["Dumbbell Lateral Raise", 3, 12, 15, 60], ["Triceps Rope Pushdown", 3, 10, 12, 60], ["Barbell Curl", 3, 10, 12, 60]] },
      { name: "Lower A (Squat focus)", ex: [
        ["Back Squat", 4, 6, 8, 180], ["Romanian Deadlift", 3, 8, 10, 150], ["Leg Press", 3, 10, 12, 120],
        ["Lying Leg Curl", 3, 10, 12, 60], ["Standing Calf Raise", 4, 10, 15, 60], ["Hanging Leg Raise", 3, 10, 15, 60]] },
      { name: "Upper B (Press & pull-up focus)", ex: [
        ["Overhead Press", 4, 6, 8, 180], ["Pull-up (added weight)", 4, 6, 10, 150], ["Flat Dumbbell Press", 3, 8, 12, 120],
        ["Seated Cable Row", 3, 10, 12, 90], ["Face Pull", 3, 15, 20, 60], ["Overhead Cable Triceps Extension", 3, 10, 12, 60], ["Hammer Curl", 3, 10, 12, 60]] },
      { name: "Lower B (Deadlift focus)", ex: [
        ["Deadlift", 3, 4, 6, 180], ["Bulgarian Split Squat", 3, 8, 10, 120], ["Hip Thrust", 3, 8, 12, 120],
        ["Leg Extension", 3, 12, 15, 60], ["Seated Leg Curl", 3, 10, 12, 60], ["Seated Calf Raise", 4, 12, 15, 60]] },
    ],
  },

  bbb531: {
    name: "5/3/1 Boring But Big (4-day)",
    author: "Jim Wendler's 5/3/1",
    days: 4, level: "Intermediate", deloadEvery: 0,
    bestFor: "Long-term strength on the big four lifts; used by strength athletes and the military.",
    about: "Your Training Max (TM) is 90% of your 1-rep max. Each lift runs a 4-week wave: 5s week, 3s week, 5/3/1 week, deload week. Then the TM goes up 5 lb (press, bench) or 10 lb (squat, deadlift) and you repeat. The last main set is \"+\": do as many good reps as you can. Then 5 × 10 at 50% TM (Boring But Big). The slow, built-in progression and deloads make it one of the hardest programs to stall on.",
    schedule: "Press, Deadlift, rest, Bench, Squat, rest, rest.",
    plan: [
      { name: "Overhead Press day", ex: [["Overhead Press", "531"], ["Chin-up", 5, 8, 10, 90], ["Dumbbell Lateral Raise", 3, 12, 15, 60]] },
      { name: "Deadlift day", ex: [["Deadlift", "531"], ["Hanging Leg Raise", 5, 10, 15, 60], ["Lying Leg Curl", 3, 10, 12, 60]] },
      { name: "Bench Press day", ex: [["Bench Press", "531"], ["Chest-Supported Row", 5, 10, 12, 90], ["Triceps Rope Pushdown", 3, 10, 12, 60]] },
      { name: "Squat day", ex: [["Back Squat", "531"], ["Lying Leg Curl", 5, 10, 12, 60], ["Standing Calf Raise", 4, 10, 15, 60]] },
    ],
  },

  novice: {
    name: "Novice Linear Progression (3-day)",
    author: "The Starting Strength model (Mark Rippetoe)",
    days: 3, level: "Beginner", deloadEvery: 0,
    bestFor: "New lifters: the fastest strength gains you will ever make.",
    about: "Three full-body sessions a week, alternating A and B. Add weight every single session: 5 lb on press and bench, 10 lb on squat and deadlift. When you miss reps two sessions in a row, the app drops the weight 10% and you build back up. Squatting three times a week makes this the most proven beginner program there is.",
    schedule: "Mon / Wed / Fri, alternating A, B, A… then B, A, B.",
    plan: [
      { name: "Workout A", ex: [["Back Squat", 3, 5, 5, 180], ["Overhead Press", 3, 5, 5, 180], ["Deadlift", 1, 5, 5, 180]] },
      { name: "Workout B", ex: [["Back Squat", 3, 5, 5, 180], ["Bench Press", 3, 5, 5, 180], ["Deadlift", 1, 5, 5, 180]] },
    ],
  },
};

// 5/3/1 waves: [percent of TM, reps, isPlusSet]
const WAVES = [
  [[0.65, 5], [0.75, 5], [0.85, 5, true]],
  [[0.70, 3], [0.80, 3], [0.90, 3, true]],
  [[0.75, 5], [0.85, 3], [0.95, 1, true]],
  [[0.40, 5], [0.50, 5], [0.60, 5]],
];
const WEEK_NAMES = ["5s week", "3s week", "5/3/1 week", "Deload week"];

export const round5 = (x) => Math.max(0, Math.round(x / 5) * 5);

export function sessionsBefore(workouts, programId, key) {
  return Object.entries(workouts).filter(([k, w]) => k < key && w.plan?.programId === programId).length;
}

// Today's prescription for the active program.
export function todaysSession(program, workouts, key, tmFor) {
  const done = sessionsBefore(workouts, program.id, key);
  const def = PROGRAMS[program.id];
  const dayIndex = done % def.plan.length;
  const week = Math.floor(done / def.days);
  const deload = def.deloadEvery > 0 && (week + 1) % def.deloadEvery === 0;
  const day = def.plan[dayIndex];

  const items = day.ex.map(([name, sets, repMin, repMax, rest, note]) => {
    if (sets === "531") {
      const wave = Math.floor(done / def.days) % 4;
      const cycle = Math.floor(done / (def.days * 4));
      const lower = CATALOG[name][0] === "lower";
      const tm = tmFor(name) + cycle * (lower ? 10 : 5);
      const main = WAVES[wave].map(([pct, reps, plus]) => ({ weight: round5(tm * pct), reps, label: `${Math.round(pct * 100)}%${plus ? " · AMRAP" : ""}`, plus }));
      const bbb = wave === 3 ? [] : Array.from({ length: 5 }, () => ({ weight: round5(tm * 0.5), reps: 10, label: "BBB 50%" }));
      return {
        name, scheme: "531", sets: main.length + bbb.length, repMin: 5, repMax: 10, rest: 180,
        detail: [...main, ...bbb],
        note: `${WEEK_NAMES[wave]} · Training Max ${tm} lb. Last main set: as many good reps as you can, then 5 × 10 at 50%.`,
      };
    }
    return {
      name, sets: deload ? Math.max(1, Math.ceil(sets / 2)) : sets, repMin, repMax, rest,
      note: deload ? "Deload week: half the sets, same weight, stop 3+ reps short of failure. You'll come back stronger." : note || "",
    };
  });

  return { programId: program.id, dayIndex, dayName: day.name, week: week + 1, deload, items };
}

// Hard sets per muscle over the 7 days ending on `key`.
export function weeklyVolume(workouts, exercises, key) {
  const from = addDays(key, -6);
  const byId = Object.fromEntries(exercises.map((e) => [e.id, e]));
  const counts = Object.fromEntries(MUSCLES.map((m) => [m, 0]));
  for (const [k, w] of Object.entries(workouts)) {
    if (k < from || k > key) continue;
    for (const s of w.sets || []) {
      const ex = byId[s.exId];
      const muscle = ex?.muscle || CATALOG[ex?.name]?.[1];
      if (muscle && s.reps > 0 && !s.warmup) counts[muscle]++;
    }
  }
  return counts;
}
