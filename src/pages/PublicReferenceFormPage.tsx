import React, { useState, useEffect } from 'react';
import { useSearchParams, useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  GraduationCap,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Send,
  Phone,
  Mail,
  User,
  Clock,
  BookOpen,
  Building,
  HeartHandshake,
} from 'lucide-react';
import { ApiService } from '../services/api';

interface PublicReferenceFormData {
  referenceName: string;
  mobile: string;
  email: string;
  relation: string;
  courseInterest: string;
  preferredContactTime: string;
  remark: string;
}

export const PublicReferenceFormPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const params = useParams();
  const token = params.token || searchParams.get('token') || '';

  const [loading, setLoading] = useState(true);
  const [tokenData, setTokenData] = useState<{
    valid: boolean;
    sourceAlumniId?: string;
    sourceAlumniName?: string;
    sourceSCId?: string;
    sourceSCName?: string;
    error?: string;
  } | null>(null);

  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [generatedLeadId, setGeneratedLeadId] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PublicReferenceFormData>({
    defaultValues: {
      relation: 'Friend',
      courseInterest: 'B.Sc Sound Engineering',
      preferredContactTime: 'Anytime (10 AM - 6 PM)',
    },
  });

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setTokenData({ valid: false, error: 'No reference token provided.' });
      return;
    }

    const validated = ApiService.validateReferenceToken(token);
    if (validated) {
      setTokenData({
        valid: true,
        sourceAlumniId: validated.sourceAlumniId,
        sourceAlumniName: validated.sourceAlumniName,
        sourceSCId: validated.sourceSCId,
        sourceSCName: validated.sourceSCName,
      });
    } else {
      setTokenData({
        valid: false,
        error: 'The referral token is invalid, expired, or has already been used.',
      });
    }
    setLoading(false);
  }, [token]);

  const onSubmit = async (data: PublicReferenceFormData) => {
    if (!tokenData || !tokenData.valid) return;
    setSubmitting(true);

    try {
      const res = await ApiService.submitPublicReference(token, {
        referenceName: data.referenceName.trim(),
        relation: data.relation,
        mobile: data.mobile.trim(),
        email: data.email?.trim() || '',
        courseInterest: data.courseInterest,
        preferredContactTime: data.preferredContactTime,
        remark: data.remark?.trim() || '',
      });

      if (res.success) {
        setGeneratedLeadId(res.leadId || '');
        setSubmitted(true);
      } else {
        alert(res.message || 'Failed to submit referral.');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred while submitting your reference.');
    } finally {
      setSubmitting(false);
    }
  };

  const courseOptions = [
    'B.Sc Sound Engineering',
    'B.Sc VFX & Animation',
    'B.Sc Game Art & Design',
    'Diploma in Filmmaking',
    'B.Sc Media & Communication',
    'Photography & Cinematography',
    'Music Production & Audio Technology',
    'AR / VR & Interactive Media',
  ];

  const relationOptions = [
    'Friend',
    'Colleague',
    'Family Member',
    'Junior / Schoolmate',
    'Sibling',
    'Relative',
    'Other',
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="text-white text-xs flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          <span>Verifying secure referral link...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 font-sans antialiased">
      {/* Top Brand Bar */}
      <div className="max-w-xl w-full mx-auto flex items-center justify-between pb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-extrabold text-sm sm:text-base tracking-tight text-white uppercase">
              SEAMEDU
            </h1>
            <p className="text-[11px] text-slate-400 font-medium">
              School of Pro-Expressionism • Admissions Referral
            </p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            Official Portal
          </span>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-xl w-full mx-auto bg-white text-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
        {/* If invalid token */}
        {!tokenData?.valid ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-base font-bold text-slate-900">Invalid or Expired Referral Link</h2>
            <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
              This reference token is unrecognized or has expired. Please request a fresh reference link
              from your SEAMEDU alumni contact or Student Counsellor.
            </p>
            <div className="pt-4">
              <Link
                to="/login"
                className="inline-block px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors"
              >
                Go to SEAMEDU Portal Login
              </Link>
            </div>
          </div>
        ) : submitted ? (
          /* Submission Success View */
          <div className="p-8 text-center space-y-5 animate-in fade-in">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900">Thank You for Your Reference!</h2>
              <p className="text-xs text-slate-600 mt-1">
                Your referral has been successfully registered under SEAMEDU Admissions.
              </p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-left text-xs space-y-2 max-w-md mx-auto">
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-slate-500">Lead ID:</span>
                <span className="font-mono font-bold text-indigo-600">{generatedLeadId}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-slate-500">Referred By:</span>
                <span className="font-semibold text-slate-800">
                  {tokenData.sourceAlumniName || 'SEAMEDU Alumni'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Next Step:</span>
                <span className="font-medium text-emerald-700">
                  Our counsellor will connect during the preferred contact window.
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400">
              For any urgent admission assistance, visit seamedu.com or contact our counselling office.
            </p>
          </div>
        ) : (
          /* Active Form */
          <div>
            {/* Header / Intro */}
            <div className="p-6 bg-gradient-to-r from-slate-900 to-indigo-950 text-white border-b border-slate-800">
              <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-1">
                <HeartHandshake className="w-4 h-4" />
                <span>Alumni Referral Program</span>
              </div>
              <h2 className="text-base sm:text-lg font-bold">
                Student Admission Recommendation
              </h2>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Recommended by proud SEAMEDU alumni{' '}
                <span className="font-bold text-amber-300">
                  {tokenData.sourceAlumniName || 'Alumni Partner'}
                </span>
                . Share details of the prospective student below for career counselling and admissions guidance.
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4 text-xs">
              {/* Reference Name */}
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wide mb-1">
                  Prospective Student Name *
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    {...register('referenceName', { required: 'Student name is required' })}
                    placeholder="e.g., Aditya Sharma"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                {errors.referenceName && (
                  <p className="text-[11px] text-rose-500 mt-1">{errors.referenceName.message}</p>
                )}
              </div>

              {/* Mobile & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wide mb-1">
                    Student Mobile Number *
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="tel"
                      {...register('mobile', { required: 'Mobile number is required' })}
                      placeholder="e.g., +91 98765 43210"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  {errors.mobile && (
                    <p className="text-[11px] text-rose-500 mt-1">{errors.mobile.message}</p>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wide mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      {...register('email')}
                      placeholder="e.g., student@gmail.com"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Relation & Course Interest */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wide mb-1">
                    Relationship to Alumni
                  </label>
                  <select
                    {...register('relation')}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-semibold focus:outline-none focus:border-indigo-500"
                  >
                    {relationOptions.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wide mb-1">
                    Course / Field of Interest *
                  </label>
                  <select
                    {...register('courseInterest', { required: true })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-semibold focus:outline-none focus:border-indigo-500 truncate"
                  >
                    {courseOptions.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Preferred Contact Time */}
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wide mb-1">
                  Preferred Contact Window
                </label>
                <div className="relative">
                  <Clock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <select
                    {...register('preferredContactTime')}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Anytime (10 AM - 6 PM)">Anytime (10:00 AM - 6:00 PM)</option>
                    <option value="Morning (10 AM - 1 PM)">Morning (10:00 AM - 1:00 PM)</option>
                    <option value="Afternoon (1 PM - 4 PM)">Afternoon (1:00 PM - 4:00 PM)</option>
                    <option value="Evening (4 PM - 7 PM)">Evening (4:00 PM - 7:00 PM)</option>
                    <option value="Weekend Only">Weekend Only</option>
                  </select>
                </div>
              </div>

              {/* Remark / Notes */}
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wide mb-1">
                  Any specific query or background info?
                </label>
                <textarea
                  {...register('remark')}
                  rows={2}
                  placeholder="e.g., Interested in sound synthesis studio equipment and scholarship information..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              {/* Submit Button */}
              <div className="pt-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submitting ? (
                    <span>Registering Reference...</span>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Submit Reference for Admissions Guidance</span>
                    </>
                  )}
                </button>
              </div>

              <p className="text-[10px] text-slate-400 text-center mt-2">
                By submitting, the prospective candidate consents to receive career counselling and admission information from SEAMEDU.
              </p>
            </form>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="max-w-xl w-full mx-auto pt-6 text-center text-slate-500 text-[11px]">
        © {new Date().getFullYear()} SEAMEDU School of Pro-Expressionism. All rights reserved.
      </div>
    </div>
  );
};
