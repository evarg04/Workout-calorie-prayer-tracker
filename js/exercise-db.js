// Exercise knowledge base: how each lift is performed, and a fuzzy matcher so users can
// type exercises the way they say them ("incline db press", "RDL", "skull crushers").

// [name, aliases, kind, muscle, secondary, equipment, increment, repMin, repMax, steps, cues, mistakes]
const RAW = [
  // ---------- Quads / legs ----------
  ["Back Squat", ["squat", "barbell squat", "high bar squat", "low bar squat"], "lower", "quads", ["glutes", "adductors", "lower back"], "Barbell, rack", 10, 5, 8,
    ["Set the bar on your upper back (traps), hands just outside shoulders.", "Feet shoulder-width, toes slightly out. Brace your core hard.", "Sit down and slightly back until hips are at or below knee level.", "Drive up through the whole foot, chest up."],
    ["Big breath and brace before every rep", "Knees track over toes", "Keep the bar over mid-foot"],
    ["Knees caving in", "Heels lifting / weight on toes", "Cutting depth as the weight goes up"]],
  ["Front Squat", ["front squats"], "lower", "quads", ["glutes", "upper back"], "Barbell, rack", 5, 5, 8,
    ["Rest the bar on the front of your shoulders, elbows high (clean grip or crossed arms).", "Brace and sit straight down between your heels.", "Stand up keeping elbows high and torso upright."],
    ["Elbows up the whole rep", "Stay tall"], ["Elbows dropping so the bar rolls forward", "Rounding the upper back"]],
  ["Goblet Squat", ["db squat", "kettlebell squat"], "lower", "quads", ["glutes"], "Dumbbell or kettlebell", 5, 8, 12,
    ["Hold one dumbbell vertically against your chest.", "Squat down between your knees, elbows inside knees.", "Drive up, keeping chest tall."],
    ["Push knees out", "Weight in mid-foot"], ["Leaning forward", "Half reps"]],
  ["Leg Press", ["45 degree leg press", "sled press"], "lower", "quads", ["glutes"], "Leg press machine", 20, 10, 15,
    ["Sit with your back and hips flat on the pad, feet shoulder-width mid-platform.", "Unlock and lower until knees are about 90° or deeper without your lower back lifting.", "Press back up without locking the knees hard."],
    ["Keep hips glued to the seat", "Control the descent"], ["Lower back rounding off the pad at the bottom", "Bouncing out of the bottom", "Locking knees out"]],
  ["Hack Squat", ["hack squat machine"], "lower", "quads", ["glutes"], "Hack squat machine", 10, 8, 12,
    ["Shoulders under the pads, back flat, feet mid-platform.", "Release the safeties and squat down to full depth.", "Drive up through mid-foot."],
    ["Full depth, controlled", "Knees forward over toes is fine here"], ["Partial reps", "Heels lifting"]],
  ["Bulgarian Split Squat", ["bss", "rear foot elevated split squat", "split squat"], "lower", "quads", ["glutes", "adductors"], "Bench + dumbbells", 5, 8, 12,
    ["Rear foot on a bench behind you, front foot about two feet forward.", "Holding dumbbells, drop your back knee straight down toward the floor.", "Push through the front foot to stand. Finish all reps, then switch legs."],
    ["Most weight on the front leg", "Torso slightly forward for more glutes, upright for more quads"], ["Front foot too close to the bench", "Pushing off the back foot"]],
  ["Walking Lunge", ["lunges", "lunge", "db lunges"], "lower", "quads", ["glutes"], "Dumbbells", 5, 8, 12,
    ["Hold dumbbells at your sides and take a long step forward.", "Lower the back knee toward the floor.", "Drive through the front heel and step into the next rep."],
    ["Long steps for glutes", "Stay balanced and tall"], ["Front knee caving in", "Short, choppy steps"]],
  ["Smith Machine Split Squat", ["single leg split squat smith machine", "smith split squat", "smith machine bulgarian split squat", "smith machine lunge", "smith split squats"], "lower", "quads", ["glutes"], "Smith machine (+ bench for rear foot)", 10, 6, 10,
    ["Set the bar at shoulder height. Step under it and stand in a long split stance (rear foot on a bench for the Bulgarian version).", "Unrack and drop the back knee straight down until the front thigh is about parallel.", "Drive through the front heel to stand. Finish all reps, then switch legs."],
    ["Front shin stays roughly vertical for glutes, knee forward for quads", "Control the bottom; don't bounce"], ["Stance too short (knee pain)", "Pushing off the back foot"]],
  ["Sissy Squat", ["sissy squats", "sissy squat machine"], "lower", "quads", [], "Sissy squat machine or bench", 10, 8, 12,
    ["Lock your feet or ankles in, holding a support.", "Lean back and drive the knees forward, lowering until the knees are deeply bent; hips stay extended.", "Push back up with the quads."],
    ["A straight line from knees to shoulders", "Slow lowering"], ["Sitting the hips back (turns into a squat)", "Going deeper than your knees tolerate"]],
  ["Leg Extension", ["quad extension", "leg extensions"], "lower", "quads", [], "Leg extension machine", 5, 10, 15,
    ["Line your knee joint up with the machine's pivot; pad on the lower shin.", "Extend until the legs are straight and squeeze the quads for a second.", "Lower slowly under control."],
    ["Pause and squeeze at the top", "Slow 2–3 second lowering"], ["Swinging the weight up", "Lifting hips off the seat"]],

  // ---------- Hamstrings / glutes ----------
  ["Deadlift", ["conventional deadlift", "barbell deadlift", "dl"], "lower", "hamstrings", ["glutes", "back", "quads"], "Barbell", 10, 3, 6,
    ["Bar over mid-foot, feet hip-width. Grip just outside your legs.", "Shins to the bar, chest up, back flat. Pull the slack out of the bar.", "Push the floor away and stand up tall, bar dragging up your legs.", "Hinge back down the same path."],
    ["Lats tight: \"protect your armpits\"", "Bar stays in contact with your legs", "Hips and shoulders rise together"],
    ["Rounding the lower back", "Bar drifting away from the body", "Jerking the bar off the floor", "Leaning back at the top"]],
  ["Romanian Deadlift", ["rdl", "rdls", "stiff leg deadlift", "sldl"], "lower", "hamstrings", ["glutes", "lower back"], "Barbell or dumbbells", 10, 8, 12,
    ["Stand holding the bar at hip height, knees soft.", "Push your hips back and slide the bar down your thighs, back flat.", "Stop when you feel a deep hamstring stretch (usually just below the knee).", "Drive hips forward to stand."],
    ["Hips back, not down", "Bar close to the legs", "Feel the stretch, not the floor"], ["Rounding the back to reach lower", "Turning it into a squat by bending the knees too much"]],
  ["Lying Leg Curl", ["leg curl", "hamstring curl", "prone leg curl"], "lower", "hamstrings", ["calves"], "Leg curl machine", 5, 10, 15,
    ["Lie face down, knees just off the bench edge, pad above your heels.", "Curl your heels toward your glutes.", "Lower slowly to full extension."],
    ["Keep hips pressed into the pad", "Slow negative"], ["Hips popping up", "Partial range"]],
  ["Seated Leg Curl", ["seated hamstring curl"], "lower", "hamstrings", [], "Seated leg curl machine", 5, 10, 15,
    ["Sit with knees lined up with the pivot, thigh pad snug.", "Curl down and back as far as you can.", "Return slowly to the stretched position."],
    ["Lean your torso slightly forward for a bigger stretch"], ["Thigh pad too loose", "Rushing the negative"]],
  ["Hip Thrust", ["barbell hip thrust", "glute bridge", "hip thrusts"], "lower", "glutes", ["hamstrings"], "Barbell + bench", 10, 8, 12,
    ["Upper back on a bench, bar padded across your hips, feet flat.", "Drive through your heels to lift the hips until your torso is level.", "Squeeze the glutes for a second, lower under control."],
    ["Chin tucked, ribs down", "Shins vertical at the top"], ["Over-arching the lower back", "Feet too far out (hamstrings take over)"]],

  // ---------- Calves ----------
  ["Standing Calf Raise", ["calf raise", "calf raises", "standing calves"], "lower", "calves", [], "Machine or smith", 10, 10, 15,
    ["Balls of your feet on the edge of the platform.", "Lower your heels into a deep stretch and pause.", "Rise as high as you can onto your toes and squeeze."],
    ["Pause 1–2 s in the stretch", "Full range every rep"], ["Bouncing", "Bending the knees to cheat"]],
  ["Seated Calf Raise", ["seated calves"], "lower", "calves", [], "Seated calf machine", 10, 12, 20,
    ["Pad on your lower thighs, balls of the feet on the platform.", "Lower into a full stretch, pause, then press up high."], ["Slow and full range"], ["Short bouncing reps"]],

  // ---------- Chest ----------
  ["Bench Press", ["barbell bench", "flat bench", "bench", "bb bench press"], "upper", "chest", ["triceps", "shoulders"], "Barbell, bench", 5, 5, 8,
    ["Eyes under the bar, shoulder blades pulled back and down, feet planted.", "Grip a little wider than shoulders; unrack with straight arms.", "Lower to your mid/lower chest with elbows ~45–70° from your body.", "Press up and slightly back toward the rack."],
    ["Squeeze the bar, tuck the elbows", "Keep your upper back tight and butt on the bench", "Touch, don't bounce"],
    ["Flaring elbows to 90°", "Bouncing off the chest", "Lifting the butt off the bench"]],
  ["Incline Barbell Press", ["incline bench", "incline bench press", "incline bb press"], "upper", "chest", ["shoulders", "triceps"], "Barbell, incline bench", 5, 6, 10,
    ["Set the bench to about 30°. Shoulder blades back and down.", "Lower the bar to your upper chest.", "Press straight up."], ["Low incline (30°) for upper chest", "Elbows slightly tucked"], ["Bench too steep (becomes a shoulder press)", "Bouncing"]],
  ["Flat Dumbbell Press", ["dumbbell bench press", "db bench", "db press", "flat db press", "dumbbell press"], "upper", "chest", ["triceps", "shoulders"], "Dumbbells, bench", 5, 8, 12,
    ["Kick the dumbbells up off your knees and lie back.", "Lower until the dumbbells are beside your chest with a deep stretch.", "Press up and slightly together."], ["Deep stretch at the bottom", "Control the lowering"], ["Half reps", "Letting the dumbbells drift too wide"]],
  ["Incline Dumbbell Press", ["incline db press", "incline dumbbell bench"], "upper", "chest", ["shoulders", "triceps"], "Dumbbells, incline bench", 5, 8, 12,
    ["Bench at 30–45°. Start with dumbbells over your upper chest.", "Lower to a deep stretch beside the upper chest.", "Press up."], ["Shoulder blades pinned", "Full stretch"], ["Bench too steep", "Clashing the dumbbells and losing tension"]],
  ["Close-Grip Bench Press", ["close grip bench", "cgbp"], "upper", "triceps", ["chest", "shoulders"], "Barbell, bench", 5, 6, 10,
    ["Grip about shoulder-width (not narrower).", "Lower to your lower chest, elbows tucked.", "Press up, focusing on the triceps."], ["Elbows close to the body"], ["Grip so narrow the wrists hurt"]],
  ["Dips", ["chest dips", "weighted dips", "parallel bar dips", "dip"], "upper", "chest", ["triceps", "shoulders"], "Dip bars (+ belt)", 5, 6, 12,
    ["Support yourself on the bars with straight arms.", "Lean slightly forward and lower until your upper arm is about parallel to the floor.", "Press back up."], ["Lean forward for chest, stay upright for triceps", "Controlled depth"], ["Going so deep the shoulders hurt", "Swinging"]],
  ["Pec Deck Fly", ["pec deck", "machine fly", "chest fly machine", "butterfly"], "upper", "chest", [], "Pec deck machine", 5, 10, 15,
    ["Seat height so handles are at chest level.", "Bring the handles together in a wide hugging arc.", "Squeeze, then open slowly to a full stretch."], ["Slight bend in the elbows", "Chest up, shoulders back"], ["Pressing instead of hugging", "Shoulders rolling forward"]],
  ["Cable Crossover", ["cable fly", "cable flys", "cable flies"], "upper", "chest", [], "Cable station", 5, 10, 15,
    ["Set pulleys high (or mid). Step forward in a staggered stance.", "Bring the handles together in front of your lower chest in an arc.", "Return slowly to a stretch."], ["Lead with the elbows", "Squeeze for a second"], ["Using too much weight and turning it into a press"]],
  ["Machine Chest Press", ["chest press", "hammer strength press", "seated chest press"], "upper", "chest", ["triceps", "shoulders"], "Chest press machine", 10, 8, 12,
    ["Set the seat so handles line up with your mid chest.", "Press out without locking hard.", "Return slowly to a full stretch."], ["Shoulder blades back against the pad"], ["Seat too high or low", "Short range"]],
  ["Push-up", ["push ups", "pushups", "pushup"], "upper", "chest", ["triceps", "shoulders"], "Bodyweight", 0, 10, 25,
    ["Hands slightly wider than shoulders, body in a straight line.", "Lower your chest to just above the floor.", "Push back up."], ["Squeeze glutes, brace abs", "Elbows about 45°"], ["Sagging hips", "Half reps"]],

  // ---------- Back ----------
  ["Barbell Row", ["bent over row", "bb row", "pendlay row", "bent-over row"], "upper", "back", ["biceps", "rear delts"], "Barbell", 5, 6, 10,
    ["Hinge until your torso is about 45° or lower, back flat, bar hanging at arm's length.", "Pull the bar to your lower ribs / upper stomach.", "Lower under control."], ["Drive elbows back", "Torso stays still"], ["Standing up more each rep", "Jerking with the lower back"]],
  ["Dumbbell Row", ["one arm row", "single arm dumbbell row", "db row", "one-arm dumbbell row"], "upper", "back", ["biceps", "rear delts"], "Dumbbell, bench", 5, 8, 12,
    ["One hand and knee on a bench, back flat.", "Row the dumbbell toward your hip.", "Lower to a full stretch."], ["Pull with the elbow, not the hand", "Pull toward the hip for lats"], ["Twisting the torso to heave the weight"]],
  ["Chest-Supported Row", ["seal row", "incline dumbbell row", "chest supported row", "t-bar row machine"], "upper", "back", ["rear delts", "biceps"], "Incline bench + dumbbells or machine", 5, 8, 12,
    ["Lie chest-down on an incline bench, dumbbells hanging.", "Row both dumbbells up, squeezing your shoulder blades.", "Lower to a full stretch."], ["Chest stays on the pad"], ["Lifting the chest off the pad to cheat"]],
  ["T-Bar Row", ["landmine row", "tbar row"], "upper", "back", ["biceps", "rear delts"], "T-bar / landmine", 5, 8, 12,
    ["Straddle the bar, hinge with a flat back.", "Row the handle to your chest.", "Lower with control."], ["Flat back, chest up"], ["Rounding the back", "Using hips to swing"]],
  ["Seated Cable Row", ["cable row", "seated row", "low row"], "upper", "back", ["biceps", "rear delts"], "Cable station", 5, 8, 12,
    ["Sit tall, knees slightly bent, handle at arm's length.", "Pull the handle to your stomach, squeezing shoulder blades together.", "Let the shoulder blades stretch forward on the way back."], ["Sit tall, don't rock", "Stretch forward, squeeze back"], ["Rocking the torso", "Shrugging"]],
  ["Lat Pulldown", ["pulldown", "lat pull down", "wide grip pulldown", "lat pulldowns"], "upper", "back", ["biceps"], "Cable pulldown station", 5, 8, 12,
    ["Grip a bit wider than shoulders, thighs locked under the pad.", "Lean back slightly and pull the bar to your upper chest.", "Return slowly to a full stretch overhead."], ["Drive elbows down to your sides", "Chest up to meet the bar"], ["Pulling behind the neck", "Leaning way back and swinging"]],
  ["Pull-up (added weight)", ["pull up", "pull ups", "pullups", "weighted pull up", "pull-up"], "upper", "back", ["biceps"], "Pull-up bar (+ belt)", 5, 5, 10,
    ["Hang from the bar, hands just outside shoulders, palms away.", "Pull until your chin clears the bar.", "Lower all the way to a dead hang."], ["Start each rep by pulling shoulders down", "Full hang at the bottom"], ["Kipping", "Half reps"]],
  ["Chin-up", ["chin up", "chin ups", "chinups", "weighted chin up"], "upper", "back", ["biceps"], "Pull-up bar", 5, 5, 10,
    ["Hang with palms facing you, shoulder-width.", "Pull your chest toward the bar.", "Lower to a full hang."], ["Squeeze the lats and biceps"], ["Swinging", "Not reaching full extension"]],
  ["High Row Machine", ["high row", "seated high row", "standing high row", "iso lateral high row", "hammer strength high row", "high rows"], "upper", "back", ["rear delts", "biceps"], "Plate-loaded or selectorized high row", 10, 8, 12,
    ["Set the seat (or stance) so the handles start slightly above shoulder height with arms extended.", "Pull the handles down and back toward your upper chest, elbows driving toward your hips.", "Squeeze the lats, then let the arms extend fully overhead for the stretch."],
    ["Chest up, slight lean back", "Pull with the elbows, not the hands"], ["Shrugging the traps", "Partial reps without the stretch"]],
  ["Single-Arm Cable Row", ["single arm cable row", "one arm cable row", "unilateral cable row", "single arm seated cable row"], "upper", "back", ["biceps", "rear delts"], "Cable station + D-handle", 5, 8, 12,
    ["Set the cable at about chest height (or low, seated) with a single D-handle.", "Brace with the opposite hand or knee, arm fully extended, letting the shoulder blade reach forward for a stretch.", "Row the handle toward your hip, driving the elbow back and close to your side.", "Pause, then return slowly to the full stretch. Finish all reps, then switch arms."],
    ["Pull toward the hip for lats, toward the ribs for upper back", "Don't twist the torso to finish the rep"], ["Rotating the body to move more weight", "Cutting the stretch short"]],
  ["Wide-Grip Chest-Supported Row", ["chest supported wide row", "wide chest supported row", "wide grip chest supported row", "wide grip machine row", "plate loaded row", "chest supported machine row"], "upper", "back", ["rear delts", "biceps"], "Plate-loaded chest-supported row machine", 10, 6, 10,
    ["Set the seat so the chest pad sits at mid-chest and you can just reach the wide handles with straight arms.", "Chest on the pad, feet planted. Grip the wide handles.", "Row by driving the elbows out and back until the upper arms are in line with your torso; squeeze the shoulder blades together.", "Lower under control to a full stretch."],
    ["Chest stays glued to the pad", "Elbows flare about 45–60° for upper back and rear delts"], ["Lifting the chest off the pad to heave the weight", "Shrugging the shoulders up"]],
  ["Single-Arm Preacher Curl", ["unilateral preacher curl", "one arm preacher curl", "single arm preacher curl", "bench stabilizing preacher curl", "bench preacher curl", "dumbbell preacher curl"], "upper", "biceps", [], "Dumbbell + preacher pad or incline bench back", 2.5, 8, 12,
    ["Set the back of an incline bench (or a preacher pad) under your armpit, upper arm flat on the pad.", "Hold the dumbbell with your arm almost straight.", "Curl up without lifting the elbow off the pad; squeeze at the top.", "Lower slowly to almost straight. Finish all reps, then switch arms."],
    ["Slow at the bottom, where the biceps is longest", "Armpit snug over the pad"], ["Bouncing out of the bottom", "Lifting the elbow off the pad"]],
  ["Cable Hammer Curl", ["rope hammer curl", "cable rope curl", "cable hammer curls", "rope curl"], "upper", "biceps", ["forearms"], "Cable + rope", 5, 8, 12,
    ["Attach a rope to a low pulley. Hold the ends with palms facing each other.", "Elbows pinned at your sides, curl the rope up toward your shoulders.", "Squeeze, then lower under control."],
    ["Thumbs up the whole rep", "Elbows stay still"], ["Leaning back", "Elbows drifting forward"]],
  ["Straight-Arm Pulldown", ["straight arm pulldown", "lat prayer", "straight-arm lat pulldown"], "upper", "back", [], "Cable + bar or rope", 5, 10, 15,
    ["Stand facing a high cable, arms straight, slight hip hinge.", "Sweep the bar down to your thighs keeping arms straight.", "Return slowly overhead."], ["Think \"pull with the armpits\""], ["Bending the elbows (turns into a pushdown)"]],
  ["Barbell Shrug", ["shrugs", "shrug", "dumbbell shrug"], "upper", "back", [], "Barbell or dumbbells", 10, 10, 15,
    ["Hold the weight at arm's length.", "Shrug your shoulders straight up toward your ears.", "Pause, then lower slowly."], ["Straight up and down, no rolling"], ["Rolling the shoulders", "Using momentum"]],

  // ---------- Shoulders ----------
  ["Overhead Press", ["ohp", "military press", "standing press", "barbell overhead press", "shoulder press"], "upper", "shoulders", ["triceps"], "Barbell", 5, 5, 8,
    ["Bar on the front of the shoulders, grip just outside shoulder-width.", "Squeeze glutes and abs, press straight up, moving your head back out of the way.", "Lock out with the bar over your mid-foot, head through."], ["Glutes tight, no leaning back", "Bar path straight up"], ["Over-arching the lower back", "Pressing the bar out in front"]],
  ["Seated Dumbbell Shoulder Press", ["db shoulder press", "dumbbell shoulder press", "seated db press", "seated shoulder press"], "upper", "shoulders", ["triceps"], "Dumbbells, upright bench", 5, 8, 12,
    ["Bench upright, dumbbells at shoulder height, palms forward.", "Press overhead until arms are nearly straight.", "Lower to about ear level."], ["Back against the pad", "Forearms vertical"], ["Arching off the bench", "Half reps"]],
  ["Arnold Press", ["arnold presses"], "upper", "shoulders", ["triceps"], "Dumbbells", 5, 8, 12,
    ["Start with dumbbells at chin height, palms facing you.", "Rotate palms forward as you press overhead.", "Reverse the rotation on the way down."], ["Smooth rotation"], ["Going too heavy and losing control"]],
  ["Dumbbell Lateral Raise", ["lateral raise", "lateral raises", "side raise", "side lateral raise", "lat raise", "db lateral raise"], "upper", "shoulders", [], "Dumbbells", 2.5, 12, 20,
    ["Stand with dumbbells at your sides, slight lean forward.", "Raise them out to the sides to shoulder height, leading with the elbows.", "Lower slowly."], ["Think \"push the dumbbells out to the walls\"", "Slow lowering"], ["Swinging with the body", "Shrugging the traps", "Going too heavy"]],
  ["Cable Lateral Raise", ["cable lateral", "cable side raise"], "upper", "shoulders", [], "Cable station", 2.5, 12, 20,
    ["Stand side-on to a low pulley, handle in the far hand.", "Raise the arm out to the side to shoulder height.", "Lower under control."], ["Constant tension", "Lead with the elbow"], ["Leaning away to cheat"]],
  ["Rear Delt Fly", ["reverse fly", "rear delt raise", "reverse pec deck", "bent over fly"], "upper", "shoulders", ["back"], "Dumbbells or reverse pec deck", 2.5, 12, 20,
    ["Hinge forward (or face the pec deck), arms hanging.", "Sweep the arms out wide, slight bend in the elbows.", "Lower slowly."], ["Move from the shoulder, not the shoulder blades"], ["Squeezing shoulder blades (turns into a back exercise)", "Too heavy"]],
  ["Face Pull", ["face pulls", "rope face pull"], "upper", "shoulders", ["back"], "Cable + rope", 5, 12, 20,
    ["Rope at upper-chest to face height. Palms facing down.", "Pull the rope toward your face, splitting it apart, elbows high.", "Finish with hands beside your ears, then return."], ["Elbows high, pull apart", "Rotate the hands back at the end"], ["Turning it into a row with low elbows"]],

  // ---------- Biceps ----------
  ["Barbell Curl", ["bb curl", "standing barbell curl", "straight bar curl"], "upper", "biceps", ["forearms"], "Barbell", 5, 8, 12,
    ["Stand holding the bar shoulder-width, palms up.", "Curl up keeping elbows at your sides.", "Lower all the way down slowly."], ["Elbows pinned", "Full range"], ["Swinging the hips", "Elbows drifting forward"]],
  ["EZ-Bar Curl", ["ez bar curl", "ez curl"], "upper", "biceps", ["forearms"], "EZ bar", 5, 8, 12,
    ["Hold the EZ bar on the angled grips.", "Curl up keeping elbows still.", "Lower slowly."], ["Elbows pinned"], ["Swinging"]],
  ["Dumbbell Curl", ["db curl", "dumbbell curls", "bicep curl", "bicep curls", "curls", "alternating curl"], "upper", "biceps", ["forearms"], "Dumbbells", 2.5, 8, 12,
    ["Stand with dumbbells at your sides, palms forward.", "Curl up, keeping elbows by your ribs.", "Lower fully."], ["Squeeze at the top", "Control the lowering"], ["Swinging", "Cutting the bottom of the rep"]],
  ["Hammer Curl", ["hammer curls", "neutral grip curl"], "upper", "biceps", ["forearms"], "Dumbbells", 2.5, 8, 12,
    ["Hold dumbbells with palms facing your body.", "Curl up without rotating the wrist.", "Lower fully."], ["Thumbs up the whole time"], ["Swinging"]],
  ["Incline Dumbbell Curl", ["incline curl", "incline curls"], "upper", "biceps", [], "Dumbbells, incline bench", 2.5, 8, 12,
    ["Lie back on a 45–60° incline, arms hanging straight down.", "Curl up keeping the upper arm still.", "Lower to a full stretch."], ["Arms stay behind your body for the stretch"], ["Bringing elbows forward"]],
  ["Cable Curl", ["cable curls", "cable bicep curl"], "upper", "biceps", [], "Cable station", 5, 10, 15,
    ["Stand facing a low pulley with a straight bar or rope.", "Curl up, elbows pinned.", "Lower under control."], ["Constant tension", "Squeeze at the top"], ["Leaning back"]],
  ["Preacher Curl", ["preacher curls", "scott curl", "machine preacher curl"], "upper", "biceps", [], "Preacher bench + EZ bar or machine", 5, 8, 12,
    ["Upper arms flat on the pad, armpits snug at the top.", "Curl up, then lower to almost straight arms.", "Control the bottom — it's where most injuries happen."], ["Slow at the bottom"], ["Bouncing out of the bottom", "Lifting elbows off the pad"]],

  // ---------- Triceps ----------
  ["Triceps Rope Pushdown", ["tricep pushdown", "rope pushdown", "triceps pushdown", "cable pushdown", "tricep rope pushdown", "pushdowns"], "upper", "triceps", [], "Cable + rope", 5, 10, 15,
    ["Face a high pulley, elbows pinned at your sides.", "Push the rope down and split it apart at the bottom.", "Return until your forearms pass parallel."], ["Elbows don't move", "Squeeze and spread at the bottom"], ["Elbows flaring and the shoulders helping", "Leaning over the weight"]],
  ["Overhead Cable Triceps Extension", ["overhead tricep extension", "overhead triceps extension", "cable overhead extension", "french press", "overhead extension"], "upper", "triceps", [], "Cable + rope (or dumbbell)", 5, 10, 15,
    ["Face away from the cable, rope behind your head, elbows pointing up.", "Extend your arms overhead.", "Lower until you feel a deep triceps stretch."], ["Elbows stay pointing forward/up", "Deep stretch"], ["Elbows flaring wide", "Arching the back"]],
  ["JM Press", ["jm presses", "j m press"], "upper", "triceps", ["chest"], "Barbell (or Smith), flat bench", 5, 6, 10,
    ["Lie on a bench with a shoulder-width grip, bar over the chest, elbows slightly tucked.", "Lower by bending the elbows and letting the bar travel toward the chin/upper neck, forearms angling forward. It's a hybrid of a close-grip press and a skull crusher.", "Stop about 2–3 inches above the neck, then press back up by extending the elbows."],
    ["Elbows point toward your feet", "Light enough to control the bottom"], ["Flaring the elbows into a bench press", "Dropping the bar too fast near the neck"]],
  ["Seated Overhead Triceps Extension", ["seated tricep overhead press", "seated overhead tricep extension", "seated dumbbell tricep extension", "seated db overhead extension", "seated tricep extension"], "upper", "triceps", [], "Dumbbell + upright bench", 5, 8, 12,
    ["Sit on an upright bench, holding one dumbbell overhead with both hands under the top plate.", "Lower it behind your head by bending only the elbows, until you feel a deep triceps stretch.", "Extend back to the top."],
    ["Elbows point forward and stay narrow", "Back against the pad"], ["Elbows flaring out", "Arching the lower back"]],
  ["Skull Crusher", ["skull crushers", "lying triceps extension", "ez bar skull crusher", "lying tricep extension"], "upper", "triceps", [], "EZ bar, bench", 5, 8, 12,
    ["Lie on a bench holding an EZ bar over your shoulders.", "Bend at the elbows to lower the bar behind your head / toward your forehead.", "Extend back up."], ["Upper arms angled slightly back", "Elbows in"], ["Elbows flaring", "Turning it into a press"]],

  // ---------- Abs ----------
  ["Hanging Leg Raise", ["leg raises", "hanging knee raise", "hanging leg raises"], "upper", "abs", [], "Pull-up bar", 5, 10, 15,
    ["Hang from the bar.", "Curl your pelvis up and raise your legs (or knees) toward your chest.", "Lower slowly without swinging."], ["Tilt the pelvis up, don't just lift the legs"], ["Swinging for momentum"]],
  ["Cable Crunch", ["kneeling cable crunch", "cable crunches"], "upper", "abs", [], "Cable + rope", 5, 10, 15,
    ["Kneel facing a high pulley, rope beside your head.", "Crunch your ribs toward your hips, rounding the spine.", "Return slowly."], ["Hips stay still; spine does the work"], ["Sitting back with the hips"]],
  ["Crunch", ["crunches", "floor crunch", "ab crunch"], "upper", "abs", [], "Floor", 0, 15, 25,
    ["Lie on your back, knees bent, feet flat, fingertips lightly behind your ears.", "Curl your ribs toward your hips, lifting your shoulder blades off the floor.", "Pause one second, lower slowly."],
    ["Think ribs to hips, not elbows to knees", "Exhale as you curl"], ["Pulling on your neck", "Swinging up with momentum"]],
  ["Bicycle Crunch", ["bicycle crunches", "bicycles"], "upper", "abs", [], "Floor", 0, 16, 30,
    ["On your back, hands behind your head, knees up at 90°.", "Bring one elbow toward the opposite knee while extending the other leg.", "Switch sides in a slow, controlled pedal. Each side counts as one rep."],
    ["Rotate from the ribs, not the elbows", "Slow beats fast"], ["Yanking the head forward", "Racing through reps"]],
  ["Pallof Press", ["pallof", "anti rotation press", "cable pallof press"], "upper", "abs", ["obliques"], "Cable or resistance band", 5, 10, 12,
    ["Stand side-on to a cable at chest height, handle at your sternum, feet shoulder-width.", "Press the handle straight out and hold 2 seconds without letting your torso turn.", "Bring it back in. Finish all reps, then face the other way."],
    ["Brace like someone's about to poke your stomach", "Hips and shoulders stay square"], ["Rotating toward the cable", "Standing too close (no tension)"]],
  ["Side Plank Hip Dip", ["side plank dips", "side plank hip dips", "side plank"], "upper", "abs", ["obliques"], "Floor", 0, 10, 15,
    ["Lie on your side, forearm under your shoulder, feet stacked.", "Lift your hips into a straight line from head to feet.", "Lower your hip toward the floor and lift it back up. Finish all reps, then switch sides."],
    ["Shoulder stacked over the elbow", "Squeeze the glutes at the top"], ["Hips sagging back", "Rushing the dips"]],
  ["Reverse Crunch", ["reverse crunches", "lying leg raise crunch"], "upper", "abs", [], "Floor or bench", 0, 12, 20,
    ["Lie on your back, knees bent at 90° over your hips, hands by your sides or holding a bench behind your head.", "Curl your hips up off the floor, bringing your knees toward your chest.", "Lower slowly until your hips touch down."],
    ["Lift the pelvis, don't just swing the legs", "Slow on the way down"], ["Using momentum", "Arching the lower back on the way down"]],
  ["Dead Bug", ["dead bugs", "deadbug"], "upper", "abs", [], "Floor", 0, 8, 12,
    ["On your back, arms straight up, knees bent at 90° over your hips.", "Press your lower back into the floor and keep it there.", "Slowly extend one arm overhead and the opposite leg out, then return. Alternate sides; each side is one rep."],
    ["Lower back never leaves the floor", "Breathe out as you reach"], ["Back arching", "Moving fast"]],
  ["Ab Wheel Rollout", ["ab wheel", "rollout", "ab rollouts"], "upper", "abs", [], "Ab wheel", 0, 8, 15,
    ["Kneel holding the wheel under your shoulders.", "Roll forward as far as you can without your lower back sagging.", "Pull back with your abs."], ["Ribs down, glutes squeezed"], ["Lower back sagging"]],
];

export const EXERCISES = RAW.map(([name, aliases, kind, muscle, secondary, equipment, increment, repMin, repMax, steps, cues, mistakes]) => ({
  name, aliases, kind, muscle, secondary, equipment, increment, repMin, repMax,
  how: { steps, cues, mistakes, equipment, secondary },
}));

const BY_NAME = Object.fromEntries(EXERCISES.map((e) => [e.name.toLowerCase(), e]));
export const exerciseInfo = (name) => BY_NAME[String(name).toLowerCase()];

// ---------- fuzzy matching ----------

const EXPAND = {
  db: "dumbbell", dbs: "dumbbell", bb: "barbell", kb: "kettlebell", ez: "ez", cg: "close grip",
  ohp: "overhead press", rdl: "romanian deadlift", sldl: "stiff leg deadlift", bss: "bulgarian split squat",
  tri: "triceps", tricep: "triceps", bi: "biceps", bicep: "biceps", ext: "extension", extn: "extension",
  delt: "delt", delts: "delt", pec: "pec", pecs: "pec", dl: "deadlift", inc: "incline",
};
const FILLER = new Set(["the", "a", "with", "on", "of", "and", "machine", "exercise", "standing", "seated"]);

function normalize(text) {
  const words = String(text).toLowerCase()
    .replace(/pull[\s-]?downs?/g, "pulldown").replace(/push[\s-]?downs?/g, "pushdown")
    .replace(/pull[\s-]?ups?/g, "pullup").replace(/chin[\s-]?ups?/g, "chinup").replace(/push[\s-]?ups?/g, "pushup")
    .replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean)
    .flatMap((w) => (EXPAND[w] || w).split(" "))
    .map((w) => (w.length > 4 && w.endsWith("es") && !w.endsWith("ses") ? w.slice(0, -2) : w.length > 3 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w));
  return words;
}

function editDistance(a, b) {
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
}

function wordMatch(q, w) {
  if (q === w) return 1;
  if (q.length >= 3 && w.startsWith(q)) return 0.85;
  if (q.length >= 5 && editDistance(q, w) <= (q.length >= 8 ? 2 : 1)) return 0.8;
  return 0;
}

function phraseScore(query, phrase) {
  const q = normalize(query).filter((w) => !FILLER.has(w));
  const p = normalize(phrase).filter((w) => !FILLER.has(w));
  if (!q.length || !p.length) return 0;
  if (q.join(" ") === p.join(" ")) return 1;
  let hit = 0;
  for (const qw of q) hit += Math.max(0, ...p.map((pw) => wordMatch(qw, pw)));
  const covered = p.filter((pw) => q.some((qw) => wordMatch(qw, pw) > 0)).length;
  // Reward covering the query and the exercise name; penalize missing words on either side.
  return (hit / q.length) * 0.6 + (covered / p.length) * 0.4;
}

// Rank known exercises (built-ins plus the user's own library) for a typed query.
export function matchExercise(query, custom = []) {
  const pool = [...EXERCISES, ...custom.filter((c) => !BY_NAME[c.name.toLowerCase()])];
  return pool
    .map((e) => ({ ex: e, score: Math.max(phraseScore(query, e.name), ...(e.aliases || []).map((a) => phraseScore(query, a))) }))
    .filter((m) => m.score > 0.3)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

export const MATCH_SURE = 0.8;
export const MATCH_MAYBE = 0.5;

// ---------- substitutes: same muscle, same movement pattern ----------
// [exercise, [[substitute, why], [substitute, why]]]
const SUBS = [
  ["Back Squat", [["Hack Squat", "Same squat pattern on a machine; no spotter or bar on your back."], ["Leg Press", "Loads the quads hard with no balance or lower-back demand."]]],
  ["Front Squat", [["Goblet Squat", "Same upright, front-loaded squat with a dumbbell."], ["Hack Squat", "Upright torso and quad focus on a machine."]]],
  ["Goblet Squat", [["Front Squat", "Barbell version of the same upright squat; load it heavier."], ["Leg Press", "Quad-focused when you don't want to hold a weight."]]],
  ["Leg Press", [["Hack Squat", "Machine squat with a similar quad focus."], ["Back Squat", "The free-weight original; more total-body work."]]],
  ["Hack Squat", [["Leg Press", "Closest machine alternative for the quads."], ["Back Squat", "Free-weight squat if no hack machine is open."]]],
  ["Bulgarian Split Squat", [["Smith Machine Split Squat", "Same single-leg pattern with the balance taken care of."], ["Walking Lunge", "Single-leg quad and glute work with dumbbells."]]],
  ["Walking Lunge", [["Bulgarian Split Squat", "Single-leg work in place; easier in a crowded gym."], ["Smith Machine Split Squat", "Stable single-leg option you can load heavier."]]],
  ["Smith Machine Split Squat", [["Bulgarian Split Squat", "Free-weight version with dumbbells."], ["Walking Lunge", "Single-leg alternative needing only dumbbells."]]],
  ["Sissy Squat", [["Leg Extension", "Isolates the quads in the same knee-forward way."], ["Hack Squat", "Deep, knee-forward machine squat for the quads."]]],
  ["Leg Extension", [["Sissy Squat", "Bodyweight or machine quad isolation if the extension is taken."], ["Goblet Squat", "Slow, deep goblet squats target the quads with one dumbbell."]]],
  ["Deadlift", [["Romanian Deadlift", "Same hip hinge, lighter, with more hamstring focus."], ["Hip Thrust", "Trains the hips hard with far less lower-back load."]]],
  ["Romanian Deadlift", [["Deadlift", "Heavier hinge from the floor."], ["Seated Leg Curl", "Hamstrings without loading the back."]]],
  ["Lying Leg Curl", [["Seated Leg Curl", "Same curl, seated; slightly greater hamstring stretch."], ["Romanian Deadlift", "Free-weight hamstring work if no curl machine is free."]]],
  ["Seated Leg Curl", [["Lying Leg Curl", "Same knee-curl movement, lying down."], ["Romanian Deadlift", "Hinge-based hamstring work with a barbell or dumbbells."]]],
  ["Hip Thrust", [["Romanian Deadlift", "Hip hinge for glutes and hamstrings."], ["Bulgarian Split Squat", "Lean forward to bias the glutes on one leg."]]],
  ["Standing Calf Raise", [["Seated Calf Raise", "Same raise seated; more focus on the lower calf."], ["Leg Press", "Do calf presses on the leg press platform."]]],
  ["Seated Calf Raise", [["Standing Calf Raise", "Straight-knee version for the upper calf."], ["Leg Press", "Calf presses on the leg press with knees bent slightly."]]],
  ["Bench Press", [["Flat Dumbbell Press", "Same press with dumbbells; good if the bench is taken."], ["Machine Chest Press", "Machine version; no spotter needed."]]],
  ["Incline Barbell Press", [["Incline Dumbbell Press", "Same incline with dumbbells and a deeper stretch."], ["Machine Chest Press", "Set the seat low to bias the upper chest."]]],
  ["Flat Dumbbell Press", [["Bench Press", "Barbell version; easier to load heavy."], ["Machine Chest Press", "Stable machine press for the same muscles."]]],
  ["Incline Dumbbell Press", [["Incline Barbell Press", "Barbell incline for heavier loading."], ["Machine Chest Press", "Machine press with the seat set low."]]],
  ["Close-Grip Bench Press", [["JM Press", "Barbell triceps press with a similar groove."], ["Dips", "Stay upright to bias the triceps."]]],
  ["Dips", [["Flat Dumbbell Press", "Chest press without the shoulder stretch of dips."], ["Close-Grip Bench Press", "Barbell press hitting chest and triceps."]]],
  ["Pec Deck Fly", [["Cable Crossover", "Same fly motion on cables."], ["Flat Dumbbell Press", "Pressing alternative if no fly station is open."]]],
  ["Cable Crossover", [["Pec Deck Fly", "Machine fly with the same arc."], ["Incline Dumbbell Press", "Pressing alternative for the chest."]]],
  ["Machine Chest Press", [["Flat Dumbbell Press", "Free-weight press for the same muscles."], ["Bench Press", "Barbell version of the press."]]],
  ["Push-up", [["Flat Dumbbell Press", "Load the same pattern with dumbbells."], ["Machine Chest Press", "Machine press when you need more resistance."]]],
  ["Barbell Row", [["Chest-Supported Row", "Same row with no lower-back strain."], ["T-Bar Row", "Heavy row with a fixed bar path."]]],
  ["Dumbbell Row", [["Single-Arm Cable Row", "Same one-arm row on a cable."], ["Chest-Supported Row", "Both arms with the chest supported."]]],
  ["Chest-Supported Row", [["Seated Cable Row", "Supported upper-back row on a cable."], ["Dumbbell Row", "One arm at a time with a bench for support."]]],
  ["T-Bar Row", [["Barbell Row", "Free barbell version of the same row."], ["Chest-Supported Row", "Back-friendly row with support."]]],
  ["Seated Cable Row", [["Chest-Supported Row", "Similar horizontal row with the chest supported."], ["Dumbbell Row", "One-arm row if the cable station is busy."]]],
  ["Lat Pulldown", [["Pull-up (added weight)", "The bodyweight original of the pulldown."], ["High Row Machine", "Plate-loaded vertical pull for the lats."]]],
  ["Pull-up (added weight)", [["Lat Pulldown", "Same vertical pull; set any weight you need."], ["Chin-up", "Palms facing you; adds more biceps."]]],
  ["Chin-up", [["Pull-up (added weight)", "Overhand grip for more lat focus."], ["Lat Pulldown", "Use an underhand grip to match the chin-up."]]],
  ["High Row Machine", [["Lat Pulldown", "Cable vertical pull for the lats."], ["Pull-up (added weight)", "Bodyweight vertical pull."]]],
  ["Single-Arm Cable Row", [["Dumbbell Row", "One-arm row with a dumbbell."], ["Seated Cable Row", "Two-arm cable row."]]],
  ["Wide-Grip Chest-Supported Row", [["Chest-Supported Row", "Same supported row; use a wide grip."], ["Rear Delt Fly", "Isolates the rear delts and upper back."]]],
  ["Straight-Arm Pulldown", [["Lat Pulldown", "Compound lat work if the cable is set high elsewhere."], ["Pull-up (added weight)", "Bodyweight lat work."]]],
  ["Barbell Shrug", [["Face Pull", "Upper-back and rear-delt work with a cable."], ["T-Bar Row", "Heavy row that also hits the traps."]]],
  ["Overhead Press", [["Seated Dumbbell Shoulder Press", "Same press with dumbbells, seated and supported."], ["Arnold Press", "Dumbbell press with extra front-delt rotation."]]],
  ["Seated Dumbbell Shoulder Press", [["Overhead Press", "Standing barbell press."], ["Arnold Press", "Rotating dumbbell press for the shoulders."]]],
  ["Arnold Press", [["Seated Dumbbell Shoulder Press", "Standard dumbbell press."], ["Overhead Press", "Barbell press for heavier loads."]]],
  ["Dumbbell Lateral Raise", [["Cable Lateral Raise", "Same raise with constant cable tension."], ["Arnold Press", "Pressing alternative for the side delts."]]],
  ["Cable Lateral Raise", [["Dumbbell Lateral Raise", "Same raise with dumbbells."], ["Face Pull", "Cable shoulder work if lateral raises aggravate you."]]],
  ["Rear Delt Fly", [["Face Pull", "Rear delts and upper back on a cable rope."], ["Wide-Grip Chest-Supported Row", "Wide row that hammers the rear delts."]]],
  ["Face Pull", [["Rear Delt Fly", "Isolates the rear delts with dumbbells or a machine."], ["Wide-Grip Chest-Supported Row", "Wide-elbow row for the upper back."]]],
  ["Barbell Curl", [["EZ-Bar Curl", "Same curl; easier on the wrists."], ["Dumbbell Curl", "One arm at a time; fixes imbalances."]]],
  ["EZ-Bar Curl", [["Barbell Curl", "Straight-bar version."], ["Cable Curl", "Constant tension on a cable."]]],
  ["Dumbbell Curl", [["Cable Curl", "Same curl with constant tension."], ["Barbell Curl", "Heavier loading with a bar."]]],
  ["Hammer Curl", [["Cable Hammer Curl", "Same neutral grip on a rope."], ["Dumbbell Curl", "Standard curl if you want more biceps."]]],
  ["Incline Dumbbell Curl", [["Cable Curl", "Step forward from the stack for a similar stretch."], ["Preacher Curl", "Strict biceps curl with arm support."]]],
  ["Cable Curl", [["Dumbbell Curl", "Free-weight version."], ["EZ-Bar Curl", "Bar curl for heavier loads."]]],
  ["Preacher Curl", [["Single-Arm Preacher Curl", "Same supported curl, one arm at a time."], ["Incline Dumbbell Curl", "Long-stretch biceps work with dumbbells."]]],
  ["Single-Arm Preacher Curl", [["Preacher Curl", "Two-arm version with an EZ bar or machine."], ["Incline Dumbbell Curl", "Stretched-position curl with dumbbells."]]],
  ["Cable Hammer Curl", [["Hammer Curl", "Same neutral grip with dumbbells."], ["Cable Curl", "Underhand cable curl."]]],
  ["Triceps Rope Pushdown", [["Overhead Cable Triceps Extension", "Cable triceps with a deeper stretch."], ["Dips", "Bodyweight triceps; stay upright."]]],
  ["Overhead Cable Triceps Extension", [["Seated Overhead Triceps Extension", "Same overhead stretch with a dumbbell."], ["Skull Crusher", "Lying extension that stretches the long head."]]],
  ["JM Press", [["Close-Grip Bench Press", "Barbell press with a similar triceps focus."], ["Skull Crusher", "Lying triceps extension."]]],
  ["Seated Overhead Triceps Extension", [["Overhead Cable Triceps Extension", "Same stretch on a cable."], ["Skull Crusher", "Lying version with an EZ bar."]]],
  ["Skull Crusher", [["JM Press", "Heavier hybrid press for the triceps."], ["Overhead Cable Triceps Extension", "Overhead stretch on a cable."]]],
  ["Hanging Leg Raise", [["Cable Crunch", "Weighted ab work you can load progressively."], ["Ab Wheel Rollout", "Anti-extension core strength."]]],
  ["Cable Crunch", [["Hanging Leg Raise", "Bodyweight ab work from a bar."], ["Ab Wheel Rollout", "Core work with only an ab wheel."]]],
  ["Ab Wheel Rollout", [["Hanging Leg Raise", "Hanging ab work if no wheel is around."], ["Cable Crunch", "Loadable ab work on a cable."]]],
  ["Crunch", [["Cable Crunch", "Same movement, loadable on a cable."], ["Bicycle Crunch", "Adds rotation for the obliques."]]],
  ["Bicycle Crunch", [["Pallof Press", "Anti-rotation work for the obliques and deep core."], ["Side Plank Hip Dip", "Side-core strength on the floor."]]],
  ["Pallof Press", [["Side Plank Hip Dip", "No-equipment side-core option."], ["Bicycle Crunch", "Floor rotation for the obliques."]]],
  ["Side Plank Hip Dip", [["Pallof Press", "Cable or band anti-rotation work."], ["Bicycle Crunch", "Floor rotation for the obliques."]]],
  ["Reverse Crunch", [["Hanging Leg Raise", "Harder lower-ab version from a bar."], ["Dead Bug", "Gentler deep-core option, easy on the back."]]],
  ["Dead Bug", [["Reverse Crunch", "More direct lower-ab work."], ["Ab Wheel Rollout", "Harder anti-extension core work."]]],
];
const SUB_MAP = Object.fromEntries(SUBS.map(([name, subs]) => [name.toLowerCase(), subs]));

// Substitutes for an exercise (by name), falling back to other built-ins for the same muscle.
export function substitutesFor(ex) {
  const listed = SUB_MAP[String(ex.name).toLowerCase()];
  if (listed) return listed.map(([name, why]) => ({ name, why }));
  const muscle = ex.muscle || exerciseInfo(ex.name)?.muscle;
  return EXERCISES.filter((e) => e.muscle === muscle && e.name !== ex.name).slice(0, 2)
    .map((e) => ({ name: e.name, why: `Also trains the ${muscle}.` }));
}
