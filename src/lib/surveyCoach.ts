import { tr } from "./i18n";
// معلّم الاستبيان: أنواع الأسئلة، مدقق الصياغة (قواعد بسيطة بدون ذكاء اصطناعي)، ودروس قصيرة للمبتدئين.

export type QType = "single" | "multi" | "likert" | "number" | "text";

export interface Question {
  id: string;
  type: QType;
  text: string;
  options?: string[];
  required: boolean;
}

export const qTypeMeta: Record<QType, { label: string; hint: string }> = {
  single: { label: tr("اختيار واحد"), hint: tr("المشارك يختار إجابة وحدة (مثل: المرحلة الدراسية)") },
  multi: { label: tr("اختيار متعدد"), hint: tr("يقدر يختار أكثر من إجابة (مثل: وش الأدوات اللي تستخدمها؟)") },
  likert: { label: tr("مقياس ليكرت"), hint: tr("درجة موافقة من ١ إلى ٥ — الأفضل لقياس الآراء والاتجاهات") },
  number: { label: tr("رقم"), hint: tr("إجابة رقمية (مثل: العمر، عدد السنوات)") },
  text: { label: tr("نص حر"), hint: tr("كتابة بحرية — صعبة التحليل، استخدموها بحذر") },
};

export const likertOptions = [tr("أوافق بشدة"), tr("أوافق"), tr("محايد"), tr("لا أوافق"), tr("لا أوافق بشدة")];

export const newId = () => Math.random().toString(36).slice(2, 9);

export function blankQuestion(type: QType): Question {
  return {
    id: newId(),
    type,
    text: "",
    required: true,
    options: type === "single" || type === "multi" ? ["", ""] : undefined,
  };
}

/** قوالب جاهزة تنضاف بضغطة */
export const questionTemplates: { id: string; label: string; hint: string; make: () => Question[] }[] = [
  {
    id: "demo",
    label: tr("بيانات عامة (العمر، الجنس، المرحلة)"),
    hint: tr("كل استبيان تقريبًا يحتاجها — نضعها بالنهاية لأنها أسهل ما تكون"),
    make: () => [
      { id: newId(), type: "number", text: tr("كم عمرك (بالسنوات)؟"), required: true },
      { id: newId(), type: "single", text: tr("ما جنسك؟"), options: [tr("أنثى"), tr("ذكر")], required: true },
      { id: newId(), type: "single", text: tr("ما مرحلتك الدراسية؟"), options: [tr("بكالوريوس"), tr("ماجستير"), tr("دكتوراه"), tr("أخرى")], required: true },
    ],
  },
  {
    id: "satisfaction",
    label: tr("مقياس رضا (٣ عبارات ليكرت)"),
    hint: tr("نموذج لعبارات تقيس نفس الفكرة — تنفع لحساب الثبات"),
    make: () => [
      { id: newId(), type: "likert", text: tr("أشعر بالرضا عن الخدمة المقدمة."), required: true },
      { id: newId(), type: "likert", text: tr("أنصح زملائي بالاستفادة من هذه الخدمة."), required: true },
      { id: newId(), type: "likert", text: tr("الخدمة تلبي احتياجي بشكل عام."), required: true },
    ],
  },
];

// ───────────────────────── مدقق الأسئلة ─────────────────────────

export interface Tip {
  level: "warn" | "info";
  title: string;
  why: string;
  bad?: string;
  good?: string;
}

const LEADING = [tr("ألا تعتقد"), tr("ألا ترى"), tr("أليس"), tr("بلا شك"), tr("من الواضح"), tr("من المؤكد"), tr("لا شك"), tr("رائع"), tr("ممتاز"), tr("سيئ جدًا"), tr("فظيع")];
const ABSOLUTES = [tr("دائمًا"), tr("دائما"), tr("أبدًا"), tr("أبدا"), tr("كل "), tr("جميع"), tr("مطلقًا"), tr("مطلقا")];
const QUALITY_WORDS = [tr("راضٍ"), tr("راضي"), tr("راضية"), tr("جيد"), tr("جيدة"), tr("سهل"), tr("سهلة"), tr("مفيد"), tr("مفيدة"), tr("واضح"), tr("واضحة"), tr("سريع"), tr("سريعة"), tr("مناسب"), tr("مناسبة"), tr("جودة"), tr("سعر"), tr("تكلفة")];

/** يفحص سؤالًا واحدًا ويرجّع نصائح قصيرة تعلّم بدل ما ترفض */
export function lintQuestion(q: Question): Tip[] {
  const tips: Tip[] = [];
  const t = q.text.trim();
  if (!t) return [{ level: "info", title: tr("اكتبوا نص السؤال"), why: tr("السؤال الجيد قصير وواضح ويقيس شي واحد فقط.") }];

  if (LEADING.some((w) => t.includes(w))) {
    tips.push({
      level: "warn",
      title: tr("سؤال موجِّه"),
      why: tr("الصياغة توحي بالإجابة «الصحيحة» فتدفع المشارك لها. هذا يسمى تحيّزًا (Bias) ويخرّب نتائجكم."),
      bad: tr("ألا تعتقد أن الخدمة ممتازة؟"),
      good: tr("ما مدى رضاك عن الخدمة؟ (مقياس من ١ إلى ٥)"),
    });
  }
  const qualityHits = QUALITY_WORDS.filter((w) => t.includes(w)).length;
  if (/\sو\s?\S/.test(t) && (qualityHits >= 2 || /\sو(ال)?\S+\s+و/.test(t))) {
    tips.push({
      level: "warn",
      title: tr("ممكن يكون سؤال مزدوج"),
      why: tr("لو سألتم عن شيئين بسؤال واحد، المشارك ما يعرف يجاوب إذا رأيه بالأول غير الثاني، وأنتم ما تعرفون أي واحد قصد."),
      bad: tr("هل أنت راضٍ عن جودة الخدمة وسعرها؟"),
      good: tr("سؤال للجودة، وسؤال ثاني للسعر"),
    });
  }
  if (ABSOLUTES.some((w) => t.includes(w)) && q.type === "likert") {
    tips.push({
      level: "info",
      title: tr("كلمات مطلقة (دائمًا / أبدًا / كل)"),
      why: tr("الناس نادرًا تقول «دائمًا» أو «أبدًا» بصدق، فتتجمع الإجابات بطرف واحد. الأفضل «غالبًا» أو «أحيانًا»."),
      bad: tr("أنا دائمًا ألتزم بالمواعيد."),
      good: tr("ألتزم بالمواعيد في معظم الأحيان."),
    });
  }
  if (t.length > 140) {
    tips.push({
      level: "info",
      title: tr("السؤال طويل"),
      why: tr("الأسئلة الطويلة تنقرأ بسرعة وتنفهم غلط، خصوصًا على الجوال. حاولوا تختصرون تحت سطرين."),
    });
  }
  if ((q.type === "single" || q.type === "multi") && q.options) {
    const opts = q.options.map((o) => o.trim()).filter(Boolean);
    if (opts.length < 2) {
      tips.push({ level: "warn", title: tr("أضيفوا خيارين على الأقل"), why: tr("سؤال الاختيار يحتاج خيارات واضحة ومتقابلة.") });
    }
    if (new Set(opts).size !== opts.length) {
      tips.push({ level: "warn", title: tr("فيه خيارات مكررة"), why: tr("الخيارات المكررة تربك المشارك وتخرّب العدّ.") });
    }
    if (opts.length >= 3 && !opts.some((o) => /أخرى|غير ذلك|لا أعرف|لا أرغب/.test(o)) && !/عمر|جنس|مرحلة|كم/.test(t)) {
      tips.push({
        level: "info",
        title: tr("فكّروا تضيفون «أخرى» أو «لا أعرف»"),
        why: tr("لو ما فيه خيار ينطبق على المشارك يضطر يختار غلط أو يترك السؤال. خيار «أخرى» يحفظ لكم دقة البيانات."),
      });
    }
  }
  if (q.type === "text") {
    tips.push({
      level: "info",
      title: tr("الأسئلة المفتوحة صعبة التحليل"),
      why: tr("كل رد لازم تقرؤونه وتصنّفونه يدويًا. استخدموا سؤال مفتوح واحد أو اثنين بالأكثر، وفي النهاية (مثل «أي اقتراح؟»)."),
    });
  }
  if (q.type === "likert" && !/[.!]$/.test(t) && /\?|؟/.test(t)) {
    tips.push({
      level: "info",
      title: tr("ليكرت يحتاج «عبارة» مو سؤال"),
      why: tr("خيارات (أوافق ... لا أوافق) تركّب مع عبارة خبرية، مو مع سؤال «هل…؟»."),
      bad: tr("هل الموقع سهل الاستخدام؟"),
      good: tr("الموقع سهل الاستخدام."),
    });
  }
  return tips;
}

export interface SurveyLike {
  title: string;
  goal: string;
  questions: Question[];
  consent_text: string;
}

/** ملاحظات على الاستبيان ككل (طول، ترتيب، موافقة) */
export function lintSurvey(s: SurveyLike): Tip[] {
  const tips: Tip[] = [];
  const n = s.questions.length;
  if (!s.goal.trim()) tips.push({ level: "warn", title: tr("اكتبوا هدف الاستبيان أول"), why: tr("كل سؤال لازم يخدم سؤال بحثكم. بدون هدف واضح ينتهي الاستبيان بأسئلة ما تحتاجونها.") });
  if (n === 0) tips.push({ level: "info", title: tr("لسا ما أضفتم أسئلة"), why: tr("ابدؤوا بأهم سؤال يجاوب هدفكم، وبعدها البيانات العامة.") });
  if (n > 25) tips.push({ level: "warn", title: tr("{0} سؤال — طويل", n), why: tr("بعد ١٠ دقايق ينسحب كثير من المشاركين أو يجاوبون بدون تركيز. قصّوا لكل سؤال ما يخدم هدفكم مباشرة.") });
  const minutes = Math.max(1, Math.round((n * 20) / 60));
  if (n > 0) tips.push({ level: "info", title: tr("الوقت المتوقع: حوالي {0} دقيقة", minutes), why: tr("ذكروا الوقت بأول الاستبيان — يرفع نسبة الإكمال.") });
  const hasDemo = s.questions.some((q) => /عمر|جنس|مرحلة|تخصص/.test(q.text));
  if (n > 0 && !hasDemo) tips.push({ level: "info", title: tr("ما فيه بيانات عامة"), why: tr("غالبًا تحتاجون وصف العينة (العمر، الجنس، المرحلة) بجدول أول النتائج.") });
  const likert = s.questions.filter((q) => q.type === "likert").length;
  if (likert > 0 && likert < 3) tips.push({ level: "info", title: tr("لحساب الثبات (ألفا كرونباخ) تحتاجون ٣ عبارات ليكرت أو أكثر تقيس نفس الفكرة"), why: tr("الثبات = هل العبارات متّسقة مع بعضها.") });
  if (!s.consent_text.trim()) tips.push({ level: "warn", title: tr("الموافقة المستنيرة مطلوبة"), why: tr("قبل ما يبدأ المشارك لازم يعرف الهدف ويعرف أن مشاركته اختيارية ومجهولة.") });
  return tips;
}

// ───────────────────────── دروس قصيرة ─────────────────────────

export const lessons = {
  goal: {
    title: tr("ليش نبدأ بالهدف؟"),
    body: tr("الاستبيان أداة تجاوب سؤال بحثكم، مو قائمة أسئلة عشوائية. اكتبوا سؤال بحثكم بجملة وحدة، وبعدين لكل سؤال بتضيفونه اسألوا: «إجابته بتخدم الهدف؟». إذا لا، احذفوه."),
    example: tr("هدف: ما مستوى رضا طالبات التمريض عن التدريب الميداني؟ → أسئلة عن التدريب الميداني فقط، مو عن المحاضرات."),
  },
  rules: [
    { n: tr("١"), title: tr("فكرة وحدة بكل سؤال"), text: tr("لا تجمعون شيئين بسؤال واحد.") },
    { n: tr("٢"), title: tr("لغة بسيطة ومحايدة"), text: tr("بدون مصطلحات صعبة، وبدون كلمات توحي بالجواب.") },
    { n: tr("٣"), title: tr("خيارات كاملة ومتقابلة"), text: tr("كل مشارك يلقى خيار ينطبق عليه، وما يتداخل خيارين.") },
  ],
  validated: {
    title: tr("قبل تبنون أداة من الصفر"),
    body: tr("لو فيه استبيان جاهز وموثّق (فيه ثبات وصدق) لموضوعكم، استخدامه أقوى من اختراع أسئلة جديدة. تحتاجون بس إذن صاحب الأداة وأحيانًا ترجمة موثقة."),
  },
  consent: {
    title: tr("الموافقة المستنيرة"),
    body: tr("قبل أول سؤال لازم المشارك يعرف: وش الدراسة، إنه مشاركة اختيارية ويقدر ينسحب، وإن إجاباته مجهولة، ومين يتواصل معه لو عنده سؤال."),
    checklist: [tr("اسم الدراسة والفريق"), tr("الهدف بجملة بسيطة"), tr("المشاركة اختيارية وله حق الانسحاب"), tr("الإجابات مجهولة وتُستخدم لأغراض البحث فقط"), tr("وسيلة تواصل")],
  },
  pilot: {
    title: tr("جرّبوا قبل ما تنشرون (دراسة استطلاعية)"),
    body: tr("أرسلوا الاستبيان لـ ٥–١٠ أشخاص يشبهون عينتكم واسألوهم: هل فيه سؤال غامض؟ كم أخذ وقت؟ بعدها عدّلوا. أغلب أخطاء الاستبيان تنكشف بهالخطوة وتوفّر عليكم إعادة الجمع."),
  },
  sample: {
    title: tr("كم عدد الردود اللي تحتاجونها؟"),
    body: tr("حجم العينة يعتمد على حجم مجتمعكم وهامش الخطأ اللي تقبلونه. الحاسبة تحت تعطيكم رقم مبدئي (معادلة كوكران) — ومشرفتكم لها الكلمة النهائية."),
  },
  analysis: {
    title: tr("كيف تقرؤون النتائج؟"),
    body: tr("الأسئلة المغلقة تنعدّ (تكرارات ونسب)، وليكرت يُلخّص بمتوسط وانحراف معياري. لو عندكم ٣ عبارات أو أكثر تقيس نفس الفكرة، احسبوا ألفا كرونباخ: القيمة ٠٫٧٠ فما فوق تُعتبر مقبولة عادةً."),
  },
} as const;
