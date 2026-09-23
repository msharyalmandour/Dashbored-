/** شريط تقدّم "قمّة" — تدرّج ترابي دافئ يرتفع لنقطة متوهجة بالطرف
    (استعارة بصرية لـ"تراب وجبل" بدل الشريط المسطّح العادي). يستخدم ألوان
    الفريق (brand-*) فيتلوّن تلقائيًا مع أي ثيم مفعّل. */
export default function PeakBar({
  value,
  height = "h-2.5",
}: {
  value: number;
  height?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className={`relative w-full overflow-hidden rounded-full bg-[var(--color-track)] ${height}`}>
      <div
        className="absolute inset-y-0 start-0 rounded-full bg-gradient-to-l from-brand-700 via-brand-500 to-brand-600 transition-[width] duration-700 ease-out"
        style={{ width: `${clamped}%` }}
      >
        {clamped > 3 && (
          <span className="absolute -end-1 top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full bg-brand-600 shadow-[0_0_10px_2px_rgba(255,138,36,0.65)]" />
        )}
      </div>
    </div>
  );
}
