import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, Navigate, useLocation, useSearchParams } from "react-router-dom";
import { ArrowRight, BookMarked, Gift, GraduationCap, TrendingUp, Users } from "lucide-react";
import GiftMotion from "../components/GiftMotion";
import { useAuth } from "../context/AuthContext";
import { demoCredentials, teamMembers } from "../data/mockData";
import Logo from "../components/Logo";

/** أبرز مزايا Wesync — تظهر لأي فريق جديد وقت التسجيل عشان يعرفون وش
    ينتظرهم قبل ما يكملون */
const signupFeatures = [
  { icon: TrendingUp, label: "تتبعوا تقدم بحثكم بمكان واحد" },
  { icon: Users, label: "نسّقوا مع فريقكم بسهولة" },
  { icon: BookMarked, label: "قوالب وأدلة بحثية جاهزة" },
  { icon: GraduationCap, label: "رابط قراءة لمشرفكم بدون دخول" },
];

/** اقتراحات جاهزة بخانة "الجامعة" وقت التسجيل — الحقل نص حر أصلًا
    (datalist)، فأي جامعة مو بالقائمة تُكتب يدويًا بدون أي قيد */
const saudiUniversities = [
  "جامعة الملك سعود",
  "جامعة الملك عبدالعزيز",
  "جامعة الملك فيصل",
  "جامعة الملك خالد",
  "جامعة الأميرة نورة بنت عبدالرحمن",
  "جامعة أم القرى",
  "جامعة طيبة",
  "جامعة القصيم",
  "جامعة الجوف",
  "جامعة تبوك",
  "جامعة نجران",
  "جامعة الباحة",
  "جامعة حائل",
  "جامعة جازان",
  "جامعة الحدود الشمالية",
  "جامعة شقراء",
  "جامعة الإمام عبدالرحمن بن فيصل",
  "جامعة الطائف",
  "الجامعة السعودية الإلكترونية",
  "جامعة الأمير سطام بن عبدالعزيز",
  "جامعة الإمام محمد بن سعود الإسلامية",
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
  const referralCode = searchParams.get("ref");

  // نلتقط هل المستخدمة كانت مسجلة دخولها أصلًا وقت أول تحميل للصفحة (زي
  // استرجاع جلسة محفوظة) — عشان ما نشغّل حركة الاحتفال إلا لما تسجّل دخول
  // فعلي بهذي الزيارة، مو كل مرة يفتح فيها كومبوننت اللوقن
  const wasLoggedInOnMount = useRef(!!currentUser);
  const [celebrating, setCelebrating] = useState(false);
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

  const [isSignUp, setIsSignUp] = useState(!!inviteTeamId || !!referralCode || searchParams.has("signup"));
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
    const from = (location.state as { from?: Location })?.from?.pathname ?? "/";
    return <Navigate to={from} replace />;
  }
  if (readyToNavigate) {
    const from = (location.state as { from?: Location })?.from?.pathname ?? "/";
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
      setError("رمز الفريق غير صحيح — تأكدي إنك نسختيه كامل من صفحة الفريق.");
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
          referralCode ?? undefined,
          effectiveTeamId ? undefined : university || undefined,
        )
      : await signInWithPassword(email, password);

    setSubmitting(false);
    if (result.error) setError(result.error);
    else if (isSignUp) {
      setError("تم إنشاء الحساب! تحقق من بريدك الإلكتروني لتأكيد الحساب ثم سجّل دخولك.");
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
      setMockError("الرقم الجامعي أو كلمة المرور غير صحيحة — جرّب البيانات التجريبية تحت.");
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
    "w-full rounded-full border border-white/15 bg-white/[0.06] px-5 py-3 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] outline-none backdrop-blur-md transition-[border-color,box-shadow] placeholder:text-white/30 focus:border-[#ff8a24]/60 focus:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1),0_0_0_4px_rgba(255,138,36,0.12),0_0_26px_-6px_rgba(255,138,36,0.5)]";
  const glowButtonClass =
    "w-full rounded-full bg-gradient-to-b from-[#ffb547] to-[#ff8a24] py-3 text-sm font-bold text-neutral-950 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.55),0_12px_30px_-10px_rgba(255,138,36,0.65)] transition-shadow hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6),0_14px_36px_-8px_rgba(255,138,36,0.85)] disabled:opacity-60";

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#080808]">
      <div className="absolute inset-0 bg-[#260600]" />
      <picture>
        <source media="(max-width: 767px)" srcSet="/landing/students-m.webp" />
        <img
          src="/landing/students.webp"
          alt=""
          className="ld-hero-img absolute inset-0 h-full w-full scale-110 object-cover object-[25%_center] opacity-70 blur-[3px]"
        />
      </picture>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#080808] via-[#080808]/40 to-[#080808]/70" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_700px_420px_at_center,rgba(8,8,8,0.7),transparent_75%)]" />

      <div className="relative z-10 flex min-h-screen flex-col items-center px-4 py-8">
        <header className="flex w-full max-w-6xl items-center justify-between">
          <Logo size={34} />
          <span className="hidden text-xs font-semibold tracking-[0.3em] text-white/25 sm:block">
            Wesync
          </span>
        </header>

        <main className="flex w-full flex-1 flex-col items-center justify-center py-10">
            <div className="w-full max-w-md animate-[panel-in_0.5s_ease-out] rounded-[2rem] border border-white/15 bg-white/[0.06] p-8 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.14),0_30px_80px_-30px_rgba(0,0,0,0.85),0_0_70px_-25px_rgba(255,138,36,0.45)] backdrop-blur-2xl backdrop-saturate-150">
              <div className="mb-6 flex flex-col items-center text-center">
                {!inviteTeamId && !referralCode && (
                  <Link
                    to="/"
                    className="mb-4 flex items-center gap-1 self-start text-xs font-semibold text-white/40 hover:text-[#ffb547]"
                  >
                    <ArrowRight size={14} />
                    الصفحة الرئيسية
                  </Link>
                )}
                <h2 className="font-display text-xl font-extrabold text-white">
                  {isForgotPassword
                    ? "استرجاع كلمة المرور"
                    : isSignUp
                      ? "إنشاء حساب"
                      : "تسجيل الدخول"}
                </h2>
                {inviteTeamId && mode === "supabase" && (
                  <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#ff8a24]/15 px-3 py-1 text-xs font-bold text-[#ffb547]">
                    <Users size={13} />
                    دعوة انضمام لفريق بحثي — أكملوا التسجيل بالأسفل
                  </span>
                )}
                {!inviteTeamId && referralCode && mode === "supabase" && (
                  <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#ff8a24]/15 px-3 py-1 text-xs font-bold text-[#ffb547]">
                    <Gift size={13} />
                    دعوة من فريق بحثي — أنشئوا حسابكم وابدأوا تجربة ٧ أيام مجانية 🎉
                  </span>
                )}
              </div>

              {mode === "supabase" && isSignUp && !isForgotPassword && (
                <div className="mb-5 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    {signupFeatures.map((f) => (
                      <div
                        key={f.label}
                        className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-2"
                      >
                        <f.icon size={14} className="shrink-0 text-[#ffb547]" />
                        <span className="text-[11px] font-semibold text-white/70">{f.label}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex animate-[node-pulse_2.2s_ease-in-out_infinite] items-center justify-center gap-2 rounded-[1.75rem] border border-[#ff8a24]/25 bg-[#ff8a24]/10 px-4 py-2.5 text-center">
                    <GiftMotion size={20} />
                    <p className="text-xs font-bold text-[#ffb547]">
                      جربوا Wesync مجانًا ٧ أيام كاملة — بدون أي التزام، وبعدها اشتراك بسيط
                      بالريال لكل عضو.
                    </p>
                  </div>
                </div>
              )}

              {mode === "supabase" && isForgotPassword ? (
                <>
                  {resetSent ? (
                    <p className="rounded-xl bg-[#ff8a24]/10 px-3 py-3 text-center text-sm font-semibold text-[#ffb547]">
                      تم إرسال رابط إعادة تعيين كلمة المرور لبريدك — تحقق منه واضغط
                      الرابط لتعيين كلمة مرور جديدة.
                    </p>
                  ) : (
                    <form onSubmit={handleResetSubmit} className="space-y-3">
                      <label className="block text-sm">
                        <span className="mb-1 block font-semibold text-white/70">البريد الجامعي</span>
                        <input
                          required
                          type="email"
                          value={resetEmail}
                          onChange={(e) => {
                            clearValidity(e);
                            setResetEmail(e.target.value);
                          }}
                          onInvalid={arabicInvalidHandler(
                            "البريد الإلكتروني مطلوب",
                            "صيغة البريد الإلكتروني غير صحيحة",
                          )}
                          className={inputClass}
                          placeholder="you@example.com"
                          dir="ltr"
                        />
                      </label>

                      {resetError && (
                        <p className="rounded-xl bg-rose-500/10 px-3 py-2 text-sm font-medium text-rose-300">
                          {resetError}
                        </p>
                      )}

                      <button type="submit" disabled={resetSubmitting} className={glowButtonClass}>
                        {resetSubmitting ? "..." : "إرسال رابط إعادة التعيين"}
                      </button>
                    </form>
                  )}

                  <button
                    onClick={() => {
                      setIsForgotPassword(false);
                      setResetSent(false);
                      setResetError(null);
                    }}
                    className="mt-4 w-full text-center text-sm font-semibold text-[#ffb547] hover:underline"
                  >
                    الرجوع لتسجيل الدخول
                  </button>
                </>
              ) : mode === "supabase" ? (
                <>
                  <form onSubmit={handleSubmit} className="space-y-3">
                    {isSignUp && (
                      <label className="block text-sm">
                        <span className="mb-1 block font-semibold text-white/70">الاسم الكامل</span>
                        <input
                          required
                          value={name}
                          onChange={(e) => {
                            clearValidity(e);
                            setName(e.target.value);
                          }}
                          onInvalid={arabicInvalidHandler("الاسم الكامل مطلوب")}
                          className={inputClass}
                          placeholder="مثال: سارة العتيبي"
                        />
                      </label>
                    )}
                    {isSignUp && (
                      <div className="text-sm">
                        <span className="mb-1 block font-semibold text-white/70">
                          عشان نخاطبك بالصيغة الصح بكل الموقع
                        </span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setGender("female")}
                            className={`flex-1 rounded-full border px-3 py-2.5 text-sm font-semibold transition-colors ${
                              gender === "female"
                                ? "border-[#ff8a24] bg-[#ff8a24]/10 text-[#ffb547]"
                                : "border-white/15 text-white/50 hover:bg-white/5"
                            }`}
                          >
                            أنثى
                          </button>
                          <button
                            type="button"
                            onClick={() => setGender("male")}
                            className={`flex-1 rounded-full border px-3 py-2.5 text-sm font-semibold transition-colors ${
                              gender === "male"
                                ? "border-[#ff8a24] bg-[#ff8a24]/10 text-[#ffb547]"
                                : "border-white/15 text-white/50 hover:bg-white/5"
                            }`}
                          >
                            ذكر
                          </button>
                        </div>
                      </div>
                    )}
                    {isSignUp && !inviteTeamId && !manualTeamCode.trim() && (
                      <label className="block text-sm">
                        <span className="mb-1 block font-semibold text-white/70">
                          الجامعة <span className="font-normal text-white/40">(اختياري)</span>
                        </span>
                        <input
                          list="university-options"
                          value={university}
                          onChange={(e) => setUniversity(e.target.value)}
                          className={inputClass}
                          placeholder="مثال: جامعة الملك سعود"
                        />
                        <datalist id="university-options">
                          {saudiUniversities.map((u) => (
                            <option key={u} value={u} />
                          ))}
                        </datalist>
                      </label>
                    )}
                    {isSignUp && !inviteTeamId && !showManualTeamCode && (
                      <button
                        type="button"
                        onClick={() => setShowManualTeamCode(true)}
                        className="block text-xs font-semibold text-white/40 hover:text-[#ffb547] hover:underline"
                      >
                        عندك رمز دعوة فريق؟ اضغطي هنا
                      </button>
                    )}
                    {isSignUp && !inviteTeamId && showManualTeamCode && (
                      <label className="block text-sm">
                        <span className="mb-1 block font-semibold text-white/70">رمز دعوة الفريق</span>
                        <input
                          value={manualTeamCode}
                          onChange={(e) => setManualTeamCode(e.target.value)}
                          className={inputClass}
                          placeholder="الصقيه من صفحة الفريق عند قائدة فريقكم"
                          dir="ltr"
                        />
                      </label>
                    )}
                    <label className="block text-sm">
                      <span className="mb-1 block font-semibold text-white/70">البريد الجامعي</span>
                      <input
                        required
                        type="email"
                        value={email}
                        onChange={(e) => {
                          clearValidity(e);
                          setEmail(e.target.value);
                        }}
                        onInvalid={arabicInvalidHandler(
                          "البريد الإلكتروني مطلوب",
                          "صيغة البريد الإلكتروني غير صحيحة",
                        )}
                        className={inputClass}
                        placeholder="you@example.com"
                        dir="ltr"
                      />
                    </label>
                    <label className="block text-sm">
                      <span className="mb-1 block font-semibold text-white/70">كلمة المرور</span>
                      <input
                        required
                        type="password"
                        minLength={6}
                        value={password}
                        onChange={(e) => {
                          clearValidity(e);
                          setPassword(e.target.value);
                        }}
                        onInvalid={arabicInvalidHandler(
                          "كلمة المرور مطلوبة",
                          "كلمة المرور لازم تكون ٦ أحرف على الأقل",
                        )}
                        className={inputClass}
                        placeholder="••••••••"
                        dir="ltr"
                      />
                    </label>

                    {error && (
                      <p className="rounded-xl bg-rose-500/10 px-3 py-2 text-sm font-medium text-rose-300">
                        {error}
                      </p>
                    )}

                    <button type="submit" disabled={submitting} className={glowButtonClass}>
                      {submitting ? "..." : isSignUp ? "إنشاء حساب" : "تسجيل الدخول"}
                    </button>
                  </form>

                  {!isSignUp && (
                    <button
                      onClick={() => {
                        setIsForgotPassword(true);
                        setError(null);
                      }}
                      className="mt-3 w-full text-center text-xs font-semibold text-white/40 hover:text-[#ffb547] hover:underline"
                    >
                      نسيت كلمة المرور؟
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setIsSignUp((s) => !s);
                      setError(null);
                    }}
                    className="mt-4 w-full text-center text-sm font-semibold text-[#ffb547] hover:underline"
                  >
                    {isSignUp ? "عندك حساب؟ سجّل دخولك" : "ما عندك حساب؟ أنشئ واحد"}
                  </button>
                </>
              ) : (
                <>
                  <form onSubmit={handleMockSubmit} className="space-y-3">
                    <label className="block text-sm">
                      <span className="mb-1 block font-semibold text-white/70">الرقم الجامعي</span>
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
                      <span className="mb-1 block font-semibold text-white/70">كلمة المرور</span>
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
                      <p className="rounded-xl bg-rose-500/10 px-3 py-2 text-sm font-medium text-rose-300">
                        {mockError}
                      </p>
                    )}

                    <button type="submit" className={glowButtonClass}>
                      تسجيل الدخول
                    </button>
                  </form>

                  <button
                    onClick={() => setShowDemoCreds((s) => !s)}
                    className="mt-4 w-full text-center text-sm font-semibold text-[#ffb547] hover:underline"
                  >
                    {showDemoCreds ? "إخفاء بيانات الدخول التجريبية" : "عرض بيانات الدخول التجريبية"}
                  </button>

                  {showDemoCreds && (
                    <div className="mt-3 space-y-1.5 rounded-xl bg-white/5 p-3">
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
                            className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-xs hover:bg-white/10"
                          >
                            <span className="font-semibold text-white/70">
                              {member.name}
                              {member.role === "leader" && (
                                <span className="ms-1 text-[#ffb547]">(قائدة الفريق)</span>
                              )}
                            </span>
                            <span className="font-mono text-white/40" dir="ltr">
                              {c.universityId} / {c.password}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <p className="mt-6 text-center text-xs text-white/35">
                    هذا تسجيل دخول تجريبي بمحاكاة بوابة الطالب — لتفعيل تسجيل دخول
                    حقيقي بالبريد الجامعي وكلمة المرور، أضف مفاتيح Supabase في
                    متغيرات البيئة (راجع ملف .env.example).
                  </p>
                </>
              )}
            </div>
        </main>

        <footer className="pb-1 text-center text-[11px] tracking-wide text-white/30">
          منصة إدارة أبحاث التمريض
        </footer>
      </div>
    </div>
  );
}
