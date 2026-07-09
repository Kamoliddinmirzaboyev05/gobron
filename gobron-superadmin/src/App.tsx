import { Routes, Route } from "react-router-dom";
import { tokens } from "./lib/api";
import { logout, useMe } from "./hooks/useAuth";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Fields from "./pages/Fields";
import FieldSlots from "./pages/FieldSlots";
import FieldOwners from "./pages/FieldOwners";
import Users from "./pages/Users";
import Bookings from "./pages/Bookings";
import Broadcasts from "./pages/Broadcasts";
import Payments from "./pages/Payments";
import Banners from "./pages/Banners";
import { Spinner } from "./components/ui";

export default function App() {
  const hasToken = !!tokens.access;
  const { data: user, isLoading } = useMe();

  if (!hasToken) return <Login />;
  if (isLoading) return <Spinner />;

  // Only superadmins may use this panel.
  if (user && user.role !== "superadmin") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
        <p className="text-gray-500">Bu panelga faqat superadmin kira oladi.</p>
        <button onClick={logout} className="rounded-lg bg-pitch-600 px-4 py-2 text-sm font-semibold text-white">
          Chiqish
        </button>
      </div>
    );
  }
  if (!user) return <Login />;

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="fields" element={<Fields />} />
        <Route path="fields/:id/slots" element={<FieldSlots />} />
        <Route path="field-owners" element={<FieldOwners />} />
        <Route path="users" element={<Users />} />
        <Route path="bookings" element={<Bookings />} />
        <Route path="broadcasts" element={<Broadcasts />} />
        <Route path="payments" element={<Payments />} />
        <Route path="banners" element={<Banners />} />
      </Route>
    </Routes>
  );
}
