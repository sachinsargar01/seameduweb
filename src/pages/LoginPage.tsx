import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  Lock,
  User,
  ArrowRight,
  ShieldCheck,
  Eye,
  EyeOff,
  AlertCircle,
  ShieldAlert,
  Loader2,
  UserPlus,
  Mail,
  Phone,
  CheckCircle2,
  Key,
} from 'lucide-react';
import { useAuth, LoginResult } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const { login, registerAdmin } = useAuth();
  const navigate = useNavigate();

  // Mode: Sign In or Register New Admin
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER_ADMIN'>('LOGIN');

  // Sign In Form States (Clean, empty defaults - NO auto-login)
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockActive, setCapsLockActive] = useState(false);
  const [loginError, setLoginError] = useState<{ title: string; message: string } | null>(null);
  const [loading, setLoading] = useState(false);

  // Register Admin Form States
  const [regName, setRegName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regMobile, setRegMobile] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regAdminKey, setRegAdminKey] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [regSuccess, setRegSuccess] = useState<string | null>(null);

  // Detect CapsLock for user convenience
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.getModifierState) {
      setCapsLockActive(e.getModifierState('CapsLock'));
    }
  };

  // Secure Login Handler
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const trimmedUser = username.trim();
    const trimmedPass = password.trim();

    if (!trimmedUser) {
      setLoginError({
        title: 'Username Required',
        message: 'Please enter your registered username to sign in.',
      });
      return;
    }

    if (!trimmedPass) {
      setLoginError({
        title: 'Password Required',
        message: 'Please enter your password.',
      });
      return;
    }

    setLoading(true);

    // Simulated short authentication handshake
    await new Promise((res) => setTimeout(res, 200));

    const result: LoginResult = login(trimmedUser, trimmedPass);

    if (result.success) {
      navigate('/dashboard');
    } else {
      if (result.error === 'account_inactive') {
        setLoginError({
          title: 'Account Inactive',
          message:
            result.message ||
            'Your Counsellor account is marked Inactive. Please contact the Main Administrator.',
        });
      } else {
        setLoginError({
          title: 'Authentication Failed',
          message:
            'Invalid username or password. If you are an SC, verify the credentials provided by your Main Admin.',
        });
      }
    }

    setLoading(false);
  };

  // Register Main Admin Handler
  const handleRegisterAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);
    setRegSuccess(null);

    if (!regName.trim() || !regUsername.trim() || !regPassword.trim()) {
      setRegError('Please fill in your Full Name, Username, and Password.');
      return;
    }

    if (regPassword.length < 4) {
      setRegError('Password should be at least 4 characters long.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setRegError('Passwords do not match. Please verify both password fields.');
      return;
    }

    // Optional Master Security Key check (defaults to SEAMEDU2026 or allow if matches)
    const masterKey = 'SEAMEDU2026';
    if (regAdminKey.trim() && regAdminKey.trim().toUpperCase() !== masterKey) {
      setRegError(`Invalid Administrator Passcode. (Institutional Default: ${masterKey})`);
      return;
    }

    setLoading(true);
    await new Promise((res) => setTimeout(res, 250));

    const regResult = registerAdmin({
      name: regName.trim(),
      username: regUsername.trim(),
      email: regEmail.trim() || `${regUsername.toLowerCase()}@seamedu.com`,
      mobile: regMobile.trim(),
      password: regPassword.trim(),
    });

    if (regResult.success) {
      setRegSuccess('Admin account created successfully! Signing in...');
      setTimeout(() => {
        navigate('/dashboard');
      }, 700);
    } else {
      setRegError(regResult.message || 'Failed to register administrator.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 lg:p-8 font-sans antialiased">
      {/* Top Institutional Header */}
      <header className="w-full max-w-4xl mx-auto flex items-center justify-between pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold tracking-wider text-indigo-400 uppercase">
              SEAMEDU
            </span>
            <h1 className="text-base font-extrabold text-white tracking-tight leading-none mt-0.5">
              Admissions Portal & Lead System
            </h1>
            <p className="text-[10px] text-slate-400 italic mt-0.5">"Industry Defined, Future Aligned"</p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-full">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="font-medium text-slate-300">Secure Access Portal</span>
        </div>
      </header>

      {/* Main Authentication Card */}
      <main className="w-full max-w-md mx-auto my-8">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
          {/* Top Banner & Mode Toggle */}
          <div className="p-6 pb-4 bg-gradient-to-b from-slate-800/60 to-slate-900 border-b border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                Institutional Auth
              </span>
              <span className="text-[11px] text-slate-400 font-mono">v2.5 Secure</span>
            </div>

            <h2 className="text-xl font-bold text-white tracking-tight">
              {authMode === 'LOGIN' ? 'Sign In to Portal' : 'Register New Main Admin'}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {authMode === 'LOGIN'
                ? 'Student Counsellors & Admins: Sign in with your assigned credentials.'
                : 'Create a primary management administrator account for this system.'}
            </p>

            {/* Mode Switcher Tabs */}
            <div className="grid grid-cols-2 gap-2 mt-5 p-1 bg-slate-950 rounded-xl border border-slate-800">
              <button
                type="button"
                id="tab-mode-login"
                onClick={() => {
                  setAuthMode('LOGIN');
                  setLoginError(null);
                }}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  authMode === 'LOGIN'
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Portal Sign In</span>
              </button>

              <button
                type="button"
                id="tab-mode-register-admin"
                onClick={() => {
                  setAuthMode('REGISTER_ADMIN');
                  setRegError(null);
                  setRegSuccess(null);
                }}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  authMode === 'REGISTER_ADMIN'
                    ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Register Admin</span>
              </button>
            </div>
          </div>

          {/* ==================================================== */}
          {/* TAB 1: SECURE LOGIN FORM (Empty inputs, No 1-click) */}
          {/* ==================================================== */}
          {authMode === 'LOGIN' && (
            <form onSubmit={handleLoginSubmit} className="p-6 space-y-4">
              {/* Structured Error Banner */}
              {loginError && (
                <div
                  role="alert"
                  className="p-3.5 bg-rose-950/50 border border-rose-800/80 rounded-xl text-rose-200 text-xs space-y-1 animate-in fade-in duration-200"
                >
                  <div className="flex items-center gap-2 font-bold text-rose-300">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{loginError.title}</span>
                  </div>
                  <p className="text-rose-200/90 pl-6 leading-relaxed">{loginError.message}</p>
                </div>
              )}

              {/* Username Input */}
              <div className="space-y-1.5">
                <label
                  htmlFor="login-username"
                  className="block text-xs font-semibold text-slate-300 uppercase tracking-wide"
                >
                  Username
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    id="login-username"
                    type="text"
                    autoComplete="username"
                    required
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      if (loginError) setLoginError(null);
                    }}
                    placeholder="Enter your registered username"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none transition-all"
                  />
                </div>
              </div>

              {/* Password Input with Visibility Toggle */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="login-password"
                    className="block text-xs font-semibold text-slate-300 uppercase tracking-wide"
                  >
                    Password
                  </label>
                  {capsLockActive && (
                    <span className="text-[10px] text-amber-400 font-medium flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3" />
                      Caps Lock is ON
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (loginError) setLoginError(null);
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="Enter your secure password"
                    className="w-full pl-10 pr-11 py-2.5 bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none transition-all"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 p-1 text-slate-400 hover:text-slate-200 rounded-md focus:outline-none transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                id="btn-login-submit"
                disabled={loading}
                className="w-full py-2.5 mt-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Your Dashboard</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>

              {/* Operational Guidance Notes */}
              <div className="pt-4 border-t border-slate-800/80 space-y-2 text-[11px] text-slate-400">
                <div className="flex items-start gap-2 bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold text-slate-300">Role-Based System Access:</p>
                    <p className="text-slate-400 leading-relaxed">
                      • <b>Student Counsellors (SCs):</b> Use the username and password provided to you by your Main Administrator to open your personalized calling desk.
                    </p>
                    <p className="text-slate-400 leading-relaxed">
                      • <b>Administrators:</b> Sign in to manage counsellors, distribute alumni portfolios equally, and oversee system metrics.
                    </p>
                  </div>
                </div>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => setAuthMode('REGISTER_ADMIN')}
                    className="text-xs text-purple-400 hover:text-purple-300 font-semibold underline underline-offset-4"
                  >
                    First time setup? Register a New Main Admin &gt;
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* ==================================================== */}
          {/* TAB 2: REGISTER NEW MAIN ADMIN FORM                 */}
          {/* ==================================================== */}
          {authMode === 'REGISTER_ADMIN' && (
            <form onSubmit={handleRegisterAdminSubmit} className="p-6 space-y-3.5">
              {regError && (
                <div
                  role="alert"
                  className="p-3 bg-rose-950/50 border border-rose-800/80 rounded-xl text-rose-200 text-xs flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{regError}</span>
                </div>
              )}

              {regSuccess && (
                <div
                  role="alert"
                  className="p-3 bg-emerald-950/50 border border-emerald-800/80 rounded-xl text-emerald-200 text-xs flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{regSuccess}</span>
                </div>
              )}

              {/* Full Name */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wide">
                  Admin Full Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="e.g. Dr. Rajesh Sharma"
                    className="w-full pl-10 pr-3.5 py-2 bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Admin Username */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wide">
                  Admin Username *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    placeholder="e.g. admin_rajesh or chief_admin"
                    className="w-full pl-10 pr-3.5 py-2 bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Email & Mobile Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wide">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="admin@seamedu.com"
                      className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wide">
                    Mobile
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="tel"
                      value={regMobile}
                      onChange={(e) => setRegMobile(e.target.value)}
                      placeholder="+91 98200 00000"
                      className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Password & Confirm Password Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wide">
                      Password *
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="text-[10px] text-slate-400 hover:text-slate-200"
                    >
                      {showRegPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Min 4 characters"
                      className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wide">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      required
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                      className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Master Setup Passcode */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wide">
                    Administrator Setup Key (Optional)
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">SEAMEDU2026</span>
                </div>
                <div className="relative">
                  <Key className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    value={regAdminKey}
                    onChange={(e) => setRegAdminKey(e.target.value)}
                    placeholder="Enter SEAMEDU2026 or leave blank"
                    className="w-full pl-10 pr-3.5 py-2 bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Submit Register Button */}
              <button
                type="submit"
                id="btn-register-admin-submit"
                disabled={loading}
                className="w-full py-2.5 mt-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-purple-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Registering Administrator...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Register & Access Executive Admin Desk</span>
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setAuthMode('LOGIN')}
                  className="text-xs text-slate-400 hover:text-slate-200 font-medium"
                >
                  Already have an account? <b>Sign In &gt;</b>
                </button>
              </div>
            </form>
          )}
        </div>
      </main>

      {/* Institutional Footer */}
      <footer className="w-full max-w-4xl mx-auto text-center text-[11px] text-slate-400 space-y-1 pt-4 border-t border-slate-900">
        <p className="font-medium text-slate-300">SEAMEDU • "Industry Defined, Future Aligned"</p>
        <p className="text-slate-500">Enterprise Data Protection, Audit Trail Tracking & Google Sheets Synchronization Active</p>
      </footer>
    </div>
  );
};
