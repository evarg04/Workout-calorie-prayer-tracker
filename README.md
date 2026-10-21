# ✠ Temple Training

*"Do you not know that your body is a temple of the Holy Spirit?… So glorify God in your body."* — 1 Cor 6:19–20

A phone-friendly app for losing fat **while keeping and building muscle**, plus a daily Catholic rule of life. It installs to your home screen, works offline, and keeps all data on your device.

## What it does

### 🍽️ Food: calories and macros
- Works out your targets from your stats: Mifflin–St Jeor BMR × activity, minus ~500 kcal for each lb/week you want to lose. The loss rate is capped at ~1% of bodyweight per week, because cutting faster than that costs muscle.
- **Protein is 1 g per lb of goal weight.** That's the biggest lever for keeping muscle in a deficit. Fat has a minimum; carbs fill the rest to fuel your lifts.
- Log food by meal. Leave calories blank and they're worked out from the macros. Save foods you eat often for one-tap logging.
- Shows a 7-day average against your targets.

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
