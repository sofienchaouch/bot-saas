import React, { useState, useEffect, useMemo } from 'react';
import { 
  Activity, 
  MessageSquare, 
  Bot, 
  User, 
  Zap, 
  ShieldCheck, 
  Database, 
  Wifi, 
  Clock, 
  AlertTriangle 
} from 'lucide-react';
import { Tenant } from '../../types';

interface RealTimeOpsWidgetsProps {
  tenant: Tenant;
}

// ----------------------------------------------------
// 1. Live Activity Feed
// ----------------------------------------------------
export const LiveActivityFeed: React.FC<RealTimeOpsWidgetsProps> = ({ tenant }) => {
  const [activities, setActivities] = useState<{ id: number; time: string; text: string; type: string }[]>([]);

  useEffect(() => {
    // Initial activity set dependent on tenant leads & appointments
    const initial = [
      { id: 1, time: 'Just now', text: `Bot matching context for incoming inquiry on WhatsApp`, type: 'bot' },
      { id: 2, time: '2m ago', text: `RAG search executed: 3 document chunks matched with 92% confidence`, type: 'rag' },
      { id: 3, time: '5m ago', text: `WhatsApp webhook received message from standard sandbox sender`, type: 'webhook' },
    ];
    setActivities(initial);

    // Periodically push mock real-time events to create a "Live" feel
    const interval = setInterval(() => {
      const names = ['Sarah M.', 'John D.', 'Alex P.', 'Emma W.', 'Carlos R.'];
      const topics = ['pricing plans', 'booking scheduling', 'office hours', 'setup guides', 'refund policy'];
      const randomName = names[Math.floor(Math.random() * names.length)];
      const randomTopic = topics[Math.floor(Math.random() * topics.length)];
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      const newEvents = [
        { id: Date.now(), time: timeStr, text: `Lead "${randomName}" inquired about "${randomTopic}"`, type: 'lead' },
        { id: Date.now() + 1, time: timeStr, text: `AI replied to consumer query with Gemini 2.5 Flash`, type: 'bot' },
        { id: Date.now() + 2, time: timeStr, text: `SLA target check: response completed in 1.4s (within 5s limit)`, type: 'sla' },
      ];

      const picked = newEvents[Math.floor(Math.random() * newEvents.length)];

      setActivities(prev => [picked, ...prev.slice(0, 7)]);
    }, 8000);

    return () => clearInterval(interval);
  }, [tenant.id]);

  return (
    <div className="bg-[#080b12] border border-white/5 p-5 rounded-3xl space-y-4 shadow-xl select-none">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-emerald-400 animate-pulse" />
          <h3 className="text-xs font-bold uppercase font-mono tracking-wider text-white">Live Activity Feed</h3>
        </div>
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
      </div>
      <div className="h-56 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-white/5 scrollbar-track-transparent">
        {activities.map((act) => (
          <div key={act.id} className="p-3 bg-[#0d121d] border border-white/5 rounded-xl flex items-start gap-3 transition-all hover:border-white/10">
            <span className={`text-[10px] p-1.5 rounded-lg border font-mono ${
              act.type === 'lead' ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5' :
              act.type === 'bot' ? 'text-purple-400 border-purple-500/20 bg-purple-500/5' :
              act.type === 'sla' ? 'text-sky-400 border-sky-500/20 bg-sky-500/5' :
              'text-slate-400 border-white/5 bg-white/5'
            }`}>
              {act.type.toUpperCase()}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-mono text-slate-300 leading-relaxed truncate">{act.text}</p>
              <span className="text-[9px] font-mono text-slate-500 block mt-0.5">{act.time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ----------------------------------------------------
// 2. Active Conversations Counter
// ----------------------------------------------------
export const ActiveConversationsCounter: React.FC<RealTimeOpsWidgetsProps> = ({ tenant }) => {
  // Deterministic simulation based on leads
  const baseCount = (tenant.leads?.length || 0) + 4;
  const botCount = Math.max(1, Math.round(baseCount * 0.8));
  const humanCount = Math.max(0, baseCount - botCount);
  const queueCount = (tenant.id.length % 3);

  return (
    <div className="bg-[#080b12] border border-white/5 p-5 rounded-3xl space-y-4 shadow-xl select-none">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold font-mono text-slate-450 uppercase tracking-widest flex items-center gap-1">
          <MessageSquare className="h-3.5 w-3.5 text-blue-400" />
          <span>Active Chats</span>
        </p>
        <span className="text-[9.5px] font-mono text-slate-500 font-bold bg-white/5 px-2 py-0.5 rounded">LIVE</span>
      </div>
      <div className="grid grid-cols-3 gap-2 pt-2">
        <div className="p-3 bg-[#0d121d] border border-white/5 rounded-2xl text-center">
          <span className="text-xl font-bold font-mono text-white block">{botCount + humanCount}</span>
          <span className="text-[9px] font-mono text-slate-450 uppercase block">Total</span>
        </div>
        <div className="p-3 bg-[#0d121d] border border-white/5 rounded-2xl text-center">
          <span className="text-xl font-bold font-mono text-purple-400 block">{botCount}</span>
          <span className="text-[9px] font-mono text-slate-455 uppercase flex items-center justify-center gap-0.5">
            <Bot className="h-3 w-3 inline" /> Bot
          </span>
        </div>
        <div className="p-3 bg-[#0d121d] border border-white/5 rounded-2xl text-center">
          <span className="text-xl font-bold font-mono text-blue-450 block">{humanCount}</span>
          <span className="text-[9px] font-mono text-slate-450 uppercase flex items-center justify-center gap-0.5">
            <User className="h-3 w-3 inline" /> Human
          </span>
        </div>
      </div>
      <div className="text-[10px] font-mono text-slate-400 flex items-center justify-between px-1">
        <span>Awaiting handoff: <strong className="text-amber-500">{queueCount}</strong></span>
        <span>Avg Chat time: <strong>4m 12s</strong></span>
      </div>
    </div>
  );
};

// ----------------------------------------------------
// 3. System Health Monitor
// ----------------------------------------------------
export const SystemHealthMonitor: React.FC = () => {
  const [latencies, setLatencies] = useState<Record<string, number>>({
    gemini: 145,
    whatsapp: 280,
    db: 12,
    rag: 84
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setLatencies({
        gemini: Math.round(120 + Math.random() * 60),
        whatsapp: Math.round(250 + Math.random() * 90),
        db: Math.round(8 + Math.random() * 10),
        rag: Math.round(70 + Math.random() * 30)
      });
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="bg-[#080b12] border border-white/5 p-5 rounded-3xl space-y-4 shadow-xl select-none">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold font-mono text-slate-450 uppercase tracking-widest flex items-center gap-1.5">
          <Wifi className="h-3.5 w-3.5 text-blue-400" />
          <span>System Connectivity</span>
        </p>
        <span className="text-[9px] font-mono text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">ALL OPERATIONAL</span>
      </div>
      <div className="grid grid-cols-2 gap-3 pt-2">
        <div className="p-3 bg-[#0d121d] border border-white/5 rounded-2xl flex items-center justify-between gap-2">
          <div className="space-y-0.5">
            <span className="text-[9.5px] font-mono text-slate-400 block flex items-center gap-1">
              <Zap className="h-3 w-3 text-purple-400" /> Gemini API
            </span>
            <span className="text-xs font-bold font-mono text-white block">{latencies.gemini}ms</span>
          </div>
          <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
        </div>
        <div className="p-3 bg-[#0d121d] border border-white/5 rounded-2xl flex items-center justify-between gap-2">
          <div className="space-y-0.5">
            <span className="text-[9.5px] font-mono text-slate-400 block flex items-center gap-1">
              <MessageSquare className="h-3 w-3 text-teal-400" /> WhatsApp
            </span>
            <span className="text-xs font-bold font-mono text-white block">{latencies.whatsapp}ms</span>
          </div>
          <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
        </div>
        <div className="p-3 bg-[#0d121d] border border-white/5 rounded-2xl flex items-center justify-between gap-2">
          <div className="space-y-0.5">
            <span className="text-[9.5px] font-mono text-slate-400 block flex items-center gap-1">
              <Database className="h-3 w-3 text-blue-400" /> Firestore
            </span>
            <span className="text-xs font-bold font-mono text-white block">{latencies.db}ms</span>
          </div>
          <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
        </div>
        <div className="p-3 bg-[#0d121d] border border-white/5 rounded-2xl flex items-center justify-between gap-2">
          <div className="space-y-0.5">
            <span className="text-[9.5px] font-mono text-slate-400 block flex items-center gap-1">
              <ShieldCheck className="h-3 w-3 text-amber-400" /> RAG Core
            </span>
            <span className="text-xs font-bold font-mono text-white block">{latencies.rag}ms</span>
          </div>
          <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
        </div>
      </div>
    </div>
  );
};

// ----------------------------------------------------
// 4. SLA Timer & Response Target
// ----------------------------------------------------
export const SLATimer: React.FC<RealTimeOpsWidgetsProps> = ({ tenant }) => {
  // Derive SLA from tenant details to remain consistent
  const slaTarget = 5.0; // 5s response target limit
  const baseSlaMatch = 91.5 + (tenant.name.length % 7);

  return (
    <div className="bg-[#080b12] border border-white/5 p-5 rounded-3xl space-y-4 shadow-xl select-none">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold font-mono text-slate-450 uppercase tracking-widest flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-blue-400" />
          <span>Response Time SLA</span>
        </p>
        <span className="text-[9.5px] font-mono text-slate-400">Target: {slaTarget}s</span>
      </div>
      <div className="space-y-3 pt-2">
        <div className="space-y-1 font-mono">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-400">SLA Conformity:</span>
            <span className="text-emerald-400">{baseSlaMatch.toFixed(1)}% met</span>
          </div>
          <div className="h-3 bg-white/5 border border-white/5 rounded-full overflow-hidden relative shadow-inner">
            <div 
              style={{ width: `${baseSlaMatch}%` }} 
              className="h-full bg-gradient-to-r from-blue-600 to-emerald-500 rounded-full transition-all duration-1000"
            />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono border-t border-white/5 pt-3">
          <div>
            <span className="text-slate-500 block text-[9px] uppercase">Avg Speed</span>
            <span className="font-bold text-white">1.8s</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[9px] uppercase">P95 Latency</span>
            <span className="font-bold text-white">3.4s</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[9px] uppercase">SLA Breaches</span>
            <span className="font-bold text-amber-400 flex items-center justify-center gap-0.5">
              <AlertTriangle className="h-3 w-3 shrink-0" /> 0
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
