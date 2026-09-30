import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2, Lock } from "lucide-react";
import SurveyRunner, { type AnswerMap } from "../components/survey/SurveyRunner";
import Logo from "../components/Logo";
import { supabase } from "../lib/supabaseClient";
import type { Question } from "../lib/surveyCoach";

interface PublicSurvey {
  title: string;
  intro: string;
  consent: string;
  questions: Question[];
  isPilot: boolean;
}

/** صفحة المشاركة العامة — بدون تسجيل دخول، ولا تنفهرس بمحركات البحث. */
export default function SurveyPublic() {
  const { token } = useParams<{ token: string }>();
  const [survey, setSurvey] = useState<PublicSurvey | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "closed">("loading");

  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex,nofollow";
    document.head.appendChild(meta);
    return () => {
      meta.remove();
    };
  }, []);

  useEffect(() => {
    if (!supabase || !token) {
      setState("closed");
      return;
    }
    supabase.rpc("get_public_survey", { p_token: token }).then(({ data }) => {
      if (data && typeof data === "object") {
        setSurvey(data as PublicSurvey);
        setState("ready");
      } else setState("closed");
    });
  }, [token]);

  const submit = async (a: AnswerMap): Promise<string | null> => {
    if (!supabase || !token) return "تعذّر الإرسال.";
    const { error } = await supabase.rpc("submit_survey_response", { p_token: token, p_answers: a });
    if (!error) return null;
    if (error.message.includes("closed")) return "هذا الاستبيان أُغلق.";
    if (error.message.includes("rate")) return "ضغط كبير الحين — جرّبوا بعد لحظات.";
    return "ما وصلت إجاباتكم — حاولوا مرة ثانية.";
  };

  return (
    <div className="relative min-h-screen bg-[#050b12] text-white">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#08211d] via-[#061318] to-[#03060a]" />
      <div className="relative mx-auto max-w-2xl px-5 py-10">
        <header className="mb-8 flex items-center gap-2.5">
          <Logo size={30} />
          <span className="text-xs font-semibold text-white/40">استبيان بحثي — مجهول</span>
        </header>
        {state === "loading" && (
          <div className="flex justify-center py-24">
            <Loader2 className="animate-spin text-amber-300" />
          </div>
        )}
        {state === "closed" && (
          <div className="py-24 text-center">
            <Lock size={36} className="mx-auto text-white/40" />
            <p className="mt-4 text-lg font-extrabold">هذا الاستبيان مغلق أو غير موجود</p>
            <p className="mt-2 text-sm text-white/50">تأكدوا من الرابط أو تواصلوا مع الباحثين.</p>
          </div>
        )}
        {state === "ready" && survey && (
          <SurveyRunner title={survey.title} intro={survey.intro} consent={survey.consent} questions={survey.questions} isPilot={survey.isPilot} onSubmit={submit} />
        )}
      </div>
    </div>
  );
}
