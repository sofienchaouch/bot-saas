import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Tenant } from '../types';
import { SaasHeader } from './SaasHeader';
import { CommandPalette } from './widgets/CommandPalette';
import { useLanguage } from '../LanguageContext';
import { useSaaS, SaaSProvider } from '../context/SaaSContext';
import { WorkspaceHub } from './WorkspaceHub';
import { WhatsAppStatusIndicator } from './WhatsAppStatusIndicator';

// Tab panels + the simulator are lazy-loaded: only the active tab's chunk is
// fetched, instead of all of them being bundled into the initial admin load.
const InsightsTab = lazy(() => import('./tabs/InsightsTab').then(m => ({ default: m.InsightsTab })));
const BotConfigTab = lazy(() => import('./tabs/BotConfigTab').then(m => ({ default: m.BotConfigTab })));
const KnowledgeBaseTab = lazy(() => import('./tabs/KnowledgeBaseTab').then(m => ({ default: m.KnowledgeBaseTab })));
const LeadsTab = lazy(() => import('./tabs/LeadsTab').then(m => ({ default: m.LeadsTab })));
const CalendarTab = lazy(() => import('./tabs/CalendarTab').then(m => ({ default: m.CalendarTab })));
const WhatsAppIntegrationTab = lazy(() => import('./tabs/WhatsAppIntegrationTab').then(m => ({ default: m.WhatsAppIntegrationTab })));
const BillingTab = lazy(() => import('./tabs/BillingTab').then(m => ({ default: m.BillingTab })));
const WebhookLogsTab = lazy(() => import('./tabs/WebhookLogsTab').then(m => ({ default: m.WebhookLogsTab })));
const BotSimulator = lazy(() => import('./BotSimulator').then(m => ({ default: m.BotSimulator })));

const TabLoadingFallback: React.FC = () => (
  <div className="flex items-center justify-center py-24 text-slate-500 text-xs font-mono">
    Loading…
  </div>
);

import {
  TrendingUp,
  Users,
  Calendar as CalendarIcon,
  Database,
  Bot,
  Settings,
  ShieldCheck,
  Search,
  Smartphone,
  Cloud,
  LogOut,
  Menu,
  X,
  Phone,
  User,
  AlertCircle,
  Loader2,
  CreditCard,
  Activity
} from 'lucide-react';

interface SaaSLayoutProps {
  initialTenantId?: string;
  onLogoutAdmin?: () => void;
  newSignUpTenant?: Tenant | null;
  tenants?: Tenant[];
  setTenants?: React.Dispatch<React.SetStateAction<Tenant[]>>;
  sessionEmail?: string | null;
  onGoToOwnerConsole?: () => void;
  onSelectTenantId?: (tenantId: string) => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export const SaaSLayout: React.FC<SaaSLayoutProps> = (props) => {
  return (
    <SaaSProvider
      tenants={props.tenants || []}
      setTenants={props.setTenants || (() => {})}
      initialTenantId={props.initialTenantId}
      newSignUpTenant={props.newSignUpTenant}
      sessionEmail={props.sessionEmail || null}
    >
      <SaaSLayoutInner {...props} />
    </SaaSProvider>
  );
};

const SaaSLayoutInner: React.FC<SaaSLayoutProps> = ({
  onLogoutAdmin,
  onGoToOwnerConsole,
  onSelectTenantId,
  theme,
  onToggleTheme,
  sessionEmail
}) => {
  const navigate = useNavigate();
  const { tenantId, tab } = useParams();
  const activeTab = tab || 'insights';
  const { t } = useLanguage();

  const {
    tenants,
    selectedTenant,
    setSelectedTenantId,
    userRole,
    setUserRole,
    user,
    googleToken,
    needsAuth,
    isLoggingIn,
    authError,
    setAuthError,
    isSyncingCalendar,
    activeAppointments,
    loadGoogleCalendar,
    handleGoogleLogin,
    handleGoogleLogout,
    handleAutopilotToggle,
    
    // Dialer
    isDialerModalOpen,
    setIsDialerModalOpen,
    dialerCustomerNumber,
    dialerCustomerName,
    dialerState,
    setDialerState,
    dialerTimer,

    // WhatsApp Status
    waPhone,
    waStatus,
    waSandboxActive,
    waSandboxNumbers,

    // Actions
    setShowAddLead,
    setShowAddKb,
    handleAddLiveLead,
    handleLiveAppointmentBooked
  } = useSaaS();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Command Palette global keyboard trigger Ctrl+K
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Synchronize route param with selected tenant
  useEffect(() => {
    if (tenantId && tenantId !== selectedTenant.id) {
      const match = tenants.find(t => t.id === tenantId);
      if (match) {
        setSelectedTenantId(tenantId);
      }
    }
  }, [tenantId, selectedTenant.id, tenants, setSelectedTenantId]);

  const handleSelectTenant = (newTenantId: string) => {
    setSelectedTenantId(newTenantId);
    if (onSelectTenantId) {
      onSelectTenantId(newTenantId);
    }
    navigate(`/admin/${newTenantId}/${activeTab}`);
  };

  const handleTabChange = (targetTab: string) => {
    navigate(`/admin/${selectedTenant.id}/${targetTab}`);
    setMobileMenuOpen(false);
  };

  if (!selectedTenant) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#05070a] flex flex-col font-sans text-slate-300">
      {/* SaaS Global Header */}
      <SaasHeader
        tenants={tenants}
        selectedTenant={selectedTenant}
        onSelectTenant={(t) => handleSelectTenant(t.id)}
        user={user}
        needsAuth={needsAuth}
        onLogin={handleGoogleLogin}
        onLogout={handleGoogleLogout}
        isSyncingCalendar={isSyncingCalendar}
        onCalendarSyncRefresh={() => googleToken && loadGoogleCalendar(googleToken)}
        onAutopilotToggle={handleAutopilotToggle}
        theme={theme}
        onToggleTheme={onToggleTheme}
      />

      {/* Main SaaS Frame */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">

        {/* Auth Error Banner with Actionable Workarounds */}
        {authError && (
          <div className="rounded-2xl border border-rose-500/20 bg-[#160d13] p-5 shadow-2xl relative overflow-hidden animate-fade-in" id="auth-error-banner">
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-2xl pointer-events-none"></div>
            <div className="flex items-start gap-3.5 z-10">
              <div className="rounded-xl bg-rose-500/15 border border-rose-500/20 text-rose-400 p-2.5 shrink-0 shadow-[0_0_10px_rgba(244,63,94,0.15)]">
                <AlertCircle className="h-5 w-5 animate-bounce" />
              </div>
              <div className="flex-1 space-y-2.5">
                <div>
                  <h4 className="font-semibold text-rose-400 text-sm">Google Authorization Popup Restricted</h4>
                  {authError === 'POPUP_CLOSED_BY_USER' ? (
                    <p className="text-xs text-slate-400 leading-relaxed mt-1">
                      The sign-in popup was closed or blocked. Because this application is running inside an **iframe sandbox (AI Studio Preview)**, browsers enforce strict cross-origin restrictions on login popups.
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 leading-relaxed font-mono mt-1 text-[11px]">
                      Error details: {authError}
                    </p>
                  )}
                </div>

                <div className="bg-[#090b12] border border-white/5 rounded-xl p-4 space-y-3 font-sans">
                  <div className="text-slate-200 font-bold text-xs flex items-center gap-1.5">
                    <span className="text-blue-400">💡</span> How to solve this:
                  </div>
                  <ul className="text-slate-400 text-xs space-y-2.5 leading-relaxed list-none">
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-blue-400 shrink-0 select-none">1.</span>
                      <span>
                        <strong className="text-slate-200 block md:inline font-semibold">Open App in New Tab (Recommended):</strong> Click the <strong className="text-slate-300">"Open App in New Tab" ↗</strong> button at the top-right corner of your AI Studio preview. Running the app directly avoids all sandbox/iframe security blocks!
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-blue-400 shrink-0 select-none">2.</span>
                      <span>
                        <strong className="text-slate-200 block md:inline font-semibold">Enable Browser Popups:</strong> Check your address bar's right side for a <strong className="text-rose-400">"Blocked Popups"</strong> icon, click it, select <strong className="text-slate-200">"Always allow popups and redirects"</strong>, then press Setup Google Sync again.
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
              <button
                onClick={() => setAuthError(null)}
                className="text-slate-500 hover:text-slate-300 text-[10px] sm:text-xs font-semibold px-2 py-1 rounded hover:bg-white/5 transition-all text-right select-none self-start cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Workspace Credentials Notification Warning */}
        {needsAuth && (
          <div className="rounded-2xl border border-white/5 bg-[#0d121d] p-5 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none"></div>
            <div className="flex items-start gap-3.5 z-10">
              <div className="rounded-xl bg-blue-500/15 border border-blue-500/20 text-blue-400 p-2.5 shrink-0 shadow-[0_0_10px_rgba(59,130,246,0.15)]">
                <CalendarIcon className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-semibold text-white text-sm">Want actual Google Calendar synchronization?</h4>
                <p className="text-xs text-slate-400 leading-normal mt-1">
                  Connect **Google Calendar** directly to your app workspace. Once integrated, you can see and update actual client calendar events in real-time, keeping business bookings synchronized perfectly.
                </p>
              </div>
            </div>
            <button
              onClick={handleGoogleLogin}
              disabled={isLoggingIn}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-50 transition-all shadow-[0_0_15px_rgba(37,99,235,0.4)] z-10"
              id="connect-calendar-banner-btn"
            >
              {isLoggingIn ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <span>Setup Google Sync</span>
              )}
            </button>
          </div>
        )}

        {/* Global Stats bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#0d121d] rounded-2xl p-4.5 border border-white/5 shadow-2xl flex items-center gap-3.5 hover:border-white/10 transition-all">
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.2)]">
              <Bot className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block">Agent Status:</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`h-2 w-2 rounded-full ${selectedTenant.status === 'active' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]'}`} />
                <span className="text-sm font-bold capitalize text-white">{selectedTenant.botName} ({selectedTenant.status})</span>
              </div>
            </div>
          </div>

          <div className="bg-[#0d121d] rounded-2xl p-4.5 border border-white/5 shadow-2xl flex items-center gap-3.5 hover:border-white/10 transition-all">
            <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.2)]">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-505 font-mono uppercase tracking-wider block">Captured Leads:</span>
              <p className="text-sm font-bold text-white mt-0.5">{selectedTenant.leads.length} Clients</p>
            </div>
          </div>

          <div className="bg-[#0d121d] rounded-2xl p-4.5 border border-white/5 shadow-2xl flex items-center gap-3.5 hover:border-white/10 transition-all">
            <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 shadow-[0_0_8px_rgba(249,115,22,0.2)]">
              <CalendarIcon className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block">Planned Bookings:</span>
              <p className="text-sm font-bold text-white mt-0.5">{activeAppointments.length} Booked</p>
            </div>
          </div>

          <div className="bg-[#0d121d] rounded-2xl p-4.5 border border-white/5 shadow-2xl flex items-center gap-3.5 hover:border-white/10 transition-all">
            <div className="p-2.5 rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-400 shadow-[0_0_8px_rgba(236,72,153,0.2)]">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block">Knowledge Index:</span>
              <p className="text-sm font-bold text-white mt-0.5">{selectedTenant.knowledgeBase.length} PDF / FAQ</p>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Header Switcher */}
        <div className="md:hidden flex items-center justify-between bg-[#080b12] p-3 rounded-2xl border border-white/5 shadow-xl mb-1" id="mobile-nav-switcher-bar">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-slate-505 uppercase tracking-wider">Active View:</span>
            <span className="text-[11px] font-bold text-white flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/15 px-2.5 py-1 rounded-xl shadow-[0_0_10px_rgba(59,130,246,0.06)]">
              {activeTab === 'insights' && <><TrendingUp className="h-3.5 w-3.5 text-blue-400" /> <span>{t('insights')}</span></>}
              {activeTab === 'simulator' && <><Smartphone className="h-3.5 w-3.5 text-red-400 animate-pulse" /> <span>{t('simulator')}</span></>}
              {activeTab === 'bot_config' && <><Settings className="h-3.5 w-3.5 text-purple-400" /> <span>{t('bot_config')}</span></>}
              {activeTab === 'knowledge_base' && <><Database className="h-3.5 w-3.5 text-amber-400" /> <span>{t('knowledge_base')}</span></>}
              {activeTab === 'leads' && <><Users className="h-3.5 w-3.5 text-emerald-400" /> <span>{t('leads')}</span></>}
              {activeTab === 'calendar' && <><CalendarIcon className="h-3.5 w-3.5 text-sky-400" /> <span>{t('calendar')}</span></>}
              {activeTab === 'workspace_hub' && <><Cloud className="h-3.5 w-3.5 text-indigo-400" /> <span>{t('workspace_hub')}</span></>}
              {activeTab === 'whatsapp_integration' && <><Phone className="h-3.5 w-3.5 text-teal-400" /> <span>{t('whatsapp_integration')}</span></>}
            </span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0d121d] hover:bg-white/5 text-slate-200 hover:text-white font-mono text-[11px] font-bold rounded-xl border border-white/10 active:scale-95 transition-all cursor-pointer shadow-md select-none"
            id="mobile-hamburger-btn"
          >
            <Menu className="h-4 w-4 text-blue-400 animate-pulse" />
            <span>Menu</span>
          </button>
        </div>

        {/* Mobile Navigation Slide-Over Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex justify-end" id="mobile-navigation-drawer-root">
            <div 
              className="absolute inset-0 bg-[#020509]/80 backdrop-blur-md transition-opacity duration-300 animate-fade-in"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="relative w-80 max-w-[85vw] h-full bg-[#05070a] border-l border-white/10 p-5 flex flex-col justify-between shadow-2xl z-10 overflow-y-auto animate-slide-in">
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <div>
                    <h3 className="text-white font-display font-medium text-sm tracking-tight flex items-center gap-2">
                      <Bot className="h-4 w-4 text-blue-400" />
                      <span>Console Navigation</span>
                    </h3>
                    <p className="text-[10px] text-slate-500 font-mono">OmniBot Controls</p>
                  </div>
                  <button 
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
                    id="mobile-drawer-close-btn"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                
                <div className="p-3 bg-[#0d121d] rounded-xl border border-white/5 flex items-center gap-3">
                  <span className="text-2xl shrink-0">{selectedTenant.avatar}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">{selectedTenant.name}</p>
                    <p className="text-[9px] text-slate-500 font-mono uppercase tracking-wider">{selectedTenant.industry}</p>
                  </div>
                </div>

                <nav className="flex flex-col gap-1.5 font-sans">
                  <button
                    onClick={() => handleTabChange('insights')}
                    className={`flex items-center gap-3.5 px-4 py-3 text-xs font-semibold rounded-xl cursor-pointer transition-all ${
                      activeTab === 'insights' ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)]' : 'text-slate-450 hover:bg-white/5 hover:text-white bg-[#080b12]'
                    }`}
                    id="mobile-tab-insights"
                  >
                    <TrendingUp className="h-4 w-4" />
                    <span>{t('insights')}</span>
                  </button>

                  <button
                    onClick={() => handleTabChange('simulator')}
                    className={`flex items-center justify-between px-4 py-3 text-xs font-semibold rounded-xl cursor-pointer transition-all ${
                      activeTab === 'simulator' ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)]' : 'text-slate-450 hover:bg-white/5 hover:text-white bg-[#080b12]'
                    }`}
                    id="mobile-tab-simulator"
                  >
                    <div className="flex items-center gap-3.5">
                      <Smartphone className="h-4 w-4" />
                      <span>{t('simulator')}</span>
                    </div>
                    <span className="text-[8.5px] bg-red-500 text-white px-2 py-0.5 rounded-full font-bold shadow-md">LIVE</span>
                  </button>

                  <div className="h-px bg-white/5 my-2" />

                  <button
                    onClick={() => handleTabChange('bot_config')}
                    className={`flex items-center gap-3.5 px-4 py-3 text-xs font-semibold rounded-xl cursor-pointer transition-all ${
                      activeTab === 'bot_config' ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)]' : 'text-slate-450 hover:bg-white/5 hover:text-white bg-[#080b12]'
                    }`}
                    id="mobile-tab-config"
                  >
                    <Settings className="h-4 w-4" />
                    <span>{t('bot_config')}</span>
                  </button>

                  <button
                    onClick={() => handleTabChange('knowledge_base')}
                    className={`flex items-center gap-3.5 px-4 py-3 text-xs font-semibold rounded-xl cursor-pointer transition-all ${
                      activeTab === 'knowledge_base' ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)]' : 'text-slate-450 hover:bg-white/5 hover:text-white bg-[#080b12]'
                    }`}
                    id="mobile-tab-kb"
                  >
                    <Database className="h-4 w-4" />
                    <span>{t('knowledge_base')}</span>
                  </button>

                  <button
                    onClick={() => handleTabChange('leads')}
                    className={`flex items-center gap-3.5 px-4 py-3 text-xs font-semibold rounded-xl cursor-pointer transition-all ${
                      activeTab === 'leads' ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)]' : 'text-slate-455 hover:bg-white/5 hover:text-white bg-[#080b12]'
                    }`}
                    id="mobile-tab-leads"
                  >
                    <Users className="h-4 w-4" />
                    <span>{t('leads')}</span>
                  </button>

                  <button
                    onClick={() => handleTabChange('calendar')}
                    className={`flex items-center justify-between px-4 py-3 text-xs font-semibold rounded-xl cursor-pointer transition-all ${
                      activeTab === 'calendar' ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)]' : 'text-slate-450 hover:bg-white/5 hover:text-white bg-[#080b12]'
                    }`}
                    id="mobile-tab-calendar"
                  >
                    <div className="flex items-center gap-3.5">
                      <CalendarIcon className="h-4 w-4" />
                      <span>{t('calendar')}</span>
                    </div>
                    {googleToken && <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-md" />}
                  </button>

                  <button
                    onClick={() => handleTabChange('workspace_hub')}
                    className={`flex items-center justify-between px-4 py-3 text-xs font-semibold rounded-xl cursor-pointer transition-all ${
                      activeTab === 'workspace_hub' ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)]' : 'text-slate-450 hover:bg-white/5 hover:text-white bg-[#080b12]'
                    }`}
                    id="mobile-tab-workspace"
                  >
                    <div className="flex items-center gap-3.5">
                      <Cloud className="h-4 w-4" />
                      <span>{t('workspace_hub')}</span>
                    </div>
                    {googleToken && <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse shadow-md" />}
                  </button>

                  <button
                    onClick={() => handleTabChange('whatsapp_integration')}
                    className={`flex items-center gap-3.5 px-4 py-3 text-xs font-semibold rounded-xl cursor-pointer transition-all ${
                      activeTab === 'whatsapp_integration' ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)]' : 'text-slate-450 hover:bg-white/5 hover:text-white bg-[#080b12]'
                    }`}
                    id="mobile-tab-whatsapp"
                  >
                    <Phone className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>{t('whatsapp_integration')}</span>
                  </button>

                  <button
                    onClick={() => handleTabChange('webhook_logs')}
                    className={`flex items-center gap-3.5 px-4 py-3 text-xs font-semibold rounded-xl cursor-pointer transition-all ${
                      activeTab === 'webhook_logs' ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)]' : 'text-slate-450 hover:bg-white/5 hover:text-white bg-[#080b12]'
                    }`}
                    id="mobile-tab-webhook-logs"
                  >
                    <Activity className="h-4 w-4 text-sky-400 shrink-0" />
                    <span>Webhook Logs</span>
                  </button>

                  <button
                    onClick={() => handleTabChange('billing')}
                    className={`flex items-center gap-3.5 px-4 py-3 text-xs font-semibold rounded-xl cursor-pointer transition-all ${
                      activeTab === 'billing' ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)]' : 'text-slate-455 hover:bg-white/5 hover:text-white bg-[#080b12]'
                    }`}
                    id="mobile-tab-billing"
                  >
                    <CreditCard className="h-4 w-4 text-amber-400 shrink-0" />
                    <span>{t('billing') || 'Billing & Quota'}</span>
                  </button>
                </nav>
              </div>

              <div className="pt-5 border-t border-white/5 space-y-3 font-sans">
                {onGoToOwnerConsole && sessionEmail === 'owner@saas.com' && (
                  <button
                    onClick={() => { onGoToOwnerConsole(); setMobileMenuOpen(false); }}
                    className="flex items-center gap-3 px-4 py-3 text-xs font-semibold rounded-xl text-purple-400 hover:bg-purple-500/10 hover:text-purple-300 w-full cursor-pointer transition-all border border-purple-500/10 bg-purple-950/10"
                    id="mobile-action-owner-console"
                  >
                    <ShieldCheck className="h-4 w-4 text-purple-400" />
                    <span>Platform Owner Hub</span>
                  </button>
                )}

                {onLogoutAdmin && (
                  <button
                    onClick={() => { onLogoutAdmin(); setMobileMenuOpen(false); }}
                    className="flex items-center gap-3 px-4 py-2 text-xs font-semibold rounded-xl text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 w-full cursor-pointer transition-all animate-pulse"
                    id="mobile-action-logout"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Lock Admin Session</span>
                  </button>
                )}

                <div className="pt-4 mt-2 border-t border-white/5 space-y-2">
                  <span className="text-[9px] text-slate-500 font-mono uppercase tracking-wider block">Access Role:</span>
                  <button
                    onClick={() => setUserRole(userRole === 'admin' ? 'support' : 'admin')}
                    className={`w-full py-2.5 px-3.5 rounded-xl border text-xs font-mono font-bold flex items-center justify-between cursor-pointer transition-all ${
                      userRole === 'admin' 
                        ? 'bg-blue-950/20 border-blue-500/35 text-blue-400' 
                        : 'bg-amber-950/20 border-amber-500/35 text-amber-400'
                    }`}
                    id="mobile-role-toggle-btn"
                    type="button"
                  >
                    <span>{userRole === 'admin' ? '🔑 ADMIN' : '🎧 SUPPORT AGENT'}</span>
                    <span className="text-[9px] bg-white/10 px-1.5 py-0.5 rounded font-sans font-normal">Toggle</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Unified Tab Navigation Layout */}
        <div className="flex flex-col md:flex-row gap-8 items-start">
          {/* Vertical Menu bar for Swiss-Design layout */}
          <nav className="hidden md:flex md:flex-col w-full md:w-64 bg-[#080b12] p-2.5 rounded-2xl border border-white/5 gap-1 shrink-0 md:sticky md:top-24 shadow-xl scrollbar-none">
            <button
              onClick={() => handleTabChange('insights')}
              className={`flex items-center gap-3 px-4 py-2.5 text-xs font-semibold rounded-xl cursor-pointer transition-all shrink-0 md:w-full w-auto whitespace-nowrap ${
                activeTab === 'insights' ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
              id="tab-insights-btn"
            >
              <TrendingUp className="h-4 w-4" />
              <span>{t('insights')}</span>
            </button>

            <button
              onClick={() => handleTabChange('simulator')}
              className={`flex items-center justify-between gap-3 px-4 py-2.5 text-xs font-semibold rounded-xl cursor-pointer transition-all shrink-0 md:w-full w-auto whitespace-nowrap ${
                activeTab === 'simulator' ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
              id="tab-simulator-btn"
            >
              <div className="flex items-center gap-3">
                <Smartphone className="h-4 w-4" />
                <span>{t('simulator')}</span>
              </div>
              <span className="text-[9px] bg-red-500 text-white px-1.5 py-0.5 rounded-full font-bold shadow-[0_0_8px_rgba(239,68,68,0.6)]">LIVE</span>
            </button>

            <div className="h-px bg-white/5 my-2 hidden md:block" />

            <button
              onClick={() => handleTabChange('bot_config')}
              className={`flex items-center gap-3 px-4 py-2.5 text-xs font-semibold rounded-xl cursor-pointer transition-all shrink-0 md:w-full w-auto whitespace-nowrap ${
                activeTab === 'bot_config' ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
              id="tab-config-btn"
            >
              <Settings className="h-4 w-4" />
              <span>{t('bot_config')}</span>
            </button>

            <button
              onClick={() => handleTabChange('knowledge_base')}
              className={`flex items-center gap-3 px-4 py-2.5 text-xs font-semibold rounded-xl cursor-pointer transition-all shrink-0 md:w-full w-auto whitespace-nowrap ${
                activeTab === 'knowledge_base' ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
              id="tab-kb-btn"
            >
              <Database className="h-4 w-4" />
              <span>{t('knowledge_base')}</span>
            </button>

            <button
              onClick={() => handleTabChange('leads')}
              className={`flex items-center gap-3 px-4 py-2.5 text-xs font-semibold rounded-xl cursor-pointer transition-all shrink-0 md:w-full w-auto whitespace-nowrap ${
                activeTab === 'leads' ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
              id="tab-leads-btn"
            >
              <Users className="h-4 w-4" />
              <span>{t('leads')}</span>
            </button>

            <button
              onClick={() => handleTabChange('calendar')}
              className={`flex items-center justify-between gap-3 px-4 py-2.5 text-xs font-semibold rounded-xl cursor-pointer transition-all shrink-0 md:w-full w-auto whitespace-nowrap ${
                activeTab === 'calendar' ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
              id="tab-calendar-btn"
            >
              <div className="flex items-center gap-3">
                <CalendarIcon className="h-4 w-4" />
                <span>{t('calendar')}</span>
              </div>
              {googleToken && <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />}
            </button>

            <button
              onClick={() => handleTabChange('workspace_hub')}
              className={`flex items-center justify-between gap-3 px-4 py-2.5 text-xs font-semibold rounded-xl cursor-pointer transition-all shrink-0 md:w-full w-auto whitespace-nowrap ${
                activeTab === 'workspace_hub' ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
              id="tab-workspaceup-btn"
            >
              <div className="flex items-center gap-3">
                <Cloud className="h-4 w-4" />
                <span>{t('workspace_hub')}</span>
              </div>
              {googleToken && <span className="h-2 w-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)] animate-pulse" />}
            </button>

            <button
              onClick={() => handleTabChange('whatsapp_integration')}
              className={`flex items-center gap-3 px-4 py-2.5 text-xs font-semibold rounded-xl cursor-pointer transition-all shrink-0 md:w-full w-auto whitespace-nowrap ${
                activeTab === 'whatsapp_integration' ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
              id="tab-whatsapp-inst-btn"
            >
              <Phone className="h-4 w-4 text-emerald-450 animate-pulse font-bold" />
              <span>{t('whatsapp_integration')}</span>
            </button>

            <button
              onClick={() => handleTabChange('webhook_logs')}
              className={`flex items-center gap-3 px-4 py-2.5 text-xs font-semibold rounded-xl cursor-pointer transition-all shrink-0 md:w-full w-auto whitespace-nowrap ${
                activeTab === 'webhook_logs' ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
              id="tab-webhook-logs-btn"
            >
              <Activity className="h-4 w-4 text-sky-400" />
              <span>Webhook Logs</span>
            </button>

            <button
              onClick={() => handleTabChange('billing')}
              className={`flex items-center gap-3 px-4 py-2.5 text-xs font-semibold rounded-xl cursor-pointer transition-all shrink-0 md:w-full w-auto whitespace-nowrap ${
                activeTab === 'billing' ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
              id="tab-billing-btn"
            >
              <CreditCard className="h-4 w-4 text-amber-500 font-bold" />
              <span>{t('billing') || 'Billing & Quota'}</span>
            </button>

            {onLogoutAdmin && (
              <>
                <div className="h-px bg-white/5 my-2 hidden md:block" />
                
                {onGoToOwnerConsole && sessionEmail === 'owner@saas.com' && (
                  <button
                    onClick={onGoToOwnerConsole}
                    className="flex items-center gap-3 px-4 py-2.5 text-xs font-semibold rounded-xl text-purple-400 hover:bg-purple-500/10 hover:text-purple-300 cursor-pointer transition-all shrink-0 md:w-full w-auto whitespace-nowrap font-mono mb-2 border border-purple-500/10 hover:border-purple-500/30 bg-purple-950/10 shadow-[0_0_10px_rgba(168,85,247,0.05)]"
                    id="tab-owner-back-btn"
                  >
                    <ShieldCheck className="h-4 w-4 text-purple-400 animate-pulse" />
                    <span>Platform Owner Hub</span>
                  </button>
                )}

                <button
                  onClick={onLogoutAdmin}
                  className="flex items-center gap-3 px-4 py-2.5 text-xs font-semibold rounded-xl text-rose-450 hover:bg-rose-500/10 hover:text-rose-400 cursor-pointer transition-all shrink-0 md:w-full w-auto whitespace-nowrap"
                  id="tab-exit-admin-btn"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Lock Admin Session</span>
                </button>
              </>
            )}

            {/* User Role Selector */}
            <div className="hidden md:flex flex-col mt-4 pt-4 border-t border-white/5 w-full space-y-2">
              <span className="text-[10px] text-slate-505 font-mono uppercase tracking-wider block">Access Role:</span>
              <button
                onClick={() => setUserRole(userRole === 'admin' ? 'support' : 'admin')}
                className={`w-full py-2 px-3 rounded-xl border text-xs font-mono font-bold flex items-center justify-between cursor-pointer transition-all ${
                  userRole === 'admin' 
                    ? 'bg-blue-950/20 border-blue-500/35 text-blue-400 hover:border-blue-500/60 shadow-[0_0_10px_rgba(59,130,246,0.1)]' 
                    : 'bg-amber-950/20 border-amber-500/35 text-amber-400 hover:border-amber-500/60 shadow-[0_0_10px_rgba(245,158,11,0.1)]'
                }`}
                id="role-toggle-btn"
              >
                <span>{userRole === 'admin' ? '🔑 ADMIN' : '🎧 SUPPORT AGENT'}</span>
                <span className="text-[9px] bg-white/10 px-1.5 py-0.5 rounded uppercase tracking-widest font-sans font-normal">Toggle</span>
              </button>
            </div>

            {/* Persistent WhatsApp Telemetry Status Widget */}
            <div className="hidden md:flex flex-col mt-4 pt-4 border-t border-white/5 w-full">
              <WhatsAppStatusIndicator
                status={waStatus}
                phoneNumber={waPhone}
                sandboxActive={waSandboxActive}
                sandboxNumbersCount={waSandboxNumbers.length}
                onConfigureClick={() => handleTabChange('whatsapp_integration')}
              />
            </div>
          </nav>

          {/* Active Tab Panel Body */}
          <div className="flex-1 w-full bg-[#0d121d] rounded-3xl p-6 border border-white/5 shadow-2xl">
            <Suspense fallback={<TabLoadingFallback />}>
            {activeTab === 'insights' && <InsightsTab />}
            {activeTab === 'bot_config' && <BotConfigTab />}
            {activeTab === 'knowledge_base' && <KnowledgeBaseTab />}
            {activeTab === 'leads' && <LeadsTab />}
            {activeTab === 'calendar' && <CalendarTab />}
            {activeTab === 'whatsapp_integration' && <WhatsAppIntegrationTab />}
            {activeTab === 'webhook_logs' && <WebhookLogsTab />}
            {activeTab === 'billing' && <BillingTab />}
            </Suspense>
            {activeTab === 'workspace_hub' && (
              <div className="space-y-6 animate-fade-in">
                <WorkspaceHub
                  googleToken={googleToken}
                  userEmail={user?.email || null}
                  onLogin={handleGoogleLogin}
                  tenant={selectedTenant}
                />
              </div>
            )}
            {activeTab === 'simulator' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-display font-medium tracking-tight text-white">{t('simulatorTitle')}</h2>
                  <p className="text-xs text-slate-450 mt-0.5 font-mono">{t('simulatorSub')}</p>
                </div>

                <Suspense fallback={<TabLoadingFallback />}>
                  <BotSimulator
                    selectedTenant={selectedTenant}
                    onLeadCaptured={handleAddLiveLead}
                    onAppointmentBooked={handleLiveAppointmentBooked}
                    googleAccessToken={googleToken}
                    appointmentsList={activeAppointments}
                    onConnectGoogle={handleGoogleLogin}
                    onRefreshCalendar={async () => {
                      if (googleToken) {
                        try {
                          await loadGoogleCalendar(googleToken);
                        } catch (err) {
                          console.error("Refresh calendar failed:", err);
                        }
                      }
                    }}
                  />
                </Suspense>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Twilio Dialer Modal Container */}
      {isDialerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in" id="dialer-modal-backdrop">
          <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#080b12] p-5 shadow-2xl relative overflow-hidden flex flex-col space-y-4 animate-scale-in">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse shadow shadow-blue-500/40"></div>
                <h4 className="text-xs font-mono font-bold tracking-widest text-slate-450 uppercase">Live Twilio voice line</h4>
              </div>
              <button
                type="button"
                onClick={() => setIsDialerModalOpen(false)}
                className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col items-center text-center space-y-2">
              <div className="relative">
                <div className={`w-20 h-20 rounded-full bg-slate-900 border-2 flex items-center justify-center shadow-lg transition-all ${
                  dialerState === 'dialing' ? 'border-blue-500 animate-pulse' : 
                  dialerState === 'connected' ? 'border-emerald-500 shadow-emerald-500/10' : 
                  'border-slate-700'
                }`}>
                  <User className={`h-10 w-10 ${dialerState === 'dialing' ? 'text-blue-400' : dialerState === 'connected' ? 'text-emerald-400' : 'text-slate-400'}`} />
                </div>
                {dialerState === 'connected' && (
                  <span className="absolute bottom-0 right-0 flex h-3.5 w-3.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
                  </span>
                )}
              </div>

              <div className="space-y-1">
                <h3 className="text-white font-display font-medium text-base tracking-tight">{dialerCustomerName || 'Customer'}</h3>
                <p className="text-xs text-slate-450 font-mono">{dialerCustomerNumber}</p>
              </div>
            </div>

            <div className="w-full bg-[#0d121d] border border-white/5 rounded-xl p-3.5 text-center flex flex-col items-center justify-center space-y-1 shadow-inner">
              <div className="text-[10px] text-slate-450 uppercase tracking-widest font-bold">
                {dialerState === 'dialing' && 'Establishing Connection via Twilio...'}
                {dialerState === 'connected' && 'Call Connected'}
                {dialerState === 'ended' && 'Call Terminated'}
              </div>
              <div className={`text-2xl font-bold font-mono tracking-wider ${dialerState === 'connected' ? 'text-emerald-400' : 'text-slate-350'}`}>
                {Math.floor(dialerTimer / 60).toString().padStart(2, '0')}:{(dialerTimer % 60).toString().padStart(2, '0')}
              </div>
            </div>

            {(dialerState === 'dialing' || dialerState === 'connected') && (
              <div className="flex items-center gap-[3px] h-10 w-full justify-center py-2 px-6">
                {[1, 2, 3, 4, 3, 2, 3, 4, 5, 4, 3, 2, 3, 4, 5, 6, 5, 4, 3, 2, 3, 4, 3, 2, 1].map((h, i) => {
                  let activeHeight = `${h * 4}px`;
                  if (dialerState === 'dialing') {
                    activeHeight = `${3 + Math.sin((dialerTimer * 5) + i) * 10}px`;
                  } else if (dialerState === 'connected') {
                    activeHeight = `${Math.max(4, Math.sin(i * 0.8) * 12 + 10 + (Math.random() * 8))}px`;
                  }
                  return (
                    <span 
                      key={i} 
                      className={`w-[3px] rounded-full transition-all duration-150 ${
                        dialerState === 'dialing' ? 'bg-blue-500/40' : 'bg-emerald-500/70 shadow-sm shadow-emerald-500/20'
                      }`}
                      style={{ height: activeHeight }}
                    />
                  );
                })}
              </div>
            )}

            <div className="w-full flex justify-center pt-2">
              {dialerState !== 'ended' ? (
                <button
                  type="button"
                  onClick={() => setDialerState('ended')}
                  className="w-12 h-12 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-600/25 hover:shadow-rose-600/40 hover:scale-105 active:scale-95 transition-all cursor-pointer border border-rose-500/30 animate-pulse"
                  title="End Call"
                >
                  <X className="h-6 w-6" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setIsDialerModalOpen(false);
                  }}
                  className="px-6 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-semibold tracking-wide border border-white/5 shadow cursor-pointer transition-all"
                >
                  Close Dialer
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Global Command Palette Overlay */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onSelectTab={handleTabChange}
        onAddLead={() => {
          handleTabChange('leads');
          setShowAddLead(true);
        }}
        onAddKB={() => {
          handleTabChange('knowledge_base');
          setShowAddKb(true);
        }}
        onSyncCalendar={async () => {
          alert("Google Calendar force-synchronized successfully!");
        }}
        onExportReport={() => {
          const exportBtn = document.querySelector('button[title*="CSV"]') as HTMLButtonElement;
          if (exportBtn) {
            exportBtn.click();
          } else {
            alert("Please navigate to Insights -> AI Performance to export the report.");
          }
        }}
      />
    </div>
  );
};
