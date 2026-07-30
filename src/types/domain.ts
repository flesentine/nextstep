export type CaseSource = 'uscis' | 'nvc' | 'eoir';
export type Milestone = 'filed' | 'biometrics' | 'review' | 'evidence' | 'interview' | 'decision' | 'delivery';

export interface CaseEvent { id: string; caseId: string; status: string; description: string; occurredAt: string; milestone: Milestone; sourceHash: string; }
export interface SourceSnapshot { source: CaseSource; fetchedAt: string; officialUrl: string; freshnessMinutes: number; }
export interface CaseRecord { id: string; source: CaseSource; nickname: string; applicant: string; formType: string; status: string; milestone: Milestone; lastUpdatedAt: string; createdAt: string; terminal: boolean; events: CaseEvent[]; snapshot: SourceSnapshot; estimate?: EstimateRange; reminders?: Reminder[]; documentNotes?: string; cloudId?: string; migrationState?: 'local'|'pending'|'synced'|'failed'; }
export interface EstimateRange { earliest: string; latest: string; sampleSize: number; sourceDate: string; confidence: 'low' | 'medium' | 'high'; cohortLabel?: string; percentileLow?: number; percentileHigh?: number; }
export interface GuidanceCard { statusKey: string; version: number; changed: string; meaning: string; nextSteps: string[]; officialUrl: string; reviewedAt: string; }
export interface Reminder { id: string; caseId: string; title: string; dueAt: string; complete: boolean; }
export interface Household { id: string; name: string; members: { id: string; name: string; role: 'owner' | 'member' }[]; }
export interface Subscription { tier: 'free' | 'premium'; status?: 'active'|'trial'|'grace'|'expired'; productId?: string; renewsAt?: string; trialEndsAt?: string; lastVerifiedAt?: string; }

export interface CohortInsight {
  id: string;
  formType: string;
  filingMonth?: string;
  receiptPrefix?: string;
  milestone: Milestone;
  sampleSize: number;
  p25Days: number;
  medianDays: number;
  p75Days: number;
  approvals?: number;
  denials?: number;
  movedLast30Days?: number;
  sourceDate: string;
  sourceLabel: string;
}
