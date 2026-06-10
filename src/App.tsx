import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";

import Landing from "./pages/Landing";
import Join from "./pages/join/Join";
import Display from "./pages/display/Display";
import AuthGate from "./components/AuthGate";
import GlobalHeader from "./components/GlobalHeader";
import Home from "./pages/Home";
import Todos from "./pages/todos/Todos";
import Finance from "./pages/finance/Finance";
import Accounts from "./pages/accounts/Accounts";
import FoodPlanner from "./pages/food/FoodPlanner";
import Subscribe from "./pages/Subscribe";
import Admin from "./pages/admin/Admin";
import HouseholdSettings from "./pages/settings/Household";

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
      <Route path="/display" element={<Display />} />
      <Route path="/join" element={<Join />} />
      <Route element={<PrivateLayout />}>
        <Route path="/home" element={<Home />} />
        <Route path="/todos" element={<Todos />} />
        <Route path="/finance" element={<Finance />} />
        <Route path="/accounts" element={<Accounts />} />
        <Route path="/food" element={<FoodPlanner />} />
        <Route path="/subscribe" element={<Subscribe />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/settings/household" element={<HouseholdSettings />} />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Route>
    </Routes>
  );
}
