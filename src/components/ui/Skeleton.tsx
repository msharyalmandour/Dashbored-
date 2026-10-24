/** هيكل تحميل: شكل هادئ يلمع بدل الـspinner. يستخدمه كل مكان فيه Skeleton من قبل بدون تغيير */
export default function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`skeleton rounded-xl bg-brand-950/8 ${className}`} />;
}
