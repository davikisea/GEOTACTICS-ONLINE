import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../types/database.types';

function getSafeEnv(nodeKey: string, viteKey: string, fallback: string): string {
  if (typeof process !== 'undefined' && process.env && process.env[nodeKey]) {
    return process.env[nodeKey]!;
  }
  if (typeof import.meta !== 'undefined' && import.meta.env && (import.meta.env as any)[viteKey]) {
    return (import.meta.env as any)[viteKey] as string;
  }
  return fallback;
}

/**
 * Crea un cliente Supabase con privilegios administrativos (Service Role)
 * EXCLUSIVO para uso del lado del servidor (Edge Functions, Webhooks, API Routes)
 * NUNCA exponer la llave SUPABASE_SERVICE_ROLE_KEY al cliente navegador.
 */
export function createAdminClient(): SupabaseClient<Database> {
  const supabaseUrl = getSafeEnv('SUPABASE_URL', 'VITE_SUPABASE_URL', 'https://placeholder.supabase.co');
  const serviceRoleKey = getSafeEnv('SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'placeholder-service-key');

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Crea un cliente de servidor con el token Bearer del usuario autenticado
 * para respetar las políticas Row Level Security (RLS) en Edge Functions y Server Components
 */
export function createServerClientWithToken(userToken: string): SupabaseClient<Database> {
  const supabaseUrl = getSafeEnv('SUPABASE_URL', 'VITE_SUPABASE_URL', 'https://placeholder.supabase.co');
  const anonKey = getSafeEnv('SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY', 'placeholder-anon-key');

  return createClient<Database>(supabaseUrl, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${userToken}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
