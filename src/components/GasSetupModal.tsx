import React, { useState } from 'react';
import {
  X,
  Database,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Code2,
  FileSpreadsheet,
} from 'lucide-react';
import { StorageService } from '../services/storage';
import { ApiService } from '../services/api';
import { GOOGLE_APPS_SCRIPT_CODE } from '../services/gasBackendCode';

interface GasSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
}

export const GasSetupModal: React.FC<GasSetupModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const currentSettings = StorageService.getSettings();
  const [gasUrl, setGasUrl] = useState(currentSettings.googleWebAppUrl || '');
  const [spreadsheetId, setSpreadsheetId] = useState(
    currentSettings.spreadsheetId || 'SEAMEDU_ADMISSIONS_FMS'
  );
  const isCurrentlyConnected = Boolean(currentSettings.googleWebAppUrl && currentSettings.lastSyncStatus !== 'DISCONNECTED');
  const [copiedCode, setCopiedCode] = useState(false);
  const [testResult, setTestResult] = useState<{
    tested: boolean;
    success: boolean;
    message: string;
  } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [activeTab, setActiveTab] = useState<'config' | 'code' | 'schema'>('config');

  if (!isOpen) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleTestConnection = async () => {
    if (!gasUrl.trim()) {
      setTestResult({
        tested: true,
        success: false,
        message: 'Please enter a valid Google Apps Script Web App URL first.',
      });
      return;
    }
    setIsTesting(true);
    const res = await ApiService.testGasConnection(gasUrl.trim());
    setTestResult({
      tested: true,
      success: res.success,
      message: res.message,
    });
    setIsTesting(false);
  };

  const handleConnectAndSave = async () => {
    if (!gasUrl.trim()) {
      alert('Please enter a valid Google Apps Script Web App URL.');
      return;
    }

    setIsConnecting(true);
    try {
      const res = await ApiService.connectAndInitializeSheet(gasUrl.trim(), spreadsheetId.trim());
      if (res.success) {
        if (onSave) onSave();
        setTestResult({
          tested: true,
          success: true,
          message: res.message,
        });
        onClose();
      } else {
        setTestResult({
          tested: true,
          success: false,
          message: res.message,
        });
      }
    } catch (err: any) {
      setTestResult({
        tested: true,
        success: false,
        message: err.message || 'Failed to connect.',
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (window.confirm('Are you sure you want to disconnect this Google Sheet? The application will return to disconnected state until you reconnect.')) {
      setIsDisconnecting(true);
      try {
        await ApiService.disconnectGoogleSheet();
        setGasUrl('');
        setTestResult(null);
        if (onSave) onSave();
        onClose();
      } catch (err) {
        console.error(err);
      } finally {
        setIsDisconnecting(false);
      }
    }
  };

  const tabsSchema = [
    {
      tab: 'Alumni',
      cols: 'Alumni_ID, Name, Mobile, Email, Course, Batch, Passing_Year, Assigned_SC_ID, Assigned_SC_Name, Call_Status, Last_Call_Date, Reference_Received, Reference_Count, Next_Followup, Remark, Created_Date',
    },
    {
      tab: 'SC_Users',
      cols: 'SC_ID, SC_Name, Username, Password_Hash, Role, Status, Created_Date',
    },
    {
      tab: 'Leads',
      cols: 'Lead_ID, Source_Alumni_ID, Source_Alumni_Name, SC_ID, SC_Name, Reference_Name, Relation, Mobile, Email, Course_Interest, Lead_Status, Next_Followup, Counselling_Date, Created_Date, Remark',
    },
    {
      tab: 'Call_Logs',
      cols: 'Call_ID, Alumni_ID, SC_ID, Call_Date, Call_Status, Call_Result, Remark, Next_Followup',
    },
    {
      tab: 'Followups',
      cols: 'Followup_ID, Lead_ID, SC_ID, Followup_Date, Status, Remark, Created_Date',
    },
    {
      tab: 'Reference_Responses',
      cols: 'Response_ID, Token, Source_Alumni_ID, Source_SC_ID, Reference_Name, Relation, Mobile, Email, Course_Interest, Preferred_Contact_Time, Remark, Submitted_Date, Lead_ID',
    },
    {
      tab: 'Audit_Logs',
      cols: 'Log_ID, Timestamp, Entity_Type, Entity_ID, Action, Performed_By_Role, Performed_By_User_ID, Performed_By_User_Name, Details',
    },
    {
      tab: 'Archived_Records',
      cols: 'Archive_ID, Original_ID, Entity_Type, Name_Identifier, Archived_At, Archived_By_User, Archived_By_Role, Reason, Snapshot_JSON',
    },
    {
      tab: 'Settings',
      cols: 'Key, Value, Updated_Date',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold">
              <Database className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                Google Sheets & Apps Script Backend Integration
              </h3>
              <p className="text-xs text-slate-400">
                Primary business database: Google Spreadsheet (SEAMEDU_ADMISSIONS_FMS)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab navigation */}
        <div className="flex border-b border-slate-200 px-6 bg-slate-50">
          <button
            onClick={() => setActiveTab('config')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'config'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            1. Web App URL & Connection
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'code'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>2. Google Apps Script Code (Code.gs)</span>
          </button>
          <button
            onClick={() => setActiveTab('schema')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'schema'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>3. 7 Sheets Schema Reference</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {activeTab === 'config' && (
            <div className="space-y-5 text-xs">
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
                <div className="flex items-center gap-2 font-bold text-emerald-950">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Secure Architecture: Zero Credentials in Frontend</span>
                </div>
                <p className="text-emerald-900 leading-relaxed">
                  The frontend never communicates directly with private Google Sheet credentials.
                  Instead, calls route through your deployed Google Apps Script Web App acting as the
                  secure backend API router.
                </p>
              </div>

              {/* Setup Steps */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-800 uppercase tracking-wide">
                  Quick 3-Step Setup Instructions:
                </h4>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-600 pl-1">
                  <li>
                    Create a new Google Spreadsheet named <b>SEAMEDU_ADMISSIONS_FMS</b> in Google Drive.
                  </li>
                  <li>
                    Open <b>Extensions &gt; Apps Script</b>, paste the code from tab <b>2 (Code.gs)</b>, and click Save.
                  </li>
                  <li>
                    Click <b>Deploy &gt; New deployment</b>, select type <b>Web app</b>, set "Who has access" to{' '}
                    <b>Anyone</b>, deploy, and copy the Web App URL below.
                  </li>
                </ol>
              </div>

              {/* Form Inputs */}
              <div className="space-y-3 pt-2">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wide mb-1">
                    Google Apps Script Web App URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://script.google.com/macros/s/.../exec"
                    value={gasUrl}
                    onChange={(e) => setGasUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Format: https://script.google.com/macros/s/AKfycb.../exec
                  </p>
                </div>

                {/* Connection Status & Mode Banner */}
                <div className="p-3 rounded-lg border flex items-center justify-between text-xs bg-slate-50 border-slate-200">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        isCurrentlyConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                      }`}
                    />
                    <span className="font-semibold text-slate-800">
                      {isCurrentlyConnected
                        ? 'Persistent Connection Active'
                        : 'Currently Disconnected'}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {isCurrentlyConnected
                        ? '(Maintained automatically across all refreshes until manually disconnected)'
                        : '(Connect once to auto-create all 9 tabs and sync data)'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wide mb-1">
                    Target Spreadsheet Name
                  </label>
                  <input
                    type="text"
                    value={spreadsheetId}
                    onChange={(e) => setSpreadsheetId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Test Connection Button & Indicator */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTesting}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-semibold flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                  <span>{isTesting ? 'Testing...' : 'Test Connection'}</span>
                </button>

                {testResult && (
                  <div
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium ${
                      testResult.success
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600" />
                    )}
                    <span>{testResult.message}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'code' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs text-slate-800">
                    Production Google Apps Script Backend (Code.gs)
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Copy and paste into your Apps Script editor. It handles all 7 sheets, APIs, and token authentication.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  {copiedCode ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-300" />
                      <span>Copied to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Full Code.gs</span>
                    </>
                  )}
                </button>
              </div>

              <div className="relative">
                <pre className="p-4 bg-slate-950 text-slate-200 rounded-lg text-[11px] font-mono overflow-x-auto max-h-96 leading-relaxed border border-slate-800 selection:bg-indigo-500">
                  {GOOGLE_APPS_SCRIPT_CODE}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'schema' && (
            <div className="space-y-4 text-xs">
              <div>
                <h4 className="font-bold text-slate-800">7 Required Google Sheets Tabs & Column Schemas</h4>
                <p className="text-[11px] text-slate-500">
                  These sheets are initialized automatically by the script on first run or can be verified here:
                </p>
              </div>

              <div className="space-y-2.5">
                {tabsSchema.map((t, idx) => (
                  <div key={t.tab} className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">
                        {idx + 1}. Tab: <span className="font-mono text-indigo-600">{t.tab}</span>
                      </span>
                    </div>
                    <p className="font-mono text-[10px] text-slate-600 bg-white p-2 rounded border border-slate-200 break-all">
                      {t.cols}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Close
            </button>

            {activeTab === 'config' && isCurrentlyConnected && (
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                className="px-3.5 py-2 text-xs font-semibold text-rose-700 hover:text-rose-900 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors disabled:opacity-50"
                title="Disconnect this Google Sheet"
              >
                {isDisconnecting ? 'Disconnecting...' : 'Disconnect Sheet'}
              </button>
            )}
          </div>

          {activeTab === 'config' && (
            <button
              type="button"
              onClick={handleConnectAndSave}
              disabled={isConnecting}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-indigo-600/20 flex items-center gap-2 disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isConnecting ? 'animate-spin' : ''}`} />
              <span>
                {isConnecting
                  ? 'Connecting & Initializing 9 Tabs...'
                  : isCurrentlyConnected
                  ? 'Update & Re-sync Sheets'
                  : 'Connect & Initialize Sheet'}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
