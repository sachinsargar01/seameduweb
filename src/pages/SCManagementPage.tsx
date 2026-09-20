import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Edit2,
  CheckCircle2,
  XCircle,
  Shield,
  Phone,
  RefreshCw,
  Sparkles,
  AlertTriangle,
  X,
  PhoneCall,
  Search,
  Download,
  Mail,
  UserCheck,
  Target,
  Share2,
  Clock,
  Award,
  ChevronRight,
  Filter,
  Copy,
  Check,
  Key,
} from 'lucide-react';
import { SCUser, Alumni, Lead, CallLog } from '../types';
import { StorageService } from '../services/storage';
import { ApiService } from '../services/api';
import { distributeAlumniEqually } from '../services/distributor';
import { useAuth } from '../context/AuthContext';

interface SCManagementPageProps {
  onOpenCallModal?: (alumni: Alumni) => void;
}

export const SCManagementPage: React.FC<SCManagementPageProps> = ({ onOpenCallModal }) => {
  const { role, user } = useAuth();
  const [scUsers, setScUsers] = useState<SCUser[]>([]);
  const [alumniList, setAlumniList] = useState<Alumni[]>([]);
  const [leadsList, setLeadsList] = useState<Lead[]>([]);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);

  // Admin Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSC, setEditingSC] = useState<SCUser | null>(null);

  // SC Self-edit Modal state
  const [isSelfEditOpen, setIsSelfEditOpen] = useState(false);
  const [selfName, setSelfName] = useState('');
  const [selfEmail, setSelfEmail] = useState('');
  const [selfMobile, setSelfMobile] = useState('');
  const [selfPassword, setSelfPassword] = useState('');

  // Admin Form state
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [formRole, setFormRole] = useState<'SC' | 'ADMIN'>('SC');
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');
  const [password, setPassword] = useState('');

  // Credentials Share Modal (Main Admin -> SC)
  const [credentialsModalData, setCredentialsModalData] = useState<{
    scName: string;
    username: string;
    password: string;
    scId: string;
  } | null>(null);
  const [copiedCredentials, setCopiedCredentials] = useState(false);

  // SC View filters for their assigned alumni roster
  const [alumniSearchTerm, setAlumniSearchTerm] = useState('');
  const [alumniStatusFilter, setAlumniStatusFilter] = useState<'ALL' | 'Pending' | 'Connected' | 'Callback'>('ALL');

  const loadAllData = () => {
    const users = StorageService.getSCUsers();
    const alumni = StorageService.getAlumni();
    const leads = StorageService.getLeads();
    const calls = StorageService.getCallLogs();

    setScUsers(users);
    setAlumniList(alumni);
    setLeadsList(leads);
    setCallLogs(calls);
  };

  useEffect(() => {
    loadAllData();
  }, [user]);

  // Current logged in SC user record
  const currentSCUser = scUsers.find((s) => s.id === user?.id);

  // Strictly isolated data for logged-in SC
  const myAssignedAlumni = alumniList.filter((a) => a.assignedSCId === user?.id);
  const myLeads = leadsList.filter((l) => l.scId === user?.id);
  const myCalls = callLogs.filter((c) => c.scId === user?.id);

  // Metrics for logged-in SC
  const myTotalAssigned = myAssignedAlumni.length;
  const myCalledAlumni = myAssignedAlumni.filter((a) => a.callStatus !== 'Pending').length;
  const myConnectedCalls = myCalls.filter((c) => c.callStatus === 'Connected').length;
  const myReferencesCount = myAssignedAlumni.filter((a) => a.referenceReceived === 'Yes').length;
  const myLeadsCount = myLeads.length;
  const myConvertedCount = myLeads.filter((l) => l.leadStatus === 'Converted').length;
  const myConversionRate = myLeadsCount > 0 ? Math.round((myConvertedCount / myLeadsCount) * 100) : 0;
  const myCallingProgressPct = myTotalAssigned > 0 ? Math.round((myCalledAlumni / myTotalAssigned) * 100) : 0;

  // Filtered assigned alumni for SC view
  const filteredMyAlumni = myAssignedAlumni.filter((a) => {
    // Status filter
    if (alumniStatusFilter !== 'ALL' && a.callStatus !== alumniStatusFilter) {
      return false;
    }
    // Search query
    if (alumniSearchTerm) {
      const q = alumniSearchTerm.toLowerCase();
      return (
        a.name.toLowerCase().includes(q) ||
        a.mobile.toLowerCase().includes(q) ||
        a.course.toLowerCase().includes(q) ||
        a.batch.toLowerCase().includes(q) ||
        a.id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Open SC Self Profile edit
  const openSelfEditModal = () => {
    if (!currentSCUser) return;
    setSelfName(currentSCUser.name);
    setSelfEmail(currentSCUser.email || '');
    setSelfMobile(currentSCUser.mobile || '');
    setSelfPassword('');
    setIsSelfEditOpen(true);
  };

  const handleSaveSelfProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSCUser) return;
    if (!selfName.trim()) {
      alert('Please enter your name.');
      return;
    }

    const updates: Partial<SCUser> = {
      name: selfName.trim(),
      email: selfEmail.trim(),
      mobile: selfMobile.trim(),
    };
    if (selfPassword.trim()) {
      updates.passwordHash = 'hashed_' + selfPassword.trim();
    }

    StorageService.updateSCUser(currentSCUser.id, updates);
    setIsSelfEditOpen(false);
    loadAllData();
    alert('Your desk profile has been updated successfully.');
  };

  // ADMIN HANDLERS
  const openCreateModal = () => {
    setEditingSC(null);
    setName('');
    setUsername('');
    setEmail('');
    setMobile('');
    setFormRole('SC');
    setStatus('Active');
    setPassword('seamedu123');
    setIsModalOpen(true);
  };

  const openEditModal = (sc: SCUser) => {
    setEditingSC(sc);
    setName(sc.name);
    setUsername(sc.username);
    setEmail(sc.email || '');
    setMobile(sc.mobile || '');
    setFormRole(sc.role);
    setStatus(sc.status);
    setPassword('••••••••');
    setIsModalOpen(true);
  };

  const handleAdminSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !username.trim()) {
      alert('Please fill in name and username.');
      return;
    }

    const cleanPass = password.trim() || 'seamedu123';

    if (editingSC) {
      const updates: Partial<SCUser> = {
        name: name.trim(),
        username: username.trim(),
        email: email.trim(),
        mobile: mobile.trim(),
        role: formRole,
        status,
      };
      if (password && password !== '••••••••') {
        updates.passwordHash = cleanPass;
      }
      StorageService.updateSCUser(editingSC.id, updates);
      setIsModalOpen(false);
      loadAllData();

      if (password && password !== '••••••••') {
        setCredentialsModalData({
          scName: name.trim(),
          username: username.trim(),
          password: cleanPass,
          scId: editingSC.id,
        });
      }
    } else {
      const newSC = StorageService.addSCUser({
        name: name.trim(),
        username: username.trim(),
        email: email.trim() || `${username.toLowerCase()}@seamedu.edu`,
        mobile: mobile.trim(),
        role: formRole,
        status,
        passwordHash: cleanPass,
      });

      setIsModalOpen(false);
      loadAllData();

      // Immediately present the credentials modal so Main Admin can provide to SC
      setCredentialsModalData({
        scName: newSC.name,
        username: newSC.username,
        password: cleanPass,
        scId: newSC.id,
      });
    }
  };

  const handleToggleStatus = (sc: SCUser) => {
    const newStatus = sc.status === 'Active' ? 'Inactive' : 'Active';
    const confirm = window.confirm(
      `Are you sure you want to set ${sc.name} to ${newStatus}?` +
        (newStatus === 'Inactive'
          ? '\nNote: Inactive SCs will be excluded from new alumni auto-distributions.'
          : '')
    );
    if (!confirm) return;

    StorageService.updateSCUser(sc.id, { status: newStatus });
    loadAllData();
  };

  const handleRedistributeAll = () => {
    const active = scUsers.filter((s) => s.status === 'Active' && s.role === 'SC');
    if (active.length === 0) {
      alert('No active SC users available for distribution.');
      return;
    }

    const allAlumni = StorageService.getAlumni();
    const confirm = window.confirm(
      `Redistribute all ${allAlumni.length} alumni strictly equally among the ${active.length} active SCs?\n(Anjali, Shweta, etc.)\nDifference between SC workloads will not exceed 1.`
    );
    if (!confirm) return;

    const distributed = distributeAlumniEqually(allAlumni, active);
    StorageService.saveAlumni(distributed);
    loadAllData();
    alert(`Successfully distributed ${allAlumni.length} alumni equally across ${active.length} active SCs!`);
  };

  // Export helper for SC assigned alumni
  const handleExportMyAlumni = () => {
    ApiService.exportToCSV(`SEAMEDU_Assigned_Alumni_${user?.id || 'SC'}`, myAssignedAlumni);
  };

  // Export helper for Admin
  const handleExportAllSCs = () => {
    ApiService.exportToCSV('SEAMEDU_SC_Team_Roster', scUsers);
  };

  // ==========================================
  // 1. STUDENT COUNSELLOR (SC) PERSONAL VIEW
  // ==========================================
  if (role === 'SC') {
    return (
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* SC Top Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                Personal Counsellor Desk
              </span>
              <span className="text-xs text-slate-400 font-mono">{user?.id}</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              My Counsellor Desk & Assigned Portfolio
            </h2>
            <p className="text-xs text-slate-500">
              Overview of your registered profile, calling metrics, and exclusive list of {myTotalAssigned} assigned alumni.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportMyAlumni}
              className="px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export My Alumni CSV</span>
            </button>
            <button
              onClick={openSelfEditModal}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Update My Profile</span>
            </button>
          </div>
        </div>

        {/* SC Profile Identity Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xl shadow-md shadow-indigo-600/20 shrink-0">
              {user?.name ? user.name.slice(0, 2).toUpperCase() : 'SC'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">{user?.name}</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {currentSCUser?.status || 'Active'} Desk
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-1">
                <span>
                  ID: <b className="font-mono text-indigo-600">{user?.id}</b>
                </span>
                <span>•</span>
                <span>
                  Username: <b className="font-mono text-slate-700">{user?.username}</b>
                </span>
                <span>•</span>
                <span>
                  Email: <span className="text-slate-700">{currentSCUser?.email || `${user?.username}@seamedu.edu`}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs flex items-center gap-4 shrink-0">
            <div>
              <span className="text-slate-500 text-[11px] block">Desk Calling Coverage</span>
              <span className="font-bold text-slate-800 text-sm">
                {myCalledAlumni} / {myTotalAssigned} ({myCallingProgressPct}%)
              </span>
            </div>
            <div className="w-20 bg-slate-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all"
                style={{ width: `${myCallingProgressPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* SC Personal Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
              My Total Assigned
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-bold text-slate-900">{myTotalAssigned}</span>
              <Users className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Alumni in portfolio</p>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
              Calls Completed
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-bold text-slate-900">{myCalledAlumni}</span>
              <PhoneCall className="w-4 h-4 text-indigo-500" />
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">{myTotalAssigned - myCalledAlumni} pending</p>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
              Connected Calls
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-bold text-emerald-600">{myConnectedCalls}</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Active talks logged</p>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
              References Won
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-bold text-indigo-600">{myReferencesCount}</span>
              <Share2 className="w-4 h-4 text-indigo-500" />
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">From alumni calls</p>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
              Active Leads
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-bold text-blue-600">{myLeadsCount}</span>
              <Target className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">In follow-up funnel</p>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/40 shadow-xs">
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wide">
              Converted Admissions
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-extrabold text-emerald-700">{myConvertedCount}</span>
              <Award className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-[10px] text-emerald-700 mt-0.5 font-semibold">{myConversionRate}% conversion rate</p>
          </div>
        </div>

        {/* SC Assigned Alumni Roster */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden space-y-3 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                <span>My Assigned Alumni Calling Roster ({myAssignedAlumni.length})</span>
              </h3>
              <p className="text-xs text-slate-500">
                Alumni assigned exclusively to your desk. Call, collect referrals, and track conversion status.
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
              <button
                type="button"
                onClick={() => setAlumniStatusFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                  alumniStatusFilter === 'ALL'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All ({myAssignedAlumni.length})
              </button>
              <button
                type="button"
                onClick={() => setAlumniStatusFilter('Pending')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                  alumniStatusFilter === 'Pending'
                    ? 'bg-amber-600 text-white'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                }`}
              >
                Pending Call ({myAssignedAlumni.filter((a) => a.callStatus === 'Pending').length})
              </button>
              <button
                type="button"
                onClick={() => setAlumniStatusFilter('Connected')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                  alumniStatusFilter === 'Connected'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                }`}
              >
                Connected ({myAssignedAlumni.filter((a) => a.callStatus === 'Connected').length})
              </button>
              <button
                type="button"
                onClick={() => setAlumniStatusFilter('Callback')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                  alumniStatusFilter === 'Callback'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100'
                }`}
              >
                Callback ({myAssignedAlumni.filter((a) => a.callStatus === 'Callback').length})
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative max-w-md">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search by alumni name, mobile, course, batch..."
              value={alumniSearchTerm}
              onChange={(e) => setAlumniSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-500 text-slate-800"
            />
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-lg border border-slate-100">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3">Alumni Name</th>
                  <th className="p-3">Mobile & Contact</th>
                  <th className="p-3">Course & Batch</th>
                  <th className="p-3 text-center">Call Status</th>
                  <th className="p-3 text-center">Reference</th>
                  <th className="p-3">Last Remarks / Note</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMyAlumni.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      <Users className="w-7 h-7 text-slate-300 mx-auto mb-1" />
                      <p className="font-semibold text-slate-600">No alumni match this filter.</p>
                      <p className="text-[11px]">Adjust your search query or status filter above.</p>
                    </td>
                  </tr>
                ) : (
                  filteredMyAlumni.map((alumni) => (
                    <tr key={alumni.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3">
                        <div className="font-bold text-slate-900">{alumni.name}</div>
                        <div className="text-[10px] font-mono text-slate-400">{alumni.id}</div>
                      </td>
                      <td className="p-3">
                        <div className="font-medium text-slate-800">{alumni.mobile}</div>
                        <div className="text-[10px] text-slate-400">{alumni.email || 'No email'}</div>
                      </td>
                      <td className="p-3">
                        <div className="font-medium text-slate-800">{alumni.course}</div>
                        <div className="text-[10px] text-slate-500">
                          Batch {alumni.batch} ({alumni.passingYear})
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            alumni.callStatus === 'Connected'
                              ? 'bg-emerald-100 text-emerald-800'
                              : alumni.callStatus === 'Callback'
                              ? 'bg-amber-100 text-amber-800'
                              : alumni.callStatus === 'No Answer'
                              ? 'bg-slate-200 text-slate-700'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}
                        >
                          {alumni.callStatus || 'Pending'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {alumni.referenceReceived === 'Yes' ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                            Yes ({alumni.referenceCount || 1})
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>
                      <td className="p-3 max-w-xs truncate text-slate-600 text-[11px]">
                        {alumni.remark || (
                          <span className="text-slate-400 italic">No call logged yet</span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        {onOpenCallModal ? (
                          <button
                            type="button"
                            onClick={() => onOpenCallModal(alumni)}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1.5"
                          >
                            <PhoneCall className="w-3.5 h-3.5" />
                            <span>Call</span>
                          </button>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Assigned</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal: SC Self Profile Edit */}
        {isSelfEditOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
              <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-indigo-400" />
                  <h3 className="font-bold text-sm">Update My Counsellor Profile</h3>
                </div>
                <button
                  onClick={() => setIsSelfEditOpen(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveSelfProfile} className="p-6 space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wide mb-1">
                    Display Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={selfName}
                    onChange={(e) => setSelfName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wide mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={selfEmail}
                    onChange={(e) => setSelfEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wide mb-1">
                    Contact Mobile
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g., +91 9876543210"
                    value={selfMobile}
                    onChange={(e) => setSelfMobile(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wide mb-1">
                    Change Password (Leave blank to keep current)
                  </label>
                  <input
                    type="password"
                    placeholder="New password"
                    value={selfPassword}
                    onChange={(e) => setSelfPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsSelfEditOpen(false)}
                    className="px-4 py-2 text-slate-600 hover:text-slate-900"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-xs transition-colors"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // 2. ADMINISTRATOR / MANAGEMENT FULL VIEW
  // ==========================================
  const activeSCs = scUsers.filter((s) => s.status === 'Active' && s.role === 'SC');
  const totalAssignedTeam = alumniList.filter((a) => a.assignedSCId).length;
  const avgPerSC = activeSCs.length > 0 ? Math.round(totalAssignedTeam / activeSCs.length) : 0;
  const totalLeadsTeam = leadsList.length;
  const totalConvertedTeam = leadsList.filter((l) => l.leadStatus === 'Converted').length;
  const orgConversionRate = totalLeadsTeam > 0 ? Math.round((totalConvertedTeam / totalLeadsTeam) * 100) : 0;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-700 border border-purple-500/20">
              Executive Administration
            </span>
            <span className="text-xs text-slate-400">Full System & Counsellor Roster Access</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Student Counsellor (SC) & Team Management
          </h2>
          <p className="text-xs text-slate-500">
            Create, edit, and deactivate counsellor accounts. Manage active equal distribution rosters and monitor team performance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportAllSCs}
            className="px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export Team CSV</span>
          </button>

          <button
            onClick={handleRedistributeAll}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs"
            title="Re-balance all alumni evenly among active SCs"
          >
            <RefreshCw className="w-3.5 h-3.5 text-indigo-300" />
            <span>Redistribute All Alumni Equally</span>
          </button>

          <button
            onClick={openCreateModal}
            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Create New SC User</span>
          </button>
        </div>
      </div>

      {/* Admin System-Wide KPI Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
            Total Counsellors
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold text-slate-900">{scUsers.length}</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-[10px] text-emerald-600 mt-0.5 font-medium">{activeSCs.length} active in distribution</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
            Assigned Alumni
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold text-indigo-600">{totalAssignedTeam}</span>
            <UserCheck className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Across all counsellors</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
            Average per SC
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold text-slate-900">{avgPerSC}</span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Balanced equal workload</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
            Total Leads
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold text-blue-600">{totalLeadsTeam}</span>
            <Target className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Referred candidates</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/40 shadow-xs">
          <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wide">
            Organization Conversions
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-extrabold text-emerald-700">{totalConvertedTeam}</span>
            <Award className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-[10px] text-emerald-700 mt-0.5 font-semibold">{orgConversionRate}% overall rate</p>
        </div>
      </div>

      {/* Roster Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-900">All Registered Counsellors & Administrative Accounts</h3>
            <p className="text-xs text-slate-500">
              Manage accounts, reset credentials, or toggle active distribution status.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3">SC ID</th>
                <th className="p-3">Name & Email</th>
                <th className="p-3">Username</th>
                <th className="p-3">Role</th>
                <th className="p-3 text-center">Distribution Status</th>
                <th className="p-3 text-right">Assigned Alumni</th>
                <th className="p-3 text-right">Leads</th>
                <th className="p-3 text-right text-emerald-600 font-bold">Conversions</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {scUsers.map((sc) => {
                const assignedCount = alumniList.filter((a) => a.assignedSCId === sc.id).length;
                const scLeads = leadsList.filter((l) => l.scId === sc.id);
                const convertedCount = scLeads.filter((l) => l.leadStatus === 'Converted').length;

                return (
                  <tr key={sc.id} className="hover:bg-slate-50">
                    <td className="p-3 font-mono font-semibold text-indigo-600">{sc.id}</td>

                    <td className="p-3">
                      <div className="font-bold text-slate-900 flex items-center gap-2">
                        <span>{sc.name}</span>
                        {sc.id === user?.id && (
                          <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-bold">
                            You
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400">{sc.email || 'No email set'}</div>
                    </td>

                    <td className="p-3 font-mono text-slate-700">{sc.username}</td>

                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          sc.role === 'ADMIN'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-indigo-100 text-indigo-800'
                        }`}
                      >
                        {sc.role}
                      </span>
                    </td>

                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(sc)}
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-colors inline-flex items-center gap-1 ${
                          sc.status === 'Active'
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                        }`}
                        title="Click to toggle status"
                      >
                        {sc.status === 'Active' ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <XCircle className="w-3 h-3 text-slate-500" />
                        )}
                        <span>{sc.status}</span>
                      </button>
                    </td>

                    <td className="p-3 text-right font-bold text-slate-900">{assignedCount}</td>
                    <td className="p-3 text-right font-medium text-slate-700">{scLeads.length}</td>
                    <td className="p-3 text-right font-extrabold text-emerald-700">
                      {convertedCount}
                    </td>

                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setCredentialsModalData({
                              scName: sc.name,
                              username: sc.username,
                              password: sc.passwordHash || 'sc123',
                              scId: sc.id,
                            });
                            setCopiedCredentials(false);
                          }}
                          className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-xs font-semibold border border-indigo-200 transition-colors inline-flex items-center gap-1"
                          title="View / Provide login credentials to SC"
                        >
                          <Key className="w-3 h-3 text-indigo-500" />
                          <span>Credentials</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(sc)}
                          className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 rounded text-xs font-semibold border border-slate-200 transition-colors inline-flex items-center gap-1"
                        >
                          <Edit2 className="w-3 h-3 text-slate-400" />
                          <span>Edit</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal for Create/Edit SC User (Admin Only) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-sm">
                  {editingSC ? `Edit User: ${editingSC.name}` : 'Create New Counsellor / User'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdminSave} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wide mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Anjali Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wide mb-1">
                    Username *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., anjali"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wide mb-1">
                    Role
                  </label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-semibold focus:outline-none focus:border-indigo-500"
                  >
                    <option value="SC">Student Counsellor (SC)</option>
                    <option value="ADMIN">Admin / Management</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wide mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="e.g., anjali@seamedu.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wide mb-1">
                    Mobile
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g., +91 9876543210"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wide mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-semibold focus:outline-none focus:border-indigo-500"
                >
                  <option value="Active">Active (Receives alumni distributions)</option>
                  <option value="Inactive">Inactive (Excluded from distributions)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wide mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-xs transition-colors"
                >
                  {editingSC ? 'Update User' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREDENTIALS SHARE MODAL (Main Admin -> Student Counsellor) */}
      {credentialsModalData && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200">
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Provide Credentials to Counsellor</h3>
                  <p className="text-[11px] text-slate-300">SC Desk Login Information</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCredentialsModalData(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl text-xs text-indigo-950 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                  <span>Account Ready for Counsellor</span>
                </p>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  Provide these login credentials to <b>{credentialsModalData.scName}</b>. The counsellor can now visit the SEAMEDU Admissions Portal and sign in directly to their personal desk.
                </p>
              </div>

              {/* Credentials Highlight Card */}
              <div className="bg-slate-900 rounded-xl p-4 text-white space-y-2.5 font-mono text-xs border border-slate-800">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-slate-400 text-[11px]">Counsellor</span>
                  <span className="font-bold text-slate-200">{credentialsModalData.scName} ({credentialsModalData.scId})</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-slate-400 text-[11px]">Username</span>
                  <span className="font-bold text-indigo-300 bg-slate-800 px-2 py-0.5 rounded">{credentialsModalData.username}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-[11px]">Password</span>
                  <span className="font-bold text-emerald-400 bg-slate-800 px-2 py-0.5 rounded">{credentialsModalData.password}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const text = `SEAMEDU Admissions Portal - Counsellor Credentials\nName: ${credentialsModalData.scName} (${credentialsModalData.scId})\nUsername: ${credentialsModalData.username}\nPassword: ${credentialsModalData.password}\nPortal Link: ${window.location.origin}/#/login`;
                    navigator.clipboard.writeText(text);
                    setCopiedCredentials(true);
                    setTimeout(() => setCopiedCredentials(false), 2500);
                  }}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs ${
                    copiedCredentials
                      ? 'bg-emerald-600 text-white'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  }`}
                >
                  {copiedCredentials ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Copied to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy Credentials to Share</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setCredentialsModalData(null)}
                  className="w-full sm:w-auto py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
