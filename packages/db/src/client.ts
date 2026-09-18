import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types'

export type ClienteJMCaps = SupabaseClient<Database>

export type ConfigSupabase = {
  url: string
  anonKey: string
}

/**
 * Crea el cliente de Supabase del proyecto. La anon key es pública a propósito:
 * toda la protección real vive en las políticas RLS de la base.
 */
export function crearCliente({ url, anonKey }: ConfigSupabase): ClienteJMCaps {
  if (!url || !anonKey) {
    throw new Error(
      'Faltan las variables de entorno de Supabase. Copia .env.example a .env y llena los valores.',
    )
  }
  return createClient<Database>(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  })
}
