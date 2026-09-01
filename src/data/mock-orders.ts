import type { Order } from "@/lib/types";

/**
 * Placeholder orders for the admin dashboard until Supabase's `orders`
 * table is connected (see supabase/schema.sql).
 */
export const mockOrders: Order[] = [
  {
    id: "o1",
    orderNumber: "ATH-000231",
    customerName: "سارة العتيبي",
    customerPhone: "+966500000001",
    city: "الرياض",
    address: "حي الملقا، شارع الأمير سلطان",
    items: [
      {
        productId: "2",
        slug: "layali-alharir",
        name: "ليالي الحرير",
        price: 480,
        accentColor: "#b76e79",
        volumeMl: 90,
        quantity: 1,
      },
    ],
    subtotal: 480,
    shippingFee: 0,
    total: 480,
    status: "processing",
    paymentMethod: "mada",
    createdAt: "2026-08-28T10:20:00.000Z",
  },
  {
    id: "o2",
    orderNumber: "ATH-000230",
    customerName: "فهد القحطاني",
    customerPhone: "+966500000002",
    city: "جدة",
    address: "حي الروضة، شارع فلسطين",
    items: [
      {
        productId: "1",
        slug: "oud-al-mulook",
        name: "عود الملوك",
        price: 620,
        accentColor: "#caa14d",
        volumeMl: 50,
        quantity: 1,
      },
      {
        productId: "5",
        slug: "misk-alghazal",
        name: "مسك الغزال",
        price: 350,
        accentColor: "#d9c7a3",
        volumeMl: 60,
        quantity: 1,
      },
    ],
    subtotal: 970,
    shippingFee: 0,
    total: 970,
    status: "shipped",
    paymentMethod: "applepay",
    createdAt: "2026-08-26T15:05:00.000Z",
  },
  {
    id: "o3",
    orderNumber: "ATH-000229",
    customerName: "نورة الدوسري",
    customerPhone: "+966500000003",
    city: "الدمام",
    address: "حي الشاطئ",
    items: [
      {
        productId: "6",
        slug: "prestige-noir",
        name: "برستيج نوار",
        price: 590,
        accentColor: "#3d3d3d",
        volumeMl: 100,
        quantity: 1,
      },
    ],
    subtotal: 590,
    shippingFee: 25,
    total: 615,
    status: "pending",
    paymentMethod: "visa",
    createdAt: "2026-08-24T09:40:00.000Z",
  },
];
