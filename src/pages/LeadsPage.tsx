import React, { useState, useEffect } from 'react';
import {
  Search,
  Target,
  Phone,
  Calendar,
  Clock,
  Download,
  Filter,
  Flame,
  CheckCircle2,
  XCircle,
  Plus,
  Building2,
  Share2,
  RefreshCw,
  UserPlus,
} from 'lucide-react';
import { Lead, LeadStatus } from '../types';
import { StorageService } from '../services/storage';
import { ApiService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { CreateLeadModal } from '../components/CreateLeadModal';

interface LeadsPageProps {
  onOpenLeadModal: (lead: Lead) => void;
}

export const LeadsPage: React.FC<LeadsPageProps> = ({ onOpenLeadModal }) => {
  const { role, user } = useAuth();
  const todayStr = new Date().toISOString().split('T')[0];

  const [leadsList, setLeadsList] = useState<Lead[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterCourse, setFilterCourse] = useState<string>('ALL');
  const [filterSC, setFilterSC] = useState<string>('ALL');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const loadLeads = () => {
    const leads = StorageService.getLeads();
    setLeadsList(leads);
  };

  const handleSyncSheets = async () => {
    setIsSyncing(true);
    try {
      const fetched = await ApiService.getLeads(role === 'SC' ? user?.id : undefined);
      setLeadsList(fetched);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    loadLeads();
  }, [user]);

  const scUsers = StorageService.getSCUsers();
  const baseList = role === 'SC' ? leadsList.filter((l) => l.scId === user?.id) : leadsList;

  const filteredLeads = baseList.filter((l) => {
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const match =
        l.referenceName.toLowerCase().includes(q) ||
        l.mobile.toLowerCase().includes(q) ||
        l.id.toLowerCase().includes(q) ||
        l.courseInterest.toLowerCase().includes(q) ||
        l.sourceAlumniName.toLowerCase().includes(q) ||
        l.scName.toLowerCase().includes(q);
      if (!match) return false;
    }

    if (filterStatus !== 'ALL' && l.leadStatus !== filterStatus) {
      return false;
    }

    if (filterCourse !== 'ALL' && l.courseInterest !== filterCourse) {
      return false;
    }

    if (role === 'ADMIN' && filterSC !== 'ALL' && l.scId !== filterSC) {
      return false;
    }

    return true;
  });

  const courses = Array.from(new Set(leadsList.map((l) => l.courseInterest))).filter(Boolean);

  const handleExportCSV = () => {
    ApiService.exportToCSV('SEAMEDU_Admission_Leads', filteredLeads);
  };

  const getStatusColor = (status: LeadStatus) => {
    switch (status) {
      case 'New':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Contacted':
        return 'bg-sky-100 text-sky-800 border-sky-200';
      case 'Interested':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Follow-up':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Meeting':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Converted':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Lost':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Admission Leads Pipeline
          </h2>
          <p className="text-xs text-slate-500">
            {filteredLeads.length} leads in funnel • Derived automatically from verified alumni references
          </p>
        </div>

        <div className="flex items-center gap-2">
          {role === 'ADMIN' && (
            <button
              onClick={handleSyncSheets}
              disabled={isSyncing}
              className="px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50"
              title="Fetch live records from Google Sheets"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-indigo-600' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Sheets'}</span>
            </button>
          )}

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Create Lead Log</span>
          </button>

          {role === 'ADMIN' && (
            <button
              onClick={handleExportCSV}
              className="px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search student, mobile, lead ID, ref alumni..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 text-slate-800"
            />
          </div>

          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 font-semibold text-slate-700"
            >
              <option value="ALL">All Pipeline Stages</option>
              <option value="New">New</option>
              <option value="Contacted">Contacted</option>
              <option value="Interested">Interested</option>
              <option value="Follow-up">Follow-up</option>
              <option value="Meeting">Meeting / Counselling</option>
              <option value="Converted">Converted (Admission)</option>
              <option value="Lost">Lost</option>
            </select>
          </div>

          <div>
            <select
              value={filterCourse}
              onChange={(e) => setFilterCourse(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 text-slate-700"
            >
              <option value="ALL">All Course Interests</option>
              {courses.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {role === 'ADMIN' && (
            <div>
              <select
                value={filterSC}
                onChange={(e) => setFilterSC(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 text-slate-700"
              >
                <option value="ALL">All Counsellors</option>
                {scUsers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3">Lead ID</th>
                <th className="p-3">Prospective Student</th>
                <th className="p-3">Mobile & Email</th>
                <th className="p-3">Course Interest</th>
                <th className="p-3">Source Alumni (Relation)</th>
                {role === 'ADMIN' && <th className="p-3">Assigned SC</th>}
                <th className="p-3 text-center">Status</th>
                <th className="p-3">Next Follow-up</th>
                <th className="p-3">Counselling Date</th>
                <th className="p-3 text-right">Details</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-slate-400">
                    <Target className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-600">No admission leads found.</p>
                    <p className="text-[11px]">
                      Collect references from connected alumni calls to automatically generate admission leads.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => {
                  const isOverdue =
                    lead.nextFollowup &&
                    lead.nextFollowup < todayStr &&
                    lead.leadStatus !== 'Converted' &&
                    lead.leadStatus !== 'Lost';
                  const isToday = lead.nextFollowup === todayStr;

                  return (
                    <tr
                      key={lead.id}
                      onClick={() => onOpenLeadModal(lead)}
                      className="hover:bg-indigo-50/30 cursor-pointer transition-colors group"
                    >
                      <td className="p-3 font-mono font-semibold text-indigo-600">{lead.id}</td>

                      <td className="p-3">
                        <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {lead.referenceName}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Created {new Date(lead.createdDate).toLocaleDateString()}
                        </div>
                      </td>

                      <td className="p-3">
                        <div className="font-medium text-slate-700">{lead.mobile}</div>
                        <div className="text-[10px] text-slate-400 truncate max-w-xs">{lead.email}</div>
                      </td>

                      <td className="p-3 font-medium text-slate-800">{lead.courseInterest}</td>

                      <td className="p-3">
                        <div className="font-medium text-slate-800">{lead.sourceAlumniName}</div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                          {lead.relation}
                        </span>
                      </td>

                      {role === 'ADMIN' && (
                        <td className="p-3 font-medium text-slate-800">{lead.scName}</td>
                      )}

                      <td className="p-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusColor(
                            lead.leadStatus
                          )}`}
                        >
                          {lead.leadStatus}
                        </span>
                      </td>

                      <td className="p-3">
                        {lead.nextFollowup ? (
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 w-max ${
                              isOverdue
                                ? 'bg-rose-100 text-rose-800 font-bold'
                                : isToday
                                ? 'bg-amber-100 text-amber-800 font-bold'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            <Clock className="w-3 h-3" />
                            <span>{lead.nextFollowup}</span>
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      <td className="p-3 text-slate-600 font-medium text-[11px]">
                        {lead.counsellingDate || <span className="text-slate-300">—</span>}
                      </td>

                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenLeadModal(lead);
                          }}
                          className="px-2.5 py-1 bg-white hover:bg-indigo-600 text-indigo-600 hover:text-white rounded text-xs font-semibold transition-all border border-slate-200 hover:border-indigo-600"
                        >
                          View & Update
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Lead Modal */}
      <CreateLeadModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={loadLeads}
      />
    </div>
  );
};
