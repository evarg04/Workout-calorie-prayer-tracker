// Warm-up, stretching and (optional) sauna guidance, with the evidence behind each.

// ---------- warm-up: RAMP (Raise, Activate & Mobilize, Potentiate) ----------

export const RAISE = { name: "Easy cardio", dose: "5 min", cue: "Bike, rower or incline walk. Breathing a little harder, able to talk in full sentences." };

const MOBILITY = {
  lower: [
    ["Leg swings, front to back", "10 each leg", "Hold a rack for balance; swing from the hip, gradually higher."],
    ["Leg swings, side to side", "10 each leg", "Face the rack; open the hips."],
    ["Knee-to-wall ankle rocks", "10 each side", "Front foot a hand-width from the wall, drive the knee forward over the toes, heel down."],
    ["Glute bridges", "10", "Squeeze at the top for 2 seconds."],
    ["Bodyweight squats", "10", "Slow and deep, chest tall, knees out."],
    ["Walking lunge with reach", "5 each leg", "Lunge, then reach both arms overhead to open the hip flexor."],
  ],
  upper: [
    ["Arm circles", "10 each direction", "Small to large."],
    ["Band pull-aparts", "15", "Arms straight, squeeze the shoulder blades together."],
    ["Band shoulder pass-throughs", "10", "Wide grip, straight arms, over the head and behind."],
    ["Scapular push-ups", "10", "Arms locked; let the chest sink between the shoulder blades, then push the floor away."],
    ["Thoracic open books", "6 each side", "Lie on your side, knees bent, rotate the top arm open and follow it with your eyes."],
    ["Band external rotations", "12 each arm", "Elbow at your side, rotate the forearm out."],
  ],
};

export function dayKind(exercises) {
  const lower = exercises.filter((e) => e.kind === "lower").length;
  const upper = exercises.length - lower;
  if (!exercises.length) return "full";
  if (lower && upper && Math.min(lower, upper) / exercises.length >= 0.34) return "full";
  return lower > upper ? "lower" : "upper";
}

export function mobilityFor(kind) {
  if (kind === "full") return [...MOBILITY.lower.slice(0, 3), ...MOBILITY.upper.slice(0, 3)];
  return MOBILITY[kind];
}

const round5 = (x) => Math.max(0, Math.round(x / 5) * 5);

// Warm-up sets toward a lift's working weight. Built not to fatigue: reps drop as the load
// climbs, every set stays far from failure, and muscles that are already warm get one feeder
// set (or none) instead of a full ramp.
export function warmupSets({ workWeight, workReps, equipment = "", warm = false, increment = 5, tm = null }) {
  if (!workWeight || workWeight < 20 || increment === 0) {
    return { sets: [], note: workWeight ? "No warm-up sets needed. Make your first working set smooth and controlled." : "" };
  }
  const barbell = /barbell|smith/i.test(equipment);
  const step = barbell || workWeight >= 50 ? 5 : 2.5;
  const r = (x) => Math.round(x / step) * step;
  const heavy = workReps <= 6;
  let scheme;
  if (tm) scheme = [[0.4 * tm, 5], [0.5 * tm, 5], [0.6 * tm, 3]]; // Wendler's 5/3/1 warm-up, % of Training Max
  else if (warm) scheme = heavy ? [[0.6 * workWeight, 3]] : [[0.6 * workWeight, 5]];
  else if (barbell) scheme = heavy
    ? [[45, 8], [0.4 * workWeight, 5], [0.6 * workWeight, 3], [0.8 * workWeight, 2], [0.9 * workWeight, 1]]
    : [[45, 8], [0.5 * workWeight, 5], [0.7 * workWeight, 3], [0.85 * workWeight, 1]];
  else scheme = heavy ? [[0.5 * workWeight, 6], [0.75 * workWeight, 3]] : [[0.5 * workWeight, 8], [0.75 * workWeight, 3]];

  const floor = barbell ? 45 : step;
  const sets = [];
  for (const [w, reps] of scheme) {
    const weight = Math.max(floor, r(w));
    if (weight >= workWeight) continue;
    if (sets.length && weight <= sets[sets.length - 1].weight) continue;
    if (barbell && weight === 45 && workWeight < 115 && !tm) continue; // light bar work: skip the empty-bar set
    sets.push({ weight, reps, pct: Math.round((weight / workWeight) * 100) });
  }
  const note = warm
    ? "These muscles are already warm from earlier lifts, so one easy feeder set is enough."
    : "Rest 45–60 seconds between warm-up sets and about 2 minutes before your first working set. They should all feel easy.";
  return { sets, note };
}

// ---------- stretching (after training or on rest days) ----------

export const STRETCHES = {
  lower: [
    ["Half-kneeling hip flexor stretch", "2 × 30 s each side", "Tuck the pelvis under and squeeze the back glute; lean forward only a little."],
    ["Standing or lying hamstring stretch", "2 × 30 s each side", "Hinge at the hip with a flat back until you feel a stretch, not pain."],
    ["Figure-4 glute stretch", "2 × 30 s each side", "On your back, ankle over the opposite knee, pull the bottom leg toward you."],
    ["Couch quad stretch", "2 × 30 s each side", "Back knee near a wall or bench, shin up; stay tall."],
    ["Wall calf stretch", "2 × 30 s each side", "Back heel down, knee straight, then repeat with the knee bent."],
  ],
  upper: [
    ["Doorway chest stretch", "2 × 30 s each side", "Forearm on the frame at shoulder height, step through gently."],
    ["Lat stretch (child's pose reach)", "2 × 30 s each side", "Walk both hands to one side to bias that lat."],
    ["Cross-body rear-shoulder stretch", "2 × 30 s each side", "Pull the arm across at chest height; keep the shoulder down."],
    ["Overhead triceps stretch", "2 × 30 s each side", "Hand down the back, gently press the elbow."],
    ["Thread the needle", "2 × 30 s each side", "On all fours, slide one arm under and rest the shoulder down."],
  ],
};

export const BREATHING = ["90/90 breathing", "1–2 min", "On your back, feet on a bench, slow nasal breaths in, long exhale. It brings your heart rate down and starts recovery."];

export function stretchesFor(kind) {
  if (kind === "full") return [...STRETCHES.lower.slice(0, 3), ...STRETCHES.upper.slice(0, 2)];
  return STRETCHES[kind];
}

export const WARMUP_EVIDENCE = [
  { claim: "Warming up improves performance in most strength and power tests.", source: "Fradkin et al., 2010, J Strength Cond Res (meta-analysis)", url: "https://pubmed.ncbi.nlm.nih.gov/?term=Effects%20of%20warming-up%20on%20physical%20performance%3A%20a%20systematic%20review%20with%20meta-analysis" },
  { claim: "The RAMP structure (raise, activate & mobilize, potentiate) is a standard sport-science warm-up framework.", source: "Jeffreys, 2007, \"Warm-up revisited: the RAMP method\", Professional Strength & Conditioning (UKSCA)", url: "" },
  { claim: "Static stretches held longer than about 60 seconds right before lifting can slightly reduce strength; short holds or dynamic work don't.", source: "Behm et al., 2016, Appl Physiol Nutr Metab (review)", url: "https://pubmed.ncbi.nlm.nih.gov/?term=Acute%20effects%20of%20muscle%20stretching%20on%20physical%20performance%2C%20range%20of%20motion%2C%20and%20injury%20incidence%20in%20healthy%20active%20individuals" },
];

export const STRETCH_EVIDENCE = [
  { claim: "Regular static stretching, about 30–60 s per muscle per session, improves range of motion.", source: "Behm et al., 2016; ACSM Guidelines for Exercise Testing and Prescription", url: "https://pubmed.ncbi.nlm.nih.gov/?term=Acute%20effects%20of%20muscle%20stretching%20on%20physical%20performance%2C%20range%20of%20motion%2C%20and%20injury%20incidence%20in%20healthy%20active%20individuals" },
  { claim: "Stretching does little to prevent muscle soreness, so its value is mobility and feeling good, not soreness relief.", source: "Herbert, de Noronha & Kamper, 2011, Cochrane Review", url: "https://pubmed.ncbi.nlm.nih.gov/?term=Stretching%20to%20prevent%20or%20reduce%20muscle%20soreness%20after%20exercise" },
];

// ---------- sauna (opt-in) ----------

export const SAUNA_LEVELS = {
  new: { label: "New to sauna", time: "5–10 min", rounds: "1 round", per: [5, 10], notes: "Build up over 2–3 weeks. Leave at the first sign of feeling unwell, even if your time isn't up." },
  regular: { label: "A few times a month", time: "10–15 min", rounds: "1–2 rounds, 5–10 min cooling between", per: [10, 15], notes: "Sit on a lower bench if it feels too hot." },
  experienced: { label: "Several times a week", time: "15–20 min", rounds: "2–3 rounds, 5–10 min cooling between", per: [15, 20], notes: "Keep each round at 20 minutes or less, and total heat time under about 45 minutes." },
};

export function saunaPlan(level, weightLb) {
  const L = SAUNA_LEVELS[level] || SAUNA_LEVELS.new;
  const w = weightLb || 180;
  // Keeping sweat loss under ~1% of body weight avoids the performance and safety costs
  // that show up around 2%; replace losses at ~1.25–1.5× (ACSM).
  const limitLb = Math.round(w * 0.01 * 10) / 10;
  return {
    ...L,
    temp: "Traditional dry sauna 174–194°F (80–90°C). Infrared runs cooler (120–140°F), so sessions can be a bit longer: 20–30 min.",
    frequency: "2–4 times a week is plenty; the long-term heart-health associations were seen at 4–7 times a week.",
    timing: "Best after training or on rest days, not right before lifting (it can leave you tired and dehydrated).",
    before: `Drink about 16 oz (500 mL) of water in the hour before.`,
    limitLb,
    limitText: `Weigh yourself before and after. Keep the loss under ${limitLb} lb (1% of your ${Math.round(w)} lb). If you lose more, shorten your next session.`,
    replaceText: `Afterward, drink about 20–24 oz of fluid for every pound lost, ideally with some sodium (a pinch of salt or a sports drink), over the next 1–2 hours.`,
    estimateText: `Typical sweat loss is roughly 1 lb per 15–20 minutes in a hot sauna, so at ${Math.round(w)} lb you'll usually stay under your limit within the times above. Hot days, a hard workout or a cut make it easier to over-lose, so weigh in.`,
  };
}

export const SAUNA_BENEFITS = [
  { claim: "Men who used a sauna 4–7 times a week had lower rates of cardiovascular death than those who went once a week. This is observational: an association, not proof.", source: "Laukkanen et al., 2015, JAMA Internal Medicine", url: "https://pubmed.ncbi.nlm.nih.gov/?term=Association%20between%20sauna%20bathing%20and%20fatal%20cardiovascular%20and%20all-cause%20mortality%20events" },
  { claim: "A single session lowers blood pressure and improves arterial stiffness for a while afterward, much like light exercise.", source: "Laukkanen et al., 2018, J Human Hypertension", url: "https://pubmed.ncbi.nlm.nih.gov/?term=Acute%20effects%20of%20sauna%20bathing%20on%20cardiovascular%20function" },
  { claim: "About 30 minutes of post-exercise sauna, roughly every other day for 3 weeks, improved run time to exhaustion in competitive male runners (likely via increased plasma volume).", source: "Scoon et al., 2007, J Sci Med Sport", url: "https://pubmed.ncbi.nlm.nih.gov/?term=Effect%20of%20post-exercise%20sauna%20bathing%20on%20the%20endurance%20performance%20of%20competitive%20male%20runners" },
  { claim: "Heat exposure helps people relax, and many sleep better; evidence for sleep is mostly self-reported.", source: "Hussain & Cohen, 2018, Evid Based Complement Alternat Med (review)", url: "https://pubmed.ncbi.nlm.nih.gov/?term=Clinical%20effects%20of%20regular%20dry%20sauna%20bathing%3A%20a%20systematic%20review" },
];

export const SAUNA_AVOID = [
  "Heart disease, a recent heart attack, chest pain, irregular heartbeat, or uncontrolled high or low blood pressure: ask your doctor first.",
  "Pregnancy.",
  "Any alcohol in your system, or medications that affect sweating, heart rate or blood pressure (diuretics, beta-blockers and others): ask your doctor.",
  "Fever or illness, or already dehydrated (after a very hard session, or a deliberate weight cut).",
  "Trying to conceive (men): regular sauna temporarily lowers sperm count; it recovers after stopping (Garolla et al., 2013, Human Reproduction).",
];

export const SAUNA_STOP = [
  "Dizziness or light-headedness", "Nausea", "Headache", "Racing or pounding heart", "Feeling confused or unusually weak",
];
