import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Notes from "./pages/notes/Notes";
import Finance from "./pages/finance/Finance";
import Accounts from "./pages/accounts/Accounts";
import FoodPlanner from "./pages/food/FoodPlanner";
import Calendar from "./pages/calendar/Calendar";
import Chores from "./pages/chores/Chores";
import Maintenance from "./pages/maintenance/Maintenance";
import Settings from "./pages/settings/Settings";
import Admin from "./pages/admin/Admin";
import Subscribe from "./pages/Subscribe";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/calendar" element={<Calendar />} />
      <Route path="/notes" element={<Notes />} />
      <Route path="/finance" element={<Finance />} />
      <Route path="/accounts" element={<Accounts />} />
      <Route path="/food" element={<FoodPlanner />} />
      <Route path="/chores" element={<Chores />} />
      <Route path="/maintenance" element={<Maintenance />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/subscribe" element={<Subscribe />} />
    </Routes>
  );
}
