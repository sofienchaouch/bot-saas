import React, { useState } from 'react';
import { 
  Users, 
  AlertTriangle, 
  Award, 
  Check, 
  ArrowUpRight 
} from 'lucide-react';
import { Tenant } from '../../types';

interface TeamWidgetsProps {
  tenant: Tenant;
  onTakeoverConvo?: (convoId: string) => void;
}

// ----------------------------------------------------
// 1. Agent Availability Board
// ----------------------------------------------------
export const AgentAvailability: React.FC = () => {
  const agents = [
    { name: 'Sarah K.', status: 'online', task: '2 active chats', color: 'bg-emerald-500' },
    { name: 'Ahmed M.', status: 'busy', task: 'In Twilio Call', color: 'bg-amber-500' },
    { name: 'James L.', status: 'away', task: 'Away (10m)', color: 'bg-slate-500' }
  ];

  return (
    <div className="bg-[#080b12] border border-white/5 p-5 rounded-3xl space-y-4 shadow-xl select-none">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold font-mono text-slate-450 uppercase tracking-widest flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5 text-blue-400" />
          <span>Team Presence roster</span>
        </p>
        <span className="text-[9.5px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">3 / 3 Active</span>
      </div>

      <div className="space-y-3 pt-2">
        {agents.map((ag, idx) => (
          <div key={idx} className="flex items-center justify-between font-mono text-xs p-2 bg-[#0d121d] border border-white/5 rounded-xl">
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${ag.color}`} />
              <span className="font-bold text-white text-[11px]">{ag.name}</span>
            </div>
            <span className="text-[10px] text-slate-450">{ag.task}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ----------------------------------------------------
// 2. Escalation Queue Widget
// ----------------------------------------------------
export const EscalationQueue: React.FC<TeamWidgetsProps> = ({ tenant, onTakeoverConvo }) => {
  // Generate mock escalations based on tenant data
  const [escalations, setEscalations] = useState([
    { id: 'esc-1', sender: '+1-555-0129', reason: 'Billing discrepancy request', time: '3m ago', priority: 'HIGH' },
    { id: 'esc-2', sender: '+44-7700-9002', reason: 'API integration failure support', time: '8m ago', priority: 'MEDIUM' }
  ]);

  const handleResolve = (id: string) => {
    setEscalations(prev => prev.filter(e => e.id !== id));
  };

  return (
    <div className="bg-[#080b12] border border-white/5 p-5 rounded-3xl space-y-4 shadow-xl select-none">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold font-mono text-slate-450 uppercase tracking-widest flex items-center gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5 text-rose-500 animate-pulse" />
          <span>Escalation Inbox</span>
        </p>
        <span className="text-[9.5px] font-mono text-rose-450 bg-rose-500/10 px-2 py-0.5 border border-rose-500/20 rounded font-bold">
          {escalations.length} Pending
        </span>
      </div>

      <div className="space-y-3 pt-2">
        {escalations.length > 0 ? (
          escalations.map((esc) => (
            <div key={esc.id} className="p-3 bg-[#0d121d] border border-white/5 rounded-2xl space-y-2">
              <div className="flex items-center justify-between font-mono">
                <span className="text-[10.5px] font-bold text-white">{esc.sender}</span>
                <span className={`text-[8.5px] font-bold px-1.5 py-0.2 rounded border ${
                  esc.priority === 'HIGH' 
                    ? 'text-rose-400 bg-rose-500/10 border-rose-500/25' 
                    : 'text-amber-400 bg-amber-500/10 border-amber-500/25'
                }`}>{esc.priority}</span>
              </div>
              <p className="text-[10.5px] font-mono text-slate-400 leading-normal">{esc.reason}</p>
              <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[9.5px] font-mono">
                <span className="text-slate-500">{esc.time}</span>
                <div className="flex items-center gap-1.5">
                  <button 
                    onClick={() => handleResolve(esc.id)}
                    className="p-1 text-emerald-400 hover:bg-emerald-500/10 border border-emerald-500/20 rounded transition-all cursor-pointer"
                    title="Mark resolved"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button 
                    onClick={() => onTakeoverConvo?.(esc.sender)}
                    className="flex items-center gap-0.5 px-2 py-0.5 text-blue-400 hover:bg-blue-500/10 border border-blue-500/20 rounded transition-all cursor-pointer"
                  >
                    Takeover <ArrowUpRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="py-6 text-center text-slate-500 font-mono text-[10.5px]">
            ✨ Inbox clean! No pending escalations.
          </div>
        )}
      </div>
    </div>
  );
};

// ----------------------------------------------------
// 3. Team Leaderboard
// ----------------------------------------------------
export const TeamLeaderboard: React.FC = () => {
  const leaders = [
    { rank: 1, name: 'Sarah K.', score: '47 resolved', csat: '98%', medal: '🥇' },
    { rank: 2, name: 'Ahmed M.', score: '39 resolved', csat: '95%', medal: '🥈' },
    { rank: 3, name: 'James L.', score: '28 resolved', csat: '92%', medal: '🥉' }
  ];

  return (
    <div className="bg-[#080b12] border border-white/5 p-5 rounded-3xl space-y-4 shadow-xl select-none">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold font-mono text-slate-450 uppercase tracking-widest flex items-center gap-1.5">
          <Award className="h-3.5 w-3.5 text-blue-400" />
          <span>Team Leaderboard</span>
        </p>
        <span className="text-[9.5px] font-mono text-slate-500">Weekly Stats</span>
      </div>

      <div className="space-y-2.5 pt-2">
        {leaders.map((lead) => (
          <div key={lead.rank} className="flex items-center justify-between font-mono text-xs p-2.5 bg-[#0d121d] border border-white/5 rounded-2xl">
            <div className="flex items-center gap-2">
              <span className="text-sm select-none">{lead.medal}</span>
              <span className="font-bold text-white text-[11px]">{lead.name}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block">{lead.score}</span>
              <span className="text-[8px] font-bold text-emerald-450 block">{lead.csat} CSAT</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
