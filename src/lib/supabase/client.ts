import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../types/database.types';

let browserClient: SupabaseClient<Database> | null = null;

/**
 * Crea o retorna una instancia singleton del cliente Supabase para el navegador
 */
export function createBrowserClient(): SupabaseClient<Database> {
  if (browserClient) return browserClient;

  const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : ({} as Record<string, string | undefined>);
  const supabaseUrl = env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
  const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key';

  // Fallback para ejecución de suites de pruebas CLI en Node < 22 sin WebSocket global nativo
  if (typeof globalThis.WebSocket === 'undefined') {
    (globalThis as Record<string, unknown>).WebSocket = class MockWebSocket {
      readyState = 3;
      close() {}
      send() {}
      addEventListener() {}
      removeEventListener() {}
    };
  }

  browserClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 20,
      },
    },
  });

  return browserClient;
}

export const supabase = createBrowserClient();
