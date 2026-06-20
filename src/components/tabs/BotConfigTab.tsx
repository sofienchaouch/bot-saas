import React from 'react';
import { useSaaS } from '../../context/SaaSContext';
import { useLanguage } from '../../LanguageContext';
import {
  Bot,
  Plus,
  CheckCircle,
  Mic,
  Trash2,
  AlertCircle,
  Cpu,
  RefreshCw,
  Sliders,
  Sparkles,
  Send,
  Loader2,
  Terminal,
  EyeOff,
  Eye,
  Check
} from 'lucide-react';

export const BotConfigTab: React.FC = () => {
  const { t } = useLanguage();
  const {
    selectedTenant,
    userRole,
    agentActionSuccess,
    showAddAgentForm,
    setShowAddAgentForm,
    editingAgentId,
    setEditingAgentId,
    agentNameInput,
    setAgentNameInput,
    agentRoleInput,
    setAgentRoleInput,
    agentToneInput,
    setAgentToneInput,
    agentAvatarInput,
    setAgentAvatarInput,
    agentVoiceEnabledInput,
    setAgentVoiceEnabledInput,
    agentSystemInstructionInput,
    setAgentSystemInstructionInput,
    getTenantAgents,
    handleApplyAgentArchetype,
    handleSelectActiveAgent,
    handleSaveAgent,
    handleStartEditAgent,
    handleDeleteAgent,
    isRecordingAgent,
    isRecordingPlayground,
    speechError,
    startVoiceRecording,
    stopVoiceRecording,
    playgroundMessages,
    setPlaygroundMessages,
    playgroundInput,
    setPlaygroundInput,
    playgroundInstruction,
    setPlaygroundInstruction,
    playgroundIsLoading,
    playgroundRawResponse,
    setPlaygroundRawResponse,
    playgroundSelectedAgentId,
    setPlaygroundSelectedAgentId,
    playgroundSystemPromptUsed,
    playgroundSuccessMsg,
    handleSendPlaygroundMessage,
    handleApplyPlaygroundInstructionsToAgent,
    showAddTemplateForm,
    setShowAddTemplateForm,
    templateNameInput,
    setTemplateNameInput,
    templateTextInput,
    setTemplateTextInput,
    editingTemplateId,
    setEditingTemplateId,
    handleSaveWelcomeTemplate,
    handleDeleteWelcomeTemplate,
    handleStartEditWelcomeTemplate,
    handleSetActiveWelcomeTemplate
  } = useSaaS();

  if (!selectedTenant) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-display font-medium tracking-tight text-white flex items-center gap-2">
            <Bot className="h-5 w-5 text-indigo-400" />
            {t('botConfigTitle')}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5 font-mono">
            {t('botConfigSub')} (<strong>{selectedTenant.name}</strong>)
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingAgentId(null);
            setAgentNameInput('');
            setAgentRoleInput('');
            setAgentToneInput('friendly');
            setAgentSystemInstructionInput('');
            setAgentAvatarInput('🤖');
            setAgentVoiceEnabledInput(false);
            setShowAddAgentForm(!showAddAgentForm);
          }}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl cursor-pointer transition-colors shadow-[0_0_12px_rgba(99,102,241,0.4)] font-mono animate-fadeIn"
          id="add-specialty-bot-agent-btn"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Create Specialty Bot</span>
        </button>
      </div>

      {/* Switcher feedback banner */}
      {agentActionSuccess && (
        <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-[#10b881]/10 text-emerald-200 text-xs font-mono flex items-center gap-2.5 animate-fadeIn">
          <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{agentActionSuccess}</span>
        </div>
      )}

      {/* Inline Agent creator / editor form */}
      {showAddAgentForm && (
        <form onSubmit={handleSaveAgent} className="p-5 border border-[#6366f1]/20 bg-[#080b12] rounded-2xl space-y-4 shadow-2xl relative overflow-hidden" id="agent-config-form">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
              {editingAgentId ? "✏️ Edit Specialty Bot Configuration" : "✨ Create New Specialized AI Personality"}
            </h4>
            <p className="text-[10px] text-slate-500 font-mono">
              Describe their responsibilities, voice style, and behavioral constraints.
            </p>
          </div>

          {/* Archetype Quick-Prefills row */}
          <div className="bg-[#0b0e17] border border-indigo-500/10 p-3 rounded-xl space-y-2">
            <span className="text-[10px] font-bold text-indigo-400 uppercase font-mono block">⚡ Auto-generate Agent Archetype details:</span>
            <div className="flex flex-wrap gap-1.5 font-mono text-[10px]">
              <button
                type="button"
                onClick={() => handleApplyAgentArchetype('sales')}
                className="px-2.5 py-1.5 bg-[#0d121d] hover:bg-indigo-500/10 border border-white/5 hover:border-indigo-500/25 rounded-lg text-slate-300 hover:text-indigo-400 font-semibold cursor-pointer transition-all hover:scale-[1.02]"
              >
                💼 Lead Closer
              </button>
              <button
                type="button"
                onClick={() => handleApplyAgentArchetype('faq')}
                className="px-2.5 py-1.5 bg-[#0d121d] hover:bg-indigo-500/10 border border-white/5 hover:border-indigo-500/25 rounded-lg text-slate-300 hover:text-indigo-400 font-semibold cursor-pointer transition-all hover:scale-[1.02]"
              >
                🌸 FAQ Guide
              </button>
              <button
                type="button"
                onClick={() => handleApplyAgentArchetype('booking')}
                className="px-2.5 py-1.5 bg-[#0d121d] hover:bg-indigo-500/10 border border-white/5 hover:border-indigo-500/25 rounded-lg text-slate-300 hover:text-indigo-400 font-semibold cursor-pointer transition-all hover:scale-[1.02]"
              >
                🗓️ Meeting Booker
              </button>
              <button
                type="button"
                onClick={() => handleApplyAgentArchetype('customer_support')}
                className="px-2.5 py-1.5 bg-[#0d121d] hover:bg-[#6366f1]/15 border border-indigo-500/30 rounded-lg text-indigo-300 hover:text-indigo-200 font-semibold cursor-pointer transition-all hover:scale-[1.02]"
              >
                💬 Customer Support
              </button>
              <button
                type="button"
                onClick={() => handleApplyAgentArchetype('retail_sales')}
                className="px-2.5 py-1.5 bg-[#0d121d] hover:bg-[#6366f1]/15 border border-indigo-500/30 rounded-lg text-indigo-300 hover:text-indigo-200 font-semibold cursor-pointer transition-all hover:scale-[1.02]"
              >
                🛍️ Retail Sales Specialist
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="agent-name-input" className="text-xs font-semibold text-slate-400 font-mono">Bot Name:</label>
              <input
                id="agent-name-input"
                type="text"
                required
                value={agentNameInput}
                onChange={(e) => setAgentNameInput(e.target.value)}
                placeholder="E.g., SupportBot, SalesCoach, Chef Celeste"
                className="w-full bg-[#0d121d] text-slate-100 text-xs px-3 py-2 border border-white/5 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="agent-role-input" className="text-xs font-semibold text-slate-400 font-mono">Specialized Role Descriptor:</label>
              <input
                id="agent-role-input"
                type="text"
                required
                value={agentRoleInput}
                onChange={(e) => setAgentRoleInput(e.target.value)}
                placeholder="E.g., High-Ticket Memberships Sales, Urgent FAQ Support"
                className="w-full bg-[#0d121d] text-slate-100 text-xs px-3 py-2 border border-white/5 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="agent-avatar-input" className="text-xs font-semibold text-slate-400 font-mono">Avatar Emoji Selection:</label>
              <select
                id="agent-avatar-input"
                value={agentAvatarInput}
                onChange={(e) => setAgentAvatarInput(e.target.value)}
                className="w-full bg-[#0d121d] text-slate-100 text-xs px-3 py-2 border border-white/5 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500 font-mono cursor-pointer"
              >
                <option value="🤖">🤖 Bot Classic</option>
                <option value="🏋️‍♂️">🏋️‍♂️ Athlete Trainer</option>
                <option value="💪">💪 Motivator Hulk</option>
                <option value="👩‍🍳">👩‍🍳 Master Chef</option>
                <option value="🌸">🌸 Lotus/Beauty</option>
                <option value="✨">✨ Glow/Cosmetic</option>
                <option value="🤵">🤵 Concierge/Suite</option>
                <option value="🕶️">🕶️ Secret Agent</option>
                <option value="💼">💼 Corporate Lead</option>
                <option value="🩺">🩺 Clinical Expert</option>
                <option value="💬">💬 Chat Bubble</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="agent-tone-input" className="text-xs font-semibold text-slate-400 font-mono">Voice Tone Model:</label>
              <select
                id="agent-tone-input"
                value={agentToneInput}
                onChange={(e) => setAgentToneInput(e.target.value as any)}
                className="w-full bg-[#0d121d] text-slate-100 text-xs px-3 py-2 border border-white/5 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500 font-mono cursor-pointer"
              >
                <option value="friendly">Friendly / Supportive (High warmth)</option>
                <option value="professional">Professional / Executive (Reserved & elite)</option>
                <option value="casual">Casual / Energetic (Fast-paced & conversational)</option>
                <option value="empathetic">Empathetic / Clinical Care (Reassuring & precise)</option>
              </select>
            </div>

            <div className="space-y-1.5 flex flex-col justify-end pb-0.5">
              <label className="text-xs font-semibold text-slate-400 font-mono">Voice Enable Toggle:</label>
              <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#0d121d] border border-white/5 hover:border-indigo-500/20 rounded-lg cursor-pointer select-none transition-all h-[38px]">
                <input
                  type="checkbox"
                  checked={agentVoiceEnabledInput}
                  onChange={(e) => setAgentVoiceEnabledInput(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="relative w-8 h-4 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-500"></div>
                <span className="text-xs font-mono text-slate-300 peer-checked:text-indigo-400 font-bold flex items-center gap-1 shrink-0">
                  🎤 {agentVoiceEnabledInput ? 'Voice Enabled' : 'Text Only'}
                </span>
              </label>
            </div>

            <div className="col-span-full space-y-1.5" id="agent-prompt-container">
              <div className="flex items-center justify-between">
                <label htmlFor="agent-prompt" className="text-xs font-semibold text-slate-400 font-mono">Dedicated System Prompt Constraints (Gemini instructions):</label>
                <button
                  type="button"
                  onClick={() => isRecordingAgent ? stopVoiceRecording() : startVoiceRecording('agent')}
                  className={`px-2.5 py-1 rounded-lg text-[10.5px] font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                    isRecordingAgent 
                      ? 'bg-red-500/10 text-red-400 border-red-500/30 animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.2)]'
                      : 'bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border-indigo-500/20 hover:border-indigo-500/30'
                  }`}
                  id="voice-prompt-agent-toggle"
                >
                  <Mic className={`h-3.5 w-3.5 ${isRecordingAgent ? 'animate-bounce text-red-400' : 'text-indigo-400'}`} />
                  <span>{isRecordingAgent ? 'Recording voice... Click to Stop' : 'Record with Voice'}</span>
                </button>
              </div>
              <div className="relative">
                <textarea
                  id="agent-prompt"
                  required
                  rows={4}
                  value={agentSystemInstructionInput}
                  onChange={(e) => setAgentSystemInstructionInput(e.target.value)}
                  placeholder="Introduce key goals, prompt bounds, and pricing points they should push during live conversations."
                  className={`w-full bg-[#0d121d] text-slate-100 text-xs p-3.5 border rounded-lg outline-none focus:ring-1 focus:ring-indigo-500 font-mono leading-relaxed transition-all ${
                    isRecordingAgent ? 'border-red-500/35 ring-1 ring-red-500/15 bg-[#140b0f]' : 'border-white/5'
                  }`}
                />
                {isRecordingAgent && (
                  <div className="absolute top-2 right-2 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '100ms' }} />
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                )}
              </div>
              {speechError && (
                <p className="text-[10px] text-red-400 font-mono font-medium flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
                  {speechError}
                </p>
              )}
              {isRecordingAgent && (
                <div className="text-[10.5px] text-emerald-400 font-mono bg-emerald-500/5 p-2 rounded-lg border border-emerald-500/10">
                  🎙️ <span className="font-bold text-white">Live Microphone active!</span> Keep speaking. Your words are being filled in real-time.
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setShowAddAgentForm(false);
                setEditingAgentId(null);
              }}
              className="px-3.5 py-1.5 text-xs text-slate-400 hover:bg-white/5 rounded-lg font-mono cursor-pointer"
            >
              Cancel
            </button>
            {userRole !== 'support' ? (
              <button
                type="submit"
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-md cursor-pointer transition-colors font-mono"
              >
                {editingAgentId ? "Save Agent Changes" : "Deploy Specialty Bot"}
              </button>
            ) : (
              <span className="text-[10px] text-slate-500 font-mono italic">Prompt updates restricted for Support role</span>
            )}
          </div>
        </form>
      )}

      {/* Grid of registered specialized bots */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {getTenantAgents(selectedTenant).map((agent) => {
          const isActive = selectedTenant.activeAgentId === agent.id || 
            (!selectedTenant.activeAgentId && getTenantAgents(selectedTenant)[0]?.id === agent.id);
          
          return (
            <div
              key={agent.id}
              className={`p-5 rounded-2xl border transition-all text-xs flex flex-col justify-between relative overflow-hidden bg-[#080b12] shadow-lg ${
                isActive 
                  ? 'border-indigo-500 ring-1 ring-indigo-500/20' 
                  : 'border-white/5 hover:border-white/10'
              }`}
            >
              {isActive && (
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none animate-pulse" />
              )}

              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl bg-[#0d121d] p-1.5 rounded-xl border border-white/5 flex items-center justify-center h-11 w-11 shrink-0 select-none">
                      {agent.avatar || '🤖'}
                    </span>
                    <div>
                      <h3 className="font-bold text-white tracking-wide text-sm flex items-center gap-1.5">
                        <span>@{agent.name}</span>
                        {isActive && (
                          <span className="text-[9px] font-bold uppercase font-mono px-2 py-0.5 rounded bg-[#6366f1]/10 text-indigo-400 border border-[#6366f1]/20 shadow-[0_0_8px_rgba(99,102,241,0.2)]">
                            Active
                          </span>
                        )}
                      </h3>
                      <p className="text-[10.5px] font-mono text-slate-400 font-semibold">{agent.role}</p>
                    </div>
                  </div>

                  {!isActive && (
                    <button
                      onClick={() => handleSelectActiveAgent(agent.id)}
                      type="button"
                      className="text-[10px] font-semibold font-mono px-3 py-1 rounded-lg bg-[#0d121d] hover:bg-indigo-600/30 hover:text-white text-slate-400 border border-white/5 hover:border-indigo-500/40 transition-all cursor-pointer shrink-0"
                    >
                      Activate
                    </button>
                  )}
                </div>

                <div className="space-y-2 mt-4 pt-4 border-t border-white/5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[9px] uppercase font-mono tracking-wider text-slate-500 font-bold">Voice Model Tone:</span>
                    <span className="text-[9.5px] font-mono px-1.5 py-0.5 rounded bg-white/5 border border-white/5 text-slate-300 capitalize">
                      {agent.tone}
                    </span>
                    {agent.voiceEnabled ? (
                      <span className="text-[8.5px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold flex items-center gap-0.5 shrink-0 shadow-[0_0_8px_rgba(16,185,129,0.1)]">
                        🎙️ Voice Enabled
                      </span>
                    ) : (
                      <span className="text-[8.5px] font-mono px-1.5 py-0.5 rounded bg-slate-500/10 border border-white/5 text-slate-400 flex items-center gap-0.5 shrink-0">
                        💬 Text Response
                      </span>
                    )}
                  </div>

                  <p className="text-slate-400 leading-relaxed font-mono text-[11px] line-clamp-3 bg-[#0d121d]/50 p-2.5 rounded-lg border border-white/5">
                    {agent.systemInstruction}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3.5 border-t border-white/5 flex justify-between items-center gap-1.5 shrink-0 font-mono">
                <span className="text-[9.5px] text-slate-500 italic">
                  {agent.isCustom ? 'Custom AI Specialty' : 'Preset Persona'}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleStartEditAgent(agent.id)}
                    type="button"
                    className="px-2.5 py-1 bg-[#0d121d] hover:bg-white/5 border border-white/5 text-slate-300 text-[11px] rounded-lg cursor-pointer font-mono transition-colors"
                  >
                    Configure
                  </button>
                  
                  {/* Only allow deletion if total count > 1 */}
                  {getTenantAgents(selectedTenant).length > 1 && userRole !== 'support' && (
                    <button
                      onClick={() => handleDeleteAgent(agent.id)}
                      type="button"
                      className="p-1 hover:bg-red-500/10 text-red-400 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
                      title="Remove Specialty Bot"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Info override disclaimer banner */}
      <div className="p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 text-indigo-200 text-xs flex gap-2.5">
        <AlertCircle className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed font-mono text-[11px]">
          <strong>Engine Note:</strong> Active specialized agent prompts are bounded directly to the live Sandbox WhatsApp channel. Swiping the active agent here updates the live LLM instruction buffer instantly, requiring no manual dev cycle.
        </p>
      </div>

      {/* INTERACTIVE PLAYGROUND COMPONENT SECTION */}
      <div id="agent-sandbox-playground" className="border border-indigo-500/20 rounded-2xl bg-[#080d19] p-6 space-y-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="text-xl font-display font-medium text-white flex items-center gap-2">
                <Cpu className="h-5 w-5 text-indigo-400 animate-bounce" />
                Interactive Agent Prompt Sandbox
              </h3>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-1">
              Experiment with system instructions and custom prompt behaviors under direct simulation without modifying real lead records.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setPlaygroundMessages([
                  { sender: 'bot', text: 'Playground diagnostic logs has been reset. Standard sandbox simulation loaded! What would you like to verify?', timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
                ]);
                setPlaygroundRawResponse(null);
              }}
              type="button"
              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-lg border border-white/10 text-xs transition-all cursor-pointer flex items-center gap-1.5 font-mono"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear Chat History
            </button>

            <button
              onClick={() => {
                const agents = getTenantAgents(selectedTenant);
                const activeTestBot = agents.find(a => a.id === playgroundSelectedAgentId) || agents[0];
                if (activeTestBot) {
                  setPlaygroundInstruction(activeTestBot.systemInstruction);
                }
              }}
              type="button"
              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-lg border border-white/10 text-xs transition-all cursor-pointer flex items-center gap-1.5 font-mono"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Reset Instruction Override
            </button>
          </div>
        </div>

        {playgroundSuccessMsg && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/25 rounded-lg text-emerald-300 text-xs font-mono">
            ✨ {playgroundSuccessMsg}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
          
          {/* Sandbox Prompt controls column */}
          <div className="lg:col-span-5 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-medium font-mono flex items-center gap-1.5">
                <Sliders className="h-3.5 w-3.5 text-indigo-400" />
                Testing Target Agent
              </label>
              <select
                value={playgroundSelectedAgentId}
                onChange={(e) => setPlaygroundSelectedAgentId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#0d1222] border border-white/10 text-slate-300 text-xs focus:ring-1 focus:ring-indigo-500 text-white font-mono bg-[#080d19]"
              >
                {getTenantAgents(selectedTenant).map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    @{agent.name} ({agent.role})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5" id="playground-prompt-container">
              <div className="flex items-center justify-between">
                <label className="text-xs text-slate-300 font-medium font-mono flex items-center gap-1.5">
                  <Sliders className="h-3.5 w-3.5 text-indigo-400" />
                  System Guidelines Custom Override
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => isRecordingPlayground ? stopVoiceRecording() : startVoiceRecording('playground')}
                    className={`px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold flex items-center gap-1 transition-all cursor-pointer border ${
                      isRecordingPlayground 
                        ? 'bg-red-500/10 text-red-400 border-red-500/30 animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.2)]'
                        : 'bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border-indigo-500/20 hover:border-indigo-500/30'
                    }`}
                    id="voice-prompt-playground-toggle"
                  >
                    <Mic className={`h-3 w-3 ${isRecordingPlayground ? 'animate-bounce text-red-550' : 'text-indigo-400'}`} />
                    <span>{isRecordingPlayground ? 'Stop' : 'Speak'}</span>
                  </button>
                  <span className="text-[10px] text-indigo-400 font-mono bg-indigo-500/10 px-1.5 py-0.5 rounded">
                    Sandbox Only
                  </span>
                </div>
              </div>
              <div className="relative">
                <textarea
                  rows={11}
                  value={playgroundInstruction}
                  onChange={(e) => setPlaygroundInstruction(e.target.value)}
                  placeholder="Apply personalized rules for translation constraints, specific appointment hours, or strict anti-hallucination rules..."
                  className={`w-full p-3 rounded-xl bg-[#030610] border focus:outline-none focus:border-indigo-500 font-mono text-[11px] leading-relaxed resize-none transition-all ${
                    isRecordingPlayground ? 'border-red-500/35 ring-1 ring-red-500/15 bg-[#140b0f]' : 'border-white/10 text-slate-300'
                  }`}
                />
                {isRecordingPlayground && (
                  <div className="absolute top-2 right-2 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '100ms' }} />
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                )}
              </div>
              {isRecordingPlayground && (
                <div className="text-[10px] text-emerald-400 font-mono bg-emerald-500/5 p-1.5 rounded-lg border border-emerald-500/10">
                  🎙️ Talking into sandbox bypass. Your guidelines are being updated in real-time.
                </div>
              )}
              <p className="text-[10px] text-slate-400 font-mono leading-normal">
                Feel free to tweak the prompt above. Any adjustments will only affect the sandbox playground chat simulation until you apply it to the actual bot configuration.
              </p>
            </div>

            {/* Deploy update button */}
            {userRole !== 'support' ? (
              <button
                onClick={handleApplyPlaygroundInstructionsToAgent}
                type="button"
                className="w-full py-2.5 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-mono shadow-md hover:shadow-indigo-500/10 cursor-pointer flex items-center justify-center gap-2 transition-all font-medium"
              >
                <Sparkles className="h-4 w-4" />
                Apply Tested Prompt to Live Specialty Agent
              </button>
            ) : (
              <button
                disabled
                type="button"
                className="w-full py-2.5 px-4 bg-slate-800 text-slate-500 rounded-xl text-xs font-mono cursor-not-allowed flex items-center justify-center gap-2 transition-all font-medium"
              >
                <Sparkles className="h-4 w-4" />
                Prompt Editing Restricted (Support Agent)
              </button>
            )}
          </div>

          {/* Chat Sandbox Stream Column */}
          <div className="lg:col-span-7 flex flex-col h-[400px] border border-white/15 rounded-2xl bg-[#0c1222] overflow-hidden">
            <div className="bg-[#11182c] border-b border-white/5 py-3 px-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                </span>
                <span className="text-xs text-white font-mono font-medium">Sandbox chat stream</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono bg-white/5 px-2 py-0.5 rounded-full">
                {playgroundMessages.length} Messages
              </span>
            </div>

            {/* Chat Messages flow */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 bg-[#090d1a]">
              {playgroundMessages.map((msg, idx) => {
                const isBot = msg.sender === 'bot';
                return (
                  <div key={idx} className={`flex items-start gap-2.5 ${isBot ? 'justify-start' : 'justify-end'}`}>
                    {isBot && (
                      <div className="h-7 w-7 rounded-lg bg-indigo-600/30 border border-indigo-500/20 text-indigo-400 text-xs flex items-center justify-center font-mono shrink-0">
                        🤖
                      </div>
                    )}
                    
                    <div className="flex flex-col space-y-1 max-w-[80%]">
                      <div className={`p-3 rounded-2xl text-xs leading-relaxed ${
                        isBot 
                          ? 'bg-[#121c33] text-slate-200 border border-white/5 rounded-tl-none' 
                          : 'bg-indigo-600 text-white rounded-tr-none'
                      }`}>
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                        
                        {/* Action tag details indicator */}
                        {isBot && msg.action && (
                          <div className="mt-2 pt-2 border-t border-white/5 space-y-1">
                            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-mono font-bold text-indigo-400">
                              <Sparkles className="h-3 w-3 text-indigo-400" />
                              Extracted CRM Action Detail:
                            </div>
                            <div className="bg-[#080c16] p-2 rounded border border-indigo-500/10 font-mono text-[10px] text-emerald-400 space-y-0.5">
                              <div><strong className="text-slate-400">Action Type:</strong> {msg.action.type}</div>
                              {msg.action.details && (
                                <div><strong className="text-slate-400">Payload:</strong> {msg.action.details}</div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      <span className={`text-[9px] text-slate-500 font-mono ${!isBot ? 'text-right' : ''}`}>
                        {msg.timestamp || 'Just now'}
                      </span>
                    </div>

                    {!isBot && (
                      <div className="h-7 w-7 rounded-lg bg-indigo-600 text-white text-xs flex items-center justify-center font-mono shrink-0">
                        👤
                      </div>
                    )}
                  </div>
                );
              })}

              {playgroundIsLoading && (
                <div className="flex items-start gap-2.5 justify-start">
                  <div className="h-7 w-7 rounded-lg bg-indigo-600/30 border border-indigo-500/20 text-indigo-400 text-xs flex items-center justify-center font-mono shrink-0 animate-spin">
                    <Loader2 className="h-3.5 w-3.5" />
                  </div>
                  <div className="bg-[#121c33] p-3 rounded-2xl rounded-tl-none text-xs text-slate-200 border border-white/5 font-mono flex items-center gap-2">
                    <span>Thinking... rendering reasoning model context...</span>
                  </div>
                </div>
              )}
            </div>

            {/* QUICK MOCK INPUT PRESETS */}
            <div className="bg-[#090d1a] border-t border-white/5 px-4 py-2 flex flex-wrap items-center gap-1.5">
              <span className="text-[9px] text-slate-400 uppercase tracking-widest font-mono mr-1">Quick Scenarios:</span>
              <button
                onClick={() => setPlaygroundInput("What is the cost of your premium tier services?")}
                type="button"
                className="px-2 py-1 bg-white/5 hover:bg-indigo-500/15 text-[10px] text-slate-300 hover:text-indigo-300 rounded border border-white/10 font-mono transition-all cursor-pointer"
              >
                ❔ Ask Pricing
              </button>
              <button
                onClick={() => setPlaygroundInput("Hi, I want to book a custom training appointment tomorrow at 10:00 AM if free.")}
                type="button"
                className="px-2 py-1 bg-white/5 hover:bg-indigo-500/15 text-[10px] text-slate-300 hover:text-indigo-300 rounded border border-white/10 font-mono transition-all cursor-pointer"
              >
                🗓️ Book Appointment
              </button>
              <button
                onClick={() => setPlaygroundInput("Excellent. Let's confirm it. My email is john@test.com and phone is 555-1234")}
                type="button"
                className="px-2 py-1 bg-white/5 hover:bg-indigo-500/15 text-[10px] text-slate-300 hover:text-indigo-300 rounded border border-white/10 font-mono transition-all cursor-pointer"
              >
                🚀 Submit Lead Details
              </button>
            </div>

            {/* Chat Input form */}
            <form onSubmit={handleSendPlaygroundMessage} className="p-3 bg-[#11182c] border-t border-white/5 flex gap-2">
              <input
                type="text"
                value={playgroundInput}
                onChange={(e) => setPlaygroundInput(e.target.value)}
                placeholder="Send a simulated user message..."
                disabled={playgroundIsLoading}
                className="flex-1 bg-[#090d1a] px-3.5 py-2 text-xs text-slate-300 border border-white/10 rounded-xl focus:outline-none focus:border-indigo-500 text-white font-mono"
              />
              <button
                type="submit"
                disabled={playgroundIsLoading || !playgroundInput.trim()}
                className="p-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-white/5 disabled:hover:bg-white/5 text-white disabled:text-slate-500 rounded-xl cursor-pointer transition-colors"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>

        </div>

        {/* LIVE REAL-TIME REASONING CONSOLE PANEL */}
        <div className="border border-white/10 rounded-xl bg-[#04060b] overflow-hidden">
          <div className="bg-white/5 border-b border-white/10 px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-emerald-400" />
              <span className="text-xs font-mono font-medium text-slate-200">
                RAW Gemini Integration Logs & Prompt Context Analyzer
              </span>
            </div>
            
            <button
              onClick={() => {
                if (playgroundRawResponse) {
                  setPlaygroundRawResponse((prev: any) => ({
                    ...prev,
                    _expanded: !prev?._expanded
                  }));
                } else {
                  setPlaygroundRawResponse({
                    reply: "None",
                    actionTriggered: null,
                    _expanded: true
                  });
                }
              }}
              type="button"
              className="px-2.5 py-1 bg-[#090d1a] border border-white/10 hover:bg-white/5 text-[11px] font-mono rounded text-slate-400 hover:text-slate-200 cursor-pointer flex items-center gap-1"
            >
              {playgroundRawResponse?._expanded ? (
                <>
                  <EyeOff className="h-3.5 w-3.5" />
                  Hide Console Panel
                </>
              ) : (
                <>
                  <Eye className="h-3.5 w-3.5" />
                  Reveal Diagnostic Console
                </>
              )}
            </button>
          </div>

          {(playgroundRawResponse?._expanded || playgroundRawResponse === null) && (
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/10 text-[11px] font-mono h-[280px]">
              
              {/* Prompt context side */}
              <div className="p-4 flex flex-col h-full min-h-0">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-2 flex items-center gap-1.5 text-indigo-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                  Last Interpolated System Prompt Passed to Gemini:
                </div>
                
                <div className="flex-1 bg-black/60 p-3 rounded border border-white/5 text-slate-400 overflow-y-auto leading-relaxed text-[10px]">
                  {playgroundSystemPromptUsed ? (
                    <pre className="whitespace-pre-wrap">{playgroundSystemPromptUsed}</pre>
                  ) : (
                    <div className="text-slate-500 flex flex-col items-center justify-center h-full space-y-1">
                      <Terminal className="h-5 w-5 text-slate-600" />
                      <span>No evaluation executed yet. Send a mock message in the stream.</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Raw JSON side */}
              <div className="p-4 flex flex-col h-full min-h-0">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-2 flex items-center gap-1.5 text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Raw response payload returned from API:
                </div>

                <div className="flex-1 bg-black/60 p-3 rounded border border-white/5 text-emerald-400 overflow-y-auto leading-relaxed text-[10px]">
                  {playgroundRawResponse ? (
                    <pre className="whitespace-pre-wrap">
                      {JSON.stringify(playgroundRawResponse, null, 2)}
                    </pre>
                  ) : (
                    <div className="text-slate-600 flex flex-col items-center justify-center h-full space-y-1">
                      <Terminal className="h-5 w-5 text-slate-600" />
                      <span>Awaiting playground API execution payload.</span>
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}
        </div>

      </div>

      {/* Visual Section: WhatsApp Welcome Message Templates */}
      <div className="border-t border-white/5 pt-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-display font-medium text-white flex items-center gap-2">
              WhatsApp Welcome Message Templates
            </h3>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Configure predefined greetings that first-time consumers receive on WhatsApp.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditingTemplateId(null);
              setTemplateNameInput('');
              setTemplateTextInput('');
              setShowAddTemplateForm(!showAddTemplateForm);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl cursor-pointer transition-colors shadow-[0_0_12px_rgba(37,99,235,0.4)]"
            id="add-welcome-template-btn"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Create Template</span>
          </button>
        </div>

        {/* Inline Welcome Message Template add / edit form */}
        {showAddTemplateForm && (
          <form onSubmit={handleSaveWelcomeTemplate} className="p-5 border border-white/10 bg-[#080b12] rounded-2xl space-y-4 shadow-2xl relative overflow-hidden" id="welcome-template-form">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none"></div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                {editingTemplateId ? "✏️ Edit Welcome Message Template" : "✨ Create New Welcome Template"}
              </h4>
              <p className="text-[10px] text-slate-500 font-mono">
                Formatting tips: Use asterisks for *bold* text, underscores for _italics_, and paste standard emojis to design a rich interactive experience.
              </p>
            </div>

            <div className="space-y-4 z-10 relative">
              <div className="space-y-1.5">
                <label htmlFor="wt-name-input" className="text-xs font-semibold text-slate-400 font-mono">Template Name / Scenario Label:</label>
                <input
                  id="wt-name-input"
                  type="text"
                  required
                  value={templateNameInput}
                  onChange={(e) => setTemplateNameInput(e.target.value)}
                  placeholder="E.g., After-Hours Greeting, New Signup Welcome, Promo Campaign"
                  className="w-full bg-[#0d121d] text-slate-100 text-xs px-3 py-2 border border-white/5 rounded-lg outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="wt-text-input" className="text-xs font-semibold text-slate-400 font-mono">WhatsApp Welcome Text Body:</label>
                <textarea
                  id="wt-text-input"
                  required
                  rows={4}
                  value={templateTextInput}
                  onChange={(e) => setTemplateTextInput(e.target.value)}
                  placeholder="E.g., Welcome to our store! 👋 How can our team assist you today? Ask about our weekly products or schedule an appointment."
                  className="w-full bg-[#0d121d] text-slate-100 text-xs p-3.5 border border-white/5 rounded-lg outline-none focus:ring-1 focus:ring-blue-500 font-mono leading-relaxed"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 z-10 relative">
              <button
                type="button"
                onClick={() => {
                  setShowAddTemplateForm(false);
                  setTemplateNameInput('');
                  setTemplateTextInput('');
                  setEditingTemplateId(null);
                }}
                className="px-3.5 py-1.5 text-xs text-slate-400 hover:bg-white/5 rounded-lg font-mono cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-md cursor-pointer transition-colors"
              >
                {editingTemplateId ? "Save Changes" : "Create Template"}
              </button>
            </div>
          </form>
        )}

        {/* List of Registered Templates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(!selectedTenant.welcomeTemplates || selectedTenant.welcomeTemplates.length === 0) ? (
            <div className="col-span-full py-8 text-center border border-dashed border-white/5 rounded-2xl bg-[#080b12] text-slate-500 font-mono text-xs">
              No welcome templates registered. Click "Create Template" to add one!
            </div>
          ) : (
            selectedTenant.welcomeTemplates.map((wt) => {
              const isActive = selectedTenant.activeWelcomeTemplateId === wt.id;
              return (
                <div
                  key={wt.id}
                  className={`p-4 rounded-2xl border transition-all text-xs flex flex-col justify-between relative overflow-hidden bg-[#080b12] shadow-lg ${
                    isActive 
                      ? 'border-blue-500/30 ring-1 ring-blue-500/20' 
                      : 'border-white/5 hover:border-white/10'
                  }`}
                >
                  {isActive && (
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/3 rounded-full blur-xl pointer-events-none"></div>
                  )}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <h4 className="font-bold text-white tracking-wide truncate pr-2">
                        {wt.name}
                      </h4>
                      {isActive ? (
                        <span className="text-[9px] font-bold uppercase font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-[0_0_8px_rgba(59,130,246,0.15)] flex items-center gap-1 shrink-0">
                          <Check className="h-2.5 w-2.5" /> Active Welcome
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSetActiveWelcomeTemplate(wt.id)}
                          type="button"
                          className="text-[9px] font-bold uppercase font-mono px-2 py-0.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 border border-white/5 transition-colors cursor-pointer shrink-0"
                        >
                          Set Active
                        </button>
                      )}
                    </div>
                    <p className="text-slate-400 leading-relaxed font-mono text-[11px] whitespace-pre-wrap">
                      {wt.text}
                    </p>
                  </div>

                  <div className="mt-4 pt-3.5 border-t border-white/5 flex justify-end gap-1.5 shrink-0">
                    <button
                      onClick={() => handleStartEditWelcomeTemplate(wt.id)}
                      type="button"
                      className="px-2.5 py-1 bg-[#0d121d] hover:bg-white/5 border border-white/5 text-slate-300 text-[11px] rounded-lg cursor-pointer font-mono transition-colors"
                      title="Edit Template Text"
                    >
                      Edit Text
                    </button>
                    <button
                      onClick={() => handleDeleteWelcomeTemplate(wt.id)}
                      type="button"
                      className="p-1 hover:bg-red-500/10 text-red-400 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
                      title="Delete Template"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
