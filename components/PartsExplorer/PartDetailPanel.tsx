import { partById, partCategories } from "@/lib/mock-data";
import type { Part } from "@/lib/types";

/** عدد وهمي ثابت مشتق من معرّف القطعة — للعرض التجريبي فقط */
function mockCompatibleCount(id: string) {
  const sum = [...id].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return 8 + (sum % 33);
}

export default function PartDetailPanel({
  part,
  onSelectRelated,
  onClose,
}: {
  part: Part;
  onSelectRelated: (id: string) => void;
  onClose: () => void;
}) {
  const category = partCategories.find((c) => c.id === part.categoryId);

  return (
    <div className="rounded-diqa border border-line bg-panel p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="font-data text-[11px] uppercase tracking-wide text-accent">
            {category?.label}
          </span>
          <h3 className="mt-1 font-editorial text-3xl text-text">
            {part.name}
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="إغلاق"
          className="rounded-full border border-line px-2.5 py-1 text-sm text-text-soft transition-colors hover:border-accent hover:text-accent"
        >
          ✕
        </button>
      </div>

      <p className="mt-4 text-sm leading-7 text-text-soft">
        {part.description}
      </p>

      <div className="mt-4 flex items-center gap-2">
        <span className="rounded-full border border-line bg-bg px-3 py-1 font-data text-xs text-primary">
          {mockCompatibleCount(part.id)} قطعة متوافقة
        </span>
        <span className="text-[11px] text-text-soft">(بيانات وهمية)</span>
      </div>

      {part.relatedPartIds.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-xs text-text-soft">قطع ذات صلة</p>
          <div className="flex flex-wrap gap-2">
            {part.relatedPartIds.map((id) => {
              const related = partById(id);
              if (!related) return null;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onSelectRelated(id)}
                  className="rounded-diqa-sm border border-line bg-bg px-3 py-1.5 text-sm text-text transition-colors hover:border-accent hover:text-accent"
                >
                  {related.name}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
