import React, { useMemo } from 'react';
import { 
  Smile, 
  Clock, 
  MapPin, 
  Compass, 
  TrendingUp,
  ArrowRight
} from 'lucide-react';
import { Tenant } from '../../types';

interface CustomerIntelligenceProps {
  tenant: Tenant;
}

// ----------------------------------------------------
// 1. Customer Sentiment Gauge
// ----------------------------------------------------
export const SentimentGauge: React.FC<CustomerIntelligenceProps> = ({ tenant }) => {
  // Deterministic values depending on the tenant properties
  const ratingSum = tenant.name.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const positivePct = 70 + (ratingSum % 25);
  const neutralPct = Math.round((100 - positivePct) * 0.7);
  const negativePct = 100 - positivePct - neutralPct;

  return (
    <div className="bg-[#080b12] border border-white/5 p-5 rounded-3xl space-y-4 shadow-xl select-none">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold font-mono text-slate-450 uppercase tracking-widest flex items-center gap-1.5">
          <Smile className="h-3.5 w-3.5 text-blue-400" />
          <span>Customer Sentiment</span>
        </p>
        <span className="text-[10px] font-mono text-emerald-400 font-bold flex items-center gap-0.5">
          <TrendingUp className="h-3 w-3" />
          +3.2%
        </span>
      </div>
      
      <div className="flex flex-col items-center justify-center pt-2">
        {/* Custom SVG Arc Gauge */}
        <div className="relative w-36 h-20">
          <svg className="w-full h-full" viewBox="0 0 100 50">
            {/* Background Arc */}
            <path
              d="M 10 50 A 40 40 0 0 1 90 50"
              fill="none"
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="10"
              strokeLinecap="round"
            />
            {/* Filled Arc */}
            <path
              d="M 10 50 A 40 40 0 0 1 90 50"
              fill="none"
              stroke="url(#sentimentGradient)"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray="126"
              strokeDashoffset={126 - (126 * positivePct) / 100}
              className="transition-all duration-1000"
            />
            <defs>
              <linearGradient id="sentimentGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="50%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#10b881" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-x-0 bottom-0 text-center flex flex-col justify-end">
            <span className="text-xl font-bold font-mono text-white leading-none">{positivePct}%</span>
            <span className="text-[8px] font-mono text-slate-500 uppercase mt-0.5">Positive rating</span>
          </div>
        </div>

        {/* Breakdown bars */}
        <div className="w-full grid grid-cols-3 gap-2 text-center text-xs font-mono border-t border-white/5 pt-4 mt-2">
          <div>
            <span className="text-emerald-400 block font-bold">{positivePct}%</span>
            <span className="text-slate-500 text-[8.5px] uppercase">Positive</span>
          </div>
          <div>
            <span className="text-amber-400 block font-bold">{neutralPct}%</span>
            <span className="text-slate-500 text-[8.5px] uppercase">Neutral</span>
          </div>
          <div>
            <span className="text-rose-400 block font-bold">{negativePct}%</span>
            <span className="text-slate-500 text-[8.5px] uppercase">Negative</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ----------------------------------------------------
// 2. Response Time Distribution
// ----------------------------------------------------
export const ResponseTimeDistribution: React.FC<CustomerIntelligenceProps> = ({ tenant }) => {
  // Generate deterministic distribution buckets
  const seed = tenant.name.length;
  const buckets = [
    { label: '< 1s', val: 35 + (seed % 10) },
    { label: '1-3s', val: 40 + (seed % 15) },
    { label: '3-5s', val: 15 - (seed % 5) },
    { label: '5-10s', val: 8 - (seed % 3) },
    { label: '10s+', val: 2 }
  ];

  const maxVal = Math.max(...buckets.map(b => b.val));

  return (
    <div className="bg-[#080b12] border border-white/5 p-5 rounded-3xl space-y-4 shadow-xl select-none">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold font-mono text-slate-450 uppercase tracking-widest flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-blue-400" />
          <span>Response Speed Profile</span>
        </p>
        <span className="text-[9.5px] font-mono text-slate-500">Median: 1.6s</span>
      </div>

      <div className="space-y-2 pt-2">
        {buckets.map((b, index) => {
          const pct = Math.round((b.val / maxVal) * 100);
          return (
            <div key={index} className="flex items-center gap-3 font-mono text-xs">
              <span className="w-10 text-slate-400 text-[10.5px]">{b.label}</span>
              <div className="flex-1 h-3 bg-white/5 rounded-md overflow-hidden relative border border-white/5 shadow-inner">
                <div 
                  className="h-full bg-gradient-to-r from-blue-600/80 to-purple-600/80 rounded-md transition-all duration-1000"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-8 text-right font-bold text-white text-[10.5px]">{b.val}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ----------------------------------------------------
// 3. Customer Journey Map
// ----------------------------------------------------
export const CustomerJourneyMap: React.FC = () => {
  const pathways = [
    { title: 'Greeting', detail: 'Greeting Trigger', pct: 100, active: true },
    { title: 'KB Search', detail: 'FAQ Answers', pct: 82, active: true },
    { title: 'Form Fills', detail: 'Lead Captured', pct: 45, active: true },
    { title: 'Slot Booked', detail: 'Resolved', pct: 28, active: false }
  ];

  return (
    <div className="bg-[#080b12] border border-white/5 p-5 rounded-3xl space-y-4 shadow-xl select-none">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold font-mono text-slate-450 uppercase tracking-widest flex items-center gap-1.5">
          <Compass className="h-3.5 w-3.5 text-blue-400" />
          <span>Customer Conversion Paths</span>
        </p>
        <span className="text-[9px] font-mono text-slate-500 font-bold uppercase bg-white/5 px-2 py-0.5 rounded">Top Funnel</span>
      </div>

      <div className="flex flex-col space-y-2 pt-2">
        {pathways.map((p, idx) => (
          <div key={idx} className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="flex h-5 w-5 rounded-full border border-white/10 bg-[#0d121d] text-[9.5px] font-bold text-white items-center justify-center">
                {idx + 1}
              </span>
              <div>
                <span className="font-bold text-white block text-[11px]">{p.title}</span>
                <span className="text-[8.5px] text-slate-500 block leading-none">{p.detail}</span>
              </div>
            </div>
            {idx < pathways.length - 1 && (
              <ArrowRight className="h-3.5 w-3.5 text-slate-600 self-center hidden sm:block" />
            )}
            <div className="text-right font-mono">
              <span className="text-xs font-bold text-blue-400">{p.pct}%</span>
              <span className="text-[8px] text-slate-500 block">conversion</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ----------------------------------------------------
// 4. Geographic Heatmap
// ----------------------------------------------------
export const GeographicHeatmap: React.FC<CustomerIntelligenceProps> = ({ tenant }) => {
  // Deterministic mock breakdown per tenant ID
  const sum = tenant.id.length + 3;
  const data = [
    { country: 'United States', flag: '🇺🇸', code: '+1', share: 45 + (sum % 10) },
    { country: 'United Kingdom', flag: '🇬🇧', code: '+44', share: 25 - (sum % 5) },
    { country: 'France', flag: '🇫🇷', code: '+33', share: 18 - (sum % 3) },
    { country: 'Algeria', flag: '🇩🇿', code: '+213', share: 12 + (sum % 4) }
  ];

  return (
    <div className="bg-[#080b12] border border-white/5 p-5 rounded-3xl space-y-4 shadow-xl select-none">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold font-mono text-slate-450 uppercase tracking-widest flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 text-blue-400" />
          <span>Regional Distribution</span>
        </p>
        <span className="text-[9.5px] font-mono text-slate-500">Phone Code Mapping</span>
      </div>

      <div className="space-y-2.5 pt-2">
        {data.map((c, idx) => (
          <div key={idx} className="flex items-center justify-between font-mono text-xs">
            <div className="flex items-center gap-2">
              <span className="text-base select-none">{c.flag}</span>
              <span className="font-bold text-white text-[11px]">{c.country}</span>
              <span className="text-[9px] text-slate-500 font-semibold bg-white/5 px-1 py-0.2 rounded">{c.code}</span>
            </div>
            <div className="text-right">
              <span className="font-bold text-white text-[11.5px]">{c.share}%</span>
              <div className="w-12 h-1 bg-white/5 rounded-full overflow-hidden mt-0.5">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${c.share}%` }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
