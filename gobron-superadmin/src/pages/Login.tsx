import { useState } from "react";
import { useLogin } from "../hooks/useAuth";

export default function Login() {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const login = useLogin();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    login.mutate({ phone: phone.trim(), code: code.trim() });
  }

  return (
    <div className="flex h-full items-center justify-center bg-gray-100 p-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm">
        <div className="mb-6 text-center text-2xl font-bold text-pitch-600">⚽ Gobron admin</div>
        <label className="mb-1 block text-xs text-gray-500">Telefon raqam</label>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+998901234567"
          className="mb-4 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
        <label className="mb-1 block text-xs text-gray-500">Kod (OTP)</label>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="111111"
          className="mb-4 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
        {login.isError && (
          <p className="mb-3 text-center text-xs text-red-600">
            Kirishda xatolik. Raqam yoki kodni tekshiring.
          </p>
        )}
        <button
          disabled={login.isPending}
          className="w-full rounded-lg bg-pitch-600 py-2.5 font-semibold text-white disabled:opacity-60"
        >
          {login.isPending ? "..." : "Kirish"}
        </button>
      </form>
    </div>
  );
}
