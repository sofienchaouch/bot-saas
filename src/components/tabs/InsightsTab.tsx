import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSaaS } from '../../context/SaaSContext';
import { useLanguage } from '../../LanguageContext';
import { SaaSCharts } from '../SaaSCharts';
import {
  TrendingUp,
  Smartphone,
  Users,
  Calendar as CalendarIcon,
  BarChart2,
  Loader2,
  Radio,
  CheckCircle2
} from 'lucide-react';

// ─── Analytics types (mirrors server/services/analytics.ts) ──────────────────
interface DailyMetric {
  date: string;
  messagesReceived: number;
  aiReplies: number;
  humanReplies: number;
  newLeads: number;
  appointmentsBooked: number;
  ragUsed: number;
  handoffs: number;
  errors: number;
  avgResponseTimeMs: number;
  p95ResponseTimeMs: number;
}

interface AggregatedAnalytics {
  tenantId: string;
  period: { from: string; to: string; days: number };
  daily: DailyMetric[];
  totals: Omit<DailyMetric, 'date' | 'avgResponseTimeMs' | 'p95ResponseTimeMs'>;
  topCitations: { url: string; count: number }[];
  containmentRate: number;
  conversionRate: number;
}

// ─── Stats Card ───────────────────────────────────────────────────────────────
const StatCard: React.FC<{
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}> = ({ label, value, sub, color = 'text-white' }) => (
  <div className="bg-[#080b12] border border-white/5 rounded-xl p-4 space-y-1">
    <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">{label}</p>
    <p className={`text-2xl font-bold font-mono ${color}`}>{value}</p>
    {sub && <p className="text-[10px] text-slate-500">{sub}</p>}
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────
export const InsightsTab: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const {
    selectedTenant,
    activeAppointments,
    takeoverConvos,
    setSelectedConvoKey
  } = useSaaS();

  const [liveDataMode, setLiveDataMode] = useState(false);
  const [analytics, setAnalytics] = useState<AggregatedAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  useEffect(() => {
    if (!liveDataMode || !selectedTenant) return;
    setAnalyticsLoading(true);
    fetch(`/api/tenant/${selectedTenant.id}/analytics?days=30`)
      .then(r => r.json())
      .then((data: AggregatedAnalytics) => setAnalytics(data))
      .catch(() => setAnalytics(null))
      .finally(() => setAnalyticsLoading(false));
  }, [liveDataMode, selectedTenant]);

  if (!selectedTenant) return null;

  const handleStartSimulator = () => navigate(`/admin/${selectedTenant.id}/simulator`);
  const handleViewAllLeads = () => navigate(`/admin/${selectedTenant.id}/leads`);
  const handleViewCalendar = () => navigate(`/admin/${selectedTenant.id}/calendar`);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-display font-medium tracking-tight text-white">{t('insightsTitle')}</h2>
          <p className="text-xs text-slate-400 font-mono mt-0.5">{t('insightsSub')} ({selectedTenant.name})</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-blue-500/10 px-2.5 py-1 rounded-full font-mono font-medium text-blue-400 border border-blue-500/20 uppercase tracking-widest">
            INDUSTRY: {selectedTenant.industry.toUpperCase()}
          </span>
          {/* Live Data toggle */}
          <button
            onClick={() => setLiveDataMode(v => !v)}
            id="insights-live-data-toggle"
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
              liveDataMode
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_8px_rgba(52,211,153,0.15)]'
                : 'bg-white/5 text-slate-400 border-white/10 hover:border-white/20'
            }`}
          >
            {analyticsLoading
              ? <Loader2 className="h-3 w-3 animate-spin" />
              : liveDataMode
                ? <Radio className="h-3 w-3 animate-pulse" />
                : <BarChart2 className="h-3 w-3" />
            }
            {liveDataMode ? 'Live Data' : 'Simulated Data'}
          </button>
        </div>
      </div>

      {/* Live analytics stats panel */}
      {liveDataMode && analytics && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span className="text-xs font-mono text-emerald-400 font-semibold">
              Live analytics — last {analytics.period.days} days ({analytics.period.from} → {analytics.period.to})
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Messages Received" value={analytics.totals.messagesReceived} color="text-blue-400" />
            <StatCard label="AI Replies" value={analytics.totals.aiReplies} color="text-purple-400" />
            <StatCard label="New Leads" value={analytics.totals.newLeads} color="text-emerald-400" />
            <StatCard label="Appointments" value={analytics.totals.appointmentsBooked} color="text-amber-400" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <StatCard
              label="Bot Containment Rate"
              value={`${analytics.containmentRate}%`}
              sub="% of convos resolved without handoff"
              color={analytics.containmentRate >= 70 ? 'text-emerald-400' : 'text-amber-400'}
            />
            <StatCard
              label="Lead Conversion Rate"
              value={`${analytics.conversionRate}%`}
              sub="leads captured per message"
              color={analytics.conversionRate >= 5 ? 'text-emerald-400' : 'text-slate-300'}
            />
            <StatCard
              label="RAG Queries"
              value={analytics.totals.ragUsed}
              sub="KB documents consulted"
              color="text-sky-400"
            />
          </div>
          {analytics.topCitations.length > 0 && (
            <div className="bg-[#080b12] border border-white/5 rounded-xl p-4 space-y-2">
              <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Top KB Citations</p>
              {analytics.topCitations.slice(0, 5).map(c => (
                <div key={c.url} className="flex items-center justify-between">
                  <span className="text-xs text-slate-300 font-mono truncate max-w-[80%]">{c.url}</span>
                  <span className="text-xs font-bold text-blue-400 font-mono ml-2">{c.count}×</span>
                </div>
              ))}
            </div>
          )}
          {analytics.daily.length === 0 && (
            <div className="text-center py-6 text-slate-500 text-xs font-mono">
              No events recorded yet — send a message via the Simulator or WhatsApp to start tracking.
            </div>
          )}
        </div>
      )}

      {/* Simulator CTA */}
      <div className="border border-white/5 rounded-2xl bg-[#080b12]/50 p-5 flex flex-col md:flex-row items-center gap-5 justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl pointer-events-none"></div>
        <div className="space-y-1 text-center md:text-left z-10">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[10px] uppercase font-bold tracking-wider font-mono bg-blue-500/10 text-blue-400 rounded-full border border-blue-500/20">
            <Smartphone className="h-3 w-3" /> Live simulation sandbox
          </span>
          <h3 className="font-display font-medium text-white text-md pt-1">Simulate interactive WhatsApp chats</h3>
          <p className="text-xs text-slate-400 max-w-lg">
            Enter the integrated smartphone replica to test AI conversational prompts. When the AI agent negotiates a lead or books a slot, your dashboard widgets update instantly in the background.
          </p>
        </div>
        <button
          onClick={handleStartSimulator}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl flex items-center gap-2 text-center shrink-0 cursor-pointer transition-all shadow-[0_0_12px_rgba(37,99,235,0.4)] z-10"
          id="insights-simulator-quick-link"
        >
          <Smartphone className="h-4 w-4" /> Start Live Simulator
        </button>
      </div>

      {/* Charts (always shown using tenant-derived data) */}
      <SaaSCharts
        tenant={selectedTenant}
        onTakeoverConvo={(phone) => {
          const phoneClean = phone.replace(/[-]/g, '');
          const matchKey = Object.keys(takeoverConvos).find(k => k.endsWith(phoneClean) || k.includes(phoneClean) || k.includes(phone));
          navigate(`/admin/${selectedTenant.id}/leads`);
          if (matchKey) {
            setSelectedConvoKey(matchKey);
          } else {
            setSelectedConvoKey(`${selectedTenant.id}_${phone}`);
          }
        }}
      />

      {/* Sub panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
        {/* Recent Leads */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-display font-semibold text-sm text-white uppercase tracking-wider font-mono text-slate-400">
              Captured Leads ({selectedTenant.leads.length})
            </h4>
            <button onClick={handleViewAllLeads} className="text-xs font-semibold text-blue-450 hover:text-blue-300 hover:underline cursor-pointer">View All</button>
          </div>
          {selectedTenant.leads.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-slate-500">
              <Users className="h-8 w-8 mx-auto mb-2 text-slate-600" />
              <p className="text-xs">No leads gathered yet by @{selectedTenant.botName}.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {selectedTenant.leads.map(lead => (
                <div key={lead.id} className="p-3.5 rounded-xl border border-white/5 hover:border-white/10 bg-[#080b12] shadow-sm flex items-center justify-between transition-all">
                  <div className="space-y-0.5">
                    <h5 className="text-xs font-bold text-white">{lead.name}</h5>
                    <p className="text-[10px] text-slate-450 font-mono">{lead.phone} • {lead.email}</p>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded-full border border-blue-500/20 font-bold uppercase">
                    {lead.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Bookings */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-display font-semibold text-sm text-white uppercase tracking-wider font-mono text-slate-400">
              Calendar Agenda ({activeAppointments.length})
            </h4>
            <button onClick={handleViewCalendar} className="text-xs font-semibold text-blue-450 hover:text-blue-300 hover:underline cursor-pointer">View Calendar</button>
          </div>
          {activeAppointments.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-slate-500">
              <CalendarIcon className="h-8 w-8 mx-auto mb-2 text-slate-600" />
              <p className="text-xs">No scheduled activities found in the list.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {activeAppointments.map(appt => {
                const dateObj = new Date(appt.start);
                return (
                  <div key={appt.id} className="p-3.5 rounded-xl border border-white/5 bg-[#080b12] hover:border-white/10 shadow-sm flex items-center gap-3 transition-all">
                    <div className="h-10 w-10 shrink-0 rounded-lg bg-blue-600 text-white flex flex-col items-center justify-center border border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.3)]">
                      <span className="text-[9px] font-bold uppercase font-mono">{dateObj.toLocaleDateString([], { month: 'short' })}</span>
                      <span className="text-sm font-bold font-mono leading-none">{dateObj.getDate()}</span>
                    </div>
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <h6 className="text-xs font-bold text-white truncate">{appt.customerName}</h6>
                      <p className="text-[10px] font-mono text-slate-450">
                        {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {appt.syncedWithGoogle ? 'Google Cal' : 'Sandbox (Offline)'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
