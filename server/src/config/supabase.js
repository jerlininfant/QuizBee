import { createClient } from '@supabase/supabase-js';
import { config } from './env.js';

let supabaseClient = null;
export let supabase = null;

export function initSupabase(url, key) {
  const targetUrl = url || process.env.SUPABASE_URL || config.supabaseUrl;
  const targetKey = key || process.env.SUPABASE_SERVICE_ROLE_KEY || config.supabaseKey;

  // Supabase service role keys must be valid JWTs or service role tokens; publishable keys or placeholders are not valid service keys
  const isInvalidPlaceholder = !targetKey ||
    targetKey.startsWith('sb_publishable_') ||
    targetKey.includes('your_supabase_key') ||
    targetUrl.includes('your_supabase_url');

  if (targetUrl && targetKey && !isInvalidPlaceholder) {
    try {
      supabaseClient = createClient(targetUrl, targetKey, {
        auth: { persistSession: false }
      });
      console.log('[Database] Connected to Supabase PostgreSQL successfully.');
      supabase = supabaseClient;
      return supabaseClient;
    } catch (error) {
      console.warn('[Database] Failed to connect to Supabase:', error.message);
      supabaseClient = null;
      supabase = null;
      return null;
    }
  }

  supabaseClient = null;
  supabase = null;
  return null;
}

// Initial initialization attempt
initSupabase();

export function getSupabase() {
  if (!supabaseClient) {
    initSupabase();
  }
  return supabaseClient;
}
