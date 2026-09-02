import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Navigate, useLocation, useSearchParams } from "react-router-dom";
import { ArrowRight, BookMarked, Coffee, Gift, GraduationCap, Moon, TrendingUp, Users } from "lucide-react";
import ErrorBoundary from "../components/ErrorBoundary";
import GiftMotion from "../components/GiftMotion";
import { useAuth } from "../context/AuthContext";
import { demoCredentials, teamMembers } from "../data/mockData";
import { getGreeting } from "../lib/date";
import Logo from "../components/Logo";

const Scene3D = lazy(() => import("../components/cinematic/Scene3D"));

/** ثلاث محطات حقيقية من رحلة المستخدمة بالتطبيق — نفس روح مؤشر "01/04"
    بمرجع Slider Revolution، بس مربوطة بخطوات فعلية موجودة (مو رمز تحقق وهمي
    مالنا نظام له أصلًا) */
const journeySteps = [
  { n: "01", label: "سجّلي دخولك" },
  { n: "02", label: "افتحي لوحة فريقك" },
  { n: "03", label: "أنجزوا بحثكم" },
];

/** أبرز مزايا NURSYNC — تظهر لأي فريق جديد وقت التسجيل عشان يعرفون وش
    ينتظرهم قبل ما يكملون */
const signupFeatures = [
  { icon: TrendingUp, label: "تتبعوا تقدم بحثكم بمكان واحد" },
  { icon: Users, label: "نسّقوا مع فريقكم بسهولة" },
  { icon: BookMarked, label: "قوالب وأدلة بحثية جاهزة" },
  { icon: GraduationCap, label: "رابط قراءة لمشرفكم بدون دخول" },
];

/** أشكال هندسية شفافة توحي بـ"شبكة بحثية" — دوائر متراكبة وخطوط منحنية،
    بحركة انسياب بطيئة جدًا لإحساس عمق بدون ما تشتت */
function NetworkBackdrop() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.14]"
      viewBox="0 0 800 800"
      fill="none"
      aria-hidden="true"
    >
      <g className="animate-[network-drift_46s_ease-in-out_infinite]" strokeWidth="1">
        <circle cx="150" cy="180" r="130" stroke="#5eead4" />
        <circle cx="640" cy="640" r="190" stroke="#fbbf24" />
        <circle cx="690" cy="130" r="90" stroke="#5eead4" />
        <path d="M110 410 C 260 320, 420 490, 630 260" stroke="#fcd34d" />
        <path d="M50 630 C 240 560, 380 710, 710 560" stroke="#5eead4" />
      </g>
    </svg>
  );
}

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
  const isNight = getGreeting().period === "night";

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

  const [showForm, setShowForm] = useState(!!inviteTeamId || !!referralCode);
  const [isSignUp, setIsSignUp] = useState(!!inviteTeamId || !!referralCode);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [gender, setGender] = useState<"male" | "female">("female");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const result = isSignUp
      ? await signUpWithPassword(
          email,
          password,
          name,
          gender,
          inviteTeamId ?? undefined,
          referralCode ?? undefined,
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

  const inputClass =
    "w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-white outline-none placeholder:text-white/30 focus:border-amber-400/50";
  const glowButtonClass =
    "w-full rounded-xl bg-amber-400 py-2.5 text-sm font-bold text-neutral-950 transition-shadow hover:bg-amber-300 hover:shadow-[0_0_28px_-6px_rgba(251,191,36,0.6)] disabled:opacity-60";

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050b12]">
      <div className="absolute inset-0 bg-gradient-to-b from-[#08211d] via-[#061318] to-[#03060a]" />
      <NetworkBackdrop />
      <ErrorBoundary>
        <Suspense fallback={null}>
          <Scene3D density="light" centerpieceScale={0.95} />
        </Suspense>
      </ErrorBoundary>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_640px_320px_at_center,rgba(3,6,10,0.72),transparent_75%)]" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#03060a] via-transparent to-[#03060a]/50" />

      <div className="relative z-10 flex min-h-screen flex-col items-center px-4 py-8">
        <header className="flex w-full max-w-6xl items-center justify-between">
          <Logo size={34} />
          <span className="hidden text-xs font-semibold tracking-[0.3em] text-white/25 sm:block">
            NURSYNC
          </span>
        </header>

        <main className="flex w-full flex-1 flex-col items-center justify-center py-10">
          {!showForm ? (
            <div className="w-full max-w-2xl animate-[hero-in_0.9s_ease-out] text-center [text-shadow:0_4px_28px_rgba(3,6,10,0.9)]">
              <p className="mb-4 text-xs italic tracking-[0.35em] text-amber-200/70">
                منصة أبحاث التمريض
              </p>
              <h1 className="font-display text-4xl font-extrabold leading-[1.15] text-white sm:text-6xl md:text-7xl">
                فريقك <span className="text-amber-300">بانتظارك</span>
              </h1>
              <p className="mt-5 flex items-center justify-center gap-1.5 text-sm text-white/60">
                {isNight ? (
                  <>
                    تسهر على بحثك؟ لا تنسى راحتك <Moon size={14} className="text-amber-300" />
                  </>
                ) : (
                  <>
                    جهّز فنجان قهوتك، ونبدأ رحلة بحثك <Coffee size={14} className="text-amber-300" />
                  </>
                )}
              </p>

              <button
                onClick={() => setShowForm(true)}
                className="group relative mt-10 rounded-full border border-white/25 px-10 py-3.5 text-sm font-bold tracking-wide text-white transition-colors hover:border-amber-300/70"
              >
                <span className="absolute inset-0 rounded-full bg-amber-400/0 blur-md transition-colors group-hover:bg-amber-400/25" />
                <span className="relative">ابدأ</span>
              </button>

              <div className="mx-auto mt-16 flex max-w-md items-start justify-between">
                {journeySteps.map((step, i) => (
                  <div key={step.n} className="flex flex-1 items-start">
                    <div className="text-center">
                      <p className="font-display text-lg font-bold text-white/30">{step.n}</p>
                      <p className="mt-1 text-[11px] text-white/35">{step.label}</p>
                    </div>
                    {i < journeySteps.length - 1 && (
                      <div className="mt-2.5 h-px flex-1 bg-white/10" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="w-full max-w-md animate-[panel-in_0.5s_ease-out] rounded-3xl border border-white/10 bg-white/[0.04] p-8 shadow-2xl shadow-black/50 backdrop-blur-xl">
              <div className="mb-6 flex flex-col items-center text-center">
                {!inviteTeamId && !referralCode && (
                  <button
                    onClick={() => setShowForm(false)}
                    className="mb-4 flex items-center gap-1 self-start text-xs font-semibold text-white/40 hover:text-amber-300"
                  >
                    <ArrowRight size={14} />
                    رجوع
                  </button>
                )}
                <h2 className="font-display text-xl font-extrabold text-white">
                  {isForgotPassword
                    ? "استرجاع كلمة المرور"
                    : isSignUp
                      ? "إنشاء حساب"
                      : "تسجيل الدخول"}
                </h2>
                {inviteTeamId && mode === "supabase" && (
                  <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-400/15 px-3 py-1 text-xs font-bold text-amber-300">
                    <Users size={13} />
                    دعوة انضمام لفريق بحثي — أكملوا التسجيل بالأسفل
                  </span>
                )}
                {!inviteTeamId && referralCode && mode === "supabase" && (
                  <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-400/15 px-3 py-1 text-xs font-bold text-amber-300">
                    <Gift size={13} />
                    دعوة من فريق بحثي — أنشئوا حسابكم واحصلوا على ٣ أيام وصول فوري 🎉
                  </span>
                )}
              </div>

              {mode === "supabase" && isSignUp && !isForgotPassword && (
                <div className="mb-5 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    {signupFeatures.map((f) => (
                      <div
                        key={f.label}
                        className="flex items-center gap-2 rounded-xl bg-white/5 px-2.5 py-2"
                      >
                        <f.icon size={14} className="shrink-0 text-amber-300" />
                        <span className="text-[11px] font-semibold text-white/70">{f.label}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex animate-[node-pulse_2.2s_ease-in-out_infinite] items-center justify-center gap-2 rounded-2xl border border-amber-400/25 bg-amber-400/10 px-3 py-2.5 text-center">
                    <GiftMotion size={20} />
                    <p className="text-xs font-bold text-amber-300">
                      جربوا NURSYNC مجانًا 3 أيام كاملة — بدون أي التزام، وبعدها اشتراك بسيط
                      بالريال لكل عضو.
                    </p>
                  </div>
                </div>
              )}

              {mode === "supabase" && isForgotPassword ? (
                <>
                  {resetSent ? (
                    <p className="rounded-xl bg-amber-400/10 px-3 py-3 text-center text-sm font-semibold text-amber-300">
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
                          onChange={(e) => setResetEmail(e.target.value)}
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
                    className="mt-4 w-full text-center text-sm font-semibold text-amber-300 hover:underline"
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
                          onChange={(e) => setName(e.target.value)}
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
                            className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors ${
                              gender === "female"
                                ? "border-amber-400 bg-amber-400/10 text-amber-300"
                                : "border-white/15 text-white/50 hover:bg-white/5"
                            }`}
                          >
                            أنثى
                          </button>
                          <button
                            type="button"
                            onClick={() => setGender("male")}
                            className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors ${
                              gender === "male"
                                ? "border-amber-400 bg-amber-400/10 text-amber-300"
                                : "border-white/15 text-white/50 hover:bg-white/5"
                            }`}
                          >
                            ذكر
                          </button>
                        </div>
                      </div>
                    )}
                    <label className="block text-sm">
                      <span className="mb-1 block font-semibold text-white/70">البريد الجامعي</span>
                      <input
                        required
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
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
                        onChange={(e) => setPassword(e.target.value)}
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
                      className="mt-3 w-full text-center text-xs font-semibold text-white/40 hover:text-amber-300 hover:underline"
                    >
                      نسيت كلمة المرور؟
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setIsSignUp((s) => !s);
                      setError(null);
                    }}
                    className="mt-4 w-full text-center text-sm font-semibold text-amber-300 hover:underline"
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
                    className="mt-4 w-full text-center text-sm font-semibold text-amber-300 hover:underline"
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
                                <span className="ms-1 text-amber-400">(قائدة الفريق)</span>
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
          )}
        </main>

        <footer className="pb-1 text-center text-[11px] tracking-wide text-white/30">
          منصة إدارة أبحاث التمريض
        </footer>
      </div>
    </div>
  );
}
