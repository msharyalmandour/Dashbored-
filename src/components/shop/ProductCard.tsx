import Link from "next/link";
import { Star } from "lucide-react";
import type { Product } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import { PerfumeBottle } from "@/components/ui/PerfumeBottle";

export function ProductCard({ product }: { product: Product }) {
  return (
    <Link
      href={`/product/${product.slug}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-surface transition-colors hover:border-gold/60"
    >
      {product.compareAtPrice && (
        <span className="absolute right-4 top-4 z-10 rounded-full bg-gold px-3 py-1 text-[11px] font-bold text-background">
          خصم
        </span>
      )}
      {!product.inStock && (
        <span className="absolute left-4 top-4 z-10 rounded-full bg-background/80 px-3 py-1 text-[11px] text-muted">
          نفدت الكمية
        </span>
      )}

      <div className="relative flex aspect-square items-center justify-center bg-gradient-to-b from-surface-raised to-surface p-8">
        <PerfumeBottle
          accentColor={product.accentColor}
          className="h-full max-h-48 w-auto transition-transform duration-500 group-hover:scale-105"
        />
      </div>

      <div className="flex flex-1 flex-col gap-2 p-5">
        <span className="text-xs tracking-wide text-muted">{product.category}</span>
        <h3 className="font-display text-lg text-foreground">{product.name}</h3>

        {product.rating && (
          <div className="flex items-center gap-1 text-xs text-muted">
            <Star size={13} className="fill-gold text-gold" />
            <span>{product.rating}</span>
            <span>({product.reviewsCount})</span>
          </div>
        )}

        <div className="mt-auto flex items-center gap-2 pt-2">
          <span className="text-base font-bold text-gold">
            {formatPrice(product.price)}
          </span>
          {product.compareAtPrice && (
            <span className="text-sm text-muted line-through">
              {formatPrice(product.compareAtPrice)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
