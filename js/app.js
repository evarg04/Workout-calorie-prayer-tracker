import { getState, update, save, subscribe, uid, dateKey, addDays, parseKey, exportJSON, importJSON } from "./store.js";
import { computeTargets, totals, weightTrend, latestWeight, movingAverage, weeklyAdherence, paceVerdict, ACTIVITY_LEVELS, GOALS, RATE_OPTIONS } from "./nutrition.js";
import { suggestNext, history as sessionsFor, bestE1rm, isPR, strengthSummary, setFeedback, exerciseVerdict, e1rm, workingWeight } from "./lifts.js";
import { matchExercise, exerciseInfo, MATCH_SURE, MATCH_MAYBE, substitutesFor } from "./exercise-db.js";
import { parseWorkoutText, parseMaxes } from "./workout-text.js";
import { APP_VERSION } from "./version.js";
import { RAISE, mobilityFor, warmupSets, stretchesFor, STRETCHES, BREATHING, dayKind, WARMUP_EVIDENCE, STRETCH_EVIDENCE, SAUNA_LEVELS, saunaPlan, SAUNA_BENEFITS, SAUNA_AVOID, SAUNA_STOP, SAUNA_MAX_MIN, AB_ROUTINES, AB_NOTES, CARDIO_TYPES, CARDIO_OPTIONS, caloriesBurned } from "./recovery.js";
import { liturgicalDay, penanceNote, mysteriesFor, PRAYERS, EXAMEN, LECTIO, virtueOfWeek, usccbUrl } from "./liturgy.js";
import { lineChart } from "./chart.js";
import { generateReflection, renderMarkdown } from "./reflect.js";
import { DIETS } from "./recipes.js";
import { SLOTS, buildPlan, swapSlot, hydrate, planTotals, recipePool, scaled, groceryList } from "./mealplan.js";
import { PROGRAMS, CATALOG, MUSCLES, todaysSession, weeklyVolume, round5, sessionsBefore } from "./programs.js";
import { findWebRecipes, lookupExercise, askCoach, readNutrition, photoToBase64, getClient, findRestaurantNutrition } from "./ai.js";

// ---------- tiny templating: interpolations are escaped unless wrapped in raw() ----------
const RAW = Symbol("raw");
const raw = (s) => ({ [RAW]: String(s) });
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const val = (v) => (Array.isArray(v) ? v.map(val).join("") : v && v[RAW] !== undefined ? v[RAW] : v === false || v == null ? "" : esc(v));
const html = (strings, ...vals) => raw(strings.reduce((out, s, i) => out + s + (i < vals.length ? val(vals[i]) : ""), ""));

const ui = { tab: location.hash.slice(1) || "today", date: dateKey(), chartEx: null, gospel: {}, busy: {}, exQuery: "", exPick: null, exLookup: null, coach: {},
  sub: { food: "menu", train: "workout", faith: "today" } };

const SUBS = {
  food: [["menu", "Menu"], ["log", "Log"], ["recipes", "Find recipes"]],
  train: [["workout", "Workout"], ["progress", "Progress"], ["programs", "Programs"], ["recovery", "Recovery"]],
  faith: [["today", "Today"], ["pray", "Pray"], ["ledger", "Ledger"]],
};
const view = document.getElementById("view");
const round = (n) => Math.round(n);
const fmtDate = (k, opts = { weekday: "short", month: "short", day: "numeric" }) => parseKey(k).toLocaleDateString(undefined, opts);

// ---------- shared pieces ----------

function targetsFor(s) {
  return computeTargets(s.profile, latestWeight(s.weights));
}

function bar(label, have, goal, unit, cls, overIsBad = true) {
  const pct = goal ? Math.min(100, (have / goal) * 100) : 0;
  const over = overIsBad && have > goal * 1.05;
  return html`
    <div class="bar-row">
      <span class="bar-name">${label}</span>
      <div class="bar ${cls}${over ? " over" : ""}" role="progressbar" aria-valuenow="${round(have)}" aria-valuemax="${round(goal)}" aria-label="${label}">
        <div style="width:${pct.toFixed(1)}%"></div>
      </div>
      <span class="bar-val"><strong>${round(have)}</strong>/${round(goal)}${unit}</span>
    </div>`;
}

function macroBlock(t, target) {
  const left = target.calories - t.cal;
  return html`
    <div class="fuel">
      <div class="fuel-kcal">
        <span class="num-xl">${round(Math.abs(left)).toLocaleString()}</span>
        <span class="label">${left >= 0 ? "kcal left" : "kcal over"}</span>
        <span class="meta">${round(t.cal).toLocaleString()} of ${target.calories.toLocaleString()}</span>
      </div>
      <div class="fuel-bars">
        ${bar("Protein", t.p, target.protein, "g", "protein", false)}
        ${bar("Carbs", t.c, target.carbs, "g", "carbs")}
        ${bar("Fat", t.f, target.fat, "g", "fat")}
      </div>
    </div>
    <p class="hint">${t.p >= target.protein * 0.9 ? "Protein goal reached. Muscle protected." : `${round(target.protein - t.p)} g protein to go. Put it in your next meal.`}</p>`;
}

function stat(label, value, meta, tone = "") {
  return html`<div class="stat ${tone ? `stat-${tone}` : ""}"><span class="stat-label">${label}</span><span class="stat-value">${value}</span><span class="stat-meta">${meta}</span></div>`;
}

function dayHead(key, title, extra = "") {
  return html`
    <section class="day-head">
      <div class="day-date">${fmtDate(key, { weekday: "long", month: "long", day: "numeric" })}</div>
      <div class="day-title">${title}</div>
      ${extra}
    </section>`;
}

const STATUS = { good: "On pace", warning: "Needs attention", serious: "Off pace" };

function penanceCard(key) {
  const note = penanceNote(liturgicalDay(key));
  return note ? html`<section class="card penance"><h3>${note.title}</h3><p>${note.body}</p></section>` : "";
}

function dayFaith(s, key) {
  return s.faith[key] || { checks: {}, lectio: {}, examen: {} };
}

function ruleItems(s, key) {
  const lit = liturgicalDay(key);
  const t = totals(s.foods[key]);
  const target = targetsFor(s);
  const f = dayFaith(s, key);
  return [
    { id: "offering", label: "Morning Offering", hint: "Give the whole day to God before anything else." },
    { id: "gospel", label: "Read the daily Gospel", hint: "USCCB readings, then Lectio Divina under Pray." },
    { id: "angelus", label: lit.easterSeason ? "Regina Caeli at noon" : "The Angelus at noon", hint: "Stop wherever you are, 2 minutes." },
    { id: "workout", label: "Offered my workout", hint: "Set an intention on the Train tab.", auto: !!s.workouts[key]?.offered },
    { id: "rosary", label: `Rosary — ${mysteriesFor(key).set} Mysteries`, hint: "Even one decade counts. Great for a walk or cardio." },
    { id: "temperance", label: "Temperance at table", hint: "Stayed within calories and kept any Friday penance.", auto: t.cal > 0 && t.cal <= target.calories * 1.05 },
    { id: "examen", label: "Evening Examen", hint: "5 minutes before bed." },
  ].map((i) => ({ ...i, done: !!f.checks[i.id] || !!i.auto }));
}

function ruleStreak(s) {
  let streak = 0;
  let k = dateKey();
  if (ruleItems(s, k).filter((i) => i.done).length < 5) k = addDays(k, -1); // today may still be in progress
  while (ruleItems(s, k).filter((i) => i.done).length >= 5) { streak++; k = addDays(k, -1); }
  return streak;
}

// ---------- TODAY ----------

function renderToday(s) {
  const key = ui.date;
  const target = targetsFor(s);
  const t = totals(s.foods[key]);
  const trend = weightTrend(s.weights, 21, key);
  const verdict = paceVerdict({
    target, trend, profile: s.profile,
    adherence: weeklyAdherence(s.foods, target, key),
    strength: strengthSummary(s.workouts, s.exercises, key),
  });
  const lit = liturgicalDay(key);
  const w = s.workouts[key];
  const setCount = w?.sets?.length || 0;
  const rule = ruleItems(s, key);
  const ruleDone = rule.filter((i) => i.done).length;
  const virtue = virtueOfWeek(key);
  const left = target.calories - t.cal;
  const prog = s.program && PROGRAMS[s.program.id];
  const exCount = new Set((w?.sets || []).map((x) => x.exId)).size;

  return html`
    ${dayHead(key, lit.season, html`<p class="day-note"><span class="eyebrow">Virtue of the week</span> ${virtue.name}. ${virtue.body}</p>`)}

    <div class="stats">
      ${stat(left >= 0 ? "kcal left" : "kcal over", round(Math.abs(left)).toLocaleString(), `${round(t.cal).toLocaleString()} / ${target.calories.toLocaleString()}`, left < 0 ? "bad" : "")}
      ${stat("Protein", `${round(t.p)}`, `of ${target.protein} g`, t.p >= target.protein * 0.9 ? "good" : "")}
      ${stat("Weight trend", trend ? `${trend.perWeek > 0 ? "+" : ""}${trend.perWeek.toFixed(1)}` : "—", trend ? "lb per week" : "needs 1 week of data")}
      ${stat("Rule of life", `${ruleDone}/${rule.length}`, `${ruleStreak(s)}-day streak`, ruleDone >= 5 ? "good" : "")}
    </div>

    ${penanceCard(key)}

    <section class="card status status-${verdict.level}">
      <div class="sec-head"><h2>Pace</h2><button type="button" class="link-btn" data-goto="me">${GOALS[target.mode].short}</button><span class="chip chip-${verdict.level}">${STATUS[verdict.level]}</span></div>
      <ul class="status-list">${verdict.msgs.map((m) => html`<li>${m}</li>`)}</ul>
    </section>

    <section class="card">
      <div class="sec-head"><h2>Fuel</h2><button type="button" class="link-btn" data-goto="food" data-sub="log">Log food</button></div>
      ${macroBlock(t, target)}
    </section>

    <section class="card">
      <div class="sec-head"><h2>Training</h2><button type="button" class="link-btn" data-goto="train" data-sub="workout">${setCount ? "Continue" : "Start"}</button></div>
      ${prog ? html`<p class="line"><span class="eyebrow">${prog.name}</span> ${w?.plan?.dayName || todaysSession(s.program, s.workouts, key, tmFor(s)).dayName}</p>` : html`<p class="line muted">No program yet. Pick one under Train, then Programs.</p>`}
      <p class="line">${setCount ? `${setCount} set${setCount === 1 ? "" : "s"} across ${exCount} exercise${exCount === 1 ? "" : "s"}` : "Nothing logged yet today."}${w?.intention ? html`. Offered for <em>${w.intention}</em>` : ""}</p>
    </section>

    <section class="card">
      <div class="sec-head"><h2>Bodyweight</h2>${s.weights[key] ? html`<span class="sec-meta">${s.weights[key]} lb today</span>` : ""}</div>
      <form class="inline" data-form="weight">
        <label class="grow">Morning weigh-in (lb)<input name="lb" type="number" step="0.1" inputmode="decimal" value="${s.weights[key] ?? ""}" placeholder="198.4" required></label>
        <button class="btn" type="submit">Save</button>
      </form>
      <div id="weight-chart"></div>
    </section>

    <section class="card">
      <div class="sec-head"><h2>Rule of life</h2><button type="button" class="link-btn" data-goto="faith" data-sub="today">Open</button></div>
      <ul class="mini-rule">${rule.map((i) => html`<li class="${i.done ? "done" : ""}"><span class="tick" aria-hidden="true"></span>${i.label}<span class="sr-only">${i.done ? " (done)" : " (not yet)"}</span></li>`)}</ul>
    </section>`;
}

function drawWeightChart(s) {
  const node = document.getElementById("weight-chart");
  if (!node) return;
  const from = addDays(ui.date, -90);
  const entries = Object.entries(s.weights).filter(([k]) => k >= from && k <= ui.date);
  const inRange = Object.fromEntries(entries);
  lineChart(node, {
    unit: " lb",
    ref: { y: s.profile.goalWeightLb, label: `Goal ${s.profile.goalWeightLb}` },
    series: [
      { name: "Weigh-in", kind: "dots", cls: "s-muted", points: entries.map(([k, v]) => ({ x: parseKey(k), y: +v })) },
      { name: "7-day average", kind: "line", cls: "s-1", points: movingAverage(inRange).map((p) => ({ x: parseKey(p.key), y: p.y })) },
    ],
  });
}

// ---------- FOOD ----------

const MEALS = ["Breakfast", "Lunch", "Dinner", "Snacks"];
const SLOT_SHARE = { breakfast: 0.25, lunch: 0.3, preworkout: 0.12, dinner: 0.3, snack: 0.1, dessert: 0.08 };
const fmtGrams = (g) => (g >= 28 ? `${round(g)} g (${(g / 28.35).toFixed(1)} oz)` : `${round(g)} g`);
const FRACTIONS = { 0.25: "¼", 0.5: "½", 0.75: "¾" };
function fmtQty(q) {
  const r = Math.round(q * 4) / 4;
  if (r <= 0) return "pinch";
  const whole = Math.floor(r), frac = FRACTIONS[r - whole] || "";
  return `${whole || ""}${frac}` || String(r);
}
function fmtIngredient(ing, mult) {
  const g = ing.g * mult;
  if (ing.name === "eggs") { const n = Math.round(g / 50 * 2) / 2; return `${n} large egg${n === 1 ? "" : "s"} (${round(g)} g)`; }
  return `${fmtGrams(g)} ${ing.name}`;
}
function fmtPantry([q, unit, name], mult) {
  if (q == null) return name;
  const amt = fmtQty(q * mult);
  const plural = unit && q * mult > 1 && unit === "clove" ? "cloves" : unit;
  return `${amt}${plural ? ` ${plural}` : ""} ${name}`;
}
const fmtMins = (m) => (m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ""}` : `${m} min`);

function isMeatless(s, key) {
  const lit = liturgicalDay(key);
  return lit.abstinence || (lit.friday && !!s.profile.meatlessFridays);
}

// A day's menu is generated once and cached, then rebuilt only if diet, abstinence or targets
// change. Meals already logged stay put; only the rest of the day is re-planned.
function buildDayPlan(s, key, seedN, previous) {
  const target = targetsFor(s);
  const diet = s.profile.diet || "everything";
  const meatless = isMeatless(s, key);
  const pre = s.profile.preworkout !== false;
  const plan = buildPlan({ target, diet, meatless, seed: `${key}:${seedN}`, webRecipes: s.webRecipes, skip: pre ? [] : ["preworkout"] });
  for (const old of previous?.items || []) {
    if (!old.logged) continue;
    const i = plan.items.findIndex((x) => x.slot === old.slot);
    if (i >= 0) plan.items[i] = { ...old };
    else plan.items.push({ ...old });
  }
  s.plans[key] = { ...plan, diet, meatless, pre, targetCal: target.calories, seedN };
  return s.plans[key];
}

function ensurePlan(s, key) {
  const target = targetsFor(s);
  const cached = s.plans[key];
  const fresh = cached?.items && cached.diet === (s.profile.diet || "everything") && cached.meatless === isMeatless(s, key)
    && (cached.pre ?? false) === (s.profile.preworkout !== false);
  if (fresh && (Math.abs(cached.targetCal - target.calories) < 60 || cached.items.some((i) => i.logged))) return cached;
  const plan = buildDayPlan(s, key, cached?.seedN || 0, cached);
  save();
  return plan;
}

function menuItem({ slot, recipe, mult, logged }, idx) {
  const label = SLOTS.find((x) => x.id === slot).label;
  const m = scaled(recipe, mult);
  return html`
    <div class="menu-item">
      <div class="menu-head">
        <span class="slot-label">${label}</span>
        <span class="menu-actions">
          <button type="button" class="btn ghost btn-sm" data-action="swap-meal" data-slot="${slot}">Swap</button>
          ${logged ? html`<span class="tag ok">Logged</span>` : html`<button type="button" class="btn btn-sm" data-action="log-meal" data-idx="${idx}">Log it</button>`}
        </span>
      </div>
      <div class="menu-row">
        <div class="menu-name">${recipe.name}${mult !== 1 ? html` <span class="mult">×${mult}</span>` : ""}</div>
        <div class="macros"><strong>${round(m.cal)}</strong> kcal<span>${round(m.p)}P · ${round(m.c)}C · ${round(m.f)}F</span></div>
      </div>
      ${recipe.note ? html`<div class="note">${recipe.note}</div>` : ""}
      ${recipe.source ? html`<div class="tiny"><a href="${recipe.source.url}" target="_blank" rel="noopener">${recipe.source.name} ↗</a>${recipe.estimated ? " · macros estimated" : ""}</div>` : ""}
      <details class="recipe"><summary>How to make it</summary>
        ${recipe.prep != null ? html`<dl class="recipe-meta">
          <div><dt>Prep</dt><dd>${fmtMins(recipe.prep)}</dd></div>
          ${recipe.cook ? html`<div><dt>Cook</dt><dd>${fmtMins(recipe.cook)}</dd></div>` : ""}
          ${recipe.wait ? html`<div class="wide"><dt>Plus</dt><dd>${recipe.wait}</dd></div>` : ""}
        </dl>` : ""}
        ${recipe.equipment?.length ? html`<p class="hint"><strong>You'll need:</strong> ${recipe.equipment.join(", ")}.</p>` : ""}
        <h4>Ingredients${mult !== 1 ? ` · for ${mult} servings` : ""}</h4>
        <ul class="ingredients">${(recipe.ingredients || []).map((ing) => (typeof ing === "string" ? html`<li>${ing}</li>` : html`<li>${fmtIngredient(ing, mult)}</li>`))}</ul>
        ${recipe.source && mult !== 1 ? html`<p class="hint">Quantities are for 1 serving; make ${mult}.</p>` : ""}
        ${recipe.pantry?.length ? html`<h4>Seasonings</h4><ul class="ingredients">${recipe.pantry.map((x) => html`<li>${fmtPantry(x, mult)}</li>`)}</ul>` : ""}
        <h4>Steps</h4>
        <ol class="steps recipe-steps">${(recipe.steps || []).map((x) => html`<li>${x}</li>`)}</ol>
        ${recipe.source ? html`<p class="hint">Full recipe and video: <a href="${recipe.source.url}" target="_blank" rel="noopener">${recipe.source.name} ↗</a></p>` : ""}
      </details>
    </div>`;
}

function menuCard(s, key) {
  const target = targetsFor(s);
  const plan = ensurePlan(s, key);
  const items = hydrate(plan, recipePool(s.webRecipes));
  const t = planTotals(items);
  const lit = liturgicalDay(key);
  return html`
    <section class="card">
      <div class="sec-head"><h2>Today's menu</h2><span class="sec-meta">${DIETS[plan.diet]?.label || "Everything"}${plan.meatless ? " · meatless" : ""}</span></div>
      ${lit.fastDay ? html`<p class="small warn-text">Fast day: one full meal and two small ones that don't add up to a full meal. Use this menu as a guide, not a target.</p>` : ""}
      ${items.map((i, idx) => menuItem(i, idx))}
      <div class="menu-total">
        <span><strong>${round(t.cal)}</strong> / ${target.calories} kcal</span>
        <span><strong>${round(t.p)}</strong> / ${target.protein} g protein</span>
        <span>${round(t.c)} C · ${round(t.f)} F</span>
      </div>
      <div class="row">
        <button type="button" class="btn ghost" data-action="new-menu">New menu</button>
        <button type="button" class="btn" data-action="log-menu">Log whole menu</button>
      </div>
      ${ui.grocery ? groceryBlock(s, key) : html`<button type="button" class="btn ghost full" data-action="grocery">Plan 7 days and make a grocery list</button>`}
    </section>`;
}

function groceryBlock(s, key) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(key, i));
  const plans = days.map((k) => ensurePlan(s, k));
  const pool = recipePool(s.webRecipes);
  const list = groceryList(plans, pool);
  return html`
    <h3>Next 7 days</h3>
    <ul class="week-plan">${days.map((k, i) => html`<li><strong>${fmtDate(k)}</strong>: ${hydrate(plans[i], pool).map((x) => x.recipe.name).join(" · ")}</li>`)}</ul>
    <h3>Grocery list</h3>
    <ul class="grocery">${list.items.map((x) => html`<li><label class="check"><input type="checkbox"> ${fmtGrams(x.g)} ${x.name}</label></li>`)}</ul>
    ${list.extras.length ? html`<p class="small muted">Plus, for web recipes:</p><ul class="small">${list.extras.map((x) => html`<li>${x}</li>`)}</ul>` : ""}
    <button type="button" class="btn ghost" data-action="grocery">Hide</button>`;
}

function webRecipesCard(s) {
  return html`
    <section class="card">
      <div class="sec-head"><h2>Find recipes on TikTok and the web</h2></div>
      ${s.settings.apiKey ? html`
        <p class="small muted">Searches TikTok creators and recipe sites for meals that fit your macros. Saved recipes join your menu rotation, with a link to the source.</p>
        <form data-form="web-recipes" class="grid-form">
          <label>Meal<select name="slot">${SLOTS.map((x) => html`<option value="${x.id}">${x.label}</option>`)}</select></label>
          <label>Diet<select name="diet">${Object.entries(DIETS).map(([k, v]) => html`<option value="${k}" ${k === (s.profile.diet || "everything") ? "selected" : ""}>${v.label}</option>`)}</select></label>
          <label class="span2">Anything specific?<input name="extra" placeholder="e.g. Tex-Mex, air fryer, 15 minutes, budget"></label>
          <button class="btn span2" type="submit" ${ui.busy.web ? "disabled" : ""}>${ui.busy.web ? "Searching the web…" : "Search"}</button>
        </form>`
      : html`<p class="small muted">Add your Anthropic API key on the Me tab to search TikTok creators and recipe sites for meals that fit your macros. Recipes you save join your menu rotation, with a link to the source.</p>`}
      ${ui.busy.webError ? html`<p class="error">${ui.busy.webError}</p>` : ""}
      ${(ui.webResults || []).map((r, i) => html`
        <div class="menu-item">
          <div class="menu-name">${r.name}</div>
          <div class="small muted">${round(r.per.cal)} kcal · ${round(r.per.p)}P ${round(r.per.c)}C ${round(r.per.f)}F per serving${r.estimated ? " (estimated)" : ""}</div>
          <div class="tiny"><a href="${r.source.url}" target="_blank" rel="noopener">${r.source.name} ↗</a></div>
          ${r.saved ? html`<p class="hint">Added to your menu rotation.</p>` : html`<button type="button" class="btn btn-sm" data-action="save-web" data-i="${i}">Add to my menu rotation</button>`}
        </div>`)}
      ${s.webRecipes.length ? html`<details><summary>My saved web recipes (${s.webRecipes.length})</summary>
        <ul class="entries">${s.webRecipes.map((r) => html`<li><span>${r.name} <span class="small muted">${r.slot}</span></span><button type="button" class="icon-btn" data-action="del-web" data-id="${r.id}" aria-label="Remove ${r.name}">✕</button></li>`)}</ul>
      </details>` : ""}
    </section>`;
}

const mealForNow = () => { const h = new Date().getHours(); return h < 11 ? "Breakfast" : h < 15 ? "Lunch" : h < 21 ? "Dinner" : "Snacks"; };

function scanTotalText(per, servings) {
  const x = (v) => Math.round(v * servings * 10) / 10;
  return `Logs ${Math.round(per.calories * servings)} kcal · ${x(per.protein)} g protein · ${x(per.carbs)} g carbs · ${x(per.fat)} g fat`;
}

function scanCard(s) {
  const sc = ui.scan;
  const picker = (label, ghost) => html`
    <label class="btn ${ghost ? "ghost" : ""} file-btn">${label}
      <input type="file" accept="image/*" capture="environment" data-action="scan-photo" hidden>
    </label>`;
  if (!s.settings.apiKey) {
    return html`<section class="card"><div class="sec-head"><h2>Scan a nutrition label</h2></div>
      <p class="hint">Add your Anthropic API key on the Me tab, then take a photo of any nutrition label, menu or app screen and the macros fill in for you.</p></section>`;
  }
  if (!sc) {
    return html`<section class="card"><div class="sec-head"><h2>Scan a nutrition label</h2></div>
      <p class="hint">Photo of a label, menu or app screen. The macros fill in; you check them and log.</p>
      ${picker("Take photo of label")}</section>`;
  }
  if (sc.loading) {
    return html`<section class="card"><div class="sec-head"><h2>Reading the label…</h2></div>
      <div class="scan-row">${sc.preview ? html`<img class="scan-thumb" src="${sc.preview}" alt="Your photo">` : ""}<p class="hint">Reading calories, protein, carbs and fat…</p></div></section>`;
  }
  if (sc.error || !sc.data?.found) {
    return html`<section class="card"><div class="sec-head"><h2>Scan a nutrition label</h2></div>
      <div class="scan-row">${sc.preview ? html`<img class="scan-thumb" src="${sc.preview}" alt="Your photo">` : ""}
        <p class="${sc.error ? "error" : "hint"}">${sc.error || "Couldn't find nutrition numbers in that photo. Get closer, keep the label flat, and use good light."}</p></div>
      <div class="row">${picker("Try again")}<button type="button" class="btn ghost" data-action="scan-cancel">Cancel</button></div></section>`;
  }
  const d = sc.data;
  const warn = d.basis === "per 100 g" ? "These numbers are per 100 g. Set servings to grams eaten ÷ 100 (e.g. 150 g = 1.5)."
    : d.basis === "estimated from photo" ? "No label found, so this is an estimate from the photo. Check it, or log by hand."
    : d.confidence !== "high" ? "Some numbers were hard to read. Check them against the label." : "";
  return html`
    <section class="card scan-card">
      <div class="sec-head"><h2>Check and log</h2><span class="chip chip-${d.confidence === "high" ? "good" : "warning"}">${d.confidence} confidence</span></div>
      <div class="scan-row"><img class="scan-thumb" src="${sc.preview}" alt="Your photo">
        <p class="hint">${d.basis}${d.servingSize ? ` · serving: ${d.servingSize}` : ""}${d.notes ? `. ${d.notes}` : ""}</p></div>
      ${warn ? html`<p class="target target-deload"><span class="target-label">Check</span> ${warn}</p>` : ""}
      <form data-form="scan-log" class="grid-form">
        <label class="span2">Food<input name="name" value="${d.name}" required></label>
        <label>Calories<input name="cal" type="number" inputmode="decimal" min="0" step="0.1" value="${d.calories}" data-live="scan"></label>
        <label>Protein g<input name="p" type="number" inputmode="decimal" min="0" step="0.1" value="${d.protein}" data-live="scan"></label>
        <label>Carbs g<input name="c" type="number" inputmode="decimal" min="0" step="0.1" value="${d.carbs}" data-live="scan"></label>
        <label>Fat g<input name="f" type="number" inputmode="decimal" min="0" step="0.1" value="${d.fat}" data-live="scan"></label>
        <div class="field span2">
          <span class="field-label">Servings eaten</span>
          <div class="stepper">
            <button type="button" data-step="-0.25" aria-label="Quarter serving less">−</button>
            <input name="servings" type="number" inputmode="decimal" min="0.25" step="0.25" value="1" data-live="scan" aria-label="Servings eaten">
            <button type="button" data-step="0.25" aria-label="Quarter serving more">+</button>
          </div>
        </div>
        <label class="span2">Meal<select name="meal">${MEALS.map((m) => html`<option ${m === mealForNow() ? "selected" : ""}>${m}</option>`)}</select></label>
        <label class="check span2"><input type="checkbox" name="save"> Save to My foods (1 serving) for one-tap logging</label>
        <p class="scan-total span2" id="scan-total">${scanTotalText(d, 1)}</p>
        <button class="btn span2 btn-log" type="submit">Log it</button>
        <button class="btn ghost span2" type="button" data-action="scan-cancel">Cancel</button>
      </form>
    </section>`;
}

// ---------- restaurant lookup ----------

function restaurantCard(s) {
  const R = ui.rest;
  if (!s.settings.apiKey) {
    return html`<section class="card"><div class="sec-head"><h2>Ate out?</h2></div>
      <p class="hint">Add your Anthropic API key on the Me tab, then type where you ate and what you ordered. The app finds the restaurant's published nutrition and fills in your macros.</p></section>`;
  }
  if (R?.loading) {
    return html`<section class="card"><div class="sec-head"><h2>Ate out?</h2></div>
      <p class="hint">Looking up ${R.restaurant}'s nutrition for "${R.order}"…</p></section>`;
  }
  if (R?.data) {
    const d = R.data;
    const total = d.items.reduce((t, x) => ({ cal: t.cal + x.calories, p: t.p + x.protein, c: t.c + x.carbs, f: t.f + x.fat }), { cal: 0, p: 0, c: 0, f: 0 });
    return html`
      <section class="card">
        <div class="sec-head"><h2>${d.restaurant}</h2><span class="sec-meta">check and log</span></div>
        ${d.notes ? html`<p class="hint">${d.notes}</p>` : ""}
        <form data-form="log-restaurant">
          <ul class="parsed">${d.items.map((x, i) => html`
            <li class="parsed-row">
              <label class="check rest-item"><input type="checkbox" name="use${i}" checked data-live="rest">
                <span><strong>${x.name}</strong>${x.size ? html`<span class="sub-line">${x.size}</span>` : ""}</span></label>
              <div class="rest-macros"><strong>${Math.round(x.calories)}</strong> kcal · ${x.protein}P · ${x.carbs}C · ${x.fat}F</div>
              <div class="rest-meta">
                ${x.official ? html`<span class="chip chip-good">restaurant data</span>` : x.estimated ? html`<span class="chip chip-warning">estimate</span>` : html`<span class="chip chip-new">database</span>`}
                ${x.source ? html`<a href="${x.source.url}" target="_blank" rel="noopener">${x.source.name} ↗</a>` : ""}
              </div>
              ${x.notes ? html`<p class="sub-line">${x.notes}</p>` : ""}
              <label class="servings-mini">Servings<input name="qty${i}" type="number" inputmode="decimal" min="0.25" step="0.25" value="1" data-live="rest"></label>
            </li>`)}</ul>
          <label>Meal<select name="meal">${MEALS.map((m) => html`<option ${m === mealForNow() ? "selected" : ""}>${m}</option>`)}</select></label>
          <p class="scan-total" id="rest-total">Logs ${Math.round(total.cal)} kcal · ${Math.round(total.p)} g protein · ${Math.round(total.c)} g carbs · ${Math.round(total.f)} g fat</p>
          <button class="btn full btn-log" type="submit">Log it</button>
          <button class="btn ghost full" type="button" data-action="rest-cancel">Cancel</button>
        </form>
      </section>`;
  }
  return html`
    <section class="card">
      <div class="sec-head"><h2>Ate out?</h2></div>
      <form data-form="find-restaurant" class="grid-form">
        <label class="span2">Where did you eat?<input name="restaurant" value="${R?.restaurant || ""}" placeholder="Chipotle, Chick-fil-A, Whataburger…" autocomplete="off" autocapitalize="words" required></label>
        <label class="span2">What did you get?<textarea name="order" rows="3" placeholder="Chicken burrito bowl, white rice, black beans, mild salsa, guac" autocomplete="off" required>${R?.order || ""}</textarea></label>
        <button class="btn span2" type="submit">Find nutrition</button>
      </form>
      ${R?.error ? html`<p class="error">${R.error}</p>` : ""}
      <p class="hint">Uses the restaurant's own published nutrition when it exists. Include sizes, sauces and sides for the best match.</p>
    </section>`;
}

function refreshRestTotal() {
  const form = document.querySelector('form[data-form="log-restaurant"]');
  const out = document.getElementById("rest-total");
  if (!form || !out || !ui.rest?.data) return;
  const t = { cal: 0, p: 0, c: 0, f: 0 };
  ui.rest.data.items.forEach((x, i) => {
    if (!form.elements[`use${i}`].checked) return;
    const k = Math.max(0, +form.elements[`qty${i}`].value || 0);
    t.cal += x.calories * k; t.p += x.protein * k; t.c += x.carbs * k; t.f += x.fat * k;
  });
  out.textContent = `Logs ${Math.round(t.cal)} kcal · ${Math.round(t.p)} g protein · ${Math.round(t.c)} g carbs · ${Math.round(t.f)} g fat`;
}

async function startScan(file) {
  ui.scan = { loading: true };
  render();
  try {
    const photo = await photoToBase64(file);
    ui.scan = { loading: true, preview: photo.dataUrl };
    render();
    const data = await readNutrition({ apiKey: getState().settings.apiKey, base64: photo.base64, mediaType: photo.mediaType });
    ui.scan = { preview: photo.dataUrl, data };
  } catch (err) {
    ui.scan = { preview: ui.scan?.preview, error: err.message || "Couldn't read that photo." };
  }
  render();
}

function renderFood(s) {
  const key = ui.date;
  const target = targetsFor(s);
  const entries = s.foods[key] || [];
  const t = totals(entries);
  const lit = liturgicalDay(key);
  const sub = ui.sub.food;

  if (sub === "recipes") return webRecipesCard(s);

  const summary = html`<section class="card">${macroBlock(t, target)}</section>`;
  if (sub === "menu") return html`${summary}${penanceCard(key)}${menuCard(s, key)}`;

  const week = weeklyAdherence(s.foods, target, key);
  return html`
    ${summary}
    ${penanceCard(key)}

    ${restaurantCard(s)}
    ${scanCard(s)}

    <section class="card">
      <div class="sec-head"><h2>Add food</h2></div>
      ${s.savedFoods.length ? html`
        <div class="chips" aria-label="My foods">
          ${s.savedFoods.map((f, i) => html`<button type="button" class="chip" data-action="quick-food" data-i="${i}" title="${f.cal} kcal · P${f.p} C${f.c} F${f.f}">+ ${f.name}</button>`)}
        </div>` : ""}
      <form data-form="food" class="grid-form">
        <label class="span2">Food<input name="name" required placeholder="Chicken breast, 6 oz" autocomplete="off"></label>
        <label>Meal<select name="meal">${MEALS.map((m) => html`<option>${m}</option>`)}</select></label>
        <label>Calories<input name="cal" type="number" inputmode="numeric" min="0" placeholder="auto"></label>
        <label>Protein g<input name="p" type="number" inputmode="decimal" min="0" step="0.1" value="0"></label>
        <label>Carbs g<input name="c" type="number" inputmode="decimal" min="0" step="0.1" value="0"></label>
        <label>Fat g<input name="f" type="number" inputmode="decimal" min="0" step="0.1" value="0"></label>
        ${lit.friday ? html`<label class="check span2"><input type="checkbox" name="meat"> Contains meat (Friday)</label>` : ""}
        <label class="check span2"><input type="checkbox" name="save"> Save to My foods for one-tap logging</label>
        <button class="btn span2" type="submit">Add</button>
      </form>
      <p class="hint">Leave calories blank and they're worked out from the macros (4/4/9 kcal per gram).</p>
    </section>

    ${MEALS.map((meal) => {
      const list = entries.filter((e) => e.meal === meal);
      if (!list.length) return "";
      const mt = totals(list);
      return html`
        <section class="card">
          <div class="sec-head"><h2>${meal}</h2><span class="sec-meta">${round(mt.cal)} kcal · ${round(mt.p)}P ${round(mt.c)}C ${round(mt.f)}F</span></div>
          <ul class="entries">${list.map((e) => html`
            <li>
              <div><strong>${e.name}</strong>${e.meat && lit.friday ? html` <span class="tag warn">meat</span>` : ""}
                <div class="sub-line">${round(e.cal)} kcal · P ${e.p} · C ${e.c} · F ${e.f}</div></div>
              <button type="button" class="icon-btn" data-action="del-food" data-id="${e.id}" aria-label="Delete ${e.name}">✕</button>
            </li>`)}</ul>
        </section>`;
    })}

    <section class="card">
      <div class="sec-head"><h2>Last 7 days</h2>${week ? html`<span class="sec-meta">${week.logged}/7 days logged</span>` : ""}</div>
      ${week ? html`
        <table class="table">
          <tr><th></th><th>Avg/day</th><th>Target</th></tr>
          <tr><td>Calories</td><td>${round(week.cal)}</td><td>${target.calories}</td></tr>
          <tr><td>Protein</td><td>${round(week.p)} g</td><td>${target.protein} g</td></tr>
          <tr><td>Carbs</td><td>${round(week.c)} g</td><td>${target.carbs} g</td></tr>
          <tr><td>Fat</td><td>${round(week.f)} g</td><td>${target.fat} g</td></tr>
        </table>
        <p class="hint">Protein goal hit on ${week.proteinHits} of ${week.logged} logged days.</p>` : html`<p class="muted">Nothing logged this week yet.</p>`}
      ${s.savedFoods.length ? html`<details><summary>Manage my foods</summary>
        <ul class="entries">${s.savedFoods.map((f, i) => html`<li><span>${f.name} <span class="sub-line">${f.cal} kcal</span></span><button type="button" class="icon-btn" data-action="del-saved" data-i="${i}" aria-label="Remove ${f.name}">✕</button></li>`)}</ul>
      </details>` : ""}
    </section>`;
}

// ---------- TRAIN ----------

function workoutFor(s, key) {
  return s.workouts[key] || { intention: "", offered: false, order: [], sets: [] };
}

const TM_LIFTS = ["Overhead Press", "Deadlift", "Bench Press", "Back Squat"];
const cap = (x) => x[0].toUpperCase() + x.slice(1);
const fmtRest = (sec) => (sec >= 60 ? `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")} min` : `${sec} s`);
const tmFor = (s) => (name) => s.program?.tm?.[name] || 0;

function est1rm(s, name) {
  const ex = s.exercises.find((e) => e.name === name);
  const h = ex ? sessionsFor(s.workouts, ex.id) : [];
  if (h.length) return round5(Math.max(...h.map((x) => bestE1rm(x.sets))));
  const b = ex && s.baselines?.[ex.id];
  return b ? round5(b.e1rm) : null;
}

// ---------- my maxes ----------

function maxesCard(s) {
  const rows = ui.maxParsed;
  const byId = Object.fromEntries(s.exercises.map((e) => [e.id, e]));
  const saved = Object.entries(s.baselines || {}).filter(([id]) => byId[id]).sort((a, b) => byId[a[0]].name.localeCompare(byId[b[0]].name));
  if (rows) {
    return html`
      <section class="card">
        <div class="sec-head"><h2>Check your maxes</h2></div>
        <form data-form="save-maxes">
          <ul class="parsed">${rows.map((r, i) => r.error ? html`<li class="parsed-row"><span class="sub-line">"${r.line}"</span><p class="error">${r.error}</p></li>` : html`
            <li class="parsed-row">
              <div class="parsed-top">
                <select name="ex${i}" aria-label="Exercise">
                  ${r.options.map((o) => html`<option value="${o}" ${o === r.exercise ? "selected" : ""}>${o}</option>`)}
                  <option value="new:${titleCase(r.name)}" ${r.status === "new" ? "selected" : ""}>New exercise: ${titleCase(r.name)}</option>
                </select>
                <span class="chip chip-${r.status === "sure" ? "good" : r.status === "check" ? "warning" : "new"}">${r.status === "sure" ? "matched" : r.status === "check" ? "check" : "new"}</span>
              </div>
              <div class="max-inputs">
                <label>Weight (lb)<input name="w${i}" type="number" inputmode="decimal" min="0" step="0.5" value="${r.weight}"></label>
                <label>Reps<input name="r${i}" type="number" inputmode="numeric" min="1" value="${r.reps}"></label>
              </div>
              ${r.notes.length ? html`<p class="sub-line">${r.notes.join(". ")}.</p>` : ""}
            </li>`)}</ul>
          <button class="btn full btn-log" type="submit">Save ${rows.filter((r) => !r.error).length} maxes</button>
          <button class="btn ghost full" type="button" data-action="maxes-cancel">Cancel</button>
        </form>
      </section>`;
  }
  return html`
    <section class="card">
      <div class="sec-head"><h2>My maxes</h2>${saved.length ? html`<span class="sec-meta">${saved.length} lifts</span>` : ""}</div>
      <p class="hint">Starting weights for any lift you haven't logged yet come from these. Once you log real sets, your logs take over.</p>
      ${saved.length ? html`<table class="table maxes-table">
        <tr><th>Lift</th><th>Entered</th><th>Est. 1RM</th><th>8 reps</th><th></th></tr>
        ${saved.map(([id, b]) => html`<tr><td>${byId[id].name}</td><td>${b.weight}${b.reps > 1 ? `×${b.reps}` : ""}</td><td>${Math.round(b.e1rm)}</td><td>${workingWeight(b.e1rm, 8, byId[id].increment)}</td>
          <td><button type="button" class="icon-btn" data-action="del-max" data-id="${id}" aria-label="Remove ${byId[id].name} max">✕</button></td></tr>`)}
      </table><p class="hint">"8 reps" is a working weight for 8 reps with about 2 left in the tank.</p>` : ""}
      <form data-form="parse-maxes" class="maxes-entry">
        <h3 class="entry-title">${saved.length ? "Add or update maxes" : "Enter your maxes"}</h3>
        <p class="hint">One lift per line: "Bench 280", "Fly machine 140 for 6", "40 lbs db curl and hammer curl". No reps means a 1-rep max. Copied a list? Tap Paste.</p>
        <textarea name="text" rows="7" placeholder="Bench 280&#10;Overhead press 150 for 5" autocapitalize="off" autocorrect="off" autocomplete="off" spellcheck="false" aria-label="Your maxes, one lift per line">${ui.maxText || ""}</textarea>
        <div class="row">
          <button class="btn ghost" type="button" data-action="paste-maxes">Paste</button>
          <button class="btn grow-btn" type="submit">Read maxes</button>
        </div>
      </form>
    </section>`;
}

function programList(s) {
  const current = s.program?.id;
  return html`
    ${Object.entries(PROGRAMS).map(([id, p]) => html`
      <div class="program-option${id === current ? " is-current" : ""}">
        <div class="program-top"><span class="menu-name">${p.name}</span>${id === current ? html`<span class="chip chip-good">Current</span>` : ""}</div>
        <div class="sub-line">${p.author} · ${p.days} days/week · ${p.level}</div>
        <p class="small">${p.bestFor}</p>
        ${ui.pickProgram === id ? html`
          <form data-form="start-program" data-id="${id}" class="grid-form tm-form">
            <label class="span2">Your next workout<select name="day">${p.plan.map((d, i) => html`<option value="${i}">Day ${i + 1}: ${d.name}</option>`)}</select></label>
            <p class="hint span2">Joining mid-week? Pick the day you'd do next. For example, Legs if you've already done Push and Pull. The rotation continues from there.</p>
            ${id === "bbb531" ? html`
              <p class="hint span2">5/3/1 sets its weights from your 1-rep maxes. These are filled in from your logs and maxes where possible. Your Training Max is set to 90% of each.</p>
              ${TM_LIFTS.map((n) => html`<label>${n} 1RM (lb)<input name="${n}" type="number" inputmode="numeric" min="0" step="5" value="${est1rm(s, n) || ""}" required></label>`)}` : ""}
            <button class="btn span2" type="submit">Start ${p.name}</button>
            <button class="btn ghost span2" type="button" data-action="pick-program" data-id="">Cancel</button>
          </form>`
        : id === current ? "" : html`<button type="button" class="btn ghost" data-action="pick-program" data-id="${id}">${current ? "Switch to this program" : "Start this program"}</button>`}
      </div>`)}
    ${current ? html`<button type="button" class="btn ghost" data-action="stop-program">Stop program (train freestyle)</button>` : ""}`;
}

function programHistoryCard(s) {
  const past = [...(s.programHistory || [])].reverse();
  if (!past.length) return "";
  return html`
    <section class="card">
      <div class="sec-head"><h2>Program history</h2></div>
      <p class="hint">Your lift history, PRs and weights carry across every program.</p>
      <ul class="entries">${past.map((h) => html`<li><span>${PROGRAMS[h.id]?.name || h.id}<span class="sub-line">${fmtDate(h.start)} – ${fmtDate(h.end)}</span></span><span class="sub-line">${Object.entries(s.workouts).filter(([k, w]) => w.plan?.programId === h.id && k >= h.start && k <= h.end).length} sessions</span></li>`)}</ul>
    </section>`;
}

// Record a finished program in the history, if any session was actually trained on it.
function archiveProgram(st) {
  const prog = st.program;
  if (!prog) return;
  const trained = Object.entries(st.workouts).some(([k, w]) => k >= prog.start && w.plan?.programId === prog.id && w.sets?.length);
  if (trained) (st.programHistory ??= []).push({ id: prog.id, start: prog.start, end: ui.date });
}

const mod = (a, n) => ((a % n) + n) % n;

function startProgram(id, tm = {}, day = 0) {
  const s = getState();
  const from = s.program && PROGRAMS[s.program.id];
  if (from && !confirm(`Switch from ${from.name} to ${PROGRAMS[id].name}?\n\nYour lift history, PRs and weights all carry over. Only the daily plan changes.`)) return;
  update((st) => {
    archiveProgram(st);
    const done = sessionsBefore(st.workouts, id, ui.date);
    st.program = { id, start: ui.date, tm, offset: mod(day - done, PROGRAMS[id].plan.length) };
    // Drop today's old-program plan if nothing was logged yet, so the new program's day loads.
    const w = st.workouts[ui.date];
    if (w?.plan && w.plan.programId !== id && !w.sets.length) { delete w.plan; w.order = []; }
  });
  ui.pickProgram = null;
  ui.sub.train = "workout";
  render();
  window.scrollTo(0, 0);
  toast(`${PROGRAMS[id].name} started`);
}

function programCard(s, key, w) {
  const prog = s.program && PROGRAMS[s.program.id];
  if (!prog) {
    return html`
      <section class="card">
        <div class="sec-head"><h2>Choose a proven program</h2></div>
        <p class="hint">Each one has a long track record. The app runs the progression, schedules deloads, and tracks weekly volume so you keep progressing.</p>
        ${programList(s)}
      </section>`;
  }
  const loaded = w.plan?.programId === s.program.id;
  const shown = loaded ? w.plan : todaysSession(s.program, s.workouts, key, tmFor(s));
  return html`
    <section class="card program">
      <div class="sec-head"><h2>${prog.name}</h2><span class="sec-meta">Week ${shown.week}</span></div>
      <div class="session-name">${shown.dayName}</div>
      <p class="hint">${prog.author} · ${prog.schedule}</p>
      ${shown.deload ? html`<p class="target target-deload"><span class="target-label">Deload week</span> Half the sets, same weights, easy effort. You recover, then come back stronger.</p>` : ""}
      ${loaded ? "" : html`<button type="button" class="btn full" data-action="load-session">Load today's workout</button>`}
      <details><summary>${loaded && w.sets.length ? "Change next workout" : "Change today's workout"}</summary>
        <form data-form="set-day" class="inline">
          <label class="grow">${loaded && w.sets.length ? "Next workout" : "Today"}<select name="day">${prog.plan.map((d, i) => html`<option value="${i}" ${!(loaded && w.sets.length) && d.name === shown.dayName ? "selected" : ""}>Day ${i + 1}: ${d.name}</option>`)}</select></label>
          <button class="btn" type="submit">Set</button>
        </form>
        <p class="hint">Missed a day, swapped days, or joined mid-week? Pick where you are and the rotation continues from there.</p>
      </details>
      ${Object.keys(s.program.swaps || {}).length ? html`<div class="swaps"><span class="eyebrow">Your swaps</span>
        <ul class="entries">${Object.entries(s.program.swaps).map(([from, to]) => html`<li><span>${from} → <strong>${to}</strong></span><button type="button" class="icon-btn" data-action="unswap" data-name="${from}" aria-label="Undo swap for ${from}">✕</button></li>`)}</ul></div>` : ""}
      <details><summary>About this program</summary>
        <p class="small">${prog.about}</p>
        <p class="small"><strong>Best for:</strong> ${prog.bestFor}</p>
        <ol class="small">${prog.plan.map((d) => html`<li><strong>${d.name}:</strong> ${d.ex.map((e) => (e[1] === "531" ? `${e[0]} 5/3/1 + 5×10` : `${e[0]} ${e[1]}×${e[2] === e[3] ? e[2] : `${e[2]}–${e[3]}`}`)).join(", ")}</li>`)}</ol>
      </details>
    </section>`;
}

function volumeCard(s, key) {
  const v = weeklyVolume(s.workouts, s.exercises, key);
  const label = { none: "", low: "low", good: "in range", high: "high" };
  return html`
    <section class="card">
      <div class="sec-head"><h2>Weekly volume</h2><span class="sec-meta">last 7 days</span></div>
      <p class="hint">Hard sets per muscle. The shaded band is the research sweet spot of 10–20 sets a week. Under 10 leaves growth on the table; over 20 during a cut can outrun your recovery.</p>
      <ul class="volume">${MUSCLES.map((m) => {
        const n = v[m];
        const status = n === 0 ? "none" : n < 10 ? "low" : n <= 20 ? "good" : "high";
        return html`<li><span class="vol-name">${cap(m)}</span><span class="vol-bar"><span class="vol-zone"></span><span class="vol-fill vol-${status}" style="width:${Math.min(100, (n / 25) * 100).toFixed(1)}%"></span></span><span class="vol-n">${n} ${label[status]}</span></li>`;
      })}</ul>
    </section>`;
}

// ---------- warm-up, stretching, sauna ----------

const KIND_LABEL = { lower: "lower body", upper: "upper body", full: "full body" };

function evidenceList(items) {
  return html`<ul class="evidence">${items.map((e) => html`<li>${e.claim} <span class="sub-line">${e.url ? html`<a href="${e.url}" target="_blank" rel="noopener">${e.source} ↗</a>` : e.source}</span></li>`)}</ul>`;
}

function moveList(moves) {
  return html`<ul class="moves">${moves.map(([name, dose, cue]) => html`<li><div class="move-top"><strong>${name}</strong><span class="move-dose">${dose}</span></div><span class="sub-line">${cue}</span></li>`)}</ul>`;
}

function warmupCard(s, w, key, order, exById) {
  const exs = order.map((id) => exById[id]).filter(Boolean);
  const kind = dayKind(exs);
  const started = w.sets.length > 0;
  return html`
    <details class="card warmup" ${started ? "" : "open"}>
      <summary class="card-summary"><span>Warm-up</span><span class="sec-meta">about 10 min · ${KIND_LABEL[kind]}</span></summary>
      <ol class="warm-steps">
        <li><span class="eyebrow">1 · Raise</span><div class="move-top"><strong>${RAISE.name}</strong><span class="move-dose">${RAISE.dose}</span></div><span class="sub-line">${RAISE.cue}</span></li>
        <li><span class="eyebrow">2 · Mobilize</span>${moveList(mobilityFor(kind))}</li>
        <li><span class="eyebrow">3 · Warm-up sets</span>
          <p class="hint">Each exercise below lists its own warm-up sets, scaled to that day's working weight. The first lift for a muscle gets a full ramp; muscles that are already warm get one feeder set or none.</p>
        </li>
      </ol>
      <details><summary>Why warm up this way</summary>${evidenceList(WARMUP_EVIDENCE)}</details>
    </details>`;
}

function cooldownCard(kind) {
  return html`
    <details class="card">
      <summary class="card-summary"><span>Cool-down stretch</span><span class="sec-meta">5–8 min</span></summary>
      <p class="hint">Right after training, or any time on a rest day. Ease into each stretch: mild tension, never pain. Breathe slowly.</p>
      ${moveList(stretchesFor(kind))}
      ${moveList([BREATHING])}
    </details>`;
}

function recoveryView(s, key) {
  const sauna = s.profile.sauna || {};
  const weight = latestWeight(s.weights) || s.profile.weightLb;
  return html`
    <section class="card">
      <div class="sec-head"><h2>Stretching routine</h2><span class="sec-meta">10–12 min</span></div>
      <p class="hint">Do this after training or on rest days, ideally 3–5 times a week. Hold each stretch 30 seconds, twice. It keeps hips, shoulders and ankles moving well under heavy loads.</p>
      <h3 class="entry-title">Lower body</h3>${moveList(STRETCHES.lower)}
      <h3 class="entry-title">Upper body</h3>${moveList(STRETCHES.upper)}
      <h3 class="entry-title">Finish</h3>${moveList([BREATHING])}
      <details><summary>What stretching does (and doesn't do)</summary>${evidenceList(STRETCH_EVIDENCE)}</details>
    </section>
    ${sauna.enabled ? saunaCard(s, sauna, weight) : saunaOptIn(sauna)}`;
}

function saunaOptIn(sauna) {
  return html`
    <section class="card">
      <div class="sec-head"><h2>Sauna</h2><span class="chip chip-new">optional</span></div>
      <p class="hint">Regular sauna use is linked to better heart health and can help you relax and recover. It's also hard on the body if you're dehydrated or have certain conditions, so it's off until you check these.</p>
      <h3 class="entry-title">Skip the sauna, or ask your doctor first, if:</h3>
      <ul class="status-list">${SAUNA_AVOID.map((x) => html`<li>${x}</li>`)}</ul>
      <form data-form="sauna-on" class="grid-form">
        <label class="span2">Your sauna experience<select name="level">${Object.entries(SAUNA_LEVELS).map(([k, v]) => html`<option value="${k}" ${sauna.level === k ? "selected" : ""}>${v.label}</option>`)}</select></label>
        <label class="check span2"><input type="checkbox" name="ack" required> I've read this list. None of it applies to me, or my doctor has cleared me.</label>
        <button class="btn span2" type="submit">Turn on sauna guidance</button>
      </form>
    </section>`;
}

function saunaCard(s, sauna, weight) {
  const plan = saunaPlan(sauna.level, weight);
  return html`
    <section class="card">
      <div class="sec-head"><h2>Your sauna plan</h2><span class="sec-meta">${plan.label}</span></div>
      <div class="stats stats-3">
        ${stat("Session", plan.time, "1 round only")}
        ${stat("How often", "2–4×", "per week")}
        ${stat("Sweat limit", `${plan.limitLb} lb`, "1% of body weight")}
      </div>
      <dl class="pairs">
        <dt>Heat</dt><dd>${plan.temp}</dd>
        <dt>Limit</dt><dd><strong>${plan.rule}</strong> ${plan.notes}</dd>
        <dt>When</dt><dd>${plan.timing}</dd>
        <dt>Before</dt><dd>${plan.before}</dd>
        <dt>Weigh</dt><dd>${plan.limitText}</dd>
        <dt>After</dt><dd>${plan.replaceText}</dd>
        <dt>Note</dt><dd>${plan.estimateText}</dd>
      </dl>
      <p class="target target-deload"><span class="target-label">Get out right away if you feel</span> ${SAUNA_STOP.join(", ").toLowerCase()}. Cool down slowly, sit, and drink water.</p>
      <details><summary>Why it's good for you</summary>
        ${evidenceList(SAUNA_BENEFITS)}
        <p class="hint">Session length is based on your heat experience, not body weight; research doesn't support weight-based timing. Your weight sets your personal sweat-loss limit and how much to drink.</p>
      </details>
      <details><summary>When not to use the sauna</summary><ul class="status-list">${SAUNA_AVOID.map((x) => html`<li>${x}</li>`)}</ul></details>
      <form data-form="sauna-level" class="inline">
        <label class="grow">Experience<select name="level">${Object.entries(SAUNA_LEVELS).map(([k, v]) => html`<option value="${k}" ${sauna.level === k ? "selected" : ""}>${v.label}</option>`)}</select></label>
        <button class="btn" type="submit">Update</button>
      </form>
      <button type="button" class="btn ghost full" data-action="sauna-off">Turn off sauna guidance</button>
    </section>`;
}

function renderTrain(s) {
  const key = ui.date;
  const w = workoutFor(s, key);
  const exById = Object.fromEntries(s.exercises.map((e) => [e.id, e]));
  const order = [...new Set([...(w.order || []), ...w.sets.map((x) => x.exId)])].filter((id) => exById[id]);
  ui.chartEx ??= order[0] || s.exercises[0]?.id;
  const sub = ui.sub.train;

  if (sub === "recovery") return recoveryView(s, key);

  if (sub === "progress") {
    return html`
      ${maxesCard(s)}
      <section class="card">
        <div class="sec-head"><h2>Strength progress</h2></div>
        <label>Lift<select data-action="chart-ex">${s.exercises.map((e) => html`<option value="${e.id}" ${e.id === ui.chartEx ? "selected" : ""}>${e.name}</option>`)}</select></label>
        <div id="lift-chart"></div>
        ${liftHistory(s, ui.chartEx)}
      </section>
      ${volumeCard(s, key)}`;
  }

  if (sub === "programs") {
    return html`
      ${s.program && PROGRAMS[s.program.id] ? programCard(s, key, w) : ""}
      <section class="card">
        <div class="sec-head"><h2>${s.program ? "Switch program" : "Choose a proven program"}</h2></div>
        <p class="hint">${s.program ? "Switching keeps all your numbers. Lifts you've done before start from your existing strength, even in a new rep range." : "Each one has a long track record. The app runs the progression, schedules deloads, and tracks weekly volume so you keep progressing."}</p>
        ${programList(s)}
      </section>
      ${programHistoryCard(s)}
      <section class="card">
        <div class="sec-head"><h2>Exercise library</h2><span class="sec-meta">${s.exercises.length} exercises</span></div>
        <p class="hint">Double progression: work in the rep range. Once every set hits the top, add the increment.</p>
        <ul class="entries">${s.exercises.map((e) => html`
          <li><span>${e.name} <span class="sub-line">${e.repMin}–${e.repMax} reps · +${e.increment} lb${e.verified ? " · verified online" : ""}</span></span>
          <button type="button" class="icon-btn" data-action="del-ex" data-id="${e.id}" aria-label="Remove ${e.name}">✕</button></li>`)}</ul>
        <details><summary>Add an exercise by hand</summary>
          <form data-form="new-ex" class="grid-form">
            <label class="span2">Name<input name="name" required placeholder="Hack squat"></label>
            <label>Type<select name="kind"><option value="upper">Upper body</option><option value="lower">Lower body</option></select></label>
            <label>Main muscle<select name="muscle">${MUSCLES.map((m) => html`<option value="${m}">${cap(m)}</option>`)}</select></label>
            <label>Min reps<input name="repMin" type="number" min="1" value="6"></label>
            <label>Max reps<input name="repMax" type="number" min="1" value="10"></label>
            <label class="span2">Increment (lb)<input name="increment" type="number" step="0.5" min="0" value="5"></label>
            <button class="btn span2" type="submit">Add to library</button>
          </form>
        </details>
      </section>`;
  }

  const prog = s.program && PROGRAMS[s.program.id];
  // One exercise is open for logging at a time: the one you picked, else the first unfinished.
  const isDone = (id) => {
    const n = w.sets.filter((x) => x.exId === id).length;
    const rxItem = w.plan?.items?.find((i) => i.exId === id);
    return rxItem ? n >= rxItem.sets : n >= 3;
  };
  const openId = order.includes(ui.openEx) ? ui.openEx : order.find((id) => !isDone(id)) || order[order.length - 1];
  return html`
    ${prog ? programCard(s, key, w) : html`
      <section class="card">
        <div class="sec-head"><h2>No program</h2><button type="button" class="link-btn" data-sub-go="programs">Choose one</button></div>
        <p class="hint">Train freestyle below, or pick a proven program and the app will load each day for you.</p>
      </section>`}

    ${warmupCard(s, w, key, order, exById)}

    <section class="card offer">
      <div class="sec-head"><h2>Offer it up</h2><span class="sec-meta">1 Cor 9:27</span></div>
      <form class="inline" data-form="intention">
        <label class="grow">Who is this workout for?<input name="intention" value="${w.intention}" placeholder="My father's health, souls in purgatory…"></label>
        <button class="btn" type="submit">Set</button>
      </form>
      <label class="check"><input type="checkbox" data-action="toggle-offered" ${w.offered ? "checked" : ""}> I offered this workout to God. My hardest set is for this intention.</label>
      <details><summary>Athlete's offering prayer</summary><p class="prayer">${PRAYERS.athletesOffering}</p></details>
    </section>

    ${order.map((id) => exerciseCard(s, exById[id], w, key, id === openId))}

    ${typeWorkoutCard(s)}

    <section class="card">
      <div class="sec-head"><h2>Add exercise</h2></div>
      <form class="inline" data-form="ex-search">
        <label class="grow">Type it the way you say it<input name="q" value="${ui.exQuery}" placeholder="incline db press, RDL, skull crushers" autocomplete="off" data-live="ex-query"></label>
        <button class="btn" type="submit">Find</button>
      </form>
      <div id="ex-results" aria-live="polite">${exResults(s)}</div>
      ${s.exercises.some((e) => !order.includes(e.id)) ? html`<details><summary>Pick from your library</summary>
        <form class="inline" data-form="add-ex">
          <label class="grow">Exercise<select name="exId">${s.exercises.filter((e) => !order.includes(e.id)).map((e) => html`<option value="${e.id}">${e.name}</option>`)}</select></label>
          <button class="btn" type="submit">Add</button>
        </form>
      </details>` : ""}
    </section>

    ${workoutReview(s, w, key, order, exById)}
    ${w.sets.length ? finisherSection(s, w) : ""}
    ${w.sets.length ? cooldownCard(dayKind(order.map((id) => exById[id]).filter(Boolean))) : ""}`;
}

// ---------- after the workout: optional abs, cardio, sauna ----------

const saunaReady = (s) => !!(s.profile.sauna?.enabled && s.profile.sauna?.ackDate);

// True once every exercise the program prescribed today has all its sets.
function programComplete(w) {
  const items = w.plan?.items || [];
  return items.length > 0 && items.every((i) => w.sets.filter((x) => x.exId === i.exId).length >= i.sets);
}

// Prescribed lifts (not the optional ab add-ons) that still have sets left.
function openItems(w) {
  return (w.plan?.items || []).filter((i) => !i.extra && w.sets.filter((x) => x.exId === i.exId).length < i.sets);
}

// The workout counts as finished when its last prescribed lift is done, even if a set was skipped earlier.
function lastLiftDone(w) {
  const main = (w.plan?.items || []).filter((i) => !i.extra);
  if (!main.length) return false;
  const pos = (id) => { const k = (w.order || []).indexOf(id); return k < 0 ? Infinity : k; };
  const last = main.reduce((a, b) => (pos(b.exId) >= pos(a.exId) ? b : a));
  return w.sets.filter((x) => x.exId === last.exId).length >= last.sets;
}

function finisherSection(s, w) {
  const extras = w.extras || {};
  const weight = latestWeight(s.weights) || s.profile.weightLb;
  return html`
    ${!w.finished ? html`<button type="button" class="btn ghost full finish-btn" data-action="finish-open">Finish workout</button>`
      : html`<button type="button" class="btn ghost full finish-btn" data-action="wrap-up">${w.wrapped ? "See today's summary" : "Wrap up and see my summary"}</button>
        ${extrasLeft(s, w).length ? html`<button type="button" class="finish-more" data-action="finish-open">Add ${listWords(extrasLeft(s, w).map((k) => EXTRA_NAME[k]))}</button>` : ""}`}
    ${extras.abs ? abCard(s) : ""}
    ${extras.cardio ? cardioCard(s, w, weight) : ""}
    ${extras.sauna && saunaReady(s) ? saunaMini(s, w, weight) : ""}`;
}

const EXTRA_NAME = { abs: "abs", cardio: "cardio", sauna: "sauna" };
const listAnd = (a) => (a.length < 2 ? a.join("") : `${a.slice(0, -1).join(", ")} and ${a[a.length - 1]}`);
const listWords = (a) => (a.length < 2 ? a.join("") : `${a.slice(0, -1).join(", ")} or ${a[a.length - 1]}`);

// Extras still on offer today, in the order they make sense: abs, cardio, then sauna last.
function extrasLeft(s, w) {
  const x = w.extras || {};
  return ["abs", "cardio", ...(saunaReady(s) ? ["sauna"] : [])].filter((k) => !x[k]);
}

// stage: "start" right after the last set, "next" after an extra is finished.
function finisherSheet(s, w, stage = "start") {
  const sauna = saunaReady(s) ? saunaPlan(s.profile.sauna.level, latestWeight(s.weights) || s.profile.weightLb) : null;
  const left = extrasLeft(s, w);
  const opt = {
    abs: html`<button type="button" class="sheet-opt" data-action="finish-pick" data-pick="abs"><strong>Abs</strong><span>Top, middle and bottom · about 10 min</span></button>`,
    cardio: html`<button type="button" class="sheet-opt" data-action="finish-pick" data-pick="cardio"><strong>Cardio</strong><span>Easy 10–20 min, or short intervals</span></button>`,
    sauna: sauna ? html`<button type="button" class="sheet-opt" data-action="finish-pick" data-pick="sauna"><strong>Sauna</strong><span>${sauna.time} · drink about 16 oz first</span></button>` : "",
  };
  const head = stage === "next"
    ? [`${ui.justDid === "cardio" ? "Cardio" : "Abs"} done. Great job.`, left.length ? "Anything else, or call it a day? Either is a good choice." : ""]
    : ["Workout complete. Nice work.", "Want to add anything? Totally optional. Rest is part of training too."];
  return html`
    <div class="sheet-backdrop" data-action="finish-close"></div>
    <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
      <h2 id="sheet-title">${head[0]}</h2>
      ${head[1] ? html`<p class="hint">${head[1]}</p>` : ""}
      ${stage === "start" && openItems(w).length ? html`<p class="hint">A few sets were left on ${listAnd(openItems(w).map((i) => `${i.name} (${w.sets.filter((x) => x.exId === i.exId).length} of ${i.sets})`))}. That's fine. Log them first if you want, or finish now.</p>` : ""}
      ${left.length ? html`<div class="sheet-options">${left.map((k) => opt[k])}</div>` : ""}
      <button type="button" class="btn full" data-action="finish-pick" data-pick="done">${stage === "next" ? "Wrap up and see my summary" : "I'm done for today"}</button>
    </div>`[RAW];
}

function openSheet(markup) {
  closeFinisherSheet();
  const el = document.createElement("div");
  el.id = "finisher";
  el.innerHTML = markup;
  document.body.append(el);
  el.querySelector(".sheet")?.focus?.();
}

function showFinisherSheet(stage) {
  const s = getState();
  openSheet(finisherSheet(s, workoutFor(s, ui.date), stage));
}

// After an extra is finished: offer what's left, or go straight to the summary.
function afterExtra(kind) {
  ui.justDid = kind;
  const s = getState();
  if (extrasLeft(s, workoutFor(s, ui.date)).length) return showFinisherSheet("next");
  update((st) => { ensureWorkout(st, ui.date).wrapped = true; });
  showSummary();
}

function showSummary() {
  const s = getState();
  openSheet(summarySheet(s, workoutFor(s, ui.date), ui.date));
}

// Post-workout protein: ~0.4 g/kg in the meal after training (Schoenfeld & Aragon 2018),
// which lands around 30–50 g for most adults.
const refuelGrams = (lb) => Math.max(25, Math.min(50, Math.round((lb * 0.453592 * 0.4) / 5) * 5));

function summarySheet(s, w, key) {
  const exById = Object.fromEntries(s.exercises.map((e) => [e.id, e]));
  const order = [...new Set([...(w.order || []), ...w.sets.map((x) => x.exId)])].filter((id) => exById[id]);
  const rows = reviewRows(s, w, key, order, exById);
  const count = (k) => rows.filter((r) => r.verdict.kind === k).length;
  const prs = rows.reduce((n, r) => n + r.prs, 0);
  const volume = Math.round(rows.reduce((n, r) => n + r.volume, 0));
  const weight = latestWeight(s.weights) || s.profile.weightLb;
  const cardio = w.cardio || [];
  const cardioMin = cardio.reduce((n, c) => n + c.min, 0);
  const cardioKcal = cardio.reduce((n, c) => n + caloriesBurned(CARDIO_TYPES[c.type]?.met || 6, weight, c.min), 0);
  const absDone = (w.plan?.items || []).filter((i) => i.extra).some((i) => w.sets.some((x) => x.exId === i.exId)) || w.extras?.abs;
  const extras = [absDone && "Abs", cardioMin && `Cardio ${cardioMin} min (about ${cardioKcal} kcal)`, w.sauna?.min && `Sauna ${w.sauna.min} min`].filter(Boolean);
  const highlight = rows.filter((r) => r.prs || r.verdict.kind === "up").slice(0, 3);

  // Toward the goals
  const target = targetsFor(s);
  const food = totals(s.foods[key]);
  const trend = weightTrend(s.weights, 21, key);
  const goal = s.profile.goalWeightLb;
  const goals = [];
  if (weight && goal) {
    const toGo = Math.abs(weight - goal);
    if (toGo < 1) goals.push(["Weight", `You're at your ${goal} lb goal. Training now keeps the muscle you built.`]);
    else if (trend && target.gaining && trend.perWeek > 0.1 && goal > weight) {
      const eta = new Date(parseKey(key).getTime() + (toGo / trend.perWeek) * 7 * 86400000);
      goals.push(["Weight", `${toGo.toFixed(1)} lb to ${goal} lb, gaining ${trend.perWeek.toFixed(1)} lb a week. On this pace: ${eta.toLocaleDateString(undefined, { month: "long", day: "numeric" })}.`]);
    } else if (target.mode === "maintain" || target.mode === "recomp") {
      goals.push(["Weight", trend ? `${trend.perWeek >= 0 ? "+" : ""}${trend.perWeek.toFixed(1)} lb a week. ${target.mode === "recomp" ? "For a recomp, steady or slowly down is right" : "For maintenance, steady is the goal"}; strength is what to watch.` : "Weigh in most mornings; for this goal a steady scale is what you want."]);
    } else if (trend && target.losing && -trend.perWeek > 0.1 && goal < weight) {
      const eta = new Date(parseKey(key).getTime() + (toGo / -trend.perWeek) * 7 * 86400000);
      goals.push(["Weight", `${toGo.toFixed(1)} lb to ${goal} lb, losing ${(-trend.perWeek).toFixed(1)} lb a week. On this pace: ${eta.toLocaleDateString(undefined, { month: "long", day: "numeric" })}.`]);
    } else goals.push(["Weight", `${toGo.toFixed(1)} lb to ${goal} lb. ${trend ? "Keep weighing in; the trend is building." : "Weigh in most mornings and your pace shows up here within a week."}`]);
  }
  const strength = strengthSummary(s.workouts, s.exercises, key);
  if (strength) goals.push(["Strength", strength.up >= strength.down ? `Holding or rising on ${strength.up} of ${strength.total} lifts this month. You're keeping your muscle.` : `Down on ${strength.down} of ${strength.total} lifts this month. Extra sleep and protein usually fix this.`]);
  else if (count("new")) goals.push(["Strength", `Baselines set on ${count("new")} lift${count("new") === 1 ? "" : "s"}. From next session on, this tracks whether you're getting stronger.`]);
  else if (count("up")) goals.push(["Strength", `Progressed on ${count("up")} of ${rows.length} lifts today.`]);
  const weekDone = Array.from({ length: 7 }, (_, i) => s.workouts[addDays(key, -i)]).filter((x) => x?.sets?.length).length;
  const perWeek = s.program ? PROGRAMS[s.program.id]?.days : null;
  goals.push(["This week", perWeek ? `${weekDone} of ${perWeek} workouts done.${weekDone >= perWeek ? " Full week. Well earned." : ""}` : `${weekDone} workout${weekDone === 1 ? "" : "s"} in the last 7 days.`]);

  // Gentle refuel reminder
  const grams = refuelGrams(weight);
  const proteinLeft = Math.max(0, Math.round(target.protein - food.p));
  const refuel = proteinLeft
    ? `Don't forget to refuel. Your muscles are primed for protein now. Aim for about ${grams} g with some carbs in the next couple of hours. You have ${proteinLeft} g left to reach ${target.protein} g today.`
    : `You've already hit your ${target.protein} g of protein today. Nice. A meal with some carbs will still help you recover.`;
  const water = w.sauna?.min ? "After the sauna, drink about 20–24 oz of fluid for every pound you lost, with a pinch of salt or a sports drink." : "Drink some water too, especially if you sweated a lot.";

  return html`
    <div class="sheet-backdrop" data-action="finish-close"></div>
    <div class="sheet sheet-tall" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
      <h2 id="sheet-title">Today's session</h2>
      <p class="hint">${w.plan?.dayName ? `${w.plan.dayName}. ` : ""}${count("new") === rows.length ? "Baselines set. Next time you'll see exactly what to beat." : count("up") ? "You moved forward today." : "You showed up and did the work. That's what counts."}</p>
      <div class="stats stats-4">
        ${stat("Sets", w.sets.length, "logged")}
        ${stat("Volume", volume >= 10000 ? `${(volume / 1000).toFixed(1)}k` : volume.toLocaleString(), "lb moved")}
        ${count("new") === rows.length ? stat("Lifts", rows.length, "trained") : stat("Progressed", count("up"), `of ${rows.length} lifts`, count("up") ? "good" : "")}
        ${count("new") ? stat("Baselines", count("new"), "set today", "good") : stat("PRs", prs, "today", prs ? "good" : "")}
      </div>
      ${extras.length ? html`<p class="line"><span class="eyebrow">Extras</span> ${extras.join(" · ")}</p>` : ""}
      ${highlight.length ? html`<ul class="sum-list">${highlight.map((r) => html`<li><strong>${r.ex.name}</strong> ${r.prs ? html`<span class="tag pr">${r.prs} PR</span>` : html`<span class="chip chip-up">${VERDICT_LABEL.up}</span>`}</li>`)}</ul>` : ""}
      <h3 class="sum-head">Toward your goals</h3>
      <ul class="sum-goals">${goals.map(([k, v]) => html`<li><span class="eyebrow">${k}</span> ${v}</li>`)}</ul>
      <div class="refuel">
        <p>${refuel}</p>
        <p class="sub-line">${water}</p>
      </div>
      <div class="sheet-actions">
        <button type="button" class="btn ghost" data-action="finish-close">Close</button>
        <button type="button" class="btn" data-goto="food" data-sub="log">Log a meal</button>
      </div>
    </div>`[RAW];
}

function closeFinisherSheet() { document.getElementById("finisher")?.remove(); }

function abCard(s) {
  const kind = ui.abKind || "gym";
  const r = AB_ROUTINES[kind];
  let zone = "";
  return html`
    <section class="card abs-card" id="abs-card">
      <div class="sec-head"><h2>Abs: top, middle, bottom</h2><span class="sec-meta">${r.time}</span></div>
      <div class="seg-tabs">${Object.entries(AB_ROUTINES).map(([k, v]) => html`<button type="button" class="${k === kind ? "is-on" : ""}" data-action="ab-kind" data-kind="${k}">${v.label}</button>`)}</div>
      <ul class="moves">${r.moves.map(([z, name, sets, dose]) => {
        const head = z !== zone ? html`<li class="zone">${z}</li>` : "";
        zone = z;
        const how = exerciseInfo(name)?.how;
        return html`${head}<li><div class="move-top"><strong>${name}</strong><span class="move-dose">${sets} × ${dose}</span></div>${how?.cues?.[0] ? html`<span class="sub-line">${how.cues[0]}</span>` : ""}</li>`;
      })}</ul>
      <button type="button" class="btn full" data-action="add-abs" data-kind="${kind}">Add these to today's workout to log them</button>
      <details><summary>Tips and the science</summary><ul class="evidence">${AB_NOTES.map((n) => html`<li>${n}</li>`)}</ul></details>
    </section>`;
}

function cardioCard(s, w, weight) {
  const logged = w.cardio || [];
  return html`
    <section class="card" id="cardio-card">
      <div class="sec-head"><h2>Cardio</h2>${logged.length ? html`<span class="sec-meta">${logged.reduce((t, c) => t + c.min, 0)} min logged</span>` : ""}</div>
      <ul class="moves">${CARDIO_OPTIONS.map((o) => html`<li><div class="move-top"><strong>${o.name} <span class="chip ${o.tag === "recommended" ? "chip-good" : "chip-new"}">${o.tag}</span></strong><span class="move-dose">${o.dose}</span></div>
        <span class="sub-line">${o.how}</span><span class="sub-line">${o.why}</span></li>`)}</ul>
      <form data-form="log-cardio" class="grid-form">
        <label>Type<select name="type">${Object.entries(CARDIO_TYPES).map(([k, v]) => html`<option value="${k}">${v.label}</option>`)}</select></label>
        <label>Minutes<input name="min" type="number" inputmode="numeric" min="1" max="180" value="15"></label>
        <button class="btn span2" type="submit">Log cardio</button>
      </form>
      ${logged.length ? html`<ul class="entries">${logged.map((c, i) => html`<li><span>${CARDIO_TYPES[c.type]?.label || c.type} · ${c.min} min<span class="sub-line">about ${caloriesBurned(CARDIO_TYPES[c.type]?.met || 6, weight, c.min)} kcal</span></span><button type="button" class="icon-btn" data-action="del-cardio" data-i="${i}" aria-label="Delete cardio">✕</button></li>`)}</ul>` : ""}
      <p class="hint">Calorie estimates use standard exercise values for your weight. They aren't added to your food target, so the burn helps your cut instead of being eaten back.</p>
    </section>`;
}

function saunaMini(s, w, weight) {
  const plan = saunaPlan(s.profile.sauna.level, weight);
  return html`
    <section class="card" id="sauna-card">
      <div class="sec-head"><h2>Sauna</h2><span class="sec-meta">${plan.time} · 1 round</span></div>
      <p class="line"><strong>${plan.rule}</strong></p>
      <p class="line">Drink about 16 oz of water first. Weigh before and after; keep the loss under ${plan.limitLb} lb.</p>
      <p class="target target-deload"><span class="target-label">Get out right away if you feel</span> ${SAUNA_STOP.join(", ").toLowerCase()}.</p>
      <form data-form="log-sauna" class="inline">
        <label class="grow">Minutes in the sauna (15 max)<input name="min" type="number" inputmode="numeric" min="1" max="60" value="${w.sauna?.min || ""}"></label>
        <button class="btn" type="submit">Log</button>
      </form>
      <button type="button" class="link-btn" data-sub-go="recovery">Full sauna plan</button>
    </section>`;
}

// ---------- type or paste a whole workout ----------

const titleCase = (t) => t.replace(/\b\w/g, (c) => c.toUpperCase());

function typeWorkoutCard(s) {
  const rows = ui.parsed;
  if (!rows) {
    return html`
      <section class="card">
        <div class="sec-head"><h2>Type a workout</h2></div>
        <p class="hint">One exercise per line, the way you'd text it: "Pull up 4x10", "Single arm cable row 3x8 60 lbs", "Chest supported row 3x6 3 plates each side".</p>
        <form data-form="parse-workout">
          <textarea name="text" rows="4" placeholder="Pull up 4x10&#10;Single arm cable row 3x8 60 lbs" autocapitalize="off" autocorrect="off" autocomplete="off" spellcheck="false" aria-label="Your workout, one exercise per line">${ui.parsedText || ""}</textarea>
          <div class="row">
            <button class="btn ghost" type="button" data-action="paste-workout">Paste</button>
            <button class="btn grow-btn" type="submit">Read workout</button>
          </div>
        </form>
      </section>`;
  }
  const ok = rows.filter((r) => !r.error);
  return html`
    <section class="card">
      <div class="sec-head"><h2>Check your workout</h2><span class="sec-meta">${fmtDate(ui.date)}</span></div>
      <form data-form="log-parsed">
        <ul class="parsed">${rows.map((r, i) => r.error ? html`
          <li class="parsed-row is-error"><span class="sub-line">"${r.line}"</span><p class="error">${r.error}</p></li>` : html`
          <li class="parsed-row">
            <div class="parsed-top">
              <select name="ex${i}" aria-label="Exercise for line ${i + 1}">
                ${r.options.map((o) => html`<option value="${o}" ${o === r.exercise ? "selected" : ""}>${o}</option>`)}
                <option value="new:${titleCase(r.name)}" ${r.status === "new" ? "selected" : ""}>New exercise: ${titleCase(r.name)}</option>
              </select>
              ${r.status === "sure" ? html`<span class="chip chip-good">matched</span>` : r.status === "check" ? html`<span class="chip chip-warning">check</span>` : html`<span class="chip chip-new">new</span>`}
            </div>
            <div class="parsed-sets"><strong>${r.sets} × ${r.reps}</strong> @ ${r.weight ? `${r.weight} lb` : "bodyweight"}</div>
            ${r.notes.length ? html`<p class="sub-line">${r.notes.join(". ")}.</p>` : ""}
            <p class="sub-line">You typed: "${r.line}"</p>
          </li>`)}</ul>
        <button class="btn full btn-log" type="submit" ${ok.length ? "" : "disabled"}>Log ${ok.reduce((t, r) => t + r.sets, 0)} sets</button>
        <button class="btn ghost full" type="button" data-action="parsed-edit">Edit text</button>
      </form>
    </section>`;
}

// ---------- exercise recognition ----------

function howOf(ex) {
  return ex.how || exerciseInfo(ex.name)?.how || null;
}

function howBlock(how, open = false) {
  if (!how) return "";
  return html`
    <details class="how" ${open ? "open" : ""}><summary>How to perform it</summary>
      ${how.equipment ? html`<p class="small muted">Equipment: ${how.equipment}${how.secondary?.length ? ` · Also works: ${how.secondary.join(", ")}` : ""}</p>` : ""}
      <ol class="steps">${(how.steps || []).map((x) => html`<li>${x}</li>`)}</ol>
      ${how.cues?.length ? html`<p class="small"><strong>Cues:</strong></p><ul class="small">${how.cues.map((x) => html`<li>${x}</li>`)}</ul>` : ""}
      ${how.mistakes?.length ? html`<p class="small"><strong>Avoid:</strong></p><ul class="small">${how.mistakes.map((x) => html`<li>${x}</li>`)}</ul>` : ""}
      ${how.sources?.length ? html`<p class="tiny muted">Sources: ${how.sources.map((x, i) => html`${i ? " · " : ""}<a href="${x.url}" target="_blank" rel="noopener">${x.name} ↗</a>`)}</p>` : ""}
    </details>`;
}

function exPreview(ex, label) {
  const range = `${ex.repMin}–${ex.repMax} reps`;
  return html`
    <div class="ex-preview">
      <div class="eyebrow">${label}</div>
      <div class="menu-name">${ex.name}</div>
      <div class="sub-line">${cap(ex.muscle || "general")}${ex.secondary?.length ? ` + ${ex.secondary.join(", ")}` : ""} · ${ex.equipment || ex.how?.equipment || ""} · ${range}</div>
      ${howBlock(ex.how || exerciseInfo(ex.name)?.how, true)}
      <div class="row">
        <button type="button" class="btn" data-action="add-known" data-name="${ex.name}">Add to today's workout</button>
        <button type="button" class="btn ghost" data-action="ex-clear">Clear</button>
      </div>
    </div>`;
}

function lookupButton(s, q) {
  return s.settings.apiKey
    ? html`<button type="button" class="btn ghost" data-action="ex-lookup" data-q="${q}">Look up "${q}" online</button>`
    : html`<p class="hint">Add your Anthropic API key on the Me tab and unknown exercises get looked up online (how to do it, cues, sources) for you to confirm. Or add it by hand under Programs, then Exercise library.</p>`;
}

function exResults(s) {
  const q = ui.exQuery.trim();
  const L = ui.exLookup;
  if (L) {
    if (L.loading) return html`<p class="muted">Looking up "${L.query}" online…</p>`;
    if (L.error) return html`<p class="error">${L.error}</p>${lookupButton(s, L.query)}`;
    const d = L.data;
    if (!d.found) {
      return html`<p>I couldn't identify "${L.query}" as an exercise.</p>
        ${d.alternatives.length ? html`<p class="small">Did you mean:</p><div class="chips">${d.alternatives.map((a) => html`<button type="button" class="chip" data-action="ex-lookup" data-q="${a}">${a}</button>`)}</div>` : ""}
        <p class="hint">Try another name, or add it by hand under Programs, then Exercise library.</p>`;
    }
    return html`
      <div class="ex-verify">
        <p><strong>Is this the exercise you're doing?</strong></p>
        <p class="small">${d.description}</p>
        ${howBlock(d.how, true)}
        <form data-form="confirm-ex" class="grid-form">
          <label class="span2">Name<input name="name" value="${d.name}" required></label>
          <label>Main muscle<select name="muscle">${MUSCLES.map((m) => html`<option value="${m}" ${m === d.muscle ? "selected" : ""}>${cap(m)}</option>`)}</select></label>
          <label>Type<select name="kind"><option value="upper" ${d.kind === "upper" ? "selected" : ""}>Upper body</option><option value="lower" ${d.kind === "lower" ? "selected" : ""}>Lower body</option></select></label>
          <label>Min reps<input name="repMin" type="number" min="1" value="${d.repMin}"></label>
          <label>Max reps<input name="repMax" type="number" min="1" value="${d.repMax}"></label>
          <label class="span2">Weight increment (lb)<input name="increment" type="number" min="0" step="0.5" value="${d.increment}"></label>
          <button class="btn span2" type="submit">Yes, that's it. Add it</button>
        </form>
        ${d.alternatives.length ? html`<p class="small">Not quite? Maybe you meant:</p><div class="chips">${d.alternatives.map((a) => html`<button type="button" class="chip" data-action="ex-lookup" data-q="${a}">${a}</button>`)}</div>` : ""}
        <button type="button" class="btn ghost" data-action="ex-clear">No, start over</button>
      </div>`;
  }
  if (ui.exPick) {
    const ex = exerciseInfo(ui.exPick) || s.exercises.find((e) => e.name === ui.exPick);
    if (ex) return exPreview(ex, "You picked");
  }
  if (!q) return html`<p class="small muted">Type it the way you'd say it. Abbreviations and typos are fine.</p>`;
  const matches = matchExercise(q, s.exercises);
  const [top, second] = matches;
  if (top && top.score >= MATCH_SURE && !(second && second.score > top.score - 0.05)) {
    return html`${exPreview(top.ex, "Recognized")}
      ${matches.length > 1 ? html`<p class="small muted">Not it? ${matches.slice(1, 4).map((m) => html`<button type="button" class="link-btn" data-action="ex-pick" data-name="${m.ex.name}">${m.ex.name}</button> `)}</p>` : ""}
      ${lookupButton(s, q)}`;
  }
  if (top && top.score >= MATCH_MAYBE) {
    return html`<p class="small"><strong>Which one do you mean?</strong></p>
      <div class="chips">${matches.slice(0, 4).map((m) => html`<button type="button" class="chip" data-action="ex-pick" data-name="${m.ex.name}">${m.ex.name}</button>`)}</div>
      <p class="small muted">None of these?</p>${lookupButton(s, q)}`;
  }
  return html`<p>I don't know "${q}" yet.</p>${lookupButton(s, q)}`;
}

async function startLookup(q) {
  ui.exLookup = { query: q, loading: true };
  ui.exPick = null;
  render();
  try {
    ui.exLookup = { query: q, data: await lookupExercise({ apiKey: getState().settings.apiKey, query: q }) };
  } catch (err) {
    ui.exLookup = { query: q, error: err.message };
  }
  render();
}

function addToToday(st, exId) {
  const w = ensureWorkout(st, ui.date);
  if (!w.order.includes(exId)) w.order.push(exId);
  ui.chartEx = exId;
}

// ---------- coach review ----------

const VERDICT_LABEL = { up: "Progressed", same: "Held", down: "Down", new: "Baseline" };

function rxOf(rxItem) {
  return rxItem ? (rxItem.detail ? "531" : `${rxItem.repMin}-${rxItem.repMax}`) : "";
}

function prevSession(s, ex, rx, key) {
  return sessionsFor(s.workouts, ex.id, rx || undefined).find((h) => h.date < key) || null;
}

function feedbackFor(s, ex, rxItem, prev, sets) {
  return sets.map((x, i) => {
    if (rxItem?.detail) {
      const d = rxItem.detail[i];
      if (!d) return { level: "ok", notes: ["Extra set beyond the plan."], delta: "extra", dir: "none" };
      if (+x.reps >= d.reps) return { level: "good", notes: [d.plus ? `AMRAP: ${x.reps} reps, ${x.reps - d.reps} over the minimum.` : `Hit the prescribed ${d.weight}×${d.reps}.`], delta: d.plus ? `+${x.reps - d.reps}` : "hit", dir: "up" };
      return { level: "warn", notes: [`Missed the prescribed ${d.reps} reps.${d.plus ? " Missing the + set minimum means your Training Max is too high. Lower it 10% next cycle." : ""}`], delta: "miss", dir: "down" };
    }
    return setFeedback({
      ex, set: x, index: i, prev,
      repMin: rxItem?.repMin ?? ex.repMin, repMax: rxItem?.repMax ?? ex.repMax, totalSets: rxItem?.sets ?? Math.max(3, sets.length),
    });
  });
}

function reviewRows(s, w, key, order, exById) {
  return order.map((id) => {
    const ex = exById[id];
    const sets = w.sets.filter((x) => x.exId === id);
    if (!sets.length) return null;
    const rxItem = w.plan?.items?.find((i) => i.exId === id);
    const rx = rxOf(rxItem);
    const prev = prevSession(s, ex, rx, key);
    let verdict;
    if (rxItem?.detail) {
      const missed = feedbackFor(s, ex, rxItem, prev, sets).some((f) => f.level === "warn");
      verdict = missed ? { kind: "down", text: "Missed prescribed reps on at least one set." } : { kind: "up", text: "Every prescribed set completed." };
    } else verdict = exerciseVerdict(sets, prev, s.baselines?.[id]);
    const exRx = rxItem && !rxItem.detail ? { ...ex, repMin: rxItem.repMin, repMax: rxItem.repMax, sets: rxItem.sets } : ex;
    const next = rxItem?.detail ? "Next time: follow the next 5/3/1 week." : `Next time: ${suggestNext(exRx, { ...s.workouts, [key]: w }, addDays(key, 1), rx || undefined, s.baselines?.[ex.id]).note.replace(/^Last: .*?Today: /, "")}`;
    const prs = sets.filter((x) => isPR(s.workouts, id, x, key, s.baselines?.[id])).length;
    return { ex, verdict, next, prs, volume: sets.reduce((t, x) => t + (+x.weight || 0) * +x.reps, 0) };
  }).filter(Boolean);
}

function workoutReview(s, w, key, order, exById) {
  const rows = reviewRows(s, w, key, order, exById);
  if (!rows.length) return "";
  const count = (k) => rows.filter((r) => r.verdict.kind === k).length;
  const prs = rows.reduce((t, r) => t + r.prs, 0);
  const volume = rows.reduce((t, r) => t + r.volume, 0);
  const headline = count("new") === rows.length ? "First session on these lifts: your baselines are set. Next time, each card shows exactly what to beat."
    : count("down") > count("up") ? "Tough day. Recover well and come back stronger."
    : count("up") ? "You're progressing. This is how muscle is built and kept." : "Solid work. Next session, push for one more rep.";
  return html`
    <section class="card review">
      <div class="sec-head"><h2>Coach's review</h2><span class="sec-meta">${Math.round(volume).toLocaleString()} lb moved${prs ? ` · ${prs} PR${prs === 1 ? "" : "s"}` : ""}</span></div>
      <p class="review-headline">${headline}</p>
      <div class="stats stats-4">
        ${stat("Progressed", count("up"), "lifts", count("up") ? "good" : "")}
        ${stat("Held", count("same"), "lifts")}
        ${stat("Down", count("down"), "lifts", count("down") ? "bad" : "")}
        ${count("new") ? stat("Baselines", count("new"), "set today", "good") : stat("PRs", prs, "today", prs ? "good" : "")}
      </div>
      <ul class="review-list">${rows.map((r) => html`
        <li><div class="review-row"><strong>${r.ex.name}</strong><span class="chip chip-${r.verdict.kind}">${VERDICT_LABEL[r.verdict.kind]}</span>${r.prs ? html`<span class="tag pr">${r.prs} PR</span>` : ""}</div>
          <div class="sub-line">${r.verdict.text}</div>
          <div class="next-line">${r.next}</div></li>`)}</ul>
    </section>`;
}

// Warm-up sets for one exercise card: a full ramp for the first lift that loads a muscle today,
// a single feeder set when an earlier lift already warmed it up.
function warmupFor(s, ex, w, rxItem, sug, nextWeight) {
  const exById = Object.fromEntries(s.exercises.map((e) => [e.id, e]));
  const order = [...new Set([...(w.order || []), ...w.sets.map((x) => x.exId)])];
  const muscleOf = (e) => e?.muscle || CATALOG[e?.name]?.[1];
  const before = order.slice(0, Math.max(0, order.indexOf(ex.id))).map((id) => exById[id]).filter(Boolean);
  const warm = before.some((e) => muscleOf(e) === muscleOf(ex) || (ex.kind === "lower" && e.kind === "lower" && /squat|deadlift|press|lunge/i.test(e.name)));
  const equipment = howOf(ex)?.equipment || "";
  if (rxItem?.detail) {
    const first = rxItem.detail[0];
    const tm = rxItem.tm || (first ? Math.round(first.weight / 0.65 / 5) * 5 : null);
    const plan = warmupSets({ workWeight: first?.weight, workReps: first?.reps || 5, equipment, warm: false, increment: ex.increment, tm });
    const sets = plan.sets.map((x) => ({ ...x, pct: Math.round((x.weight / tm) * 100) }));
    return { ...plan, sets, targetLabel: `your ${tm} lb Training Max`, note: "Jim Wendler's 5/3/1 warm-up: 40%, 50% and 60% of your Training Max." };
  }
  const target = +nextWeight || sug.weight;
  const plan = warmupSets({ workWeight: target, workReps: rxItem?.repMin ?? ex.repMin, equipment, warm, increment: ex.increment });
  return { ...plan, targetLabel: `${target} lb` };
}

// Two same-muscle substitutes for when equipment is taken or you'd rather do something else.
function swapBlock(s, ex, hasSets) {
  const subs = substitutesFor(ex);
  if (!subs.length) return "";
  return html`
    <details class="how swap">
      <summary>Swap exercise</summary>
      <p class="hint">${hasSets ? "You've logged sets on this already, so a substitute is added as an extra exercise." : "Same muscle, same movement pattern. Today's sets, reps and rest carry over; the new lift tracks its own progress."}</p>
      <ul class="sub-list">${subs.map((x) => html`
        <li>
          <div class="sub-top"><strong>${x.name}</strong>
            <button type="button" class="btn btn-sm" data-action="swap-ex" data-from="${ex.id}" data-to="${x.name}">${hasSets ? "Add" : "Use this instead"}</button></div>
          <span class="sub-line">${x.why}</span>
        </li>`)}</ul>
      ${s.program && !hasSets ? html`<label class="check"><input type="checkbox" name="always"> Use the swap every time this program calls for ${ex.name}</label>` : ""}
    </details>`;
}

const TARGET_LABEL = { up: "Add weight", deload: "Deload", reps: "Beat last time", new: "Target", carry: "Carried over" };

function exerciseCard(s, ex, w, key, open = true) {
  const sets = w.sets.filter((x) => x.exId === ex.id);
  const rxItem = w.plan?.items?.find((i) => i.exId === ex.id);
  const rx = rxOf(rxItem);
  let sug, nextWeight, nextReps;
  if (rxItem?.detail) {
    const d = rxItem.detail[Math.min(sets.length, rxItem.detail.length - 1)];
    sug = { note: rxItem.note, kind: w.plan.deload ? "deload" : "new" };
    nextWeight = d.weight;
    nextReps = d.reps;
  } else {
    const exRx = rxItem ? { ...ex, repMin: rxItem.repMin, repMax: rxItem.repMax, sets: rxItem.sets } : ex;
    sug = suggestNext(exRx, s.workouts, key, rx || undefined, s.baselines?.[ex.id]);
    nextReps = sug.repsPerSet?.[sets.length] ?? sug.reps;
    nextWeight = sets.length ? sets[sets.length - 1].weight : sug.weight;
  }
  const range = rxItem ? (rxItem.repMin === rxItem.repMax ? `${rxItem.repMin}` : `${rxItem.repMin}–${rxItem.repMax}`) : `${ex.repMin}–${ex.repMax}`;
  const target = rxItem ? (rxItem.detail ? `${rxItem.sets} sets` : `${rxItem.sets} × ${range}`) : `${range} reps`;
  const rest = rxItem?.rest;
  const prev = prevSession(s, ex, rx, key);
  const feedback = feedbackFor(s, ex, rxItem, prev, sets);
  const verdict = !rxItem?.detail && sets.length ? exerciseVerdict(sets, prev, s.baselines?.[ex.id]) : null;
  const inc = ex.increment || 5;
  const how = howOf(ex);
  const done = rxItem && sets.length >= rxItem.sets;
  const warm = warmupFor(s, ex, w, rxItem, sug, nextWeight);
  const deltaText = (fb) => fb.delta || (prev ? "—" : "new");
  const setRows = sets.length ? html`<ol class="set-list">${sets.map((x, i) => {
    const fb = feedback[i];
    return html`
      <li class="set-row fb-${fb.level}">
        <span class="set-n">${i + 1}</span>
        <span class="set-val"><strong>${x.weight}</strong><small> lb</small> × <strong>${x.reps}</strong>${x.rir !== undefined && x.rir !== "" ? html`<small> @${x.rir} RIR</small>` : ""}</span>
        ${isPR(s.workouts, ex.id, x, key, s.baselines?.[ex.id]) ? html`<span class="tag pr">PR</span>` : ""}
        <span class="delta delta-${fb.dir}" title="vs same set last session">${deltaText(fb)}</span>
        <button type="button" class="icon-btn" data-action="del-set" data-id="${x.id}" aria-label="Delete set ${i + 1}">✕</button>
        <p class="set-note">${fb.notes.join(" ")}</p>
      </li>`;
  })}</ol>` : "";

  if (!open) {
    return html`
      <section class="card ex-card is-collapsed${done ? " is-done" : ""}">
        <button type="button" class="ex-toggle" data-action="open-ex" data-id="${ex.id}" aria-expanded="false">
          <span><span class="ex-name">${ex.name}</span><span class="sub-line">${target}${verdict ? ` · ${VERDICT_LABEL[verdict.kind].toLowerCase()}` : ""}</span><span class="open-hint">${sets.length ? "Edit sets" : "Log sets"}</span></span>
          ${rxItem ? html`<span class="ex-count"><strong>${Math.min(sets.length, rxItem.sets)}</strong>/${rxItem.sets}</span>` : ""}
        </button>
        ${setRows}
      </section>`;
  }

  return html`
    <section class="card ex-card${done ? " is-done" : ""}">
      <div class="ex-head">
        <div>
          <h3>${ex.name}</h3>
          <div class="sub-line">${target}${rest ? ` · rest ${fmtRest(rest)}` : ""}</div>
        </div>
        ${rxItem ? html`<div class="ex-count" aria-label="${sets.length} of ${rxItem.sets} sets done"><strong>${Math.min(sets.length, rxItem.sets)}</strong>/${rxItem.sets}</div>` : ""}
      </div>

      <p class="target target-${sug.kind || "new"}"><span class="target-label">${TARGET_LABEL[sug.kind || "new"]}</span> ${sug.note}</p>
      ${rxItem?.note && !rxItem.detail ? html`<p class="hint">${rxItem.note}</p>` : ""}
      ${how?.cues?.[0] ? html`<p class="cue"><span class="target-label">Cue</span> ${how.cues[0]}</p>` : ""}

      ${warm.sets.length ? html`
        <details class="warmup-sets" ${sets.length ? "" : "open"}>
          <summary>Warm-up sets${sets.length ? " (done)" : ""} · ${warm.sets.length}</summary>
          <ul class="warm-list">${warm.sets.map((x) => html`<li><label class="check"><input type="checkbox"><span><strong>${x.weight}</strong> lb × <strong>${x.reps}</strong> <span class="sub-line">${x.pct}% of ${warm.targetLabel}</span></span></label></li>`)}</ul>
          <p class="hint">${warm.note} Warm-up sets aren't logged and don't count toward your progress.</p>
        </details>` : warm.note ? html`<p class="hint">${warm.note}</p>` : ""}
      ${rxItem?.detail ? html`<table class="table plan-table"><tr><th>Set</th><th>Weight</th><th>Reps</th><th></th></tr>
        ${rxItem.detail.map((d, i) => html`<tr class="${i < sets.length ? "done" : i === sets.length ? "next" : ""}"><td>${i + 1}</td><td>${d.weight} lb</td><td>${d.reps}${d.plus ? "+" : ""}</td><td class="sub-line">${d.label}</td></tr>`)}</table>` : ""}

      ${setRows}
      ${verdict ? html`<p class="verdict verdict-${verdict.kind}"><span class="target-label">${VERDICT_LABEL[verdict.kind]}</span> ${verdict.text}</p>` : ""}

      ${done && ui.extraSet !== ex.id ? html`
        <div class="done-panel">
          <p><strong>All ${rxItem.sets} sets done.</strong> ${!openItems(w).length ? "Nice work." : lastLiftDone(w) ? `That was the last lift. ${openItems(w)[0].name} has a set left if you want it.` : `Next: ${openItems(w)[0].name}.`}</p>
          <div class="set-actions">
            ${!openItems(w).length || lastLiftDone(w) ? html`<button type="button" class="btn" data-action="${w.finished ? "wrap-up" : "finish-open"}">${w.finished ? "See today's summary" : "Finish workout"}</button>` : html`<button type="button" class="btn" data-action="open-ex" data-id="${openItems(w)[0].exId}">Go to ${openItems(w)[0].name}</button>`}
            <button type="button" class="btn ghost" data-action="extra-set" data-id="${ex.id}">Log an extra set</button>
          </div>
        </div>` : html`
      <form class="set-form" data-form="set" data-ex="${ex.id}" data-rx="${rx}" data-rest="${rest || ""}">
        <div class="steppers">
          <div class="field">
            <span class="field-label">Weight, lb</span>
            <div class="stepper">
              <button type="button" data-step="-${inc}" aria-label="Minus ${inc} lb">−</button>
              <input name="weight" type="number" inputmode="decimal" step="0.5" min="0" value="${nextWeight ?? ""}" required aria-label="Weight in pounds">
              <button type="button" data-step="${inc}" aria-label="Plus ${inc} lb">+</button>
            </div>
          </div>
          <div class="field">
            <span class="field-label">Reps</span>
            <div class="stepper">
              <button type="button" data-step="-1" aria-label="One fewer rep">−</button>
              <input name="reps" type="number" inputmode="numeric" min="1" value="${nextReps}" required aria-label="Reps">
              <button type="button" data-step="1" aria-label="One more rep">+</button>
            </div>
          </div>
        </div>
        <fieldset class="seg">
          <legend>Reps left in the tank (RIR)</legend>
          ${["", 0, 1, 2, 3, 4].map((n) => html`<label><input type="radio" name="rir" value="${n}" ${n === "" ? "checked" : ""}><span>${n === "" ? "skip" : n === 4 ? "4+" : n}</span></label>`)}
        </fieldset>
        <div class="set-actions">
          <button class="btn btn-log" type="submit">Log set ${sets.length + 1}</button>
          ${rest ? html`<button type="button" class="btn ghost" data-action="rest" data-sec="${rest}">Rest ${fmtRest(rest)}</button>` : ""}
        </div>
      </form>`}

      ${rxItem?.swappedFrom ? html`<p class="hint">Swapped in for ${rxItem.swappedFrom}.</p>` : ""}
      ${rxItem?.detail ? "" : swapBlock(s, ex, sets.length > 0)}
      ${howBlock(how)}
      ${s.settings.apiKey ? html`<details class="how" ${ui.coach[ex.id] ? "open" : ""}><summary>Ask the coach</summary>
        <form data-form="ask-coach" data-ex="${ex.id}" class="inline">
          <label class="grow">Question about ${ex.name}<input name="q" placeholder="Heavier, or more reps? Lower back feels it." required></label>
          <button class="btn" type="submit" ${ui.coach[ex.id]?.loading ? "disabled" : ""}>Ask</button>
        </form>
        ${ui.coach[ex.id]?.loading ? html`<p class="hint">Thinking…</p>` : ""}
        ${ui.coach[ex.id]?.error ? html`<p class="error">${ui.coach[ex.id].error}</p>` : ""}
        ${ui.coach[ex.id]?.text ? html`<div class="reflection">${raw(renderMarkdown(ui.coach[ex.id].text))}</div>` : ""}
      </details>` : ""}
    </section>`;
}

function liftHistory(s, exId) {
  const h = sessionsFor(s.workouts, exId).slice(0, 6);
  if (!h.length) return html`<p class="small muted">No sessions logged for this lift yet.</p>`;
  return html`<table class="table"><tr><th>Date</th><th>Sets</th><th>Est. 1RM</th></tr>
    ${h.map((x) => html`<tr><td>${fmtDate(x.date, { month: "short", day: "numeric" })}</td><td>${x.sets.map((y) => `${y.weight}×${y.reps}`).join(", ")}</td><td>${round(bestE1rm(x.sets))}</td></tr>`)}
  </table>`;
}

function drawLiftChart(s) {
  const node = document.getElementById("lift-chart");
  if (!node || !ui.chartEx) return;
  const h = sessionsFor(s.workouts, ui.chartEx);
  lineChart(node, {
    unit: " lb",
    series: [{ name: "Estimated 1-rep max", kind: "line", cls: "s-1", points: h.map((x) => ({ x: parseKey(x.date), y: bestE1rm(x.sets) })) }],
  });
}

// ---------- FAITH ----------

function renderFaith(s) {
  const key = ui.date;
  const lit = liturgicalDay(key);
  const f = dayFaith(s, key);
  const rule = ruleItems(s, key);
  const m = mysteriesFor(key);
  const virtue = virtueOfWeek(key);
  const pasted = f.usccbGospel || null; // text the user pasted from the USCCB page (optional)
  const angelus = lit.easterSeason ? PRAYERS.reginaCaeli : PRAYERS.angelus;
  const prayerFor = {
    offering: html`<p class="prayer">${PRAYERS.morningOffering}</p>`,
    angelus: html`<div class="prayer">${angelus.map(([v, r]) => html`<p>${v}${r ? html`<br>${r}` : ""}</p>`)}</div>`,
    rosary: html`<ol class="prayer">${m.list.map((x) => html`<li>${x}</li>`)}</ol>`,
  };
  const offerings = Object.entries(s.workouts).filter(([, w]) => w.intention).sort((a, b) => (a[0] < b[0] ? 1 : -1)).slice(0, 12);

  const sub = ui.sub.faith;
  const head = dayHead(key, lit.season, html`<p class="day-note"><span class="swatch swatch-${lit.color}" aria-hidden="true"></span>${lit.season} · vestments ${lit.color}</p>`);

  if (sub === "pray") {
    return html`
      ${head}
      <section class="card">
        <div class="sec-head"><h2>Lectio Divina</h2><span class="sec-meta">${pasted?.source || "today's Gospel"}</span></div>
        <form data-form="lectio">
          ${LECTIO.map(([title, prompt, field]) => html`
            <div class="step"><strong>${title}</strong><p class="hint">${prompt}</p>
            ${field ? html`<textarea name="${field}" rows="2">${f.lectio?.[field] || ""}</textarea>` : ""}</div>`)}
          <button class="btn" type="submit">Save my prayer</button>
        </form>
      </section>

      <section class="card virtue">
        <div class="sec-head"><h2>Virtue of the week</h2><span class="sec-meta">${virtue.name}</span></div>
        <blockquote>${virtue.verse}<cite>${virtue.ref}</cite></blockquote>
        <dl class="pairs"><dt>Body</dt><dd>${virtue.body}</dd><dt>Soul</dt><dd>${virtue.soul}</dd><dt>Companion</dt><dd>${virtue.saint}. ${virtue.quote}</dd></dl>
      </section>

      <section class="card">
        <div class="sec-head"><h2>Evening Examen</h2><span class="sec-meta">5 minutes</span></div>
        <form data-form="examen">
          ${EXAMEN.map(([title, prompt], i) => html`
            <div class="step"><strong>${i + 1}. ${title}</strong><p class="hint">${prompt}</p>
            ${i >= 2 ? html`<textarea name="e${i}" rows="2">${f.examen?.["e" + i] || ""}</textarea>` : ""}</div>`)}
          <button class="btn" type="submit">Finish Examen</button>
        </form>
        <details><summary>Prayer to St. Michael</summary><p class="prayer">${PRAYERS.stMichael}</p></details>
      </section>`;
  }

  if (sub === "ledger") {
    const totalOffered = Object.values(s.workouts).filter((w) => w.offered || w.intention).length;
    return html`
      ${head}
      <div class="stats stats-3">
        ${stat("Streak", ruleStreak(s), "days with 5+ of 7")}
        ${stat("Today", `${rule.filter((i) => i.done).length}/7`, "practices kept")}
        ${stat("Offered", totalOffered, "workouts")}
      </div>
      <section class="card">
        <div class="sec-head"><h2>Spiritual ledger</h2></div>
        <p class="hint">Workouts you've offered, and for whom. Sweat that became prayer.</p>
        ${offerings.length ? html`<ul class="entries">${offerings.map(([k, w]) => html`<li><span>${fmtDate(k)}. <em>${w.intention}</em></span><span class="sub-line">${w.sets.length} sets</span></li>`)}</ul>`
          : html`<p class="muted">Set an intention on the Train tab to start your ledger.</p>`}
      </section>`;
  }

  return html`
    ${head}

    <section class="card">
      <div class="sec-head"><h2>Rule of life</h2><span class="sec-meta">${rule.filter((i) => i.done).length}/7 · ${ruleStreak(s)}-day streak</span></div>
      <p class="hint">The Disciplined Disciple: seven practices for body and soul. Workout and temperance check themselves from your logs.</p>
      <ul class="rule">${rule.map((i) => html`
        <li>
          <label class="check"><input type="checkbox" data-action="rule" data-id="${i.id}" ${i.done ? "checked" : ""} ${i.auto ? "disabled" : ""}>
            <span><strong>${i.label}</strong><span class="sub-line">${i.auto ? "Done, from your log" : i.hint}</span></span></label>
          ${prayerFor[i.id] ? html`<details><summary>Pray it</summary>${prayerFor[i.id]}</details>` : ""}
        </li>`)}</ul>
    </section>

    ${penanceCard(key)}

    <section class="card">
      <div class="sec-head"><h2>Today's readings</h2><span class="sec-meta">USCCB · NABRE</span></div>
      <p class="hint">The readings for ${fmtDate(key, { weekday: "long", month: "long", day: "numeric" })}, exactly as proclaimed at Mass in the U.S., from the United States Conference of Catholic Bishops.</p>
      <a class="btn full" href="${usccbUrl(key)}" target="_blank" rel="noopener">Open today's readings on USCCB ↗</a>
      <p class="hint">Read the Gospel there, then come back and pray with it under <button type="button" class="link-btn inline-link" data-sub-go="pray">Pray</button>.</p>
      ${pasted ? html`<div class="gospel-pasted"><div class="eyebrow">${pasted.source || "Your Gospel text"}</div><div class="gospel">${raw(esc(pasted.text).replace(/\n/g, "<br>"))}</div></div>` : ""}
      <details><summary>${pasted ? "Replace pasted Gospel" : "Keep the Gospel text here (optional)"}</summary>
        <p class="hint">Copy the Gospel from the USCCB page and paste it to keep it with your prayer for the day. It stays on your phone.</p>
        <form data-form="paste-gospel" class="grid-form">
          <label class="span2">Reference<input name="source" placeholder="Luke 12:39-48" value="${pasted?.source || ""}"></label>
          <label class="span2">Text<textarea name="text" rows="5" autocapitalize="sentences">${pasted?.text || ""}</textarea></label>
          <button class="btn span2" type="submit">Save</button>
        </form>
      </details>
    </section>

    <section class="card">
      <div class="sec-head"><h2>A Catholic reflection</h2></div>
      ${f.reflection ? html`<div class="reflection">${raw(renderMarkdown(f.reflection))}</div>
        <p class="tiny muted">AI-written reflection, meant to aid prayer — not Magisterial teaching. Test it against the Catechism and your priest.</p>`
      : s.settings.apiKey ? html`<p class="hint">An interpretation of today's USCCB Gospel rooted in the Fathers, the saints and the Catechism, with a resolution for today.</p>`
      : html`<p class="hint">Add an Anthropic API key on the Me tab to generate a daily Catholic interpretation of the Gospel. Meanwhile, pray with Lectio Divina under Pray.</p>`}
      ${s.settings.apiKey ? html`<button type="button" class="btn" data-action="reflect" ${ui.busy.reflect ? "disabled" : ""}>${ui.busy.reflect ? "Writing…" : f.reflection ? "Regenerate" : "Generate reflection"}</button>` : ""}
      ${ui.busy.reflectError ? html`<p class="error">${ui.busy.reflectError}</p>` : ""}
    </section>

`;
}

// ---------- ME ----------

// ---------- app status: connection, updates, install, storage, lock ----------

const status = {
  online: navigator.onLine, reachable: null, latest: null, lastCheck: null, checking: false,
  sw: "serviceWorker" in navigator ? "starting" : "unsupported", persisted: null, installPrompt: null,
};
let swReg = null;

const isStandalone = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const ago = (t) => { if (!t) return "never"; const m = Math.round((Date.now() - t) / 60000); return m < 1 ? "just now" : m < 60 ? `${m} min ago` : `${Math.round(m / 60)} h ago`; };
const daysSince = (iso) => (iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 86400000) : null);

async function checkForUpdates(manual = false) {
  if (status.checking) return;
  status.checking = true;
  status.online = navigator.onLine;
  try {
    const res = await fetch(`js/version.js?check=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) throw new Error(res.status);
    status.latest = (await res.text()).match(/APP_VERSION\s*=\s*"([^"]+)"/)?.[1] || null;
    status.reachable = true;
  } catch {
    status.reachable = false;
  }
  try { await swReg?.update(); } catch { /* offline */ }
  status.lastCheck = Date.now();
  status.checking = false;
  renderBanner();
  if (ui.tab === "me") render();
  if (manual) toast(!status.reachable ? "Can't reach the server right now" : status.latest && status.latest !== APP_VERSION ? "Update available" : "You're up to date");
}

function renderBanner() {
  const el = document.getElementById("app-banner");
  if (!el) return;
  const s = getState();
  const backupDays = daysSince(s.settings.lastExport);
  const hasData = Object.keys(s.workouts).length + Object.keys(s.foods).length > 3;
  let msg = "", action = "";
  if (status.latest && status.latest !== APP_VERSION) { msg = "A new version is ready."; action = html`<button type="button" class="btn btn-sm" data-action="reload-app">Update now</button>`; }
  else if (!status.online) msg = "Offline. Everything you log still saves on this phone.";
  else if (hasData && (backupDays === null || backupDays > 14)) { msg = backupDays === null ? "You haven't backed up your data yet." : `Last backup ${backupDays} days ago.`; action = html`<button type="button" class="btn btn-sm" data-action="export">Back up</button>`; }
  el.hidden = !msg;
  el.innerHTML = msg ? html`<span>${msg}</span>${action}`[RAW] : "";
}

function statusRow(label, value, tone = "") {
  return html`<div class="status-row"><dt>${label}</dt><dd class="${tone ? `tone-${tone}` : ""}">${value}</dd></div>`;
}

function statusCard(s) {
  const upToDate = !status.latest || status.latest === APP_VERSION;
  const backupDays = daysSince(s.settings.lastExport);
  const overall = !status.online ? ["warning", "Offline"] : status.reachable === false ? ["warning", "Can't reach server"] : !upToDate ? ["warning", "Update ready"] : ["good", "Connected"];
  return html`
    <section class="card">
      <div class="sec-head"><h2>App status</h2><span class="chip chip-${overall[0]}">${overall[1]}</span></div>
      <dl class="status-grid">
        ${statusRow("Version", upToDate ? `${APP_VERSION} · latest` : `${APP_VERSION} · ${status.latest} available`, upToDate ? "good" : "warn")}
        ${statusRow("Connection", !status.online ? "Offline" : status.reachable === false ? "Online, but the app server didn't answer" : status.reachable ? "Online · app server reachable" : "Checking…", status.online && status.reachable ? "good" : "warn")}
        ${statusRow("Last update check", ago(status.lastCheck))}
        ${statusRow("Works offline", status.sw === "active" ? "Yes" : status.sw === "unsupported" ? "Not supported on this browser" : "Setting up…", status.sw === "active" ? "good" : "warn")}
        ${statusRow("Installed", isStandalone() ? "Yes, running as a home-screen app" : "No, running in the browser", isStandalone() ? "good" : "warn")}
        ${statusRow("Data protection", status.persisted ? "Protected from automatic clearing" : isStandalone() ? "Home-screen app (kept by the phone)" : "Browser may clear it if unused", status.persisted || isStandalone() ? "good" : "warn")}
        ${statusRow("Last backup", backupDays === null ? "Never" : backupDays === 0 ? "Today" : `${backupDays} day${backupDays === 1 ? "" : "s"} ago`, backupDays !== null && backupDays <= 14 ? "good" : "warn")}
        ${statusRow("AI features", s.settings.apiKey ? "API key set" : "Off (no API key)", s.settings.apiKey ? "good" : "")}
      </dl>
      <div class="row">
        <button type="button" class="btn ghost" data-action="check-updates" ${status.checking ? "disabled" : ""}>${status.checking ? "Checking…" : "Check now"}</button>
        ${s.settings.apiKey ? html`<button type="button" class="btn ghost" data-action="test-key">Test API key</button>` : ""}
        ${upToDate ? "" : html`<button type="button" class="btn" data-action="reload-app">Update now</button>`}
      </div>
      <p class="hint">The app checks for updates every time you open it. Updates install themselves; you never need to reinstall.</p>
    </section>`;
}

function installCard() {
  if (isStandalone()) return "";
  return html`
    <section class="card">
      <div class="sec-head"><h2>Add to your home screen</h2></div>
      ${status.installPrompt ? html`<button type="button" class="btn full" data-action="install-app">Install Temple</button>` : isIOS() ? html`
        <ol class="steps">
          <li>Open this page in <strong>Safari</strong>. Other iPhone browsers can't install apps.</li>
          <li>Tap the <strong>Share</strong> button (the square with an arrow).</li>
          <li>Scroll down and tap <strong>Add to Home Screen</strong>, then <strong>Add</strong>.</li>
          <li>Open Temple from your home screen from now on. It runs full-screen and works offline.</li>
        </ol>
        <p class="hint">Data saved in Safari and in the home-screen app are kept separately. Set up from the home-screen app, or use Back up here and Restore there.</p>` : html`
        <ol class="steps">
          <li>In Chrome, tap the <strong>⋮</strong> menu.</li>
          <li>Tap <strong>Install app</strong> or <strong>Add to Home screen</strong>.</li>
        </ol>`}
    </section>`;
}

function securityCard(s) {
  return html`
    <section class="card">
      <div class="sec-head"><h2>Privacy and security</h2></div>
      <ul class="status-list">
        <li>Your food, workouts, weight and prayers are stored only on this phone. Nothing is uploaded to GitHub or any server.</li>
        <li>The app only loads code from itself, plus fonts and (if you add a key) Anthropic. Anything else is blocked. Daily readings open on the USCCB website.</li>
        <li>Your API key is stored only on this phone and sent only to Anthropic. Set a monthly spending limit at console.anthropic.com.</li>
      </ul>
      <h3 class="entry-title">App lock</h3>
      ${s.settings.pinHash ? html`
        <p class="hint">A PIN is required each time the app opens, and after 5 minutes in the background.</p>
        <div class="row">
          <button type="button" class="btn ghost" data-action="lock-now">Lock now</button>
          <button type="button" class="btn ghost" data-action="remove-pin">Remove PIN</button>
        </div>` : html`
        <form data-form="set-pin" class="inline">
          <label class="grow">Set a 4–8 digit PIN<input name="pin" type="password" inputmode="numeric" pattern="[0-9]{4,8}" minlength="4" maxlength="8" autocomplete="new-password" required></label>
          <button class="btn" type="submit">Set PIN</button>
        </form>
        <p class="hint">Keeps others out if your phone is unlocked. It's a privacy lock, not encryption.</p>`}
      ${s.settings.apiKey ? html`<button type="button" class="btn ghost full" data-action="remove-key">Remove API key from this phone</button>` : ""}
    </section>`;
}

// ---------- PIN lock ----------

async function hashPin(pin, salt) {
  const bytes = new TextEncoder().encode(`${salt}:${pin}`);
  return [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function showLock() {
  if (document.getElementById("lock")) return;
  const el = document.createElement("div");
  el.id = "lock";
  el.className = "lock";
  el.innerHTML = html`
    <form class="lock-box" data-lock>
      <div class="brand"><span class="brand-mark" aria-hidden="true">✠</span>TEMPLE</div>
      <label>Enter your PIN<input name="pin" type="password" inputmode="numeric" autocomplete="current-password" maxlength="8" autofocus required></label>
      <p class="error" id="lock-msg" hidden>Wrong PIN. Try again.</p>
      <button class="btn full" type="submit">Unlock</button>
      <button class="link-btn" type="button" data-forgot>Forgot PIN?</button>
    </form>`[RAW];
  document.body.append(el);
  el.querySelector("input").focus();
  el.querySelector("form").addEventListener("submit", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const st = getState().settings;
    const ok = (await hashPin(e.target.pin.value, st.pinSalt)) === st.pinHash;
    if (!ok) { el.querySelector("#lock-msg").hidden = false; e.target.pin.value = ""; return; }
    try { sessionStorage.setItem("temple-unlocked", "1"); } catch { /* private mode */ }
    el.remove();
  });
  el.querySelector("[data-forgot]").addEventListener("click", () => {
    if (confirm("There's no way to recover a PIN. Erase all app data on this phone and start over? Restore from a backup afterwards if you have one.")) {
      localStorage.clear();
      location.reload();
    }
  });
}

function needsUnlock() {
  if (!getState().settings.pinHash) return false;
  try { return sessionStorage.getItem("temple-unlocked") !== "1"; } catch { return true; }
}

let hiddenAt = 0;
document.addEventListener("visibilitychange", () => {
  if (document.hidden) { hiddenAt = Date.now(); return; }
  if (getState().settings.pinHash && Date.now() - hiddenAt > 5 * 60000 && hiddenAt) {
    try { sessionStorage.removeItem("temple-unlocked"); } catch { /* ignore */ }
    showLock();
  }
  checkForUpdates();
});

function renderMe(s) {
  return html`${goalCard(s)}${statusCard(s)}${installCard()}${renderMeSettings(s)}${securityCard(s)}`;
}

// Step-by-step: the person's own numbers through each formula.
function mathBlock(t) {
  const m = t.math;
  const n = (x) => Math.round(x).toLocaleString();
  const act = ACTIVITY_LEVELS.find(([v]) => v === +m.activity)?.[1] || "";
  return html`
    <details class="math"><summary>Show my math</summary>
      <ol class="math-steps">
        <li><span class="eyebrow">1 · Calories burned at rest (BMR)</span>
          Mifflin–St Jeor: 10 × ${m.kg.toFixed(1)} kg + 6.25 × ${Math.round(m.cm)} cm − 5 × ${m.age} years ${m.sex === "male" ? "+ 5" : "− 161"} = <strong>${n(t.bmr)} kcal</strong>
          <span class="sub-line">${m.w} lb is ${m.kg.toFixed(1)} kg. Uses your latest weigh-in.</span></li>
        <li><span class="eyebrow">2 · Calories burned in a day</span>
          ${n(t.bmr)} × ${m.activity} for "${act}" = <strong>${n(t.tdee)} kcal</strong>
          <span class="sub-line">This is the number to check first. Most people pick an activity level that's too high; if you have a desk job and lift, "Light" is usually right.</span></li>
        <li><span class="eyebrow">3 · Your goal: ${GOALS[t.mode].short.toLowerCase()}</span>
          ${t.mode === "maintain" ? html`Eat at maintenance: <strong>${n(t.calories)} kcal</strong>` : html`${n(t.tdee)} ${m.adjust < 0 ? "−" : "+"} ${n(Math.abs(m.adjust))} (${t.rate} lb/week × 500) = <strong>${n(m.rawCalories)} kcal</strong>`}
          ${m.floored ? html`<span class="sub-line">Raised to the ${m.floor} kcal minimum; eating less than that costs muscle and is hard to sustain.</span>` : ""}
          ${t.rateCapped ? html`<span class="sub-line">Rate capped at ${t.maxRate} lb/week (1% of body weight).</span>` : ""}</li>
        <li><span class="eyebrow">4 · Protein</span>
          ${n(m.proteinBase)} lb (${t.proteinBasis === "goal" ? "goal" : "current"} weight) × ${m.proteinPerLb} g = <strong>${t.protein} g</strong>
          <span class="sub-line">That's ${m.gPerKg.toFixed(1)} g per kg of your body weight.</span></li>
        <li><span class="eyebrow">5 · Fat</span>
          The larger of ${n(m.fatFloor)} g (0.3 g per lb) and ${n(m.fatShare)} g (25% of calories) = <strong>${t.fat} g</strong></li>
        <li><span class="eyebrow">6 · Carbs</span>
          What's left: (${n(m.rawCalories)} − ${t.protein} × 4 − ${t.fat} × 9) ÷ 4 = <strong>${t.carbs} g</strong></li>
      </ol>
      ${m.overridden ? html`<p class="small warn-text">You've set custom targets, so the numbers above the math use those instead.</p>` : ""}
    </details>`;
}

function goalCard(s) {
  const p = s.profile;
  const target = targetsFor(s);
  return html`
    <section class="card" id="goal-card">
      <div class="sec-head"><h2>Your goal</h2><span class="sec-meta">Pick one; you can change it any time</span></div>
      <div class="goal-pick" role="radiogroup" aria-label="Your goal">${Object.entries(GOALS).map(([k, g]) => html`
        <button type="button" role="radio" aria-checked="${k === target.mode}" class="goal-opt${k === target.mode ? " is-on" : ""}" data-action="set-goal" data-goal="${k}">
          <strong>${g.label}</strong>
        </button>`)}</div>
      <p class="goal-expect"><span class="eyebrow">What to expect</span> ${GOALS[target.mode].expect}</p>
      ${target.mode === "cut" && p.goalWeightLb >= (latestWeight(s.weights) || p.weightLb) ? html`<p class="small warn-text">Your goal weight isn't below your current weight. Lower it under Your details so the app can project your finish date.</p>` : ""}
      ${target.mode === "bulk" && p.goalWeightLb <= (latestWeight(s.weights) || p.weightLb) ? html`<p class="small muted">Optional: set a goal weight above your current weight to see a projected date.</p>` : ""}
    </section>`;
}

function renderMeSettings(s) {
  const p = s.profile;
  const target = targetsFor(s);
  const o = p.overrides || {};
  return html`
    <section class="card">
      <h2>Your details</h2>
      <form data-form="profile" class="grid-form">
        <label>Sex<select name="sex"><option value="male" ${p.sex === "male" ? "selected" : ""}>Male</option><option value="female" ${p.sex === "female" ? "selected" : ""}>Female</option></select></label>
        <label>Age<input name="age" type="number" min="14" max="100" value="${p.age}"></label>
        <label>Height (in)<input name="heightIn" type="number" min="48" max="96" step="0.5" value="${p.heightIn}"></label>
        <label>Start weight (lb)<input name="weightLb" type="number" step="0.1" value="${p.weightLb}"></label>
        <label>Goal weight (lb)<input name="goalWeightLb" type="number" step="0.1" value="${p.goalWeightLb}"></label>
        ${RATE_OPTIONS[target.mode] ? html`<label>${target.mode === "cut" ? "Loss" : "Gain"} rate (lb/week)<select name="${target.mode === "cut" ? "rateLbPerWeek" : "gainRateLbPerWeek"}">${RATE_OPTIONS[target.mode].map((r) => html`<option value="${r}" ${(target.mode === "cut" ? +p.rateLbPerWeek : target.rate) === r ? "selected" : ""}>${r}</option>`)}</select></label>` : ""}
        <label class="span2">Activity<select name="activity">${ACTIVITY_LEVELS.map(([v, l]) => html`<option value="${v}" ${+p.activity === v ? "selected" : ""}>${l}</option>`)}</select></label>
        <button class="btn span2" type="submit">Save goals</button>
      </form>
    </section>

    <section class="card">
      <h2>Food preferences</h2>
      <form data-form="prefs" class="grid-form">
        <label class="span2">Diet for your daily menu<select name="diet">${Object.entries(DIETS).map(([k, v]) => html`<option value="${k}" ${k === (p.diet || "everything") ? "selected" : ""}>${v.label}</option>`)}</select></label>
        <label class="check span2"><input type="checkbox" name="meatlessFridays" ${p.meatlessFridays ? "checked" : ""}> Meatless menus on every Friday (Lenten Fridays and Ash Wednesday are always meatless)</label>
        <label class="check span2"><input type="checkbox" name="preworkout" ${p.preworkout !== false ? "checked" : ""}> Include a pre-workout meal in my daily menu</label>
        <button class="btn span2" type="submit">Save preferences</button>
      </form>
    </section>

    <section class="card">
      <h2>Your daily targets</h2>
      <table class="table">
        <tr><td>Maintenance (TDEE)</td><td>${target.tdee} kcal</td></tr>
        <tr><td><strong>Calories</strong></td><td><strong>${target.calories} kcal</strong></td></tr>
        <tr><td>Protein</td><td>${target.protein} g</td></tr>
        <tr><td>Carbs</td><td>${target.carbs} g</td></tr>
        <tr><td>Fat</td><td>${target.fat} g</td></tr>
      </table>
      ${target.rateCapped ? html`<p class="small warn-text">Rate capped at ${target.maxRate} lb/week (~1% of bodyweight) so you keep your muscle.</p>` : ""}
      ${target.canChooseBasis ? html`
        <p class="field-label">Base protein on</p>
        <div class="seg-tabs">
          <button type="button" class="${target.proteinBasis === "goal" ? "is-on" : ""}" data-action="protein-basis" data-basis="goal">Goal weight · ${target.proteinIf.goal} g</button>
          <button type="button" class="${target.proteinBasis === "current" ? "is-on" : ""}" data-action="protein-basis" data-basis="current">Current weight · ${target.proteinIf.current} g</button>
        </div>
        <p class="small muted">Both are inside the 1.6–2.2 g per kg that research shows protects muscle while dieting. Current weight is a little more, and helps keep you full.</p>` : ""}
      ${mathBlock(target)}
      <p class="small muted">How it's built for <strong>${GOALS[target.mode].short.toLowerCase()}</strong>: Mifflin–St Jeor BMR × activity${target.mode === "maintain" ? ", eaten at maintenance" : `, ${target.losing ? "minus" : "plus"} ~${Math.round(target.rate * 500)} kcal a day (${target.rate} lb/week)`}. ${target.losing ? "Protein is 1 g per lb of goal weight, the single biggest lever for keeping muscle while eating below maintenance." : "Protein is 0.8 g per lb of body weight (about 1.8 g/kg), enough to build muscle."} Fat has a floor for hormones; carbs fill the rest to fuel your lifts. Recalculates as your weigh-ins change.</p>
      <details><summary>Set custom targets</summary>
        <form data-form="overrides" class="grid-form">
          <label>Calories<input name="calories" type="number" value="${o.calories || ""}" placeholder="${target.calories}"></label>
          <label>Protein g<input name="protein" type="number" value="${o.protein || ""}"></label>
          <label>Carbs g<input name="carbs" type="number" value="${o.carbs || ""}"></label>
          <label>Fat g<input name="fat" type="number" value="${o.fat || ""}"></label>
          <button class="btn span2" type="submit">Save (blank = automatic)</button>
        </form>
      </details>
    </section>

    <section class="card">
      <h2>Catholic reflections (optional)</h2>
      <p class="small muted">To get a daily AI-written Catholic interpretation of the Gospel, paste an Anthropic API key from console.anthropic.com. It's stored only on this device and sent only to Anthropic. Each reflection costs a few cents.</p>
      <form data-form="apikey" class="inline">
        <label class="grow">API key<input name="apiKey" type="password" autocomplete="off" value="${s.settings.apiKey}" placeholder="sk-ant-…"></label>
        <button class="btn" type="submit">Save</button>
      </form>
    </section>

    <section class="card">
      <h2>Backup</h2>
      <p class="small muted">Your data lives only in this browser. Export regularly.</p>
      <div class="row">
        <button type="button" class="btn" data-action="export">Export</button>
        <label class="btn ghost">Import<input type="file" accept="application/json" data-action="import" hidden></label>
      </div>
    </section>`;
}

// ---------- render & events ----------

const RENDER = { today: renderToday, food: renderFood, train: renderTrain, faith: renderFaith, me: renderMe };

function render() {
  const s = getState();
  if (!RENDER[ui.tab]) ui.tab = "today";
  const label = document.getElementById("date-label");
  label.textContent = ui.date === dateKey() ? "Today" : fmtDate(ui.date);
  document.querySelectorAll(".tabs button").forEach((b) => b.setAttribute("aria-current", b.dataset.tab === ui.tab ? "page" : "false"));
  document.body.dataset.season = liturgicalDay(ui.date).color;
  renderSubnav();
  view.innerHTML = RENDER[ui.tab](s)[RAW];
  if (ui.tab === "today") drawWeightChart(s);
  if (ui.tab === "train") drawLiftChart(s);
}

function renderSubnav() {
  const nav = document.getElementById("subnav");
  const subs = SUBS[ui.tab];
  nav.hidden = !subs;
  nav.innerHTML = subs ? subs.map(([id, label]) => `<button type="button" data-sub="${id}" aria-pressed="${ui.sub[ui.tab] === id}">${label}</button>`).join("") : "";
}

function go(tab) {
  ui.tab = tab;
  history.replaceState(null, "", `#${tab}`);
  render();
  window.scrollTo(0, 0);
}

const num = (v) => (v === "" || v == null ? 0 : +v);
const formData = (form) => Object.fromEntries(new FormData(form).entries());

function ensureFaith(s, key) {
  return (s.faith[key] ??= { checks: {}, lectio: {}, examen: {} });
}

function ensureExercise(st, name, repMin, repMax) {
  let ex = st.exercises.find((e) => e.name.toLowerCase() === name.toLowerCase());
  const meta = CATALOG[name];
  const info = exerciseInfo(name);
  if (info) { repMin ??= info.repMin; repMax ??= info.repMax; }
  if (!ex) {
    ex = { id: uid(), name, kind: meta?.[0] || "upper", muscle: meta?.[1], repMin, repMax, increment: meta?.[2] || 5 };
    st.exercises.push(ex);
  } else if (!ex.muscle && meta) ex.muscle = meta[1];
  return ex;
}

function logPlanItems(indexes) {
  const s = getState();
  const plan = s.plans[ui.date];
  if (!plan || !indexes.length) return;
  const items = hydrate(plan, recipePool(s.webRecipes));
  update((st) => {
    for (const idx of indexes) {
      const item = items[idx];
      if (!item || plan.items[idx].logged) continue;
      const m = scaled(item.recipe, item.mult);
      const meal = SLOTS.find((x) => x.id === item.slot).meal;
      const r1 = (x) => Math.round(x * 10) / 10;
      (st.foods[ui.date] ??= []).push({
        id: uid(), name: `${item.recipe.name}${item.mult !== 1 ? ` ×${item.mult}` : ""}`, meal,
        cal: round(m.cal), p: r1(m.p), c: r1(m.c), f: r1(m.f), meat: item.recipe.flags?.has?.("m") || false,
      });
      st.plans[ui.date].items[idx].logged = true;
    }
  });
  toast(indexes.length > 1 ? "Menu logged" : "Logged");
}

// Fill a textarea from the clipboard (needs a tap; iOS shows a small "Paste" confirmation).
async function pasteInto(textarea) {
  try {
    const text = await navigator.clipboard.readText();
    if (!text.trim()) return toast("Clipboard is empty");
    textarea.value = text;
    textarea.focus();
  } catch {
    textarea.focus();
    toast("Long-press the box and choose Paste");
  }
}

// ---------- rest timer ----------
let restTimer = null;
function startRest(sec) {
  stopRest();
  const el = document.createElement("div");
  el.id = "rest-timer";
  el.className = "rest-timer";
  el.setAttribute("role", "timer");
  const label = document.createElement("span");
  const skip = document.createElement("button");
  skip.type = "button";
  skip.className = "btn btn-sm";
  skip.textContent = "Skip";
  skip.addEventListener("click", stopRest);
  el.append(label, skip);
  document.body.append(el);
  const end = Date.now() + sec * 1000;
  const token = {};
  restTimer = token;
  const tick = () => {
    if (restTimer !== token) return;
    const left = Math.max(0, Math.ceil((end - Date.now()) / 1000));
    label.textContent = left ? `Rest ${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}` : "Rest done. Next set.";
    if (!left) {
      clearInterval(token.id);
      navigator.vibrate?.([200, 100, 200]);
      skip.textContent = "Done";
      setTimeout(() => { if (restTimer === token) stopRest(); }, 5000);
    }
  };
  token.id = setInterval(tick, 250);
  tick();
}
function stopRest() {
  if (restTimer) clearInterval(restTimer.id);
  restTimer = null;
  document.getElementById("rest-timer")?.remove();
}

function ensureWorkout(s, key) {
  const w = (s.workouts[key] ??= { intention: "", offered: false, order: [], sets: [] });
  w.order ??= [];
  return w;
}

const forms = {
  weight(d) { update((s) => { s.weights[ui.date] = +d.lb; }); },
  food(d) {
    const p = num(d.p), c = num(d.c), f = num(d.f);
    const cal = d.cal === "" ? round(p * 4 + c * 4 + f * 9) : num(d.cal);
    update((s) => {
      (s.foods[ui.date] ??= []).push({ id: uid(), name: d.name.trim(), meal: d.meal, cal, p, c, f, meat: !!d.meat });
      if (d.save && !s.savedFoods.some((x) => x.name === d.name.trim())) s.savedFoods.push({ name: d.name.trim(), cal, p, c, f });
    });
  },
  intention(d) { update((s) => { ensureWorkout(s, ui.date).intention = d.intention.trim(); }); },
  "ex-search"(d) {
    ui.exQuery = d.q;
    ui.exPick = null;
    ui.exLookup = null;
    const q = d.q.trim();
    const top = q && matchExercise(q, getState().exercises)[0];
    if (q && (!top || top.score < MATCH_MAYBE) && getState().settings.apiKey) return startLookup(q);
    render();
  },
  "confirm-ex"(d) {
    const L = ui.exLookup;
    const repMin = Math.max(1, +d.repMin || 8), repMax = Math.max(repMin, +d.repMax || 12);
    update((st) => {
      let ex = st.exercises.find((e) => e.name.toLowerCase() === d.name.trim().toLowerCase());
      if (!ex) {
        ex = {
          id: uid(), name: d.name.trim(), kind: d.kind, muscle: d.muscle, repMin, repMax, increment: Math.max(0, +d.increment || 0),
          aliases: [...new Set([L.query, ...(L.data.aliases || [])])], how: L.data.how, verified: true,
        };
        st.exercises.push(ex);
      }
      addToToday(st, ex.id);
    });
    ui.exQuery = ""; ui.exLookup = null; ui.exPick = null;
    render();
    toast("Exercise verified and added");
  },
  "parse-maxes"(d) {
    if (!d.text.trim()) return toast("Type or paste your maxes first");
    ui.maxText = d.text;
    ui.maxParsed = parseMaxes(d.text, getState().exercises);
    render();
  },
  "save-maxes"(d) {
    const rows = ui.maxParsed || [];
    let n = 0;
    update((st) => {
      st.baselines ??= {};
      rows.forEach((r, i) => {
        if (r.error) return;
        const pick = d[`ex${i}`] || r.exercise;
        const weight = +d[`w${i}`], reps = Math.max(1, +d[`r${i}`] || 1);
        if (!pick || !(weight > 0)) return;
        let ex;
        if (pick.startsWith("new:")) {
          const name = pick.slice(4);
          ex = st.exercises.find((e) => e.name.toLowerCase() === name.toLowerCase());
          if (!ex) { ex = { id: uid(), name, kind: "upper", repMin: 8, repMax: 12, increment: 5, aliases: [r.name] }; st.exercises.push(ex); }
        } else ex = ensureExercise(st, pick);
        st.baselines[ex.id] = { weight, reps, e1rm: e1rm(weight, reps), date: ui.date };
        n++;
      });
    });
    ui.maxParsed = null;
    ui.maxText = "";
    render();
    toast(`Saved ${n} maxes`);
  },
  "parse-workout"(d) {
    if (!d.text.trim()) return toast("Type or paste your workout first");
    ui.parsedText = d.text;
    ui.parsed = parseWorkoutText(d.text, getState().exercises);
    render();
  },
  "log-parsed"(d) {
    const rows = ui.parsed || [];
    update((st) => {
      const w = ensureWorkout(st, ui.date);
      rows.forEach((r, i) => {
        if (r.error) return;
        const pick = d[`ex${i}`] || r.exercise;
        let ex;
        if (pick.startsWith("new:")) {
          const name = pick.slice(4);
          ex = st.exercises.find((e) => e.name.toLowerCase() === name.toLowerCase());
          if (!ex) {
            ex = { id: uid(), name, kind: "upper", muscle: undefined, repMin: Math.max(1, r.reps - 2), repMax: r.reps + 2, increment: 5, aliases: [r.name] };
            st.exercises.push(ex);
          }
        } else {
          ex = ensureExercise(st, pick);
        }
        if (!w.order.includes(ex.id)) w.order.push(ex.id);
        for (let n = 0; n < r.sets; n++) w.sets.push({ id: uid(), exId: ex.id, weight: r.weight, reps: r.reps });
      });
    });
    const total = rows.filter((r) => !r.error).reduce((t, r) => t + r.sets, 0);
    ui.parsed = null;
    ui.parsedText = "";
    render();
    toast(`Logged ${total} sets`);
  },
  async "find-restaurant"(d) {
    const restaurant = d.restaurant.trim(), order = d.order.trim();
    if (!restaurant || !order) return toast("Add the restaurant and what you got");
    ui.rest = { loading: true, restaurant, order };
    render();
    try {
      ui.rest = { restaurant, order, data: await findRestaurantNutrition({ apiKey: getState().settings.apiKey, restaurant, order }) };
    } catch (err) {
      ui.rest = { restaurant, order, error: err.message };
    }
    render();
  },
  "log-restaurant"(d) {
    const data = ui.rest?.data;
    if (!data) return;
    const r1 = (v) => Math.round(v * 10) / 10;
    const entries = data.items.map((x, i) => {
      if (!d[`use${i}`]) return null;
      const k = Math.max(0, +d[`qty${i}`] || 0);
      if (!k) return null;
      return { id: uid(), meal: d.meal, name: `${data.restaurant}: ${x.name}${k !== 1 ? ` ×${k}` : ""}`, cal: Math.round(x.calories * k), p: r1(x.protein * k), c: r1(x.carbs * k), f: r1(x.fat * k) };
    }).filter(Boolean);
    if (!entries.length) return toast("Nothing selected");
    update((st) => { (st.foods[ui.date] ??= []).push(...entries); });
    ui.rest = null;
    render();
    toast(`Logged ${entries.reduce((t, e) => t + e.cal, 0)} kcal from ${data.restaurant}`);
  },
  "scan-log"(d) {
    const k = Math.max(0.25, +d.servings || 1);
    const r1 = (v) => Math.round(num(v) * k * 10) / 10;
    const entry = { id: uid(), name: `${d.name.trim()}${k !== 1 ? ` ×${k}` : ""}`, meal: d.meal, cal: Math.round(num(d.cal) * k), p: r1(d.p), c: r1(d.c), f: r1(d.f) };
    update((st) => {
      (st.foods[ui.date] ??= []).push(entry);
      if (d.save && !st.savedFoods.some((x) => x.name === d.name.trim())) st.savedFoods.push({ name: d.name.trim(), cal: num(d.cal), p: num(d.p), c: num(d.c), f: num(d.f) });
    });
    ui.scan = null;
    render();
    toast(`Logged ${entry.cal} kcal`);
  },
  async "ask-coach"(d, form) {
    const s = getState();
    const ex = s.exercises.find((e) => e.id === form.dataset.ex);
    if (!ex) return;
    const recent = sessionsFor(s.workouts, ex.id).slice(0, 4).map((h) => `${h.date}: ${h.sets.map((x) => `${x.weight}x${x.reps}${x.rir !== undefined && x.rir !== "" ? `@${x.rir}RIR` : ""}`).join(", ")}`).join("; ");
    ui.coach[ex.id] = { loading: true };
    render();
    try {
      ui.coach[ex.id] = { text: await askCoach({ apiKey: s.settings.apiKey, exercise: `${ex.name} (target ${ex.repMin}–${ex.repMax} reps)`, question: d.q.trim(), recent }) };
    } catch (err) {
      ui.coach[ex.id] = { error: err.message };
    }
    render();
  },
  "add-ex"(d) { if (d.exId) update((s) => { const w = ensureWorkout(s, ui.date); if (!w.order.includes(d.exId)) w.order.push(d.exId); }); ui.chartEx = d.exId; },
  set(d, form) {
    const set = { id: uid(), exId: form.dataset.ex, weight: +d.weight, reps: +d.reps };
    if (d.rir !== "" && d.rir !== undefined) set.rir = +d.rir;
    if (form.dataset.rx) set.rx = form.dataset.rx;
    let justFinished = false, absDone = false;
    update((s) => {
      const w = ensureWorkout(s, ui.date);
      const wasComplete = programComplete(w);
      w.sets.push(set);
      const rxItem = w.plan?.items?.find((i) => i.exId === set.exId);
      if (w.sets.filter((x) => x.exId === set.exId).length >= (rxItem?.sets ?? 99)) ui.openEx = null;
      const item = w.plan?.items?.find((i) => i.exId === set.exId && !i.extra);
      const exJustDone = item && w.sets.filter((x) => x.exId === set.exId).length === item.sets;
      justFinished = !w.finished && ((!wasComplete && programComplete(w)) || (exJustDone && (lastLiftDone(w) || !openItems(w).length)));
      const abs = (w.plan?.items || []).filter((i) => i.extra);
      absDone = !justFinished && w.finished && !w.wrapped && abs.some((i) => i.exId === set.exId) && abs.every((i) => w.sets.filter((x) => x.exId === i.exId).length >= i.sets);
    });
    if (justFinished) { stopRest(); return showFinisherSheet(); }
    if (absDone) { stopRest(); return afterExtra("abs"); }
    if (form.dataset.rest) startRest(+form.dataset.rest);
  },
  "new-ex"(d) {
    const repMin = +d.repMin, repMax = Math.max(+d.repMax, repMin);
    update((s) => { s.exercises.push({ id: uid(), name: d.name.trim(), kind: d.kind, muscle: d.muscle, repMin, repMax, increment: +d.increment }); });
  },
  "start-program"(d, form) {
    const id = form.dataset.id;
    const tm = {};
    if (id === "bbb531") TM_LIFTS.forEach((n) => { tm[n] = round5(+d[n] * 0.9); });
    startProgram(id, tm, +d.day || 0);
  },
  "set-day"(d) {
    const day = +d.day || 0;
    update((st) => {
      const prog = st.program;
      const len = PROGRAMS[prog.id].plan.length;
      const w = st.workouts[ui.date];
      const loadedToday = w?.plan?.programId === prog.id;
      if (loadedToday && !w.sets.length) { delete w.plan; w.order = []; }
      // If today's session is already logged, the choice applies to the next workout.
      const done = sessionsBefore(st.workouts, prog.id, ui.date) + (loadedToday && w.sets.length ? 1 : 0);
      prog.offset = mod(day - done, len);
    });
    toast(`Next workout: ${PROGRAMS[getState().program.id].plan[day].name}`);
  },
  "log-cardio"(d) {
    const min = Math.max(1, Math.min(180, +d.min || 0));
    update((st) => { (ensureWorkout(st, ui.date).cardio ??= []).push({ type: d.type, min }); });
    afterExtra("cardio");
  },
  "log-sauna"(d) {
    const min = Math.max(0, Math.min(60, +d.min || 0));
    update((st) => { ensureWorkout(st, ui.date).sauna = min ? { min } : undefined; });
    if (!min) return toast("Cleared");
    if (min > SAUNA_MAX_MIN) toast(`That's over the ${SAUNA_MAX_MIN}-minute limit. Next time get out at ${SAUNA_MAX_MIN} or sooner, and drink extra water now.`);
    update((st) => { ensureWorkout(st, ui.date).wrapped = true; });
    showSummary();
  },
  "sauna-on"(d) {
    if (!d.ack) return toast("Please read and check the safety list first");
    update((st) => { st.profile.sauna = { enabled: true, level: d.level, ackDate: new Date().toISOString() }; });
    toast("Sauna guidance on");
  },
  "sauna-level"(d) { update((st) => { st.profile.sauna = { ...st.profile.sauna, level: d.level }; }); },
  prefs(d) {
    update((s) => { s.profile.diet = d.diet; s.profile.meatlessFridays = !!d.meatlessFridays; s.profile.preworkout = !!d.preworkout; });
    toast("Preferences saved");
  },
  async "web-recipes"(d) {
    const s = getState();
    const target = targetsFor(s);
    const share = SLOT_SHARE[d.slot];
    ui.busy = { web: true };
    ui.webResults = [];
    render();
    try {
      const found = await findWebRecipes({
        apiKey: s.settings.apiKey, slot: d.slot, dietLabel: DIETS[d.diet].label, extra: d.extra.trim(),
        target: { cal: target.calories * share, p: target.protein * share, c: target.carbs * share, f: target.fat * share },
      });
      ui.busy = found.length ? {} : { webError: "No matching recipes found. Try a different request." };
      ui.webResults = found;
    } catch (err) {
      ui.busy = { webError: err.message };
    }
    render();
  },
  lectio(d) { update((s) => { ensureFaith(s, ui.date).lectio = d; ensureFaith(s, ui.date).checks.gospel = true; }); },
  examen(d) { update((s) => { ensureFaith(s, ui.date).examen = d; ensureFaith(s, ui.date).checks.examen = true; }); },
  "paste-gospel"(d) {
    const text = d.text.trim();
    update((s) => {
      const f = ensureFaith(s, ui.date);
      if (text) f.usccbGospel = { source: d.source.trim(), text };
      else delete f.usccbGospel;
    });
    toast(text ? "Saved" : "Cleared");
  },
  profile(d) {
    update((s) => {
      Object.assign(s.profile, {
        sex: d.sex, age: +d.age, heightIn: +d.heightIn, weightLb: +d.weightLb,
        goalWeightLb: +d.goalWeightLb, activity: +d.activity,
      });
      if (d.rateLbPerWeek) s.profile.rateLbPerWeek = +d.rateLbPerWeek;
      if (d.gainRateLbPerWeek) s.profile.gainRateLbPerWeek = +d.gainRateLbPerWeek;
    });
    toast("Goals saved");
  },
  overrides(d) {
    const o = { calories: num(d.calories), protein: num(d.protein), carbs: num(d.carbs), fat: num(d.fat) };
    update((s) => { s.profile.overrides = Object.values(o).some(Boolean) ? o : null; });
    toast("Targets saved");
  },
  async "set-pin"(d) {
    const pin = String(d.pin || "");
    if (!/^\d{4,8}$/.test(pin)) return toast("Use 4 to 8 digits");
    const salt = crypto.getRandomValues(new Uint32Array(4)).join("-");
    const hash = await hashPin(pin, salt);
    try { sessionStorage.setItem("temple-unlocked", "1"); } catch { /* ignore */ }
    update((st) => { st.settings.pinSalt = salt; st.settings.pinHash = hash; });
    toast("PIN set");
  },
  apikey(d) { update((s) => { s.settings.apiKey = d.apiKey.trim(); }); toast("Key saved on this device"); },
};

const actions = {
  "day-prev"() { ui.date = addDays(ui.date, -1); render(); },
  "day-next"() { ui.date = addDays(ui.date, 1); render(); },
  "day-today"() { ui.date = dateKey(); render(); },
  "quick-food"(el) {
    const f = getState().savedFoods[+el.dataset.i];
    const hour = new Date().getHours();
    const meal = hour < 11 ? "Breakfast" : hour < 15 ? "Lunch" : hour < 21 ? "Dinner" : "Snacks";
    update((s) => { (s.foods[ui.date] ??= []).push({ id: uid(), meal, ...f }); });
    toast(`Added ${f.name}`);
  },
  "del-food"(el) { update((s) => { s.foods[ui.date] = (s.foods[ui.date] || []).filter((e) => e.id !== el.dataset.id); }); },
  "del-saved"(el) { update((s) => { s.savedFoods.splice(+el.dataset.i, 1); }); },
  "del-set"(el) { update((s) => { const w = ensureWorkout(s, ui.date); w.sets = w.sets.filter((x) => x.id !== el.dataset.id); }); },
  "del-ex"(el) {
    if (!confirm("Remove this exercise from your library? Logged sets stay in your history.")) return;
    update((s) => { s.exercises = s.exercises.filter((e) => e.id !== el.dataset.id); });
  },
  "swap-meal"(el) {
    const s = getState();
    update((st) => {
      const plan = ensurePlan(st, ui.date);
      const next = swapSlot({ plan, slotId: el.dataset.slot, target: targetsFor(s), diet: plan.diet, meatless: plan.meatless, webRecipes: st.webRecipes });
      const logged = new Set(plan.items.filter((i) => i.logged).map((i) => i.slot));
      next.items.forEach((i) => { if (logged.has(i.slot) && i.slot !== el.dataset.slot) i.logged = true; });
      st.plans[ui.date] = { ...plan, ...next };
    });
  },
  "new-menu"() {
    update((st) => {
      const old = st.plans[ui.date];
      buildDayPlan(st, ui.date, (old?.seedN || 0) + 1, old);
    });
  },
  "log-meal"(el) { logPlanItems([+el.dataset.idx]); },
  "log-menu"() {
    const plan = getState().plans[ui.date];
    logPlanItems((plan?.items || []).map((_, i) => i).filter((i) => !plan.items[i].logged));
  },
  grocery() { ui.grocery = !ui.grocery; render(); },
  "save-web"(el) {
    const r = ui.webResults[+el.dataset.i];
    if (!r || r.saved) return;
    r.saved = true;
    update((st) => { st.webRecipes.push({ ...r, id: "w" + uid(), saved: undefined }); });
  },
  "del-web"(el) { update((st) => { st.webRecipes = st.webRecipes.filter((r) => r.id !== el.dataset.id); }); },
  "load-session"() {
    const s = getState();
    const session = todaysSession(s.program, s.workouts, ui.date, tmFor(s));
    update((st) => {
      const w = ensureWorkout(st, ui.date);
      const swaps = st.program.swaps || {};
      const items = session.items.map((it) => {
        const name = !it.detail && swaps[it.name] ? swaps[it.name] : it.name;
        return { ...it, name, swappedFrom: name !== it.name ? it.name : undefined, exId: ensureExercise(st, name, it.repMin, it.repMax).id };
      });
      w.plan = { programId: session.programId, dayIndex: session.dayIndex, dayName: session.dayName, week: session.week, deload: session.deload, items };
      w.order = [...new Set([...items.map((i) => i.exId), ...(w.order || [])])];
    });
  },
  "stop-program"() {
    if (!confirm("Stop following this program? Your logged workouts and numbers stay.")) return;
    update((st) => {
      archiveProgram(st);
      st.program = null;
    });
  },
  "pick-program"(el) {
    ui.pickProgram = el.dataset.id || null;
    render();
  },
  rest(el) { startRest(+el.dataset.sec); },
  "protein-basis"(el) {
    update((st) => { st.profile.proteinBasis = el.dataset.basis; });
    toast(`Protein: ${targetsFor(getState()).protein} g a day`);
  },
  "set-goal"(el) {
    const goal = el.dataset.goal;
    update((st) => { st.profile.goal = goal; });
    const t = targetsFor(getState());
    toast(`${GOALS[goal].short}: ${t.calories.toLocaleString()} kcal, ${t.protein} g protein a day`);
  },
  "finish-open"() { showFinisherSheet(); },
  "finish-close"() { closeFinisherSheet(); },
  "wrap-up"() { update((st) => { ensureWorkout(st, ui.date).wrapped = true; }); showSummary(); },
  "finish-pick"(el) {
    const pick = el.dataset.pick;
    closeFinisherSheet();
    update((st) => {
      const w = ensureWorkout(st, ui.date);
      w.finished = true;
      if (pick !== "done") (w.extras ??= {})[pick] = true;
    });
    if (pick === "done") { update((st) => { ensureWorkout(st, ui.date).wrapped = true; }); return showSummary(); }
    document.getElementById(`${pick}-card`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  },
  "ab-kind"(el) { ui.abKind = el.dataset.kind; render(); document.getElementById("abs-card")?.scrollIntoView({ block: "start" }); },
  "add-abs"(el) {
    const r = AB_ROUTINES[el.dataset.kind];
    update((st) => {
      const w = ensureWorkout(st, ui.date);
      for (const [, name, sets] of r.moves) {
        const info = exerciseInfo(name);
        const ex = ensureExercise(st, name, info?.repMin, info?.repMax);
        if (!w.order.includes(ex.id)) w.order.push(ex.id);
        if (w.plan?.items && !w.plan.items.some((i) => i.exId === ex.id)) {
          w.plan.items.push({ name, exId: ex.id, sets, repMin: info.repMin, repMax: info.repMax, rest: 40, note: "", extra: true });
        }
      }
    });
    toast("Ab exercises added below. Log them like any other lift");
  },
  "del-cardio"(el) { update((st) => { ensureWorkout(st, ui.date).cardio.splice(+el.dataset.i, 1); }); },
  "swap-ex"(el) {
    const always = !!el.closest("details")?.querySelector('input[name="always"]')?.checked;
    let toId;
    update((st) => {
      const w = ensureWorkout(st, ui.date);
      const from = st.exercises.find((e) => e.id === el.dataset.from);
      const rxItem = w.plan?.items?.find((i) => i.exId === from.id);
      const to = ensureExercise(st, el.dataset.to, rxItem?.repMin, rxItem?.repMax);
      toId = to.id;
      const order = [...new Set([...(w.order || []), ...w.sets.map((x) => x.exId)])];
      if (w.sets.some((x) => x.exId === from.id)) {
        if (!order.includes(to.id)) order.splice(order.indexOf(from.id) + 1, 0, to.id);
        w.order = order;
      } else {
        w.order = [...new Set(order.map((id) => (id === from.id ? to.id : id)))];
        if (rxItem) Object.assign(rxItem, { exId: to.id, name: to.name, swappedFrom: rxItem.swappedFrom || from.name });
      }
      if (always && st.program) (st.program.swaps ??= {})[rxItem?.swappedFrom || from.name] = to.name;
    });
    ui.openEx = toId;
    render();
    toast(always ? `${el.dataset.to} will replace it from now on` : `Swapped to ${el.dataset.to}`);
  },
  "unswap"(el) {
    update((st) => { delete st.program.swaps[el.dataset.name]; });
    toast(`${el.dataset.name} is back in the program`);
  },
  "extra-set"(el) { ui.extraSet = el.dataset.id; ui.openEx = el.dataset.id; render(); document.querySelector(`form[data-ex="${el.dataset.id}"] input[name="weight"]`)?.focus(); },
  "open-ex"(el) { ui.extraSet = null; ui.openEx = el.dataset.id; render(); document.querySelector(`form[data-ex="${el.dataset.id}"]`)?.closest(".card")?.scrollIntoView({ block: "start", behavior: "smooth" }); },
  "scan-cancel"() { ui.scan = null; render(); },
  "rest-cancel"() { ui.rest = null; render(); },
  "parsed-edit"() { ui.parsed = null; render(); },
  "maxes-cancel"() { ui.maxParsed = null; render(); },
  "paste-maxes"(el) { pasteInto(el.closest("form").querySelector("textarea")); },
  "paste-workout"(el) { pasteInto(el.closest("form").querySelector("textarea")); },
  "del-max"(el) { update((st) => { delete st.baselines[el.dataset.id]; }); },
  "ex-pick"(el) { ui.exPick = el.dataset.name; ui.exLookup = null; render(); },
  "ex-clear"() { ui.exQuery = ""; ui.exPick = null; ui.exLookup = null; render(); },
  "ex-lookup"(el) { ui.exQuery = el.dataset.q; startLookup(el.dataset.q); },
  "add-known"(el) {
    const info = exerciseInfo(el.dataset.name);
    update((st) => {
      const ex = ensureExercise(st, el.dataset.name, info?.repMin ?? 8, info?.repMax ?? 12);
      addToToday(st, ex.id);
    });
    ui.exQuery = ""; ui.exPick = null;
    render();
    toast(`Added ${el.dataset.name}`);
  },
  async reflect() {
    const s = getState();
    const g = s.faith[ui.date]?.usccbGospel;
    ui.busy = { reflect: true };
    render();
    try {
      const text = await generateReflection({
        apiKey: s.settings.apiKey, date: fmtDate(ui.date, { weekday: "long", year: "numeric", month: "long", day: "numeric" }),
        liturgicalDay: liturgicalDay(ui.date).season, readingsUrl: usccbUrl(ui.date), gospelRef: g?.source, gospelText: g?.text,
      });
      ui.busy = {};
      update((st) => { ensureFaith(st, ui.date).reflection = text; });
    } catch (err) {
      ui.busy = { reflectError: err.message };
      render();
    }
  },
  export() {
    const blob = new Blob([exportJSON()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `temple-training-${dateKey()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    update((st) => { st.settings.lastExport = new Date().toISOString(); });
    renderBanner();
    toast("Backup saved. Keep it in Files or iCloud Drive");
  },
  "check-updates"() { checkForUpdates(true); },
  "reload-app"() { location.reload(); },
  async "install-app"() {
    const prompt = status.installPrompt;
    if (!prompt) return;
    prompt.prompt();
    await prompt.userChoice.catch(() => {});
    status.installPrompt = null;
    render();
  },
  async "test-key"() {
    toast("Testing your API key…");
    try {
      const { client } = await getClient(getState().settings.apiKey);
      await client.models.retrieve("claude-opus-5-5");
      toast("API key works");
    } catch (err) {
      toast(err?.status === 401 ? "API key was rejected" : "Couldn't reach Anthropic");
    }
  },
  "lock-now"() {
    try { sessionStorage.removeItem("temple-unlocked"); } catch { /* ignore */ }
    showLock();
  },
  "remove-pin"() {
    if (!confirm("Remove the app PIN?")) return;
    update((st) => { delete st.settings.pinHash; delete st.settings.pinSalt; });
    toast("PIN removed");
  },
  "sauna-off"() { update((st) => { st.profile.sauna = { ...st.profile.sauna, enabled: false }; }); },
  "remove-key"() {
    if (!confirm("Remove your Anthropic API key from this phone? AI features will turn off.")) return;
    update((st) => { st.settings.apiKey = ""; });
    toast("API key removed");
  },
};

const changes = {
  "scan-photo"(el) {
    const file = el.files[0];
    if (file) startScan(file);
  },
  rule(el) { update((s) => { ensureFaith(s, ui.date).checks[el.dataset.id] = el.checked; }); },
  "toggle-offered"(el) { update((s) => { ensureWorkout(s, ui.date).offered = el.checked; }); },
  "chart-ex"(el) { ui.chartEx = el.value; render(); },
  async import(el) {
    const file = el.files[0];
    if (!file) return;
    try { importJSON(await file.text()); toast("Backup restored"); }
    catch (err) { alert(`Import failed: ${err.message}`); }
  },
};

document.addEventListener("click", (e) => {
  const tab = e.target.closest("[data-tab]");
  if (tab) return go(tab.dataset.tab);
  const link = e.target.closest("[data-goto]");
  if (link) {
    closeFinisherSheet();
    if (link.dataset.sub) ui.sub[link.dataset.goto] = link.dataset.sub;
    return go(link.dataset.goto);
  }
  const subBtn = e.target.closest("#subnav [data-sub], [data-sub-go]");
  if (subBtn) {
    ui.sub[ui.tab] = subBtn.dataset.sub || subBtn.dataset.subGo;
    render();
    return window.scrollTo(0, 0);
  }
  const step = e.target.closest("button[data-step]");
  if (step) {
    const input = step.parentElement.querySelector("input");
    const next = Math.max(+input.min || 0, Math.round(((+input.value || 0) + +step.dataset.step) * 4) / 4);
    input.value = next;
    refreshScanTotal();
    return;
  }
  const act = e.target.closest("button[data-action]");
  if (act && actions[act.dataset.action]) actions[act.dataset.action](act);
});

function refreshScanTotal() {
  const form = document.querySelector('form[data-form="scan-log"]');
  const out = document.getElementById("scan-total");
  if (!form || !out) return;
  const v = (n) => +form.elements[n].value || 0;
  out.textContent = scanTotalText({ calories: v("cal"), protein: v("p"), carbs: v("c"), fat: v("f") }, Math.max(0.25, v("servings") || 1));
}

document.addEventListener("input", (e) => {
  if (e.target.dataset?.live === "scan") return refreshScanTotal();
  if (e.target.dataset?.live === "rest") return refreshRestTotal();
  if (e.target.dataset?.live !== "ex-query") return;
  ui.exQuery = e.target.value;
  ui.exPick = null;
  ui.exLookup = null;
  const box = document.getElementById("ex-results");
  if (box) box.innerHTML = exResults(getState())[RAW];
});

document.addEventListener("change", (e) => {
  if (e.target.dataset?.live === "rest") refreshRestTotal();
  const el = e.target.closest("[data-action]");
  if (el && changes[el.dataset.action]) changes[el.dataset.action](el);
});

document.addEventListener("submit", (e) => {
  const form = e.target.closest("form[data-form]");
  if (!form || !forms[form.dataset.form]) return;
  e.preventDefault();
  forms[form.dataset.form](formData(form), form);
});

function toast(msg) {
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = msg;
  document.body.append(t);
  setTimeout(() => t.remove(), 1800);
}

subscribe(render);
window.addEventListener("hashchange", () => go(location.hash.slice(1)));
render();

if (needsUnlock()) showLock();

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register(`sw.js?v=${APP_VERSION}`).then((reg) => {
    swReg = reg;
    const sync = () => { status.sw = reg.active ? "active" : "starting"; if (ui.tab === "me") render(); };
    sync();
    navigator.serviceWorker.ready.then(sync);
  }).catch(() => { status.sw = "unsupported"; });
}

// Ask the browser to keep this app's data even when storage is tight.
navigator.storage?.persist?.().then(async () => {
  status.persisted = await navigator.storage.persisted();
}).catch(() => {});

window.addEventListener("online", () => { status.online = true; toast("Back online"); checkForUpdates(); });
window.addEventListener("offline", () => { status.online = false; status.reachable = false; renderBanner(); if (ui.tab === "me") render(); });
window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); status.installPrompt = e; if (ui.tab === "me") render(); });
window.addEventListener("appinstalled", () => { status.installPrompt = null; toast("Temple installed"); });

checkForUpdates();
setInterval(() => { if (!document.hidden) checkForUpdates(); }, 30 * 60000);
renderBanner();
