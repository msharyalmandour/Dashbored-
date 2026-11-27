import WLogo from "./brand/WLogo";

/** علامة Wesync — شعار الموجة W (مربع كريمي على الداكن). المصدر الوحيد: components/brand/WLogo */
export default function Logo({ size = 40, tone = "cream" }: { size?: number; tone?: "cream" | "ink" }) {
  return <WLogo size={size} tone={tone} />;
}
