import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, Navigate, useLocation, useSearchParams } from "react-router-dom";
import { Gift, Infinity as InfinityIcon, Users } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { demoCredentials, teamMembers } from "../data/mockData";
import Logo from "../components/Logo";

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
    "w-full rounded-2xl border border-white/[0.12] bg-white/[0.04] px-[18px] py-3.5 text-[15px] text-white outline-none transition-[border-color,box-shadow] placeholder:text-[#8F8378] focus:border-[#ff8a24]/70 focus:shadow-[0_0_0_4px_rgba(255,138,36,0.14)]";
  const glowButtonClass =
    "w-full rounded-full bg-gradient-to-l from-[#ffb547] to-[#ff6a00] py-4 text-[17px] font-bold text-[#1a0f00] shadow-[0_14px_40px_rgba(255,107,0,0.35)] transition hover:brightness-110 disabled:opacity-60";
  // في النسخة التجريبية (mock) ما فيه إنشاء حساب، فعنوان الإنشاء يطلع بس بالوضع الحقيقي
  const signUpView = isSignUp && mode === "supabase";

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#260600]">
      <picture>
        <source media="(max-width: 767px)" srcSet="/landing/students-m.webp" />
        <img
          src="/landing/students.webp"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          style={{ filter: "blur(18px)", transform: "scale(1.08)" }}
        />
      </picture>
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(ellipse at 50% 50%,rgba(8,8,8,.15),rgba(8,8,8,.6) 80%)" }}
      />

      <div className="relative z-10 flex min-h-screen flex-col items-center px-4 py-8">
        <main className="flex w-full flex-1 flex-col items-center justify-center py-6">
            <div className="w-full max-w-[500px] animate-[panel-in_0.5s_ease-out] rounded-[40px] border border-[rgba(255,220,180,.25)] bg-[rgba(20,8,4,.55)] p-7 text-[#F6F1EC] shadow-[0_60px_140px_rgba(0,0,0,.55),inset_0_1px_0_rgba(255,240,220,.25)] backdrop-blur-[30px] backdrop-saturate-150 sm:p-10">
              <div className="mb-7 space-y-5">
                <div className="flex items-center justify-between gap-3">
                  <Link to="/" aria-label="Wesync — الصفحة الرئيسية" className="flex items-center gap-2.5 font-kufi text-xl font-extrabold">
                    <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full border-[1.5px] border-[#FFB444] text-[#FFB444]">
                      <InfinityIcon size={18} strokeWidth={2.25} />
                    </span>
                    Wesync
                  </Link>
                  {mode === "supabase" && !isForgotPassword && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsSignUp((v) => !v);
                        setError(null);
                      }}
                      className="text-sm text-[#B8ADA2]"
                    >
                      {isSignUp ? (
                        <>
                          عندك حساب؟ <span className="text-[#FFB444]">ادخل</span>
                        </>
                      ) : (
                        <>
                          ما عندك حساب؟ <span className="text-[#FFB444]">أنشئ واحد</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
                <div>
                  <h1 className="font-kufi text-[34px] font-extrabold leading-[1.3] sm:text-[38px]">
                    {isForgotPassword ? (
                      "استرجاع كلمة المرور"
                    ) : signUpView ? (
                      <>
                        ابدأوا بحثكم
                        <br />
                        بالترتيب الصح.
                      </>
                    ) : (
                      "تسجيل الدخول"
                    )}
                  </h1>
                  {signUpView && !isForgotPassword && (
                    <p className="mt-2 font-light text-[#B8ADA2]">٧ أيام مجانًا كاملة، بدون بطاقة دفع.</p>
                  )}
                  {inviteTeamId && mode === "supabase" && (
                    <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#ff8a24]/15 px-3 py-1 text-xs font-bold text-[#ffb547]">
                      <Users size={13} />
                      دعوة انضمام لفريق بحثي — أكملوا التسجيل بالأسفل
                    </span>
                  )}
                  {!inviteTeamId && referralCode && mode === "supabase" && (
                    <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#ff8a24]/15 px-3 py-1 text-xs font-bold text-[#ffb547]">
                      <Gift size={13} />
                      دعوة من فريق بحثي — أنشئوا حسابكم وابدأوا تجربة ٧ أيام مجانية 🎉
                    </span>
                  )}
                </div>
              </div>

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
                        <span className="mb-2 block font-semibold">البريد الجامعي</span>
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
                        <span className="mb-2 block font-semibold">الاسم الكامل</span>
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
                        <span className="mb-2 block font-semibold">نخاطبك بـ</span>
                        <div className="flex rounded-full border border-white/[0.12] bg-white/[0.04] p-1">
                          {(
                            [
                              ["female", "أنتِ"],
                              ["male", "أنتَ"],
                            ] as const
                          ).map(([g, label]) => (
                            <button
                              key={g}
                              type="button"
                              onClick={() => setGender(g)}
                              aria-pressed={gender === g}
                              className={`flex-1 rounded-full px-3 py-2.5 text-sm font-semibold transition-colors ${
                                gender === g
                                  ? "bg-gradient-to-l from-[#ffb547] to-[#ff6a00] text-[#1a0f00]"
                                  : "text-[#B8ADA2] hover:text-white"
                              }`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <label className="block text-sm">
                      <span className="mb-2 block font-semibold">البريد الجامعي</span>
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
                      <span className="mb-2 block font-semibold">كلمة المرور</span>
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

                    {isSignUp && !inviteTeamId && !manualTeamCode.trim() && (
                      <label className="block text-sm">
                        <span className="mb-2 block font-semibold">
                          الجامعة <span className="font-normal text-[#8F8378]">(اختياري)</span>
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
                    {isSignUp && !inviteTeamId && showManualTeamCode && (
                      <label className="block text-sm">
                        <span className="mb-2 block font-semibold">رمز دعوة الفريق</span>
                        <input
                          value={manualTeamCode}
                          onChange={(e) => setManualTeamCode(e.target.value)}
                          className={inputClass}
                          placeholder="الصقيه من صفحة الفريق عند قائدة فريقكم"
                          dir="ltr"
                        />
                      </label>
                    )}
                    {error && (
                      <p className="rounded-xl bg-rose-500/10 px-3 py-2 text-sm font-medium text-rose-300">
                        {error}
                      </p>
                    )}

                    <button type="submit" disabled={submitting} className={glowButtonClass}>
                      {submitting ? "..." : isSignUp ? "أنشئ حسابي" : "تسجيل الدخول"}
                    </button>
                    {isSignUp && !inviteTeamId && !showManualTeamCode && (
                      <button
                        type="button"
                        onClick={() => setShowManualTeamCode(true)}
                        className="block w-full text-center text-sm text-[#B8ADA2]"
                      >
                        عندك رمز دعوة من فريقك؟ <span className="text-[#FFB444]">ادخله هنا</span>
                      </button>
                    )}
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

                </>
              ) : (
                <>
                  <form onSubmit={handleMockSubmit} className="space-y-3">
                    <label className="block text-sm">
                      <span className="mb-2 block font-semibold">الرقم الجامعي</span>
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
                      <span className="mb-2 block font-semibold">كلمة المرور</span>
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
