export type UserRole = 'ADMIN' | 'SC';

export type CallStatus =
  | 'Pending'
  | 'Connected'
  | 'No Answer'
  | 'Busy'
  | 'Wrong Number'
  | 'Callback';

export type ReferenceStatus = 'Yes' | 'No' | 'Pending';

export type LeadStatus =
  | 'New'
  | 'Contacted'
  | 'Interested'
  | 'Follow-up'
  | 'Meeting'
  | 'Converted'
  | 'Lost';

export type RelationType =
  | 'Brother'
  | 'Sister'
  | 'Friend'
  | 'Relative'
  | 'Parent'
  | 'Other';

export interface SCUser {
  id: string; // SC_ID e.g. SC-01
  name: string; // SC_Name
  username: string;
  passwordHash: string;
  role: 'SC' | 'ADMIN';
  status: 'Active' | 'Inactive';
  mobile?: string;
  email?: string;
  createdDate: string;
}

export interface AdminUser {
  id: string;
  name: string;
  username: string;
  passwordHash?: string;
  role: 'ADMIN';
  email: string;
  mobile?: string;
}

export type AuthUser = SCUser | AdminUser;

export interface Alumni {
  id: string; // Alumni_ID e.g. ALUM-1001
  name: string;
  mobile: string;
  email: string;
  course: string;
  batch: string;
  passingYear: string;
  assignedSCId: string;
  assignedSCName: string;
  callStatus: CallStatus;
  lastCallDate: string;
  referenceReceived: 'Yes' | 'No';
  referenceCount: number;
  nextFollowup: string;
  remark: string;
  createdDate: string;
}

export interface CallLog {
  id: string; // Call_ID e.g. CALL-1001
  alumniId: string;
  scId: string;
  scName: string;
  callDate: string;
  callStatus: CallStatus;
  callResult: string;
  remark: string;
  nextFollowup: string;
}

export interface Lead {
  id: string; // Lead_ID e.g. LEAD-2001
  sourceAlumniId: string;
  sourceAlumniName: string;
  sourceAlumniMobile?: string;
  scId: string;
  scName: string;
  referenceName: string;
  relation: RelationType;
  mobile: string;
  email: string;
  courseInterest: string;
  leadStatus: LeadStatus;
  nextFollowup: string;
  counsellingDate: string;
  remark: string;
  createdDate: string;
}

export interface Followup {
  id: string; // Followup_ID e.g. FUP-3001
  leadId: string;
  scId: string;
  scName: string;
  followupDate: string;
  status: LeadStatus;
  remark: string;
  createdDate: string;
}

export interface ReferenceResponse {
  id: string; // Response_ID
  token: string;
  sourceAlumniId: string;
  sourceAlumniName: string;
  sourceSCId: string;
  sourceSCName: string;
  referenceName: string;
  relation: RelationType;
  mobile: string;
  email: string;
  courseInterest: string;
  preferredContactTime: string;
  remark: string;
  submittedDate: string;
  leadId: string;
}

export interface ReferenceTokenData {
  token: string;
  sourceAlumniId: string;
  sourceAlumniName: string;
  sourceSCId: string;
  sourceSCName: string;
  createdAt: string;
  isUsed?: boolean;
}

export interface SCPerformanceStat {
  scId: string;
  scName: string;
  username: string;
  status: 'Active' | 'Inactive';
  assigned: number;
  called: number;
  connected: number;
  references: number;
  leads: number;
  interested: number;
  followups: number;
  meetings: number;
  overdue: number;
  converted: number;
  conversionRate: number;
}

export interface SystemSettings {
  googleWebAppUrl: string;
  spreadsheetId: string;
  institutionName: string;
  academicYear: string;
  lastSyncTime?: string;
  lastSyncStatus?: 'CONNECTED' | 'DISCONNECTED' | 'ERROR' | 'SYNCING';
  lastSyncError?: string;
  autoSyncEnabled: boolean;
}

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'ARCHIVE' | 'RESTORE' | 'SYNC' | 'LOGIN' | 'REASSIGN';

export interface AuditLog {
  id: string; // AUDIT-000001
  timestamp: string;
  entityType: 'ALUMNI' | 'LEAD' | 'USER' | 'ADMIN' | 'CALL_LOG' | 'FOLLOWUP' | 'REFERENCE' | 'SETTINGS';
  entityId: string;
  action: AuditAction;
  performedByUserId: string;
  performedByUserName: string;
  performedByRole: UserRole;
  details: string;
  previousState?: any;
  newState?: any;
}

export interface SyncLog {
  id: string; // SYNC-000001
  timestamp: string;
  operation: string; // e.g. "createLead", "updateAlumni", "fetchAllData"
  entityType: string;
  entityId: string;
  status: 'SUCCESS' | 'FAILED' | 'CONFLICT' | 'RETRY';
  message: string;
  durationMs?: number;
  transactionId?: string;
}

export interface ArchivedRecord {
  id: string; // ARCH-000001
  originalId: string;
  entityType: 'ALUMNI' | 'LEAD' | 'USER' | 'CALL' | 'FOLLOWUP' | 'REFERENCE';
  archivedAt: string;
  archivedByUserId: string;
  archivedByUserName: string;
  reason: string;
  data: any;
}
