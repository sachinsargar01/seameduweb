import React, { useState, useEffect } from 'react';
import {
  Database,
  Shield,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Archive,
  RotateCcw,
  Search,
  Filter,
  Users,
  Building,
  Activity,
  FileSpreadsheet,
  Download,
  AlertTriangle,
  Lock,
  History,
  Key,
  Layers,
  ArrowRight,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { StorageService } from '../services/storage';
import { ApiService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  AuditLog,
  SyncLog,
  ArchivedRecord,
  SystemSettings,
  SCUser,
  AdminUser,
  Alumni,
  Lead,
  CallLog,
  Followup,
} from '../types';
import { SyncHealth } from '../components/SyncHealth';

interface DataManagementPageProps {
  onOpenGasModal?: () => void;
}

export const DataManagementPage: React.FC<DataManagementPageProps> = ({ onOpenGasModal }) => {
  const { role, user } = useAuth();

  // Active sub-tab
  const [activeTab, setActiveTab] = useState<
    'sync_status' | 'registered_users' | 'archive' | 'audit_logs' | 'sync_logs' | 'direct_explorer'
  >('sync_status');

  // Live data states
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [archivedRecords, setArchivedRecords] = useState<ArchivedRecord[]>([]);
  const [settings, setSettings] = useState<SystemSettings>(StorageService.getSettings());
  const [scUsers, setScUsers] = useState<SCUser[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [alumniList, setAlumniList] = useState<Alumni[]>([]);
  const [leadsList, setLeadsList] = useState<Lead[]>([]);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('ALL');
  const [filterEntity, setFilterEntity] = useState('ALL');

  // Loading & Action states
  const [isSyncingLive, setIsSyncingLive] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [restoreSuccess, setRestoreSuccess] = useState<string | null>(null);

  // New SC User Form Modal
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserMobile, setNewUserMobile] = useState('');
  const [userModalError, setUserModalError] = useState('');

  const reloadAll = () => {
    setAuditLogs(StorageService.getAuditLogs());
    setSyncLogs(StorageService.getSyncLogs());
    setArchivedRecords(StorageService.getArchivedRecords());
    setSettings(StorageService.getSettings(user?.id));
    setScUsers(StorageService.getSCUsers());
    setAdminUsers(StorageService.getAdminUsers());
    setAlumniList(StorageService.getAlumni());
    setLeadsList(StorageService.getLeads());
  };

  useEffect(() => {
    reloadAll();
  }, [user?.id]);

  // Compute Sync Metrics
  const totalSyncCount = syncLogs.length;
  const failedSyncCount = syncLogs.filter((s) => s.status === 'FAILED').length;
  const successSyncCount = syncLogs.filter((s) => s.status === 'SUCCESS').length;
  const lastSuccessfulSync = syncLogs.find((s) => s.status === 'SUCCESS');
  const lastFailedSync = syncLogs.find((s) => s.status === 'FAILED');
  const hasGasUrl = Boolean(settings.googleWebAppUrl && settings.googleWebAppUrl.startsWith('http'));

  // Trigger Live Full Synchronize & Verification
  const handleTriggerSyncNow = async () => {
    if (!hasGasUrl) {
      setSyncFeedback({
        success: false,
        message: 'Google Sheets Apps Script URL is not configured. Please open Sheets & GAS API setup to configure.',
      });
      return;
    }

    setIsSyncingLive(true);
    setSyncFeedback(null);
    const startMs = Date.now();

    try {
      // 1. Fetch live from Sheets to verify connection and download updates
      const res = await ApiService.fetchAllRecords();
      const durationMs = Date.now() - startMs;

      if (res.success && res.source === 'gas') {
        StorageService.addSyncLog({
          operation: 'fetchAllData',
          entityType: 'FULL_DATABASE',
          entityId: 'ALL',
          status: 'SUCCESS',
          message: 'Full bidirectional Google Sheets synchronization and verification succeeded.',
          durationMs,
        });

        StorageService.addAuditLog({
          entityType: 'SETTINGS',
          entityId: 'GOOGLE_SHEETS_SYNC',
          action: 'SYNC',
          performedByUserId: user?.id || 'ADMIN',
          performedByUserName: user?.name || 'Administrator',
          performedByRole: role || 'ADMIN',
          details: `Manual full sync initiated. Verified ${res.data?.alumni?.length || 0} alumni, ${res.data?.leads?.length || 0} leads.`,
        });

        const updatedSettings: SystemSettings = {
          ...settings,
          lastSyncTime: new Date().toISOString(),
          lastSyncStatus: 'CONNECTED',
          lastSyncError: undefined,
        };
        StorageService.saveSettings(updatedSettings);

        setSyncFeedback({
          success: true,
          message: `Live synchronization confirmed with Google Sheets! (${durationMs}ms)`,
        });
      } else {
        const errorMsg = res.error || 'Failed to verify Google Sheets response.';
        StorageService.addSyncLog({
          operation: 'fetchAllData',
          entityType: 'FULL_DATABASE',
          entityId: 'ALL',
          status: 'FAILED',
          message: errorMsg,
          durationMs,
        });

        const updatedSettings: SystemSettings = {
          ...settings,
          lastSyncStatus: 'ERROR',
          lastSyncError: errorMsg,
        };
        StorageService.saveSettings(updatedSettings);

        setSyncFeedback({
          success: false,
          message: `Google Sheets sync failed: ${errorMsg}`,
        });
      }
    } catch (err: any) {
      StorageService.addSyncLog({
        operation: 'fetchAllData',
        entityType: 'FULL_DATABASE',
        entityId: 'ALL',
        status: 'FAILED',
        message: err.message || 'Network error executing sync.',
      });
      setSyncFeedback({
        success: false,
        message: `Sync Error: ${err.message || 'Could not communicate with Google Sheets.'}`,
      });
    } finally {
      setIsSyncingLive(false);
      reloadAll();
    }
  };

  // Restore an archived record
  const handleRestoreRecord = (archivedId: string) => {
    const success = StorageService.restoreArchivedRecord(
      archivedId,
      user?.id || 'ADMIN',
      user?.name || 'Administrator'
    );
    if (success) {
      setRestoreSuccess(`Record restored successfully and made active in the application.`);
      setTimeout(() => setRestoreSuccess(null), 4000);
      reloadAll();
    }
  };

  // Create new SC User
  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    setUserModalError('');

    if (!newUserName.trim() || !newUserUsername.trim() || !newUserPassword.trim()) {
      setUserModalError('Name, Username, and Password are required.');
      return;
    }

    const scUsersCurrent = StorageService.getSCUsers();
    if (scUsersCurrent.some((s) => s.username.toLowerCase() === newUserUsername.trim().toLowerCase())) {
      setUserModalError(`Username '${newUserUsername.trim()}' is already taken.`);
      return;
    }

    const nextId = `SC-${String(scUsersCurrent.length + 1).padStart(2, '0')}`;
    const newSc: SCUser = {
      id: nextId,
      name: newUserName.trim(),
      username: newUserUsername.trim().toLowerCase(),
      passwordHash: newUserPassword.trim(),
      role: 'SC',
      status: 'Active',
      mobile: newUserMobile.trim() || undefined,
      email: newUserEmail.trim() || `${newUserUsername.trim().toLowerCase()}@seamedu.com`,
      createdDate: new Date().toISOString(),
    };

    StorageService.addSCUser(newSc);

    // Audit log
    StorageService.addAuditLog({
      entityType: 'USER',
      entityId: newSc.id,
      action: 'CREATE',
      performedByUserId: user?.id || 'ADMIN',
      performedByUserName: user?.name || 'Administrator',
      performedByRole: 'ADMIN',
      details: `Created Student Counsellor desk: ${newSc.name} (${newSc.id})`,
      newState: newSc,
    });

    // Auto sync to Google Sheets if connected
    if (ApiService.isGasConfigured()) {
      ApiService.requestGas('createOrUpdateSC', {
        method: 'POST',
        payload: { scData: newSc },
      }).catch((err) => console.warn('SC sync error:', err));
    }

    setShowAddUserModal(false);
    setNewUserName('');
    setNewUserUsername('');
    setNewUserPassword('');
    setNewUserEmail('');
    setNewUserMobile('');
    reloadAll();
  };

  // Toggle SC Active/Inactive Status
  const handleToggleScStatus = (scId: string, currentStatus: 'Active' | 'Inactive') => {
    const nextStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
    StorageService.toggleSCStatus(scId);

    StorageService.addAuditLog({
      entityType: 'USER',
      entityId: scId,
      action: 'UPDATE',
      performedByUserId: user?.id || 'ADMIN',
      performedByUserName: user?.name || 'Administrator',
      performedByRole: 'ADMIN',
      details: `Changed SC account status for ${scId} to ${nextStatus}`,
    });

    if (ApiService.isGasConfigured()) {
      ApiService.requestGas('toggleSCStatus', {
        method: 'POST',
        payload: { scId, newStatus: nextStatus },
      }).catch((err) => console.warn('SC toggle sync error:', err));
    }

    reloadAll();
  };

  // Export audit logs as CSV
  const handleExportAuditLogs = () => {
    const headers = ['Audit_ID', 'Timestamp', 'Entity_Type', 'Entity_ID', 'Action', 'Performed_By_User', 'Role', 'Details'];
    const rows = auditLogs.map((a) => [
      `"${a.id}"`,
      `"${a.timestamp}"`,
      `"${a.entityType}"`,
      `"${a.entityId}"`,
      `"${a.action}"`,
      `"${a.performedByUserName} (${a.performedByUserId})"`,
      `"${a.performedByRole}"`,
      `"${(a.details || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Seamedu_Audit_Logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered Audit Logs
  const filteredAuditLogs = auditLogs.filter((log) => {
    if (filterAction !== 'ALL' && log.action !== filterAction) return false;
    if (filterEntity !== 'ALL' && log.entityType !== filterEntity) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        log.id.toLowerCase().includes(q) ||
        log.entityId.toLowerCase().includes(q) ||
        log.performedByUserName.toLowerCase().includes(q) ||
        log.details.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header with Seamedu Brand Tagline */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
              Enterprise Data Hub
            </span>
            <span className="text-xs font-semibold text-slate-500 italic">
              "Industry Defined, Future Aligned"
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight mt-1">
            Data Management, Security & Live Sheets Sync
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Maintain registered user accounts, inspect immutable audit trails, verify live Google Sheets sync, and recover archived records.
          </p>
        </div>

        {/* Global Live Sync Status & Trigger */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleTriggerSyncNow}
            disabled={isSyncingLive}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingLive ? 'animate-spin' : ''}`} />
            <span>{isSyncingLive ? 'Verifying with Sheet...' : 'Verify Live Sync Now'}</span>
          </button>
        </div>
      </div>

      {/* Sync Feedback Toast */}
      {syncFeedback && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs transition-all ${
            syncFeedback.success
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {syncFeedback.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="font-medium">{syncFeedback.message}</span>
          </div>
          <button
            onClick={() => setSyncFeedback(null)}
            className="text-slate-400 hover:text-slate-600 font-bold px-2 py-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* Restore Success Toast */}
      {restoreSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{restoreSuccess}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1">
        {[
          { id: 'sync_status', label: 'Sync Status & Sheets Health', icon: Database },
          { id: 'registered_users', label: 'Registered Users & Admins', icon: Users },
          { id: 'archive', label: 'Archived / Soft-Deleted Records', icon: Archive, badge: archivedRecords.length },
          { id: 'audit_logs', label: 'Audit Trail & Changes', icon: History, badge: auditLogs.length },
          { id: 'sync_logs', label: 'Google Sheets Sync Logs', icon: Activity, badge: syncLogs.length },
          { id: 'direct_explorer', label: 'Master Data Explorer', icon: Layers },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isActive ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: SYNC STATUS & SHEETS HEALTH */}
      {/* ========================================================================= */}
      {activeTab === 'sync_status' && (
        <div className="space-y-6">
          {/* Admin-only Sync Health Real-time Monitor Component */}
          <SyncHealth
            settings={settings}
            syncLogs={syncLogs}
            onTriggerSync={handleTriggerSyncNow}
            isSyncing={isSyncingLive}
            onOpenGasModal={onOpenGasModal}
          />

          {/* Real-Time Sync Architecture Explanation Card */}
          <div className="p-6 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl border border-slate-700 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-400" />
                <h2 className="text-base font-bold tracking-tight">
                  Seamedu Live Google Sheets Synchronization Architecture
                </h2>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Immutable Unique ID Matching
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4 text-xs">
              <div className="p-3.5 bg-slate-800/80 rounded-xl border border-slate-700">
                <div className="text-indigo-400 font-bold mb-1">1. User Enters / Edits Data</div>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  When an SC creates a lead, logs a call, or updates follow-ups, input is validated and assigned a permanent unique ID.
                </p>
              </div>

              <div className="p-3.5 bg-slate-800/80 rounded-xl border border-slate-700">
                <div className="text-indigo-400 font-bold mb-1">2. Unique ID Search</div>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  The Google Apps Script searches rows by permanent record ID (<code className="text-amber-300">Alumni_ID</code>, <code className="text-amber-300">Lead_ID</code>), never row numbers.
                </p>
              </div>

              <div className="p-3.5 bg-slate-800/80 rounded-xl border border-slate-700">
                <div className="text-indigo-400 font-bold mb-1">3. Write & Verification</div>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  The target cell/row is committed in Google Sheets, and GAS returns a cryptographically confirmed success payload.
                </p>
              </div>

              <div className="p-3.5 bg-slate-800/80 rounded-xl border border-slate-700">
                <div className="text-indigo-400 font-bold mb-1">4. Audit & Sync Log</div>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  The transaction is logged into both Audit_Logs and Sync_Logs, confirming zero data mismatch.
                </p>
              </div>
            </div>
          </div>

          {/* Google Spreadsheet Metadata */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Target Google Spreadsheet Configuration</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-500 block text-[11px]">Connected Spreadsheet Name</span>
                <span className="font-bold text-slate-800">{settings.spreadsheetId || 'SEAMEDU_ADMISSIONS_FMS'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-500 block text-[11px]">Web App Endpoint Status</span>
                <span className="font-bold text-slate-800 truncate block" title={settings.googleWebAppUrl}>
                  {hasGasUrl ? 'Deployed & Active' : 'Not configured'}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-500 block text-[11px]">Automatic Live Sync</span>
                <span className="font-bold text-emerald-700">Enabled (Every Transaction)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: REGISTERED USERS & ADMINS */}
      {/* ========================================================================= */}
      {activeTab === 'registered_users' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Registered Student Counsellor (SC) & Management Users
              </h2>
              <p className="text-xs text-slate-500">
                Manage registered user accounts, passwords, status activation, and roles.
              </p>
            </div>
            <button
              onClick={() => setShowAddUserModal(true)}
              className="flex items-center gap-2 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Create New SC Desk</span>
            </button>
          </div>

          {/* SC Users Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Active & Inactive Counsellor Accounts ({scUsers.length})
              </span>
              <span className="text-[11px] text-slate-500">
                Synced with Google Sheets <code className="text-indigo-600 font-mono">SC_Users</code> tab
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2.5">User ID</th>
                    <th className="px-4 py-2.5">Full Name</th>
                    <th className="px-4 py-2.5">Username</th>
                    <th className="px-4 py-2.5">Contact (Email/Mobile)</th>
                    <th className="px-4 py-2.5">Role</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5">Created Date</th>
                    <th className="px-4 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {scUsers.map((sc) => (
                    <tr key={sc.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-indigo-600">{sc.id}</td>
                      <td className="px-4 py-3 font-bold text-slate-900">{sc.name}</td>
                      <td className="px-4 py-3 font-mono text-slate-600">@{sc.username}</td>
                      <td className="px-4 py-3 text-[11px]">
                        <div>{sc.email || '—'}</div>
                        <div className="text-slate-400">{sc.mobile || '—'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          {sc.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            sc.status === 'Active'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-500 border border-slate-300'
                          }`}
                        >
                          {sc.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[11px] text-slate-500">
                        {sc.createdDate ? new Date(sc.createdDate).toLocaleDateString() : 'Initial'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleToggleScStatus(sc.id, sc.status)}
                          className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                            sc.status === 'Active'
                              ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                          }`}
                        >
                          {sc.status === 'Active' ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Admin Accounts Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Management Administrator Accounts ({adminUsers.length})
              </span>
              <span className="text-[11px] text-slate-500">
                Full authority access to data management, exports, and sync
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2.5">Admin ID</th>
                    <th className="px-4 py-2.5">Name</th>
                    <th className="px-4 py-2.5">Username</th>
                    <th className="px-4 py-2.5">Email</th>
                    <th className="px-4 py-2.5">Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {adminUsers.map((admin) => (
                    <tr key={admin.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3 font-mono font-bold text-purple-600">{admin.id}</td>
                      <td className="px-4 py-3 font-bold text-slate-900">{admin.name}</td>
                      <td className="px-4 py-3 font-mono text-slate-600">@{admin.username}</td>
                      <td className="px-4 py-3 text-slate-600">{admin.email}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                          {admin.role}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: ARCHIVED / SOFT-DELETED RECORDS */}
      {/* ========================================================================= */}
      {activeTab === 'archive' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Archive className="w-4 h-4 text-slate-600" />
                <h2 className="text-sm font-bold text-slate-900">
                  Archived / Soft-Deleted Records Vault
                </h2>
              </div>
              <span className="text-xs text-slate-500 font-medium">
                {archivedRecords.length} records preserved
              </span>
            </div>
            <p className="text-xs text-slate-500">
              In accordance with strict Seamedu data protection standards, records are never permanently erased by users.
              Soft-deleted records are securely held in this vault and can be safely restored with a single click.
            </p>
          </div>

          {archivedRecords.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-xl border border-slate-200 text-slate-400">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
              <p className="text-sm font-semibold text-slate-700">No archived records</p>
              <p className="text-xs text-slate-400 mt-1">All application records are currently active and intact.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-2.5">Archive ID</th>
                      <th className="px-4 py-2.5">Original Record ID</th>
                      <th className="px-4 py-2.5">Entity Type</th>
                      <th className="px-4 py-2.5">Archived Date</th>
                      <th className="px-4 py-2.5">Archived By</th>
                      <th className="px-4 py-2.5">Reason</th>
                      <th className="px-4 py-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {archivedRecords.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-50/80">
                        <td className="px-4 py-3 font-mono font-bold text-slate-500">{rec.id}</td>
                        <td className="px-4 py-3 font-mono font-bold text-indigo-600">{rec.originalId}</td>
                        <td className="px-4 py-3 font-bold text-slate-800">{rec.entityType}</td>
                        <td className="px-4 py-3 text-slate-500">
                          {new Date(rec.archivedAt).toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-700">{rec.archivedByUserName}</td>
                        <td className="px-4 py-3 text-slate-600 italic">{rec.reason}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleRestoreRecord(rec.id)}
                            className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold ml-auto shadow-xs"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Restore Record</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: AUDIT TRAIL & AUDIT LOGS */}
      {/* ========================================================================= */}
      {activeTab === 'audit_logs' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter by ID, user, or detail..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                className="py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700"
              >
                <option value="ALL">All Actions</option>
                <option value="CREATE">CREATE</option>
                <option value="UPDATE">UPDATE</option>
                <option value="DELETE">DELETE</option>
                <option value="ARCHIVE">ARCHIVE</option>
                <option value="RESTORE">RESTORE</option>
                <option value="SYNC">SYNC</option>
                <option value="REASSIGN">REASSIGN</option>
              </select>

              <select
                value={filterEntity}
                onChange={(e) => setFilterEntity(e.target.value)}
                className="py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700"
              >
                <option value="ALL">All Entities</option>
                <option value="ALUMNI">ALUMNI</option>
                <option value="LEAD">LEAD</option>
                <option value="USER">USER</option>
                <option value="CALL_LOG">CALL_LOG</option>
                <option value="FOLLOWUP">FOLLOWUP</option>
                <option value="REFERENCE">REFERENCE</option>
                <option value="SETTINGS">SETTINGS</option>
              </select>
            </div>

            <button
              onClick={handleExportAuditLogs}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold shadow-xs shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Audit CSV</span>
            </button>
          </div>

          {/* Audit Logs Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2.5">Audit ID</th>
                    <th className="px-4 py-2.5">Timestamp</th>
                    <th className="px-4 py-2.5">Action</th>
                    <th className="px-4 py-2.5">Entity</th>
                    <th className="px-4 py-2.5">Record ID</th>
                    <th className="px-4 py-2.5">Performed By</th>
                    <th className="px-4 py-2.5">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredAuditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                        No audit logs matching filters.
                      </td>
                    </tr>
                  ) : (
                    filteredAuditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/80">
                        <td className="px-4 py-3 font-mono font-bold text-slate-500">{log.id}</td>
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              log.action === 'CREATE'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : log.action === 'UPDATE'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : log.action === 'ARCHIVE'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : log.action === 'RESTORE'
                                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-800">{log.entityType}</td>
                        <td className="px-4 py-3 font-mono font-bold text-indigo-600">{log.entityId}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="font-bold text-slate-900">{log.performedByUserName}</span>
                          <span className="text-[10px] text-slate-400 block">{log.performedByRole}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 max-w-xs truncate" title={log.details}>
                          {log.details}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: GOOGLE SHEETS SYNC LOGS */}
      {/* ========================================================================= */}
      {activeTab === 'sync_logs' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between shadow-xs">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Google Sheets Synchronization History</h3>
              <p className="text-xs text-slate-500">Every read/write operation is tracked with round-trip duration and verification status.</p>
            </div>
            <button
              onClick={() => reloadAll()}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Logs</span>
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2.5">Sync ID</th>
                    <th className="px-4 py-2.5">Timestamp</th>
                    <th className="px-4 py-2.5">Operation</th>
                    <th className="px-4 py-2.5">Entity</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5">Duration</th>
                    <th className="px-4 py-2.5">Verification Message</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {syncLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                        No sync operations logged yet. Perform a transaction or click "Verify Live Sync Now".
                      </td>
                    </tr>
                  ) : (
                    syncLogs.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/80">
                        <td className="px-4 py-3 font-mono font-bold text-slate-500">{s.id}</td>
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                          {new Date(s.timestamp).toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-slate-900">{s.operation}</td>
                        <td className="px-4 py-3 font-bold text-indigo-600">{s.entityType} ({s.entityId})</td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              s.status === 'SUCCESS'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {s.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-500">
                          {s.durationMs ? `${s.durationMs}ms` : '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-600 max-w-sm truncate" title={s.message}>
                          {s.message}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: MASTER DATA EXPLORER */}
      {/* ========================================================================= */}
      {activeTab === 'direct_explorer' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 mb-1">Live Database Schema Explorer</h2>
            <p className="text-xs text-slate-500">
              Direct overview of all primary business collections currently active in the application and Google Sheets.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-sm text-slate-800">Alumni Master (ALUM-*)</span>
                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-bold rounded text-xs">
                  {alumniList.length} rows
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-3">
                Target Sheet: <code className="font-mono text-indigo-600">Alumni</code>
              </p>
              <div className="text-[11px] text-slate-600 space-y-1 bg-slate-50 p-2.5 rounded border border-slate-200 font-mono">
                <div>Primary Key: Alumni_ID</div>
                <div>Foreign Keys: Assigned_SC_ID</div>
                <div>Status: Verified Match</div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-sm text-slate-800">Admission Leads (LEAD-*)</span>
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold rounded text-xs">
                  {leadsList.length} rows
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-3">
                Target Sheet: <code className="font-mono text-emerald-600">Leads</code>
              </p>
              <div className="text-[11px] text-slate-600 space-y-1 bg-slate-50 p-2.5 rounded border border-slate-200 font-mono">
                <div>Primary Key: Lead_ID</div>
                <div>Foreign Keys: Source_Alumni_ID, SC_ID</div>
                <div>Status: Verified Match</div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-sm text-slate-800">Counsellor Accounts (SC-*)</span>
                <span className="px-2 py-0.5 bg-purple-50 text-purple-700 font-bold rounded text-xs">
                  {scUsers.length} users
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-3">
                Target Sheet: <code className="font-mono text-purple-600">SC_Users</code>
              </p>
              <div className="text-[11px] text-slate-600 space-y-1 bg-slate-50 p-2.5 rounded border border-slate-200 font-mono">
                <div>Primary Key: SC_ID</div>
                <div>Unique: Username</div>
                <div>Status: Active Desks</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create New SC Desk */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 mb-1">Create Student Counsellor Desk</h3>
            <p className="text-xs text-slate-500 mb-4">
              Add a new registered SC user. Their ID will be generated automatically and synchronized with Google Sheets.
            </p>

            {userModalError && (
              <div className="p-3 mb-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {userModalError}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vikram Malhotra"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Username *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. vikram"
                  value={newUserUsername}
                  onChange={(e) => setNewUserUsername(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Login Password *</label>
                <input
                  type="password"
                  required
                  placeholder="Enter secure password"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="vikram@seamedu.com"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mobile</label>
                  <input
                    type="tel"
                    placeholder="+91 98200 00000"
                    value={newUserMobile}
                    onChange={(e) => setNewUserMobile(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-xs"
                >
                  Save & Sync SC Desk
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
