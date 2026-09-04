import { Infinity as InfinityIcon } from "lucide-react";

/**
 * علامة Wesync — أسود ثابت دايمًا (مو مرتبط بثيم الجنس أو الوضع الليلي)،
 * عشان تبقى هوية بصرية واحدة موحّدة للبراند نفسه، بعيدة عن أي إيحاء طبي بحت.
 */
export default function Logo({ size = 40 }: { size?: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-neutral-950 text-white"
      style={{ height: size, width: size }}
    >
      <InfinityIcon size={Math.round(size * 0.5)} strokeWidth={2.25} />
    </div>
  );
}
