import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Todos from "./pages/todos/Todos";
import Finance from "./pages/finance/Finance";
import Accounts from "./pages/accounts/Accounts";
import FoodPlanner from "./pages/food/FoodPlanner";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/todos" element={<Todos />} />
      <Route path="/finance" element={<Finance />} />
      <Route path="/accounts" element={<Accounts />} />
      <Route path="/food" element={<FoodPlanner />} />
    </Routes>
  );
}
