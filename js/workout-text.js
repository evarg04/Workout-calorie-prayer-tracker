// Parse a typed or pasted workout ("Single arm cable row 3x8 60 lbs") into sets.

import { matchExercise, MATCH_SURE, MATCH_MAYBE } from "./exercise-db.js";

const PLATE = 45;

export function parseWorkoutText(text, library = []) {
  return text.split(/\n|;/).map((line) => line.trim()).filter(Boolean).map((line) => parseLine(line, library)).filter(Boolean);
}

function parseLine(line, library) {
  let rest = ` ${line} `;
  const notes = [];

  // sets x reps (4x10, 4 x 10, 4×10, "4 sets of 10")
  let sets = 1, reps = null;
  const sx = rest.match(/(\d+)\s*(?:x|×|sets? of)\s*(\d+)/i);
  if (sx) { sets = +sx[1]; reps = +sx[2]; rest = rest.replace(sx[0], " "); }
  else {
    const r = rest.match(/(\d+)\s*reps?/i);
    if (r) { reps = +r[1]; rest = rest.replace(r[0], " "); }
  }
  if (!reps) return { line, error: "Couldn't find sets × reps (e.g. 3x8)." };

  // weight: "3 plates each side", "60 lbs", "@ 60", "bodyweight"
  let weight = 0;
  const plates = rest.match(/(\d+(?:\.\d+)?)\s*plates?(\s*(?:each|per|a)\s*side)?/i);
  const lbs = rest.match(/@?\s*(\d+(?:\.\d+)?)\s*(?:lbs?|pounds|#)/i) || rest.match(/@\s*(\d+(?:\.\d+)?)/);
  if (plates) {
    const perSide = /side/i.test(plates[2] || "") ;
    weight = +plates[1] * PLATE * (perSide ? 2 : 1);
    notes.push(`${plates[1]} plate${+plates[1] === 1 ? "" : "s"}${perSide ? " each side" : ""} = ${weight} lb of plates (machine weight not included)`);
    rest = rest.replace(plates[0], " ");
  } else if (lbs) {
    weight = +lbs[1];
    rest = rest.replace(lbs[0], " ");
  } else {
    notes.push("No weight given: logged as bodyweight (0 lb added)");
  }
  if (/\b(bw|body ?weight)\b/i.test(rest)) rest = rest.replace(/\b(bw|body ?weight)\b/i, " ");
  if (/\b(unilateral|single[ -]arm|one[ -]arm|each arm|per arm)\b/i.test(line) && weight) notes.push(`${weight} lb per arm`);

  const name = rest.replace(/\s+/g, " ").trim();
  const matches = matchExercise(name, library);
  const top = matches[0];
  const status = top && top.score >= MATCH_SURE ? "sure" : top && top.score >= MATCH_MAYBE ? "check" : "new";
  return {
    line, name, sets, reps, weight, notes,
    exercise: status === "new" ? null : top.ex.name,
    options: matches.slice(0, 4).map((m) => m.ex.name),
    status,
  };
}

// Parse a list of maxes: "Bench 280", "Fly machine 140 for 6-8", "40 lbs db curl and hammer curl".
// No reps given means a 1-rep max.
export function parseMaxes(text, library = []) {
  const out = [];
  for (const line of text.split(/\n|;/).map((l) => l.trim()).filter(Boolean)) {
    let rest = ` ${line} `;
    const notes = [];
    let reps = 1;
    const r = rest.match(/(?:for|x|×)\s*(\d+)(?:\s*[-–]\s*(\d+))?\s*(?:reps?)?/i);
    if (r) { reps = +r[1]; rest = rest.replace(r[0], " "); if (r[2]) notes.push(`Range ${r[1]}–${r[2]}: used ${r[1]} reps`); }
    let weight = null;
    const plates = rest.match(/(\d+(?:\.\d+)?)\s*plates?(\s*(?:each|per|a)\s*side)?/i);
    const lbs = rest.match(/(\d+(?:\.\d+)?)\s*(?:lbs?|pounds|#)?/i);
    if (plates) {
      const perSide = /side/i.test(plates[2] || "");
      weight = +plates[1] * PLATE * (perSide ? 2 : 1);
      notes.push(`${plates[1]} plate${+plates[1] === 1 ? "" : "s"}${perSide ? " each side" : ""} = ${weight} lb of plates`);
      rest = rest.replace(plates[0], " ");
    } else if (lbs) {
      weight = +lbs[1];
      rest = rest.replace(lbs[0], " ");
    }
    if (weight == null) { out.push({ line, error: "Couldn't find a weight." }); continue; }
    if (reps === 1) notes.push("No reps given: treated as a 1-rep max");
    const names = rest.replace(/\s+/g, " ").trim().split(/\s+(?:and|&)\s+|,\s*/i).map((n) => n.trim()).filter(Boolean);
    for (const name of names.length ? names : [""]) {
      const top = matchExercise(name, library)[0];
      const matches = matchExercise(name, library);
      out.push({
        line, name, weight, reps, notes,
        exercise: top && top.score >= MATCH_MAYBE ? top.ex.name : null,
        options: matches.slice(0, 4).map((m) => m.ex.name),
        status: top && top.score >= MATCH_SURE ? "sure" : top && top.score >= MATCH_MAYBE ? "check" : "new",
      });
    }
  }
  return out;
}
