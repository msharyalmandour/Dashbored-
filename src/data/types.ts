export type Role = "leader" | "member";
export type Gender = "male" | "female";

export interface TeamMember {
  id: string;
  name: string;
  role: Role;
  title: string;
  initials: string;
  color: string;
  email: string;
  gender?: Gender;
  /** لا تُستخدم إلا في وضع Supabase الحقيقي */
  teamId?: string | null;
  isSuperAdmin?: boolean;
  progress: number;
  tasksDone: number;
  tasksTotal: number;
}

/** فريق بحثي — عميل مستقل باشتراكه الخاص (وضع Supabase الحقيقي فقط) */
export interface Team {
  id: string;
  name: string;
  subscriptionEndDate: string | null;
  memberCount: number;
  monthlyPrice: number;
  /** من أول 15 فريق اشتركوا — سعرهم ثابت مدى الاشتراك */
  isFounder: boolean;
  /** true لين أول تفعيل اشتراك حقيقي — يميّز الأيام الثلاثة المجانية عن التجديد */
  isOnTrial: boolean;
  /** رمز رابط المشرف الأكاديمي (وضع Supabase الحقيقي فقط) */
  shareToken?: string;
  /** آخر ملاحظة أرسلها المشرف الأكاديمي عبر رابطه (وضع Supabase الحقيقي فقط) */
  supervisorNote?: string | null;
  supervisorNoteAt?: string | null;
  /** رمز دعوة الفريق لفرق ثانية — يُستخدم برابط الإحالة (وضع Supabase الحقيقي فقط) */
  referralCode?: string;
  /** جامعة الفريق — اختياري، تُدخل وقت التسجيل أو تُعدَّل لاحقًا من القائد */
  university?: string | null;
}

/** إحصائيات إحالة فريق المستخدم الحالي — من دالة get_my_referral_stats */
export interface ReferralStats {
  referralCode: string;
  referredCount: number;
  rewardedCount: number;
  bonusDaysEarned: number;
}

export type SectionStatus = "done" | "in-progress" | "not-started";
export type PhaseStatus = "done" | "active" | "upcoming";

/** الأقسام السبعة لكتابة المقترح البحثي */
export type ProposalSectionKey =
  | "background"
  | "literature-review"
  | "problem"
  | "gap"
  | "aim"
  | "questions"
  | "methodology";

export interface ProposalSection {
  key: ProposalSectionKey;
  order: number;
  labelAr: string;
  labelEn: string;
  status: SectionStatus;
  ownerId: string;
  updatedAt: string;
}

/** رحلة تقدم البحث الكبرى — 8 مراحل */
export interface ResearchStage {
  id: string;
  order: number;
  titleAr: string;
  titleEn: string;
  status: PhaseStatus;
  startDate: string;
  dueDate: string;
}

export interface ResearchGap {
  whatWeKnow: string[];
  whatWeDontKnow: string[];
  gapStatement: string;
  studyConnection: string;
  connectsToAim: boolean;
}

export interface ResearchQuestion {
  id: string;
  order: number;
  text: string;
}

export interface StudyAim {
  statement: string;
  status: SectionStatus;
  questions: ResearchQuestion[];
}

export interface SamplingPlan {
  inclusionCriteria: string[];
  exclusionCriteria: string[];
  sampleSize: string;
  samplingTechnique: string;
}

export interface StudyTool {
  type: "existing" | "developed" | "undecided";
  name: string;
}

export interface Methodology {
  studyDesign: string;
  studyDesignStatus: SectionStatus;
  studySetting: string;
  population: string;
  sampling: SamplingPlan;
  dataCollectionMethods: string[];
  studyTool: StudyTool;
  /** إجراء جمع البيانات — كيف بيتم الجمع عمليًا (Methods Template item e) */
  dataCollectionProcedure: string;
  /** طريقة تحليل البيانات — إحصائي أو نوعي (Methods Template item f، مُقيَّم بالروبريك) */
  dataAnalysis: string;
  /** الاعتبارات الأخلاقية بالمنهجية (Methods Template item g، مُقيَّم بالروبريك) */
  ethicalConsiderations: string;
}

export type TaskStatus = "todo" | "in-progress" | "done" | "overdue";
export type TaskPriority = "low" | "medium" | "high";

export interface Task {
  id: string;
  title: string;
  description: string;
  assigneeId: string;
  dueDate: string;
  status: TaskStatus;
  priority: TaskPriority;
  sectionKey?: ProposalSectionKey;
}

export interface TaskComment {
  id: string;
  taskId: string;
  authorId: string;
  body: string;
  createdAt: string;
}

export interface FieldworkSite {
  id: string;
  city: string;
  x: number;
  y: number;
  collected: number;
  target: number;
  status: "completed" | "active" | "not-started";
  leadId: string;
}

export type CalendarEventType =
  | "meeting"
  | "review"
  | "fieldwork"
  | "deadline";

export interface CalendarEvent {
  id: string;
  date: string;
  time: string;
  title: string;
  type: CalendarEventType;
  location: string;
}

/** موضوع بحثي تُصنَّف تحته الدراسات في مراجعة الأدبيات */
export type LiteratureTheme =
  | "Delirium"
  | "Nursing Knowledge"
  | "Detection Tools"
  | "Tool Utilization"
  | "Patient Outcomes";

export type EvidenceSection =
  | "background"
  | "literature-review"
  | "gap"
  | "methodology"
  | "other";

export interface EvidencePaper {
  id: string;
  title: string;
  authors: string;
  year: number;
  theme: LiteratureTheme;
  studyDesign: string;
  keyFinding: string;
  relevance: string;
  section: EvidenceSection;
  reviewStatus: "collected" | "reviewed";
  link?: string;
  addedById: string;
}

export interface FileItem {
  id: string;
  name: string;
  kind: "pdf" | "doc" | "sheet" | "image";
  size: string;
  folder: string;
  uploadedById: string;
  date: string;
}

export interface ActivityItem {
  id: string;
  memberId: string;
  action: string;
  target: string;
  timeAgo: string;
}

/** ========================================================================
    محرك البحث الحقيقي — Team → ResearchProject → بيانات البحث
    (وضع Supabase الحقيقي فقط؛ كل فريق حقيقي يملك مشروعًا واحدًا يُنشأ تلقائيًا) */

export type ResearchType = "" | "quantitative" | "qualitative" | "mixed-methods";
export type ResearchProjectStatus = "planning" | "active" | "writing" | "submitted";

export interface ResearchProject {
  id: string;
  teamId: string;
  title: string;
  description: string;
  researchType: ResearchType;
  status: ResearchProjectStatus;
  startDate: string | null;
  targetSubmissionDate: string | null;
  createdAt: string;
  updatedAt: string;
  /** ملخص المقترح (١٥٠-٢٥٠ كلمة تغطي الخلفية والهدف والمنهج والخلاصة) — Abstract */
  abstract: string;
  /** اسم المشرف الأكاديمي — يظهر بصفحة عنوان المقترح المُصدَّرة */
  supervisorName: string;
  /** معرّف مجلد Google Drive الخاص بالفريق — null لين أول رفع ملف فعلي (يُنشأ تلقائيًا وقتها) */
  driveFolderId?: string | null;
}

export type StageKey =
  | "topic"
  | "proposal"
  | "literature-review"
  | "research-gap"
  | "research-questions"
  | "methodology"
  | "data-collection"
  | "analysis"
  | "writing"
  | "final-submission";

/** حالة المرحلة بالجدول الزمني — نفس PhaseStatus المستخدمة بالواجهة أصلًا */
export interface ResearchStageRow {
  id: string;
  stageKey: StageKey;
  titleAr: string;
  titleEn: string;
  order: number;
  status: PhaseStatus;
  progress: number;
  startDate: string | null;
  targetDate: string | null;
  completedDate: string | null;
}

/** قسم مقترح حقيقي — نفس شكل ProposalSection الحالي + محتوى قابل للتحرير */
export interface ProposalSectionRow extends ProposalSection {
  content: string;
}

/** ملف حقيقي مرفوع لمجلد Google Drive الخاص بالفريق — عبر Edge Function
    drive-upload، ما يُنشأ ولا يُعدَّل مباشرة من الواجهة */
export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  category: "general" | "meeting-minutes" | "ethical-approval";
  driveFileId: string;
  driveViewLink: string;
  uploadedById: string;
  createdAt: string;
}

/** محضر اجتماع حقيقي — يُحفظ بقاعدة البيانات فورًا، وملف .docx يتولّد
    ويُرفع لنفس مجلد الفريق بدرايف بعدها */
export interface ResearchSearchResult {
  title: string;
  url: string;
  authors?: string;
  year?: number | null;
  summaryAr: string;
  relevanceReason: string;
  sourceType: "peer-reviewed" | "general" | "other";
}

export interface ResearchSearchQuery {
  id: string;
  queryText: string;
  results: ResearchSearchResult[];
  noveltyNote: string | null;
  createdById: string;
  createdAt: string;
}

export interface MeetingMinutesRow {
  id: string;
  meetingDate: string;
  attendees: string[];
  discussion: string;
  decisions: string;
  actionItems: string;
  createdById: string;
  driveFileId: string | null;
  driveViewLink: string | null;
  createdAt: string;
}

export type PiType = "faculty" | "graduate" | "undergraduate";
export type EthicalPrincipleAnswer = "yes" | "no" | "na" | null;
export type EthicalOutcome = "pending" | "granted" | "amendments" | "rejected";

/** بنود القسم الثاني بنموذج طلب الموافقة الأخلاقية الرسمي — نفس الترتيب
    والصياغة بالضبط، كل بند يُجاب بـ yes/no/na */
export interface EthicalPrinciples {
  writtenExplanation: EthicalPrincipleAnswer;
  oralExplanation: EthicalPrincipleAnswer;
  writtenConsent: EthicalPrincipleAnswer;
  oralConsent: EthicalPrincipleAnswer;
  voluntaryInformed: EthicalPrincipleAnswer;
  withdrawOption: EthicalPrincipleAnswer;
  harmInformed: EthicalPrincipleAnswer;
  confidentialityGuaranteed: EthicalPrincipleAnswer;
  anonymityGuaranteed: EthicalPrincipleAnswer;
  vulnerableGroupsInformed: EthicalPrincipleAnswer;
  interviewNoExplanationNeeded: EthicalPrincipleAnswer;
  safeDataStorage: EthicalPrincipleAnswer;
  willPublish: EthicalPrincipleAnswer;
}

/** بنود القسم الثالث — قائمة المرفقات المطلوبة بنموذج الموافقة الأخلاقية */
export interface EthicalAttachments {
  protocolOrProposal: boolean;
  participantInfoSheet: boolean;
  consentForm: boolean;
  studyTools: boolean;
  otherSupportiveDocs: boolean;
}

/** طلب الموافقة الأخلاقية الحقيقي — نفس حقول نموذج KAU الرسمي بالضبط،
    صف واحد لكل مشروع بحث */
export interface EthicalApproval {
  researchProjectId: string;
  applicationDate: string | null;
  piName: string;
  piAffiliation: string;
  piEmail: string;
  piType: PiType;
  /** سطر لكل باحث إضافي — "الاسم — الجهة — البريد" */
  otherResearchers: string;
  supervisorNames: string;
  registrationNo: string;
  expectedStartDate: string | null;
  expectedEndDate: string | null;
  personsInvolved: string;
  dataManagementConfidentiality: string;
  fundingDetails: string;
  principles: EthicalPrinciples;
  attachments: EthicalAttachments;
  outcome: EthicalOutcome;
  refNumber: string | null;
  meetingDate: string | null;
  approvalLetterFileId: string | null;
  updatedAt: string;
}

