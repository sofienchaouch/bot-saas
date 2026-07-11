import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSaaS } from '../../context/SaaSContext';
import {
  Activity,
  RefreshCw,
  Trash2,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Radio,
  Filter,
  Clock,
  Smartphone,
  MessageSquare,
  Bot,
  Zap,
  Globe,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface WebhookEvent {
  id: string;
  tenantId: string;
  timestamp: string;
  channel: 'whatsapp' | 'messenger' | 'telegram' | 'sms' | 'simulator' | 'widget';
  direction: 'inbound' | 'outbound';
  status: 'success' | 'error';
  durationMs: number;
  payload: unknown;
  errorMessage?: string;
  senderPhone?: string;
  messagePreview?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CHANNEL_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  whatsapp: {
    label: 'WhatsApp',
    color: 'text-green-400 bg-green-500/10 border-green-500/20',
    icon: <Smartphone className="h-3 w-3" />,
  },
  messenger: {
    label: 'Messenger',
    color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    icon: <MessageSquare className="h-3 w-3" />,
  },
  telegram: {
    label: 'Telegram',
    color: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
    icon: <Zap className="h-3 w-3" />,
  },
  sms: {
    label: 'SMS',
    color: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
    icon: <MessageSquare className="h-3 w-3" />,
  },
  widget: {
    label: 'Website Widget',
    color: 'text-teal-400 bg-teal-500/10 border-teal-500/20',
    icon: <Globe className="h-3 w-3" />,
  },
  simulator: {
    label: 'Simulator',
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    icon: <Bot className="h-3 w-3" />,
  },
};

function formatTs(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const StatusBadge: React.FC<{ status: 'success' | 'error' }> = ({ status }) =>
  status === 'success' ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
      <CheckCircle2 className="h-2.5 w-2.5" /> OK
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase bg-red-500/10 text-red-400 border border-red-500/20">
      <XCircle className="h-2.5 w-2.5" /> ERR
    </span>
  );

const DirectionBadge: React.FC<{ direction: 'inbound' | 'outbound' }> = ({ direction }) =>
  direction === 'inbound' ? (
    <span className="inline-flex items-center gap-1 text-[10px] font-mono text-slate-400">
      <ArrowDownLeft className="h-3 w-3 text-blue-400" /> IN
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[10px] font-mono text-slate-400">
      <ArrowUpRight className="h-3 w-3 text-purple-400" /> OUT
    </span>
  );

const JsonViewer: React.FC<{ data: unknown }> = ({ data }) => {
  const formatted = JSON.stringify(data, null, 2);
  return (
    <pre className="text-[11px] font-mono text-slate-300 bg-[#04060d] rounded-xl p-4 overflow-x-auto whitespace-pre-wrap break-all border border-white/5 max-h-64">
      {formatted}
    </pre>
  );
};

const EventRow: React.FC<{ event: WebhookEvent }> = ({ event }) => {
  const [expanded, setExpanded] = useState(false);
  const meta = CHANNEL_META[event.channel] ?? CHANNEL_META.simulator;

  return (
    <div className="border border-white/5 rounded-xl overflow-hidden hover:border-white/10 transition-all">
      {/* Row header */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-[#080b12] hover:bg-[#0d1117] transition-colors text-left"
        id={`webhook-event-row-${event.id}`}
      >
        {/* Timestamp */}
        <div className="shrink-0 w-20 text-right">
          <p className="text-[10px] font-mono text-slate-500">{formatDate(event.timestamp)}</p>
          <p className="text-[11px] font-mono text-slate-300 font-semibold">
            {formatTs(event.timestamp)}
          </p>
        </div>

        {/* Channel badge */}
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono border uppercase shrink-0 ${meta.color}`}
        >
          {meta.icon} {meta.label}
        </span>

        {/* Direction */}
        <DirectionBadge direction={event.direction} />

        {/* Status */}
        <StatusBadge status={event.status} />

        {/* Preview */}
        <p className="flex-1 text-xs text-slate-400 truncate min-w-0">
          {event.messagePreview || event.errorMessage || '—'}
        </p>

        {/* Duration */}
        {event.durationMs > 0 && (
          <span className="flex items-center gap-1 text-[10px] font-mono text-slate-500 shrink-0">
            <Clock className="h-3 w-3" /> {event.durationMs}ms
          </span>
        )}

        {/* Expand icon */}
        {expanded ? (
          <ChevronUp className="h-3.5 w-3.5 text-slate-500 shrink-0" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-slate-500 shrink-0" />
        )}
      </button>

      {/* Expanded payload */}
      {expanded && (
        <div className="px-4 pb-4 pt-2 bg-[#04060d] border-t border-white/5 space-y-2">
          {event.senderPhone && (
            <p className="text-[10px] font-mono text-slate-500">
              Sender: <span className="text-slate-300">{event.senderPhone}</span>
            </p>
          )}
          {event.errorMessage && (
            <p className="text-[10px] font-mono text-red-400">Error: {event.errorMessage}</p>
          )}
          <JsonViewer data={event.payload} />
        </div>
      )}
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

type ChannelFilter = 'all' | 'whatsapp' | 'messenger' | 'telegram' | 'sms' | 'simulator';
type DirectionFilter = 'all' | 'inbound' | 'outbound';
type StatusFilter = 'all' | 'success' | 'error';

export const WebhookLogsTab: React.FC = () => {
  const { selectedTenant } = useSaaS();
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [liveMode, setLiveMode] = useState(true);
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>('all');
  const [directionFilter, setDirectionFilter] = useState<DirectionFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [clearConfirm, setClearConfirm] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchEvents = useCallback(async () => {
    if (!selectedTenant) return;
    try {
      const res = await fetch(`/api/tenant/${selectedTenant.id}/webhook-events?limit=100`);
      if (!res.ok) return;
      const data = await res.json();
      setEvents(data.events ?? []);
    } catch {
      // silently fail on network errors during polling
    }
  }, [selectedTenant]);

  // Initial + manual fetch
  const handleRefresh = useCallback(async () => {
    setLoading(true);
    await fetchEvents();
    setLoading(false);
  }, [fetchEvents]);

  useEffect(() => {
    handleRefresh();
  }, [handleRefresh]);

  // Fallback reconciliation poll — the WebSocket below delivers new events
  // immediately; this just guards against a dropped connection.
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (liveMode) {
      intervalRef.current = setInterval(fetchEvents, 30000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [liveMode, fetchEvents]);

  // Real-time push: new webhook events arrive over WebSocket instead of
  // waiting for the next poll tick.
  useEffect(() => {
    if (!selectedTenant || !liveMode) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(
      `${protocol}//${window.location.host}/api/admin-events?tenantId=${selectedTenant.id}`
    );

    ws.onmessage = msg => {
      try {
        const data = JSON.parse(msg.data);
        if (data.type === 'webhook-event' && data.payload) {
          setEvents(prev => {
            if (prev.some(e => e.id === data.payload.id)) return prev;
            return [data.payload, ...prev].slice(0, 100);
          });
        }
      } catch {
        // ignore malformed frames
      }
    };

    return () => ws.close();
  }, [selectedTenant, liveMode]);

  // Clear logs
  const handleClear = async () => {
    if (!selectedTenant) return;
    if (!clearConfirm) {
      setClearConfirm(true);
      return;
    }
    try {
      await fetch(`/api/tenant/${selectedTenant.id}/webhook-events`, { method: 'DELETE' });
      setEvents([]);
      setClearConfirm(false);
    } catch {
      setClearConfirm(false);
    }
  };

  if (!selectedTenant) return null;

  // Apply filters
  const filtered = events.filter(e => {
    if (channelFilter !== 'all' && e.channel !== channelFilter) return false;
    if (directionFilter !== 'all' && e.direction !== directionFilter) return false;
    if (statusFilter !== 'all' && e.status !== statusFilter) return false;
    return true;
  });

  const errorCount = events.filter(e => e.status === 'error').length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-display font-medium tracking-tight text-white flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-400" />
            Webhook Event Log
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Real-time inbound &amp; outbound event trace — {selectedTenant.name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Live toggle */}
          <button
            onClick={() => setLiveMode(v => !v)}
            id="webhook-logs-live-toggle"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              liveMode
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_8px_rgba(52,211,153,0.2)]'
                : 'bg-white/5 text-slate-400 border-white/10 hover:border-white/20'
            }`}
          >
            <Radio className={`h-3 w-3 ${liveMode ? 'animate-pulse' : ''}`} />
            {liveMode ? 'Live' : 'Paused'}
          </button>

          {/* Refresh */}
          <button
            onClick={handleRefresh}
            disabled={loading}
            id="webhook-logs-refresh-btn"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 text-slate-400 border border-white/10 hover:border-white/20 hover:text-white transition-all disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          {/* Clear */}
          <button
            onClick={handleClear}
            id="webhook-logs-clear-btn"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              clearConfirm
                ? 'bg-red-500/20 text-red-400 border-red-500/30'
                : 'bg-white/5 text-slate-400 border-white/10 hover:border-red-500/30 hover:text-red-400'
            }`}
          >
            <Trash2 className="h-3 w-3" />
            {clearConfirm ? 'Confirm Clear?' : 'Clear Logs'}
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Events', value: events.length, color: 'text-white' },
          {
            label: 'Inbound',
            value: events.filter(e => e.direction === 'inbound').length,
            color: 'text-blue-400',
          },
          {
            label: 'Outbound',
            value: events.filter(e => e.direction === 'outbound').length,
            color: 'text-purple-400',
          },
          {
            label: 'Errors',
            value: errorCount,
            color: errorCount > 0 ? 'text-red-400' : 'text-slate-500',
          },
        ].map(s => (
          <div
            key={s.label}
            className="bg-[#080b12] border border-white/5 rounded-xl p-3.5 flex items-center justify-between"
          >
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
              {s.label}
            </span>
            <span className={`text-lg font-bold font-mono ${s.color}`}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-[#080b12] border border-white/5 rounded-xl">
        <Filter className="h-3.5 w-3.5 text-slate-500 shrink-0" />
        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest shrink-0">
          Filters:
        </span>

        {/* Channel */}
        <select
          value={channelFilter}
          onChange={e => setChannelFilter(e.target.value as ChannelFilter)}
          id="webhook-logs-channel-filter"
          className="bg-[#04060d] border border-white/10 text-xs text-slate-300 rounded-lg px-2 py-1.5 font-mono"
        >
          <option value="all">All Channels</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="messenger">Messenger</option>
          <option value="telegram">Telegram</option>
          <option value="sms">SMS</option>
          <option value="simulator">Simulator</option>
        </select>

        {/* Direction */}
        <select
          value={directionFilter}
          onChange={e => setDirectionFilter(e.target.value as DirectionFilter)}
          id="webhook-logs-direction-filter"
          className="bg-[#04060d] border border-white/10 text-xs text-slate-300 rounded-lg px-2 py-1.5 font-mono"
        >
          <option value="all">Both Directions</option>
          <option value="inbound">Inbound Only</option>
          <option value="outbound">Outbound Only</option>
        </select>

        {/* Status */}
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as StatusFilter)}
          id="webhook-logs-status-filter"
          className="bg-[#04060d] border border-white/10 text-xs text-slate-300 rounded-lg px-2 py-1.5 font-mono"
        >
          <option value="all">All Statuses</option>
          <option value="success">Success Only</option>
          <option value="error">Errors Only</option>
        </select>

        <span className="ml-auto text-[10px] font-mono text-slate-600">
          {filtered.length} of {events.length} events
        </span>
      </div>

      {/* Event list */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border border-dashed border-white/10">
            <Activity className="h-10 w-10 text-slate-700 mb-3" />
            <p className="text-sm font-semibold text-slate-500">No webhook events yet</p>
            <p className="text-xs text-slate-600 mt-1 max-w-xs">
              Events will appear here as messages flow through WhatsApp, the Simulator, and other
              channels.
            </p>
          </div>
        ) : (
          filtered.map(event => <EventRow key={event.id} event={event} />)
        )}
      </div>
    </div>
  );
};
