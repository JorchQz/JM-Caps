import { crearCliente } from '@jm-caps/db'

export const supabase = crearCliente({
  url: import.meta.env.VITE_SUPABASE_URL,
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
})
