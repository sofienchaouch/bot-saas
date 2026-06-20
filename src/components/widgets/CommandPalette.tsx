import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Sparkles, 
  Layout, 
  Smartphone, 
  Settings, 
  Database, 
  Users, 
  Calendar as CalendarIcon, 
  Cloud, 
  Phone,
  UserPlus, 
  PlusCircle, 
  RefreshCw, 
  Download,
  Terminal
} from 'lucide-react';

interface CommandItem {
  id: string;
  name: string;
  category: string;
  shortcut?: string;
  icon: React.ReactNode;
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tab: 'insights' | 'bot_config' | 'knowledge_base' | 'leads' | 'calendar' | 'simulator' | 'whatsapp_integration' | 'workspace_hub') => void;
  onAddLead?: () => void;
  onAddKB?: () => void;
  onSyncCalendar?: () => void;
  onExportReport?: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onSelectTab,
  onAddLead,
  onAddKB,
  onSyncCalendar,
  onExportReport
}) => {
  const [search, setSearch] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const commands: CommandItem[] = [
    // Navigation Category
    {
      id: 'nav-insights',
      name: 'Go to Insights Dashboard',
      category: 'Navigation',
      shortcut: 'G I',
      icon: <Layout className="h-4 w-4 text-blue-400" />,
      action: () => onSelectTab('insights'),
    },
    {
      id: 'nav-simulator',
      name: 'Open Bot Simulator Sandbox',
      category: 'Navigation',
      shortcut: 'G S',
      icon: <Smartphone className="h-4 w-4 text-red-400" />,
      action: () => onSelectTab('simulator'),
    },
    {
      id: 'nav-config',
      name: 'Go to Bot Configuration Panel',
      category: 'Navigation',
      shortcut: 'G C',
      icon: <Settings className="h-4 w-4 text-purple-400" />,
      action: () => onSelectTab('bot_config'),
    },
    {
      id: 'nav-kb',
      name: 'Manage Knowledge Base',
      category: 'Navigation',
      shortcut: 'G K',
      icon: <Database className="h-4 w-4 text-amber-400" />,
      action: () => onSelectTab('knowledge_base'),
    },
    {
      id: 'nav-leads',
      name: 'View Captured CRM Leads',
      category: 'Navigation',
      shortcut: 'G L',
      icon: <Users className="h-4 w-4 text-emerald-400" />,
      action: () => onSelectTab('leads'),
    },
    {
      id: 'nav-calendar',
      name: 'Open Appointment Calendar',
      category: 'Navigation',
      shortcut: 'G A',
      icon: <CalendarIcon className="h-4 w-4 text-sky-400" />,
      action: () => onSelectTab('calendar'),
    },
    {
      id: 'nav-workspace',
      name: 'Go to Workspace Hub & Integrations',
      category: 'Navigation',
      shortcut: 'G W',
      icon: <Cloud className="h-4 w-4 text-indigo-400" />,
      action: () => onSelectTab('workspace_hub'),
    },
    {
      id: 'nav-whatsapp',
      name: 'Manage WhatsApp Business Connection',
      category: 'Navigation',
      shortcut: 'G H',
      icon: <Phone className="h-4 w-4 text-teal-400" />,
      action: () => onSelectTab('whatsapp_integration'),
    },
    // Quick Actions Category
    ...(onAddLead ? [{
      id: 'act-add-lead',
      name: 'Capture / Add New CRM Lead',
      category: 'Quick Actions',
      shortcut: 'N L',
      icon: <UserPlus className="h-4 w-4 text-emerald-400" />,
      action: onAddLead,
    }] : []),
    ...(onAddKB ? [{
      id: 'act-add-kb',
      name: 'Add FAQ / Document to Knowledge Base',
      category: 'Quick Actions',
      shortcut: 'N K',
      icon: <PlusCircle className="h-4 w-4 text-amber-400" />,
      action: onAddKB,
    }] : []),
    ...(onSyncCalendar ? [{
      id: 'act-sync-cal',
      name: 'Force-Sync Google Calendar',
      category: 'Quick Actions',
      shortcut: 'S C',
      icon: <RefreshCw className="h-4 w-4 text-sky-400" />,
      action: onSyncCalendar,
    }] : []),
    ...(onExportReport ? [{
      id: 'act-export',
      name: 'Export AI Performance CSV Report',
      category: 'Quick Actions',
      shortcut: 'E R',
      icon: <Download className="h-4 w-4 text-indigo-400" />,
      action: onExportReport,
    }] : []),
  ];

  // Filter commands based on search
  const filteredCommands = commands.filter(cmd =>
    cmd.name.toLowerCase().includes(search.toLowerCase()) ||
    cmd.category.toLowerCase().includes(search.toLowerCase())
  );

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSearch('');
      setActiveIndex(0);
    }
  }, [isOpen]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex(prev => (prev + 1) % filteredCommands.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[activeIndex]) {
          filteredCommands[activeIndex].action();
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeIndex, filteredCommands, onClose]);

  // Auto-scroll to active item
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.children[activeIndex] as HTMLElement;
      if (activeEl) {
        const listHeight = listRef.current.clientHeight;
        const elTop = activeEl.offsetTop;
        const elHeight = activeEl.clientHeight;

        if (elTop + elHeight > listRef.current.scrollTop + listHeight) {
          listRef.current.scrollTop = elTop + elHeight - listHeight;
        } else if (elTop < listRef.current.scrollTop) {
          listRef.current.scrollTop = elTop;
        }
      }
    }
  }, [activeIndex]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Palette Container */}
      <div className="relative w-full max-w-xl overflow-hidden bg-[#080b12]/95 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-md flex flex-col max-h-[450px]">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/5 bg-[#0d121d]/40">
          <Search className="h-4 w-4 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search actions... (Esc to close)"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setActiveIndex(0);
            }}
            className="w-full bg-transparent text-sm text-white placeholder-slate-400 focus:outline-none font-mono"
          />
          <div className="flex items-center gap-1 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-[9px] font-mono text-slate-400 select-none">
            <Terminal className="h-3 w-3 mr-0.5" />
            <span>CMD</span>
          </div>
        </div>

        {/* Results List */}
        <div 
          ref={listRef}
          className="flex-1 overflow-y-auto p-2 divide-y divide-white/[0.02]"
        >
          {filteredCommands.length > 0 ? (
            // Group by Category
            Object.entries(
              filteredCommands.reduce((acc, cmd) => {
                if (!acc[cmd.category]) acc[cmd.category] = [];
                acc[cmd.category].push(cmd);
                return acc;
              }, {} as Record<string, CommandItem[]>)
            ).map(([category, items]) => (
              <div key={category} className="py-2">
                <h4 className="text-[9px] font-black tracking-widest text-slate-500 uppercase px-3 py-1 font-mono">
                  {category}
                </h4>
                <div className="space-y-0.5 mt-1">
                  {items.map((cmd) => {
                    const globalIdx = filteredCommands.findIndex(c => c.id === cmd.id);
                    const isActive = globalIdx === activeIndex;

                    return (
                      <button
                        key={cmd.id}
                        onClick={() => {
                          cmd.action();
                          onClose();
                        }}
                        onMouseEnter={() => setActiveIndex(globalIdx)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all ${
                          isActive 
                            ? 'bg-blue-600/90 text-white shadow-[0_0_15px_rgba(37,99,235,0.2)]' 
                            : 'text-slate-300 hover:bg-white/[0.02]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`p-1.5 rounded-lg ${isActive ? 'bg-white/10' : 'bg-slate-900/80 border border-white/5'}`}>
                            {cmd.icon}
                          </span>
                          <span className="text-xs font-semibold font-sans">{cmd.name}</span>
                        </div>
                        {cmd.shortcut && (
                          <div className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                            isActive 
                              ? 'bg-white/10 border-white/20 text-white' 
                              : 'bg-white/5 border-white/5 text-slate-400'
                          }`}>
                            {cmd.shortcut}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 text-center text-slate-450 font-mono text-xs">
              <Sparkles className="h-5 w-5 text-slate-500 mx-auto mb-2 animate-pulse" />
              <span>No commands found matching "{search}"</span>
            </div>
          )}
        </div>

        {/* Footer Hint */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-white/5 bg-[#0d121d]/60 font-mono text-[9px] text-slate-500 select-none">
          <div className="flex items-center gap-2">
            <span>↑↓ to navigate</span>
            <span>↵ to select</span>
          </div>
          <span>Esc to close</span>
        </div>
      </div>
    </div>
  );
};
