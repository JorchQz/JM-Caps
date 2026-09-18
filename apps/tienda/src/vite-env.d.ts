/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  /** Número de WhatsApp de la tienda, a 10 dígitos. */
  readonly VITE_WHATSAPP: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
