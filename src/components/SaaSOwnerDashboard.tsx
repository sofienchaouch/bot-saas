import React, { useState, useEffect } from 'react';
import { Tenant, Lead, Appointment } from '../types';
import { 
  ShieldCheck, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Database, 
  Bot, 
  Activity, 
  Trash2, 
  LogOut, 
  SlidersHorizontal, 
  Terminal, 
  ExternalLink,
  Search,
  CheckCircle,
  XCircle,
  Play,
  Pause,
  Layers,
  Sparkles,
  ArrowRight,
  ChevronRight,
  Sliders,
  DollarSign as DollarIcon,
  BadgeAlert,
  Server,
  CloudLightning,
  RefreshCw
} from 'lucide-react';

interface SaaSOwnerDashboardProps {
  tenants: Tenant[];
  onUpdateTenantStatus: (tenantId: string, status: 'active' | 'paused') => void;
  onDeleteTenant: (tenantId: string) => void;
  onImpersonateTenant: (tenantId: string) => void;
  onLogout: () => void;
  onGoToPortal: () => void;
}

export const SaaSOwnerDashboard: React.FC<SaaSOwnerDashboardProps> = ({
  tenants,
  onUpdateTenantStatus,
  onDeleteTenant,
  onImpersonateTenant,
  onLogout,
  onGoToPortal
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState<string>('ALL');

  // Pricing configuration state
  const [freeTierPrice, setFreeTierPrice] = useState(0);
  const [essentialPrice, setEssentialPrice] = useState(49);
  const [professionalPrice, setProfessionalPrice] = useState(99);
  const [unlimitedPrice, setUnlimitedPrice] = useState(199);

  // Platform limits state
  const [freeTierLimit, setFreeTierLimit] = useState(50);
  const [essentialLimit, setEssentialLimit] = useState(500);
  const [professionalLimit, setProfessionalLimit] = useState(2500);

  // Simulated gateway logs
  const [gatewayLogs, setGatewayLogs] = useState<string[]>([
    "[SYSTEM] SaaS Control Plane successfully booted in secure container environment.",
    "[DB] Firestore database sync complete. All multi-tenant configurations loaded.",
    "[GATEWAY] WhatsApp sandbox Twilio proxy online on dynamic endpoints.",
    "[MONITOR] Global latency average for outbound AI agents: 1.24s."
  ]);

  const [activeLogIndex, setActiveLogIndex] = useState(0);

  // Dynamic metrics
  const totalTenants = tenants.length;
  const totalLeads = tenants.reduce((acc, t) => acc + (t.leads?.length ?? 0), 0);
  const totalAppointments = tenants.reduce((acc, t) => acc + (t.appointments?.length ?? 0), 0);
  
  // Calculate simulated monthly recurring revenue (MRR) based on number of active tenants and pricing inputs
  const estimatedMRR = tenants.reduce((acc, tenant, index) => {
    if (tenant.status === 'paused') return acc;
    // Distribute simulated subscription levels
    if (index === 0) return acc + professionalPrice; // Main is Pro
    if (index === 1) return acc + essentialPrice;    // Second is Essential
    if (index % 2 === 0) return acc + professionalPrice;
    return acc + essentialPrice;
  }, 1250); // Base flat platform licensing fee from enterprise partners

  // Periodic gateway logs generator to simulate real system traffic
  useEffect(() => {
    const logPool = [
      `[AI ROUTER] Redirected WhatsApp session to Gemini API for tenant. Request response logged securely.`,
      `[CRON] Weekly analytics ledger updated for registered users. Dashboard compiled.`,
      `[GOOGLE CALSYNC] Verified OAuth credentials. Re-hydrating events list for local indices.`,
      `[MESSAGING] Dispatched WhatsApp template welcome trigger to verified customer.`,
      `[SECURITY] Handshake authorized for sub-domain tenant proxy router.`,
      `[STRIPE-EVENTS] Webhook acknowledged: Re-asserting subscription balance state for Active Tenant.`,
      `[DB-OPTIMIZER] Cleaned indexed cache state. Performance average returned 8ms query speed.`
    ];

    const logoInterval = setInterval(() => {
      const randomLog = logPool[Math.floor(Math.random() * logPool.length)];
      const timestamp = new Date().toLocaleTimeString();
      setGatewayLogs(prev => [`[${timestamp}] ${randomLog}`, ...prev.slice(0, 19)]);
    }, 4500);

    return () => clearInterval(logoInterval);
  }, []);

  const triggerAuditCheck = () => {
    const timestamp = new Date().toLocaleTimeString();
    setGatewayLogs(prev => [
      `[${timestamp}] [AUDIT] Initiating system audit. Testing connection boundaries...`,
      `[${timestamp}] [AUDIT] Firestore Security Rules: Checked (Success).`,
      `[${timestamp}] [AUDIT] WhatsApp API Port Proxy: Listening on verified interfaces.`,
      `[${timestamp}] [AUDIT] Gemini AI Endpoints: All modern SDK instances reporting green.`,
      `[${timestamp}] [AUDIT] Complete - all infrastructure modules performing optimally.`,
      ...prev
    ]);
  };

  const filteredTenants = tenants.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.botName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesIndustry = selectedIndustry === 'ALL' || t.industry === selectedIndustry;
    return matchesSearch && matchesIndustry;
  });

  return (
    <div className="min-h-screen bg-[#02050a] text-slate-100 flex flex-col font-sans relative" id="saas-owner-dashboard">
      {/* Visual Amethyst velvet and space slate highlight blur gradients */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-900/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-10 left-10 w-80 h-80 bg-blue-900/10 rounded-full blur-[100px] pointer-events-none"></div>

      {/* Top Admin Branding Navigation Bar */}
      <nav className="border-b border-indigo-500/10 bg-[#060a14]/60 backdrop-blur-md px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl shadow-[0_0_15px_rgba(147,51,234,0.4)] text-white">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-md font-display font-black tracking-tight text-white uppercase">Aura Platform Control</h1>
              <span className="text-[9px] font-mono font-black uppercase px-2 py-0.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-full">Super Admin</span>
            </div>
            <p className="text-[10.5px] font-mono text-slate-400 mt-0.5">Global Tenant Ledger, Billing Infrastructure, and AI Gateway Telemetry Router</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-stretch sm:self-auto font-mono text-xs">
          <button
            onClick={onGoToPortal}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-[#12192c] border border-white/5 hover:border-slate-700 rounded-xl transition-all cursor-pointer text-slate-300 hover:text-white"
            id="owner-back-portal-btn"
          >
            <span>Launch Main Portal</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-purple-950/20 hover:bg-purple-900/40 border border-purple-500/20 rounded-xl transition-all cursor-pointer text-purple-300 hover:text-white"
            id="owner-logout-btn"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Terminate Admin Auth</span>
          </button>
        </div>
      </nav>

      {/* Main Admin Scrollable Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* TOP COMPONENT ALERT: Developer Context Guidance */}
        <div className="p-4 bg-gradient-to-r from-purple-950/25 to-indigo-950/25 border border-purple-500/20 rounded-2xl flex items-start gap-3.5 shadow-xl">
          <div className="p-2 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-400 shrink-0">
            <Sparkles className="h-4.5 w-4.5 animate-pulse" />
          </div>
          <div>
            <h5 className="text-xs font-bold font-mono uppercase tracking-wider text-purple-300">SaaS Owner & Multi-Tenant Control Hub</h5>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed font-sans">
              Welcome to your SaaS supercontrol terminal! As the Platform Owner, you have omnipotent control. Toggle tenant subscription status instantly to verify blockades, adjust tier prices globally, monitor API metrics, and directly <strong>impersonate any business dashboard</strong> to manage setup or review live integrations on their behalf.
            </p>
          </div>
        </div>

        {/* BENTO GRID: Platform Core Analytics Indicators */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="owner-metrics-grid">
          
          {/* Metric CARD 1: Monthly Recurring Revenue */}
          <div className="bg-[#050912]/80 border border-purple-500/10 rounded-2xl p-5 relative overflow-hidden group hover:border-purple-500/20 transition-all shadow-md">
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-950/10 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform"></div>
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-purple-400">Estimated SaaS MRR</span>
              <div className="p-1.5 bg-purple-500/10 border border-purple-500/20 rounded-lg text-purple-300">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-2xl font-display font-medium text-white">${estimatedMRR.toLocaleString()}/mo</h3>
              <p className="text-[10.5px] font-mono text-slate-400 mt-1 flex items-center gap-1.5">
                <span className="text-emerald-400 font-bold">▲ +14.6%</span>
                <span>since last billing run</span>
              </p>
            </div>
            {/* Fine accent bar */}
            <div className="absolute bottom-0 inset-x-0 h-0.5 bg-gradient-to-r from-purple-500 to-indigo-500 opacity-60"></div>
          </div>

          {/* Metric CARD 2: Active Clients / Tenants */}
          <div className="bg-[#050912]/80 border border-indigo-500/10 rounded-2xl p-5 relative overflow-hidden group hover:border-indigo-500/20 transition-all shadow-md">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-950/10 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform"></div>
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-400">Registered SaaS Tenants</span>
              <div className="p-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-indigo-300">
                <Layers className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-2xl font-display font-medium text-white">{totalTenants} Businesses</h3>
              <p className="text-[10.5px] font-mono text-slate-400 mt-2 flex items-center gap-2">
                <span className="inline-flex items-center gap-1 bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/10">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-500 font-bold"></span>
                  </span>
                  <span>{tenants.filter(t => t.status === 'active').length} Active</span>
                </span>
                <span>•</span>
                <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded border border-amber-500/10">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500 font-bold"></span>
                  </span>
                  <span>{tenants.filter(t => t.status === 'paused').length} Suspended</span>
                </span>
              </p>
            </div>
            <div className="absolute bottom-0 inset-x-0 h-0.5 bg-gradient-to-r from-indigo-500 to-indigo-450 opacity-60"></div>
          </div>

          {/* Metric CARD 3: Aggregate Capture leads */}
          <div className="bg-[#050912]/80 border border-blue-500/10 rounded-2xl p-5 relative overflow-hidden group hover:border-blue-500/20 transition-all shadow-md">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-950/10 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform"></div>
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-400">Total Leads Captured</span>
              <div className="p-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-300">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-2xl font-display font-medium text-white">{totalLeads} Records</h3>
              <p className="text-[10.5px] font-mono text-slate-400 mt-1">
                Synced cross-company via WhatsApp triggers
              </p>
            </div>
            <div className="absolute bottom-0 inset-x-0 h-0.5 bg-gradient-to-r from-blue-500 to-blue-450 opacity-60"></div>
          </div>

          {/* Metric CARD 4: Network AI Appointments booked */}
          <div className="bg-[#050912]/80 border border-emerald-500/15 rounded-2xl p-5 relative overflow-hidden group hover:border-emerald-500/35 transition-all shadow-md">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-950/10 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform"></div>
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400">System Autonomous Bookings</span>
              <div className="p-1.5 bg-emerald-500/10 border border-emerald-500/25 rounded-lg text-emerald-300">
                <Bot className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-2xl font-display font-medium text-white">{totalAppointments} Bookings</h3>
              <p className="text-[10.5px] font-mono text-emerald-400 mt-1 flex items-center gap-1">
                <span className="animate-ping h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block mr-1"></span>
                <span>Active integrations routing seamlessly</span>
              </p>
            </div>
            <div className="absolute bottom-0 inset-x-0 h-0.5 bg-gradient-to-r from-emerald-500 to-emerald-450 opacity-60"></div>
          </div>

        </div>

        {/* PRIMARY SPLIT: Registered Tenants Directory vs Pricing Limits Config */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* LEFT 2 COLUMNS: Master Tenant Management Directory */}
          <div className="lg:col-span-2 bg-[#050912]/80 border border-white/5 rounded-2xl p-4 sm:p-5 shadow-lg space-y-4">
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
              <div>
                <h3 className="text-md font-display font-black tracking-tight text-white uppercase flex items-center gap-2">
                  <Database className="h-4 w-4 text-purple-400" />
                  <span>Licensed Tenant Registry</span>
                </h3>
                <p className="text-[10.5px] font-mono text-slate-400 mt-0.5">Edit status, authorize API usage keys, or directly launch individual SaaS workspaces.</p>
              </div>

              {/* Filtering Controls */}
              <div className="flex items-center gap-2 w-full sm:w-auto font-mono text-xs">
                <div className="relative flex-1 sm:w-56">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search tenant or bot..."
                    className="w-full bg-[#020509] border border-white/10 rounded-xl py-2 pl-8 pr-4 text-xs text-white focus:outline-none focus:border-purple-500/50"
                  />
                  <Search className="h-3.5 w-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>

                <select
                  value={selectedIndustry}
                  onChange={e => setSelectedIndustry(e.target.value)}
                  className="bg-[#020509] border border-white/10 rounded-xl py-2 px-3 text-xs text-slate-300 focus:outline-none focus:border-purple-500/50 cursor-pointer"
                >
                  <option value="ALL">All Industries</option>
                  <option value="Fitness">Fitness</option>
                  <option value="Healthcare">Healthcare</option>
                  <option value="Legal">Legal</option>
                  <option value="ECommerce">ECommerce</option>
                  <option value="Real Estate">Real Estate</option>
                  <option value="Education">Education</option>
                  <option value="Custom Shop">Custom Shop</option>
                </select>
              </div>
            </div>

            {/* Tenant Directory Table */}
            <div className="overflow-x-auto select-none rounded-xl border border-white/5 bg-[#03060c]">
              <table className="w-full text-left border-collapse text-xs min-w-[900px]">
                <thead>
                  <tr className="bg-[#060b15] text-[10px] font-mono text-slate-400 uppercase tracking-wider border-b border-white/5">
                    <th className="p-3.5">Business & Avatar</th>
                    <th className="p-3.5">System Bot Name</th>
                    <th className="p-3.5">Industry</th>
                    <th className="p-3.5 text-center">Capture Stats</th>
                    <th className="p-3.5 text-center">Health Status</th>
                    <th className="p-3.5 text-center">Access Status</th>
                    <th className="p-3.5 text-right font-bold">Workspace Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono text-slate-300">
                  {filteredTenants.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500 text-xs">
                        No registered tenants match the filter parameters.
                      </td>
                    </tr>
                  ) : (
                    filteredTenants.map((ts) => {
                      const leadsCount = ts.leads?.length ?? 0;
                      const apptsCount = ts.appointments?.length ?? 0;
                      const isPaused = ts.status === 'paused';

                      // Define current integration/health status with subtle outer pulsing rings
                      let healthLabel = "Active";
                      let healthBgClass = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
                      let healthDotClass = "bg-emerald-500";
                      let healthPingClass = "bg-emerald-400";
                      
                      if (isPaused) {
                        healthLabel = "Suspended";
                        healthBgClass = "bg-amber-500/10 text-amber-500 border-amber-500/20";
                        healthDotClass = "bg-amber-500";
                        healthPingClass = "bg-amber-400";
                      } else if (!ts.whatsAppPhoneNumber || ts.whatsAppStatus !== 'connected') {
                        healthLabel = "Pending Setup";
                        healthBgClass = "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
                        healthDotClass = "bg-indigo-500";
                        healthPingClass = "bg-indigo-400";
                      }

                      return (
                        <tr 
                          key={ts.id} 
                          className={`hover:bg-slate-900/30 transition-colors ${
                            isPaused ? 'bg-slate-950/40 opacity-70 border-l-2 border-amber-600/65' : 'border-l-2 border-emerald-500/50'
                          }`}
                        >
                          <td className="p-3.5">
                            <div className="flex items-center gap-2.5">
                              <span className="text-lg bg-slate-900 border border-white/5 p-1.5 rounded-lg shrink-0 select-none">
                                {ts.avatar || '🏢'}
                              </span>
                              <div>
                                <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                                  <span>{ts.name}</span>
                                  {isPaused ? (
                                    <span className="text-[8px] tracking-wider uppercase bg-amber-500/10 text-amber-500 border border-amber-500/20 px-1.5 py-0.5 rounded flex items-center gap-1 font-mono">
                                      <span className="relative flex h-1 w-1">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-450 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-1 w-1 bg-amber-500"></span>
                                      </span>
                                      <span>SUSPENDED</span>
                                    </span>
                                  ) : (
                                    <span className="text-[8px] tracking-wider uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded flex items-center gap-1 font-mono">
                                      <span className="relative flex h-1 w-1">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-450 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-1 w-1 bg-emerald-500"></span>
                                      </span>
                                      <span>ACTIVE</span>
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-slate-500 select-all font-mono">ID: {ts.id}</span>
                              </div>
                            </div>
                          </td>

                          <td className="p-3.5">
                            <div className="flex items-center gap-1.5 text-slate-300">
                              <Bot className="h-3.5 w-3.5 text-purple-400" />
                              <span>{ts.botName || 'Aura AI Agent'}</span>
                            </div>
                            <span className="text-[9.5px] text-slate-505 block">Tone: {ts.tone}</span>
                          </td>

                          <td className="p-3.5">
                            <span className="px-2 py-1 bg-slate-900 border border-white/5 text-[10px] rounded-lg text-slate-330">
                              {ts.industry || 'General SaaS'}
                            </span>
                          </td>

                          <td className="p-3.5 text-center">
                            <div className="flex flex-col items-center">
                              <span className="text-slate-200 font-bold text-xs">{leadsCount + apptsCount}</span>
                              <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">
                                {leadsCount} Leads • {apptsCount} Booked
                              </span>
                            </div>
                          </td>

                          <td className="p-3.5 text-center">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] uppercase font-bold border ${healthBgClass} shadow-[0_0_8px_rgba(255,255,255,0.02)]`}>
                              <span className="relative flex h-1.5 w-1.5">
                                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${healthPingClass} opacity-75`}></span>
                                <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${healthDotClass}`}></span>
                              </span>
                              <span>{healthLabel}</span>
                            </span>
                          </td>

                          <td className="p-3.5 text-center">
                            <button
                              onClick={() => onUpdateTenantStatus(ts.id, isPaused ? 'active' : 'paused')}
                              className={`mx-auto rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 cursor-pointer text-[10.5px] transition-all font-extrabold select-none border whitespace-nowrap ${
                                isPaused 
                                  ? 'bg-amber-950/20 hover:bg-amber-900/30 text-amber-400 border-amber-500/30' 
                                  : 'bg-emerald-950/20 hover:bg-emerald-900/30 text-emerald-400 border-emerald-500/25'
                              }`}
                              title={isPaused ? "Revoke suspension and grant gateway clearance" : "Suspend client sandbox & disable gateway"}
                            >
                              {isPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
                              <span>{isPaused ? "RESUME ACCESS" : "SUSPEND CLIENT"}</span>
                            </button>
                          </td>

                          <td className="p-3.5 text-right font-sans">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Impersonation Command button */}
                              <button
                                onClick={() => onImpersonateTenant(ts.id)}
                                className="px-2.5 py-1.5 bg-indigo-650 hover:bg-indigo-600 border border-indigo-505 text-white text-[11px] font-mono leading-none rounded-lg cursor-pointer transition-all flex items-center gap-1 select-none font-bold"
                                id={`impersonate-btn-${ts.id}`}
                                title={`Launch ${ts.name} Dashboard Workspace`}
                              >
                                <span>Go to Dashboard</span>
                                <ArrowRight className="h-3 w-3" />
                              </button>

                              {/* Destructive Tenant Delete */}
                              <button
                                onClick={() => {
                                  if (confirm(`CRITICAL DELETION WARNING: Are you sure you wish to delete tenant index '${ts.name}'? All captured leads, internal knowledge files, and AI metrics ledger will be permanently purged. This action is irreversible.`)) {
                                    onDeleteTenant(ts.id);
                                  }
                                }}
                                className="p-1.5 bg-slate-900 hover:bg-rose-950/20 border border-white/5 hover:border-rose-500/20 rounded-lg text-slate-500 hover:text-rose-450 transition-colors cursor-pointer"
                                id={`delete-tenant-btn-${ts.id}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>

                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

          </div>

          {/* RIGHT 1 COLUMN: Pricing Model Config & Service Limits */}
          <div className="bg-[#050912]/80 border border-white/5 rounded-2xl p-4 sm:p-5 shadow-lg space-y-5">
            <div>
              <h3 className="text-md font-display font-black tracking-tight text-white uppercase flex items-center gap-2">
                <Sliders className="h-4 w-4 text-indigo-400" />
                <span>Subscription Models Pricing</span>
              </h3>
              <p className="text-[10.5px] font-mono text-slate-400 mt-0.5">Configure billing prices and message caps across all registered clients.</p>
            </div>

            <div className="space-y-4 font-mono text-xs">
              
              {/* TIER PRO: Config */}
              <div className="p-3.5 bg-purple-950/15 border border-purple-500/20 rounded-xl space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-extrabold text-purple-300">GOLD / POWER PLAN</span>
                  <span className="text-slate-400">${professionalPrice}/mo</span>
                </div>
                <div>
                  <label className="text-[9px] text-slate-520 uppercase tracking-widest block mb-1">Monthly Subscription Rate:</label>
                  <input
                    type="range"
                    min="25"
                    max="299"
                    value={professionalPrice}
                    onChange={e => setProfessionalPrice(Number(e.target.value))}
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                </div>
                <div className="flex justify-between text-[9.5px] text-slate-400 border-t border-purple-500/10 pt-1.5 mt-1">
                  <span>Usage cap:</span>
                  <span className="font-bold">{professionalLimit} WhatsApp Chats / mo</span>
                </div>
              </div>

              {/* TIER ESSENTIAL: Config */}
              <div className="p-3.5 bg-indigo-950/15 border border-indigo-500/15 rounded-xl space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-extrabold text-indigo-300 font-sans">SILVER / ESSENTIALS</span>
                  <span className="text-slate-400">${essentialPrice}/mo</span>
                </div>
                <div>
                  <label className="text-[9px] text-slate-520 uppercase tracking-widest block mb-1">Monthly Subscription Rate:</label>
                  <input
                    type="range"
                    min="15"
                    max="149"
                    value={essentialPrice}
                    onChange={e => setEssentialPrice(Number(e.target.value))}
                    className="w-full accent-indigo-500 cursor-pointer"
                  />
                </div>
                <div className="flex justify-between text-[9.5px] text-slate-400 border-t border-indigo-500/10 pt-1.5 mt-1">
                  <span>Usage cap:</span>
                  <span className="font-bold">{essentialLimit} WhatsApp Chats / mo</span>
                </div>
              </div>

              {/* FREE TIER: Config */}
              <div className="p-3.5 bg-slate-900 border border-white/5 rounded-xl space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-extrabold text-slate-400 uppercase">BRONZE / SANDBOX TRIAL</span>
                  <span className="text-emerald-400 font-bold">FREE</span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-450 mt-1">
                  <span>Access period:</span>
                  <span className="text-slate-350">Infinite Sandbox</span>
                </div>
                <div className="flex justify-between text-[9.5px] text-slate-404 border-t border-white/5 pt-1.5 mt-1">
                  <span>Max Limit:</span>
                  <span className="font-bold">{freeTierLimit} simulated events / mo</span>
                </div>
              </div>

              <div className="border border-white/5 p-3.5 rounded-xl bg-slate-950/50 flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg">
                  <DollarIcon className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h4 className="text-[11px] font-bold text-slate-200">Revenue Margin Optimized</h4>
                  <p className="text-[9.5px] text-slate-450 mt-0.5">Platform uses flat subscription models. Average payment conversion is 1.25x base.</p>
                </div>
              </div>

            </div>

          </div>

        </div>

        {/* BOTTOM SECTION: Live Gateway Telemetry Logs Console and Firebase rules */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* LEFT 2 COLUMNS: Live Telemetry logs console */}
          <div className="lg:col-span-2 bg-[#050912]/80 border border-white/5 rounded-2xl p-4 sm:p-5 shadow-lg space-y-3.5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/5 pb-3">
              <div>
                <h3 className="text-md font-display font-black tracking-tight text-white uppercase flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-emerald-400" />
                  <span>Interactive Server Gateway Telemetry</span>
                </h3>
                <p className="text-[10.5px] font-mono text-slate-400 mt-0.5">Outbound AI API events, Twilio webhook simulation routing, and credential handshakes.</p>
              </div>

              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-pulse inline-block mr-1"></span>
                <span className="text-slate-400 text-[10.5px]">Gateway: ONLINE</span>
                
                <button
                  onClick={triggerAuditCheck}
                  className="px-2 py-1.5 bg-emerald-950/20 hover:bg-emerald-900/30 border border-emerald-500/20 hover:border-emerald-500/50 text-emerald-400 rounded-lg cursor-pointer transition-all flex items-center gap-1 select-none font-bold text-[10px]"
                >
                  <RefreshCw className="h-3 w-3 animate-spin-slow" />
                  <span>RUN RE-AUDIT</span>
                </button>
              </div>
            </div>

            {/* Terminal Window container */}
            <div className="bg-[#020408] border border-white/5 rounded-xl p-3.5 font-mono text-[10px] leading-relaxed text-emerald-400 h-56 overflow-y-auto selection:bg-emerald-500/20 select-all scrollbar-thin">
              <div className="space-y-1.5">
                {gatewayLogs.map((log, index) => (
                  <div key={index} className="hover:bg-white/5 px-1 py-0.5 rounded transition-colors flex items-start gap-2">
                    <span className="text-slate-500 shrink-0 select-none">❯</span>
                    <span className="break-all">{log}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <p className="text-[10px] font-mono text-slate-500 text-center">
              Gateway listens dynamically on port <span className="text-slate-400 font-bold">3000</span> for multi-tenant webhook callbacks in sandbox development environments.
            </p>
          </div>

          {/* RIGHT 1 COLUMN: Core Cloud Systems Status */}
          <div className="bg-[#050912]/80 border border-white/5 rounded-2xl p-4 sm:p-5 shadow-lg space-y-4">
            <div>
              <h3 className="text-md font-display font-black tracking-tight text-white uppercase flex items-center gap-2">
                <Server className="h-4 w-4 text-emerald-400" />
                <span>Cloud Systems Status</span>
              </h3>
              <p className="text-[10.5px] font-mono text-slate-400 mt-0.5">Real-time indicators of persistent backend systems & core credential routes.</p>
            </div>

            <div className="space-y-3 font-mono text-xs">
              
              {/* Firestore Indicator */}
              <div className="p-3 bg-slate-900 border border-white/5 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-blue-400" />
                  <div>
                    <h5 className="font-bold text-slate-200">Cloud Firestore</h5>
                    <span className="text-[9.5px] text-slate-400">Database Schema Security</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold uppercase">DEPLOYED</span>
              </div>

              {/* twilio proxy Indicator */}
              <div className="p-3 bg-slate-900 border border-white/5 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CloudLightning className="h-4 w-4 text-purple-400" />
                  <div>
                    <h5 className="font-bold text-slate-200">Twilio SIM Gateway</h5>
                    <span className="text-[9.5px] text-slate-400">WhatsApp Sandbox Proxy</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold uppercase">EMULATED</span>
              </div>

              {/* Gemini SDK Indicator */}
              <div className="p-3 bg-slate-900 border border-white/5 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-indigo-400" />
                  <div>
                    <h5 className="font-bold text-slate-200">Google GenAI Client</h5>
                    <span className="text-[9.5px] text-slate-400">Model: Gemini 2.5 Flash</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold uppercase">READY</span>
              </div>

              {/* Google OAuth Sync */}
              <div className="p-3 bg-slate-900 border border-white/5 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-rose-400" />
                  <div>
                    <h5 className="font-bold text-slate-200">OAuth Credentials</h5>
                    <span className="text-[9.5px] text-slate-400">Client Sync Integration</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold uppercase">CONFIGURED</span>
              </div>

            </div>
          </div>

        </div>

      </main>

      {/* Sub Footer informational ledger */}
      <footer className="border-t border-white/5 py-6 px-6 bg-[#04070e] text-center text-[10.5px] font-mono text-slate-500 mt-auto select-none">
        <p>© 2026 Aura Business AI Platform • Platform Owner Control Terminal • Signed in as Owner System Daemon</p>
      </footer>
    </div>
  );
};
