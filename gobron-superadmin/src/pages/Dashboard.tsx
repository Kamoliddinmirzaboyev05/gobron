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
import { Wallet, CalendarCheck, MapPin, Percent, RefreshCw } from "lucide-react";
import { useDashboard } from "../hooks/useStats";
import StatCard from "../components/StatCard";
import { Spinner } from "../components/ui";
import { formatNumber, formatPrice, percent } from "../lib/format";
import { apiErrorMessage } from "../lib/api";

export default function Dashboard() {
  const { data, isLoading, isError, error, refetch, isFetching } = useDashboard();

  if (isLoading) return <Spinner />;

  if (isError || !data) {
    return (
      <div className="rounded-2xl bg-white p-10 text-center shadow-sm ring-1 ring-gray-100">
        <p className="text-sm text-red-600">
          {apiErrorMessage(error, "Dashboard yuklanmadi")}
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-pitch-600 px-4 py-2 text-sm font-semibold text-white"
        >
          <RefreshCw className="h-4 w-4" /> Qayta yuklash
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-400">Umumiy platforma ko'rsatkichlari</p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-medium text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          Yangilash
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Umumiy daromad" value={formatPrice(data.total_revenue)} icon={Wallet} />
        <StatCard label="Bronlar" value={formatNumber(data.total_bookings)} icon={CalendarCheck} />
        <StatCard label="Faol maydonlar" value={formatNumber(data.active_fields)} icon={MapPin} />
        <StatCard label="Bandlik" value={percent(data.occupancy_rate)} icon={Percent} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <h2 className="mb-4 font-semibold">Daromad (kunlik)</h2>
          {data.revenue_series.length === 0 ? (
            <p className="py-16 text-center text-sm text-gray-400">Ma'lumot yo'q</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={data.revenue_series}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(d: string) => d.slice(5)}
                />
                <YAxis tick={{ fontSize: 11 }} width={40} />
                <Tooltip formatter={(v: number) => formatPrice(v)} />
                <Area type="monotone" dataKey="revenue" stroke="#16a34a" fill="url(#rev)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <h2 className="mb-4 font-semibold">Mashhur vaqtlar</h2>
          {data.popular_slots.length === 0 ? (
            <p className="py-16 text-center text-sm text-gray-400">Ma'lumot yo'q</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.popular_slots}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="start_time" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} width={30} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="bookings" fill="#16a34a" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
