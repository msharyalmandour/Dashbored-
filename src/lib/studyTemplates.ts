/** قوالب نصية جاهزة (إذن الأداة، ورقة المعلومات، الموافقة المستنيرة، خطاب الجهة).
    كلها مبنية على عناصر الموافقة المستنيرة المعتمدة بإعلان هلسنكي واللجنة الوطنية لأخلاقيات البحث الحيوي
    (الطوعية، حق الانسحاب، السرية، تقليل الضرر). القوالب نقطة بداية — لجنة الأخلاقيات/المشرفة لها الكلمة النهائية،
    وعدّلوا ما بين [أقواس] قبل الاستخدام. */

export interface TemplateContext {
  title: string;
  supervisor: string;
  members: string[];
  university: string;
  population: string;
  toolName: string;
  contactEmail: string;
  duration: string;
}

const v = (s: string, fallback: string) => (s.trim() ? s.trim() : `[${fallback}]`);

export type TemplateId = "tool-permission" | "info-ar" | "consent-ar" | "info-en" | "consent-en" | "site-letter";

export const templateMeta: Record<TemplateId, { label: string; rtl: boolean; hint: string }> = {
  "tool-permission": { label: "طلب إذن استخدام أداة (إنجليزي)", rtl: false, hint: "ترسلونه لصاحب الاستبيان قبل ما تستخدمونه أو تترجمونه." },
  "site-letter": { label: "خطاب طلب تسهيل جمع البيانات", rtl: true, hint: "للمستشفى أو القسم أو الكلية اللي بتجمعون منها." },
  "info-ar": { label: "ورقة معلومات المشارك (عربي)", rtl: true, hint: "تُعطى للمشارك قبل الموافقة." },
  "consent-ar": { label: "نموذج الموافقة المستنيرة (عربي)", rtl: true, hint: "يوقعه المشارك (أو يضغط موافق بالاستبيان الإلكتروني)." },
  "info-en": { label: "Participant Information Sheet (English)", rtl: false, hint: "للجنة الأخلاقيات أو لو العينة تقرأ الإنجليزي." },
  "consent-en": { label: "Informed Consent Form (English)", rtl: false, hint: "نسخة إنجليزية من الموافقة." },
};

export function buildTemplate(id: TemplateId, c: TemplateContext): string {
  const title = v(c.title, "عنوان البحث");
  const sup = v(c.supervisor, "اسم المشرفة");
  const team = c.members.length ? c.members.join("، ") : "[أسماء الباحثات]";
  const uni = v(c.university, "اسم الجامعة/الكلية");
  const pop = v(c.population, "فئة المشاركين");
  const mail = v(c.contactEmail, "إيميل التواصل");
  const dur = v(c.duration, "١٠–١٥ دقيقة");
  const tool = v(c.toolName, "Instrument name");

  switch (id) {
    case "tool-permission":
      return `Dear Professor [Author name],

We are undergraduate nursing students at ${uni}, working on a graduation research project titled "${title}" under the supervision of ${sup}.

We would be grateful for your permission to use the "${tool}" in our study with ${pop}. We plan to use it for academic, non-commercial purposes only, with full citation of the original authors.

If needed, we would also like to ask for your permission to translate the instrument into Arabic using a standard forward-and-back translation procedure, and to share the translated version with you afterwards.

Could you please also let us know whether there are any scoring instructions or licence terms we should follow?

Thank you very much for your time and for developing this instrument.

Kind regards,
${team}
${uni}
${mail}`;

    case "site-letter":
      return `سعادة/ [المسمى الوظيفي — مثل: مديرة إدارة التمريض / عميدة الكلية] المحترمة

السلام عليكم ورحمة الله وبركاته،

نحن طالبات ${uni}، ونعمل على بحث التخرج بعنوان: «${title}» بإشراف ${sup}.

نأمل التكرم بالموافقة على تسهيل جمع البيانات من ${pop} في [اسم القسم/الوحدة/المستشفى] خلال الفترة [من تاريخ — إلى تاريخ]. علمًا أن:
١) المشاركة طوعية بالكامل ولا تؤثر على العمل أو التقييم.
٢) البيانات سرية وتُستخدم لأغراض البحث العلمي فقط، ولا تُذكر أسماء المشاركين.
٣) الوقت المتوقع لتعبئة الاستبيان: ${dur}، ويُملأ خارج أوقات رعاية المرضى.
٤) حصلنا/سنحصل على موافقة لجنة أخلاقيات البحث قبل البدء [رقم الموافقة إن وُجد].

نرفق: خطاب المشرفة، ونسخة من الاستبيان، وورقة معلومات المشارك.

شاكرين لكم حسن تعاونكم،

${team}
${uni}
للتواصل: ${mail}`;

    case "info-ar":
      return `ورقة معلومات المشارك

عنوان البحث: ${title}
الباحثات: ${team}
المشرفة الأكاديمية: ${sup}
الجهة: ${uni}

عزيزي المشارك / عزيزتي المشاركة،

ندعوك للمشاركة في دراسة بحثية. قبل أن تقرر، نرجو قراءة هذي المعلومات بعناية.

١. ما هدف الدراسة؟
[اكتبوا هدف الدراسة بجملة أو جملتين بلغة بسيطة.]

٢. لماذا تم اختيارك؟
لأنك تنتمي إلى الفئة المستهدفة: ${pop}.

٣. ماذا يتطلب منك؟
تعبئة استبيان يستغرق حوالي ${dur}.

٤. هل المشاركة إلزامية؟
لا. مشاركتك طوعية تمامًا، ولك الحق في الانسحاب في أي وقت أو ترك أي سؤال دون ذكر السبب ودون أي أثر سلبي عليك.

٥. ما المخاطر والفوائد؟
لا يوجد ضرر متوقع من المشاركة. لا توجد فائدة شخصية مباشرة، لكن نتائج الدراسة قد تساهم في تحسين [مجال الدراسة].

٦. كيف نحمي خصوصيتك؟
لا يُطلب اسمك ولا أي معلومة تدل على هويتك. تُحفظ البيانات في ملف محمي بكلمة مرور ولا يطّلع عليها إلا فريق البحث والمشرفة، وتُعرض النتائج بشكل مجمّع فقط، وتُحذف بعد [مدة الحفظ] من انتهاء البحث.

٧. للأسئلة والاستفسار:
${team} — ${mail}
المشرفة: ${sup}
لجنة أخلاقيات البحث: [بيانات التواصل مع اللجنة]`;

    case "consent-ar":
      return `نموذج الموافقة المستنيرة

عنوان البحث: ${title}

أقرّ بأنني:
☐ قرأت ورقة معلومات المشارك وفهمت هدف الدراسة وما يُطلب مني.
☐ أُتيحت لي فرصة طرح الأسئلة وحصلت على إجابات مقنعة.
☐ أفهم أن مشاركتي طوعية، وأن لي الحق في الانسحاب في أي وقت دون ذكر السبب ودون أي أثر سلبي.
☐ أفهم أن بياناتي ستبقى سرية ولن تُنشر إلا بشكل مجمّع بدون أي معلومة تدل على هويتي.
☐ أوافق على المشاركة في هذه الدراسة.

الاسم (اختياري): ______________________
التوقيع: ______________________   التاريخ: ____ / ____ / ________

الباحثة: ______________________   التوقيع: ______________________   التاريخ: ____ / ____ / ________

(بالاستبيان الإلكتروني: تُعرض الفقرات بالأعلى، ويُعتبر ضغط «أوافق على المشاركة» موافقة، ولا يُسمح بالمتابعة بدونه.)`;

    case "info-en":
      return `Participant Information Sheet

Study title: ${title}
Researchers: ${team}
Academic supervisor: ${sup}
Institution: ${uni}

You are invited to take part in a research study. Please read this information carefully before you decide.

1. What is the purpose of the study?
[Describe the aim in one or two plain-language sentences.]

2. Why have you been chosen?
You belong to the target group: ${pop}.

3. What will you be asked to do?
Complete a questionnaire that takes about ${dur}.

4. Do you have to take part?
No. Participation is entirely voluntary. You may withdraw at any time, or skip any question, without giving a reason and without any negative consequence.

5. Risks and benefits
No harm is expected. There is no direct personal benefit, but the results may help improve [field of study].

6. How will your privacy be protected?
No names or identifying information will be collected. Data will be stored in a password-protected file accessible only to the research team and supervisor, reported in aggregate only, and deleted [retention period] after the study ends.

7. Questions?
${team} — ${mail}
Supervisor: ${sup}
Research Ethics Committee: [contact details]`;

    case "consent-en":
      return `Informed Consent Form

Study title: ${title}

I confirm that:
☐ I have read the Participant Information Sheet and understand the purpose of the study and what is asked of me.
☐ I have had the opportunity to ask questions and received satisfactory answers.
☐ I understand that my participation is voluntary and that I may withdraw at any time without giving a reason and without any negative consequence.
☐ I understand that my data will remain confidential and will only be reported in aggregate, without identifying information.
☐ I agree to take part in this study.

Name (optional): ______________________
Signature: ______________________   Date: ____ / ____ / ________

Researcher: ______________________   Signature: ______________________   Date: ____ / ____ / ________`;
  }
}

export interface ChecklistItem {
  key: string;
  label: string;
  hint?: string;
}

/** ترجمة وتكييف استبيان — الخطوات المعتمدة (Brislin / إرشادات ISPOR المبسّطة) */
export const translationChecklist: ChecklistItem[] = [
  { key: "permission", label: "أخذنا إذن صاحب الأداة (وحفظنا الرد)", hint: "استخدموا قالب «طلب إذن استخدام أداة»." },
  { key: "forward", label: "ترجمة أمامية (إنجليزي → عربي) من مترجمَين مستقلَّين", hint: "الأفضل واحد منهم من التمريض والثاني غير متخصص." },
  { key: "synthesis", label: "دمج الترجمتين بنسخة عربية واحدة متفق عليها" },
  { key: "back", label: "ترجمة عكسية (عربي → إنجليزي) من مترجم ثالث ما شاف الأصل", hint: "هذا يكشف الأخطاء بالمعنى." },
  { key: "compare", label: "قارنا الترجمة العكسية بالنسخة الأصلية وعدّلنا الفروقات" },
  { key: "experts", label: "عرضناها على ٣–٥ خبراء لتقييم وضوح وملاءمة كل فقرة (صدق المحتوى)" },
  { key: "pretest", label: "جرّبناها على ٥–١٠ أشخاص من الفئة وسألناهم عن أي غموض" },
  { key: "pilot", label: "دراسة استطلاعية (Pilot) على ٣٠ مشاركًا تقريبًا وحسبنا ألفا كرونباخ", hint: "استخدموا «استوديو الإحصاء ← حلّلوا بياناتكم ← ثبات المقياس»." },
  { key: "final", label: "اعتمدنا النسخة النهائية ووثّقنا كل الخطوات للمنهجية" },
];

export const beforeDataChecklist: ChecklistItem[] = [
  { key: "ethics", label: "موافقة لجنة أخلاقيات البحث (قبل أي جمع بيانات)" },
  { key: "site", label: "موافقة الجهة (المستشفى/القسم/الكلية)" },
  { key: "tool", label: "إذن الأداة + النسخة النهائية جاهزة" },
  { key: "size", label: "حجم العينة محسوب ومكتوب بالمنهجية", hint: "استوديو الإحصاء ← حجم العينة." },
  { key: "consent", label: "ورقة المعلومات ونموذج الموافقة جاهزة (ورقي أو إلكتروني)" },
  { key: "pilot", label: "جرّبنا الاستبيان على مجموعة صغيرة" },
  { key: "storage", label: "خطة حفظ البيانات وسريتها (كلمة مرور، بدون أسماء)" },
  { key: "plan", label: "خطة التحليل الإحصائي مكتوبة (أي اختبار لأي سؤال)", hint: "استوديو الإحصاء ← أي اختبار؟" },
  { key: "supervisor", label: "المشرفة اطلعت وأعطتنا الضوء الأخضر" },
];
