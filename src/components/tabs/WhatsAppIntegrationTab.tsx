import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSaaS } from '../../context/SaaSContext';
import { useLanguage } from '../../LanguageContext';
import {
  Smartphone,
  Plus,
  Trash2,
  AlertCircle,
  RefreshCw,
  Send,
  Terminal,
  Volume2,
  VolumeX,
  Mic,
  Check,
  CheckCircle,
  Settings,
  Globe,
  Loader2,
  Cloud,
  Zap,
  Eye,
  EyeOff,
  Phone
} from 'lucide-react';

export const WhatsAppIntegrationTab: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  
  const {
    activeChannelSubTab,
    setActiveChannelSubTab,
    telegramBotTokenInput,
    setTelegramBotTokenInput,
    telegramConnecting,
    telegramError,
    telegramConnectedUsername,
    handleConnectTelegram,
    handleDisconnectTelegram,
    waStatus,
    setWaStatus,
    messengerStatus,
    setMessengerStatus,
    waPhone,
    setWaPhone,
    waSid,
    setWaSid,
    waToken,
    setWaToken,
    waShowToken,
    setWaShowToken,
    waSandboxActive,
    waSandboxNumbers,
    waSandboxInputNumber,
    setWaSandboxInputNumber,
    waSandboxCode,
    setWaSandboxCode,
    waSandboxSentCode,
    waSandboxStep,
    waSandboxError,
    handleUpdateWhatsAppIntegration,
    handleTestConnection,
    handleToggleSandboxMode,
    handleRequestSandboxOTP,
    handleVerifySandboxOTP,
    handleDeleteSandboxNumber,
    isTestingConnection,
    connectionFeedback,
    waTestMode,
    setWaTestMode,
    testWebhookSenderName,
    setTestWebhookSenderName,
    testWebhookSenderPhone,
    setTestWebhookSenderPhone,
    testWebhookMessage,
    setTestWebhookMessage,
    isTestingWebhook,
    testWebhookLogs,
    testConversationsList,
    webhookViewMode,
    setWebhookViewMode,
    payloadCopied,
    setPayloadCopied,
    updateTenantFields,
    selectedTenant,
    userRole,
    googleToken,
    handleGoogleLogin,
    handleGoogleLogout,
    user,
    messengerPageId,
    setMessengerPageId,
    messengerToken,
    setMessengerToken,
    messengerShowToken,
    setMessengerShowToken,
    messengerSaveSuccess,
    messengerSandboxActive,
    messengerSandboxNumbers,
    messengerSandboxInputNumber,
    setMessengerSandboxInputNumber,
    messengerSandboxCode,
    setMessengerSandboxCode,
    messengerSandboxSentCode,
    messengerSandboxStep,
    messengerSandboxError,
    isTestingMessengerConnection,
    messengerConnectionFeedback,
    messengerVoiceEnabled,
    setMessengerVoiceEnabled,
    handleUpdateMessengerIntegration,
    handleTestMessengerConnection,
    handleToggleMessengerSandboxMode,
    handleRequestMessengerSandboxOTP,
    handleVerifyMessengerSandboxOTP,
    handleDeleteMessengerSandboxNumber,
    testMessengerWebhookSenderName,
    setTestMessengerWebhookSenderName,
    testMessengerWebhookSenderPSID,
    setTestMessengerWebhookSenderPSID,
    testMessengerWebhookMessage,
    setTestMessengerWebhookMessage,
    isTestingMessengerWebhook,
    testMessengerWebhookLogs,
    testMessengerConversationsList,
    playingMessengerMessageId,
    setPlayingMessengerMessageId,
    isMessengerChatMicActive,
    messengerInputIsVoiceNote,
    setMessengerInputIsVoiceNote,
    handleTriggerMessengerWebhook,
    toggleMessengerChatMic,
    handleClearMessengerConversations
  } = useSaaS();

  const [waSaveSuccess, setWaSaveSuccess] = useState(false);

  if (!selectedTenant) return null;

  const handleSubmitWhatsApp = (e: React.FormEvent) => {
    handleUpdateWhatsAppIntegration(e);
    setWaSaveSuccess(true);
    setTimeout(() => setWaSaveSuccess(false), 4000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#080c14] border border-white/5 p-5 rounded-3xl relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-36 h-36 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div>
          <h2 className="text-xl font-display font-medium tracking-tight text-white flex items-center gap-2">
            <span className="inline-block p-1.5 bg-blue-500/10 rounded-xl text-blue-400 border border-blue-500/20">
              <Smartphone className="h-5 w-5 animate-pulse text-blue-400" />
            </span>
            <span>Omnichannel Integrations Gateway</span>
          </h2>
          <p className="text-[11px] text-slate-400 mt-1 font-mono">
            Configure your Meta developer parameters to orchestrate customer support and retail assistants.
          </p>
        </div>
        
        {/* Dynamic Visual Connection status badge depending on active sub-tab */}
        {(activeChannelSubTab === 'whatsapp' || activeChannelSubTab === 'messenger') && (
          <div className="flex items-center gap-2 font-mono text-[11px] shrink-0 bg-white/2 px-3 py-1.5 rounded-2xl border border-white/5">
            <span className="text-slate-400">Handshake State:</span>
            {activeChannelSubTab === 'whatsapp' ? (
              waStatus === 'connected' ? (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 font-bold">
                  ● CONNECTED
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-1 font-bold">
                  ● OFFLINE
                </span>
              )
            ) : messengerStatus === 'connected' ? (
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1 font-bold shadow-[0_0_10px_rgba(59,130,246,0.25)]">
                ● ACTIVE (LIVE)
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-1 font-bold">
                ● DISCONNECTED
              </span>
            )}
          </div>
        )}
        {activeChannelSubTab === 'telegram' && (
          <div className="flex items-center gap-2 font-mono text-[11px] shrink-0 bg-white/2 px-3 py-1.5 rounded-2xl border border-white/5">
            <span className="text-slate-400">Handshake State:</span>
            {selectedTenant.telegramBotToken ? (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 font-bold">
                ● CONNECTED
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-1 font-bold">
                ● OFFLINE
              </span>
            )}
          </div>
        )}
      </div>

      {/* Sub-channel switch button bars */}
      <div className="flex border-b border-white/5 pb-px gap-1 bg-white/[0.01] p-1 rounded-2xl border border-white/5 font-mono text-xs">
        <button
          type="button"
          onClick={() => setActiveChannelSubTab('whatsapp')}
          className={`flex-1 md:flex-initial px-4 py-2 text-center rounded-xl font-medium transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeChannelSubTab === 'whatsapp'
              ? 'bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.15)] bg-emerald-500/10'
              : 'text-slate-400 hover:text-slate-200 border border-transparent'
          }`}
        >
          💬 WhatsApp Business API
        </button>
        <button
          type="button"
          onClick={() => setActiveChannelSubTab('messenger')}
          className={`flex-1 md:flex-initial px-4 py-2 text-center rounded-xl font-medium transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeChannelSubTab === 'messenger'
              ? 'bg-[#6366f1]/15 text-indigo-400 font-semibold border border-indigo-500/20 shadow-[0_0_10px_rgba(99,102,241,0.15)] bg-indigo-500/10'
              : 'text-slate-400 hover:text-slate-200 border border-transparent'
          }`}
        >
          🔵 Facebook Messenger API
        </button>
        <button
          type="button"
          onClick={() => setActiveChannelSubTab('telegram')}
          className={`flex-1 md:flex-initial px-4 py-2 text-center rounded-xl font-medium transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeChannelSubTab === 'telegram'
              ? 'bg-sky-500/15 text-sky-400 font-semibold border border-sky-500/20 shadow-[0_0_10px_rgba(14,165,233,0.15)]'
              : 'text-slate-400 hover:text-slate-200 border border-transparent'
          }`}
        >
          ✈️ Telegram
        </button>
        <button
          type="button"
          onClick={() => setActiveChannelSubTab('sms')}
          className={`flex-1 md:flex-initial px-4 py-2 text-center rounded-xl font-medium transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeChannelSubTab === 'sms'
              ? 'bg-violet-500/15 text-violet-400 font-semibold border border-violet-500/20 shadow-[0_0_10px_rgba(139,92,246,0.15)]'
              : 'text-slate-400 hover:text-slate-200 border border-transparent'
          }`}
        >
          💬 SMS (Twilio)
        </button>
      </div>

      {activeChannelSubTab === 'telegram' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="p-6 border border-white/10 bg-[#080b12] rounded-3xl space-y-5 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-sky-500/5 rounded-full blur-3xl pointer-events-none"></div>
            <div className="space-y-1 relative z-10">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                <span>✈️ Telegram Bot Connection</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Create a bot with{' '}
                <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-sky-400 hover:underline">
                  @BotFather
                </a>{' '}
                on Telegram, then paste its token below. We register the webhook automatically.
              </p>
            </div>

            {selectedTenant.telegramBotToken ? (
              <div className="space-y-3 relative z-10">
                <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0" />
                  <div>
                    <h4 className="text-white text-xs font-bold">
                      Connected{telegramConnectedUsername ? ` as @${telegramConnectedUsername}` : ''}
                    </h4>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                      Inbound messages are routed to your AI agent automatically.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDisconnectTelegram}
                  disabled={telegramConnecting}
                  className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                >
                  {telegramConnecting ? 'Disconnecting…' : 'Disconnect Bot'}
                </button>
              </div>
            ) : (
              <div className="space-y-3 relative z-10">
                <input
                  type="text"
                  value={telegramBotTokenInput}
                  onChange={e => setTelegramBotTokenInput(e.target.value)}
                  placeholder="123456789:AAExampleBotFatherTokenHere"
                  className="w-full px-4 py-2.5 bg-[#0d121d] border border-white/10 rounded-xl text-xs text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-sky-500/50"
                />
                {telegramError && (
                  <p className="text-[11px] text-red-400 font-mono">{telegramError}</p>
                )}
                <button
                  type="button"
                  onClick={handleConnectTelegram}
                  disabled={telegramConnecting || !telegramBotTokenInput.trim()}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 shadow-[0_0_12px_rgba(14,165,233,0.4)]"
                >
                  {telegramConnecting ? 'Connecting…' : 'Connect Bot'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {activeChannelSubTab === 'sms' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="p-6 border border-white/10 bg-[#080b12] rounded-3xl space-y-4 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-violet-500/5 rounded-full blur-3xl pointer-events-none"></div>
            <div className="space-y-1 relative z-10">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                💬 SMS via Twilio
              </h3>
              <p className="text-[11px] text-slate-400">
                No credentials to store here — Twilio replies happen directly in the webhook
                response. Paste this URL into your Twilio phone number's{' '}
                <strong className="text-slate-300">"A Message Comes In"</strong> webhook field.
              </p>
            </div>
            <div className="relative z-10 flex items-center gap-2 p-3 bg-[#0d121d] border border-white/10 rounded-xl">
              <code className="flex-1 text-[11px] text-violet-300 font-mono truncate select-all">
                {window.location.origin}/api/webhook/twilio/sms/{selectedTenant.id}
              </code>
              <button
                type="button"
                onClick={() =>
                  navigator.clipboard.writeText(
                    `${window.location.origin}/api/webhook/twilio/sms/${selectedTenant.id}`
                  )
                }
                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 rounded-lg text-[10px] font-semibold shrink-0 cursor-pointer"
              >
                Copy
              </button>
            </div>
          </div>
        </div>
      )}

      {activeChannelSubTab === 'whatsapp' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Simulated save success message toast banner */}
          {waSaveSuccess && (
            <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 shadow-2xl flex items-center gap-3 relative overflow-hidden transition-all duration-300">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none"></div>
              <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0" />
              <div>
                <h4 className="text-white text-xs font-bold font-sans">SaaS Configurations Successfully Preserved!</h4>
                <p className="text-[10.5px] text-slate-400 font-mono mt-0.5">
                  WhatsApp Business Phone Number settings have been applied in background. Verification webhooks are listening.
                </p>
              </div>
            </div>
          )}

          {/* Visual Sandbox Mode Section */}
          <div className={`p-6 rounded-3xl border transition-all duration-300 relative overflow-hidden ${
            waSandboxActive 
              ? 'border-blue-500/30 bg-blue-500/[0.02] shadow-[0_0_25px_rgba(59,130,246,0.15)]' 
              : 'border-white/5 bg-[#080b12]'
          }`}>
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/5 pb-4 mb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold font-mono tracking-wider ${
                    waSandboxActive 
                      ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse' 
                      : 'bg-slate-800 text-slate-400 border border-white/5'
                  }`}>
                    {waSandboxActive ? '🎯 SANDBOX LIVE' : '🔌 PRODUCTION'}
                  </span>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    WhatsApp Sandbox Mode
                  </h3>
                </div>
                <p className="text-xs text-slate-400">
                  Register and verify temporary test phone numbers for quick prototyping. Sandbox mode bypasses Meta Developer portal checks and simulates incoming text handshakes.
                </p>
              </div>

              {/* Dynamic Switch button */}
              <button
                type="button"
                onClick={() => handleToggleSandboxMode(!waSandboxActive)}
                className={`px-4 py-2 text-xs font-mono font-bold rounded-xl flex items-center gap-2 border transition-all duration-300 cursor-pointer ${
                  waSandboxActive
                    ? 'bg-blue-600 hover:bg-blue-550 border-blue-500/45 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]'
                    : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300'
                }`}
              >
                <span>{waSandboxActive ? 'ENABLED' : 'DISABLED'}</span>
                <Smartphone className={`h-4 w-4 ${waSandboxActive ? 'animate-bounce' : ''}`} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Sandbox registration/verify form (only shown/interactive if activated) */}
              <div className={`md:col-span-7 space-y-4 transition-all duration-300 ${waSandboxActive ? 'opacity-100' : 'opacity-50 pointer-events-none select-none'}`}>
                <div className="space-y-1">
                  <h4 className="text-xs font-mono font-bold text-slate-300 flex items-center gap-1.5">
                    <Plus className="h-4 w-4 text-blue-500" />
                    <span>Register & Verify Test Number</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 font-sans">
                    Add your personal phone number or an E.164 simulated testing string to start receiving webhook threads.
                  </p>
                </div>

                {waSandboxError && (
                  <div className="p-3 text-[11px] bg-red-500/10 border border-red-500/25 text-red-400 rounded-xl flex items-center gap-2 font-mono">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{waSandboxError}</span>
                  </div>
                )}

                {waSandboxStep === 'idle' && (
                  <form onSubmit={handleRequestSandboxOTP} className="flex gap-2">
                    <input
                      type="text"
                      required
                      disabled={!waSandboxActive}
                      value={waSandboxInputNumber}
                      onChange={(e) => setWaSandboxInputNumber(e.target.value)}
                      placeholder="e.g. +1 (555) 019-2831"
                      className="bg-[#090d16] text-white text-xs px-3.5 py-2.5 rounded-xl border border-white/5 shadow-inner focus:border-blue-500/45 focus:ring-1 focus:ring-blue-500/50 outline-none font-mono flex-1 leading-normal"
                    />
                    <button
                      type="submit"
                      disabled={!waSandboxActive}
                      className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 border border-blue-500/20 text-white text-xs font-semibold rounded-xl cursor-pointer transition-colors shrink-0"
                    >
                      Send OTP Code
                    </button>
                  </form>
                )}

                {waSandboxStep === 'sending' && (
                  <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 flex items-center justify-between gap-3 font-mono text-xs">
                    <div className="flex items-center gap-2.5">
                      <RefreshCw className="h-4 w-4 text-blue-400 animate-spin" />
                      <span className="text-slate-300">Routing sandbox handshake packet to Meta cloud infrastructure...</span>
                    </div>
                  </div>
                )}

                {waSandboxStep === 'otp_sent' && (
                  <div className="space-y-3">
                    {/* Simulated SMS Broadcast Message Banner */}
                    <div className="p-4 rounded-xl border border-amber-500/25 bg-amber-500/5 shadow-md space-y-2 relative overflow-hidden">
                      <span className="absolute top-0 right-0 px-2 py-0.5 bg-amber-500/10 text-amber-500 border-l border-b border-amber-500/20 text-[9px] font-mono font-bold uppercase select-none rounded-bl-lg">
                        Simulated Network Broadcast
                      </span>
                      <div className="flex items-start gap-2.5 pt-1">
                        <Smartphone className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                        <div className="space-y-0.5">
                          <span className="text-slate-300 text-[11px] font-mono font-bold block">
                            Inbound SMS received on {waSandboxInputNumber}:
                          </span>
                          <p className="text-[11.5px] font-sans text-slate-300 italic font-medium leading-relaxed">
                            "[Meta Dev] Use code <span className="font-mono bg-white/15 px-1.5 py-0.5 rounded font-black text-amber-300 tracking-wider select-all">{waSandboxSentCode}</span> to verify your developer mobile test device for OmniBot SaaS."
                          </p>
                        </div>
                      </div>
                    </div>

                    <form onSubmit={handleVerifySandboxOTP} className="space-y-2.5">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          required
                          value={waSandboxCode}
                          onChange={(e) => setWaSandboxCode(e.target.value)}
                          placeholder="Enter 6-digit verification code"
                          className="bg-[#090d16] text-white text-xs px-3.5 py-2.5 rounded-xl border border-white/5 shadow-inner focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/50 outline-none font-mono flex-1 text-center font-black tracking-widest leading-normal"
                        />
                        <button
                          type="submit"
                          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 border border-emerald-500/20 text-white text-xs font-semibold rounded-xl cursor-pointer transition-colors shrink-0"
                        >
                          Confirm PIN
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setWaSandboxStep('idle');
                          updateTenantFields({ waSandboxError: null } as any);
                        }}
                        className="text-[10.5px] text-slate-400 font-mono hover:text-slate-300 underline cursor-pointer select-none"
                      >
                        ← Cancel and use a different number
                      </button>
                    </form>
                  </div>
                )}

                {waSandboxStep === 'verified' && (
                  <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 flex items-center gap-3 animate-pulse">
                    <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0" />
                    <div>
                      <span className="text-white text-xs font-bold font-mono block">Dev Number Registered Successfully!</span>
                      <p className="text-[10.5px] text-slate-400 mt-0.5">
                        Adding {waSandboxInputNumber} to verified local test sandbox devices routing tables.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Right column: list of registered sandbox numbers */}
              <div className="md:col-span-5 flex flex-col justify-between border-l border-white/5 pl-0 md:pl-6 pt-4 md:pt-0">
                <div className="space-y-3">
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest select-none block">
                    Verified Test Numbers ({waSandboxNumbers.length})
                  </span>

                  {!waSandboxActive ? (
                    <div className="p-4 rounded-2xl bg-white/[0.01] border border-white/5 text-center py-6">
                      <p className="text-[11px] text-slate-500 italic font-mono leading-relaxed">
                        Sandbox mode is currently inactive. Turn on Sandbox toggle above to activate bypasses.
                      </p>
                    </div>
                  ) : waSandboxNumbers.length === 0 ? (
                    <div className="p-4 rounded-2xl bg-white/[0.01] border border-white/5 text-center py-6">
                      <p className="text-[11px] text-slate-400 font-mono leading-relaxed">
                        No sandbox numbers listed. Use the register widget to verify a temporary test device!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                      {waSandboxNumbers.map((num, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-slate-200">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-ping shrink-0" />
                            <span className="font-mono truncate font-medium">{num}</span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0 ml-1">
                            <button
                              onClick={() => {
                                navigate(`/admin/${selectedTenant.id}/simulator`);
                                setTimeout(() => {
                                  const chatInput = document.getElementById('chat-input-field');
                                  if (chatInput) chatInput.focus();
                                }, 300);
                              }}
                              className="p-1 px-1.5 hover:bg-blue-600/20 text-blue-400 text-[10px] font-mono rounded cursor-pointer transition-colors"
                              title="Open interactive chatting simulation panel"
                            >
                              Test Chat
                            </button>
                            <button
                              onClick={() => handleDeleteSandboxNumber(num)}
                              className="p-1 hover:bg-rose-500/10 text-rose-400 rounded cursor-pointer transition-colors"
                              title="Revoke and delete verification"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {waSandboxActive && waSandboxNumbers.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-white/5 text-center">
                    <p className="text-[10px] text-slate-500 font-mono">
                      💡 Use <strong>Test Chat</strong> to quickly jump to the simulator and chat with your AI assistant using that sandbox profile context!
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* WhatsApp Incoming Webhook Playground Simulator */}
          <div className="border border-white/5 bg-[#080b12] p-6 rounded-3xl space-y-5 shadow-2xl relative overflow-hidden" id="whatsapp-webhook-emulator-container">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/[0.02] rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
              <div>
                <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-widest font-mono flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-emerald-400" />
                  <span>🔌 Real-Time Inbound REST / Webhook Emulator</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Simulate the exact payload Facebook Meta sends to your SaaS workspace when clients send WhatsApp messages.
                </p>
              </div>

              {/* Test Mode Switch */}
              <div className="flex items-center gap-3 bg-white/[0.02] border border-white/5 p-2 px-3 rounded-2xl shrink-0" id="whatsapp-test-mode-toggle-card">
                <div className="text-right">
                  <span className="text-[10px] font-mono font-bold text-slate-300 block">AI Agent Test Mode</span>
                  <span className="text-[9px] text-slate-500 block font-mono">
                    {waTestMode ? '🔴 Active: Verified Agent LLM' : '⚪ Static Code Simulation'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const nextVal = !waTestMode;
                    setWaTestMode(nextVal);
                    updateTenantFields({ whatsAppTestMode: nextVal });
                  }}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    waTestMode ? 'bg-emerald-500' : 'bg-slate-700/50'
                  }`}
                  id="toggle-whatsapp-test-mode-btn"
                  role="switch"
                  aria-checked={waTestMode}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      waTestMode ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Event Configuration Panel */}
              <div className="lg:col-span-7 space-y-4">
                {/* Prebaked Webhook Scenarios */}
                <div className="space-y-2">
                  <span className="text-[10px] font-mono font-bold text-slate-450 uppercase tracking-widest block">Quick-Load Simulated Scenarios:</span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setTestWebhookSenderName('Elon Musk');
                        setTestWebhookSenderPhone('+1 (321) 902-8800');
                        setTestWebhookMessage('Hi, please register my email elon.mars@spacex.com as a Qualified Lead. Can you consult your knowledge base for rates?');
                      }}
                      className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 active:bg-white/15 text-[10px] text-slate-350 hover:text-white font-mono rounded-lg cursor-pointer transition-colors border border-white/5 text-left flex flex-col justify-between h-[68px]"
                      title="Test AI Agent automatic lead parsing and CRM extraction"
                    >
                      <span className="font-bold text-emerald-450 block">🚀 CRM Lead</span>
                      <span className="text-[9px] text-slate-500 block truncate">Elon: elon.mars@spacex...</span>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => {
                        setTestWebhookSenderName('Alexander checking');
                        setTestWebhookSenderPhone('+30 (211) 555-0300');
                        setTestWebhookMessage('Hello! Can you book me a live slot for next Tuesday at 2 PM? Use my email alex@ancientmacedon.com to block the date on your calendar.');
                      }}
                      className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 active:bg-white/15 text-[10px] text-slate-350 hover:text-white font-mono rounded-lg cursor-pointer transition-colors border border-white/5 text-left flex flex-col justify-between h-[68px]"
                      title="Test Google Calendar / Local Booking engine slot allocation"
                    >
                      <span className="font-bold text-indigo-400 block">📅 Slot Booking</span>
                      <span className="text-[9px] text-slate-500 block truncate">Next Tuesday 2 PM booking</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setTestWebhookSenderName('Sarah Conflict Test');
                        setTestWebhookSenderPhone('+44 7911 123456');
                        setTestWebhookMessage(`Hi, can I get a 30-min consultation slot booked tomorrow at 2 PM? If that is conflict or double-booked, verify my email sarah.test@gmail.com and suggest next available slots!`);
                      }}
                      className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 active:bg-white/15 text-[10px] text-slate-350 hover:text-white font-mono rounded-lg cursor-pointer transition-colors border border-white/5 text-left flex flex-col justify-between h-[68px]"
                      title="Simulate calendar slot occupancy to check double-booking routing logic"
                    >
                      <span className="font-bold text-amber-505 block text-amber-500">⚠️ Busy Slot Test</span>
                      <span className="text-[9px] text-slate-500 block truncate">Double-booking avoidance</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setTestWebhookSenderName('Dr. Watson');
                        setTestWebhookSenderPhone('+1 (555) 019-9281');
                        setTestWebhookMessage('Tell me, what are your company pricing rates and guidelines listed in your knowledge base docs? Do you have custom pricing lists?');
                      }}
                      className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 active:bg-white/15 text-[10px] text-slate-350 hover:text-white font-mono rounded-lg cursor-pointer transition-colors border border-white/5 text-left flex flex-col justify-between h-[68px]"
                      title="Inquire about information stored in tenant Knowledge Base documents"
                    >
                      <span className="font-bold text-purple-400 block">📚 KB Lookup</span>
                      <span className="text-[9px] text-slate-500 block truncate">Query KB catalog rates</span>
                    </button>
                  </div>
                </div>

                {/* Custom Input Block */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                  <div className="space-y-1.5">
                    <label className="text-slate-400 block font-semibold">Inbound Persona Name:</label>
                    <input
                      type="text"
                      value={testWebhookSenderName}
                      onChange={(e) => setTestWebhookSenderName(e.target.value)}
                      placeholder="e.g. John Miller"
                      className="w-full bg-[#0d121d] text-slate-100 px-3 py-2 border border-white/5 rounded-xl focus:border-emerald-500/40 outline-none font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-slate-400 block font-semibold">E.164 WhatsApp Phone:</label>
                    <input
                      type="text"
                      value={testWebhookSenderPhone}
                      onChange={(e) => setTestWebhookSenderPhone(e.target.value)}
                      placeholder="e.g. +1 (555) 902-1234"
                      className="w-full bg-[#0d121d] text-slate-100 px-3 py-2 border border-white/5 rounded-xl focus:border-emerald-500/40 outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 text-xs font-mono">
                  <label className="text-slate-400 block font-semibold">Simulated WhatsApp Message Body:</label>
                  <textarea
                    rows={3}
                    value={testWebhookMessage}
                    onChange={(e) => setTestWebhookMessage(e.target.value)}
                    placeholder="Type simulated whatsapp text string..."
                    className="w-full bg-[#0d121d] text-slate-100 p-3 border border-white/5 rounded-xl focus:border-emerald-500/40 outline-none text-xs font-mono"
                  />
                </div>

                <button
                  type="button"
                  disabled={isTestingWebhook || !testWebhookMessage.trim()}
                  onClick={async () => {
                    updateTenantFields({ isTestingWebhook: true, testWebhookLogs: [] } as any);
                    const postLog = (msg: string) => {
                      updateTenantFields({
                        testWebhookLogs: [...testWebhookLogs, `[${new Date().toLocaleTimeString()}] ${msg}`]
                      } as any);
                    };

                    if (waTestMode) {
                      postLog("🔌 Webhook request initiated. (AI AGENT TEST VERIFICATION ACTIVE)...");
                      
                      setTimeout(() => {
                        postLog("📤 POST /api/chat [Local Sandbox Validation Router]");
                        postLog("🔒 Credentials Bypass Active: Simulating safe test context.");
                      }, 400);

                      setTimeout(async () => {
                        postLog(`📡 Request payload mapped: Sender "${testWebhookSenderName}" (${testWebhookSenderPhone})`);
                        postLog(`🧠 Dispatching query body into LLM reasoning core...`);
                        
                        try {
                          const response = await fetch('/api/chat', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              messages: [{ sender: 'customer', text: testWebhookMessage }],
                              botName: selectedTenant.botName,
                              tone: selectedTenant.tone,
                              knowledgeBase: selectedTenant.knowledgeBase,
                              appointmentsList: selectedTenant.appointments,
                              tenantName: selectedTenant.name,
                              tenantIndustry: selectedTenant.industry,
                              tenantDescription: selectedTenant.description,
                              systemInstruction: selectedTenant.systemInstruction
                            })
                          });

                          if (response.ok) {
                            const data = await response.json();
                            postLog(`🤖 [AI AGENT RESPONSE] Received from @${selectedTenant.botName}:`);
                            postLog(`💬 "${data.reply}"`);
                            
                            let tenantModified = false;
                            let nextLeads = [...selectedTenant.leads];
                            let nextAppointments = [...selectedTenant.appointments];

                            if (data.actionTriggered) {
                              const action = data.actionTriggered;
                              postLog(`⚙️ Resolved dynamic CRM callback trigger: "${action.type}"`);
                              
                              let actDetails: any = {};
                              try {
                                actDetails = typeof action.details === 'string' ? JSON.parse(action.details) : action.details;
                              } catch (e) {
                                actDetails = {};
                              }

                              if (action.type === 'capture_lead') {
                                const newLead = {
                                  id: 'lead-test-' + Date.now(),
                                  name: actDetails.name || testWebhookSenderName,
                                  email: actDetails.email || `${testWebhookSenderName.toLowerCase().replace(/\s/g, '.')}@testdomain.com`,
                                  phone: actDetails.phone || testWebhookSenderPhone,
                                  status: 'New',
                                  dateCaptured: new Date().toISOString().split('T')[0],
                                  note: `Verified via Agent Webhook Emulator. Response: "${data.reply}"`
                                };
                                nextLeads = [newLead, ...nextLeads];
                                tenantModified = true;
                                postLog(`📦 CRM DB Action: Registered qualified lead [${newLead.name}] successfully!`);
                              } else if (action.type === 'book_appointment') {
                                const shouldSyncGoogle = googleToken && selectedTenant.googleCalendarAutoSchedule !== false;
                                
                                const newAppt = {
                                  id: 'appt-test-' + Date.now(),
                                  customerName: actDetails.name || testWebhookSenderName,
                                  customerPhone: actDetails.phone || testWebhookSenderPhone,
                                  email: actDetails.email || `${testWebhookSenderName.toLowerCase().replace(/\s/g, '.')}@testdomain.com`,
                                  start: actDetails.startStr || new Date(Date.now() + 24*60*60*1000).toISOString().split('T')[0] + "T14:00:00",
                                  end: actDetails.endStr || new Date(Date.now() + 24*60*60*1000).toISOString().split('T')[0] + "T14:30:00",
                                  summary: actDetails.summary || `Consultation with ${selectedTenant.botName}`,
                                  notes: `Booked autonomously via Agent Webhook Simulator. Client text: "${testWebhookMessage}"`,
                                  syncedWithGoogle: shouldSyncGoogle
                                };

                                if (shouldSyncGoogle) {
                                  try {
                                    postLog(`🔮 Real-Time Auto-Scheduling is active! Dispatching Google Calendar API event creation...`);
                                    const syncedAppt = await createGoogleCalendarEvent(googleToken, {
                                      customerName: newAppt.customerName,
                                      customerPhone: newAppt.customerPhone,
                                      email: newAppt.email,
                                      start: newAppt.start,
                                      end: newAppt.end,
                                      summary: newAppt.summary,
                                      notes: newAppt.notes
                                    });
                                    newAppt.googleEventId = syncedAppt.googleEventId;
                                    postLog(`📅 Google Calendar Sync Success! Live slot booked for ${newAppt.customerName}`);
                                  } catch (calErr: any) {
                                    postLog(`⚠️ Google Calendar Link issue: ${calErr.message || 'Verification token stale.'} Reserved offline.`);
                                  }
                                } else {
                                  postLog(`📅 Local Reservation Success: Booked slot ${newAppt.start} internally.`);
                                }

                                nextAppointments = [newAppt, ...nextAppointments];
                                tenantModified = true;
                              }
                            } else {
                              postLog("ℹ️ No state transitions decided by agent. Dialogue was conversational.");
                            }

                            if (tenantModified) {
                              updateTenantFields({
                                leads: nextLeads,
                                appointments: nextAppointments
                              });
                            }

                            postLog("✅ [Simulated Webhook End] Verification logs captured successfully.");
                          } else {
                            postLog("❌ Failed to reach local /api/chat endpoint.");
                          }
                        } catch (err: any) {
                          postLog(`❌ Verification failed: ${err.message || err}`);
                        } finally {
                          updateTenantFields({ isTestingWebhook: false } as any);
                        }
                      }, 1200);

                    } else {
                      // Standard Mock Simulation
                      postLog("🔌 Webhook request initiated. (MOCK SIMULATION MODE)...");
                      
                      setTimeout(() => {
                        postLog("📤 POST /api/webhooks/whatsapp HTTP/1.1");
                        postLog("🔒 Signature verification payload sha256=verified.");
                      }, 600);

                      setTimeout(() => {
                        postLog(`📡 Msg payload mapped to verification sandbox string "${testWebhookSenderPhone}"`);
                        postLog(`🧠 Directing body content: "${testWebhookMessage.slice(0, 45)}..." to bot @${selectedTenant.botName}`);
                      }, 1200);

                      setTimeout(() => {
                        postLog("⚙️ AI heuristics scanning body context variables...");
                        const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;
                        const matchedEmails = testWebhookMessage.match(emailRegex);
                        const extractedEmail = matchedEmails ? matchedEmails[0] : `${testWebhookSenderName.toLowerCase().replace(/\s/g, '.')}@whatsapp.com`;

                        const newMockLead = {
                          id: 'lead-webhook-' + Date.now(),
                          name: testWebhookSenderName,
                          email: extractedEmail,
                          phone: testWebhookSenderPhone,
                          status: 'New',
                          dateCaptured: new Date().toISOString().split('T')[0],
                          note: `Harvested via webhook tester. Text: "${testWebhookMessage}"`
                        };

                        updateTenantFields({
                          leads: [newMockLead, ...selectedTenant.leads]
                        });

                        postLog(`📦 [AI EXTRACT SUCCESS] Captured CRM Lead Opportunity: {name: "${testWebhookSenderName}", email: "${extractedEmail}", phone: "${testWebhookSenderPhone}"}`);
                      }, 2000);

                      setTimeout(() => {
                        postLog("✅ [Meta Response] HTTP/1.1 200 OK Connection persistent. Webhook simulator execution green.");
                        updateTenantFields({ isTestingWebhook: false } as any);
                      }, 2800);
                    }
                  }}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 border border-emerald-500 disabled:opacity-40 text-white font-mono text-xs font-bold rounded-xl shadow-lg cursor-pointer transition-colors flex items-center justify-center gap-1.5"
                >
                  {isTestingWebhook ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Processing Webhook Handshake Payload...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      <span>Dispatch Webhook Handshake Payload 🔌</span>
                    </>
                  )}
                </button>
              </div>

              {/* Developer Terminal Console & Live Meta Webhook Payload Inspector */}
              <div className="lg:col-span-5 flex flex-col h-full space-y-2 self-stretch" id="developer-terminal-section">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex gap-1.5 bg-white/[0.02] p-0.5 rounded-lg border border-white/5">
                    <button
                      type="button"
                      onClick={() => setWebhookViewMode('logs')}
                      className={`px-3 py-1 rounded text-[10.5px] font-mono font-bold transition-all cursor-pointer ${
                        webhookViewMode === 'logs' ? 'bg-[#10b881]/15 text-emerald-400 border border-emerald-500/20 shadow-sm' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Console Logs
                    </button>
                    <button
                      type="button"
                      onClick={() => setWebhookViewMode('payload')}
                      className={`px-3 py-1 rounded text-[10.5px] font-mono font-bold transition-all cursor-pointer ${
                        webhookViewMode === 'payload' ? 'bg-[#10b881]/15 text-emerald-400 border border-emerald-500/20 shadow-sm' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Meta JSON Payload
                    </button>
                  </div>

                  {webhookViewMode === 'payload' && (
                    <button
                      type="button"
                      onClick={() => {
                        const cleanPhone = testWebhookSenderPhone.replace(/[^0-9]/g, '');
                        const currentPayload = {
                          object: "whatsapp_business_account",
                          entry: [
                            {
                              id: "wa_biz_acc_908",
                              changes: [
                                {
                                  value: {
                                    messaging_product: "whatsapp",
                                    metadata: {
                                      display_phone_number: "+1(800)555-0199",
                                      phone_number_id: "phone_id_992"
                                    },
                                    contacts: [
                                      {
                                        profile: {
                                          name: testWebhookSenderName
                                        },
                                        wa_id: cleanPhone || "13219028800"
                                      }
                                    ],
                                    messages: [
                                      {
                                        from: cleanPhone || "13219028800",
                                        id: "wamid.HBgLMTU1NTU1NTU1NTUSFggMRENEQ0U0RDUzOTg4RjU4RjVBAA==",
                                        timestamp: Math.floor(Date.now() / 1000).toString(),
                                        text: {
                                          body: testWebhookMessage
                                        },
                                        type: "text"
                                      }
                                    ]
                                  },
                                  field: "messages"
                                }
                              ]
                            }
                          ]
                        };
                        navigator.clipboard.writeText(JSON.stringify(currentPayload, null, 2));
                        setPayloadCopied(true);
                        setTimeout(() => setPayloadCopied(false), 2000);
                      }}
                      className="px-2 py-1 bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/5 text-[9.5px] font-mono text-slate-350 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      {payloadCopied ? 'Copied! ✅' : 'Copy JSON 📋'}
                    </button>
                  )}
                </div>

                {webhookViewMode === 'logs' ? (
                  <div className="bg-[#090d16] border border-white/5 rounded-2xl p-4 font-mono text-[10.5px] text-teal-400 space-y-2 h-[260px] overflow-y-auto shadow-inner">
                    {testWebhookLogs.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-slate-600 italic select-none text-center px-4 space-y-2">
                        <Terminal className="h-8 w-8 text-slate-700 animate-pulse animate-bounce" />
                        <span>Inbound server endpoint listening for webhook pulses... Click "Dispatch" to ignite.</span>
                      </div>
                    ) : (
                      testWebhookLogs.map((log, idx) => (
                        <div key={idx} className="border-b border-white/5 pb-1 last:border-b-0 leading-relaxed font-light">
                          {log}
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  <div className="bg-[#090d16] border border-white/5 rounded-2xl p-4 font-mono text-[10px] text-teal-300 h-[260px] overflow-y-auto shadow-inner select-all whitespace-pre leading-relaxed scrollbar-thin">
                    {JSON.stringify({
                      object: "whatsapp_business_account",
                      entry: [
                        {
                          id: "wa_biz_acc_908",
                          changes: [
                            {
                              value: {
                                messaging_product: "whatsapp",
                                metadata: {
                                  display_phone_number: "+1(800)555-0199",
                                  phone_number_id: "phone_id_992"
                                },
                                contacts: [
                                  {
                                    profile: {
                                      name: testWebhookSenderName
                                    },
                                    wa_id: testWebhookSenderPhone.replace(/[^0-9]/g, '') || "13219028800"
                                  }
                                ],
                                messages: [
                                  {
                                    from: testWebhookSenderPhone.replace(/[^0-9]/g, '') || "13219028800",
                                    id: "wamid.HBgLMTU1NTU1NTU1NTUSFggMRENEQ0U0RDUzOTg4RjU4RjVBAA==",
                                    timestamp: Math.floor(Date.now() / 1000).toString(),
                                    text: {
                                      body: testWebhookMessage
                                    },
                                    type: "text"
                                  }
                                ]
                              },
                              field: "messages"
                            }
                          ]
                        }
                      ]
                    }, null, 2)}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
            {/* Left Column: Form Settings (7 cols) */}
            <form onSubmit={handleSubmitWhatsApp} className="lg:col-span-7 bg-[#080b12] border border-white/5 p-6 rounded-3xl space-y-5 shadow-2xl relative overflow-hidden text-slate-300">
              <div className="absolute top-0 right-0 w-44 h-44 bg-blue-500/3 rounded-full blur-3xl pointer-events-none"></div>
              
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  ⚙️ Integration Credentials Form
                </h3>
                <p className="text-[11px] text-slate-400">
                  Fill in your Meta Cloud Webhook and Access variables below. These will build the channel handshake mapping.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="wa-phone-input" className="text-xs font-semibold text-slate-400 font-mono flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-blue-400" />
                    <span>WhatsApp Business Phone Number (E.164):</span>
                  </label>
                  <input
                    id="wa-phone-input"
                    type="text"
                    required
                    value={waPhone}
                    onChange={(e) => setWaPhone(e.target.value)}
                    placeholder="e.g., +1 (555) 321-7222"
                    className="w-full bg-[#0d121d] text-slate-100 text-xs px-3 py-2.5 border border-white/5 focus:border-blue-500/40 rounded-xl outline-none focus:ring-1 focus:ring-blue-500/50 font-mono transition-all"
                  />
                  <span className="text-[10px] text-slate-500 block">The primary WhatsApp contact number displayed to consumers globally.</span>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="wa-sid-input" className="text-xs font-semibold text-slate-400 font-mono flex items-center gap-1.5">
                    <Settings className="h-3.5 w-3.5 text-blue-400" />
                    <span>Meta Phone Number ID (SID):</span>
                  </label>
                  <input
                    id="wa-sid-input"
                    type="text"
                    required
                    value={userRole === 'support' ? '••••••••••••••••' : waSid}
                    disabled={userRole === 'support'}
                    onChange={(e) => setWaSid(e.target.value)}
                    placeholder="e.g., phone_3217222_prod"
                    className="w-full bg-[#0d121d] text-slate-100 text-xs px-3 py-2.5 border border-white/5 focus:border-blue-500/40 rounded-xl outline-none focus:ring-1 focus:ring-blue-500/50 font-mono transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <span className="text-[10px] text-slate-500 block">Copy this ID directly from the WhatsApp Technical Setup pane on Facebook Developers.</span>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="wa-token-input" className="text-xs font-semibold text-slate-400 font-mono flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 text-blue-400" />
                    <span>Meta GraphQL Permanent System Token:</span>
                  </label>
                  <div className="relative">
                    <input
                      id="wa-token-input"
                      type={waShowToken ? "text" : "password"}
                      required
                      value={userRole === 'support' ? '••••••••••••••••' : waToken}
                      disabled={userRole === 'support'}
                      onChange={(e) => setWaToken(e.target.value)}
                      placeholder="EAAGb3v...218Xv7M"
                      className="w-full bg-[#0d121d] text-slate-100 text-xs pl-3 pr-16 py-2.5 border border-white/5 focus:border-blue-500/40 rounded-xl outline-none focus:ring-1 focus:ring-blue-500/50 font-mono transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <button
                      type="button"
                      onClick={() => setWaShowToken(!waShowToken)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 px-2 py-1 bg-white/5 hover:bg-white/10 text-slate-400 text-[10px] rounded font-mono border border-white/5 cursor-pointer select-none"
                    >
                      {waShowToken ? "HIDE" : "SHOW"}
                    </button>
                  </div>
                  <span className="text-[10px] text-slate-500 block">System Access Token with "whatsapp_business_messaging" and "whatsapp_business_management" permissions.</span>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="wa-status-select" className="text-xs font-semibold text-slate-400 font-mono">
                    Simulated Handshake Status & Credentials Verification:
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <select
                      id="wa-status-select"
                      value={waStatus}
                      onChange={(e) => setWaStatus(e.target.value as any)}
                      className="flex-1 min-w-0 bg-[#0d121d] text-slate-100 text-xs px-3 py-2.5 border border-white/5 focus:border-blue-500/40 rounded-xl outline-none focus:ring-1 focus:ring-blue-500/50 font-mono transition-all cursor-pointer"
                    >
                      <option value="connected" className="bg-[#0d121d]">Connected & Active (Traffic Routing Live)</option>
                      <option value="pending_verification" className="bg-[#0d121d]">Pending External Webhooks Verification</option>
                      <option value="disconnected" className="bg-[#0d121d]">Disconnected / Paused Integration</option>
                    </select>

                    <button
                      type="button"
                      onClick={handleTestConnection}
                      disabled={isTestingConnection}
                      className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-550 disabled:opacity-40 text-white font-mono text-xs font-bold rounded-xl shadow-lg cursor-pointer transition-colors flex items-center justify-center gap-1.5 shrink-0"
                      id="test-wa-connection-btn"
                    >
                      {isTestingConnection ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          <span>Pinging Server...</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-3.5 w-3.5" />
                          <span>Test Connection 🔌</span>
                        </>
                      )}
                    </button>
                  </div>
                  {connectionFeedback && (
                    <div className={`p-3 rounded-xl border text-[11px] font-mono leading-relaxed transition-all duration-300 ${
                      connectionFeedback.type === 'success'
                        ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400'
                        : 'border-red-500/30 bg-red-500/5 text-red-400'
                    }`}>
                      {connectionFeedback.text}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-white/5 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setWaPhone(selectedTenant.whatsAppPhoneNumber || '');
                    setWaSid(selectedTenant.whatsAppVerifiedSid || '');
                    setWaToken(selectedTenant.whatsAppApiKey || '');
                    setWaStatus(selectedTenant.whatsAppStatus || 'disconnected');
                  }}
                  className="px-4 py-2 hover:bg-white/5 border border-white/5 text-slate-300 text-xs font-medium rounded-xl cursor-pointer font-mono transition-colors"
                >
                  Reset Inputs
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-all shadow-[0_0_12px_rgba(37,99,235,0.4)]"
                  id="save-wa-config-btn"
                >
                  <Check className="h-4 w-4" />
                  <span>Save & Complete Integration</span>
                </button>
              </div>
            </form>

            {/* Right Column: Step-by-Step Meta Setup Guide (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              {/* Hook Details Card */}
              <div className="bg-[#080b12] border border-white/5 p-5 rounded-3xl space-y-4 shadow-xl text-slate-300">
                <div className="space-y-1">
                  <span className="text-[9px] uppercase font-bold tracking-wider font-mono text-emerald-450 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full select-none">
                    Webhook Credentials
                  </span>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono pt-1">
                    Meta Developer Webhooks API
                  </h4>
                </div>

                <div className="space-y-3.5 text-xs">
                  <div className="space-y-1">
                    <span className="text-slate-400 block text-[11px] font-semibold font-mono">
                      Callback URL Endpoint:
                    </span>
                    <div className="bg-[#0d121d] text-slate-300 border border-white/5 px-2.5 py-1.5 rounded-lg flex items-center justify-between font-mono text-[10.5px]">
                      <span className="truncate select-all leading-normal text-emerald-400 font-bold">
                        {window.location.origin}/v1/whatsapp/webhook/{selectedTenant.id}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 block leading-tight">
                      ⚡ Dynamically generated for your active sandbox/preview domain.
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-slate-400 block text-[11px] font-semibold font-mono">
                      Verify Verification Token:
                    </span>
                    <div className="bg-[#0d121d] text-slate-300 border border-white/5 px-2.5 py-1.5 rounded-lg flex items-center justify-between font-mono text-[10.5px]">
                      <span className="truncate select-all leading-normal text-yellow-500 font-bold">
                        verify_token_omnibot_{selectedTenant.id}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeChannelSubTab === 'messenger' && (
        <div className="space-y-6 animate-fade-in">
          {/* Simulated Messenger Save Success message banner */}
          {messengerSaveSuccess && (
            <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-500/5 shadow-2xl flex items-center gap-3 relative overflow-hidden transition-all duration-300">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none"></div>
              <CheckCircle className="h-5 w-5 text-blue-400 shrink-0" />
              <div>
                <h4 className="text-white text-xs font-bold font-sans">Messenger API Credentials Preserved!</h4>
                <p className="text-[10.5px] text-slate-400 font-mono mt-0.5">
                  Facebook Graph webhook endpoints are listening under verify token "verify_token_omnibot_{selectedTenant.id}".
                </p>
              </div>
            </div>
          )}

          {/* Top Grid: Config parameters and Sandbox manager */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Page Config Form */}
            <form onSubmit={handleUpdateMessengerIntegration} className="lg:col-span-6 bg-[#080b12] border border-white/5 p-5 rounded-2xl space-y-4 relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#3b82f6]/5 rounded-full blur-2xl pointer-events-none"></div>
              
              <div className="space-y-1">
                <h3 className="text-white text-xs font-bold uppercase tracking-wider font-mono flex items-center gap-2">
                  <span className="p-1.5 bg-[#3b82f6]/10 text-[#3b82f6] rounded-lg border border-[#3b82f6]/20">🔵</span>
                  <span>Messenger Graph API Parameters</span>
                </h3>
                <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                  Link your Facebook Business Page ID and Access Token to route inbound requests through the selected specialized agent.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 font-mono" htmlFor="messenger-page-id-input">Facebook Page ID:</label>
                  <input
                    id="messenger-page-id-input"
                    type="text"
                    value={userRole === 'support' ? '••••••••••••••••' : messengerPageId}
                    disabled={userRole === 'support'}
                    onChange={(e) => setMessengerPageId(e.target.value)}
                    placeholder="E.g., 108392182039281"
                    className="w-full bg-[#0d121d] text-slate-100 text-xs px-3 py-2 border border-white/5 rounded-lg outline-none focus:ring-1 focus:ring-blue-500 font-mono disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 font-mono" htmlFor="messenger-token-input">Page Access Token:</label>
                  <div className="relative">
                    <input
                      id="messenger-token-input"
                      type={messengerShowToken ? 'text' : 'password'}
                      value={userRole === 'support' ? '••••••••••••••••' : messengerToken}
                      disabled={userRole === 'support'}
                      onChange={(e) => setMessengerToken(e.target.value)}
                      placeholder="EAArY..."
                      className="w-full bg-[#0d121d] text-slate-100 text-xs pl-3 pr-10 py-2 border border-white/5 rounded-lg outline-none focus:ring-1 focus:ring-blue-500 font-mono disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <button
                      type="button"
                      onClick={() => setMessengerShowToken(!messengerShowToken)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white cursor-pointer"
                    >
                      {messengerShowToken ? '👁️' : '🕶️'}
                    </button>
                  </div>
                </div>

                {/* Public callback endpoints information */}
                <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl space-y-2 mt-4 text-[10.5px]">
                  <span className="text-blue-400 font-bold font-mono tracking-wider block uppercase text-[9px]">💡 Meta Developer Portal Webhook Callback:</span>
                  <div className="font-mono text-slate-350 space-y-1 select-all">
                    <p className="flex justify-between border-b border-white/5 pb-1">
                      <span>Callback URL:</span>
                      <span className="text-white text-right text-[10px] break-all">{`${window.location.origin}/v1/whatsapp/webhook/${selectedTenant.id}`}</span>
                    </p>
                    <p className="flex justify-between pt-1">
                      <span>Verify Token:</span>
                      <span className="text-white text-right text-[10px] font-semibold">{`verify_token_omnibot_${selectedTenant.id}`}</span>
                    </p>
                  </div>
                </div>

                {/* Connection Status Selector & Test Connection button */}
                <div className="space-y-1.5 pt-2">
                  <label htmlFor="messenger-status-select" className="text-xs font-semibold text-slate-400 font-mono">
                    Simulated Handshake Status & Credentials Verification:
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <select
                      id="messenger-status-select"
                      value={messengerStatus}
                      onChange={(e) => setMessengerStatus(e.target.value as any)}
                      className="flex-1 min-w-0 bg-[#0d121d] text-slate-100 text-xs px-3 py-2.5 border border-white/5 focus:border-blue-500/40 rounded-xl outline-none focus:ring-1 focus:ring-blue-500/50 font-mono transition-all cursor-pointer"
                    >
                      <option value="connected" className="bg-[#0d121d]">Connected & Active (Traffic Routing Live)</option>
                      <option value="pending_verification" className="bg-[#0d121d]">Pending External Webhooks Verification</option>
                      <option value="disconnected" className="bg-[#0d121d]">Disconnected / Paused Integration</option>
                    </select>

                    <button
                      type="button"
                      onClick={handleTestMessengerConnection}
                      disabled={isTestingMessengerConnection}
                      className="px-4 py-2.5 bg-[#4f46e5] hover:bg-indigo-500 disabled:opacity-40 text-white font-mono text-xs font-bold rounded-xl shadow-lg cursor-pointer transition-colors flex items-center justify-center gap-1.5 shrink-0"
                    >
                      {isTestingMessengerConnection ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          <span>Pinging Server...</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-3.5 w-3.5" />
                          <span>Test Connection 🔌</span>
                        </>
                      )}
                    </button>
                  </div>
                  {messengerConnectionFeedback && (
                    <div className={`p-3 rounded-xl border text-[11px] font-mono leading-relaxed transition-all duration-300 ${
                      messengerConnectionFeedback.type === 'success'
                        ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400'
                        : 'border-red-500/30 bg-red-500/5 text-red-400'
                    }`}>
                      {messengerConnectionFeedback.text}
                    </div>
                  )}
                </div>

                {/* Messenger Channel-specific Voice Integration Toggle */}
                <div className="space-y-1.5 pt-4 border-t border-white/5">
                  <label className="text-xs font-semibold text-slate-400 font-mono">
                    Voice Integration Settings:
                  </label>
                  <div className="flex items-center gap-3 bg-white/[0.02] border border-white/5 p-3 rounded-xl">
                    <input
                      type="checkbox"
                      id="messenger-voice-enabled-toggle"
                      checked={messengerVoiceEnabled}
                      onChange={(e) => setMessengerVoiceEnabled(e.target.checked)}
                      className="bg-slate-850 text-blue-500 rounded border-slate-700 focus:ring-blue-500 cursor-pointer h-4 w-4"
                    />
                    <span className="text-xs font-mono text-slate-300 flex items-center gap-1.5">
                      🎤 {messengerVoiceEnabled ? 'Voice Notes (Audio Playback & Audio Transcription) Active' : 'Standard Webhook Text Message Only'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setMessengerPageId(selectedTenant.messengerPageId || '');
                    setMessengerToken(selectedTenant.messengerToken || '');
                    setMessengerStatus(selectedTenant.messengerStatus || 'disconnected');
                  }}
                  className="px-4 py-2 hover:bg-white/5 border border-white/5 text-slate-300 text-xs font-medium rounded-xl cursor-pointer font-mono transition-colors"
                >
                  Reset Inputs
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-all shadow-[0_0_12px_rgba(37,99,235,0.4)]"
                >
                  <Check className="h-4 w-4" />
                  <span>Save Messenger Credentials</span>
                </button>
              </div>
            </form>

            {/* Facebook Sandbox profile verifier */}
            <div className={`lg:col-span-6 p-5 rounded-2xl border transition-all duration-300 relative overflow-hidden ${
              messengerSandboxActive 
                ? 'border-blue-500/30 bg-blue-500/[0.01] shadow-[0_0_20px_rgba(59,130,246,0.1)]' 
                : 'border-white/5 bg-[#080b12]'
            }`}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />

              <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-3.5 mb-3.5">
                <div className="space-y-0.5">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold font-mono tracking-wider ${
                    messengerSandboxActive 
                      ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse' 
                      : 'bg-slate-800 text-slate-400 border border-white/5'
                  }`}>
                    {messengerSandboxActive ? '🎯 SANDBOX LIVE' : '🔌 PRODUCTION'}
                  </span>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono block mt-1">
                    Messenger Developer Sandbox
                  </h3>
                </div>

                {/* Sandbox mode toggle */}
                <button
                  type="button"
                  onClick={() => handleToggleMessengerSandboxMode(!messengerSandboxActive)}
                  className={`px-3 py-1.5 text-[10px] font-mono font-bold rounded-lg border transition-all duration-200 cursor-pointer ${
                    messengerSandboxActive
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  {messengerSandboxActive ? 'ENABLED' : 'DISABLED'}
                </button>
              </div>

              <div className="space-y-4">
                <div className={`space-y-3 transition-opacity duration-300 ${messengerSandboxActive ? 'opacity-100' : 'opacity-40 pointer-events-none select-none'}`}>
                  
                  {messengerSandboxError && (
                    <div className="p-3 text-[11px] bg-red-500/10 border border-red-500/25 text-red-400 rounded-xl flex items-center gap-2 font-mono">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{messengerSandboxError}</span>
                    </div>
                  )}

                  {messengerSandboxStep === 'idle' && (
                    <form onSubmit={handleRequestMessengerSandboxOTP} className="space-y-2">
                      <p className="text-[11px] text-slate-400 leading-normal">
                        Map standard client profiles (PSIDs) to receive developer telemetry. Register a test handle below.
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          disabled={!messengerSandboxActive}
                          value={messengerSandboxInputNumber}
                          onChange={(e) => setMessengerSandboxInputNumber(e.target.value)}
                          placeholder="E.g., maria_sharapova or psid_9281742"
                          className="flex-1 bg-[#0d121d] text-slate-100 text-xs px-3 py-2 border border-white/5 rounded-lg outline-none focus:ring-1 focus:ring-blue-500 font-mono disabled:opacity-50"
                        />
                        <button
                          type="submit"
                          disabled={!messengerSandboxActive || !messengerSandboxInputNumber.trim()}
                          className="bg-blue-600/15 hover:bg-blue-600/30 border border-blue-500/30 hover:border-blue-500/50 text-blue-400 font-mono text-xs px-3 py-2 rounded-lg cursor-pointer transition-colors font-bold disabled:opacity-50"
                        >
                          Register
                        </button>
                      </div>
                    </form>
                  )}

                  {messengerSandboxStep === 'sending' && (
                    <div className="p-6 bg-white/[0.01] border border-white/5 rounded-xl text-center space-y-2">
                      <RefreshCw className="h-5 w-5 mx-auto animate-spin text-blue-500" />
                      <p className="text-[11px] text-slate-350 font-mono">Simulating Meta Graph validation handshake packet...</p>
                    </div>
                  )}

                  {messengerSandboxStep === 'otp_sent' && (
                    <div className="space-y-3">
                      {/* Virtual smartphone notification display */}
                      <div className="bg-[#0b0f19] border border-blue-500/25 p-3 rounded-xl space-y-2 relative shadow-inner">
                        <div className="absolute top-1.5 right-2 flex items-center gap-1">
                          <span className="h-1.5 w-1.5 bg-blue-500 rounded-full animate-ping"></span>
                          <span className="text-[8px] text-blue-400 font-mono font-bold">DEV_PORTAL_NOTIF</span>
                        </div>
                        <span className="text-[10px] text-amber-400 font-mono font-bold flex items-center gap-1">💬 SIMULATED USER NOTIFICATION</span>
                        <p className="text-[11px] text-slate-300 font-mono border-l-2 border-blue-500/40 pl-2 py-1 leading-relaxed select-all">
                          "[Meta Developers] Verify simulated sandbox user <span className="text-white font-black">{messengerSandboxInputNumber}</span> for Zenith using code: <span className="font-bold text-yellow-355 bg-white/10 px-1.5 py-0.5 rounded select-all text-yellow-300">{messengerSandboxSentCode}</span>"
                        </p>
                      </div>

                      <form onSubmit={handleVerifyMessengerSandboxOTP} className="space-y-2">
                        <label className="text-[10.5px] text-slate-400 font-semibold font-mono block">Enter 6-digit confirmation key:</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            required
                            value={messengerSandboxCode}
                            onChange={(e) => setMessengerSandboxCode(e.target.value)}
                            placeholder="Enter 6-digit code..."
                            className="flex-1 bg-[#0d121d] text-slate-100 text-xs px-3 py-2 border border-white/5 rounded-lg outline-none focus:ring-1 focus:ring-blue-500 font-mono text-center tracking-widest font-bold"
                          />
                          <button
                            type="submit"
                            className="bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs px-4 py-2 rounded-lg cursor-pointer font-bold"
                          >
                            Verify
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setMessengerSandboxStep('idle');
                              updateTenantFields({ messengerSandboxError: null } as any);
                            }}
                            className="bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 px-3 py-2 rounded-lg cursor-pointer font-mono text-xs"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {messengerSandboxStep === 'verified' && (
                    <div className="p-4 bg-emerald-500/5 border border-emerald-500/25 rounded-xl flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0" />
                      <p className="text-[11px] text-slate-300 font-mono">
                        Simulated account <span className="text-emerald-400 font-bold">{messengerSandboxInputNumber}</span> successfully mapped to CRM sandbox!
                      </p>
                    </div>
                  )}
                </div>

                {/* List of active registered sandbox profiles */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-slate-450 block">AUTHORIZED SANDBOX PROFILES ({messengerSandboxNumbers.length})</span>
                  {!messengerSandboxActive ? (
                    <div className="text-center p-4 bg-white/[0.01] border border-dashed border-white/5 rounded-xl text-slate-500 text-[11px]">
                      Turn on Sandbox mode above to register & test custom profiles.
                    </div>
                  ) : messengerSandboxNumbers.length === 0 ? (
                    <div className="text-center p-4 bg-white/[0.01] border border-dashed border-white/5 rounded-xl text-slate-500 text-[11px]">
                      No profiles registered. Register a developer handle above to initiate!
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {messengerSandboxNumbers.map((userVal, idx) => (
                        <div key={idx} className="p-2.5 bg-[#0d121d] border border-white/5 rounded-xl flex items-center justify-between text-xs font-mono">
                          <span className="text-slate-300 flex items-center gap-1.5 truncate">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                            {userVal}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteMessengerSandboxNumber(userVal)}
                            className="p-1 hover:bg-red-500/10 rounded text-red-400 cursor-pointer"
                            title="Unlink profile"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* HIGH-FIDELITY WEBHOOK TERMINAL & SIMULATOR SECTION */}
          <div className="bg-[#080b12] border border-white/5 rounded-3xl p-6 space-y-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>

            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/5 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    Meta Graph Webhook Simulator
                  </h3>
                </div>
                <p className="text-xs text-slate-400">
                  Configure inbound customer questions to process specialized roles (FAQ Support, Lead Capture, & Sales Booker) via the Gemini AI model.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleClearMessengerConversations}
                  className="px-3.5 py-1.5 text-[11px] font-mono hover:bg-white/5 text-slate-400 hover:text-white border border-white/5 hover:border-white/10 rounded-xl transition-all cursor-pointer"
                >
                  🧹 Clear Telemetry logs
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left: Interactive Inbound Request simulator form (4 cols) */}
              <form onSubmit={handleTriggerMessengerWebhook} className="lg:col-span-4 space-y-4 font-mono text-xs">
                {/* Quick-Load Webhook Scenarios */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-450 uppercase tracking-widest block">Quick-Load Webhook Schemas:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setTestMessengerWebhookSenderName('Elon Musk');
                        setTestMessengerWebhookSenderPSID('psid_elon_mars_99');
                        setTestMessengerWebhookMessage('Hi, please register my email elon.mars@spacex.com as a Qualified Lead. Can you consult your knowledge base for rates?');
                      }}
                      className="px-2 py-1.5 bg-white/5 hover:bg-white/10 text-[9px] text-slate-350 rounded-lg cursor-pointer transition-colors text-left truncate font-mono"
                      title="Elon Lead Schema"
                    >
                      🚀 Elon Musk
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTestMessengerWebhookSenderName('Alexander the Great');
                        setTestMessengerWebhookSenderPSID('psid_alexander_356');
                        setTestMessengerWebhookMessage('Greetings! Register alexander.conqueror@ancientmacedon.com for my checkup appointment please!');
                      }}
                      className="px-2 py-1.5 bg-white/5 hover:bg-white/10 text-[9px] text-slate-350 rounded-lg cursor-pointer transition-colors text-left truncate font-mono"
                      title="Alexander Lead Schema"
                    >
                      🏛️ Alexander
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTestMessengerWebhookSenderName('Belhassen Tunis');
                        setTestMessengerWebhookSenderPSID('psid_belhassen_tn');
                        setTestMessengerWebhookMessage('bellehi n7eb ntasel bikom emaili belhassen@esprit.tn rdv bahi thulatha!');
                      }}
                      className="px-2 py-1.5 bg-white/5 hover:bg-white/10 text-[9px] text-slate-355 rounded-lg cursor-pointer transition-colors text-left truncate font-mono"
                      title="Tunis Derja Scenario"
                    >
                      🇹🇳 Tunis Derja
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-[10.5px] font-bold text-slate-400" htmlFor="messenger-tester-sender-name">Simulated Sender Profile Name:</label>
                    <input
                      id="messenger-tester-sender-name"
                      type="text"
                      value={testMessengerWebhookSenderName}
                      onChange={(e) => setTestMessengerWebhookSenderName(e.target.value)}
                      placeholder="E.g., Maria Sharapova"
                      className="w-full bg-[#0d121d] text-slate-100 text-xs px-3 py-2 border border-white/5 rounded-lg outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10.5px] font-bold text-slate-400 font-mono" htmlFor="messenger-tester-sender-psid">Simulated Profile ID (PSID):</label>
                    <select
                      id="messenger-tester-sender-psid"
                      value={testMessengerWebhookSenderPSID}
                      onChange={(e) => setTestMessengerWebhookSenderPSID(e.target.value)}
                      className="w-full bg-[#0d121d] text-slate-100 text-xs px-2.5 py-2 border border-white/5 rounded-lg outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                    >
                      {messengerSandboxNumbers.length > 0 ? (
                        messengerSandboxNumbers.map((userVal, uidx) => (
                          <option key={uidx} value={userVal}>Matched Selector: {userVal}</option>
                        ))
                      ) : (
                        <option value="psid_9281742">Temporary Context User (psid_9281742)</option>
                      )}
                      <option value="psid_fb_tester_881">New FB Tester (psid_fb_tester_881)</option>
                      <option value="psid_fb_tester_219">Support Lead Account (psid_fb_tester_219)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10.5px] font-bold text-blue-400 font-mono block">⚡ Omni-AI Specialized Role templates:</label>
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          setTestMessengerWebhookMessage(e.target.value);
                        }
                      }}
                      className="w-full bg-[#0d121d] border border-blue-500/20 text-[#60a5fa] hover:text-white transition-all text-[11px] px-2.5 py-2 rounded-lg outline-none font-mono"
                    >
                      <option value="">-- Click to choose sample conversation class --</option>
                      {selectedTenant.industry === 'fitness' ? (
                        <>
                          <option value="Hi, I want to book a private personal coach assessment for tomorrow at 10 AM. Can we schedule? My email is maria@fitness.com">🗓️ Meeting Booker: Fitness coach appointment</option>
                          <option value="What are the monthly fees for the premium crossfit weightlifting and can I buy workout retail shakes? My name is Maria.">🛍️ Retail Sales: Subscription rates & shake checkout</option>
                          <option value="An error occurred on the check-in card reader today, help me resolve subscription login.">💬 Customer Support: Check-in hardware assistance</option>
                          <option value="Do you offer a student discount rate if I bring a group of 3 friends?">🌸 FAQ Guide: Group & student rates</option>
                        </>
                      ) : (
                        <>
                          <option value="Hi, I am trying to book a luxury catering buffet for a corporate event of 45 guests next Friday. Can we schedule? My email is catering@gourmet.co">🗓️ Meeting Booker: Catering buffet appointment</option>
                          <option value="What premium retail merchandise or custom lunch trays are available? My name is Maria.">🛍️ Retail Sales: Menu trays & merchandise checkout</option>
                          <option value="There is a mistake on the total luxury checkout balance, whom should I speak to?">💬 Customer Support: Invoicing reconciliation</option>
                          <option value="Do you have organic, vegan, or nut-free options on the catering sheet?">🌸 FAQ Guide: Menu substitutions & allergies</option>
                        </>
                      )}
                      <option value="Bahi, n7eb nasal 3la aswem esh'har, chneya el offers eli 3andkom tawa?">🇹🇳 Tunisian Derja dialect inquiry</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-[10.5px] font-bold text-slate-400 font-mono flex items-center gap-1" htmlFor="messenger-tester-body">
                        <span>Simulated Customer Text Body:</span>
                        <button
                          type="button"
                          onClick={toggleMessengerChatMic}
                          className={`p-1 rounded-md transition-all cursor-pointer flex items-center justify-center border shrink-0 ${
                            isMessengerChatMicActive
                              ? 'bg-rose-500 text-white border-rose-455 animate-pulse'
                              : 'bg-white/5 text-slate-400 hover:text-white border-white/5 hover:bg-white/10'
                          }`}
                          title={isMessengerChatMicActive ? "Stop listening" : "Speak to dictate text (Voice transcription input)"}
                        >
                          <Mic className="h-3 w-3" />
                        </button>
                      </label>
                      <span className="text-[9.5px] font-mono text-slate-500">Facebook Graph String</span>
                    </div>
                    <textarea
                      id="messenger-tester-body"
                      rows={3}
                      value={testMessengerWebhookMessage}
                      onChange={(e) => setTestMessengerWebhookMessage(e.target.value)}
                      placeholder="Write simulated incoming text..."
                      className="w-full bg-[#0d121d] text-slate-100 text-xs px-3 py-2 border border-white/5 rounded-lg outline-none focus:ring-1 focus:ring-blue-500 font-mono leading-relaxed resize-none"
                    />
                    {/* Voice Note Simulation checkbox */}
                    <div className="flex items-center gap-2 mt-1.5 bg-white/[0.02] border border-white/5 p-2 rounded-lg select-none">
                      <input
                        type="checkbox"
                        id="messenger-input-voice-note-checkbox"
                        checked={messengerInputIsVoiceNote}
                        onChange={(e) => setMessengerInputIsVoiceNote(e.target.checked)}
                        className="bg-[#0b0f19] text-blue-500 rounded border-white/10 focus:ring-blue-500 cursor-pointer h-3.5 w-3.5"
                      />
                      <label htmlFor="messenger-input-voice-note-checkbox" className="text-[10px] font-mono text-slate-300 cursor-pointer flex items-center gap-1 bg-transparent">
                        🎙️ Send as Voice Note (audio attachment payload)
                      </label>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isTestingMessengerWebhook}
                    className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:opacity-50 text-white font-mono text-xs font-bold py-2 px-4 rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                  >
                    {isTestingMessengerWebhook ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Generating AI Response...</span>
                      </>
                    ) : (
                      <>
                        <span>🚀 Dispatch simulated Messenger webhook</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Middle: API JSON handshakes logs output Terminal (3 cols) */}
              <div className="lg:col-span-4 space-y-1.5">
                <span className="text-[10.5px] font-mono font-bold text-slate-450 uppercase tracking-widest block">Simulation Execution Logs:</span>
                <div className="bg-[#04060a] border border-white/5 rounded-xl px-3 py-3 h-64 overflow-y-auto text-[10px] font-mono text-[#38bdf8] space-y-2.5 shadow-inner scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                  {testMessengerWebhookLogs.length === 0 ? (
                    <div className="text-slate-605 h-full flex flex-col justify-center items-center text-center">
                      <span>📟 TELEMETRY SYSTEM IDLE</span>
                      <span className="text-[9px] mt-1 text-slate-500">Submit the trigger form to initiate Graph API pipeline outputs.</span>
                    </div>
                  ) : (
                    testMessengerWebhookLogs.map((logLine, lidx) => (
                      <p key={lidx} className="leading-relaxed border-b border-white/2 pb-1 last:border-0">{logLine}</p>
                    ))
                  )}
                  {isTestingMessengerWebhook && (
                    <div className="text-slate-500 text-[10px] italic flex items-center gap-1.5 pt-1 animate-pulse">
                      <RefreshCw className="h-3 w-3 animate-spin text-blue-500" />
                      <span>Processing LLM pipeline responses...</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Simulated Messenger Smartphone chat bubble list (4 cols) */}
              <div className="lg:col-span-4 space-y-1.5">
                <span className="text-[10.5px] font-mono font-bold text-slate-455 uppercase tracking-wider block">🗣️ Simulated Conversation Stream:</span>
                <div className="bg-[#030509] border border-white/5 px-3 py-3 rounded-xl h-64 overflow-y-auto text-xs space-y-3 shadow-inner scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                  {testMessengerConversationsList.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-650 font-mono text-center px-4">
                      <span>No active message exchange found.</span>
                      <span className="text-[9.5px] mt-1">Submit the test webhook form to ignite the cycle.</span>
                    </div>
                  ) : (
                    testMessengerConversationsList.map((msg, index) => {
                      const isPlaying = playingMessengerMessageId === `msg-${index}`;
                      const handlePlayVoiceLocal = () => {
                        if ('speechSynthesis' in window) {
                          if (isPlaying) {
                            window.speechSynthesis.cancel();
                            setPlayingMessengerMessageId(null);
                          } else {
                            window.speechSynthesis.cancel();
                            const cleanText = msg.text.replace(/[*#_~`\[\]]/g, '');
                            const utterance = new SpeechSynthesisUtterance(cleanText);
                            utterance.onend = () => {
                              setPlayingMessengerMessageId(null);
                            };
                            utterance.onerror = () => {
                              setPlayingMessengerMessageId(null);
                            };
                            setPlayingMessengerMessageId(`msg-${index}`);
                            window.speechSynthesis.speak(utterance);
                          }
                        }
                      };

                      return (
                        <div key={index} className={`flex flex-col ${msg.sender === 'bot' ? 'items-start' : 'items-end'}`}>
                          <div className={`px-2.5 py-1.5 rounded-xl max-w-[85%] ${
                            msg.sender === 'bot' 
                            ? 'bg-[#2563eb]/20 border border-blue-500/10 text-slate-100 shadow-[0_2px_8px_rgba(37,99,235,0.1)]' 
                            : 'bg-[#1e293b] border border-white/5 text-slate-200'
                          }`}>
                            <div className="font-semibold text-[9px] opacity-60 font-mono mb-0.5 text-blue-400">
                              {msg.sender === 'bot' ? selectedTenant.botName || 'Assistant' : testMessengerWebhookSenderName}
                            </div>
                            
                            {msg.isAudio ? (
                              <div className="flex items-center gap-2 bg-slate-900/60 p-1.5 rounded-lg my-1 mx-0.5 min-w-[170px] border border-white/5 select-none font-mono">
                                <button
                                  type="button"
                                  onClick={handlePlayVoiceLocal}
                                  className={`p-1 text-white rounded-full flex items-center justify-center shrink-0 cursor-pointer shadow active:scale-95 transition-all ${
                                    isPlaying ? 'bg-rose-500' : 'bg-blue-500 hover:bg-blue-600'
                                  }`}
                                  title={isPlaying ? "Mute" : "Listen Playback"}
                                >
                                  {isPlaying ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
                                </button>
                                
                                <div className="flex-1 flex flex-col justify-center min-w-0">
                                  <div className="flex items-end gap-[1.5px] h-3.5 mb-0.5 pt-0.5">
                                    {[1, 2, 3, 4, 3, 2, 3, 4, 5, 4, 3, 2, 3, 4, 3, 2, 1, 2, 3, 2, 1].map((h, hIdx) => (
                                      <span 
                                        key={hIdx} 
                                        className={`w-[2px] rounded-full transition-all duration-300 ${
                                          isPlaying ? 'bg-blue-400 animate-pulse' : 'bg-slate-600'
                                        }`}
                                        style={{ 
                                          height: isPlaying ? `${Math.max(3, Math.min(14, h * (1 + Math.random() * 0.8)))}px` : `${h * 2}px` 
                                        }}
                                      />
                                    ))}
                                  </div>
                                  <span className="text-[7.5px] text-slate-400 leading-none">🎙️ Voice Notes Audio</span>
                                </div>
                              </div>
                            ) : null}

                            <p className={`leading-snug text-[10.5px] select-all font-sans ${msg.isAudio ? 'italic text-slate-300 pt-0.5 border-t border-white/5' : ''}`}>
                              {msg.isAudio ? `"${msg.text}"` : msg.text}
                            </p>
                          </div>
                          <span className="text-[8px] text-slate-500 mt-0.5 px-1 font-mono">
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Twilio voice bridge dashboard */}
          <div className="p-6 rounded-3xl border border-indigo-500/20 bg-[#080d19]/80 shadow-[0_0_25px_rgba(99,102,241,0.15)] relative overflow-hidden space-y-6">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    {selectedTenant.twilioVoiceActive ? (
                      <>
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                      </>
                    ) : (
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-slate-500"></span>
                    )}
                  </span>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    🎙️ Twilio VoIP Voice Config Control
                  </h3>
                </div>
                <p className="text-[11px] text-slate-400 font-mono">
                  Bridge inbound telephone lines to the Gemini Live AI voice websocket.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Voice Options */}
              <div className="space-y-4 font-mono text-xs text-slate-350">
                <div className="flex items-center justify-between p-3.5 bg-[#0c1222] border border-white/5 rounded-xl">
                  <div>
                    <span className="font-bold text-white block">Twilio Voice Active:</span>
                    <span className="text-[10px] text-slate-500 block leading-tight pt-0.5 font-sans">Route incoming voice calls to Gemini.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      updateTenantFields({
                        twilioVoiceActive: !selectedTenant.twilioVoiceActive
                      });
                    }}
                    className={`px-3 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                      selectedTenant.twilioVoiceActive
                        ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                        : 'bg-white/5 border-white/10 text-slate-400'
                    }`}
                  >
                    {selectedTenant.twilioVoiceActive ? 'ACTIVE' : 'INACTIVE'}
                  </button>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 block font-mono">Gemini Live Voice Selector:</label>
                  <select
                    value={selectedTenant.twilioVoiceName || 'Zephyr'}
                    onChange={(e) => {
                      updateTenantFields({
                        twilioVoiceName: e.target.value
                      });
                    }}
                    className="w-full bg-[#0c1222] text-slate-100 text-xs px-3 py-2.5 border border-white/5 focus:border-indigo-500/40 rounded-xl outline-none focus:ring-1 focus:ring-indigo-500/50 font-sans cursor-pointer transition-all"
                  >
                    <option value="Zephyr">Zephyr (Warm Male - Default)</option>
                    <option value="Puck">Puck (Energetic Male)</option>
                    <option value="Charon">Charon (Deep Voice Male)</option>
                    <option value="Kore">Kore (Warm Female)</option>
                    <option value="Fenrir">Fenrir (Deep Voice Female)</option>
                    <option value="Aoede">Aoede (Clear Female)</option>
                  </select>
                </div>
              </div>

              {/* Right Column: Webhook Setup info */}
              <div className="space-y-4 font-mono text-xs text-slate-350 bg-[#0c1222] p-4.5 border border-white/5 rounded-2xl">
                <div className="space-y-1">
                  <span className="text-slate-400 block text-[11px] font-semibold font-mono">
                    Twilio TwiML Webhook Callback URL:
                  </span>
                  <div className="bg-[#04060b] text-indigo-300 border border-white/5 px-2.5 py-1.5 rounded-lg flex items-center justify-between font-mono text-[10.5px]">
                    <span className="truncate select-all leading-normal text-indigo-405 font-bold text-indigo-400">
                      {window.location.origin}/api/twilio/voice?tenantId={selectedTenant.id}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 block leading-tight pt-1">
                    ⚡ Copy this URL and paste it under the "A Call Comes In" section of your Twilio Active Phone Number configurations.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
