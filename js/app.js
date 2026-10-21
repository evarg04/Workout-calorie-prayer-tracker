import { getState, update, subscribe, uid, dateKey, addDays, parseKey, exportJSON, importJSON } from "./store.js";
import { computeTargets, totals, weightTrend, latestWeight, movingAverage, weeklyAdherence, paceVerdict, ACTIVITY_LEVELS } from "./nutrition.js";
import { suggestNext, history as sessionsFor, bestE1rm, isPR, strengthSummary } from "./lifts.js";
import { liturgicalDay, penanceNote, mysteriesFor, PRAYERS, EXAMEN, LECTIO, virtueOfWeek, fetchGospel, usccbUrl } from "./liturgy.js";
import { lineChart } from "./chart.js";
import { generateReflection, renderMarkdown } from "./reflect.js";

// ---------- tiny templating: interpolations are escaped unless wrapped in raw() ----------
const RAW = Symbol("raw");
const raw = (s) => ({ [RAW]: String(s) });
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const val = (v) => (Array.isArray(v) ? v.map(val).join("") : v && v[RAW] !== undefined ? v[RAW] : v === false || v == null ? "" : esc(v));
const html = (strings, ...vals) => raw(strings.reduce((out, s, i) => out + s + (i < vals.length ? val(vals[i]) : ""), ""));

const ui = { tab: location.hash.slice(1) || "today", date: dateKey(), chartEx: null, gospel: {}, busy: {} };
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

function renderTrain(s) {
  const key = ui.date;
  const w = workoutFor(s, key);
  const exById = Object.fromEntries(s.exercises.map((e) => [e.id, e]));
  const order = [...new Set([...(w.order || []), ...w.sets.map((x) => x.exId)])].filter((id) => exById[id]);
  ui.chartEx ??= order[0] || s.exercises[0]?.id;

  return html`
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

    <section class="card">
      <h2>Add exercise</h2>
      <form class="inline" data-form="add-ex">
        <label class="grow">Exercise<select name="exId">${s.exercises.filter((e) => !order.includes(e.id)).map((e) => html`<option value="${e.id}">${e.name}</option>`)}</select></label>
        <button class="btn" type="submit">Add</button>
      </form>
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
          <label>Increment lb<input name="increment" type="number" step="0.5" min="0.5" value="5"></label>
          <label>Min reps<input name="repMin" type="number" min="1" value="6"></label>
          <label>Max reps<input name="repMax" type="number" min="1" value="10"></label>
          <button class="btn span2" type="submit">Add to library</button>
        </form>
      </details>
    </section>`;
}

function exerciseCard(s, ex, w, key) {
  const sets = w.sets.filter((x) => x.exId === ex.id);
  const sug = suggestNext(ex, s.workouts, key);
  const nextReps = sug.repsPerSet?.[sets.length] ?? sug.reps;
  const lastWeight = sets.length ? sets[sets.length - 1].weight : sug.weight;
  return html`
    <section class="card">
      <h3>${ex.name} <span class="small muted">${ex.repMin}–${ex.repMax} reps</span></h3>
      <p class="suggest suggest-${sug.kind || "new"}">${sug.kind === "up" ? "⬆️ " : sug.kind === "deload" ? "↘️ " : "🎯 "}${sug.note}</p>
      ${sets.length ? html`<ol class="sets">${sets.map((x) => html`
        <li><span><strong>${x.weight}</strong> lb × <strong>${x.reps}</strong>${isPR(s.workouts, ex.id, x, key) ? html` <span class="tag pr">PR</span>` : ""}</span>
        <button type="button" class="icon-btn" data-action="del-set" data-id="${x.id}" aria-label="Delete set">✕</button></li>`)}</ol>` : ""}
      <form class="inline" data-form="set" data-ex="${ex.id}">
        <label>lb<input name="weight" type="number" inputmode="decimal" step="0.5" min="0" value="${lastWeight ?? ""}" required></label>
        <label>reps<input name="reps" type="number" inputmode="numeric" min="1" value="${nextReps}" required></label>
        <button class="btn" type="submit">Log set ${sets.length + 1}</button>
      </form>
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
  "add-ex"(d) { if (d.exId) update((s) => { const w = ensureWorkout(s, ui.date); if (!w.order.includes(d.exId)) w.order.push(d.exId); }); ui.chartEx = d.exId; },
  set(d, form) {
    update((s) => { ensureWorkout(s, ui.date).sets.push({ id: uid(), exId: form.dataset.ex, weight: +d.weight, reps: +d.reps }); });
  },
  "new-ex"(d) {
    const repMin = +d.repMin, repMax = Math.max(+d.repMax, repMin);
    update((s) => { s.exercises.push({ id: uid(), name: d.name.trim(), kind: d.kind, repMin, repMax, increment: +d.increment }); });
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
