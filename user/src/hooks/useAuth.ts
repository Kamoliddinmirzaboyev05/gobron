import { useQuery } from "@tanstack/react-query";
import { api, tokens } from "../lib/api";
import { getInitData } from "../lib/telegram";
import { tokenPairSchema, userSchema, type User } from "../types";

/**
 * Establish a session, then load the current user.
 *
 * 1. If we already have an access token, just fetch /auth/me.
 * 2. Inside Telegram, log in with signed initData.
 * 3. In a plain browser (dev), fall back to the OTP dev login so the app is
 *    usable without Telegram. Configure VITE_DEV_PHONE; the backend accepts the
 *    OTP_DEV_CODE master code.
 */
async function ensureSession(): Promise<User> {
  if (!tokens.access) {
    const initData = getInitData();
    if (initData) {
      const res = await api.post("/auth/telegram", { init_data: initData });
      tokens.set(tokenPairSchema.parse(res.data));
    } else if (import.meta.env.DEV) {
      const phone = import.meta.env.VITE_DEV_PHONE ?? "+998900000000";
      const code = import.meta.env.VITE_DEV_OTP ?? "111111";
      await api.post("/auth/otp/request", { phone });
      const res = await api.post("/auth/otp/verify", {
        phone,
        code,
        full_name: "Dev User",
      });
      tokens.set(tokenPairSchema.parse(res.data));
    } else {
      throw new Error("Please open this app from the Gobron Telegram bot.");
    }
  }
  const me = await api.get("/auth/me");
  return userSchema.parse(me.data);
}

export function useAuth() {
  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: ensureSession,
    staleTime: Infinity,
    retry: false,
  });
}
