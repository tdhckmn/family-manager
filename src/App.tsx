import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import FoodPlanner from "./pages/food/FoodPlanner";
import KidsHome from "./pages/kids/KidsHome";
import PeteTracker from "./pages/kids/PeteTracker";
import ArborTracker from "./pages/kids/ArborTracker";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/food" element={<FoodPlanner />} />
      <Route path="/kids" element={<KidsHome />} />
      <Route path="/kids/pete" element={<PeteTracker />} />
      <Route path="/kids/arbor" element={<ArborTracker />} />
    </Routes>
  );
}
