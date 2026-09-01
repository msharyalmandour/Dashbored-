import { ProductForm } from "@/components/admin/ProductForm";

export default function NewProductPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-3xl text-foreground">إضافة منتج جديد</h1>
      <ProductForm />
    </div>
  );
}
