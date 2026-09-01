import { mockProducts } from "@/data/mock-products";
import { ProductCard } from "@/components/shop/ProductCard";
import { ShopFilters } from "@/components/shop/ShopFilters";

export const metadata = {
  title: "المتجر | أثر",
};

export default async function ShopPage(props: PageProps<"/shop">) {
  const searchParams = await props.searchParams;
  const gender = typeof searchParams.gender === "string" ? searchParams.gender : "";
  const category = typeof searchParams.category === "string" ? searchParams.category : "";
  const sort = typeof searchParams.sort === "string" ? searchParams.sort : "";

  let products = mockProducts.filter((p) => {
    if (gender && p.gender !== gender) return false;
    if (category && p.category !== category) return false;
    return true;
  });

  if (sort === "price-asc") products = [...products].sort((a, b) => a.price - b.price);
  if (sort === "price-desc") products = [...products].sort((a, b) => b.price - a.price);

  const categories = Array.from(new Set(mockProducts.map((p) => p.category)));

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-12 text-center">
        <span className="text-xs tracking-[0.3em] text-gold">المتجر</span>
        <h1 className="font-display mt-3 text-4xl text-foreground">جميع العطور</h1>
      </div>

      <div className="grid gap-10 lg:grid-cols-[240px_1fr]">
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <ShopFilters categories={categories} />
        </aside>

        <div>
          <p className="mb-6 text-sm text-muted">{products.length} منتج</p>
          {products.length === 0 ? (
            <p className="py-20 text-center text-muted">
              لا توجد منتجات مطابقة لهذا الفلتر.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
