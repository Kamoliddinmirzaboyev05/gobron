import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";

export function Spinner() {
  return (
    <div className="flex justify-center py-16 text-pitch-600">
      <Loader2 className="h-6 w-6 animate-spin" />
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="py-16 text-center text-sm text-gray-400">{children}</div>;
}

const badgeStyles: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  confirmed: "bg-pitch-100 text-pitch-700",
  cancelled: "bg-gray-100 text-gray-500",
  completed: "bg-blue-100 text-blue-700",
  draft: "bg-gray-100 text-gray-600",
  sending: "bg-amber-100 text-amber-700",
  sent: "bg-pitch-100 text-pitch-700",
  failed: "bg-red-100 text-red-700",
  player: "bg-gray-100 text-gray-600",
  field_owner: "bg-indigo-100 text-indigo-700",
  superadmin: "bg-pitch-100 text-pitch-700",
};

export function Badge({ value, label }: { value: string; label?: string }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${badgeStyles[value] ?? "bg-gray-100 text-gray-600"}`}>
      {label ?? value}
    </span>
  );
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-semibold">{title}</h2>
        {children}
      </div>
    </div>
  );
}
