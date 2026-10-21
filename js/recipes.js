// Built-in recipe library. Macros are computed from the ingredient table below
// (USDA FoodData Central values per 100 g, rounded), so scaling a portion is exact.
// Diet tags are derived from ingredients, never hand-labelled.

import { PREP } from "./recipe-steps.js";

// name: [kcal, protein, carbs, fat, flags]   flags: m=meat f=fish d=dairy e=egg g=gluten
const ING = {
  "chicken breast (raw)": [120, 22.5, 0, 2.6, "m"],
  "93% lean ground turkey (raw)": [150, 18.7, 0, 8.3, "m"],
  "93% lean ground beef (raw)": [152, 21, 0, 7, "m"],
  "top sirloin, trimmed (raw)": [143, 21.5, 0, 6, "m"],
  "deli turkey breast": [104, 17, 4, 2, "m"],
  "salmon (raw)": [208, 20, 0, 13, "f"],
  "shrimp (raw)": [85, 20, 0, 0.5, "f"],
  "cod (raw)": [82, 18, 0, 0.7, "f"],
  "tuna in water (drained)": [116, 26, 0, 0.8, "f"],
  "eggs": [143, 12.6, 0.7, 9.5, "e"],
  "liquid egg whites": [52, 11, 0.7, 0.2, "e"],
  "nonfat Greek yogurt": [59, 10.3, 3.6, 0.4, "d"],
  "2% cottage cheese": [81, 10.5, 4.8, 2.3, "d"],
  "whey protein": [400, 80, 8, 6, "d"],
  "pea protein powder": [380, 80, 5, 6, ""],
  "unsweetened soy milk": [33, 2.9, 1.2, 1.6, ""],
  "skim milk": [34, 3.4, 5, 0.1, "d"],
  "part-skim mozzarella": [254, 24, 2.8, 16, "d"],
  "cheddar": [403, 25, 1.3, 33, "d"],
  "feta": [264, 14, 4, 21, "d"],
  "parmesan": [392, 35.8, 3.2, 25.8, "d"],
  "firm tofu": [144, 17.3, 2.8, 8.7, ""],
  "shelled edamame": [121, 11.9, 8.9, 5.2, ""],
  "black beans (cooked)": [132, 8.9, 23.7, 0.5, ""],
  "chickpeas (cooked)": [164, 8.9, 27.4, 2.6, ""],
  "lentils (cooked)": [116, 9, 20, 0.4, ""],
  "rolled oats": [379, 13, 68, 6.5, "g"],
  "white rice (cooked)": [130, 2.7, 28, 0.3, ""],
  "quinoa (cooked)": [120, 4.4, 21, 1.9, ""],
  "whole-wheat pasta (dry)": [350, 14, 73, 2.5, "g"],
  "whole-grain bread": [250, 13, 43, 3.5, "g"],
  "whole-wheat tortilla": [300, 9, 50, 7, "g"],
  "corn tortillas": [218, 5.7, 44.6, 2.9, ""],
  "rice cakes": [387, 8, 81, 2.8, ""],
  "granola": [470, 10, 64, 20, "g"],
  "potato": [93, 2.5, 21, 0.1, ""],
  "sweet potato": [90, 2, 21, 0.2, ""],
  "banana": [89, 1.1, 23, 0.3, ""],
  "blueberries": [57, 0.7, 14.5, 0.3, ""],
  "strawberries": [32, 0.7, 7.7, 0.3, ""],
  "apple": [52, 0.3, 14, 0.2, ""],
  "broccoli": [34, 2.8, 6.6, 0.4, ""],
  "spinach": [23, 2.9, 3.6, 0.4, ""],
  "mixed greens": [20, 1.5, 3.5, 0.2, ""],
  "bell pepper": [31, 1, 6, 0.3, ""],
  "onion": [40, 1.1, 9.3, 0.1, ""],
  "tomato": [18, 0.9, 3.9, 0.2, ""],
  "cucumber": [15, 0.7, 3.6, 0.1, ""],
  "asparagus": [20, 2.2, 3.9, 0.1, ""],
  "green beans": [31, 1.8, 7, 0.2, ""],
  "cabbage / coleslaw mix": [25, 1.3, 5.8, 0.1, ""],
  "cauliflower rice": [25, 1.9, 5, 0.3, ""],
  "frozen peas": [81, 5.4, 14.5, 0.4, ""],
  "avocado": [160, 2, 8.5, 14.7, ""],
  "salsa": [36, 1.5, 7, 0.2, ""],
  "marinara sauce": [50, 1.5, 8, 1.5, ""],
  "hummus": [166, 7.9, 14.3, 9.6, ""],
  "peanut butter": [588, 25, 20, 50, ""],
  "powdered peanut butter": [462, 46, 38, 11.5, ""],
  "chia seeds": [486, 16.5, 42, 30.7, ""],
  "olive oil": [884, 0, 0, 100, ""],
  "sesame oil": [884, 0, 0, 100, ""],
  "low-sodium soy sauce": [60, 8, 6, 0, "g"],
  "teriyaki sauce": [89, 6, 16, 0, "g"],
  "honey": [304, 0.3, 82, 0, ""],
  "maple syrup": [260, 0, 67, 0, ""],
  "dark chocolate (70–85%)": [598, 7.8, 46, 43, "d"],
  "unsweetened cocoa": [228, 19.6, 58, 13.7, ""],
  "unsweetened almond milk": [15, 0.6, 0.3, 1.2, ""],
};

// [id, name, slot, [[ingredient, grams per serving]...], steps, note]
const RAW = [
  // ---------- Breakfast ----------
  ["b1", "Protein Overnight Oats", "breakfast", [["rolled oats", 50], ["whey protein", 30], ["nonfat Greek yogurt", 100], ["unsweetened almond milk", 120], ["blueberries", 75], ["chia seeds", 10]],
    ["Stir oats, whey, chia, yogurt and almond milk in a jar.", "Refrigerate overnight.", "Top with blueberries."], "Viral meal-prep staple"],
  ["b2", "Cottage Cheese Scrambled Eggs & Toast", "breakfast", [["eggs", 100], ["liquid egg whites", 100], ["2% cottage cheese", 100], ["spinach", 30], ["whole-grain bread", 35]],
    ["Whisk eggs, whites and cottage cheese.", "Wilt spinach in a nonstick pan, add eggs, scramble low and slow.", "Serve with toast."], "Trending high-protein swap"],
  ["b3", "Greek Yogurt Power Parfait", "breakfast", [["nonfat Greek yogurt", 250], ["granola", 30], ["strawberries", 100], ["honey", 10]],
    ["Layer yogurt, berries and granola.", "Drizzle with honey."], ""],
  ["b4", "Turkey Breakfast Burrito", "breakfast", [["whole-wheat tortilla", 60], ["eggs", 100], ["liquid egg whites", 100], ["93% lean ground turkey (raw)", 60], ["bell pepper", 30], ["salsa", 30], ["cheddar", 15]],
    ["Brown turkey with peppers.", "Add eggs and whites, scramble.", "Fill tortilla, add cheese and salsa, roll. Freezes well."], "Meal-prep favorite"],
  ["b5", "Banana Oat Protein Pancakes", "breakfast", [["rolled oats", 40], ["banana", 60], ["liquid egg whites", 120], ["whey protein", 20], ["nonfat Greek yogurt", 50], ["maple syrup", 10]],
    ["Blend oats, banana, whites and whey.", "Cook small pancakes on a nonstick pan.", "Top with yogurt and maple."], "Viral blender pancakes"],
  ["b6", "Avocado Toast with Eggs", "breakfast", [["whole-grain bread", 70], ["avocado", 50], ["eggs", 100], ["tomato", 50]],
    ["Toast bread, mash avocado on top.", "Add fried or poached eggs and sliced tomato. Salt, pepper, chili flakes."], ""],
  ["b7", "Veggie Tofu Scramble", "breakfast", [["firm tofu", 200], ["spinach", 40], ["bell pepper", 40], ["onion", 30], ["olive oil", 5], ["whole-grain bread", 35]],
    ["Sauté onion and pepper in oil.", "Crumble in tofu with turmeric, garlic powder, salt.", "Fold in spinach; serve with toast."], ""],
  ["b8", "PB Banana Protein Smoothie", "breakfast", [["banana", 100], ["powdered peanut butter", 20], ["whey protein", 30], ["skim milk", 250], ["rolled oats", 20]],
    ["Blend everything with ice."], ""],
  ["b9", "Berry Chia Pudding", "breakfast", [["chia seeds", 30], ["unsweetened almond milk", 200], ["powdered peanut butter", 15], ["strawberries", 100], ["maple syrup", 10]],
    ["Whisk chia, almond milk, PB powder and maple.", "Rest 20 min or overnight.", "Top with berries."], ""],
  ["b10", "Egg White Bites & Roasted Potatoes", "breakfast", [["liquid egg whites", 200], ["2% cottage cheese", 60], ["spinach", 30], ["bell pepper", 30], ["potato", 150], ["olive oil", 5]],
    ["Blend whites and cottage cheese; pour into muffin tin over spinach and pepper.", "Bake 20 min at 350°F.", "Roast diced potatoes in oil at 425°F for 25 min."], "Copycat coffee-shop egg bites"],
  ["b11", "Vegan Protein Oats", "breakfast", [["rolled oats", 50], ["pea protein powder", 30], ["unsweetened soy milk", 200], ["blueberries", 75], ["chia seeds", 10]],
    ["Cook oats in soy milk 3–4 min.", "Stir in protein powder off the heat (add a splash of milk if thick).", "Top with blueberries and chia."], ""],

  // ---------- Lunch ----------
  ["l1", "Chicken Burrito Bowl", "lunch", [["chicken breast (raw)", 150], ["white rice (cooked)", 150], ["black beans (cooked)", 80], ["salsa", 60], ["mixed greens", 40], ["cheddar", 15], ["avocado", 30]],
    ["Season chicken with cumin, chili powder, lime; grill or pan-sear.", "Build bowl over rice and greens with beans, salsa, cheese, avocado."], "Copycat Chipotle bowl"],
  ["l2", "Greek Yogurt Tuna Wrap", "lunch", [["tuna in water (drained)", 120], ["nonfat Greek yogurt", 40], ["cucumber", 50], ["whole-wheat tortilla", 60], ["mixed greens", 30]],
    ["Mix tuna with yogurt, mustard, lemon, pepper.", "Wrap with cucumber and greens."], ""],
  ["l3", "Turkey Egg Roll in a Bowl", "lunch", [["93% lean ground turkey (raw)", 170], ["cabbage / coleslaw mix", 200], ["onion", 30], ["low-sodium soy sauce", 15], ["sesame oil", 5], ["white rice (cooked)", 100]],
    ["Brown turkey with onion, garlic and ginger.", "Add coleslaw mix and soy; cook until just tender.", "Finish with sesame oil; serve over rice."], "Viral low-carb dinner"],
  ["l4", "Mediterranean Chickpea Quinoa Bowl", "lunch", [["quinoa (cooked)", 150], ["chickpeas (cooked)", 100], ["cucumber", 60], ["tomato", 60], ["feta", 30], ["hummus", 30], ["olive oil", 8]],
    ["Toss quinoa, chickpeas, cucumber and tomato with oil, lemon, oregano.", "Top with feta and hummus."], ""],
  ["l5", "Chicken Caesar Protein Salad", "lunch", [["chicken breast (raw)", 150], ["mixed greens", 100], ["parmesan", 15], ["nonfat Greek yogurt", 40], ["whole-grain bread", 30], ["olive oil", 5]],
    ["Grill chicken; slice.", "Dressing: yogurt, parmesan, lemon, garlic, Dijon.", "Toast cubed bread with oil for croutons; toss everything."], ""],
  ["l6", "Shrimp Fried Rice", "lunch", [["shrimp (raw)", 180], ["white rice (cooked)", 100], ["cauliflower rice", 150], ["eggs", 50], ["frozen peas", 50], ["low-sodium soy sauce", 15], ["sesame oil", 5]],
    ["Scramble egg; set aside.", "Sear shrimp, add peas, rice and cauliflower rice.", "Add soy, egg and sesame oil."], ""],
  ["l7", "Hearty Lentil & Tomato Stew", "lunch", [["lentils (cooked)", 200], ["onion", 40], ["tomato", 80], ["spinach", 40], ["olive oil", 7], ["whole-grain bread", 50]],
    ["Sauté onion and garlic in oil; add tomato, cumin, paprika.", "Add lentils and a splash of broth; simmer 10 min.", "Stir in spinach; serve with bread."], ""],
  ["l8", "Turkey Hummus Sandwich & Apple", "lunch", [["whole-grain bread", 70], ["deli turkey breast", 100], ["hummus", 30], ["spinach", 20], ["tomato", 40], ["apple", 150]],
    ["Spread hummus, layer turkey, spinach, tomato.", "Apple on the side."], ""],
  ["l9", "Salmon Rice Bowl", "lunch", [["salmon (raw)", 120], ["white rice (cooked)", 150], ["avocado", 40], ["cucumber", 50], ["low-sodium soy sauce", 10]],
    ["Bake salmon 12 min at 400°F; flake over rice.", "Add soy, a little sriracha, avocado and cucumber. Wrap bites in seaweed if you like."], "Inspired by the viral TikTok salmon rice bowl"],
  ["l10", "Teriyaki Tofu Bowl", "lunch", [["firm tofu", 200], ["white rice (cooked)", 150], ["broccoli", 100], ["teriyaki sauce", 20], ["sesame oil", 3]],
    ["Press and cube tofu; air-fry or bake until crisp.", "Steam broccoli.", "Toss tofu in teriyaki; serve over rice."], ""],

  // ---------- Dinner ----------
  ["d1", "Sheet-Pan Chicken, Sweet Potato & Broccoli", "dinner", [["chicken breast (raw)", 170], ["sweet potato", 200], ["broccoli", 150], ["olive oil", 10]],
    ["Cube sweet potato; roast 15 min at 425°F with half the oil.", "Add chicken and broccoli with remaining oil and seasoning; roast 18–20 min more."], ""],
  ["d2", "Lean Beef Street Tacos", "dinner", [["93% lean ground beef (raw)", 150], ["corn tortillas", 75], ["salsa", 60], ["mixed greens", 30], ["nonfat Greek yogurt", 30], ["cheddar", 15]],
    ["Brown beef with taco seasoning.", "Warm tortillas; fill with beef, greens, salsa, cheese.", "Greek yogurt replaces sour cream."], ""],
  ["d3", "Lemon Garlic Salmon, Quinoa & Asparagus", "dinner", [["salmon (raw)", 150], ["quinoa (cooked)", 150], ["asparagus", 150], ["olive oil", 5]],
    ["Season salmon with lemon, garlic, dill.", "Roast salmon and oiled asparagus at 400°F for 12–14 min.", "Serve over quinoa."], ""],
  ["d4", "High-Protein Turkey Meatball Pasta", "dinner", [["93% lean ground turkey (raw)", 150], ["whole-wheat pasta (dry)", 75], ["marinara sauce", 120], ["parmesan", 10], ["spinach", 40]],
    ["Mix turkey with garlic, Italian seasoning; roll meatballs and bake 18 min at 400°F.", "Cook pasta; warm marinara with spinach.", "Combine, top with parmesan."], ""],
  ["d5", "Chicken & Veggie Stir-Fry", "dinner", [["chicken breast (raw)", 170], ["bell pepper", 80], ["broccoli", 100], ["onion", 40], ["white rice (cooked)", 150], ["low-sodium soy sauce", 15], ["sesame oil", 5]],
    ["Sear sliced chicken in a hot pan.", "Add vegetables, garlic, ginger; stir-fry 4 min.", "Add soy and sesame oil; serve over rice."], ""],
  ["d6", "Baked Cod, Potatoes & Green Beans", "dinner", [["cod (raw)", 200], ["potato", 250], ["green beans", 150], ["olive oil", 10]],
    ["Roast potato wedges with half the oil at 425°F, 25 min.", "Add cod (lemon, paprika) and green beans with remaining oil; bake 12 min."], "Great for Fridays"],
  ["d7", "Black Bean, Lentil & Sweet Potato Chili", "dinner", [["black beans (cooked)", 150], ["lentils (cooked)", 120], ["sweet potato", 150], ["tomato", 150], ["onion", 50], ["olive oil", 5]],
    ["Sauté onion in oil with chili powder and cumin.", "Add diced sweet potato, tomatoes, beans, lentils and water.", "Simmer 25 min."], ""],
  ["d8", "Sirloin Steak & Potatoes", "dinner", [["top sirloin, trimmed (raw)", 180], ["potato", 250], ["mixed greens", 80], ["olive oil", 8]],
    ["Roast potatoes with oil at 425°F.", "Sear steak 3–4 min per side; rest 5 min.", "Serve with a simple green salad."], ""],
  ["d9", "Cottage Cheese Flatbread Pizza", "dinner", [["2% cottage cheese", 120], ["eggs", 100], ["marinara sauce", 50], ["part-skim mozzarella", 30], ["chicken breast (raw)", 80], ["bell pepper", 30]],
    ["Blend cottage cheese and eggs; spread thin on parchment.", "Bake 30–35 min at 350°F until set.", "Top with marinara, cooked chicken, pepper, mozzarella; bake 8 min more."], "Viral TikTok cottage cheese flatbread"],
  ["d10", "Chickpea Spinach Curry", "dinner", [["chickpeas (cooked)", 150], ["spinach", 80], ["tomato", 100], ["onion", 40], ["olive oil", 8], ["white rice (cooked)", 120], ["nonfat Greek yogurt", 80]],
    ["Sauté onion, garlic, ginger with curry powder and garam masala.", "Add tomato and chickpeas; simmer 10 min; wilt spinach.", "Stir in yogurt off the heat; serve over rice."], ""],

  ["d11", "Tofu & Edamame Stir-Fry", "dinner", [["firm tofu", 150], ["shelled edamame", 100], ["broccoli", 100], ["bell pepper", 60], ["white rice (cooked)", 120], ["low-sodium soy sauce", 15], ["sesame oil", 5]],
    ["Crisp cubed tofu in a hot pan.", "Add edamame, broccoli and pepper with garlic and ginger; stir-fry 4 min.", "Add soy and sesame oil; serve over rice."], ""],

  // ---------- Snacks ----------
  ["s1", "Greek Yogurt & Berries", "snack", [["nonfat Greek yogurt", 200], ["blueberries", 75]], ["Top yogurt with berries."], ""],
  ["s2", "Cottage Cheese & Strawberries", "snack", [["2% cottage cheese", 150], ["strawberries", 80]], ["Combine and enjoy."], ""],
  ["s3", "Protein Shake & Banana", "snack", [["whey protein", 30], ["banana", 100]], ["Shake whey with water; banana on the side."], ""],
  ["s4", "Apple & Peanut Butter", "snack", [["apple", 180], ["peanut butter", 16]], ["Slice apple; dip in peanut butter."], ""],
  ["s5", "Hummus, Veggies & Rice Cakes", "snack", [["hummus", 60], ["cucumber", 100], ["bell pepper", 80], ["rice cakes", 18]], ["Slice veggies; dip."], ""],
  ["s6", "Tuna Rice Cakes", "snack", [["tuna in water (drained)", 85], ["rice cakes", 18], ["nonfat Greek yogurt", 20]], ["Mix tuna with yogurt and seasoning; pile onto rice cakes."], ""],
  ["s7", "Salted Edamame", "snack", [["shelled edamame", 150]], ["Steam; sprinkle with flaky salt and chili."], ""],
  ["s8", "Hard-Boiled Eggs & Strawberries", "snack", [["eggs", 100], ["strawberries", 100]], ["Boil eggs 10 min; ice bath; peel."], ""],
  ["s9", "Plant Protein Berry Smoothie", "snack", [["pea protein powder", 30], ["unsweetened soy milk", 250], ["strawberries", 100]], ["Blend with ice."], ""],

  // ---------- Healthy desserts ----------
  ["x1", "Protein \"Ice Cream\"", "dessert", [["skim milk", 250], ["whey protein", 30], ["strawberries", 50]],
    ["Blend milk and whey; freeze in a pint container 24 h.", "Spin in a Ninja Creami (or let soften 10 min and blend). Fold in berries."], "Viral Ninja Creami protein ice cream"],
  ["x2", "Frozen Greek Yogurt Bark", "dessert", [["nonfat Greek yogurt", 150], ["strawberries", 60], ["dark chocolate (70–85%)", 10], ["honey", 8]],
    ["Mix yogurt and honey; spread on parchment.", "Top with berries and chopped chocolate.", "Freeze 2 h; break into pieces."], "Viral TikTok yogurt bark"],
  ["x3", "Cottage Cheese Cookie Dough", "dessert", [["2% cottage cheese", 120], ["powdered peanut butter", 15], ["maple syrup", 10], ["dark chocolate (70–85%)", 10]],
    ["Blend cottage cheese, PB powder, maple and vanilla until smooth.", "Fold in chopped chocolate; chill."], "Viral TikTok cottage cheese cookie dough"],
  ["x4", "Chocolate Protein Mug Cake", "dessert", [["whey protein", 30], ["unsweetened cocoa", 10], ["liquid egg whites", 60], ["rolled oats", 15], ["unsweetened almond milk", 30]],
    ["Whisk everything with ½ tsp baking powder in a mug.", "Microwave 60–75 seconds."], ""],
  ["x5", "Cinnamon Baked Apple & Yogurt", "dessert", [["apple", 180], ["nonfat Greek yogurt", 100], ["granola", 15], ["honey", 5]],
    ["Slice apple, sprinkle cinnamon; microwave 3 min or bake 20 min.", "Top with yogurt, granola and honey."], ""],
  ["x6", "Chocolate Avocado Mousse", "dessert", [["avocado", 60], ["unsweetened cocoa", 10], ["maple syrup", 15], ["unsweetened almond milk", 60], ["banana", 50]],
    ["Blend until silky; chill 30 min."], ""],
  ["x7", "PB Banana \"Nice Cream\"", "dessert", [["banana", 120], ["powdered peanut butter", 15], ["unsweetened almond milk", 40]],
    ["Freeze sliced banana.", "Blend with PB powder and almond milk until soft-serve."], "Viral 1-ingredient ice cream"],
];

function macrosOf(ingredients) {
  const t = { cal: 0, p: 0, c: 0, f: 0 };
  for (const [name, g] of ingredients) {
    const row = ING[name];
    if (!row) throw new Error(`Unknown ingredient: ${name}`);
    t.cal += (row[0] * g) / 100;
    t.p += (row[1] * g) / 100;
    t.c += (row[2] * g) / 100;
    t.f += (row[3] * g) / 100;
  }
  return t;
}

function flagsOf(ingredients) {
  return new Set(ingredients.flatMap(([name]) => [...ING[name][4]]));
}

export const RECIPES = RAW.map(([id, name, slot, ingredients, steps, note]) => ({
  id, name, slot, steps, note,
  ...PREP[id], // detailed prep: times, equipment, seasonings, full steps (overrides the short steps)
  ingredients: ingredients.map(([n, g]) => ({ name: n, g })),
  per: macrosOf(ingredients),
  flags: flagsOf(ingredients),
}));

export const DIETS = {
  everything: { label: "Everything", excludes: "" },
  pescatarian: { label: "Pescatarian (no meat)", excludes: "m" },
  vegetarian: { label: "Vegetarian", excludes: "mf" },
  vegan: { label: "Vegan", excludes: "mfde" },
  "dairy-free": { label: "Dairy-free", excludes: "d" },
  "gluten-free": { label: "Gluten-free", excludes: "g" },
};

export function fitsDiet(recipe, diet, meatless) {
  const ex = (DIETS[diet]?.excludes || "") + (meatless ? "m" : "");
  return ![...ex].some((flag) => recipe.flags.has(flag));
}
