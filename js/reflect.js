// Optional AI-written Catholic reflection on the day's Gospel, using the user's own
// Anthropic API key (stored only on this device). The SDK is loaded on demand.

const SDK_URL = "https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@0.131.0/+esm";

const SYSTEM = `You are a faithful Catholic spiritual writer helping a lay Catholic pray with the day's Gospel.
Write in the tradition of the Church: faithful to Scripture, Sacred Tradition and the Magisterium. Draw on the Catechism of the Catholic Church (cite paragraph numbers only when you are confident of them), the Church Fathers, Doctors of the Church and the saints. Never invent quotations; if unsure of exact wording, paraphrase and say so.
This reader is also disciplining their body — training for strength and eating with temperance to lose fat while keeping muscle — and wants to see that effort as part of their life in Christ (1 Cor 9:24–27), never as vanity.

Format in plain Markdown, about 350–450 words, with these sections:
## The Gospel in brief
Two or three sentences on what happens and its context.
## What the Church sees here
The heart of the Catholic interpretation: the key theological meaning, with one voice from Tradition (a Father, Doctor or saint) and a Catechism link where apt.
## For your life today
Concrete application to work, family and prayer; one brief, natural connection to discipline of the body if the text allows — do not force it.
## Today's resolution
One specific, doable resolution, one sentence.
## A short prayer
Three to four lines.`;

let cached = { key: null, promise: null };

function getClient(apiKey) {
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

export async function generateReflection({ apiKey, date, liturgicalDay, gospelRef, gospelText }) {
  if (!apiKey) throw new Error("Add your Anthropic API key on the Me tab first.");
  const { Anthropic, client } = await getClient(apiKey);

  try {
    const response = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      output_config: { effort: "medium" },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM,
      messages: [{
        role: "user",
        content: `Date: ${date}\nLiturgical day: ${liturgicalDay}\nGospel: ${gospelRef}\n\n${gospelText}`,
      }],
    });
    if (response.stop_reason === "refusal") throw new Error("The model declined to write a reflection for this text.");
    const text = response.content.filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
    if (!text) throw new Error("Empty reflection returned — try again.");
    return text;
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) throw new Error("Your API key was rejected. Check it on the Me tab.");
    if (err instanceof Anthropic.RateLimitError) throw new Error("Rate limited — wait a minute and try again.");
    if (err instanceof Anthropic.APIConnectionError) throw new Error("Couldn't reach the API. Check your connection.");
    if (err instanceof Anthropic.APIError) throw new Error(`API error ${err.status}: ${err.message}`);
    throw err;
  }
}

// Tiny Markdown renderer for the reflection: escapes first, then headings/bold/italic/lists.
export function renderMarkdown(md) {
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const inline = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/(^|[^*])\*(?!\s)(.+?)\*/g, "$1<em>$2</em>");
  const out = [];
  let list = false;
  for (const raw of md.split("\n")) {
    const line = raw.trim();
    const isItem = /^[-*] /.test(line);
    if (list && !isItem) { out.push("</ul>"); list = false; }
    if (!line) continue;
    if (/^#{1,3} /.test(line)) out.push(`<h4>${inline(line.replace(/^#+ /, ""))}</h4>`);
    else if (isItem) { if (!list) { out.push("<ul>"); list = true; } out.push(`<li>${inline(line.slice(2))}</li>`); }
    else out.push(`<p>${inline(line)}</p>`);
  }
  if (list) out.push("</ul>");
  return out.join("");
}
