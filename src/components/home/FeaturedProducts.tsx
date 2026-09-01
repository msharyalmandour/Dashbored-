import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ProductCard } from "@/components/shop/ProductCard";
import { getFeaturedProducts } from "@/data/mock-products";

export function FeaturedProducts() {
  const products = getFeaturedProducts();

  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="mb-12 flex flex-col items-center gap-3 text-center">
        <span className="text-xs tracking-[0.3em] text-gold">مختارات الدار</span>
        <h2 className="font-display text-3xl text-foreground sm:text-4xl">
          العطور الأكثر تميزاً
        </h2>
        <div className="gold-divider w-16" />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      <div className="mt-12 flex justify-center">
        <Link
          href="/shop"
          className="inline-flex items-center gap-2 text-sm tracking-wide text-gold hover:text-gold-light"
        >
          استعرض جميع المنتجات
          <ArrowLeft size={16} />
        </Link>
      </div>
    </section>
  );
}
