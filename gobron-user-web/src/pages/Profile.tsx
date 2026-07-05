import { Phone, MapPin, LogOut } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { tokens } from "../lib/api";
import { Spinner } from "../components/ui";

export default function Profile() {
  const { data: user, isLoading } = useAuth();

  if (isLoading) return <Spinner />;
  if (!user) return null;

  function logout() {
    tokens.clear();
    location.reload();
  }

  return (
    <div className="px-4 py-6">
      <div className="flex flex-col items-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-pitch-100 text-3xl font-bold text-pitch-600">
          {(user.first_name?.[0] ?? "?").toUpperCase()}
        </div>
        <h1 className="mt-3 text-lg font-semibold">{user.full_name || "Foydalanuvchi"}</h1>
      </div>

      <div className="mt-6 grid gap-3">
        {user.phone && (
          <div className="flex items-center gap-3 rounded-xl bg-white p-4 ring-1 ring-gray-100">
            <Phone className="h-5 w-5 text-pitch-600" />
            <span className="text-sm">{user.phone}</span>
          </div>
        )}
        {(user.region || user.city) && (
          <div className="flex items-center gap-3 rounded-xl bg-white p-4 ring-1 ring-gray-100">
            <MapPin className="h-5 w-5 text-pitch-600" />
            <span className="text-sm">{[user.region, user.city].filter(Boolean).join(", ")}</span>
          </div>
        )}
      </div>

      <button
        onClick={logout}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-600"
      >
        <LogOut className="h-4 w-4" /> Chiqish
      </button>
    </div>
  );
}
