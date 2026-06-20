import React from 'react';
import { useSaaS } from '../../context/SaaSContext';
import { useLanguage } from '../../LanguageContext';
import { CreditCard, CheckCircle, Zap, Shield, Sparkles, BarChart2 } from 'lucide-react';

export const BillingTab: React.FC = () => {
  const { selectedTenant, updateTenantFields } = useSaaS();
  const { t } = useLanguage();

  if (!selectedTenant) return null;

  const currentTier = selectedTenant.subscriptionTier || 'Free';
  const currentCount = selectedTenant.messageCount || 0;

  const limits = {
    Free: { max: 50, price: '$0', desc: 'Ideal for trial and sandbox validation.' },
    Starter: { max: 500, price: '$49/mo', desc: 'Perfect for growing businesses.' },
    Business: { max: 5000, price: '$149/mo', desc: 'Full multi-channel AI automation.' },
    Enterprise: { max: Infinity, price: 'Custom', desc: 'Unlimited scale and custom SLAs.' }
  };

  const currentLimit = limits[currentTier as keyof typeof limits]?.max || 50;
  const progressPercent = currentLimit === Infinity 
    ? 0 
    : Math.min(100, Math.round((currentCount / currentLimit) * 100));

  const handleUpgrade = (tier: string) => {
    updateTenantFields({
      subscriptionTier: tier,
      // Reset message count on upgrade to demonstrate limit lift
      messageCount: 0
    });
  };

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <div className="border border-white/5 rounded-2xl bg-[#090d16] p-6 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                ACTIVE PLAN
              </span>
              <h2 className="text-xl font-bold text-white tracking-tight">{currentTier} Plan</h2>
            </div>
            <p className="text-xs text-slate-400 max-w-md">
              {limits[currentTier as keyof typeof limits]?.desc}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="h-10 w-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[10px] font-mono text-slate-500 uppercase">Current Billing Cycle</div>
              <div className="text-xs text-slate-200 font-medium">Renews automatically next month</div>
            </div>
          </div>
        </div>

        {/* Quota Progress */}
        {currentLimit !== Infinity && (
          <div className="mt-8 pt-6 border-t border-white/5 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-slate-400">
                <BarChart2 className="h-4 w-4 text-slate-500" />
                <span>Monthly Message Usage</span>
              </div>
              <span className="font-mono text-slate-350">
                <strong className="text-white font-bold">{currentCount}</strong> / {currentLimit} messages
              </span>
            </div>

            <div className="h-2 w-full bg-[#0d121d] rounded-full overflow-hidden border border-white/5">
              <div 
                className={`h-full transition-all duration-500 rounded-full ${
                  progressPercent > 90 
                    ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]' 
                    : progressPercent > 70 
                      ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.4)]' 
                      : 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.4)]'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
              <span>{progressPercent}% Consumed</span>
              {progressPercent > 80 && (
                <span className="text-amber-400 font-bold animate-pulse">⚠️ Approaching plan limits. Consider upgrading.</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Pricing Options */}
      <div className="space-y-4">
        <h3 className="text-xs uppercase font-mono tracking-widest text-slate-400 font-bold">Select Subscription Tier</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Free Tier */}
          <div className={`border rounded-2xl p-5 flex flex-col justify-between transition-all bg-[#090d16] ${
            currentTier === 'Free' 
              ? 'border-blue-500 bg-blue-500/[0.02] shadow-[0_0_20px_rgba(59,130,246,0.1)]' 
              : 'border-white/5 hover:border-white/10'
          }`}>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">Free Sandbox</span>
                {currentTier === 'Free' && <CheckCircle className="h-4 w-4 text-blue-500" />}
              </div>
              <div>
                <span className="text-2xl font-bold text-white">$0</span>
                <span className="text-[10px] font-mono text-slate-500">/ forever</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Build and simulate your AI agent with full sandbox webhook logs.
              </p>
              <ul className="space-y-2 text-[10px] text-slate-400 pt-2 border-t border-white/5">
                <li className="flex items-center gap-1.5">
                  <CheckCircle className="h-3 w-3 text-slate-600" />
                  <span>50 AI replies/month</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle className="h-3 w-3 text-slate-600" />
                  <span>1 AI Agent model seat</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle className="h-3 w-3 text-slate-600" />
                  <span>Basic RAG indexer</span>
                </li>
              </ul>
            </div>
            <button
              onClick={() => handleUpgrade('Free')}
              disabled={currentTier === 'Free'}
              className={`w-full mt-6 py-2 rounded-xl text-xs font-semibold font-mono transition-all cursor-pointer ${
                currentTier === 'Free'
                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 cursor-default'
                  : 'bg-white/5 hover:bg-white/10 text-slate-350 border border-white/10'
              }`}
            >
              {currentTier === 'Free' ? 'Active Plan' : 'Downgrade to Free'}
            </button>
          </div>

          {/* Starter Tier */}
          <div className={`border rounded-2xl p-5 flex flex-col justify-between transition-all bg-[#090d16] ${
            currentTier === 'Starter' 
              ? 'border-blue-500 bg-blue-500/[0.02] shadow-[0_0_20px_rgba(59,130,246,0.1)]' 
              : 'border-white/5 hover:border-white/10'
          }`}>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">Starter</span>
                {currentTier === 'Starter' && <CheckCircle className="h-4 w-4 text-blue-500" />}
              </div>
              <div>
                <span className="text-2xl font-bold text-white">$49</span>
                <span className="text-[10px] font-mono text-slate-500">/ month</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Connect real WhatsApp numbers and deploy live agents to clients.
              </p>
              <ul className="space-y-2 text-[10px] text-slate-400 pt-2 border-t border-white/5">
                <li className="flex items-center gap-1.5">
                  <Zap className="h-3 w-3 text-blue-400" />
                  <span>500 AI replies/month</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle className="h-3 w-3 text-slate-600" />
                  <span>2 AI Agent model seats</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle className="h-3 w-3 text-slate-600" />
                  <span>Advanced vector RAG</span>
                </li>
              </ul>
            </div>
            <button
              onClick={() => handleUpgrade('Starter')}
              disabled={currentTier === 'Starter'}
              className={`w-full mt-6 py-2 rounded-xl text-xs font-semibold font-mono transition-all cursor-pointer ${
                currentTier === 'Starter'
                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 cursor-default'
                  : 'bg-blue-600 hover:bg-blue-550 text-white shadow-[0_0_12px_rgba(37,99,235,0.4)]'
              }`}
            >
              {currentTier === 'Starter' ? 'Active Plan' : 'Select Starter'}
            </button>
          </div>

          {/* Business Tier */}
          <div className={`border rounded-2xl p-5 flex flex-col justify-between transition-all bg-[#090d16] ${
            currentTier === 'Business' 
              ? 'border-blue-500 bg-blue-500/[0.02] shadow-[0_0_20px_rgba(59,130,246,0.1)]' 
              : 'border-white/5 hover:border-white/10'
          }`}>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">Business</span>
                {currentTier === 'Business' && <CheckCircle className="h-4 w-4 text-blue-500" />}
              </div>
              <div>
                <span className="text-2xl font-bold text-white">$149</span>
                <span className="text-[10px] font-mono text-slate-500">/ month</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Expand to multi-channel AI automation over Telegram and SMS.
              </p>
              <ul className="space-y-2 text-[10px] text-slate-400 pt-2 border-t border-white/5">
                <li className="flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-amber-400 animate-pulse" />
                  <span>5,000 AI replies/month</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle className="h-3 w-3 text-slate-600" />
                  <span>5 AI Agent model seats</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle className="h-3 w-3 text-slate-600" />
                  <span>Multi-channel (Telegram, SMS)</span>
                </li>
              </ul>
            </div>
            <button
              onClick={() => handleUpgrade('Business')}
              disabled={currentTier === 'Business'}
              className={`w-full mt-6 py-2 rounded-xl text-xs font-semibold font-mono transition-all cursor-pointer ${
                currentTier === 'Business'
                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 cursor-default'
                  : 'bg-blue-600 hover:bg-blue-550 text-white shadow-[0_0_12px_rgba(37,99,235,0.4)]'
              }`}
            >
              {currentTier === 'Business' ? 'Active Plan' : 'Select Business'}
            </button>
          </div>

          {/* Enterprise Tier */}
          <div className={`border rounded-2xl p-5 flex flex-col justify-between transition-all bg-[#090d16] ${
            currentTier === 'Enterprise' 
              ? 'border-blue-500 bg-blue-500/[0.02] shadow-[0_0_20px_rgba(59,130,246,0.1)]' 
              : 'border-white/5 hover:border-white/10'
          }`}>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">Enterprise</span>
                {currentTier === 'Enterprise' && <CheckCircle className="h-4 w-4 text-blue-500" />}
              </div>
              <div>
                <span className="text-2xl font-bold text-white">Custom</span>
                <span className="text-[10px] font-mono text-slate-500">/ tailwinds</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Dedicated compute, unlimited quotas, and professional custom integrations.
              </p>
              <ul className="space-y-2 text-[10px] text-slate-400 pt-2 border-t border-white/5">
                <li className="flex items-center gap-1.5">
                  <Shield className="h-3 w-3 text-teal-400" />
                  <span>Unlimited usage quota</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle className="h-3 w-3 text-slate-600" />
                  <span>Unlimited model seats</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle className="h-3 w-3 text-slate-600" />
                  <span>Dedicated support SLAs</span>
                </li>
              </ul>
            </div>
            <button
              onClick={() => handleUpgrade('Enterprise')}
              disabled={currentTier === 'Enterprise'}
              className={`w-full mt-6 py-2 rounded-xl text-xs font-semibold font-mono transition-all cursor-pointer ${
                currentTier === 'Enterprise'
                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 cursor-default'
                  : 'bg-white/5 hover:bg-white/10 text-slate-350 border border-white/10'
              }`}
            >
              {currentTier === 'Enterprise' ? 'Active Plan' : 'Contact Sales'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
