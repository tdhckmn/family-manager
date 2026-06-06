import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "meal-planner-data-v3";
const DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const MEAL_TIMES = ["Breakfast","Lunch","Dinner"];
const FOOD_TYPES = ["American","Italian","Mexican","Asian","Mediterranean","Indian","Greek","Breakfast","Soup/Salad","Other"];
const PROTEINS = ["None/Vegetarian","Chicken","Fish/Seafood","Beef","Pork","Turkey","Eggs","Beans/Legumes","Tofu","Other"];

const defaultProfile = {
  meatPreference: "light", complexity: "simple",
  avoidIngredients: "exotic spices, fancy cheeses, hard-to-find items",
  familyNotes: "Kid-friendly, weeknight meals, simple pantry ingredients"
};

const SEED_MEALS = [
  { id:"s1",  name:"Coney dogs",              type:"American",       protein:"Beef",            prepTime:"20 min", servings:4, ingredients:"Hot dogs\nConey sauce (ground beef, onion, chili powder, cumin, tomato paste)\nHot dog buns\nYellow mustard\nDiced white onion", notes:"Brown ground beef with onions and spices to make the sauce. Simmer 15 min. Grill or steam dogs, load into buns, top with sauce, mustard, and onion.", source:"AI Generated" },
  { id:"s2",  name:"Alfredo",                 type:"Italian",        protein:"None/Vegetarian", prepTime:"25 min", servings:4, ingredients:"Fettuccine\nButter\nHeavy cream\nParmesan cheese\nGarlic\nSalt and pepper\nParsley", notes:"Cook pasta. Melt butter, add garlic, pour in cream and simmer. Stir in parmesan until smooth. Toss with pasta. Add chicken or shrimp if desired.", source:"AI Generated" },
  { id:"s3",  name:"Dumpling soup",           type:"Asian",          protein:"Chicken",         prepTime:"30 min", servings:4, ingredients:"Frozen dumplings or potstickers\nChicken broth\nBok choy or spinach\nGreen onions\nSoy sauce\nSesame oil\nGinger\nGarlic", notes:"Bring broth to a boil with garlic and ginger. Add dumplings and cook per package directions. Add greens last 2 min. Finish with soy sauce and sesame oil.", source:"AI Generated" },
  { id:"s4",  name:"Breakfast sandwiches",    type:"Breakfast",      protein:"Eggs",            prepTime:"20 min", servings:4, ingredients:"English muffins or sandwich rolls\nEggs\nAmerican cheese slices\nBreakfast sausage or bacon\nButter\nSalt and pepper", notes:"Cook sausage or bacon. Fry or scramble eggs. Toast muffins, layer with egg, cheese, and meat. Wrap in foil for a minute to melt everything together.", source:"AI Generated" },
  { id:"s5",  name:"Fried rice",              type:"Asian",          protein:"Eggs",            prepTime:"25 min", servings:4, ingredients:"Cooked rice (day-old preferred)\nEggs\nFrozen peas and carrots\nSoy sauce\nSesame oil\nGarlic\nGreen onions\nVegetable oil", notes:"Scramble eggs and set aside. Stir-fry garlic, add rice and press into pan. Add veggies, soy sauce, sesame oil. Fold in eggs and green onions.", source:"AI Generated" },
  { id:"s6",  name:"Poutine",                 type:"American",       protein:"None/Vegetarian", prepTime:"40 min", servings:4, ingredients:"Frozen fries or fresh potatoes\nCheese curds\nBrown gravy (store-bought or homemade)\nSalt and pepper", notes:"Bake or fry fries until crispy. Heat gravy. Top fries with cheese curds, pour hot gravy over so curds slightly melt. Serve immediately.", source:"AI Generated" },
  { id:"s7",  name:"Chopped cheese",          type:"American",       protein:"Beef",            prepTime:"20 min", servings:4, ingredients:"Ground beef\nAmerican cheese\nHoagie rolls\nLettuce\nTomato\nOnion\nKetchup and mayo\nSalt and pepper", notes:"Cook and chop ground beef on a griddle or pan, season well. Lay cheese on top to melt. Load into roll with lettuce, tomato, onion, and condiments.", source:"AI Generated" },
  { id:"s8",  name:"Pad thai",                type:"Asian",          protein:"Tofu",            prepTime:"30 min", servings:4, ingredients:"Rice noodles\nFirm tofu or chicken\nEggs\nBean sprouts\nGreen onions\nPad thai sauce (fish sauce, tamarind, brown sugar)\nPeanuts\nLime\nVegetable oil", notes:"Soak noodles. Fry tofu until golden, push aside and scramble eggs. Add noodles and sauce, toss everything together. Top with sprouts, peanuts, and lime.", source:"AI Generated" },
  { id:"s9",  name:"Botana",                  type:"Mexican",        protein:"Beans/Legumes",   prepTime:"30 min", servings:6, ingredients:"Tortilla chips\nRefried beans\nShredded cheese\nJalapeños\nSour cream\nGuacamole\nPico de gallo\nOptional: chorizo or ground beef", notes:"Spread chips on a large platter. Layer warm beans, cheese, and jalapeños. Broil briefly to melt cheese. Top with sour cream, guac, and pico. Serve family style.", source:"AI Generated" },
  { id:"s10", name:"Cheeseburgers",           type:"American",       protein:"Beef",            prepTime:"25 min", servings:4, ingredients:"Ground beef (80/20)\nAmerican or cheddar cheese\nHamburger buns\nLettuce, tomato, onion\nPickles\nKetchup and mustard", notes:"Form patties, season with salt and pepper. Grill or pan-fry 4 min per side. Add cheese last minute. Toast buns, build burgers with desired toppings.", source:"AI Generated" },
  { id:"s11", name:"Caesar salad",            type:"American",       protein:"None/Vegetarian", prepTime:"15 min", servings:4, ingredients:"Romaine lettuce\nParmesan cheese\nCroutons\nCaesar dressing (store-bought or homemade)\nLemon\nBlack pepper", notes:"Chop romaine and toss with dressing. Add croutons and parmesan. Squeeze lemon over top. Add grilled chicken or shrimp to make it a meal.", source:"AI Generated" },
  { id:"s12", name:"Grilled chicken pita",    type:"Mediterranean",  protein:"Chicken",         prepTime:"30 min", servings:4, ingredients:"Chicken breast\nPita bread\nTzatziki\nTomato\nCucumber\nRed onion\nLettuce\nOlive oil\nOregano, garlic, lemon", notes:"Marinate chicken in olive oil, lemon, oregano, garlic. Grill until cooked through. Slice and stuff into pita with veggies and a generous spoon of tzatziki.", source:"AI Generated" },
  { id:"s13", name:"BLT w guac",              type:"American",       protein:"Pork",            prepTime:"20 min", servings:4, ingredients:"Bacon\nLettuce\nTomato\nAvocados\nLime\nGarlic\nSourdough or sandwich bread\nMayo\nSalt and pepper", notes:"Cook bacon crispy. Mash avocado with lime, garlic, and salt. Toast bread, spread guac and mayo, layer with lettuce, tomato, and bacon.", source:"AI Generated" },
  { id:"s14", name:"Falafel bowls",           type:"Mediterranean",  protein:"Beans/Legumes",   prepTime:"35 min", servings:4, ingredients:"Canned chickpeas\nGarlic\nCumin, coriander, parsley\nFlour\nCooked rice or greens\nTomato, cucumber, red onion\nTahini dressing\nOlive oil", notes:"Blend chickpeas with spices and herbs. Form into balls and pan-fry in oil. Serve over rice or greens with veggies and a drizzle of tahini.", source:"AI Generated" },
  { id:"s15", name:"Tacos y burritos",        type:"Mexican",        protein:"Chicken",         prepTime:"30 min", servings:4, ingredients:"Chicken breast or thighs\nTaco seasoning\nFlour and corn tortillas\nShredded cheese\nSour cream\nSalsa\nLettuce, tomato\nRice and beans (for burritos)", notes:"Season and cook chicken, shred or slice. Warm tortillas. For tacos, load with chicken and toppings. For burritos, add rice and beans and wrap tight.", source:"AI Generated" },
  { id:"s16", name:"Ramen",                   type:"Asian",          protein:"Chicken",         prepTime:"35 min", servings:4, ingredients:"Ramen noodles\nChicken or vegetable broth\nSoy sauce\nMiso paste\nSoft-boiled eggs\nGreen onions\nNori\nCorn\nChicken breast or tofu\nSesame oil", notes:"Simmer broth with soy sauce and miso. Cook noodles separately. Slice chicken or prep tofu. Assemble bowls and top with egg, corn, nori, and green onions.", source:"AI Generated" },
  { id:"s17", name:"Enchiladas",              type:"Mexican",        protein:"Chicken",         prepTime:"45 min", servings:6, ingredients:"Corn tortillas\nShredded chicken\nEnchilada sauce (store-bought)\nShredded Mexican cheese\nSour cream\nOnion\nCumin, garlic", notes:"Sauté onion and garlic, mix with chicken and cumin. Fill tortillas, roll and place seam-down in baking dish. Cover with sauce and cheese. Bake at 375F for 20 min.", source:"AI Generated" },
  { id:"s18", name:"Pierogi and sauerkraut",  type:"American",       protein:"None/Vegetarian", prepTime:"25 min", servings:4, ingredients:"Frozen potato and cheese pierogies\nSauerkraut\nOnion\nButter\nSour cream\nBlack pepper", notes:"Boil pierogies per package. Caramelize onion in butter, add sauerkraut and warm through. Pan-fry boiled pierogies in butter until golden. Serve with sour cream.", source:"AI Generated" },
  { id:"s19", name:"Chicken paprikash",       type:"American",       protein:"Chicken",         prepTime:"45 min", servings:4, ingredients:"Chicken thighs\nOnion\nSweet paprika\nChicken broth\nSour cream\nFlour\nEgg noodles or dumplings\nButter\nSalt and pepper", notes:"Brown chicken and onion in butter. Stir in paprika, add broth and simmer 25 min. Mix sour cream with flour, stir into sauce. Serve over egg noodles.", source:"AI Generated" },
  { id:"s20", name:"Aloo gobi",               type:"Indian",         protein:"None/Vegetarian", prepTime:"35 min", servings:4, ingredients:"Potatoes\nCauliflower\nOnion\nTomatoes\nGarlic and ginger\nCumin, turmeric, coriander, garam masala\nOil\nCilantro\nNaan or rice", notes:"Sauté onion, garlic, ginger and spices. Add tomatoes and cook down. Add potatoes and cauliflower, cover and cook until tender. Garnish with cilantro.", source:"AI Generated" },
  { id:"s21", name:"Swedish meatballs",       type:"American",       protein:"Beef",            prepTime:"40 min", servings:4, ingredients:"Ground beef and pork\nBreadcrumbs\nEgg\nOnion\nNutmeg, allspice\nButter\nFlour\nBeef broth\nSour cream\nEgg noodles", notes:"Mix and roll meatballs, brown in butter. Make gravy with drippings, flour, and broth. Add sour cream, return meatballs to sauce. Serve over egg noodles.", source:"AI Generated" },
  { id:"s22", name:"Broccoli cheddar soup",   type:"Soup/Salad",     protein:"None/Vegetarian", prepTime:"30 min", servings:4, ingredients:"Broccoli\nCarrots\nOnion\nGarlic\nCheddar cheese\nHeavy cream or milk\nChicken or vegetable broth\nButter\nFlour", notes:"Sauté onion and garlic in butter. Add flour, then broth and cream. Add broccoli and carrots, simmer until tender. Blend partially, stir in cheddar until melted.", source:"AI Generated" },
  { id:"s23", name:"Spaghetti w meatballs",   type:"Italian",        protein:"Beef",            prepTime:"45 min", servings:6, ingredients:"Spaghetti\nGround beef\nBreadcrumbs\nEgg\nGarlic\nMarinara sauce (jar is fine)\nParmesan\nFresh or dried basil\nOlive oil", notes:"Mix and bake meatballs at 400F for 18 min. Heat marinara, add meatballs and simmer. Cook spaghetti al dente. Serve with sauce, meatballs, and parmesan.", source:"AI Generated" },
  { id:"s24", name:"Chicken parmesan",        type:"Italian",        protein:"Chicken",         prepTime:"40 min", servings:4, ingredients:"Chicken breasts\nBreadcrumbs\nParmesan\nEgg\nMarinara sauce\nMozzarella cheese\nOlive oil\nItalian seasoning\nPasta or salad for serving", notes:"Pound chicken thin. Dip in egg then breadcrumb-parmesan mix. Pan-fry until golden. Top with marinara and mozzarella, broil 2-3 min. Serve over pasta.", source:"AI Generated" },
  { id:"s25", name:"English breakfast",       type:"Breakfast",      protein:"Eggs",            prepTime:"30 min", servings:2, ingredients:"Eggs\nBacon or sausage links\nBaked beans\nGrilled tomatoes\nMushrooms\nToast\nButter\nSalt and pepper", notes:"Cook bacon and sausage in a skillet. Grill tomatoes and mushrooms alongside. Fry or poach eggs. Heat beans in a small pot. Plate everything together.", source:"AI Generated" },
  { id:"s26", name:"Pancakes",                type:"Breakfast",      protein:"Eggs",            prepTime:"20 min", servings:4, ingredients:"Flour\nBaking powder\nSugar\nSalt\nMilk\nEggs\nButter\nVanilla extract\nMaple syrup and toppings", notes:"Mix dry ingredients, then wet. Combine gently — lumps are fine. Cook on a buttered griddle over medium heat, flip when bubbles form. Serve with syrup and fruit.", source:"AI Generated" },
  { id:"s27", name:"Quesadillas",             type:"Mexican",        protein:"None/Vegetarian", prepTime:"15 min", servings:4, ingredients:"Flour tortillas\nShredded cheese\nOnion and bell pepper\nBlack beans\nSour cream\nSalsa\nGuacamole\nOil", notes:"Sauté veggies and beans. Layer cheese and filling on half a tortilla, fold. Cook in a lightly oiled pan 2-3 min per side until golden and melted. Serve with dips.", source:"AI Generated" },
  { id:"s28", name:"Soul food platter",       type:"American",       protein:"Chicken",         prepTime:"60 min", servings:6, ingredients:"Fried chicken pieces\nMac and cheese\nCollard greens\nCornbread\nBlack-eyed peas\nHot sauce\nButter", notes:"Season and fry chicken. Bake mac and cheese. Slow-cook collard greens with butter and seasoning. Make cornbread from mix. Plate together family style.", source:"AI Generated" },
  { id:"s29", name:"Chili",                   type:"American",       protein:"Beef",            prepTime:"45 min", servings:6, ingredients:"Ground beef or turkey\nKidney beans\nDiced tomatoes\nTomato paste\nOnion\nGarlic\nChili powder, cumin, oregano\nBeef broth\nSalt and pepper", notes:"Brown meat and onions. Add garlic and spices, cook 1 min. Add tomatoes, paste, beans, and broth. Simmer at least 30 min. Serve with cornbread, cheese, or sour cream.", source:"AI Generated" },
  { id:"s30", name:"Stuffed peppers",         type:"American",       protein:"Beef",            prepTime:"50 min", servings:4, ingredients:"Bell peppers\nGround beef or turkey\nCooked rice\nDiced tomatoes\nTomato sauce\nOnion\nGarlic\nItalian seasoning\nShredded cheese", notes:"Cut tops off peppers, remove seeds. Brown meat with onion, garlic, and seasoning. Mix with rice and tomatoes. Fill peppers, top with sauce and cheese. Bake 375F 35 min.", source:"AI Generated" },
  { id:"s31", name:"Stuffed cabbage",         type:"American",       protein:"Beef",            prepTime:"75 min", servings:6, ingredients:"Cabbage leaves\nGround beef\nCooked rice\nDiced tomatoes\nTomato juice or V8\nOnion\nGarlic\nWorcestershire sauce\nSalt and pepper", notes:"Blanch cabbage leaves. Mix beef, rice, onion, garlic, and seasoning. Roll filling into leaves. Pack into pot, pour tomato juice over, simmer covered 60 min.", source:"AI Generated" },
  { id:"s32", name:"Omelette",                type:"Breakfast",      protein:"Eggs",            prepTime:"15 min", servings:2, ingredients:"Eggs\nMilk or cream\nButter\nShredded cheese\nBell pepper, onion, mushroom\nSpinach\nSalt and pepper", notes:"Whisk eggs with a splash of milk. Sauté veggies in butter, set aside. Pour eggs into pan, let set, add veggies and cheese to one half. Fold and serve.", source:"AI Generated" },
  { id:"s33", name:"Lasagna",                 type:"Italian",        protein:"Beef",            prepTime:"75 min", servings:8, ingredients:"Lasagna noodles\nGround beef\nRicotta cheese\nMozzarella\nParmesan\nMarinara sauce\nEgg\nGarlic\nItalian seasoning", notes:"Brown beef and mix into marinara. Mix ricotta with egg and parmesan. Layer: sauce, noodles, ricotta, meat sauce, mozzarella. Repeat 3x. Bake covered 45 min at 375F, uncover 15 min.", source:"AI Generated" },
  { id:"s34", name:"Fruit smoothie w granola", type:"Breakfast",     protein:"None/Vegetarian", prepTime:"10 min", servings:2, ingredients:"Frozen berries or banana\nGreek yogurt\nMilk or oat milk\nHoney\nGranola\nFresh fruit for topping\nSpinach (optional)", notes:"Blend fruit, yogurt, milk, and honey until smooth. Pour into bowls or glasses. Top with granola and fresh fruit. Add spinach for extra nutrition without changing the taste much.", source:"AI Generated" },
  { id:"s35", name:"Chicken wings",           type:"American",       protein:"Chicken",         prepTime:"50 min", servings:4, ingredients:"Chicken wings\nBaking powder\nSalt\nButter\nHot sauce\nGarlic powder\nRanch or blue cheese dressing\nCarrots and celery", notes:"Toss wings in baking powder and salt. Bake on a rack at 425F for 45 min, flipping halfway. Toss in melted butter and hot sauce. Serve with ranch and veggies.", source:"AI Generated" },
  { id:"s36", name:"Sushi",                   type:"Asian",          protein:"Fish/Seafood",    prepTime:"60 min", servings:4, ingredients:"Sushi rice\nRice vinegar\nNori sheets\nCucumber, avocado, carrot\nImitation crab or smoked salmon\nSoy sauce\nPickled ginger\nWasabi", notes:"Season cooked rice with vinegar mixture. Lay nori on a mat, spread rice, add fillings, and roll tightly. Slice with a wet knife. Serve with soy sauce, ginger, and wasabi.", source:"AI Generated" },
  { id:"s37", name:"Pasties",                 type:"American",       protein:"Beef",            prepTime:"75 min", servings:6, ingredients:"Pie crust dough\nGround beef or diced beef\nPotatoes\nRutabaga or turnip\nOnion\nSalt and pepper\nButter", notes:"Dice veggies and meat small. Season well. Roll dough into circles, fill one half with meat and veg mixture plus a pat of butter. Fold, crimp edges. Bake 400F 55 min.", source:"AI Generated" },
  { id:"s38", name:"Pot pie",                 type:"American",       protein:"Chicken",         prepTime:"60 min", servings:6, ingredients:"Chicken breast\nFrozen peas and carrots\nPotatoes\nOnion\nChicken broth\nMilk\nFlour\nButter\nPie crust (store-bought)\nThyme, salt, pepper", notes:"Make a roux with butter and flour, add broth and milk to make a thick gravy. Add cooked chicken and veggies. Pour into pie dish, top with crust. Bake 400F 35 min.", source:"AI Generated" },
  { id:"s39", name:"Minute chicken",          type:"American",       protein:"Chicken",         prepTime:"15 min", servings:4, ingredients:"Thin-sliced chicken breast\nOlive oil\nGarlic\nLemon\nItalian seasoning\nSalt and pepper\nOptional: capers or cherry tomatoes", notes:"Pound chicken thin if needed. Season both sides. Cook in hot olive oil 2-3 min per side. Deglaze with lemon juice and garlic. Done fast — great over salad or with rice.", source:"AI Generated" },
  { id:"s40", name:"Turkey Reuben",           type:"American",       protein:"Turkey",          prepTime:"15 min", servings:2, ingredients:"Rye bread\nDeli turkey\nSwiss cheese\nSauerkraut\nThousand island or Russian dressing\nButter", notes:"Butter outside of bread. Layer turkey, Swiss, and drained sauerkraut inside. Spread dressing on the inside of the other slice. Griddle over medium heat until golden and cheese melts.", source:"AI Generated" },
  { id:"s41", name:"Pizza",                   type:"Italian",        protein:"None/Vegetarian", prepTime:"30 min", servings:4, ingredients:"Pizza dough (store-bought)\nPizza sauce\nMozzarella cheese\nToppings: bell pepper, mushroom, olives, onion\nOlive oil\nItalian seasoning", notes:"Roll out dough on a floured surface. Spread sauce, add cheese and toppings. Bake at 475F on a preheated sheet or stone for 12-15 min until crust is golden.", source:"AI Generated" },
  { id:"s42", name:"General Tso tofu/chicken", type:"Asian",         protein:"Tofu",            prepTime:"35 min", servings:4, ingredients:"Firm tofu or chicken thighs\nCornstarch\nSoy sauce\nHoisin sauce\nRice vinegar\nSesame oil\nGarlic, ginger\nDried chili flakes\nGreen onions\nSteamed rice", notes:"Cube and press tofu or cut chicken. Toss in cornstarch, pan-fry until crispy. Make sauce with soy, hoisin, vinegar, garlic, ginger. Toss with protein and serve over rice.", source:"AI Generated" },
  { id:"s43", name:"Lo mein",                 type:"Asian",          protein:"None/Vegetarian", prepTime:"25 min", servings:4, ingredients:"Lo mein or spaghetti noodles\nCabbage, carrots, bell pepper\nGarlic, ginger\nSoy sauce\nOyster sauce\nSesame oil\nGreen onions\nVegetable oil\nOptional: chicken, shrimp, or tofu", notes:"Cook noodles. Stir-fry veggies in oil with garlic and ginger. Add noodles and sauce, toss over high heat. Finish with sesame oil and green onions.", source:"AI Generated" },
  { id:"s44", name:"Tamale pie",              type:"Mexican",        protein:"Beef",            prepTime:"50 min", servings:6, ingredients:"Ground beef\nCanned corn\nBlack beans\nDiced tomatoes\nTaco seasoning\nCornbread mix\nShredded cheddar\nOnion\nGarlic\nSour cream for serving", notes:"Brown beef with onion and taco seasoning. Add beans, corn, tomatoes and simmer. Pour into baking dish, top with cornbread batter and cheese. Bake 400F 25 min.", source:"AI Generated" },
];

const SEED_DATA = {
  meals: SEED_MEALS.map(m => ({ ...m, rating: 0, ratingNote: "", needsReview: true })),
  weekPlan: {},
  profile: defaultProfile
};

const C = {
  red: "#C8102E", redDark: "#9B0D23", redLight: "#FDECEA",
  yellow: "#F5C400", yellowLight: "#FFFBEA",
  cream: "#FFF8F0", white: "#FFFFFF",
  ink: "#1A1208", inkMid: "#5C4A2A", inkLight: "#8C7A5A",
  border: "#D4C4A8",
  reviewBg: "#FFFBEA", reviewBorder: "#F5C400", reviewText: "#633806",
  approvedBg: "#EAF3DE", approvedBorder: "#639922", approvedText: "#27500A",
};

const PROTEIN_COLORS = {
  "None/Vegetarian":"#085041","Chicken":"#854F0B","Fish/Seafood":"#0C447C",
  "Beef":"#9B0D23","Pork":"#9B0D23","Turkey":"#633806","Eggs":"#854F0B",
  "Beans/Legumes":"#27500A","Tofu":"#085041","Other":"#444441"
};
const TYPE_BG = {
  "American":"#FDECEA","Italian":"#FFF0E8","Mexican":"#FFFBEA","Asian":"#F0EEFE",
  "Mediterranean":"#E1F5EE","Indian":"#FFFBEA","Greek":"#E1F5EE","Breakfast":"#FFFBEA",
  "Soup/Salad":"#EAF3DE","Other":"#F1EFE8"
};

const font = "'Inter', 'Helvetica Neue', Arial, sans-serif";

const s = {
  header: { background: C.red, padding: "12px 20px 10px", borderBottom: `3px solid ${C.yellow}` },
  headerTitle: { fontFamily: font, fontSize: 22, fontWeight: 700, color: C.white, margin: 0, letterSpacing: 0.5, textTransform: "uppercase" },
  nav: { display: "flex", background: C.ink, borderBottom: `2px solid ${C.yellow}`, flexWrap: "wrap" },
  navBtn: (a) => ({ padding: "9px 15px", border: "none", background: a ? C.yellow : "transparent", color: a ? C.ink : "#D4C4A8", fontWeight: 700, cursor: "pointer", fontSize: 11, letterSpacing: 1, textTransform: "uppercase", borderRight: `1px solid #333`, fontFamily: font }),
  body: { background: C.cream, padding: "20px 20px 32px", minHeight: 500 },
  sectionTitle: { fontFamily: font, fontSize: 18, fontWeight: 700, color: C.red, margin: "0 0 16px", textTransform: "uppercase", letterSpacing: 0.5, borderBottom: `2px dashed ${C.yellow}`, paddingBottom: 6 },
  card: { background: C.white, border: `1px solid ${C.border}`, borderRadius: 4, padding: "12px 14px", borderTop: `3px solid ${C.red}` },
  btn: { background: C.red, color: C.white, border: "none", borderRadius: 3, padding: "7px 14px", cursor: "pointer", fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", fontFamily: font },
  btnOutline: { background: "transparent", color: C.red, border: `1.5px solid ${C.red}`, borderRadius: 3, padding: "6px 12px", cursor: "pointer", fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", fontFamily: font },
  btnYellow: { background: C.yellow, color: C.ink, border: "none", borderRadius: 3, padding: "7px 14px", cursor: "pointer", fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", fontFamily: font },
  btnGreen: { background: "#639922", color: C.white, border: "none", borderRadius: 3, padding: "7px 14px", cursor: "pointer", fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", fontFamily: font },
  input: { border: `1.5px solid ${C.border}`, borderRadius: 3, padding: "7px 10px", fontSize: 13, background: C.white, color: C.ink, width: "100%", boxSizing: "border-box", fontFamily: font },
  label: { fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: C.inkMid, display: "block", marginBottom: 4, fontFamily: font },
  badge: (bg, color) => ({ fontSize: 10, padding: "2px 7px", borderRadius: 2, background: bg, color, fontWeight: 700, whiteSpace: "nowrap", textTransform: "uppercase", letterSpacing: 0.4, fontFamily: font }),
  divider: { border: "none", borderTop: `2px dashed ${C.yellow}`, margin: "16px 0" },
  reviewTag: { display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, padding: "3px 8px", borderRadius: 2, background: C.reviewBg, color: C.reviewText, border: `1px solid ${C.reviewBorder}`, fontFamily: font },
  approvedTag: { display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, padding: "3px 8px", borderRadius: 2, background: C.approvedBg, color: C.approvedText, border: `1px solid ${C.approvedBorder}`, fontFamily: font },
};

function StarRating({ value, onChange, size = 18 }) {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {[1,2,3,4,5].map(n => (
        <span key={n} onClick={() => onChange && onChange(n === value ? 0 : n)}
          onMouseEnter={() => onChange && setHover(n)} onMouseLeave={() => onChange && setHover(0)}
          style={{ fontSize: size, cursor: onChange ? "pointer" : "default", color: n <= (hover || value) ? C.yellow : C.border, lineHeight: 1 }}>★</span>
      ))}
    </div>
  );
}

function ReviewTag({ needsReview, onToggle }) {
  return needsReview
    ? <span style={s.reviewTag} onClick={onToggle} title="Click to mark as reviewed">⚑ Needs review</span>
    : <span style={s.approvedTag} onClick={onToggle} title="Click to flag for review">✓ Reviewed</span>;
}

export default function App() {
  const [data, setData] = useState(null);
  const [view, setView] = useState("planner");
  const [mealForm, setMealForm] = useState(null);
  const [filterType, setFilterType] = useState("all");
  const [filterProtein, setFilterProtein] = useState("all");
  const [filterRating, setFilterRating] = useState(0);
  const [filterReview, setFilterReview] = useState("all");
  const [pickerSlot, setPickerSlot] = useState(null);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [aiError, setAiError] = useState("");
  const [profileForm, setProfileForm] = useState(null);
  const [groceryChecked, setGroceryChecked] = useState({});
  const [ratingModal, setRatingModal] = useState(null);
  const [searchQ, setSearchQ] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const r = await window.storage.get(STORAGE_KEY);
        if (r?.value) setData({ ...SEED_DATA, ...JSON.parse(r.value) });
        else setData(SEED_DATA);
      } catch { setData(SEED_DATA); }
    }
    load();
  }, []);

  const save = useCallback(async (d) => {
    setData(d);
    try { await window.storage.set(STORAGE_KEY, JSON.stringify(d)); } catch {}
  }, []);

  if (!data) return <div style={{ padding: 32, color: C.inkLight, fontFamily: font, textAlign: "center" }}>Loading...</div>;

  const filteredMeals = data.meals.filter(m => {
    if (filterType !== "all" && m.type !== filterType) return false;
    if (filterProtein !== "all" && m.protein !== filterProtein) return false;
    if (filterRating > 0 && (m.rating || 0) < filterRating) return false;
    if (filterReview === "review" && !m.needsReview) return false;
    if (filterReview === "approved" && m.needsReview) return false;
    if (searchQ && !m.name.toLowerCase().includes(searchQ.toLowerCase())) return false;
    return true;
  });

  const needsReviewCount = data.meals.filter(m => m.needsReview).length;

  function toggleReview(id) {
    save({ ...data, meals: data.meals.map(m => m.id === id ? { ...m, needsReview: !m.needsReview } : m) });
  }

  function openMealForm(meal = null) {
    setMealForm(meal ? { ...meal } : {
      id: Date.now().toString(), name: "", type: "Other", protein: "None/Vegetarian",
      ingredients: "", servings: 4, prepTime: "", notes: "", rating: 0, ratingNote: "", source: "", needsReview: true
    });
  }

  function saveMeal(m) {
    const meals = data.meals.find(x => x.id === m.id)
      ? data.meals.map(x => x.id === m.id ? m : x)
      : [...data.meals, m];
    save({ ...data, meals });
    setMealForm(null);
  }

  function deleteMeal(id) {
    const meals = data.meals.filter(m => m.id !== id);
    const weekPlan = { ...data.weekPlan };
    Object.keys(weekPlan).forEach(k => { if (weekPlan[k] === id) delete weekPlan[k]; });
    save({ ...data, meals, weekPlan });
  }

  function assignMeal(day, time, mealId) {
    const key = `${day}-${time}`;
    const weekPlan = { ...data.weekPlan };
    if (mealId) weekPlan[key] = mealId; else delete weekPlan[key];
    save({ ...data, weekPlan });
    setPickerSlot(null); setSearchQ("");
  }

  function buildGroceryList() {
    const items = {};
    Object.values(data.weekPlan).forEach(mealId => {
      const meal = data.meals.find(m => m.id === mealId);
      if (!meal?.ingredients) return;
      meal.ingredients.split("\n").forEach(line => {
        const t = line.trim(); if (!t) return;
        if (!items[t]) items[t] = { count: 0, meals: [] };
        items[t].count++;
        if (!items[t].meals.includes(meal.name)) items[t].meals.push(meal.name);
      });
    });
    return items;
  }

  async function generateRecipe() {
    if (!aiPrompt.trim()) return;
    // AI recipe generation removed — no external API integration in this project.
    setAiResult(null);
    setAiLoading(false);
    setAiError("Recipe generation is no longer available.");
  }

  const groceryItems = buildGroceryList();
  const plannedCount = Object.keys(data.weekPlan).length;
  const selectStyle = { ...s.input, appearance: "none", backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%235C4A2A' fill='none' stroke-width='1.5'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center", paddingRight: 28 };

  const navItems = [
    { id: "planner", label: "Weekly Plan" },
    { id: "library", label: `Library (${data.meals.length})` },
    { id: "grocery", label: `Grocery${plannedCount ? ` (${plannedCount})` : ""}` },
    { id: "discover", label: "Find Recipes" },
    { id: "profile", label: "Profile" },
  ];

  return (
    <div style={{ fontFamily: font, color: C.ink }}>
      <h2 className="sr-only">Family Meal Planner</h2>

      <div style={s.header}>
        <div style={s.headerTitle}>Family Meal Planner</div>
      </div>

      <div style={s.nav}>
        {navItems.map(n => <button key={n.id} onClick={() => setView(n.id)} style={s.navBtn(view === n.id)}>{n.label}</button>)}
      </div>

      <div style={s.body}>

        {/* ── WEEKLY PLANNER ── */}
        {view === "planner" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={s.sectionTitle}>This week's menu</div>
              <button onClick={() => save({ ...data, weekPlan: {} })} style={{ ...s.btnOutline, fontSize: 10 }}>Clear week</button>
            </div>
            <div style={{ overflowX: "auto" }}>
              <div style={{ display: "grid", gridTemplateColumns: "60px repeat(7,1fr)", gap: 4, minWidth: 540 }}>
                <div />
                {DAYS.map(d => <div key={d} style={{ fontSize: 10, fontWeight: 700, textAlign: "center", color: C.red, paddingBottom: 4, letterSpacing: 1, textTransform: "uppercase" }}>{d.slice(0,3)}</div>)}
                {MEAL_TIMES.map(time => (
                  <>
                    <div key={time} style={{ fontSize: 9, color: C.inkLight, display: "flex", alignItems: "center", fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" }}>{time.slice(0,5)}</div>
                    {DAYS.map(day => {
                      const key = `${day}-${time}`;
                      const meal = data.meals.find(m => m.id === data.weekPlan[key]);
                      return (
                        <div key={key} onClick={() => setPickerSlot({ day, time })} style={{ minHeight: 54, border: `1px solid ${C.border}`, borderRadius: 3, padding: "4px 6px", background: meal ? "#FFF8F0" : C.white, cursor: "pointer", borderTop: meal ? `2px solid ${C.red}` : `1px solid ${C.border}` }}>
                          {meal ? (
                            <div>
                              <div style={{ fontSize: 10, fontWeight: 700, color: C.ink, lineHeight: 1.3 }}>{meal.name}</div>
                              {meal.needsReview && <div style={{ fontSize: 9, color: C.reviewText, marginTop: 2, fontWeight: 700 }}>⚑</div>}
                              {meal.rating > 0 && <div style={{ fontSize: 10, color: C.yellow }}>{"★".repeat(meal.rating)}</div>}
                            </div>
                          ) : (
                            <div style={{ fontSize: 16, color: C.border, textAlign: "center", marginTop: 8, lineHeight: 1 }}>+</div>
                          )}
                        </div>
                      );
                    })}
                  </>
                ))}
              </div>
            </div>
            {needsReviewCount > 0 && (
              <div style={{ marginTop: 16, padding: "10px 14px", background: C.reviewBg, border: `1px solid ${C.reviewBorder}`, borderRadius: 3, fontSize: 12, color: C.reviewText, fontWeight: 600 }}>
                ⚑ {needsReviewCount} meal{needsReviewCount !== 1 ? "s" : ""} still need{needsReviewCount === 1 ? "s" : ""} review — head to the Library to approve them.
              </div>
            )}
          </div>
        )}

        {/* ── MEAL LIBRARY ── */}
        {view === "library" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={s.sectionTitle}>Meal library</div>
              <button style={s.btn} onClick={() => openMealForm()}>+ Add meal</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
              <div><label style={s.label}>Search</label><input style={s.input} value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search..." /></div>
              <div><label style={s.label}>Review status</label>
                <select style={selectStyle} value={filterReview} onChange={e => setFilterReview(e.target.value)}>
                  <option value="all">All meals</option>
                  <option value="review">Needs review</option>
                  <option value="approved">Reviewed</option>
                </select>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
              <div><label style={s.label}>Type</label><select style={selectStyle} value={filterType} onChange={e => setFilterType(e.target.value)}><option value="all">All types</option>{FOOD_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
              <div><label style={s.label}>Protein</label><select style={selectStyle} value={filterProtein} onChange={e => setFilterProtein(e.target.value)}><option value="all">All proteins</option>{PROTEINS.map(p => <option key={p}>{p}</option>)}</select></div>
              <div><label style={s.label}>Min rating</label><select style={selectStyle} value={filterRating} onChange={e => setFilterRating(Number(e.target.value))}><option value={0}>Any</option>{[5,4,3,2,1].map(r => <option key={r} value={r}>{r}+ ★</option>)}</select></div>
            </div>

            <div style={{ fontSize: 12, color: C.inkLight, marginBottom: 12 }}>Showing {filteredMeals.length} of {data.meals.length} meals</div>

            {filteredMeals.length === 0 && <div style={{ textAlign: "center", color: C.inkLight, padding: 40, fontSize: 14, fontStyle: "italic" }}>Nothing matches your filters.</div>}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 10 }}>
              {filteredMeals.map(m => (
                <div key={m.id} style={{ ...s.card, borderTop: `3px solid ${m.needsReview ? C.yellow : "#639922"}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: C.ink, flex: 1, marginRight: 6, lineHeight: 1.3 }}>{m.name}</div>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <ReviewTag needsReview={m.needsReview} onToggle={() => toggleReview(m.id)} />
                  </div>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
                    <span style={s.badge(TYPE_BG[m.type] || "#F1EFE8", C.inkMid)}>{m.type}</span>
                    <span style={s.badge(C.redLight, PROTEIN_COLORS[m.protein] || C.inkMid)}>{m.protein}</span>
                    {m.prepTime && <span style={s.badge("#F1EFE8", C.inkLight)}>{m.prepTime}</span>}
                  </div>
                  {m.rating > 0 && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                      <StarRating value={m.rating} size={12} />
                      {m.ratingNote && <span style={{ fontSize: 11, color: C.inkLight, fontStyle: "italic" }}>{m.ratingNote}</span>}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 5, marginTop: 8 }}>
                    <button style={{ ...s.btnOutline, fontSize: 10, padding: "4px 8px" }} onClick={() => openMealForm(m)}>Edit</button>
                    <button style={{ ...s.btnYellow, fontSize: 10, padding: "4px 8px" }} onClick={() => setRatingModal({ ...m })}>Rate</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── GROCERY LIST ── */}
        {view === "grocery" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={s.sectionTitle}>Grocery list</div>
              <button style={{ ...s.btnOutline, fontSize: 10 }} onClick={() => setGroceryChecked({})}>Uncheck all</button>
            </div>
            {Object.keys(groceryItems).length === 0 ? (
              <div style={{ textAlign: "center", color: C.inkLight, padding: 40, fontStyle: "italic" }}>Plan your week first — your list will appear here.</div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 8 }}>
                {Object.entries(groceryItems).sort((a,b) => a[0].localeCompare(b[0])).map(([item, info]) => (
                  <div key={item} onClick={() => setGroceryChecked(c => ({ ...c, [item]: !c[item] }))} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: C.white, border: `1px solid ${C.border}`, borderRadius: 3, cursor: "pointer", opacity: groceryChecked[item] ? 0.4 : 1, borderLeft: `3px solid ${groceryChecked[item] ? "#639922" : C.red}` }}>
                    <div style={{ width: 18, height: 18, borderRadius: 2, border: `1.5px solid ${C.border}`, background: groceryChecked[item] ? "#639922" : "transparent", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {groceryChecked[item] && <span style={{ fontSize: 11, color: C.white, fontWeight: 700 }}>✓</span>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, textDecoration: groceryChecked[item] ? "line-through" : "none", color: C.ink }}>{item}</div>
                      <div style={{ fontSize: 11, color: C.inkLight, fontStyle: "italic" }}>{info.meals.join(", ")}</div>
                    </div>
                    {info.count > 1 && <span style={s.badge(C.yellowLight, C.inkMid)}>×{info.count}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── DISCOVER ── */}
        {view === "discover" && (
          <div>
            <div style={s.sectionTitle}>Find a recipe</div>
            <p style={{ fontSize: 13, color: C.inkMid, marginTop: -8, marginBottom: 16 }}>Describe what you're craving and we'll generate something family-friendly. All AI recipes are flagged for review automatically.</p>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <input style={{ ...s.input, flex: 1 }} value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} onKeyDown={e => e.key === "Enter" && generateRecipe()} placeholder="e.g. easy pasta night, kid-friendly tacos, cozy soup..." />
              <button style={s.btn} onClick={generateRecipe} disabled={aiLoading}>{aiLoading ? "Cooking..." : "Generate"}</button>
            </div>
            {aiError && <div style={{ color: C.red, fontSize: 13, marginBottom: 12 }}>{aiError}</div>}
            {aiResult && (
              <div style={{ ...s.card, marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16, color: C.ink, marginBottom: 6 }}>{aiResult.name}</div>
                    <span style={s.reviewTag}>⚑ Needs review</span>
                  </div>
                  <button style={s.btnYellow} onClick={() => { save({ ...data, meals: [...data.meals, aiResult] }); setAiResult(null); setAiPrompt(""); }}>Save to library</button>
                </div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", margin: "10px 0" }}>
                  <span style={s.badge(TYPE_BG[aiResult.type] || "#F1EFE8", C.inkMid)}>{aiResult.type}</span>
                  <span style={s.badge(C.redLight, PROTEIN_COLORS[aiResult.protein] || C.inkMid)}>{aiResult.protein}</span>
                  {aiResult.prepTime && <span style={s.badge("#F1EFE8", C.inkLight)}>{aiResult.prepTime}</span>}
                  {aiResult.servings && <span style={s.badge("#F1EFE8", C.inkLight)}>Serves {aiResult.servings}</span>}
                </div>
                <hr style={s.divider} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                  <div><div style={{ ...s.label, marginBottom: 8 }}>Ingredients</div><div style={{ fontSize: 13, color: C.inkMid, lineHeight: 1.8, whiteSpace: "pre-line" }}>{aiResult.ingredients}</div></div>
                  <div><div style={{ ...s.label, marginBottom: 8 }}>Instructions</div><div style={{ fontSize: 13, color: C.inkMid, lineHeight: 1.8 }}>{aiResult.notes}</div></div>
                </div>
              </div>
            )}
            <hr style={s.divider} />
            <div style={{ ...s.label, marginBottom: 10 }}>Quick ideas</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {["Quick 30-min weeknight dinner","Kid-friendly meatless Monday","Easy chicken and rice","Simple pasta night","Healthy vegetarian tacos","Cozy soup or stew"].map(q => (
                <button key={q} style={{ ...s.btnOutline, fontSize: 10, padding: "5px 10px" }} onClick={() => setAiPrompt(q)}>{q}</button>
              ))}
            </div>
          </div>
        )}

        {/* ── PROFILE ── */}
        {view === "profile" && (
          <div style={{ maxWidth: 520 }}>
            <div style={s.sectionTitle}>Family profile</div>
            <p style={{ fontSize: 13, color: C.inkMid, marginTop: -8, marginBottom: 20 }}>Your preferences guide every AI recipe suggestion.</p>
            {profileForm ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {[["Meat preference","meatPreference","select",[["none","None / fully vegetarian"],["light","Light — occasional chicken or fish"],["moderate","Moderate — a few times a week"],["frequent","Frequent — most meals"]]],["Meal complexity","complexity","select",[["simple","Simple — 30 min, pantry staples"],["moderate","Moderate — some prep, familiar ingredients"],["complex","Complex — fine with more involved recipes"]]],["Ingredients to avoid","avoidIngredients","input",null],["Other notes","familyNotes","textarea",null]].map(([label,key,type,opts]) => (
                  <div key={key}>
                    <label style={s.label}>{label}</label>
                    {type === "select" && <select style={selectStyle} value={profileForm[key]} onChange={e => setProfileForm({ ...profileForm, [key]: e.target.value })}>{opts.map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select>}
                    {type === "input" && <input style={s.input} value={profileForm[key]} onChange={e => setProfileForm({ ...profileForm, [key]: e.target.value })} />}
                    {type === "textarea" && <textarea style={{ ...s.input, resize: "vertical" }} rows={3} value={profileForm[key]} onChange={e => setProfileForm({ ...profileForm, [key]: e.target.value })} />}
                  </div>
                ))}
                <div style={{ display: "flex", gap: 8 }}>
                  <button style={s.btn} onClick={() => { save({ ...data, profile: profileForm }); setProfileForm(null); }}>Save</button>
                  <button style={s.btnOutline} onClick={() => setProfileForm(null)}>Cancel</button>
                </div>
              </div>
            ) : (
              <div>
                {[["Meat preference",data.profile.meatPreference],["Complexity",data.profile.complexity],["Avoid",data.profile.avoidIngredients],["Notes",data.profile.familyNotes]].map(([lbl,val]) => (
                  <div key={lbl} style={{ display: "flex", gap: 12, paddingBottom: 10, marginBottom: 10, borderBottom: `1px dashed ${C.border}` }}>
                    <div style={{ fontSize: 11, fontWeight: 700, width: 100, flexShrink: 0, color: C.red, textTransform: "uppercase", letterSpacing: 0.5, paddingTop: 1 }}>{lbl}</div>
                    <div style={{ fontSize: 13, color: C.inkMid }}>{val || "—"}</div>
                  </div>
                ))}
                <button style={s.btn} onClick={() => setProfileForm({ ...data.profile })}>Edit profile</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── MEAL FORM MODAL ── */}
      {mealForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}>
          <div style={{ background: C.cream, borderRadius: 4, padding: 24, width: "100%", maxWidth: 500, maxHeight: "85vh", overflowY: "auto", border: `3px solid ${C.red}` }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: C.red, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 16, borderBottom: `2px dashed ${C.yellow}`, paddingBottom: 8 }}>
              {data.meals.find(m => m.id === mealForm.id) ? "Edit meal" : "Add new meal"}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div><label style={s.label}>Meal name</label><input style={s.input} value={mealForm.name} onChange={e => setMealForm({ ...mealForm, name: e.target.value })} /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div><label style={s.label}>Type</label><select style={selectStyle} value={mealForm.type} onChange={e => setMealForm({ ...mealForm, type: e.target.value })}>{FOOD_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
                <div><label style={s.label}>Protein</label><select style={selectStyle} value={mealForm.protein} onChange={e => setMealForm({ ...mealForm, protein: e.target.value })}>{PROTEINS.map(p => <option key={p}>{p}</option>)}</select></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div><label style={s.label}>Prep time</label><input style={s.input} value={mealForm.prepTime} onChange={e => setMealForm({ ...mealForm, prepTime: e.target.value })} /></div>
                <div><label style={s.label}>Servings</label><input type="number" style={s.input} value={mealForm.servings} onChange={e => setMealForm({ ...mealForm, servings: e.target.value })} min={1} /></div>
              </div>
              <div><label style={s.label}>Ingredients (one per line)</label><textarea style={{ ...s.input, resize: "vertical" }} rows={5} value={mealForm.ingredients} onChange={e => setMealForm({ ...mealForm, ingredients: e.target.value })} /></div>
              <div><label style={s.label}>Notes / instructions</label><textarea style={{ ...s.input, resize: "vertical" }} rows={3} value={mealForm.notes} onChange={e => setMealForm({ ...mealForm, notes: e.target.value })} /></div>
              <div><label style={s.label}>Source</label><input style={s.input} value={mealForm.source || ""} onChange={e => setMealForm({ ...mealForm, source: e.target.value })} /></div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <label style={{ ...s.label, margin: 0 }}>Review status:</label>
                <ReviewTag needsReview={mealForm.needsReview} onToggle={() => setMealForm({ ...mealForm, needsReview: !mealForm.needsReview })} />
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "space-between", marginTop: 4 }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <button style={s.btn} onClick={() => saveMeal(mealForm)} disabled={!mealForm.name.trim()}>Save</button>
                  <button style={s.btnOutline} onClick={() => setMealForm(null)}>Cancel</button>
                </div>
                {data.meals.find(m => m.id === mealForm.id) && <button onClick={() => { deleteMeal(mealForm.id); setMealForm(null); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: C.red, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>Delete</button>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── PICKER MODAL ── */}
      {pickerSlot && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}>
          <div style={{ background: C.cream, borderRadius: 4, padding: 24, width: "100%", maxWidth: 460, maxHeight: "80vh", overflowY: "auto", border: `3px solid ${C.red}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: C.red, textTransform: "uppercase", letterSpacing: 0.5 }}>{pickerSlot.day} — {pickerSlot.time}</div>
              <button onClick={() => { setPickerSlot(null); setSearchQ(""); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: C.inkLight, fontWeight: 700 }}>×</button>
            </div>
            {data.weekPlan[`${pickerSlot.day}-${pickerSlot.time}`] && <button onClick={() => assignMeal(pickerSlot.day, pickerSlot.time, null)} style={{ ...s.btnOutline, fontSize: 10, marginBottom: 12 }}>Remove meal</button>}
            <input style={{ ...s.input, marginBottom: 12 }} placeholder="Search meals..." value={searchQ} onChange={e => setSearchQ(e.target.value)} />
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {data.meals.filter(m => !searchQ || m.name.toLowerCase().includes(searchQ.toLowerCase())).map(m => {
                const sel = data.weekPlan[`${pickerSlot.day}-${pickerSlot.time}`] === m.id;
                return (
                  <div key={m.id} onClick={() => assignMeal(pickerSlot.day, pickerSlot.time, m.id)} style={{ padding: "10px 14px", border: `1px solid ${C.border}`, borderRadius: 3, cursor: "pointer", background: sel ? C.redLight : C.white, borderLeft: `3px solid ${sel ? C.red : C.border}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: C.ink }}>{m.name}</span>
                      {m.needsReview && <span style={{ fontSize: 9, color: C.reviewText, fontWeight: 700 }}>⚑</span>}
                    </div>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      <span style={s.badge(TYPE_BG[m.type] || "#F1EFE8", C.inkMid)}>{m.type}</span>
                      <span style={s.badge(C.redLight, PROTEIN_COLORS[m.protein] || C.inkMid)}>{m.protein}</span>
                      {m.rating > 0 && <span style={s.badge(C.yellowLight, C.inkMid)}>{"★".repeat(m.rating)}</span>}
                    </div>
                  </div>
                );
              })}
              {data.meals.length === 0 && <div style={{ fontSize: 13, color: C.inkLight }}>No meals yet.</div>}
            </div>
          </div>
        </div>
      )}

      {/* ── RATING MODAL ── */}
      {ratingModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}>
          <div style={{ background: C.cream, borderRadius: 4, padding: 24, width: "100%", maxWidth: 380, border: `3px solid ${C.yellow}` }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: C.red, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 14 }}>Rate: {ratingModal.name}</div>
            <div style={{ marginBottom: 14 }}><StarRating value={ratingModal.rating || 0} onChange={r => setRatingModal({ ...ratingModal, rating: r })} size={28} /></div>
            <label style={s.label}>Notes</label>
            <textarea style={{ ...s.input, resize: "vertical", marginBottom: 14 }} value={ratingModal.ratingNote || ""} onChange={e => setRatingModal({ ...ratingModal, ratingNote: e.target.value })} rows={3} placeholder="e.g. kids loved it, a bit spicy next time..." />
            <div style={{ display: "flex", gap: 8 }}>
              <button style={s.btn} onClick={() => { save({ ...data, meals: data.meals.map(m => m.id === ratingModal.id ? { ...m, rating: ratingModal.rating, ratingNote: ratingModal.ratingNote } : m) }); setRatingModal(null); }}>Save</button>
              <button style={s.btnOutline} onClick={() => setRatingModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}