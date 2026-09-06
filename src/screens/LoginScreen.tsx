import React, { useState } from 'react';
import { Eye, EyeOff, ShieldCheck, Zap, ArrowRight, CheckCircle2, AlertCircle, Sparkles, Check, X, FileText, AlertTriangle, Lock } from 'lucide-react';
import { signInWithGoogleReal } from '../lib/firebase';

interface LoginScreenProps {
  onLogin: (userId: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(true);
  const [legalModalType, setLegalModalType] = useState<'terms' | 'risk' | 'privacy' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!agreedToTerms) {
      setErrorMessage('Please read and agree to the User Terms, Risk Disclosure & Privacy Agreement.');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setErrorMessage('Please provide both email and password.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password, agreedToTerms: true }),
      });
      const data = await res.json();
      if (data.success && data.userId) {
        localStorage.setItem('tradexora_user', data.userId);
        localStorage.setItem('tradexora_terms_accepted', 'true');
        onLogin(data.userId);
      } else {
        setErrorMessage(data.message || 'Invalid email or password.');
      }
    } catch (err) {
      setErrorMessage('Network connection error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!agreedToTerms) {
      setErrorMessage('Please accept the User Agreement and Risk Disclosure to register an account.');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setErrorMessage('Please enter email and password.');
      return;
    }
    if (password.length < 4) {
      setErrorMessage('Password must be at least 4 characters long.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          password,
          name: name.trim() || cleanEmail.split('@')[0],
          referralCode: referralCode.trim().toUpperCase(),
          agreedToTerms: true,
        }),
      });
      const data = await res.json();
      if (data.success && data.userId) {
        localStorage.setItem('tradexora_user', data.userId);
        localStorage.setItem('tradexora_terms_accepted', 'true');
        onLogin(data.userId);
      } else {
        setErrorMessage(data.message || 'Account creation failed.');
      }
    } catch (err) {
      setErrorMessage('Server error. Please retry.');
    } finally {
      setIsLoading(false);
    }
  };

  // Trigger Real Google Firebase Sign-In
  const handleRealGoogleSignIn = async () => {
    if (!agreedToTerms) {
      setErrorMessage('Please accept the User Terms, Risk Disclosure & Privacy Agreement to proceed with Google sign in.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await signInWithGoogleReal(referralCode);
      if (res.success && res.email) {
        setSuccessMessage('Google authentication successful! Logging in...');
        localStorage.setItem('tradexora_user', res.email);
        localStorage.setItem('tradexora_terms_accepted', 'true');
        setTimeout(() => {
          onLogin(res.email!);
        }, 400);
      } else {
        setErrorMessage(res.error || 'Google authentication was not completed. Please use Email & Password.');
      }
    } catch (err: any) {
      console.warn("Direct Google sign in error:", err);
      setErrorMessage('Google authentication could not be completed. Please sign in with Email & Password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white font-sans overflow-y-auto no-scrollbar relative">
      {/* Top Brand Header */}
      <div className="pt-[max(env(safe-area-inset-top,0px),20px)] pb-3 px-6 bg-gradient-to-b from-blue-50/60 to-white text-center">
        <div className="w-12 h-12 bg-gradient-to-tr from-[#0088cc] to-emerald-400 rounded-2xl flex items-center justify-center text-white mx-auto mb-2 shadow-md shadow-blue-200">
          <Zap className="w-6 h-6 fill-white" />
        </div>
        <h2 className="text-xl font-bold tracking-tight text-gray-900">
          TradeXora
        </h2>
        <p className="text-[11px] text-gray-500 font-normal mt-0.5">
          Fast Binary Options & Smart Market Trading
        </p>

        {/* Tab Switcher */}
        <div className="flex bg-gray-100 p-1 rounded-full text-xs font-semibold mt-4 max-w-xs mx-auto">
          <button
            type="button"
            onClick={() => {
              setActiveTab('login');
              setErrorMessage(null);
            }}
            className={`flex-1 py-1.5 rounded-full transition-all cursor-pointer ${
              activeTab === 'login'
                ? 'bg-white text-[#0088cc] shadow-xs font-bold'
                : 'text-gray-500 hover:text-gray-700 font-normal'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('register');
              setErrorMessage(null);
            }}
            className={`flex-1 py-1.5 rounded-full transition-all cursor-pointer ${
              activeTab === 'register'
                ? 'bg-white text-[#0088cc] shadow-xs font-bold'
                : 'text-gray-500 hover:text-gray-700 font-normal'
            }`}
          >
            Create Account
          </button>
        </div>
      </div>

      <div className="px-6 py-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-3 bg-red-50 border border-red-200 rounded-xl p-2.5 flex items-start gap-2 text-xs text-red-700 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div className="leading-snug">{errorMessage}</div>
            </div>
          )}

          {/* Success Banner */}
          {successMessage && (
            <div className="mb-3 bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 flex items-start gap-2 text-xs text-emerald-700 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <div className="leading-snug font-semibold">{successMessage}</div>
            </div>
          )}

          {/* Form Fields */}
          <form
            onSubmit={activeTab === 'login' ? handleLogin : handleRegister}
            className="space-y-3"
          >
            {activeTab === 'register' && (
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  username
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="username"
                  className="w-full bg-slate-50/80 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 placeholder:text-gray-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-[#0088cc]/20 focus:border-[#0088cc] transition-all"
                />
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                {activeTab === 'login' ? 'Email or username' : 'Email Address'}
              </label>
              <input
                type={activeTab === 'login' ? 'text' : 'email'}
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={activeTab === 'login' ? 'username or email' : 'name@example.com'}
                className="w-full bg-slate-50/80 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 placeholder:text-gray-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-[#0088cc]/20 focus:border-[#0088cc] transition-all"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50/80 border border-gray-200 rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-gray-900 placeholder:text-gray-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-[#0088cc]/20 focus:border-[#0088cc] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {activeTab === 'register' && (
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  Referral Code (Optional)
                </label>
                <input
                  type="text"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  placeholder="e.g. TRADEX"
                  className="w-full bg-slate-50/80 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 font-mono uppercase placeholder:text-gray-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-[#0088cc]/20 focus:border-[#0088cc] transition-all"
                />
              </div>
            )}

            {/* Legal Agreement & Indemnity Checkbox */}
            <div className="pt-2 pb-1">
              <div className="flex items-start gap-2.5 text-[11px] text-gray-600 leading-snug select-none">
                <button
                  type="button"
                  onClick={() => setAgreedToTerms(!agreedToTerms)}
                  className="mt-0.5 shrink-0 focus:outline-none cursor-pointer"
                >
                  {agreedToTerms ? (
                    <div className="w-4 h-4 rounded-full bg-[#00b067] text-white flex items-center justify-center shadow-xs">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-gray-300 bg-white hover:border-gray-400 transition-colors" />
                  )}
                </button>
                <div className="text-[11px] text-gray-500 flex flex-wrap items-center gap-1">
                  <span>I agree to the</span>
                  <button
                    type="button"
                    onClick={() => setLegalModalType('privacy')}
                    className="font-semibold text-red-500 hover:underline cursor-pointer"
                  >
                    Privacy Agreement
                  </button>
                  <span>,</span>
                  <button
                    type="button"
                    onClick={() => setLegalModalType('terms')}
                    className="font-semibold text-[#0088cc] hover:underline cursor-pointer"
                  >
                    User Terms
                  </button>
                  <span>&</span>
                  <button
                    type="button"
                    onClick={() => setLegalModalType('risk')}
                    className="font-semibold text-amber-600 hover:underline cursor-pointer"
                  >
                    Risk Disclosure
                  </button>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#0088cc] hover:bg-[#0088cc]/90 active:scale-[0.99] text-white font-semibold py-2.5 px-4 rounded-xl text-xs transition-all shadow-md shadow-blue-200 flex items-center justify-center gap-2 cursor-pointer mt-2 disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : activeTab === 'login' ? (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <span>Create Account & Get ₹97</span>
              )}
            </button>
          </form>
        </div>

        {/* Trust Badges */}
        <div className="pt-6 border-t border-gray-100 text-center">
          <div className="flex items-center justify-center gap-4 text-[10px] text-gray-400 font-medium">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#00b067]" /> Firebase Cloud Database
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#0088cc]" /> SSL Encrypted
            </span>
          </div>
        </div>
      </div>

      {/* Legal Agreement Disclosure Modal */}
      {legalModalType && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0088cc] flex items-center justify-center">
                  {legalModalType === 'risk' ? <AlertTriangle className="w-4 h-4 text-amber-500" /> : legalModalType === 'privacy' ? <Lock className="w-4 h-4 text-emerald-500" /> : <FileText className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-900">
                    {legalModalType === 'terms' ? 'User Agreement & Platform Terms' : legalModalType === 'risk' ? 'Financial Risk & Volatility Disclosure' : 'Privacy & Data Security Policy'}
                  </h3>
                  <p className="text-[10px] text-gray-500 font-semibold">Official Legal Disclaimers & Indemnity Agreement</p>
                </div>
              </div>
              <button
                onClick={() => setLegalModalType(null)}
                className="w-8 h-8 rounded-full hover:bg-gray-200/60 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 overflow-y-auto space-y-3.5 text-xs text-gray-600 leading-relaxed no-scrollbar">
              {legalModalType === 'terms' && (
                <>
                  <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3 text-blue-900">
                    <p className="font-bold text-[11px] mb-1">1. Age Eligibility & Legal Capacity (18+ Only)</p>
                    <p className="text-[11px] leading-snug">By creating an account or logging into TradeXora, you solemnly certify and warrant that you are at least 18 years of age and possess full legal capacity to enter into binding agreements.</p>
                  </div>

                  <div>
                    <h4 className="font-bold text-gray-900 text-xs mb-1">2. Discretionary & Independent Trading</h4>
                    <p className="text-[11px]">All market orders, binary options predictions, stake amounts, and timing choices are executed solely at the user's independent discretion. TradeXora acts strictly as an automated software and execution gateway.</p>
                  </div>

                  <div>
                    <h4 className="font-bold text-gray-900 text-xs mb-1">3. Complete Platform Indemnity & Zero Liability</h4>
                    <p className="text-[11px]">Under no circumstances shall TradeXora, its operators, system engineers, developers, or affiliates be liable for any direct, indirect, consequential, or punitive damages, or loss of capital arising from your trading decisions, price slippages, network latency, or market events.</p>
                  </div>

                  <div>
                    <h4 className="font-bold text-gray-900 text-xs mb-1">4. No Financial, Tax, or Investment Advice</h4>
                    <p className="text-[11px]">No content, technical indicators, candlestick charts, or signal indicators provided in this application constitute financial, legal, or investment advice. You bear total responsibility for all profits and losses.</p>
                  </div>
                </>
              )}

              {legalModalType === 'risk' && (
                <>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-950">
                    <p className="font-bold text-[11px] flex items-center gap-1.5 mb-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      HIGH-RISK FINANCIAL WARNING
                    </p>
                    <p className="text-[11px] leading-snug">Fast binary options trading and OTC derivative price movements carry substantial financial risk. You may lose part or all of your deposited funds rapidly during market volatility.</p>
                  </div>

                  <div>
                    <h4 className="font-bold text-gray-900 text-xs mb-1">1. Capital at Risk</h4>
                    <p className="text-[11px]">Do not trade with funds that you cannot afford to lose. Binary options outcomes are time-sensitive and determined by fast-paced real-time tick movements.</p>
                  </div>

                  <div>
                    <h4 className="font-bold text-gray-900 text-xs mb-1">2. User Sole Responsibility</h4>
                    <p className="text-[11px]">You explicitly acknowledge that the platform operator and service providers have no liability for user trading losses or market fluctuations.</p>
                  </div>
                </>
              )}

              {legalModalType === 'privacy' && (
                <>
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-emerald-950">
                    <p className="font-bold text-[11px] flex items-center gap-1.5 mb-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      DATA PRIVACY & ENCRYPTION
                    </p>
                    <p className="text-[11px] leading-snug">We utilize industry-standard 256-bit SSL encryption and Google Firebase database protection to secure your account credentials and transaction records.</p>
                  </div>

                  <div>
                    <h4 className="font-bold text-gray-900 text-xs mb-1">1. User Credentials</h4>
                    <p className="text-[11px]">Your passwords and wallet addresses are stored with cryptographic hashing. We never share user identity or balance details with unauthorized third parties.</p>
                  </div>

                  <div>
                    <h4 className="font-bold text-gray-900 text-xs mb-1">2. Compliance & Safety</h4>
                    <p className="text-[11px]">By registering, you authorize TradeXora to securely process your deposits, withdrawals, and trade verification records.</p>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setAgreedToTerms(true);
                  setLegalModalType(null);
                }}
                className="w-full bg-[#0088cc] hover:bg-[#0088cc]/90 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>I Understand & Agree</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


