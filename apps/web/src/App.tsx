import { Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import { useEffect } from "react";

import Landing from "./pages/Landing";
import Join from "./pages/join/Join";
import AuthGate from "./components/AuthGate";
import GlobalHeader from "./components/GlobalHeader";
import { PrefsProvider } from "./prefs";
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
import WisdomLibrary from "./pages/wisdom/WisdomLibrary";
import Focus from "./pages/focus/Focus";
import Kiosk from "./pages/kiosk/Kiosk";
import { NoiseProvider } from "./noise";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

// The signed-in app lives behind /app/*; AuthGate handles auth + subscription.
function PrivateLayout() {
  return (
    <AuthGate>
      <PrefsProvider>
        <NoiseProvider>
          <GlobalHeader />
          <Outlet />
        </NoiseProvider>
      </PrefsProvider>
    </AuthGate>
  );
}

// Kiosk is full-screen with no app chrome.
function KioskLayout() {
  return (
    <AuthGate>
      <PrefsProvider>
        <NoiseProvider>
          <Kiosk />
        </NoiseProvider>
      </PrefsProvider>
    </AuthGate>
  );
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
      {/* ── Product (public — viewable signed-in or not) ── */}
      <Route path="/" element={<Landing />} />
      <Route path="/join" element={<Join />} />

      {/* ── Kiosk (signed-in, no chrome) ── */}
      <Route path="/app/kiosk" element={<KioskLayout />} />

      {/* ── App (signed-in) ── */}
      <Route path="/app" element={<PrivateLayout />}>
        <Route index element={<Home />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="notes" element={<Notes />} />
        <Route path="finance" element={<Finance />} />
        <Route path="accounts" element={<Accounts />} />
        <Route path="food" element={<FoodPlanner />} />
        <Route path="chores" element={<Chores />} />
        <Route path="maintenance" element={<Maintenance />} />
        <Route path="settings" element={<Settings />} />
        <Route path="subscribe" element={<Subscribe />} />
        <Route path="admin" element={<Admin />} />
        <Route path="wisdom" element={<WisdomLibrary />} />
        <Route path="focus" element={<Focus />} />
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Route>

      {/* Unknown top-level paths → product landing */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  );
}
