import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';

export const CAPSULE_BUCKET = 'capsules';

/**
 * Service-role client. RLS denies anon on every capsule table, so this is the
 * only way in — keep it inside edge functions and never hand it to the browser.
 */
export function adminClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
