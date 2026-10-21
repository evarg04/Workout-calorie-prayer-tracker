// Shared Claude client (user's own API key, kept on this device) and the web recipe finder.

const SDK_URL = "https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@0.131.0/+esm";
const MODEL = "claude-opus-5-5";

let cached = { key: null, promise: null };

export function getClient(apiKey) {
  if (!apiKey) throw new Error("Add your Anthropic API key on the Me tab first.");
  if (cached.key !== apiKey) {
    cached = {
      key: apiKey,
      promise: import(SDK_URL).then(({ default: Anthropic }) => ({
        Anthropic,
        client: new Anthropic({ apiKey, dangerouslyAllowBrowser: true }),
      })),
    };
  }
  return cached.promise;
}

export function friendlyError(Anthropic, err) {
  if (err instanceof Anthropic.AuthenticationError) return new Error("Your API key was rejected. Check it on the Me tab.");
  if (err instanceof Anthropic.RateLimitError) return new Error("Rate limited — wait a minute and try again.");
  if (err instanceof Anthropic.APIConnectionError) return new Error("Couldn't reach the API. Check your connection.");
  if (err instanceof Anthropic.APIError) return new Error(`API error ${err.status}: ${err.message}`);
  return err;
}

export async function ask({ apiKey, system, content, tools, effort = "medium", format }) {
  const { Anthropic, client } = await getClient(apiKey);
  const messages = [{ role: "user", content }];
  try {
    let response;
    const blocks = [];
    // Server-side tools (web search) can pause a long turn; resume by resending it.
    for (let i = 0; i < 5; i++) {
      response = await client.beta.messages.create({
        model: MODEL,
        max_tokens: 16000,
        output_config: format ? { effort, format } : { effort },
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        system,
        tools,
        messages,
      });
      blocks.push(...response.content);
      if (response.stop_reason !== "pause_turn") break;
      const last = messages[messages.length - 1];
      if (last.role === "assistant") last.content = [...last.content, ...response.content];
      else messages.push({ role: "assistant", content: [...response.content] });
    }
    if (response.stop_reason === "refusal") throw new Error("The model declined this request.");
    const text = blocks.filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
    if (!text) throw new Error("Empty response — try again.");
    return text;
  } catch (err) {
    throw friendlyError(Anthropic, err);
  }
}

const RECIPE_SYSTEM = `You find real, published recipes on the web for a meal-planning app.
Search TikTok food creators and reputable recipe sites (blogs, magazines, fitness creators). Only return recipes you actually found with web search, each with the exact URL of the page or video you found. Never invent a URL, a creator, or a recipe.
Use the macros the source publishes when it gives them; otherwise estimate them from the ingredient list and set "macrosEstimated": true.
Reply with a short sentence, then exactly one \`\`\`json code block holding an array of up to 4 objects:
{"name": string, "sourceName": string, "url": string, "servings": number,
 "perServing": {"cal": number, "p": number, "c": number, "f": number},
 "macrosEstimated": boolean,
 "contains": {"meat": boolean, "fish": boolean, "dairy": boolean, "egg": boolean, "gluten": boolean},
 "ingredients": [string], "steps": [string]}`;

export async function findWebRecipes({ apiKey, slot, dietLabel, target, extra }) {
  const content = `Find high-protein ${slot} recipes that fit a fat-loss, muscle-keeping diet.
Diet: ${dietLabel}.
Per serving, aim for roughly ${Math.round(target.cal)} kcal and at least ${Math.round(target.p)} g protein (carbs ~${Math.round(target.c)} g, fat ~${Math.round(target.f)} g).
${extra ? `The user also asked for: ${extra}` : ""}
Prefer popular TikTok recipes when they fit; reputable recipe sites are fine too.`;

  const text = await ask({
    apiKey, system: RECIPE_SYSTEM, content,
    tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 6 }],
  });
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  let list;
  try {
    list = JSON.parse(match ? match[1] : text);
  } catch {
    throw new Error("Couldn't read the recipes that came back. Try again.");
  }
  if (!Array.isArray(list)) throw new Error("No recipes came back. Try a different request.");

  const num = (v) => (Number.isFinite(+v) ? +v : 0);
  return list
    .filter((r) => r && r.name && /^https?:\/\//.test(r.url || "") && r.perServing)
    .map((r) => ({
      name: String(r.name).slice(0, 120),
      slot,
      source: { name: String(r.sourceName || new URL(r.url).hostname).slice(0, 80), url: r.url },
      per: { cal: num(r.perServing.cal), p: num(r.perServing.p), c: num(r.perServing.c), f: num(r.perServing.f) },
      estimated: !!r.macrosEstimated,
      flags: [
        r.contains?.meat && "m", r.contains?.fish && "f", r.contains?.dairy && "d",
        r.contains?.egg && "e", r.contains?.gluten && "g",
      ].filter(Boolean),
      ingredients: (r.ingredients || []).map(String).slice(0, 30),
      steps: (r.steps || []).map(String).slice(0, 15),
    }))
    .filter((r) => r.per.cal > 0);
}

const EXERCISE_SYSTEM = `You identify gym exercises for a strength-training app and explain exactly how they are performed.
Use web search to find authoritative sources (e.g. ExRx.net, NSCA, ACE, reputable coaches or university sites, well-known strength coaches). Only cite URLs you actually found.
If the name is ambiguous, pick the most common meaning and list the other meanings in "alternatives". If it is not a real exercise, set "found": false.
Reply with one short sentence, then exactly one \`\`\`json code block with:
{"found": boolean, "name": string, "aliases": [string], "description": string,
 "kind": "upper" | "lower",
 "muscle": one of ["chest","back","shoulders","biceps","triceps","quads","hamstrings","glutes","calves","abs"],
 "secondary": [string], "equipment": string,
 "repMin": number, "repMax": number, "increment": number,
 "steps": [string], "cues": [string], "mistakes": [string],
 "alternatives": [string],
 "sources": [{"name": string, "url": string}]}
repMin/repMax: a sensible hypertrophy range for this exercise. increment: smallest practical weight jump in lb (0 for bodyweight).`;

const MUSCLE_SET = new Set(["chest", "back", "shoulders", "biceps", "triceps", "quads", "hamstrings", "glutes", "calves", "abs"]);

function parseJsonBlock(text) {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  try {
    return JSON.parse(match ? match[1] : text);
  } catch {
    throw new Error("Couldn't read the answer that came back. Try again.");
  }
}

export async function lookupExercise({ apiKey, query }) {
  const text = await ask({
    apiKey, system: EXERCISE_SYSTEM,
    content: `The user typed this exercise into their workout log: "${query}". Identify it and explain how it is performed.`,
    tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 5 }],
  });
  const r = parseJsonBlock(text);
  if (!r || !r.found || !r.name) return { found: false, alternatives: (r?.alternatives || []).map(String).slice(0, 5) };
  const list = (x, n = 8) => (Array.isArray(x) ? x.map(String).slice(0, n) : []);
  const repMin = Math.max(1, Math.round(+r.repMin || 8));
  return {
    found: true,
    name: String(r.name).slice(0, 80),
    aliases: list(r.aliases),
    description: String(r.description || "").slice(0, 400),
    kind: r.kind === "lower" ? "lower" : "upper",
    muscle: MUSCLE_SET.has(r.muscle) ? r.muscle : "back",
    increment: Math.max(0, +r.increment || 0),
    repMin,
    repMax: Math.max(repMin, Math.round(+r.repMax || 12)),
    how: {
      steps: list(r.steps), cues: list(r.cues, 5), mistakes: list(r.mistakes, 5),
      equipment: String(r.equipment || "").slice(0, 80), secondary: list(r.secondary, 5),
      sources: (Array.isArray(r.sources) ? r.sources : [])
        .filter((x) => x && /^https?:\/\//.test(x.url || ""))
        .slice(0, 4).map((x) => ({ name: String(x.name || new URL(x.url).hostname).slice(0, 60), url: x.url })),
    },
    alternatives: list(r.alternatives, 5),
  };
}

const COACH_SYSTEM = `You are an experienced, evidence-based strength coach inside a workout-tracking app.
Answer the lifter's question about one exercise in under 150 words of plain Markdown: direct, practical, safe. Use the recent sets given for context when relevant (progression, rep ranges, effort).
If the question suggests pain or injury, advise stopping that movement and seeing a qualified professional.`;

export async function askCoach({ apiKey, exercise, question, recent }) {
  return ask({
    apiKey, system: COACH_SYSTEM, effort: "low",
    content: `Exercise: ${exercise}\nRecent sessions (newest first): ${recent || "none logged"}\n\nQuestion: ${question}`,
  });
}

// ---------- nutrition label scanning ----------

const LABEL_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["found", "name", "servingSize", "basis", "calories", "protein", "carbs", "fat", "confidence", "notes"],
  properties: {
    found: { type: "boolean" },
    name: { type: "string" },
    servingSize: { type: "string" },
    basis: { type: "string", enum: ["per serving", "per 100 g", "whole item", "estimated from photo"] },
    calories: { type: "number" },
    protein: { type: "number" },
    carbs: { type: "number" },
    fat: { type: "number" },
    confidence: { type: "string", enum: ["high", "medium", "low"] },
    notes: { type: "string" },
  },
};

const LABEL_SYSTEM = `You read nutrition information from photos for a food-logging app.
The photo is usually a Nutrition Facts label, but may be a restaurant menu, a package front, or an app screenshot showing macros.
Report calories and grams of protein, total carbohydrate and total fat for ONE serving exactly as printed. If the label has several columns (per serving / per container, as sold / prepared), use the per-serving, as-sold column and say so in notes. If only per-100 g values are shown, report those with basis "per 100 g".
Give the food a short name from the package or menu if visible, else a plain description.
If no nutrition numbers are visible but the photo clearly shows food, estimate a typical portion, set basis "estimated from photo" and confidence "low". If you cannot tell, set found false.
Never guess digits you cannot read; lower the confidence and explain in notes instead.`;

export async function readNutrition({ apiKey, base64, mediaType }) {
  const text = await ask({
    apiKey, system: LABEL_SYSTEM, effort: "low", format: { type: "json_schema", schema: LABEL_SCHEMA },
    content: [
      { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
      { type: "text", text: "Read the nutrition information in this photo." },
    ],
  });
  const r = JSON.parse(text);
  const n = (v) => (Number.isFinite(+v) && +v >= 0 ? Math.round(+v * 10) / 10 : 0);
  return { ...r, calories: n(r.calories), protein: n(r.protein), carbs: n(r.carbs), fat: n(r.fat) };
}

// Shrink a camera photo before upload: faster, cheaper, and well within the image size limits.
export async function photoToBase64(file, maxSide = 1568) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  return { dataUrl, base64: dataUrl.split(",")[1], mediaType: "image/jpeg" };
}
