import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, Navigate, useLocation, useSearchParams } from "react-router-dom";
import { Gift, Users } from "lucide-react";
import WLogo from "../components/brand/WLogo";
import { useAuth } from "../context/AuthContext";
import { demoCredentials, teamMembers } from "../data/mockData";
import Logo from "../components/Logo";
import LangToggle from "../components/ui/LangToggle";
import { tr } from "../lib/i18n";
import { clearSignupRef, parseRef, storedSignupRef } from "../lib/signupSource";
import "../styles/bright.css";

/** اقتراحات جاهزة بخانة "الجامعة" وقت التسجيل — الحقل نص حر أصلًا
    (datalist)، فأي جامعة مو بالقائمة تُكتب يدويًا بدون أي قيد */
const saudiUniversities = [
  tr("جامعة الملك سعود"),
  tr("جامعة الملك عبدالعزيز"),
  tr("جامعة الملك فيصل"),
  tr("جامعة الملك خالد"),
  tr("جامعة الأميرة نورة بنت عبدالرحمن"),
  tr("جامعة أم القرى"),
  tr("جامعة طيبة"),
  tr("جامعة القصيم"),
  tr("جامعة الجوف"),
  tr("جامعة تبوك"),
  tr("جامعة نجران"),
  tr("جامعة الباحة"),
  tr("جامعة حائل"),
  tr("جامعة جازان"),
  tr("جامعة الحدود الشمالية"),
  tr("جامعة شقراء"),
  tr("جامعة الإمام عبدالرحمن بن فيصل"),
  tr("جامعة الطائف"),
  tr("الجامعة السعودية الإلكترونية"),
  tr("جامعة الأمير سطام بن عبدالعزيز"),
  tr("جامعة الإمام محمد بن سعود الإسلامية"),
];

/** لحظة انتقال سينمائية عند نجاح الدخول: تلاشي لطبقة داكنة + تكبير خفيف
    للشعار — بدل القطع الفجائي المباشر للوحة الفريق */
function SuccessTransition() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#03060a] animate-[success-fade_0.5s_ease-out_forwards]">
      <div className="animate-[success-pulse_0.65s_ease-out_forwards]">
        <Logo size={72} />
      </div>
    </div>
  );
}

export default function Login() {
  const { currentUser, mode, loginAsMock, signInWithPassword, signUpWithPassword, resetPassword } =
    useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const inviteTeamId = searchParams.get("team");
  // رابط دعوة على مهمة محددة (?task=) — نحفظها، وبعد الدخول يوصل عليها مباشرة (PendingTaskRedirect)
  const inviteTaskId = searchParams.get("task");
  useEffect(() => {
    if (!inviteTaskId) return;
    try {
      localStorage.setItem("wesync.pendingTask", inviteTaskId);
    } catch {
      /* تخزين غير متاح */
    }
  }, [inviteTaskId]);
  // ?ref= بالرابط أو المحفوظ من أول فتح للموقع (رابط المشرفة يوصل للرئيسية قبل الـ #)
  const refRaw = searchParams.get("ref") ?? storedSignupRef();
  const { code: referralCode, source: signupSource } = parseRef(refRaw);

  // نلتقط هل المستخدمة كانت مسجلة دخولها أصلًا وقت أول تحميل للصفحة (زي
  // استرجاع جلسة محفوظة) — عشان ما نشغّل حركة الاحتفال إلا لما تسجّل دخول
  // فعلي بهذي الزيارة، مو كل مرة يفتح فيها كومبوننت اللوقن
  const wasLoggedInOnMount = useRef(!!currentUser);
  const [celebrating, setCelebrating] = useState(false);
  // أمان: بعد ثانيتين ونص نوقف حركة الظهور، عشان النموذج يبان حتى لو المتصفح ما شغّل الحركة
  const [blDone, setBlDone] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setBlDone(true), 2500);
    return () => clearTimeout(t);
  }, []);
  const [readyToNavigate, setReadyToNavigate] = useState(false);

  useLayoutEffect(() => {
    if (currentUser && !wasLoggedInOnMount.current) {
      setCelebrating(true);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!celebrating) return;
    const t = setTimeout(() => setReadyToNavigate(true), 650);
    return () => clearTimeout(t);
  }, [celebrating]);

  const [isSignUp, setIsSignUp] = useState(!!inviteTeamId || !!referralCode || !!signupSource || searchParams.has("signup"));
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [gender, setGender] = useState<"male" | "female">("female");
  const [university, setUniversity] = useState("");
  const [showManualTeamCode, setShowManualTeamCode] = useState(false);
  const [manualTeamCode, setManualTeamCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [resetSubmitting, setResetSubmitting] = useState(false);

  const [universityId, setUniversityId] = useState("");
  const [mockPassword, setMockPassword] = useState("");
  const [mockError, setMockError] = useState<string | null>(null);
  const [showDemoCreds, setShowDemoCreds] = useState(false);

  if (currentUser && wasLoggedInOnMount.current) {
    const f = (location.state as { from?: Location })?.from;
    const from = f ? `${f.pathname}${f.search ?? ""}` : "/";
    return <Navigate to={from} replace />;
  }
  if (readyToNavigate) {
    const f = (location.state as { from?: Location })?.from;
    const from = f ? `${f.pathname}${f.search ?? ""}` : "/";
    return <Navigate to={from} replace />;
  }
  if (celebrating) {
    return <SuccessTransition />;
  }

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // احتياط لو رابط الدعوة ما وصل بالتاق (مثلًا انفتح داخل متصفح واتساب
    // وضاع جزء الرابط) — العضو يقدر يلصق رمز الفريق يدويًا بدلًا منه
    const trimmedManualCode = manualTeamCode.trim();
    if (isSignUp && !inviteTeamId && trimmedManualCode && !UUID_RE.test(trimmedManualCode)) {
      setError(tr("رمز الفريق غير صحيح — تأكدي إنك نسختيه كامل من صفحة الفريق."));
      return;
    }
    const effectiveTeamId = inviteTeamId ?? (trimmedManualCode || undefined);

    setSubmitting(true);
    const result = isSignUp
      ? await signUpWithPassword(
          email,
          password,
          name,
          gender,
          effectiveTeamId,
          referralCode,
          effectiveTeamId ? undefined : university || undefined,
          signupSource,
        )
      : await signInWithPassword(email, password);

    setSubmitting(false);
    if (result.error) setError(result.error);
    else if (isSignUp) {
      clearSignupRef();
      setError(tr("تم إنشاء الحساب! تحقق من بريدك الإلكتروني لتأكيد الحساب ثم سجّل دخولك."));
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    setResetSubmitting(true);
    const result = await resetPassword(resetEmail);
    setResetSubmitting(false);
    if (result.error) setResetError(result.error);
    else setResetSent(true);
  };

  const handleMockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMockError(null);
    const match = demoCredentials.find(
      (c) => c.universityId === universityId.trim() && c.password === mockPassword,
    );
    if (!match) {
      setMockError(tr("الرقم الجامعي أو كلمة المرور غير صحيحة — جرّب البيانات التجريبية تحت."));
      return;
    }
    loginAsMock(match.memberId);
  };

  /** رسائل تحقق المتصفح الافتراضية (زي "Please fill out this field") تطلع
      بلغة المتصفح نفسه مو بلغة الصفحة — فتظهر بالإنجليزي لأي زائر متصفحه
      مو عربي، بموقع عربي بالكامل. نستبدلها برسالة عربية واضحة بدل كذا. */
  const arabicInvalidHandler =
    (requiredMsg: string, formatMsg?: string) => (e: React.InvalidEvent<HTMLInputElement>) => {
      const el = e.currentTarget;
      if (el.validity.valueMissing) el.setCustomValidity(requiredMsg);
      else if ((el.validity.typeMismatch || el.validity.tooShort) && formatMsg) el.setCustomValidity(formatMsg);
      else el.setCustomValidity("");
    };
  const clearValidity = (e: React.ChangeEvent<HTMLInputElement>) => e.currentTarget.setCustomValidity("");

  const inputClass =
    "w-full rounded-2xl border border-[#E2D9D0] bg-white px-[18px] py-3.5 text-base text-[#141414] outline-none transition-[border-color,box-shadow] placeholder:text-[#8F8378] focus:border-[#FF6A00] focus:shadow-[0_0_0_4px_rgba(255,106,0,0.14)]";
  const glowButtonClass =
    "w-full rounded-full bg-[#FF6A00] py-4 text-lg font-bold text-white shadow-[0_14px_30px_-10px_rgba(255,106,0,0.8)] hover:-translate-y-0.5 transition hover:brightness-110 disabled:opacity-60";
  // في النسخة التجريبية (mock) ما فيه إنشاء حساب، فعنوان الإنشاء يطلع بس بالوضع الحقيقي
  const signUpView = isSignUp && mode === "supabase";

  return (
    <div className={`bl${blDone ? " done" : ""}`}>
      <div className="bl-auth">
        <div className="form">
          <div className="bl-strip" aria-hidden>
            {(signUpView ? ["team", "pink", "mint"] : ["turq", "purple", "yellow"]).map((k) => (
              <div key={k} className="bl-tile"><img src={`/lux/ph-${k}.webp`} alt="" /></div>
            ))}
          </div>
          <main className="flex w-full flex-1 flex-col justify-center py-6">
            <div className="bl-pop mx-auto w-full max-w-[480px] text-[#141414]">
              <div className="mb-7 space-y-5">
                <div className="flex items-center justify-between gap-3">
                  <Link to="/" aria-label={tr("Wesync — الصفحة الرئيسية")} className="flex items-center gap-2.5 font-kufi text-xl font-extrabold">
                    <WLogo size={32} />
                    Wesync
                  </Link>
                  <div className="flex items-center gap-3">
                  {mode === "supabase" && !isForgotPassword && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsSignUp((v) => !v);
                        setError(null);
                      }}
                      className="text-sm text-[#6b625c]"
                    >
                      {isSignUp ? (
                        <>{tr("عندك حساب؟ ")}<span className="text-[#E05A00]">{tr("ادخل")}</span>
                        </>
                      ) : (
                        <>{tr("ما عندك حساب؟ ")}<span className="text-[#E05A00]">{tr("أنشئ واحد")}</span>
                        </>
                      )}
                    </button>
                  )}
                    <LangToggle className="border-black/15 !bg-white !text-[#141414] hover:bg-black/5" />
                  </div>
                </div>
                <div>
                  <h1 className="text-[40px] font-black leading-[1.15] sm:text-[48px]">
                    {isForgotPassword ? (
                      tr("استرجاع كلمة المرور")
                    ) : signUpView ? (
                      <>{tr("ابدأوا بحثكم")}<br /><span className="bl-mark in" style={{ ["--m" as string]: "#FFC93C" }}>{tr("بالترتيب الصح.")}</span></>
                    ) : (
                      <>{tr("هلا")} <span className="bl-mark in" style={{ ["--m" as string]: "#5EE0C0" }}>{tr("من جديد")}</span></>
                    )}
                  </h1>
                  {signUpView && !isForgotPassword && (
                    <p className="mt-2 font-light text-[#6b625c]">{tr("14 يوم مجانًا كاملة، بدون بطاقة دفع.")}</p>
                  )}
                  {inviteTeamId && mode === "supabase" && (
                    <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#FF6A00]/10 px-3 py-1 text-xs font-bold text-[#E05A00]">
                      <Users size={13} />{tr("دعوة انضمام لفريق بحثي — أكملوا التسجيل بالأسفل")}</span>
                  )}
                  {!inviteTeamId && referralCode && mode === "supabase" && (
                    <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#FF6A00]/10 px-3 py-1 text-xs font-bold text-[#E05A00]">
                      <Gift size={13} />{tr("دعوة من فريق بحثي — أنشئوا حسابكم وابدأوا تجربة 14 يوم مجانية. لما تبدأون فعليًا تاخذون أسبوعين هدية أنتم وهم، ولما تشتركون شهر 🎉")}</span>
                  )}
                </div>
              </div>

              {mode === "supabase" && isForgotPassword ? (
                <>
                  {resetSent ? (
                    <p className="rounded-xl bg-[#3ED6A0]/15 px-3 py-3 text-center text-sm font-semibold text-[#E05A00]">{tr("تم إرسال رابط إعادة تعيين كلمة المرور لبريدك — تحقق منه واضغط الرابط لتعيين كلمة مرور جديدة.")}</p>
                  ) : (
                    <form onSubmit={handleResetSubmit} className="space-y-3">
                      <label className="block text-sm">
                        <span className="mb-2 block font-semibold">{tr("البريد الجامعي")}</span>
                        <input
                          required
                          type="email"
                          autoComplete="email"
                          value={resetEmail}
                          onChange={(e) => {
                            clearValidity(e);
                            setResetEmail(e.target.value);
                          }}
                          onInvalid={arabicInvalidHandler(
                            tr("البريد الإلكتروني مطلوب"),
                            tr("صيغة البريد الإلكتروني غير صحيحة"),
                          )}
                          className={inputClass}
                          placeholder="you@example.com"
                          dir="ltr"
                        />
                      </label>

                      {resetError && (
                        <p className="rounded-xl bg-rose-500/10 px-3 py-2 text-sm font-medium text-rose-700">
                          {resetError}
                        </p>
                      )}

                      <button type="submit" disabled={resetSubmitting} className={glowButtonClass}>
                        {resetSubmitting ? "..." : tr("إرسال رابط إعادة التعيين")}
                      </button>
                    </form>
                  )}

                  <button
                    onClick={() => {
                      setIsForgotPassword(false);
                      setResetSent(false);
                      setResetError(null);
                    }}
                    className="mt-4 w-full text-center text-sm font-semibold text-[#E05A00] hover:underline"
                  >{tr("الرجوع لتسجيل الدخول")}</button>
                </>
              ) : mode === "supabase" ? (
                <>
                  <form onSubmit={handleSubmit} className="space-y-3">
                    {isSignUp && (
                      <label className="block text-sm">
                        <span className="mb-2 block font-semibold">{tr("الاسم الكامل")}</span>
                        <input
                          required
                          value={name}
                          onChange={(e) => {
                            clearValidity(e);
                            setName(e.target.value);
                          }}
                          onInvalid={arabicInvalidHandler(tr("الاسم الكامل مطلوب"))}
                          className={inputClass}
                          placeholder={tr("مثال: سارة العتيبي")}
                        />
                      </label>
                    )}
                    {isSignUp && (
                      <div className="text-sm">
                        <span className="mb-2 block font-semibold">{tr("نخاطبك بـ")}</span>
                        <div className="flex rounded-full border border-[#E2D9D0] bg-white p-1">
                          {(
                            [
                              ["female", tr("أنتِ")],
                              ["male", tr("أنتَ")],
                            ] as const
                          ).map(([g, label]) => (
                            <button
                              key={g}
                              type="button"
                              onClick={() => setGender(g)}
                              aria-pressed={gender === g}
                              className={`flex-1 rounded-full px-3 py-2.5 text-sm font-semibold transition-colors ${
                                gender === g
                                  ? "bg-[#141414] text-white"
                                  : "text-[#6b625c] hover:text-[#141414]"
                              }`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <label className="block text-sm">
                      <span className="mb-2 block font-semibold">{tr("البريد الجامعي")}</span>
                      <input
                        required
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => {
                          clearValidity(e);
                          setEmail(e.target.value);
                        }}
                        onInvalid={arabicInvalidHandler(
                          tr("البريد الإلكتروني مطلوب"),
                          tr("صيغة البريد الإلكتروني غير صحيحة"),
                        )}
                        className={inputClass}
                        placeholder="you@example.com"
                        dir="ltr"
                      />
                    </label>
                    <label className="block text-sm">
                      <span className="mb-2 block font-semibold">{tr("كلمة المرور")}</span>
                      <input
                        required
                        type="password"
                        autoComplete={isSignUp ? "new-password" : "current-password"}
                        minLength={6}
                        value={password}
                        onChange={(e) => {
                          clearValidity(e);
                          setPassword(e.target.value);
                        }}
                        onInvalid={arabicInvalidHandler(
                          tr("كلمة المرور مطلوبة"),
                          tr("كلمة المرور لازم تكون 6 أحرف على الأقل"),
                        )}
                        className={inputClass}
                        placeholder="••••••••"
                        dir="ltr"
                      />
                    </label>

                    {isSignUp && !inviteTeamId && !manualTeamCode.trim() && (
                      <label className="block text-sm">
                        <span className="mb-2 block font-semibold">{tr("الجامعة ")}<span className="font-normal text-[#8F8378]">{tr("(اختياري)")}</span>
                        </span>
                        <input
                          list="university-options"
                          value={university}
                          onChange={(e) => setUniversity(e.target.value)}
                          className={inputClass}
                          placeholder={tr("مثال: جامعة الملك سعود")}
                        />
                        <datalist id="university-options">
                          {saudiUniversities.map((u) => (
                            <option key={u} value={u} />
                          ))}
                        </datalist>
                      </label>
                    )}
                    {isSignUp && !inviteTeamId && showManualTeamCode && (
                      <label className="block text-sm">
                        <span className="mb-2 block font-semibold">{tr("رمز دعوة الفريق")}</span>
                        <input
                          value={manualTeamCode}
                          onChange={(e) => setManualTeamCode(e.target.value)}
                          className={inputClass}
                          placeholder={tr("الصقيه من صفحة الفريق عند قائدة فريقكم")}
                          dir="ltr"
                        />
                      </label>
                    )}
                    {error && (
                      <p className="rounded-xl bg-rose-500/10 px-3 py-2 text-sm font-medium text-rose-700">
                        {error}
                      </p>
                    )}

                    <button type="submit" disabled={submitting} className={glowButtonClass}>
                      {submitting ? "..." : isSignUp ? tr("أنشئ حسابي") : tr("تسجيل الدخول")}
                    </button>
                    {isSignUp && !inviteTeamId && !showManualTeamCode && (
                      <button
                        type="button"
                        onClick={() => setShowManualTeamCode(true)}
                        className="block w-full text-center text-sm text-[#6b625c]"
                      >{tr("عندك رمز دعوة من فريقك؟ ")}<span className="text-[#E05A00]">{tr("ادخله هنا")}</span>
                      </button>
                    )}
                  </form>

                  {!isSignUp && (
                    <button
                      onClick={() => {
                        setIsForgotPassword(true);
                        setError(null);
                      }}
                      className="mt-3 w-full text-center text-xs font-semibold text-[#8a8079] hover:text-[#E05A00] hover:underline"
                    >{tr("نسيت كلمة المرور؟")}</button>
                  )}

                </>
              ) : (
                <>
                  <form onSubmit={handleMockSubmit} className="space-y-3">
                    <label className="block text-sm">
                      <span className="mb-2 block font-semibold">{tr("الرقم الجامعي")}</span>
                      <input
                        required
                        inputMode="numeric"
                        value={universityId}
                        onChange={(e) => setUniversityId(e.target.value)}
                        className={inputClass}
                        placeholder="442100154"
                        dir="ltr"
                      />
                    </label>
                    <label className="block text-sm">
                      <span className="mb-2 block font-semibold">{tr("كلمة المرور")}</span>
                      <input
                        required
                        type="password"
                        value={mockPassword}
                        onChange={(e) => setMockPassword(e.target.value)}
                        className={inputClass}
                        placeholder="••••••••"
                        dir="ltr"
                      />
                    </label>

                    {mockError && (
                      <p className="rounded-xl bg-rose-500/10 px-3 py-2 text-sm font-medium text-rose-700">
                        {mockError}
                      </p>
                    )}

                    <button type="submit" className={glowButtonClass}>{tr("تسجيل الدخول")}</button>
                  </form>

                  <button
                    onClick={() => setShowDemoCreds((s) => !s)}
                    className="mt-4 w-full text-center text-sm font-semibold text-[#E05A00] hover:underline"
                  >
                    {showDemoCreds ? tr("إخفاء بيانات الدخول التجريبية") : tr("عرض بيانات الدخول التجريبية")}
                  </button>

                  {showDemoCreds && (
                    <div className="mt-3 space-y-1.5 rounded-xl bg-white p-3">
                      {demoCredentials.map((c) => {
                        const member = teamMembers.find((m) => m.id === c.memberId)!;
                        return (
                          <button
                            key={c.memberId}
                            type="button"
                            onClick={() => {
                              setUniversityId(c.universityId);
                              setMockPassword(c.password);
                              setMockError(null);
                            }}
                            className="flex w-full items-center justify-between rounded-xl px-2 py-1.5 text-xs hover:bg-black/5"
                          >
                            <span className="font-semibold text-[#3a3330]">
                              {member.name}
                              {member.role === "leader" && (
                                <span className="ms-1 text-[#E05A00]">{tr("(قائدة الفريق)")}</span>
                              )}
                            </span>
                            <span className="font-mono text-[#8a8079]" dir="ltr">
                              {c.universityId} / {c.password}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <p className="mt-6 text-center text-xs text-[#8a8079]">{tr("هذا تسجيل دخول تجريبي بمحاكاة بوابة الطالب — لتفعيل تسجيل دخول حقيقي بالبريد الجامعي وكلمة المرور، أضف مفاتيح Supabase في متغيرات البيئة (راجع ملف .env.example).")}</p>
                </>
              )}
            </div>
          </main>
          <footer className="pb-1 text-center text-xs tracking-wide text-[#8a8079]">{tr("منصة إدارة أبحاث التمريض")}</footer>
        </div>

        {/* الجنب: صور حقيقية ملوّنة — كولاج للتسجيل، وصورة + ويسي للدخول */}
        <aside className="side" aria-hidden>
          {signUpView ? (
            <div className="bl-mosaic">
              {[["purple", "#7B61FF", tr("اكتبوا")], ["team", "#FF6A00", tr("الفريق")], ["mint", "#3ED6A0", tr("راجعوا")], ["poster", "#7B61FF", tr("قدّموا")], ["yellow", "#FFC93C", tr("حلّلوا")]].map(([k, c, t], i) => (
                <div key={k} className="bl-tile bl-pop" style={{ background: c, animationDelay: `${0.1 + i * 0.12}s` }}>
                  <img src={`/lux/ph-${k}.webp`} alt="" style={{ objectPosition: "center 30%" }} />
                  <span className="bl-tag">{t}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="bl-tile bl-pop" style={{ height: "100%", borderRadius: 36, background: "#5EE0C0" }}>
              <img src="/lux/ph-turq.webp" alt="" style={{ objectPosition: "center 40%" }} />
              <div className="bl-fl" style={{ position: "absolute", top: 44, insetInlineStart: 36, zIndex: 2 }}>
                <div className="bl-card bl-bub" style={{ width: 330 }}>
                  <img src="/lux/wesy-face.webp" alt="" />
                  <div><b>{tr("ويسي")}</b><p>{tr("هلا من جديد. فريقكم ينتظركم، نكمّل من وين وقفتوا؟")}</p></div>
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
