import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSaaS } from '../../context/SaaSContext';
import { useDialerStore } from '../../stores/dialerStore';
import { useLanguage } from '../../LanguageContext';
import { Lead } from '../../types';
import {
  Users,
  Download,
  Cloud,
  Loader2,
  Plus,
  Search,
  MessageSquare,
  Bot,
  Phone,
  Mail,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Terminal,
  ArrowRight
} from 'lucide-react';

export const LeadsTab: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [inboxSearch, setInboxSearch] = React.useState('');
  const [inboxLimit, setInboxLimit] = React.useState(10);
  const {
    selectedTenant,
    setTenants,
    leadsSearchQuery,
    setLeadsSearchQuery,
    leadsStatusFilter,
    setLeadsStatusFilter,
    googleToken,
    exportingToSheets,
    sheetsExportUrl,
    sheetsExportError,
    showAddLead,
    setShowAddLead,
    leadNameInput,
    setLeadNameInput,
    leadPhoneInput,
    setLeadPhoneInput,
    leadEmailInput,
    setLeadEmailInput,
    leadNoteInput,
    setLeadNoteInput,
    takeoverConvos,
    setTakeoverConvos,
    selectedConvoKey,
    setSelectedConvoKey,
    takeoverReplyText,
    setTakeoverReplyText,
    isSendingTakeoverReply,
    isInternalNote,
    setIsInternalNote,
    user,
    userRole,
    updateTenantFields,
    handleManualAddLead,
    handleExportToCSV,
    handleExportToSheets,
    handleSendTakeoverReply,
    handleAutopilotToggle,
    webhookLeadId,
    webhookStatus,
    webhookLogs,
    handleTriggerWebhookDispatch,
    nurtureTriggerActive,
    setNurtureTriggerActive,
    nurtureTriggerStage,
    setNurtureTriggerStage,
    nurtureSubjectTemplate,
    setNurtureSubjectTemplate,
    nurtureBodyTemplate,
    setNurtureBodyTemplate,
    nurtureLogs,
    handleTriggerNurtureEmail
  } = useSaaS();

  const { setDialerCustomerNumber, setDialerCustomerName, setIsDialerModalOpen, setDialerState, setDialerTimer } =
    useDialerStore();

  React.useEffect(() => {
    const fetchConvos = async () => {
      try {
        const q = encodeURIComponent(inboxSearch);
        const res = await fetch(`/api/conversations/${selectedTenant.id}?q=${q}&limit=${inboxLimit}`);
        if (res.ok) {
          const data = await res.json();
          setTakeoverConvos(data);
        }
      } catch (e) {}
    };
    const timer = setTimeout(fetchConvos, 300);
    return () => clearTimeout(timer);
  }, [selectedTenant.id, inboxSearch, inboxLimit, setTakeoverConvos]);

  if (!selectedTenant) return null;

  const statusCounts = { ALL: 0, NEW: 0, INTERESTED: 0, QUALIFIED: 0, CONTACTED: 0 };
  (selectedTenant.leads || []).forEach(lead => {
    statusCounts.ALL++;
    const statusKey = lead.status.toUpperCase() as keyof typeof statusCounts;
    if (statusKey in statusCounts) {
      statusCounts[statusKey]++;
    }
  });

  const filteredLeads = (selectedTenant.leads || []).filter(lead => {
    const matchesSearch = 
      lead.name.toLowerCase().includes(leadsSearchQuery.toLowerCase()) ||
      (lead.email || '').toLowerCase().includes(leadsSearchQuery.toLowerCase()) ||
      (lead.phone || '').toLowerCase().includes(leadsSearchQuery.toLowerCase()) ||
      (lead.note || '').toLowerCase().includes(leadsSearchQuery.toLowerCase());
    
    const matchesStatus = 
      leadsStatusFilter === 'ALL' || 
      lead.status.toUpperCase() === leadsStatusFilter.toUpperCase();
      
    return matchesSearch && matchesStatus;
  });

  const activeLeadId = webhookLeadId || (selectedTenant.leads[0]?.id || '');
  const activeLead = selectedTenant.leads.find(l => l.id === activeLeadId);

  const mockPayload = activeLead ? {
    event: "customer.captured_whatsapp",
    timestamp: new Date().toISOString(),
    channel: {
      platform: "WHATSAPP_BUSINESS",
      active_agent: selectedTenant.botName
    },
    organization: {
      tenant_id: selectedTenant.id,
      tenant_name: selectedTenant.name
    },
    lead: {
      external_id: activeLead.id,
      customer_name: activeLead.name,
      telephone: activeLead.phone,
      email_address: activeLead.email,
      internal_stage_tag: activeLead.status,
      timeline_origin: activeLead.dateCaptured,
      AI_context_extracted: activeLead.note
    }
  } : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-display font-medium tracking-tight text-white font-sans flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-500" />
            <span>{t('leadsTitle')}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5 font-mono">{t('leadsSub')}</p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={handleExportToCSV}
            disabled={selectedTenant.leads.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0d121d] hover:bg-white/5 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed border border-white/5 disabled:border-transparent text-slate-300 disabled:text-slate-600 text-xs font-semibold rounded-xl cursor-pointer font-mono transition-all"
            id="export-leads-csv-btn"
            title="Download Leads database as CSV spreadsheet file"
          >
            <Download className="h-3.5 w-3.5 text-blue-400" />
            <span>Export CSV</span>
          </button>

          {/* Google Sheets Live Sync Button */}
          {googleToken ? (
            <button
              onClick={handleExportToSheets}
              disabled={exportingToSheets || selectedTenant.leads.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-45 text-white border border-indigo-505 text-xs font-semibold rounded-xl font-mono cursor-pointer transition-all shadow-[0_0_12px_rgba(99,102,241,0.3)]"
              id="export-to-google-sheets-btn"
              title="Instantly compile and commit active Leads to your private Google Workspace Sheet"
            >
              {exportingToSheets ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
              ) : (
                <Cloud className="h-3.5 w-3.5 text-white animate-bounce" />
              )}
              <span>Sync Live Google Sheet</span>
            </button>
          ) : (
            <button
              disabled
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800 border border-white/5 text-slate-500 text-xs font-semibold rounded-xl font-mono cursor-not-allowed select-none"
              title="Sign in with your Google Account in Workspace Hub page to unlock live Sheets export!"
            >
              <Cloud className="h-3.5 w-3.5 text-slate-600" />
              <span>Sheets Locked 🔒</span>
            </button>
          )}
          <button
            onClick={() => setShowAddLead(!showAddLead)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl cursor-pointer transition-all shadow-[0_0_12px_rgba(37,99,235,0.4)]"
            id="add-lead-btn"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Create Mock Opportunity</span>
          </button>
        </div>
      </div>

      {/* Elegant Search & Filter Toolbar */}
      <div className="bg-[#080b12] border border-white/5 p-4 rounded-2xl flex flex-col lg:flex-row gap-4 justify-between items-stretch">
        {/* Search Field */}
        <div className="relative flex-1 max-w-sm lg:max-w-md">
          <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={leadsSearchQuery}
            onChange={(e) => setLeadsSearchQuery(e.target.value)}
            placeholder="Search by name, email, phone or key tag..."
            className="w-full bg-[#0d121d] text-slate-100 placeholder-slate-500 text-xs pl-10 pr-8 py-2 border border-white/5 focus:border-blue-505 rounded-xl outline-none focus:ring-1 focus:ring-blue-500 font-mono transition-all"
            id="leads-search-input"
          />
          {leadsSearchQuery && (
            <button
              onClick={() => setLeadsSearchQuery('')}
              type="button"
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white text-[10px] font-mono font-bold cursor-pointer bg-slate-800 hover:bg-slate-700 px-1.5 py-0.5 rounded"
            >
              Clear
            </button>
          )}
        </div>

        {/* Pipeline Segment Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px]">
          {(['ALL', 'NEW', 'INTERESTED', 'QUALIFIED', 'CONTACTED'] as const).map((status) => {
            const isActive = leadsStatusFilter === status;
            const count = statusCounts[status];
            return (
              <button
                key={status}
                type="button"
                onClick={() => setLeadsStatusFilter(status)}
                className={`px-3 py-1.5 rounded-xl border font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                  isActive 
                    ? 'bg-blue-600/15 border-blue-500/30 text-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.15)]' 
                    : 'bg-[#0d121d] border-white/5 text-slate-400 hover:text-white hover:border-white/10'
                }`}
              >
                <span>{status}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[9px] ${
                  isActive ? 'bg-blue-500 text-white font-bold' : 'bg-white/5 text-slate-500 font-bold'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Inline Lead add modal */}
      {showAddLead && (
        <form onSubmit={handleManualAddLead} className="p-5 border border-white/10 bg-[#080b12] rounded-2xl space-y-4 shadow-2xl relative overflow-hidden">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="lead-name" className="text-xs font-semibold text-slate-400 font-mono">Customer Name:</label>
              <input
                id="lead-name"
                type="text"
                required
                value={leadNameInput}
                onChange={(e) => setLeadNameInput(e.target.value)}
                placeholder="John Wick"
                className="w-full bg-[#0d121d] text-slate-100 text-xs px-3 py-2 border border-white/5 rounded-lg outline-none focus:ring-1 focus:ring-blue-500 font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="lead-phone" className="text-xs font-semibold text-slate-400 font-mono">WhatsApp Telephone:</label>
              <input
                id="lead-phone"
                type="text"
                value={leadPhoneInput}
                onChange={(e) => setLeadPhoneInput(e.target.value)}
                placeholder="+1 (555) 012-3456"
                className="w-full bg-[#0d121d] text-slate-100 text-xs px-3 py-2 border border-white/5 rounded-lg outline-none focus:ring-1 focus:ring-blue-500 font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="lead-email" className="text-xs font-semibold text-slate-400 font-mono">Email Address:</label>
              <input
                id="lead-email"
                type="email"
                value={leadEmailInput}
                onChange={(e) => setLeadEmailInput(e.target.value)}
                placeholder="wick@assassin.com"
                className="w-full bg-[#0d121d] text-slate-100 text-xs px-3 py-2 border border-white/5 rounded-lg outline-none focus:ring-1 focus:ring-blue-500 font-mono"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="lead-note" className="text-xs font-semibold text-slate-400 font-mono">Additional Customer Notes:</label>
            <input
              id="lead-note"
              type="text"
              value={leadNoteInput}
              onChange={(e) => setLeadNoteInput(e.target.value)}
              placeholder="Enquired about bulk event fine dining next month."
              className="w-full bg-[#0d121d] text-slate-100 text-xs px-3.5 py-2 border border-white/5 rounded-lg outline-none focus:ring-1 focus:ring-blue-500 font-mono"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddLead(false)}
              className="px-3.5 py-1.5 text-xs text-slate-400 hover:bg-white/5 rounded-lg font-mono cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-md cursor-pointer"
            >
              Save Opportunity
            </button>
          </div>
        </form>
      )}

      {/* Live Chat Takeover Console Panel */}
      <div className="bg-[#080b12] border border-white/5 p-6 rounded-2xl space-y-4 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
          <div>
            <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider font-mono flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              <span>Live Chat Takeover Console</span>
            </h3>
            <p className="text-[11px] text-slate-400 font-sans mt-0.5">
              Pause AI Autopilot to manually text customers. Conversations synchronize instantly.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* Status badge */}
            <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold font-mono border ${
              selectedTenant.autopilotEnabled !== false
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
            }`}>
              {selectedTenant.autopilotEnabled !== false ? '● AI AUTOPILOT ACTIVE' : '● MANUAL TAKEOVER MODE'}
            </div>
            <button
              onClick={() => handleAutopilotToggle(selectedTenant.autopilotEnabled === false)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold font-mono border cursor-pointer transition-all ${
                selectedTenant.autopilotEnabled !== false
                  ? 'bg-amber-600/10 border-amber-500/20 text-amber-400 hover:bg-amber-600/20'
                  : 'bg-emerald-600/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-600/20'
              }`}
            >
              {selectedTenant.autopilotEnabled !== false ? 'Pause Autopilot' : 'Resume Autopilot'}
            </button>
          </div>
        </div>

        {selectedTenant.autopilotEnabled !== false ? (
          <div className="p-8 text-center bg-[#0d121d]/50 rounded-xl border border-white/5 space-y-3">
            <Bot className="h-8 w-8 text-slate-500 mx-auto animate-pulse" />
            <p className="text-xs font-semibold text-slate-300">Autopilot is Currently Handling Chats</p>
            <p className="text-[11px] text-slate-500 max-w-md mx-auto">
              The Gemini AI Bot is autonomously answering customer questions, qualifying leads, and syncing bookings. Pause Autopilot to unlock manual chat takeover.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[400px]">
            {/* Sidebar: Conversation Threads */}
            <div className="lg:col-span-4 border border-white/5 rounded-xl bg-[#090d16] flex flex-col max-h-[450px]">
              <div className="p-3 border-b border-white/5 flex items-center justify-between bg-[#0d121d]">
                <span className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider">Active Channels</span>
                <button
                  onClick={async () => {
                    try {
                      const q = encodeURIComponent(inboxSearch);
                      const res = await fetch(`/api/conversations/${selectedTenant.id}?q=${q}&limit=${inboxLimit}`);
                      if (res.ok) {
                        const data = await res.json();
                        setTakeoverConvos(data);
                      }
                    } catch (e) {}
                  }}
                  className="text-[9px] font-mono text-blue-400 hover:underline cursor-pointer"
                >
                  Refresh
                </button>
              </div>

              {/* Thread Search Box */}
              <div className="px-3 py-2 border-b border-white/5 bg-[#0d121d] flex items-center gap-1.5">
                <Search className="h-3 w-3 text-slate-500 shrink-0" />
                <input
                  type="text"
                  value={inboxSearch}
                  onChange={(e) => setInboxSearch(e.target.value)}
                  placeholder="Search messages, tags, numbers..."
                  className="w-full bg-transparent text-slate-200 placeholder-slate-550 text-[10px] font-mono outline-none"
                />
                {inboxSearch && (
                  <button
                    onClick={() => setInboxSearch('')}
                    className="text-[9px] text-slate-500 hover:text-slate-300 cursor-pointer"
                  >
                    clear
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin">
                {Object.keys(takeoverConvos).length === 0 ? (
                  <p className="text-center text-slate-650 font-mono text-[10px] py-8 select-none">No active threads</p>
                ) : (
                  <>
                    {Object.keys(takeoverConvos).map(key => {
                      const isSelected = selectedConvoKey === key;
                      const customerId = key.substring(selectedTenant.id.length + 1);
                      const thread = takeoverConvos[key];
                      const lastMsg = thread.messages?.[thread.messages.length - 1];
                      const matchedLead = selectedTenant.leads?.find(l => l.phone === customerId || l.id === customerId);
                      const displayName = matchedLead ? matchedLead.name : customerId;

                      const isTg = key.includes('_tg_');
                      const isSms = key.includes('_sms_');
                      const isMessenger = key.includes('_psid_') || key.toLowerCase().includes('psid');
                      const channelLabel = isTg ? 'Telegram' : isSms ? 'SMS' : isMessenger ? 'Messenger' : 'WhatsApp';
                      const channelColor = isTg 
                        ? 'bg-sky-500/10 border-sky-500/20 text-sky-400' 
                        : isSms 
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                          : isMessenger 
                            ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' 
                            : 'bg-green-500/10 border-green-500/20 text-green-400';

                      return (
                        <button
                          key={key}
                          onClick={() => setSelectedConvoKey(key)}
                          className={`w-full text-left p-3 rounded-lg border transition-all flex flex-col gap-1.5 cursor-pointer ${
                            isSelected
                              ? 'bg-blue-600/10 border-blue-500/30 text-blue-400'
                              : 'bg-[#0d121d]/50 border-transparent hover:bg-white/5 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-xs truncate max-w-[120px]">{displayName}</span>
                            <span className="text-[9px] font-mono text-slate-500">
                              {lastMsg ? new Date(lastMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500 truncate block">
                            {lastMsg ? lastMsg.text : 'No messages'}
                          </span>
                          <div className="flex flex-wrap items-center gap-1 mt-1">
                            <span className={`text-[7px] uppercase font-mono px-1 rounded border ${channelColor}`}>
                              {channelLabel}
                            </span>
                            {thread.tags && thread.tags.map((t: string) => (
                              <span key={t} className="text-[7px] font-bold px-1 rounded bg-amber-500/10 border border-amber-500/25 text-amber-400 font-mono">
                                {t}
                              </span>
                            ))}
                          </div>
                        </button>
                      );
                    })}

                    {Object.keys(takeoverConvos).length >= inboxLimit && (
                      <button
                        type="button"
                        onClick={() => setInboxLimit(prev => prev + 10)}
                        className="w-full py-1.5 text-center text-[9px] font-mono font-bold text-blue-400 hover:text-blue-300 hover:bg-blue-500/5 rounded-lg border border-dashed border-blue-500/20 cursor-pointer transition-all mt-1"
                      >
                        Load More Threads...
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Chat Window */}
            <div className="lg:col-span-8 border border-white/5 rounded-xl bg-[#090d16] flex flex-col max-h-[450px]">
              {selectedConvoKey && takeoverConvos[selectedConvoKey] ? (() => {
                const customerId = selectedConvoKey.substring(selectedTenant.id.length + 1);
                const thread = takeoverConvos[selectedConvoKey];
                const matchedLead = selectedTenant.leads?.find(l => l.phone === customerId || l.id === customerId);
                const displayName = matchedLead ? matchedLead.name : customerId;

                return (
                  <>
                    {/* Chat Header */}
                    <div className="p-3 border-b border-white/5 flex flex-wrap items-center justify-between bg-[#0d121d] rounded-t-xl gap-2 shrink-0">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                        <span className="font-semibold text-xs text-slate-200">{displayName}</span>
                        {matchedLead && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-mono">
                            {matchedLead.status.toUpperCase()}
                          </span>
                        )}

                        {/* Agent Assignment Selection */}
                        <div className="flex items-center gap-1.5 ml-3 font-mono text-[9px]">
                          <span className="text-slate-500">ASSIGN:</span>
                          <select
                            value={thread.assignedAgentName || ''}
                            onChange={async (e) => {
                              const val = e.target.value;
                              try {
                                const res = await fetch(`/api/conversations/${selectedTenant.id}/${customerId}/assign`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ assignedAgentName: val })
                                });
                                if (res.ok) {
                                  setTakeoverConvos(prev => ({
                                    ...prev,
                                    [selectedConvoKey]: {
                                      ...prev[selectedConvoKey],
                                      assignedAgentName: val
                                    }
                                  }));
                                }
                              } catch (err) {}
                            }}
                            className="bg-[#090d16] border border-white/10 rounded px-1.5 py-0.5 text-slate-300 cursor-pointer outline-none focus:border-blue-500/50 text-[9px]"
                          >
                            <option value="">Unassigned</option>
                            {selectedTenant.agents?.map(a => (
                              <option key={a.id} value={a.name}>{a.name} ({a.role})</option>
                            ))}
                          </select>
                        </div>

                        {/* Thread Tags Toggles */}
                        <div className="flex items-center gap-1 ml-3 font-mono text-[9px]">
                          <span className="text-slate-500">TAGS:</span>
                          {['VIP', 'Escalated', 'Resolved'].map(tag => {
                            const hasTag = (thread.tags || []).includes(tag);
                            return (
                              <button
                                type="button"
                                key={tag}
                                onClick={async () => {
                                  const currentTags = thread.tags || [];
                                  const updatedTags = hasTag
                                    ? currentTags.filter((t: string) => t !== tag)
                                    : [...currentTags, tag];
                                  try {
                                    const res = await fetch(`/api/conversations/${selectedTenant.id}/${customerId}/tags`, {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ tags: updatedTags })
                                    });
                                    if (res.ok) {
                                      setTakeoverConvos(prev => ({
                                        ...prev,
                                        [selectedConvoKey]: {
                                          ...prev[selectedConvoKey],
                                          tags: updatedTags
                                        }
                                      }));
                                    }
                                  } catch (err) {}
                                }}
                                className={`text-[8.5px] px-1 py-0.2 rounded border transition-all cursor-pointer ${
                                  hasTag
                                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-400 font-bold'
                                    : 'bg-white/5 border-white/10 text-slate-500 hover:text-slate-300'
                                }`}
                              >
                                {tag}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <a
                          href={`/api/conversations/${selectedTenant.id}/${customerId}/export`}
                          className="px-2.5 py-1 bg-blue-600/20 border border-blue-500/30 hover:bg-blue-600/30 text-blue-400 hover:text-white rounded-lg text-[9px] font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow"
                          download
                        >
                          <Download className="h-3 w-3" />
                          <span>Export CSV</span>
                        </a>
                        <button
                          type="button"
                          onClick={() => {
                            setDialerCustomerNumber(matchedLead?.phone || customerId);
                            setDialerCustomerName(displayName);
                            setIsDialerModalOpen(true);
                            setDialerState('dialing');
                            setDialerTimer(0);
                          }}
                          className="px-2.5 py-1 bg-emerald-600/20 border border-emerald-500/30 hover:bg-emerald-600/30 text-emerald-400 hover:text-white rounded-lg text-[9px] font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow"
                        >
                          <Phone className="h-3 w-3 animate-pulse" />
                          <span>📞 Click-to-Call</span>
                        </button>
                        <span className="text-[9px] font-mono text-slate-500">ID: {customerId}</span>
                      </div>
                    </div>

                    {/* Messages list */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin flex flex-col bg-[#05070a]/40">
                      {thread.messages.map((msg: any, index: number) => {
                        const isUser = msg.sender === 'user';
                        const isManual = msg.isManualTakeover;
                        const isInternal = msg.isInternal === true;

                        if (isInternal) {
                          return (
                            <div key={index} className="flex flex-col w-full max-w-[85%] self-center items-center py-1">
                              <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-xl text-xs font-mono w-full text-center shadow-sm select-none">
                                <span className="font-bold text-[9px] uppercase tracking-wider text-amber-400 block mb-1">⚠️ INTERNAL TEAM NOTE</span>
                                {msg.text}
                              </div>
                              <div className="text-[8.5px] font-mono text-slate-500 mt-1">
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={index}
                            className={`flex flex-col max-w-[80%] ${isUser ? 'self-start' : 'self-end items-end'}`}
                          >
                            <div
                              className={`p-3 rounded-2xl text-xs leading-relaxed ${
                                isUser
                                  ? 'bg-slate-800 text-slate-200 rounded-tl-none'
                                  : isManual
                                    ? 'bg-teal-600 text-white rounded-tr-none shadow-[0_0_10px_rgba(20,184,166,0.2)]'
                                    : 'bg-blue-600 text-white rounded-tr-none shadow-[0_0_10px_rgba(37,99,235,0.2)]'
                              }`}
                            >
                              <div>{msg.text}</div>
                              {msg.citations && msg.citations.length > 0 && (
                                <div className="mt-2 pt-1.5 border-t border-white/10 flex flex-wrap gap-1 items-center text-[9px] font-mono opacity-85">
                                  <span className="font-bold">Sources:</span>
                                  {msg.citations.map((cite: string, idx: number) => (
                                    <span key={idx} className="bg-black/20 px-1 py-0.2 rounded border border-white/10">{cite}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-1 text-[8.5px] font-mono text-slate-500">
                              <span>
                                {isUser
                                  ? 'User'
                                  : isManual
                                    ? '👤 Human Support'
                                    : '🤖 AI Agent'}
                              </span>
                              <span>•</span>
                              <span>
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Send Input Form */}
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSendTakeoverReply(customerId);
                      }}
                      className="p-3 border-t border-white/5 bg-[#0d121d] flex flex-col gap-2 rounded-b-xl shrink-0"
                    >
                      <div className="flex gap-2 w-full">
                        <input
                          type="text"
                          value={takeoverReplyText}
                          onChange={(e) => setTakeoverReplyText(e.target.value)}
                          placeholder={isInternalNote ? "Type internal team note..." : "Type a manual reply response to send..."}
                          className="flex-1 bg-[#090d16] text-slate-100 placeholder-slate-500 text-xs px-3.5 py-2 border border-white/5 focus:border-blue-505 rounded-xl outline-none focus:ring-1 focus:ring-blue-500 font-mono transition-all"
                          disabled={isSendingTakeoverReply}
                        />
                        <button
                          type="submit"
                          disabled={isSendingTakeoverReply || !takeoverReplyText.trim()}
                          className={`inline-flex items-center justify-center px-4 py-2 disabled:opacity-40 text-white text-xs font-semibold rounded-xl cursor-pointer transition-all shrink-0 ${
                            isInternalNote 
                              ? 'bg-amber-600 hover:bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.4)]' 
                              : 'bg-blue-600 hover:bg-blue-500 shadow-[0_0_12px_rgba(37,99,235,0.4)]'
                          }`}
                        >
                          {isSendingTakeoverReply ? 'Sending...' : 'Send'}
                        </button>
                      </div>
                      <div className="flex items-center justify-between font-mono text-[9px] text-slate-400 select-none">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="checkbox"
                            id="takeover-internal-note-check"
                            checked={isInternalNote}
                            onChange={(e) => setIsInternalNote(e.target.checked)}
                            className="h-3.5 w-3.5 bg-[#090d16] border-white/10 rounded cursor-pointer accent-blue-600"
                          />
                          <label htmlFor="takeover-internal-note-check" className="cursor-pointer font-bold hover:text-white transition-colors flex items-center gap-1">
                            <span>⚠️ Send as Internal Team Note (Support Eyes Only)</span>
                          </label>
                        </div>
                        
                        {/* Canned Responses Dropdown */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-500 font-bold">CANNED REPLY:</span>
                          <select
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val) {
                                setTakeoverReplyText(val);
                                e.target.value = "";
                              }
                            }}
                            className="bg-[#090d16] border border-white/10 rounded px-1.5 py-0.5 text-slate-350 hover:text-white cursor-pointer outline-none focus:border-blue-500/50 text-[9px]"
                          >
                            <option value="">Insert template...</option>
                            <option value="Hello! Thanks for reaching out. How can I assist you today?">Greet & Welcome</option>
                            <option value="Our business hours are strictly Monday to Friday, from 9:00 AM to 5:00 PM.">Working Hours</option>
                            <option value="I would be happy to book you in! What slot works best for you?">Suggest Booking</option>
                            <option value="Our consultation packages start from $49/month. We accept major credit cards.">Pricing Plans</option>
                          </select>
                        </div>
                      </div>
                    </form>
                  </>
                );
              })() : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 font-mono text-xs">
                  <MessageSquare className="h-8 w-8 text-slate-700 animate-bounce mb-2" />
                  Select an active channel thread on the sidebar to begin manual takeover text session.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Leads Grid list table of contacts */}
      <div className="overflow-x-auto border border-white/5 rounded-2xl shadow-2xl bg-[#080b12]">
        <table className="w-full text-left text-xs border-collapse min-w-[700px]">
          <thead>
            <tr className="bg-[#0d121d] font-mono text-[10px] text-slate-400 border-b border-white/5 tracking-wider uppercase font-semibold">
              <th className="p-4">Customer info</th>
              <th className="p-4">WhatsApp Contact</th>
              <th className="p-4">Capture Source</th>
              <th className="p-4 text-center">Opportunity Pill</th>
              <th className="p-4 text-right">Settings</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredLeads.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-12 text-center text-slate-505 font-mono">
                  <div className="max-w-sm mx-auto space-y-2">
                    <Users className="h-8 w-8 mx-auto text-slate-600 animate-pulse" />
                    <p className="text-xs font-semibold text-slate-300">No leads match your active filters</p>
                    <p className="text-[11px] text-slate-550">Try loosening your search query, selecting "ALL" stages, or triggering leads via the WhatsApp simulator sandbox.</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredLeads.map((lead) => (
                <tr key={lead.id} className="hover:bg-white/5 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold border border-blue-500/20 shadow-[0_0_8px_rgba(59,130,246,0.4)]">
                        {lead.name.charAt(0)}
                      </div>
                      <div className="space-y-0.5">
                        <p className="font-bold text-white">{lead.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                          <Mail className="h-3 w-3" /> {lead.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 font-mono text-[11px] text-slate-300">
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3 text-slate-500" /> {lead.phone}
                    </span>
                  </td>
                  <td className="p-4 text-slate-400">
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-mono">Captured: {lead.dateCaptured}</p>
                      <p className="text-[10px] italic max-w-xs truncate text-slate-400">{lead.note || 'AI Agent Captured.'}</p>
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <select
                      id={`lead-status-select-${lead.id}`}
                      value={lead.status}
                      onChange={(e) => {
                        const newStatus = e.target.value;
                        updateTenantFields({
                          leads: selectedTenant.leads.map(l => l.id === lead.id ? { ...l, status: newStatus as any } : l)
                        });
                        if (newStatus.toLowerCase() === nurtureTriggerStage.toLowerCase()) {
                          handleTriggerNurtureEmail(lead.name, lead.email, newStatus);
                        }
                      }}
                      className="appearance-none bg-[#0d121d] border border-white/10 hover:border-white/20 text-blue-400 text-[10px] font-mono font-bold uppercase rounded-full px-3.5 py-1.5 text-center cursor-pointer outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="New" className="bg-[#0d121d]">NEW</option>
                      <option value="Interested" className="bg-[#0d121d]">INTERESTED</option>
                      <option value="Qualified" className="bg-[#0d121d]">QUALIFIED</option>
                      <option value="Contacted" className="bg-[#0d121d]">CONTACTED</option>
                    </select>
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => {
                        updateTenantFields({
                          leads: selectedTenant.leads.filter(l => l.id !== lead.id)
                        });
                      }}
                      disabled={userRole === 'support'}
                      className={`p-2 rounded-lg transition-colors ${
                        userRole === 'support'
                          ? 'text-slate-500 opacity-50 cursor-not-allowed'
                          : 'hover:bg-red-500/10 text-red-400 cursor-pointer'
                      }`}
                      title={userRole === 'support' ? "Restricted to Admin role" : "Remove Lead"}
                      id={`delete-lead-btn-${lead.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 1. Google Sheets Lead Sync Outcomes alert banner */}
      {sheetsExportUrl && (
        <div className="p-4 rounded-xl border border-indigo-500/40 bg-indigo-500/10 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative overflow-hidden transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-white text-xs font-bold font-sans">Google Sheets Synchronor Completed!</h4>
              <p className="text-[10.5px] text-slate-400 font-mono mt-0.5">
                Active lead records synced onto your connected Google account Drive.
              </p>
            </div>
          </div>
          <a
            href={sheetsExportUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-[11px] font-bold rounded-lg transition-all shadow-md shrink-0 w-fit cursor-pointer"
          >
            <span>Open Spreadsheet ↗</span>
          </a>
        </div>
      )}

      {sheetsExportError && (
        <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/5 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0" />
          <div>
            <h4 className="text-white text-xs font-bold font-sans">Spreadsheet Sync Blocked</h4>
            <p className="text-[10.5px] text-rose-300 font-mono mt-0.5">
              {sheetsExportError}
            </p>
          </div>
        </div>
      )}

      {/* 2. Automated Leads Nurturer Workflows Config Panel */}
      <div className="bg-[#080b12] border border-white/5 p-6 rounded-2xl space-y-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/5 pb-4">
          <div>
            <h3 className="text-sm font-semibold text-teal-400 uppercase tracking-wider font-mono flex items-center gap-2">
              <Mail className="h-4 w-4 animate-pulse" />
              <span>🔄 Automated Follow-up Trigger Workflows</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Configure instant micro-targeted emails dispatched autonomously via connected Gmail tokens whenever a customer's status transitions in the CRM list.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setNurtureTriggerActive(!nurtureTriggerActive)}
            className={`px-3.5 py-1.5 text-[10px] font-bold font-mono rounded-lg border transition-all cursor-pointer ${
              nurtureTriggerActive
                ? 'bg-teal-500/10 hover:bg-teal-500/15 border-teal-500 text-teal-300'
                : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-400'
            }`}
          >
            {nurtureTriggerActive ? '● WORKFLOW ACTIVE' : '○ WORKFLOW PAUSED'}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Workflow Form */}
          <div className="lg:col-span-7 space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="font-mono text-slate-400 block font-semibold">Active Trigger Stage Event:</label>
                <select
                  value={nurtureTriggerStage}
                  onChange={(e) => setNurtureTriggerStage(e.target.value)}
                  className="w-full bg-[#0d121d] text-slate-200 border border-white/5 rounded-xl px-3 py-2.5 font-mono text-xs focus:border-teal-500/40 outline-none"
                >
                  <option value="New">When Stage becomes NEW</option>
                  <option value="Interested">When Stage becomes INTERESTED</option>
                  <option value="Qualified">When Stage becomes QUALIFIED</option>
                  <option value="Contacted">When Stage becomes CONTACTED</option>
                </select>
                <span className="text-[10px] text-slate-500 font-sans block">Email fires when this specific CRM status is set manually.</span>
              </div>

              <div className="space-y-1.5">
                <label className="font-mono text-slate-400 block font-semibold">Associated Workspace Sender:</label>
                <div className="w-full bg-[#0d121d] border border-white/5 rounded-xl px-3 py-2.5 font-mono text-slate-400 block select-none">
                  {user ? `📧 ${user.email} (Gmail API)` : '⚠️ Locked (Standard SMTP Sandbox)'}
                </div>
                <span className="text-[10px] text-slate-500 block">Dispatched on behalf of your connected administrator profile.</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-mono text-slate-400 block font-semibold">Auto-Drafted Message Subject:</label>
              <input
                type="text"
                value={nurtureSubjectTemplate}
                onChange={(e) => setNurtureSubjectTemplate(e.target.value)}
                placeholder="Subject line with dynamic tokens"
                className="w-full bg-[#0d121d] text-slate-100 px-3.5 py-2.5 rounded-xl border border-white/5 focus:border-teal-500/45 focus:ring-1 focus:ring-teal-500/30 outline-none font-mono"
              />
              <span className="text-[10px] text-slate-500 block">
                Support tokens: <code className="text-teal-400 font-mono font-bold">{'{customer_name}'}</code>, <code className="text-teal-400 font-mono font-bold">{'{tenant_name}'}</code>
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="font-mono text-slate-400 block font-semibold">Auto-Drafted Body Text (Plain / Markdown):</label>
              <textarea
                rows={4}
                value={nurtureBodyTemplate}
                onChange={(e) => setNurtureBodyTemplate(e.target.value)}
                className="w-full bg-[#0d121d] text-slate-100 p-3.5 rounded-xl border border-white/5 focus:border-teal-500/45 focus:ring-1 focus:ring-teal-500/30 outline-none font-mono text-[11px] leading-relaxed"
              />
              <span className="text-[10px] text-slate-500 block">
                Use variables <code className="text-teal-400 font-mono font-bold">{'{customer_name}'}</code> (e.g. Marcus), <code className="text-teal-400 font-mono font-bold">{'{status}'}</code> (Qualified), or <code className="text-teal-400 font-mono font-bold">{'{tenant_name}'}</code> inside text.
              </span>
            </div>
          </div>

          {/* Live Activity Logs */}
          <div className="lg:col-span-5 space-y-2.5">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">
              Automation Live Trigger Logs
            </span>
            <div className="bg-[#090d16] border border-white/5 rounded-xl p-3.5 font-mono text-[10.5px] text-slate-300 space-y-2 max-h-[290px] overflow-y-auto">
              {nurtureLogs.map((log, idx) => (
                <div key={idx} className="border-b border-white/5 pb-1.5 last:border-b-0 last:pb-0 font-light leading-relaxed">
                  {log}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Developer Sandbox CRM Webhook Sync Outbox Panel */}
      <div className="bg-[#080b12] border border-white/5 p-6 rounded-2xl space-y-4 shadow-2xl relative overflow-hidden mt-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
        <div>
          <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-wider font-mono flex items-center gap-2">
            <Terminal className="h-4 w-4" />
            <span>⚡ Production Webhook Sync Sandbox</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Test and inspect real-time REST API notifications delivering captured customer objects to enterprise pipelines (HubSpot, Salesforce, Zapier webhooks).
          </p>
        </div>

        {selectedTenant.leads.length === 0 ? (
          <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl text-center text-xs text-slate-500 font-mono">
            No active opportunities found to sync. Visit the <button onClick={() => navigate(`/admin/${selectedTenant.id}/simulator`)} className="text-blue-400 hover:underline font-bold cursor-pointer">WhatsApp Simulator 📱</button> thread to harvest client data first!
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            <div className="lg:col-span-5 space-y-4">
              <div className="space-y-1.5 font-mono text-xs">
                <label htmlFor="webhook-lead-picker" className="font-bold text-slate-400 block">Select Target Contact to Sync:</label>
                <div className="flex gap-2">
                  <select
                    id="webhook-lead-picker"
                    value={activeLeadId}
                    onChange={(e) => {
                      updateTenantFields({
                        webhookLeadId: e.target.value,
                        webhookStatus: 'idle',
                        webhookLogs: []
                      } as any);
                    }}
                    className="flex-1 bg-[#0d121d] border border-white/10 hover:border-white/20 text-slate-100 px-3.5 py-2.5 rounded-xl outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer font-mono"
                  >
                    {selectedTenant.leads.map(l => (
                      <option key={l.id} value={l.id} className="bg-[#0d121d]">
                        {l.name} ({l.status.toUpperCase()})
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => activeLead && handleTriggerWebhookDispatch(activeLead)}
                    disabled={!activeLead || webhookStatus === 'sending'}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-505 text-white font-bold text-xs rounded-xl md:inline-flex items-center gap-1.5 transition-all cursor-pointer select-none"
                  >
                    {webhookStatus === 'sending' ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Dispatching...</span>
                      </>
                    ) : (
                      <>
                        <ArrowRight className="h-3.5 w-3.5" />
                        <span>Push Out</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Render Active JSON Construct View */}
              {mockPayload && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase font-mono block">📦 REST POST payload representation:</span>
                  <pre className="p-3.5 bg-[#030509] text-[10px] text-emerald-400 border border-white/5 rounded-xl font-mono overflow-x-auto select-all h-60 scrollbar-thin">
                    {JSON.stringify(mockPayload, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Webhook Sandbox Outbox Terminal Stream Output logs */}
            <div className="lg:col-span-7 flex flex-col justify-between p-4 bg-[#030509] border border-white/5 rounded-2xl font-mono text-[11px] leading-relaxed relative min-h-[300px]">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                    <span className="text-[10px] font-bold uppercase text-slate-405 tracking-wider">Gateway Debug Output Logger</span>
                  </div>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                    webhookStatus === 'sending' 
                      ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' 
                      : webhookStatus === 'success' 
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                        : 'bg-slate-800 border-white/5 text-slate-500'
                  }`}>
                    STATUS: {webhookStatus.toUpperCase()}
                  </span>
                </div>

                <div className="space-y-1.5 max-h-56 overflow-y-auto scrollbar-thin text-slate-400">
                  {webhookLogs.length === 0 ? (
                    <p className="text-slate-600 italic select-none">No active webhooks dispatched. Use the trigger above to fire mock CRM requests.</p>
                  ) : (
                    webhookLogs.map((log, idx) => {
                      const isGreen = log.includes('✅') || log.includes('🎉') || log.includes('Response Received') || log.includes('successfully');
                      const isBlue = log.includes('📤') || log.includes('📡');
                      return (
                        <p key={idx} className={isGreen ? 'text-emerald-400' : isBlue ? 'text-indigo-400' : 'text-slate-300'}>
                          {log}
                        </p>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="border-t border-white/5 pt-2 mt-4 text-[9px] text-slate-550 flex justify-between select-none">
                <span>API Version: V4.0 (Dev Preview)</span>
                <span>Secure Channel SSL Match: Active</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
