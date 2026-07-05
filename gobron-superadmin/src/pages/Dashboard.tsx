import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Wallet, CalendarCheck, MapPin, Percent } from "lucide-react";
import { useDashboard } from "../hooks/useStats";
import StatCard from "../components/StatCard";
import { Spinner } from "../components/ui";
import { formatNumber, formatPrice, percent } from "../lib/format";

export default function Dashboard() {
  const { data, isLoading } = useDashboard();
  if (isLoading || !data) return <Spinner />;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Umumiy daromad" value={formatPrice(data.total_revenue)} icon={Wallet} />
        <StatCard label="Bronlar" value={formatNumber(data.total_bookings)} icon={CalendarCheck} />
        <StatCard label="Faol maydonlar" value={formatNumber(data.active_fields)} icon={MapPin} />
        <StatCard label="Bandlik" value={percent(data.occupancy_rate)} icon={Percent} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <h2 className="mb-4 font-semibold">Daromad (kunlik)</h2>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data.revenue_series}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} tickFormatter={(d: string) => d.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} width={40} />
              <Tooltip formatter={(v: number) => formatPrice(v)} />
              <Area type="monotone" dataKey="revenue" stroke="#16a34a" fill="url(#rev)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <h2 className="mb-4 font-semibold">Mashhur vaqtlar</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.popular_slots}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="start_time" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={30} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="bookings" fill="#16a34a" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
