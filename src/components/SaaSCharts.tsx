import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { Tenant } from '../types';
import { 
  TrendingUp, 
  MessageSquare, 
  Percent, 
  CheckCircle, 
  Zap, 
  Calendar,
  Users,
  LineChart as ChartIcon,
  Bot,
  Sparkles,
  Award,
  Activity,
  Flame,
  Download,
  AlertTriangle,
  Globe,
  Clock,
  Compass,
  Cpu,
  Coins,
  Layers,
  ChevronDown
} from 'lucide-react';

// Import New Modular Widgets
import { 
  LiveActivityFeed, 
  ActiveConversationsCounter, 
  SystemHealthMonitor, 
  SLATimer 
} from './widgets/RealTimeOpsWidgets';
import { 
  SentimentGauge, 
  ResponseTimeDistribution, 
  CustomerJourneyMap, 
  GeographicHeatmap 
} from './widgets/CustomerIntelligenceWidgets';
import { 
  RevenueAttribution, 
  SubscriptionUsageMeter, 
  ROICalculator 
} from './widgets/BusinessWidgets';
import { 
  RAGConfidence, 
  BotContainmentRate, 
  TokenCostTracker 
} from './widgets/BotPerformanceWidgets';
import { 
  AgentAvailability, 
  EscalationQueue, 
  TeamLeaderboard 
} from './widgets/TeamWidgets';

interface SaaSChartsProps {
  tenant: Tenant;
  onTakeoverConvo?: (convoId: string) => void;
}

interface DailyMetric {
  date: string;
  messagesReceived: number;
  aiReplies: number;
  newLeads: number;
  qualifiedLeads: number;
  conversations: number;
  conversionRate: number;
}

// Custom Tooltip component for Recharts conforming to the Slate/Neon dark portal theme
const CustomTooltip = ({ active, payload, label, rateMode = false }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#080b12] border border-white/10 p-3.5 rounded-xl shadow-2xl backdrop-blur-md font-mono select-none">
        <p className="text-[10px] font-bold text-slate-450 uppercase mb-1.5">{label}</p>
        <div className="space-y-1">
          {payload.map((entry: any, index: number) => {
            const isRate = rateMode || entry.name.includes('%') || entry.name.toLowerCase().includes('rate');
            return (
              <p 
                key={index} 
                className="text-xs font-semibold flex items-center justify-between gap-4" 
                style={{ color: entry.stroke || entry.fill || '#38bdf8' }}
              >
                <span>{entry.name}:</span>
                <span className="font-bold text-white">
                  {entry.value ?? 0}
                  {isRate ? '%' : ''}
                </span>
              </p>
            );
          })}
        </div>
      </div>
    );
  }
  return null;
};

export const SaaSCharts: React.FC<SaaSChartsProps> = ({ tenant, onTakeoverConvo }) => {
  const [dataWindow, setDataWindow] = useState<'30d' | '15d' | '7d'>('30d');
  const [hoveredMetrics, setHoveredMetrics] = useState<string | null>(null);
  const [alertThreshold, setAlertThreshold] = useState<number>(85);
  // Add state for sub-sections inside insights
  const [insightsSection, setInsightsSection] = useState<'overview' | 'realtime' | 'intelligence' | 'performance' | 'roi' | 'team'>('overview');

  // Helper to resolve agents dynamically to keep it resilient
  const agents = useMemo(() => {
    if (tenant.agents && tenant.agents.length > 0) return tenant.agents;
    return [
      {
        id: 'default-agent-' + tenant.id,
        name: tenant.botName,
        role: 'Primary Bot Assistant',
        tone: tenant.tone,
        systemInstruction: tenant.systemInstruction || 'Assist customers with questions and bookings.',
        avatar: tenant.avatar || '🤖'
      }
    ];
  }, [tenant.agents, tenant.botName, tenant.tone, tenant.systemInstruction, tenant.avatar, tenant.id]);

  // Deterministically generate performance heatmap cells per agent
  const agentHeatmapData = useMemo(() => {
    const categories = [
      { key: 'leads', label: 'Lead Extraction' },
      { key: 'faq', label: 'Knowledge Base FAQ' },
      { key: 'scheduler', label: 'Calendar Sync' },
      { key: 'graceful_handoff', label: 'Graceful Handoff' },
    ];

    return agents.map((agent) => {
      // Create seed based on agent id and name to remain stable
      const charSum = agent.name.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
      
      const rates: Record<string, number> = {};
      const deltas: Record<string, number> = {};
      
      categories.forEach((cat, index) => {
        // High baseline success rate around 82-99%
        const offset = (charSum + index * 13) % 12; // 0 to 11
        const multiplier = agent.tone === 'professional' ? 1.02 : agent.tone === 'empathetic' ? 1.01 : 0.99;
        let base = 85;
        
        const roleLower = agent.role.toLowerCase();
        if (cat.key === 'leads' && (roleLower.includes('sales') || roleLower.includes('trainer') || roleLower.includes('specialist'))) {
          base = 93;
        } else if (cat.key === 'faq' && (roleLower.includes('support') || roleLower.includes('faq') || roleLower.includes('expert'))) {
          base = 95;
        } else if (cat.key === 'scheduler' && (roleLower.includes('booking') || roleLower.includes('scheduler') || roleLower.includes('curator') || roleLower.includes('coordinator'))) {
          base = 94;
        }

        rates[cat.key] = Math.min(100, Math.round((base + offset) * multiplier));
        
        // Generate a stable, deterministic delta between -2.2% and +2.8%
        const deltaVal = Number(((((charSum + index * 23) % 51) - 22) / 10).toFixed(1));
        deltas[cat.key] = deltaVal === 0 ? 0.6 : deltaVal;
      });

      const totalRateSum = Object.values(rates).reduce((s, r) => s + r, 0);
      const avgResolutionRate = Math.round(totalRateSum / categories.length);
      
      const totalDeltaSum = Object.values(deltas).reduce((s, d) => s + d, 0);
      const avgDelta = Number((totalDeltaSum / categories.length).toFixed(1));

      return {
        ...agent,
        rates,
        deltas,
        avgResolutionRate,
        avgDelta,
      };
    });
  }, [agents]);

  // Determine top performing Agent (MVP)
  const topAgent = useMemo(() => {
    if (agentHeatmapData.length === 0) return null;
    return [...agentHeatmapData].sort((a, b) => b.avgResolutionRate - a.avgResolutionRate)[0];
  }, [agentHeatmapData]);

  // Export agent performance report as a CSV file
  const handleExportCSV = () => {
    const csvRows = [
      [
        'Agent ID',
        'Agent Name',
        'Agent Role',
        'Lead Extraction Rate (%)',
        'Lead Extraction Trend (%)',
        'Knowledge Base FAQ Rate (%)',
        'Knowledge Base FAQ Trend (%)',
        'Calendar Sync Rate (%)',
        'Calendar Sync Trend (%)',
        'Graceful Handoff Rate (%)',
        'Graceful Handoff Trend (%)',
        'Average Yield (%)',
        'Average Yield Trend (%)'
      ]
    ];

    agentHeatmapData.forEach(agent => {
      csvRows.push([
        agent.id,
        agent.name,
        agent.role,
        `${agent.rates.leads}`,
        `${agent.deltas.leads > 0 ? '+' : ''}${agent.deltas.leads}`,
        `${agent.rates.faq}`,
        `${agent.deltas.faq > 0 ? '+' : ''}${agent.deltas.faq}`,
        `${agent.rates.scheduler}`,
        `${agent.deltas.scheduler > 0 ? '+' : ''}${agent.deltas.scheduler}`,
        `${agent.rates.graceful_handoff}`,
        `${agent.deltas.graceful_handoff > 0 ? '+' : ''}${agent.deltas.graceful_handoff}`,
        `${agent.avgResolutionRate}`,
        `${agent.avgDelta > 0 ? '+' : ''}${agent.avgDelta}`
      ]);
    });

    const csvContent = "data:text/csv;charset=utf-8," 
      + csvRows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",")).join("\n");
    
    // Explicitly handle standard dynamic file triggers on client
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${tenant.name.toLowerCase().replace(/\s+/g, '-')}-agent-performance-report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Generate deterministic 30 days of simulation statistics matched to the tenant properties
  const metricsData = useMemo(() => {
    const metrics: DailyMetric[] = [];
    const now = new Date();
    
    // Hash function to create uniform pseudo randomness dependent on Tenant ID
    const seedHash = (str: string) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
      }
      return Math.abs(hash);
    };
    
    const seed = seedHash(tenant.id || 'omnibot_default_tenant');
    const leadsCount = tenant.leads?.length ?? 0;
    const appointmentsCount = tenant.appointments?.length ?? 0;
    
    // Base scales
    const baseMessageVolume = 75 + (seed % 140) + (leadsCount * 6);
    const baseConversionRate = 14 + (seed % 16) + (appointmentsCount * 1.2);
    
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      const dayOfWeek = d.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      // Weekday vs weekend metrics multiplier
      const multiplier = isWeekend ? 0.45 : 1.18;
      
      const tempSeed = seed + i * 43;
      const fluctuation = (tempSeed % 29) - 14; // Value sliding -14 to +14
      
      // Calculate realistic volumes
      const messagesReceived = Math.max(12, Math.round((baseMessageVolume + fluctuation) * multiplier));
      // AI success reply rate sitting around 93% to 99%
      const aiReplies = Math.max(10, Math.round(messagesReceived * (0.94 + ((tempSeed % 6) / 100))));
      
      // Conversations volume
      const conversations = Math.max(4, Math.round(messagesReceived * (0.16 + ((tempSeed % 9) / 100))));
      
      // Conversion yield
      const leadFluct = (tempSeed % 5) - 2; // -2 to 2
      const newLeads = Math.max(0, Math.round((conversations * (baseConversionRate / 100)) + (leadFluct * 0.4)));
      
      // Result percentage rate
      const conversionRate = conversations > 0
        ? Math.round(Math.min(100, Math.max(0, (newLeads / conversations) * 100)))
        : Math.round(baseConversionRate + (fluctuation * 0.15));
        
      metrics.push({
        date: dateStr,
        messagesReceived,
        aiReplies,
        newLeads,
        qualifiedLeads: Math.max(0, Math.round(newLeads * 0.75)),
        conversations,
        conversionRate: Math.min(100, Math.max(4, conversionRate))
      });
    }
    
    return metrics;
  }, [tenant.id, tenant.leads?.length, tenant.appointments?.length]);

  // Handle zooming / window filters (30 days, 15 days, 7 days)
  const filteredData = useMemo(() => {
    if (dataWindow === '15d') return metricsData.slice(15);
    if (dataWindow === '7d') return metricsData.slice(23);
    return metricsData;
  }, [metricsData, dataWindow]);

  // Aggregate metrics summaries
  const totals = useMemo(() => {
    const activeData = filteredData;
    const totalMessages = activeData.reduce((acc, curr) => acc + curr.messagesReceived, 0);
    const totalAiReplies = activeData.reduce((acc, curr) => acc + curr.aiReplies, 0);
    const totalNewLeads = activeData.reduce((acc, curr) => acc + curr.newLeads, 0);
    const totalConversations = activeData.reduce((acc, curr) => acc + curr.conversations, 0);
    
    const avgConversionRate = activeData.length > 0
      ? Math.round(activeData.reduce((acc, curr) => acc + curr.conversionRate, 0) / activeData.length)
      : 0;

    const autopilotPercentage = totalMessages > 0
      ? ((totalAiReplies / totalMessages) * 100).toFixed(1)
      : '98.5';

    return {
      totalMessages,
      totalAiReplies,
      totalNewLeads,
      avgConversionRate,
      autopilotPercentage,
      totalConversations
    };
  }, [filteredData]);

  return (
    <div className="space-y-6">
      
      {/* Interactive Controls & Title bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#080b12] border border-white/5 p-4 rounded-2xl">
        <div className="flex items-center gap-2">
          <ChartIcon className="h-4 w-4 text-blue-500 animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-wider font-mono text-white">Dynamic Analytical Modeling</span>
        </div>
        
        {/* Toggle between 30 days, 15 days, 7 days */}
        <div className="flex items-center bg-[#0d121d] rounded-lg p-1 border border-white/5 font-mono text-[10.5px]">
          {(['30d', '15d', '7d'] as const).map((win) => (
            <button
              key={win}
              type="button"
              onClick={() => setDataWindow(win)}
              className={`px-3 py-1 cursor-pointer font-bold rounded transition-all ${
                dataWindow === win 
                  ? 'bg-blue-600 text-white shadow' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {win.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex items-center gap-2 bg-[#080b12] border border-white/5 p-2 rounded-2xl overflow-x-auto scrollbar-none font-mono text-[11px] select-none">
        {(
          [
            { id: 'overview', label: 'Overview', icon: <ChartIcon className="h-3.5 w-3.5" /> },
            { id: 'realtime', label: 'Real-Time Ops', icon: <Activity className="h-3.5 w-3.5" /> },
            { id: 'intelligence', label: 'Customer Intelligence', icon: <Compass className="h-3.5 w-3.5" /> },
            { id: 'performance', label: 'AI Performance', icon: <Cpu className="h-3.5 w-3.5" /> },
            { id: 'roi', label: 'Business ROI', icon: <Layers className="h-3.5 w-3.5" /> },
            { id: 'team', label: 'Team & Collab', icon: <Users className="h-3.5 w-3.5" /> },
          ] as const
        ).map((sec) => (
          <button
            key={sec.id}
            type="button"
            onClick={() => setInsightsSection(sec.id)}
            className={`flex items-center gap-1.5 px-4 py-2 cursor-pointer font-bold rounded-xl transition-all whitespace-nowrap ${
              insightsSection === sec.id
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-450 hover:text-white hover:bg-white/5'
            }`}
          >
            {sec.icon}
            <span>{sec.label}</span>
          </button>
        ))}
      </div>

      {insightsSection === 'overview' && (
        <div className="space-y-6">
          {/* KPI Cards section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Message volume */}
        <div 
          onMouseEnter={() => setHoveredMetrics('msg')}
          onMouseLeave={() => setHoveredMetrics(null)}
          className={`p-5 bg-[#080b12] border rounded-2xl transition-all relative overflow-hidden group ${
            hoveredMetrics === 'msg' ? 'border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.15)] bg-blue-500/[0.01]' : 'border-white/5'
          }`}
        >
          <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/5 rounded-full blur-xl pointer-events-none transition-all duration-300 group-hover:bg-blue-500/10"></div>
          <p className="text-[10px] font-bold font-mono text-slate-450 uppercase tracking-widest flex items-center gap-1">
            <MessageSquare className="h-3 w-3 text-blue-400 shrink-0" />
            <span>Chat Volume</span>
          </p>
          <div className="flex items-end justify-between pt-1.5">
            <div className="space-y-0.5">
              <span className="text-2xl font-bold font-mono text-white select-all">
                {totals.totalMessages.toLocaleString()}
              </span>
              <p className="text-[9.5px] font-mono text-slate-500">Inbound chats received</p>
            </div>
            <div className="text-right">
              <span className="text-[10.5px] font-mono font-bold text-blue-400 flex items-center gap-0.5 justify-end">
                <TrendingUp className="h-3 w-3" />
                +14.2%
              </span>
              <p className="text-[9px] text-slate-500 font-mono">vs prev month</p>
            </div>
          </div>
        </div>

        {/* KPI 2: AI Autopilot Handshake Rate */}
        <div 
          onMouseEnter={() => setHoveredMetrics('ai')}
          onMouseLeave={() => setHoveredMetrics(null)}
          className={`p-5 bg-[#080b12] border rounded-2xl transition-all relative overflow-hidden group ${
            hoveredMetrics === 'ai' ? 'border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.15)] bg-amber-500/[0.01]' : 'border-white/5'
          }`}
        >
          <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/5 rounded-full blur-xl pointer-events-none transition-all duration-300 group-hover:bg-amber-500/10"></div>
          <p className="text-[10px] font-bold font-mono text-slate-450 uppercase tracking-widest flex items-center gap-1">
            <Zap className="h-3.5 w-3.5 text-amber-500 shrink-0 animate-pulse" />
            <span>AI Auto-Resolution</span>
          </p>
          <div className="flex items-end justify-between pt-1.5">
            <div className="space-y-0.5">
              <span className="text-2xl font-bold font-mono text-white select-all">
                {totals.autopilotPercentage}%
              </span>
              <p className="text-[9.5px] font-mono text-slate-500">Replies sent autonomously</p>
            </div>
            <div className="text-right">
              <span className="text-[10.5px] font-mono font-bold text-amber-500 flex items-center gap-0.5 justify-end">
                ● LIVE
              </span>
              <p className="text-[9px] text-slate-500 font-mono">Gemini 2.5 Flash</p>
            </div>
          </div>
        </div>

        {/* KPI 3: Average Conversion Rate */}
        <div 
          onMouseEnter={() => setHoveredMetrics('rate')}
          onMouseLeave={() => setHoveredMetrics(null)}
          className={`p-5 bg-[#080b12] border rounded-2xl transition-all relative overflow-hidden group ${
            hoveredMetrics === 'rate' ? 'border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.15)] bg-purple-500/[0.01]' : 'border-white/5'
          }`}
        >
          <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/5 rounded-full blur-xl pointer-events-none transition-all duration-300 group-hover:bg-purple-500/10"></div>
          <p className="text-[10px] font-bold font-mono text-slate-450 uppercase tracking-widest flex items-center gap-1">
            <Percent className="h-3 w-3 text-purple-400 shrink-0" />
            <span>Avg Lead Yield</span>
          </p>
          <div className="flex items-end justify-between pt-1.5">
            <div className="space-y-0.5">
              <span className="text-2xl font-bold font-mono text-white select-all">
                {totals.avgConversionRate}%
              </span>
              <p className="text-[9.5px] font-mono text-slate-500">Contact-to-Lead conversion</p>
            </div>
            <div className="text-right">
              <span className="text-[10.5px] font-mono font-bold text-purple-400 flex items-center gap-0.5 justify-end">
                <TrendingUp className="h-3 w-3" />
                +3.5%
              </span>
              <p className="text-[9px] text-slate-500 font-mono">rolling average</p>
            </div>
          </div>
        </div>

        {/* KPI 4: Absolute Total Captured Leads */}
        <div 
          onMouseEnter={() => setHoveredMetrics('leads')}
          onMouseLeave={() => setHoveredMetrics(null)}
          className={`p-5 bg-[#080b12] border rounded-2xl transition-all relative overflow-hidden group ${
            hoveredMetrics === 'leads' ? 'border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.15)] bg-emerald-500/[0.01]' : 'border-white/5'
          }`}
        >
          <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-full blur-xl pointer-events-none transition-all duration-300 group-hover:bg-emerald-500/10"></div>
          <p className="text-[10px] font-bold font-mono text-slate-450 uppercase tracking-widest flex items-center gap-1">
            <CheckCircle className="h-3 w-3 text-emerald-400 shrink-0" />
            <span>Opportunities Secured</span>
          </p>
          <div className="flex items-end justify-between pt-1.5">
            <div className="space-y-0.5">
              <span className="text-2xl font-bold font-mono text-white select-all">
                {totals.totalNewLeads}
              </span>
              <p className="text-[9.5px] font-mono text-slate-500">Leads captured {dataWindow}</p>
            </div>
            <div className="text-right">
              <span className="text-[10.5px] font-mono font-bold text-emerald-450 bg-emerald-500/10 px-1.5 py-0.5 border border-emerald-500/20 rounded font-black">
                {tenant.leads?.length ?? 0} TOTAL
              </span>
              <p className="text-[9px] text-slate-500 font-mono mt-0.5">live database size</p>
            </div>
          </div>
        </div>

      </div>

      {/* Visual Chart Containers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* 1. Message Volume Area Chart */}
        <div className="bg-[#080b12] border border-white/5 p-5 rounded-3xl space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h3 className="text-xs font-bold uppercase font-mono tracking-wider text-white">Message Volumes Timeline</h3>
              <p className="text-[10px] font-mono text-slate-400">Incoming consumer chats mapped to outgoing AI automated replies</p>
            </div>
            <span className="text-[9.5px] font-mono text-slate-500 font-medium select-none">Units: Chats count</span>
          </div>

          <div className="h-64 sm:h-72 w-full mt-2 font-mono text-[10px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={filteredData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorInbound" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorAI" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b881" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b881" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff" strokeOpacity={0.03} />
                <XAxis 
                  dataKey="date" 
                  stroke="#64748b" 
                  strokeOpacity={0.5} 
                  tickLine={false} 
                  axisLine={false}
                  dy={8}
                />
                <YAxis 
                  stroke="#64748b" 
                  strokeOpacity={0.5} 
                  tickLine={false} 
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  verticalAlign="top" 
                  height={36} 
                  iconType="circle"
                  iconSize={6}
                  wrapperStyle={{ color: '#94a3b8', fontSize: '10.5px', paddingBottom: '10px' }}
                />
                <Area 
                  name="Inbound Customer Messages" 
                  type="monotone" 
                  dataKey="messagesReceived" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorInbound)" 
                />
                <Area 
                  name="AI Agent Autonomous Replies" 
                  type="monotone" 
                  dataKey="aiReplies" 
                  stroke="#10b881" 
                  strokeWidth={1.5}
                  fillOpacity={1} 
                  strokeDasharray="4 4"
                  fill="url(#colorAI)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. Lead Conversion Rate Line Chart */}
        <div className="bg-[#080b12] border border-white/5 p-5 rounded-3xl space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h3 className="text-xs font-bold uppercase font-mono tracking-wider text-white">Daily Lead Conversion Rates</h3>
              <p className="text-[10px] font-mono text-slate-400">Yield percentage of inbounds converted into verified opportunities</p>
            </div>
            <span className="text-[9.5px] font-mono text-purple-400 font-bold select-none">Average: {totals.avgConversionRate}%</span>
          </div>

          <div className="h-64 sm:h-72 w-full mt-2 font-mono text-[10px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={filteredData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorConversion" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff" strokeOpacity={0.03} />
                <XAxis 
                  dataKey="date" 
                  stroke="#64748b" 
                  strokeOpacity={0.5} 
                  tickLine={false} 
                  axisLine={false}
                  dy={8}
                />
                <YAxis 
                  stroke="#64748b" 
                  strokeOpacity={0.5} 
                  tickLine={false} 
                  axisLine={false}
                  unit="%"
                />
                <Tooltip content={<CustomTooltip rateMode={true} />} />
                <Legend 
                  verticalAlign="top" 
                  height={36} 
                  iconType="circle"
                  iconSize={6}
                  wrapperStyle={{ color: '#94a3b8', fontSize: '10.5px', paddingBottom: '10px' }}
                />
                <Area 
                  name="Lead Conversion rate (%)" 
                  type="monotone" 
                  dataKey="conversionRate" 
                  stroke="#8b5cf6" 
                  strokeWidth={2.5}
                  fillOpacity={1} 
                  fill="url(#colorConversion)" 
                  activeDot={{ r: 5, stroke: '#a78bfa', strokeWidth: 1.5, fill: '#080b12' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* 2.5 Lead Capture & Booking Conversion Funnel */}
      {(() => {
        const totalLeads = tenant.leads?.length || 0;
        const qualifiedLeads = tenant.leads?.filter(l => l.status === 'Qualified').length || 0;
        const totalBookings = tenant.appointments?.length || 0;

        // Formulate deterministic stages
        const stageInbound = totalLeads * 4 + 32;
        const stageEngaged = totalLeads * 2 + 18;
        const stageLeads = totalLeads;
        const stageQualified = qualifiedLeads;
        const stageBookings = totalBookings;

        // Percentages relative to Inbound
        const pctInbound = 100;
        const pctEngaged = stageInbound > 0 ? Math.round((stageEngaged / stageInbound) * 100) : 0;
        const pctLeads = stageInbound > 0 ? Math.round((stageLeads / stageInbound) * 100) : 0;
        const pctQualified = stageInbound > 0 ? Math.round((stageQualified / stageInbound) * 100) : 0;
        const pctBookings = stageInbound > 0 ? Math.round((stageBookings / stageInbound) * 100) : 0;

        const funnelStages = [
          { name: '1. Inbound Inquiries', value: stageInbound, pct: pctInbound, color: 'bg-blue-600', icon: <MessageSquare className="h-4 w-4 text-blue-400" /> },
          { name: '2. Engaged AI Conversations', value: stageEngaged, pct: pctEngaged, color: 'bg-indigo-600', icon: <Bot className="h-4 w-4 text-indigo-400" /> },
          { name: '3. Captured CRM Leads', value: stageLeads, pct: pctLeads, color: 'bg-purple-600', icon: <Users className="h-4 w-4 text-purple-400" /> },
          { name: '4. Qualified Opportunities', value: stageQualified, pct: pctQualified, color: 'bg-pink-650', icon: <Award className="h-4 w-4 text-pink-400" /> },
          { name: '5. Scheduled Calendar Bookings', value: stageBookings, pct: pctBookings, color: 'bg-emerald-600', icon: <CheckCircle className="h-4 w-4 text-emerald-450" /> }
        ];

        return (
          <div className="bg-[#080b12] border border-white/5 p-5 rounded-3xl space-y-5 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <h3 className="text-xs font-bold uppercase font-mono tracking-wider text-white">Lead Capture & Booking Conversion Funnel</h3>
                <p className="text-[10px] font-mono text-slate-400">Yield conversion flow from raw chat interactions to confirmed calendar slots</p>
              </div>
              <span className="text-[9.5px] font-mono text-emerald-400 font-bold select-none bg-emerald-500/10 px-2 py-0.5 border border-emerald-500/20 rounded">
                Yield: {stageInbound > 0 ? ((stageBookings / stageInbound) * 100).toFixed(1) : 0}%
              </span>
            </div>

            <div className="space-y-4 pt-2">
              {funnelStages.map((stage, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center font-mono">
                  {/* Stage Label */}
                  <div className="md:col-span-3 flex items-center gap-2 text-xs font-bold text-slate-300">
                    {stage.icon}
                    <span>{stage.name}</span>
                  </div>

                  {/* Stage Progress Bar */}
                  <div className="md:col-span-7 h-7 bg-white/5 rounded-xl overflow-hidden relative flex items-center border border-white/5 shadow-inner">
                    <div 
                      className={`h-full ${stage.color} rounded-l-xl opacity-80 transition-all duration-700 shadow-lg`}
                      style={{ width: `${stage.pct}%` }}
                    />
                    <div className="absolute left-3 text-[10px] font-bold text-white drop-shadow-md select-none">
                      {stage.value} units
                    </div>
                  </div>

                  {/* Stage percentage */}
                  <div className="md:col-span-2 text-right text-xs font-bold">
                    <span className="text-slate-450 text-[10px] mr-1">Conversion:</span>
                    <span className="text-white bg-slate-900 border border-white/5 px-2 py-0.5 rounded-lg">
                      {stage.pct}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
        </div>
      )}

      {/* 3. Hourly Engagement Distribution & Hotspots */}
      {insightsSection === 'performance' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <RAGConfidence tenant={tenant} />
            <BotContainmentRate tenant={tenant} />
            <TokenCostTracker tenant={tenant} />
          </div>

          <div className="bg-[#080b12] border border-white/5 p-5 rounded-3xl space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="space-y-0.5">
            <h3 className="text-xs font-bold uppercase font-mono tracking-wider text-white">Hourly Customer Engagement Peak Hotspots</h3>
            <p className="text-[10.5px] font-mono text-slate-400">Heatmap tracking incoming consumer messages and agent processing density across a 24-hour cycle</p>
          </div>
          <span className="text-[9.5px] font-mono text-emerald-450 bg-[#10b881]/10 px-2 py-0.5 border border-emerald-500/20 rounded font-semibold select-none whitespace-nowrap">
            OPTIMIZED AUTOPILOT RESOLUTION
          </span>
        </div>

        {/* 24-hour Grid scale */}
        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-3 pt-2">
          {[
            { hour: '00:00', label: '12 AM', level: 'low', percent: 14 },
            { hour: '02:00', label: '2 AM', level: 'low', percent: 8 },
            { hour: '04:00', label: '4 AM', level: 'low', percent: 5 },
            { hour: '06:00', label: '6 AM', level: 'low', percent: 19 },
            { hour: '08:00', label: '8 AM', level: 'mid', percent: 45 },
            { hour: '10:00', label: '10 AM', level: 'peak', percent: 88 },
            { hour: '12:00', label: '12 PM', level: 'peak', percent: 92 },
            { hour: '14:00', label: '2 PM', level: 'mid', percent: 79 },
            { hour: '16:00', label: '4 PM', level: 'peak', percent: 85 },
            { hour: '18:00', label: '6 PM', level: 'peak', percent: 96 },
            { hour: '20:00', label: '8 PM', level: 'mid', percent: 62 },
            { hour: '22:00', label: '10 PM', level: 'low', percent: 34 },
          ].map((item, idx) => {
            // Apply slight customization to peak times dependent on tenant properties
            const tenantModifier = (tenant.name.length * (idx + 3)) % 15;
            const absolutePercent = Math.min(100, Math.max(4, item.percent + tenantModifier));
            const isPeak = absolutePercent >= 80;
            const isMid = absolutePercent >= 40 && absolutePercent < 80;
            
            return (
              <div key={idx} className="bg-[#0d121d] border border-white/5 rounded-2xl p-3 flex flex-col items-center justify-between min-h-[140px] text-center group hover:border-[#10b881]/20 transition-all cursor-pointer">
                <span className="text-[9px] font-mono text-slate-500">{item.label}</span>
                
                {/* Visual Level indicator bar */}
                <div className="w-2.5 h-16 bg-white/5 rounded-full overflow-hidden flex items-end">
                  <div 
                    style={{ height: `${absolutePercent}%` }} 
                    className={`w-full rounded-full transition-all group-hover:scale-y-105 duration-500 origin-bottom ${
                      isPeak 
                        ? 'bg-gradient-to-t from-emerald-600 to-emerald-400 shadow-[0_0_8px_rgba(16,184,129,0.5)]' 
                        : isMid 
                          ? 'bg-gradient-to-t from-blue-600 to-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.5)]' 
                          : 'bg-gradient-to-t from-slate-700 to-slate-500'
                    }`}
                  />
                </div>

                <div className="space-y-0.5">
                  <span className="text-[10px] font-mono font-bold text-white block select-none">
                    {absolutePercent}%
                  </span>
                  <span className={`text-[8px] font-mono font-black uppercase tracking-wider block ${
                    isPeak 
                      ? 'text-emerald-400' 
                      : isMid 
                        ? 'text-blue-400' 
                        : 'text-slate-500'
                  }`}>
                    {isPeak ? 'PEAK' : isMid ? 'ACTIVE' : 'QUIET'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Specialist Agent Performance Heatmap */}
      <div className="bg-[#080b12] border border-white/5 p-6 rounded-3xl space-y-5 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
              <h3 className="text-xs font-bold uppercase font-mono tracking-wider text-white">Specialist Agent Performance Heatmap</h3>
            </div>
            <p className="text-[11px] font-mono text-slate-400 leading-normal">
              Analyzing query resolution success rates across deployed specialist models and custom business pipelines.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {/* Alert Threshold Control */}
            <div className="flex items-center gap-2 bg-[#0e1320] px-3 py-1.5 border border-indigo-500/20 rounded-xl text-xs font-mono select-none">
              <AlertTriangle className="h-3.5 w-3.5 text-rose-450 animate-pulse" />
              <label htmlFor="alert-threshold-input" className="text-[10.5px] font-bold text-slate-400 uppercase whitespace-nowrap">Alert Under:</label>
              <div className="flex items-center gap-1">
                <input
                  id="alert-threshold-input"
                  type="number"
                  min="0"
                  max="100"
                  value={alertThreshold}
                  onChange={(e) => setAlertThreshold(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                  className="w-9 bg-[#080b12]/90 text-white font-bold font-mono text-center rounded-lg border border-white/10 px-1 py-0.5 focus:border-indigo-500/60 outline-none text-[11px]"
                  title="Highlight agents whose resolution yield falls below this percentage threshold"
                />
                <span className="text-[10px] text-slate-450 font-bold">%</span>
              </div>
            </div>

            {topAgent && (
              <div className="flex items-center gap-2 bg-indigo-500/10 px-3 py-1.5 border border-indigo-500/20 rounded-xl text-xs font-mono">
                <Award className="h-4 w-4 text-indigo-400" />
                <div className="text-[10.5px]">
                  <span className="text-slate-400 font-medium">Pipeline MVP: </span>
                  <strong className="text-white">@{topAgent.name}</strong>
                </div>
              </div>
            )}

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 bg-[#0e1320] hover:bg-slate-800 text-indigo-300 hover:text-white border border-indigo-500/20 hover:border-indigo-500/40 px-3.5 py-1.5 rounded-xl text-[10.5px] font-bold font-mono transition-all cursor-pointer select-none active:scale-[0.98]"
              title="Download detailed AI agent performance metrics report as a CSV spreadsheet"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export Performance Report</span>
            </button>
          </div>
        </div>

        {/* Heatmap Grid Table */}
        <div className="overflow-x-auto rounded-2xl border border-white/5 bg-[#0d121d]/40 pb-1.5 md:pb-0">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-white/5 font-mono text-[9.5px] uppercase tracking-wider text-slate-500 bg-[#0d121d]/80">
                <th className="py-3 px-4 font-bold min-w-[200px]">Deployed Specialty Bot</th>
                <th className="py-3 px-3 text-center font-bold">Lead Ingest</th>
                <th className="py-3 px-3 text-center font-bold">Knowledge FAQ</th>
                <th className="py-3 px-3 text-center font-bold">Booking Sync</th>
                <th className="py-3 px-3 text-center font-bold">Graceful Handoff</th>
                <th className="py-3 px-4 text-right font-bold w-[120px]">Resolution Yield</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono text-xs">
              {agentHeatmapData.map((agent) => {
                const isSelected = tenant.activeAgentId === agent.id || (!tenant.activeAgentId && agents[0]?.id === agent.id);
                
                return (
                  <tr 
                    key={agent.id} 
                    className={`transition-all hover:bg-white/[0.02] ${
                      isSelected ? 'bg-indigo-500/[0.03]' : ''
                    }`}
                  >
                    {/* Agent Identification */}
                    <td className="py-3 px-4 flex items-center gap-3">
                      <span className="text-xl bg-[#080b12] p-1.5 rounded-lg border border-white/5 flex items-center justify-center h-8 w-8 shrink-0 select-none">
                        {agent.avatar || '🤖'}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-white text-xs truncate">@{agent.name}</span>
                          {isSelected && (
                            <span className="text-[8px] font-black uppercase text-indigo-400 bg-indigo-500/10 px-1 border border-indigo-500/20 rounded">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 truncate leading-snug">{agent.role}</p>
                      </div>
                    </td>

                    {/* Lead Extraction Cell */}
                    <td className="py-3 px-3 text-center">
                      {(() => {
                        const score = agent.rates.leads;
                        const delta = agent.deltas.leads;
                        const isUp = delta > 0;
                        return (
                          <div className="inline-flex flex-col items-center gap-1 p-2 rounded-xl border border-white/5 w-24 h-[64px] bg-slate-900/60 transition-all hover:border-white/10 text-center select-none cursor-help relative" title={`Simulated CRM ingestion parsing rate success. Trend: ${isUp ? '+' : ''}${delta}% compare to previous period`}>
                            <div className="flex items-center gap-1 justify-center pt-0.5">
                              <span className="text-[11px] font-bold text-white leading-none">{score}%</span>
                              <span className={`text-[8.5px] font-black flex items-center ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {isUp ? '▲' : '▼'}
                                <span className="text-[7px] font-semibold tracking-tighter ml-0.5">{Math.abs(delta)}%</span>
                              </span>
                            </div>
                            <span className={`text-[8px] font-black uppercase tracking-wider block ${
                              score >= 93 ? 'text-emerald-400' : score >= 88 ? 'text-blue-400' : 'text-slate-400'
                            }`}>
                              {score >= 93 ? 'OPTIMAL' : score >= 88 ? 'HEALTHY' : 'STABLE'}
                            </span>
                            <div className="w-1.5 h-1.5 rounded-full mt-1 shadow" style={{
                              backgroundColor: score >= 93 ? '#10b881' : score >= 88 ? '#3b82f6' : '#64748b'
                            }} />
                          </div>
                        );
                      })()}
                    </td>

                    {/* FAQ Answer Match Rate */}
                    <td className="py-3 px-3 text-center">
                      {(() => {
                        const score = agent.rates.faq;
                        const delta = agent.deltas.faq;
                        const isUp = delta > 0;
                        return (
                          <div className="inline-flex flex-col items-center gap-1 p-2 rounded-xl border border-white/5 w-24 h-[64px] bg-slate-900/60 transition-all hover:border-white/10 text-center select-none cursor-help relative" title={`Document mapping overlap query resolution precision. Trend: ${isUp ? '+' : ''}${delta}% compare to previous period`}>
                            <div className="flex items-center gap-1 justify-center pt-0.5">
                              <span className="text-[11px] font-bold text-white leading-none">{score}%</span>
                              <span className={`text-[8.5px] font-black flex items-center ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {isUp ? '▲' : '▼'}
                                <span className="text-[7px] font-semibold tracking-tighter ml-0.5">{Math.abs(delta)}%</span>
                              </span>
                            </div>
                            <span className={`text-[8px] font-black uppercase tracking-wider block ${
                              score >= 93 ? 'text-emerald-400' : score >= 88 ? 'text-blue-400' : 'text-slate-400'
                            }`}>
                              {score >= 93 ? 'OPTIMAL' : score >= 88 ? 'HEALTHY' : 'STABLE'}
                            </span>
                            <div className="w-1.5 h-1.5 rounded-full mt-1 shadow" style={{
                              backgroundColor: score >= 93 ? '#10b881' : score >= 88 ? '#3b82f6' : '#64748b'
                            }} />
                          </div>
                        );
                      })()}
                    </td>

                    {/* Calendaring scheduler synchronization */}
                    <td className="py-3 px-3 text-center">
                      {(() => {
                        const score = agent.rates.scheduler;
                        const delta = agent.deltas.scheduler;
                        const isUp = delta > 0;
                        return (
                          <div className="inline-flex flex-col items-center gap-1 p-2 rounded-xl border border-white/5 w-24 h-[64px] bg-slate-900/60 transition-all hover:border-white/10 text-center select-none cursor-help relative" title={`Calendar API conflict check response execution accuracy. Trend: ${isUp ? '+' : ''}${delta}% compare to previous period`}>
                            <div className="flex items-center gap-1 justify-center pt-0.5">
                              <span className="text-[11px] font-bold text-white leading-none">{score}%</span>
                              <span className={`text-[8.5px] font-black flex items-center ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {isUp ? '▲' : '▼'}
                                <span className="text-[7px] font-semibold tracking-tighter ml-0.5">{Math.abs(delta)}%</span>
                              </span>
                            </div>
                            <span className={`text-[8px] font-black uppercase tracking-wider block ${
                              score >= 93 ? 'text-emerald-400' : score >= 88 ? 'text-blue-400' : 'text-slate-400'
                            }`}>
                              {score >= 93 ? 'OPTIMAL' : score >= 88 ? 'HEALTHY' : 'STABLE'}
                            </span>
                            <div className="w-1.5 h-1.5 rounded-full mt-1 shadow" style={{
                              backgroundColor: score >= 93 ? '#10b881' : score >= 88 ? '#3b82f6' : '#64748b'
                            }} />
                          </div>
                        );
                      })()}
                    </td>

                    {/* Out of bounds escalation Handoff rate */}
                    <td className="py-3 px-3 text-center">
                      {(() => {
                        const score = agent.rates.graceful_handoff;
                        const delta = agent.deltas.graceful_handoff;
                        const isUp = delta > 0;
                        return (
                          <div className="inline-flex flex-col items-center gap-1 p-2 rounded-xl border border-white/5 w-24 h-[64px] bg-slate-900/60 transition-all hover:border-white/10 text-center select-none cursor-help relative" title={`Escalation trigger context safety criteria match. Trend: ${isUp ? '+' : ''}${delta}% compare to previous period`}>
                            <div className="flex items-center gap-1 justify-center pt-0.5">
                              <span className="text-[11px] font-bold text-white leading-none">{score}%</span>
                              <span className={`text-[8.5px] font-black flex items-center ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {isUp ? '▲' : '▼'}
                                <span className="text-[7px] font-semibold tracking-tighter ml-0.5">{Math.abs(delta)}%</span>
                              </span>
                            </div>
                            <span className={`text-[8px] font-black uppercase tracking-wider block ${
                              score >= 93 ? 'text-emerald-400' : score >= 88 ? 'text-blue-400' : 'text-slate-400'
                            }`}>
                              {score >= 93 ? 'OPTIMAL' : score >= 88 ? 'HEALTHY' : 'STABLE'}
                            </span>
                            <div className="w-1.5 h-1.5 rounded-full mt-1 shadow" style={{
                              backgroundColor: score >= 93 ? '#10b881' : score >= 88 ? '#3b82f6' : '#64748b'
                            }} />
                          </div>
                        );
                      })()}
                    </td>

                    {/* Cumulative Averaged Score Row */}
                    <td className={`py-3 px-4 text-right transition-colors duration-250 ${
                      agent.avgResolutionRate < alertThreshold 
                        ? 'bg-rose-500/10 border-l border-r border-rose-500/15' 
                        : ''
                    }`}>
                      <div className="flex flex-col items-end gap-1.5 justify-center">
                        <div className="flex items-center gap-1.5 justify-end">
                          {agent.avgResolutionRate < alertThreshold && (
                            <span 
                              className="text-rose-400 animate-pulse text-[11px] font-black mr-0.5 select-none" 
                              title={`ALERT: Resolution yield is ${agent.avgResolutionRate}%, which is below the target threshold of ${alertThreshold}%!`}
                            >
                              ⚠️
                            </span>
                          )}
                          <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md border text-[9px] font-black ${
                            agent.avgDelta > 0 
                              ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' 
                              : 'text-rose-400 bg-rose-500/10 border-rose-500/20'
                          }`} title={`Trending ${agent.avgDelta > 0 ? 'up' : 'down'} by ${Math.abs(agent.avgDelta)}% compared to the previous period`}>
                            {agent.avgDelta > 0 ? (
                              <span className="text-emerald-400 font-bold text-[10px] mr-0.5">↑</span>
                            ) : (
                              <span className="text-rose-400 font-bold text-[10px] mr-0.5">↓</span>
                            )}
                            <span>{Math.abs(agent.avgDelta)}%</span>
                          </span>
                          <span className={`text-[13px] font-black ${agent.avgResolutionRate < alertThreshold ? 'text-rose-400' : 'text-white'}`}>{agent.avgResolutionRate}%</span>
                        </div>
                        <div className="w-16 h-1 bg-white/5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              agent.avgResolutionRate < alertThreshold 
                                ? 'bg-rose-500' 
                                : 'bg-gradient-to-r from-blue-500 to-indigo-400'
                            }`} 
                            style={{ width: `${agent.avgResolutionRate}%` }} 
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Heatmap Legend */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1 font-mono text-[9.5px] text-slate-400 select-none">
          <span className="font-semibold text-slate-500 uppercase tracking-widest text-[9px] block">Threshold Index:</span>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#10b881]" />
            <span>Optimal (93% - 100%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#3b82f6]" />
            <span>Healthy (88% - 92%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#64748b]" />
            <span>Stable (80% - 87%)</span>
          </div>
          <div className="flex items-center gap-1.5 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 text-rose-450 font-bold">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping" />
            <span>Alert Active (&lt; {alertThreshold}%)</span>
          </div>
        </div>
      </div>
      </div>
      )}

      {/* Real-time Ops Section */}
      {insightsSection === 'realtime' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <LiveActivityFeed tenant={tenant} />
          </div>
          <div className="space-y-6">
            <ActiveConversationsCounter tenant={tenant} />
            <SystemHealthMonitor />
            <SLATimer tenant={tenant} />
          </div>
        </div>
      )}

      {/* Customer Intelligence Section */}
      {insightsSection === 'intelligence' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SentimentGauge tenant={tenant} />
          <ResponseTimeDistribution tenant={tenant} />
          <CustomerJourneyMap />
          <GeographicHeatmap tenant={tenant} />
        </div>
      )}

      {/* Business ROI Section */}
      {insightsSection === 'roi' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <RevenueAttribution tenant={tenant} />
          <SubscriptionUsageMeter tenant={tenant} />
          <ROICalculator tenant={tenant} />
        </div>
      )}

      {/* Team & Collab Section */}
      {insightsSection === 'team' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <EscalationQueue tenant={tenant} onTakeoverConvo={onTakeoverConvo} />
          </div>
          <div className="space-y-6">
            <AgentAvailability />
            <TeamLeaderboard />
          </div>
        </div>
      )}

      {/* Helpful educational dashboard footer */}
      <div className="p-4 bg-[#0d121d] border border-white/5 rounded-2xl flex flex-col sm:flex-row items-center gap-3.5 justify-between">
        <div className="flex items-center gap-2.5 text-xs">
          <span className="p-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg">
            <Zap className="h-4 w-4 animate-bounce" />
          </span>
          <div className="leading-snug">
            <h4 className="text-white font-bold font-sans">Automated Funnel Optimization</h4>
            <p className="text-[10.5px] text-slate-400 font-mono mt-0.5">
              The AI Agent analyzes previous replies and optimizes conversation paths automatically to drive conversion up.
            </p>
          </div>
        </div>
        <p className="text-[9.5px] text-slate-500 font-mono text-center sm:text-right leading-relaxed select-none">
          Statistics auto-refresh upon sandbox simulations. • Timezone: UTC
        </p>
      </div>

    </div>
  );
};
