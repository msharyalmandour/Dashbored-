import { NextResponse } from "next/server";

/**
 * Will receive Tap Payments charge webhooks (charge.captured, charge.failed, ...),
 * verify the signature, and update the matching order's status in Supabase.
 * Not implemented yet.
 */
export async function POST() {
  return NextResponse.json({ received: false, reason: "not_configured" }, { status: 501 });
}
