// Local-first persistence. Everything lives in this browser's localStorage;
// use Export/Import on the Me tab to back up or move to another device.

const KEY = "ddc-state-v1";

const DEFAULT_EXERCISES = [
  ["Back Squat", "lower", 5, 8, 10],
  ["Bench Press", "upper", 5, 8, 5],
  ["Deadlift", "lower", 3, 6, 10],
  ["Overhead Press", "upper", 5, 8, 5],
  ["Barbell Row", "upper", 6, 10, 5],
  ["Romanian Deadlift", "lower", 8, 12, 10],
  ["Incline Dumbbell Press", "upper", 8, 12, 5],
  ["Pull-up (added weight)", "upper", 6, 10, 5],
  ["Lat Pulldown", "upper", 8, 12, 5],
  ["Leg Press", "lower", 10, 15, 20],
  ["Dumbbell Lateral Raise", "upper", 12, 15, 2.5],
  ["Barbell Curl", "upper", 8, 12, 5],
].map(([name, kind, repMin, repMax, increment], i) => ({
  id: "ex" + (i + 1), name, kind, repMin, repMax, increment,
}));

function defaults() {
  return {
    profile: {
      sex: "male", age: 30, heightIn: 70, weightLb: 200, goalWeightLb: 180,
      activity: 1.55, rateLbPerWeek: 1, overrides: null,
    },
    foods: {},        // { "YYYY-MM-DD": [{ id, name, cal, p, c, f, meal, meat }] }
    savedFoods: [],   // [{ name, cal, p, c, f }]
    weights: {},      // { "YYYY-MM-DD": lb }
    exercises: DEFAULT_EXERCISES,
    workouts: {},     // { "YYYY-MM-DD": { intention, offered, sets: [{ id, exId, weight, reps }] } }
    faith: {},        // { "YYYY-MM-DD": { checks: {}, lectio: {}, examen: {}, reflection, gospel } }
    settings: { apiKey: "" },
  };
}

let state = load();
const listeners = new Set();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults();
    const saved = JSON.parse(raw);
    const base = defaults();
    return { ...base, ...saved, profile: { ...base.profile, ...saved.profile }, settings: { ...base.settings, ...saved.settings } };
  } catch {
    return defaults();
  }
}

export function getState() {
  return state;
}

export function update(fn) {
  fn(state);
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (err) {
    console.error("Could not save", err);
  }
  listeners.forEach((l) => l(state));
}

export function subscribe(fn) {
  listeners.add(fn);
}

export function exportJSON() {
  const copy = { ...state, settings: { ...state.settings, apiKey: "" } };
  return JSON.stringify(copy, null, 2);
}

export function importJSON(text) {
  const parsed = JSON.parse(text);
  if (!parsed || typeof parsed !== "object" || !parsed.profile) throw new Error("Not a backup file from this app.");
  const apiKey = state.settings.apiKey;
  update((s) => {
    Object.keys(s).forEach((k) => delete s[k]);
    Object.assign(s, defaults(), parsed);
    s.settings = { ...defaults().settings, ...parsed.settings, apiKey };
  });
}

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

// Local calendar date as YYYY-MM-DD (not UTC, so late-night logs land on the right day).
export function dateKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseKey(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key, n) {
  const d = parseKey(key);
  d.setDate(d.getDate() + n);
  return dateKey(d);
}
