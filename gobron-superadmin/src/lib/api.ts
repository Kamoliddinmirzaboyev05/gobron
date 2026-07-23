import axios, { AxiosError } from "axios";

const BASE_URL =
  import.meta.env.VITE_API_URL ?? "https://gobronapi.webportfolio.uz/api/v1";

const ACCESS_KEY = "gobron_admin_access";
const REFRESH_KEY = "gobron_admin_refresh";
const EXPIRY_KEY = "gobron_admin_expiry";

export const tokens = {
  get access() {
    return localStorage.getItem(ACCESS_KEY);
  },
  get refresh() {
    return localStorage.getItem(REFRESH_KEY);
  },
  set(pair: {
    access_token: string;
    refresh_token: string;
    expires_in?: number;
  }) {
    localStorage.setItem(ACCESS_KEY, pair.access_token);
    localStorage.setItem(REFRESH_KEY, pair.refresh_token);
    const secs = pair.expires_in ?? 86400;
    localStorage.setItem(EXPIRY_KEY, String(Date.now() + secs * 1000));
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(EXPIRY_KEY);
  },
};

/** Human-readable API error message. */
export function apiErrorMessage(err: unknown, fallback = "Xatolik yuz berdi"): string {
  if (axios.isAxiosError(err)) {
    const detail = err.response?.data?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      return detail.map((d) => d.msg ?? JSON.stringify(d)).join(", ");
    }
    if (err.response?.status === 401) return "Sessiya tugadi. Qayta kiring.";
    if (err.response?.status === 403) return "Ruxsat yo'q.";
    if (err.response?.status === 404) return "Topilmadi.";
    if (err.message === "Network Error") return "Serverga ulanib bo'lmadi.";
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

export const api = axios.create({ baseURL: BASE_URL, timeout: 30_000 });

api.interceptors.request.use((config) => {
  const t = tokens.access;
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

let refreshing: Promise<string> | null = null;

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config!;
    const is401 = error.response?.status === 401;
    // @ts-expect-error custom retry flag
    if (!is401 || original._retried || !tokens.refresh) throw error;
    // @ts-expect-error custom retry flag
    original._retried = true;
    try {
      refreshing ??= axios
        .post(`${BASE_URL}/auth/refresh`, { refresh_token: tokens.refresh })
        .then((res) => {
          tokens.set(res.data);
          return res.data.access_token as string;
        });
      const newAccess = await refreshing;
      original.headers!.Authorization = `Bearer ${newAccess}`;
      return api(original);
    } catch (e) {
      tokens.clear();
      throw e;
    } finally {
      refreshing = null;
    }
  },
);
