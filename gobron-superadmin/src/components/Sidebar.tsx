import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  MapPin,
  Users,
  CalendarCheck,
  Megaphone,
  LogOut,
} from "lucide-react";
import { logout } from "../hooks/useAuth";

const links = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/fields", label: "Maydonlar", icon: MapPin, end: false },
  { to: "/users", label: "Foydalanuvchilar", icon: Users, end: false },
  { to: "/bookings", label: "Bronlar", icon: CalendarCheck, end: false },
  { to: "/broadcasts", label: "E'lonlar", icon: Megaphone, end: false },
];

export default function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-gray-200 bg-white md:flex">
      <div className="flex items-center gap-2 px-6 py-5 text-lg font-bold text-pitch-600">
        ⚽ Gobron <span className="text-gray-400">admin</span>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${
                isActive ? "bg-pitch-50 text-pitch-700" : "text-gray-500 hover:bg-gray-50"
              }`
            }
          >
            <Icon className="h-5 w-5" />
            {label}
          </NavLink>
        ))}
      </nav>
      <button
        onClick={logout}
        className="m-3 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-500 hover:bg-gray-50"
      >
        <LogOut className="h-5 w-5" /> Chiqish
      </button>
    </aside>
  );
}
