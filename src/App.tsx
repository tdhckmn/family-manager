import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import FoodPlanner from "./pages/food/FoodPlanner";
import PeteTracker from "./pages/kids/PeteTracker";
import ArborTracker from "./pages/kids/ArborTracker";
import Todos from "./pages/todos/Todos";
import Finance from "./pages/finance/Finance";
import Accounts from "./pages/accounts/Accounts";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/food" element={<FoodPlanner />} />
      <Route path="/kids/pete" element={<PeteTracker />} />
      <Route path="/kids/arbor" element={<ArborTracker />} />
      <Route path="/todos" element={<Todos />} />
      <Route path="/finance" element={<Finance />} />
      <Route path="/accounts" element={<Accounts />} />
    </Routes>
  );
}
