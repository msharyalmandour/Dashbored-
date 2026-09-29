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
    label: "دراسة مسحية مقطعية",
    studyDesign: "دراسة كمية وصفية مقطعية (Quantitative Cross-sectional Descriptive Study)",
    inclusionCriteria: [
      "ممرضون/ممرضات مسجّلون رسميًا ويعملون بشكل فعلي بالقسم المستهدف",
      "خبرة عمل لا تقل عن 6 أشهر بالتخصص",
      "موافقون على المشاركة طواعية",
    ],
    exclusionCriteria: [
      "الموظفون الإداريون أو من لا يقدّمون رعاية مباشرة للمرضى",
      "من هم بإجازة طويلة وقت جمع البيانات",
    ],
    samplingTechnique: "عينة عشوائية طبقية (Stratified Random Sampling) حسب القسم",
    dataCollectionMethods: ["استبيان إلكتروني مُقنن", "توزيع ورقي بديل لمن لا يفضّل الإلكتروني"],
    suggestedTool: "استبيان جاهز ومُختبر مسبقًا (Existing Validated Questionnaire) إن توفر بموضوعكم",
  },
  {
    id: "systematic-review",
    label: "مراجعة منهجية",
    studyDesign: "مراجعة منهجية للأدبيات (Systematic Review) باتباع إطار PRISMA 2020",
    inclusionCriteria: [
      "دراسات منشورة بمجلات محكّمة خلال آخر 10 سنوات",
      "دراسات باللغة الإنجليزية أو العربية",
      "دراسات تتناول المتغيرات المرتبطة مباشرة بسؤال البحث",
    ],
    exclusionCriteria: [
      "الأطروحات غير المنشورة والمؤتمرات بدون مراجعة أقران",
      "الدراسات بدون بيانات كمية أو نوعية كافية للتحليل",
    ],
    samplingTechnique: "بحث منهجي بقواعد بيانات متعددة (PubMed، CINAHL، Scopus) بكلمات مفتاحية محددة مسبقًا",
    dataCollectionMethods: ["استخراج بيانات موحّد عبر نموذج تفريغ (Data Extraction Form)", "تقييم جودة الدراسات بأداة معتمدة (مثل JBI أو CASP)"],
    suggestedTool: "نموذج تفريغ بيانات مصمّم حسب أسئلة المراجعة",
  },
  {
    id: "qualitative",
    label: "دراسة نوعية",
    studyDesign: "دراسة نوعية استكشافية (Qualitative Exploratory Study) باستخدام التحليل الموضوعي",
    inclusionCriteria: [
      "مشاركون لديهم خبرة مباشرة بالظاهرة المدروسة",
      "قادرون على التعبير عن تجربتهم بمقابلة مسجّلة",
    ],
    exclusionCriteria: ["من يرفض تسجيل المقابلة صوتيًا", "من ليس لديه خبرة كافية بالموضوع"],
    samplingTechnique: "عينة قصدية (Purposive Sampling) حتى الوصول للتشبع النظري (Data Saturation)",
    dataCollectionMethods: ["مقابلات فردية شبه مقننة (Semi-structured Interviews)", "ملاحظات ميدانية مساندة"],
    suggestedTool: "دليل أسئلة مقابلة (Interview Guide) مطوَّر من الباحثين ومراجَع من خبير",
  },
  {
    id: "cohort",
    label: "دراسة أترابية (كوهورت)",
    studyDesign: "دراسة أترابية استرجاعية أو مستقبلية (Retrospective/Prospective Cohort Study)",
    inclusionCriteria: [
      "سجلات مرضى مكتملة البيانات للمتغيرات المطلوبة",
      "فترة متابعة كافية حسب تصميم الدراسة",
    ],
    exclusionCriteria: ["سجلات ناقصة البيانات الأساسية", "حالات متابعة أقل من الحد الأدنى المطلوب"],
    samplingTechnique: "حصر شامل لكل الحالات المطابقة للمعايير خلال الفترة الزمنية المحددة",
    dataCollectionMethods: ["مراجعة سجلات طبية إلكترونية", "نموذج تفريغ بيانات موحّد لكل حالة"],
    suggestedTool: "نموذج مراجعة سجلات (Chart Review Form) مصمّم حسب متغيرات الدراسة",
  },
];
