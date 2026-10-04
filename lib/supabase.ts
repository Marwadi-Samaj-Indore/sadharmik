import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * The service-role client. It bypasses Row Level Security, which is exactly
 * why it must never leave the server: every table is locked to the public key,
 * and this client is the only way in. Permission checks happen in our own code
 * before any write (see lib/session.ts canEdit).
 *
 * Created lazily so a missing key surfaces as a clear runtime error rather than
 * breaking the build.
 */
let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Supabase is not configured. Copy .env.local.example to .env.local and " +
        "fill in NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  client = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
