import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../../firebase";

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
  { id:"s34", name:"Fruit smoothie w granola",type:"Breakfast",      protein:"None/Vegetarian", prepTime:"10 min", servings:2, ingredients:"Frozen berries or banana\nGreek yogurt\nMilk or oat milk\nHoney\nGranola\nFresh fruit for topping\nSpinach (optional)", notes:"Blend fruit, yogurt, milk, and honey until smooth. Pour into bowls or glasses. Top with granola and fresh fruit. Add spinach for extra nutrition without changing the taste much.", source:"AI Generated" },
  { id:"s35", name:"Chicken wings",           type:"American",       protein:"Chicken",         prepTime:"50 min", servings:4, ingredients:"Chicken wings\nBaking powder\nSalt\nButter\nHot sauce\nGarlic powder\nRanch or blue cheese dressing\nCarrots and celery", notes:"Toss wings in baking powder and salt. Bake on a rack at 425F for 45 min, flipping halfway. Toss in melted butter and hot sauce. Serve with ranch and veggies.", source:"AI Generated" },
  { id:"s36", name:"Sushi",                   type:"Asian",          protein:"Fish/Seafood",    prepTime:"60 min", servings:4, ingredients:"Sushi rice\nRice vinegar\nNori sheets\nCucumber, avocado, carrot\nImitation crab or smoked salmon\nSoy sauce\nPickled ginger\nWasabi", notes:"Season cooked rice with vinegar mixture. Lay nori on a mat, spread rice, add fillings, and roll tightly. Slice with a wet knife. Serve with soy sauce, ginger, and wasabi.", source:"AI Generated" },
  { id:"s37", name:"Pasties",                 type:"American",       protein:"Beef",            prepTime:"75 min", servings:6, ingredients:"Pie crust dough\nGround beef or diced beef\nPotatoes\nRutabaga or turnip\nOnion\nSalt and pepper\nButter", notes:"Dice veggies and meat small. Season well. Roll dough into circles, fill one half with meat and veg mixture plus a pat of butter. Fold, crimp edges. Bake 400F 55 min.", source:"AI Generated" },
  { id:"s38", name:"Pot pie",                 type:"American",       protein:"Chicken",         prepTime:"60 min", servings:6, ingredients:"Chicken breast\nFrozen peas and carrots\nPotatoes\nOnion\nChicken broth\nMilk\nFlour\nButter\nPie crust (store-bought)\nThyme, salt, pepper", notes:"Make a roux with butter and flour, add broth and milk to make a thick gravy. Add cooked chicken and veggies. Pour into pie dish, top with crust. Bake 400F 35 min.", source:"AI Generated" },
  { id:"s39", name:"Minute chicken",          type:"American",       protein:"Chicken",         prepTime:"15 min", servings:4, ingredients:"Thin-sliced chicken breast\nOlive oil\nGarlic\nLemon\nItalian seasoning\nSalt and pepper\nOptional: capers or cherry tomatoes", notes:"Pound chicken thin if needed. Season both sides. Cook in hot olive oil 2-3 min per side. Deglaze with lemon juice and garlic. Done fast — great over salad or with rice.", source:"AI Generated" },
  { id:"s40", name:"Turkey Reuben",           type:"American",       protein:"Turkey",          prepTime:"15 min", servings:2, ingredients:"Rye bread\nDeli turkey\nSwiss cheese\nSauerkraut\nThousand island or Russian dressing\nButter", notes:"Butter outside of bread. Layer turkey, Swiss, and drained sauerkraut inside. Spread dressing on the inside of the other slice. Griddle over medium heat until golden and cheese melts.", source:"AI Generated" },
  { id:"s41", name:"Pizza",                   type:"Italian",        protein:"None/Vegetarian", prepTime:"30 min", servings:4, ingredients:"Pizza dough (store-bought)\nPizza sauce\nMozzarella cheese\nToppings: bell pepper, mushroom, olives, onion\nOlive oil\nItalian seasoning", notes:"Roll out dough on a floured surface. Spread sauce, add cheese and toppings. Bake at 475F on a preheated sheet or stone for 12-15 min until crust is golden.", source:"AI Generated" },
  { id:"s42", name:"General Tso tofu/chicken",type:"Asian",          protein:"Tofu",            prepTime:"35 min", servings:4, ingredients:"Firm tofu or chicken thighs\nCornstarch\nSoy sauce\nHoisin sauce\nRice vinegar\nSesame oil\nGarlic, ginger\nDried chili flakes\nGreen onions\nSteamed rice", notes:"Cube and press tofu or cut chicken. Toss in cornstarch, pan-fry until crispy. Make sauce with soy, hoisin, vinegar, garlic, ginger. Toss with protein and serve over rice.", source:"AI Generated" },
  { id:"s43", name:"Lo mein",                 type:"Asian",          protein:"None/Vegetarian", prepTime:"25 min", servings:4, ingredients:"Lo mein or spaghetti noodles\nCabbage, carrots, bell pepper\nGarlic, ginger\nSoy sauce\nOyster sauce\nSesame oil\nGreen onions\nVegetable oil\nOptional: chicken, shrimp, or tofu", notes:"Cook noodles. Stir-fry veggies in oil with garlic and ginger. Add noodles and sauce, toss over high heat. Finish with sesame oil and green onions.", source:"AI Generated" },
  { id:"s44", name:"Tamale pie",              type:"Mexican",        protein:"Beef",            prepTime:"50 min", servings:6, ingredients:"Ground beef\nCanned corn\nBlack beans\nDiced tomatoes\nTaco seasoning\nCornbread mix\nShredded cheddar\nOnion\nGarlic\nSour cream for serving", notes:"Brown beef with onion and taco seasoning. Add beans, corn, tomatoes and simmer. Pour into baking dish, top with cornbread batter and cheese. Bake 400F 25 min.", source:"AI Generated" },
];

interface Meal {
  id: string; name: string; type: string; protein: string; prepTime: string;
  servings: number; ingredients: string; notes: string; source: string;
  rating: number; ratingNote: string; needsReview: boolean;
}
interface AppData {
  meals: Meal[];
  weekPlan: Record<string, string>;
  profile: { meatPreference: string; complexity: string; avoidIngredients: string; familyNotes: string; };
}

const SEED_DATA: AppData = {
  meals: SEED_MEALS.map(m => ({ ...m, rating: 0, ratingNote: "", needsReview: true })),
  weekPlan: {},
  profile: defaultProfile,
};

// ── MARIO THEME ────────────────────────────────────────────────────────────
const C = {
  red: "#E52521",       redDark: "#B01E1B",   redLight: "#FFF0EE",
  blue: "#049CD8",      blueDark: "#0376A8",  blueLight: "#EBF6FD",
  yellow: "#FBD000",    yellowDark: "#C9A700",yellowLight: "#FFFBE6",
  green: "#43B047",     greenDark: "#2E7D32", greenLight: "#EEF7EE",
  brown: "#8B4513",     darkBrown: "#3D2107",
  sky: "#5C94FC",       skyDark: "#2547A8",
  cream: "#FFFAED",     white: "#FFFFFF",
  ink: "#1A0A00",       inkMid: "#5C3A1A",    inkLight: "#9B6E3A",
  border: "#D4A853",    borderLight: "#F0D88A",
  coin: "#FBD000",
  reviewBg: "#FFFBE6",  reviewBorder: "#FBD000", reviewText: "#7A5200",
  approvedBg: "#EEF7EE",approvedBorder: "#43B047",approvedText: "#1B5E20",
};

const PROTEIN_COLORS: Record<string, string> = {
  "None/Vegetarian": "#1B5E20", "Chicken": "#E65100", "Fish/Seafood": "#0376A8",
  "Beef": "#B71C1C", "Pork": "#B71C1C", "Turkey": "#4E342E", "Eggs": "#E65100",
  "Beans/Legumes": "#2E7D32", "Tofu": "#2E7D32", "Other": "#424242",
};
const TYPE_BG: Record<string, string> = {
  "American": "#FFF0EE", "Italian": "#EEF7EE", "Mexican": "#FFF5E6",
  "Asian": "#EEF0FF", "Mediterranean": "#EBF6FD", "Indian": "#FFF3E6",
  "Greek": "#EBF6FD", "Breakfast": "#FFFBE6", "Soup/Salad": "#EEF7EE", "Other": "#F5F0E8",
};
const TYPE_ICON: Record<string, string> = {
  "American": "🦅", "Italian": "🍝", "Mexican": "🌮", "Asian": "🍜",
  "Mediterranean": "🫒", "Indian": "🫙", "Greek": "🏛️", "Breakfast": "🍳",
  "Soup/Salad": "🥗", "Other": "🍽️",
};

const titleFont = "'Press Start 2P', cursive";
const headFont  = "'Montserrat', sans-serif";
const bodyFont  = "'Montserrat', sans-serif";

// Shared style helpers
const pill = (bg: string, color: string): React.CSSProperties => ({
  fontSize: 10, padding: "3px 9px", borderRadius: 20, background: bg, color,
  fontWeight: 800, whiteSpace: "nowrap", textTransform: "uppercase",
  letterSpacing: 0.4, fontFamily: bodyFont, display: "inline-block",
});
const marioBtn = (bg: string, color: string, border?: string): React.CSSProperties => ({
  background: bg, color, border: border ? `2.5px solid ${border}` : "none",
  borderRadius: 10, padding: "8px 18px", cursor: "pointer", fontSize: 13,
  fontWeight: 800, fontFamily: headFont, letterSpacing: 0.5,
  boxShadow: `0 4px 0 ${bg === C.white ? C.border : C.darkBrown}`,
  transition: "all 0.1s", display: "inline-flex", alignItems: "center", gap: 6,
});
const inputStyle: React.CSSProperties = {
  border: `2px solid ${C.border}`, borderRadius: 8, padding: "8px 12px",
  fontSize: 13, background: C.white, color: C.ink, width: "100%",
  boxSizing: "border-box", fontFamily: bodyFont,
  boxShadow: "inset 0 2px 4px rgba(0,0,0,0.06)",
};
const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: "none",
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%235C3A1A' fill='none' stroke-width='1.5'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center", paddingRight: 32,
};
const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase",
  color: C.inkMid, display: "block", marginBottom: 5, fontFamily: bodyFont,
};
const sectionTitle = (icon: string, text: string) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
    <span style={{ fontSize: 24 }}>{icon}</span>
    <div style={{ fontFamily: headFont, fontSize: 22, color: C.red, letterSpacing: 0.5 }}>{text}</div>
    <div style={{ flex: 1, height: 3, background: `linear-gradient(90deg, ${C.yellow}, transparent)`, borderRadius: 2, marginLeft: 4 }} />
  </div>
);

// ── QUESTION BLOCK ─────────────────────────────────────────────────────────
function QBlock({ size = 36 }: { size?: number }) {
  return (
    <div style={{ width: size, height: size, background: C.yellow, border: `3px solid ${C.yellowDark}`, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.55, fontFamily: titleFont, color: C.brown, boxShadow: `inset 0 -3px 0 ${C.yellowDark}`, flexShrink: 0 }}>
      ?
    </div>
  );
}

// ── STAR RATING ────────────────────────────────────────────────────────────
function StarRating({ value, onChange, size = 18 }: { value: number; onChange?: (n: number) => void; size?: number }) {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {[1,2,3,4,5].map(n => (
        <span key={n} onClick={() => onChange && onChange(n === value ? 0 : n)}
          onMouseEnter={() => onChange && setHover(n)} onMouseLeave={() => onChange && setHover(0)}
          style={{ fontSize: size, cursor: onChange ? "pointer" : "default", color: n <= (hover || value) ? C.yellow : "#D4C4A8", lineHeight: 1, textShadow: n <= (hover || value) ? `0 1px 2px rgba(0,0,0,0.3)` : "none" }}>★</span>
      ))}
    </div>
  );
}

// ── REVIEW TAG ─────────────────────────────────────────────────────────────
function ReviewTag({ needsReview, onToggle }: { needsReview: boolean; onToggle?: () => void }) {
  return needsReview
    ? <span onClick={onToggle} title="Click to mark reviewed" style={{ ...pill(C.reviewBg, C.reviewText), border: `1.5px solid ${C.reviewBorder}`, cursor: "pointer" }}>❓ Review</span>
    : <span onClick={onToggle} title="Click to flag for review" style={{ ...pill(C.approvedBg, C.approvedText), border: `1.5px solid ${C.approvedBorder}`, cursor: "pointer" }}>⭐ Approved</span>;
}

// ── APP ────────────────────────────────────────────────────────────────────
export default function FoodPlanner() {
  const [data, setData] = useState<AppData>(SEED_DATA);
  const [view, setView] = useState("planner");
  const [mealForm, setMealForm] = useState<Meal | null>(null);
  const [filterType, setFilterType] = useState("all");
  const [filterProtein, setFilterProtein] = useState("all");
  const [filterRating, setFilterRating] = useState(0);
  const [filterReview, setFilterReview] = useState("all");
  const [pickerSlot, setPickerSlot] = useState<{ day: string; time: string } | null>(null);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<Meal | null>(null);
  const [aiError, setAiError] = useState("");
  const [profileForm, setProfileForm] = useState<AppData["profile"] | null>(null);
  const [groceryChecked, setGroceryChecked] = useState<Record<string, boolean>>({});
  const [ratingModal, setRatingModal] = useState<Meal | null>(null);
  const [searchQ, setSearchQ] = useState("");

  useEffect(() => {
    try {
      const ref = doc(db, "config", "foodPlanner");
      const unsub = onSnapshot(ref, snap => {
        if (snap.exists()) {
          const d = snap.data() as Partial<AppData>;
          setData({ ...SEED_DATA, ...d, meals: d.meals?.length ? d.meals : SEED_DATA.meals });
        } else {
          setDoc(ref, SEED_DATA).catch(() => {});
        }
      }, () => {});
      return unsub;
    } catch { /* Firebase not configured */ }
  }, []);

  const save = useCallback((d: AppData) => {
    setData(d);
    setDoc(doc(db, "config", "foodPlanner"), d).catch(err => console.error("Food save failed:", err));
  }, []);

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

  function toggleReview(id: string) {
    save({ ...data, meals: data.meals.map(m => m.id === id ? { ...m, needsReview: !m.needsReview } : m) });
  }
  function openMealForm(meal: Meal | null = null) {
    setMealForm(meal ? { ...meal } : {
      id: Date.now().toString(), name: "", type: "Other", protein: "None/Vegetarian",
      ingredients: "", servings: 4, prepTime: "", notes: "", rating: 0, ratingNote: "", source: "", needsReview: true
    });
  }
  function saveMeal(m: Meal) {
    const meals = data.meals.find(x => x.id === m.id) ? data.meals.map(x => x.id === m.id ? m : x) : [...data.meals, m];
    save({ ...data, meals });
    setMealForm(null);
  }
  function deleteMeal(id: string) {
    const meals = data.meals.filter(m => m.id !== id);
    const weekPlan = { ...data.weekPlan };
    Object.keys(weekPlan).forEach(k => { if (weekPlan[k] === id) delete weekPlan[k]; });
    save({ ...data, meals, weekPlan });
  }
  function assignMeal(day: string, time: string, mealId: string | null) {
    const key = `${day}-${time}`;
    const weekPlan = { ...data.weekPlan };
    if (mealId) weekPlan[key] = mealId; else delete weekPlan[key];
    save({ ...data, weekPlan });
    setPickerSlot(null); setSearchQ("");
  }
  function buildGroceryList() {
    const items: Record<string, { count: number; meals: string[] }> = {};
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
    // AI recipe generation has been removed from this build (no external API / key).
    setAiResult(null);
    setAiLoading(false);
    setAiError("Recipe generation is no longer available.");
  }

  const groceryItems = buildGroceryList();
  const plannedCount = Object.keys(data.weekPlan).length;

  const navItems = [
    { id: "planner",  label: "Weekly Plan", icon: "📅" },
    { id: "library",  label: `Recipes (${data.meals.length})`, icon: "📖" },
    { id: "grocery",  label: `Grocery${plannedCount ? ` (${plannedCount})` : ""}`, icon: "🛒" },
    { id: "discover", label: "Ask Toad", icon: "🍄" },
    { id: "profile",  label: "Profile", icon: "⚙️" },
  ];

  // ── RENDER ─────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: bodyFont, color: C.ink, minHeight: "100vh", background: C.cream }}>

      {/* ── HEADER ── */}
      <div style={{ background: `linear-gradient(160deg, ${C.skyDark} 0%, ${C.sky} 60%, #92C8FF 100%)`, padding: "0 20px", position: "relative", overflow: "hidden" }}>
        {/* Decorative clouds */}
        {[{l:5,t:8,s:1.2},{l:60,t:12,s:0.8},{l:80,t:5,s:1},{l:30,t:3,s:0.7}].map((c,i) => (
          <div key={i} style={{ position: "absolute", left: `${c.l}%`, top: `${c.t}px`, opacity: 0.18, fontSize: 48 * c.s, pointerEvents: "none", userSelect: "none" }}>☁️</div>
        ))}
        <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0 12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Link to="/" style={{ fontSize: 11, fontFamily: titleFont, color: "rgba(255,255,255,0.75)", textDecoration: "none", letterSpacing: 0.5 }}>← HOME</Link>
            <div style={{ width: 1, height: 24, background: "rgba(255,255,255,0.3)" }} />
            <div style={{ fontSize: 40 }}>🍄</div>
            <div>
              <div style={{ fontFamily: titleFont, fontSize: 13, color: C.white, letterSpacing: 1, lineHeight: 1.3, textShadow: `2px 2px 0 ${C.skyDark}` }}>
                TOAD'S KITCHEN
              </div>
              <div style={{ fontFamily: headFont, fontSize: 13, color: "rgba(255,255,255,0.85)", marginTop: 2 }}>
                Family Meal Planner
              </div>
            </div>
          </div>
          {/* Coin counter */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(0,0,0,0.25)", borderRadius: 20, padding: "6px 14px", backdropFilter: "blur(4px)" }}>
            <span style={{ fontSize: 18 }}>🪙</span>
            <span style={{ fontFamily: titleFont, fontSize: 11, color: C.yellow, letterSpacing: 0.5 }}>{data.meals.length}</span>
          </div>
        </div>
        {/* Red stripe at bottom */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 5, background: C.red }} />
      </div>

      {/* ── NAV ── */}
      <div style={{ background: C.darkBrown, display: "flex", flexWrap: "wrap", gap: 0, borderBottom: `4px solid ${C.brown}`, position: "sticky", top: 0, zIndex: 10 }}>
        {navItems.map(n => (
          <button key={n.id} onClick={() => setView(n.id)} style={{
            padding: "10px 16px", border: "none", cursor: "pointer", fontFamily: headFont,
            fontSize: 12, fontWeight: 700, letterSpacing: 0.5, display: "flex", alignItems: "center", gap: 5,
            background: view === n.id ? C.yellow : "transparent",
            color: view === n.id ? C.darkBrown : "#D4A853",
            borderBottom: view === n.id ? `3px solid ${C.yellowDark}` : "3px solid transparent",
            transition: "all 0.15s",
          }}>
            <span>{n.icon}</span> {n.label}
          </button>
        ))}
      </div>

      {/* ── BODY ── */}
      <div style={{ padding: "24px 20px 40px", maxWidth: 1100, margin: "0 auto" }}>

        {/* ── WEEKLY PLANNER ── */}
        {view === "planner" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              {sectionTitle("📅", "This Week's Menu")}
              <button onClick={() => save({ ...data, weekPlan: {} })} style={{ ...marioBtn(C.white, C.red, C.red), fontSize: 11, padding: "6px 14px" }}>
                🗑️ Clear Week
              </button>
            </div>

            {needsReviewCount > 0 && (
              <div style={{ marginBottom: 16, padding: "12px 16px", background: C.yellowLight, border: `2px solid ${C.yellow}`, borderRadius: 10, fontSize: 13, color: C.reviewText, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                <QBlock size={28} /> {needsReviewCount} recipe{needsReviewCount !== 1 ? "s" : ""} still need{needsReviewCount === 1 ? "s" : ""} review — head to Recipes to approve them.
              </div>
            )}

            <div style={{ overflowX: "auto", borderRadius: 12, border: `2px solid ${C.border}`, boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}>
              <div style={{ display: "grid", gridTemplateColumns: "56px repeat(7,1fr)", minWidth: 560, background: C.white, borderRadius: 10, overflow: "hidden" }}>
                {/* Corner */}
                <div style={{ background: C.darkBrown }} />
                {/* Day headers */}
                {DAYS.map(d => (
                  <div key={d} style={{ background: `linear-gradient(180deg, ${C.sky} 0%, ${C.blue} 100%)`, padding: "10px 4px", textAlign: "center", fontFamily: headFont, fontSize: 12, color: C.white, letterSpacing: 0.5, textShadow: "0 1px 2px rgba(0,0,0,0.3)", borderLeft: `1px solid ${C.blueDark}` }}>
                    {d.slice(0,3).toUpperCase()}
                  </div>
                ))}
                {/* Rows */}
                {MEAL_TIMES.map((time, ti) => (
                  <>
                    <div key={time} style={{ background: C.red, display: "flex", alignItems: "center", justifyContent: "center", padding: "4px 2px", borderTop: `1px solid ${C.redDark}` }}>
                      <span style={{ fontFamily: headFont, fontSize: 9, color: C.white, textTransform: "uppercase", letterSpacing: 0.5, writingMode: "vertical-rl", transform: "rotate(180deg)" }}>{time}</span>
                    </div>
                    {DAYS.map(day => {
                      const key = `${day}-${time}`;
                      const meal = data.meals.find(m => m.id === data.weekPlan[key]);
                      return (
                        <div key={key} onClick={() => setPickerSlot({ day, time })} style={{ minHeight: 62, borderLeft: `1px solid ${C.borderLight}`, borderTop: `1px solid ${C.borderLight}`, padding: "6px 8px", cursor: "pointer", background: meal ? "#FFFAED" : C.white, transition: "background 0.15s", position: "relative" }}
                          onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = meal ? "#FFF3CC" : "#F0F7FF"; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = meal ? "#FFFAED" : C.white; }}>
                          {meal ? (
                            <div>
                              <div style={{ fontSize: 9, marginBottom: 2 }}>{TYPE_ICON[meal.type] || "🍽️"}</div>
                              <div style={{ fontSize: 11, fontWeight: 800, color: C.ink, lineHeight: 1.3, fontFamily: headFont }}>{meal.name}</div>
                              {meal.needsReview && <div style={{ fontSize: 8, color: C.reviewText, fontWeight: 800, marginTop: 2 }}>❓ review</div>}
                              {meal.rating > 0 && <div style={{ fontSize: 9, color: C.yellow, marginTop: 1 }}>{"★".repeat(meal.rating)}</div>}
                              {/* red accent bar */}
                              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: TYPE_BG[meal.type] ? C.red : C.border, borderRadius: "2px 2px 0 0" }} />
                            </div>
                          ) : (
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", minHeight: 48 }}>
                              <div style={{ width: 24, height: 24, background: C.yellowLight, border: `2px dashed ${C.border}`, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: titleFont, fontSize: 10, color: C.border }}>?</div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── RECIPE LIBRARY ── */}
        {view === "library" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              {sectionTitle("📖", "Recipe Book")}
              <button style={marioBtn(C.red, C.white)} onClick={() => openMealForm()}>+ Add Recipe</button>
            </div>

            {/* Filters */}
            <div style={{ background: C.white, border: `2px solid ${C.border}`, borderRadius: 12, padding: "16px", marginBottom: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                <div><label style={labelStyle}>🔍 Search</label><input style={inputStyle} value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search recipes..." /></div>
                <div><label style={labelStyle}>🏷️ Review Status</label>
                  <select style={selectStyle} value={filterReview} onChange={e => setFilterReview(e.target.value)}>
                    <option value="all">All Recipes</option>
                    <option value="review">Needs Review</option>
                    <option value="approved">Approved</option>
                  </select>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <div><label style={labelStyle}>🍽️ Cuisine</label>
                  <select style={selectStyle} value={filterType} onChange={e => setFilterType(e.target.value)}>
                    <option value="all">All Types</option>{FOOD_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div><label style={labelStyle}>🥩 Protein</label>
                  <select style={selectStyle} value={filterProtein} onChange={e => setFilterProtein(e.target.value)}>
                    <option value="all">All Proteins</option>{PROTEINS.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div><label style={labelStyle}>⭐ Min Rating</label>
                  <select style={selectStyle} value={filterRating} onChange={e => setFilterRating(Number(e.target.value))}>
                    <option value={0}>Any</option>{[5,4,3,2,1].map(r => <option key={r} value={r}>{r}+ ★</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div style={{ fontSize: 12, color: C.inkLight, marginBottom: 14, fontWeight: 700 }}>
              🪙 Showing {filteredMeals.length} of {data.meals.length} recipes
            </div>

            {filteredMeals.length === 0 && (
              <div style={{ textAlign: "center", padding: 48 }}>
                <QBlock size={48} />
                <div style={{ marginTop: 12, color: C.inkLight, fontFamily: headFont, fontSize: 16 }}>Nothing matches your filters!</div>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(230px,1fr))", gap: 12 }}>
              {filteredMeals.map(m => (
                <div key={m.id} style={{ background: C.white, border: `2px solid ${C.border}`, borderRadius: 12, padding: "14px 16px", borderTop: `4px solid ${m.needsReview ? C.yellow : C.green}`, boxShadow: "0 2px 8px rgba(0,0,0,0.07)", transition: "transform 0.15s, box-shadow 0.15s", cursor: "default" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 6px 20px rgba(0,0,0,0.12)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ""; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.07)"; }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
                    <div style={{ fontWeight: 800, fontSize: 15, color: C.ink, lineHeight: 1.3, fontFamily: headFont, flex: 1, marginRight: 6 }}>{m.name}</div>
                    <span style={{ fontSize: 20 }}>{TYPE_ICON[m.type] || "🍽️"}</span>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <ReviewTag needsReview={m.needsReview} onToggle={() => toggleReview(m.id)} />
                  </div>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
                    <span style={pill(TYPE_BG[m.type] || "#F5F0E8", C.inkMid)}>{m.type}</span>
                    <span style={pill(C.redLight, PROTEIN_COLORS[m.protein] || C.inkMid)}>{m.protein}</span>
                    {m.prepTime && <span style={pill("#F5F0E8", C.inkLight)}>⏱ {m.prepTime}</span>}
                  </div>
                  {m.rating > 0 && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                      <StarRating value={m.rating} size={13} />
                      {m.ratingNote && <span style={{ fontSize: 11, color: C.inkLight, fontStyle: "italic" }}>{m.ratingNote}</span>}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                    <button style={{ ...marioBtn(C.white, C.inkMid, C.border), fontSize: 11, padding: "5px 12px", boxShadow: `0 3px 0 ${C.border}` }} onClick={() => openMealForm(m)}>✏️ Edit</button>
                    <button style={{ ...marioBtn(C.yellow, C.darkBrown), fontSize: 11, padding: "5px 12px", boxShadow: `0 3px 0 ${C.yellowDark}` }} onClick={() => setRatingModal({ ...m })}>⭐ Rate</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── GROCERY ── */}
        {view === "grocery" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              {sectionTitle("🛒", "Grocery List")}
              <button style={{ ...marioBtn(C.white, C.inkMid, C.border), fontSize: 11, padding: "6px 14px" }} onClick={() => setGroceryChecked({})}>Uncheck All</button>
            </div>
            {Object.keys(groceryItems).length === 0 ? (
              <div style={{ textAlign: "center", padding: 56 }}>
                <div style={{ fontSize: 56, marginBottom: 12 }}>🏪</div>
                <div style={{ fontFamily: headFont, fontSize: 18, color: C.inkLight }}>Plan your week first!</div>
                <div style={{ fontSize: 13, color: C.inkLight, marginTop: 6 }}>Your shopping list will appear here.</div>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(270px,1fr))", gap: 8 }}>
                {Object.entries(groceryItems).sort((a,b) => a[0].localeCompare(b[0])).map(([item, info]) => (
                  <div key={item} onClick={() => setGroceryChecked(c => ({ ...c, [item]: !c[item] }))} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: C.white, border: `2px solid ${groceryChecked[item] ? C.green : C.border}`, borderRadius: 10, cursor: "pointer", opacity: groceryChecked[item] ? 0.5 : 1, transition: "all 0.15s", borderLeft: `5px solid ${groceryChecked[item] ? C.green : C.red}` }}>
                    <div style={{ width: 22, height: 22, borderRadius: 6, border: `2.5px solid ${groceryChecked[item] ? C.green : C.border}`, background: groceryChecked[item] ? C.green : "transparent", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {groceryChecked[item] && <span style={{ fontSize: 13, color: C.white, fontWeight: 900 }}>✓</span>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 800, textDecoration: groceryChecked[item] ? "line-through" : "none", color: C.ink, fontFamily: headFont }}>{item}</div>
                      <div style={{ fontSize: 11, color: C.inkLight, marginTop: 1 }}>{info.meals.join(", ")}</div>
                    </div>
                    {info.count > 1 && <span style={pill(C.yellowLight, C.brown)}>×{info.count}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── ASK TOAD (Discover) ── */}
        {view === "discover" && (
          <div style={{ maxWidth: 680 }}>
            {sectionTitle("🍄", "Ask Toad")}
            <div style={{ background: C.white, border: `2px solid ${C.border}`, borderRadius: 12, padding: "20px", marginBottom: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 16 }}>
                <div style={{ fontSize: 48, flexShrink: 0 }}>🍄</div>
                <div>
                  <div style={{ fontFamily: headFont, fontSize: 17, color: C.darkBrown, marginBottom: 4 }}>Wahoo! What are we cooking?</div>
                  <div style={{ fontSize: 13, color: C.inkMid, lineHeight: 1.6 }}>Tell Toad what you're craving and he'll whip up a family-friendly recipe. All AI recipes are flagged for review automatically.</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input style={{ ...inputStyle, flex: 1, fontSize: 14 }} value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} onKeyDown={e => e.key === "Enter" && generateRecipe()} placeholder="e.g. easy pasta night, kid-friendly tacos, cozy soup..." />
                <button style={marioBtn(C.red, C.white)} onClick={generateRecipe} disabled={aiLoading}>
                  {aiLoading ? "🍳 Cooking..." : "🍄 Generate!"}
                </button>
              </div>
              {aiError && <div style={{ color: C.red, fontSize: 13, marginTop: 10, fontWeight: 700 }}>❌ {aiError}</div>}
            </div>

            {aiResult && (
              <div style={{ background: C.white, border: `2px solid ${C.green}`, borderRadius: 12, padding: "20px", marginBottom: 16, borderTop: `4px solid ${C.green}`, boxShadow: "0 4px 16px rgba(67,176,71,0.15)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontFamily: headFont, fontWeight: 800, fontSize: 20, color: C.ink, marginBottom: 6 }}>{aiResult.name}</div>
                    <ReviewTag needsReview />
                  </div>
                  <button style={marioBtn(C.green, C.white)} onClick={() => { save({ ...data, meals: [...data.meals, aiResult!] }); setAiResult(null); setAiPrompt(""); }}>
                    🪙 Save Recipe
                  </button>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "12px 0" }}>
                  <span style={pill(TYPE_BG[aiResult.type] || "#F5F0E8", C.inkMid)}>{TYPE_ICON[aiResult.type]} {aiResult.type}</span>
                  <span style={pill(C.redLight, PROTEIN_COLORS[aiResult.protein] || C.inkMid)}>{aiResult.protein}</span>
                  {aiResult.prepTime && <span style={pill("#F5F0E8", C.inkLight)}>⏱ {aiResult.prepTime}</span>}
                  {aiResult.servings && <span style={pill("#F5F0E8", C.inkLight)}>👨‍👩‍👧‍👦 Serves {aiResult.servings}</span>}
                </div>
                <hr style={{ border: "none", borderTop: `2px dashed ${C.border}`, margin: "14px 0" }} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                  <div>
                    <div style={labelStyle}>🥕 Ingredients</div>
                    <div style={{ fontSize: 13, color: C.inkMid, lineHeight: 1.9, whiteSpace: "pre-line" }}>{aiResult.ingredients}</div>
                  </div>
                  <div>
                    <div style={labelStyle}>👨‍🍳 Instructions</div>
                    <div style={{ fontSize: 13, color: C.inkMid, lineHeight: 1.9 }}>{aiResult.notes}</div>
                  </div>
                </div>
              </div>
            )}

            <div style={{ marginTop: 24 }}>
              <div style={labelStyle}>⭐ Quick Ideas</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                {["Quick 30-min weeknight dinner","Kid-friendly meatless Monday","Easy chicken and rice","Simple pasta night","Healthy vegetarian tacos","Cozy soup or stew"].map(q => (
                  <button key={q} style={{ ...marioBtn(C.white, C.darkBrown, C.border), fontSize: 11, padding: "6px 12px", boxShadow: `0 3px 0 ${C.border}` }} onClick={() => setAiPrompt(q)}>{q}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── PROFILE ── */}
        {view === "profile" && (
          <div style={{ maxWidth: 520 }}>
            {sectionTitle("⚙️", "Kitchen Profile")}
            <div style={{ fontSize: 13, color: C.inkMid, marginTop: -10, marginBottom: 20, lineHeight: 1.6 }}>Your preferences guide every recipe Toad generates.</div>
            {profileForm ? (
              <div style={{ background: C.white, border: `2px solid ${C.border}`, borderRadius: 12, padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
                {([
                  ["Meat Preference","meatPreference","select",[["none","None / fully vegetarian"],["light","Light — occasional chicken or fish"],["moderate","Moderate — a few times a week"],["frequent","Frequent — most meals"]]],
                  ["Meal Complexity","complexity","select",[["simple","Simple — 30 min, pantry staples"],["moderate","Moderate — some prep, familiar ingredients"],["complex","Complex — fine with more involved recipes"]]],
                  ["Ingredients to Avoid","avoidIngredients","input",null],
                  ["Other Notes","familyNotes","textarea",null],
                ] as [string, keyof AppData["profile"], string, [string,string][] | null][]).map(([label,key,type,opts]) => (
                  <div key={key}>
                    <label style={labelStyle}>{label}</label>
                    {type === "select" && <select style={selectStyle} value={profileForm[key]} onChange={e => setProfileForm({ ...profileForm, [key]: e.target.value })}>{opts!.map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select>}
                    {type === "input" && <input style={inputStyle} value={profileForm[key]} onChange={e => setProfileForm({ ...profileForm, [key]: e.target.value })} />}
                    {type === "textarea" && <textarea style={{ ...inputStyle, resize: "vertical" }} rows={3} value={profileForm[key]} onChange={e => setProfileForm({ ...profileForm, [key]: e.target.value })} />}
                  </div>
                ))}
                <div style={{ display: "flex", gap: 8 }}>
                  <button style={marioBtn(C.green, C.white)} onClick={() => { save({ ...data, profile: profileForm }); setProfileForm(null); }}>💾 Save</button>
                  <button style={{ ...marioBtn(C.white, C.inkMid, C.border), boxShadow: `0 4px 0 ${C.border}` }} onClick={() => setProfileForm(null)}>Cancel</button>
                </div>
              </div>
            ) : (
              <div style={{ background: C.white, border: `2px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
                {[["🥩 Meat","meatPreference"],["⚡ Complexity","complexity"],["🚫 Avoid","avoidIngredients"],["📝 Notes","familyNotes"]].map(([lbl,key]) => (
                  <div key={key} style={{ display: "flex", gap: 14, paddingBottom: 12, marginBottom: 12, borderBottom: `2px dashed ${C.borderLight}` }}>
                    <div style={{ fontFamily: headFont, fontSize: 12, width: 110, flexShrink: 0, color: C.red, paddingTop: 1 }}>{lbl}</div>
                    <div style={{ fontSize: 13, color: C.inkMid }}>{data.profile[key as keyof AppData["profile"]] || "—"}</div>
                  </div>
                ))}
                <button style={marioBtn(C.red, C.white)} onClick={() => setProfileForm({ ...data.profile })}>✏️ Edit Profile</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── MEAL FORM MODAL ── */}
      {mealForm && (
        <Modal onClose={() => setMealForm(null)} title={data.meals.find(m => m.id === mealForm.id) ? "✏️ Edit Recipe" : "🍄 New Recipe"} accentColor={C.blue}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div><label style={labelStyle}>Recipe Name</label><input style={inputStyle} value={mealForm.name} onChange={e => setMealForm({ ...mealForm, name: e.target.value })} placeholder="What's cooking?" /></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div><label style={labelStyle}>Cuisine Type</label><select style={selectStyle} value={mealForm.type} onChange={e => setMealForm({ ...mealForm, type: e.target.value })}>{FOOD_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
              <div><label style={labelStyle}>Protein</label><select style={selectStyle} value={mealForm.protein} onChange={e => setMealForm({ ...mealForm, protein: e.target.value })}>{PROTEINS.map(p => <option key={p}>{p}</option>)}</select></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div><label style={labelStyle}>⏱ Prep Time</label><input style={inputStyle} value={mealForm.prepTime} onChange={e => setMealForm({ ...mealForm, prepTime: e.target.value })} placeholder="e.g. 30 min" /></div>
              <div><label style={labelStyle}>👨‍👩‍👧‍👦 Servings</label><input type="number" style={inputStyle} value={mealForm.servings} onChange={e => setMealForm({ ...mealForm, servings: Number(e.target.value) })} min={1} /></div>
            </div>
            <div><label style={labelStyle}>🥕 Ingredients (one per line)</label><textarea style={{ ...inputStyle, resize: "vertical" }} rows={5} value={mealForm.ingredients} onChange={e => setMealForm({ ...mealForm, ingredients: e.target.value })} /></div>
            <div><label style={labelStyle}>👨‍🍳 Notes / Instructions</label><textarea style={{ ...inputStyle, resize: "vertical" }} rows={3} value={mealForm.notes} onChange={e => setMealForm({ ...mealForm, notes: e.target.value })} /></div>
            <div><label style={labelStyle}>📎 Source</label><input style={inputStyle} value={mealForm.source || ""} onChange={e => setMealForm({ ...mealForm, source: e.target.value })} /></div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <label style={{ ...labelStyle, margin: 0 }}>Status:</label>
              <ReviewTag needsReview={mealForm.needsReview} onToggle={() => setMealForm({ ...mealForm, needsReview: !mealForm.needsReview })} />
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "space-between", marginTop: 4 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={marioBtn(C.green, C.white)} onClick={() => saveMeal(mealForm)} disabled={!mealForm.name.trim()}>💾 Save</button>
                <button style={{ ...marioBtn(C.white, C.inkMid, C.border), boxShadow: `0 4px 0 ${C.border}` }} onClick={() => setMealForm(null)}>Cancel</button>
              </div>
              {data.meals.find(m => m.id === mealForm.id) && (
                <button onClick={() => { deleteMeal(mealForm.id); setMealForm(null); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: C.red, fontWeight: 800, fontFamily: headFont }}>🗑️ Delete</button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* ── PICKER MODAL ── */}
      {pickerSlot && (
        <Modal onClose={() => { setPickerSlot(null); setSearchQ(""); }} title={`📅 ${pickerSlot.day} — ${pickerSlot.time}`} accentColor={C.blue} maxWidth={480}>
          {data.weekPlan[`${pickerSlot.day}-${pickerSlot.time}`] && (
            <button onClick={() => assignMeal(pickerSlot.day, pickerSlot.time, null)} style={{ ...marioBtn(C.white, C.red, C.red), fontSize: 11, marginBottom: 12 }}>🗑️ Remove Meal</button>
          )}
          <input style={{ ...inputStyle, marginBottom: 12 }} placeholder="Search recipes..." value={searchQ} onChange={e => setSearchQ(e.target.value)} />
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {data.meals.filter(m => !searchQ || m.name.toLowerCase().includes(searchQ.toLowerCase())).map(m => {
              const sel = data.weekPlan[`${pickerSlot.day}-${pickerSlot.time}`] === m.id;
              return (
                <div key={m.id} onClick={() => assignMeal(pickerSlot.day, pickerSlot.time, m.id)} style={{ padding: "10px 14px", border: `2px solid ${sel ? C.blue : C.border}`, borderRadius: 10, cursor: "pointer", background: sel ? C.blueLight : C.white, transition: "all 0.12s" }}
                  onMouseEnter={e => { if (!sel) (e.currentTarget as HTMLDivElement).style.background = C.cream; }}
                  onMouseLeave={e => { if (!sel) (e.currentTarget as HTMLDivElement).style.background = C.white; }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 16 }}>{TYPE_ICON[m.type] || "🍽️"}</span>
                    <span style={{ fontWeight: 800, fontSize: 14, color: C.ink, fontFamily: headFont }}>{m.name}</span>
                    {m.needsReview && <span style={{ fontSize: 10, color: C.reviewText, fontWeight: 800 }}>❓</span>}
                  </div>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    <span style={pill(TYPE_BG[m.type] || "#F5F0E8", C.inkMid)}>{m.type}</span>
                    <span style={pill(C.redLight, PROTEIN_COLORS[m.protein] || C.inkMid)}>{m.protein}</span>
                    {m.rating > 0 && <span style={pill(C.yellowLight, C.brown)}>{"★".repeat(m.rating)}</span>}
                  </div>
                </div>
              );
            })}
            {data.meals.length === 0 && <div style={{ fontSize: 13, color: C.inkLight, padding: 20, textAlign: "center" }}>No recipes yet — add some first!</div>}
          </div>
        </Modal>
      )}

      {/* ── RATING MODAL ── */}
      {ratingModal && (
        <Modal onClose={() => setRatingModal(null)} title={`⭐ Rate: ${ratingModal.name}`} accentColor={C.yellow} maxWidth={380}>
          <div style={{ marginBottom: 16 }}><StarRating value={ratingModal.rating || 0} onChange={r => setRatingModal({ ...ratingModal, rating: r })} size={32} /></div>
          <label style={labelStyle}>📝 Notes</label>
          <textarea style={{ ...inputStyle, resize: "vertical", marginBottom: 16 }} value={ratingModal.ratingNote || ""} onChange={e => setRatingModal({ ...ratingModal, ratingNote: e.target.value })} rows={3} placeholder="e.g. kids loved it, a bit spicy next time..." />
          <div style={{ display: "flex", gap: 8 }}>
            <button style={marioBtn(C.yellow, C.darkBrown)} onClick={() => { save({ ...data, meals: data.meals.map(m => m.id === ratingModal!.id ? { ...m, rating: ratingModal!.rating, ratingNote: ratingModal!.ratingNote } : m) }); setRatingModal(null); }}>💾 Save Rating</button>
            <button style={{ ...marioBtn(C.white, C.inkMid, C.border), boxShadow: `0 4px 0 ${C.border}` }} onClick={() => setRatingModal(null)}>Cancel</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── MODAL WRAPPER ──────────────────────────────────────────────────────────
function Modal({ children, onClose, title, accentColor, maxWidth = 500 }: {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
  accentColor: string;
  maxWidth?: number;
}) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(26,10,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16, backdropFilter: "blur(2px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "#FFFAED", borderRadius: 16, padding: 24, width: "100%", maxWidth, maxHeight: "88vh", overflowY: "auto", border: `3px solid ${accentColor}`, boxShadow: `0 8px 0 ${accentColor}aa, 0 16px 40px rgba(0,0,0,0.3)` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, paddingBottom: 12, borderBottom: `2px dashed ${accentColor}` }}>
          <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 18, color: "#1A0A00" }}>{title}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "#9B6E3A", fontWeight: 700, lineHeight: 1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
