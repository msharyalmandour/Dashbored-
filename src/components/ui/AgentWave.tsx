import { WesyAvatar } from "../brand/Wesy";

/** أيقونة ويسي (الخطوة 4): رأسه بالمربع الكريمي بدل موجة الصوت القديمة. نفس الواجهة عشان كل الأماكن تتبدّل.
    color بقي للتوافق بس (الأفاتار بألوانه). أصغر حجم 20px. */
export default function AgentWave({ size = 26, className }: { size?: number; color?: string; className?: string }) {
  return <WesyAvatar size={Math.max(20, size)} className={className} />;
}
