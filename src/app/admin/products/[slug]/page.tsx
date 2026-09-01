import { notFound } from "next/navigation";
import { getProductBySlug } from "@/data/mock-products";
import { ProductForm } from "@/components/admin/ProductForm";

export default async function EditProductPage(props: PageProps<"/admin/products/[slug]">) {
  const { slug } = await props.params;
  const product = getProductBySlug(slug);

  if (!product) notFound();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-3xl text-foreground">تعديل المنتج</h1>
      <ProductForm product={product} />
    </div>
  );
}
