// Optional AI-written Catholic reflection on the day's Gospel (see ai.js for the client).

import { ask } from "./ai.js";

const SYSTEM = `You are a faithful Catholic spiritual writer helping a lay Catholic pray with the day's Gospel.
Use the readings exactly as published by the USCCB (New American Bible, Revised Edition), the translation proclaimed at Mass in the United States. Quote only short phrases.
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

export async function generateReflection({ apiKey, date, liturgicalDay, readingsUrl, gospelRef, gospelText }) {
  const content = gospelText
    ? `Date: ${date}\nLiturgical season: ${liturgicalDay}\nGospel (NABRE, from the USCCB): ${gospelRef || ""}\n\n${gospelText}`
    : `Date: ${date}\nLiturgical season: ${liturgicalDay}\nToday's readings from the USCCB: ${readingsUrl}\n\nFetch that page, find the Gospel, and write the reflection on it. Name the Gospel reference at the start.`;
  return ask({
    apiKey,
    system: SYSTEM,
    content,
    tools: gospelText ? undefined : [{ type: "web_fetch_20260209", name: "web_fetch", max_uses: 2, allowed_domains: ["bible.usccb.org"] }],
  });
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
