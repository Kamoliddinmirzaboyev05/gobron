import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  MapPin,
  Users,
  Briefcase,
  CalendarCheck,
  Megaphone,
  LogOut,
  Wallet,
  Image,
  X,
} from "lucide-react";
import { logout, useMe } from "../hooks/useAuth";

const links = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/fields", label: "Maydonlar", icon: MapPin, end: false },
  { to: "/field-owners", label: "Maydon egalari", icon: Briefcase, end: false },
  { to: "/users", label: "Foydalanuvchilar", icon: Users, end: false },
  { to: "/bookings", label: "Bronlar", icon: CalendarCheck, end: false },
  { to: "/broadcasts", label: "E'lonlar", icon: Megaphone, end: false },
  { to: "/payments", label: "Obuna to'lovlari", icon: Wallet, end: false },
  { to: "/banners", label: "Bannerlar", icon: Image, end: false },
];

interface Props {
  open?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ open = false, onClose }: Props) {
  const { data: me } = useMe();

  const nav = (
    <>
      <div className="flex items-center justify-between px-6 py-5">
        <div className="text-lg font-bold text-pitch-600">
          ⚽ Gobron <span className="font-medium text-gray-400">superadmin</span>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 md:hidden"
            aria-label="Yopish"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-pitch-50 text-pitch-700 shadow-sm ring-1 ring-pitch-100"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
              }`
            }
          >
            <Icon className="h-5 w-5 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-gray-100 p-3">
        {me && (
          <div className="mb-2 truncate px-3 text-xs text-gray-400">
            {me.full_name || me.phone || "Superadmin"}
          </div>
        )}
        <button
          type="button"
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600"
        >
          <LogOut className="h-5 w-5" /> Chiqish
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-gray-200 bg-white md:flex">
        {nav}
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Yopish"
            onClick={onClose}
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-white shadow-xl">
            {nav}
          </aside>
        </div>
      )}
    </>
  );
}
