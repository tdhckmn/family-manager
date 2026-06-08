import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../../firebase";
import StarField from "../../components/StarField";
import ToolNav from "../../components/ToolNav";
import { Icon, type IconName } from "../../components/Icon";

const DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const FOOD_TYPES = ["American","Italian","Mexican","Asian","Mediterranean","Indian","Greek","Breakfast","Soup/Salad","Other"];
const PROTEINS = ["None/Vegetarian","Chicken","Fish/Seafood","Beef","Pork","Turkey","Eggs","Beans/Legumes","Tofu","Other"];
const LABEL_SUGGESTIONS = ["Breakfast","Lunch","Dinner","Snack","Dessert","Baked goods","Side dish","Drinks"];

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


// ── Theme ─────────────────────────────────────────────────────────────────────
const BG = "#06091a";
const SURFACE = "rgba(255,255,255,0.04)";
const SURFACE_HOVER = "rgba(255,255,255,0.07)";
const SURFACE_ACCENT = "rgba(167,139,250,0.10)";
const BORDER = "rgba(255,255,255,0.08)";
const BORDER_ACCENT = "rgba(167,139,250,0.35)";
const LAV = "#a78bfa";
const LAV_DIM = "#7c5cbf";
const TEXT = "#dedad0";
const TEXT_DIM = "#7a7890";
const TEXT_MUTED = "#4a4860";
const DANGER = "#c0566a";

const TYPE_COLOR: Record<string,string> = {
  "American":"#fb923c","Italian":"#4ade80","Mexican":"#fbbf24","Asian":"#a78bfa",
  "Mediterranean":"#22d3ee","Indian":"#f59e0b","Greek":"#60a5fa",
  "Breakfast":"#f97316","Soup/Salad":"#86efac","Other":"#9ca3af",
};
const PROTEIN_COLOR: Record<string,string> = {
  "None/Vegetarian":"#4ade80","Chicken":"#fb923c","Fish/Seafood":"#22d3ee",
  "Beef":"#f87171","Pork":"#fca5a5","Turkey":"#c4b5fd","Eggs":"#fbbf24",
  "Beans/Legumes":"#86efac","Tofu":"#a7f3d0","Other":"#9ca3af",
};

// ── Types ──────────────────────────────────────────────────────────────────────
interface Meal {
  id: string; name: string; type: string; protein: string; prepTime: string;
  servings: number; ingredients: string; notes: string; source: string;
  rating: number; ratingNote: string; needsReview: boolean;
}
interface PlanEntry {
  id: string;
  mealId: string;
  day?: string;
  label?: string;
}
interface AppData {
  meals: Meal[];
  planEntries: PlanEntry[];
}

const SEED_DATA: AppData = {
  meals: SEED_MEALS.map(m => ({ ...m, rating: 0, ratingNote: "", needsReview: true })),
  planEntries: [],
};

// ── Style helpers ─────────────────────────────────────────────────────────────
const pill = (color: string): React.CSSProperties => ({
  fontSize: 10, padding: "2px 8px", borderRadius: 20,
  background: `${color}1a`, color, border: `1px solid ${color}44`,
  fontWeight: 700, whiteSpace: "nowrap", textTransform: "uppercase",
  letterSpacing: 0.4, display: "inline-block",
});

function btn(bg: string, color?: string, border?: string): React.CSSProperties {
  const fg = color ?? (bg === "transparent" ? TEXT : BG);
  return {
    background: bg, color: fg, border: border ? `1px solid ${border}` : "none",
    borderRadius: 8, cursor: "pointer", fontFamily: "'Montserrat', sans-serif",
    fontWeight: 700, padding: "7px 16px", fontSize: 13,
    display: "inline-flex", alignItems: "center", gap: 6,
  };
}

const inputStyle: React.CSSProperties = {
  background: "rgba(0,0,0,0.3)", border: `1px solid ${BORDER}`,
  borderRadius: 8, padding: "9px 12px", fontSize: 14, color: TEXT,
  fontFamily: "'Montserrat', sans-serif", width: "100%",
  boxSizing: "border-box", outline: "none",
};
const selectStyle: React.CSSProperties = {
  ...inputStyle, appearance: "none",
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%237a7890' fill='none' stroke-width='1.5'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center", paddingRight: 32,
};
const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase",
  color: TEXT_DIM, display: "block", marginBottom: 5, fontFamily: "'Montserrat', sans-serif",
};

// ── Small components ───────────────────────────────────────────────────────────
function StarRating({ value, onChange, size = 18 }: { value: number; onChange?: (n: number) => void; size?: number }) {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {[1,2,3,4,5].map(n => (
        <span key={n}
          onClick={() => onChange && onChange(n === value ? 0 : n)}
          onMouseEnter={() => onChange && setHover(n)}
          onMouseLeave={() => onChange && setHover(0)}
          style={{ cursor: onChange ? "pointer" : "default", lineHeight: 1, display: "flex" }}>
          <Icon name="star" size={size} color={n <= (hover || value) ? LAV : TEXT_MUTED} />
        </span>
      ))}
    </div>
  );
}

function ReviewTag({ needsReview, onToggle }: { needsReview: boolean; onToggle?: () => void }) {
  return needsReview
    ? <span onClick={onToggle} style={{ ...pill("#fbbf24"), cursor: onToggle ? "pointer" : "default", display: "inline-flex", alignItems: "center", gap: 4 }}>review</span>
    : <span onClick={onToggle} style={{ ...pill("#4ade80"), cursor: onToggle ? "pointer" : "default", display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name="check" size={10} color="#4ade80" /> approved</span>;
}

function SectionDivider({ label, accent }: { label: string; accent: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: accent, flexShrink: 0 }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${accent}55, transparent)` }} />
    </div>
  );
}

function PlanEntryRow({ meal, label, onView, onEdit, onRemove }: { meal: Meal; label?: string; onView: () => void; onEdit: () => void; onRemove: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} onClick={onView}
      style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 16px", background: hov ? SURFACE_HOVER : SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, transition: "all 0.15s", cursor: "pointer" }}>
      <div style={{ flexShrink: 0 }}>
        <Icon name="utensils" size={18} color={TYPE_COLOR[meal.type] || TEXT_DIM} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: TEXT, lineHeight: 1.3 }}>{meal.name}</span>
          {label && (
            <span style={{ fontSize: 10, color: LAV_DIM, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", flexShrink: 0 }}>{label}</span>
          )}
        </div>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
          <span style={pill(TYPE_COLOR[meal.type] || "#9ca3af")}>{meal.type}</span>
          <span style={pill(PROTEIN_COLOR[meal.protein] || "#9ca3af")}>{meal.protein}</span>
          {meal.prepTime && (
            <span style={{ ...pill(TEXT_DIM), display: "inline-flex", alignItems: "center", gap: 3 }}>
              <Icon name="clock" size={9} color={TEXT_DIM} />{meal.prepTime}
            </span>
          )}
          {meal.rating > 0 && (
            <span style={{ ...pill(LAV), display: "inline-flex", alignItems: "center", gap: 2 }}>
              {Array.from({ length: meal.rating }).map((_, i) => <Icon key={i} name="star" size={9} color={LAV} />)}
            </span>
          )}
        </div>
      </div>
      <button onClick={e => { e.stopPropagation(); onEdit(); }}
        style={{ background: "none", border: "none", cursor: "pointer", color: TEXT_MUTED, padding: "4px 8px", borderRadius: 6, display: "flex", alignItems: "center" }}
        onMouseEnter={e => (e.currentTarget.style.color = LAV)}
        onMouseLeave={e => (e.currentTarget.style.color = TEXT_MUTED)}>
        <Icon name="pencil" size={14} color="currentColor" />
      </button>
      <button onClick={e => { e.stopPropagation(); onRemove(); }}
        style={{ background: "none", border: "none", cursor: "pointer", color: TEXT_MUTED, padding: "4px 8px", borderRadius: 6, display: "flex", alignItems: "center" }}
        onMouseEnter={e => (e.currentTarget.style.color = DANGER)}
        onMouseLeave={e => (e.currentTarget.style.color = TEXT_MUTED)}>
        <Icon name="x" size={16} color="currentColor" />
      </button>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function FoodPlanner() {
  const [data, setData] = useState<AppData>(SEED_DATA);
  const [view, setView] = useState("planner");
  const [mealForm, setMealForm] = useState<Meal | null>(null);
  const [filterType, setFilterType] = useState("all");
  const [filterProtein, setFilterProtein] = useState("all");
  const [filterRating, setFilterRating] = useState(0);
  const [filterReview, setFilterReview] = useState("all");
const [groceryChecked, setGroceryChecked] = useState<Record<string,boolean>>({});
  const [ratingModal, setRatingModal] = useState<Meal | null>(null);
  const [searchQ, setSearchQ] = useState("");
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [addEntryDay, setAddEntryDay] = useState("");
  const [addEntryLabel, setAddEntryLabel] = useState("");
  const [addEntryMealId, setAddEntryMealId] = useState("");
  const [addEntrySearch, setAddEntrySearch] = useState("");
  const [editEntry, setEditEntry] = useState<PlanEntry | null>(null);
  const [editEntryDay, setEditEntryDay] = useState("");
  const [editEntryLabel, setEditEntryLabel] = useState("");
  const [viewMealId, setViewMealId] = useState<string | null>(null);
  const viewMeal = viewMealId ? (data.meals.find(m => m.id === viewMealId) ?? null) : null;

  useEffect(() => {
    try {
      const ref = doc(db, "config", "foodPlanner");
      const unsub = onSnapshot(ref, snap => {
        if (snap.exists()) {
          const d = snap.data() as Partial<AppData> & { weekPlan?: unknown };
          setData({
            ...SEED_DATA,
            ...d,
            meals: d.meals?.length ? d.meals : SEED_DATA.meals,
            planEntries: d.planEntries ?? [],
          });
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

  function toggleReview(id: string) {
    save({ ...data, meals: data.meals.map(m => m.id === id ? { ...m, needsReview: !m.needsReview } : m) });
  }
  function openMealForm(meal: Meal | null = null) {
    setMealForm(meal ? { ...meal } : {
      id: Date.now().toString(), name: "", type: "Other", protein: "None/Vegetarian",
      ingredients: "", servings: 4, prepTime: "", notes: "", rating: 0, ratingNote: "", source: "", needsReview: true,
    });
  }
  function saveMeal(m: Meal) {
    const meals = data.meals.find(x => x.id === m.id)
      ? data.meals.map(x => x.id === m.id ? m : x)
      : [...data.meals, m];
    save({ ...data, meals });
    setMealForm(null);
  }
  function deleteMeal(id: string) {
    save({
      ...data,
      meals: data.meals.filter(m => m.id !== id),
      planEntries: data.planEntries.filter(e => e.mealId !== id),
    });
  }
  function openAddEntry() {
    setAddEntryMealId(""); setAddEntryDay(""); setAddEntryLabel(""); setAddEntrySearch(""); setShowAddEntry(true);
  }
  function addPlanEntry() {
    if (!addEntryMealId) return;
    const entry: PlanEntry = {
      id: Date.now().toString(),
      mealId: addEntryMealId,
      day: addEntryDay || undefined,
      label: addEntryLabel.trim() || undefined,
    };
    save({ ...data, planEntries: [...data.planEntries, entry] });
    setShowAddEntry(false);
  }
  function removePlanEntry(id: string) {
    save({ ...data, planEntries: data.planEntries.filter(e => e.id !== id) });
  }
  function openEditEntry(entry: PlanEntry) {
    setEditEntry(entry);
    setEditEntryDay(entry.day ?? "");
    setEditEntryLabel(entry.label ?? "");
  }
  function saveEditEntry() {
    if (!editEntry) return;
    save({
      ...data,
      planEntries: data.planEntries.map(e =>
        e.id === editEntry.id
          ? { ...e, day: editEntryDay || undefined, label: editEntryLabel.trim() || undefined }
          : e
      ),
    });
    setEditEntry(null);
  }
  function buildGroceryList() {
    const items: Record<string, { count: number; meals: string[] }> = {};
    data.planEntries.forEach(entry => {
      const meal = data.meals.find(m => m.id === entry.mealId);
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

  const groceryItems = buildGroceryList();
  const plannedCount = data.planEntries.length;

  // Group entries
  const entriesByDay: Record<string, PlanEntry[]> = {};
  const noDay: PlanEntry[] = [];
  data.planEntries.forEach(entry => {
    if (entry.day) {
      if (!entriesByDay[entry.day]) entriesByDay[entry.day] = [];
      entriesByDay[entry.day].push(entry);
    } else {
      noDay.push(entry);
    }
  });
  const daysWithEntries = DAYS.filter(d => entriesByDay[d]?.length > 0);

  // Group no-day entries by label
  const noDayByLabel: Record<string, PlanEntry[]> = {};
  const noDayNoLabel: PlanEntry[] = [];
  noDay.forEach(entry => {
    if (entry.label) {
      if (!noDayByLabel[entry.label]) noDayByLabel[entry.label] = [];
      noDayByLabel[entry.label].push(entry);
    } else {
      noDayNoLabel.push(entry);
    }
  });
  const labelsWithEntries = Object.keys(noDayByLabel).sort();

  const navItems: { id: string; label: string; icon: IconName }[] = [
    { id: "planner", label: "This Week", icon: "calendar" },
    { id: "library", label: `Recipes (${data.meals.length})`, icon: "book" },
    { id: "grocery", label: `Grocery${plannedCount ? ` (${plannedCount})` : ""}`, icon: "bag" },
  ];

  return (
    <div style={{ background: BG, minHeight: "100vh", fontFamily: "'Montserrat', sans-serif", color: TEXT, position: "relative" }}>
      <StarField />

      <div style={{ position: "relative", zIndex: 1 }}>
        {/* ── HEADER ── */}
        <div style={{ padding: "14px 24px", minHeight: 60, borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", gap: 12, boxSizing: "border-box" }}>
          <Link to="/" style={{ textDecoration: "none", color: TEXT_DIM, fontSize: 13, fontWeight: 600, opacity: 0.7, flexShrink: 0, transition: "opacity 0.15s" }}
            onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.opacity = "1"}
            onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.opacity = "0.7"}>
            ← Home
          </Link>
          <div style={{ width: 1, height: 14, background: "rgba(255,255,255,0.1)", flexShrink: 0 }} />
          <ToolNav current="food" />
        </div>

        {/* ── SUB-NAV ── */}
        <div style={{ display: "flex", borderBottom: `1px solid ${BORDER}`, background: "rgba(0,0,0,0.15)", overflowX: "auto" }}>
          {navItems.map(n => (
            <button key={n.id} onClick={() => setView(n.id)} style={{
              padding: "11px 18px", border: "none", cursor: "pointer",
              fontFamily: "'Montserrat', sans-serif", fontSize: 13, fontWeight: 700,
              background: "transparent", whiteSpace: "nowrap",
              color: view === n.id ? LAV : TEXT_DIM,
              borderBottom: view === n.id ? `2px solid ${LAV}` : "2px solid transparent",
              transition: "all 0.15s",
              display: "flex", alignItems: "center", gap: 7,
            }}>
              <Icon name={n.icon} size={14} color={view === n.id ? LAV : TEXT_DIM} />
              {n.label}
            </button>
          ))}
        </div>

        {/* ── BODY ── */}
        <div style={{ padding: "28px 24px 60px", maxWidth: 1100, margin: "0 auto" }}>

          {/* ── PLANNER ── */}
          {view === "planner" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: TEXT }}>This Week</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button style={btn(LAV)} onClick={openAddEntry}>+ Add meal</button>
                  {plannedCount > 0 && (
                    <button style={btn("transparent", DANGER, BORDER)} onClick={() => save({ ...data, planEntries: [] })}>Clear</button>
                  )}
                </div>
              </div>

              {plannedCount === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 20px", color: TEXT_MUTED }}>
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}><Icon name="utensils" size={48} color={TEXT_MUTED} /></div>
                  <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: TEXT_DIM }}>Nothing planned yet</div>
                  <div style={{ fontSize: 14, lineHeight: 1.6 }}>Add meals from your recipe library to build the week.</div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
                  {/* Day sections */}
                  {daysWithEntries.map(day => (
                    <div key={day}>
                      <SectionDivider label={day} accent={LAV} />
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {entriesByDay[day].map(entry => {
                          const meal = data.meals.find(m => m.id === entry.mealId);
                          if (!meal) return null;
                          return <PlanEntryRow key={entry.id} meal={meal} label={entry.label} onView={() => setViewMealId(meal.id)} onEdit={() => openEditEntry(entry)} onRemove={() => removePlanEntry(entry.id)} />;
                        })}
                      </div>
                    </div>
                  ))}
                  {/* Label sections (no day assigned) */}
                  {labelsWithEntries.map(lbl => (
                    <div key={lbl}>
                      <SectionDivider label={lbl} accent={LAV_DIM} />
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {noDayByLabel[lbl].map(entry => {
                          const meal = data.meals.find(m => m.id === entry.mealId);
                          if (!meal) return null;
                          return <PlanEntryRow key={entry.id} meal={meal} label={entry.label} onView={() => setViewMealId(meal.id)} onEdit={() => openEditEntry(entry)} onRemove={() => removePlanEntry(entry.id)} />;
                        })}
                      </div>
                    </div>
                  ))}
                  {/* Unlabeled, no day */}
                  {noDayNoLabel.length > 0 && (
                    <div>
                      <SectionDivider label="Anytime" accent={TEXT_MUTED} />
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {noDayNoLabel.map(entry => {
                          const meal = data.meals.find(m => m.id === entry.mealId);
                          if (!meal) return null;
                          return <PlanEntryRow key={entry.id} meal={meal} onView={() => setViewMealId(meal.id)} onEdit={() => openEditEntry(entry)} onRemove={() => removePlanEntry(entry.id)} />;
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── LIBRARY ── */}
          {view === "library" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: TEXT }}>Recipe Book</div>
                <button style={btn(LAV)} onClick={() => openMealForm()}>+ Add Recipe</button>
              </div>

              <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                  <div>
                    <label style={labelStyle}>Search</label>
                    <input style={inputStyle} value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search recipes…"
                      onFocus={e => (e.target.style.borderColor = LAV_DIM)} onBlur={e => (e.target.style.borderColor = BORDER)} />
                  </div>
                  <div>
                    <label style={labelStyle}>Review Status</label>
                    <select style={selectStyle} value={filterReview} onChange={e => setFilterReview(e.target.value)}>
                      <option value="all">All Recipes</option>
                      <option value="review">Needs Review</option>
                      <option value="approved">Approved</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={labelStyle}>Cuisine</label>
                    <select style={selectStyle} value={filterType} onChange={e => setFilterType(e.target.value)}>
                      <option value="all">All Types</option>
                      {FOOD_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Protein</label>
                    <select style={selectStyle} value={filterProtein} onChange={e => setFilterProtein(e.target.value)}>
                      <option value="all">All Proteins</option>
                      {PROTEINS.map(p => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Min Rating</label>
                    <select style={selectStyle} value={filterRating} onChange={e => setFilterRating(Number(e.target.value))}>
                      <option value={0}>Any</option>
                      {[5,4,3,2,1].map(r => <option key={r} value={r}>{r}+ ★</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div style={{ fontSize: 12, color: TEXT_MUTED, marginBottom: 14, fontWeight: 700 }}>
                Showing {filteredMeals.length} of {data.meals.length} recipes
              </div>

              {filteredMeals.length === 0 && (
                <div style={{ textAlign: "center", padding: 48, color: TEXT_MUTED }}>
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}><Icon name="list" size={40} color={TEXT_MUTED} /></div>
                  <div style={{ fontSize: 16, color: TEXT_DIM }}>Nothing matches your filters</div>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 12 }}>
                {filteredMeals.map(m => (
                  <div key={m.id} onClick={() => setViewMealId(m.id)}
                    style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderTop: `2px solid ${m.needsReview ? "#fbbf24" : "#4ade80"}`, borderRadius: 12, padding: "14px 16px", transition: "transform 0.15s, box-shadow 0.15s", cursor: "pointer" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 6px 20px rgba(0,0,0,0.3)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ""; (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
                      <div style={{ fontWeight: 800, fontSize: 15, color: TEXT, lineHeight: 1.3, flex: 1, marginRight: 8 }}>{m.name}</div>
                      <Icon name="utensils" size={18} color={TYPE_COLOR[m.type] || TEXT_DIM} />
                    </div>
                    <div style={{ marginBottom: 8 }} onClick={e => e.stopPropagation()}>
                      <ReviewTag needsReview={m.needsReview} onToggle={() => toggleReview(m.id)} />
                    </div>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8, alignItems: "center" }}>
                      <span style={pill(TYPE_COLOR[m.type] || "#9ca3af")}>{m.type}</span>
                      <span style={pill(PROTEIN_COLOR[m.protein] || "#9ca3af")}>{m.protein}</span>
                      {m.prepTime && (
                        <span style={{ ...pill(TEXT_DIM), display: "inline-flex", alignItems: "center", gap: 3 }}>
                          <Icon name="clock" size={9} color={TEXT_DIM} />{m.prepTime}
                        </span>
                      )}
                    </div>
                    {m.rating > 0 && (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                        <StarRating value={m.rating} size={13} />
                        {m.ratingNote && <span style={{ fontSize: 11, color: TEXT_DIM, fontStyle: "italic" }}>{m.ratingNote}</span>}
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 6, marginTop: 10 }} onClick={e => e.stopPropagation()}>
                      <button style={{ ...btn("transparent", TEXT_DIM, BORDER), fontSize: 11, padding: "5px 12px", display: "flex", alignItems: "center", gap: 5 }} onClick={() => openMealForm(m)}><Icon name="pencil" size={11} color={TEXT_DIM} /> Edit</button>
                      <button style={{ ...btn(SURFACE_ACCENT, LAV), fontSize: 11, padding: "5px 12px", border: `1px solid ${BORDER_ACCENT}`, display: "flex", alignItems: "center", gap: 5 }} onClick={() => setRatingModal({ ...m })}><Icon name="star" size={11} color={LAV} /> Rate</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── GROCERY ── */}
          {view === "grocery" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: TEXT }}>Grocery List</div>
                <button style={{ ...btn("transparent", TEXT_DIM, BORDER), fontSize: 12, padding: "6px 14px" }} onClick={() => setGroceryChecked({})}>Uncheck All</button>
              </div>
              {Object.keys(groceryItems).length === 0 ? (
                <div style={{ textAlign: "center", padding: 56, color: TEXT_MUTED }}>
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}><Icon name="bag" size={48} color={TEXT_MUTED} /></div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: TEXT_DIM, marginBottom: 6 }}>Plan your week first</div>
                  <div style={{ fontSize: 14 }}>Your shopping list will appear here once you've added meals.</div>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(270px,1fr))", gap: 8 }}>
                  {Object.entries(groceryItems).sort((a,b) => a[0].localeCompare(b[0])).map(([item, info]) => (
                    <div key={item} onClick={() => setGroceryChecked(c => ({ ...c, [item]: !c[item] }))}
                      style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: groceryChecked[item] ? "transparent" : SURFACE, border: `1px solid ${groceryChecked[item] ? BORDER : BORDER_ACCENT}`, borderLeft: `3px solid ${groceryChecked[item] ? TEXT_MUTED : LAV}`, borderRadius: 10, cursor: "pointer", opacity: groceryChecked[item] ? 0.4 : 1, transition: "all 0.15s" }}>
                      <div style={{ width: 20, height: 20, borderRadius: 5, border: `1.5px solid ${groceryChecked[item] ? LAV : BORDER_ACCENT}`, background: groceryChecked[item] ? LAV : "transparent", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {groceryChecked[item] && <Icon name="check" size={12} color={BG} />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, textDecoration: groceryChecked[item] ? "line-through" : "none", color: TEXT }}>{item}</div>
                        <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 1 }}>{info.meals.join(", ")}</div>
                      </div>
                      {info.count > 1 && <span style={{ ...pill(LAV_DIM), fontSize: 9 }}>×{info.count}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}


        </div>
      </div>

      {/* ── RECIPE DETAIL ── */}
      {viewMeal && (
        <RecipeDetail
          meal={viewMeal}
          onClose={() => setViewMealId(null)}
          onEdit={() => openMealForm(viewMeal)}
        />
      )}

      {/* ── MEAL FORM MODAL ── */}
      {mealForm && (
        <Modal onClose={() => setMealForm(null)} title={data.meals.find(m => m.id === mealForm.id) ? "Edit Recipe" : "New Recipe"} accentColor={LAV}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={labelStyle}>Recipe Name</label>
              <input style={inputStyle} value={mealForm.name} onChange={e => setMealForm({ ...mealForm, name: e.target.value })} placeholder="What's cooking?"
                onFocus={e => (e.target.style.borderColor = LAV_DIM)} onBlur={e => (e.target.style.borderColor = BORDER)} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div><label style={labelStyle}>Cuisine Type</label><select style={selectStyle} value={mealForm.type} onChange={e => setMealForm({ ...mealForm, type: e.target.value })}>{FOOD_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
              <div><label style={labelStyle}>Protein</label><select style={selectStyle} value={mealForm.protein} onChange={e => setMealForm({ ...mealForm, protein: e.target.value })}>{PROTEINS.map(p => <option key={p}>{p}</option>)}</select></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div><label style={labelStyle}>Prep Time</label><input style={inputStyle} value={mealForm.prepTime} onChange={e => setMealForm({ ...mealForm, prepTime: e.target.value })} placeholder="e.g. 30 min" /></div>
              <div><label style={labelStyle}>Servings</label><input type="number" style={inputStyle} value={mealForm.servings} onChange={e => setMealForm({ ...mealForm, servings: Number(e.target.value) })} min={1} /></div>
            </div>
            <div><label style={labelStyle}>Ingredients (one per line)</label><textarea style={{ ...inputStyle, resize: "vertical" }} rows={5} value={mealForm.ingredients} onChange={e => setMealForm({ ...mealForm, ingredients: e.target.value })} /></div>
            <div><label style={labelStyle}>Notes / Instructions</label><textarea style={{ ...inputStyle, resize: "vertical" }} rows={3} value={mealForm.notes} onChange={e => setMealForm({ ...mealForm, notes: e.target.value })} /></div>
            <div><label style={labelStyle}>Source</label><input style={inputStyle} value={mealForm.source || ""} onChange={e => setMealForm({ ...mealForm, source: e.target.value })} /></div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <label style={{ ...labelStyle, margin: 0 }}>Status:</label>
              <ReviewTag needsReview={mealForm.needsReview} onToggle={() => setMealForm({ ...mealForm, needsReview: !mealForm.needsReview })} />
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "space-between", marginTop: 4 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={btn(LAV)} onClick={() => saveMeal(mealForm)} disabled={!mealForm.name.trim()}>Save</button>
                <button style={btn("transparent", TEXT_DIM, BORDER)} onClick={() => setMealForm(null)}>Cancel</button>
              </div>
              {data.meals.find(m => m.id === mealForm.id) && (
                <button onClick={() => { deleteMeal(mealForm.id); setMealForm(null); }}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: DANGER, fontWeight: 700, fontFamily: "'Montserrat', sans-serif" }}>
                  Delete
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* ── ADD ENTRY MODAL ── */}
      {showAddEntry && (
        <Modal onClose={() => setShowAddEntry(false)} title="Add to this week" accentColor={LAV} maxWidth={480}>
          {/* Day */}
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Day (optional)</label>
            <select style={selectStyle} value={addEntryDay} onChange={e => setAddEntryDay(e.target.value)}>
              <option value="">No specific day</option>
              {DAYS.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>

          {/* Label */}
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Label (optional)</label>
            <input style={inputStyle} placeholder="e.g. Breakfast, Snack, Dessert…" value={addEntryLabel} onChange={e => setAddEntryLabel(e.target.value)}
              onFocus={e => (e.target.style.borderColor = LAV_DIM)} onBlur={e => (e.target.style.borderColor = BORDER)} />
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 7 }}>
              {LABEL_SUGGESTIONS.map(s => (
                <button key={s} onClick={() => setAddEntryLabel(s)}
                  style={{ ...btn(addEntryLabel === s ? SURFACE_ACCENT : "transparent", addEntryLabel === s ? LAV : TEXT_MUTED, addEntryLabel === s ? BORDER_ACCENT : BORDER), fontSize: 11, padding: "4px 10px" }}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Recipe picker */}
          <div style={{ marginBottom: 10 }}>
            <label style={labelStyle}>Choose a recipe</label>
            <input style={inputStyle} placeholder="Search recipes…" value={addEntrySearch} onChange={e => setAddEntrySearch(e.target.value)}
              onFocus={e => (e.target.style.borderColor = LAV_DIM)} onBlur={e => (e.target.style.borderColor = BORDER)} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: 260, overflowY: "auto", marginBottom: 14 }}>
            {data.meals
              .filter(m => !addEntrySearch || m.name.toLowerCase().includes(addEntrySearch.toLowerCase()))
              .map(m => {
                const sel = addEntryMealId === m.id;
                return (
                  <div key={m.id} onClick={() => setAddEntryMealId(m.id)}
                    style={{ padding: "10px 14px", borderRadius: 10, cursor: "pointer", background: sel ? SURFACE_ACCENT : SURFACE, border: `1px solid ${sel ? BORDER_ACCENT : BORDER}`, transition: "all 0.12s" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <Icon name="utensils" size={15} color={TYPE_COLOR[m.type] || TEXT_DIM} />
                      <span style={{ fontWeight: 700, fontSize: 14, color: sel ? LAV : TEXT }}>{m.name}</span>
                    </div>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      <span style={pill(TYPE_COLOR[m.type] || "#9ca3af")}>{m.type}</span>
                      <span style={pill(PROTEIN_COLOR[m.protein] || "#9ca3af")}>{m.protein}</span>
                    </div>
                  </div>
                );
              })}
          </div>
          <button style={{ ...btn(LAV), width: "100%", justifyContent: "center", opacity: addEntryMealId ? 1 : 0.5 }}
            onClick={addPlanEntry} disabled={!addEntryMealId}>
            Add to plan
          </button>
        </Modal>
      )}

      {/* ── EDIT ENTRY MODAL ── */}
      {editEntry && (() => {
        const meal = data.meals.find(m => m.id === editEntry.mealId);
        return (
          <Modal onClose={() => setEditEntry(null)} title={meal?.name ?? "Edit entry"} accentColor={LAV} maxWidth={420}>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Day (optional)</label>
              <select style={selectStyle} value={editEntryDay} onChange={e => setEditEntryDay(e.target.value)}>
                <option value="">No specific day</option>
                {DAYS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Label (optional)</label>
              <input style={inputStyle} placeholder="e.g. Breakfast, Snack, Dessert…" value={editEntryLabel} onChange={e => setEditEntryLabel(e.target.value)}
                onFocus={e => (e.target.style.borderColor = LAV_DIM)} onBlur={e => (e.target.style.borderColor = BORDER)} />
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 7 }}>
                {LABEL_SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => setEditEntryLabel(s)}
                    style={{ ...btn(editEntryLabel === s ? SURFACE_ACCENT : "transparent", editEntryLabel === s ? LAV : TEXT_MUTED, editEntryLabel === s ? BORDER_ACCENT : BORDER), fontSize: 11, padding: "4px 10px" }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={btn(LAV)} onClick={saveEditEntry}>Save</button>
              <button style={btn("transparent", TEXT_DIM, BORDER)} onClick={() => setEditEntry(null)}>Cancel</button>
            </div>
          </Modal>
        );
      })()}

      {/* ── RATING MODAL ── */}
      {ratingModal && (
        <Modal onClose={() => setRatingModal(null)} title={`Rate: ${ratingModal.name}`} accentColor={LAV} maxWidth={380}>
          <div style={{ marginBottom: 16 }}>
            <StarRating value={ratingModal.rating || 0} onChange={r => setRatingModal({ ...ratingModal, rating: r })} size={32} />
          </div>
          <label style={labelStyle}>Notes</label>
          <textarea style={{ ...inputStyle, resize: "vertical", marginBottom: 16 }} value={ratingModal.ratingNote || ""} onChange={e => setRatingModal({ ...ratingModal, ratingNote: e.target.value })} rows={3} placeholder="e.g. kids loved it, a bit spicy next time…" />
          <div style={{ display: "flex", gap: 8 }}>
            <button style={btn(LAV)} onClick={() => {
              save({ ...data, meals: data.meals.map(m => m.id === ratingModal!.id ? { ...m, rating: ratingModal!.rating, ratingNote: ratingModal!.ratingNote } : m) });
              setRatingModal(null);
            }}>Save Rating</button>
            <button style={btn("transparent", TEXT_DIM, BORDER)} onClick={() => setRatingModal(null)}>Cancel</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Recipe Detail (full-screen overlay) ───────────────────────────────────────
function RecipeDetail({ meal, onClose, onEdit }: { meal: Meal; onClose: () => void; onEdit: () => void }) {
  const ingredients = meal.ingredients.split("\n").filter(l => l.trim());

  const iconBtn = (onClick: () => void, icon: "x" | "pencil", hoverColor: string) => {
    const el = (
      <button onClick={onClick}
        style={{ background: "none", border: `1px solid ${BORDER}`, borderRadius: 8, cursor: "pointer", color: TEXT_DIM, padding: "6px 10px", display: "flex", alignItems: "center", lineHeight: 1, flexShrink: 0 }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = hoverColor; (e.currentTarget as HTMLButtonElement).style.borderColor = hoverColor + "60"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = TEXT_DIM; (e.currentTarget as HTMLButtonElement).style.borderColor = BORDER; }}>
        <Icon name={icon} size={16} color="currentColor" />
      </button>
    );
    return el;
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: BG, zIndex: 50, overflowY: "auto", fontFamily: "'Montserrat', sans-serif", color: TEXT }}>
      <StarField />
      <div style={{ position: "relative", zIndex: 1 }}>

        {/* Header */}
        <div style={{ position: "sticky", top: 0, zIndex: 10, background: "rgba(6,9,26,0.92)", backdropFilter: "blur(12px)", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", padding: "0 20px", minHeight: 60, gap: 12, boxSizing: "border-box" }}>
          {iconBtn(onClose, "x", TEXT)}
          <div style={{ flex: 1, textAlign: "center", fontWeight: 800, fontSize: 16, color: TEXT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", letterSpacing: -0.2 }}>
            {meal.name}
          </div>
          {iconBtn(onEdit, "pencil", LAV)}
        </div>

        {/* Body */}
        <div style={{ padding: "28px 24px 80px", maxWidth: 720, margin: "0 auto" }}>

          {/* Meta pills */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", marginBottom: 16 }}>
            <span style={pill(TYPE_COLOR[meal.type] || "#9ca3af")}>{meal.type}</span>
            <span style={pill(PROTEIN_COLOR[meal.protein] || "#9ca3af")}>{meal.protein}</span>
            {meal.prepTime && (
              <span style={{ ...pill(TEXT_DIM), display: "inline-flex", alignItems: "center", gap: 3 }}>
                <Icon name="clock" size={9} color={TEXT_DIM} />{meal.prepTime}
              </span>
            )}
            {meal.servings > 0 && <span style={pill(TEXT_DIM)}>{meal.servings} servings</span>}
            <ReviewTag needsReview={meal.needsReview} />
          </div>

          {/* Rating */}
          {meal.rating > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
              <StarRating value={meal.rating} size={15} />
              {meal.ratingNote && <span style={{ fontSize: 12, color: TEXT_DIM, fontStyle: "italic" }}>{meal.ratingNote}</span>}
            </div>
          )}

          {/* Ingredients */}
          {ingredients.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: LAV, marginBottom: 12 }}>Ingredients</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {ingredients.map((ing, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "9px 14px", background: SURFACE, borderRadius: 8, border: `1px solid ${BORDER}` }}>
                    <div style={{ width: 5, height: 5, borderRadius: "50%", background: LAV_DIM, marginTop: 7, flexShrink: 0 }} />
                    <span style={{ fontSize: 14, color: TEXT, lineHeight: 1.5 }}>{ing}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Instructions */}
          {meal.notes && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: LAV, marginBottom: 12 }}>Instructions</div>
              <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "16px 18px", fontSize: 14, color: TEXT, lineHeight: 1.75 }}>
                {meal.notes}
              </div>
            </div>
          )}

          {/* Source */}
          {meal.source && (
            <div style={{ fontSize: 12, color: TEXT_MUTED, fontStyle: "italic" }}>Source: {meal.source}</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Modal ──────────────────────────────────────────────────────────────────────
function Modal({ children, onClose, title, accentColor, maxWidth = 520 }: {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
  accentColor: string;
  maxWidth?: number;
}) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(3,5,15,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16, backdropFilter: "blur(4px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "#0b0f22", borderRadius: 16, padding: 24, width: "100%", maxWidth, maxHeight: "88vh", overflowY: "auto", border: `1px solid ${accentColor}55`, boxShadow: `0 0 0 1px ${accentColor}22, 0 24px 48px rgba(0,0,0,0.6)` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, paddingBottom: 14, borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 18, fontWeight: 700, color: TEXT }}>{title}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: TEXT_MUTED, lineHeight: 1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
