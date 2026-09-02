export default function DemoBadge({ label = "تجربة تفاعلية · بيانات وهمية" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 font-data text-[10px] uppercase tracking-wide text-accent">
      <span className="h-1.5 w-1.5 rounded-full bg-accent" />
      {label}
    </span>
  );
}
