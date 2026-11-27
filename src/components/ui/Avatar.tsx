import { colorClasses } from "../../lib/colors";
import { AVATAR_BGS, AVATAR_SKINS, parseCharacter, type AvatarCharacter } from "../../lib/avatarCharacter";

interface AvatarProps {
  initials: string;
  color?: string;
  size?: "sm" | "md" | "lg";
  /** لو انعطى الاسم نرسم شخصية العضو (profiles.avatar أو الافتراضية من الاسم) بدل الحروف */
  name?: string;
  avatar?: string | null;
  /** حجم بالبكسل (يغلب size) */
  px?: number;
  /** نقطة «متصل» */
  online?: boolean;
  /** لون الخلفية حول نقطة «متصل» */
  ring?: string;
}

const sizeClasses: Record<NonNullable<AvatarProps["size"]>, string> = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-base",
};
const sizePx: Record<NonNullable<AvatarProps["size"]>, number> = { sm: 32, md: 40, lg: 56 };

const BODY: Record<AvatarCharacter["piece"], string> = {
  hair: "#5A3424",
  glasses: "#3A2418",
  cap: "#F2EBE3",
  shemagh: "#F2EBE3",
  curly: "#5A2A16",
};

/** رسم الشخصية بـ viewBox 0 0 40 40: خلفية، جسم، رقبة، وجه، عيون، ابتسامة، خدود، والقطعة المميزة */
export function CharacterSvg({ character, size }: { character: AvatarCharacter; size: number }) {
  const skin = AVATAR_SKINS[character.skin];
  const p = character.piece;
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" className="block rounded-full" aria-hidden focusable="false">
      <circle cx="20" cy="20" r="20" fill={AVATAR_BGS[character.bg]} />
      <path d="M5 41C7 32.5 13 30.5 20 30.5S33 32.5 35 41Z" fill={BODY[p]} />
      <rect x="17" y="27" width="6" height="5" rx="2" fill={skin} />
      <circle cx="20" cy="21.5" r="9.6" fill={skin} />
      {(p === "hair" || p === "glasses") && <path d="M10 21C10 13 15 10 20 10C26 10 30 13 30 20C27 17 23 15.6 18 16C15 16.5 12 18 10 21Z" fill="#2A1A12" />}
      {p === "shemagh" && (
        <>
          <path d="M7 35C8 21 12 9 20 9C28 9 32 21 33 35C29.5 29 27.5 25 27.5 20.5C27.5 15.5 24.5 13 20 13C15.5 13 12.5 15.5 12.5 20.5C12.5 25 10.5 29 7 35Z" fill="#F7F1EA" />
          <path d="M9 30C11 22 13 14 20 11M31 30C29 22 27 14 20 11M10.5 24L29.5 24" stroke="#D0403A" strokeWidth="1" strokeDasharray="1.6 1.6" fill="none" />
          <path d="M12.6 14.6C15 12.2 25 12.2 27.4 14.6" stroke="#1A1210" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        </>
      )}
      {p === "curly" && (
        <g fill="#1A1210">
          <circle cx="13" cy="16" r="3.4" />
          <circle cx="17" cy="12.6" r="3.6" />
          <circle cx="22" cy="12" r="3.8" />
          <circle cx="26.6" cy="14.6" r="3.4" />
          <circle cx="28.6" cy="18.6" r="2.6" />
          <circle cx="11.2" cy="19.6" r="2.4" />
        </g>
      )}
      {p === "cap" && (
        <>
          <path d="M10.5 19C10.5 12.5 15 10 20 10C25.5 10 29.5 12.5 29.5 19Z" fill="#F2EBE3" />
          <path d="M10.5 19H4.5C4.5 17.3 6.5 16.6 10.5 16.8Z" fill="#E6D8C8" />
          <circle cx="20" cy="10.6" r="1.2" fill="#FF6A00" />
        </>
      )}
      <circle cx="16.5" cy="22" r="1.15" fill="#2A140A" />
      <circle cx="23.5" cy="22" r="1.15" fill="#2A140A" />
      <path d="M16.6 25.6Q20 28.4 23.4 25.6" fill="none" stroke="#3A1E10" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="14.2" cy="25" r="1.4" fill="#FF8A6A" opacity="0.35" />
      <circle cx="25.8" cy="25" r="1.4" fill="#FF8A6A" opacity="0.35" />
      {p === "glasses" && (
        <g fill="none" stroke="#2A1A12" strokeWidth="1.3">
          <circle cx="16.3" cy="22" r="2.9" />
          <circle cx="23.7" cy="22" r="2.9" />
          <path d="M19.2 22h1.6" />
        </g>
      )}
      {p === "curly" && (
        <>
          <path d="M8.6 23C8.6 11.5 31.4 11.5 31.4 23" fill="none" stroke="#FF6A00" strokeWidth="2" />
          <rect x="6.6" y="20.5" width="4.4" height="7.4" rx="2.2" fill="#2A1A12" />
          <rect x="29" y="20.5" width="4.4" height="7.4" rx="2.2" fill="#2A1A12" />
        </>
      )}
    </svg>
  );
}

export default function Avatar({ initials, color = "brand", size = "md", name, avatar, px, online, ring = "#0A0807" }: AvatarProps) {
  if (name !== undefined) {
    const s = px ?? sizePx[size];
    const dot = Math.max(8, Math.round(s / 4));
    return (
      <span className="relative inline-flex shrink-0 rounded-full" style={{ width: s, height: s }} title={name}>
        <CharacterSvg character={parseCharacter(avatar, name)} size={s} />
        {online && (
          <span
            className="absolute rounded-full"
            style={{ width: dot, height: dot, bottom: -1, insetInlineEnd: -1, background: "#FFC777", boxShadow: `0 0 0 2px ${ring}` }}
          />
        )}
      </span>
    );
  }
  const c = colorClasses(color);
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold ${c.bg100} ${c.text700} ${sizeClasses[size]}`}
    >
      {initials}
    </div>
  );
}
