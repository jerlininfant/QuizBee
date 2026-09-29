import { createClient } from '@supabase/supabase-js';
import { config } from './env.js';

let supabaseClient = null;

export function initSupabase(url, key) {
  const targetUrl = url || process.env.SUPABASE_URL || config.supabaseUrl;
  const targetKey = key || process.env.SUPABASE_SERVICE_ROLE_KEY || config.supabaseKey;

  if (targetUrl && targetKey) {
    try {
      supabaseClient = createClient(targetUrl, targetKey, {
        auth: { persistSession: false }
      });
      console.log('[Database] Connected to Supabase PostgreSQL successfully.');
      return supabaseClient;
    } catch (error) {
      console.warn('[Database] Failed to connect to Supabase:', error.message);
      supabaseClient = null;
      return null;
    }
  }

  supabaseClient = null;
  return null;
}

// Initial initialization attempt
initSupabase();

export const supabase = supabaseClient;
export function getSupabase() {
  if (!supabaseClient) {
    initSupabase();
  }
  return supabaseClient;
}
