import { tr } from "../lib/i18n";
export interface MethodologyTemplate {
  id: string;
  label: string;
  studyDesign: string;
  inclusionCriteria: string[];
  exclusionCriteria: string[];
  samplingTechnique: string;
  dataCollectionMethods: string[];
  suggestedTool: string;
}

/** قوالب مبدئية شائعة حسب نوع الدراسة — نقطة بداية تحتاج تعديل حسب دراستكم
    الفعلية، مو محتوى جاهز للتسليم مباشرة */
export const methodologyTemplates: MethodologyTemplate[] = [
  {
    id: "cross-sectional",
    label: tr("دراسة مسحية مقطعية"),
    studyDesign: tr("دراسة كمية وصفية مقطعية (Quantitative Cross-sectional Descriptive Study)"),
    inclusionCriteria: [
      tr("ممرضون/ممرضات مسجّلون رسميًا ويعملون بشكل فعلي بالقسم المستهدف"),
      tr("خبرة عمل لا تقل عن 6 أشهر بالتخصص"),
      tr("موافقون على المشاركة طواعية"),
    ],
    exclusionCriteria: [
      tr("الموظفون الإداريون أو من لا يقدّمون رعاية مباشرة للمرضى"),
      tr("من هم بإجازة طويلة وقت جمع البيانات"),
    ],
    samplingTechnique: tr("عينة عشوائية طبقية (Stratified Random Sampling) حسب القسم"),
    dataCollectionMethods: [tr("استبيان إلكتروني مُقنن"), tr("توزيع ورقي بديل لمن لا يفضّل الإلكتروني")],
    suggestedTool: tr("استبيان جاهز ومُختبر مسبقًا (Existing Validated Questionnaire) إن توفر بموضوعكم"),
  },
  {
    id: "systematic-review",
    label: tr("مراجعة منهجية"),
    studyDesign: tr("مراجعة منهجية للأدبيات (Systematic Review) باتباع إطار PRISMA 2020"),
    inclusionCriteria: [
      tr("دراسات منشورة بمجلات محكّمة خلال آخر 10 سنوات"),
      tr("دراسات باللغة الإنجليزية أو العربية"),
      tr("دراسات تتناول المتغيرات المرتبطة مباشرة بسؤال البحث"),
    ],
    exclusionCriteria: [
      tr("الأطروحات غير المنشورة والمؤتمرات بدون مراجعة أقران"),
      tr("الدراسات بدون بيانات كمية أو نوعية كافية للتحليل"),
    ],
    samplingTechnique: tr("بحث منهجي بقواعد بيانات متعددة (PubMed، CINAHL، Scopus) بكلمات مفتاحية محددة مسبقًا"),
    dataCollectionMethods: [tr("استخراج بيانات موحّد عبر نموذج تفريغ (Data Extraction Form)"), tr("تقييم جودة الدراسات بأداة معتمدة (مثل JBI أو CASP)")],
    suggestedTool: tr("نموذج تفريغ بيانات مصمّم حسب أسئلة المراجعة"),
  },
  {
    id: "qualitative",
    label: tr("دراسة نوعية"),
    studyDesign: tr("دراسة نوعية استكشافية (Qualitative Exploratory Study) باستخدام التحليل الموضوعي"),
    inclusionCriteria: [
      tr("مشاركون لديهم خبرة مباشرة بالظاهرة المدروسة"),
      tr("قادرون على التعبير عن تجربتهم بمقابلة مسجّلة"),
    ],
    exclusionCriteria: [tr("من يرفض تسجيل المقابلة صوتيًا"), tr("من ليس لديه خبرة كافية بالموضوع")],
    samplingTechnique: tr("عينة قصدية (Purposive Sampling) حتى الوصول للتشبع النظري (Data Saturation)"),
    dataCollectionMethods: [tr("مقابلات فردية شبه مقننة (Semi-structured Interviews)"), tr("ملاحظات ميدانية مساندة")],
    suggestedTool: tr("دليل أسئلة مقابلة (Interview Guide) مطوَّر من الباحثين ومراجَع من خبير"),
  },
  {
    id: "cohort",
    label: tr("دراسة أترابية (كوهورت)"),
    studyDesign: tr("دراسة أترابية استرجاعية أو مستقبلية (Retrospective/Prospective Cohort Study)"),
    inclusionCriteria: [
      tr("سجلات مرضى مكتملة البيانات للمتغيرات المطلوبة"),
      tr("فترة متابعة كافية حسب تصميم الدراسة"),
    ],
    exclusionCriteria: [tr("سجلات ناقصة البيانات الأساسية"), tr("حالات متابعة أقل من الحد الأدنى المطلوب")],
    samplingTechnique: tr("حصر شامل لكل الحالات المطابقة للمعايير خلال الفترة الزمنية المحددة"),
    dataCollectionMethods: [tr("مراجعة سجلات طبية إلكترونية"), tr("نموذج تفريغ بيانات موحّد لكل حالة")],
    suggestedTool: tr("نموذج مراجعة سجلات (Chart Review Form) مصمّم حسب متغيرات الدراسة"),
  },
];
