import React from 'react';
import { Tenant } from '../types';
import { Bot, Sparkles, LogOut, Check, RefreshCw, Globe } from 'lucide-react';
import { User } from 'firebase/auth';
import { useLanguage, LanguageType } from '../LanguageContext';

interface SaasHeaderProps {
  tenants: Tenant[];
  selectedTenant: Tenant;
  onSelectTenant: (tenant: Tenant) => void;
  user: User | null;
  needsAuth: boolean;
  onLogin: () => void;
  onLogout: () => void;
  isSyncingCalendar: boolean;
  onCalendarSyncRefresh: () => void;
}

export const SaasHeader: React.FC<SaasHeaderProps> = ({
  tenants,
  selectedTenant,
  onSelectTenant,
  user,
  needsAuth,
  onLogin,
  onLogout,
  isSyncingCalendar,
  onCalendarSyncRefresh
}) => {
  const { language, setLanguage, t } = useLanguage();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/5 bg-[#080b12]/95 backdrop-blur-md px-4 sm:px-6 py-3 sm:py-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 shadow-xl">
      {/* Top row on mobile: Logo + Auth info */}
      <div className="flex items-center justify-between gap-4 w-full md:w-auto">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]">
            <Bot className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#05070a] border-2 border-white/10 text-[7px] text-blue-400 font-bold">
              AI
            </span>
          </div>
          <div>
            <h1 className="font-display text-base sm:text-lg font-bold tracking-tight text-white flex items-center">
              OmniBot SaaS <span className="text-blue-400 font-normal text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 ml-1.5 border border-blue-500/20 font-sans font-medium uppercase tracking-wider">{t('enterprise')}</span>
            </h1>
            <p className="text-[10px] sm:text-xs text-slate-400 font-light font-mono leading-none mt-0.5">{t('controlHub')}</p>
          </div>
        </div>

        {/* Small Screen Profile / Auth Button (visible on mobile only) */}
        <div className="flex md:hidden items-center gap-2">
          {user ? (
            <div className="flex items-center gap-2">
              <img
                src={user.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb'}
                alt={user.displayName || 'OAuth User'}
                referrerPolicy="no-referrer"
                className="h-8 w-8 rounded-full border-2 border-blue-500 object-cover shadow-[0_0_8px_rgba(59,130,246,0.5)]"
              />
              <button
                onClick={onLogout}
                title={t('signOut')}
                className="text-red-400 hover:text-red-300 p-1.5 bg-red-400/10 hover:bg-red-550/20 rounded-lg transition-all cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onLogin}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white hover:bg-blue-500 text-xs font-semibold rounded-lg font-sans shadow-[0_0_12px_rgba(37,99,235,0.3)] transition-all cursor-pointer"
            >
              <Sparkles className="h-3 w-3 text-yellow-400 animate-pulse" />
              <span>Connect</span>
            </button>
          )}
        </div>
      </div>

      {/* Center Control Actions: Tenant & Language Selectors */}
      <div className="flex items-center gap-3 sm:gap-4 flex-wrap md:flex-nowrap w-full md:w-auto">
        {/* Tenant selector */}
        <div className="flex items-center gap-2 flex-1 md:flex-none">
          <span className="text-xs font-mono text-slate-400 uppercase tracking-wider hidden sm:inline md:hidden lg:inline">{t('activeTenant')}:</span>
          <div className="relative flex-1 md:flex-none">
            <select
              id="tenant-select"
              value={selectedTenant.id}
              onChange={(e) => {
                const selected = tenants.find(t => t.id === e.target.value);
                if (selected) onSelectTenant(selected);
              }}
              className="appearance-none bg-[#0d121d] hover:bg-white/5 text-slate-100 font-sans text-sm font-semibold py-1.5 pl-3 pr-8 rounded-lg border border-white/5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all animate-fade-in w-full md:w-auto"
            >
              {tenants.map(t => (
                <option key={t.id} value={t.id} className="bg-[#0d121d] text-slate-100">
                  {t.avatar} {t.name}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
              <svg className="stroke-current h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Language selector */}
        <div className="flex items-center gap-2 flex-1 md:flex-none">
          <Globe className="h-4 w-4 text-blue-400 shrink-0" />
          <div className="relative flex-1 md:flex-none">
            <select
              id="platform-language-select"
              value={language}
              onChange={(e) => setLanguage(e.target.value as LanguageType)}
              className="appearance-none bg-[#0d121d] hover:bg-white/5 text-slate-100 font-sans text-sm font-semibold py-1.5 pl-3 pr-8 rounded-lg border border-white/5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono w-full md:w-auto"
            >
              <option value="en" className="bg-[#0d121d]">🇺🇸 English</option>
              <option value="fr" className="bg-[#0d121d]">🇫🇷 Français</option>
              <option value="ar" className="bg-[#0d121d]">🇸🇦 العربية</option>
              <option value="derja" className="bg-[#0d121d]">🇹🇳 درجة تونسية</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
              <svg className="stroke-current h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Google Profile & Calendar Connection Status */}
      <div className="hidden md:flex items-center gap-4 shrink-0">
        {user ? (
          <div className="flex items-center gap-3">
            {/* Google Calendar Connection Banner */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-400 text-xs rounded-full border border-emerald-500/20 font-medium">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
              <span className="font-mono text-[10px] uppercase tracking-wide">{t('calendarLive')}</span>
              <button
                onClick={onCalendarSyncRefresh}
                title="Refresh Calendar"
                className={`ml-1 hover:text-emerald-300 transition-colors cursor-pointer ${isSyncingCalendar ? 'animate-spin' : ''}`}
                id="refresh-calendar-btn"
              >
                <RefreshCw className="h-3 w-3" />
              </button>
            </div>

            {/* Google Profile avatar */}
            <div className="flex items-center gap-2 pl-2 border-l border-white/10">
              <img
                src={user.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb'}
                alt={user.displayName || 'OAuth User'}
                referrerPolicy="no-referrer"
                className="h-8 w-8 rounded-full border-2 border-blue-500 object-cover shadow-[0_0_8px_rgba(59,130,246,0.5)]"
              />
              <div className="leading-3">
                <p className="text-xs font-semibold text-slate-200">{user.displayName}</p>
                <button
                  onClick={onLogout}
                  className="text-[10px] text-red-400 font-mono hover:underline flex items-center gap-0.5 mt-0.5 cursor-pointer animate-fade-in"
                  id="signout-button"
                >
                  <LogOut className="h-2.5 w-2.5" /> {t('signOut')}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={onLogin}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-blue-600 text-white hover:bg-blue-500 text-xs font-semibold rounded-lg font-sans shadow-[0_0_12px_rgba(37,99,235,0.3)] hover:shadow-blue-500/20 cursor-pointer transition-all border border-blue-500/20"
              id="signin-btn-header"
            >
              <Sparkles className="h-3.5 w-3.5 text-yellow-400 animate-pulse" />
              <span>{t('connectCalendar')}</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
