import React, { useState, useEffect } from 'react';
import {
  Clock,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Phone,
  User,
  ArrowRight,
  Filter,
  Search,
} from 'lucide-react';
import { Lead } from '../types';
import { StorageService } from '../services/storage';
import { useAuth } from '../context/AuthContext';

interface FollowupsPageProps {
  onOpenLeadModal: (lead: Lead) => void;
}

export const FollowupsPage: React.FC<FollowupsPageProps> = ({ onOpenLeadModal }) => {
  const { role, user } = useAuth();
  const todayStr = new Date().toISOString().split('T')[0];

  const [leads, setLeads] = useState<Lead[]>([]);
  const [activeTab, setActiveTab] = useState<'overdue' | 'today' | 'upcoming'>('today');
  const [searchTerm, setSearchTerm] = useState('');

  const loadLeads = () => {
    const list = StorageService.getLeads();
    setLeads(list);
  };

  useEffect(() => {
    loadLeads();
  }, [user]);

  const baseLeads = role === 'SC' ? leads.filter((l) => l.scId === user?.id) : leads;

  // Active leads with followup dates (excluding Converted and Lost)
  const activeFollowupLeads = baseLeads.filter(
    (l) => l.nextFollowup && l.leadStatus !== 'Converted' && l.leadStatus !== 'Lost'
  );

  const overdueLeads = activeFollowupLeads.filter((l) => l.nextFollowup < todayStr);
  const todayLeads = activeFollowupLeads.filter((l) => l.nextFollowup === todayStr);
  const upcomingLeads = activeFollowupLeads.filter((l) => l.nextFollowup > todayStr);

  const currentTabList =
    activeTab === 'overdue'
      ? overdueLeads
      : activeTab === 'today'
      ? todayLeads
      : upcomingLeads;

  const filteredList = currentTabList.filter((l) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      l.referenceName.toLowerCase().includes(q) ||
      l.mobile.toLowerCase().includes(q) ||
      l.courseInterest.toLowerCase().includes(q) ||
      l.sourceAlumniName.toLowerCase().includes(q) ||
      l.scName.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Follow-ups Management
          </h2>
          <p className="text-xs text-slate-500">
            Track urgent callbacks, scheduled today, and upcoming counselling appointments
          </p>
        </div>
      </div>

      {/* 3 Main Tabs with live counts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          onClick={() => setActiveTab('overdue')}
          className={`p-4 rounded-xl border text-left transition-all ${
            activeTab === 'overdue'
              ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-200'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-700">
              Overdue Follow-ups
            </span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-extrabold text-rose-900 mt-2">
            {overdueLeads.length}
          </div>
          <p className="text-[11px] text-rose-600 mt-0.5">
            Date before today & not converted/lost
          </p>
        </button>

        <button
          onClick={() => setActiveTab('today')}
          className={`p-4 rounded-xl border text-left transition-all ${
            activeTab === 'today'
              ? 'bg-indigo-50 border-indigo-400 ring-2 ring-indigo-200'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">
              Today's Follow-ups
            </span>
            <Calendar className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-extrabold text-indigo-900 mt-2">
            {todayLeads.length}
          </div>
          <p className="text-[11px] text-indigo-600 mt-0.5">
            Scheduled for action today ({todayStr})
          </p>
        </button>

        <button
          onClick={() => setActiveTab('upcoming')}
          className={`p-4 rounded-xl border text-left transition-all ${
            activeTab === 'upcoming'
              ? 'bg-slate-100 border-slate-400 ring-2 ring-slate-300'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Upcoming Follow-ups
            </span>
            <Clock className="w-4 h-4 text-slate-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">
            {upcomingLeads.length}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Future dates in pipeline</p>
        </button>
      </div>

      {/* Search within active category */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between gap-4">
        <div className="relative max-w-md w-full">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder={`Filter ${activeTab} follow-ups by name, phone, course...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-500 text-slate-800"
          />
        </div>
        <div className="text-xs text-slate-500 font-medium">
          Showing {filteredList.length} items
        </div>
      </div>

      {/* List Card Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="divide-y divide-slate-100">
          {filteredList.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="font-semibold text-slate-700">No {activeTab} follow-ups in this queue.</p>
              <p className="text-[11px] text-slate-400">All scheduled conversations are up to date.</p>
            </div>
          ) : (
            filteredList.map((lead) => (
              <div
                key={lead.id}
                onClick={() => onOpenLeadModal(lead)}
                className="p-4 hover:bg-indigo-50/30 cursor-pointer transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs group"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {lead.referenceName}
                    </span>
                    <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                      {lead.id}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {lead.leadStatus}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-slate-600">
                    <a
                      href={`tel:${lead.mobile}`}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1 font-semibold text-indigo-600 hover:underline"
                    >
                      <Phone className="w-3 h-3" />
                      <span>{lead.mobile}</span>
                    </a>
                    <span>•</span>
                    <span>Course: <b>{lead.courseInterest}</b></span>
                    <span>•</span>
                    <span>Source: {lead.sourceAlumniName} ({lead.relation})</span>
                  </div>

                  {lead.remark && (
                    <p className="text-slate-500 text-[11px] italic">Notes: {lead.remark}</p>
                  )}
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Scheduled Date</div>
                    <div
                      className={`font-mono text-xs font-bold flex items-center gap-1 ${
                        activeTab === 'overdue'
                          ? 'text-rose-600'
                          : activeTab === 'today'
                          ? 'text-indigo-600'
                          : 'text-slate-700'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>{lead.nextFollowup}</span>
                    </div>
                    {role === 'ADMIN' && (
                      <div className="text-[10px] text-slate-500 mt-0.5">SC: {lead.scName}</div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenLeadModal(lead);
                    }}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs shadow-xs transition-colors"
                  >
                    Action / Update
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
