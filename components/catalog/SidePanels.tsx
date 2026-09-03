"use client";

import { getCategoryById, getPartById } from "@/lib/catalog-data";
import { PartArt } from "./PartArt";
import { usePlatform } from "./PlatformContext";

function Backdrop({ onClose }: { onClose: () => void }) {
  return (
    <button
      aria-label="إغلاق"
      onClick={onClose}
      className="absolute inset-0 bg-bg/80 backdrop-blur-sm"
    />
  );
}

export function FavoritesPanel() {
  const { favoritesOpen, setFavoritesOpen, favorites, toggleFavorite, openPart } =
    usePlatform();
  if (!favoritesOpen) return null;

  const list = [...favorites].map(getPartById).filter((p): p is NonNullable<typeof p> => Boolean(p));

  return (
    <div className="fixed inset-0 z-[90]">
      <Backdrop onClose={() => setFavoritesOpen(false)} />
      <aside className="absolute left-0 top-0 h-full w-full max-w-sm overflow-y-auto border-r border-line bg-panel p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-editorial text-lg font-bold text-text">المفضلة</h3>
          <button
            type="button"
            onClick={() => setFavoritesOpen(false)}
            className="grid h-8 w-8 place-items-center rounded-full border border-line text-text-soft hover:text-accent"
          >
            ✕
          </button>
        </div>

        {list.length === 0 ? (
          <p className="mt-8 text-sm text-text-soft">
            ما حفظت أي قطعة بعد. اضغط ♡ على أي قطعة عشان تضيفها هنا.
          </p>
        ) : (
          <div className="mt-6 flex flex-col gap-3">
            {list.map((part) => {
              const category = getCategoryById(part.categoryId);
              return (
                <div key={part.id} className="flex gap-3 rounded-diqa border border-line bg-panel-strong p-3">
                  <div className="h-16 w-20 shrink-0 overflow-hidden rounded-diqa-sm">
                    <PartArt icon={category?.icon as never} hue={part.hue} className="h-full w-full" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-text">{part.name}</p>
                    <p className="font-data text-xs text-primary">{part.price} ر.س</p>
                    <div className="mt-2 flex gap-3 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          openPart(part.id);
                          setFavoritesOpen(false);
                        }}
                        className="text-text-soft hover:text-accent"
                      >
                        عرض
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleFavorite(part.id)}
                        className="text-text-soft hover:text-accent"
                      >
                        إزالة
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </aside>
    </div>
  );
}

export function CartDrawer() {
  const { cartOpen, setCartOpen, cart, removeFromCart, openPart } = usePlatform();
  if (!cartOpen) return null;

  const entries = Object.entries(cart)
    .map(([id, qty]) => ({ part: getPartById(id), qty }))
    .filter((e): e is { part: NonNullable<typeof e.part>; qty: number } => Boolean(e.part));
  const total = entries.reduce((sum, e) => sum + e.part.price * e.qty, 0);

  return (
    <div className="fixed inset-0 z-[90]">
      <Backdrop onClose={() => setCartOpen(false)} />
      <aside className="absolute left-0 top-0 flex h-full w-full max-w-sm flex-col border-r border-line bg-panel p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-editorial text-lg font-bold text-text">سلة المشتريات</h3>
          <button
            type="button"
            onClick={() => setCartOpen(false)}
            className="grid h-8 w-8 place-items-center rounded-full border border-line text-text-soft hover:text-accent"
          >
            ✕
          </button>
        </div>

        {entries.length === 0 ? (
          <p className="mt-8 text-sm text-text-soft">السلة فاضية. أضف قطع من صفحاتها.</p>
        ) : (
          <>
            <div className="mt-6 flex flex-1 flex-col gap-3 overflow-y-auto">
              {entries.map(({ part, qty }) => {
                const category = getCategoryById(part.categoryId);
                return (
                  <div key={part.id} className="flex gap-3 rounded-diqa border border-line bg-panel-strong p-3">
                    <div className="h-16 w-20 shrink-0 overflow-hidden rounded-diqa-sm">
                      <PartArt icon={category?.icon as never} hue={part.hue} className="h-full w-full" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => {
                          openPart(part.id);
                          setCartOpen(false);
                        }}
                        className="truncate text-right text-sm text-text hover:text-accent"
                      >
                        {part.name}
                      </button>
                      <p className="font-data text-xs text-text-soft">
                        الكمية: {qty} × {part.price} ر.س
                      </p>
                      <button
                        type="button"
                        onClick={() => removeFromCart(part.id)}
                        className="mt-1 text-xs text-text-soft hover:text-accent"
                      >
                        إزالة
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 border-t border-line pt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-soft">الإجمالي</span>
                <span className="font-data text-lg text-primary">{total} ر.س</span>
              </div>
              <button
                type="button"
                className="mt-4 w-full rounded-diqa border border-primary bg-primary py-3 text-sm font-semibold text-bg transition-colors hover:bg-transparent hover:text-primary"
              >
                إتمام الطلب (تجريبي)
              </button>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
