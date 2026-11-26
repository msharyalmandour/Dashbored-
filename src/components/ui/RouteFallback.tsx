import Skeleton from "./Skeleton";

/** مكان الصفحة وهي تتحمّل (أول مرة بس — بعدها تكون بالكاش). هيكل هادي بدل شاشة فاضية. */
export default function RouteFallback() {
  return (
    <div className="space-y-4 py-2" aria-busy="true" aria-live="polite">
      <Skeleton className="h-9 w-2/5" />
      <Skeleton className="h-32 w-full" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    </div>
  );
}
