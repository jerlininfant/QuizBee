import { createClient } from '@supabase/supabase-js';
import { config } from './env.js';

let supabase = null;

if (config.supabaseUrl && config.supabaseKey) {
  try {
    supabase = createClient(config.supabaseUrl, config.supabaseKey, {
      auth: { persistSession: false }
    });
    console.log('[Database] Connected to Supabase successfully.');
  } catch (error) {
    console.warn('[Database] Failed to connect to Supabase, fallback store will be used:', error.message);
  }
} else {
  console.log('[Database] No Supabase credentials provided. Using authoritative local persistence store.');
}

export { supabase };
