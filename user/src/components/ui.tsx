import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";

export function Spinner() {
  return (
    <div className="flex justify-center py-10 text-pitch-600">
      <Loader2 className="h-6 w-6 animate-spin" />
    </div>
  );
}

export function ErrorBox({ message }: { message: string }) {
  return (
    <div className="mx-4 my-6 rounded-lg bg-red-50 p-4 text-sm text-red-700">
      {message}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="py-16 text-center text-sm text-gray-400">{children}</div>;
}
