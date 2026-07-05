import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, tokens } from "../lib/api";
import { tokenPairSchema, userSchema, type User } from "../types";

/** Current admin (null when no session). Drives the login gate. */
export function useMe() {
  return useQuery({
    queryKey: ["me"],
    enabled: !!tokens.access,
    staleTime: Infinity,
    retry: false,
    queryFn: async (): Promise<User> => {
      const res = await api.get("/auth/me");
      return userSchema.parse(res.data);
    },
  });
}

/** OTP login for admins (phone + code). Backend dev mode accepts 111111. */
export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ phone, code }: { phone: string; code: string }) => {
      await api.post("/auth/otp/request", { phone });
      const res = await api.post("/auth/otp/verify", { phone, code });
      tokens.set(tokenPairSchema.parse(res.data));
      const me = await api.get("/auth/me");
      return userSchema.parse(me.data);
    },
    onSuccess: (user) => qc.setQueryData(["me"], user),
  });
}

export function logout() {
  tokens.clear();
  location.reload();
}
