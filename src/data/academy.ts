import { tr } from "../lib/i18n";

/** إشارات حقيقية من شغل المستخدم/ة والفريق — كل درس يكتمل لحاله لما الإشارة تصير true */
export interface AcademySignals {
  avatar: boolean;
  push: boolean;
  chatMsg: boolean;
  teamJoined: boolean;
  topic: boolean;
  agent: boolean;
  paper: boolean;
  litRow: boolean;
  taskDone: boolean;
  chatTask: boolean;
  section: boolean;
  poll: boolean;
  supInvited: boolean;
  askOrBook: boolean;
  minutes: boolean;
  report: boolean;
}

export type LessonId = keyof AcademySignals;

export interface Lesson {
  id: LessonId;
  title: string;
  /** ليش يهمكم — سطر واحد */
  why: string;
  /** خطوات قصيرة تسوونها بأيديكم */
  steps: string[];
  /** وين نوديكم */
  route: string;
  /** العنصر اللي نأشّر عليه (أول واحد يلقاه). لو ما لقيناه: بطاقة الشرح بدون إضاءة */
  target?: string;
  /** الجملة اللي تطلع جنب العنصر */
  tip: string;
  /** دقايق تقريبية */
  minutes: number;
  /** القائد بس يقدر يسويها — لغيره تبان بس ما تنحسب */
  leaderOnly?: boolean;
}

export interface Chapter {
  id: string;
  title: string;
  sub: string;
  lessons: Lesson[];
}

export const chapters: Chapter[] = [
  {
    id: "start",
    title: tr("البداية"),
    sub: tr("خمس دقايق وتصيرون جاهزين"),
    lessons: [
      {
        id: "avatar",
        title: tr("اختاروا شخصيتكم"),
        why: tr("الفريق يعرفكم من شكلكم بالمحادثة والمهام بدل حروف."),
        steps: [tr("اضغطوا زر الإعدادات فوق"), tr("اختاروا «شخصيتك»"), tr("اختاروا الشكل واللون واحفظوا")],
        route: "/",
        target: '[data-learn="settings"]',
        tip: tr("من هنا: «شخصيتك» أول خيار."),
        minutes: 1,
      },
      {
        id: "push",
        title: tr("شغّلوا الإشعارات"),
        why: tr("أي رسالة أو مهمة أو رد من المشرف/ة يوصل جوالكم على طول."),
        steps: [tr("افتحوا صفحة الفريق"), tr("بكرت التنبيهات اضغطوا «شغّلوا»"), tr("وافقوا لما المتصفح يسأل")],
        route: "/team",
        target: '[data-learn="push"]',
        tip: tr("اضغطوا التشغيل هنا ووافقوا على الإذن."),
        minutes: 1,
      },
      {
        id: "chatMsg",
        title: tr("أرسلوا أول رسالة للفريق"),
        why: tr("المحادثة هنا مربوطة بالمهام والدراسات والمشرف/ة، مو مثل واتساب."),
        steps: [tr("افتحوا المحادثة"), tr("اكتبوا سلام أو سؤال"), tr("اضغطوا إرسال")],
        route: "/chat",
        target: ".tc-input",
        tip: tr("اكتبوا هنا وأرسلوا."),
        minutes: 1,
      },
      {
        id: "teamJoined",
        title: tr("كمّلوا الفريق"),
        why: tr("كل عضو يدخل يشوف مهامه ويشتغل معكم بنفس المكان."),
        steps: [tr("افتحوا صفحة الفريق"), tr("انسخوا رابط الدعوة"), tr("أرسلوه للفريق بالواتساب")],
        route: "/team",
        target: '[data-learn="invite"]',
        tip: tr("هذا رابط فريقكم، أرسلوه للأعضاء."),
        minutes: 2,
        leaderOnly: true,
      },
    ],
  },
  {
    id: "research",
    title: tr("البحث"),
    sub: tr("من الفكرة لأول دراسة بالجدول"),
    lessons: [
      {
        id: "topic",
        title: tr("اكتبوا موضوع البحث"),
        why: tr("الوكيل والاقتراحات كلها تشتغل من موضوعكم."),
        steps: [tr("افتحوا المقترح"), tr("بكرت «معلومات البحث» اضغطوا «عدّل»"), tr("اكتبوا العنوان، سطر واحد يكفي")],
        route: "/proposal",
        target: '[data-learn="topic"]',
        tip: tr("اضغطوا «عدّل» واكتبوا عنوان بحثكم."),
        minutes: 2,
      },
      {
        id: "agent",
        title: tr("اسألوا وكيل Wesync"),
        why: tr("يدوّر دراسات حقيقية، يشرح، ويقترح أسئلة بحث من موضوعكم."),
        steps: [tr("اضغطوا الكرة البرتقالية"), tr("اسألوه مثلًا: وش أفضل منهج لموضوعنا؟"), tr("اقروا الرد واسألوا أكثر")],
        route: "/",
        target: '[data-learn="agent"]',
        tip: tr("هذا الوكيل. اضغطوه واسألوه أي شي."),
        minutes: 2,
      },
      {
        id: "paper",
        title: tr("أضيفوا أول دراسة"),
        why: tr("مكتبة الأدلة تجمع دراساتكم وتطلع لكم المراجع جاهزة."),
        steps: [tr("افتحوا مكتبة الأدلة"), tr("اضغطوا «أضف دراسة»"), tr("الصقوا العنوان أو الرابط واحفظوا")],
        route: "/evidence",
        target: '[data-learn="add-paper"]',
        tip: tr("من هنا تضيفون الدراسة."),
        minutes: 3,
      },
      {
        id: "litRow",
        title: tr("عبّوا صف بجدول الأدبيات"),
        why: tr("الجدول هو قلب مراجعة الأدبيات، والدكتورة تطلبه دايم."),
        steps: [tr("افتحوا مراجعة الأدبيات"), tr("اختاروا الدراسة"), tr("عبّوا الهدف والعينة والبلد")],
        route: "/literature-review",
        tip: tr("اختاروا دراسة وعبّوا خاناتها."),
        minutes: 4,
      },
    ],
  },
  {
    id: "daily",
    title: tr("الشغل اليومي"),
    sub: tr("كيف الفريق يمشي بدون فوضى"),
    lessons: [
      {
        id: "taskDone",
        title: tr("خلّصوا مهمة"),
        why: tr("الفريق والمشرف/ة يشوفون التقدّم بدون ما أحد يسأل."),
        steps: [tr("افتحوا مهامي"), tr("اضغطوا الدائرة جنب المهمة"), tr("تنعلّم خلصت وتنحسب لكم")],
        route: "/tasks",
        target: '[data-learn="task-done"]',
        tip: tr("اضغطوا الدائرة لما تخلصون المهمة."),
        minutes: 1,
      },
      {
        id: "chatTask",
        title: tr("حوّلوا رسالة لمهمة"),
        why: tr("أي اتفاق بالمحادثة يصير مهمة بمسؤول وموعد، وما يضيع."),
        steps: [tr("بالمحادثة اضغطوا مطوّل على رسالة"), tr("اختاروا «حوّلها مهمة»"), tr("حددوا المسؤول والموعد")],
        route: "/chat",
        target: ".tc-row .tc-bubble",
        tip: tr("اضغطوا مطوّل على أي رسالة (أو كلك يمين بالكمبيوتر)."),
        minutes: 2,
      },
      {
        id: "section",
        title: tr("اكتبوا بقسم من المقترح"),
        why: tr("كل قسم له مسؤول، والكتابة تنحفظ لحالها."),
        steps: [tr("افتحوا المقترح"), tr("اختاروا قسمكم"), tr("اكتبوا فقرة وحدة")],
        route: "/proposal",
        tip: tr("اختاروا قسمكم من القائمة وابدأوا تكتبون."),
        minutes: 5,
      },
      {
        id: "poll",
        title: tr("سوّوا تصويت أو صوّتوا"),
        why: tr("بدل نقاش طويل: خيارين وكل واحد يصوّت."),
        steps: [tr("بالمحادثة اضغطوا +"), tr("اختاروا «تصويت»"), tr("اكتبوا السؤال والخيارات")],
        route: "/chat",
        target: ".tc-plus",
        tip: tr("من زر + تسوّون التصويت."),
        minutes: 1,
      },
    ],
  },
  {
    id: "supervisor",
    title: tr("المشرف/ة"),
    sub: tr("تواصل مرتّب يريحكم ويريحها"),
    lessons: [
      {
        id: "supInvited",
        title: tr("ادعوا المشرف/ة"),
        why: tr("تشوف تقدّمكم وتعلّق بدون حساب، وتوصلها التحديثات على إيميلها."),
        steps: [tr("افتحوا صفحة الفريق"), tr("بكرت المشرف/ة اكتبوا إيميلها"), tr("أو أرسلوا لها الرابط بالواتساب")],
        route: "/team",
        target: '[data-learn="sup-link"]',
        tip: tr("من هنا تدعون المشرف/ة."),
        minutes: 2,
        leaderOnly: true,
      },
      {
        id: "askOrBook",
        title: tr("احجزوا موعد أو اسألوها"),
        why: tr("بدل رسائل «متى فاضية؟»: تختار من أوقاتها أو تجاوب بضغطة."),
        steps: [tr("افتحوا الاجتماعات والمشرف/ة"), tr("تبويب المواعيد أو القرارات"), tr("اختاروا وقت أو اكتبوا سؤال")],
        route: "/meeting-minutes?tab=appointments",
        tip: tr("اختاروا وقت من المواعيد، أو روحوا للقرارات واسألوا."),
        minutes: 2,
      },
      {
        id: "minutes",
        title: tr("سجّلوا محضر اجتماع"),
        why: tr("البنود تتحول لمهام، والمحضر يوصل للمشرف/ة توافق عليه."),
        steps: [tr("افتحوا الاجتماعات"), tr("اضغطوا «+ محضر جديد»"), tr("اكتبوا النقاش والقرارات واحفظوا")],
        route: "/meeting-minutes",
        target: '[data-learn="new-minutes"]',
        tip: tr("من هنا تبدأون المحضر."),
        minutes: 4,
      },
      {
        id: "report",
        title: tr("افتحوا تقرير التقدّم"),
        why: tr("صفحة وحدة PDF ترسلونها للقسم أو اللجنة بأي وقت."),
        steps: [tr("افتحوا صفحة الفريق"), tr("بكرت المشرف/ة اضغطوا «تقرير التقدّم»"), tr("احفظوه PDF")],
        route: "/team",
        target: '[data-learn="report"]',
        tip: tr("هذا رابط التقرير."),
        minutes: 1,
      },
    ],
  },
];

export const allLessons: Lesson[] = chapters.flatMap((c) => c.lessons);

/** المستوى حسب عدد الدروس المكتملة */
export function academyLevel(done: number, total: number): { name: string; next: number | null } {
  const levels = [
    { at: 0, name: tr("مبتدئ/ة") },
    { at: 4, name: tr("بدأتوا صح") },
    { at: 8, name: tr("تعرفون المكان") },
    { at: 12, name: tr("محترفين") },
    { at: total, name: tr("خبراء Wesync") },
  ];
  let cur = levels[0];
  for (const l of levels) if (done >= l.at) cur = l;
  const nxt = levels.find((l) => l.at > done);
  return { name: cur.name, next: nxt ? nxt.at : null };
}
