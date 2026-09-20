import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Phone,
  Mail,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
  ArrowRight,
  ShieldCheck,
  Send,
  MessageCircle,
  Copy,
  Check,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Lead, LeadStatus, Followup } from '../types';
import { ApiService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  cleanPhoneNumber,
  generateWhatsAppLink,
  openWhatsApp,
  getLeadWhatsAppDraft,
  LeadDraftType,
} from '../utils/whatsapp';

interface LeadDetailsModalProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const TIMELINE_STAGES: LeadStatus[] = [
  'New',
  'Contacted',
  'Interested',
  'Follow-up',
  'Meeting',
  'Converted',
];

export const LeadDetailsModal: React.FC<LeadDetailsModalProps> = ({
  lead,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [currentStatus, setCurrentStatus] = useState<LeadStatus>('New');
  const [nextFollowup, setNextFollowup] = useState('');
  const [counsellingDate, setCounsellingDate] = useState('');
  const [remark, setRemark] = useState('');
  const [followups, setFollowups] = useState<Followup[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);

  // WhatsApp quick-action and draft state
  const [waTemplate, setWaTemplate] = useState<LeadDraftType>('intro');
  const [waDraft, setWaDraft] = useState('');
  const [copiedDraft, setCopiedDraft] = useState(false);

  useEffect(() => {
    if (lead && isOpen) {
      setCurrentStatus(lead.leadStatus);
      setNextFollowup(lead.nextFollowup || '');
      setCounsellingDate(lead.counsellingDate || '');
      setRemark('');

      // Pre-fill initial WhatsApp draft
      const counsellorName = user?.name || lead.scName || 'SEAMEDU Admissions';
      setWaTemplate('intro');
      setWaDraft(getLeadWhatsAppDraft(lead, counsellorName, 'intro'));
      setCopiedDraft(false);

      // Fetch followups history
      ApiService.getFollowups().then((list) => {
        setFollowups(list.filter((f) => f.leadId === lead.id));
      });
    }
  }, [lead, isOpen, user]);

  if (!isOpen || !lead) return null;

  const counsellorName = user?.name || lead.scName || 'SEAMEDU Admissions';
  const cleanPhone = cleanPhoneNumber(lead.mobile);
  const waApiLink = generateWhatsAppLink(lead.mobile, waDraft);

  const handleTemplateChange = (type: LeadDraftType) => {
    setWaTemplate(type);
    if (lead) {
      setWaDraft(getLeadWhatsAppDraft(lead, counsellorName, type));
    }
  };

  const handleOpenWhatsApp = (customMessage?: string) => {
    if (!lead?.mobile) return;
    const msg = customMessage !== undefined ? customMessage : waDraft;
    openWhatsApp(lead.mobile, msg);
  };

  const handleCopyDraft = () => {
    if (waDraft) {
      navigator.clipboard.writeText(waDraft);
      setCopiedDraft(true);
      setTimeout(() => setCopiedDraft(false), 2000);
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);

    try {
      await ApiService.updateLeadStatus({
        leadId: lead.id,
        newStatus: currentStatus,
        nextFollowup,
        counsellingDate,
        remark: remark || `Status updated to ${currentStatus}`,
        scId: user?.id || lead.scId,
        scName: user?.name || lead.scName,
      });

      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to update lead');
    } finally {
      setIsUpdating(false);
    }
  };

  const getStageIndex = (status: LeadStatus) => {
    if (status === 'Lost') return -1;
    return TIMELINE_STAGES.indexOf(status);
  };

  const currentStageIndex = getStageIndex(lead.leadStatus);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400 font-bold">
              <GraduationCap className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">{lead.referenceName}</h3>
                <span className="text-[10px] font-mono bg-slate-800 px-2 py-0.5 rounded text-indigo-300 border border-slate-700">
                  {lead.id}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    lead.leadStatus === 'Converted'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : lead.leadStatus === 'Lost'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                  }`}
                >
                  {lead.leadStatus}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Interested in: <b className="text-slate-200">{lead.courseInterest}</b>
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

        {/* Quick Action Outreach Bar */}
        <div className="bg-slate-100 border-b border-slate-200 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-600 uppercase text-[10px] tracking-wide">Quick Action:</span>
            <a
              href={`tel:${lead.mobile}`}
              className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded font-medium flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <Phone className="w-3.5 h-3.5 text-indigo-600" />
              <span>Call ({lead.mobile})</span>
            </a>
            <button
              type="button"
              onClick={() => handleOpenWhatsApp()}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold flex items-center gap-1.5 transition-all shadow-xs"
              title="Open WhatsApp with pre-filled draft message"
            >
              <MessageCircle className="w-3.5 h-3.5 fill-current" />
              <span>WhatsApp Now</span>
            </button>
          </div>
          <div className="text-[11px] text-slate-500">
            Assigned SC: <b className="text-slate-800">{lead.scName}</b>
          </div>
        </div>

        {/* Complete Timeline Visualizer */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3">
            Conversion Pipeline Timeline
          </p>

          <div className="flex items-center justify-between relative overflow-x-auto pb-2">
            {/* Step 1: Call */}
            <div className="flex flex-col items-center text-center shrink-0">
              <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold">
                ✓
              </div>
              <span className="text-[10px] font-medium text-slate-700 mt-1">1. Call</span>
            </div>
            <div className="h-0.5 flex-1 bg-emerald-400 mx-1 mb-4" />

            {/* Step 2: Reference */}
            <div className="flex flex-col items-center text-center shrink-0">
              <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold">
                ✓
              </div>
              <span className="text-[10px] font-medium text-slate-700 mt-1">2. Reference</span>
            </div>
            <div className="h-0.5 flex-1 bg-emerald-400 mx-1 mb-4" />

            {/* Pipeline stages */}
            {TIMELINE_STAGES.map((stage, idx) => {
              const isPastOrCurrent =
                lead.leadStatus !== 'Lost' && currentStageIndex >= idx;
              const isCurrent = lead.leadStatus === stage;

              return (
                <React.Fragment key={stage}>
                  <div className="flex flex-col items-center text-center shrink-0">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${
                        isCurrent
                          ? 'bg-indigo-600 text-white ring-4 ring-indigo-100'
                          : isPastOrCurrent
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      {isPastOrCurrent ? '✓' : idx + 3}
                    </div>
                    <span
                      className={`text-[10px] mt-1 whitespace-nowrap ${
                        isCurrent
                          ? 'font-bold text-indigo-600'
                          : isPastOrCurrent
                          ? 'font-medium text-slate-700'
                          : 'text-slate-400'
                      }`}
                    >
                      {stage}
                    </span>
                  </div>
                  {idx < TIMELINE_STAGES.length - 1 && (
                    <div
                      className={`h-0.5 flex-1 mx-1 mb-4 ${
                        currentStageIndex > idx ? 'bg-emerald-400' : 'bg-slate-200'
                      }`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 max-h-[65vh] overflow-y-auto space-y-6">
          {/* Key Information Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Student & Reference Details */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2.5 text-xs">
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wide border-b border-slate-200 pb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-indigo-600" />
                <span>Prospective Student Information</span>
              </h4>

              <div className="flex justify-between">
                <span className="text-slate-500">Student Name:</span>
                <span className="font-semibold text-slate-800">{lead.referenceName}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">Contact Mobile:</span>
                <div className="flex items-center gap-1.5">
                  <a
                    href={`tel:${lead.mobile}`}
                    className="font-medium text-indigo-600 hover:underline flex items-center gap-1"
                  >
                    <Phone className="w-3 h-3" />
                    <span>{lead.mobile}</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => handleOpenWhatsApp()}
                    className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold flex items-center gap-1 transition-colors shadow-2xs"
                    title="WhatsApp Now"
                  >
                    <MessageCircle className="w-3 h-3 fill-current" />
                    <span>WhatsApp</span>
                  </button>
                </div>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-500">Email Address:</span>
                <span className="font-medium text-slate-800">{lead.email || 'N/A'}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-500">Course Interest:</span>
                <span className="font-medium text-slate-800">{lead.courseInterest}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-500">Lead Created Date:</span>
                <span className="text-slate-700">
                  {new Date(lead.createdDate).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Source Alumni & SC Details */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2.5 text-xs">
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wide border-b border-slate-200 pb-1.5 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Source & Assignment Attribution</span>
              </h4>

              <div className="flex justify-between">
                <span className="text-slate-500">Source Alumni:</span>
                <span className="font-semibold text-slate-800">
                  {lead.sourceAlumniName} ({lead.sourceAlumniId})
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-500">Alumni Mobile:</span>
                <span className="font-medium text-slate-700">
                  {lead.sourceAlumniMobile || 'Recorded in Alumni profile'}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-500">Relation to Alumni:</span>
                <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-semibold border border-indigo-100">
                  {lead.relation}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-500">Assigned SC:</span>
                <span className="font-semibold text-slate-800">{lead.scName}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-500">Counselling Session:</span>
                <span className="font-medium text-amber-700">
                  {lead.counsellingDate || 'Not scheduled yet'}
                </span>
              </div>
            </div>
          </div>

          {/* WhatsApp Quick-Action & Pre-filled Message Draft Card */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                  <MessageCircle className="w-4 h-4 fill-current" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-800 flex items-center gap-2">
                    <span>WhatsApp Outreach & Draft Generator</span>
                    <span className="text-[10px] font-mono text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200">
                      +{cleanPhone}
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Pre-filled message customized with course interest and source alumni
                  </p>
                </div>
              </div>

              {/* Template Presets */}
              <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-emerald-200 text-[11px]">
                <button
                  type="button"
                  onClick={() => handleTemplateChange('intro')}
                  className={`px-2.5 py-1 rounded font-medium transition-all ${
                    waTemplate === 'intro'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  1. Intro & Course
                </button>
                <button
                  type="button"
                  onClick={() => handleTemplateChange('counselling')}
                  className={`px-2.5 py-1 rounded font-medium transition-all ${
                    waTemplate === 'counselling'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  2. Campus Visit
                </button>
                <button
                  type="button"
                  onClick={() => handleTemplateChange('followup')}
                  className={`px-2.5 py-1 rounded font-medium transition-all ${
                    waTemplate === 'followup'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  3. Follow-up
                </button>
              </div>
            </div>

            {/* Editable Draft */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-slate-600">
                <span className="font-semibold text-slate-700">Pre-filled Message Draft:</span>
                <span className="text-[10px] text-slate-400">You can edit before opening WhatsApp</span>
              </div>
              <textarea
                rows={4}
                value={waDraft}
                onChange={(e) => setWaDraft(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-sans leading-relaxed"
                placeholder="Type or customize your WhatsApp draft..."
              />
            </div>

            {/* Actions Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-emerald-200/60">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <span className="text-[10px] text-slate-400">API Link:</span>
                <a
                  href={waApiLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-emerald-800 bg-emerald-100/70 hover:bg-emerald-100 px-2 py-0.5 rounded text-[10px] flex items-center gap-1 max-w-[280px] truncate"
                  title={waApiLink}
                >
                  <span className="truncate">api.whatsapp.com/send?phone=+{cleanPhone}</span>
                  <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                </a>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyDraft}
                  className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                >
                  {copiedDraft ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Draft</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenWhatsApp()}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
                >
                  <MessageCircle className="w-3.5 h-3.5 fill-current" />
                  <span>WhatsApp Now</span>
                </button>
              </div>
            </div>
          </div>

          {/* Current Remark */}
          {lead.remark && (
            <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-lg text-xs">
              <span className="font-bold text-indigo-900 block mb-1">Latest Remark:</span>
              <p className="text-indigo-800">{lead.remark}</p>
            </div>
          )}

          {/* Follow-up / Status Update Form */}
          <form
            onSubmit={handleUpdateStatus}
            className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4"
          >
            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wide">
              Update Pipeline Status & Schedule Follow-up
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Change Lead Status
                </label>
                <select
                  value={currentStatus}
                  onChange={(e) => setCurrentStatus(e.target.value as LeadStatus)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
                >
                  <option value="New">New</option>
                  <option value="Contacted">Contacted</option>
                  <option value="Interested">Interested</option>
                  <option value="Follow-up">Follow-up</option>
                  <option value="Meeting">Meeting / Campus Visit</option>
                  <option value="Converted">Converted (Admission Confirmed)</option>
                  <option value="Lost">Lost (Not Interested)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Next Follow-up Date
                </label>
                <input
                  type="date"
                  value={nextFollowup}
                  onChange={(e) => setNextFollowup(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Counselling / Meeting Date
                </label>
                <input
                  type="date"
                  value={counsellingDate}
                  onChange={(e) => setCounsellingDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Follow-up Activity Notes
              </label>
              <input
                type="text"
                placeholder="Spoke with candidate, clarified scholarship, scheduled portfolio review..."
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isUpdating}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Save Lead Update</span>
              </button>
            </div>
          </form>

          {/* Follow-up Activity History */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wide">
              Follow-up History Log ({followups.length})
            </h4>

            {followups.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No previous follow-up records.</p>
            ) : (
              <div className="space-y-2">
                {followups.map((f) => (
                  <div
                    key={f.id}
                    className="p-2.5 bg-slate-50 border border-slate-200 rounded text-xs flex items-center justify-between"
                  >
                    <div>
                      <span className="font-semibold text-slate-800">{f.status}</span>
                      <span className="text-slate-500 ml-2">— {f.remark}</span>
                      <p className="text-[10px] text-slate-400 mt-0.5">By {f.scName}</p>
                    </div>
                    <span className="text-[11px] text-slate-500">{f.followupDate}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
