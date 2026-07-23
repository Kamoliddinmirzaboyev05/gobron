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
      <main className="flex-1">
        <Outlet />
      </main>

      <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="pointer-events-auto flex items-center justify-around rounded-2xl border border-white/60 bg-white/90 px-1 py-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.12)] backdrop-blur-xl">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-0.5 rounded-xl py-2 text-[10px] font-semibold transition ${
                  isActive
                    ? "bg-pitch-50 text-pitch-700"
                    : "text-gray-400 active:bg-gray-50"
                }`
              }
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
