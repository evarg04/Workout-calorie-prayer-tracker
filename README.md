# ✠ Temple Training

*"Do you not know that your body is a temple of the Holy Spirit?… So glorify God in your body."* — 1 Cor 6:19–20

A phone-friendly app for losing fat **while keeping and building muscle**, plus a daily Catholic rule of life. It installs to your home screen, works offline, and keeps all data on your device.

## What it does

### 🍽️ Food: calories and macros
- Works out your targets from your stats: Mifflin–St Jeor BMR × activity, minus ~500 kcal for each lb/week you want to lose. The loss rate is capped at ~1% of bodyweight per week, because cutting faster than that costs muscle.
- **Protein is 1 g per lb of goal weight.** That's the biggest lever for keeping muscle in a deficit. Fat has a minimum; carbs fill the rest to fuel your lifts.
- Log food by meal. Leave calories blank and they're worked out from the macros. Save foods you eat often for one-tap logging.
- Shows a 7-day average against your targets.

### 🥗 Daily menu: 3 meals, a snack, and a healthy dessert
- Each day gets a menu built from 48 recipes, many of them popular TikTok-style recipes (protein overnight oats, the salmon rice bowl, cottage cheese flatbread pizza, yogurt bark, Creami protein ice cream, cottage cheese cookie dough). Macros come from USDA values for each ingredient.
- **Portions are scaled to hit your calories and protein.** The planner tries thousands of combinations and picks the closest fit. **Swap** any meal, or **Log it** with one tap.
- Pick a diet: everything, pescatarian, vegetarian, vegan, dairy-free, or gluten-free. Diet labels come from the ingredients, so they're never wrong.
- Lenten Fridays and Ash Wednesday menus are meatless automatically. You can also choose meatless menus on every Friday.
- **Plan 7 days** gives you a full week of menus and one combined grocery list.
- **Scan a nutrition label** (needs your API key): take a photo of a label, menu, or app screen and the calories and macros fill in. You check the numbers, set how many servings you ate, and log it with one tap. Per-100 g labels, blurry photos, and photos with no label are flagged for you to double-check.
- **Find recipes on TikTok & the web** (needs your API key): searches TikTok creators and recipe sites for meals that fit your macros and diet, with a link to each source. Recipes you save join your menu rotation.

### 📈 "Am I on pace?"
The Today tab combines three signals:
1. **Food:** weekly calorie average and how many days you hit your protein goal.
2. **Scale:** a trend line through your daily weigh-ins, your weekly loss rate, and a projected date for reaching your goal. It warns you if you're losing too fast.
3. **Strength:** whether your estimated 1-rep maxes are holding or rising. If you're losing weight but your lifts are dropping, it tells you to eat more or slow down.

### 🏋️ Train: progressive overload
- Uses **double progression** for each lift. Every exercise has a rep range (for example, bench 5–8). Once every set reaches the top of the range, it tells you to add weight (+5 lb upper body, +10 lb lower body). Otherwise it gives you the exact reps to beat from last time.
- After two stalled sessions at the same weight, it suggests a 10% deload.
- Marks PRs automatically and charts your estimated 1RM (Epley formula) for each lift.
- You can edit the exercise library, rep ranges, and weight increments.

### 📋 Proven programs
Pick one and the app loads each day's workout, with sets, reps, and rest times:

| Program | Days | Best for |
|---|---|---|
| **FST-7** (Hany Rambod; used with Mr. Olympia winners Jay Cutler and Phil Heath) | 5 | Size and fullness. Heavy 3 × 8–12 work, then a 7-set short-rest finisher |
| **Push/Pull/Legs** (the r/Fitness beginner PPL) | 6 | Fast size and strength. Linear 5×5 main lifts plus 8–12 accessories |
| **Upper/Lower Hypertrophy**, built on Schoenfeld et al. (2016, 2017) | 4 | Best all-round choice while cutting. 2× per week frequency, 10–20 sets per muscle |
| **5/3/1 Boring But Big** (Jim Wendler) | 4 | Long-term strength. Training-max waves with a built-in deload week |
| **Novice Linear Progression** (Starting Strength model) | 3 | New lifters. Add weight every session |

**Type any exercise.** Type it the way you say it ("incline db press", "RDL", "skull crushers", typos too):
- About 55 exercises are built in, each with setup, steps, cues and common mistakes.
- If a name could mean more than one exercise (like "leg curl"), the app asks which one you mean.
- If it doesn't know the exercise, it looks it up online (needs your API key) and shows a description, how to perform it, and sources. You confirm or correct it before it's added.

**Coach feedback on every set and workout:**
- **Each set** is compared to the same set last session: progressed ✓, matched, or down. It's also checked against your rep range ("too light, add 5 lb" or "too heavy, drop ~10%").
- **Effort:** you can log RIR (reps in reserve). Sets with 4+ reps left are flagged as too easy, and failure on early sets of big lifts gets a warning.
- **Each exercise** gets a verdict comparing its estimated 1RM and volume to last session.
- **A workout review** shows how many lifts progressed, held or went down, your PRs, total volume, and the exact target for next time.
- **Ask the coach** (needs your API key): ask a question about any exercise, with your recent sets as context.

**Built to prevent stalls:**
- Every exercise progresses on its own rep range.
- After two missed sessions, the app drops the weight 10% so you can build back up.
- A deload week is scheduled every 6–8 weeks; 5/3/1 has its own deload built in.
- A **weekly volume** check shows hard sets per muscle against the 10–20 sets/week range research supports.
- A **rest timer** starts on its own after each set (FST-7 finishers use 30–45 s).

No program can promise you'll never plateau, especially while cutting. These are the tools that prevent most stalls and get you past the rest.

### ✝️ Faith: *The Disciplined Disciple*
A rule of life built for a Catholic who trains:
- **Daily Gospel**, loaded automatically from the Universalis Mass feed. There's a link to the USCCB readings for the same day, and you can paste the text yourself if you're offline.
- **Catholic reflection (optional):** an AI-written commentary on the day's Gospel that draws on the Fathers, the saints, and the Catechism, and ends with a resolution and a short prayer. It needs your own Anthropic API key, which stays on your device. It's meant as an aid to prayer, not as Church teaching.
- **Lectio Divina** journal: Read, Reflect, Respond, Rest.
- **Daily rule checklist:** Morning Offering, Gospel, Angelus (Regina Caeli during Easter), offered workout, Rosary (with the mysteries for the day), temperance at table, and the evening Examen. The workout and temperance boxes check themselves from your logs. Keep 5 of the 7 to build a streak.
- **Offer It Up:** set an intention before each workout and offer your hardest set for someone. The **Spiritual Ledger** records who each workout was offered for.
- **Virtue of the week:** cycles through 12 virtues (Temperance, Fortitude, Humility…). Each one comes with a body practice, a soul practice, a Scripture verse, and a saint, including St. Sebastian (patron of athletes) and St. Pier Giorgio Frassati.
- **Penance built into nutrition:** Fridays, Lenten abstinence, and the Ash Wednesday and Good Friday fasts appear on the Food tab, with a "contains meat" flag on Fridays.
- **The app follows the liturgical year:** the theme color changes with the season (green, violet, white/gold, red, and rose on Gaudete and Laetare Sundays).

## Run it

It's plain HTML, CSS, and JavaScript with no build step. Serve the folder with any static server:

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

**On your phone:** enable GitHub Pages for this repo (Settings → Pages → deploy from `main` / root). Open the URL in Safari or Chrome and choose **Add to Home Screen**.

## Your data

Everything is stored in your browser's `localStorage`. Use **Me → Export** regularly to make a backup file (your API key is left out of it). Use **Import** to restore or move to another device.
