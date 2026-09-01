export type Gender = "men" | "women" | "unisex";

export type Concentration = "Eau de Parfum" | "Eau de Toilette" | "Parfum" | "معطر عود";

export type Product = {
  id: string;
  slug: string;
  name: string;
  description: string;
  notes: {
    top: string[];
    heart: string[];
    base: string[];
  };
  price: number;
  compareAtPrice?: number;
  concentration: Concentration;
  volumeMl: number;
  gender: Gender;
  category: string;
  collection?: string;
  accentColor: string;
  inStock: boolean;
  featured?: boolean;
  rating?: number;
  reviewsCount?: number;
  sku: string;
};

export type CartItem = {
  productId: string;
  slug: string;
  name: string;
  price: number;
  accentColor: string;
  volumeMl: number;
  quantity: number;
};

export type OrderStatus =
  | "pending"
  | "paid"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

export type PaymentMethod = "mada" | "visa" | "applepay" | "cod";

export type OrderItem = CartItem;

export type Order = {
  id: string;
  orderNumber: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  city: string;
  address: string;
  items: OrderItem[];
  subtotal: number;
  shippingFee: number;
  total: number;
  status: OrderStatus;
  paymentMethod?: PaymentMethod;
  tapChargeId?: string;
  createdAt: string;
};

export type Customer = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  city?: string;
  address?: string;
  createdAt: string;
};
