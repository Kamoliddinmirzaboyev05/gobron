import { useState } from "react";
import { useLogin } from "../hooks/useAuth";
import { apiErrorMessage } from "../lib/api";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const login = useLogin();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) return;
    login.mutate({ username: username.trim(), password });
  }

  return (
    <div className="flex h-full items-center justify-center bg-gradient-to-br from-pitch-50 via-gray-100 to-gray-200 p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg ring-1 ring-gray-100"
      >
        <div className="mb-2 text-center text-3xl">⚽</div>
        <h1 className="mb-1 text-center text-xl font-bold text-gray-900">Gobron Superadmin</h1>
        <p className="mb-6 text-center text-xs text-gray-400">
          Platforma boshqaruv paneli
        </p>

        <label className="mb-1 block text-xs font-medium text-gray-500">Login</label>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="superadmin"
          autoComplete="username"
          autoFocus
          className="mb-4 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none ring-pitch-500 focus:bg-white focus:ring-2"
        />

        <label className="mb-1 block text-xs font-medium text-gray-500">Parol</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="current-password"
          className="mb-4 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none ring-pitch-500 focus:bg-white focus:ring-2"
        />

        {login.isError && (
          <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-center text-xs text-red-600">
            {apiErrorMessage(login.error, "Login yoki parol noto'g'ri")}
          </div>
        )}

        <button
          type="submit"
          disabled={login.isPending || !username.trim() || !password}
          className="w-full rounded-xl bg-pitch-600 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-pitch-700 disabled:opacity-60"
        >
          {login.isPending ? "Tekshirilmoqda..." : "Kirish"}
        </button>
      </form>
    </div>
  );
}
