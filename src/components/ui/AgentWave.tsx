/** أيقونة الوكيل: موجة صوت (٤ خطوط عمودية مدوّرة بأطوال 6/14/19/9 من 26). تُستخدم لأي شي يخص الوكيل بدل النجمة. */
export default function AgentWave({ size = 26, color = "currentColor", className }: { size?: number; color?: string; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 26 26" aria-hidden className={className}>
      <g fill={color}>
        <rect x="4" y="10" width="3" height="6" rx="1.5" />
        <rect x="9.2" y="6" width="3" height="14" rx="1.5" />
        <rect x="14.4" y="3.5" width="3" height="19" rx="1.5" />
        <rect x="19.6" y="8.5" width="3" height="9" rx="1.5" />
      </g>
    </svg>
  );
}
