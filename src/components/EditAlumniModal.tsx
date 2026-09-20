import React, { useState, useEffect } from 'react';
import { X, Edit3, Save, CheckCircle2, AlertCircle } from 'lucide-react';
import { Alumni, CallStatus } from '../types';
import { ApiService } from '../services/api';
import { StorageService } from '../services/storage';
import { useAuth } from '../context/AuthContext';

interface EditAlumniModalProps {
  alumni: Alumni | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const EditAlumniModal: React.FC<EditAlumniModalProps> = ({
  alumni,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { role } = useAuth();
  const activeSCs = StorageService.getSCUsers().filter((s) => s.status === 'Active');

  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [course, setCourse] = useState('');
  const [batch, setBatch] = useState('');
  const [passingYear, setPassingYear] = useState('');
  const [assignedSCId, setAssignedSCId] = useState('');
  const [callStatus, setCallStatus] = useState<CallStatus>('Pending');
  const [nextFollowup, setNextFollowup] = useState('');
  const [remark, setRemark] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    success: boolean;
    text: string;
  } | null>(null);

  useEffect(() => {
    if (alumni && isOpen) {
      setName(alumni.name);
      setMobile(alumni.mobile);
      setEmail(alumni.email || '');
      setCourse(alumni.course);
      setBatch(alumni.batch);
      setPassingYear(alumni.passingYear);
      setAssignedSCId(alumni.assignedSCId);
      setCallStatus(alumni.callStatus);
      setNextFollowup(alumni.nextFollowup || '');
      setRemark(alumni.remark || '');
      setStatusMessage(null);
    }
  }, [alumni, isOpen]);

  if (!isOpen || !alumni) return null;

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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !mobile.trim()) {
      setStatusMessage({ success: false, text: 'Name and mobile number are required.' });
      return;
    }

    setIsSaving(true);
    setStatusMessage(null);

    try {
      const assignedSC = activeSCs.find((s) => s.id === assignedSCId);

      const updates: Partial<Alumni> = {
        name: name.trim(),
        mobile: mobile.trim(),
        email: email.trim(),
        course,
        batch,
        passingYear,
        callStatus,
        nextFollowup,
        remark: remark.trim(),
      };

      if (role === 'ADMIN' && assignedSC) {
        updates.assignedSCId = assignedSC.id;
        updates.assignedSCName = assignedSC.name;
      }

      const res = await ApiService.updateAlumni(alumni.id, updates);

      if (res.success) {
        setStatusMessage({
          success: true,
          text:
            res.source === 'gas'
              ? 'Alumni details successfully updated in Google Sheets!'
              : 'Alumni details updated in local storage.',
        });
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1000);
      } else {
        setStatusMessage({
          success: false,
          text: res.error || 'Failed to update alumni.',
        });
      }
    } catch (err: any) {
      setStatusMessage({
        success: false,
        text: err.message || 'Error occurred while updating alumni.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg border border-indigo-500/30">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Update Alumni Record</h3>
              <p className="text-[11px] text-slate-300">
                Alumni ID: <span className="font-mono text-indigo-300">{alumni.id}</span> • Google Sheets Synced
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
        <form onSubmit={handleSave} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-500 text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Degree / Course
              </label>
              <select
                value={course}
                onChange={(e) => setCourse(e.target.value)}
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Batch
              </label>
              <input
                type="text"
                placeholder="2022-2025"
                value={batch}
                onChange={(e) => setBatch(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-500 text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Passing Year
              </label>
              <input
                type="text"
                placeholder="2025"
                value={passingYear}
                onChange={(e) => setPassingYear(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-500 text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Call Status
              </label>
              <select
                value={callStatus}
                onChange={(e) => setCallStatus(e.target.value as CallStatus)}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-500 text-slate-800"
              >
                <option value="Pending">Pending</option>
                <option value="Connected">Connected</option>
                <option value="No Answer">No Answer</option>
                <option value="Busy">Busy</option>
                <option value="Wrong Number">Wrong Number</option>
                <option value="Callback">Callback</option>
              </select>
            </div>
          </div>

          {role === 'ADMIN' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Assigned Counsellor
              </label>
              <select
                value={assignedSCId}
                onChange={(e) => setAssignedSCId(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-500 text-slate-800"
              >
                {activeSCs.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.id})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Next Follow-up Date
              </label>
              <input
                type="date"
                value={nextFollowup}
                onChange={(e) => setNextFollowup(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-500 text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reference Received Status
              </label>
              <input
                type="text"
                disabled
                value={`${alumni.referenceReceived} (${alumni.referenceCount || 0} references submitted)`}
                className="w-full px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-600 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Remark / Notes
            </label>
            <textarea
              rows={2}
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="Alumni remarks, current employer, preferred contact times..."
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-500 text-slate-800"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Updating Sheets...' : 'Update Alumni'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
