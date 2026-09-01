import { notFound } from "next/navigation";
import { Star } from "lucide-react";
import { getProductBySlug, mockProducts } from "@/data/mock-products";
import { PerfumeBottle } from "@/components/ui/PerfumeBottle";
import { AddToCartForm } from "@/components/product/AddToCartForm";
import { formatPrice } from "@/lib/utils";

export function generateStaticParams() {
  return mockProducts.map((p) => ({ slug: p.slug }));
}

export default async function ProductPage(props: PageProps<"/product/[slug]">) {
  const { slug } = await props.params;
  const product = getProductBySlug(slug);

  if (!product) notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="grid gap-12 lg:grid-cols-2">
        <div className="flex items-center justify-center rounded-2xl border border-border bg-gradient-to-b from-surface-raised to-surface p-16">
          <PerfumeBottle accentColor={product.accentColor} className="h-80 w-auto" />
        </div>

        <div>
          <span className="text-xs tracking-wide text-muted">{product.category}</span>
          <h1 className="font-display mt-2 text-3xl text-foreground sm:text-4xl">
            {product.name}
          </h1>

          {product.rating && (
            <div className="mt-3 flex items-center gap-1 text-sm text-muted">
              <Star size={14} className="fill-gold text-gold" />
              <span>{product.rating}</span>
              <span>({product.reviewsCount} تقييم)</span>
            </div>
          )}

          <div className="mt-5 flex items-center gap-3">
            <span className="text-2xl font-bold text-gold">
              {formatPrice(product.price)}
            </span>
            {product.compareAtPrice && (
              <span className="text-base text-muted line-through">
                {formatPrice(product.compareAtPrice)}
              </span>
            )}
          </div>

          <p className="mt-6 leading-8 text-foreground/85">{product.description}</p>

          <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-muted">التركيز</dt>
              <dd className="mt-1 text-foreground">{product.concentration}</dd>
            </div>
            <div>
              <dt className="text-muted">الحجم</dt>
              <dd className="mt-1 text-foreground">{product.volumeMl} مل</dd>
            </div>
          </dl>

          <div className="gold-divider my-8" />

          <div className="space-y-3 text-sm">
            <p>
              <span className="font-bold text-gold">مقدمة العطر: </span>
              {product.notes.top.join("، ")}
            </p>
            <p>
              <span className="font-bold text-gold">قلب العطر: </span>
              {product.notes.heart.join("، ")}
            </p>
            <p>
              <span className="font-bold text-gold">قاعدة العطر: </span>
              {product.notes.base.join("، ")}
            </p>
          </div>

          <div className="mt-10">
            <AddToCartForm product={product} />
          </div>
        </div>
      </div>
    </div>
  );
}
