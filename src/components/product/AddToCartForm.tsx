"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import type { Product } from "@/lib/types";

export function AddToCartForm({ product }: { product: Product }) {
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const { addItem } = useCart();
  const router = useRouter();

  function handleAdd() {
    addItem({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      price: product.price,
      accentColor: product.accentColor,
      volumeMl: product.volumeMl,
      quantity,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center rounded-full border border-border">
          <button
            type="button"
            aria-label="تقليل الكمية"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="p-3 text-foreground hover:text-gold"
          >
            <Minus size={16} />
          </button>
          <span className="w-8 text-center text-sm">{quantity}</span>
          <button
            type="button"
            aria-label="زيادة الكمية"
            onClick={() => setQuantity((q) => q + 1)}
            className="p-3 text-foreground hover:text-gold"
          >
            <Plus size={16} />
          </button>
        </div>

        <button
          type="button"
          disabled={!product.inStock}
          onClick={handleAdd}
          className="flex-1 rounded-full bg-gold py-3.5 text-sm font-bold text-background transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {product.inStock ? "أضف إلى السلة" : "غير متوفر حالياً"}
        </button>
      </div>

      {added && (
        <p className="text-center text-xs text-gold">
          تمت إضافة المنتج إلى السلة ✦{" "}
          <button
            type="button"
            onClick={() => router.push("/cart")}
            className="underline underline-offset-2"
          >
            عرض السلة
          </button>
        </p>
      )}
    </div>
  );
}
