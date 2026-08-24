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
  /** رمز رابط المشرف الأكاديمي (وضع Supabase الحقيقي فقط) */
  shareToken?: string;
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
