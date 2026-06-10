import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";

import Landing from "./pages/Landing";
import Join from "./pages/join/Join";
import AuthGate from "./components/AuthGate";
import GlobalHeader from "./components/GlobalHeader";
import Home from "./pages/Home";
import Calendar from "./pages/calendar/Calendar";
import Notes from "./pages/notes/Notes";
import Finance from "./pages/finance/Finance";
import Accounts from "./pages/accounts/Accounts";
import FoodPlanner from "./pages/food/FoodPlanner";
import Chores from "./pages/chores/Chores";
import Maintenance from "./pages/maintenance/Maintenance";
import Settings from "./pages/settings/Settings";
import Subscribe from "./pages/Subscribe";
import Admin from "./pages/admin/Admin";

function LandingRoute() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  useEffect(() => onAuthStateChanged(auth, u => setLoggedIn(!!u)), []);
  if (loggedIn === null) return null;
  if (loggedIn) return <Navigate to="/home" replace />;
  return <Landing />;
}

function PrivateLayout() {
  return (
    <AuthGate>
      <GlobalHeader />
      <Outlet />
    </AuthGate>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingRoute />} />
      <Route path="/join" element={<Join />} />
      <Route element={<PrivateLayout />}>
        <Route path="/home" element={<Home />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/notes" element={<Notes />} />
        <Route path="/finance" element={<Finance />} />
        <Route path="/accounts" element={<Accounts />} />
        <Route path="/food" element={<FoodPlanner />} />
        <Route path="/chores" element={<Chores />} />
        <Route path="/maintenance" element={<Maintenance />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/subscribe" element={<Subscribe />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Route>
    </Routes>
  );
}
