import React, { useMemo } from 'react';
import { 
  Cpu, 
  Target, 
  Coins, 
  Sparkles, 
  TrendingUp 
} from 'lucide-react';
import { Tenant } from '../../types';

interface BotPerformanceProps {
  tenant: Tenant;
}

// ----------------------------------------------------
// 1. RAG Confidence Monitor
// ----------------------------------------------------
export const RAGConfidence: React.FC<BotPerformanceProps> = ({ tenant }) => {
  // Generate confidence profile dependent on KB size
  const kbSize = tenant.knowledgeBase?.length || 4;
  const highConf = Math.min(95, 60 + (kbSize * 4));
  const medConf = Math.max(5, Math.round((100 - highConf) * 0.7));
  const lowConf = Math.max(0, 100 - highConf - medConf);

  return (
    <div className="bg-[#080b12] border border-white/5 p-5 rounded-3xl space-y-4 shadow-xl select-none">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold font-mono text-slate-450 uppercase tracking-widest flex items-center gap-1.5">
          <Cpu className="h-3.5 w-3.5 text-amber-500" />
          <span>RAG Query Accuracy</span>
        </p>
        <span className="text-[9.5px] font-mono text-amber-500 bg-amber-500/10 px-2 py-0.5 border border-amber-500/20 rounded font-semibold whitespace-nowrap">
          Cosine Similarity
        </span>
      </div>

      <div className="space-y-1.5 pt-2 font-mono">
        <div className="flex items-end justify-between">
          <span className="text-2xl font-bold text-white">0.89</span>
          <span className="text-[10px] text-slate-450 pb-0.5">Average score</span>
        </div>
        <p className="text-[9.5px] text-slate-500 leading-normal">
          Average vector overlap of user inquiries matched to KB document chunks.
        </p>
      </div>

      <div className="space-y-2 border-t border-white/5 pt-3 font-mono text-xs">
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10.5px]">
            <span className="text-emerald-400">High (&gt;0.85):</span>
            <span className="font-bold text-white">{highConf}%</span>
          </div>
          <div className="w-full h-1.5 bg-white/5 border border-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500" style={{ width: `${highConf}%` }} />
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10.5px]">
            <span className="text-amber-400">Medium (0.6 - 0.85):</span>
            <span className="font-bold text-white">{medConf}%</span>
          </div>
          <div className="w-full h-1.5 bg-white/5 border border-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-amber-500" style={{ width: `${medConf}%` }} />
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10.5px]">
            <span className="text-rose-400">Low (&lt;0.6):</span>
            <span className="font-bold text-white">{lowConf}%</span>
          </div>
          <div className="w-full h-1.5 bg-white/5 border border-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-rose-500" style={{ width: `${lowConf}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
};

// ----------------------------------------------------
// 2. Bot Containment Rate Donut
// ----------------------------------------------------
export const BotContainmentRate: React.FC<BotPerformanceProps> = ({ tenant }) => {
  // Deterministic rates
  const score = 94.2 + (tenant.name.length % 4) * 0.8;
  const circumference = 2 * Math.PI * 30; // ~188.4
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="bg-[#080b12] border border-white/5 p-5 rounded-3xl space-y-4 shadow-xl select-none">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold font-mono text-slate-450 uppercase tracking-widest flex items-center gap-1.5">
          <Target className="h-3.5 w-3.5 text-blue-400" />
          <span>Bot Containment</span>
        </p>
        <span className="text-[9.5px] font-mono text-slate-500">Auto Resolution</span>
      </div>

      <div className="flex flex-col items-center justify-center pt-2">
        <div className="relative w-28 h-28 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-95" viewBox="0 0 80 80">
            {/* Background circle */}
            <circle
              cx="40"
              cy="40"
              r="30"
              fill="none"
              stroke="rgba(255, 255, 255, 0.05)"
              strokeWidth="7"
            />
            {/* Front circle */}
            <circle
              cx="40"
              cy="40"
              r="30"
              fill="none"
              stroke="url(#containmentGradient)"
              strokeWidth="7"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              className="transition-all duration-1000"
            />
            <defs>
              <linearGradient id="containmentGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#10b881" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute flex flex-col items-center justify-center text-center">
            <span className="text-base font-bold font-mono text-white leading-none">{score.toFixed(1)}%</span>
            <span className="text-[7.5px] font-mono text-slate-500 uppercase mt-0.5">Contained</span>
          </div>
        </div>

        <div className="w-full flex items-center justify-between text-xs font-mono border-t border-white/5 pt-3.5 mt-2.5">
          <span className="text-slate-400">Total automated resolving:</span>
          <strong className="text-white">{score.toFixed(1)}%</strong>
        </div>
      </div>
    </div>
  );
};

// ----------------------------------------------------
// 3. Token Usage & Cost Tracker
// ----------------------------------------------------
export const TokenCostTracker: React.FC<BotPerformanceProps> = ({ tenant }) => {
  // Generate deterministic token metrics based on leads count
  const leads = tenant.leads?.length || 5;
  const inputTokens = leads * 45000 + 120000;
  const outputTokens = leads * 30000 + 90000;
  const estimatedCost = (inputTokens * 0.00015 / 1000) + (outputTokens * 0.0006 / 1000);

  return (
    <div className="bg-[#080b12] border border-white/5 p-5 rounded-3xl space-y-4 shadow-xl select-none">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold font-mono text-slate-450 uppercase tracking-widest flex items-center gap-1.5">
          <Coins className="h-3.5 w-3.5 text-blue-400" />
          <span>LLM Inference Cost</span>
        </p>
        <span className="text-[9.5px] font-mono text-emerald-450 bg-[#10b881]/10 px-2 py-0.5 border border-emerald-500/20 rounded font-semibold whitespace-nowrap">
          Gemini 2.5 Flash
        </span>
      </div>

      <div className="space-y-1.5 pt-2 font-mono">
        <span className="text-2xl font-bold text-white block">
          ${estimatedCost.toFixed(3)}
        </span>
        <p className="text-[9.5px] text-slate-500 leading-normal">
          Incurred model endpoint consumption charge for the current billing cycle.
        </p>
      </div>

      <div className="space-y-2 border-t border-white/5 pt-3 font-mono text-xs">
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Input Tokens:</span>
          <span className="font-bold text-white">{inputTokens.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Output Tokens:</span>
          <span className="font-bold text-white">{outputTokens.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};
