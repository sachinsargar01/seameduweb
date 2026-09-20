import {
  AdminUser,
  Alumni,
  SCUser,
  Lead,
  CallLog,
  Followup,
  ReferenceResponse,
  ReferenceTokenData,
  SystemSettings,
  CallStatus,
  LeadStatus,
  RelationType,
  AuditLog,
  SyncLog,
  ArchivedRecord,
} from '../types';

const STORAGE_KEYS = {
  ADMIN_USERS: 'seamedu_fms_admin_users',
  ALUMNI: 'seamedu_fms_alumni',
  SC_USERS: 'seamedu_fms_sc_users',
  LEADS: 'seamedu_fms_leads',
  CALL_LOGS: 'seamedu_fms_call_logs',
  FOLLOWUPS: 'seamedu_fms_followups',
  REFERENCE_RESPONSES: 'seamedu_fms_ref_responses',
  REFERENCE_TOKENS: 'seamedu_fms_ref_tokens',
  SETTINGS: 'seamedu_fms_settings',
  AUTH_SESSION: 'seamedu_fms_auth_session',
  AUDIT_LOGS: 'seamedu_fms_audit_logs',
  SYNC_LOGS: 'seamedu_fms_sync_logs',
  ARCHIVED_RECORDS: 'seamedu_fms_archived_records',
  TRANSACTIONS: 'seamedu_fms_processed_txns',
};

// Initial Default Admin
const INITIAL_ADMIN_USERS = [
  {
    id: 'ADMIN-01',
    name: 'Seamedu Management Admin',
    username: 'admin',
    passwordHash: 'admin123',
    role: 'ADMIN' as const,
    email: 'admin@seamedu.com',
  },
];

// Default Initial SC Users (e.g. Anjali, Shweta, Rohan, Priya)
const INITIAL_SC_USERS: SCUser[] = [
  {
    id: 'SC-01',
    name: 'Anjali Sharma',
    username: 'anjali',
    passwordHash: 'sc123',
    role: 'SC',
    status: 'Active',
    mobile: '+91 98201 12345',
    email: 'anjali.s@seamedu.com',
    createdDate: '2026-01-10T10:00:00Z',
  },
  {
    id: 'SC-02',
    name: 'Shweta Kulkarni',
    username: 'shweta',
    passwordHash: 'sc123',
    role: 'SC',
    status: 'Active',
    mobile: '+91 98202 23456',
    email: 'shweta.k@seamedu.com',
    createdDate: '2026-01-10T10:00:00Z',
  },
  {
    id: 'SC-03',
    name: 'Rohan Deshmukh',
    username: 'rohan',
    passwordHash: 'sc123',
    role: 'SC',
    status: 'Active',
    mobile: '+91 98203 34567',
    email: 'rohan.d@seamedu.com',
    createdDate: '2026-01-12T10:00:00Z',
  },
  {
    id: 'SC-04',
    name: 'Priya Verma',
    username: 'priya',
    passwordHash: 'sc123',
    role: 'SC',
    status: 'Inactive',
    mobile: '+91 98204 45678',
    email: 'priya.v@seamedu.com',
    createdDate: '2026-01-15T10:00:00Z',
  },
];

// Seed Alumni records across popular Seamedu Media & Tech courses
const INITIAL_ALUMNI: Alumni[] = [
  {
    id: 'ALUM-1001',
    name: 'Aditya Patel',
    mobile: '+91 98230 45678',
    email: 'aditya.patel@gmail.com',
    course: 'B.Sc Sound Engineering',
    batch: '2022-2025',
    passingYear: '2025',
    assignedSCId: 'SC-01',
    assignedSCName: 'Anjali Sharma',
    callStatus: 'Connected',
    lastCallDate: '2026-09-18T14:30:00Z',
    referenceReceived: 'Yes',
    referenceCount: 1,
    nextFollowup: '2026-09-22',
    remark: 'Working at Yash Raj Studios; gave cousin reference for VFX course.',
    createdDate: '2026-09-01T09:00:00Z',
  },
  {
    id: 'ALUM-1002',
    name: 'Tanvi Joshi',
    mobile: '+91 98231 56789',
    email: 'tanvi.joshi@gmail.com',
    course: 'B.Sc VFX & Animation',
    batch: '2021-2024',
    passingYear: '2024',
    assignedSCId: 'SC-02',
    assignedSCName: 'Shweta Kulkarni',
    callStatus: 'Connected',
    lastCallDate: '2026-09-18T11:15:00Z',
    referenceReceived: 'Yes',
    referenceCount: 1,
    nextFollowup: '2026-09-20',
    remark: 'Senior 3D Artist; friend wants Sound Engineering admission.',
    createdDate: '2026-09-01T09:00:00Z',
  },
  {
    id: 'ALUM-1003',
    name: 'Varun Nair',
    mobile: '+91 98232 67890',
    email: 'varun.nair@gmail.com',
    course: 'B.Sc Game Art & Design',
    batch: '2022-2025',
    passingYear: '2025',
    assignedSCId: 'SC-03',
    assignedSCName: 'Rohan Deshmukh',
    callStatus: 'Callback',
    lastCallDate: '2026-09-17T16:00:00Z',
    referenceReceived: 'No',
    referenceCount: 0,
    nextFollowup: '2026-09-19', // Today
    remark: 'Busy in shoot today, requested callback after 5 PM.',
    createdDate: '2026-09-02T09:00:00Z',
  },
  {
    id: 'ALUM-1004',
    name: 'Sneha Jadhav',
    mobile: '+91 98233 78901',
    email: 'sneha.j@gmail.com',
    course: 'Diploma in Filmmaking',
    batch: '2023-2024',
    passingYear: '2024',
    assignedSCId: 'SC-01',
    assignedSCName: 'Anjali Sharma',
    callStatus: 'Connected',
    lastCallDate: '2026-09-15T10:00:00Z',
    referenceReceived: 'No',
    referenceCount: 0,
    nextFollowup: '2026-09-16', // Overdue
    remark: 'Interested in visiting campus for reunion; check for siblings next year.',
    createdDate: '2026-09-02T09:00:00Z',
  },
  {
    id: 'ALUM-1005',
    name: 'Karan Mehra',
    mobile: '+91 98234 89012',
    email: 'karan.m@gmail.com',
    course: 'B.Sc Media & Communication',
    batch: '2021-2024',
    passingYear: '2024',
    assignedSCId: 'SC-02',
    assignedSCName: 'Shweta Kulkarni',
    callStatus: 'No Answer',
    lastCallDate: '2026-09-18T15:20:00Z',
    referenceReceived: 'No',
    referenceCount: 0,
    nextFollowup: '2026-09-19',
    remark: 'Ringing no response; scheduled repeat dial.',
    createdDate: '2026-09-03T09:00:00Z',
  },
  {
    id: 'ALUM-1006',
    name: 'Pooja Hegde',
    mobile: '+91 98235 90123',
    email: 'pooja.h@gmail.com',
    course: 'B.Sc Sound Engineering',
    batch: '2022-2025',
    passingYear: '2025',
    assignedSCId: 'SC-03',
    assignedSCName: 'Rohan Deshmukh',
    callStatus: 'Pending',
    lastCallDate: '',
    referenceReceived: 'No',
    referenceCount: 0,
    nextFollowup: '',
    remark: '',
    createdDate: '2026-09-04T09:00:00Z',
  },
  {
    id: 'ALUM-1007',
    name: 'Devendra Rao',
    mobile: '+91 98236 01234',
    email: 'dev.rao@gmail.com',
    course: 'B.Sc Game Art & Design',
    batch: '2023-2026',
    passingYear: '2026',
    assignedSCId: 'SC-01',
    assignedSCName: 'Anjali Sharma',
    callStatus: 'Pending',
    lastCallDate: '',
    referenceReceived: 'No',
    referenceCount: 0,
    nextFollowup: '',
    remark: '',
    createdDate: '2026-09-04T09:00:00Z',
  },
  {
    id: 'ALUM-1008',
    name: 'Nisha Pillai',
    mobile: '+91 98237 12345',
    email: 'nisha.p@gmail.com',
    course: 'B.Sc VFX & Animation',
    batch: '2020-2023',
    passingYear: '2023',
    assignedSCId: 'SC-02',
    assignedSCName: 'Shweta Kulkarni',
    callStatus: 'Pending',
    lastCallDate: '',
    referenceReceived: 'No',
    referenceCount: 0,
    nextFollowup: '',
    remark: '',
    createdDate: '2026-09-05T09:00:00Z',
  },
];

// Initial Seed Leads
const INITIAL_LEADS: Lead[] = [
  {
    id: 'LEAD-2001',
    sourceAlumniId: 'ALUM-1001',
    sourceAlumniName: 'Aditya Patel',
    sourceAlumniMobile: '+91 98230 45678',
    scId: 'SC-01',
    scName: 'Anjali Sharma',
    referenceName: 'Rahul Patel',
    relation: 'Brother',
    mobile: '+91 98111 22334',
    email: 'rahul.patel@gmail.com',
    courseInterest: 'B.Sc VFX & Animation',
    leadStatus: 'Interested',
    nextFollowup: '2026-09-20',
    counsellingDate: '2026-09-23',
    remark: 'Completed 12th standard, passionate about 3D animation.',
    createdDate: '2026-09-18T14:35:00Z',
  },
  {
    id: 'LEAD-2002',
    sourceAlumniId: 'ALUM-1002',
    sourceAlumniName: 'Tanvi Joshi',
    sourceAlumniMobile: '+91 98231 56789',
    scId: 'SC-02',
    scName: 'Shweta Kulkarni',
    referenceName: 'Gaurav Kadam',
    relation: 'Friend',
    mobile: '+91 98222 33445',
    email: 'gaurav.kadam@gmail.com',
    courseInterest: 'B.Sc Sound Engineering',
    leadStatus: 'Meeting',
    nextFollowup: '2026-09-19', // Today
    counsellingDate: '2026-09-19',
    remark: 'Campus tour and studio trial scheduled today at 3:00 PM.',
    createdDate: '2026-09-18T11:20:00Z',
  },
  {
    id: 'LEAD-2003',
    sourceAlumniId: 'ALUM-1001',
    sourceAlumniName: 'Aditya Patel',
    sourceAlumniMobile: '+91 98230 45678',
    scId: 'SC-01',
    scName: 'Anjali Sharma',
    referenceName: 'Arjun Deshmukh',
    relation: 'Friend',
    mobile: '+91 98333 44556',
    email: 'arjun.d@gmail.com',
    courseInterest: 'Diploma in Filmmaking',
    leadStatus: 'Converted',
    nextFollowup: '',
    counsellingDate: '2026-09-10',
    remark: 'Admission token fee deposited; enrolled for October Batch!',
    createdDate: '2026-09-08T12:00:00Z',
  },
];

// Initial Seed Call Logs
const INITIAL_CALL_LOGS: CallLog[] = [
  {
    id: 'CALL-1001',
    alumniId: 'ALUM-1001',
    scId: 'SC-01',
    scName: 'Anjali Sharma',
    callDate: '2026-09-18T14:30:00Z',
    callStatus: 'Connected',
    callResult: 'Alumni happy with experience; shared brother reference for VFX.',
    remark: 'Wants info brochure sent to brother on WhatsApp.',
    nextFollowup: '2026-09-22',
  },
  {
    id: 'CALL-1002',
    alumniId: 'ALUM-1002',
    scId: 'SC-02',
    scName: 'Shweta Kulkarni',
    callDate: '2026-09-18T11:15:00Z',
    callStatus: 'Connected',
    callResult: 'Positive connect. Provided friend reference Gaurav.',
    remark: 'Scheduled campus visit for prospective student.',
    nextFollowup: '2026-09-20',
  },
  {
    id: 'CALL-1003',
    alumniId: 'ALUM-1003',
    scId: 'SC-03',
    scName: 'Rohan Deshmukh',
    callDate: '2026-09-17T16:00:00Z',
    callStatus: 'Callback',
    callResult: 'On set shooting, requested callback.',
    remark: 'Call back at 5 PM on 19th.',
    nextFollowup: '2026-09-19',
  },
];

// Initial Followups
const INITIAL_FOLLOWUPS: Followup[] = [
  {
    id: 'FUP-3001',
    leadId: 'LEAD-2001',
    scId: 'SC-01',
    scName: 'Anjali Sharma',
    followupDate: '2026-09-20',
    status: 'Interested',
    remark: 'Send fee structure and placement highlights.',
    createdDate: '2026-09-18T14:35:00Z',
  },
  {
    id: 'FUP-3002',
    leadId: 'LEAD-2002',
    scId: 'SC-02',
    scName: 'Shweta Kulkarni',
    followupDate: '2026-09-19',
    status: 'Meeting',
    remark: 'Conduct sound studio equipment demo.',
    createdDate: '2026-09-18T11:20:00Z',
  },
];

const INITIAL_SETTINGS: SystemSettings = {
  googleWebAppUrl: '',
  spreadsheetId: 'SEAMEDU_ADMISSIONS_FMS',
  institutionName: 'SEAMEDU School of Pro-Expressionism',
  academicYear: '2026-2027',
  autoSyncEnabled: false,
};

export class StorageService {
  // Initialize storage with defaults if not present
  static initialize() {
    if (!localStorage.getItem(STORAGE_KEYS.ADMIN_USERS)) {
      localStorage.setItem(STORAGE_KEYS.ADMIN_USERS, JSON.stringify(INITIAL_ADMIN_USERS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.SC_USERS)) {
      localStorage.setItem(STORAGE_KEYS.SC_USERS, JSON.stringify(INITIAL_SC_USERS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.ALUMNI)) {
      localStorage.setItem(STORAGE_KEYS.ALUMNI, JSON.stringify(INITIAL_ALUMNI));
    }
    if (!localStorage.getItem(STORAGE_KEYS.LEADS)) {
      localStorage.setItem(STORAGE_KEYS.LEADS, JSON.stringify(INITIAL_LEADS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.CALL_LOGS)) {
      localStorage.setItem(STORAGE_KEYS.CALL_LOGS, JSON.stringify(INITIAL_CALL_LOGS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.FOLLOWUPS)) {
      localStorage.setItem(STORAGE_KEYS.FOLLOWUPS, JSON.stringify(INITIAL_FOLLOWUPS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.REFERENCE_RESPONSES)) {
      localStorage.setItem(STORAGE_KEYS.REFERENCE_RESPONSES, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.REFERENCE_TOKENS)) {
      // Seed pre-generated token for ALUM-1001 and SC-01
      const defaultTokens: ReferenceTokenData[] = [
        {
          token: 'demo-token-1001',
          sourceAlumniId: 'ALUM-1001',
          sourceAlumniName: 'Aditya Patel',
          sourceSCId: 'SC-01',
          sourceSCName: 'Anjali Sharma',
          createdAt: new Date().toISOString(),
        },
      ];
      localStorage.setItem(STORAGE_KEYS.REFERENCE_TOKENS, JSON.stringify(defaultTokens));
    }
    if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(INITIAL_SETTINGS));
    }
  }

  // ALUMNI
  static getAlumni(): Alumni[] {
    this.initialize();
    const data = localStorage.getItem(STORAGE_KEYS.ALUMNI);
    return data ? JSON.parse(data) : [];
  }

  static saveAlumni(alumniList: Alumni[]) {
    localStorage.setItem(STORAGE_KEYS.ALUMNI, JSON.stringify(alumniList));
  }

  static updateAlumni(updated: Alumni) {
    const list = this.getAlumni();
    const index = list.findIndex(a => a.id === updated.id);
    if (index >= 0) {
      list[index] = updated;
      this.saveAlumni(list);
    }
  }

  static deleteAlumni(id: string, userId: string = 'admin', userName: string = 'Admin', reason: string = 'Deleted by Admin'): Alumni | null {
    const list = this.getAlumni();
    const idx = list.findIndex(a => a.id === id);
    if (idx === -1) return null;
    const [deleted] = list.splice(idx, 1);
    this.saveAlumni(list);
    this.archiveRecord({
      originalId: id,
      entityType: 'ALUMNI',
      archivedByUserId: userId,
      archivedByUserName: userName,
      reason,
      data: deleted,
    });
    this.addAuditLog({
      entityType: 'ALUMNI',
      entityId: id,
      action: 'DELETE',
      performedByUserId: userId,
      performedByUserName: userName,
      performedByRole: 'ADMIN',
      details: `Permanently deleted Alumni ${deleted.name} (${id}) from active directory`,
      previousState: deleted,
    });
    return deleted;
  }

  static deleteLead(id: string, userId: string = 'admin', userName: string = 'Admin', reason: string = 'Deleted by Admin'): Lead | null {
    const list = this.getLeads();
    const idx = list.findIndex(l => l.id === id);
    if (idx === -1) return null;
    const [deleted] = list.splice(idx, 1);
    this.saveLeads(list);
    this.archiveRecord({
      originalId: id,
      entityType: 'LEAD',
      archivedByUserId: userId,
      archivedByUserName: userName,
      reason,
      data: deleted,
    });
    this.addAuditLog({
      entityType: 'LEAD',
      entityId: id,
      action: 'DELETE',
      performedByUserId: userId,
      performedByUserName: userName,
      performedByRole: 'ADMIN',
      details: `Permanently deleted Lead ${deleted.referenceName} (${id})`,
      previousState: deleted,
    });
    return deleted;
  }

  // SC USERS
  static getSCUsers(): SCUser[] {
    this.initialize();
    const data = localStorage.getItem(STORAGE_KEYS.SC_USERS);
    return data ? JSON.parse(data) : [];
  }

  static saveSCUsers(users: SCUser[]) {
    localStorage.setItem(STORAGE_KEYS.SC_USERS, JSON.stringify(users));
  }

  static createOrUpdateSC(sc: SCUser) {
    const users = this.getSCUsers();
    const index = users.findIndex(u => u.id === sc.id);
    if (index >= 0) {
      users[index] = sc;
    } else {
      users.push(sc);
    }
    this.saveSCUsers(users);
  }

  static addSCUser(userData: Omit<SCUser, 'id' | 'createdDate'>): SCUser {
    const users = this.getSCUsers();
    const newId = `SC-${String(users.length + 1).padStart(2, '0')}`;
    const newSC: SCUser = {
      ...userData,
      id: newId,
      createdDate: new Date().toISOString(),
    };
    users.push(newSC);
    this.saveSCUsers(users);
    return newSC;
  }

  static updateSCUser(id: string, updates: Partial<SCUser>): SCUser | null {
    const users = this.getSCUsers();
    const index = users.findIndex(u => u.id === id);
    if (index >= 0) {
      users[index] = { ...users[index], ...updates };
      this.saveSCUsers(users);
      return users[index];
    }
    return null;
  }

  static toggleSCStatus(scId: string): SCUser | null {
    const users = this.getSCUsers();
    const sc = users.find(u => u.id === scId);
    if (sc) {
      sc.status = sc.status === 'Active' ? 'Inactive' : 'Active';
      this.saveSCUsers(users);
      return sc;
    }
    return null;
  }

  // ADMIN USERS
  static getAdminUsers(): AdminUser[] {
    this.initialize();
    const data = localStorage.getItem(STORAGE_KEYS.ADMIN_USERS);
    return data ? JSON.parse(data) : INITIAL_ADMIN_USERS;
  }

  static saveAdminUsers(admins: AdminUser[]) {
    localStorage.setItem(STORAGE_KEYS.ADMIN_USERS, JSON.stringify(admins));
  }

  static addAdminUser(adminData: Omit<AdminUser, 'id'>): AdminUser {
    const admins = this.getAdminUsers();
    const newId = `ADMIN-${String(admins.length + 1).padStart(2, '0')}`;
    const newAdmin: AdminUser = {
      ...adminData,
      id: newId,
      role: 'ADMIN',
    };
    admins.push(newAdmin);
    this.saveAdminUsers(admins);
    return newAdmin;
  }

  // LEADS
  static getLeads(): Lead[] {
    this.initialize();
    const data = localStorage.getItem(STORAGE_KEYS.LEADS);
    return data ? JSON.parse(data) : [];
  }

  static saveLeads(leads: Lead[]) {
    localStorage.setItem(STORAGE_KEYS.LEADS, JSON.stringify(leads));
  }

  static addLead(lead: Lead) {
    const list = this.getLeads();
    list.unshift(lead);
    this.saveLeads(list);
  }

  static updateLead(updated: Lead) {
    const list = this.getLeads();
    const index = list.findIndex(l => l.id === updated.id);
    if (index >= 0) {
      list[index] = updated;
      this.saveLeads(list);
    }
  }

  // CALL LOGS
  static getCallLogs(): CallLog[] {
    this.initialize();
    const data = localStorage.getItem(STORAGE_KEYS.CALL_LOGS);
    return data ? JSON.parse(data) : [];
  }

  static addCallLog(log: CallLog) {
    const list = this.getCallLogs();
    list.unshift(log); // Always append new, never overwrite previous
    localStorage.setItem(STORAGE_KEYS.CALL_LOGS, JSON.stringify(list));
  }

  // FOLLOWUPS
  static getFollowups(): Followup[] {
    this.initialize();
    const data = localStorage.getItem(STORAGE_KEYS.FOLLOWUPS);
    return data ? JSON.parse(data) : [];
  }

  static addFollowup(followup: Followup) {
    const list = this.getFollowups();
    list.unshift(followup);
    localStorage.setItem(STORAGE_KEYS.FOLLOWUPS, JSON.stringify(list));
  }

  // REFERENCE RESPONSES
  static getReferenceResponses(): ReferenceResponse[] {
    this.initialize();
    const data = localStorage.getItem(STORAGE_KEYS.REFERENCE_RESPONSES);
    return data ? JSON.parse(data) : [];
  }

  static addReferenceResponse(response: ReferenceResponse) {
    const list = this.getReferenceResponses();
    list.unshift(response);
    localStorage.setItem(STORAGE_KEYS.REFERENCE_RESPONSES, JSON.stringify(list));
  }

  // REFERENCE TOKENS
  static getReferenceTokens(): ReferenceTokenData[] {
    this.initialize();
    const data = localStorage.getItem(STORAGE_KEYS.REFERENCE_TOKENS);
    return data ? JSON.parse(data) : [];
  }

  static createReferenceToken(
    sourceAlumniId: string,
    sourceAlumniName: string,
    sourceSCId: string,
    sourceSCName: string
  ): string {
    const tokens = this.getReferenceTokens();
    const randomBytes = Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
    const token = `ref_${randomBytes}`;
    tokens.push({
      token,
      sourceAlumniId,
      sourceAlumniName,
      sourceSCId,
      sourceSCName,
      createdAt: new Date().toISOString(),
    });
    localStorage.setItem(STORAGE_KEYS.REFERENCE_TOKENS, JSON.stringify(tokens));
    return token;
  }

  static getTokenData(token: string): ReferenceTokenData | null {
    const tokens = this.getReferenceTokens();
    return tokens.find(t => t.token === token) || null;
  }

  // SETTINGS
  static getSettings(): SystemSettings {
    this.initialize();
    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return data ? JSON.parse(data) : INITIAL_SETTINGS;
  }

  static saveSettings(settings: SystemSettings) {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }

  // AUDIT LOGS
  static getAuditLogs(): AuditLog[] {
    this.initialize();
    const data = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
    return data ? JSON.parse(data) : [];
  }

  static addAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'> & { id?: string; timestamp?: string }): AuditLog {
    const logs = this.getAuditLogs();
    const newLog: AuditLog = {
      id: log.id || `AUDIT-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`,
      timestamp: log.timestamp || new Date().toISOString(),
      entityType: log.entityType,
      entityId: log.entityId,
      action: log.action,
      performedByUserId: log.performedByUserId,
      performedByUserName: log.performedByUserName,
      performedByRole: log.performedByRole,
      details: log.details,
      previousState: log.previousState,
      newState: log.newState,
    };
    logs.unshift(newLog);
    // Keep max 500 logs locally
    if (logs.length > 500) logs.length = 500;
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(logs));
    return newLog;
  }

  // SYNC LOGS
  static getSyncLogs(): SyncLog[] {
    this.initialize();
    const data = localStorage.getItem(STORAGE_KEYS.SYNC_LOGS);
    return data ? JSON.parse(data) : [];
  }

  static addSyncLog(log: Omit<SyncLog, 'id' | 'timestamp'> & { id?: string; timestamp?: string }): SyncLog {
    const logs = this.getSyncLogs();
    const newLog: SyncLog = {
      id: log.id || `SYNC-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`,
      timestamp: log.timestamp || new Date().toISOString(),
      operation: log.operation,
      entityType: log.entityType,
      entityId: log.entityId,
      status: log.status,
      message: log.message,
      durationMs: log.durationMs,
      transactionId: log.transactionId,
    };
    logs.unshift(newLog);
    if (logs.length > 500) logs.length = 500;
    localStorage.setItem(STORAGE_KEYS.SYNC_LOGS, JSON.stringify(logs));
    return newLog;
  }

  // ARCHIVED / SOFT-DELETED RECORDS
  static getArchivedRecords(): ArchivedRecord[] {
    this.initialize();
    const data = localStorage.getItem(STORAGE_KEYS.ARCHIVED_RECORDS);
    return data ? JSON.parse(data) : [];
  }

  static archiveRecord(record: Omit<ArchivedRecord, 'id' | 'archivedAt'>): ArchivedRecord {
    const list = this.getArchivedRecords();
    const newRecord: ArchivedRecord = {
      id: `ARCH-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`,
      originalId: record.originalId,
      entityType: record.entityType,
      archivedAt: new Date().toISOString(),
      archivedByUserId: record.archivedByUserId,
      archivedByUserName: record.archivedByUserName,
      reason: record.reason,
      data: record.data,
    };
    list.unshift(newRecord);
    localStorage.setItem(STORAGE_KEYS.ARCHIVED_RECORDS, JSON.stringify(list));

    // Audit the archive action
    this.addAuditLog({
      entityType: record.entityType as any,
      entityId: record.originalId,
      action: 'ARCHIVE',
      performedByUserId: record.archivedByUserId,
      performedByUserName: record.archivedByUserName,
      performedByRole: 'ADMIN',
      details: `Archived ${record.entityType} ${record.originalId}: ${record.reason}`,
      previousState: record.data,
    });

    return newRecord;
  }

  static restoreArchivedRecord(archivedId: string, restoredByUserId: string, restoredByUserName: string): boolean {
    const list = this.getArchivedRecords();
    const idx = list.findIndex(r => r.id === archivedId);
    if (idx === -1) return false;

    const record = list[idx];
    const itemData = record.data;

    // Restore to appropriate store
    switch (record.entityType) {
      case 'ALUMNI': {
        const alumni = this.getAlumni();
        if (!alumni.some(a => a.id === itemData.id)) {
          alumni.unshift(itemData);
          this.saveAlumni(alumni);
        }
        break;
      }
      case 'LEAD': {
        const leads = this.getLeads();
        if (!leads.some(l => l.id === itemData.id)) {
          leads.unshift(itemData);
          this.saveLeads(leads);
        }
        break;
      }
      case 'USER': {
        const scs = this.getSCUsers();
        if (!scs.some(s => s.id === itemData.id)) {
          scs.unshift(itemData);
          this.saveSCUsers(scs);
        }
        break;
      }
    }

    // Remove from archive
    list.splice(idx, 1);
    localStorage.setItem(STORAGE_KEYS.ARCHIVED_RECORDS, JSON.stringify(list));

    // Audit log
    this.addAuditLog({
      entityType: record.entityType as any,
      entityId: record.originalId,
      action: 'RESTORE',
      performedByUserId: restoredByUserId,
      performedByUserName: restoredByUserName,
      performedByRole: 'ADMIN',
      details: `Restored ${record.entityType} ${record.originalId} from archive`,
      newState: itemData,
    });

    return true;
  }

  // IDEMPOTENCY / TRANSACTION TRACKING
  static isTransactionProcessed(txnId: string): boolean {
    if (!txnId) return false;
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      const txns: string[] = data ? JSON.parse(data) : [];
      return txns.includes(txnId);
    } catch {
      return false;
    }
  }

  static markTransactionProcessed(txnId: string): void {
    if (!txnId) return;
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      const txns: string[] = data ? JSON.parse(data) : [];
      if (!txns.includes(txnId)) {
        txns.unshift(txnId);
        if (txns.length > 1000) txns.length = 1000;
        localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(txns));
      }
    } catch (e) {
      console.error('Error saving transaction ID:', e);
    }
  }

  // RESET ALL TO DEFAULTS
  static resetToDefaults() {
    localStorage.setItem(STORAGE_KEYS.SC_USERS, JSON.stringify(INITIAL_SC_USERS));
    localStorage.setItem(STORAGE_KEYS.ALUMNI, JSON.stringify(INITIAL_ALUMNI));
    localStorage.setItem(STORAGE_KEYS.LEADS, JSON.stringify(INITIAL_LEADS));
    localStorage.setItem(STORAGE_KEYS.CALL_LOGS, JSON.stringify(INITIAL_CALL_LOGS));
    localStorage.setItem(STORAGE_KEYS.FOLLOWUPS, JSON.stringify(INITIAL_FOLLOWUPS));
    localStorage.setItem(STORAGE_KEYS.REFERENCE_RESPONSES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(INITIAL_SETTINGS));
    localStorage.removeItem(STORAGE_KEYS.AUDIT_LOGS);
    localStorage.removeItem(STORAGE_KEYS.SYNC_LOGS);
    localStorage.removeItem(STORAGE_KEYS.ARCHIVED_RECORDS);
    localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS);
  }
}
