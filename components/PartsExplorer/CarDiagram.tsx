/**
 * رسم تخطيطي (SVG) لسيارة من الجانب — أسلوب تقني مبسّط وليس واقعياً.
 * إحداثيات الأشكال هنا مرتبطة بإحداثيات hotspot/focus في lib/mock-data.ts
 * (viewBox 0 0 800 320) — أي تعديل هنا يتطلب مراجعة تلك الإحداثيات.
 */
export default function CarDiagram() {
  return (
    <>
      {/* خط الأرض */}
      <line
        x1={40}
        y1={278}
        x2={760}
        y2={278}
        stroke="var(--color-line)"
        strokeWidth={2}
      />

      {/* الهيكل السفلي */}
      <rect
        x={95}
        y={170}
        width={610}
        height={80}
        rx={20}
        fill="var(--color-panel-strong)"
        stroke="var(--color-primary)"
        strokeWidth={1.5}
      />

      {/* المقصورة (السقف والزجاج) */}
      <path
        d="M260 170 C270 122 322 108 400 106 C478 108 528 120 542 170 Z"
        fill="var(--color-panel-strong)"
        stroke="var(--color-primary)"
        strokeWidth={1.5}
      />
      {/* الزجاج الأمامي والخلفي */}
      <path
        d="M400 112 C334 113 288 124 270 165 L390 165 L400 112 Z"
        fill="var(--color-bg)"
        opacity={0.6}
      />
      <path
        d="M400 112 C462 114 508 126 532 165 L406 165 L400 112 Z"
        fill="var(--color-bg)"
        opacity={0.6}
      />

      {/* المصدّة الأمامية */}
      <rect
        x={705}
        y={205}
        width={38}
        height={42}
        rx={8}
        fill="var(--color-panel)"
        stroke="var(--color-accent)"
        strokeWidth={1.5}
      />
      {/* المصدّة الخلفية */}
      <rect
        x={57}
        y={205}
        width={38}
        height={42}
        rx={8}
        fill="var(--color-panel)"
        stroke="var(--color-accent)"
        strokeWidth={1.5}
      />

      {/* الإضاءة الأمامية */}
      <rect
        x={699}
        y={178}
        width={26}
        height={18}
        rx={4}
        fill="var(--color-accent)"
        opacity={0.55}
      />
      {/* الإضاءة الخلفية */}
      <rect
        x={75}
        y={178}
        width={26}
        height={18}
        rx={4}
        fill="var(--color-accent)"
        opacity={0.55}
      />

      {/* المرايا الجانبية */}
      <ellipse
        cx={430}
        cy={150}
        rx={12}
        ry={7}
        fill="var(--color-panel)"
        stroke="var(--color-primary)"
        strokeWidth={1.5}
      />

      {/* العجلة الخلفية */}
      <Wheel cx={215} cy={236} />
      {/* العجلة الأمامية */}
      <Wheel cx={595} cy={236} />
    </>
  );
}

function Wheel({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={42}
        fill="var(--color-text)"
        opacity={0.85}
      />
      <circle
        cx={cx}
        cy={cy}
        r={20}
        fill="var(--color-panel)"
        stroke="var(--color-bg)"
        strokeWidth={2}
      />
    </g>
  );
}
