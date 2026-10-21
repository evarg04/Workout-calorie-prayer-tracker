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

export async function ask({ apiKey, system, content, tools, effort = "medium" }) {
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
        output_config: { effort },
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
