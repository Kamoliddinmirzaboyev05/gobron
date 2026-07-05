import type { LucideIcon } from "lucide-react";

export default function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-pitch-100 text-pitch-600">
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-xl font-bold">{value}</p>
      </div>
    </div>
  );
}
