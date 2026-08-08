import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!supabaseClient) {
    const supabaseUrl = process.env.SUPABASE_URL || 'https://kilqyvpuchunjipzjdye.supabase.co';
    const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_xt1OHzxtFz35wkpzmXeqOA_qNdbu-G4';
    
    supabaseClient = createClient(supabaseUrl, supabaseKey);
  }
  return supabaseClient;
}
