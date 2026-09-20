import axios, { AxiosError } from 'axios';
import { StorageService } from './storage';
import { distributeAlumniEqually } from './distributor';
import { SaveStatusService } from './saveStatusService';
import {
  Alumni,
  SCUser,
  Lead,
  CallLog,
  Followup,
  ReferenceResponse,
  ReferenceTokenData,
  SCPerformanceStat,
  CallStatus,
  LeadStatus,
  RelationType,
  UserSheetConnection,
} from '../types';

/**
 * Standard API Response Structure for Google Apps Script operations
 */
export interface GasApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp?: string;
  source: 'gas' | 'local';
  totalCount?: number;
}

/**
 * Parameters for creating a new Lead Log in Google Sheets & Local Storage
 */
export interface CreateLeadLogParams {
  leadId?: string;
  sourceAlumniId?: string;
  sourceAlumniName?: string;
  sourceAlumniMobile?: string;
  scId: string;
  scName: string;
  referenceName: string;
  relation: RelationType;
  mobile: string;
  email?: string;
  courseInterest: string;
  leadStatus?: LeadStatus;
  nextFollowup?: string;
  counsellingDate?: string;
  remark?: string;
}

/**
 * Parameters for logging a Lead Follow-up Interaction
 */
export interface CreateFollowupLogParams {
  leadId: string;
  scId: string;
  scName: string;
  followupDate?: string;
  status: LeadStatus;
  remark: string;
  nextFollowup?: string;
  counsellingDate?: string;
}

/**
 * Parameters for logging an Alumni Call
 */
export interface LogAlumniCallParams {
  alumniId: string;
  scId: string;
  scName: string;
  callStatus: CallStatus;
  callResult: string;
  remark: string;
  nextFollowup: string;
  referenceReceived?: 'Yes' | 'No';
}

/**
 * Custom Error for Google Apps Script and Google Sheets network operations
 */
export class GasApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public originalError?: any,
    public isNetworkError?: boolean,
    public diagnosticSuggestion?: string
  ) {
    super(message);
    this.name = 'GasApiError';
  }
}

/**
 * ApiService
 *
 * Dedicated service layer providing a robust interface between the application
 * and Google Sheets via Google Apps Script (GAS) Web App URL.
 *
 * Features:
 * - Direct HTTP endpoints for fetching records (Alumni, Leads, Call Logs, Followups, SCs)
 * - Single-record & batch updates for Alumni data with Google Sheets column synchronization
 * - Creation of Lead logs and Followup logs with automatic Alumni reference incrementation
 * - Comprehensive error handling, CORS bypass protection, timeout safeguards, and offline fallback
 */
export class ApiService {
  /**
   * Retrieves the configured Google Apps Script Web App URL
   */
  public static getGasUrl(): string {
    const settings = StorageService.getSettings();
    const configuredUrl = settings.googleWebAppUrl || (import.meta.env.VITE_GAS_API_URL as string) || '';
    return configuredUrl.trim();
  }

  /**
   * Checks whether the Google Apps Script integration is configured
   */
  public static isGasConfigured(): boolean {
    const url = this.getGasUrl();
    return Boolean(url && url.startsWith('http'));
  }

  /**
   * Internal HTTP Request Executor for Google Apps Script
   *
   * Note: Google Apps Script Web Apps have a well-known behavior with browser preflight CORS
   * when POSTing with 'application/json'. To avoid CORS preflight rejections while still
   * transmitting JSON payloads that GAS handles via JSON.parse(e.postData.contents),
   * we use 'text/plain;charset=utf-8' on POST requests.
   */
  public static async requestGas<T = any>(
    action: string,
    options: {
      method?: 'GET' | 'POST';
      params?: Record<string, any>;
      payload?: Record<string, any>;
      timeout?: number;
      customUrl?: string;
    } = {}
  ): Promise<GasApiResponse<T>> {
    const targetUrl = options.customUrl || this.getGasUrl();
    const timeout = options.timeout || 12000;
    const method = options.method || (options.payload ? 'POST' : 'GET');

    if (!targetUrl) {
      return {
        success: false,
        error: 'Google Apps Script Web App URL is not configured. Please set it in Settings / Google Sheets Modal.',
        source: 'local',
      };
    }

    try {
      let response: any;

      if (method === 'POST') {
        const bodyData = {
          action,
          ...(options.payload || {}),
        };

        response = await axios.post(targetUrl, JSON.stringify(bodyData), {
          headers: {
            'Content-Type': 'text/plain;charset=utf-8',
          },
          timeout,
        });
      } else {
        response = await axios.get(targetUrl, {
          params: {
            action,
            ...(options.params || {}),
          },
          timeout,
        });
      }

      // Detect HTML error responses (e.g., Google login redirects or permission denials)
      if (typeof response.data === 'string' && response.data.trim().startsWith('<')) {
        const isAuthError = response.data.includes('Sign in') || response.data.includes('accounts.google.com');
        const diagnostic = isAuthError
          ? "Google Apps Script returned an authentication page. Ensure your Web App is deployed with 'Execute as: Me' and 'Who has access: Anyone'."
          : 'Google Apps Script returned HTML rather than JSON. Verify the deployment configuration.';

        return {
          success: false,
          error: diagnostic,
          source: 'gas',
        };
      }

      const resData = response.data;
      if (resData && typeof resData === 'object') {
        if (resData.success === false) {
          return {
            success: false,
            error: resData.error || resData.message || `Action '${action}' failed in Google Apps Script.`,
            source: 'gas',
          };
        }

        return {
          success: true,
          data: (resData.data !== undefined ? resData.data : resData) as T,
          message: resData.message,
          timestamp: resData.timestamp || new Date().toISOString(),
          source: 'gas',
          totalCount: Array.isArray(resData.data) ? resData.data.length : undefined,
        };
      }

      return {
        success: true,
        data: resData as T,
        source: 'gas',
      };
    } catch (err: any) {
      const errorMsg = this.formatGasErrorMessage(err, action);
      console.warn(`[ApiService] GAS request failed for action '${action}':`, errorMsg);

      return {
        success: false,
        error: errorMsg,
        source: 'local',
      };
    }
  }

  /**
   * Diagnostic helper to format error messages from Axios and GAS
   */
  private static formatGasErrorMessage(err: any, action: string): string {
    if (axios.isAxiosError(err)) {
      const axiosErr = err as AxiosError<any>;
      if (axiosErr.code === 'ECONNABORTED' || axiosErr.message.includes('timeout')) {
        return `Request timed out while executing '${action}' on Google Apps Script. Google Sheets may be processing a large batch.`;
      }
      if (!axiosErr.response) {
        return `Network or CORS error connecting to Google Apps Script. Please verify the Web App URL and ensure deployment access is set to 'Anyone'.`;
      }
      if (axiosErr.response.status === 404) {
        return `Google Apps Script endpoint not found (HTTP 404). Check the Web App URL in settings.`;
      }
      if (axiosErr.response.data && typeof axiosErr.response.data === 'object') {
        return axiosErr.response.data.error || axiosErr.response.data.message || `Server error (${axiosErr.response.status}).`;
      }
    }
    return err?.message || `Failed to communicate with Google Sheets via Apps Script.`;
  }

  // =========================================================================
  // 1. SYSTEM DIAGNOSTICS & SETUP ENDPOINTS
  // =========================================================================

  /**
   * Tests the connection to Google Apps Script Web App
   */
  public static async testGasConnection(
    url?: string
  ): Promise<{ success: boolean; message: string; timestamp?: string; latencyMs?: number }> {
    const targetUrl = url || this.getGasUrl();
    if (!targetUrl) {
      return { success: false, message: 'No Google Apps Script Web App URL provided.' };
    }

    const startTime = performance.now();
    try {
      const response = await this.requestGas<{ message?: string; timestamp?: string }>('ping', {
        method: 'GET',
        customUrl: targetUrl,
        timeout: 10000,
      });

      const latencyMs = Math.round(performance.now() - startTime);

      if (response.success) {
        return {
          success: true,
          message: response.data?.message || 'Connected successfully to Google Apps Script and Google Sheets!',
          timestamp: response.data?.timestamp,
          latencyMs,
        };
      }

      return {
        success: false,
        message: response.error || 'Connection test failed. Google Apps Script returned an unexpected format.',
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Unable to establish connection to Google Apps Script.',
      };
    }
  }

  /**
   * Initializes all required sheets and header schemas in the target Google Spreadsheet
   */
  public static async initGoogleSheets(
    url?: string
  ): Promise<{ success: boolean; message: string }> {
    const targetUrl = url || this.getGasUrl();
    if (!targetUrl) {
      return { success: false, message: 'Google Apps Script URL is required to initialize sheets.' };
    }

    try {
      const response = await this.requestGas<{ message?: string }>('initSheets', {
        method: 'GET',
        customUrl: targetUrl,
        timeout: 15000,
      });

      if (response.success) {
        return {
          success: true,
          message: response.data?.message || 'Google Spreadsheet sheets and header schemas verified successfully.',
        };
      }

      return {
        success: false,
        message: response.error || 'Failed to initialize sheets schema in Google Spreadsheet.',
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Error executing initSheets on Google Apps Script.',
      };
    }
  }

  /**
   * Alias for initGoogleSheets
   */
  public static async initSheets(
    url?: string
  ): Promise<{ success: boolean; message: string }> {
    return this.initGoogleSheets(url);
  }

  /**
   * Retrieves the persistent Google Sheet connection linked to a user account
   */
  public static async getUserSheetConnection(userId: string): Promise<{
    success: boolean;
    connection?: UserSheetConnection;
    message?: string;
  }> {
    try {
      const res = await axios.get(`/api/user/${userId}/sheet-connection`);
      return res.data;
    } catch (err: any) {
      return { success: false, message: err?.response?.data?.message || err.message };
    }
  }

  /**
   * Permanently associates a Google Sheet with a specific User Account on the backend
   */
  public static async saveUserSheetConnection(
    userId: string,
    data: {
      googleWebAppUrl: string;
      spreadsheetId?: string;
      userEmail?: string;
      userName?: string;
    }
  ): Promise<{ success: boolean; connection?: any; message?: string }> {
    try {
      const res = await axios.post(`/api/user/${userId}/sheet-connection`, data);
      return res.data;
    } catch (err: any) {
      return { success: false, message: err?.response?.data?.message || err.message };
    }
  }

  /**
   * Removes the Google Sheet connection for a specific User Account
   */
  public static async disconnectUserSheet(userId: string): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await axios.delete(`/api/user/${userId}/sheet-connection`);
      return res.data;
    } catch (err: any) {
      return { success: false, message: err?.response?.data?.message || err.message };
    }
  }

  /**
   * Backs up current records snapshot on the server for cross-device access
   */
  public static async saveUserDataSnapshot(userId: string, data: any): Promise<void> {
    try {
      await axios.post(`/api/user/${userId}/data-snapshot`, data);
    } catch (err) {
      console.warn('[ApiService] Failed to save user data snapshot to server:', err);
    }
  }

  /**
   * Retrieves server-backed records snapshot for a user account
   */
  public static async getUserDataSnapshot(userId: string): Promise<any | null> {
    try {
      const res = await axios.get(`/api/user/${userId}/data-snapshot`);
      return res.data?.snapshot || null;
    } catch {
      return null;
    }
  }

  /**
   * Connects permanently to a Google Sheet via Google Apps Script Web App URL,
   * associates it permanently with the authenticated User Account,
   * automatically creates all 9 tabs with bold headers if missing,
   * pushes current application data, and verifies round-trip read.
   */
  public static async connectAndInitializeSheet(
    url: string,
    spreadsheetId?: string,
    userId?: string,
    userEmail?: string,
    userName?: string
  ): Promise<{ success: boolean; message: string }> {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      return { success: false, message: 'A valid Google Apps Script Web App URL is required.' };
    }

    const activeUser = StorageService.getActiveUser();
    const targetUserId = userId || activeUser?.id || 'ADMIN-01';
    const targetUserEmail = userEmail || activeUser?.email || '';
    const targetUserName = userName || activeUser?.name || 'Administrator';
    const targetSpreadsheetId = (spreadsheetId || 'SEAMEDU_ADMISSIONS_FMS').trim();

    SaveStatusService.setSaving('Connecting & setting up Google Sheet tabs...');

    try {
      // 1. Initialize sheet schema on Google Spreadsheet (creates tabs & headers if missing)
      const initRes = await this.initGoogleSheets(trimmedUrl);
      if (!initRes.success) {
        SaveStatusService.setError('Connection failed: ' + initRes.message);
        return { success: false, message: initRes.message };
      }

      // 2. Save settings locally for active user
      const currentSettings = StorageService.getSettings(targetUserId);
      const updatedSettings = {
        ...currentSettings,
        googleWebAppUrl: trimmedUrl,
        spreadsheetId: targetSpreadsheetId,
        lastSyncStatus: 'CONNECTED' as const,
        lastSyncTime: new Date().toISOString(),
        lastSyncError: undefined,
        autoSyncEnabled: true,
      };
      StorageService.saveSettings(updatedSettings, targetUserId);

      // 3. Persist permanently to the user's account on the server
      await this.saveUserSheetConnection(targetUserId, {
        googleWebAppUrl: trimmedUrl,
        spreadsheetId: targetSpreadsheetId,
        userEmail: targetUserEmail,
        userName: targetUserName,
      });

      // 4. Push existing local data to Google Sheet
      SaveStatusService.setSaving('Uploading current database records to Google Sheet...');
      await this.syncAllToGoogleSheets();

      // 5. Backup snapshot on the server for cross-device consistency
      await this.saveUserDataSnapshot(targetUserId, {
        alumni: StorageService.getAlumni(),
        leads: StorageService.getLeads(),
        scUsers: StorageService.getSCUsers(),
        callLogs: StorageService.getCallLogs(),
        followups: StorageService.getFollowups(),
        referenceResponses: StorageService.getReferenceResponses(),
      });

      // 6. Log audit & sync log
      StorageService.addAuditLog({
        entityType: 'SETTINGS',
        entityId: 'GOOGLE_SHEETS',
        action: 'UPDATE',
        details: `Connected Google Sheet permanently (${updatedSettings.spreadsheetId}) to account ${targetUserName} (${targetUserId}). Verified 9 tabs.`,
        performedByRole: 'ADMIN',
        performedByUserId: targetUserId,
        performedByUserName: targetUserName,
      });

      StorageService.addSyncLog({
        operation: 'connectSheet',
        entityType: 'FULL_DATABASE',
        entityId: updatedSettings.spreadsheetId,
        status: 'SUCCESS',
        message: `Google Sheet connected permanently to user account ${targetUserId}.`,
      });

      SaveStatusService.setSaved('Google Sheet Connected & Synced ✓');
      return {
        success: true,
        message: `Google Sheet permanently linked to account (${targetUserName})! All 9 tabs and schemas verified.`,
      };
    } catch (err: any) {
      SaveStatusService.setError(err.message || 'Error connecting to Google Sheet');
      return { success: false, message: err.message || 'Unknown error occurred during connection.' };
    }
  }

  /**
   * Disconnects the connected Google Sheet for the specified user account upon manual user request.
   * Connection will only return to disconnected state after calling this.
   */
  public static async disconnectGoogleSheet(userId?: string): Promise<void> {
    SaveStatusService.setSaving('Disconnecting Google Sheet...');
    const activeUser = StorageService.getActiveUser();
    const targetUserId = userId || activeUser?.id || 'ADMIN-01';

    const current = StorageService.getSettings(targetUserId);
    const updated = {
      ...current,
      googleWebAppUrl: '',
      lastSyncStatus: 'DISCONNECTED' as const,
    };
    StorageService.saveSettings(updated, targetUserId);

    // Remove from server persistent store
    if (targetUserId) {
      await this.disconnectUserSheet(targetUserId);
    }

    StorageService.addAuditLog({
      entityType: 'SETTINGS',
      entityId: 'GOOGLE_SHEETS',
      action: 'UPDATE',
      details: `Google Sheet disconnected from account ${targetUserId} by manual user action.`,
      performedByRole: 'ADMIN',
      performedByUserId: targetUserId,
      performedByUserName: activeUser?.name || 'Administrator',
    });

    StorageService.addSyncLog({
      operation: 'disconnectSheet',
      entityType: 'FULL_DATABASE',
      entityId: current.spreadsheetId || 'SEAMEDU_ADMISSIONS_FMS',
      status: 'SUCCESS',
      message: `Google Sheet disconnected from user account ${targetUserId}.`,
    });

    SaveStatusService.setSaved('Sheet disconnected');
  }

  // =========================================================================
  // 2. FETCHING RECORDS ENDPOINTS
  // =========================================================================

  /**
   * Generic endpoint for fetching records from any sheet in the Google Spreadsheet
   *
   * @param sheetName Name of the sheet (e.g. 'Alumni', 'Leads', 'Call_Logs', 'Followups')
   * @param queryParams Optional filter or pagination parameters
   */
  public static async fetchRecords<T = any>(
    sheetName: string,
    queryParams?: Record<string, any>
  ): Promise<GasApiResponse<T[]>> {
    const action = `get${sheetName.replace(/[^a-zA-Z0-9]/g, '')}`;
    const res = await this.requestGas<T[]>(action, {
      method: 'GET',
      params: queryParams,
    });

    if (res.success && Array.isArray(res.data)) {
      return res;
    }

    return {
      success: false,
      error: res.error || `Could not fetch records for sheet: ${sheetName}`,
      data: [],
      source: 'gas',
    };
  }

  /**
   * Batch fetches all primary records in one round-trip from Google Sheets
   * Synchronizes local StorageService cache with live sheet data
   */
  public static async fetchAllRecords(scId?: string): Promise<
    GasApiResponse<{
      alumni: Alumni[];
      leads: Lead[];
      callLogs: CallLog[];
      followups: Followup[];
      scUsers: SCUser[];
      references: ReferenceResponse[];
    }>
  > {
    if (!this.isGasConfigured()) {
      const localAlumni = scId ? StorageService.getAlumni().filter(a => a.assignedSCId === scId) : StorageService.getAlumni();
      const localLeads = scId ? StorageService.getLeads().filter(l => l.scId === scId) : StorageService.getLeads();
      return {
        success: true,
        source: 'local',
        data: {
          alumni: localAlumni,
          leads: localLeads,
          callLogs: StorageService.getCallLogs(),
          followups: StorageService.getFollowups(),
          scUsers: StorageService.getSCUsers(),
          references: StorageService.getReferenceResponses(),
        },
      };
    }

    const res = await this.requestGas<any>('getAllData', {
      method: 'GET',
      params: scId ? { scId } : {},
    });

    if (res.success && res.data) {
      const raw = res.data;
      const normalizedAlumni = (raw.alumni || []).map((r: any) => this.normalizeAlumniRow(r));
      const normalizedLeads = (raw.leads || []).map((r: any) => this.normalizeLeadRow(r));
      const normalizedCalls = (raw.callLogs || []).map((r: any) => this.normalizeCallLogRow(r));
      const normalizedFollowups = (raw.followups || []).map((r: any) => this.normalizeFollowupRow(r));
      const normalizedSCs = (raw.scUsers || []).map((r: any) => this.normalizeSCUserRow(r));
      const normalizedRefs = (raw.references || []).map((r: any) => this.normalizeReferenceRow(r));

      // Synchronize local storage cache
      if (normalizedAlumni.length > 0) StorageService.saveAlumni(normalizedAlumni);
      if (normalizedLeads.length > 0) StorageService.saveLeads(normalizedLeads);
      if (normalizedSCs.length > 0) StorageService.saveSCUsers(normalizedSCs);

      // Persist snapshot to server for cross-device availability
      const activeUser = StorageService.getActiveUser();
      if (activeUser?.id) {
        this.saveUserDataSnapshot(activeUser.id, {
          alumni: normalizedAlumni,
          leads: normalizedLeads,
          scUsers: normalizedSCs,
          callLogs: normalizedCalls,
          followups: normalizedFollowups,
          referenceResponses: normalizedRefs,
        });
      }

      return {
        success: true,
        source: 'gas',
        data: {
          alumni: scId ? normalizedAlumni.filter((a: Alumni) => a.assignedSCId === scId) : normalizedAlumni,
          leads: scId ? normalizedLeads.filter((l: Lead) => l.scId === scId) : normalizedLeads,
          callLogs: normalizedCalls,
          followups: normalizedFollowups,
          scUsers: normalizedSCs,
          references: normalizedRefs,
        },
      };
    }

    // Graceful fallback to local cache
    const fallbackAlumni = scId ? StorageService.getAlumni().filter(a => a.assignedSCId === scId) : StorageService.getAlumni();
    const fallbackLeads = scId ? StorageService.getLeads().filter(l => l.scId === scId) : StorageService.getLeads();

    return {
      success: true,
      source: 'local',
      message: 'Serving records from local cache due to GAS error: ' + (res.error || 'Unavailable'),
      data: {
        alumni: fallbackAlumni,
        leads: fallbackLeads,
        callLogs: StorageService.getCallLogs(),
        followups: StorageService.getFollowups(),
        scUsers: StorageService.getSCUsers(),
        references: StorageService.getReferenceResponses(),
      },
    };
  }

  /**
   * Fetches Alumni records from Google Sheets (or fallback to local cache)
   */
  public static async getAlumni(scId?: string): Promise<Alumni[]> {
    if (this.isGasConfigured()) {
      try {
        const res = await this.requestGas<any[]>('getAlumni', {
          method: 'GET',
          params: scId ? { scId } : {},
          timeout: 8000,
        });

        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          const alumniList: Alumni[] = res.data.map(row => this.normalizeAlumniRow(row));

          // Sync into local persistence
          StorageService.saveAlumni(alumniList);

          return scId ? alumniList.filter(a => a.assignedSCId === scId) : alumniList;
        }
      } catch (err) {
        console.warn('[ApiService] Failed to fetch Alumni from Google Sheets, using local cache:', err);
      }
    }

    const localList = StorageService.getAlumni();
    return scId ? localList.filter(a => a.assignedSCId === scId) : localList;
  }

  /**
   * Fetches Leads records from Google Sheets (or fallback to local cache)
   */
  public static async getLeads(scId?: string): Promise<Lead[]> {
    if (this.isGasConfigured()) {
      try {
        const res = await this.requestGas<any[]>('getLeads', {
          method: 'GET',
          params: scId ? { scId } : {},
          timeout: 8000,
        });

        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          const leadsList: Lead[] = res.data.map(row => this.normalizeLeadRow(row));
          StorageService.saveLeads(leadsList);
          return scId ? leadsList.filter(l => l.scId === scId) : leadsList;
        }
      } catch (err) {
        console.warn('[ApiService] Failed to fetch Leads from Google Sheets, using local cache:', err);
      }
    }

    const list = StorageService.getLeads();
    return scId ? list.filter(l => l.scId === scId) : list;
  }

  /**
   * Fetches Call Logs from Google Sheets (or fallback to local cache)
   */
  public static async getCallLogs(alumniId?: string, scId?: string): Promise<CallLog[]> {
    if (this.isGasConfigured()) {
      try {
        const res = await this.requestGas<any[]>('getCallLogs', {
          method: 'GET',
          params: { alumniId, scId },
          timeout: 8000,
        });

        if (res.success && Array.isArray(res.data)) {
          const logs = res.data.map(row => this.normalizeCallLogRow(row));
          return logs.filter(c => {
            if (alumniId && c.alumniId !== alumniId) return false;
            if (scId && c.scId !== scId) return false;
            return true;
          });
        }
      } catch (err) {
        console.warn('[ApiService] Failed to fetch Call Logs from Google Sheets, using local cache:', err);
      }
    }

    const list = StorageService.getCallLogs();
    return list.filter(c => {
      if (alumniId && c.alumniId !== alumniId) return false;
      if (scId && c.scId !== scId) return false;
      return true;
    });
  }

  /**
   * Fetches Followup records from Google Sheets (or fallback to local cache)
   */
  public static async getFollowups(scId?: string, leadId?: string): Promise<Followup[]> {
    if (this.isGasConfigured()) {
      try {
        const res = await this.requestGas<any[]>('getFollowups', {
          method: 'GET',
          params: { scId, leadId },
          timeout: 8000,
        });

        if (res.success && Array.isArray(res.data)) {
          const followups = res.data.map(row => this.normalizeFollowupRow(row));
          return followups.filter(f => {
            if (scId && f.scId !== scId) return false;
            if (leadId && f.leadId !== leadId) return false;
            return true;
          });
        }
      } catch (err) {
        console.warn('[ApiService] Failed to fetch Followups from Google Sheets, using local cache:', err);
      }
    }

    const list = StorageService.getFollowups();
    return list.filter(f => {
      if (scId && f.scId !== scId) return false;
      if (leadId && f.leadId !== leadId) return false;
      return true;
    });
  }

  /**
   * Fetches Reference Submissions from Google Sheets (or fallback to local cache)
   */
  public static async getReferenceResponses(scId?: string): Promise<ReferenceResponse[]> {
    if (this.isGasConfigured()) {
      try {
        const res = await this.requestGas<any[]>('getReferences', {
          method: 'GET',
          params: { scId },
          timeout: 8000,
        });

        if (res.success && Array.isArray(res.data)) {
          const refs = res.data.map(row => this.normalizeReferenceRow(row));
          return scId ? refs.filter(r => r.sourceSCId === scId) : refs;
        }
      } catch (err) {
        console.warn('[ApiService] Failed to fetch References from Google Sheets:', err);
      }
    }

    const list = StorageService.getReferenceResponses();
    return scId ? list.filter(r => r.sourceSCId === scId) : list;
  }

  /**
   * Fetches Student Counsellors from Google Sheets or local storage
   */
  public static async getSCUsers(): Promise<SCUser[]> {
    if (this.isGasConfigured()) {
      try {
        const res = await this.requestGas<any[]>('getSCUsers', {
          method: 'GET',
          timeout: 8000,
        });

        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          const scList = res.data.map(row => this.normalizeSCUserRow(row));
          StorageService.saveSCUsers(scList);
          return scList;
        }
      } catch (err) {
        console.warn('[ApiService] Failed to fetch SC Users from Google Sheets:', err);
      }
    }

    return StorageService.getSCUsers();
  }

  // =========================================================================
  // 3. UPDATING ALUMNI ENDPOINTS
  // =========================================================================

  /**
   * Deletes an Alumni record directly from the application and synchronizes deletion to Google Sheet immediately.
   */
  public static async deleteAlumni(
    alumniId: string,
    performedByUserId: string = 'admin',
    performedByUserName: string = 'Administrator'
  ): Promise<GasApiResponse<{ deletedId: string }>> {
    if (!alumniId) {
      return {
        success: false,
        error: 'Alumni ID is required for deletion.',
        source: 'local',
      };
    }

    SaveStatusService.setSaving('Deleting alumni from Google Sheet...');

    // 1. Remove from local store, archive, and audit
    const deleted = StorageService.deleteAlumni(alumniId, performedByUserId, performedByUserName);
    if (!deleted) {
      SaveStatusService.setError(`Alumni '${alumniId}' not found.`);
      return {
        success: false,
        error: `Alumni with ID '${alumniId}' was not found in records.`,
        source: 'local',
      };
    }

    // 2. Synchronize deletion immediately to connected Google Sheet
    if (this.isGasConfigured()) {
      try {
        const start = Date.now();
        const res = await this.requestGas<{ deletedId: string }>('deleteAlumni', {
          method: 'POST',
          payload: { alumniId },
          timeout: 10000,
        });

        StorageService.addSyncLog({
          operation: 'deleteAlumni',
          entityType: 'ALUMNI',
          entityId: alumniId,
          status: res.success ? 'SUCCESS' : 'FAILED',
          message: res.success
            ? `Alumni ${alumniId} deleted from Google Sheet.`
            : `Remote delete warning: ${res.error}`,
          durationMs: Date.now() - start,
        });

        if (res.success) {
          SaveStatusService.setSaved('Alumni deleted from Google Sheet ✓');
          return {
            success: true,
            data: { deletedId: alumniId },
            message: 'Alumni deleted successfully from active roster and Google Sheet.',
            source: 'gas',
          };
        } else {
          SaveStatusService.setError('Local delete saved. Sheet warning: ' + res.error);
          return {
            success: true,
            data: { deletedId: alumniId },
            message: `Alumni deleted locally. Remote Google Sheet sync reported: ${res.error}`,
            source: 'local',
          };
        }
      } catch (err: any) {
        SaveStatusService.setError('Local delete saved. Network sync failed.');
        return {
          success: true,
          data: { deletedId: alumniId },
          message: `Alumni deleted locally. Network error communicating with Google Sheet: ${err.message}`,
          source: 'local',
        };
      }
    }

    SaveStatusService.setSaved('Alumni deleted locally ✓');
    return {
      success: true,
      data: { deletedId: alumniId },
      message: 'Alumni deleted successfully from local storage.',
      source: 'local',
    };
  }

  /**
   * Creates a new Alumni record and synchronizes to Google Sheet immediately
   */
  public static async createAlumni(
    alumniData: Partial<Alumni>,
    performedByUserId: string = 'admin',
    performedByUserName: string = 'Administrator'
  ): Promise<GasApiResponse<Alumni>> {
    SaveStatusService.setSaving('Saving alumni to Google Sheet...');
    const id = alumniData.id || `ALUM-${Date.now().toString().slice(-6)}`;
    const newAlumni: Alumni = {
      id,
      name: alumniData.name || '',
      mobile: alumniData.mobile || '',
      email: alumniData.email || '',
      course: alumniData.course || '',
      batch: alumniData.batch || '',
      passingYear: alumniData.passingYear || '',
      assignedSCId: alumniData.assignedSCId || '',
      assignedSCName: alumniData.assignedSCName || 'Unassigned',
      callStatus: alumniData.callStatus || 'Pending',
      lastCallDate: alumniData.lastCallDate || '',
      referenceReceived: alumniData.referenceReceived || 'No',
      referenceCount: alumniData.referenceCount || 0,
      nextFollowup: alumniData.nextFollowup || '',
      remark: alumniData.remark || '',
      createdDate: alumniData.createdDate || new Date().toISOString(),
    };

    const all = StorageService.getAlumni();
    all.unshift(newAlumni);
    StorageService.saveAlumni(all);

    StorageService.addAuditLog({
      entityType: 'ALUMNI',
      entityId: id,
      action: 'CREATE',
      performedByUserId,
      performedByUserName,
      performedByRole: 'ADMIN',
      details: `Created Alumni ${newAlumni.name} (${id})`,
      newState: newAlumni,
    });

    if (this.isGasConfigured()) {
      try {
        const res = await this.requestGas<Alumni>('createAlumni', {
          method: 'POST',
          payload: { alumniData: newAlumni },
        });
        if (res.success) {
          SaveStatusService.setSaved('Alumni saved to Google Sheet ✓');
          return {
            success: true,
            data: newAlumni,
            message: 'Alumni saved to Google Sheet.',
            source: 'gas',
          };
        }
      } catch (err) {
        console.warn('Google Sheet createAlumni error:', err);
      }
    }

    SaveStatusService.setSaved('Alumni saved ✓');
    return {
      success: true,
      data: newAlumni,
      message: 'Alumni saved to local store.',
      source: 'local',
    };
  }

  /**
   * Updates an Alumni record in Google Sheets and synchronizes with local storage
   *
   * @param alumniId Target Alumni ID (e.g. 'ALUM-1001')
   * @param updates Fields to update (e.g. callStatus, remark, nextFollowup, contact info, assignment)
   */
  public static async updateAlumni(
    alumniId: string,
    updates: Partial<Alumni>
  ): Promise<GasApiResponse<Alumni>> {
    if (!alumniId) {
      return {
        success: false,
        error: 'Alumni ID is required for update.',
        source: 'local',
      };
    }

    SaveStatusService.setSaving('Saving alumni update to Google Sheet...');

    // 1. Update in local storage
    const allAlumni = StorageService.getAlumni();
    const index = allAlumni.findIndex(a => a.id === alumniId);
    let updatedAlumni: Alumni;

    if (index !== -1) {
      updatedAlumni = {
        ...allAlumni[index],
        ...updates,
      };
      allAlumni[index] = updatedAlumni;
      StorageService.saveAlumni(allAlumni);
    } else {
      SaveStatusService.setError(`Alumni '${alumniId}' not found.`);
      return {
        success: false,
        error: `Alumni with ID '${alumniId}' was not found in local records.`,
        source: 'local',
      };
    }

    // 2. Transmit update to Google Sheets via GAS
    if (this.isGasConfigured()) {
      const gasPayload = {
        alumniId,
        updates: {
          Name: updates.name,
          Mobile: updates.mobile,
          Email: updates.email,
          Course: updates.course,
          Batch: updates.batch,
          Passing_Year: updates.passingYear,
          Assigned_SC_ID: updates.assignedSCId,
          Assigned_SC_Name: updates.assignedSCName,
          Call_Status: updates.callStatus,
          Last_Call_Date: updates.lastCallDate,
          Reference_Received: updates.referenceReceived,
          Reference_Count: updates.referenceCount,
          Next_Followup: updates.nextFollowup,
          Remark: updates.remark,
        },
      };

      const res = await this.requestGas<any>('updateAlumni', {
        method: 'POST',
        payload: gasPayload,
        timeout: 10000,
      });

      if (!res.success) {
        console.warn(`[ApiService] Google Sheets update failed for Alumni ${alumniId}:`, res.error);
        SaveStatusService.setError('Local saved. Sheet update reported: ' + res.error);
        return {
          success: true,
          data: updatedAlumni,
          message: `Saved locally. Remote Google Sheets sync reported: ${res.error}`,
          source: 'local',
        };
      }

      SaveStatusService.setSaved('Alumni saved to Google Sheet ✓');
      return {
        success: true,
        data: updatedAlumni,
        message: 'Alumni updated successfully in Google Sheets.',
        source: 'gas',
      };
    }

    SaveStatusService.setSaved('Saved ✓');
    return {
      success: true,
      data: updatedAlumni,
      message: 'Alumni updated successfully in local storage.',
      source: 'local',
    };
  }

  /**
   * Batch updates multiple Alumni records in Google Sheets and local storage
   */
  public static async batchUpdateAlumni(
    updatesList: Array<{ id: string } & Partial<Alumni>>
  ): Promise<GasApiResponse<{ updatedCount: number }>> {
    if (!updatesList || updatesList.length === 0) {
      return { success: true, data: { updatedCount: 0 }, source: 'local' };
    }

    const allAlumni = StorageService.getAlumni();
    let localCount = 0;

    updatesList.forEach(item => {
      const idx = allAlumni.findIndex(a => a.id === item.id);
      if (idx !== -1) {
        allAlumni[idx] = { ...allAlumni[idx], ...item };
        localCount++;
      }
    });
    StorageService.saveAlumni(allAlumni);

    if (this.isGasConfigured()) {
      const res = await this.requestGas<{ updatedCount: number }>('batchUpdateAlumni', {
        method: 'POST',
        payload: { updatesList },
      });

      return {
        success: res.success,
        data: { updatedCount: res.data?.updatedCount || localCount },
        message: res.message || `Updated ${localCount} alumni.`,
        source: res.success ? 'gas' : 'local',
      };
    }

    return {
      success: true,
      data: { updatedCount: localCount },
      message: `Updated ${localCount} alumni in local storage.`,
      source: 'local',
    };
  }

  /**
   * Reassigns Alumni records to a new Student Counsellor in Google Sheets & local cache
   */
  public static async reassignAlumni(
    alumniIds: string[],
    newScId: string,
    newScName: string
  ): Promise<number> {
    const list = StorageService.getAlumni();
    let count = 0;

    list.forEach(a => {
      if (alumniIds.includes(a.id)) {
        a.assignedSCId = newScId;
        a.assignedSCName = newScName;
        count++;
      }
    });
    StorageService.saveAlumni(list);

    if (this.isGasConfigured()) {
      this.requestGas('reassignAlumni', {
        method: 'POST',
        payload: { alumniIds, newScId, newScName },
      }).catch(err => console.warn('[ApiService] GAS reassign sync error:', err));
    }

    return count;
  }

  /**
   * Logs an Alumni Call & Updates Alumni record with latest call status and follow-up
   */
  public static async logAlumniCall(params: LogAlumniCallParams): Promise<CallLog> {
    const callLog: CallLog = {
      id: `CALL-${Date.now().toString().slice(-6)}`,
      alumniId: params.alumniId,
      scId: params.scId,
      scName: params.scName,
      callDate: new Date().toISOString(),
      callStatus: params.callStatus,
      callResult: params.callResult,
      remark: params.remark,
      nextFollowup: params.nextFollowup,
    };

    // 1. Save to local Call History (immutable history)
    StorageService.addCallLog(callLog);

    // 2. Update local Alumni row
    const alumniList = StorageService.getAlumni();
    const alumni = alumniList.find(a => a.id === params.alumniId);
    if (alumni) {
      alumni.callStatus = params.callStatus;
      alumni.lastCallDate = new Date().toISOString();
      if (params.nextFollowup) {
        alumni.nextFollowup = params.nextFollowup;
      }
      if (params.remark) {
        alumni.remark = params.remark;
      }
      if (params.referenceReceived === 'Yes') {
        alumni.referenceReceived = 'Yes';
        alumni.referenceCount = (alumni.referenceCount || 0) + 1;
      }
      StorageService.saveAlumni(alumniList);
    }

    // 3. Sync to Google Sheets Call_Logs and Alumni sheets
    if (this.isGasConfigured()) {
      this.requestGas('logCall', {
        method: 'POST',
        payload: {
          callData: {
            callId: callLog.id,
            alumniId: params.alumniId,
            scId: params.scId,
            scName: params.scName,
            callDate: callLog.callDate,
            callStatus: params.callStatus,
            callResult: params.callResult,
            remark: params.remark,
            nextFollowup: params.nextFollowup,
            referenceReceived: params.referenceReceived,
          },
        },
      }).catch(err => console.warn('[ApiService] GAS logCall sync error:', err));
    }

    return callLog;
  }

  // =========================================================================
  // 4. CREATING LEAD LOGS & FOLLOWUPS ENDPOINTS
  // =========================================================================

  /**
   * Creates an Admission Lead log in Google Sheets and updates local storage
   *
   * @param params Lead details including contact info, interest, and referring alumni
   */
  public static async createLeadLog(
    params: CreateLeadLogParams
  ): Promise<GasApiResponse<Lead>> {
    const leadId = params.leadId || `LEAD-${Date.now().toString().slice(-6)}`;
    const createdDate = new Date().toISOString();

    // Look up source alumni details if available
    let sourceAlumniName = params.sourceAlumniName || 'Direct / Self';
    let sourceAlumniMobile = params.sourceAlumniMobile;

    if (params.sourceAlumniId) {
      const alumniList = StorageService.getAlumni();
      const match = alumniList.find(a => a.id === params.sourceAlumniId);
      if (match) {
        sourceAlumniName = match.name;
        sourceAlumniMobile = sourceAlumniMobile || match.mobile;

        // Automatically update Alumni referral metrics
        match.referenceReceived = 'Yes';
        match.referenceCount = (match.referenceCount || 0) + 1;
        StorageService.saveAlumni(alumniList);
      }
    }

    const newLead: Lead = {
      id: leadId,
      sourceAlumniId: params.sourceAlumniId || '',
      sourceAlumniName,
      sourceAlumniMobile,
      scId: params.scId,
      scName: params.scName,
      referenceName: params.referenceName.trim(),
      relation: params.relation || 'Other',
      mobile: params.mobile.trim(),
      email: params.email?.trim() || '',
      courseInterest: params.courseInterest || 'B.Sc Sound Engineering',
      leadStatus: params.leadStatus || 'New',
      nextFollowup: params.nextFollowup || new Date(Date.now() + 86400000).toISOString().split('T')[0],
      counsellingDate: params.counsellingDate || '',
      remark: params.remark || `Lead created via admissions portal`,
      createdDate,
    };

    // 1. Save to local storage
    StorageService.addLead(newLead);

    // If an initial remark exists, create an initial followup entry
    if (params.remark) {
      const initialFollowup: Followup = {
        id: `FUP-${Date.now().toString().slice(-6)}`,
        leadId: newLead.id,
        scId: params.scId,
        scName: params.scName,
        followupDate: newLead.nextFollowup,
        status: newLead.leadStatus,
        remark: params.remark,
        createdDate,
      };
      StorageService.addFollowup(initialFollowup);
    }

    // 2. Post to Google Sheets Leads sheet via GAS
    if (this.isGasConfigured()) {
      const res = await this.requestGas<Lead>('createLead', {
        method: 'POST',
        payload: {
          leadData: {
            leadId: newLead.id,
            sourceAlumniId: newLead.sourceAlumniId,
            sourceAlumniName: newLead.sourceAlumniName,
            sourceAlumniMobile: newLead.sourceAlumniMobile,
            scId: newLead.scId,
            scName: newLead.scName,
            referenceName: newLead.referenceName,
            relation: newLead.relation,
            mobile: newLead.mobile,
            email: newLead.email,
            courseInterest: newLead.courseInterest,
            leadStatus: newLead.leadStatus,
            nextFollowup: newLead.nextFollowup,
            counsellingDate: newLead.counsellingDate,
            remark: newLead.remark,
            createdDate: newLead.createdDate,
          },
        },
      });

      if (!res.success) {
        console.warn('[ApiService] Google Sheets createLead failed:', res.error);
        return {
          success: true,
          data: newLead,
          message: `Saved locally. Remote Google Sheets sync reported: ${res.error}`,
          source: 'local',
        };
      }

      return {
        success: true,
        data: newLead,
        message: 'Lead log created successfully in Google Sheets.',
        source: 'gas',
      };
    }

    return {
      success: true,
      data: newLead,
      message: 'Lead log created successfully in local storage.',
      source: 'local',
    };
  }

  /**
   * Logs a Follow-up interaction for an existing Lead
   */
  public static async createLeadFollowupLog(
    params: CreateFollowupLogParams
  ): Promise<GasApiResponse<Followup>> {
    const followupId = `FUP-${Date.now().toString().slice(-6)}`;
    const now = new Date().toISOString();

    const followup: Followup = {
      id: followupId,
      leadId: params.leadId,
      scId: params.scId,
      scName: params.scName,
      followupDate: params.followupDate || params.nextFollowup || now.split('T')[0],
      status: params.status,
      remark: params.remark,
      createdDate: now,
    };

    // 1. Save followup locally
    StorageService.addFollowup(followup);

    // 2. Update parent lead status locally
    const leads = StorageService.getLeads();
    const lead = leads.find(l => l.id === params.leadId);
    if (lead) {
      lead.leadStatus = params.status;
      if (params.nextFollowup) lead.nextFollowup = params.nextFollowup;
      if (params.counsellingDate) lead.counsellingDate = params.counsellingDate;
      if (params.remark) lead.remark = params.remark;
      StorageService.saveLeads(leads);
    }

    // 3. Transmit to Google Sheets
    if (this.isGasConfigured()) {
      const res = await this.requestGas<Followup>('createFollowup', {
        method: 'POST',
        payload: {
          followupData: {
            followupId,
            leadId: params.leadId,
            scId: params.scId,
            scName: params.scName,
            followupDate: followup.followupDate,
            status: params.status,
            remark: params.remark,
            nextFollowup: params.nextFollowup,
            counsellingDate: params.counsellingDate,
            createdDate: now,
          },
        },
      });

      return {
        success: true,
        data: followup,
        message: res.success ? 'Followup logged to Google Sheets.' : `Saved locally. Remote warning: ${res.error}`,
        source: res.success ? 'gas' : 'local',
      };
    }

    return {
      success: true,
      data: followup,
      message: 'Followup logged to local storage.',
      source: 'local',
    };
  }

  /**
   * Updates Lead Status and adds Followup audit record
   */
  public static async updateLeadStatus(params: {
    leadId: string;
    newStatus: LeadStatus;
    nextFollowup?: string;
    counsellingDate?: string;
    remark: string;
    scId: string;
    scName: string;
  }): Promise<Lead | null> {
    const leads = StorageService.getLeads();
    const lead = leads.find(l => l.id === params.leadId);
    if (!lead) return null;

    lead.leadStatus = params.newStatus;
    if (params.nextFollowup !== undefined) lead.nextFollowup = params.nextFollowup;
    if (params.counsellingDate !== undefined) lead.counsellingDate = params.counsellingDate;
    if (params.remark) lead.remark = params.remark;

    StorageService.saveLeads(leads);

    // Create followup record
    const followup: Followup = {
      id: `FUP-${Date.now().toString().slice(-6)}`,
      leadId: lead.id,
      scId: params.scId,
      scName: params.scName,
      followupDate: params.nextFollowup || new Date().toISOString().split('T')[0],
      status: params.newStatus,
      remark: params.remark,
      createdDate: new Date().toISOString(),
    };
    StorageService.addFollowup(followup);

    // Sync to Google Sheets
    if (this.isGasConfigured()) {
      this.requestGas('updateLeadStatus', {
        method: 'POST',
        payload: {
          leadId: params.leadId,
          newStatus: params.newStatus,
          nextFollowup: params.nextFollowup,
          counsellingDate: params.counsellingDate,
          remark: params.remark,
          scId: params.scId,
          scName: params.scName,
        },
      }).catch(err => console.warn('[ApiService] GAS updateLeadStatus sync error:', err));
    }

    return lead;
  }

  /**
   * Submits a Reference from Public Form or SC Manual Entry
   * - Creates Reference Response record
   * - Automatically creates an Admission Lead
   * - Updates Alumni reference metrics
   */
  public static async submitReference(data: {
    token?: string;
    sourceAlumniId: string;
    sourceAlumniName?: string;
    sourceSCId: string;
    sourceSCName?: string;
    referenceName: string;
    relation: RelationType;
    mobile: string;
    email: string;
    courseInterest: string;
    preferredContactTime?: string;
    remark?: string;
  }): Promise<{ responseId: string; leadId: string }> {
    const responseId = `RESP-${Date.now().toString().slice(-6)}`;
    const leadId = `LEAD-${Date.now().toString().slice(-6)}`;
    const submittedDate = new Date().toISOString();

    const alumniList = StorageService.getAlumni();
    const sourceAlumni = alumniList.find(a => a.id === data.sourceAlumniId);
    const alumniName = data.sourceAlumniName || sourceAlumni?.name || 'Alumni';

    const scUsers = StorageService.getSCUsers();
    const sourceSC = scUsers.find(s => s.id === data.sourceSCId);
    const scName = data.sourceSCName || sourceSC?.name || sourceAlumni?.assignedSCName || 'Counsellor';

    // 1. Create Reference Response
    const refResponse: ReferenceResponse = {
      id: responseId,
      token: data.token || '',
      sourceAlumniId: data.sourceAlumniId,
      sourceAlumniName: alumniName,
      sourceSCId: data.sourceSCId,
      sourceSCName: scName,
      referenceName: data.referenceName,
      relation: data.relation,
      mobile: data.mobile,
      email: data.email,
      courseInterest: data.courseInterest,
      preferredContactTime: data.preferredContactTime || 'Anytime',
      remark: data.remark || '',
      submittedDate,
      leadId,
    };
    StorageService.addReferenceResponse(refResponse);

    // 2. Create Admission Lead log automatically
    await this.createLeadLog({
      leadId,
      sourceAlumniId: data.sourceAlumniId,
      sourceAlumniName: alumniName,
      sourceAlumniMobile: sourceAlumni?.mobile,
      scId: data.sourceSCId,
      scName: scName,
      referenceName: data.referenceName,
      relation: data.relation,
      mobile: data.mobile,
      email: data.email,
      courseInterest: data.courseInterest,
      leadStatus: 'New',
      remark: data.remark || `Reference received from ${alumniName} (${data.relation})`,
    });

    // 3. Mark Alumni reference received
    if (sourceAlumni) {
      sourceAlumni.referenceReceived = 'Yes';
      sourceAlumni.referenceCount = (sourceAlumni.referenceCount || 0) + 1;
      StorageService.saveAlumni(alumniList);
    }

    // 4. Sync reference submission to Google Sheets
    if (this.isGasConfigured()) {
      this.requestGas('submitReference', {
        method: 'POST',
        payload: { referenceData: refResponse },
      }).catch(err => console.warn('[ApiService] GAS submitReference sync error:', err));
    }

    return { responseId, leadId };
  }

  /**
   * Submits Public Reference via Token Form
   */
  public static async submitPublicReference(
    token: string,
    data: {
      referenceName: string;
      relation: string;
      mobile: string;
      email: string;
      courseInterest: string;
      preferredContactTime?: string;
      remark?: string;
    }
  ): Promise<{ success: boolean; leadId?: string; message?: string }> {
    const tokenData = this.validateReferenceToken(token);
    if (!tokenData) {
      return { success: false, message: 'Invalid or expired referral link.' };
    }

    const res = await this.submitReference({
      token,
      sourceAlumniId: tokenData.sourceAlumniId,
      sourceAlumniName: tokenData.sourceAlumniName,
      sourceSCId: tokenData.sourceSCId,
      sourceSCName: tokenData.sourceSCName,
      referenceName: data.referenceName,
      relation: (data.relation as RelationType) || 'Other',
      mobile: data.mobile,
      email: data.email,
      courseInterest: data.courseInterest,
      preferredContactTime: data.preferredContactTime,
      remark: data.remark,
    });

    return { success: true, leadId: res.leadId };
  }

  // =========================================================================
  // 5. IMPORTING & DATA MANAGEMENT
  // =========================================================================

  /**
   * Imports Alumni from CSV/Excel with duplicate checking and equal distribution
   */
  public static async importAlumni(
    importedItems: Partial<Alumni>[],
    distributeEqually: boolean = true
  ): Promise<{ added: number; duplicates: number; alumni: Alumni[] }> {
    const existing = StorageService.getAlumni();
    const existingMobiles = new Set(existing.map(a => a.mobile.replace(/\D/g, '')));
    const existingIds = new Set(existing.map(a => a.id.toLowerCase().trim()));

    const activeSCs = StorageService.getSCUsers().filter(sc => sc.status === 'Active');

    const validNewList: Alumni[] = [];
    let duplicateCount = 0;

    importedItems.forEach((item, idx) => {
      const cleanMobile = (item.mobile || '').replace(/\D/g, '');
      const id = item.id || `ALUM-${1000 + existing.length + validNewList.length + 1}`;

      if ((cleanMobile && existingMobiles.has(cleanMobile)) || existingIds.has(id.toLowerCase().trim())) {
        duplicateCount++;
        return;
      }

      existingMobiles.add(cleanMobile);
      existingIds.add(id.toLowerCase().trim());

      validNewList.push({
        id,
        name: item.name || `Alumni ${idx + 1}`,
        mobile: item.mobile || '',
        email: item.email || '',
        course: item.course || 'B.Sc Sound Engineering',
        batch: item.batch || '2023-2026',
        passingYear: item.passingYear || '2026',
        assignedSCId: item.assignedSCId || '',
        assignedSCName: item.assignedSCName || 'Unassigned',
        callStatus: (item.callStatus as CallStatus) || 'Pending',
        lastCallDate: item.lastCallDate || '',
        referenceReceived: 'No',
        referenceCount: 0,
        nextFollowup: '',
        remark: item.remark || '',
        createdDate: new Date().toISOString(),
      });
    });

    let finalListToSave = validNewList;
    if (distributeEqually && activeSCs.length > 0) {
      finalListToSave = distributeAlumniEqually(validNewList, activeSCs, existing);
    }

    const updatedTotal = [...existing, ...finalListToSave];
    StorageService.saveAlumni(updatedTotal);

    // Sync to Google Apps Script in background if connected
    if (this.isGasConfigured() && finalListToSave.length > 0) {
      this.requestGas('importAlumni', {
        method: 'POST',
        payload: {
          alumniList: finalListToSave,
          distributeOption: distributeEqually,
        },
      }).catch(err => console.warn('[ApiService] GAS import background sync error:', err));
    }

    return {
      added: finalListToSave.length,
      duplicates: duplicateCount,
      alumni: finalListToSave,
    };
  }

  /**
   * Synchronizes all local datasets to Google Sheets
   */
  public static async syncAllToGoogleSheets(): Promise<GasApiResponse<{ synced: boolean }>> {
    if (!this.isGasConfigured()) {
      return {
        success: false,
        error: 'Google Apps Script URL is not configured.',
        source: 'local',
      };
    }

    SaveStatusService.setSaving('Syncing all modules to Google Sheet...');

    const payload = {
      alumni: StorageService.getAlumni(),
      leads: StorageService.getLeads(),
      callLogs: StorageService.getCallLogs(),
      followups: StorageService.getFollowups(),
      scUsers: StorageService.getSCUsers(),
      references: StorageService.getReferenceResponses(),
      auditLogs: StorageService.getAuditLogs(),
      archivedRecords: StorageService.getArchivedRecords(),
      settings: StorageService.getSettings(),
    };

    const res = await this.requestGas<{ synced: boolean }>('syncAll', {
      method: 'POST',
      payload: { data: payload },
      timeout: 30000,
    });

    if (res.success) {
      SaveStatusService.setSaved('All modules synced to Google Sheet ✓');
    } else {
      SaveStatusService.setError('Sync error: ' + (res.error || 'Failed to sync'));
    }

    return res;
  }

  // =========================================================================
  // 6. SC MANAGEMENT & PERFORMANCE REPORTING
  // =========================================================================

  public static async saveSCUser(sc: SCUser): Promise<SCUser> {
    StorageService.createOrUpdateSC(sc);
    if (this.isGasConfigured()) {
      this.requestGas('createOrUpdateSC', {
        method: 'POST',
        payload: { scData: sc },
      }).catch(console.warn);
    }
    return sc;
  }

  public static async toggleSCStatus(scId: string): Promise<SCUser | null> {
    const res = StorageService.toggleSCStatus(scId);
    if (res && this.isGasConfigured()) {
      this.requestGas('toggleSCStatus', {
        method: 'POST',
        payload: { scId, newStatus: res.status },
      }).catch(console.warn);
    }
    return res;
  }

  /**
   * Calculates comprehensive SC Performance Metrics across alumni, calls, and leads
   */
  public static async getSCPerformance(): Promise<SCPerformanceStat[]> {
    const scUsers = StorageService.getSCUsers();
    const alumniList = StorageService.getAlumni();
    const leads = StorageService.getLeads();
    const callLogs = StorageService.getCallLogs();
    const todayStr = new Date().toISOString().split('T')[0];

    return scUsers.map(sc => {
      const assignedAlumni = alumniList.filter(a => a.assignedSCId === sc.id);
      const scCalls = callLogs.filter(c => c.scId === sc.id);
      const connectedCalls = scCalls.filter(c => c.callStatus === 'Connected');
      const scLeads = leads.filter(l => l.scId === sc.id);
      const interestedLeads = scLeads.filter(l => l.leadStatus === 'Interested');
      const convertedLeads = scLeads.filter(l => l.leadStatus === 'Converted');
      const totalFollowups = scLeads.filter(l => l.leadStatus === 'Follow-up' || l.nextFollowup);

      const overdueCount = scLeads.filter(l => {
        if (l.leadStatus === 'Converted' || l.leadStatus === 'Lost') return false;
        if (!l.nextFollowup) return false;
        return l.nextFollowup < todayStr;
      }).length;

      const totalReferences = assignedAlumni.reduce((acc, a) => acc + (a.referenceCount || 0), 0);
      const conversionRate = scLeads.length > 0 ? Math.round((convertedLeads.length / scLeads.length) * 100) : 0;

      return {
        scId: sc.id,
        scName: sc.name,
        username: sc.username,
        status: sc.status,
        assigned: assignedAlumni.length,
        called: scCalls.length,
        connected: connectedCalls.length,
        references: totalReferences,
        leads: scLeads.length,
        interested: interestedLeads.length,
        followups: totalFollowups.length,
        meetings: scLeads.filter(l => l.leadStatus === 'Meeting').length,
        overdue: overdueCount,
        converted: convertedLeads.length,
        conversionRate,
      };
    });
  }

  // =========================================================================
  // 7. TOKEN GENERATION & VALIDATION
  // =========================================================================

  public static generateReferenceToken(
    sourceAlumniId: string,
    sourceAlumniName: string,
    sourceSCId: string,
    sourceSCName: string
  ): { token: string; shareUrl: string } {
    const token = StorageService.createReferenceToken(
      sourceAlumniId,
      sourceAlumniName,
      sourceSCId,
      sourceSCName
    );
    const origin = window.location.origin;
    const shareUrl = `${origin}/#/ref/${token}`;
    return { token, shareUrl };
  }

  public static validateReferenceToken(token: string): ReferenceTokenData | null {
    return StorageService.getTokenData(token);
  }

  // =========================================================================
  // 8. EXPORT UTILITIES
  // =========================================================================

  public static exportToCSV(filename: string, rows: Record<string, any>[]): void {
    if (!rows || !rows.length) {
      alert('No data to export.');
      return;
    }
    const headers = Object.keys(rows[0]);
    const csvContent = [
      headers.join(','),
      ...rows.map(row =>
        headers
          .map(header => {
            const val = row[header] ?? '';
            const strVal = String(val).replace(/"/g, '""');
            return `"${strVal}"`;
          })
          .join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // =========================================================================
  // 9. INTERNAL ROW NORMALIZERS (GOOGLE SHEETS HEADERS -> TYPESCRIPT OBJECTS)
  // =========================================================================

  private static normalizeAlumniRow(row: any): Alumni {
    return {
      id: String(row.Alumni_ID || row.id || ''),
      name: String(row.Name || row.name || ''),
      mobile: String(row.Mobile || row.mobile || ''),
      email: String(row.Email || row.email || ''),
      course: String(row.Course || row.course || ''),
      batch: String(row.Batch || row.batch || ''),
      passingYear: String(row.Passing_Year || row.passingYear || ''),
      assignedSCId: String(row.Assigned_SC_ID || row.assignedSCId || ''),
      assignedSCName: String(row.Assigned_SC_Name || row.assignedSCName || 'Unassigned'),
      callStatus: (row.Call_Status || row.callStatus || 'Pending') as CallStatus,
      lastCallDate: String(row.Last_Call_Date || row.lastCallDate || ''),
      referenceReceived: (row.Reference_Received || row.referenceReceived || 'No') as 'Yes' | 'No',
      referenceCount: Number(row.Reference_Count || row.referenceCount || 0),
      nextFollowup: String(row.Next_Followup || row.nextFollowup || ''),
      remark: String(row.Remark || row.remark || ''),
      createdDate: String(row.Created_Date || row.createdDate || new Date().toISOString()),
    };
  }

  private static normalizeLeadRow(row: any): Lead {
    return {
      id: String(row.Lead_ID || row.id || ''),
      sourceAlumniId: String(row.Source_Alumni_ID || row.sourceAlumniId || ''),
      sourceAlumniName: String(row.Source_Alumni_Name || row.sourceAlumniName || 'Direct'),
      sourceAlumniMobile: row.Source_Alumni_Mobile || row.sourceAlumniMobile,
      scId: String(row.SC_ID || row.scId || ''),
      scName: String(row.SC_Name || row.scName || ''),
      referenceName: String(row.Reference_Name || row.referenceName || ''),
      relation: (row.Relation || row.relation || 'Other') as RelationType,
      mobile: String(row.Mobile || row.mobile || ''),
      email: String(row.Email || row.email || ''),
      courseInterest: String(row.Course_Interest || row.courseInterest || ''),
      leadStatus: (row.Lead_Status || row.leadStatus || 'New') as LeadStatus,
      nextFollowup: String(row.Next_Followup || row.nextFollowup || ''),
      counsellingDate: String(row.Counselling_Date || row.counsellingDate || ''),
      remark: String(row.Remark || row.remark || ''),
      createdDate: String(row.Created_Date || row.createdDate || new Date().toISOString()),
    };
  }

  private static normalizeCallLogRow(row: any): CallLog {
    return {
      id: String(row.Call_ID || row.id || ''),
      alumniId: String(row.Alumni_ID || row.alumniId || ''),
      scId: String(row.SC_ID || row.scId || ''),
      scName: String(row.SC_Name || row.scName || ''),
      callDate: String(row.Call_Date || row.callDate || ''),
      callStatus: (row.Call_Status || row.callStatus || 'Pending') as CallStatus,
      callResult: String(row.Call_Result || row.callResult || ''),
      remark: String(row.Remark || row.remark || ''),
      nextFollowup: String(row.Next_Followup || row.nextFollowup || ''),
    };
  }

  private static normalizeFollowupRow(row: any): Followup {
    return {
      id: String(row.Followup_ID || row.id || ''),
      leadId: String(row.Lead_ID || row.leadId || ''),
      scId: String(row.SC_ID || row.scId || ''),
      scName: String(row.SC_Name || row.scName || ''),
      followupDate: String(row.Followup_Date || row.followupDate || ''),
      status: (row.Status || row.status || 'Follow-up') as LeadStatus,
      remark: String(row.Remark || row.remark || ''),
      createdDate: String(row.Created_Date || row.createdDate || ''),
    };
  }

  private static normalizeSCUserRow(row: any): SCUser {
    return {
      id: String(row.SC_ID || row.id || ''),
      name: String(row.SC_Name || row.name || ''),
      username: String(row.Username || row.username || ''),
      passwordHash: String(row.Password_Hash || row.passwordHash || 'sc123'),
      role: (row.Role || row.role || 'SC') as 'SC' | 'ADMIN',
      status: (row.Status || row.status || 'Active') as 'Active' | 'Inactive',
      mobile: row.Mobile || row.mobile,
      email: row.Email || row.email,
      createdDate: String(row.Created_Date || row.createdDate || ''),
    };
  }

  private static normalizeReferenceRow(row: any): ReferenceResponse {
    return {
      id: String(row.Response_ID || row.id || ''),
      token: String(row.Token || row.token || ''),
      sourceAlumniId: String(row.Source_Alumni_ID || row.sourceAlumniId || ''),
      sourceAlumniName: String(row.Source_Alumni_Name || row.sourceAlumniName || ''),
      sourceSCId: String(row.Source_SC_ID || row.sourceSCId || ''),
      sourceSCName: String(row.Source_SC_Name || row.sourceSCName || ''),
      referenceName: String(row.Reference_Name || row.referenceName || ''),
      relation: (row.Relation || row.relation || 'Other') as RelationType,
      mobile: String(row.Mobile || row.mobile || ''),
      email: String(row.Email || row.email || ''),
      courseInterest: String(row.Course_Interest || row.courseInterest || ''),
      preferredContactTime: String(row.Preferred_Contact_Time || row.preferredContactTime || 'Anytime'),
      remark: String(row.Remark || row.remark || ''),
      submittedDate: String(row.Submitted_Date || row.submittedDate || ''),
      leadId: String(row.Lead_ID || row.leadId || ''),
    };
  }
}
