import React, { useState } from 'react';
import { X, UserPlus, Send, CheckCircle2, AlertCircle, Building2 } from 'lucide-react';
import { Alumni, LeadStatus, RelationType, SCUser } from '../types';
import { ApiService } from '../services/api';
import { StorageService } from '../services/storage';
import { useAuth } from '../context/AuthContext';

interface CreateLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultAlumniId?: string;
}

export const CreateLeadModal: React.FC<CreateLeadModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultAlumniId,
}) => {
  const { user, role } = useAuth();
  const allAlumni = StorageService.getAlumni();
  const activeSCs = StorageService.getSCUsers().filter((s) => s.status === 'Active');

  const [studentName, setStudentName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [courseInterest, setCourseInterest] = useState('B.Sc Sound Engineering');
  const [relation, setRelation] = useState<RelationType>('Friend');
  const [selectedAlumniId, setSelectedAlumniId] = useState(defaultAlumniId || '');
  const [selectedSCId, setSelectedSCId] = useState(user?.id || (activeSCs[0]?.id ?? 'SC-01'));
  const [leadStatus, setLeadStatus] = useState<LeadStatus>('New');
  const [nextFollowup, setNextFollowup] = useState(
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );
  const [remark, setRemark] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    success: boolean;
    text: string;
  } | null>(null);

  if (!isOpen) return null;

  const courses = [
    'B.Sc Sound Engineering',
    'B.Sc Animation & VFX',
    'B.Sc Game Design & Development',
    'B.Sc Film Making',
    'B.A. Mass Communication & Journalism',
    'Diploma in Music Production',
    'Diploma in Sound Engineering',
    'Diploma in Photography',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim() || !mobile.trim()) {
      setStatusMessage({ success: false, text: 'Please provide student name and mobile number.' });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const counsellor = activeSCs.find((s) => s.id === selectedSCId) || user;
      const refAlumni = allAlumni.find((a) => a.id === selectedAlumniId);

      const res = await ApiService.createLeadLog({
        referenceName: studentName.trim(),
        mobile: mobile.trim(),
        email: email.trim(),
        courseInterest,
        relation,
        sourceAlumniId: refAlumni?.id || '',
        sourceAlumniName: refAlumni?.name || 'Direct / Self',
        sourceAlumniMobile: refAlumni?.mobile,
        scId: counsellor?.id || 'SC-01',
        scName: counsellor?.name || 'Counsellor',
        leadStatus,
        nextFollowup,
        remark: remark.trim() || `New lead registered via admissions management portal`,
      });

      if (res.success) {
        setStatusMessage({
          success: true,
          text:
            res.source === 'gas'
              ? 'Lead successfully logged to Google Sheets and local database!'
              : 'Lead created successfully in local database.',
        });
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1200);
      } else {
        setStatusMessage({
          success: false,
          text: res.error || 'Failed to create lead log.',
        });
      }
    } catch (err: any) {
      setStatusMessage({
        success: false,
        text: err.message || 'An unexpected error occurred while creating lead log.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg border border-indigo-500/30">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Create Admission Lead Log</h3>
              <p className="text-[11px] text-slate-300">
                Direct Google Sheets & Local Pipeline Integration
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {statusMessage && (
            <div
              className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                statusMessage.success
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {statusMessage.success ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Student Info */}
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Candidate / Student Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-500 text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mobile Number *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. +91 98765 43210"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-500 text-slate-800"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="student@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-500 text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Course of Interest *
                </label>
                <select
                  value={courseInterest}
                  onChange={(e) => setCourseInterest(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-500 text-slate-800"
                >
                  {courses.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Reference Attribution */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-indigo-600" />
              <span>Source & Attribution</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Referring Alumni (Optional)
                </label>
                <select
                  value={selectedAlumniId}
                  onChange={(e) => setSelectedAlumniId(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-500 text-slate-800"
                >
                  <option value="">Direct / Self / None</option>
                  {allAlumni.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.course.split(' ')[0]}) - {a.id}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Relation to Alumni
                </label>
                <select
                  value={relation}
                  onChange={(e) => setRelation(e.target.value as RelationType)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-500 text-slate-800"
                >
                  <option value="Friend">Friend</option>
                  <option value="Brother">Brother</option>
                  <option value="Sister">Sister</option>
                  <option value="Relative">Relative</option>
                  <option value="Parent">Parent</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          </div>

          {/* Pipeline Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Assigned Counsellor
              </label>
              {role === 'ADMIN' ? (
                <select
                  value={selectedSCId}
                  onChange={(e) => setSelectedSCId(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-500 text-slate-800"
                >
                  {activeSCs.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  disabled
                  value={user?.name || 'Me'}
                  className="w-full px-2.5 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-600"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Initial Pipeline Stage
              </label>
              <select
                value={leadStatus}
                onChange={(e) => setLeadStatus(e.target.value as LeadStatus)}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-500 text-slate-800"
              >
                <option value="New">New</option>
                <option value="Contacted">Contacted</option>
                <option value="Interested">Interested</option>
                <option value="Follow-up">Follow-up</option>
                <option value="Meeting">Meeting / Counselling</option>
                <option value="Converted">Converted</option>
                <option value="Lost">Lost</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Next Follow-up Date
              </label>
              <input
                type="date"
                value={nextFollowup}
                onChange={(e) => setNextFollowup(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-500 text-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Remark / Initial Notes
            </label>
            <textarea
              rows={2}
              placeholder="Candidate background, current education, career aspirations..."
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-500 text-slate-800"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Logging to Sheets...' : 'Create Lead Log'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
