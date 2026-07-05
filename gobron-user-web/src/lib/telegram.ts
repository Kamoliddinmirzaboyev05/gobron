// Thin accessor for the Telegram Mini App SDK (loaded via index.html script).
// In a normal browser (dev) window.Telegram is undefined, so everything is
// null-guarded and callers fall back to the OTP dev login.

interface TelegramWebApp {
  initData: string;
  initDataUnsafe?: { user?: { id: number; first_name?: string } };
  ready: () => void;
  expand: () => void;
  colorScheme?: "light" | "dark";
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

export function getWebApp(): TelegramWebApp | undefined {
  return window.Telegram?.WebApp;
}

/** The signed initData string to send to POST /auth/telegram, or "" if none. */
export function getInitData(): string {
  return getWebApp()?.initData ?? "";
}

/** Tell Telegram the app is ready and expand to full height. Safe no-op in browser. */
export function initTelegram(): void {
  const wa = getWebApp();
  wa?.ready();
  wa?.expand();
}
