import React, { useState } from 'react';
import { 
  Bot, 
  Sparkles, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  Building2, 
  ShieldCheck, 
  ArrowLeft,
  ArrowRight,
  TrendingUp,
  Sliders,
  ChevronRight,
  CheckCircle,
  HelpCircle,
  UserCheck
} from 'lucide-react';

interface SaaSAuthProps {
  initialMode: 'signin' | 'signup';
  onNavigateBack: () => void;
  onLoginSuccess: (email: string, tenantId?: string) => void;
  onSignUpSuccess: (config: {
    companyName: string;
    industry: string;
    botName: string;
    tone: 'professional' | 'friendly' | 'casual' | 'empathetic';
    email: string;
  }) => void;
}

export const SaaSAuth: React.FC<SaaSAuthProps> = ({
  initialMode,
  onNavigateBack,
  onLoginSuccess,
  onSignUpSuccess
}) => {
  // Mode state controls
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  
  // Field Controls
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Sign Up Configs
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('Fitness');
  const [botName, setBotName] = useState('Zenith Master Bot');
  const [botTone, setBotTone] = useState<'professional' | 'friendly' | 'casual' | 'empathetic'>('friendly');

  // Interactive UI logs
  const [errorState, setErrorState] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const clearForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setCompanyName('');
    setBotName('Aura Virtual Assistant');
    setErrorState(null);
  };

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorState('Please enter a valid email and authorization key.');
      return;
    }
    
    // Simulate auth token check
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      onLoginSuccess(email);
    }, 900);
  };

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorState(null);

    // Validation checks
    if (!email.trim()) {
      setErrorState('Please enter a valid email address.');
      return;
    }
    if (password.length < 5) {
      setErrorState('Security key must be at least 5 indices long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorState('Security passwords do not match. Please verify keying.');
      return;
    }
    if (!companyName.trim()) {
      setErrorState('Please specify your SaaS company or practice name.');
      return;
    }
    if (!botName.trim()) {
      setErrorState('Please specify your autonomous virtual representative name.');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      onSignUpSuccess({
        companyName,
        industry,
        botName,
        tone: botTone,
        email
      });
    }, 1100);
  };

  // Switch industries defaults
  const handleIndustryChange = (selected: string) => {
    setIndustry(selected);
    if (selected === 'Fitness') {
      setBotName('Zenith Personal Bot');
      setBotTone('friendly');
    } else if (selected === 'Healthcare') {
      setBotName('CareBot Scheduler');
      setBotTone('empathetic');
    } else if (selected === 'Legal') {
      setBotName('Aurora Docket Counsel');
      setBotTone('professional');
    } else if (selected === 'Custom Shop') {
      setBotName('Smart Shop Butler');
      setBotTone('casual');
    }
  };

  return (
    <div className="min-h-screen bg-[#020509] text-slate-100 flex flex-col justify-center items-center px-4 py-12 relative font-sans">
      {/* Background glow highlights */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-650/5 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-650/5 rounded-full blur-[100px] pointer-events-none"></div>

      {/* Brand logo back header */}
      <button 
        onClick={onNavigateBack}
        className="absolute top-6 left-6 flex items-center gap-1.5 text-xs font-mono font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
        id="auth-back-btn"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>BACK TO PORTAL MAIN</span>
      </button>

      <div className="w-full max-w-lg bg-[#080d17]/80 border border-white/10 rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6 backdrop-blur-lg relative overflow-hidden">
        
        {/* Subtle decorative top ribbon banner */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500"></div>

        {/* Auth title */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400">
            <Bot className="h-6 w-6 animate-pulse" />
          </div>
          <h2 className="text-xl sm:text-2xl font-display font-black text-white tracking-tight">
            {mode === 'signin' ? 'Access OmniBot Workspace' : 'Instantiate Bot Tenant Workspace'}
          </h2>
          <p className="text-xs text-slate-405 font-mono">
            {mode === 'signin' ? 'Verify security session context to enter.' : 'Initialize 1-click cloud-registered tenant workspace.'}
          </p>
        </div>

        {/* Tab Selection toggle */}
        <div className="grid grid-cols-2 bg-[#05080f] p-1 rounded-xl border border-white/5 font-mono text-[11px]">
          <button
            onClick={() => { setMode('signin'); clearForm(); }}
            className={`py-2 rounded-lg font-bold transition-all ${
              mode === 'signin' ? 'bg-blue-650 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            SIGN IN DELEGATE
          </button>
          <button
            onClick={() => { setMode('signup'); clearForm(); }}
            className={`py-2 rounded-lg font-bold transition-all ${
              mode === 'signup' ? 'bg-blue-650 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            SIGN UP COMPANY
          </button>
        </div>

        {/* Active Error view alert */}
        {errorState && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 font-mono flex items-center gap-2">
            <span className="shrink-0 text-rose-500">⚠️</span>
            <span>{errorState}</span>
          </div>
        )}

        {/* FORM MODULE: SIGN IN */}
        {mode === 'signin' && (
          <form onSubmit={handleSignIn} className="space-y-4 font-mono text-xs leading-normal">
            
            <div className="space-y-1">
              <label className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">Email Address:</label>
              <div className="relative">
                <input 
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="e.g., admin@zenithfitness.com"
                  className="w-full bg-[#05080e] border border-white/10 rounded-xl p-3.5 pl-11 text-white focus:outline-none focus:border-blue-500/60"
                  required
                />
                <Mail className="h-4 w-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-slate-445 font-bold uppercase tracking-wider">Security Access Key:</label>
              <div className="relative">
                <input 
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#05080e] border border-white/10 rounded-xl p-3.5 pl-11 pr-11 text-white focus:outline-none focus:border-blue-500/60"
                  required
                />
                <Lock className="h-4 w-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-slate-500 hover:text-slate-350 absolute right-4 top-1/2 -translate-y-1/2"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-550 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold rounded-xl transition-all font-mono text-xs uppercase tracking-wide cursor-pointer flex items-center justify-center gap-2"
              id="signin-submit-btn"
            >
              {isSubmitting ? (
                <span>Verifying credentials...</span>
              ) : (
                <>
                  <span>Unlock Workspace Console</span>
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </button>

            {/* DEMO ACCOUNTS LINK HELPER FOR ZERO FRICTION */}
            <div className="border-t border-white/5 pt-4 space-y-3">
              <div className="text-[9.5px] uppercase text-slate-500 font-bold tracking-wider text-center flex items-center justify-center gap-2">
                <span>OR PREVIEW PLATFORM WITH 1-CLICK DEMO ACCOUNT</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => onLoginSuccess('owner@zenithfitness.com', 'zenith-fitness')}
                  className="p-2 bg-slate-900/40 hover:bg-[#12192b] border border-white/5 rounded-lg text-[10.5px] font-sans font-bold text-blue-300 hover:text-white transition-colors cursor-pointer text-center"
                >
                  💪 Zenith Gym
                </button>
                <button
                  type="button"
                  onClick={() => onLoginSuccess('counsel@auroralegal.com', 'aurora-legal')}
                  className="p-2 bg-slate-900/40 hover:bg-[#12192b] border border-white/5 rounded-lg text-[10.5px] font-sans font-bold text-amber-300 hover:text-white transition-colors cursor-pointer text-center"
                >
                  ⚖️ Aurora Legal
                </button>
                <button
                  type="button"
                  onClick={() => onLoginSuccess('manager@apexauto.com', 'apex-auto')}
                  className="p-2 bg-slate-900/40 hover:bg-[#12192b] border border-white/5 rounded-lg text-[10.5px] font-sans font-bold text-emerald-300 hover:text-white transition-colors cursor-pointer text-center"
                >
                  🚗 Apex Auto
                </button>
              </div>

              {/* HIGHLY VISIBLE SAAS PLATFORM OWNER / SUPER ADMIN PREVIEW ACCESS */}
              <div className="border-t border-purple-500/15 pt-3.5 mt-2 space-y-2">
                <div className="text-[9.5px] uppercase text-purple-400 font-bold tracking-widest text-center flex items-center justify-center gap-1.5 font-mono">
                  <span className="h-1 w-1 bg-purple-400 rounded-full animate-ping"></span>
                  <span>SAAS CORE PLATFORM ADMINISTRATION</span>
                </div>
                <button
                  type="button"
                  onClick={() => onLoginSuccess('owner@saas.com', 'platform-owner-override')}
                  className="w-full py-2.5 bg-gradient-to-r from-purple-950/40 to-indigo-950/45 hover:from-purple-900/35 hover:to-indigo-900/35 border border-purple-500/20 hover:border-purple-500/50 rounded-xl text-[11px] font-sans font-bold text-purple-300 hover:text-white transition-all cursor-pointer text-center flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(168,85,247,0.1)]"
                  id="owner-demo-btn"
                >
                  <ShieldCheck className="h-4 w-4 text-purple-400" />
                  <span>Launch SaaS Owner Control (Super Admin)</span>
                </button>
              </div>
            </div>

          </form>
        )}

        {/* FORM MODULE: SIGN UP */}
        {mode === 'signup' && (
          <form onSubmit={handleSignUp} className="space-y-4 font-mono text-[11px] leading-normal">
            
            {/* Split layout for Email / Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[9.5px] uppercase text-slate-450 font-bold font-mono">Email Address:</label>
                <input 
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="ceo@brand.com"
                  className="w-full bg-[#05080e] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500/60 text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9.5px] uppercase text-slate-455 font-bold font-mono">Admin Password key:</label>
                <input 
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#05080e] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500/60 text-xs"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9.5px] uppercase text-slate-455 font-bold font-mono">Confirm Admin Password:</label>
              <input 
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#05080e] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500/60 text-xs"
                required
              />
            </div>

            {/* Tenant configs */}
            <div className="bg-[#05080f] p-3 border border-white/5 rounded-xl space-y-3">
              <div className="text-[9.5px] font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" />
                <span>Instance Metadata</span>
              </div>

              {/* Company & Industry selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold text-slate-450">Company Name:</label>
                  <input 
                    type="text"
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    placeholder="e.g., Titan Personal Coaching"
                    className="w-full bg-[#0a0d18] border border-white/10 rounded px-2.5 py-1.5 text-white font-sans font-bold text-xs"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold text-slate-450">Category / Vertical:</label>
                  <select 
                    value={industry}
                    onChange={e => handleIndustryChange(e.target.value)}
                    className="w-full bg-[#0a0d18] border border-white/10 rounded px-2.5 py-1.5 text-white text-xs font-sans cursor-pointer focus:outline-none"
                  >
                    <option value="Fitness">💪 Fitness & Coaching</option>
                    <option value="Healthcare">🥼 Clinic & Wellness</option>
                    <option value="Legal">⚖️ Legal & Dossier Practice</option>
                    <option value="Custom Shop">🛒 Custom Workshop / Retail</option>
                  </select>
                </div>
              </div>

              {/* AI Agent Configuration details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold text-slate-455 font-mono">Representative Name:</label>
                  <input 
                    type="text"
                    value={botName}
                    onChange={e => setBotName(e.target.value)}
                    placeholder="e.g., Titan AI Broker"
                    className="w-full bg-[#0a0d18] border border-white/10 rounded px-2.5 py-1.5 text-white font-sans font-bold text-xs"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold text-slate-455 font-mono">Voice & Tone Choice:</label>
                  <select 
                    value={botTone}
                    onChange={e => setBotTone(e.target.value as any)}
                    className="w-full bg-[#0a0d18] border border-white/10 rounded px-2.5 py-1.5 text-white text-xs font-sans cursor-pointer focus:outline-none"
                  >
                    <option value="friendly">😊 Friendly & Conversational</option>
                    <option value="professional">👔 Pristine & Professional</option>
                    <option value="casual">🤙 Casual & Accessible</option>
                    <option value="empathetic">🕊️ Warm & Empathetic</option>
                  </select>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-550 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold rounded-xl transition-all font-mono text-xs uppercase tracking-wide cursor-pointer flex items-center justify-center gap-2"
              id="signup-submit-btn"
            >
              {isSubmitting ? (
                <span>Instantiating Sandbox Ledger...</span>
              ) : (
                <>
                  <span>Create My SaaS Tenant</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        )}

      </div>
    </div>
  );
};
