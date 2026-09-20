import React, { useState, useEffect } from 'react';
import {
  Share2,
  Search,
  Copy,
  Check,
  Send,
  ExternalLink,
  Download,
  Calendar,
  Sparkles,
  User,
  HelpCircle,
  Phone,
  MessageSquare,
  Users,
  CheckCircle2,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { ReferenceResponse, Alumni } from '../types';
import { StorageService } from '../services/storage';
import { ApiService } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const ReferencesPage: React.FC = () => {
  const { role, user } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'share' | 'received'>('share');

  const [responses, setResponses] = useState<ReferenceResponse[]>([]);
  const [alumniList, setAlumniList] = useState<Alumni[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [alumniSearchTerm, setAlumniSearchTerm] = useState('');

  // Link copy feedback state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Quick link generator modal state
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedAlumniId, setSelectedAlumniId] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');
  const [copiedModalLink, setCopiedModalLink] = useState(false);

  const loadData = () => {
    const rawResponses = StorageService.getReferenceResponses();
    const rawAlumni = StorageService.getAlumni();

    // Strict role isolation: SC only sees their own assigned alumni and references
    if (role === 'SC') {
      const myAlumni = rawAlumni.filter((a) => a.assignedSCId === user?.id);
      const myResponses = rawResponses.filter((r) => r.sourceSCId === user?.id);
      setAlumniList(myAlumni);
      setResponses(myResponses);
      if (myAlumni.length > 0 && !selectedAlumniId) {
        setSelectedAlumniId(myAlumni[0].id);
      }
    } else {
      setAlumniList(rawAlumni);
      setResponses(rawResponses);
      if (rawAlumni.length > 0 && !selectedAlumniId) {
        setSelectedAlumniId(rawAlumni[0].id);
      }
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  // Filtered received references
  const filteredResponses = responses.filter((r) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      r.referenceName.toLowerCase().includes(q) ||
      r.mobile.toLowerCase().includes(q) ||
      r.sourceAlumniName.toLowerCase().includes(q) ||
      r.courseInterest.toLowerCase().includes(q) ||
      r.leadId.toLowerCase().includes(q)
    );
  });

  // Filtered alumni for the quick share list
  const filteredAlumniList = alumniList.filter((a) => {
    if (!alumniSearchTerm) return true;
    const q = alumniSearchTerm.toLowerCase();
    return (
      a.name.toLowerCase().includes(q) ||
      a.mobile.toLowerCase().includes(q) ||
      a.course.toLowerCase().includes(q) ||
      a.batch.toLowerCase().includes(q) ||
      a.id.toLowerCase().includes(q)
    );
  });

  // Helper to generate referral link for any alumni
  const getReferralInfo = (alumni: Alumni) => {
    const scId = user?.id || alumni.assignedSCId || 'SC-01';
    const scName = user?.name || alumni.assignedSCName || 'Counsellor';
    return ApiService.generateReferenceToken(alumni.id, alumni.name, scId, scName);
  };

  // 1-Click Copy Handler
  const handleCopyLink = (alumni: Alumni) => {
    const { shareUrl } = getReferralInfo(alumni);
    navigator.clipboard.writeText(shareUrl);
    setCopiedId(alumni.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // 1-Click WhatsApp Share Handler
  const handleWhatsAppShare = (alumni: Alumni) => {
    const { shareUrl } = getReferralInfo(alumni);
    const counsellorName = user?.name || 'SEAMEDU Admissions Team';
    const message = encodeURIComponent(
      `Hello ${alumni.name}!\n\nHope you are doing well. Greetings from SEAMEDU School of Pro-Expressionism!\n\nIf you know any friends, juniors, or relatives interested in creative courses (Sound Engineering, Filmmaking, Animation, Game Design, VFX, or Media), please share their details via this secure referral link:\n${shareUrl}\n\nThank you for supporting your alma mater!\nBest regards,\n${counsellorName}\nSEAMEDU Admissions`
    );

    const cleanMobile = alumni.mobile.replace(/\D/g, '');
    const fullMobile = cleanMobile.startsWith('91') || cleanMobile.length > 10 ? cleanMobile : `91${cleanMobile}`;
    window.open(`https://api.whatsapp.com/send?phone=${fullMobile}&text=${message}`, '_blank');
  };

  const handleModalGenerate = () => {
    const alumni = alumniList.find((a) => a.id === selectedAlumniId);
    if (!alumni) return;
    const { shareUrl } = getReferralInfo(alumni);
    setGeneratedLink(shareUrl);
  };

  const handleExportCSV = () => {
    ApiService.exportToCSV(
      role === 'ADMIN' ? 'SEAMEDU_All_Reference_Submissions' : `SEAMEDU_My_References_${user?.id}`,
      filteredResponses
    );
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            {role === 'ADMIN'
              ? 'Alumni Referral Links & Received Submissions'
              : 'My Alumni Referral Links & Leads'}
          </h2>
          <p className="text-xs text-slate-500">
            {role === 'ADMIN'
              ? 'Manage public referral forms, shareable links, and track candidate submissions across all counsellors'
              : `Share personalized referral links with your ${alumniList.length} assigned alumni. Candidates who apply automatically become your leads.`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setShowGenerateModal(true);
              setGeneratedLink('');
            }}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Generate Custom Link</span>
          </button>
          {role === 'ADMIN' && filteredResponses.length > 0 && (
            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* 3-STEP EASY EXPLAINER GUIDE */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 rounded-2xl p-5 text-white shadow-lg border border-indigo-800/60">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <h3 className="font-bold text-sm tracking-wide">
            How Alumni Referral Links Work (3 Easy Steps)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-white/10 backdrop-blur-xs p-3.5 rounded-xl border border-white/10 flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-indigo-500 text-white font-bold flex items-center justify-center shrink-0 text-xs">
              1
            </div>
            <div>
              <p className="font-bold text-white mb-0.5">Send Link to Alumni</p>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Click <b>Share on WhatsApp</b> or <b>Copy Link</b> for any alumni below. Send it during or after your phone call.
              </p>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-xs p-3.5 rounded-xl border border-white/10 flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-indigo-500 text-white font-bold flex items-center justify-center shrink-0 text-xs">
              2
            </div>
            <div>
              <p className="font-bold text-white mb-0.5">Alumni Fills Friend Details</p>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                The alumni opens the mobile form and enters the referred student's name, mobile number, and course interest.
              </p>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-xs p-3.5 rounded-xl border border-white/10 flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-emerald-500 text-white font-bold flex items-center justify-center shrink-0 text-xs">
              3
            </div>
            <div>
              <p className="font-bold text-emerald-300 mb-0.5">Instant Admission Lead</p>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                The student is instantly created as a new <b>Admission Lead</b> assigned directly to YOU for counselling!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* SUB-TABS: 1. Quick Share Links by Alumni | 2. Received Submissions */}
      <div className="flex border-b border-slate-200 gap-6 text-xs font-bold">
        <button
          onClick={() => setActiveSubTab('share')}
          className={`pb-3 border-b-2 transition-all flex items-center gap-2 ${
            activeSubTab === 'share'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Share2 className="w-4 h-4" />
          <span>Quick Share Links by Alumni ({filteredAlumniList.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('received')}
          className={`pb-3 border-b-2 transition-all flex items-center gap-2 ${
            activeSubTab === 'received'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Received Student References ({filteredResponses.length})</span>
        </button>
      </div>

      {/* TAB 1: QUICK SHARE LINKS BY ALUMNI */}
      {activeSubTab === 'share' && (
        <div className="space-y-4">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:max-w-md">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search assigned alumni name, phone, course, batch..."
                value={alumniSearchTerm}
                onChange={(e) => setAlumniSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-500 text-slate-800"
              />
            </div>
            <div className="text-xs text-slate-500">
              Showing <b>{filteredAlumniList.length}</b> alumni available for reference sharing
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Alumni Name</th>
                    <th className="p-3.5">Mobile</th>
                    <th className="p-3.5">Course & Batch</th>
                    <th className="p-3.5 text-center">Ref Received</th>
                    {role === 'ADMIN' && <th className="p-3.5">Assigned SC</th>}
                    <th className="p-3.5 text-right">Quick Referral Link Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAlumniList.length === 0 ? (
                    <tr>
                      <td colSpan={role === 'ADMIN' ? 6 : 5} className="p-12 text-center text-slate-400">
                        <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="font-semibold text-slate-600">No alumni found.</p>
                        <p className="text-[11px]">Check search filter or verify assigned alumni roster.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredAlumniList.map((alumni) => {
                      const { shareUrl } = getReferralInfo(alumni);
                      const isCopied = copiedId === alumni.id;

                      return (
                        <tr key={alumni.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3.5">
                            <div className="font-bold text-slate-900">{alumni.name}</div>
                            <div className="text-[10px] font-mono text-slate-400">{alumni.id}</div>
                          </td>
                          <td className="p-3.5 font-medium text-slate-700">{alumni.mobile}</td>
                          <td className="p-3.5">
                            <div className="font-medium text-slate-800">{alumni.course}</div>
                            <div className="text-[10px] text-slate-500">
                              Batch {alumni.batch} ({alumni.passingYear})
                            </div>
                          </td>
                          <td className="p-3.5 text-center">
                            {alumni.referenceReceived === 'Yes' ? (
                              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                                Yes ({alumni.referenceCount || 1})
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px]">
                                None yet
                              </span>
                            )}
                          </td>
                          {role === 'ADMIN' && (
                            <td className="p-3.5 font-medium text-slate-700">
                              {alumni.assignedSCName || 'Unassigned'}
                            </td>
                          )}
                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {/* 1-Click WhatsApp Button */}
                              <button
                                type="button"
                                onClick={() => handleWhatsAppShare(alumni)}
                                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
                                title="Send pre-filled message on WhatsApp"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                <span>WhatsApp</span>
                              </button>

                              {/* 1-Click Copy Link Button */}
                              <button
                                type="button"
                                onClick={() => handleCopyLink(alumni)}
                                className={`px-2.5 py-1.5 rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-xs border ${
                                  isCopied
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                                }`}
                                title="Copy referral form URL"
                              >
                                {isCopied ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Copied!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                                    <span>Copy Link</span>
                                  </>
                                )}
                              </button>

                              {/* Preview Link in New Tab */}
                              <a
                                href={shareUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors"
                                title="Preview public form as seen by alumni"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: RECEIVED SUBMISSIONS */}
      {activeSubTab === 'received' && (
        <div className="space-y-4">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
            <div className="relative max-w-md">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search referred candidate, phone, course, alumni..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-500 text-slate-800"
              />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Ref ID</th>
                    <th className="p-3.5">Referred Candidate</th>
                    <th className="p-3.5">Contact Details</th>
                    <th className="p-3.5">Relation</th>
                    <th className="p-3.5">Course Interest</th>
                    <th className="p-3.5">Referred By (Alumni)</th>
                    {role === 'ADMIN' && <th className="p-3.5">Assigned SC</th>}
                    <th className="p-3.5">Linked Admission Lead</th>
                    <th className="p-3.5">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredResponses.length === 0 ? (
                    <tr>
                      <td colSpan={role === 'ADMIN' ? 9 : 8} className="p-12 text-center text-slate-400">
                        <Share2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="font-semibold text-slate-600">No references recorded yet.</p>
                        <p className="text-[11px]">
                          Share your referral link with alumni using the 'Quick Share Links' tab above.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredResponses.map((ref) => (
                      <tr key={ref.id} className="hover:bg-slate-50">
                        <td className="p-3.5 font-mono text-indigo-600 font-semibold">{ref.id}</td>
                        <td className="p-3.5 font-bold text-slate-900">{ref.referenceName}</td>
                        <td className="p-3.5">
                          <div className="font-medium text-slate-700">{ref.mobile}</div>
                          <div className="text-[10px] text-slate-400">{ref.email || 'N/A'}</div>
                        </td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200 text-[10px]">
                            {ref.relation}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-700 font-medium">{ref.courseInterest}</td>
                        <td className="p-3.5">
                          <div className="font-semibold text-slate-800">{ref.sourceAlumniName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{ref.sourceAlumniId}</div>
                        </td>
                        {role === 'ADMIN' && (
                          <td className="p-3.5 font-medium text-slate-700">{ref.sourceSCName}</td>
                        )}
                        <td className="p-3.5">
                          <span className="font-mono text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            {ref.leadId}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-500 text-[11px]">
                          {new Date(ref.submittedDate).toLocaleDateString()}
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

      {/* Modal: Custom Public Link Generator */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Share2 className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-sm">Generate Public Referral Link</h3>
              </div>
              <button
                onClick={() => setShowGenerateModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <p className="text-slate-600">
                Select an alumni to generate their personalized referral link. Any student submitted through
                this link will automatically be credited to them and created as a lead under your name.
              </p>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wide mb-1">
                  Target Alumni
                </label>
                <select
                  value={selectedAlumniId}
                  onChange={(e) => {
                    setSelectedAlumniId(e.target.value);
                    setGeneratedLink('');
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
                >
                  {alumniList.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.id}) — {a.course}
                    </option>
                  ))}
                </select>
              </div>

              {!generatedLink ? (
                <button
                  type="button"
                  onClick={handleModalGenerate}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold transition-colors shadow-xs"
                >
                  Generate Shareable Link
                </button>
              ) : (
                <div className="space-y-3 pt-2">
                  <label className="block font-bold text-emerald-800">Ready Shareable URL:</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={generatedLink}
                      className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 font-mono select-all"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(generatedLink);
                        setCopiedModalLink(true);
                        setTimeout(() => setCopiedModalLink(false), 2000);
                      }}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shrink-0"
                    >
                      {copiedModalLink ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedModalLink ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    {/* Instant WhatsApp Share from Modal */}
                    <button
                      type="button"
                      onClick={() => {
                        const targetAlumni = alumniList.find((a) => a.id === selectedAlumniId);
                        if (targetAlumni) handleWhatsAppShare(targetAlumni);
                      }}
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Share on WhatsApp</span>
                    </button>

                    <a
                      href={generatedLink}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-colors text-xs"
                    >
                      <span>Preview Form</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setShowGenerateModal(false)}
                className="px-4 py-1.5 text-xs text-slate-600 hover:text-slate-900"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
