import type { Order } from "@/lib/types";

/**
 * Placeholder for the Tap Payments integration (https://tap.company).
 * Not wired up yet — filled in once a Tap merchant account (compatible with
 * a freelance/self-employment license) is ready. Keep the request/response
 * shapes here so app/api/checkout/route.ts has a stable contract to call
 * against when this is implemented.
 */

export type CreateChargeParams = {
  order: Pick<Order, "orderNumber" | "total" | "customerName" | "customerEmail" | "customerPhone">;
  redirectUrl: string;
};

export type CreateChargeResult = {
  chargeId: string;
  paymentUrl: string;
};

export async function createTapCharge(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- signature kept stable for the future implementation
  _params: CreateChargeParams,
): Promise<CreateChargeResult> {
  throw new Error(
    "Tap Payments غير مفعّل بعد. أضف TAP_SECRET_KEY في .env.local وفعّل هذه الدالة عند ربط بوابة الدفع.",
  );
}
