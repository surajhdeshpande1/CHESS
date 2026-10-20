import { createClient, SupabaseClient } from '@supabase/supabase-js';

const STORAGE_CUSTOM_URL = 'supabase_custom_url_v1';
const STORAGE_CUSTOM_KEY = 'supabase_custom_key_v1';

let cachedClient: SupabaseClient | null = null;
let cachedConfigKey: string = '';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  source: 'ENV' | 'CUSTOM' | 'NONE';
}

/**
 * Resolves current Supabase configuration:
 * Priority: 1. Runtime override in localStorage -> 2. Vite environment variables
 */
export function getSupabaseConfig(): SupabaseConfig {
  const customUrl = localStorage.getItem(STORAGE_CUSTOM_URL);
  const customKey = localStorage.getItem(STORAGE_CUSTOM_KEY);

  if (customUrl && customKey) {
    return {
      url: customUrl.trim(),
      anonKey: customKey.trim(),
      source: 'CUSTOM',
    };
  }

  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (envUrl && envKey && typeof envUrl === 'string' && typeof envKey === 'string' && envUrl.startsWith('http')) {
    return {
      url: envUrl.trim(),
      anonKey: envKey.trim(),
      source: 'ENV',
    };
  }

  return {
    url: '',
    anonKey: '',
    source: 'NONE',
  };
}

export function isSupabaseConfigured(): boolean {
  const config = getSupabaseConfig();
  return Boolean(config.url && config.anonKey && config.url.startsWith('http'));
}

/**
 * Returns active Supabase client singleton, or null if unconfigured
 */
export function getSupabaseClient(): SupabaseClient | null {
  const config = getSupabaseConfig();
  if (!config.url || !config.anonKey) {
    return null;
  }

  const currentKey = `${config.url}::${config.anonKey}`;
  if (cachedClient && cachedConfigKey === currentKey) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
    cachedConfigKey = currentKey;
    return cachedClient;
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    return null;
  }
}

/**
 * Persist custom Supabase credentials from UI settings
 */
export function saveSupabaseCredentials(url: string, anonKey: string): void {
  const cleanUrl = url.trim();
  const cleanKey = anonKey.trim();
  if (cleanUrl) {
    localStorage.setItem(STORAGE_CUSTOM_URL, cleanUrl);
  } else {
    localStorage.removeItem(STORAGE_CUSTOM_URL);
  }

  if (cleanKey) {
    localStorage.setItem(STORAGE_CUSTOM_KEY, cleanKey);
  } else {
    localStorage.removeItem(STORAGE_CUSTOM_KEY);
  }

  cachedClient = null;
  cachedConfigKey = '';
}

/**
 * Clear custom credentials
 */
export function clearSupabaseCredentials(): void {
  localStorage.removeItem(STORAGE_CUSTOM_URL);
  localStorage.removeItem(STORAGE_CUSTOM_KEY);
  cachedClient = null;
  cachedConfigKey = '';
}

/**
 * Test connectivity against Supabase instance
 */
export async function testSupabaseConnection(): Promise<{ success: boolean; message: string; latencyMs?: number }> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      message: 'Supabase URL and Anon Key are not configured. Please supply your credentials.',
    };
  }

  const start = performance.now();
  try {
    // Ping tournaments table
    const { error, count } = await client
      .from('tournaments')
      .select('id', { count: 'exact', head: true });

    const latencyMs = Math.round(performance.now() - start);

    if (error) {
      // If table doesn't exist yet, we still know authentication works
      if (error.code === '42P01') {
        return {
          success: true,
          message: `Connected to Supabase in ${latencyMs}ms, but the 'tournaments' table was not found. Run the SQL schema script in your Supabase SQL Editor.`,
          latencyMs,
        };
      }
      return {
        success: false,
        message: `Supabase error (${error.code}): ${error.message}`,
        latencyMs,
      };
    }

    return {
      success: true,
      message: `Successfully connected to Supabase in ${latencyMs}ms! (${count ?? 0} tournaments indexed)`,
      latencyMs,
    };
  } catch (err: unknown) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Network error connecting to Supabase instance',
    };
  }
}
