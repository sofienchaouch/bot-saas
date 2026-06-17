import React, { useState } from 'react';
import { 
  Bot, 
  Sparkles, 
  Calendar, 
  Mail, 
  FileSpreadsheet, 
  FileText, 
  ArrowRight, 
  Check, 
  Zap, 
  Shield, 
  MessageSquare, 
  MessageCircle,
  Users, 
  CheckCircle2, 
  PhoneCall,
  ChevronRight,
  TrendingUp,
  Inbox,
  Clock,
  Briefcase,
  Facebook
} from 'lucide-react';
import { motion } from 'motion/react';

interface SaaSLandingPageProps {
  onNavigateToAuth: (mode: 'signin' | 'signup') => void;
  onQuickDemo: (tenantId: string) => void;
}

export const SaaSLandingPage: React.FC<SaaSLandingPageProps> = ({ 
  onNavigateToAuth, 
  onQuickDemo 
}) => {
  // Demo interactive bot preview
  const [selectedDemoIndustry, setSelectedDemoIndustry] = useState<'fitness' | 'legal' | 'auto'>('fitness');
  const [demoChat, setDemoChat] = useState<Array<{ sender: 'user' | 'bot', text: string }>>([
    { sender: 'user', text: "Hi, I'd like to book an appointment for tomorrow afternoon." },
    { sender: 'bot', text: "Hello! I would be delighted to help you schedule that booking. Which of our locations or coaches are you looking to book tomorrow?" }
  ]);
  const [userInput, setUserInput] = useState('');
  const [isBotTyping, setIsBotTyping] = useState(false);

  const getIndustryPrompts = () => {
    switch (selectedDemoIndustry) {
      case 'legal':
        return [
          "Do you have legal advice slots?",
          "How much does a consultation cost?",
          "Book a contract review session for Friday"
        ];
      case 'auto':
        return [
          "Need oil change booking",
          "What appointments are open today?",
          "Do you do wheel alignments?"
        ];
      default:
        return [
          "I want to book an introductory gym slot",
          "Is coach Sarah free at 2 PM?",
          "What is the cost of a personal trainer trial?"
        ];
    }
  };

  const handleDemoSendMessage = (msgText: string) => {
    if (!msgText.trim() || isBotTyping) return;
    
    const nextChat = [...demoChat, { sender: 'user' as const, text: msgText }];
    setDemoChat(nextChat);
    setUserInput('');
    setIsBotTyping(true);

    // Simulate smart agent response
    setTimeout(() => {
      let reply = '';
      if (selectedDemoIndustry === 'fitness') {
        if (msgText.toLowerCase().includes('book') || msgText.toLowerCase().includes('introductory') || msgText.toLowerCase().includes('slot')) {
          reply = "Perfect! I've checked Zenith Fitness coach availability for tomorrow afternoon: we have slots at 2:00 PM and 3:30 PM. Shall I book the 2:00 PM introductory trial slot for you and add it to your calendar?";
        } else if (msgText.toLowerCase().includes('sarah')) {
          reply = "Yes, Coach Sarah is available tomorrow! She has an open slot at 3:30 PM for customized strength profiling. Would you like me to claim that slot is yours?";
        } else {
          reply = "Zenith Fitness offers 24/7 keyless entry, premium personal trainers, and state-of-the-art weights. Would you like to check our introductory booking dates?";
        }
      } else if (selectedDemoIndustry === 'legal') {
        if (msgText.toLowerCase().includes('book') || msgText.toLowerCase().includes('review') || msgText.toLowerCase().includes('friday')) {
          reply = "Understood. The Aurora Legal team has contract review sessions open on Friday at 10 AM or 1 PM. Let me know which suits you, and I will dispatch an confirmation note to your email inbox.";
        } else {
          reply = "Aurora Legal Practice operates in Commercial Litigation, Family Law, and Property Contracts. Preliminary audits start at $250. Shall we put down an introductory callback task for tomorrow?";
        }
      } else {
        if (msgText.toLowerCase().includes('oil') || msgText.toLowerCase().includes('change') || msgText.toLowerCase().includes('booking')) {
          reply = "Apex Auto can handle that! We have a quick-lube oil change slot open tomorrow at 11 AM or 2 PM. Please let me know your vehicle's license plate number and model to register.";
        } else {
          reply = "Hi! Apex Auto Service handles premium brake diagnostics, wheel alignment, and engine checks. Type in what service you need and we will find an open calendar window.";
        }
      }

      setDemoChat(prev => [...prev, { sender: 'bot' as const, text: reply }]);
      setIsBotTyping(false);
    }, 1200);
  };

  const handleIndustrySwitch = (industry: 'fitness' | 'legal' | 'auto') => {
    setSelectedDemoIndustry(industry);
    let initialText = '';
    let initialReply = '';
    if (industry === 'fitness') {
      initialText = "Hi, I'd like to book an appointment for tomorrow afternoon.";
      initialReply = "Hello! I would be delighted to help you schedule that booking. Which of our locations or coaches are you looking to book tomorrow?";
    } else if (industry === 'legal') {
      initialText = "I need a legal counselor for a contract review.";
      initialReply = "Welcome to Aurora Legal Practice. We have certified corporate counselors ready. Would you like to schedule a 30-minute introductory dossier audit this week?";
    } else {
      initialText = "Need to book my luxury sedan for an engine assessment.";
      initialReply = "Hello, Apex Auto Service here! Our master technician has slots available on Wednesday morning. Shall we reserve that for you?";
    }
    setDemoChat([
      { sender: 'user', text: initialText },
      { sender: 'bot', text: initialReply }
    ]);
  };

  return (
    <div className="min-h-screen bg-[#020509] text-slate-100 font-sans selection:bg-blue-600/30 selection:text-white">
      {/* GLOWING BACKGROUND HIGHLIGHTS */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute top-[600px] right-1/4 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 left-1/3 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>

      {/* PUBLIC HEADER NAVIGATION */}
      <nav className="sticky top-0 z-50 w-full border-b border-white/5 bg-[#020509]/80 backdrop-blur-lg px-6 py-4 flex items-center justify-between" id="landing-navbar">
        <div className="flex items-center gap-3">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]">
            <Bot className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#020509] border-2 border-white/5 text-[6.5px] text-blue-400 font-bold">
              AI
            </span>
          </div>
          <div>
            <h1 className="font-display text-md font-bold tracking-tight text-white flex items-center gap-1.5 leading-none">
              <span>OmniBot SaaS</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400 font-mono font-semibold uppercase tracking-wider">v3.5</span>
            </h1>
            <p className="text-[9.5px] text-slate-400 font-mono tracking-wide mt-0.5">Autonomous Bookings & Workspace Flow</p>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="hidden md:flex items-center gap-6 font-mono text-[11px] text-slate-400">
          <a href="#features" className="hover:text-white transition-colors">⚡ FEATURES</a>
          <a href="#demo" className="hover:text-white transition-colors">📱 LIVE SIMULATOR</a>
          <a href="#workspace" className="hover:text-white transition-colors">🔄 GOOGLE SYNC</a>
          <a href="#pricing" className="hover:text-white transition-colors">💎 PRICING</a>
        </div>

        {/* CTAs */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => onNavigateToAuth('signin')}
            className="px-4 py-1.5 text-xs font-mono font-bold text-slate-300 hover:text-white hover:bg-white/5 rounded-lg border border-white/5 cursor-pointer transition-all"
            id="landing-signin-btn"
          >
            SIGN IN
          </button>
          
          <button 
            onClick={() => onNavigateToAuth('signup')}
            className="px-4 py-1.5 bg-blue-650 hover:bg-blue-600 text-white text-xs font-mono font-bold rounded-lg cursor-pointer transition-all active:scale-95 shadow-[0_0_20px_rgba(37,99,235,0.25)] flex items-center gap-1"
            id="landing-signup-btn"
          >
            <span>REGISTER FREE</span>
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="relative pt-16 pb-20 px-6 max-w-7xl mx-auto flex flex-col items-center text-center space-y-8">
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-[10.5px] font-mono text-blue-400 font-bold uppercase tracking-wider"
        >
          <Sparkles className="h-3.5 w-3.5 text-blue-400 animate-pulse" />
          <span>Real-time Google Workspace Synced SaaS</span>
        </motion.div>

        <motion.h2 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl sm:text-5xl lg:text-6xl font-display font-black text-white tracking-tight leading-[1.1] max-w-4xl"
        >
          Transform Your Customer Bookings With <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-emerald-400">Autonomous AI Agents</span>
        </motion.h2>

        <motion.p 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-slate-400 text-sm sm:text-base max-w-2xl leading-relaxed font-sans"
        >
          The first multi-tenant conversational SaaS that turns raw chat prospects into confirmed bookings, feeds synchronized leads to spreadsheets, issues tasks to-do, and schedules Google Calendars live.
        </motion.p>

        {/* Primary Call to Actions */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center gap-4 pt-4"
        >
          <button 
            onClick={() => onNavigateToAuth('signup')}
            className="w-full sm:w-auto px-8 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl cursor-pointer transition-all shadow-[0_0_25px_rgba(37,99,235,0.4)] hover:scale-[1.02] flex items-center justify-center gap-2"
          >
            <span>Launch Your Custom Bot Tenant</span>
            <ArrowRight className="h-4 w-4" />
          </button>
          
          <a
            href="#demo"
            className="w-full sm:w-auto px-8 py-3.5 bg-[#0e1320] hover:bg-slate-900 border border-white/5 text-slate-350 hover:text-white text-sm font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <span>Play interactive simulator</span>
          </a>
        </motion.div>

        {/* Mini quick-links for testing existing templates */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="pt-6 font-mono text-[11px] text-slate-500 flex flex-wrap justify-center gap-3 items-center"
        >
          <span>QUICK DEMO PREVIEWS:</span>
          <button onClick={() => onQuickDemo('zenith-fitness')} className="text-blue-400 hover:underline hover:text-blue-300 font-bold bg-slate-900/40 border border-white/5 px-2.5 py-1 rounded">💪 Zenith Fitness Studio</button>
          <button onClick={() => onQuickDemo('aurora-legal')} className="text-amber-400 hover:underline hover:text-amber-300 font-bold bg-slate-900/40 border border-white/5 px-2.5 py-1 rounded">⚖️ Aurora Legal Practice</button>
          <button onClick={() => onQuickDemo('apex-auto')} className="text-emerald-400 hover:underline hover:text-emerald-300 font-bold bg-slate-900/40 border border-white/5 px-2.5 py-1 rounded">🚗 Apex Auto Center</button>
        </motion.div>
      </section>

      {/* THE LIVE CONVERSATIONAL SIMULATOR */}
      <section className="bg-[#05080e] border-y border-white/5 py-20 px-6 scroll-mt-10" id="demo">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Simulation copy side */}
          <div className="lg:col-span-5 space-y-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-yellow-400/10 border border-yellow-400/20 rounded-full text-[10px] font-mono text-yellow-400 font-bold uppercase tracking-wider">
              <Zap className="h-3 w-3" />
              <span>Interactive Sandbox Playpen</span>
            </div>
            
            <h3 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">
              Test OmniBot’s AI Persona Responses Instantly
            </h3>
            
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed font-sans">
              Choose an industry below to toggle the AI bot's system instructions. See how it qualifies customer inquiries, schedules calendar intervals, and records vital lead profiles in real-time.
            </p>

            {/* Custom Industry Toggles */}
            <div className="grid grid-cols-3 gap-2 p-1 bg-[#0b0f19] border border-white/5 rounded-xl font-mono text-[10.5px]">
              <button
                onClick={() => handleIndustrySwitch('fitness')}
                className={`py-2 rounded-lg transition-all font-bold ${
                  selectedDemoIndustry === 'fitness' 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                💪 FITNESS
              </button>
              <button
                onClick={() => handleIndustrySwitch('legal')}
                className={`py-2 rounded-lg transition-all font-bold ${
                  selectedDemoIndustry === 'legal' 
                    ? 'bg-amber-600 text-white shadow-md' 
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                ⚖️ LEGAL
              </button>
              <button
                onClick={() => handleIndustrySwitch('auto')}
                className={`py-2 rounded-lg transition-all font-bold ${
                  selectedDemoIndustry === 'auto' 
                    ? 'bg-emerald-600 text-white shadow-md' 
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                🚗 AUTO CARE
              </button>
            </div>

            {/* Simulated Lead stats */}
            <div className="bg-slate-900/40 border border-white/5 rounded-xl p-4 space-y-3 font-mono text-xs">
              <div className="flex justify-between items-center text-[10.5px] border-b border-white/5 pb-2">
                <span className="text-slate-400 uppercase font-bold">Simulated Data Stream:</span>
                <span className="text-emerald-450 font-black animate-pulse flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                  RECEPTIVE
                </span>
              </div>
              <div className="space-y-1 text-slate-300 text-[11px]">
                <div className="flex justify-between">
                  <span>Lead Captured:</span>
                  <span className="text-white font-bold">John Doe</span>
                </div>
                <div className="flex justify-between">
                  <span>Assigned Action:</span>
                  <span className="text-blue-400 font-bold uppercase tracking-wider">Book Appointment</span>
                </div>
                <div className="flex justify-between">
                  <span>Google Synced Status:</span>
                  <span className="text-emerald-400">Successful 🟢</span>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Chat window side */}
          <div className="lg:col-span-7">
            <div className="bg-[#0b0f19] border border-white/10 rounded-2xl shadow-2xl flex flex-col h-[450px] overflow-hidden">
              
              {/* Header inside chat box */}
              <div className="p-4 bg-[#0e1423] border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8.5 w-8.5 rounded-lg bg-blue-550 flex items-center justify-center text-white text-base">
                    {selectedDemoIndustry === 'fitness' ? '💪' : selectedDemoIndustry === 'legal' ? '⚖️' : '🚗'}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                      {selectedDemoIndustry === 'fitness' ? 'Zenith Booking Bot' : selectedDemoIndustry === 'legal' ? 'Aurora Legal Agent' : 'Apex Service Assistant'}
                    </h4>
                    <p className="text-[10px] text-emerald-450 font-mono">● Active Conversational Pipeline Engine</p>
                  </div>
                </div>

                <div className="text-[10.5px] font-mono text-slate-500">
                  sandbox
                </div>
              </div>

              {/* Chat timeline feed bubble stream */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3.5 scrollbar-thin scrollbar-thumb-white/5">
                {demoChat.map((msg, i) => (
                  <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-3.5 rounded-xl text-xs leading-relaxed ${
                      msg.sender === 'user' 
                        ? 'bg-blue-600 text-white rounded-br-none shadow-md' 
                        : 'bg-[#151c2e] border border-white/5 text-slate-200 rounded-bl-none'
                    }`}>
                      <p>{msg.text}</p>
                    </div>
                  </div>
                ))}

                {isBotTyping && (
                  <div className="flex justify-start">
                    <div className="bg-[#151c2e] border border-white/5 p-3 rounded-xl rounded-bl-none flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                    </div>
                  </div>
                )}
              </div>

              {/* Suggested action tags */}
              <div className="px-4 py-2 bg-[#080d19] border-t border-white/5 flex gap-1.5 overflow-x-auto whitespace-nowrap scrollbar-none text-[10.5px] font-mono">
                {getIndustryPrompts().map((p, index) => (
                  <button 
                    key={index} 
                    onClick={() => handleDemoSendMessage(p)}
                    className="px-2.5 py-1 bg-[#12192b] hover:bg-indigo-600/30 text-indigo-300 hover:text-white border border-indigo-500/10 rounded-lg transition-colors shrink-0 cursor-pointer text-[10px]"
                  >
                    "{p}"
                  </button>
                ))}
              </div>

              {/* Text input area */}
              <div className="p-3.5 bg-[#0a0d18] border-t border-white/10 flex gap-2">
                <input
                  type="text"
                  value={userInput}
                  onChange={e => setUserInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleDemoSendMessage(userInput);
                  }}
                  placeholder="Type a message to simulate your customer..."
                  className="flex-1 bg-[#05070c] border border-white/10 rounded-xl px-4 text-xs font-sans text-white focus:outline-none focus:border-blue-500/55"
                />
                <button
                  onClick={() => handleDemoSendMessage(userInput)}
                  disabled={!userInput.trim() || isBotTyping}
                  className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-650 px-4 py-2.5 rounded-xl text-white font-mono font-bold text-xs cursor-pointer transition-all active:scale-95 shrink-0"
                >
                  SEND
                </button>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* CORE CAPABILITIES MODULES */}
      <section className="py-20 px-6 max-w-7xl mx-auto scroll-mt-10" id="features">
        <div className="text-center space-y-3 mb-16">
          <span className="font-mono text-xs text-blue-400 font-bold tracking-wider uppercase">Unmatched Feature Set</span>
          <h3 className="text-3xl font-display font-black text-white">Full-Stack Real Integrations</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          <div className="p-6 bg-[#080b12] border border-white/5 rounded-2xl space-y-4 hover:border-blue-500/20 transition-all group">
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400 w-fit group-hover:bg-blue-600 group-hover:text-white transition-all">
              <Calendar className="h-5 w-5" />
            </div>
            <h4 className="font-bold text-base text-white">Google Calendar Sync</h4>
            <p className="text-slate-400 text-xs leading-relaxed">
              Real-time booking synchronization directly to your Google Calendar.
            </p>
          </div>

          <div className="p-6 bg-[#080b12] border border-white/5 rounded-2xl space-y-4 hover:border-emerald-500/20 transition-all group">
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-450 w-fit group-hover:bg-emerald-600 group-hover:text-white transition-all">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <h4 className="font-bold text-base text-white">Google Sheets Exports</h4>
            <p className="text-slate-400 text-xs leading-relaxed">
              Automated lead harvesting and spreadsheet logging.
            </p>
          </div>

          <div className="p-6 bg-[#080b12] border border-white/5 rounded-2xl space-y-4 hover:border-green-500/20 transition-all group">
            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 w-fit group-hover:bg-green-600 group-hover:text-white transition-all">
              <MessageCircle className="h-5 w-5" />
            </div>
            <h4 className="font-bold text-base text-white">WhatsApp Automation</h4>
            <p className="text-slate-400 text-xs leading-relaxed">
              Autonomous booking, contact collection, and continuous lead matrix syncing on WhatsApp.
            </p>
          </div>

          <div className="p-6 bg-[#080b12] border border-white/5 rounded-2xl space-y-4 hover:border-indigo-500/20 transition-all group">
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400 w-fit group-hover:bg-indigo-600 group-hover:text-white transition-all">
              <Facebook className="h-5 w-5" />
            </div>
            <h4 className="font-bold text-base text-white">Facebook Messenger</h4>
            <p className="text-slate-400 text-xs leading-relaxed">
              Direct integration to automate customer conversations on Messenger.
            </p>
          </div>

        </div>
      </section>

      {/* HOW IT WORKS SECTION */}
      <section className="bg-[#05080e] border-y border-white/5 py-18 px-6 scroll-mt-10" id="workspace">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-12">
          
          <div className="flex-1 space-y-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-[10px] font-mono text-indigo-400 font-bold uppercase tracking-wider">
              <span>Cloud Sync Architecture</span>
            </div>
            
            <h3 className="text-2xl sm:text-3xl font-display font-black text-white">
              Unified Platform-Wide Synchronization
            </h3>
            
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed font-sans">
              Unlike other platforms that only simulate databases, OmniBot integrates directly into Google Workspace APIs. When you click Connect Workspace inside your workspace dashboard, we request secure temporary OAuth access to help automate:
            </p>

            <ul className="space-y-3 font-sans text-xs text-slate-300">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-indigo-400 mt-0.5 shrink-0" />
                <span><strong>Gmail dispatch</strong> of manual and trigger contracts.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-indigo-400 mt-0.5 shrink-0" />
                <span><strong>Google Drive index file reads</strong> to absorb PDFs/docs directly into the client bot's Knowledge Base.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-indigo-400 mt-0.5 shrink-0" />
                <span><strong>Appends spreadsheet tuples</strong> listing customer names, active telephone digits, and scheduling times.</span>
              </li>
            </ul>
          </div>

          <div className="flex-1 bg-[#0b0f19] border border-white/5 rounded-2xl p-6 space-y-4">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">Google Workspace Scope Checklist:</h4>
            
            <div className="space-y-2.5 font-mono text-[10px]">
              <div className="p-2.5 bg-[#12192b] border border-white/5 rounded-lg flex items-center justify-between text-slate-200">
                <span className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-blue-400" />
                  <span>https://www.googleapis.com/auth/calendar.events</span>
                </span>
                <span className="text-emerald-400 font-bold">GRANTED</span>
              </div>

              <div className="p-2.5 bg-[#12192b] border border-white/5 rounded-lg flex items-center justify-between text-slate-200">
                <span className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-indigo-400" />
                  <span>https://www.googleapis.com/auth/gmail.send</span>
                </span>
                <span className="text-emerald-400 font-bold">GRANTED</span>
              </div>

              <div className="p-2.5 bg-[#12192b] border border-white/5 rounded-lg flex items-center justify-between text-slate-200">
                <span className="flex items-center gap-2">
                  <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
                  <span>https://www.googleapis.com/auth/spreadsheets</span>
                </span>
                <span className="text-emerald-400 font-bold">GRANTED</span>
              </div>

              <div className="p-2.5 bg-[#12192b] border border-white/5 rounded-lg flex items-center justify-between text-slate-200">
                <span className="flex items-center gap-2">
                  <Briefcase className="h-3.5 w-3.5 text-amber-500" />
                  <span>https://www.googleapis.com/auth/tasks</span>
                </span>
                <span className="text-emerald-400 font-bold">GRANTED</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* PRICING PLANS */}
      <section className="py-20 px-6 max-w-7xl mx-auto scroll-mt-10" id="pricing">
        <div className="text-center space-y-3 mb-16">
          <span className="font-mono text-xs text-blue-400 font-bold uppercase tracking-wider">Simple Tier Pricing</span>
          <h3 className="text-3xl font-display font-black text-white">Find Your Dynamic Growth Plan</h3>
          <p className="text-slate-400 text-xs sm:text-sm max-w-xl mx-auto">
            Choose a starting subscription level tailored to support single local shops or world-wide multi-agent operations.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* STARTER */}
          <div className="bg-[#080b12] border border-white/5 rounded-2xl p-6 space-y-6 relative flex flex-col justify-between">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold font-mono text-slate-400 uppercase tracking-widest">Starter</h4>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-3xl font-bold font-sans text-white">$49</span>
                  <span className="text-xs text-slate-500 font-mono">/ month</span>
                </div>
                <p className="text-slate-400 text-[11px] mt-1">Perfect for small fitness trainers or local lawyers.</p>
              </div>

              <div className="border-t border-white/5 pt-4 space-y-2 text-xs font-sans text-slate-300">
                <div className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-blue-450 shrink-0" />
                  <span>1 AI Agent Bot Persona</span>
                </div>
                <div className="flex items-center gap-2 text-slate-450 line-through">
                  <Check className="h-3.5 w-3.5 shrink-0" />
                  <span>Real Google Calendar Integration</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-blue-450 shrink-0" />
                  <span>WhatsApp Live Simulator</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-blue-450 shrink-0" />
                  <span>Max 50 Chat appointments per month</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => onNavigateToAuth('signup')}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs font-mono tracking-wider cursor-pointer transition-all mt-4"
            >
              CHOOSE STARTER
            </button>
          </div>

          {/* PROFESSIONAL (BEST VALUЕ) */}
          <div className="bg-[#0b101c]/90 border-2 border-blue-500/30 rounded-2xl p-6 space-y-6 relative flex flex-col justify-between shadow-xl">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-blue-600 text-white text-[9px] font-mono font-black uppercase rounded-full shadow-lg border border-blue-400 tracking-wider">
              ★ RECOMMEND SELECTION
            </span>
            
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold font-mono text-blue-400 uppercase tracking-widest">Professional</h4>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-3xl font-bold font-sans text-white">$149</span>
                  <span className="text-xs text-slate-400 font-mono">/ month</span>
                </div>
                <p className="text-slate-400 text-[11px] mt-1">Outstanding for active scaling service operations.</p>
              </div>

              <div className="border-t border-white/5 pt-4 space-y-2 text-xs font-sans text-slate-300">
                <div className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                  <span className="font-semibold text-white">Unlimited specialized AI Bot personas</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                  <span>Full Google integration suite (Gmail, Drive, Docs)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                  <span>Interactive Real Live Google Calendar Sync</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                  <span>Google Sheets lead matrix appending</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => onNavigateToAuth('signup')}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs font-mono tracking-wider cursor-pointer transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)] mt-4"
            >
              SELECT PROFESSIONAL
            </button>
          </div>

          {/* ENTERPRISE */}
          <div className="bg-[#080b12] border border-white/5 rounded-2xl p-6 space-y-6 relative flex flex-col justify-between">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold font-mono text-slate-400 uppercase tracking-widest">Enterprise</h4>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-3xl font-bold font-sans text-white">$499</span>
                  <span className="text-xs text-slate-500 font-mono">/ month</span>
                </div>
                <p className="text-slate-400 text-[11px] mt-1">Dedicated corporate setups requiring total API custom bounds.</p>
              </div>

              <div className="border-t border-white/5 pt-4 space-y-2 text-xs font-sans text-slate-300">
                <div className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-blue-450 shrink-0" />
                  <span>Everything inside Professional tier</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-blue-450 shrink-0" />
                  <span>Multi-Tenant CRM database pipelines</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-blue-450 shrink-0" />
                  <span>Priority SLA & API high throughput rates</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-blue-450 shrink-0" />
                  <span>24/7 Phone & Technical engineer support</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => onNavigateToAuth('signup')}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs font-mono tracking-wider cursor-pointer transition-all mt-4"
            >
              CONTACT ENTERPRISE
            </button>
          </div>

        </div>
      </section>

      {/* CLIENT TESTIMONIALS */}
      <section className="bg-[#05080e] border-t border-white/5 py-16 px-6">
        <div className="max-w-7xl mx-auto space-y-12">
          
          <div className="text-center space-y-3">
            <span className="font-mono text-xs text-blue-400 font-bold uppercase tracking-wider">SaaS Trust Index</span>
            <h3 className="text-2xl sm:text-3xl font-display font-medium text-white">Rave Customer Experiences</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            <div className="bg-slate-900/40 p-5 rounded-2xl border border-white/5 space-y-4">
              <p className="text-slate-305 text-xs italic leading-relaxed">
                "We connected our Zenith Fitness company profile instantly. Now, our Instagram and WhatsApp prospects talk to the AI, confirm booking times, and our coaches see clean agenda updates directly in Google Calendar! Unbelievable!"
              </p>
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs flex items-center justify-center font-bold">TF</div>
                <div>
                  <h4 className="text-xs font-bold text-white leading-none">Tyler Fletcher</h4>
                  <span className="text-[10px] text-slate-500 font-mono">Owner, Zenith Gyms</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/40 p-5 rounded-2xl border border-white/5 space-y-4">
              <p className="text-slate-305 text-xs italic leading-relaxed">
                "As a lawyer, client onboarding is tedious. OmniBot qualified leads, indexed our commercial contracts knowledge database, and logs caller tickets in Google Tasks. Absolute lifesaver."
              </p>
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs flex items-center justify-center font-bold">AV</div>
                <div>
                  <h4 className="text-xs font-bold text-white leading-none">Amanda Vance</h4>
                  <span className="text-[10px] text-slate-500 font-mono">Partner, Aurora Legal Group</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/40 p-5 rounded-2xl border border-white/5 space-y-4">
              <p className="text-slate-305 text-xs italic leading-relaxed">
                "Our tire change bays are constantly packed. Adding the simulation interface and Google Sheets row append feature lets us export customer vectors to our dispatch ledger with zero manual typo errors!"
              </p>
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs flex items-center justify-center font-bold">MK</div>
                <div>
                  <h4 className="text-xs font-bold text-white leading-none">Marcus Kross</h4>
                  <span className="text-[10px] text-slate-500 font-mono">Operations head, Apex Auto</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/5 py-12 px-6 text-center text-slate-500 font-mono text-[10.5px] max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <p>© 2026 OmniBot SaaS Inc. All rights reserved.</p>
          <p className="text-[9.5px] text-slate-600 mt-1">Secure Sandboxed Cloud-Native Application Engine</p>
        </div>
        <div className="flex items-center gap-4">
          <a href="#features" className="hover:text-white">FEATURES</a>
          <span>•</span>
          <a href="#demo" className="hover:text-white">DEMO</a>
          <span>•</span>
          <a href="#pricing" className="hover:text-white">PRICING</a>
        </div>
      </footer>

    </div>
  );
};
