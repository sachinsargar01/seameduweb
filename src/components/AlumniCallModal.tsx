import React, { useState, useEffect } from 'react';
import {
  X,
  Phone,
  PhoneCall,
  Calendar,
  Clock,
  User,
  Share2,
  Copy,
  Check,
  Send,
  History,
  FileText,
  AlertCircle,
  Sparkles,
  MessageCircle,
  ExternalLink,
} from 'lucide-react';
import { Alumni, CallLog, CallStatus, RelationType } from '../types';
import { ApiService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  cleanPhoneNumber,
  generateWhatsAppLink,
  openWhatsApp,
  getAlumniWhatsAppDraft,
  AlumniDraftType,
} from '../utils/whatsapp';

interface AlumniCallModalProps {
  alumni: Alumni | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AlumniCallModal: React.FC<AlumniCallModalProps> = ({
  alumni,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'call' | 'history'>('call');
  const [callStatus, setCallStatus] = useState<CallStatus>('Connected');
  const [callResult, setCallResult] = useState('');
  const [remark, setRemark] = useState('');
  const [nextFollowup, setNextFollowup] = useState('');

  // Connected sub-flow: Did alumni provide reference?
  const [providedReference, setProvidedReference] = useState<'Yes' | 'No'>('No');
  const [referenceMode, setReferenceMode] = useState<'manual' | 'link'>('manual');

  // Manual Reference Form state
  const [refName, setRefName] = useState('');
  const [refMobile, setRefMobile] = useState('');
  const [refEmail, setRefEmail] = useState('');
  const [refRelation, setRefRelation] = useState<RelationType>('Friend');
  const [refCourse, setRefCourse] = useState('B.Sc Sound Engineering');
  const [refTime, setRefTime] = useState('Afternoon 2PM - 5PM');
  const [refRemark, setRefRemark] = useState('');

  // Generated Link state
  const [generatedLink, setGeneratedLink] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  // WhatsApp quick-action and draft state
  const [waTemplate, setWaTemplate] = useState<AlumniDraftType>('connect');
  const [waDraft, setWaDraft] = useState('');
  const [copiedDraft, setCopiedDraft] = useState(false);
  const [showWaSection, setShowWaSection] = useState(false);

  // Call logs history
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (alumni && isOpen) {
      setCallStatus(alumni.callStatus === 'Pending' ? 'Connected' : alumni.callStatus);
      setCallResult('');
      setRemark(alumni.remark || '');
      setNextFollowup(alumni.nextFollowup || '');
      setProvidedReference('No');
      setReferenceMode('manual');
      setGeneratedLink('');
      setCopiedLink(false);

      // Pre-fill WhatsApp draft
      const counsellor = user?.name || alumni.assignedSCName || 'SEAMEDU Admissions Team';
      setWaTemplate('connect');
      setWaDraft(getAlumniWhatsAppDraft(alumni, counsellor, undefined, 'connect'));
      setCopiedDraft(false);
      setShowWaSection(false);

      // Load previous call history for this alumni
      ApiService.getCallLogs(alumni.id).then(setCallLogs);
    }
  }, [alumni, isOpen, user]);

  if (!isOpen || !alumni) return null;

  const scId = user?.id || alumni.assignedSCId || 'SC-01';
  const scName = user?.name || alumni.assignedSCName || 'Counsellor';
  const counsellor = user?.name || alumni.assignedSCName || scName;
  const cleanPhone = cleanPhoneNumber(alumni.mobile);
  const waApiLink = generateWhatsAppLink(alumni.mobile, waDraft);

  const handleGenerateLink = () => {
    const { shareUrl } = ApiService.generateReferenceToken(
      alumni.id,
      alumni.name,
      scId,
      scName
    );
    setGeneratedLink(shareUrl);
    if (waTemplate === 'referral') {
      setWaDraft(getAlumniWhatsAppDraft(alumni, counsellor, shareUrl, 'referral'));
    }
  };

  const handleCopyLink = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleTemplateChange = (type: AlumniDraftType) => {
    setWaTemplate(type);
    let link = generatedLink;
    if (type === 'referral' && !link) {
      const { shareUrl } = ApiService.generateReferenceToken(
        alumni.id,
        alumni.name,
        scId,
        scName
      );
      link = shareUrl;
      setGeneratedLink(shareUrl);
    }
    setWaDraft(getAlumniWhatsAppDraft(alumni, counsellor, link, type));
  };

  const handleWhatsAppNow = (customMessage?: string) => {
    if (!alumni?.mobile) return;
    const msg = customMessage !== undefined ? customMessage : waDraft;
    openWhatsApp(alumni.mobile, msg);
  };

  const handleCopyDraft = () => {
    if (waDraft) {
      navigator.clipboard.writeText(waDraft);
      setCopiedDraft(true);
      setTimeout(() => setCopiedDraft(false), 2000);
    }
  };

  const handleShareWhatsApp = () => {
    if (!generatedLink) return;
    const draft = getAlumniWhatsAppDraft(alumni, counsellor, generatedLink, 'referral');
    openWhatsApp(alumni.mobile, draft);
  };

  const handleSubmitCall = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // 1. Log the call in Call_Logs table & update Alumni
      await ApiService.logAlumniCall({
        alumniId: alumni.id,
        scId,
        scName,
        callStatus,
        callResult: callResult || `Call status updated to ${callStatus}`,
        remark,
        nextFollowup,
        referenceReceived: providedReference,
      });

      // 2. If reference was provided manually, submit it to create lead
      if (callStatus === 'Connected' && providedReference === 'Yes' && referenceMode === 'manual') {
        if (refName && refMobile) {
          await ApiService.submitReference({
            sourceAlumniId: alumni.id,
            sourceAlumniName: alumni.name,
            sourceSCId: scId,
            sourceSCName: scName,
            referenceName: refName,
            relation: refRelation,
            mobile: refMobile,
            email: refEmail,
            courseInterest: refCourse,
            preferredContactTime: refTime,
            remark: refRemark,
          });
        }
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      alert('Error logging call. Please check inputs.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400 font-bold">
              <PhoneCall className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">{alumni.name}</h3>
                <span className="text-[10px] font-mono bg-slate-800 px-2 py-0.5 rounded text-indigo-300 border border-slate-700">
                  {alumni.id}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {alumni.course} • Batch {alumni.batch} ({alumni.passingYear})
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

        {/* Alumni Quick Info Bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-3">
            <a
              href={`tel:${alumni.mobile}`}
              className="flex items-center gap-1.5 font-semibold text-indigo-600 hover:underline"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>{alumni.mobile}</span>
            </a>
            <button
              type="button"
              onClick={() => handleWhatsAppNow()}
              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold transition-all shadow-xs flex items-center gap-1.5"
              title="Open WhatsApp with pre-filled message"
            >
              <MessageCircle className="w-3.5 h-3.5 fill-current" />
              <span>WhatsApp Now</span>
            </button>
            <span className="text-slate-300">•</span>
            <span className="text-slate-500">{alumni.email || 'No email'}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400">Assigned SC:</span>
            <span className="font-medium text-slate-800">{alumni.assignedSCName || scName}</span>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-200 px-6 bg-white">
          <button
            onClick={() => setActiveTab('call')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'call'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Call Logging & Reference</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'history'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Call History ({callLogs.length})</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {activeTab === 'call' ? (
            <form onSubmit={handleSubmitCall} className="space-y-5">
              {/* WhatsApp Quick-Action & Pre-filled Draft Card */}
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                      <MessageCircle className="w-4 h-4 fill-current" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                        <span>WhatsApp Quick Outreach</span>
                        <span className="text-[10px] font-mono text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-200">
                          +{cleanPhone}
                        </span>
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Pre-filled message template tailored for {alumni.name}
                      </p>
                    </div>
                  </div>

                  {/* Template Presets */}
                  <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-emerald-200 text-[11px]">
                    <button
                      type="button"
                      onClick={() => handleTemplateChange('connect')}
                      className={`px-2.5 py-0.5 rounded font-medium transition-all ${
                        waTemplate === 'connect'
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      1. Alumni Connect
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTemplateChange('referral')}
                      className={`px-2.5 py-0.5 rounded font-medium transition-all ${
                        waTemplate === 'referral'
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      2. Referral Link
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTemplateChange('callback')}
                      className={`px-2.5 py-0.5 rounded font-medium transition-all ${
                        waTemplate === 'callback'
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      3. Callback Request
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-600">
                    <span className="font-semibold text-slate-700">Pre-filled Message Draft:</span>
                    <span className="text-[10px] text-slate-400">Editable before sending</span>
                  </div>
                  <textarea
                    rows={3}
                    value={waDraft}
                    onChange={(e) => setWaDraft(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-sans leading-relaxed"
                    placeholder="Type or edit WhatsApp message draft..."
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-emerald-200/60">
                  <div className="flex items-center gap-1 text-[11px] text-slate-500">
                    <span className="text-[10px] text-slate-400">API Link:</span>
                    <a
                      href={waApiLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-emerald-800 bg-emerald-100/70 hover:bg-emerald-100 px-2 py-0.5 rounded text-[10px] flex items-center gap-1 max-w-[260px] truncate"
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
                      className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded text-xs font-semibold flex items-center gap-1 transition-colors shadow-2xs"
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
                      onClick={() => handleWhatsAppNow()}
                      className="px-3.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
                    >
                      <MessageCircle className="w-3.5 h-3.5 fill-current" />
                      <span>WhatsApp Now</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Call Status Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
                  Call Status <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {(
                    [
                      'Connected',
                      'Callback',
                      'No Answer',
                      'Busy',
                      'Wrong Number',
                      'Pending',
                    ] as CallStatus[]
                  ).map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setCallStatus(status)}
                      className={`px-3 py-2 rounded-lg text-xs font-medium border text-center transition-all ${
                        callStatus === status
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              {/* Call Result */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                  Call Result Summary <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Alumni is working at Red Chillies VFX, discussed referral program"
                  value={callResult}
                  onChange={(e) => setCallResult(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              {/* Remark and Next Followup */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                    Remark / Notes
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Detailed conversation notes..."
                    value={remark}
                    onChange={(e) => setRemark(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                    Next Follow-up Date
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="date"
                      value={nextFollowup}
                      onChange={(e) => setNextFollowup(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Leave blank if no further follow-up required.
                  </p>
                </div>
              </div>

              {/* Reference Collection Workflow (If Connected) */}
              {callStatus === 'Connected' && (
                <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wide">
                        Did the alumni provide a reference?
                      </h4>
                      <p className="text-[11px] text-indigo-700">
                        Collect sibling, friend, or relative reference for admission
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setProvidedReference('Yes')}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                          providedReference === 'Yes'
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => setProvidedReference('No')}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                          providedReference === 'No'
                            ? 'bg-slate-700 text-white shadow-xs'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        No
                      </button>
                    </div>
                  </div>

                  {providedReference === 'Yes' && (
                    <div className="pt-3 border-t border-indigo-200/60 space-y-3">
                      {/* Sub-options: Manual vs Link */}
                      <div className="flex gap-2 bg-white p-1 rounded-lg border border-indigo-100 text-xs">
                        <button
                          type="button"
                          onClick={() => setReferenceMode('manual')}
                          className={`flex-1 py-1.5 rounded text-center font-semibold transition-all ${
                            referenceMode === 'manual'
                              ? 'bg-indigo-600 text-white'
                              : 'text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          1. Enter Reference Manually
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setReferenceMode('link');
                            if (!generatedLink) handleGenerateLink();
                          }}
                          className={`flex-1 py-1.5 rounded text-center font-semibold transition-all ${
                            referenceMode === 'link'
                              ? 'bg-indigo-600 text-white'
                              : 'text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          2. Generate & Send Form Link
                        </button>
                      </div>

                      {/* Option 1: Manual Reference Entry */}
                      {referenceMode === 'manual' && (
                        <div className="space-y-3 bg-white p-4 rounded-lg border border-slate-200">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                Reference Name <span className="text-rose-500">*</span>
                              </label>
                              <input
                                type="text"
                                placeholder="Student full name"
                                value={refName}
                                onChange={(e) => setRefName(e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                Mobile Number <span className="text-rose-500">*</span>
                              </label>
                              <input
                                type="tel"
                                placeholder="+91 98765 43210"
                                value={refMobile}
                                onChange={(e) => setRefMobile(e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                Email Address
                              </label>
                              <input
                                type="email"
                                placeholder="student@gmail.com"
                                value={refEmail}
                                onChange={(e) => setRefEmail(e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                Relation to Alumni
                              </label>
                              <select
                                value={refRelation}
                                onChange={(e) => setRefRelation(e.target.value as RelationType)}
                                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                              >
                                <option value="Brother">Brother</option>
                                <option value="Sister">Sister</option>
                                <option value="Friend">Friend</option>
                                <option value="Relative">Relative</option>
                                <option value="Parent">Parent</option>
                                <option value="Other">Other</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                Course Interest
                              </label>
                              <select
                                value={refCourse}
                                onChange={(e) => setRefCourse(e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                              >
                                <option value="B.Sc Sound Engineering">B.Sc Sound Engineering</option>
                                <option value="B.Sc VFX & Animation">B.Sc VFX & Animation</option>
                                <option value="B.Sc Game Art & Design">B.Sc Game Art & Design</option>
                                <option value="Diploma in Filmmaking">Diploma in Filmmaking</option>
                                <option value="B.Sc Media & Communication">B.Sc Media & Communication</option>
                                <option value="Photography & Cinematography">Photography & Cinematography</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                Preferred Contact Time
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. 3 PM - 6 PM"
                                value={refTime}
                                onChange={(e) => setRefTime(e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              Reference Remark
                            </label>
                            <input
                              type="text"
                              placeholder="Notes on background, hobbies, or interest..."
                              value={refRemark}
                              onChange={(e) => setRefRemark(e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                          <p className="text-[10px] text-indigo-700 flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            This will automatically create a new Admission Lead and link Source Alumni ({alumni.name}).
                          </p>
                        </div>
                      )}

                      {/* Option 2: Generate & Send Reference Link */}
                      {referenceMode === 'link' && (
                        <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-3">
                          <p className="text-xs text-slate-600">
                            A unique secure token is created specifically for <b>{alumni.name}</b> (
                            {alumni.id}) and you (<b>{scName}</b>). The alumni or prospect does not
                            need to type your credentials.
                          </p>

                          {!generatedLink ? (
                            <button
                              type="button"
                              onClick={handleGenerateLink}
                              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2"
                            >
                              <Share2 className="w-4 h-4" />
                              <span>Generate Public Reference Form Link</span>
                            </button>
                          ) : (
                            <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  readOnly
                                  value={generatedLink}
                                  className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700 font-mono select-all"
                                />
                                <button
                                  type="button"
                                  onClick={handleCopyLink}
                                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium flex items-center gap-1.5 border border-slate-200"
                                >
                                  {copiedLink ? (
                                    <>
                                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                                      <span className="text-emerald-700">Copied</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3.5 h-3.5" />
                                      <span>Copy</span>
                                    </>
                                  )}
                                </button>
                              </div>

                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={handleShareWhatsApp}
                                  className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs"
                                >
                                  <MessageCircle className="w-3.5 h-3.5 fill-current" />
                                  <span>WhatsApp Now (Send Referral Link)</span>
                                </button>
                                <a
                                  href={generatedLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium flex items-center justify-center border border-slate-200"
                                >
                                  Open Link ↗
                                </a>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <span>Saving...</span>
                  ) : (
                    <>
                      <PhoneCall className="w-4 h-4" />
                      <span>Save Call Record</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* Tab 2: Call History List */
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Complete history of calls logged with this alumni (Never overwritten)</span>
                <span className="font-semibold text-slate-700">{callLogs.length} total call(s)</span>
              </div>

              {callLogs.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                  <PhoneCall className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-500 font-medium">No previous calls logged yet.</p>
                  <p className="text-[11px] text-slate-400">
                    Switch to the Call Logging tab to record the first conversation.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {callLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              log.callStatus === 'Connected'
                                ? 'bg-emerald-100 text-emerald-800'
                                : log.callStatus === 'Callback'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-200 text-slate-800'
                            }`}
                          >
                            {log.callStatus}
                          </span>
                          <span className="font-semibold text-slate-800">{log.scName}</span>
                          <span className="text-[10px] text-slate-400 font-mono">({log.id})</span>
                        </div>
                        <span className="text-slate-500 text-[11px]">
                          {new Date(log.callDate).toLocaleString()}
                        </span>
                      </div>

                      {log.callResult && (
                        <p className="text-slate-700 font-medium">{log.callResult}</p>
                      )}

                      {log.remark && (
                        <p className="text-slate-500 text-[11px]">Remark: {log.remark}</p>
                      )}

                      {log.nextFollowup && (
                        <div className="flex items-center gap-1 text-[11px] text-indigo-600 font-medium pt-1">
                          <Clock className="w-3 h-3" />
                          <span>Next Follow-up scheduled: {log.nextFollowup}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
