/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_DEV_PHONE?: string;
  readonly VITE_DEV_OTP?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
