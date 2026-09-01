import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase client. Requires NEXT_PUBLIC_SUPABASE_URL and
 * NEXT_PUBLIC_SUPABASE_ANON_KEY to be set (see .env.local.example).
 * Not called anywhere yet — pages currently render from src/data/mock-products.ts
 * until the Supabase project is connected.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
