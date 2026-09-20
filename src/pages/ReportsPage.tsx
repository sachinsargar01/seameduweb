import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Download,
  Filter,
  Users,
  Target,
  Share2,
  Calendar,
  CheckCircle2,
  TrendingUp,
  FileSpreadsheet,
  Layers,
  Sparkles,
  PhoneCall,
  Award,
} from 'lucide-react';
import { StorageService } from '../services/storage';
import { ApiService } from '../services/api';
import { SCPerformanceStat } from '../types';
import { useAuth } from '../context/AuthContext';

export const ReportsPage: React.FC = () => {
  const { role, user } = useAuth();
  const [performance, setPerformance] = useState<SCPerformanceStat[]>([]);
  const [loading, setLoading] = useState(true);

  // Raw data from storage
  const rawAlumni = StorageService.getAlumni();
  const rawLeads = StorageService.getLeads();
  const rawCalls = StorageService.getCallLogs();
  const rawRefs = StorageService.getReferenceResponses();

  // Strict role isolation: SC sees ONLY their data, Admin sees all
  const alumniList =
    role === 'SC' ? rawAlumni.filter((a) => a.assignedSCId === user?.id) : rawAlumni;
  const leadsList = role === 'SC' ? rawLeads.filter((l) => l.scId === user?.id) : rawLeads;
  const callsList = role === 'SC' ? rawCalls.filter((c) => c.scId === user?.id) : rawCalls;
  const refsList =
    role === 'SC' ? rawRefs.filter((r) => r.sourceSCId === user?.id) : rawRefs;

  useEffect(() => {
    const fetchPerf = async () => {
      const data = await ApiService.getSCPerformance();
      setPerformance(data);
      setLoading(false);
    };
    fetchPerf();
  }, [user]);

  // Sliced performance
  const displayPerformance =
    role === 'SC' ? performance.filter((p) => p.scId === user?.id) : performance;

  // Funnel calculations based on role-isolated data
  const totalAlumni = alumniList.length;
  const calledAlumni = alumniList.filter((a) => a.callStatus !== 'Pending').length;
  const connectedCalls = callsList.filter((c) => c.callStatus === 'Connected').length;
  const referencesCollected = refsList.length;
  const leadsCreated = leadsList.length;
  const contactedLeads = leadsList.filter((l) => l.leadStatus !== 'New').length;
  const interestedLeads = leadsList.filter(
    (l) =>
      l.leadStatus === 'Interested' ||
      l.leadStatus === 'Follow-up' ||
      l.leadStatus === 'Meeting' ||
      l.leadStatus === 'Converted'
  ).length;
  const followupsActive = leadsList.filter(
    (l) => l.leadStatus === 'Follow-up' || l.leadStatus === 'Meeting' || l.leadStatus === 'Converted'
  ).length;
  const meetingsScheduled = leadsList.filter(
    (l) => l.leadStatus === 'Meeting' || l.leadStatus === 'Converted'
  ).length;
  const convertedAdmissions = leadsList.filter((l) => l.leadStatus === 'Converted').length;

  const funnelSteps = [
    { label: 'Assigned Alumni', count: totalAlumni, color: 'bg-slate-800' },
    { label: 'Called', count: calledAlumni, color: 'bg-indigo-900' },
    { label: 'Connected', count: connectedCalls, color: 'bg-indigo-700' },
    { label: 'Reference Collected', count: referencesCollected, color: 'bg-indigo-600' },
    { label: 'Lead Created', count: leadsCreated, color: 'bg-blue-600' },
    { label: 'Contacted', count: contactedLeads, color: 'bg-sky-600' },
    { label: 'Interested', count: interestedLeads, color: 'bg-purple-600' },
    { label: 'Follow-up Active', count: followupsActive, color: 'bg-amber-600' },
    { label: 'Meeting / Studio', count: meetingsScheduled, color: 'bg-orange-600' },
    { label: 'Converted (Admission)', count: convertedAdmissions, color: 'bg-emerald-600' },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            {role === 'ADMIN'
              ? 'Executive Conversion Funnel & Team Analytics'
              : 'My Personal Performance & Conversion Funnel'}
          </h2>
          <p className="text-xs text-slate-500">
            {role === 'ADMIN'
              ? 'Organization-wide pipeline: Alumni Calling → Reference Collection → Lead Follow-ups → Final Admissions'
              : `Performance metrics for ${user?.name} (${user?.id}) — tracking your calls, referrals, and admissions`}
          </p>
        </div>
      </div>

      {/* 1. VISUAL CONVERSION FUNNEL */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              <span>
                {role === 'ADMIN' ? 'Full Conversion Pipeline Funnel' : 'My Personal Conversion Funnel'}
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              Progression drop-off from initial contact to completed admission
            </p>
          </div>
        </div>

        {/* Funnel Visual Bars */}
        <div className="space-y-3 pt-2">
          {funnelSteps.map((step, idx) => {
            const pct = totalAlumni > 0 ? Math.round((step.count / totalAlumni) * 100) : 0;
            return (
              <div key={step.label} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-500 text-[10px] flex items-center justify-center font-bold">
                      {idx + 1}
                    </span>
                    {step.label}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-900 font-mono">{step.count}</span>
                    <span className="text-[11px] text-slate-400 w-10 text-right">{pct}%</span>
                  </div>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`${step.color} h-2.5 rounded-full transition-all duration-500`}
                    style={{ width: `${Math.max(pct, step.count > 0 ? 3 : 0)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. INSTANT CSV EXPORTS (Admin Only) */}
      {role === 'ADMIN' && (
        <div className="bg-slate-900 rounded-xl p-6 text-white shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Download className="w-4 h-4 text-indigo-400" />
                <span>Full Organization MIS Data Exports</span>
              </h3>
              <p className="text-xs text-slate-400">
                Clean CSV files ready for audit and management review
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <button
              onClick={() =>
                ApiService.exportToCSV('SEAMEDU_All_Alumni_Master', alumniList)
              }
              className="p-3.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-left border border-slate-700 hover:border-indigo-500 transition-all group"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-white group-hover:text-indigo-400">
                  Alumni Calling Master
                </span>
                <FileSpreadsheet className="w-4 h-4 text-slate-400" />
              </div>
              <p className="text-[11px] text-slate-400">
                {alumniList.length} records • Call status, remarks, follow-ups
              </p>
            </button>

            <button
              onClick={() =>
                ApiService.exportToCSV('SEAMEDU_All_Admission_Leads', leadsList)
              }
              className="p-3.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-left border border-slate-700 hover:border-indigo-500 transition-all group"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-white group-hover:text-blue-400">
                  Admission Leads Pipeline
                </span>
                <FileSpreadsheet className="w-4 h-4 text-slate-400" />
              </div>
              <p className="text-[11px] text-slate-400">
                {leadsList.length} leads • Follow-ups & conversion status
              </p>
            </button>

            <button
              onClick={() =>
                ApiService.exportToCSV('SEAMEDU_All_Reference_Responses', refsList)
              }
              className="p-3.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-left border border-slate-700 hover:border-indigo-500 transition-all group"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-white group-hover:text-purple-400">
                  Reference Responses
                </span>
                <FileSpreadsheet className="w-4 h-4 text-slate-400" />
              </div>
              <p className="text-[11px] text-slate-400">
                {refsList.length} references • Public forms & direct entries
              </p>
            </button>

            <button
              onClick={() => ApiService.exportToCSV('SEAMEDU_SC_Performance_Summary', performance)}
              className="p-3.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-left border border-slate-700 hover:border-indigo-500 transition-all group sm:col-span-2 lg:col-span-3"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-white group-hover:text-emerald-400">
                  SC Team Workload & Multi-Counsellor Comparison (Admin Only)
                </span>
                <FileSpreadsheet className="w-4 h-4 text-slate-400" />
              </div>
              <p className="text-[11px] text-slate-400">
                {performance.length} counsellors • Distribution, calls, leads & conversion rate %
              </p>
            </button>
          </div>
        </div>
      )}

      {/* 3. PERFORMANCE SCORECARD (Strictly Role-Gated) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
              <Award className="w-4 h-4 text-indigo-600" />
              <span>
                {role === 'ADMIN'
                  ? 'All Student Counsellor (SC) Scorecards & Multi-SC Rankings'
                  : 'My Counsellor Scorecard & Efficiency'}
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              {role === 'ADMIN'
                ? 'Comprehensive overview of all active student counsellors'
                : `Showing performance metrics for ${user?.name}`}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                {role === 'ADMIN' && <th className="p-3">Rank</th>}
                <th className="p-3">Counsellor</th>
                <th className="p-3 text-right">Assigned Alumni</th>
                <th className="p-3 text-right">Calls Made</th>
                <th className="p-3 text-right">References</th>
                <th className="p-3 text-right">Active Leads</th>
                <th className="p-3 text-right">Meetings</th>
                <th className="p-3 text-right text-emerald-600 font-bold">Admissions Converted</th>
                <th className="p-3 text-right font-bold">Conversion Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayPerformance
                .sort((a, b) => b.converted - a.converted)
                .map((sc, idx) => (
                  <tr key={sc.scId} className="hover:bg-slate-50">
                    {role === 'ADMIN' && (
                      <td className="p-3 font-bold text-slate-400 font-mono">#{idx + 1}</td>
                    )}
                    <td className="p-3 font-semibold text-slate-800 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-700">
                        {sc.scName.slice(0, 2).toUpperCase()}
                      </div>
                      <span>{sc.scName}</span>
                    </td>
                    <td className="p-3 text-right font-bold text-slate-900">{sc.assigned}</td>
                    <td className="p-3 text-right text-slate-700">{sc.called}</td>
                    <td className="p-3 text-right text-indigo-600 font-bold">{sc.references}</td>
                    <td className="p-3 text-right text-slate-700">{sc.leads}</td>
                    <td className="p-3 text-right text-slate-700">{sc.meetings}</td>
                    <td className="p-3 text-right font-extrabold text-emerald-600">
                      {sc.converted}
                    </td>
                    <td className="p-3 text-right font-bold text-indigo-700">
                      {sc.conversionRate}%
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
