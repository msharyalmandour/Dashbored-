import Link from "next/link";
import { LayoutDashboard, Package, Receipt } from "lucide-react";
import { SITE } from "@/lib/constants";

const ADMIN_LINKS = [
  { href: "/admin", label: "نظرة عامة", icon: LayoutDashboard },
  { href: "/admin/orders", label: "الطلبات", icon: Receipt },
  { href: "/admin/products", label: "المنتجات", icon: Package },
];

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:flex-row lg:px-8">
      <aside className="lg:w-56 lg:shrink-0">
        <div className="mb-6">
          <span className="font-display gold-gradient-text text-xl">
            لوحة تحكم {SITE.name}
          </span>
        </div>
        <nav className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
          {ADMIN_LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="flex shrink-0 items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm text-foreground/85 transition-colors hover:border-gold hover:text-gold lg:shrink"
              >
                <Icon size={16} />
                {link.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex-1">{children}</div>
    </div>
  );
}
