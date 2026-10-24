import { tre } from "../lib/i18n";
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
    label: tre("دراسة مسحية مقطعية"),
    studyDesign: tre("دراسة كمية وصفية مقطعية (Quantitative Cross-sectional Descriptive Study)"),
    inclusionCriteria: [
      tre("ممرضون/ممرضات مسجّلون رسميًا ويعملون بشكل فعلي بالقسم المستهدف"),
      tre("خبرة عمل لا تقل عن 6 أشهر بالتخصص"),
      tre("موافقون على المشاركة طواعية"),
    ],
    exclusionCriteria: [
      tre("الموظفون الإداريون أو من لا يقدّمون رعاية مباشرة للمرضى"),
      tre("من هم بإجازة طويلة وقت جمع البيانات"),
    ],
    samplingTechnique: tre("عينة عشوائية طبقية (Stratified Random Sampling) حسب القسم"),
    dataCollectionMethods: [tre("استبيان إلكتروني مُقنن"), tre("توزيع ورقي بديل لمن لا يفضّل الإلكتروني")],
    suggestedTool: tre("استبيان جاهز ومُختبر مسبقًا (Existing Validated Questionnaire) إن توفر بموضوعكم"),
  },
  {
    id: "systematic-review",
    label: tre("مراجعة منهجية"),
    studyDesign: tre("مراجعة منهجية للأدبيات (Systematic Review) باتباع إطار PRISMA 2020"),
    inclusionCriteria: [
      tre("دراسات منشورة بمجلات محكّمة خلال آخر 10 سنوات"),
      tre("دراسات باللغة الإنجليزية أو العربية"),
      tre("دراسات تتناول المتغيرات المرتبطة مباشرة بسؤال البحث"),
    ],
    exclusionCriteria: [
      tre("الأطروحات غير المنشورة والمؤتمرات بدون مراجعة أقران"),
      tre("الدراسات بدون بيانات كمية أو نوعية كافية للتحليل"),
    ],
    samplingTechnique: tre("بحث منهجي بقواعد بيانات متعددة (PubMed، CINAHL، Scopus) بكلمات مفتاحية محددة مسبقًا"),
    dataCollectionMethods: [tre("استخراج بيانات موحّد عبر نموذج تفريغ (Data Extraction Form)"), tre("تقييم جودة الدراسات بأداة معتمدة (مثل JBI أو CASP)")],
    suggestedTool: tre("نموذج تفريغ بيانات مصمّم حسب أسئلة المراجعة"),
  },
  {
    id: "qualitative",
    label: tre("دراسة نوعية"),
    studyDesign: tre("دراسة نوعية استكشافية (Qualitative Exploratory Study) باستخدام التحليل الموضوعي"),
    inclusionCriteria: [
      tre("مشاركون لديهم خبرة مباشرة بالظاهرة المدروسة"),
      tre("قادرون على التعبير عن تجربتهم بمقابلة مسجّلة"),
    ],
    exclusionCriteria: [tre("من يرفض تسجيل المقابلة صوتيًا"), tre("من ليس لديه خبرة كافية بالموضوع")],
    samplingTechnique: tre("عينة قصدية (Purposive Sampling) حتى الوصول للتشبع النظري (Data Saturation)"),
    dataCollectionMethods: [tre("مقابلات فردية شبه مقننة (Semi-structured Interviews)"), tre("ملاحظات ميدانية مساندة")],
    suggestedTool: tre("دليل أسئلة مقابلة (Interview Guide) مطوَّر من الباحثين ومراجَع من خبير"),
  },
  {
    id: "cohort",
    label: tre("دراسة أترابية (كوهورت)"),
    studyDesign: tre("دراسة أترابية استرجاعية أو مستقبلية (Retrospective/Prospective Cohort Study)"),
    inclusionCriteria: [
      tre("سجلات مرضى مكتملة البيانات للمتغيرات المطلوبة"),
      tre("فترة متابعة كافية حسب تصميم الدراسة"),
    ],
    exclusionCriteria: [tre("سجلات ناقصة البيانات الأساسية"), tre("حالات متابعة أقل من الحد الأدنى المطلوب")],
    samplingTechnique: tre("حصر شامل لكل الحالات المطابقة للمعايير خلال الفترة الزمنية المحددة"),
    dataCollectionMethods: [tre("مراجعة سجلات طبية إلكترونية"), tre("نموذج تفريغ بيانات موحّد لكل حالة")],
    suggestedTool: tre("نموذج مراجعة سجلات (Chart Review Form) مصمّم حسب متغيرات الدراسة"),
  },
];
