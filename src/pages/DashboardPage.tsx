import React, { useState, useEffect } from 'react';
import {
  Users,
  PhoneCall,
  Share2,
  Target,
  Clock,
  CheckCircle,
  AlertTriangle,
  Flame,
  ArrowUpRight,
  UserCheck,
  Building2,
  Calendar,
  XCircle,
  BarChart,
  ChevronRight,
  Search,
  Filter,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { StorageService } from '../services/storage';
import { ApiService } from '../services/api';
import { Alumni, Lead, CallLog, SCPerformanceStat } from '../types';

interface DashboardPageProps {
  onNavigateTab: (tab: string, filterParam?: any) => void;
  onOpenCallModal: (alumni: Alumni) => void;
  onOpenLeadModal: (lead: Lead) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigateTab,
  onOpenCallModal,
  onOpenLeadModal,
}) => {
  const { role, user } = useAuth();
  const todayStr = new Date().toISOString().split('T')[0];

  const [alumniList, setAlumniList] = useState<Alumni[]>([]);
  const [leadsList, setLeadsList] = useState<Lead[]>([]);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [scPerformance, setScPerformance] = useState<SCPerformanceStat[]>([]);
  const [loading, setLoading] = useState(true);

  // SC View In-Dashboard Alumni Queue state
  const [scAlumniSearch, setScAlumniSearch] = useState('');
  const [scAlumniFilter, setScAlumniFilter] = useState<'ALL' | 'Pending' | 'Connected' | 'Callback'>('ALL');

  const loadData = async () => {
    setLoading(true);
    const allAlumni = StorageService.getAlumni();
    const allLeads = StorageService.getLeads();
    const allCalls = StorageService.getCallLogs();
    const performance = await ApiService.getSCPerformance();

    setAlumniList(allAlumni);
    setLeadsList(allLeads);
    setCallLogs(allCalls);
    setScPerformance(performance);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [user]);

  // SC specific strict data isolation
  const myAlumni = role === 'SC' ? alumniList.filter((a) => a.assignedSCId === user?.id) : alumniList;
  const myLeads = role === 'SC' ? leadsList.filter((l) => l.scId === user?.id) : leadsList;
  const myCalls = role === 'SC' ? callLogs.filter((c) => c.scId === user?.id) : callLogs;

  // SC specific metrics
  const scConnected = myCalls.filter((c) => c.callStatus === 'Connected').length;
  const scNoAnswer = myCalls.filter((c) => c.callStatus === 'No Answer').length;
  const scCallback = myCalls.filter((c) => c.callStatus === 'Callback').length;
  const scRefReceived = myAlumni.filter((a) => a.referenceReceived === 'Yes').length;
  const scNewLeads = myLeads.filter((l) => l.leadStatus === 'New').length;
  const scInterested = myLeads.filter((l) => l.leadStatus === 'Interested').length;
  const scMeetings = myLeads.filter((l) => l.leadStatus === 'Meeting').length;
  const scConverted = myLeads.filter((l) => l.leadStatus === 'Converted').length;

  const scFollowupsToday = myLeads.filter(
    (l) => l.nextFollowup === todayStr && l.leadStatus !== 'Converted' && l.leadStatus !== 'Lost'
  );

  const scOverdueFollowups = myLeads.filter(
    (l) =>
      l.nextFollowup &&
      l.nextFollowup < todayStr &&
      l.leadStatus !== 'Converted' &&
      l.leadStatus !== 'Lost'
  );

  // Filtered queue of assigned alumni on SC dashboard
  const scDashboardAlumni = myAlumni.filter((a) => {
    if (scAlumniFilter !== 'ALL' && a.callStatus !== scAlumniFilter) {
      return false;
    }
    if (scAlumniSearch) {
      const q = scAlumniSearch.toLowerCase();
      return (
        a.name.toLowerCase().includes(q) ||
        a.mobile.toLowerCase().includes(q) ||
        a.course.toLowerCase().includes(q) ||
        a.batch.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Admin overall counts (system-wide data)
  const adminTotalAlumni = alumniList.length;
  const adminAssigned = alumniList.filter((a) => a.assignedSCId).length;
  const adminUnassigned = adminTotalAlumni - adminAssigned;
  const adminCallsDone = callLogs.length;
  const adminConnected = callLogs.filter((c) => c.callStatus === 'Connected').length;
  const adminNoAnswer = callLogs.filter((c) => c.callStatus === 'No Answer').length;
  const adminReferences = alumniList.reduce((acc, a) => acc + (a.referenceCount || 0), 0);
  const adminLeads = leadsList.length;
  const adminInterested = leadsList.filter((l) => l.leadStatus === 'Interested').length;
  const adminFollowups = leadsList.filter((l) => l.nextFollowup).length;
  const adminOverdue = leadsList.filter(
    (l) =>
      l.nextFollowup &&
      l.nextFollowup < todayStr &&
      l.leadStatus !== 'Converted' &&
      l.leadStatus !== 'Lost'
  ).length;
  const adminMeetings = leadsList.filter((l) => l.leadStatus === 'Meeting').length;
  const adminConverted = leadsList.filter((l) => l.leadStatus === 'Converted').length;
  const adminLost = leadsList.filter((l) => l.leadStatus === 'Lost').length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-500/30 text-indigo-300 border border-indigo-500/40">
              {role === 'ADMIN' ? 'Executive Management' : `Student Counsellor Desk (${user?.id || 'SC'})`}
            </span>
            <span className="text-xs text-slate-400">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </div>
          <h2 className="text-xl font-bold tracking-tight">
            {role === 'ADMIN' ? 'Executive Admissions & Operations Overview' : `Welcome, ${user?.name}`}
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            {role === 'ADMIN'
              ? 'Real-time alumni calling, reference collection pipeline, counsellor workload distribution, and admission conversions across all desks.'
              : `You have ${myAlumni.length} assigned alumni in your portfolio and ${scFollowupsToday.length} lead follow-up(s) scheduled for today.`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {role === 'SC' ? (
            <>
              <button
                onClick={() => onNavigateTab('followups')}
                className="px-3.5 py-2 bg-slate-800/90 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5"
              >
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Check Follow-ups</span>
              </button>
              <button
                onClick={() => onNavigateTab('leads')}
                className="px-3.5 py-2 bg-slate-800/90 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5"
              >
                <Target className="w-4 h-4 text-sky-400" />
                <span>Check Leads</span>
              </button>
              <button
                onClick={() => onNavigateTab('alumni')}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-indigo-600/30 flex items-center gap-1.5"
              >
                <PhoneCall className="w-4 h-4" />
                <span>Start Calling</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => onNavigateTab('sc-management')}
                className="px-3.5 py-2 bg-slate-800/90 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5"
              >
                <UserCheck className="w-4 h-4 text-purple-400" />
                <span>Manage SCs</span>
              </button>
              <button
                onClick={() => onNavigateTab('reports')}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-indigo-600/30 flex items-center gap-1.5"
              >
                <BarChart className="w-4 h-4" />
                <span>View Analytics & Export</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 1. DASHBOARD METRICS & WORKFLOW: SC PERSONAL DESK VIEW    */}
      {/* ========================================================= */}
      {role === 'SC' && (
        <div className="space-y-6">
          {/* SC Metric Tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div
              onClick={() => onNavigateTab('alumni')}
              className="bg-white p-3.5 rounded-xl border border-slate-200 hover:border-indigo-400 shadow-xs cursor-pointer transition-all group"
            >
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                My Total Alumni
              </span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-bold text-slate-900">{myAlumni.length}</span>
                <Users className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">Assigned to you</p>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                Calls Completed
              </span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-bold text-slate-900">{myCalls.length}</span>
                <PhoneCall className="w-4 h-4 text-indigo-500" />
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">{myAlumni.filter((a) => a.callStatus === 'Pending').length} pending</p>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                Connected
              </span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-bold text-emerald-600">{scConnected}</span>
                <CheckCircle className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">Active talks logged</p>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                No Answer / Busy
              </span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-bold text-slate-700">{scNoAnswer}</span>
                <span className="text-[10px] text-slate-400">Ring/busy</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">Need re-try</p>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                Callback
              </span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-bold text-amber-600">{scCallback}</span>
                <Clock className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-[10px] text-amber-700 mt-0.5">Requested call</p>
            </div>

            <div
              onClick={() => onNavigateTab('references')}
              className="bg-white p-3.5 rounded-xl border border-slate-200 hover:border-indigo-400 shadow-xs cursor-pointer transition-all group"
            >
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                References Won
              </span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-bold text-indigo-600">{scRefReceived}</span>
                <Share2 className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
              </div>
              <p className="text-[10px] text-indigo-600 mt-0.5 font-medium">From your alumni</p>
            </div>

            <div
              onClick={() => onNavigateTab('leads')}
              className="bg-white p-3.5 rounded-xl border border-slate-200 hover:border-indigo-400 shadow-xs cursor-pointer transition-all group"
            >
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                My New Leads
              </span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-bold text-blue-600">{scNewLeads}</span>
                <Target className="w-4 h-4 text-blue-500" />
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">Fresh referred leads</p>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                Interested
              </span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-bold text-purple-600">{scInterested}</span>
                <Flame className="w-4 h-4 text-purple-500" />
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">High intent leads</p>
            </div>

            <div
              onClick={() => onNavigateTab('followups')}
              className="bg-white p-3.5 rounded-xl border border-slate-200 hover:border-indigo-400 shadow-xs cursor-pointer transition-all group"
            >
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                Follow-ups Today
              </span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-bold text-indigo-600">
                  {scFollowupsToday.length}
                </span>
                <Calendar className="w-4 h-4 text-indigo-500" />
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">Due today</p>
            </div>

            <div
              onClick={() => onNavigateTab('followups')}
              className="bg-white p-3.5 rounded-xl border border-slate-200 hover:border-rose-300 shadow-xs cursor-pointer transition-all group"
            >
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                Overdue Tasks
              </span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-bold text-rose-600">{scOverdueFollowups.length}</span>
                <AlertTriangle className="w-4 h-4 text-rose-500" />
              </div>
              <p className="text-[10px] text-rose-600 mt-0.5 font-medium">Attention needed</p>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                Meetings / Studio
              </span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-bold text-amber-600">{scMeetings}</span>
                <Building2 className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">Visits scheduled</p>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/40 shadow-xs">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wide">
                Converted
              </span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-extrabold text-emerald-700">{scConverted}</span>
                <CheckCircle className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-[10px] text-emerald-700 mt-0.5 font-semibold">Admissions won</p>
            </div>
          </div>

          {/* SC Action Grid: Overdue & Today's Follow-ups */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Urgent: Overdue Followups */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 bg-rose-50/60 border-b border-rose-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <h3 className="text-xs font-bold text-rose-950 uppercase tracking-wide">
                    Overdue Follow-ups ({scOverdueFollowups.length})
                  </h3>
                </div>
                <button
                  onClick={() => onNavigateTab('followups')}
                  className="text-xs font-semibold text-rose-700 hover:underline"
                >
                  View All &gt;
                </button>
              </div>

              <div className="p-4 divide-y divide-slate-100 max-h-72 overflow-y-auto">
                {scOverdueFollowups.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    <CheckCircle className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
                    No overdue follow-ups. Great job!
                  </div>
                ) : (
                  scOverdueFollowups.map((lead) => (
                    <div
                      key={lead.id}
                      className="py-3 flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800">{lead.referenceName}</span>
                          <span className="text-[10px] text-rose-600 font-semibold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                            Due: {lead.nextFollowup}
                          </span>
                        </div>
                        <p className="text-slate-500 text-[11px] mt-0.5">
                          Course: {lead.courseInterest} • Ref by {lead.sourceAlumniName}
                        </p>
                      </div>
                      <button
                        onClick={() => onOpenLeadModal(lead)}
                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-semibold shrink-0"
                      >
                        Follow up
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Today's Tasks */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 bg-indigo-50/60 border-b border-indigo-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-xs font-bold text-indigo-950 uppercase tracking-wide">
                    Scheduled for Today ({scFollowupsToday.length})
                  </h3>
                </div>
                <button
                  onClick={() => onNavigateTab('followups')}
                  className="text-xs font-semibold text-indigo-700 hover:underline"
                >
                  View All &gt;
                </button>
              </div>

              <div className="p-4 divide-y divide-slate-100 max-h-72 overflow-y-auto">
                {scFollowupsToday.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    No follow-ups specifically scheduled for today.
                  </div>
                ) : (
                  scFollowupsToday.map((lead) => (
                    <div
                      key={lead.id}
                      className="py-3 flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800">{lead.referenceName}</span>
                          <span className="text-[10px] text-indigo-700 font-semibold bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                            {lead.leadStatus}
                          </span>
                        </div>
                        <p className="text-slate-500 text-[11px] mt-0.5">
                          {lead.mobile} • {lead.courseInterest}
                        </p>
                      </div>
                      <button
                        onClick={() => onOpenLeadModal(lead)}
                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-semibold shrink-0"
                      >
                        Open
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Dedicated Section: My Assigned Alumni Calling Queue */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70">
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <PhoneCall className="w-4 h-4 text-indigo-600" />
                  <span>My Assigned Alumni Calling Queue ({myAlumni.length})</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Alumni assigned exclusively to your desk. Call, log responses, and generate new admission references.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onNavigateTab('alumni')}
                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                >
                  <span>Full Alumni Table</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Filter Pills & Search */}
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white">
              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto text-xs">
                <button
                  type="button"
                  onClick={() => setScAlumniFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                    scAlumniFilter === 'ALL'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All ({myAlumni.length})
                </button>
                <button
                  type="button"
                  onClick={() => setScAlumniFilter('Pending')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                    scAlumniFilter === 'Pending'
                      ? 'bg-amber-600 text-white'
                      : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                  }`}
                >
                  Pending ({myAlumni.filter((a) => a.callStatus === 'Pending').length})
                </button>
                <button
                  type="button"
                  onClick={() => setScAlumniFilter('Callback')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                    scAlumniFilter === 'Callback'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100'
                  }`}
                >
                  Callback ({myAlumni.filter((a) => a.callStatus === 'Callback').length})
                </button>
                <button
                  type="button"
                  onClick={() => setScAlumniFilter('Connected')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                    scAlumniFilter === 'Connected'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                  }`}
                >
                  Connected ({myAlumni.filter((a) => a.callStatus === 'Connected').length})
                </button>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search your assigned alumni..."
                  value={scAlumniSearch}
                  onChange={(e) => setScAlumniSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-500 text-slate-800"
                />
              </div>
            </div>

            {/* Queue Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Alumni Name</th>
                    <th className="p-3">Mobile Contact</th>
                    <th className="p-3">Course & Batch</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-center">Reference</th>
                    <th className="p-3">Last Note / Remarks</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {scDashboardAlumni.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-400">
                        No assigned alumni match your criteria.
                      </td>
                    </tr>
                  ) : (
                    scDashboardAlumni.slice(0, 10).map((alumni) => (
                      <tr key={alumni.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-semibold text-slate-800">
                          <div>{alumni.name}</div>
                          <div className="text-[10px] font-mono text-slate-400">{alumni.id}</div>
                        </td>
                        <td className="p-3 text-slate-700 font-mono">{alumni.mobile}</td>
                        <td className="p-3 text-slate-700">
                          <div>{alumni.course}</div>
                          <div className="text-[10px] text-slate-500">Batch {alumni.batch}</div>
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
                            <span className="text-slate-400 italic">No call logged</span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => onOpenCallModal(alumni)}
                            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1.5"
                          >
                            <PhoneCall className="w-3.5 h-3.5" />
                            <span>Call</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {scDashboardAlumni.length > 10 && (
              <div className="p-3 bg-slate-50 border-t border-slate-100 text-center text-xs text-slate-500">
                Showing top 10 of {scDashboardAlumni.length} matching alumni.{' '}
                <button
                  onClick={() => onNavigateTab('alumni')}
                  className="text-indigo-600 font-bold hover:underline"
                >
                  View all in Alumni table &gt;
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. DASHBOARD METRICS: EXECUTIVE / ADMIN FULL VIEW         */}
      {/* ========================================================= */}
      {role === 'ADMIN' && (
        <div className="space-y-6">
          {/* Admin High-Level KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <div
              onClick={() => onNavigateTab('alumni')}
              className="bg-white p-3.5 rounded-xl border border-slate-200 hover:border-indigo-400 shadow-xs cursor-pointer transition-all group"
            >
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                Total Alumni
              </span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-bold text-slate-900">{adminTotalAlumni}</span>
                <Users className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
              </div>
              <div className="text-[10px] text-slate-500 mt-1">
                {adminAssigned} assigned / {adminUnassigned} unassigned
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                Calls Done
              </span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-bold text-slate-900">{adminCallsDone}</span>
                <PhoneCall className="w-4 h-4 text-indigo-500" />
              </div>
              <div className="text-[10px] text-emerald-600 mt-1">{adminConnected} connected</div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                References
              </span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-bold text-indigo-600">{adminReferences}</span>
                <Share2 className="w-4 h-4 text-indigo-500" />
              </div>
              <div className="text-[10px] text-slate-400 mt-1">From alumni calls</div>
            </div>

            <div
              onClick={() => onNavigateTab('leads')}
              className="bg-white p-3.5 rounded-xl border border-slate-200 hover:border-indigo-400 shadow-xs cursor-pointer transition-all group"
            >
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                Admission Leads
              </span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-bold text-blue-600">{adminLeads}</span>
                <Target className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-[10px] text-purple-600 mt-1">{adminInterested} interested</div>
            </div>

            <div
              onClick={() => onNavigateTab('followups')}
              className="bg-white p-3.5 rounded-xl border border-slate-200 hover:border-indigo-400 shadow-xs cursor-pointer transition-all group"
            >
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                Follow-ups
              </span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-bold text-amber-600">{adminFollowups}</span>
                <Clock className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-[10px] text-slate-500 mt-1">{adminMeetings} meetings</div>
            </div>

            <div
              onClick={() => onNavigateTab('followups')}
              className="bg-white p-3.5 rounded-xl border border-slate-200 hover:border-rose-300 shadow-xs cursor-pointer transition-all group"
            >
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                Overdue
              </span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-bold text-rose-600">{adminOverdue}</span>
                <AlertTriangle className="w-4 h-4 text-rose-500" />
              </div>
              <div className="text-[10px] text-rose-500 mt-1">Attention required</div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/40 shadow-xs">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wide">
                Converted
              </span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-extrabold text-emerald-700">{adminConverted}</span>
                <CheckCircle className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-[10px] text-slate-500 mt-1">{adminLost} lost</div>
            </div>
          </div>

          {/* SC-WISE PERFORMANCE TABLE (Clickable rows) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">
                  Student Counsellor (SC) Performance & Distribution
                </h3>
                <p className="text-xs text-slate-500">
                  Equal distribution tracking across active SCs. Click any row to view assigned records.
                </p>
              </div>
              <button
                onClick={() => onNavigateTab('sc-management')}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Manage SCs</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/70 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3">SC Name</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-right">Assigned</th>
                    <th className="p-3 text-right">Called</th>
                    <th className="p-3 text-right">Connected</th>
                    <th className="p-3 text-right">References</th>
                    <th className="p-3 text-right">Leads</th>
                    <th className="p-3 text-right">Interested</th>
                    <th className="p-3 text-right">Follow-ups</th>
                    <th className="p-3 text-right text-rose-600">Overdue</th>
                    <th className="p-3 text-right text-emerald-600 font-bold">Converted</th>
                    <th className="p-3 text-right">Rate %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {scPerformance.map((sc) => (
                    <tr
                      key={sc.scId}
                      onClick={() => onNavigateTab('alumni', { scId: sc.scId })}
                      className="hover:bg-indigo-50/40 cursor-pointer transition-colors group"
                      title="Click to view this SC's alumni"
                    >
                      <td className="p-3 font-semibold text-slate-800 flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-700">
                          {sc.scName.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="group-hover:text-indigo-600">{sc.scName}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            sc.status === 'Active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {sc.status}
                        </span>
                      </td>
                      <td className="p-3 text-right font-bold text-slate-900">{sc.assigned}</td>
                      <td className="p-3 text-right text-slate-700">{sc.called}</td>
                      <td className="p-3 text-right text-emerald-600 font-medium">{sc.connected}</td>
                      <td className="p-3 text-right text-indigo-600 font-bold">{sc.references}</td>
                      <td className="p-3 text-right font-medium text-slate-800">{sc.leads}</td>
                      <td className="p-3 text-right text-purple-600 font-medium">{sc.interested}</td>
                      <td className="p-3 text-right text-slate-700">{sc.followups}</td>
                      <td className="p-3 text-right text-rose-600 font-bold">
                        {sc.overdue > 0 ? (
                          <span className="bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                            {sc.overdue}
                          </span>
                        ) : (
                          '0'
                        )}
                      </td>
                      <td className="p-3 text-right text-emerald-700 font-bold">{sc.converted}</td>
                      <td className="p-3 text-right font-semibold text-slate-700">
                        {sc.conversionRate}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
