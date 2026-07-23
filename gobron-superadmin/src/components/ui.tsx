import { Loader2, X, AlertTriangle } from "lucide-react";
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

export function Modal({
  title,
  onClose,
  children,
  maxWidth = "max-w-lg",
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: string;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`max-h-[90vh] w-full ${maxWidth} overflow-y-auto rounded-2xl bg-white shadow-2xl ring-1 ring-black/5`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white/95 px-5 py-4 backdrop-blur">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
            aria-label="Yopish"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

/** Professional confirm dialog — replaces window.confirm */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Tasdiqlash",
  cancelLabel = "Bekor qilish",
  variant = "danger",
  loading = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "primary";
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  const confirmCls =
    variant === "danger"
      ? "bg-red-600 hover:bg-red-700 focus:ring-red-200"
      : "bg-pitch-600 hover:bg-pitch-700 focus:ring-pitch-200";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]"
      onClick={loading ? undefined : onCancel}
      role="alertdialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-5">
          <div
            className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${
              variant === "danger" ? "bg-red-50 text-red-600" : "bg-pitch-50 text-pitch-600"
            }`}
          >
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {description && (
            <p className="mt-2 text-sm leading-relaxed text-gray-500">{description}</p>
          )}
        </div>
        <div className="mt-6 flex gap-2 border-t border-gray-100 bg-gray-50/80 px-5 py-4">
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition focus:outline-none focus:ring-4 disabled:opacity-60 ${confirmCls}`}
          >
            {loading ? "Kutilmoqda…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
