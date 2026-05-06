// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

// ─── Domain ───────────────────────────────────────────────────────────────────

export type Category =
  | "DSA"
  | "GD"
  | "MOCK_INTERVIEW"
  | "PROJECT_WORK"
  | "CURRENT_AFFAIRS"
  | "JAPANESE"
  | "COMMUNICATION"
  | "READING";

export type MilestoneStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED";

export type GDTopicCategory =
  | "ABSTRACT"
  | "CURRENT_AFFAIRS"
  | "BUSINESS"
  | "TECHNICAL"
  | "ETHICAL";

export type InterviewType = "HR" | "TECHNICAL" | "SYSTEM_DESIGN";

// ─── Models ───────────────────────────────────────────────────────────────────

export interface StudySession {
  id: string;
  userId: string;
  category: Category;
  subcategory?: string | null;
  startTime: Date;
  endTime?: Date | null;
  durationMinutes: number;
  notes: string;
  selfRating: number;
  metadata?: string | null;
  createdAt: Date;
}

export interface DailyReport {
  id: string;
  userId: string;
  date: Date;
  overallScore: number;
  categoryScores: string;
  summary: string;
  strengths: string;
  gaps: string;
  recommendations: string;
  createdAt: Date;
}

export interface Streak {
  id: string;
  userId: string;
  category: Category;
  currentStreak: number;
  bestStreak: number;
  lastActivityDate: Date;
  updatedAt: Date;
}

export interface Target {
  id: string;
  userId: string;
  month: number;
  year: number;
  category: Category;
  targetValue: number;
  currentValue: number;
  unit: string;
}

export interface Milestone {
  id: string;
  userId: string;
  projectName: string;
  title: string;
  description: string;
  targetDate: Date;
  completedDate?: Date | null;
  status: MilestoneStatus;
  displayOrder: number;
  createdAt: Date;
}

export interface JournalEntry {
  id: string;
  userId: string;
  date: Date;
  content: string;
  mood: number;
  energy: number;
  createdAt: Date;
}

export interface GDTopic {
  id: string;
  category: GDTopicCategory;
  topic: string;
  practiced: boolean;
  practiceCount: number;
  lastPracticedAt?: Date | null;
  bestScore?: number | null;
}

export interface InterviewQuestion {
  id: string;
  type: InterviewType;
  question: string;
  preparedAnswer?: string | null;
  practiced: boolean;
  practiceCount: number;
  lastPracticedAt?: Date | null;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface DashboardStats {
  totalSessionsToday: number;
  minutesToday: number;
  currentStreaks: Streak[];
  monthlyProgress: Target[];
}
