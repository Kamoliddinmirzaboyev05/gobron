import { NavLink, Outlet } from "react-router-dom";
import { Home, Search, CalendarCheck, User } from "lucide-react";

const nav = [
  { to: "/", label: "Asosiy", icon: Home, end: true },
  { to: "/fields", label: "Maydonlar", icon: Search, end: false },
  { to: "/bookings", label: "Bronlar", icon: CalendarCheck, end: false },
  { to: "/profile", label: "Profil", icon: User, end: false },
];

export default function Layout() {
  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col bg-gray-50">
      <main className="flex-1 pb-20">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 mx-auto flex max-w-md justify-around border-t border-gray-200 bg-white/95 backdrop-blur">
        {nav.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs ${
                isActive ? "text-pitch-600" : "text-gray-400"
              }`
            }
          >
            <Icon className="h-5 w-5" />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
