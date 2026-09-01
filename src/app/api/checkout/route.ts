import { NextResponse } from "next/server";

/**
 * Will create a Supabase order + a Tap Payments charge and return the
 * payment redirect URL. Not implemented yet — see src/lib/payments/tap.ts
 * and supabase/schema.sql for the pieces this will wire together.
 */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "بوابة الدفع غير مفعّلة بعد. أكمل إعداد Supabase و Tap Payments في .env.local أولاً.",
    },
    { status: 501 },
  );
}
