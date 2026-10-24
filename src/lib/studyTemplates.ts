import { tr } from "./i18n";
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
  "tool-permission": { label: tr("طلب إذن استخدام أداة (إنجليزي)"), rtl: false, hint: tr("ترسلونه لصاحب الاستبيان قبل ما تستخدمونه أو تترجمونه.") },
  "site-letter": { label: tr("خطاب طلب تسهيل جمع البيانات"), rtl: true, hint: tr("للمستشفى أو القسم أو الكلية اللي بتجمعون منها.") },
  "info-ar": { label: tr("ورقة معلومات المشارك (عربي)"), rtl: true, hint: tr("تُعطى للمشارك قبل الموافقة.") },
  "consent-ar": { label: tr("نموذج الموافقة المستنيرة (عربي)"), rtl: true, hint: tr("يوقعه المشارك (أو يضغط موافق بالاستبيان الإلكتروني).") },
  "info-en": { label: "Participant Information Sheet (English)", rtl: false, hint: tr("للجنة الأخلاقيات أو لو العينة تقرأ الإنجليزي.") },
  "consent-en": { label: "Informed Consent Form (English)", rtl: false, hint: tr("نسخة إنجليزية من الموافقة.") },
};

export function buildTemplate(id: TemplateId, c: TemplateContext): string {
  const title = v(c.title, tr("عنوان البحث"));
  const sup = v(c.supervisor, tr("اسم المشرفة"));
  const team = c.members.length ? c.members.join(tr("، ")) : tr("[أسماء الباحثات]");
  const uni = v(c.university, tr("اسم الجامعة/الكلية"));
  const pop = v(c.population, tr("فئة المشاركين"));
  const mail = v(c.contactEmail, tr("إيميل التواصل"));
  const dur = v(c.duration, tr("١٠–١٥ دقيقة"));
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
      return tr("سعادة/ [المسمى الوظيفي — مثل: مديرة إدارة التمريض / عميدة الكلية] المحترمة\n\nالسلام عليكم ورحمة الله وبركاته،\n\nنحن طالبات {0}، ونعمل على بحث التخرج بعنوان: «{1}» بإشراف {2}.\n\nنأمل التكرم بالموافقة على تسهيل جمع البيانات من {3} في [اسم القسم/الوحدة/المستشفى] خلال الفترة [من تاريخ — إلى تاريخ]. علمًا أن:\n١) المشاركة طوعية بالكامل ولا تؤثر على العمل أو التقييم.\n٢) البيانات سرية وتُستخدم لأغراض البحث العلمي فقط، ولا تُذكر أسماء المشاركين.\n٣) الوقت المتوقع لتعبئة الاستبيان: {4}، ويُملأ خارج أوقات رعاية المرضى.\n٤) حصلنا/سنحصل على موافقة لجنة أخلاقيات البحث قبل البدء [رقم الموافقة إن وُجد].\n\nنرفق: خطاب المشرفة، ونسخة من الاستبيان، وورقة معلومات المشارك.\n\nشاكرين لكم حسن تعاونكم،\n\n{5}\n{6}\nللتواصل: {7}", uni, title, sup, pop, dur, team, uni, mail);

    case "info-ar":
      return tr("ورقة معلومات المشارك\n\nعنوان البحث: {0}\nالباحثات: {1}\nالمشرفة الأكاديمية: {2}\nالجهة: {3}\n\nعزيزي المشارك / عزيزتي المشاركة،\n\nندعوك للمشاركة في دراسة بحثية. قبل أن تقرر، نرجو قراءة هذي المعلومات بعناية.\n\n١. ما هدف الدراسة؟\n[اكتبوا هدف الدراسة بجملة أو جملتين بلغة بسيطة.]\n\n٢. لماذا تم اختيارك؟\nلأنك تنتمي إلى الفئة المستهدفة: {4}.\n\n٣. ماذا يتطلب منك؟\nتعبئة استبيان يستغرق حوالي {5}.\n\n٤. هل المشاركة إلزامية؟\nلا. مشاركتك طوعية تمامًا، ولك الحق في الانسحاب في أي وقت أو ترك أي سؤال دون ذكر السبب ودون أي أثر سلبي عليك.\n\n٥. ما المخاطر والفوائد؟\nلا يوجد ضرر متوقع من المشاركة. لا توجد فائدة شخصية مباشرة، لكن نتائج الدراسة قد تساهم في تحسين [مجال الدراسة].\n\n٦. كيف نحمي خصوصيتك؟\nلا يُطلب اسمك ولا أي معلومة تدل على هويتك. تُحفظ البيانات في ملف محمي بكلمة مرور ولا يطّلع عليها إلا فريق البحث والمشرفة، وتُعرض النتائج بشكل مجمّع فقط، وتُحذف بعد [مدة الحفظ] من انتهاء البحث.\n\n٧. للأسئلة والاستفسار:\n{6} — {7}\nالمشرفة: {8}\nلجنة أخلاقيات البحث: [بيانات التواصل مع اللجنة]", title, team, sup, uni, pop, dur, team, mail, sup);

    case "consent-ar":
      return tr("نموذج الموافقة المستنيرة\n\nعنوان البحث: {0}\n\nأقرّ بأنني:\n☐ قرأت ورقة معلومات المشارك وفهمت هدف الدراسة وما يُطلب مني.\n☐ أُتيحت لي فرصة طرح الأسئلة وحصلت على إجابات مقنعة.\n☐ أفهم أن مشاركتي طوعية، وأن لي الحق في الانسحاب في أي وقت دون ذكر السبب ودون أي أثر سلبي.\n☐ أفهم أن بياناتي ستبقى سرية ولن تُنشر إلا بشكل مجمّع بدون أي معلومة تدل على هويتي.\n☐ أوافق على المشاركة في هذه الدراسة.\n\nالاسم (اختياري): ______________________\nالتوقيع: ______________________   التاريخ: ____ / ____ / ________\n\nالباحثة: ______________________   التوقيع: ______________________   التاريخ: ____ / ____ / ________\n\n(بالاستبيان الإلكتروني: تُعرض الفقرات بالأعلى، ويُعتبر ضغط «أوافق على المشاركة» موافقة، ولا يُسمح بالمتابعة بدونه.)", title);

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
  { key: "permission", label: tr("أخذنا إذن صاحب الأداة (وحفظنا الرد)"), hint: tr("استخدموا قالب «طلب إذن استخدام أداة».") },
  { key: "forward", label: tr("ترجمة أمامية (إنجليزي → عربي) من مترجمَين مستقلَّين"), hint: tr("الأفضل واحد منهم من التمريض والثاني غير متخصص.") },
  { key: "synthesis", label: tr("دمج الترجمتين بنسخة عربية واحدة متفق عليها") },
  { key: "back", label: tr("ترجمة عكسية (عربي → إنجليزي) من مترجم ثالث ما شاف الأصل"), hint: tr("هذا يكشف الأخطاء بالمعنى.") },
  { key: "compare", label: tr("قارنا الترجمة العكسية بالنسخة الأصلية وعدّلنا الفروقات") },
  { key: "experts", label: tr("عرضناها على ٣–٥ خبراء لتقييم وضوح وملاءمة كل فقرة (صدق المحتوى)") },
  { key: "pretest", label: tr("جرّبناها على ٥–١٠ أشخاص من الفئة وسألناهم عن أي غموض") },
  { key: "pilot", label: tr("دراسة استطلاعية (Pilot) على ٣٠ مشاركًا تقريبًا وحسبنا ألفا كرونباخ"), hint: tr("استخدموا «استوديو الإحصاء ← حلّلوا بياناتكم ← ثبات المقياس».") },
  { key: "final", label: tr("اعتمدنا النسخة النهائية ووثّقنا كل الخطوات للمنهجية") },
];

export const beforeDataChecklist: ChecklistItem[] = [
  { key: "ethics", label: tr("موافقة لجنة أخلاقيات البحث (قبل أي جمع بيانات)") },
  { key: "site", label: tr("موافقة الجهة (المستشفى/القسم/الكلية)") },
  { key: "tool", label: tr("إذن الأداة + النسخة النهائية جاهزة") },
  { key: "size", label: tr("حجم العينة محسوب ومكتوب بالمنهجية"), hint: tr("استوديو الإحصاء ← حجم العينة.") },
  { key: "consent", label: tr("ورقة المعلومات ونموذج الموافقة جاهزة (ورقي أو إلكتروني)") },
  { key: "pilot", label: tr("جرّبنا الاستبيان على مجموعة صغيرة") },
  { key: "storage", label: tr("خطة حفظ البيانات وسريتها (كلمة مرور، بدون أسماء)") },
  { key: "plan", label: tr("خطة التحليل الإحصائي مكتوبة (أي اختبار لأي سؤال)"), hint: tr("استوديو الإحصاء ← أي اختبار؟") },
  { key: "supervisor", label: tr("المشرفة اطلعت وأعطتنا الضوء الأخضر") },
];
