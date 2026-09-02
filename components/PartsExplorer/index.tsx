"use client";

import { useMemo, useState } from "react";
import DemoBadge from "@/components/DemoBadge";
import { parts, partById } from "@/lib/mock-data";
import { mockAiPartSearch } from "@/lib/search";
import type { PartCategoryId } from "@/lib/types";
import CarDiagram from "./CarDiagram";
import CategorySidebar from "./CategorySidebar";
import Hotspot from "./Hotspot";
import PartDetailPanel from "./PartDetailPanel";
import AiSearchBar from "./AiSearchBar";

const VIEW_CX = 400;
const VIEW_CY = 160;
const OVERVIEW_TRANSFORM = "translate(0, 0) scale(1)";

export default function PartsExplorer() {
  const [category, setCategory] = useState<PartCategoryId | null>(null);
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const [searchNote, setSearchNote] = useState<string | null>(null);

  const activePart = selectedPartId ? partById(selectedPartId) : null;

  const transform = useMemo(() => {
    if (!activePart) return OVERVIEW_TRANSFORM;
    const { x, y, scale } = activePart.focus;
    const tx = VIEW_CX - x * scale;
    const ty = VIEW_CY - y * scale;
    return `translate(${tx}, ${ty}) scale(${scale})`;
  }, [activePart]);

  function selectPart(id: string) {
    const part = partById(id);
    if (!part) return;
    setSelectedPartId(id);
    setCategory(part.categoryId);
    setSearchNote(null);
  }

  function handleCategorySelect(id: PartCategoryId | null) {
    setCategory(id);
    setSelectedPartId(null);
  }

  function handleClose() {
    setSelectedPartId(null);
  }

  function handleSearch(query: string) {
    const match = mockAiPartSearch(query);
    if (match) {
      selectPart(match.id);
      setSearchNote(`عثرنا على تطابق: "${match.name}" — تم تحديدها على المخطط.`);
    } else {
      setSelectedPartId(null);
      setSearchNote(
        "لم نجد تطابقاً مباشراً. جرّب كلمة أخرى (مثل: فرامل، رديتر، إطار) أو استخدم القائمة الجانبية."
      );
    }
  }

  return (
    <section id="explorer" className="mx-auto max-w-6xl px-6 py-16">
      <div className="mb-6 flex flex-col gap-3">
        <DemoBadge label="مستكشف تفاعلي · SVG" />
        <h2 className="font-editorial text-4xl text-text">
          مستكشف القطع التفاعلي
        </h2>
        <p className="max-w-xl text-text-soft">
          اختر فئة من القائمة أو اضغط أي نقطة على مخطط السيارة، أو اسأل
          بالبحث الذكي بالأسفل.
        </p>
      </div>

      <div className="mb-6">
        <AiSearchBar onSearch={handleSearch} note={searchNote} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <CategorySidebar active={category} onSelect={handleCategorySelect} />

        <div className="flex flex-col gap-4">
          <div className="overflow-hidden rounded-diqa border border-line bg-panel">
            <svg
              viewBox="0 0 800 320"
              className="aspect-[800/320] w-full"
              role="img"
              aria-label="مخطط سيارة تفاعلي من الجانب"
            >
              <g
                transform={transform}
                style={{
                  transition: "transform 700ms cubic-bezier(0.22,1,0.36,1)",
                }}
              >
                <CarDiagram />
                {parts.map((part) => {
                  const selected = part.id === selectedPartId;
                  const dimmed = activePart
                    ? !selected
                    : category
                      ? part.categoryId !== category
                      : false;
                  return (
                    <Hotspot
                      key={part.id}
                      part={part}
                      selected={selected}
                      dimmed={dimmed}
                      onSelect={selectPart}
                    />
                  );
                })}
              </g>
            </svg>
          </div>

          {activePart ? (
            <PartDetailPanel
              part={activePart}
              onSelectRelated={selectPart}
              onClose={handleClose}
            />
          ) : (
            <div className="rounded-diqa border border-dashed border-line p-6 text-center text-sm text-text-soft">
              اضغط على أي نقطة في المخطط لعرض تفاصيل القطعة والقطع المتوافقة
              معها
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
