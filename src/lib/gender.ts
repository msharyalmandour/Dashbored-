import type { Gender, TeamMember } from "../data/types";

type GenderedUser = Pick<Partial<TeamMember>, "gender" | "title"> | null | undefined;

/** يحدد جنس المستخدم من الحقل الصريح، وإلا يخمّنه من صيغة اللقب (تراجع لتوافق البيانات القديمة) */
export function isFemaleUser(user: GenderedUser): boolean {
  if (!user) return true;
  if (user.gender) return user.gender === "female";
  return user.title ? user.title.includes("ة") : true;
}

/** يرجّع الصيغة المناسبة حسب جنس المستخدم الحالي */
export function g(isFemale: boolean, female: string, male: string): string {
  return isFemale ? female : male;
}

export type { Gender };
