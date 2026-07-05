import axios, { AxiosError } from "axios";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api/v1";

const ACCESS_KEY = "gobron_admin_access";
const REFRESH_KEY = "gobron_admin_refresh";

export const tokens = {
  get access() {
    return localStorage.getItem(ACCESS_KEY);
  },
  get refresh() {
    return localStorage.getItem(REFRESH_KEY);
  },
  set({ access_token, refresh_token }: { access_token: string; refresh_token: string }) {
    localStorage.setItem(ACCESS_KEY, access_token);
    localStorage.setItem(REFRESH_KEY, refresh_token);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

export const api = axios.create({ baseURL: BASE_URL });

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
