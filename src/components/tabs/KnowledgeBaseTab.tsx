import React from 'react';
import { useSaaS } from '../../context/SaaSContext';
import { useLanguage } from '../../LanguageContext';
import {
  Database,
  Plus,
  Sparkles,
  FileText,
  Upload,
  Link,
  Globe,
  Terminal,
  Loader2,
  Check,
  Trash2,
} from 'lucide-react';

export const KnowledgeBaseTab: React.FC = () => {
  const { t } = useLanguage();
  const {
    selectedTenant,
    setTenants,
    updateTenantFields,
    userRole,
    showAddKb,
    setShowAddKb,
    kbTitleInput,
    setKbTitleInput,
    kbContentInput,
    setKbContentInput,
    kbTypeInput,
    setKbTypeInput,
    kbFileMeta,
    setKbFileMeta,
    kbUrlInput,
    setKbUrlInput,
    kbCrawlSource,
    setKbCrawlSource,
    kbCrawlDepth,
    setKbCrawlDepth,
    kbCrawlPages,
    setKbCrawlPages,
    kbCrawlStatus,
    kbCrawlProgress,
    kbCrawlLogs,
    isProcessingKb,
    kbProcessingStep,
    dragActive,
    handleDrag,
    handleDrop,
    handleManualFileSelect,
    handleSimulateUrlFetch,
    handleStartSimulatedCrawl,
    handleAddKbItem,
  } = useSaaS();

  if (!selectedTenant) return null;

  // Instantly loads a canned sandbox document into the KB form — these are
  // demo/test content only, not real uploads, so they skip the extraction API.
  const loadSandboxDoc = (
    fileName: string,
    fileSize: string,
    content: string,
    titleName: string
  ) => {
    setKbFileMeta({ name: fileName, size: fileSize, type: 'text/plain' });
    setKbTitleInput(titleName);
    setKbContentInput(content);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-display font-medium tracking-tight text-white flex items-center gap-2">
            <Database className="h-5 w-5 text-blue-500" />
            <span>{t('knowledge_base')}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">{t('knowledgeBaseSub')}</p>
        </div>
        <button
          onClick={() => {
            setShowAddKb(!showAddKb);
            setKbTypeInput('file');
            setKbTitleInput('');
            setKbContentInput('');
            setKbUrlInput('');
            setKbFileMeta(null);
          }}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl cursor-pointer transition-colors shadow-[0_0_12px_rgba(37,99,235,0.4)] shrink-0"
          id="add-kb-btn"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Connect New Knowledge Source</span>
        </button>
      </div>

      {/* Create Custom FAQ / doc / file / URL crawler Inline Form modal */}
      {showAddKb && (
        <div className="p-6 border border-white/10 bg-[#080b12] rounded-3xl space-y-6 shadow-2xl relative overflow-hidden text-slate-300">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>

          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-400" />
              <span>Source Type Configuration</span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Choose a source method below. The system parses it into clean structured markdown
              before importing.
            </p>
          </div>

          {/* Format selector sub tabs */}
          <div className="flex border-b border-white/5 pb-1 justify-start gap-1 overflow-x-auto scrollbar-none font-mono">
            {[
              { key: 'file', label: '📄 Upload Doc / PDF' },
              { key: 'url', label: '🔗 Web Scraper Link' },
              { key: 'crawl', label: '🕸️ Web & Social Crawler' },
              { key: 'faq', label: '✍️ Manual Q&A FAQ' },
            ].map(tab => (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setKbTypeInput(tab.key as any);
                  setKbTitleInput('');
                  setKbContentInput('');
                  setKbUrlInput('');
                  setKbFileMeta(null);
                }}
                className={`px-3.5 py-2 text-xs font-semibold rounded-t-xl transition-all cursor-pointer border-t border-x shrink-0 ${
                  kbTypeInput === tab.key
                    ? 'bg-[#0d121d] border-white/10 text-white text-blue-400 font-bold'
                    : 'bg-transparent border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Container Options */}
          <div>
            {/* Sub-Tab 1: File Upload */}
            {kbTypeInput === 'file' && (
              <div className="space-y-4">
                {/* Drag & drop area */}
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`p-6 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center transition-all relative ${
                    dragActive
                      ? 'border-blue-500 bg-blue-500/5'
                      : kbFileMeta
                        ? 'border-emerald-500/40 bg-emerald-500/5'
                        : 'border-white/10 hover:border-white/20 bg-white/[0.01]'
                  }`}
                >
                  {kbFileMeta ? (
                    <div className="space-y-2 py-2">
                      <div className="p-2.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl inline-block shadow-[0_0_15px_rgba(16,185,129,0.15)] animate-bounce">
                        <FileText className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold font-mono text-white select-all">
                          {kbFileMeta.name}
                        </h4>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {kbFileMeta.size} • Loaded and Scanned
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 py-4 w-full">
                      <div className="p-2.5 bg-white/5 text-slate-400 border border-white/5 rounded-xl inline-block">
                        <Upload className="h-6 w-6 text-blue-400" />
                      </div>
                      <div className="text-slate-300 text-xs">
                        <label
                          htmlFor="file-kb-upload"
                          className="font-bold text-blue-400 hover:underline cursor-pointer"
                        >
                          Click here to browse
                        </label>{' '}
                        or drag and drop your file in this container
                        <span className="block text-[10px] text-slate-500 font-mono mt-1.5">
                          Supports PDF, MD, Word (DOCX), TXT, or CSV (Max 15MB)
                        </span>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        id="file-kb-upload"
                        accept=".pdf,.md,.docx,.txt,.csv"
                        onChange={handleManualFileSelect}
                      />
                    </div>
                  )}
                </div>

                {/* Interactive click quick testing triggers */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold font-mono uppercase text-slate-450 block select-none">
                    Quick Test Sandbox Files (Click to simulate instant upload):
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        loadSandboxDoc(
                          'Refund_Guarantee_Terms.pdf',
                          '342 KB',
                          `[OFFICIAL PDF DOCUMENT: Refund & Guarantee Terms]\nPublished: May 2026\n\n- Satisfied coverage extends 14 days from initial registration fee.\n- Subscription cancellations need 30 days email statement sent to billing@${selectedTenant.name.toLowerCase().replace(/\s+/g, '')}.com.\n- Credit cards are auto-invoiced on the recurring calendar schedule.\n- Personal trainer sessions must confirm cancellation 24 hours prior or are billed full charge.`,
                          'Refund & Cancellation Policy - PDF'
                        )
                      }
                      className="px-3 py-2 bg-[#0d121d] hover:bg-white/5 text-slate-300 hover:text-white border border-white/5 rounded-xl text-[11px] font-semibold text-left font-mono transition-colors flex items-center justify-between cursor-pointer"
                    >
                      <span className="truncate">📋 refund_policy.pdf</span>
                      <span className="text-[8px] bg-red-500/10 text-red-400 border border-red-500/25 px-1 py-0.5 rounded font-bold font-mono">
                        PDF
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        loadSandboxDoc(
                          'Developer_Readme_Onboarding.md',
                          '14 KB',
                          `### Team Onboarding FAQ & Manual (${selectedTenant.name})\n\nWelcome back team!\n\n#### Q: What program tiers do we deploy?\nClients can request standard onboarding packages starting at $99 per term. The pro and corporate clusters reside at $249 and custom quote rates.\n\n#### Q: How is user check-in dispatched?\nWhatsApp automation routes user reservations directly to the assigned Google Workspace agenda logs.`,
                          'Company Onboarding Rules - Markdown'
                        )
                      }
                      className="px-3 py-2 bg-[#0d121d] hover:bg-white/5 text-slate-300 hover:text-white border border-white/5 rounded-xl text-[11px] font-semibold text-left font-mono transition-colors flex items-center justify-between cursor-pointer"
                    >
                      <span className="truncate">📝 onboarding_faq.md</span>
                      <span className="text-[8px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-1 py-0.5 rounded font-bold font-mono">
                        MD
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        loadSandboxDoc(
                          'Hourly_Pricing_Rates.docx',
                          '1.1 MB',
                          `[OFFICIAL COMPANY CONTRACT: HOURLY ASSIGNMENT PRICING]\n\nCorporate details for entity ${selectedTenant.name}:\n\n1. TIMELINE OF TASKS:\nAll scheduled support sessions are billed in blocks of 2 hours minimum. Emergency dispatch outside of regular working hours (9 AM - 6 PM) entails flat fee of $160.\n\n2. CANCELLATION CHARGERS:\nServices cancelled without prior notifications at least 15 days in advance incur 10% contract termination fee. Standard help lines can resolve queries.`,
                          'Hourly Pricing Rates - Word DOCX'
                        )
                      }
                      className="px-3 py-2 bg-[#0d121d] hover:bg-white/5 text-slate-300 hover:text-white border border-white/5 rounded-xl text-[11px] font-semibold text-left font-mono transition-colors flex items-center justify-between cursor-pointer"
                    >
                      <span className="truncate">💼 rates_pricing.docx</span>
                      <span className="text-[8px] bg-blue-500/10 text-blue-400 border border-blue-500/25 px-1 py-0.5 rounded font-bold font-mono">
                        Word
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Sub-Tab 2: Webpage Scraper */}
            {kbTypeInput === 'url' && (
              <div className="space-y-4 animate-fade-in">
                <div className="space-y-1.5">
                  <label
                    htmlFor="url-scraper-link"
                    className="text-xs font-semibold text-slate-400 font-mono"
                  >
                    Input Single Page Website URL to Scrape:
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="url-scraper-link"
                      type="url"
                      value={kbUrlInput}
                      onChange={e => setKbUrlInput(e.target.value)}
                      placeholder="E.g., https://www.mybusiness.com/refund-guidelines"
                      className="flex-1 bg-[#0d121d] text-slate-100 text-xs px-3 py-2.5 border border-white/5 rounded-xl outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleSimulateUrlFetch}
                      disabled={!kbUrlInput.includes('.') || isProcessingKb}
                      className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shrink-0 transition-colors shadow-lg cursor-pointer font-mono"
                    >
                      <Link className="h-3.5 w-3.5" />
                      <span>Fetch Page</span>
                    </button>
                  </div>
                  <span className="text-[10px] text-slate-550 block select-none">
                    Web scraper executes cloud rendering on the page, stripping headers/banners, and
                    packing raw text into markdown.
                  </span>
                </div>
              </div>
            )}

            {/* Sub-Tab 3: Spiders Crawler */}
            {kbTypeInput === 'crawl' && (
              <div className="space-y-4 animate-fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                  {/* Target crawler platform */}
                  <div className="sm:col-span-4 space-y-1.5">
                    <label
                      htmlFor="crawler-target-select"
                      className="text-xs font-semibold text-slate-400 font-mono"
                    >
                      Target Channel Type:
                    </label>
                    <select
                      id="crawler-target-select"
                      value={kbCrawlSource}
                      onChange={e => setKbCrawlSource(e.target.value as any)}
                      className="w-full bg-[#0d121d] text-slate-100 text-xs px-3 py-2.5 border border-white/5 rounded-xl outline-none focus:ring-1 focus:ring-blue-500 font-mono cursor-pointer"
                    >
                      <option value="web" className="bg-[#0b0e14]">
                        🌐 Website Spider Portal
                      </option>
                      <option value="instagram" className="bg-[#0b0e14]">
                        📸 Instagram Account Feed
                      </option>
                      <option value="facebook" className="bg-[#0b0e14]">
                        👥 Facebook Fanpage Timeline
                      </option>
                      <option value="linkedin" className="bg-[#0b0e14]">
                        👔 LinkedIn Company Page
                      </option>
                      <option value="twitter" className="bg-[#0b0e14]">
                        🐦 Twitter/X Feed timeline
                      </option>
                    </select>
                  </div>

                  {/* Max crawl depth */}
                  <div className="sm:col-span-4 space-y-1.5">
                    <label
                      htmlFor="crawler-depth-select"
                      className="text-xs font-semibold text-slate-400 font-mono"
                    >
                      Crawl Limit Depth:
                    </label>
                    <select
                      id="crawler-depth-select"
                      value={kbCrawlDepth}
                      onChange={e => setKbCrawlDepth(parseInt(e.target.value))}
                      className="w-full bg-[#0d121d] text-slate-100 text-xs px-3 py-2.5 border border-white/5 rounded-xl outline-none focus:ring-1 focus:ring-blue-500 font-mono cursor-pointer"
                    >
                      <option value="1" className="bg-[#0b0e14]">
                        1 link boundary (Home only)
                      </option>
                      <option value="2" className="bg-[#0b0e14]">
                        2 links boundary (Standard)
                      </option>
                      <option value="3" className="bg-[#0b0e14]">
                        3 links boundary (Comprehensive)
                      </option>
                    </select>
                  </div>

                  {/* Page budget count */}
                  <div className="sm:col-span-4 space-y-1.5">
                    <label
                      htmlFor="crawler-pages-input"
                      className="text-xs font-semibold text-slate-400 font-mono"
                    >
                      Max Page Scraping Budget:
                    </label>
                    <input
                      id="crawler-pages-input"
                      type="number"
                      min={5}
                      max={100}
                      value={kbCrawlPages}
                      onChange={e => setKbCrawlPages(parseInt(e.target.value) || 15)}
                      className="w-full bg-[#0d121d] text-slate-100 text-xs px-3 py-2.5 border border-white/5 rounded-xl outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                    />
                  </div>
                </div>

                {/* Crawl Sync Scheduler UI */}
                <div className="p-4 bg-slate-900/40 border border-white/5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 font-mono">
                  <div className="space-y-1 text-left">
                    <label
                      htmlFor="crawler-schedule-select"
                      className="text-xs font-bold text-slate-300"
                    >
                      Crawl Auto-Sync Schedule:
                    </label>
                    <p className="text-[10px] text-slate-500">
                      Automatically re-scrape targets periodically to maintain RAG vector database
                      alignment.
                    </p>
                  </div>
                  <select
                    id="crawler-schedule-select"
                    value={selectedTenant.crawlSchedule || 'none'}
                    onChange={async e => {
                      const sched = e.target.value;
                      try {
                        const res = await fetch(`/api/tenant/${selectedTenant.id}/schedule`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ crawlSchedule: sched }),
                        });
                        if (res.ok) {
                          setTenants((prev: any[]) =>
                            prev.map(t => {
                              if (t.id === selectedTenant.id) {
                                return { ...t, crawlSchedule: sched };
                              }
                              return t;
                            })
                          );
                        }
                      } catch (err) {}
                    }}
                    className="bg-[#0d121d] text-slate-100 text-xs px-3 py-2 border border-white/5 rounded-xl outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer w-full sm:w-auto shrink-0 font-mono"
                  >
                    <option value="none" className="bg-[#0b0e14]">
                      ❌ Manual Refresh Only
                    </option>
                    <option value="daily" className="bg-[#0b0e14]">
                      📆 Daily Crawler Sync
                    </option>
                    <option value="weekly" className="bg-[#0b0e14]">
                      🔁 Weekly Crawler Sync
                    </option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="crawler-address-input"
                    className="text-xs font-semibold text-slate-400 font-mono"
                  >
                    {kbCrawlSource === 'web'
                      ? 'Target website URL (Homepage):'
                      : `${kbCrawlSource.charAt(0).toUpperCase() + kbCrawlSource.slice(1)} handle profile link:`}
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="crawler-address-input"
                      type="text"
                      value={kbUrlInput}
                      onChange={e => setKbUrlInput(e.target.value)}
                      placeholder={
                        kbCrawlSource === 'web'
                          ? 'E.g., https://www.mycompany.com'
                          : kbCrawlSource === 'instagram'
                            ? 'https://instagram.com/my_business'
                            : kbCrawlSource === 'linkedin'
                              ? 'https://linkedin.com/company/my_organization'
                              : 'https://twitter.com/my_business_handle'
                      }
                      className="flex-1 bg-[#0d121d] text-slate-100 text-xs px-3 py-2.5 border border-white/5 rounded-xl outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleStartSimulatedCrawl}
                      disabled={!kbUrlInput.includes('.') || kbCrawlStatus === 'running'}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shrink-0 transition-all shadow-lg cursor-pointer font-mono"
                    >
                      <Globe
                        className={`h-3.5 w-3.5 ${kbCrawlStatus === 'running' ? 'animate-spin' : ''}`}
                      />
                      <span>{kbCrawlStatus === 'running' ? 'Spider Active' : 'Start Crawler'}</span>
                    </button>
                  </div>
                </div>

                {/* Crawler Terminal Window */}
                {kbCrawlLogs.length > 0 && (
                  <div className="bg-[#030508] border border-white/5 p-4 rounded-2xl space-y-3.5 shadow-inner leading-normal">
                    <div className="flex items-center justify-between font-mono text-[10.5px]">
                      <span className="text-slate-400 uppercase font-bold flex items-center gap-1.5">
                        <Terminal className="h-3.5 w-3.5 text-blue-500 animate-pulse" />
                        Spider Engine Terminal logs:
                      </span>
                      <span
                        className={
                          kbCrawlStatus === 'completed'
                            ? 'text-emerald-400 font-bold'
                            : 'text-blue-400 font-bold animate-pulse'
                        }
                      >
                        STATUS: {kbCrawlStatus.toUpperCase()} ({kbCrawlProgress}%)
                      </span>
                    </div>

                    <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden relative">
                      <div
                        className="bg-blue-500 h-full transition-all duration-300 shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                        style={{ width: `${kbCrawlProgress}%` }}
                      ></div>
                    </div>

                    <div className="max-h-40 overflow-y-auto font-mono text-[10px] text-slate-450 space-y-1.5 bg-[#010204] p-3 border border-white/5 rounded-xl max-w-full">
                      {kbCrawlLogs.map((logStr, index) => (
                        <div
                          key={index}
                          className={
                            logStr.includes('Successfully') || logStr.includes('🎉')
                              ? 'text-emerald-400 font-bold'
                              : 'text-slate-300'
                          }
                        >
                          {logStr}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Sub-Tab 4: Manual Q&A FAQ */}
            {kbTypeInput === 'faq' && (
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 animate-fade-in">
                <div className="sm:col-span-8 space-y-1.5">
                  <label
                    htmlFor="kb-title-manual"
                    className="text-xs font-semibold text-slate-400 font-mono"
                  >
                    Title Guide Key:
                  </label>
                  <input
                    id="kb-title-manual"
                    type="text"
                    value={kbTitleInput}
                    onChange={e => setKbTitleInput(e.target.value)}
                    placeholder="E.g., Pricing Packages FAQ or Refund Guidelines"
                    className="w-full bg-[#0d121d] text-slate-100 text-xs px-3 py-2.5 border border-white/5 rounded-xl outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                  />
                </div>

                <div className="sm:col-span-4 space-y-1.5">
                  <label
                    htmlFor="kb-type-manual"
                    className="text-xs font-semibold text-slate-400 font-mono"
                  >
                    Format Category:
                  </label>
                  <select
                    id="kb-type-manual"
                    value={kbTypeInput}
                    className="w-full bg-[#0d121d] text-slate-100 text-xs px-3 py-2.5 border border-white/5 rounded-xl outline-none focus:ring-1 focus:ring-blue-500 font-mono cursor-pointer"
                    onChange={e => setKbTypeInput(e.target.value as any)}
                  >
                    <option value="faq" className="bg-[#0b0e14]">
                      FAQ Q&A Pairing
                    </option>
                    <option value="document" className="bg-[#0b0e14]">
                      Document Manual
                    </option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Scanning / processing loader */}
          {isProcessingKb && (
            <div className="p-6 border border-white/5 bg-[#0d121d] rounded-2xl flex flex-col items-center justify-center text-center space-y-3.5 shadow-xl animate-pulse">
              <Loader2 className="h-7 w-7 text-blue-500 animate-spin" />
              <div>
                <h4 className="text-xs font-bold text-white font-mono uppercase tracking-widest">
                  {kbProcessingStep}
                </h4>
                <p className="text-[10px] text-slate-500 font-mono mt-1 select-none">
                  Standby as our OCR scraper compiles text layout guidelines into Machine readable
                  indexes...
                </p>
              </div>
            </div>
          )}

          {/* Pre-fill Review Text Area Content */}
          {kbTitleInput && kbContentInput && !isProcessingKb && (
            <div className="p-4 border border-blue-500/10 bg-[#0d121d]/50 rounded-2xl space-y-3.5 shadow-inner">
              <div className="flex items-center justify-between text-xs">
                <h4 className="font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-blue-400 animate-pulse" />
                  <span>Parsed Content Preview (Fully Editable before Commit)</span>
                </h4>
                <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono px-2 py-0.5 rounded-full font-bold">
                  Derived words: {kbContentInput.split(/\s+/).length}
                </span>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label
                    htmlFor="preview-kb-headline"
                    className="text-[10px] font-bold font-mono text-slate-500 uppercase"
                  >
                    Interactive Document Title Key:
                  </label>
                  <input
                    id="preview-kb-headline"
                    type="text"
                    required
                    value={kbTitleInput}
                    onChange={e => setKbTitleInput(e.target.value)}
                    className="w-full bg-[#080b12] text-slate-200 text-xs px-3 py-2 border border-white/5 rounded-lg outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="preview-kb-textarea"
                    className="text-[10px] font-bold font-mono text-slate-500 uppercase"
                  >
                    Parsed Plaintext Context Chunk (Analyzable by AI):
                  </label>
                  {kbTypeInput === 'crawl' ? (
                    <textarea
                      id="preview-kb-textarea"
                      required
                      value={kbContentInput}
                      onChange={e => setKbContentInput(e.target.value)}
                      rows={6}
                      className="w-full bg-[#080b12] text-slate-300 text-xs p-3 border border-white/5 rounded-lg outline-none font-mono focus:ring-1 focus:ring-blue-500 leading-relaxed max-w-full"
                    />
                  ) : (
                    <textarea
                      id="preview-kb-textarea"
                      required
                      value={kbContentInput}
                      onChange={e => setKbContentInput(e.target.value)}
                      rows={4}
                      className="w-full bg-[#080b12] text-slate-300 text-xs p-3 border border-white/5 rounded-lg outline-none font-mono focus:ring-1 focus:ring-blue-500 leading-relaxed max-w-full"
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-white/5 flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => {
                setShowAddKb(false);
                setKbFileMeta(null);
                setKbUrlInput('');
              }}
              className="px-4 py-2 hover:bg-white/5 border border-white/5 text-slate-400 hover:text-slate-200 text-xs font-semibold rounded-xl cursor-pointer font-mono transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAddKbItem}
              disabled={!kbTitleInput.trim() || !kbContentInput.trim()}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-all shadow-[0_0_12px_rgba(37,99,235,0.4)]"
              id="submit-kb-btn"
            >
              <Check className="h-4 w-4" />
              <span>Publish to Bot Knowledge</span>
            </button>
          </div>
        </div>
      )}

      {/* Display KB Grid card list */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {selectedTenant.knowledgeBase.map(item => {
          const isFile = item.type === 'file';
          const isUrl = item.type === 'url';
          const isCrawl = item.type === 'crawl';
          const isFaq = item.type === 'faq';

          return (
            <div
              key={item.id}
              className="p-4 bg-[#080b12] rounded-2xl border border-white/5 relative group shadow-lg flex flex-col justify-between hover:border-white/10 transition-all text-slate-300"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[9px] font-bold uppercase font-mono px-2 py-0.5 rounded-full border ${
                        isFaq
                          ? 'bg-purple-500/10 border-purple-500/20 text-purple-400'
                          : isFile
                            ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                            : isUrl
                              ? 'bg-teal-500/10 border-teal-500/20 text-teal-400'
                              : isCrawl
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                : 'bg-orange-500/10 border-orange-500/20 text-orange-400'
                      }`}
                    >
                      {isFile
                        ? '📄 PDF/File'
                        : isUrl
                          ? '🔗 URL Scrape'
                          : isCrawl
                            ? `🕸️ Crawl (${item.socialNetwork || 'Web'})`
                            : item.type}
                    </span>

                    {item.fileSize && (
                      <span className="text-[9.5px] font-mono text-slate-500 font-medium">
                        ({item.fileSize})
                      </span>
                    )}

                    {item.crawlPagesCount && (
                      <span className="text-[9.5px] font-mono text-emerald-500 font-medium">
                        ({item.crawlPagesCount} pages)
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">{item.dateAdded}</span>
                </div>

                <h4 className="font-display font-bold text-white text-sm mb-1.5 flex items-center gap-1.5">
                  {isFile ? (
                    <FileText className="h-4 w-4 text-blue-400 shrink-0" />
                  ) : isUrl ? (
                    <Link className="h-3.5 w-3.5 text-teal-400 shrink-0" />
                  ) : isCrawl ? (
                    <Globe className="h-3.5 w-3.5 text-emerald-400 shrink-0 animate-pulse" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                  )}
                  <span className="truncate">{item.title}</span>
                </h4>

                <p className="text-xs text-slate-400 font-mono whitespace-pre-line leading-relaxed line-clamp-4 select-all">
                  {item.content}
                </p>
              </div>

              <div className="flex items-center justify-between mt-4 pt-2 border-t border-white/5">
                <p className="text-[10px] font-mono text-slate-500 leading-normal select-none">
                  {isCrawl
                    ? 'Auto Crawled on schedule'
                    : isFile
                      ? 'Document indexed via OCR'
                      : 'Manual database node'}
                </p>

                <button
                  onClick={() => {
                    updateTenantFields({
                      knowledgeBase: selectedTenant.knowledgeBase.filter(kb => kb.id !== item.id),
                    });
                  }}
                  disabled={userRole === 'support'}
                  className={`text-xs p-1.5 rounded-lg flex items-center gap-1 font-mono transition-all shrink-0 ${
                    userRole === 'support'
                      ? 'text-slate-500 opacity-50 cursor-not-allowed'
                      : 'text-red-400 hover:bg-red-500/10 hover:text-red-300 cursor-pointer'
                  }`}
                  title={userRole === 'support' ? 'Restricted to Admin role' : 'Remove Source'}
                  id={`delete-kb-btn-${item.id}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Remove</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
