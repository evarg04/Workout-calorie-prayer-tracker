// Full cooking instructions for the built-in recipes.
// pantry: seasonings per serving as [amount, unit, name]; amount null means "to taste".
// Seasonings like spices, vanilla and lemon juice add negligible calories and aren't in the macros.
// Safe internal temperatures follow USDA guidance: poultry 165°F, ground beef 160°F, fish 145°F.

export const PREP = {
  // ---------- Breakfast ----------
  b1: {
    prep: 5, cook: 0, wait: "4 h or overnight in the fridge", equipment: ["Jar or container with lid"],
    pantry: [[0.5, "tsp", "vanilla extract"], [0.25, "tsp", "cinnamon"], [null, "", "pinch of salt"]],
    steps: [
      "Pour the almond milk into the jar, add the whey and vanilla, and stir or shake until no lumps remain. Mixing the protein into the liquid first keeps it smooth.",
      "Stir in the oats, chia seeds, Greek yogurt, cinnamon and salt.",
      "Cover and refrigerate at least 4 hours, ideally overnight. It keeps 4 days, so make several at once.",
      "In the morning, stir and add a splash of milk if it's too thick. Top with the blueberries. Eat cold, or microwave 60–90 seconds.",
    ],
  },
  b2: {
    prep: 3, cook: 5, equipment: ["Nonstick skillet", "Spatula", "Toaster"],
    pantry: [[null, "", "salt and black pepper"], [null, "", "cooking spray"], [0.25, "tsp", "garlic powder (optional)"]],
    steps: [
      "Whisk the eggs, egg whites and cottage cheese in a bowl with a pinch of salt and pepper.",
      "Heat the skillet over medium-low and coat with cooking spray. Add the spinach and stir 30 seconds until just wilted.",
      "Pour in the eggs. Let them sit 20 seconds, then slowly push them across the pan with the spatula, folding into soft curds.",
      "Cook 2–3 minutes total. Take them off the heat while they still look slightly glossy; they finish setting on the plate. The cottage cheese melts in and makes them creamy.",
      "Toast the bread and serve alongside.",
    ],
  },
  b3: {
    prep: 3, cook: 0, equipment: ["Bowl or glass"],
    pantry: [[0.25, "tsp", "vanilla extract (optional)"]],
    steps: [
      "Stir the vanilla into the Greek yogurt if using.",
      "Slice the strawberries.",
      "Layer half the yogurt, half the berries, then repeat.",
      "Add the granola just before eating so it stays crunchy, then drizzle with honey.",
    ],
  },
  b4: {
    prep: 5, cook: 10, equipment: ["Large skillet", "Spatula", "Foil (for freezing)"],
    pantry: [[0.25, "tsp", "cumin"], [0.25, "tsp", "chili powder"], [null, "", "salt and pepper"], [null, "", "cooking spray"]],
    steps: [
      "Dice the bell pepper. Heat the skillet over medium-high with cooking spray.",
      "Add the turkey and pepper. Break the meat up and cook 5–6 minutes until no pink remains (165°F). Season with cumin, chili powder, salt and pepper.",
      "Push the turkey to one side, lower the heat to medium, and pour the eggs and egg whites into the empty side. Scramble 1–2 minutes until just set, then mix everything together.",
      "Warm the tortilla 15 seconds in the microwave so it rolls without cracking.",
      "Spoon the filling down the center, top with the cheese and salsa, fold in the sides, and roll up tight.",
      "Optional: toast seam-side down in the hot pan 1 minute to seal it.",
      "Meal prep: wrap each burrito in foil and freeze up to 3 months. Reheat unwrapped in a paper towel, 2 minutes in the microwave, flipping halfway.",
    ],
  },
  b5: {
    prep: 5, cook: 8, equipment: ["Blender", "Nonstick skillet or griddle", "Spatula"],
    pantry: [[0.5, "tsp", "baking powder"], [0.25, "tsp", "cinnamon"], [null, "", "cooking spray"]],
    steps: [
      "Blend the oats alone 15–20 seconds until they're flour.",
      "Add the banana, egg whites, whey, baking powder and cinnamon. Blend until smooth. Rest the batter 5 minutes so it thickens.",
      "Heat the pan over medium and coat with cooking spray. Pour about ¼ cup batter per pancake.",
      "Cook until bubbles form on top and the edges look set, about 2 minutes. Flip and cook 1 minute more. Turn the heat down if they brown too fast; protein batters scorch easily.",
      "Top with the Greek yogurt and maple syrup.",
    ],
  },
  b6: {
    prep: 5, cook: 4, equipment: ["Toaster", "Small nonstick skillet with lid"],
    pantry: [[1, "tsp", "lemon or lime juice"], [0.25, "tsp", "red pepper flakes"], [null, "", "salt and pepper"], [null, "", "cooking spray"]],
    steps: [
      "Toast the bread.",
      "Mash the avocado in a bowl with the lemon juice, salt and pepper.",
      "Heat the skillet over medium with cooking spray. Crack in the eggs, cover, and cook 2½–3 minutes until the whites are set and the yolks are still runny (or longer for firm yolks).",
      "Spread the avocado on the toast, add sliced tomato, then the eggs. Finish with red pepper flakes.",
    ],
  },
  b7: {
    prep: 10, cook: 10, equipment: ["Skillet", "Spatula", "Clean towel (to press tofu)"],
    pantry: [[0.5, "tsp", "turmeric"], [0.5, "tsp", "garlic powder"], [1, "tbsp", "nutritional yeast (optional)"], [null, "", "salt and pepper"]],
    steps: [
      "Wrap the tofu in a clean towel and press under something heavy for 10 minutes to remove water. Dry tofu gets a better texture.",
      "Dice the onion and bell pepper. Heat the oil in the skillet over medium.",
      "Cook the onion and pepper 4 minutes until softened.",
      "Crumble the tofu into the pan with your hands. Add the turmeric (for the egg-like color), garlic powder, nutritional yeast, salt and pepper.",
      "Cook 5 minutes, stirring now and then, until hot and most of the moisture has cooked off.",
      "Stir in the spinach for the last minute. Serve with toast.",
    ],
  },
  b8: {
    prep: 3, cook: 0, equipment: ["Blender"],
    pantry: [[4, "", "ice cubes"], [null, "", "pinch of cinnamon (optional)"]],
    steps: [
      "Pour the milk into the blender first so nothing sticks to the bottom.",
      "Add the powdered peanut butter, whey, oats, banana and ice.",
      "Blend 45–60 seconds until completely smooth. Add a splash more milk if it's too thick.",
    ],
  },
  b9: {
    prep: 5, cook: 0, wait: "2 h or overnight in the fridge", equipment: ["Jar or bowl", "Whisk or fork"],
    pantry: [[0.5, "tsp", "vanilla extract"]],
    steps: [
      "Whisk the almond milk, powdered peanut butter, maple syrup and vanilla until smooth.",
      "Whisk in the chia seeds. Wait 5 minutes, then whisk again. This second whisk stops the seeds from clumping.",
      "Cover and refrigerate at least 2 hours, or overnight, until thick and spoonable.",
      "Top with sliced strawberries. Keeps 4 days.",
    ],
  },
  b10: {
    prep: 10, cook: 55, equipment: ["Oven", "Sheet pan", "Muffin tin (silicone works best)", "Blender", "Baking dish for water"],
    pantry: [[0.25, "tsp", "smoked paprika"], [null, "", "salt and pepper"], [null, "", "cooking spray"]],
    steps: [
      "Heat the oven to 425°F. Dice the potato into ¾-inch cubes, toss with the oil, paprika, salt and pepper, and spread on the sheet pan.",
      "Roast 25–30 minutes, flipping halfway, until crisp and browned. Take them out and lower the oven to 325°F.",
      "Blend the egg whites and cottage cheese with a pinch of salt until completely smooth.",
      "Grease the muffin tin. Divide the chopped spinach and pepper among the cups, then pour in the egg mixture about ¾ full.",
      "Set a baking dish of hot water on the lower rack, which keeps the bites soft and custardy. Bake on the middle rack 25–30 minutes, until set in the center.",
      "Cool 5 minutes before removing. Both keep 4 days in the fridge; reheat 30–45 seconds.",
    ],
  },
  b11: {
    prep: 2, cook: 5, equipment: ["Small saucepan", "Whisk"],
    pantry: [[0.25, "tsp", "cinnamon"], [null, "", "pinch of salt"]],
    steps: [
      "Bring the soy milk to a simmer over medium heat. Stir in the oats, cinnamon and salt.",
      "Cook 3–5 minutes, stirring, until creamy.",
      "Take the pan off the heat and wait 30 seconds, then whisk in the pea protein. Adding it off the heat keeps it from going gritty. Loosen with a splash of milk if needed.",
      "Top with the blueberries and chia seeds.",
    ],
  },

  // ---------- Lunch ----------
  l1: {
    prep: 10, cook: 15, equipment: ["Skillet or grill pan", "Meat thermometer", "Cutting board"],
    pantry: [[1, "tsp", "chili powder"], [0.5, "tsp", "cumin"], [0.25, "tsp", "garlic powder"], [0.5, "", "lime"], [null, "", "salt"], [null, "", "cooking spray"]],
    steps: [
      "Pat the chicken dry. If it's thick, pound it to an even ¾ inch so it cooks evenly. Season both sides with chili powder, cumin, garlic powder and salt.",
      "Heat the pan over medium-high with cooking spray. Cook the chicken 5–6 minutes per side, until the thickest part reads 165°F.",
      "Rest 5 minutes, then slice. Resting keeps the juices in.",
      "Warm the rice and beans in the microwave, 60–90 seconds.",
      "Build the bowl: greens, rice, beans, chicken, salsa, cheese and sliced avocado. Squeeze lime over everything.",
      "Meal prep: store the chicken, rice and beans together and add the salsa, greens and avocado fresh. Keeps 4 days.",
    ],
  },
  l2: {
    prep: 8, cook: 0, equipment: ["Bowl", "Fork"],
    pantry: [[1, "tsp", "Dijon mustard"], [1, "tsp", "lemon juice"], [0.25, "tsp", "dried dill (optional)"], [null, "", "black pepper"]],
    steps: [
      "Drain the tuna very well, pressing out the water. This keeps the wrap from getting soggy.",
      "Mix the tuna with the Greek yogurt, Dijon, lemon juice, dill and pepper.",
      "Dice the cucumber small and fold it in for crunch.",
      "Warm the tortilla 10–15 seconds so it doesn't crack.",
      "Lay the greens down the center, add the tuna, fold in the sides, and roll up tight. Cut in half.",
    ],
  },
  l3: {
    prep: 5, cook: 12, equipment: ["Large skillet or wok"],
    pantry: [[2, "clove", "garlic, minced"], [1, "tsp", "fresh ginger, grated"], [1, "", "green onion, sliced"], [null, "", "sriracha to taste"]],
    steps: [
      "Heat the skillet over medium-high. Add the turkey and break it up. Cook 5–6 minutes until browned and no longer pink (165°F).",
      "Add the diced onion and cook 2 minutes. Stir in the garlic and ginger for 30 seconds until fragrant.",
      "Add the coleslaw mix and soy sauce. Toss 3–4 minutes until the cabbage wilts but still has some crunch.",
      "Take it off the heat and stir in the sesame oil. Its flavor fades if it cooks.",
      "Serve over the rice, topped with green onion and sriracha. Keeps 4 days, so it's great for meal prep.",
    ],
  },
  l4: {
    prep: 10, cook: 15, equipment: ["Saucepan (if cooking quinoa)", "Large bowl"],
    pantry: [[1, "tbsp", "lemon juice"], [0.5, "tsp", "dried oregano"], [null, "", "salt and pepper"]],
    steps: [
      "If cooking quinoa, rinse it, then simmer covered in twice its volume of water for 15 minutes and rest 5 minutes. Pre-cooked quinoa works too.",
      "Rinse and drain the chickpeas. Dice the cucumber and tomato.",
      "Whisk the olive oil, lemon juice, oregano, salt and pepper in the bowl.",
      "Add the quinoa, chickpeas, cucumber and tomato, and toss to coat.",
      "Top with crumbled feta and a spoonful of hummus. Keeps 4 days; add the hummus when you eat it.",
    ],
  },
  l5: {
    prep: 10, cook: 18, equipment: ["Skillet or grill pan", "Sheet pan or air fryer", "Meat thermometer", "Large bowl"],
    pantry: [[1, "tbsp", "lemon juice"], [0.5, "tsp", "Dijon mustard"], [1, "clove", "garlic, grated"], [0.5, "tsp", "Italian seasoning"], [null, "", "salt and black pepper"]],
    steps: [
      "Season the chicken with Italian seasoning, salt and pepper. Cook in a medium-high pan 5–6 minutes per side to 165°F. Rest 5 minutes and slice.",
      "Croutons: cube the bread, toss with the olive oil, and bake at 375°F for 8–10 minutes (or air-fry 5 minutes) until crisp.",
      "Dressing: whisk the Greek yogurt with half the parmesan, the lemon juice, Dijon, garlic, plenty of black pepper, and 1–2 teaspoons of water until pourable.",
      "Toss the greens with the dressing. Top with the chicken, croutons and remaining parmesan.",
    ],
  },
  l6: {
    prep: 10, cook: 10, equipment: ["Wok or large skillet"],
    pantry: [[2, "clove", "garlic, minced"], [1, "", "green onion, sliced"], [null, "", "cooking spray"]],
    steps: [
      "Use cold, day-old rice if you can; it fries without going mushy. Pat the shrimp dry.",
      "Heat the pan over high with cooking spray. Pour in the beaten egg, scramble 30 seconds, and move it to a plate.",
      "Add the shrimp in one layer. Cook 1–1½ minutes per side until pink and opaque all through. Move them to the plate.",
      "Add the garlic, peas and cauliflower rice. Cook 3 minutes until the cauliflower is tender.",
      "Add the rice and press it flat. Let it sit 1 minute to crisp, then stir and repeat once.",
      "Add the soy sauce, return the shrimp and egg, and toss. Off the heat, stir in the sesame oil and green onion.",
    ],
  },
  l7: {
    prep: 5, cook: 18, equipment: ["Medium pot"],
    pantry: [[1, "clove", "garlic, minced"], [0.5, "tsp", "cumin"], [0.5, "tsp", "smoked paprika"], [0.5, "cup", "low-sodium broth or water"], [1, "tsp", "lemon juice"], [null, "", "salt and pepper"]],
    steps: [
      "Heat the oil in the pot over medium. Cook the diced onion 4 minutes until soft.",
      "Add the garlic, cumin and paprika and stir 30 seconds until fragrant.",
      "Add the chopped tomato (fresh or canned), the lentils and the broth. Bring to a simmer.",
      "Simmer 10 minutes, stirring now and then, until thick.",
      "Stir in the spinach until wilted, about 1 minute. Season with salt, pepper and lemon juice.",
      "Serve with the bread. It's even better the next day and freezes well.",
    ],
  },
  l8: {
    prep: 5, cook: 0, equipment: ["Knife"],
    pantry: [[1, "tsp", "mustard (optional)"], [null, "", "black pepper"]],
    steps: [
      "Spread the hummus on both slices of bread (and mustard if you like).",
      "Layer the turkey, spinach and sliced tomato. Add black pepper.",
      "Close, cut in half, and eat the apple on the side.",
    ],
  },
  l9: {
    prep: 5, cook: 15, equipment: ["Oven", "Sheet pan with foil or parchment", "Bowl"],
    pantry: [[0.5, "tsp", "sriracha"], [1, "pack", "roasted seaweed snacks (optional, ~25 kcal)"], [null, "", "salt and pepper"]],
    steps: [
      "Heat the oven to 400°F. Put the salmon on the lined pan and season with salt and pepper.",
      "Bake 12–15 minutes, until it flakes easily and reads 145°F in the center.",
      "Warm the rice. Flake the salmon onto it with a fork, removing the skin.",
      "Add the soy sauce and sriracha and mash everything together.",
      "Top with sliced avocado and cucumber. Scoop bites into seaweed sheets if you have them.",
      "Leftover salmon works great here. Reheat the salmon and rice together for 1 minute with an ice cube on top to keep the rice moist.",
    ],
  },
  l10: {
    prep: 15, cook: 15, equipment: ["Air fryer or oven", "Saucepan or microwave (for broccoli)", "Clean towel"],
    pantry: [[1, "tsp", "cornstarch (optional, ~10 kcal, extra crisp)"], [1, "tsp", "sesame seeds (optional)"]],
    steps: [
      "Press the tofu in a towel under something heavy for 15 minutes, then cut it into ¾-inch cubes.",
      "Toss the cubes with the cornstarch if using. Air-fry at 400°F for 12–15 minutes, shaking halfway, or bake on parchment at 425°F for 25 minutes, flipping once.",
      "Steam the broccoli 4–5 minutes until bright green and just tender.",
      "Warm the teriyaki sauce in a pan, add the tofu, and toss to coat.",
      "Serve over the rice with the broccoli. Drizzle with sesame oil and sprinkle with sesame seeds.",
    ],
  },

  // ---------- Dinner ----------
  d1: {
    prep: 10, cook: 35, equipment: ["Oven", "Large sheet pan", "Meat thermometer"],
    pantry: [[0.5, "tsp", "smoked paprika"], [0.5, "tsp", "garlic powder"], [null, "", "salt and pepper"]],
    steps: [
      "Heat the oven to 425°F. Peel the sweet potato if you like and cut it into ¾-inch cubes. Toss with half the oil, salt and pepper, and roast alone 15 minutes.",
      "Meanwhile, cut the chicken into 1½-inch pieces (or pound breasts to an even thickness). Toss with the paprika, garlic powder, salt and pepper.",
      "Cut the broccoli into florets and toss with the remaining oil and a pinch of salt.",
      "Add the chicken and broccoli to the pan in a single layer. Crowding steams instead of browns, so use two pans if needed.",
      "Roast 18–20 minutes more, until the chicken reads 165°F and the sweet potato is caramelized.",
      "Meal prep: divide into containers. Keeps 4 days.",
    ],
  },
  d2: {
    prep: 5, cook: 12, equipment: ["Skillet", "Dry pan for tortillas"],
    pantry: [[1, "tsp", "chili powder"], [0.5, "tsp", "cumin"], [0.25, "tsp", "garlic powder"], [0.25, "tsp", "onion powder"], [2, "tbsp", "water"], [0.5, "", "lime"], [null, "", "salt"]],
    steps: [
      "Heat the skillet over medium-high. Add the beef and break it up. Cook 6–7 minutes until browned with no pink left (160°F). Drain any fat.",
      "Add the chili powder, cumin, garlic powder, onion powder, salt and the water. Simmer 2 minutes until the sauce coats the meat.",
      "Warm the tortillas in a dry pan, 30 seconds per side, until soft and lightly charred. Keep them wrapped in a towel.",
      "Fill with the beef, greens, salsa, cheese and a spoonful of Greek yogurt in place of sour cream. Squeeze lime over the top.",
    ],
  },
  d3: {
    prep: 8, cook: 15, equipment: ["Oven", "Sheet pan", "Saucepan (if cooking quinoa)"],
    pantry: [[0.5, "", "lemon, sliced"], [1, "clove", "garlic, minced"], [0.5, "tsp", "dried dill"], [null, "", "salt and pepper"]],
    steps: [
      "Heat the oven to 400°F. Cook the quinoa if needed: simmer covered in twice its volume of water 15 minutes, then rest 5.",
      "Snap the woody ends off the asparagus. Toss with the oil, salt and pepper and spread on one side of the pan.",
      "Put the salmon on the other side. Top with the garlic, dill, salt, pepper and lemon slices.",
      "Roast 12–14 minutes, until the salmon flakes easily and reads 145°F.",
      "Serve the salmon and asparagus over the quinoa, with a squeeze of the roasted lemon.",
    ],
  },
  d4: {
    prep: 15, cook: 20, equipment: ["Oven", "Sheet pan with parchment", "Large pot", "Saucepan", "Meat thermometer"],
    pantry: [[1, "tsp", "Italian seasoning"], [0.5, "tsp", "garlic powder"], [0.25, "tsp", "red pepper flakes (optional)"], [null, "", "salt and pepper"]],
    steps: [
      "Heat the oven to 400°F and bring a large pot of salted water to a boil.",
      "Mix the turkey with the Italian seasoning, garlic powder, salt and pepper. Don't overmix or the meatballs turn tough.",
      "Roll into 1½-inch balls (about 6 per serving) and set on the lined pan. Bake 16–18 minutes, until they read 165°F inside.",
      "Meanwhile, cook the pasta according to the package, usually 9–11 minutes. Drain.",
      "Warm the marinara in the saucepan, stir in the spinach until wilted, and add the meatballs.",
      "Toss with the pasta and top with the parmesan. Freeze extra meatballs in sauce for up to 3 months.",
    ],
  },
  d5: {
    prep: 10, cook: 10, equipment: ["Wok or large skillet"],
    pantry: [[2, "clove", "garlic, minced"], [1, "tsp", "fresh ginger, grated"], [1, "tsp", "rice vinegar (optional)"], [null, "", "cooking spray"]],
    steps: [
      "Slice the chicken into thin strips against the grain. Cut the vegetables into bite-size pieces. Have everything ready before you start; stir-fry moves fast.",
      "Heat the pan over high with cooking spray. Add the chicken in one layer and cook 4–5 minutes, turning, until cooked through (165°F). Move it to a plate.",
      "Add the broccoli, pepper and onion with a splash of water. Stir-fry 3–4 minutes until crisp-tender.",
      "Add the garlic and ginger for 30 seconds.",
      "Return the chicken, add the soy sauce and vinegar, and toss 1 minute.",
      "Off the heat, stir in the sesame oil. Serve over the rice.",
    ],
  },
  d6: {
    prep: 10, cook: 40, equipment: ["Oven", "Sheet pan"],
    pantry: [[0.5, "tsp", "paprika"], [0.5, "tsp", "garlic powder"], [0.5, "", "lemon"], [1, "tsp", "dried parsley"], [null, "", "salt and pepper"]],
    steps: [
      "Heat the oven to 425°F. Cut the potato into wedges, toss with half the oil, garlic powder, salt and pepper, and roast 25 minutes.",
      "Pat the cod dry and season with the paprika, salt, pepper and parsley. Toss the trimmed green beans with the remaining oil.",
      "Push the potatoes to the sides. Add the cod and green beans to the pan.",
      "Roast 10–12 minutes more, until the cod is opaque, flakes easily, and reads 145°F.",
      "Squeeze lemon over the fish before serving.",
    ],
  },
  d7: {
    prep: 10, cook: 30, equipment: ["Large pot or Dutch oven"],
    pantry: [[2, "tsp", "chili powder"], [1, "tsp", "cumin"], [0.5, "tsp", "smoked paprika"], [2, "clove", "garlic, minced"], [0.5, "cup", "water or broth"], [0.5, "", "lime"], [null, "", "salt"]],
    steps: [
      "Heat the oil in the pot over medium. Cook the diced onion 5 minutes until soft.",
      "Add the garlic, chili powder, cumin and paprika and stir 30 seconds.",
      "Add the sweet potato in ½-inch cubes, the diced tomatoes, the rinsed beans, the lentils and the water.",
      "Bring to a boil, then cover and simmer 20–25 minutes, stirring now and then, until the sweet potato is tender.",
      "Season with salt and lime juice. Mash a few sweet potato pieces against the pot to thicken it.",
      "Batch it: chili keeps 5 days in the fridge and 3 months frozen.",
    ],
  },
  d8: {
    prep: 5, cook: 40, equipment: ["Oven", "Sheet pan", "Cast-iron or heavy skillet", "Meat thermometer"],
    pantry: [[null, "", "coarse salt and black pepper"], [0.5, "tsp", "garlic powder"], [1, "tsp", "red wine vinegar (for the salad)"]],
    steps: [
      "Heat the oven to 425°F. Cut the potato into chunks, toss with most of the oil, garlic powder, salt and pepper, and roast 30–35 minutes until crisp.",
      "Take the steak out of the fridge 20 minutes early. Pat it completely dry and season generously with salt and pepper.",
      "Heat the skillet over high until it just starts to smoke, and add a few drops of oil.",
      "Sear the steak 3–4 minutes per side for a 1-inch cut, without moving it. Pull it at 130–135°F for medium-rare, or 145°F for USDA medium.",
      "Rest 5 minutes, then slice against the grain.",
      "Dress the greens with the last of the oil, the vinegar and a pinch of salt.",
    ],
  },
  d9: {
    prep: 10, cook: 45, equipment: ["Oven", "Sheet pan with parchment", "Blender", "Skillet", "Meat thermometer"],
    pantry: [[0.5, "tsp", "Italian seasoning"], [0.25, "tsp", "garlic powder"], [null, "", "salt and pepper"]],
    steps: [
      "Heat the oven to 350°F and line the pan with parchment. Don't skip the parchment; this crust sticks to bare pans.",
      "Blend the cottage cheese, eggs, Italian seasoning and garlic powder until completely smooth.",
      "Pour onto the parchment and spread into a thin rectangle about ¼ inch thick.",
      "Bake 30–35 minutes, until set and golden at the edges.",
      "Meanwhile, season the chicken and cook it in a skillet over medium-high 5–6 minutes per side to 165°F, then dice it. Slice the bell pepper.",
      "Spread the marinara over the crust. Top with the chicken, pepper and mozzarella.",
      "Bake 8–10 minutes more until the cheese melts. Rest 3 minutes before slicing.",
    ],
  },
  d10: {
    prep: 10, cook: 20, equipment: ["Large skillet or pot", "Microwave or saucepan for rice"],
    pantry: [[2, "clove", "garlic, minced"], [1, "tsp", "fresh ginger, grated"], [1.5, "tsp", "curry powder"], [0.5, "tsp", "garam masala"], [null, "", "salt"], [null, "", "fresh cilantro (optional)"]],
    steps: [
      "Heat the oil over medium. Cook the diced onion 4 minutes until soft.",
      "Add the garlic, ginger, curry powder and garam masala. Stir 30–60 seconds until fragrant.",
      "Add the chopped tomato and the rinsed chickpeas. Simmer 10 minutes, mashing a few chickpeas to thicken the sauce.",
      "Stir in the spinach until wilted. Season with salt.",
      "Take it off the heat and let it cool 1 minute, then stir in the Greek yogurt. Adding yogurt to a boiling pot makes it split.",
      "Serve over the rice with cilantro.",
    ],
  },
  d11: {
    prep: 15, cook: 12, equipment: ["Wok or large skillet", "Clean towel"],
    pantry: [[2, "clove", "garlic, minced"], [1, "tsp", "fresh ginger, grated"], [null, "", "red pepper flakes (optional)"], [null, "", "cooking spray"]],
    steps: [
      "Press the tofu in a towel for 10–15 minutes and cut it into ¾-inch cubes.",
      "Heat the pan over medium-high with cooking spray. Brown the tofu 6–8 minutes, turning every couple of minutes, until golden on most sides. Move it to a plate.",
      "Add the broccoli, pepper and edamame with a splash of water. Stir-fry 4 minutes.",
      "Add the garlic and ginger for 30 seconds.",
      "Return the tofu, add the soy sauce, and toss. Off the heat, stir in the sesame oil.",
      "Serve over the rice.",
    ],
  },

  // ---------- Snacks ----------
  s1: { prep: 2, cook: 0, equipment: ["Bowl"], pantry: [[null, "", "cinnamon (optional)"]],
    steps: ["Spoon the yogurt into a bowl.", "Top with the blueberries (thawed frozen berries work too) and a sprinkle of cinnamon."] },
  s2: { prep: 3, cook: 0, equipment: ["Bowl"], pantry: [[null, "", "pinch of cinnamon or black pepper"]],
    steps: ["Slice the strawberries.", "Serve over the cottage cheese. Cinnamon makes it sweet; black pepper makes it savory."] },
  s3: { prep: 2, cook: 0, equipment: ["Shaker bottle"], pantry: [[10, "oz", "cold water or ice"]],
    steps: ["Add the water to the shaker first, then the whey.", "Shake 20 seconds. Eat the banana alongside. Best within 1 hour after training."] },
  s4: { prep: 2, cook: 0, equipment: ["Knife"], pantry: [[null, "", "pinch of cinnamon (optional)"]],
    steps: ["Core and slice the apple.", "Measure the peanut butter with a spoon. Eyeballed peanut butter is the most common hidden calorie in a diet.", "Dip and enjoy."] },
  s5: { prep: 5, cook: 0, equipment: ["Knife", "Small bowl"], pantry: [[null, "", "paprika on the hummus (optional)"]],
    steps: ["Slice the cucumber and bell pepper into sticks.", "Spoon the hummus into a small bowl.", "Serve with the rice cakes and veggies for dipping."] },
  s6: { prep: 4, cook: 0, equipment: ["Bowl", "Fork"], pantry: [[0.5, "tsp", "Dijon or sriracha"], [null, "", "black pepper"]],
    steps: ["Drain the tuna well.", "Mix with the Greek yogurt, Dijon or sriracha, and pepper.", "Pile onto the rice cakes right before eating so they stay crisp."] },
  s7: { prep: 1, cook: 5, equipment: ["Microwave-safe bowl or small pot"], pantry: [[null, "", "flaky salt"], [null, "", "chili flakes or garlic powder (optional)"]],
    steps: ["Microwave the frozen shelled edamame covered for 3–4 minutes, or boil 3–5 minutes and drain.", "Toss with flaky salt and chili flakes while hot."] },
  s8: { prep: 2, cook: 12, equipment: ["Small pot", "Bowl of ice water"], pantry: [[null, "", "salt and pepper"]],
    steps: [
      "Place the eggs in the pot and cover with cold water by 1 inch. Bring to a boil.",
      "As soon as it boils, cover, turn off the heat, and let it sit 10 minutes for firm yolks (7 for jammy).",
      "Move the eggs to ice water for 5 minutes. They peel far easier.",
      "Peel and season. Eat with the strawberries. Unpeeled boiled eggs keep 1 week in the fridge.",
    ] },
  s9: { prep: 3, cook: 0, equipment: ["Blender"], pantry: [[4, "", "ice cubes"]],
    steps: ["Pour the soy milk into the blender first.", "Add the pea protein, strawberries and ice.", "Blend 45 seconds until smooth."] },

  // ---------- Healthy desserts ----------
  x1: {
    prep: 5, cook: 0, wait: "24 h in the freezer", equipment: ["Ninja Creami pint (or ice cube tray + food processor)", "Blender or shaker"],
    pantry: [[0.5, "tsp", "vanilla extract"], [null, "", "pinch of salt"], [1, "tsp", "zero-calorie sweetener (optional)"]],
    steps: [
      "Blend or shake the milk, whey, vanilla, salt and sweetener until smooth.",
      "Pour into the Creami pint up to the fill line. Freeze on a level surface for 24 hours.",
      "Spin on the Lite Ice Cream setting. If it comes out powdery, add 1 tablespoon of milk and press Re-spin.",
      "Make a hole down the middle, add the chopped strawberries, and run the Mix-in setting.",
      "No Creami? Freeze the mix in an ice cube tray, then blend the cubes in a food processor with a splash of milk until creamy.",
    ],
  },
  x2: {
    prep: 5, cook: 0, wait: "2–3 h in the freezer", equipment: ["Sheet pan or plate", "Parchment paper"],
    pantry: [[0.25, "tsp", "vanilla extract"]],
    steps: [
      "Line a pan or plate with parchment.",
      "Stir the honey and vanilla into the Greek yogurt.",
      "Spread it about ½ inch thick on the parchment.",
      "Press in sliced strawberries and scatter the chopped dark chocolate on top.",
      "Freeze 2–3 hours until solid, then break into pieces. Store in a freezer bag and let pieces sit 2 minutes before eating.",
    ],
  },
  x3: {
    prep: 5, cook: 0, wait: "30 min in the fridge", equipment: ["Blender or food processor"],
    pantry: [[0.5, "tsp", "vanilla extract"], [null, "", "pinch of salt"]],
    steps: [
      "Blend the cottage cheese about 1 minute, until completely smooth with no curds. This is the step that makes it taste like dough.",
      "Add the powdered peanut butter, maple syrup, vanilla and salt. Blend again.",
      "Fold in the chopped dark chocolate by hand.",
      "Chill 30 minutes to firm up. Keeps 3 days.",
    ],
  },
  x4: {
    prep: 3, cook: 2, equipment: ["Large microwave-safe mug", "Fork"],
    pantry: [[0.5, "tsp", "baking powder"], [null, "", "pinch of salt"], [null, "", "cooking spray"]],
    steps: [
      "Blend or grind the oats into flour. Spray the mug.",
      "Mix the whey, cocoa, oat flour, baking powder and salt in the mug with a fork.",
      "Add the egg whites and almond milk. Stir until smooth with no dry pockets.",
      "Microwave 60–75 seconds, until it rises and the top is just set but still slightly moist. Overcooked protein cake turns rubbery.",
      "Let it stand 1 minute before eating.",
    ],
  },
  x5: {
    prep: 5, cook: 20, equipment: ["Microwave-safe bowl, or oven and small baking dish"],
    pantry: [[0.5, "tsp", "cinnamon"], [null, "", "pinch of nutmeg (optional)"]],
    steps: [
      "Core the apple and cut it into thick slices. Toss with the cinnamon and nutmeg.",
      "Microwave covered 3–4 minutes until soft, or bake at 375°F for 20 minutes.",
      "Top the warm apple with the Greek yogurt, granola and a drizzle of honey.",
    ],
  },
  x6: {
    prep: 5, cook: 0, wait: "30 min in the fridge", equipment: ["Blender or food processor"],
    pantry: [[0.5, "tsp", "vanilla extract"], [null, "", "pinch of salt"]],
    steps: [
      "Use a ripe avocado; it should yield to a gentle press.",
      "Blend the avocado, banana, cocoa, maple syrup, almond milk, vanilla and salt until silky, scraping down the sides.",
      "Taste, and add a few drops more maple if you like.",
      "Chill 30 minutes. Best eaten the same day.",
    ],
  },
  x7: {
    prep: 5, cook: 0, wait: "3 h to freeze the banana", equipment: ["Food processor or strong blender"],
    pantry: [[0.25, "tsp", "vanilla extract"], [null, "", "pinch of salt"]],
    steps: [
      "Slice a ripe, spotty banana into coins and freeze on a plate at least 3 hours.",
      "Process the frozen banana with the powdered peanut butter, almond milk, vanilla and salt.",
      "It looks crumbly at first. Keep going 2–3 minutes, scraping the sides, until it turns into smooth soft-serve.",
      "Eat right away, or freeze 30 minutes for a scoopable texture.",
    ],
  },
};
