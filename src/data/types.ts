export type Role = "leader" | "member";

export interface TeamMember {
  id: string;
  name: string;
  role: Role;
  title: string;
  initials: string;
  color: string;
  email: string;
  progress: number;
  tasksDone: number;
  tasksTotal: number;
}

export type PhaseStatus = "done" | "active" | "upcoming";

export interface ResearchPhase {
  id: string;
  order: number;
  title: string;
  summary: string;
  status: PhaseStatus;
  progress: number;
  startDate: string;
  dueDate: string;
  ownerId: string;
  milestoneGroup: string;
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
  phaseId?: string;
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

export interface ReferenceItem {
  id: string;
  title: string;
  authors: string;
  year: number;
  type: "article" | "book" | "report" | "guideline";
  tags: string[];
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
