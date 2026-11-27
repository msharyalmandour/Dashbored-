import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import type { StageKey } from "../data/types";
import { tr } from "./i18n";

/* «بدأتوا قبل؟» (HERO المرحلة 4): وين وصل الفريق. ينحفظ بـ teams.stage (set_team_stage) ويحدد أول شاشة
   والمراحل اللي تنحسب خالصة. لو العمود لسه ما انضاف بالقاعدة نكمل من التخزين المحلي بدون ما نطيّح شي. */

export type TeamStage = "topic" | "proposal" | "ethics" | "collecting" | "fresh";
export const STAGE_CHOICES: { id: Exclude<TeamStage, "fresh">; title: string; sub: string; level: number }[] = [
  { id: "topic", title: tr("بس اخترنا الموضوع"), sub: tr("نبدأ من المقترح"), level: 1 },
  { id: "proposal", title: tr("كتبنا جزء من المقترح"), sub: tr("نكمل من القسم اللي وقفتوا عنده"), level: 2 },
  { id: "ethics", title: tr("خلصنا المقترح وننتظر الأخلاقيات"), sub: tr("نجهز لكم الموافقة وجمع البيانات"), level: 3 },
  { id: "collecting", title: tr("بدأنا نجمع البيانات"), sub: tr("نفتح لكم «أجمع وأحلّل» على طول"), level: 4 },
];

/** مراحل الرحلة اللي تنحسب خالصة حسب وين وصلوا (الملفات اللي يجيبونها هي الدليل) */
export function stagesDoneFor(stage: TeamStage | null): StageKey[] {
  switch (stage) {
    case "topic":
    case "proposal":
      return ["topic"];
    case "ethics":
      return ["topic", "proposal", "literature-review", "research-gap", "research-questions", "methodology"];
    case "collecting":
      return ["topic", "proposal", "literature-review", "research-gap", "research-questions", "methodology"];
    default:
      return [];
  }
}
/** المرحلة اللي يكملون فيها الحين */
export function activeStageFor(stage: TeamStage | null): StageKey | null {
  return stage === "topic" || stage === "proposal" ? "proposal" : stage === "ethics" || stage === "collecting" ? "data-collection" : null;
}
/** أول شاشة بعد «ودّونا لبحثنا» */
export function firstRouteFor(stage: TeamStage | null): string {
  return stage === "topic" || stage === "proposal" ? "/proposal" : stage === "ethics" ? "/ethical-approval" : stage === "collecting" ? "/collect" : "/";
}

const key = (teamId: string) => `wesync.stage.${teamId}`;
const read = (teamId: string): TeamStage | null => {
  try {
    return (localStorage.getItem(key(teamId)) as TeamStage | null) ?? null;
  } catch {
    return null;
  }
};

export async function saveTeamStage(teamId: string, stage: TeamStage): Promise<void> {
  try {
    localStorage.setItem(key(teamId), stage);
  } catch {
    // بدون تخزين: يكفي اللي بالقاعدة
  }
  if (supabase) await supabase.rpc("set_team_stage", { p_stage: stage }).then(() => undefined, () => undefined);
}

/** المرحلة المحفوظة للفريق (القاعدة أول، وإلا المحلي). loaded=false لين نعرف */
export function useTeamStage(teamId: string | null | undefined) {
  const [stage, setStage] = useState<TeamStage | null>(() => (teamId ? read(teamId) : null));
  const [loaded, setLoaded] = useState(!supabase);
  const refresh = useCallback(async () => {
    if (!teamId || !supabase) return setLoaded(true);
    const { data, error } = await supabase.from("teams").select("stage").eq("id", teamId).maybeSingle();
    const db = !error && data ? ((data as { stage?: TeamStage | null }).stage ?? null) : null;
    setStage(db ?? read(teamId));
    setLoaded(true);
  }, [teamId]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  return { stage, loaded, setStage, refresh };
}
