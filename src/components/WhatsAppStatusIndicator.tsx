import React from 'react';
import { 
  Wifi, 
  WifiOff, 
  AlertCircle, 
  Settings, 
  Sparkles,
  Smartphone
} from 'lucide-react';

interface WhatsAppStatusIndicatorProps {
  status: 'connected' | 'disconnected' | 'pending_verification';
  phoneNumber: string;
  sandboxActive: boolean;
  sandboxNumbersCount: number;
  onConfigureClick: () => void;
}

export const WhatsAppStatusIndicator: React.FC<WhatsAppStatusIndicatorProps> = ({
  status,
  phoneNumber,
  sandboxActive,
  sandboxNumbersCount,
  onConfigureClick
}) => {
  // Helper to format the phone numbers cleanly
  const formatPhoneNumber = (num: string) => {
    if (!num) return 'Not Configured';
    const cleaned = num.replace(/\D/g, '');
    if (cleaned.length > 8) {
      return `+${cleaned.slice(0, -4)}****`;
    }
    return `+${cleaned}`;
  };

  // Determine colors and labels based on active configuration
  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
          dot: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]',
          label: 'Active & Connected',
          desc: sandboxActive ? 'Sandbox Environment' : 'Live Production Gateway',
          icon: Wifi
        };
      case 'pending_verification':
        return {
          bg: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
          dot: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]',
          label: 'Verification Pending',
          desc: 'Awaiting webhook test',
          icon: AlertCircle
        };
      case 'disconnected':
      default:
        return {
          bg: 'bg-slate-550/10 border-slate-700/50 text-slate-400',
          dot: 'bg-slate-500 shadow-none',
          label: 'Disconnected',
          desc: 'API setup required',
          icon: WifiOff
        };
    }
  };

  const config = getStatusConfig();
  const IconComponent = config.icon;

  return (
    <div 
      id="whatsapp-realtime-status-card"
      onClick={onConfigureClick}
      className={`group w-full border rounded-xl p-3 bg-slate-950/40 hover:bg-slate-900/60 hover:border-blue-500/30 transition-all duration-300 cursor-pointer flex flex-col gap-2 relative overflow-hidden select-none`}
    >
      {/* Background abstract radial blur */}
      <div 
        className={`absolute -top-10 -right-10 w-20 h-20 rounded-full blur-2xl opacity-20 pointer-events-none transition-all duration-300 group-hover:scale-125 ${
          status === 'connected' ? 'bg-emerald-500' : status === 'pending_verification' ? 'bg-amber-500' : 'bg-slate-500'
        }`} 
      />

      {/* Header telemetry area */}
      <div className="flex items-center justify-between z-10">
        <div className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full animate-pulse inline-block ${config.dot}`} />
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-300">
            WhatsApp Link
          </span>
        </div>
        <Settings className="h-3.5 w-3.5 text-slate-500 group-hover:text-blue-400 group-hover:rotate-45 transition-all duration-500" />
      </div>

      {/* Badge container info */}
      <div className={`flex items-center gap-2 border rounded-lg p-2.5 ${config.bg} transition-colors duration-300`}>
        <IconComponent className="h-4.5 w-4.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-bold font-sans tracking-wide leading-none text-slate-200">
            {config.label}
          </div>
          <div className="text-[9px] font-mono text-slate-450 mt-0.5 truncate leading-none">
            {config.desc}
          </div>
        </div>
      </div>

      {/* Secondary metadata indicator */}
      <div className="flex items-center justify-between text-[9.5px] font-mono text-slate-400 mt-0.5 z-10 px-0.5">
        <div className="flex items-center gap-1 truncate max-w-[70%]">
          <Smartphone className="h-3 w-3 text-slate-500 shrink-0" />
          <span className="truncate text-slate-350 font-bold">
            {formatPhoneNumber(phoneNumber)}
          </span>
        </div>

        {sandboxActive ? (
          <span className="bg-blue-500/10 border border-blue-500/20 text-blue-400 px-1 py-0.5 rounded text-[8px] font-extrabold flex items-center gap-0.5 animate-pulse shrink-0">
            <Sparkles className="h-2 w-2" />
            <span>SANDBOX ({sandboxNumbersCount})</span>
          </span>
        ) : (
          status === 'connected' && (
            <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-1 py-0.5 rounded text-[8px] font-extrabold shrink-0">
              LIVE GATEWAY
            </span>
          )
        )}
      </div>

      {/* Slide-over interactive footer hint */}
      <div className="mt-1 pt-1.5 border-t border-white/5 flex items-center justify-between text-[9px] font-mono text-slate-500 group-hover:text-blue-400 transition-colors duration-300">
        <span>Click to manage channel</span>
        <span className="transform group-hover:translate-x-1.5 transition-transform duration-300">➔</span>
      </div>
    </div>
  );
};
