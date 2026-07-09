import { Routes, Route } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Fields from "./pages/Fields";
import FieldDetail from "./pages/FieldDetail";
import MyBookings from "./pages/MyBookings";
import Profile from "./pages/Profile";
import { ErrorBox, Spinner } from "./components/ui";

export default function App() {
  // Gate the whole app on an established session (Telegram or dev OTP).
  const { isLoading, error } = useAuth();

  if (isLoading)
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner />
      </div>
    );
  if (error)
    return <ErrorBox message={(error as Error).message ?? "Kirishda xatolik"} />;

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="fields" element={<Fields />} />
        <Route path="fields/:id" element={<FieldDetail />} />
        <Route path="bookings" element={<MyBookings />} />
        <Route path="profile" element={<Profile />} />
      </Route>
    </Routes>
  );
}
