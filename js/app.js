import { getState, update, save, subscribe, uid, dateKey, addDays, parseKey, exportJSON, importJSON } from "./store.js";
import { computeTargets, totals, weightTrend, latestWeight, movingAverage, weeklyAdherence, paceVerdict, ACTIVITY_LEVELS } from "./nutrition.js";
import { suggestNext, history as sessionsFor, bestE1rm, isPR, strengthSummary, setFeedback, exerciseVerdict } from "./lifts.js";
import { matchExercise, exerciseInfo, MATCH_SURE, MATCH_MAYBE } from "./exercise-db.js";
import { liturgicalDay, penanceNote, mysteriesFor, PRAYERS, EXAMEN, LECTIO, virtueOfWeek, fetchGospel, usccbUrl } from "./liturgy.js";
import { lineChart } from "./chart.js";
import { generateReflection, renderMarkdown } from "./reflect.js";
import { DIETS } from "./recipes.js";
import { SLOTS, buildPlan, swapSlot, hydrate, planTotals, recipePool, scaled, groceryList } from "./mealplan.js";
import { PROGRAMS, CATALOG, MUSCLES, todaysSession, weeklyVolume, round5 } from "./programs.js";
import { findWebRecipes, lookupExercise, askCoach } from "./ai.js";

// ---------- tiny templating: interpolations are escaped unless wrapped in raw() ----------
const RAW = Symbol("raw");
const raw = (s) => ({ [RAW]: String(s) });
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const val = (v) => (Array.isArray(v) ? v.map(val).join("") : v && v[RAW] !== undefined ? v[RAW] : v === false || v == null ? "" : esc(v));
const html = (strings, ...vals) => raw(strings.reduce((out, s, i) => out + s + (i < vals.length ? val(vals[i]) : ""), ""));

const ui = { tab: location.hash.slice(1) || "today", date: dateKey(), chartEx: null, gospel: {}, busy: {}, exQuery: "", exPick: null, exLookup: null, coach: {} };
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
      <div class="bar-label"><span>${label}</span><span><strong>${round(have)}</strong> / ${round(goal)}${unit}</span></div>
      <div class="bar ${cls}${over ? " over" : ""}" role="progressbar" aria-valuenow="${round(have)}" aria-valuemax="${round(goal)}" aria-label="${label}">
        <div style="width:${pct.toFixed(1)}%"></div>
      </div>
    </div>`;
}

function macroBlock(t, target) {
  const left = target.calories - t.cal;
  return html`
    <div class="hero">
      <div class="hero-num">${round(Math.abs(left))}</div>
      <div class="hero-label">${left >= 0 ? "calories left" : "calories over"} · ${round(t.cal)} eaten of ${target.calories}</div>
    </div>
    ${bar("Protein", t.p, target.protein, "g", "protein", false)}
    ${bar("Carbs", t.c, target.carbs, "g", "carbs")}
    ${bar("Fat", t.f, target.fat, "g", "fat")}
    <p class="small muted">${t.p >= target.protein * 0.9 ? "✅ Protein goal reached — muscle protected." : `${round(target.protein - t.p)} g protein to go — prioritize it at your next meal.`}</p>`;
}

const STATUS = { good: ["✅", "On pace"], warning: ["⚠️", "Needs attention"], serious: ["⛔", "Off pace"] };

function penanceCard(key) {
  const note = penanceNote(liturgicalDay(key));
  return note ? html`<section class="card penance"><h3>🐟 ${note.title}</h3><p>${note.body}</p></section>` : "";
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
    { id: "gospel", label: "Read the daily Gospel", hint: "Lectio Divina below." },
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
  const virtue = virtueOfWeek(key);
  const [icon, label] = STATUS[verdict.level];

  return html`
    <section class="card season season-${lit.color}">
      <div class="small">${fmtDate(key, { weekday: "long", month: "long", day: "numeric" })}</div>
      <div class="season-name">${lit.season}</div>
      <div class="small">Virtue of the week: <strong>${virtue.name}</strong> — ${virtue.body}</div>
    </section>

    ${penanceCard(key)}

    <section class="card">
      <h2>Fuel</h2>
      ${macroBlock(t, target)}
      <button type="button" class="btn" data-goto="food">Log food</button>
    </section>

    <section class="card status status-${verdict.level}">
      <h2>${icon} ${label}</h2>
      <ul>${verdict.msgs.map((m) => html`<li>${m}</li>`)}</ul>
    </section>

    <section class="card">
      <h2>Bodyweight</h2>
      <form class="inline" data-form="weight">
        <label class="grow">Weigh-in (lb)<input name="lb" type="number" step="0.1" inputmode="decimal" value="${s.weights[key] ?? ""}" placeholder="e.g. 198.4" required></label>
        <button class="btn" type="submit">Save</button>
      </form>
      <div id="weight-chart"></div>
    </section>

    <section class="card">
      <h2>Train</h2>
      ${s.program && PROGRAMS[s.program.id] ? html`<p class="small muted">${PROGRAMS[s.program.id].name} · today: <strong>${w?.plan?.dayName || todaysSession(s.program, s.workouts, key, tmFor(s)).dayName}</strong></p>` : ""}
      ${setCount
        ? html`<p>${setCount} set${setCount === 1 ? "" : "s"} logged${w.intention ? html` · offered for <em>${w.intention}</em>` : ""}.</p>`
        : html`<p class="muted">No workout logged today.</p>`}
      <button type="button" class="btn" data-goto="train">${setCount ? "Continue workout" : "Start workout"}</button>
    </section>

    <section class="card">
      <h2>Rule of Life · ${rule.filter((i) => i.done).length}/${rule.length}</h2>
      <p class="small muted">🔥 ${ruleStreak(s)}-day streak (5+ of 7 practices)</p>
      <ul class="mini-rule">${rule.map((i) => html`<li class="${i.done ? "done" : ""}">${i.done ? "✔" : "○"} ${i.label}</li>`)}</ul>
      <button type="button" class="btn" data-goto="faith">Open Faith</button>
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
const SLOT_SHARE = { breakfast: 0.25, lunch: 0.3, dinner: 0.3, snack: 0.1, dessert: 0.08 };
const fmtGrams = (g) => (g >= 28 ? `${round(g)} g (${(g / 28.35).toFixed(1)} oz)` : `${round(g)} g`);

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
  const plan = buildPlan({ target, diet, meatless, seed: `${key}:${seedN}`, webRecipes: s.webRecipes });
  for (const old of previous?.items || []) {
    if (!old.logged) continue;
    const i = plan.items.findIndex((x) => x.slot === old.slot);
    if (i >= 0) plan.items[i] = { ...old };
    else plan.items.push({ ...old });
  }
  s.plans[key] = { ...plan, diet, meatless, targetCal: target.calories, seedN };
  return s.plans[key];
}

function ensurePlan(s, key) {
  const target = targetsFor(s);
  const cached = s.plans[key];
  const fresh = cached?.items && cached.diet === (s.profile.diet || "everything") && cached.meatless === isMeatless(s, key);
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
      <div class="menu-head"><span class="slot-label">${label}</span>${logged ? html`<span class="tag ok">✓ Logged</span>` : ""}</div>
      <div class="menu-name">${recipe.name} <span class="small muted">× ${mult} serving${mult === 1 ? "" : "s"}</span></div>
      <div class="small muted">${round(m.cal)} kcal · ${round(m.p)}P ${round(m.c)}C ${round(m.f)}F</div>
      ${recipe.note ? html`<div class="tiny note">✨ ${recipe.note}</div>` : ""}
      ${recipe.source ? html`<div class="tiny"><a href="${recipe.source.url}" target="_blank" rel="noopener">${recipe.source.name} ↗</a>${recipe.estimated ? " · macros estimated" : ""}</div>` : ""}
      <details><summary>Recipe</summary>
        <ul class="ingredients">${(recipe.ingredients || []).map((ing) => (typeof ing === "string" ? html`<li>${ing}</li>` : html`<li>${fmtGrams(ing.g * mult)} ${ing.name}</li>`))}</ul>
        ${recipe.source && mult !== 1 ? html`<p class="tiny muted">Quantities are for 1 serving; make ${mult}.</p>` : ""}
        <ol class="steps">${(recipe.steps || []).map((x) => html`<li>${x}</li>`)}</ol>
      </details>
      <div class="row">
        <button type="button" class="btn ghost btn-sm" data-action="swap-meal" data-slot="${slot}">↻ Swap</button>
        <button type="button" class="btn btn-sm" data-action="log-meal" data-idx="${idx}" ${logged ? "disabled" : ""}>${logged ? "Logged" : "Log it"}</button>
      </div>
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
      <h2>🍽️ Today's menu</h2>
      <p class="small muted">${DIETS[plan.diet]?.label || "Everything"}${plan.meatless ? " · meatless today 🐟" : ""} · portions scaled to your targets</p>
      ${lit.fastDay ? html`<p class="small warn-text">Fast day: one full meal and two small ones that don't add up to a full meal. Use this menu as a guide, not a target.</p>` : ""}
      ${items.map((i, idx) => menuItem(i, idx))}
      <p class="menu-total">Menu: <strong>${round(t.cal)}</strong> / ${target.calories} kcal · <strong>${round(t.p)}</strong> / ${target.protein} g protein · ${round(t.c)} g carbs · ${round(t.f)} g fat</p>
      <div class="row">
        <button type="button" class="btn ghost" data-action="new-menu">New menu</button>
        <button type="button" class="btn" data-action="log-menu">Log whole menu</button>
      </div>
      ${ui.grocery ? groceryBlock(s, key) : html`<button type="button" class="btn ghost full" data-action="grocery">🛒 Plan 7 days + grocery list</button>`}
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
    <h3>🛒 Grocery list</h3>
    <ul class="grocery">${list.items.map((x) => html`<li><label class="check"><input type="checkbox"> ${fmtGrams(x.g)} ${x.name}</label></li>`)}</ul>
    ${list.extras.length ? html`<p class="small muted">Plus, for web recipes:</p><ul class="small">${list.extras.map((x) => html`<li>${x}</li>`)}</ul>` : ""}
    <button type="button" class="btn ghost" data-action="grocery">Hide</button>`;
}

function webRecipesCard(s) {
  return html`
    <section class="card">
      <h2>🔎 Find recipes on TikTok & the web</h2>
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
          ${r.saved ? html`<p class="small">✓ Added to your rotation</p>` : html`<button type="button" class="btn btn-sm" data-action="save-web" data-i="${i}">Add to my menu rotation</button>`}
        </div>`)}
      ${s.webRecipes.length ? html`<details><summary>My saved web recipes (${s.webRecipes.length})</summary>
        <ul class="entries">${s.webRecipes.map((r) => html`<li><span>${r.name} <span class="small muted">${r.slot}</span></span><button type="button" class="icon-btn" data-action="del-web" data-id="${r.id}" aria-label="Remove ${r.name}">✕</button></li>`)}</ul>
      </details>` : ""}
    </section>`;
}

function renderFood(s) {
  const key = ui.date;
  const target = targetsFor(s);
  const entries = s.foods[key] || [];
  const t = totals(entries);
  const lit = liturgicalDay(key);
  const week = weeklyAdherence(s.foods, target, key);

  return html`
    <section class="card">${macroBlock(t, target)}</section>
    ${penanceCard(key)}
    ${menuCard(s, key)}

    <section class="card">
      <h2>Add food</h2>
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
        <label class="check span2"><input type="checkbox" name="save"> Save to "My foods" for one-tap logging</label>
        <button class="btn span2" type="submit">Add</button>
      </form>
      <p class="small muted">Leave calories blank to compute from macros (4/4/9 kcal per g).</p>
    </section>

    ${webRecipesCard(s)}

    ${MEALS.map((meal) => {
      const list = entries.filter((e) => e.meal === meal);
      if (!list.length) return "";
      const mt = totals(list);
      return html`
        <section class="card">
          <h3>${meal} <span class="muted small">${round(mt.cal)} kcal · ${round(mt.p)}P ${round(mt.c)}C ${round(mt.f)}F</span></h3>
          <ul class="entries">${list.map((e) => html`
            <li>
              <div><strong>${e.name}</strong>${e.meat && lit.friday ? html` <span class="tag warn">meat</span>` : ""}
                <div class="small muted">${round(e.cal)} kcal · P ${e.p} · C ${e.c} · F ${e.f}</div></div>
              <button type="button" class="icon-btn" data-action="del-food" data-id="${e.id}" aria-label="Delete ${e.name}">✕</button>
            </li>`)}</ul>
        </section>`;
    })}

    <section class="card">
      <h2>Last 7 days</h2>
      ${week ? html`
        <table class="table">
          <tr><th></th><th>Avg/day</th><th>Target</th></tr>
          <tr><td>Calories</td><td>${round(week.cal)}</td><td>${target.calories}</td></tr>
          <tr><td>Protein</td><td>${round(week.p)} g</td><td>${target.protein} g</td></tr>
          <tr><td>Carbs</td><td>${round(week.c)} g</td><td>${target.carbs} g</td></tr>
          <tr><td>Fat</td><td>${round(week.f)} g</td><td>${target.fat} g</td></tr>
        </table>
        <p class="small muted">${week.logged} of 7 days logged · protein goal hit ${week.proteinHits}×</p>` : html`<p class="muted">Nothing logged this week yet.</p>`}
      ${s.savedFoods.length ? html`<details><summary>Manage my foods</summary>
        <ul class="entries">${s.savedFoods.map((f, i) => html`<li><span>${f.name} <span class="small muted">${f.cal} kcal</span></span><button type="button" class="icon-btn" data-action="del-saved" data-i="${i}" aria-label="Remove ${f.name}">✕</button></li>`)}</ul>
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
  return h.length ? round5(Math.max(...h.map((x) => bestE1rm(x.sets)))) : null;
}

function programList(s) {
  return html`
    ${Object.entries(PROGRAMS).map(([id, p]) => html`
      <div class="program-option">
        <div class="menu-name">${p.name}</div>
        <div class="small muted">${p.author} · ${p.days} days/week · ${p.level}</div>
        <p class="small">${p.bestFor}</p>
        ${id === "bbb531" ? html`
          <form data-form="start-program" data-id="${id}" class="grid-form">
            ${TM_LIFTS.map((n) => html`<label>${n} 1RM (lb)<input name="${n}" type="number" inputmode="numeric" min="0" step="5" value="${est1rm(s, n) || ""}" required></label>`)}
            <button class="btn span2" type="submit">${s.program?.id === id ? "Restart" : "Start"} 5/3/1</button>
          </form>
          <p class="tiny muted">Use a recent true max, or the estimate from your logs. Training Max is set to 90% of it.</p>`
        : html`<form data-form="start-program" data-id="${id}"><button class="btn ghost" type="submit">${s.program?.id === id ? "Restart" : "Start"} this program</button></form>`}
      </div>`)}
    ${s.program ? html`<button type="button" class="btn ghost" data-action="stop-program">Stop program (train freestyle)</button>` : ""}`;
}

function programCard(s, key, w) {
  const prog = s.program && PROGRAMS[s.program.id];
  if (!prog) {
    return html`
      <section class="card">
        <h2>📋 Choose a proven program</h2>
        <p class="small muted">Each one has a long track record. The app runs the progression, schedules deloads, and tracks weekly volume so you keep progressing.</p>
        ${programList(s)}
      </section>`;
  }
  const loaded = w.plan?.programId === s.program.id;
  const shown = loaded ? w.plan : todaysSession(s.program, s.workouts, key, tmFor(s));
  return html`
    <section class="card program">
      <h2>📋 ${prog.name}</h2>
      <p class="small muted">${prog.author} · ${prog.schedule}</p>
      <div class="small">Today · week ${shown.week}</div>
      <div class="season-name">${shown.dayName}</div>
      ${shown.deload ? html`<p class="suggest suggest-deload">↘️ Deload week. Half the sets, same weights, easy effort. This is how you avoid stalling: you recover, then come back stronger.</p>` : ""}
      ${loaded ? html`<p class="small">✅ Loaded below. Hit the target on every exercise.</p>`
        : html`<button type="button" class="btn" data-action="load-session">Load today's workout</button>`}
      <details><summary>About this program</summary>
        <p class="small">${prog.about}</p>
        <p class="small"><strong>Best for:</strong> ${prog.bestFor}</p>
        <ol class="small">${prog.plan.map((d) => html`<li><strong>${d.name}:</strong> ${d.ex.map((e) => (e[1] === "531" ? `${e[0]} 5/3/1 + 5×10` : `${e[0]} ${e[1]}×${e[2] === e[3] ? e[2] : `${e[2]}–${e[3]}`}`)).join(", ")}</li>`)}</ol>
      </details>
      <details><summary>Switch program</summary>${programList(s)}</details>
    </section>`;
}

function volumeCard(s, key) {
  const v = weeklyVolume(s.workouts, s.exercises, key);
  const label = { none: "", low: "· low", good: "✓", high: "· high" };
  return html`
    <section class="card">
      <h2>📊 Weekly volume</h2>
      <p class="small muted">Hard sets per muscle in the last 7 days. The research sweet spot is 10–20 sets per muscle per week (shaded band). Under 10 leaves growth on the table. Over 20 during a cut can outrun your recovery.</p>
      <ul class="volume">${MUSCLES.map((m) => {
        const n = v[m];
        const status = n === 0 ? "none" : n < 10 ? "low" : n <= 20 ? "good" : "high";
        return html`<li><span class="vol-name">${cap(m)}</span><span class="vol-bar"><span class="vol-zone"></span><span class="vol-fill vol-${status}" style="width:${Math.min(100, (n / 25) * 100).toFixed(1)}%"></span></span><span class="vol-n">${n} ${label[status]}</span></li>`;
      })}</ul>
    </section>`;
}

function renderTrain(s) {
  const key = ui.date;
  const w = workoutFor(s, key);
  const exById = Object.fromEntries(s.exercises.map((e) => [e.id, e]));
  const order = [...new Set([...(w.order || []), ...w.sets.map((x) => x.exId)])].filter((id) => exById[id]);
  ui.chartEx ??= order[0] || s.exercises[0]?.id;

  return html`
    ${programCard(s, key, w)}

    <section class="card offer">
      <h2>🙏 Offer it up</h2>
      <p class="small">"I pommel my body and subdue it" — 1 Cor 9:27. Before you lift, name who this workout is for. Offer your hardest set for them.</p>
      <form class="inline" data-form="intention">
        <label class="grow">Today's intention<input name="intention" value="${w.intention}" placeholder="e.g. my father's health, souls in purgatory"></label>
        <button class="btn" type="submit">Set</button>
      </form>
      <details><summary>Athlete's offering prayer</summary><p class="prayer">${PRAYERS.athletesOffering}</p></details>
      <label class="check"><input type="checkbox" data-action="toggle-offered" ${w.offered ? "checked" : ""}> I offered this workout to God</label>
    </section>

    ${order.map((id) => exerciseCard(s, exById[id], w, key))}

    ${workoutReview(s, w, key, order, exById)}

    <section class="card">
      <h2>Add exercise</h2>
      <form class="inline" data-form="ex-search">
        <label class="grow">Type any exercise<input name="q" value="${ui.exQuery}" placeholder="e.g. incline db press, RDL, skull crushers" autocomplete="off" data-live="ex-query"></label>
        <button class="btn" type="submit">Find</button>
      </form>
      <div id="ex-results" aria-live="polite">${exResults(s)}</div>
      <details><summary>Or pick from your library</summary>
        <form class="inline" data-form="add-ex">
          <label class="grow">Exercise<select name="exId">${s.exercises.filter((e) => !order.includes(e.id)).map((e) => html`<option value="${e.id}">${e.name}</option>`)}</select></label>
          <button class="btn" type="submit">Add</button>
        </form>
      </details>
    </section>

    <section class="card">
      <h2>Strength progress</h2>
      <label>Lift<select data-action="chart-ex">${s.exercises.map((e) => html`<option value="${e.id}" ${e.id === ui.chartEx ? "selected" : ""}>${e.name}</option>`)}</select></label>
      <div id="lift-chart"></div>
      ${liftHistory(s, ui.chartEx)}
    </section>

    <section class="card">
      <details><summary>Exercise library & rep ranges</summary>
        <p class="small muted">Double progression: work in the rep range; once every set hits the top, add the increment.</p>
        <ul class="entries">${s.exercises.map((e) => html`
          <li><span>${e.name} <span class="small muted">${e.repMin}–${e.repMax} reps · +${e.increment} lb</span></span>
          <button type="button" class="icon-btn" data-action="del-ex" data-id="${e.id}" aria-label="Remove ${e.name}">✕</button></li>`)}</ul>
        <form data-form="new-ex" class="grid-form">
          <label class="span2">Name<input name="name" required placeholder="Hack squat"></label>
          <label>Type<select name="kind"><option value="upper">Upper body</option><option value="lower">Lower body</option></select></label>
          <label class="span2">Main muscle<select name="muscle">${MUSCLES.map((m) => html`<option value="${m}">${cap(m)}</option>`)}</select></label>
          <label>Increment lb<input name="increment" type="number" step="0.5" min="0.5" value="5"></label>
          <label>Min reps<input name="repMin" type="number" min="1" value="6"></label>
          <label>Max reps<input name="repMax" type="number" min="1" value="10"></label>
          <button class="btn span2" type="submit">Add to library</button>
        </form>
      </details>
    </section>

    ${volumeCard(s, key)}`;
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
      <div class="small muted">${label}</div>
      <div class="menu-name">✓ ${ex.name}</div>
      <div class="small muted">${cap(ex.muscle || "general")}${ex.secondary?.length ? ` + ${ex.secondary.join(", ")}` : ""} · ${ex.equipment || ex.how?.equipment || ""} · ${range}</div>
      ${howBlock(ex.how || exerciseInfo(ex.name)?.how, true)}
      <div class="row">
        <button type="button" class="btn" data-action="add-known" data-name="${ex.name}">Add to today's workout</button>
        <button type="button" class="btn ghost" data-action="ex-clear">Clear</button>
      </div>
    </div>`;
}

function lookupButton(s, q) {
  return s.settings.apiKey
    ? html`<button type="button" class="btn ghost" data-action="ex-lookup" data-q="${q}">🔎 Look up "${q}" online</button>`
    : html`<p class="small muted">Add your Anthropic API key on the Me tab and the app will look up unknown exercises online (how to do it, cues, sources) for you to confirm. Or add it yourself in "Exercise library & rep ranges" below.</p>`;
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
        <p class="small muted">Try another name, or add it yourself in the exercise library below.</p>`;
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

const FB_ICON = { good: "✅", ok: "➖", warn: "⚠️" };
const VERDICT_ICON = { up: "⬆️", same: "➖", down: "⬇️", new: "🆕" };

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
      if (!d) return { level: "ok", notes: ["Extra set beyond the plan."] };
      if (+x.reps >= d.reps) return { level: "good", notes: [d.plus ? `AMRAP: ${x.reps} reps, ${x.reps - d.reps} over the minimum ✓` : `Hit the prescribed ${d.weight}×${d.reps} ✓`] };
      return { level: "warn", notes: [`Missed the prescribed ${d.reps} reps.${d.plus ? " Missing the + set minimum means your Training Max is too high. Lower it 10% next cycle." : ""}`] };
    }
    return setFeedback({
      ex, set: x, index: i, prev,
      repMin: rxItem?.repMin ?? ex.repMin, repMax: rxItem?.repMax ?? ex.repMax, totalSets: rxItem?.sets ?? Math.max(3, sets.length),
    });
  });
}

function workoutReview(s, w, key, order, exById) {
  const rows = order.map((id) => {
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
    } else verdict = exerciseVerdict(sets, prev);
    const exRx = rxItem && !rxItem.detail ? { ...ex, repMin: rxItem.repMin, repMax: rxItem.repMax, sets: rxItem.sets } : ex;
    const next = rxItem?.detail ? "Next time: follow the next 5/3/1 week." : `Next time: ${suggestNext(exRx, { ...s.workouts, [key]: w }, addDays(key, 1), rx || undefined).note.replace(/^Last: .*?Today: /, "")}`;
    const prs = sets.filter((x) => isPR(s.workouts, id, x, key)).length;
    return { ex, verdict, next, prs, volume: sets.reduce((t, x) => t + (+x.weight || 0) * +x.reps, 0) };
  }).filter(Boolean);
  if (!rows.length) return "";
  const count = (k) => rows.filter((r) => r.verdict.kind === k).length;
  const prs = rows.reduce((t, r) => t + r.prs, 0);
  const volume = rows.reduce((t, r) => t + r.volume, 0);
  const headline = count("down") > count("up") ? "Tough day. Recover well and come back stronger." : count("up") ? "You're progressing. This is how muscle is built and kept." : "Solid work. Next session, push for one more rep.";
  return html`
    <section class="card review">
      <h2>🧠 Coach's workout review</h2>
      <p><strong>${headline}</strong></p>
      <p class="small muted">${count("up")} progressed · ${count("same")} held · ${count("down")} down · ${count("new")} new · ${prs} PR${prs === 1 ? "" : "s"} · ${Math.round(volume).toLocaleString()} lb total volume</p>
      <ul class="review-list">${rows.map((r) => html`
        <li><strong>${VERDICT_ICON[r.verdict.kind]} ${r.ex.name}</strong>${r.prs ? html` <span class="tag pr">${r.prs} PR</span>` : ""}
          <div class="small">${r.verdict.text}</div>
          <div class="small muted">${r.next}</div></li>`)}</ul>
    </section>`;
}

function exerciseCard(s, ex, w, key) {
  const sets = w.sets.filter((x) => x.exId === ex.id);
  const rxItem = w.plan?.items?.find((i) => i.exId === ex.id);
  const rx = rxItem ? (rxItem.detail ? "531" : `${rxItem.repMin}-${rxItem.repMax}`) : "";
  let sug, nextWeight, nextReps;
  if (rxItem?.detail) {
    const d = rxItem.detail[Math.min(sets.length, rxItem.detail.length - 1)];
    sug = { note: rxItem.note, kind: w.plan.deload ? "deload" : "new" };
    nextWeight = d.weight;
    nextReps = d.reps;
  } else {
    const exRx = rxItem ? { ...ex, repMin: rxItem.repMin, repMax: rxItem.repMax, sets: rxItem.sets } : ex;
    sug = suggestNext(exRx, s.workouts, key, rx || undefined);
    nextReps = sug.repsPerSet?.[sets.length] ?? sug.reps;
    nextWeight = sets.length ? sets[sets.length - 1].weight : sug.weight;
  }
  const range = rxItem ? (rxItem.repMin === rxItem.repMax ? `${rxItem.repMin}` : `${rxItem.repMin}–${rxItem.repMax}`) : "";
  const target = rxItem ? (rxItem.detail ? `${rxItem.sets} sets` : `${rxItem.sets} × ${range}`) : `${ex.repMin}–${ex.repMax} reps`;
  const rest = rxItem?.rest;
  const prev = prevSession(s, ex, rx, key);
  const feedback = feedbackFor(s, ex, rxItem, prev, sets);
  const verdict = !rxItem?.detail && sets.length ? exerciseVerdict(sets, prev) : null;
  return html`
    <section class="card">
      <h3>${ex.name} <span class="small muted">${target}${rest ? ` · rest ${fmtRest(rest)}` : ""}</span></h3>
      ${howOf(ex)?.cues?.[0] ? html`<p class="small cue">💡 ${howOf(ex).cues[0]}</p>` : ""}
      ${rxItem ? html`<div class="set-progress">${Math.min(sets.length, rxItem.sets)}/${rxItem.sets} sets${sets.length >= rxItem.sets ? " ✅" : ""}</div>` : ""}
      <p class="suggest suggest-${sug.kind || "new"}">${sug.kind === "up" ? "⬆️ " : sug.kind === "deload" ? "↘️ " : "🎯 "}${sug.note}</p>
      ${rxItem?.note && !rxItem.detail ? html`<p class="small muted">${rxItem.note}</p>` : ""}
      ${rxItem?.detail ? html`<table class="table plan-table"><tr><th>Set</th><th>Weight</th><th>Reps</th><th></th></tr>
        ${rxItem.detail.map((d, i) => html`<tr class="${i < sets.length ? "done" : ""}"><td>${i + 1}</td><td>${d.weight} lb</td><td>${d.reps}${d.plus ? "+" : ""}</td><td class="tiny muted">${d.label}</td></tr>`)}</table>` : ""}
      ${sets.length ? html`<ol class="sets">${sets.map((x, i) => html`
        <li><div class="set-main"><span class="set-n">${i + 1}</span><span class="grow"><strong>${x.weight}</strong> lb × <strong>${x.reps}</strong>${x.rir !== undefined && x.rir !== "" ? html` <span class="small muted">@ ${x.rir} RIR</span>` : ""}${isPR(s.workouts, ex.id, x, key) ? html` <span class="tag pr">PR</span>` : ""}</span>
          <button type="button" class="icon-btn" data-action="del-set" data-id="${x.id}" aria-label="Delete set">✕</button></div>
          <div class="fb fb-${feedback[i].level}">${FB_ICON[feedback[i].level]} ${feedback[i].notes.join(" ")}</div></li>`)}</ol>` : ""}
      ${verdict ? html`<p class="verdict verdict-${verdict.kind}">${VERDICT_ICON[verdict.kind]} ${verdict.text}</p>` : ""}
      <form class="inline" data-form="set" data-ex="${ex.id}" data-rx="${rx}" data-rest="${rest || ""}">
        <label>lb<input name="weight" type="number" inputmode="decimal" step="0.5" min="0" value="${nextWeight ?? ""}" required></label>
        <label>reps<input name="reps" type="number" inputmode="numeric" min="1" value="${nextReps}" required></label>
        <label title="Reps in reserve: how many more good reps you could have done">RIR<select name="rir"><option value="">—</option>${[0, 1, 2, 3, 4].map((n) => html`<option value="${n}">${n === 4 ? "4+" : n}</option>`)}</select></label>
        <button class="btn" type="submit">Log set ${sets.length + 1}</button>
        ${rest ? html`<button type="button" class="btn ghost" data-action="rest" data-sec="${rest}" aria-label="Start rest timer">⏱ ${fmtRest(rest)}</button>` : ""}
      </form>
      ${howBlock(howOf(ex))}
      ${s.settings.apiKey ? html`<details class="how" ${ui.coach[ex.id] ? "open" : ""}><summary>Ask the coach about ${ex.name}</summary>
        <form data-form="ask-coach" data-ex="${ex.id}" class="inline">
          <label class="grow">Question<input name="q" placeholder="e.g. Should I go heavier or add reps? My lower back feels it." required></label>
          <button class="btn" type="submit" ${ui.coach[ex.id]?.loading ? "disabled" : ""}>Ask</button>
        </form>
        ${ui.coach[ex.id]?.loading ? html`<p class="muted small">Thinking…</p>` : ""}
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
  const g = ui.gospel[key] || (f.gospel ? { data: f.gospel } : null);
  const angelus = lit.easterSeason ? PRAYERS.reginaCaeli : PRAYERS.angelus;
  const prayerFor = {
    offering: html`<p class="prayer">${PRAYERS.morningOffering}</p>`,
    angelus: html`<div class="prayer">${angelus.map(([v, r]) => html`<p>${v}${r ? html`<br>${r}` : ""}</p>`)}</div>`,
    rosary: html`<ol class="prayer">${m.list.map((x) => html`<li>${x}</li>`)}</ol>`,
  };
  const offerings = Object.entries(s.workouts).filter(([, w]) => w.intention).sort((a, b) => (a[0] < b[0] ? 1 : -1)).slice(0, 12);

  return html`
    <section class="card season season-${lit.color}">
      <div class="small">${fmtDate(key, { weekday: "long", month: "long", day: "numeric" })}</div>
      <div class="season-name">${g?.data?.day || lit.season}</div>
      <div class="small">Season: ${lit.season} · Vestments: ${lit.color}</div>
    </section>

    <section class="card">
      <h2>The Disciplined Disciple</h2>
      <p class="small muted">A daily rule of life for body and soul. Some boxes check themselves from your training and food logs. 🔥 ${ruleStreak(s)}-day streak.</p>
      <ul class="rule">${rule.map((i) => html`
        <li>
          <label class="check"><input type="checkbox" data-action="rule" data-id="${i.id}" ${i.done ? "checked" : ""} ${i.auto ? "disabled" : ""}>
            <span><strong>${i.label}</strong><span class="small muted"> — ${i.auto ? "done (from your log)" : i.hint}</span></span></label>
          ${prayerFor[i.id] ? html`<details><summary>Pray it</summary>${prayerFor[i.id]}</details>` : ""}
        </li>`)}</ul>
    </section>

    ${penanceCard(key)}

    <section class="card">
      <h2>📖 Today's Gospel</h2>
      ${g?.data ? html`
        <p class="gospel-ref">${g.data.source}</p>
        ${g.data.heading ? html`<p class="small muted"><em>${g.data.heading}</em></p>` : ""}
        <div class="gospel">${raw(g.data.html || esc(g.data.text).replace(/\n/g, "<br>"))}</div>
        ${g.data.copyright ? html`<p class="tiny muted">${g.data.copyright}</p>` : ""}`
      : g?.error ? html`<p class="muted">${g.error}</p>`
      : html`<p class="muted">${g?.loading ? "Loading the readings…" : "Readings not loaded."}</p>`}
      <div class="row">
        ${!g?.data ? html`<button type="button" class="btn" data-action="load-gospel">Load Gospel</button>` : ""}
        <a class="btn ghost" href="${usccbUrl(key)}" target="_blank" rel="noopener">USCCB readings (NABRE) ↗</a>
      </div>
      ${g?.error || !g?.data ? html`<details><summary>Paste the Gospel yourself</summary>
        <form data-form="paste-gospel" class="grid-form">
          <label class="span2">Reference<input name="source" placeholder="Luke 12:39-48"></label>
          <label class="span2">Text<textarea name="text" rows="5" required></textarea></label>
          <button class="btn span2" type="submit">Use this text</button>
        </form></details>` : ""}
    </section>

    <section class="card">
      <h2>✝️ A Catholic reflection</h2>
      ${f.reflection ? html`<div class="reflection">${raw(renderMarkdown(f.reflection))}</div>
        <p class="tiny muted">AI-written reflection, meant to aid prayer — not Magisterial teaching. Test it against the Catechism and your priest.</p>`
      : s.settings.apiKey ? html`<p class="small muted">Generate an interpretation rooted in the Fathers, the saints and the Catechism, with a resolution for today.</p>`
      : html`<p class="small muted">Add an Anthropic API key on the Me tab to generate a daily Catholic interpretation of the Gospel. Meanwhile, pray with Lectio Divina below.</p>`}
      ${s.settings.apiKey && g?.data ? html`<button type="button" class="btn" data-action="reflect" ${ui.busy.reflect ? "disabled" : ""}>${ui.busy.reflect ? "Writing…" : f.reflection ? "Regenerate" : "Generate reflection"}</button>` : ""}
      ${ui.busy.reflectError ? html`<p class="error">${ui.busy.reflectError}</p>` : ""}
    </section>

    <section class="card">
      <h2>Lectio Divina</h2>
      <form data-form="lectio">
        ${LECTIO.map(([title, prompt, field]) => html`
          <div class="step"><strong>${title}</strong><p class="small">${prompt}</p>
          ${field ? html`<textarea name="${field}" rows="2">${f.lectio?.[field] || ""}</textarea>` : ""}</div>`)}
        <button class="btn" type="submit">Save my prayer</button>
      </form>
    </section>

    <section class="card virtue">
      <h2>Virtue of the week: ${virtue.name}</h2>
      <blockquote>${virtue.verse}<cite>${virtue.ref}</cite></blockquote>
      <p><strong>Body:</strong> ${virtue.body}</p>
      <p><strong>Soul:</strong> ${virtue.soul}</p>
      <p class="small"><strong>Companion:</strong> ${virtue.saint} — ${virtue.quote}</p>
    </section>

    <section class="card">
      <h2>🌙 Evening Examen</h2>
      <form data-form="examen">
        ${EXAMEN.map(([title, prompt], i) => html`
          <div class="step"><strong>${i + 1}. ${title}</strong><p class="small">${prompt}</p>
          ${i >= 2 ? html`<textarea name="e${i}" rows="2">${f.examen?.["e" + i] || ""}</textarea>` : ""}</div>`)}
        <button class="btn" type="submit">Finish Examen</button>
      </form>
      <details><summary>Prayer to St. Michael</summary><p class="prayer">${PRAYERS.stMichael}</p></details>
    </section>

    <section class="card">
      <h2>Spiritual ledger</h2>
      <p class="small muted">Workouts you've offered, and for whom. Sweat that became prayer.</p>
      ${offerings.length ? html`<ul class="entries">${offerings.map(([k, w]) => html`<li><span>${fmtDate(k)} — <em>${w.intention}</em></span><span class="small muted">${w.sets.length} sets</span></li>`)}</ul>`
        : html`<p class="muted small">Set an intention on the Train tab to start your ledger.</p>`}
    </section>`;
}

async function loadGospel(key) {
  ui.gospel[key] = { loading: true };
  render();
  try {
    const data = await fetchGospel(key);
    ui.gospel[key] = { data };
    update((s) => { (s.faith[key] ??= { checks: {}, lectio: {}, examen: {} }).gospel = data; });
  } catch (err) {
    ui.gospel[key] = { error: err.message };
    render();
  }
}

// ---------- ME ----------

function renderMe(s) {
  const p = s.profile;
  const target = targetsFor(s);
  const o = p.overrides || {};
  return html`
    <section class="card">
      <h2>Your goals</h2>
      <form data-form="profile" class="grid-form">
        <label>Sex<select name="sex"><option value="male" ${p.sex === "male" ? "selected" : ""}>Male</option><option value="female" ${p.sex === "female" ? "selected" : ""}>Female</option></select></label>
        <label>Age<input name="age" type="number" min="14" max="100" value="${p.age}"></label>
        <label>Height (in)<input name="heightIn" type="number" min="48" max="96" step="0.5" value="${p.heightIn}"></label>
        <label>Start weight (lb)<input name="weightLb" type="number" step="0.1" value="${p.weightLb}"></label>
        <label>Goal weight (lb)<input name="goalWeightLb" type="number" step="0.1" value="${p.goalWeightLb}"></label>
        <label>Loss rate (lb/week)<select name="rateLbPerWeek">${[0.5, 0.75, 1, 1.25, 1.5, 2].map((r) => html`<option value="${r}" ${+p.rateLbPerWeek === r ? "selected" : ""}>${r}</option>`)}</select></label>
        <label class="span2">Activity<select name="activity">${ACTIVITY_LEVELS.map(([v, l]) => html`<option value="${v}" ${+p.activity === v ? "selected" : ""}>${l}</option>`)}</select></label>
        <button class="btn span2" type="submit">Save goals</button>
      </form>
    </section>

    <section class="card">
      <h2>Food preferences</h2>
      <form data-form="prefs" class="grid-form">
        <label class="span2">Diet for your daily menu<select name="diet">${Object.entries(DIETS).map(([k, v]) => html`<option value="${k}" ${k === (p.diet || "everything") ? "selected" : ""}>${v.label}</option>`)}</select></label>
        <label class="check span2"><input type="checkbox" name="meatlessFridays" ${p.meatlessFridays ? "checked" : ""}> Meatless menus on every Friday (Lenten Fridays and Ash Wednesday are always meatless)</label>
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
      <p class="small muted">How it's built: Mifflin–St Jeor BMR × activity, minus ~500 kcal per lb/week of loss. Protein is 1 g per lb of goal weight — the single biggest lever for keeping muscle while you cut. Fat has a floor for hormones; carbs fill the rest to fuel your lifts. Recalculates as your weigh-ins change.</p>
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
  view.innerHTML = RENDER[ui.tab](s)[RAW];
  if (ui.tab === "today") drawWeightChart(s);
  if (ui.tab === "train") drawLiftChart(s);
  if (ui.tab === "faith" && !ui.gospel[ui.date] && !s.faith[ui.date]?.gospel && navigator.onLine) loadGospel(ui.date);
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
    label.textContent = left ? `Rest ${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}` : "Go — next set! 💪";
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
    update((s) => { ensureWorkout(s, ui.date).sets.push(set); });
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
    update((s) => { s.program = { id, start: ui.date, tm }; });
    toast(`Started ${PROGRAMS[id].name}`);
  },
  prefs(d) {
    update((s) => { s.profile.diet = d.diet; s.profile.meatlessFridays = !!d.meatlessFridays; });
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
    const data = { source: d.source.trim(), text: d.text.trim(), heading: "", day: "", copyright: "" };
    ui.gospel[ui.date] = { data };
    update((s) => { ensureFaith(s, ui.date).gospel = data; });
  },
  profile(d) {
    update((s) => {
      Object.assign(s.profile, {
        sex: d.sex, age: +d.age, heightIn: +d.heightIn, weightLb: +d.weightLb,
        goalWeightLb: +d.goalWeightLb, rateLbPerWeek: +d.rateLbPerWeek, activity: +d.activity,
      });
    });
    toast("Goals saved");
  },
  overrides(d) {
    const o = { calories: num(d.calories), protein: num(d.protein), carbs: num(d.carbs), fat: num(d.fat) };
    update((s) => { s.profile.overrides = Object.values(o).some(Boolean) ? o : null; });
    toast("Targets saved");
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
  "load-gospel"() { loadGospel(ui.date); },
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
      const items = session.items.map((it) => ({ ...it, exId: ensureExercise(st, it.name, it.repMin, it.repMax).id }));
      w.plan = { programId: session.programId, dayIndex: session.dayIndex, dayName: session.dayName, week: session.week, deload: session.deload, items };
      w.order = [...new Set([...items.map((i) => i.exId), ...(w.order || [])])];
    });
  },
  "stop-program"() {
    if (confirm("Stop following this program? Your logged workouts stay.")) update((st) => { st.program = null; });
  },
  rest(el) { startRest(+el.dataset.sec); },
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
    const g = ui.gospel[ui.date]?.data || s.faith[ui.date]?.gospel;
    if (!g) return;
    ui.busy = { reflect: true };
    render();
    try {
      const text = await generateReflection({
        apiKey: s.settings.apiKey, date: fmtDate(ui.date, { weekday: "long", year: "numeric", month: "long", day: "numeric" }),
        liturgicalDay: g.day || liturgicalDay(ui.date).season, gospelRef: g.source, gospelText: g.text,
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
    URL.revokeObjectURL(a.href);
  },
};

const changes = {
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
  if (link) return go(link.dataset.goto);
  const act = e.target.closest("button[data-action]");
  if (act && actions[act.dataset.action]) actions[act.dataset.action](act);
});

document.addEventListener("input", (e) => {
  if (e.target.dataset?.live !== "ex-query") return;
  ui.exQuery = e.target.value;
  ui.exPick = null;
  ui.exLookup = null;
  const box = document.getElementById("ex-results");
  if (box) box.innerHTML = exResults(getState())[RAW];
});

document.addEventListener("change", (e) => {
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

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
