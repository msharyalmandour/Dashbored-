/** شخصيات الأفاتار (كاجوال): قطعة مميزة + لون خلفية + لون بشرة. تنحفظ بـ profiles.avatar كنص "piece:bg:skin"
    (مثل "shemagh:2:1")، والفاضي يتوزع ثابت حسب الاسم عشان كل عضو له شكل من أول يوم. */

export const AVATAR_PIECES = ["hair", "glasses", "cap", "shemagh", "curly"] as const;
export type AvatarPiece = (typeof AVATAR_PIECES)[number];

export const AVATAR_BGS = ["#FFB444", "#FF8A3D", "#C0563A", "#E9C9A0"] as const;
export const AVATAR_SKINS = ["#E2A97E", "#C98B62", "#D9A274", "#B97850"] as const;

export interface AvatarCharacter {
  piece: AvatarPiece;
  bg: number;
  skin: number;
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** الشخصية الافتراضية من الاسم (ثابتة لنفس الاسم) */
export function defaultCharacter(seed: string): AvatarCharacter {
  const h = hash(seed.trim() || "?");
  return { piece: AVATAR_PIECES[h % AVATAR_PIECES.length], bg: (h >>> 4) % AVATAR_BGS.length, skin: (h >>> 8) % AVATAR_SKINS.length };
}

export function parseCharacter(value: string | null | undefined, seed: string): AvatarCharacter {
  if (value) {
    const [p, b, s] = value.split(":");
    if ((AVATAR_PIECES as readonly string[]).includes(p)) {
      const bg = Number(b);
      const skin = Number(s);
      return {
        piece: p as AvatarPiece,
        bg: Number.isInteger(bg) && bg >= 0 && bg < AVATAR_BGS.length ? bg : 0,
        skin: Number.isInteger(skin) && skin >= 0 && skin < AVATAR_SKINS.length ? skin : 0,
      };
    }
  }
  return defaultCharacter(seed);
}

export const serializeCharacter = (c: AvatarCharacter) => `${c.piece}:${c.bg}:${c.skin}`;
