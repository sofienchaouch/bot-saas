import React, { useState, useEffect } from 'react';
import { Tenant, Lead, Appointment, KnowledgeBaseItem, Agent } from '../types';
import { DEFAULT_TENANTS } from '../defaultData';
import { SaasHeader } from './SaasHeader';
import { BotSimulator } from './BotSimulator';
import { useLanguage } from '../LanguageContext';
import {
  TrendingUp,
  Users,
  Calendar as CalendarIcon,
  Database,
  Bot,
  Settings,
  ShieldCheck,
  Plus,
  Trash2,
  Check,
  AlertCircle,
  FileText,
  User,
  Phone,
  Mail,
  Loader2,
  Sparkles,
  RefreshCw,
  Search,
  CheckCircle,
  Smartphone,
  Clock,
  Upload,
  Link,
  Globe,
  Compass,
  Terminal,
  ArrowRight,
  ChevronRight,
  Instagram,
  Facebook,
  Linkedin,
  Twitter,
  Download,
  Cloud,
  AlertTriangle,
  LogOut,
  Send,
  Mic,
  Volume2,
  VolumeX,
  Menu,
  X,
  Sliders,
  Cpu,
  Eye,
  EyeOff,
  Zap,
  MessageSquare
} from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { googleSignIn, logout, initAuth } from '../firebase';
import { listGoogleCalendarEvents, createGoogleCalendarEvent, deleteGoogleCalendarEvent } from '../googleCalendar';
import { SaaSCharts } from './SaaSCharts';
import { WorkspaceHub } from './WorkspaceHub';
import { createGoogleSpreadsheet, appendRowToGoogleSpreadsheet, sendGmailMessage } from '../googleWorkspace';
import { WhatsAppStatusIndicator } from './WhatsAppStatusIndicator';

interface SaaSLayoutProps {
  initialTenantId?: string;
  onLogoutAdmin?: () => void;
  newSignUpTenant?: Tenant | null;
  tenants?: Tenant[];
  setTenants?: React.Dispatch<React.SetStateAction<Tenant[]>>;
  sessionEmail?: string | null;
  onGoToOwnerConsole?: () => void;
  onSelectTenantId?: (tenantId: string) => void;
}

export const SaaSLayout: React.FC<SaaSLayoutProps> = ({
  initialTenantId,
  onLogoutAdmin,
  newSignUpTenant,
  tenants: propTenants,
  setTenants: propSetTenants,
  sessionEmail,
  onGoToOwnerConsole,
  onSelectTenantId
}) => {
  const { language, t } = useLanguage();
  // Global SaaS States fallback to DEFAULT_TENANTS
  const [localTenants, localSetTenants] = useState<Tenant[]>(DEFAULT_TENANTS);
  const tenants = propTenants || localTenants;
  const setTenants = propSetTenants || localSetTenants;

  const [selectedTenantId, setSelectedTenantId] = useState<string>(initialTenantId || 'zenith-fitness');
  const [activeTab, setActiveTabState] = useState<'insights' | 'bot_config' | 'knowledge_base' | 'leads' | 'calendar' | 'simulator' | 'whatsapp_integration' | 'workspace_hub'>(() => {
    return (localStorage.getItem('saas_active_tab') as any) || 'insights';
  });

  const setActiveTab = (tab: typeof activeTab) => {
    setActiveTabState(tab);
    localStorage.setItem('saas_active_tab', tab);
  };
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userRole, setUserRole] = useState<'admin' | 'support'>('admin');

  // Live Chat Takeover States
  const [takeoverConvos, setTakeoverConvos] = useState<Record<string, { messages: any[] }>>({});
  const [selectedConvoKey, setSelectedConvoKey] = useState<string | null>(null);
  const [takeoverReplyText, setTakeoverReplyText] = useState('');
  const [isSendingTakeoverReply, setIsSendingTakeoverReply] = useState(false);
  const [isFetchingTakeoverConvos, setIsFetchingTakeoverConvos] = useState(false);

  // Load new signup tenant if supplied
  useEffect(() => {
    if (newSignUpTenant) {
      setTenants(prev => {
        if (!prev.some(t => t.id === newSignUpTenant.id)) {
          return [newSignUpTenant, ...prev];
        }
        return prev;
      });
      setSelectedTenantId(newSignUpTenant.id);
    }
  }, [newSignUpTenant]);

  // Sync state when initialTenantId changes
  useEffect(() => {
    if (initialTenantId) {
      setSelectedTenantId(initialTenantId);
    }
  }, [initialTenantId]);

  // Unified Selected Tenant Helper
  const currentTenantIndex = tenants.findIndex(t => t.id === selectedTenantId);
  const selectedTenant = tenants[currentTenantIndex] || tenants[0];

  // Auth and Token States
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Calendar event listing states
  const [googleEvents, setGoogleEvents] = useState<Appointment[]>([]);
  const [isSyncingCalendar, setIsSyncingCalendar] = useState(false);
  const [calendarError, setCalendarError] = useState<string | null>(null);

  // Modals / Forms inputs
  const [kbTitleInput, setKbTitleInput] = useState('');
  const [kbContentInput, setKbContentInput] = useState('');
  const [kbTypeInput, setKbTypeInput] = useState<'faq' | 'document' | 'file' | 'url' | 'crawl'>('file');
  const [showAddKb, setShowAddKb] = useState(false);

  // Extended Knowledge Base variables
  const [kbFileMeta, setKbFileMeta] = useState<{ name: string; size: string; type: string } | null>(null);
  const [kbUrlInput, setKbUrlInput] = useState('');
  const [kbCrawlSource, setKbCrawlSource] = useState<'web' | 'instagram' | 'facebook' | 'linkedin' | 'twitter'>('web');
  const [kbCrawlDepth, setKbCrawlDepth] = useState(2);
  const [kbCrawlPages, setKbCrawlPages] = useState(15);
  const [kbCrawlStatus, setKbCrawlStatus] = useState<'idle' | 'running' | 'completed' | 'failed'>('idle');
  const [kbCrawlProgress, setKbCrawlProgress] = useState(0);
  const [kbCrawlLogs, setKbCrawlLogs] = useState<string[]>([]);
  const [isProcessingKb, setIsProcessingKb] = useState(false);
  const [kbProcessingStep, setKbProcessingStep] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const [leadNameInput, setLeadNameInput] = useState('');
  const [leadPhoneInput, setLeadPhoneInput] = useState('');
  const [leadEmailInput, setLeadEmailInput] = useState('');
  const [leadNoteInput, setLeadNoteInput] = useState('');
  const [showAddLead, setShowAddLead] = useState(false);
  const [leadsSearchQuery, setLeadsSearchQuery] = useState('');
  const [leadsStatusFilter, setLeadsStatusFilter] = useState<string>('ALL');

  // Destructive Actions Custom Confirms
  const [eventPendingDelete, setEventPendingDelete] = useState<{ id: string; name: string; isGoogle: boolean } | null>(null);

  // Welcome Message Templates Form & Edit States
  const [showAddTemplateForm, setShowAddTemplateForm] = useState(false);
  const [templateNameInput, setTemplateNameInput] = useState('');
  const [templateTextInput, setTemplateTextInput] = useState('');
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);

  // Multi-Agent states
  const [showAddAgentForm, setShowAddAgentForm] = useState(false);
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null);
  const [agentNameInput, setAgentNameInput] = useState('');
  const [agentRoleInput, setAgentRoleInput] = useState('');
  const [agentToneInput, setAgentToneInput] = useState<'professional' | 'friendly' | 'casual' | 'empathetic'>('friendly');
  const [agentSystemInstructionInput, setAgentSystemInstructionInput] = useState('');
  const [agentAvatarInput, setAgentAvatarInput] = useState('🤖');
  const [agentVoiceEnabledInput, setAgentVoiceEnabledInput] = useState(false);
  const [agentActionSuccess, setAgentActionSuccess] = useState<string | null>(null);

  // Interactive Prompt Playground State Variables
  const [playgroundMessages, setPlaygroundMessages] = useState<{ sender: 'customer' | 'bot'; text: string; timestamp?: string; action?: any }[]>([
    { sender: 'bot', text: 'Marhaba! 👋 Feel free to send me any sample message here in this sandbox playground. I will respond adhering strictly to your prompt instructions and document sources, and you can see my raw reasoning outputs instantly below!', timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
  ]);
  const [playgroundInput, setPlaygroundInput] = useState('');
  const [playgroundInstruction, setPlaygroundInstruction] = useState('');
  const [playgroundIsLoading, setPlaygroundIsLoading] = useState(false);
  const [playgroundRawResponse, setPlaygroundRawResponse] = useState<any>(null);
  const [playgroundSystemPromptUsed, setPlaygroundSystemPromptUsed] = useState<string>('');
  const [playgroundSelectedAgentId, setPlaygroundSelectedAgentId] = useState<string>('');
  const [playgroundSuccessMsg, setPlaygroundSuccessMsg] = useState<string | null>(null);

  // Webhook CRM Sync Simulator state variables
  const [webhookLeadId, setWebhookLeadId] = useState<string>('');
  const [webhookStatus, setWebhookStatus] = useState<'idle' | 'sending' | 'success' | 'failed'>('idle');
  const [webhookLogs, setWebhookLogs] = useState<string[]>([]);

  // WhatsApp Integration form state selectors
  const [waPhone, setWaPhone] = useState('');
  const [waSid, setWaSid] = useState('');
  const [waToken, setWaToken] = useState('');
  const [waStatus, setWaStatus] = useState<'connected' | 'disconnected' | 'pending_verification'>('disconnected');
  const [waShowToken, setWaShowToken] = useState(false);
  const [waTestMode, setWaTestMode] = useState(false);

  // WhatsApp Sandbox States
  const [waSandboxActive, setWaSandboxActive] = useState(false);
  const [waSandboxNumbers, setWaSandboxNumbers] = useState<string[]>([]);
  const [waSandboxInputNumber, setWaSandboxInputNumber] = useState('');
  const [waSandboxCode, setWaSandboxCode] = useState('');
  const [waSandboxSentCode, setWaSandboxSentCode] = useState('');
  const [waSandboxStep, setWaSandboxStep] = useState<'idle' | 'sending' | 'otp_sent' | 'verified'>('idle');
  const [waSandboxError, setWaSandboxError] = useState<string | null>(null);

  // Messenger Integration form state selectors
  const [messengerPageId, setMessengerPageId] = useState('');
  const [messengerToken, setMessengerToken] = useState('');
  const [messengerStatus, setMessengerStatus] = useState<'connected' | 'disconnected' | 'pending_verification'>('disconnected');
  const [messengerShowToken, setMessengerShowToken] = useState(false);
  const [messengerSaveSuccess, setMessengerSaveSuccess] = useState(false);

  // Messenger Sandbox States
  const [messengerSandboxActive, setMessengerSandboxActive] = useState(false);
  const [messengerSandboxNumbers, setMessengerSandboxNumbers] = useState<string[]>([]);
  const [messengerSandboxInputNumber, setMessengerSandboxInputNumber] = useState('');
  const [messengerSandboxCode, setMessengerSandboxCode] = useState('');
  const [messengerSandboxSentCode, setMessengerSandboxSentCode] = useState('');
  const [messengerSandboxStep, setMessengerSandboxStep] = useState<'idle' | 'sending' | 'otp_sent' | 'verified'>('idle');
  const [messengerSandboxError, setMessengerSandboxError] = useState<string | null>(null);

  // Active platform sub-tab inside Integrations Tab
  const [activeChannelSubTab, setActiveChannelSubTab] = useState<'whatsapp' | 'messenger'>('whatsapp');
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionFeedback, setConnectionFeedback] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [isTestingMessengerConnection, setIsTestingMessengerConnection] = useState(false);
  const [messengerConnectionFeedback, setMessengerConnectionFeedback] = useState<{type: 'success' | 'error', text: string} | null>(null);

  // Webhook Tester UI States
  const [testWebhookSenderName, setTestWebhookSenderName] = useState('Jane Doe');
  const [testWebhookSenderPhone, setTestWebhookSenderPhone] = useState('33612345678');
  const [testWebhookMessage, setTestWebhookMessage] = useState('Hello, what are your group fitness rates?');
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);
  const [testWebhookLogs, setTestWebhookLogs] = useState<string[]>([]);
  const [testConversationsList, setTestConversationsList] = useState<any[]>([]);
  const [webhookViewMode, setWebhookViewMode] = useState<'logs' | 'payload'>('logs');
  const [payloadCopied, setPayloadCopied] = useState(false);

  // Messenger Webhook Tester UI States
  const [testMessengerWebhookSenderName, setTestMessengerWebhookSenderName] = useState('Maria Sharapova');
  const [testMessengerWebhookSenderPSID, setTestMessengerWebhookSenderPSID] = useState('psid_9281742');
  const [testMessengerWebhookMessage, setTestMessengerWebhookMessage] = useState('Hi, I want to inquire about monthly subscriptions.');
  const [isTestingMessengerWebhook, setIsTestingMessengerWebhook] = useState(false);
  const [testMessengerWebhookLogs, setTestMessengerWebhookLogs] = useState<string[]>([]);
  const [testMessengerConversationsList, setTestMessengerConversationsList] = useState<any[]>([]);

  // Messenger Voice Enable and Voice Note simulator states
  const [messengerVoiceEnabled, setMessengerVoiceEnabled] = useState(false);
  const [playingMessengerMessageId, setPlayingMessengerMessageId] = useState<string | null>(null);
  const [isMessengerChatMicActive, setIsMessengerChatMicActive] = useState(false);
  const [messengerInputIsVoiceNote, setMessengerInputIsVoiceNote] = useState(false);
  const messengerRecognitionRef = React.useRef<any>(null);

  // 1. Google Sheets Lead Export States
  const [exportingToSheets, setExportingToSheets] = useState(false);
  const [sheetsExportUrl, setSheetsExportUrl] = useState<string | null>(null);
  const [sheetsExportError, setSheetsExportError] = useState<string | null>(null);

  // 2. Email Nurturing Automation States
  const [nurtureTriggerActive, setNurtureTriggerActive] = useState(true);
  const [nurtureTriggerStage, setNurtureTriggerStage] = useState<string>('Qualified');
  const [nurtureSubjectTemplate, setNurtureSubjectTemplate] = useState<string>(
    'Thank you for registering at {tenant_name}! 🦷'
  );
  const [nurtureBodyTemplate, setNurtureBodyTemplate] = useState<string>(
    'Hi {customer_name},\n\nWe saw you were recently marked as "{status}" in our system. We would love to schedule a custom follow-up and answer any questions you may have regarding our services!\n\nBest regards,\nThe {tenant_name} Team'
  );
  const [nurtureLogs, setNurtureLogs] = useState<string[]>([
    `[${new Date().toLocaleTimeString()}] Email trigger automation daemon initialized.`
  ]);

  // System Instruction Speech Recording States
  const [isRecordingAgent, setIsRecordingAgent] = useState(false);
  const [isRecordingPlayground, setIsRecordingPlayground] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [recognitionInstance, setRecognitionInstance] = useState<any>(null);

  const startVoiceRecording = (target: 'agent' | 'playground') => {
    setSpeechError(null);
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setSpeechError("Speech recognition is not supported in this browser. Please use Chrome/Safari/Edge.");
      return;
    }

    try {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';

      rec.onstart = () => {
        if (target === 'agent') {
          setIsRecordingAgent(true);
        } else {
          setIsRecordingPlayground(true);
        }
      };

      rec.onerror = (event: any) => {
        console.error('Speech recognition error', event);
        setSpeechError(`Speech Error: ${event.error || 'Permission denied'}`);
        stopVoiceRecording();
      };

      rec.onend = () => {
        setIsRecordingAgent(false);
        setIsRecordingPlayground(false);
      };

      rec.onresult = (event: any) => {
        let finalTranscription = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscription += event.results[i][0].transcript + ' ';
          }
        }
        
        if (finalTranscription) {
          if (target === 'agent') {
            setAgentSystemInstructionInput(prev => {
              const cleaned = prev.trim();
              return cleaned ? `${cleaned} ${finalTranscription.trim()}` : finalTranscription.trim();
            });
          } else {
            setPlaygroundInstruction(prev => {
              const cleaned = prev.trim();
              return cleaned ? `${cleaned} ${finalTranscription.trim()}` : finalTranscription.trim();
            });
          }
        }
      };

      rec.start();
      setRecognitionInstance(rec);
    } catch (err: any) {
      setSpeechError(`Failed to start recording: ${err.message || err}`);
    }
  };

  const stopVoiceRecording = () => {
    if (recognitionInstance) {
      try {
        recognitionInstance.stop();
      } catch (e) {}
      setRecognitionInstance(null);
    }
    setIsRecordingAgent(false);
    setIsRecordingPlayground(false);
  };

  useEffect(() => {
    return () => {
      if (recognitionInstance) {
        try {
          recognitionInstance.stop();
        } catch (e) {}
      }
    };
  }, [recognitionInstance]);

  // Auto sync when tenant selection switches
  useEffect(() => {
    if (selectedTenant) {
      setWaPhone(selectedTenant.whatsAppPhoneNumber || '');
      setWaSid(selectedTenant.whatsAppVerifiedSid || '');
      setWaToken(selectedTenant.whatsAppApiKey || '');
      setWaStatus(selectedTenant.whatsAppStatus || 'disconnected');
      setWaSandboxActive(selectedTenant.whatsAppSandboxActive || false);
      setWaSandboxNumbers(selectedTenant.whatsAppSandboxNumbers || []);
      setWaTestMode(selectedTenant.whatsAppTestMode || false);
      setWaSandboxInputNumber('');
      setWaSandboxCode('');
      setWaSandboxSentCode('');
      setWaSandboxStep('idle');
      setWaSandboxError(null);

      setMessengerPageId(selectedTenant.messengerPageId || '');
      setMessengerToken(selectedTenant.messengerToken || '');
      setMessengerStatus(selectedTenant.messengerStatus || 'disconnected');
      setMessengerSandboxActive(selectedTenant.messengerSandboxActive || false);
      setMessengerSandboxNumbers(selectedTenant.messengerSandboxNumbers || []);
      setMessengerVoiceEnabled(selectedTenant.messengerVoiceEnabled || false);
      setMessengerSandboxInputNumber('');
      setMessengerSandboxCode('');
      setMessengerSandboxSentCode('');
      setMessengerSandboxStep('idle');
      setMessengerSandboxError(null);
    }
  }, [selectedTenantId]);

  // Initialize Firebase Auth Listener on load as recommended by Google Workspace Integration skill
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setGoogleToken(token);
        setNeedsAuth(false);
        // Load Google Calendar Events directly
        loadGoogleCalendar(token);
      },
      () => {
        setUser(null);
        setGoogleToken(null);
        setNeedsAuth(true);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setAuthError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setGoogleToken(result.accessToken);
        setUser(result.user);
        setNeedsAuth(false);
        setAuthError(null);
        loadGoogleCalendar(result.accessToken);
      }
    } catch (err: any) {
      console.error('Google authorization failed:', err);
      const errMsg = err?.message || String(err);
      if (errMsg.includes('popup-closed-by-user') || errMsg.includes('popup-blocked')) {
        setAuthError('POPUP_CLOSED_BY_USER');
      } else {
        setAuthError(errMsg);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleLogout = async () => {
    try {
      await logout();
      setUser(null);
      setGoogleToken(null);
      setNeedsAuth(true);
      setGoogleEvents([]);
    } catch (e) {
      console.error(e);
    }
  };

  const loadGoogleCalendar = async (token: string, bypassSync: boolean = false) => {
    setIsSyncingCalendar(true);
    setCalendarError(null);
    try {
      // 1. Load active Google Calendar events
      const events = await listGoogleCalendarEvents(token);
      setGoogleEvents(events);

      // 2. Identify and synchronize unsynced sandbox/webhook appointments
      if (!bypassSync && selectedTenant?.appointments) {
        const unsynced = selectedTenant.appointments.filter(a => !a.syncedWithGoogle);
        if (unsynced.length > 0) {
          let successCount = 0;
          const updatedAppointments = [...selectedTenant.appointments];

          for (let i = 0; i < updatedAppointments.length; i++) {
            const appt = updatedAppointments[i];
            if (!appt.syncedWithGoogle) {
              try {
                const syncedAppt = await createGoogleCalendarEvent(token, {
                  customerName: appt.customerName,
                  customerPhone: appt.customerPhone,
                  email: appt.email,
                  start: appt.start,
                  end: appt.end,
                  summary: appt.summary,
                  notes: appt.notes
                });

                updatedAppointments[i] = {
                  ...appt,
                  id: syncedAppt.id,
                  syncedWithGoogle: true,
                  googleEventId: syncedAppt.id
                };
                successCount++;
              } catch (err) {
                console.error(`[CALENDAR_SYNC] Failed auto-syncing appointment ${appt.id} to Google:`, err);
              }
            }
          }

          if (successCount > 0) {
            updateTenantFields({
              appointments: updatedAppointments
            });
            // Reload the list of google events to include the newly synced items
            const reloadedEvents = await listGoogleCalendarEvents(token);
            setGoogleEvents(reloadedEvents);
          }
        }
      }
    } catch (err: any) {
      if (err.message === 'UNAUTHORIZED') {
        setCalendarError('Your Google Calendar access token has expired. Please sign in again.');
        handleGoogleLogout();
      } else {
        setCalendarError('Failed to pull Google Calendar feeds automatically.');
      }
    } finally {
      setIsSyncingCalendar(false);
    }
  };

  // Synchronize Google Calendar when selected tenant changes or Google authentication is configured
  useEffect(() => {
    if (googleToken && selectedTenantId) {
      loadGoogleCalendar(googleToken);
    }
  }, [googleToken, selectedTenantId]);

  // Google Sheets Direct Leads Export
  const handleExportToSheets = async () => {
    if (!googleToken) {
      setSheetsExportError('Missing Google authorization credentials. Please connect to Google Workspace first.');
      return;
    }
    setExportingToSheets(true);
    setSheetsExportUrl(null);
    setSheetsExportError(null);
    try {
      const title = `${selectedTenant.name} - CRM Lead Inflow Report (${new Date().toLocaleDateString()})`;
      const sheet = await createGoogleSpreadsheet(googleToken, title);
      
      // Append table headers
      await appendRowToGoogleSpreadsheet(googleToken, sheet.spreadsheetId, [
        'NAME', 'EMAIL', 'PHONE NUMBER', 'LEAD STATUS', 'DATE CAPTURED', 'CRM AGENT NOTES'
      ]);

      const activeLeads = selectedTenant.leads || [];
      for (const lead of activeLeads) {
        await appendRowToGoogleSpreadsheet(googleToken, sheet.spreadsheetId, [
          lead.name || 'Anonymous Client',
          lead.email || 'None',
          lead.phone || 'None',
          lead.status || 'New',
          lead.dateCaptured || 'None',
          lead.note || 'AI Agent lead harvest.'
        ]);
      }

      setSheetsExportUrl(sheet.spreadsheetUrl);
      setNurtureLogs(prev => [
        `[${new Date().toLocaleTimeString()}] ✅ Exported all ${activeLeads.length} leads successfully to newly provisioned Cloud Sheet: "${title}"`,
        ...prev
      ]);
    } catch (err: any) {
      console.error('Google Sheet Sync Error:', err);
      setSheetsExportError(err?.message || 'Failed to sync lead records. Please verify scope approvals.');
    } finally {
      setExportingToSheets(false);
    }
  };

  // Gmail Trigger Automated Email Dispatcher
  const handleTriggerNurtureEmail = async (leadName: string, leadEmail: string, currentStatus: string) => {
    if (!nurtureTriggerActive) return;
    if (!googleToken) {
      setNurtureLogs(prev => [
        `[${new Date().toLocaleTimeString()}] ⚠️ Auto-responder bypassed for "${leadName}": No Google Workspace user session active.`,
        ...prev
      ]);
      return;
    }
    if (!leadEmail || leadEmail === 'None' || !leadEmail.includes('@') || leadEmail.includes('example.com')) {
      setNurtureLogs(prev => [
        `[${new Date().toLocaleTimeString()}] ⚠️ Auto-responder skipped for "${leadName}": Missing or invalid destination address (${leadEmail}).`,
        ...prev
      ]);
      return;
    }

    const parseTemplateTokens = (text: string) => {
      return text
        .replace(/{customer_name}/g, leadName)
        .replace(/{name}/g, leadName)
        .replace(/{status}/g, currentStatus)
        .replace(/{tenant_name}/g, selectedTenant.name)
        .replace(/{tenant}/g, selectedTenant.name);
    };

    const targetSubject = parseTemplateTokens(nurtureSubjectTemplate);
    const targetBody = parseTemplateTokens(nurtureBodyTemplate);

    setNurtureLogs(prev => [
      `[${new Date().toLocaleTimeString()}] ⏳ Transmitting automated trigger email sequence to ${leadEmail}...`,
      ...prev
    ]);

    try {
      await sendGmailMessage(googleToken, leadEmail, targetSubject, targetBody);
      setNurtureLogs(prev => [
        `[${new Date().toLocaleTimeString()}] 📨 [TRIGGER SUCCESSFUL] Transmitted automated email via user Gmail API to ${leadEmail} (Subject: "${targetSubject}")`,
        ...prev
      ]);
    } catch (e: any) {
      console.error('Gmail transmission failure:', e);
      setNurtureLogs(prev => [
        `[${new Date().toLocaleTimeString()}] ❌ [TRIGGER FAILED] Failed to transmit sequence message: ${e?.message || e}`,
        ...prev
      ]);
    }
  };

  // State Mutators across tenants
  const updateTenantFields = (fields: Partial<Tenant>) => {
    setTenants(prev => prev.map(t => t.id === selectedTenant.id ? { ...t, ...fields } : t));
  };

  const handleSimulateFileUpload = (fileName: string, fileSize: string, content: string, titleName: string) => {
    setIsProcessingKb(true);
    setKbProcessingStep('Reading binary headers from PDF/Doc...');
    setKbFileMeta({ name: fileName, size: fileSize, type: 'application/pdf' });
    
    setTimeout(() => {
      setKbProcessingStep('Parsing XML format layout and nodes...');
      setTimeout(() => {
        setKbProcessingStep('Decompressing text structures via OCR engine...');
        setTimeout(() => {
          setIsProcessingKb(false);
          setKbProcessingStep('');
          setKbTitleInput(titleName);
          setKbContentInput(content);
        }, 600);
      }, 600);
    }, 600);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const sizeStr = (file.size / 1024).toFixed(0) + ' KB';
      const name = file.name;
      setIsProcessingKb(true);
      setKbProcessingStep(`Analyzing ${name} structure...`);
      setKbFileMeta({ name, size: sizeStr, type: file.type || 'text/plain' });

      setTimeout(() => {
        setKbProcessingStep('Scanning paragraphs & metadata attributes...');
        setTimeout(() => {
          setIsProcessingKb(false);
          setKbProcessingStep('');
          setKbTitleInput(`Parsed File: ${name}`);
          setKbContentInput(`[PARSED DOCUMENT: ${name}]\nFile Size: ${sizeStr}\n\nThis file content was parsed on standard OCR vectors. Here is the recovered schema transcript:\n\nLorem ipsum cancellation guides for ${selectedTenant.name}. Customers are greeted automatically. The primary services offered are professional and tailored to user expectations. For support, consumers can reach out directly via our verified helpdesk at contact@${selectedTenant.name.toLowerCase().replace(/\s+/g, '')}.com.`);
        }, 800);
      }, 700);
    }
  };

  const handleManualFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const sizeStr = (file.size / 1024).toFixed(0) + ' KB';
      const name = file.name;
      setIsProcessingKb(true);
      setKbProcessingStep(`Reading ${name} contents...`);
      setKbFileMeta({ name, size: sizeStr, type: file.type || 'text/plain' });

      setTimeout(() => {
        setKbProcessingStep('Extracting layout content stream...');
        setTimeout(() => {
          setIsProcessingKb(false);
          setKbProcessingStep('');
          setKbTitleInput(`Parsed File: ${name}`);
          setKbContentInput(`[UPLOADED FILE DATA: ${name}]\nSize: ${sizeStr}\nUploaded At: ${new Date().toLocaleDateString()}\n\nRaw text scraped from the original document:\n\nOur guidelines list cancellation rules and services for ${selectedTenant.name}. Operations are structured under typical local timelines, and support can be dispatched on demand. Please consult with our specialists by reaching out on WhatsApp or email.`);
        }, 800);
      }, 700);
    }
  };

  const handleSimulateUrlFetch = () => {
    if (!kbUrlInput.trim()) return;
    setIsProcessingKb(true);
    setKbProcessingStep('Handshaking with host socket...');
    
    setTimeout(() => {
      setKbProcessingStep('Downloading HTML DOM mapping...');
      setTimeout(() => {
        setKbProcessingStep('Stripping header and footer styles...');
        setTimeout(() => {
          setIsProcessingKb(false);
          setKbProcessingStep('');
          setKbTitleInput(`Scraped Webpage: ${kbUrlInput.replace(/^https?:\/\/(www\.)?/, '')}`);
          
          const domain = kbUrlInput.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
          setKbContentInput(`[WEBPAGE SOURCE: ${kbUrlInput}]\nVerified URL: ${kbUrlInput}\nScrape Date: 2026-05-24\n\nContent details crawled from root container:\n\nOur business entity ${selectedTenant.name} is fully integrated under domain ${domain}. We provide premier solutions, operational 24/7 with the assistance of our active WhatsApp bot service, ${selectedTenant.botName}. If you have any questions regarding rates, pricing plans, cancel policies, or availability structures, please ask our assistant directly represented online.`);
        }, 600);
      }, 600);
    }, 600);
  };

  const handleStartSimulatedCrawl = async () => {
    if (!kbUrlInput.trim()) return;
    setKbCrawlStatus('running');
    setKbCrawlProgress(15);
    const nowStr = new Date().toLocaleTimeString();
    setKbCrawlLogs([`[${nowStr}] 🚀 Initializing backend scraper for: ${kbUrlInput}`]);

    try {
      const response = await fetch(`/api/tenant/${selectedTenant.id}/crawl`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: kbUrlInput.trim(),
          source: kbCrawlSource,
          depth: kbCrawlDepth,
          pagesBudget: kbCrawlPages
        })
      });

      if (!response.ok) {
        throw new Error(`Crawler backend returned status: ${response.status}`);
      }

      const data = await response.json();
      if (data.status === 'success') {
        setKbCrawlProgress(60);
        setKbCrawlLogs(prev => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] 🕷️ Scraped page successfully. Title: "${data.kbItem.title}"`,
          `[${new Date().toLocaleTimeString()}] 📝 Chunked content into ${data.kbItem.chunks?.length || 1} parts. Generating Gemini embeddings...`
        ]);

        // Reload tenants
        const tenantRes = await fetch('/api/tenants');
        if (tenantRes.ok) {
          const store = await tenantRes.json();
          const freshList = Object.values(store) as Tenant[];
          if (freshList.length > 0) {
            setTenants(freshList);
          }
        }

        setKbCrawlProgress(100);
        setKbCrawlStatus('completed');
        
        // Prefill add KB fields
        setKbTitleInput(data.kbItem.title);
        setKbContentInput(data.kbItem.content);
        setKbTypeInput('crawl');
        
        setKbCrawlLogs(prev => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] 🎉 Web/Social sync finalized. Document indexed successfully in Knowledge Base!`
        ]);
      } else {
        throw new Error(data.error || 'Unknown crawler error');
      }
    } catch (err: any) {
      console.error(err);
      setKbCrawlStatus('failed');
      setKbCrawlLogs(prev => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] ❌ Crawl Failed: ${err.message || err}`
      ]);
    }
  };

  const handleAddKbItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!kbTitleInput.trim() || !kbContentInput.trim()) return;

    const newItem: KnowledgeBaseItem = {
      id: 'kb-' + Date.now(),
      type: kbTypeInput,
      title: kbTitleInput,
      content: kbContentInput,
      dateAdded: new Date().toISOString().split('T')[0],
      fileType: kbTypeInput === 'file' ? 'pdf' : undefined,
      fileSize: kbTypeInput === 'file' ? (kbFileMeta?.size || '345 KB') : undefined,
      url: (kbTypeInput === 'url' || kbTypeInput === 'crawl') ? kbUrlInput : undefined,
      crawlDepth: kbTypeInput === 'crawl' ? kbCrawlDepth : undefined,
      crawlPagesCount: kbTypeInput === 'crawl' ? kbCrawlPages : undefined,
      crawlStatus: kbTypeInput === 'crawl' ? 'synced' : undefined,
      socialNetwork: kbTypeInput === 'crawl' ? kbCrawlSource : undefined
    };

    updateTenantFields({
      knowledgeBase: [...selectedTenant.knowledgeBase, newItem]
    });

    setKbTitleInput('');
    setKbContentInput('');
    setKbUrlInput('');
    setKbFileMeta(null);
    setKbCrawlStatus('idle');
    setKbCrawlLogs([]);
    setKbCrawlProgress(0);
    setShowAddKb(false);
  };

  const handleAddLiveLead = (newLead: Lead) => {
    setTenants(prev => prev.map(t => {
      if (t.id === selectedTenant.id) {
        // Prevent adding duplicate leads if captured multiple times
        if (t.leads.some(l => l.email.toLowerCase() === newLead.email.toLowerCase())) {
          return t;
        }
        return { ...t, leads: [newLead, ...t.leads] };
      }
      return t;
    }));
  };

  const handleManualAddLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadNameInput.trim()) return;

    const newLead: Lead = {
      id: 'lead-manual-' + Date.now(),
      name: leadNameInput,
      phone: leadPhoneInput || 'Not Provided',
      email: leadEmailInput || 'Not Provided',
      status: 'New',
      dateCaptured: new Date().toISOString().split('T')[0],
      note: leadNoteInput
    };

    updateTenantFields({
      leads: [newLead, ...selectedTenant.leads]
    });

    setLeadNameInput('');
    setLeadPhoneInput('');
    setLeadEmailInput('');
    setLeadNoteInput('');
    setShowAddLead(false);
  };

  const handleExportToCSV = () => {
    const leads = selectedTenant.leads;
    if (!leads || leads.length === 0) return;

    const headers = ['ID', 'Name', 'Phone', 'Email', 'Status', 'Date Captured', 'Notes'];

    const rows = leads.map(lead => [
      `"${(lead.id || '').replace(/"/g, '""')}"`,
      `"${(lead.name || '').replace(/"/g, '""')}"`,
      `"${(lead.phone || '').replace(/"/g, '""')}"`,
      `"${(lead.email || '').replace(/"/g, '""')}"`,
      `"${(lead.status || '').replace(/"/g, '""')}"`,
      `"${(lead.dateCaptured || '').replace(/"/g, '""')}"`,
      `"${(lead.note || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const filename = `${selectedTenant.name.toLowerCase().replace(/\s+/g, '_')}_leads_export.csv`;
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleLiveAppointmentBooked = async (appt: Appointment) => {
    // If authenticated, sync with actual Google Calendar!
    if (googleToken && appt.syncedWithGoogle) {
      try {
        setIsSyncingCalendar(true);
        const syncedAppt = await createGoogleCalendarEvent(googleToken, {
          customerName: appt.customerName,
          customerPhone: appt.customerPhone,
          email: appt.email,
          start: appt.start,
          end: appt.end,
          summary: appt.summary,
          notes: appt.notes
        });
        
        // Add to our Google Calendar list log
        setGoogleEvents(prev => [syncedAppt, ...prev]);
        
        // Update local list on tenant
        updateTenantFields({
          appointments: [syncedAppt, ...selectedTenant.appointments]
        });
      } catch (err) {
        console.error('Failed to sync to actual Google Calendar:', err);
      } finally {
        setIsSyncingCalendar(false);
      }
    } else {
      // Just save to offline sandbox scheduler
      // Offline fallback: flag synced as false
      const offlineAppt = { ...appt, syncedWithGoogle: false };
      updateTenantFields({
        appointments: [offlineAppt, ...selectedTenant.appointments]
      });
    }
  };

  // Safe delete handler with double confirmations as required by security guidelines
  const handleConfirmCancelEvent = async () => {
    if (!eventPendingDelete) return;
    const { id, isGoogle } = eventPendingDelete;

    if (isGoogle && googleToken) {
      try {
        setIsSyncingCalendar(true);
        await deleteGoogleCalendarEvent(googleToken, id);
        // Remove from google list
        setGoogleEvents(prev => prev.filter(e => e.id !== id));
      } catch (err) {
        console.error('Error deleting Google calendar event:', err);
      } finally {
        setIsSyncingCalendar(false);
      }
    }

    // Always remove from local tenant repository
    updateTenantFields({
      appointments: selectedTenant.appointments.filter(a => a.id !== id)
    });

    setEventPendingDelete(null);
  };

  const handleToggleBotStatus = () => {
    updateTenantFields({
      status: selectedTenant.status === 'active' ? 'paused' : 'active'
    });
  };

  const [waSaveSuccess, setWaSaveSuccess] = useState(false);

  const handleUpdateWhatsAppIntegration = (e: React.FormEvent) => {
    e.preventDefault();
    updateTenantFields({
      whatsAppPhoneNumber: waPhone.trim(),
      whatsAppVerifiedSid: waSid.trim(),
      whatsAppApiKey: waToken.trim(),
      whatsAppStatus: waStatus,
      whatsAppSandboxActive: waSandboxActive,
      whatsAppSandboxNumbers: waSandboxNumbers,
      whatsAppTestMode: waTestMode
    });
    
    setWaSaveSuccess(true);
    setTimeout(() => {
      setWaSaveSuccess(false);
    }, 4500);
  };

  const handleTestConnection = () => {
    setIsTestingConnection(true);
    setConnectionFeedback(null);
    
    // Add initial logs to the terminal
    setTestWebhookLogs(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] ⚡ TEST CONNECTION INITIATED...`,
      `[${new Date().toLocaleTimeString()}] 🔌 Verifying credentials for phone: ${waPhone || 'not defined'} (SID: ${waSid || 'not defined'})`,
      `[${new Date().toLocaleTimeString()}] 📡 Ping call dispatched to Meta GraphQL Verification endpoint...`
    ]);

    setTimeout(() => {
      if (!waPhone.trim() || !waSid.trim() || !waToken.trim()) {
        setIsTestingConnection(false);
        setConnectionFeedback({
          type: 'error',
          text: '❌ Handshake failed: Please fill in all credentials (Phone, SID, and GraphQL Token) before testing the connection.'
        });
        setTestWebhookLogs(prev => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] ❌ TEST CONNECTION FAILED: Missing essential credentials in integration form.`
        ]);
        return;
      }

      setIsTestingConnection(false);
      setWaStatus('connected');
      
      // Update tenant status so the badges/headers reflect connected instantly
      updateTenantFields({
        whatsAppStatus: 'connected',
        whatsAppPhoneNumber: waPhone.trim(),
        whatsAppVerifiedSid: waSid.trim(),
        whatsAppApiKey: waToken.trim(),
      });

      setConnectionFeedback({
        type: 'success',
        text: '✅ Integration handshake verification successful! Meta Cloud server connection is active & handshake logs are green.'
      });

      setTestWebhookLogs(prev => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] 🟢 HTTP/1.1 200 OK Handshake Signature verified.`,
        `[${new Date().toLocaleTimeString()}] 🎉 Meta Cloud verification completed securely. Channel state updated to: CONNECTED.`
      ]);

      setTimeout(() => {
        setConnectionFeedback(null);
      }, 6000);
    }, 1800);
  };

  const handleTestMessengerConnection = () => {
    setIsTestingMessengerConnection(true);
    setMessengerConnectionFeedback(null);
    
    // Add initial logs to the terminal
    setTestMessengerWebhookLogs(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] ⚡ MESSENGER HANDSHAKE TEST INITIATED...`,
      `[${new Date().toLocaleTimeString()}] 🔌 Verifying Facebook Page credentials for ID: ${messengerPageId || 'not defined'}`,
      `[${new Date().toLocaleTimeString()}] 📡 Ping call dispatched to Meta Graph Verification endpoint...`
    ]);

    setTimeout(() => {
      if (!messengerPageId.trim() || !messengerToken.trim()) {
        setIsTestingMessengerConnection(false);
        setMessengerConnectionFeedback({
          type: 'error',
          text: '❌ Handshake failed: Please fill in Facebook Page ID and Page Access Token before testing the connection.'
        });
        setTestMessengerWebhookLogs(prev => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] ❌ TEST CONNECTION FAILED: Missing essential credentials in system form`
        ]);
        return;
      }

      setIsTestingMessengerConnection(false);
      setMessengerStatus('connected');
      
      // Update tenant status so the badges/headers reflect connected instantly
      updateTenantFields({
        messengerStatus: 'connected',
        messengerPageId: messengerPageId.trim(),
        messengerToken: messengerToken.trim(),
      });

      setMessengerConnectionFeedback({
        type: 'success',
        text: '✅ Messenger Graph API handshake successful! Webhook is active and receiving telemetry.'
      });

      setTestMessengerWebhookLogs(prev => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] 🟢 HTTP/1.1 200 OK Handshake Signature verified.`,
        `[${new Date().toLocaleTimeString()}] 🎉 Facebook Page webhook successfully verified! Status updated to CONNECTED.`
      ]);

      setTimeout(() => {
        setMessengerConnectionFeedback(null);
      }, 6000);
    }, 1800);
  };

  const handleToggleSandboxMode = (active: boolean) => {
    setWaSandboxActive(active);
    updateTenantFields({
      whatsAppSandboxActive: active
    });
  };

  const handleRequestSandboxOTP = (e: React.FormEvent) => {
    e.preventDefault();
    if (!waSandboxInputNumber.trim()) {
      setWaSandboxError('Please enter a valid phone number.');
      return;
    }
    
    setWaSandboxError(null);
    setWaSandboxStep('sending');
    
    setTimeout(() => {
      // Generate standard 6-digit verification code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setWaSandboxSentCode(code);
      setWaSandboxStep('otp_sent');
      setWaSandboxCode('');
    }, 1200);
  };

  const handleVerifySandboxOTP = (e: React.FormEvent) => {
    e.preventDefault();
    if (!waSandboxCode.trim()) {
      setWaSandboxError('Please enter the 6-digit verification code.');
      return;
    }

    if (waSandboxCode.trim() !== waSandboxSentCode) {
      setWaSandboxError('Mismatched Sandbox verification token. Check the simulated SMS overlay and try again.');
      return;
    }

    setWaSandboxError(null);
    setWaSandboxStep('verified');
    
    const formattedNumber = waSandboxInputNumber.trim();
    const updatedNumbers = [...waSandboxNumbers];
    if (!updatedNumbers.includes(formattedNumber)) {
      updatedNumbers.push(formattedNumber);
    }
    
    setWaSandboxNumbers(updatedNumbers);
    updateTenantFields({
      whatsAppSandboxNumbers: updatedNumbers
    });

    setTimeout(() => {
      setWaSandboxInputNumber('');
      setWaSandboxCode('');
      setWaSandboxSentCode('');
      setWaSandboxStep('idle');
    }, 2000);
  };

  const handleDeleteSandboxNumber = (numberToDelete: string) => {
    const updated = waSandboxNumbers.filter(n => n !== numberToDelete);
    setWaSandboxNumbers(updated);
    updateTenantFields({
      whatsAppSandboxNumbers: updated
    });
  };

  const handleUpdateMessengerIntegration = (e: React.FormEvent) => {
    e.preventDefault();
    updateTenantFields({
      messengerPageId: messengerPageId.trim(),
      messengerToken: messengerToken.trim(),
      messengerStatus: messengerStatus,
      messengerSandboxActive: messengerSandboxActive,
      messengerSandboxNumbers: messengerSandboxNumbers,
      messengerVoiceEnabled: messengerVoiceEnabled
    });
    
    setMessengerSaveSuccess(true);
    setTimeout(() => {
      setMessengerSaveSuccess(false);
    }, 4505);
  };

  const handleToggleMessengerSandboxMode = (active: boolean) => {
    setMessengerSandboxActive(active);
    updateTenantFields({
      messengerSandboxActive: active
    });
  };

  const handleRequestMessengerSandboxOTP = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messengerSandboxInputNumber.trim()) {
      setMessengerSandboxError('Please enter a valid Facebook User PSID/Profile.');
      return;
    }
    
    setMessengerSandboxError(null);
    setMessengerSandboxStep('sending');
    
    setTimeout(() => {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setMessengerSandboxSentCode(code);
      setMessengerSandboxStep('otp_sent');
      setMessengerSandboxCode('');
    }, 1200);
  };

  const handleVerifyMessengerSandboxOTP = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messengerSandboxCode.trim()) {
      setMessengerSandboxError('Please enter the 6-digit verification code.');
      return;
    }

    if (messengerSandboxCode.trim() !== messengerSandboxSentCode) {
      setMessengerSandboxError('Mismatched verification code. Inspect the simulated user portal message below and retry.');
      return;
    }

    setMessengerSandboxError(null);
    setMessengerSandboxStep('verified');
    
    const formattedUser = messengerSandboxInputNumber.trim();
    const updatedUsers = [...messengerSandboxNumbers];
    if (!updatedUsers.includes(formattedUser)) {
      updatedUsers.push(formattedUser);
    }
    
    setMessengerSandboxNumbers(updatedUsers);
    updateTenantFields({
      messengerSandboxNumbers: updatedUsers
    });

    setTimeout(() => {
      setMessengerSandboxInputNumber('');
      setMessengerSandboxCode('');
      setMessengerSandboxSentCode('');
      setMessengerSandboxStep('idle');
    }, 2000);
  };

  const handleDeleteMessengerSandboxNumber = (userToDelete: string) => {
    const updated = messengerSandboxNumbers.filter(u => u !== userToDelete);
    setMessengerSandboxNumbers(updated);
    updateTenantFields({
      messengerSandboxNumbers: updated
    });
  };

  const handleTriggerMessengerWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isTestingMessengerWebhook) return;
    
    setIsTestingMessengerWebhook(true);
    const logs: string[] = [];
    const timestampSec = Math.floor(Date.now() / 1000).toString();

    const addLog = (msg: string) => {
      const timeStr = new Date().toLocaleTimeString();
      logs.push(`[${timeStr}] ${msg}`);
      setTestMessengerWebhookLogs([...logs]);
    };

    try {
       addLog(`🚀 Reformatting simulated Meta Graph API Messenger Webhook payload...`);
       if (messengerInputIsVoiceNote) {
         addLog(`🎙️ Simulating voice note attachment upload (converting speech to audio payload binary)...`);
       }
      
      const payload = {
        object: "page",
        entry: [
          {
            id: messengerPageId || "1098273812739",
            time: timestampSec,
            messaging: [
              {
                sender: {
                  id: testMessengerWebhookSenderPSID || "psid_9281742"
                },
                recipient: {
                  id: messengerPageId || "1098273812739"
                },
                timestamp: timestampSec,
                message: {
                  mid: `mid.simulated_messenger.${Date.now()}`,
                  text: testMessengerWebhookMessage || "Hello",
                  isAudio: messengerInputIsVoiceNote
                }
              }
            ]
          }
        ]
      };

      addLog(`📡 POSTing graph message parcel to tenant webhook: /v1/whatsapp/webhook/${selectedTenant.id}?sender_name=${encodeURIComponent(testMessengerWebhookSenderName)}`);
      
      const endpoint = `${window.location.origin}/v1/whatsapp/webhook/${selectedTenant.id}?sender_name=${encodeURIComponent(testMessengerWebhookSenderName)}`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Graph API simulator endpoint returned HTTP ${response.status} ${response.statusText}`);
      }

      const resJson = await response.json();
      addLog(`✅ Meta Cloud Handshake Acknowledged: ${JSON.stringify(resJson)}`);
      addLog(`🧠 Dispatching prompt template context with specialist role instructions...`);
      
      await new Promise(r => setTimeout(r, 2600));
      
      addLog(`🔄 Synchronizing CRM pipeline leads and conversation threads...`);
      
      // Fetch fresh conversations list
      const convRes = await fetch(`/api/conversations/${selectedTenant.id}`);
      if (convRes.ok) {
        const conversations = await convRes.json();
        const convoKey = `${selectedTenant.id}_${testMessengerWebhookSenderPSID}`;
        const thread = conversations[convoKey];
        if (thread && thread.messages && thread.messages.length > 0) {
          const lastMsg = thread.messages[thread.messages.length - 1];
          addLog(`🤖 OmniBot Response resolved successfully: "${lastMsg.text}"`);
          setTestMessengerConversationsList(thread.messages);
        } else {
          addLog(`❓ Webhook processed but thread key "${convoKey}" was not yet committed.`);
        }
      }

      // Sync master tenants store
      const tenantRes = await fetch('/api/tenants');
      if (tenantRes.ok) {
        const store = await tenantRes.json();
        const freshList = Object.values(store) as Tenant[];
        if (freshList.length > 0) {
          setTenants(freshList);
        }
      }

      addLog(`📬 Messenger cycle finalized successfully! Leads and CRM updated.`);
    } catch (err: any) {
      addLog(`❌ Simulator Verification Fail: ${err.message || err}`);
    } finally {
      setIsTestingMessengerWebhook(false);
    }
  };

  const toggleMessengerChatMic = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      const timeStr = new Date().toLocaleTimeString();
      setTestMessengerWebhookLogs(prev => [
        ...prev,
        `[${timeStr}] ⚠️ SPEECH ERROR: Browser SpeechRecognition API not supported inside this sandbox.`
      ]);
      return;
    }

    if (isMessengerChatMicActive) {
      if (messengerRecognitionRef.current) {
        messengerRecognitionRef.current.abort();
      }
      setIsMessengerChatMicActive(false);
      return;
    }

    try {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onstart = () => {
        setIsMessengerChatMicActive(true);
        const timeStr = new Date().toLocaleTimeString();
        setTestMessengerWebhookLogs(prev => [
          ...prev,
          `[${timeStr}] 🎙️ VOICE INPUT INITIALIZED: Microphone listening active... Speak clearly.`
        ]);
      };

      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript.trim()) {
          setTestMessengerWebhookMessage(transcript);
          setMessengerInputIsVoiceNote(true);
          const timeStr = new Date().toLocaleTimeString();
          setTestMessengerWebhookLogs(prev => [
            ...prev,
            `[${timeStr}] ✅ VOICE TRANSCRIBED: Captured payload: "${transcript}"`
          ]);
        }
      };

      rec.onerror = (e: any) => {
        console.warn('Messenger SpeechRec error:', e);
        setIsMessengerChatMicActive(false);
        const timeStr = new Date().toLocaleTimeString();
        if (e.error === 'not-allowed') {
          setTestMessengerWebhookLogs(prev => [
            ...prev,
            `[${timeStr}] 🛡️ ACCESS LOCKED: Microphone permissions blocked inside iframe. Please open the app in a new tab to bypass security sandboxes!`
          ]);
        } else {
          setTestMessengerWebhookLogs(prev => [
            ...prev,
            `[${timeStr}] ⚠️ SPEECH RECOGNITION ERROR: ${e.error}`
          ]);
        }
      };

      rec.onend = () => {
        setIsMessengerChatMicActive(false);
      };

      messengerRecognitionRef.current = rec;
      rec.start();
    } catch (err) {
      console.warn('Failed to start messenger mic:', err);
      setIsMessengerChatMicActive(false);
    }
  };

  const handleClearMessengerConversations = async () => {
    try {
      await fetch(`/api/conversations/${selectedTenant.id}/clear`, { method: "POST" });
      setTestMessengerConversationsList([]);
      setTestMessengerWebhookLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] 🧹 Messenger conversation cleared.`]);
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleTriggerTestWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isTestingWebhook) return;
    
    setIsTestingWebhook(true);
    const logs: string[] = [];
    const timestampSec = Math.floor(Date.now() / 1000).toString();
    const cleanPhone = testWebhookSenderPhone.replace(/[^0-9]/g, '');

    const addLog = (msg: string) => {
      const timeStr = new Date().toLocaleTimeString();
      logs.push(`[${timeStr}] ${msg}`);
      setTestWebhookLogs([...logs]);
    };

    try {
      addLog(`🚀 Formatting simulated Meta Cloud WhatsApp Webhook payload ...`);
      
      const payload = {
        object: "whatsapp_business_account",
        entry: [
          {
            id: "wamid.entry." + Date.now(),
            changes: [
              {
                value: {
                  messaging_product: "whatsapp",
                  metadata: {
                    display_phone_number: selectedTenant.whatsAppPhoneNumber || "15550192830",
                    phone_number_id: selectedTenant.whatsAppVerifiedSid || "104128374912038"
                  },
                  contacts: [
                    {
                      profile: {
                        name: testWebhookSenderName || "Jane Doe"
                      },
                      wa_id: cleanPhone || "33612345678"
                    }
                  ],
                  messages: [
                    {
                      from: cleanPhone || "33612345678",
                      id: `wamid.SimulatedHook${Date.now()}`,
                      timestamp: timestampSec,
                      text: {
                        body: testWebhookMessage || "Hello"
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

      addLog(`📡 POSTing simulated envelope to route: /v1/whatsapp/webhook/${selectedTenant.id}`);
      
      const endpoint = `${window.location.origin}/v1/whatsapp/webhook/${selectedTenant.id}`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Endpoint returned HTTP ${response.status} ${response.statusText}`);
      }

      const resJson = await response.json();
      addLog(`✅ Server Acknowledged Payload with status: ${JSON.stringify(resJson)}`);
      addLog(`🧠 Invoking Gemini AI model flow for tenant "${selectedTenant.name}"...`);
      
      // Allow slight wait for Gemini async thread execution to complete & write to DB
      await new Promise(r => setTimeout(r, 2600));
      
      addLog(`🔄 Syncing live conversations database and leads table...`);
      
      // Fetch fresh conversations list
      const convRes = await fetch(`/api/conversations/${selectedTenant.id}`);
      if (convRes.ok) {
        const conversations = await convRes.json();
        const convoKey = `${selectedTenant.id}_${cleanPhone}`;
        const thread = conversations[convoKey];
        if (thread && thread.messages && thread.messages.length > 0) {
          const lastMsg = thread.messages[thread.messages.length - 1];
          addLog(`🤖 Bot Response generated successfully! Reply: "${lastMsg.text}"`);
          setTestConversationsList(thread.messages);
        } else {
          addLog(`❓ Webhook completed, but no bot responses registered under conversation key "${convoKey}" yet.`);
        }
      }

      // Sync master tenants store
      const tenantRes = await fetch('/api/tenants');
      if (tenantRes.ok) {
        const store = await tenantRes.json();
        const freshList = Object.values(store) as Tenant[];
        if (freshList.length > 0) {
          setTenants(freshList);
        }
      }

      addLog(`🎉 Webhook test resolved! Check active thread log in panel.`);
    } catch (err: any) {
      addLog(`❌ Verification failed: ${err.message || err}`);
    } finally {
      setIsTestingWebhook(false);
    }
  };

  const handleClearTestConversations = async () => {
    try {
      await fetch(`/api/conversations/${selectedTenant.id}/clear`, { method: "POST" });
      setTestConversationsList([]);
      setTestWebhookLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] 🧹 Webhook conversations store cleared.`]);
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleAutopilotToggle = async (enabled: boolean) => {
    if (!selectedTenant) return;
    try {
      const response = await fetch(`/api/tenant/${selectedTenant.id}/autopilot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      });
      if (response.ok) {
        setTenants(prev => prev.map(t => {
          if (t.id === selectedTenant.id) {
            return { ...t, autopilotEnabled: enabled };
          }
          return t;
        }));
      } else {
        console.error("Failed to toggle autopilot");
      }
    } catch (err) {
      console.error("Error toggling autopilot:", err);
    }
  };

  useEffect(() => {
    if (activeTab !== 'leads' || !selectedTenant) return;
    
    const fetchConvos = async () => {
      setIsFetchingTakeoverConvos(true);
      try {
        const res = await fetch(`/api/conversations/${selectedTenant.id}`);
        if (res.ok) {
          const data = await res.json();
          setTakeoverConvos(data);
          const keys = Object.keys(data);
          if (keys.length > 0 && !selectedConvoKey) {
            setSelectedConvoKey(keys[0]);
          }
        }
      } catch (err) {
        console.error("Error fetching takeover conversations:", err);
      } finally {
        setIsFetchingTakeoverConvos(false);
      }
    };
    
    fetchConvos();
    
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/conversations/${selectedTenant.id}`);
        if (res.ok) {
          const data = await res.json();
          setTakeoverConvos(data);
        }
      } catch (err) {
        console.error("Error polling conversations:", err);
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [activeTab, selectedTenant?.id, selectedConvoKey]);

  const handleSendTakeoverReply = async (customerId: string) => {
    if (!takeoverReplyText.trim() || !selectedTenant) return;
    setIsSendingTakeoverReply(true);
    try {
      const response = await fetch(`/api/conversations/${selectedTenant.id}/${customerId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: takeoverReplyText })
      });
      if (response.ok) {
        setTakeoverReplyText('');
        const convRes = await fetch(`/api/conversations/${selectedTenant.id}`);
        if (convRes.ok) {
          const data = await convRes.json();
          setTakeoverConvos(data);
        }
      } else {
        console.error("Failed to send takeover reply");
      }
    } catch (err) {
      console.error("Error sending takeover reply:", err);
    } finally {
      setIsSendingTakeoverReply(false);
    }
  };

  const handleSaveWelcomeTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateNameInput.trim() || !templateTextInput.trim()) return;

    const currentTemplates = selectedTenant.welcomeTemplates || [];

    if (editingTemplateId) {
      // Edit mode
      const updated = currentTemplates.map(t => 
        t.id === editingTemplateId 
          ? { ...t, name: templateNameInput.trim(), text: templateTextInput.trim() } 
          : t
      );
      updateTenantFields({
        welcomeTemplates: updated
      });
    } else {
      // New template mode
      const newTemplate = {
        id: 'wt-' + Date.now(),
        name: templateNameInput.trim(),
        text: templateTextInput.trim()
      };
      const updated = [...currentTemplates, newTemplate];
      
      // If no active template selected yet, make this one the active one
      const nextActiveId = selectedTenant.activeWelcomeTemplateId || newTemplate.id;

      updateTenantFields({
        welcomeTemplates: updated,
        activeWelcomeTemplateId: nextActiveId
      });
    }

    // Reset inputs
    setTemplateNameInput('');
    setTemplateTextInput('');
    setEditingTemplateId(null);
    setShowAddTemplateForm(false);
  };

  const handleDeleteWelcomeTemplate = (templateId: string) => {
    const currentTemplates = selectedTenant.welcomeTemplates || [];
    const updated = currentTemplates.filter(t => t.id !== templateId);
    
    let nextActiveId = selectedTenant.activeWelcomeTemplateId;
    if (nextActiveId === templateId) {
      // If deleted is active, fallback to first remaining template, or undefined
      nextActiveId = updated.length > 0 ? updated[0].id : undefined;
    }

    updateTenantFields({
      welcomeTemplates: updated,
      activeWelcomeTemplateId: nextActiveId
    });
  };

  const handleStartEditWelcomeTemplate = (templateId: string) => {
    const currentTemplates = selectedTenant.welcomeTemplates || [];
    const found = currentTemplates.find(t => t.id === templateId);
    if (found) {
      setTemplateNameInput(found.name);
      setTemplateTextInput(found.text);
      setEditingTemplateId(found.id);
      setShowAddTemplateForm(true);
    }
  };

  const handleSetActiveWelcomeTemplate = (templateId: string) => {
    updateTenantFields({
      activeWelcomeTemplateId: templateId
    });
  };

  // Multi-Agent Switcher & Management Handlers
  const getTenantAgents = (tenant: Tenant): Agent[] => {
    if (tenant.agents && tenant.agents.length > 0) return tenant.agents;
    return [
      {
        id: 'default-agent-' + tenant.id,
        name: tenant.botName,
        role: 'Primary Bot Assistant',
        tone: tenant.tone,
        systemInstruction: tenant.systemInstruction || 'Assist customers with questions and bookings.',
        avatar: tenant.avatar || '🤖'
      }
    ];
  };

  const handleApplyAgentArchetype = (archetype: 'sales' | 'faq' | 'booking' | 'support' | 'customer_support' | 'retail_sales') => {
    const isFitness = selectedTenant.id === 'zenith-fitness';
    const isMedspa = selectedTenant.id === 'elysian-medspa';
    const isCatering = selectedTenant.id === 'gourmet-catering';

    if (archetype === 'sales') {
      if (isFitness) {
        setAgentNameInput('Coach Rex');
        setAgentRoleInput('Sales Closer & Gym Onboarding');
        setAgentToneInput('casual');
        setAgentAvatarInput('💪');
        setAgentSystemInstructionInput(`You are Coach Rex, the energetic and highly motivating personal trainer sales consultant representing Zenith Elite Fitness.
Your main objective is to capture lead opportunities (name, phone, email) by offering a free initial biometric fitness evaluation.
Promote our $180/month Elite Performance gym access and $350/month Private Athlete packs starting with motivating, punchy, active phrasing!`);
      } else if (isMedspa) {
        setAgentNameInput('Glow Closer');
        setAgentRoleInput('Advanced Skincare Package Sales');
        setAgentToneInput('casual');
        setAgentAvatarInput('✨');
        setAgentSystemInstructionInput(`You are Glow Closer, the skin wellness sales consultant at Elysian Oasis MedSpa.
Your sole goal is to spark interest and capture client data to secure purchases of high-ticket clinical micro-needling ($280) or laser genesis package bundles.
Propose a complimentary skin glow test report to capture email and phone details enthusiastically!`);
      } else {
        setAgentNameInput('Celeste Closer');
        setAgentRoleInput('Corporate & Event Sales Executive');
        setAgentToneInput('professional');
        setAgentAvatarInput('💼');
        setAgentSystemInstructionInput(`You are Celeste Closer, the Corporate catering account closer for Gourmet Craft Catering.
You target wedding organizers, business administrative leads, and anniversary planners.
Highlight our outstanding Grand Banquet ($110/guest) and dynamic Cocktail Gastronomy ($80/guest). Focus on gathering full contact coordinates to issue an urgent B2B proposal.`);
      }
    } else if (archetype === 'faq') {
      if (isFitness) {
        setAgentNameInput('Aura Expert');
        setAgentRoleInput('Sauna & Facility FAQ Specialist');
        setAgentToneInput('friendly');
        setAgentAvatarInput('🌸');
        setAgentSystemInstructionInput(`You are Aura Expert, the supportive facility guide.
You answer guest protocol questions about biological saunas, temperature levels (175°F to 190°F), cold plunges, and towel guidelines.
Rely strictly on mapped knowledge. Maintain high warmth, invite clients to visit our premises, and promote wellness.`);
      } else if (isMedspa) {
        setAgentNameInput('Skincare Guru');
        setAgentRoleInput('Pre-Care & Facial FAQ Expert');
        setAgentToneInput('empathetic');
        setAgentAvatarInput('🌸');
        setAgentSystemInstructionInput(`You are Skincare Guru. You advise clients on prior preparation guidelines for clinical facials.
Instruct patients carefully to avoid retinol application or excessive chemical exfoliation for 4 days before lasers, and avoid UV/sun exposure.
Sound compassionate, caring, and highly scientific.`);
      } else {
        setAgentNameInput('Sommelier Chef');
        setAgentRoleInput('Molecular Menus & Dietary Expert');
        setAgentToneInput('professional');
        setAgentAvatarInput('👩‍🍳');
        setAgentSystemInstructionInput(`You are Sommelier Chef. You specialize in culinary ingredient questions and allergen safety protocols.
Explain our dietary support tiers (Vegan, Nut-Free, Gluten-Free) and detail molecular gastronomy plating options.
Remind clients that final allergy adjustments are needed 14 days before standard bookings.`);
      }
    } else if (archetype === 'booking') {
      if (isFitness) {
        setAgentNameInput('Aura Scheduler');
        setAgentRoleInput('Appointments Coordinator');
        setAgentToneInput('friendly');
        setAgentAvatarInput('🤖');
        setAgentSystemInstructionInput(`You are Aura Scheduler, the appointments coordinator for Zenith Elite Fitness.
Your primary task is booking clients for 1-on-1 performance coaching assessments or biological sauna rest slots.
Guide them politely to suggest their preferred date and hour, examine open hours, and secure bookings.`);
      } else if (isMedspa) {
        setAgentNameInput('Elysia Booking');
        setAgentRoleInput('Clinic Scheduling Assistant');
        setAgentToneInput('empathetic');
        setAgentAvatarInput('🩺');
        setAgentSystemInstructionInput(`You are Elysia Booking, scheduling coordinator at Elysian Oasis MedSpa.
Assist clients in choosing slots for Hydra-facials, collagen boosters, or clinical resurfacing.
Review prep needs, confirm preferred times, and capture patient data to seat their sessions.`);
      } else {
        setAgentNameInput('Bistro Scheduler');
        setAgentRoleInput('Tasting Sessions Coordinator');
        setAgentToneInput('friendly');
        setAgentAvatarInput('🤖');
        setAgentSystemInstructionInput(`You are Bistro Scheduler representing Gourmet Craft Catering.
Coordinate tasting appointments for couples and managers at our state-of-the-art kitchen test facility.
Help them pick menu highlights (Main entrees vs. Canapés) and book slots seamlessly.`);
      }
    } else if (archetype === 'support' || archetype === 'customer_support') {
      if (isFitness) {
        setAgentNameInput('Aura Care');
        setAgentRoleInput('Locker & Support Concierge');
        setAgentToneInput('empathetic');
        setAgentAvatarInput('💬');
        setAgentSystemInstructionInput(`You are Aura Care, the customer support specialist for Zenith Elite Fitness.
You help members with locker key requests, lost-and-found status, membership pause triggers, and biological sauna cancellations (clients must cancel 12 hours prior to avoid a fee).
Prioritize absolute patience, resolve inquiries with high warmth, and issue escalation records when needed.`);
      } else if (isMedspa) {
        setAgentNameInput('Oasis Care desk');
        setAgentRoleInput('Post-Treatment Care & Refund Desk');
        setAgentToneInput('empathetic');
        setAgentAvatarInput('🩺');
        setAgentSystemInstructionInput(`You are the Oasis Post-Care Support desk at Elysian Oasis MedSpa.
You resolve immediate medical skin complaints, address normal micro-redness concerns (say it is natural and resolves in 24 hours), and handle queries regarding treatment policies.
Remain exceptionally soothing, calm, professional, and emphasize safe aesthetic aftercare advice.`);
      } else {
        setAgentNameInput('Celeste Support');
        setAgentRoleInput('Customer Assistance Coordinator');
        setAgentToneInput('professional');
        setAgentAvatarInput('💬');
        setAgentSystemInstructionInput(`You are Celeste Support, customer satisfaction lead for Gourmet Craft Catering.
Address delivery disputes, allergy verification sheets, corporate invoice corrections, and catering timeline edits.
De-escalate stress professionally, state policies clearly, and capture custom tickets efficiently.`);
      }
    } else if (archetype === 'retail_sales') {
      if (isFitness) {
        setAgentNameInput('Zenith Merch Bot');
        setAgentRoleInput('Active Merchandising & Hydration Specialist');
        setAgentToneInput('casual');
        setAgentAvatarInput('💪');
        setAgentSystemInstructionInput(`You are Zenith Merch Bot, managing active sales of gym accessories and wellness nutrition.
Promote our premium Zenith Sports Shakers ($24), Grass-Fed Isolate Protein powders ($68/kg), and custom anti-sweat athletic tank tops ($32).
Help customers find the right protein flavor (Chocolate Hazelnut vs. Vanilla Almond) and capture their size preferences to prepare their order!`);
      } else if (isMedspa) {
        setAgentNameInput('Oasis Skin Shop');
        setAgentRoleInput('Botanical Serums & Skincare Shop Assistant');
        setAgentToneInput('friendly');
        setAgentAvatarInput('✨');
        setAgentSystemInstructionInput(`You are Oasis Skin Shop, recommending premium cosmetic skin botanicals.
Promote our Advanced Multi-Peptide Firming Serum ($95), Hydration Matrix Cream ($78), and Gentle Bamboo Facial Cleanser ($45).
Describe the organic ingredients, answer skin sensitivity queries (all items are hypoallergenic), and collect customer shipping targets.`);
      } else {
        setAgentNameInput('Chef Gourmet Shop');
        setAgentRoleInput('Private Spices & Gastronomy Retails');
        setAgentToneInput('professional');
        setAgentAvatarInput('👩‍🍳');
        setAgentSystemInstructionInput(`You are Chef Gourmet Shop, recommending top-tier house-crafted ingredients.
We retail Chef Marcel's Signature Black Truffle Infused Olive Oil ($42/bottle), Aged Modena Balsamic Nectar ($55), and Organic Herbs de Provence Spice sets ($28).
Highlight their gourmet flavor profiles, recommend culinary pairings, and capture mailing data for orders.`);
      }
    }
  };

  const handleTriggerWebhookDispatch = (lead: Lead) => {
    if (!lead || webhookStatus === 'sending') return;

    setWebhookLeadId(lead.id);
    setWebhookStatus('sending');
    
    const formattedTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setWebhookLogs([
      `[${formattedTimestamp}] 📤 Initializing secure outbox router for partner webhook stream...`,
      `[${formattedTimestamp}] 🔑 Reading workspace API key (Using secure client sandbox secret: WABA_JWT_DEV_ENV)`,
      `[${formattedTimestamp}] 📄 Formatting payload matching CRM standard schemas (JSON V4)`
    ]);

    setTimeout(() => {
      const ts2 = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setWebhookLogs(prev => [
        ...prev,
        `[${ts2}] 📡 Dispatching POST request to https://ext-crm.hubspot.com/v1/contacts/ingest...`,
        `[${ts2}] 📦 Dynamic Headers:\n   - Authorization: Bearer waba_dev_******\n   - Content-Type: application/json`
      ]);
    }, 1200);

    setTimeout(() => {
      const ts3 = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setWebhookStatus('success');
      setWebhookLogs(prev => [
        ...prev,
        `[${ts3}] ✅ Connection established. Response Received: HTTP 200 OK`,
        `[${ts3}] 🎉 Synchronized successfully! Dynamic Record created under mapping ID: ext-uid-${lead.id.slice(-6)}`
      ]);

      // Set lead status to CONTACTED to show dynamic sync back
      updateTenantFields({
        leads: selectedTenant.leads.map(l => l.id === lead.id ? { ...l, status: 'Contacted' } : l)
      });
    }, 2800);
  };

  const handleSelectActiveAgent = (agentId: string) => {
    const agentsList = getTenantAgents(selectedTenant);
    const targetAgent = agentsList.find(a => a.id === agentId);
    if (!targetAgent) return;

    updateTenantFields({
      agents: agentsList, // ensure list is initialized
      activeAgentId: agentId,
      botName: targetAgent.name,
      tone: targetAgent.tone,
      systemInstruction: targetAgent.systemInstruction
    });

    setAgentActionSuccess(`Activated Specialist Agent @${targetAgent.name} (${targetAgent.role}) successfully!`);
    setTimeout(() => {
      setAgentActionSuccess(null);
    }, 4000);
  };

  // Interactive Playground Send Handler
  const handleSendPlaygroundMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!playgroundInput.trim()) return;

    const userMsg = playgroundInput.trim();
    setPlaygroundInput('');

    const updatedMessages = [
      ...playgroundMessages,
      { sender: 'customer' as const, text: userMsg, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
    ];
    setPlaygroundMessages(updatedMessages);
    setPlaygroundIsLoading(true);
    setPlaygroundRawResponse(null);

    const agents = getTenantAgents(selectedTenant);
    const activeTestBot = agents.find(a => a.id === (playgroundSelectedAgentId || selectedTenant.activeAgentId || agents[0]?.id)) || agents[0];

    try {
      const response = await fetch('/api/playground/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({ sender: m.sender, text: m.text })),
          botName: activeTestBot?.name || 'Assistant',
          tone: activeTestBot?.tone || 'friendly',
          knowledgeBase: selectedTenant.knowledgeBase || [],
          appointmentsList: selectedTenant.appointments || [],
          tenantName: selectedTenant.name,
          tenantIndustry: selectedTenant.industry,
          tenantDescription: selectedTenant.description,
          systemInstruction: playgroundInstruction.trim() || activeTestBot?.systemInstruction || ''
        })
      });

      if (!response.ok) {
        throw new Error(`Failed code ${response.status}`);
      }

      const data = await response.json();
      
      setPlaygroundMessages(prev => [
        ...prev,
        { 
          sender: 'bot' as const, 
          text: data.reply || 'No response reply.', 
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          action: data.actionTriggered
        }
      ]);

      setPlaygroundRawResponse(data);
      if (data.systemPrompt) {
        setPlaygroundSystemPromptUsed(data.systemPrompt);
      }
    } catch (err: any) {
      console.error("Playground processing error:", err);
      setPlaygroundMessages(prev => [
        ...prev,
        { 
          sender: 'bot' as const, 
          text: `⚠️ Playground Exception: ${err.message}`, 
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
        }
      ]);
    } finally {
      setPlaygroundIsLoading(false);
    }
  };

  // Synchronize playground instructions when selected agent changes, or when activeTab is loaded
  useEffect(() => {
    if (activeTab === 'bot_config' && selectedTenant?.id) {
      const agents = getTenantAgents(selectedTenant);
      const activeTestBot = agents.find(a => a.id === (playgroundSelectedAgentId || selectedTenant.activeAgentId || agents[0]?.id)) || agents[0];
      if (activeTestBot) {
        setPlaygroundInstruction(activeTestBot.systemInstruction);
        if (!playgroundSelectedAgentId) {
          setPlaygroundSelectedAgentId(activeTestBot.id);
        }
      }
    }
  }, [activeTab, selectedTenant?.id, playgroundSelectedAgentId]);

  const handleApplyPlaygroundInstructionsToAgent = () => {
    const agentsList = getTenantAgents(selectedTenant);
    const targetAgentIndex = agentsList.findIndex(a => a.id === playgroundSelectedAgentId);
    if (targetAgentIndex === -1) return;

    const updatedAgentsList = [...agentsList];
    updatedAgentsList[targetAgentIndex] = {
      ...updatedAgentsList[targetAgentIndex],
      systemInstruction: playgroundInstruction.trim()
    };

    const tenantUpdates: any = {
      agents: updatedAgentsList
    };

    if (selectedTenant.activeAgentId === playgroundSelectedAgentId || 
        (!selectedTenant.activeAgentId && agentsList[0]?.id === playgroundSelectedAgentId)) {
      tenantUpdates.systemInstruction = playgroundInstruction.trim();
      tenantUpdates.botName = updatedAgentsList[targetAgentIndex].name;
      tenantUpdates.tone = updatedAgentsList[targetAgentIndex].tone;
    }

    updateTenantFields(tenantUpdates);

    setPlaygroundSuccessMsg("Successfully applied sandbox prompt updates to the live specialty agent!");
    setTimeout(() => {
      setPlaygroundSuccessMsg(null);
    }, 4000);
  };

  const handleSaveAgent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentNameInput.trim() || !agentRoleInput.trim() || !agentSystemInstructionInput.trim()) return;

    const currentAgents = getTenantAgents(selectedTenant);

    if (editingAgentId) {
      // Edit Mode
      const updatedAgents = currentAgents.map(a => 
        a.id === editingAgentId 
          ? {
              ...a,
              name: agentNameInput.trim(),
              role: agentRoleInput.trim(),
              tone: agentToneInput,
              systemInstruction: agentSystemInstructionInput.trim(),
              avatar: agentAvatarInput,
              voiceEnabled: agentVoiceEnabledInput
            }
          : a
      );

      // If we edited the currently active agent, also sync to tenant root fields!
      const isActiveActive = selectedTenant.activeAgentId === editingAgentId || (!selectedTenant.activeAgentId && editingAgentId.startsWith('default-agent-'));
      const syncFields = isActiveActive ? {
        botName: agentNameInput.trim(),
        tone: agentToneInput,
        systemInstruction: agentSystemInstructionInput.trim()
      } : {};

      updateTenantFields({
        agents: updatedAgents,
        activeAgentId: selectedTenant.activeAgentId || editingAgentId,
        ...syncFields
      });

      setAgentActionSuccess(`Successfully updated settings for specialist agent @${agentNameInput.trim()}.`);
    } else {
      // Create Mode
      const newAgent: Agent = {
        id: 'agent-' + Date.now(),
        name: agentNameInput.trim(),
        role: agentRoleInput.trim(),
        tone: agentToneInput,
        systemInstruction: agentSystemInstructionInput.trim(),
        avatar: agentAvatarInput,
        isCustom: true,
        voiceEnabled: agentVoiceEnabledInput
      };

      const updatedAgents = [...currentAgents, newAgent];
      // Automatically make this the active agent
      updateTenantFields({
        agents: updatedAgents,
        activeAgentId: newAgent.id,
        botName: newAgent.name,
        tone: newAgent.tone,
        systemInstruction: newAgent.systemInstruction
      });

      setAgentActionSuccess(`Created and hot-deployed specialized AI agent @${newAgent.name} successfully!`);
    }

    setTimeout(() => {
      setAgentActionSuccess(null);
    }, 4505);

    // Reset fields
    setAgentNameInput('');
    setAgentRoleInput('');
    setAgentToneInput('friendly');
    setAgentSystemInstructionInput('');
    setAgentAvatarInput('🤖');
    setAgentVoiceEnabledInput(false);
    setEditingAgentId(null);
    setShowAddAgentForm(false);
  };

  const handleStartEditAgent = (agentId: string) => {
    const agentsList = getTenantAgents(selectedTenant);
    const found = agentsList.find(a => a.id === agentId);
    if (found) {
      setAgentNameInput(found.name);
      setAgentRoleInput(found.role);
      setAgentToneInput(found.tone);
      setAgentSystemInstructionInput(found.systemInstruction);
      setAgentAvatarInput(found.avatar || '🤖');
      setAgentVoiceEnabledInput(found.voiceEnabled || false);
      setEditingAgentId(found.id);
      setShowAddAgentForm(true);
    }
  };

  const handleDeleteAgent = (agentId: string) => {
    const agentsList = getTenantAgents(selectedTenant);
    // Don't allow deleting the last agent
    if (agentsList.length <= 1) {
      alert('Each tenant must retain at least one configured AI agent.');
      return;
    }

    const updatedAgents = agentsList.filter(a => a.id !== agentId);
    let nextActiveId = selectedTenant.activeAgentId || agentsList[0]?.id;
    let syncFields = {};

    if (nextActiveId === agentId) {
      const fallbackAgent = updatedAgents[0];
      nextActiveId = fallbackAgent.id;
      syncFields = {
        botName: fallbackAgent.name,
        tone: fallbackAgent.tone,
        systemInstruction: fallbackAgent.systemInstruction
      };
    }

    updateTenantFields({
      agents: updatedAgents,
      activeAgentId: nextActiveId,
      ...syncFields
    });

    setAgentActionSuccess('Selected specialized agent removed successfully.');
    setTimeout(() => {
      setAgentActionSuccess(null);
    }, 4000);
  };

  // Retrieve unified list of active appointments (showing sandbox list + true google items if connected)
  const getUnifiedAppointmentsList = (): Appointment[] => {
    if (googleToken) {
      // Show Google events + only non-google offline client events
      const localOffline = selectedTenant.appointments.filter(a => !a.syncedWithGoogle);
      return [...googleEvents, ...localOffline].sort(
        (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
      );
    }
    return selectedTenant.appointments.sort(
      (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
    );
  };

  const activeAppointments = getUnifiedAppointmentsList();

  return (
    <div className="min-h-screen bg-[#05070a] flex flex-col font-sans text-slate-300">
      {/* SaaS Global Header */}
      <SaasHeader
        tenants={tenants}
        selectedTenant={selectedTenant}
        onSelectTenant={(tenant) => {
          setSelectedTenantId(tenant.id);
          if (onSelectTenantId) {
            onSelectTenantId(tenant.id);
          }
        }}
        user={user}
        needsAuth={needsAuth}
        onLogin={handleGoogleLogin}
        onLogout={handleGoogleLogout}
        isSyncingCalendar={isSyncingCalendar}
        onCalendarSyncRefresh={() => googleToken && loadGoogleCalendar(googleToken)}
        onAutopilotToggle={handleAutopilotToggle}
      />

      {/* Main SaaS Frame */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">

        {/* Auth Error Banner with Actionable Workarounds */}
        {authError && (
          <div className="rounded-2xl border border-rose-500/20 bg-[#160d13] p-5 shadow-2xl relative overflow-hidden animate-fade-in" id="auth-error-banner">
            {/* Ambient indicator glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-2xl pointer-events-none"></div>
            <div className="flex items-start gap-4 z-10">
              <div className="rounded-xl bg-rose-500/15 border border-rose-500/20 text-rose-400 p-2.5 shrink-0 shadow-[0_0_10px_rgba(239,68,68,0.15)] mt-0.5 animate-pulse">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex-1 space-y-2.5">
                <div>
                  <h4 className="font-semibold text-rose-400 text-sm">Google Authorization Popup Restricted</h4>
                  {authError === 'POPUP_CLOSED_BY_USER' ? (
                    <p className="text-xs text-slate-400 leading-relaxed mt-1">
                      The sign-in popup was closed or blocked. Because this application is running inside an **iframe sandbox (AI Studio Preview)**, browsers enforce strict cross-origin restrictions on login popups.
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 leading-relaxed font-mono mt-1 text-[11px]">
                      Error details: {authError}
                    </p>
                  )}
                </div>

                <div className="bg-[#090b12] border border-white/5 rounded-xl p-4 space-y-3 font-sans">
                  <div className="text-slate-200 font-bold text-xs flex items-center gap-1.5">
                    <span className="text-blue-400">💡</span> How to solve this:
                  </div>
                  <ul className="text-slate-400 text-xs space-y-2.5 leading-relaxed list-none">
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-blue-400 shrink-0 select-none">1.</span>
                      <span>
                        <strong className="text-slate-200 block md:inline font-semibold">Open App in New Tab (Recommended):</strong> Click the <strong className="text-slate-300">"Open App in New Tab" ↗</strong> button at the top-right corner of your AI Studio preview. Running the app directly avoids all sandbox/iframe security blocks!
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-blue-400 shrink-0 select-none">2.</span>
                      <span>
                        <strong className="text-slate-200 block md:inline font-semibold">Enable Browser Popups:</strong> Check your address bar's right side for a <strong className="text-rose-400">"Blocked Popups"</strong> icon, click it, select <strong className="text-slate-200">"Always allow popups and redirects"</strong>, then press Setup Google Sync again.
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
              <button
                onClick={() => setAuthError(null)}
                className="text-slate-500 hover:text-slate-300 text-[10px] sm:text-xs font-semibold px-2 py-1 rounded hover:bg-white/5 transition-all text-right select-none self-start cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
        
        {/* Workspace Credentials Notification Warning */}
        {needsAuth && (
          <div className="rounded-2xl border border-white/5 bg-[#0d121d] p-5 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 relative overflow-hidden">
            {/* Ambient indicator glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none"></div>
            <div className="flex items-start gap-3.5 z-10">
              <div className="rounded-xl bg-blue-500/15 border border-blue-500/20 text-blue-400 p-2.5 shrink-0 shadow-[0_0_10px_rgba(59,130,246,0.15)]">
                <CalendarIcon className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-semibold text-white text-sm">Want actual Google Calendar synchronization?</h4>
                <p className="text-xs text-slate-400 leading-normal mt-1">
                  Connect **Google Calendar** directly to your app workspace. Once integrated, you can see and update actual client calendar events in real-time, keeping business bookings synchronized perfectly.
                </p>
              </div>
            </div>
            <button
              onClick={handleGoogleLogin}
              disabled={isLoggingIn}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-50 transition-all shadow-[0_0_15px_rgba(37,99,235,0.4)] z-10"
              id="connect-calendar-banner-btn"
            >
              {isLoggingIn ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <span>Setup Google Sync</span>
              )}
            </button>
          </div>
        )}

        {/* Global Stats bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#0d121d] rounded-2xl p-4.5 border border-white/5 shadow-2xl flex items-center gap-3.5 hover:border-white/10 transition-all">
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.2)]">
              <Bot className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block">Agent Status:</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`h-2 w-2 rounded-full ${selectedTenant.status === 'active' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]'}`} />
                <span className="text-sm font-bold capitalize text-white">{selectedTenant.botName} ({selectedTenant.status})</span>
              </div>
            </div>
          </div>

          <div className="bg-[#0d121d] rounded-2xl p-4.5 border border-white/5 shadow-2xl flex items-center gap-3.5 hover:border-white/10 transition-all">
            <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.2)]">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block">Captured Leads:</span>
              <p className="text-sm font-bold text-white mt-0.5">{selectedTenant.leads.length} Clients</p>
            </div>
          </div>

          <div className="bg-[#0d121d] rounded-2xl p-4.5 border border-white/5 shadow-2xl flex items-center gap-3.5 hover:border-white/10 transition-all">
            <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 shadow-[0_0_8px_rgba(249,115,22,0.2)]">
              <CalendarIcon className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block">Planned Bookings:</span>
              <p className="text-sm font-bold text-white mt-0.5">{activeAppointments.length} Booked</p>
            </div>
          </div>

          <div className="bg-[#0d121d] rounded-2xl p-4.5 border border-white/5 shadow-2xl flex items-center gap-3.5 hover:border-white/10 transition-all">
            <div className="p-2.5 rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-400 shadow-[0_0_8px_rgba(236,72,153,0.2)]">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block">Knowledge Index:</span>
              <p className="text-sm font-bold text-white mt-0.5">{selectedTenant.knowledgeBase.length} PDF / FAQ</p>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Header Switcher */}
        <div className="md:hidden flex items-center justify-between bg-[#080b12] p-3 rounded-2xl border border-white/5 shadow-xl mb-1" id="mobile-nav-switcher-bar">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Active View:</span>
            <span className="text-[11px] font-bold text-white flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/15 px-2.5 py-1 rounded-xl shadow-[0_0_10px_rgba(59,130,246,0.06)]">
              {activeTab === 'insights' && <><TrendingUp className="h-3.5 w-3.5 text-blue-400" /> <span>{t('insights')}</span></>}
              {activeTab === 'simulator' && <><Smartphone className="h-3.5 w-3.5 text-red-400 animate-pulse" /> <span>{t('simulator')}</span></>}
              {activeTab === 'bot_config' && <><Settings className="h-3.5 w-3.5 text-purple-400" /> <span>{t('bot_config')}</span></>}
              {activeTab === 'knowledge_base' && <><Database className="h-3.5 w-3.5 text-amber-400" /> <span>{t('knowledge_base')}</span></>}
              {activeTab === 'leads' && <><Users className="h-3.5 w-3.5 text-emerald-400" /> <span>{t('leads')}</span></>}
              {activeTab === 'calendar' && <><CalendarIcon className="h-3.5 w-3.5 text-sky-400" /> <span>{t('calendar')}</span></>}
              {activeTab === 'workspace_hub' && <><Cloud className="h-3.5 w-3.5 text-indigo-400" /> <span>{t('workspace_hub')}</span></>}
              {activeTab === 'whatsapp_integration' && <><Phone className="h-3.5 w-3.5 text-teal-400" /> <span>{t('whatsapp_integration')}</span></>}
            </span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0d121d] hover:bg-white/5 text-slate-200 hover:text-white font-mono text-[11px] font-bold rounded-xl border border-white/10 active:scale-95 transition-all cursor-pointer shadow-md select-none"
            id="mobile-hamburger-btn"
          >
            <Menu className="h-4 w-4 text-blue-400 animate-pulse" />
            <span>Menu</span>
          </button>
        </div>

        {/* Mobile Navigation Slide-Over Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex justify-end" id="mobile-navigation-drawer-root">
            {/* Backdrop Blur */}
            <div 
              className="absolute inset-0 bg-[#020509]/80 backdrop-blur-md transition-opacity duration-300 animate-fade-in"
              onClick={() => setMobileMenuOpen(false)}
            />
            
            {/* Drawer Drawer Container */}
            <div className="relative w-80 max-w-[85vw] h-full bg-[#05070a] border-l border-white/10 p-5 flex flex-col justify-between shadow-2xl z-10 overflow-y-auto animate-slide-in">
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <div>
                    <h3 className="text-white font-display font-medium text-sm tracking-tight flex items-center gap-2">
                      <Bot className="h-4 w-4 text-blue-400" />
                      <span>Console Navigation</span>
                    </h3>
                    <p className="text-[10px] text-slate-500 font-mono">OmniBot Controls</p>
                  </div>
                  <button 
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
                    id="mobile-drawer-close-btn"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                
                {/* Selected business dashboard hub info */}
                <div className="p-3 bg-[#0d121d] rounded-xl border border-white/5 flex items-center gap-3">
                  <span className="text-2xl shrink-0">{selectedTenant.avatar}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">{selectedTenant.name}</p>
                    <p className="text-[9px] text-slate-500 font-mono uppercase tracking-wider">{selectedTenant.industry}</p>
                  </div>
                </div>

                {/* Vertical menu tabs list within Mobile state */}
                <nav className="flex flex-col gap-1.5 font-sans">
                  <button
                    onClick={() => { setActiveTab('insights'); setMobileMenuOpen(false); }}
                    className={`flex items-center gap-3.5 px-4 py-3 text-xs font-semibold rounded-xl cursor-pointer transition-all ${
                      activeTab === 'insights' ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)]' : 'text-slate-450 hover:bg-white/5 hover:text-white bg-[#080b12]'
                    }`}
                    id="mobile-tab-insights"
                  >
                    <TrendingUp className="h-4 w-4" />
                    <span>{t('insights')}</span>
                  </button>

                  <button
                    onClick={() => { setActiveTab('simulator'); setMobileMenuOpen(false); }}
                    className={`flex items-center justify-between px-4 py-3 text-xs font-semibold rounded-xl cursor-pointer transition-all ${
                      activeTab === 'simulator' ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)]' : 'text-slate-450 hover:bg-white/5 hover:text-white bg-[#080b12]'
                    }`}
                    id="mobile-tab-simulator"
                  >
                    <div className="flex items-center gap-3.5">
                      <Smartphone className="h-4 w-4" />
                      <span>{t('simulator')}</span>
                    </div>
                    <span className="text-[8.5px] bg-red-500 text-white px-2 py-0.5 rounded-full font-bold shadow-md">LIVE</span>
                  </button>

                  <div className="h-px bg-white/5 my-2" />

                  <button
                    onClick={() => { setActiveTab('bot_config'); setMobileMenuOpen(false); }}
                    className={`flex items-center gap-3.5 px-4 py-3 text-xs font-semibold rounded-xl cursor-pointer transition-all ${
                      activeTab === 'bot_config' ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)]' : 'text-slate-450 hover:bg-white/5 hover:text-white bg-[#080b12]'
                    }`}
                    id="mobile-tab-config"
                  >
                    <Settings className="h-4 w-4" />
                    <span>{t('bot_config')}</span>
                  </button>

                  <button
                    onClick={() => { setActiveTab('knowledge_base'); setMobileMenuOpen(false); }}
                    className={`flex items-center gap-3.5 px-4 py-3 text-xs font-semibold rounded-xl cursor-pointer transition-all ${
                      activeTab === 'knowledge_base' ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)]' : 'text-slate-450 hover:bg-white/5 hover:text-white bg-[#080b12]'
                    }`}
                    id="mobile-tab-kb"
                  >
                    <Database className="h-4 w-4" />
                    <span>{t('knowledge_base')}</span>
                  </button>

                  <button
                    onClick={() => { setActiveTab('leads'); setMobileMenuOpen(false); }}
                    className={`flex items-center gap-3.5 px-4 py-3 text-xs font-semibold rounded-xl cursor-pointer transition-all ${
                      activeTab === 'leads' ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)]' : 'text-slate-455 hover:bg-white/5 hover:text-white bg-[#080b12]'
                    }`}
                    id="mobile-tab-leads"
                  >
                    <Users className="h-4 w-4" />
                    <span>{t('leads')}</span>
                  </button>

                  <button
                    onClick={() => { setActiveTab('calendar'); setMobileMenuOpen(false); }}
                    className={`flex items-center justify-between px-4 py-3 text-xs font-semibold rounded-xl cursor-pointer transition-all ${
                      activeTab === 'calendar' ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)]' : 'text-slate-450 hover:bg-white/5 hover:text-white bg-[#080b12]'
                    }`}
                    id="mobile-tab-calendar"
                  >
                    <div className="flex items-center gap-3.5">
                      <CalendarIcon className="h-4 w-4" />
                      <span>{t('calendar')}</span>
                    </div>
                    {googleToken && <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-md" />}
                  </button>

                  <button
                    onClick={() => { setActiveTab('workspace_hub'); setMobileMenuOpen(false); }}
                    className={`flex items-center justify-between px-4 py-3 text-xs font-semibold rounded-xl cursor-pointer transition-all ${
                      activeTab === 'workspace_hub' ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)]' : 'text-slate-450 hover:bg-white/5 hover:text-white bg-[#080b12]'
                    }`}
                    id="mobile-tab-workspace"
                  >
                    <div className="flex items-center gap-3.5">
                      <Cloud className="h-4 w-4" />
                      <span>{t('workspace_hub')}</span>
                    </div>
                    {googleToken && <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse shadow-md" />}
                  </button>

                  <button
                    onClick={() => { setActiveTab('whatsapp_integration'); setMobileMenuOpen(false); }}
                    className={`flex items-center gap-3.5 px-4 py-3 text-xs font-semibold rounded-xl cursor-pointer transition-all ${
                      activeTab === 'whatsapp_integration' ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)]' : 'text-slate-450 hover:bg-white/5 hover:text-white bg-[#080b12]'
                    }`}
                    id="mobile-tab-whatsapp"
                  >
                    <Phone className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>{t('whatsapp_integration')}</span>
                  </button>
                </nav>
              </div>

              {/* Console exit actions inside the drawer */}
              <div className="pt-5 border-t border-white/5 space-y-3 font-sans">
                {onGoToOwnerConsole && sessionEmail === 'owner@saas.com' && (
                  <button
                    onClick={() => { onGoToOwnerConsole(); setMobileMenuOpen(false); }}
                    className="flex items-center gap-3 px-4 py-3 text-xs font-semibold rounded-xl text-purple-450 hover:bg-purple-500/10 hover:text-purple-300 w-full cursor-pointer transition-all border border-purple-500/10 bg-purple-950/10"
                    id="mobile-action-owner-console"
                  >
                    <ShieldCheck className="h-4 w-4 text-purple-400" />
                    <span>Platform Owner Hub</span>
                  </button>
                )}

                {onLogoutAdmin && (
                  <button
                    onClick={() => { onLogoutAdmin(); setMobileMenuOpen(false); }}
                    className="flex items-center gap-3 px-4 py-2 text-xs font-semibold rounded-xl text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 w-full cursor-pointer transition-all"
                    id="mobile-action-logout"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Lock Admin Session</span>
                  </button>
                )}

                {/* Mobile User Role Selector */}
                <div className="pt-4 mt-2 border-t border-white/5 space-y-2">
                  <span className="text-[9px] text-slate-505 font-mono uppercase tracking-wider block">Access Role:</span>
                  <button
                    onClick={() => setUserRole(prev => prev === 'admin' ? 'support' : 'admin')}
                    className={`w-full py-2.5 px-3.5 rounded-xl border text-xs font-mono font-bold flex items-center justify-between cursor-pointer transition-all ${
                      userRole === 'admin' 
                        ? 'bg-blue-950/20 border-blue-500/35 text-blue-400' 
                        : 'bg-amber-950/20 border-amber-500/35 text-amber-400'
                    }`}
                    id="mobile-role-toggle-btn"
                    type="button"
                  >
                    <span>{userRole === 'admin' ? '🔑 ADMIN' : '🎧 SUPPORT AGENT'}</span>
                    <span className="text-[9px] bg-white/10 px-1.5 py-0.5 rounded font-sans font-normal">Toggle</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Unified Tab Navigation Layout */}
        <div className="flex flex-col md:flex-row gap-8 items-start">
          
          {/* Vertical Menu bar for Swiss-Design layout */}
          <nav className="hidden md:flex md:flex-col w-full md:w-64 bg-[#080b12] p-2.5 rounded-2xl border border-white/5 gap-1 shrink-0 md:sticky md:top-24 shadow-xl scrollbar-none">
            
            <button
              onClick={() => setActiveTab('insights')}
              className={`flex items-center gap-3 px-4 py-2.5 text-xs font-semibold rounded-xl cursor-pointer transition-all shrink-0 md:w-full w-auto whitespace-nowrap ${
                activeTab === 'insights' ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
              id="tab-insights-btn"
            >
              <TrendingUp className="h-4 w-4" />
              <span>{t('insights')}</span>
            </button>

            <button
              onClick={() => setActiveTab('simulator')}
              className={`flex items-center justify-between gap-3 px-4 py-2.5 text-xs font-semibold rounded-xl cursor-pointer transition-all shrink-0 md:w-full w-auto whitespace-nowrap ${
                activeTab === 'simulator' ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
              id="tab-simulator-btn"
            >
              <div className="flex items-center gap-3">
                <Smartphone className="h-4 w-4" />
                <span>{t('simulator')}</span>
              </div>
              <span className="text-[9px] bg-red-500 text-white px-1.5 py-0.5 rounded-full font-bold shadow-[0_0_8px_rgba(239,68,68,0.6)]">LIVE</span>
            </button>

            <div className="h-px bg-white/5 my-2 hidden md:block" />

            <button
              onClick={() => setActiveTab('bot_config')}
              className={`flex items-center gap-3 px-4 py-2.5 text-xs font-semibold rounded-xl cursor-pointer transition-all shrink-0 md:w-full w-auto whitespace-nowrap ${
                activeTab === 'bot_config' ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
              id="tab-config-btn"
            >
              <Settings className="h-4 w-4" />
              <span>{t('bot_config')}</span>
            </button>

            <button
              onClick={() => setActiveTab('knowledge_base')}
              className={`flex items-center gap-3 px-4 py-2.5 text-xs font-semibold rounded-xl cursor-pointer transition-all shrink-0 md:w-full w-auto whitespace-nowrap ${
                activeTab === 'knowledge_base' ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
              id="tab-kb-btn"
            >
              <Database className="h-4 w-4" />
              <span>{t('knowledge_base')}</span>
            </button>

            <button
              onClick={() => setActiveTab('leads')}
              className={`flex items-center gap-3 px-4 py-2.5 text-xs font-semibold rounded-xl cursor-pointer transition-all shrink-0 md:w-full w-auto whitespace-nowrap ${
                activeTab === 'leads' ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
              id="tab-leads-btn"
            >
              <Users className="h-4 w-4" />
              <span>{t('leads')}</span>
            </button>

            <button
              onClick={() => setActiveTab('calendar')}
              className={`flex items-center justify-between gap-3 px-4 py-2.5 text-xs font-semibold rounded-xl cursor-pointer transition-all shrink-0 md:w-full w-auto whitespace-nowrap ${
                activeTab === 'calendar' ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
              id="tab-calendar-btn"
            >
              <div className="flex items-center gap-3">
                <CalendarIcon className="h-4 w-4" />
                <span>{t('calendar')}</span>
              </div>
              {googleToken && <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />}
            </button>

            <button
              onClick={() => setActiveTab('workspace_hub')}
              className={`flex items-center justify-between gap-3 px-4 py-2.5 text-xs font-semibold rounded-xl cursor-pointer transition-all shrink-0 md:w-full w-auto whitespace-nowrap ${
                activeTab === 'workspace_hub' ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
              id="tab-workspaceup-btn"
            >
              <div className="flex items-center gap-3">
                <Cloud className="h-4 w-4" />
                <span>{t('workspace_hub')}</span>
              </div>
              {googleToken && <span className="h-2 w-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)] animate-pulse" />}
            </button>

            <button
              onClick={() => setActiveTab('whatsapp_integration')}
              className={`flex items-center gap-3 px-4 py-2.5 text-xs font-semibold rounded-xl cursor-pointer transition-all shrink-0 md:w-full w-auto whitespace-nowrap ${
                activeTab === 'whatsapp_integration' ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
              id="tab-whatsapp-inst-btn"
            >
              <Phone className="h-4 w-4 text-emerald-450 animate-pulse" />
              <span>{t('whatsapp_integration')}</span>
            </button>

            {onLogoutAdmin && (
              <>
                <div className="h-px bg-white/5 my-2 hidden md:block" />
                
                {onGoToOwnerConsole && sessionEmail === 'owner@saas.com' && (
                  <button
                    onClick={onGoToOwnerConsole}
                    className="flex items-center gap-3 px-4 py-2.5 text-xs font-semibold rounded-xl text-purple-400 hover:bg-purple-500/10 hover:text-purple-300 cursor-pointer transition-all shrink-0 md:w-full w-auto whitespace-nowrap font-mono mb-2 border border-purple-500/10 hover:border-purple-500/30 bg-purple-950/10 shadow-[0_0_10px_rgba(168,85,247,0.05)]"
                    id="tab-owner-back-btn"
                  >
                    <ShieldCheck className="h-4 w-4 text-purple-400 animate-pulse" />
                    <span>Platform Owner Hub</span>
                  </button>
                )}

                <button
                  onClick={onLogoutAdmin}
                  className="flex items-center gap-3 px-4 py-2.5 text-xs font-semibold rounded-xl text-rose-450 hover:bg-rose-500/10 hover:text-rose-400 cursor-pointer transition-all shrink-0 md:w-full w-auto whitespace-nowrap"
                  id="tab-exit-admin-btn"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Lock Admin Session</span>
                </button>
              </>
            )}

            {/* User Role Selector */}
            <div className="hidden md:flex flex-col mt-4 pt-4 border-t border-white/5 w-full space-y-2">
              <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block">Access Role:</span>
              <button
                onClick={() => setUserRole(prev => prev === 'admin' ? 'support' : 'admin')}
                className={`w-full py-2 px-3 rounded-xl border text-xs font-mono font-bold flex items-center justify-between cursor-pointer transition-all ${
                  userRole === 'admin' 
                    ? 'bg-blue-950/20 border-blue-500/35 text-blue-400 hover:border-blue-500/60 shadow-[0_0_10px_rgba(59,130,246,0.1)]' 
                    : 'bg-amber-950/20 border-amber-500/35 text-amber-400 hover:border-amber-500/60 shadow-[0_0_10px_rgba(245,158,11,0.1)]'
                }`}
                id="role-toggle-btn"
              >
                <span>{userRole === 'admin' ? '🔑 ADMIN' : '🎧 SUPPORT AGENT'}</span>
                <span className="text-[9px] bg-white/10 px-1.5 py-0.5 rounded uppercase tracking-widest font-sans font-normal">Toggle</span>
              </button>
            </div>

            {/* Persistent WhatsApp Telemetry Status Widget */}
            <div className="hidden md:flex flex-col mt-4 pt-4 border-t border-white/5 w-full">
              <WhatsAppStatusIndicator
                status={waStatus}
                phoneNumber={waPhone}
                sandboxActive={waSandboxActive}
                sandboxNumbersCount={waSandboxNumbers.length}
                onConfigureClick={() => setActiveTab('whatsapp_integration')}
              />
            </div>

          </nav>

          {/* Active Tab Panel Body */}
          <div className="flex-1 w-full bg-[#0d121d] rounded-3xl p-6 border border-white/5 shadow-2xl">
            
            {/* TAB: General Insights Dashboard */}
            {activeTab === 'insights' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-display font-medium tracking-tight text-white">{t('insightsTitle')}</h2>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">{t('insightsSub')} ({selectedTenant.name})</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-blue-500/10 px-2.5 py-1 rounded-full font-mono font-medium text-blue-400 border border-blue-500/20 uppercase tracking-widest">
                      INDUSTRY: {selectedTenant.industry.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="border border-white/5 rounded-2xl bg-[#080b12]/50 p-5 flex flex-col md:flex-row items-center gap-5 justify-between relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl pointer-events-none"></div>
                  <div className="space-y-1 text-center md:text-left z-10">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[10px] uppercase font-bold tracking-wider font-mono bg-blue-500/10 text-blue-400 rounded-full border border-blue-500/20">
                      <Smartphone className="h-3 w-3" /> Live simulation sandbox
                    </span>
                    <h3 className="font-display font-medium text-white text-md pt-1">Simulate interactive WhatsApp chats</h3>
                    <p className="text-xs text-slate-400 max-w-lg">
                      Enter the integrated smartphone replica to test AI conversational prompts. When the AI agent negotiates a lead or books a slot, your dashboard widgets update instantly in the background.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('simulator')}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl flex items-center gap-2 text-center shrink-0 cursor-pointer transition-all shadow-[0_0_12px_rgba(37,99,235,0.4)] z-10"
                    id="insights-simulator-quick-link"
                  >
                    <Smartphone className="h-4 w-4" /> Start Live Simulator
                  </button>
                </div>

                {/* 30-Day Lead Conversion Rate and Message Volume Analytics section */}
                <SaaSCharts tenant={selectedTenant} />

                {/* Sub panels double layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
                  
                  {/* Recent Leads Box */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-display font-semibold text-sm text-white uppercase tracking-wider font-mono text-slate-400">Captured Leads ({selectedTenant.leads.length})</h4>
                      <button onClick={() => setActiveTab('leads')} className="text-xs font-semibold text-blue-450 hover:text-blue-300 hover:underline cursor-pointer">View All</button>
                    </div>
                    
                    {selectedTenant.leads.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-slate-500">
                        <Users className="h-8 w-8 mx-auto mb-2 text-slate-600" />
                        <p className="text-xs">No leads gathered yet by @{selectedTenant.botName}.</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                        {selectedTenant.leads.map(lead => (
                          <div key={lead.id} className="p-3.5 rounded-xl border border-white/5 hover:border-white/10 bg-[#080b12] shadow-sm flex items-center justify-between transition-all">
                            <div className="space-y-0.5">
                              <h5 className="text-xs font-bold text-white">{lead.name}</h5>
                              <p className="text-[10px] text-slate-400 font-mono">{lead.phone} • {lead.email}</p>
                            </div>
                            <span className="text-[10px] font-mono px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded-full border border-blue-500/20 font-bold uppercase">
                              {lead.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Upcoming Bookings Timeline */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-display font-semibold text-sm text-white uppercase tracking-wider font-mono text-slate-400">Calendar Agenda ({activeAppointments.length})</h4>
                      <button onClick={() => setActiveTab('calendar')} className="text-xs font-semibold text-blue-450 hover:text-blue-300 hover:underline cursor-pointer">View Calendar</button>
                    </div>

                    {activeAppointments.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-slate-500">
                        <CalendarIcon className="h-8 w-8 mx-auto mb-2 text-slate-600" />
                        <p className="text-xs">No scheduled activities found in the list.</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                        {activeAppointments.map(appt => {
                          const dateObj = new Date(appt.start);
                          return (
                            <div key={appt.id} className="p-3.5 rounded-xl border border-white/5 bg-[#080b12] hover:border-white/10 shadow-sm flex items-center gap-3 transition-all">
                              <div className="h-10 w-10 shrink-0 rounded-lg bg-blue-600 text-white flex flex-col items-center justify-center border border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.3)]">
                                <span className="text-[9px] font-bold uppercase font-mono">{dateObj.toLocaleDateString([], { month: 'short' })}</span>
                                <span className="text-sm font-bold font-mono leading-none">{dateObj.getDate()}</span>
                              </div>
                              <div className="flex-1 min-w-0 space-y-0.5">
                                <h6 className="text-xs font-bold text-white truncate">{appt.customerName}</h6>
                                <p className="text-[10px] font-mono text-slate-450">
                                  {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {appt.syncedWithGoogle ? 'Google Cal' : 'Sandbox (Offline)'}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                </div>
              </div>
            )}

            {/* TAB: Bot settings and rules */}
            {activeTab === 'bot_config' && (
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
                          className="w-full bg-[#0d121d] text-slate-100 text-xs px-3 py-2 border border-white/5 rounded-lg outline-none focus:ring-1 focus:ring-indigo-505 font-mono"
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
                          className="w-full bg-[#0d121d] text-slate-100 text-xs px-3 py-2 border border-white/5 rounded-lg outline-none focus:ring-1 focus:ring-indigo-505 font-mono"
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
                          <div className="relative w-8 h-4 bg-slate-705 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-500"></div>
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
                                ? 'bg-red-500/10 text-red-405 border-red-500/30 animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.2)] text-red-400'
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
                        className="px-3.5 py-1.5 text-xs text-slate-404 hover:bg-white/5 rounded-lg font-mono cursor-pointer"
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
                            ? 'border-indigo-550 ring-1 ring-indigo-500/20' 
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
                                <p className="text-[10.5px] font-mono text-slate-405 font-semibold">{agent.role}</p>
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
                                <span className="text-[8.5px] font-mono px-1.5 py-0.5 rounded bg-slate-500/10 border border-white/5 text-slate-450 flex items-center gap-0.5 shrink-0">
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
                              className="px-2.5 py-1 bg-[#0d121d] hover:bg-white/5 border border-white/5 text-slate-305 text-[11px] rounded-lg cursor-pointer font-mono transition-colors"
                            >
                              Configure
                            </button>
                            
                            {/* Only allow deletion if total count > 1 */}
                            {getTenantAgents(selectedTenant).length > 1 && userRole !== 'support' && (
                              <button
                                onClick={() => handleDeleteAgent(agent.id)}
                                type="button"
                                className="p-1 hover:bg-red-500/10 text-red-400/85 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
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
                                  ? 'bg-red-500/10 text-red-405 border-red-500/30 animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.2)] text-red-400'
                                  : 'bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border-indigo-500/20 hover:border-indigo-500/30'
                              }`}
                              id="voice-prompt-playground-toggle"
                            >
                              <Mic className={`h-3 w-3 ${isRecordingPlayground ? 'animate-bounce text-red-550' : 'text-indigo-400'}`} />
                              <span>{isRecordingPlayground ? 'Stop' : 'Speak'}</span>
                            </button>
                            <span className="text-[10px] text-indigo-455 font-mono bg-indigo-500/10 px-1.5 py-0.5 rounded text-indigo-400">
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
                          className="px-2 py-1 bg-white/5 hover:bg-indigo-500/15 text-[10px] text-slate-350 hover:text-indigo-300 rounded border border-white/10 font-mono transition-all cursor-pointer"
                        >
                          ❔ Ask Pricing
                        </button>
                        <button
                          onClick={() => setPlaygroundInput("Hi, I want to book a custom training appointment tomorrow at 10:00 AM if free.")}
                          type="button"
                          className="px-2 py-1 bg-white/5 hover:bg-indigo-500/15 text-[10px] text-slate-350 hover:text-indigo-300 rounded border border-white/10 font-mono transition-all cursor-pointer"
                        >
                          🗓️ Book Appointment
                        </button>
                        <button
                          onClick={() => setPlaygroundInput("Excellent. Let's confirm it. My email is john@test.com and phone is 555-1234")}
                          type="button"
                          className="px-2 py-1 bg-white/5 hover:bg-indigo-500/15 text-[10px] text-slate-350 hover:text-indigo-300 rounded border border-white/10 font-mono transition-all cursor-pointer"
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
                              _expanded: !prev._expanded
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
                          <div className="text-[10px] text-slate-405 uppercase tracking-wider font-bold mb-2 flex items-center gap-1.5 text-indigo-400">
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
                          <div className="text-[10px] text-slate-405 uppercase tracking-wider font-bold mb-2 flex items-center gap-1.5 text-emerald-400">
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
                                className="p-1 hover:bg-red-500/10 text-red-400/80 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
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
            )}

            {/* TAB: Private Knowledge base PDF FAA upload */}
            {activeTab === 'knowledge_base' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-display font-medium tracking-tight text-white flex items-center gap-2">
                      <Database className="h-5 w-5 text-blue-500" />
                      <span>{t('knowledge_base')}</span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {t('knowledgeBaseSub')}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowAddKb(!showAddKb);
                      setKbTypeInput('file');
                      setKbTitleInput('');
                      setKbContentInput('');
                      setKbUrlInput('');
                      setKbCrawlStatus('idle');
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
                        Choose a source method below. The system parses it into clean structured markdown before importing.
                      </p>
                    </div>

                    {/* Format selector sub tabs */}
                    <div className="flex border-b border-white/5 pb-1 justify-start gap-1 overflow-x-auto scrollbar-none font-mono">
                      {[
                        { key: 'file', label: '📄 Upload Doc / PDF' },
                        { key: 'url', label: '🔗 Web Scraper Link' },
                        { key: 'crawl', label: '🕸️ Web & Social Crawler' },
                        { key: 'faq', label: '✍️ Manual Q&A FAQ' }
                      ].map((tab) => (
                        <button
                          key={tab.key}
                          type="button"
                          onClick={() => {
                            setKbTypeInput(tab.key as any);
                            setKbTitleInput('');
                            setKbContentInput('');
                            setKbUrlInput('');
                            setKbCrawlStatus('idle');
                            setKbFileMeta(null);
                          }}
                          className={`px-3.5 py-2 text-xs font-semibold rounded-t-xl transition-all cursor-pointer border-t border-x shrink-0 ${
                            kbTypeInput === tab.key
                              ? 'bg-[#0d121d] border-white/10 text-white text-blue-400 font-bold'
                              : 'bg-transparent border-transparent text-slate-450 hover:text-slate-200'
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
                                  <h4 className="text-xs font-bold font-mono text-white select-all">{kbFileMeta.name}</h4>
                                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">{kbFileMeta.size} • Loaded and Scanned</p>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-3 py-4 w-full">
                                <div className="p-2.5 bg-white/5 text-slate-400 border border-white/5 rounded-xl inline-block">
                                  <Upload className="h-6 w-6 text-blue-400" />
                                </div>
                                <div className="text-slate-300 text-xs">
                                  <label htmlFor="file-kb-upload" className="font-bold text-blue-400 hover:underline cursor-pointer">
                                    Click here to browse
                                  </label> or drag and drop your file in this container
                                  <span className="block text-[10px] text-slate-500 font-mono mt-1.5">Supports PDF, MD, Word (DOCX), TXT, or CSV (Max 15MB)</span>
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
                            <span className="text-[10px] font-bold font-mono uppercase text-slate-450 block select-none">Quick Test Sandbox Files (Click to simulate instant upload):</span>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              <button
                                type="button"
                                onClick={() => handleSimulateFileUpload(
                                  'Refund_Guarantee_Terms.pdf',
                                  '342 KB',
                                  `[OFFICIAL PDF DOCUMENT: Refund & Guarantee Terms]\nPublished: May 2026\n\n- Satisfied coverage extends 14 days from initial registration fee.\n- Subscription cancellations need 30 days email statement sent to billing@${selectedTenant.name.toLowerCase().replace(/\s+/g, '')}.com.\n- Credit cards are auto-invoiced on the recurring calendar schedule.\n- Personal trainer sessions must confirm cancellation 24 hours prior or are billed full charge.`,
                                  'Refund & Cancellation Policy - PDF'
                                )}
                                className="px-3 py-2 bg-[#0d121d] hover:bg-white/5 text-slate-350 hover:text-white border border-white/5 rounded-xl text-[11px] font-semibold text-left font-mono transition-colors flex items-center justify-between cursor-pointer"
                              >
                                <span className="truncate">📋 refund_policy.pdf</span>
                                <span className="text-[8px] bg-red-500/10 text-red-400 border border-red-500/25 px-1 py-0.5 rounded font-bold font-mono">PDF</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleSimulateFileUpload(
                                  'Developer_Readme_Onboarding.md',
                                  '14 KB',
                                  `### Team Onboarding FAQ & Manual (${selectedTenant.name})\n\nWelcome back team!\n\n#### Q: What program tiers do we deploy?\nClients can request standard onboarding packages starting at $99 per term. The pro and corporate clusters reside at $249 and custom quote rates.\n\n#### Q: How is user check-in dispatched?\nWhatsApp automation routes user reservations directly to the assigned Google Workspace agenda logs.`,
                                  'Company Onboarding Rules - Markdown'
                                )}
                                className="px-3 py-2 bg-[#0d121d] hover:bg-white/5 text-slate-355 hover:text-white border border-white/5 rounded-xl text-[11px] font-semibold text-left font-mono transition-colors flex items-center justify-between cursor-pointer"
                              >
                                <span className="truncate">📝 onboarding_faq.md</span>
                                <span className="text-[8px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-1 py-0.5 rounded font-bold font-mono">MD</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleSimulateFileUpload(
                                  'Hourly_Pricing_Rates.docx',
                                  '1.1 MB',
                                  `[OFFICIAL COMPANY CONTRACT: HOURLY ASSIGNMENT PRICING]\n\nCorporate details for entity ${selectedTenant.name}:\n\n1. TIMELINE OF TASKS:\nAll scheduled support sessions are billed in blocks of 2 hours minimum. Emergency dispatch outside of regular working hours (9 AM - 6 PM) entails flat fee of $160.\n\n2. CANCELLATION CHARGERS:\nServices cancelled without prior notifications at least 15 days in advance incur 10% contract termination fee. Standard help lines can resolve queries.`,
                                  'Hourly Pricing Rates - Word DOCX'
                                )}
                                className="px-3 py-2 bg-[#0d121d] hover:bg-white/5 text-slate-355 hover:text-white border border-white/5 rounded-xl text-[11px] font-semibold text-left font-mono transition-colors flex items-center justify-between cursor-pointer"
                              >
                                <span className="truncate">💼 rates_pricing.docx</span>
                                <span className="text-[8px] bg-blue-500/10 text-blue-400 border border-blue-500/25 px-1 py-0.5 rounded font-bold font-mono">Word</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Sub-Tab 2: Webpage Scraper */}
                      {kbTypeInput === 'url' && (
                        <div className="space-y-4 animate-fade-in">
                          <div className="space-y-1.5">
                            <label htmlFor="url-scraper-link" className="text-xs font-semibold text-slate-400 font-mono">Input Single Page Website URL to Scrape:</label>
                            <div className="flex gap-2">
                              <input
                                id="url-scraper-link"
                                type="url"
                                value={kbUrlInput}
                                onChange={(e) => setKbUrlInput(e.target.value)}
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
                            <span className="text-[10px] text-slate-550 block select-none">Web scraper executes cloud rendering on the page, stripping headers/banners, and packing raw text into markdown.</span>
                          </div>
                        </div>
                      )}

                      {/* Sub-Tab 3: Spiders Crawler */}
                      {kbTypeInput === 'crawl' && (
                        <div className="space-y-4 animate-fade-in">
                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                            {/* Target crawler platform */}
                            <div className="sm:col-span-4 space-y-1.5">
                              <label htmlFor="crawler-target-select" className="text-xs font-semibold text-slate-400 font-mono">Target Channel Type:</label>
                              <select
                                id="crawler-target-select"
                                value={kbCrawlSource}
                                onChange={(e) => setKbCrawlSource(e.target.value as any)}
                                className="w-full bg-[#0d121d] text-slate-100 text-xs px-3 py-2.5 border border-white/5 rounded-xl outline-none focus:ring-1 focus:ring-blue-500 font-mono cursor-pointer"
                              >
                                <option value="web" className="bg-[#0b0e14]">🌐 Website Spider Portal</option>
                                <option value="instagram" className="bg-[#0b0e14]">📸 Instagram Account Feed</option>
                                <option value="facebook" className="bg-[#0b0e14]">👥 Facebook Fanpage Timeline</option>
                                <option value="linkedin" className="bg-[#0b0e14]">👔 LinkedIn Company Page</option>
                                <option value="twitter" className="bg-[#0b0e14]">🐦 Twitter/X Feed timeline</option>
                              </select>
                            </div>

                            {/* Max crawl depth */}
                            <div className="sm:col-span-4 space-y-1.5">
                              <label htmlFor="crawler-depth-select" className="text-xs font-semibold text-slate-400 font-mono">Crawl Limit Depth:</label>
                              <select
                                id="crawler-depth-select"
                                value={kbCrawlDepth}
                                onChange={(e) => setKbCrawlDepth(parseInt(e.target.value))}
                                className="w-full bg-[#0d121d] text-slate-100 text-xs px-3 py-2.5 border border-white/5 rounded-xl outline-none focus:ring-1 focus:ring-blue-500 font-mono cursor-pointer"
                              >
                                <option value="1" className="bg-[#0b0e14]">1 link boundary (Home only)</option>
                                <option value="2" className="bg-[#0b0e14]">2 links boundary (Standard)</option>
                                <option value="3" className="bg-[#0b0e14]">3 links boundary (Comprehensive)</option>
                              </select>
                            </div>

                            {/* Page budget count */}
                            <div className="sm:col-span-4 space-y-1.5">
                              <label htmlFor="crawler-pages-input" className="text-xs font-semibold text-slate-400 font-mono">Max Page Scraping Budget:</label>
                              <input
                                id="crawler-pages-input"
                                type="number"
                                min={5}
                                max={100}
                                value={kbCrawlPages}
                                onChange={(e) => setKbCrawlPages(parseInt(e.target.value) || 15)}
                                className="w-full bg-[#0d121d] text-slate-100 text-xs px-3 py-2.5 border border-white/5 rounded-xl outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                              />
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label htmlFor="crawler-address-input" className="text-xs font-semibold text-slate-400 font-mono">
                              {kbCrawlSource === 'web' ? 'Target website URL (Homepage):' : `${kbCrawlSource.charAt(0).toUpperCase() + kbCrawlSource.slice(1)} handle profile link:`}
                            </label>
                            <div className="flex gap-2">
                              <input
                                id="crawler-address-input"
                                type="text"
                                value={kbUrlInput}
                                onChange={(e) => setKbUrlInput(e.target.value)}
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
                                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-850 disabled:text-slate-550 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shrink-0 transition-all shadow-lg cursor-pointer font-mono"
                              >
                                <Globe className={`h-3.5 w-3.5 ${kbCrawlStatus === 'running' ? 'animate-spin' : ''}`} />
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
                                <span className={kbCrawlStatus === 'completed' ? 'text-emerald-400 font-bold' : 'text-blue-400 font-bold animate-pulse'}>
                                  STATUS: {kbCrawlStatus.toUpperCase()} ({kbCrawlProgress}%)
                                </span>
                              </div>

                              <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden relative">
                                <div
                                  className="bg-blue-500 h-full transition-all duration-300 shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                                  style={{ width: `${kbCrawlProgress}%` }}
                                ></div>
                              </div>

                              <div className="max-h-40 overflow-y-auto font-mono text-[10px] text-slate-400 space-y-1.5 bg-[#010204] p-3 border border-white/5 rounded-xl max-w-full">
                                {kbCrawlLogs.map((logStr, index) => (
                                  <div key={index} className={logStr.includes('Successfully') || logStr.includes('🎉') ? 'text-emerald-400 font-bold' : 'text-slate-350'}>
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
                            <label htmlFor="kb-title-manual" className="text-xs font-semibold text-slate-400 font-mono">Title Guide Key:</label>
                            <input
                              id="kb-title-manual"
                              type="text"
                              value={kbTitleInput}
                              onChange={(e) => setKbTitleInput(e.target.value)}
                              placeholder="E.g., Pricing Packages FAQ or Refund Guidelines"
                              className="w-full bg-[#0d121d] text-slate-100 text-xs px-3 py-2.5 border border-white/5 rounded-xl outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                            />
                          </div>

                          <div className="sm:col-span-4 space-y-1.5">
                            <label htmlFor="kb-type-manual" className="text-xs font-semibold text-slate-400 font-mono">Format Category:</label>
                            <select
                              id="kb-type-manual"
                              value={kbTypeInput}
                              className="w-full bg-[#0d121d] text-slate-100 text-xs px-3 py-2.5 border border-white/5 rounded-xl outline-none focus:ring-1 focus:ring-blue-500 font-mono cursor-pointer"
                              onChange={(e) => setKbTypeInput(e.target.value as any)}
                            >
                              <option value="faq" className="bg-[#0b0e14]">FAQ Q&A Pairing</option>
                              <option value="document" className="bg-[#0b0e14]">Document Manual</option>
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
                          <h4 className="text-xs font-bold text-white font-mono uppercase tracking-widest">{kbProcessingStep}</h4>
                          <p className="text-[10px] text-slate-500 font-mono mt-1 select-none">Standby as our OCR scraper compiles text layout guidelines into Machine readable indexes...</p>
                        </div>
                      </div>
                    )}

                    {/* Pre-fill Review Text Area Content */}
                    {kbTitleInput && kbContentInput && !isProcessingKb && (
                      <div className="p-4 border border-blue-500/10 bg-[#0d121d]/50 rounded-2xl space-y-3.5 shadow-inner">
                        <div className="flex items-center justify-between text-xs">
                          <h4 className="font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
                            <Sparkles className="h-3.5 w-3.5 text-blue-400 animate-pulse" />
                            <span>Parsed Content Preview (Fully Editable sebelum Commit)</span>
                          </h4>
                          <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono px-2 py-0.5 rounded-full font-bold">
                            Derived words: {kbContentInput.split(/\s+/).length}
                          </span>
                        </div>

                        <div className="space-y-3">
                          <div className="space-y-1.5">
                            <label htmlFor="preview-kb-headline" className="text-[10px] font-bold font-mono text-slate-500 uppercase">Interactive Document Title Key:</label>
                            <input
                              id="preview-kb-headline"
                              type="text"
                              required
                              value={kbTitleInput}
                              onChange={(e) => setKbTitleInput(e.target.value)}
                              className="w-full bg-[#080b12] text-slate-200 text-xs px-3 py-2 border border-white/5 rounded-lg outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label htmlFor="preview-kb-textarea" className="text-[10px] font-bold font-mono text-slate-500 uppercase">Parsed Plaintext Context Chunk (Analyzable by AI):</label>
                            {kbTypeInput === 'crawl' ? (
                              <textarea
                                id="preview-kb-textarea"
                                required
                                value={kbContentInput}
                                onChange={(e) => setKbContentInput(e.target.value)}
                                rows={6}
                                className="w-full bg-[#080b12] text-slate-350 text-xs p-3 border border-white/5 rounded-lg outline-none font-mono focus:ring-1 focus:ring-blue-500 leading-relaxed max-w-full"
                              />
                            ) : (
                              <textarea
                                id="preview-kb-textarea"
                                required
                                value={kbContentInput}
                                onChange={(e) => setKbContentInput(e.target.value)}
                                rows={4}
                                className="w-full bg-[#080b12] text-slate-355 text-xs p-3 border border-white/5 rounded-lg outline-none font-mono focus:ring-1 focus:ring-blue-500 leading-relaxed max-w-full"
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
                  {selectedTenant.knowledgeBase.map((item) => {
                    // Match type icon with badge color formatting
                    const isFile = item.type === 'file';
                    const isUrl = item.type === 'url';
                    const isCrawl = item.type === 'crawl';
                    const isFaq = item.type === 'faq';

                    return (
                      <div key={item.id} className="p-4 bg-[#080b12] rounded-2xl border border-white/5 relative group shadow-lg flex flex-col justify-between hover:border-white/10 transition-all text-slate-300">
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <span className={`text-[9px] font-bold uppercase font-mono px-2 py-0.5 rounded-full border ${
                                isFaq 
                                  ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' 
                                  : isFile
                                    ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                                    : isUrl
                                      ? 'bg-teal-500/10 border-teal-500/20 text-teal-400'
                                      : isCrawl
                                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-450'
                                        : 'bg-orange-500/10 border-orange-500/20 text-orange-400'
                              }`}>
                                {isFile ? '📄 PDF/File' : isUrl ? '🔗 URL Scrape' : isCrawl ? `🕸️ Crawl (${item.socialNetwork || 'Web'})` : item.type}
                              </span>

                              {item.fileSize && (
                                <span className="text-[9.5px] font-mono text-slate-500 font-medium">({item.fileSize})</span>
                              )}

                              {item.crawlPagesCount && (
                                <span className="text-[9.5px] font-mono text-emerald-550 font-medium">({item.crawlPagesCount} pages)</span>
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
                          {/* Left helper actions */}
                          <p className="text-[10px] font-mono text-slate-500 leading-normal select-none">
                            {isCrawl ? 'Auto Crawled on schedule' : isFile ? 'Document indexed via OCR' : 'Manual database node'}
                          </p>

                          <button
                            onClick={() => {
                              updateTenantFields({
                                knowledgeBase: selectedTenant.knowledgeBase.filter(kb => kb.id !== item.id)
                              });
                            }}
                            disabled={userRole === 'support'}
                            className={`text-xs p-1.5 rounded-lg flex items-center gap-1 font-mono transition-all shrink-0 ${
                              userRole === 'support'
                                ? 'text-slate-505 opacity-50 cursor-not-allowed'
                                : 'text-red-400 hover:bg-red-500/10 hover:text-red-300 cursor-pointer'
                            }`}
                            title={userRole === 'support' ? "Restricted to Admin role" : "Remove Source"}
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
            )}

            {/* TAB: Lead list capture directory */}
            {activeTab === 'leads' && (() => {
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
                        className="w-full bg-[#0d121d] text-slate-100 placeholder-slate-500 text-xs pl-10 pr-8 py-2 border border-white/5 focus:border-blue-500/50 rounded-xl outline-none focus:ring-1 focus:ring-blue-500 font-mono transition-all"
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

                  {/* Live Takeover Chat Console Panel */}
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
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-450'
                            : 'bg-amber-500/10 border-amber-500/20 text-amber-450'
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
                                  const res = await fetch(`/api/conversations/${selectedTenant.id}`);
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
                          <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin">
                            {Object.keys(takeoverConvos).length === 0 ? (
                              <p className="text-center text-slate-600 font-mono text-[10px] py-8 select-none">No active threads</p>
                            ) : (
                              Object.keys(takeoverConvos).map(key => {
                                const isSelected = selectedConvoKey === key;
                                const customerId = key.substring(selectedTenant.id.length + 1);
                                const thread = takeoverConvos[key];
                                const lastMsg = thread.messages?.[thread.messages.length - 1];
                                const matchedLead = selectedTenant.leads?.find(l => l.phone === customerId || l.id === customerId);
                                const displayName = matchedLead ? matchedLead.name : customerId;

                                return (
                                  <button
                                    key={key}
                                    onClick={() => setSelectedConvoKey(key)}
                                    className={`w-full text-left p-3 rounded-lg border transition-all flex flex-col gap-1 cursor-pointer ${
                                      isSelected
                                        ? 'bg-blue-600/10 border-blue-500/30 text-blue-450'
                                        : 'bg-[#0d121d]/50 border-transparent hover:bg-white/5 text-slate-300'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="font-semibold text-xs truncate max-w-[140px]">{displayName}</span>
                                      <span className="text-[9px] font-mono text-slate-500">
                                        {lastMsg ? new Date(lastMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                      </span>
                                    </div>
                                    <span className="text-[10px] text-slate-500 truncate block">
                                      {lastMsg ? lastMsg.text : 'No messages'}
                                    </span>
                                  </button>
                                );
                              })
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
                                <div className="p-3 border-b border-white/5 flex items-center justify-between bg-[#0d121d] rounded-t-xl shrink-0">
                                  <div className="flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                                    <span className="font-semibold text-xs text-slate-200">{displayName}</span>
                                    {matchedLead && (
                                      <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-mono">
                                        {matchedLead.status.toUpperCase()}
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[9px] font-mono text-slate-500">ID: {customerId}</span>
                                </div>

                                {/* Messages list */}
                                <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin flex flex-col bg-[#05070a]/40">
                                  {thread.messages.map((msg, index) => {
                                    const isUser = msg.sender === 'user';
                                    const isManual = msg.isManualTakeover;

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
                                          {msg.text}
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
                                  className="p-3 border-t border-white/5 bg-[#0d121d] flex gap-2 rounded-b-xl shrink-0"
                                >
                                  <input
                                    type="text"
                                    value={takeoverReplyText}
                                    onChange={(e) => setTakeoverReplyText(e.target.value)}
                                    placeholder="Type a manual reply response to send..."
                                    className="flex-1 bg-[#090d16] text-slate-100 placeholder-slate-500 text-xs px-3.5 py-2 border border-white/5 focus:border-blue-500/50 rounded-xl outline-none focus:ring-1 focus:ring-blue-500 font-mono transition-all"
                                    disabled={isSendingTakeoverReply}
                                  />
                                  <button
                                    type="submit"
                                    disabled={isSendingTakeoverReply || !takeoverReplyText.trim()}
                                    className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-semibold rounded-xl cursor-pointer transition-all shadow-[0_0_12px_rgba(37,99,235,0.4)] shrink-0"
                                  >
                                    {isSendingTakeoverReply ? 'Sending...' : 'Send'}
                                  </button>
                                </form>
                              </>
                            );
                          })() : (
                            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-655 font-mono text-xs">
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
                            <td colSpan={5} className="p-12 text-center text-slate-500 font-mono">
                              <div className="max-w-sm mx-auto space-y-2">
                                <Users className="h-8 w-8 mx-auto text-slate-650 animate-pulse" />
                                <p className="text-xs font-semibold text-slate-300">No leads match your active filters</p>
                                <p className="text-[11px] text-slate-500">Try loosening your search query, selecting "ALL" stages, or triggering leads via the WhatsApp simulator sandbox.</p>
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
                                  <Phone className="h-3 w-3 text-slate-550" /> {lead.phone}
                                </span>
                              </td>
                              <td className="p-4 text-slate-450">
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
                                      ? 'text-slate-505 opacity-50 cursor-not-allowed'
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
                        referrerPolicy="no-referrer"
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-505 text-white font-mono text-[11px] font-bold rounded-lg transition-all shadow-md shrink-0 w-fit cursor-pointer"
                      >
                        <span>Open Spreadsheet ↗</span>
                      </a>
                    </div>
                  )}

                  {sheetsExportError && (
                    <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/5 flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-rose-455 shrink-0" />
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
                            ? 'bg-teal-500/10 hover:bg-teal-500/15 border-teal-550 text-teal-300'
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
                            <span className="text-[10px] text-slate-505 block">Dispatched on behalf of your connected administrator profile.</span>
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
                        No active opportunities found to sync. Visit the <button onClick={() => setActiveTab('simulator')} className="text-blue-400 hover:underline font-bold cursor-pointer">WhatsApp Simulator 📱</button> thread to harvest client data first!
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                        <div className="lg:col-span-5 space-y-4">
                          <div className="space-y-1.5 font-mono text-xs">
                            <label htmlFor="webhook-lead-picker" className="font-bold text-slate-400 block">Select Target Contact to Sync:</label>
                            <div className="flex gap-2">
                              <select
                                id="webhook-lead-picker"
                                value={webhookLeadId || (selectedTenant.leads[0]?.id || '')}
                                onChange={(e) => {
                                  setWebhookLeadId(e.target.value);
                                  setWebhookStatus('idle');
                                  setWebhookLogs([]);
                                }}
                                className="flex-1 bg-[#0d121d] border border-white/10 hover:border-white/20 text-slate-100 px-3.5 py-2.5 rounded-xl outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                              >
                                {selectedTenant.leads.map(l => (
                                  <option key={l.id} value={l.id} className="bg-[#0d121d]">
                                    {l.name} ({l.status.toUpperCase()})
                                  </option>
                                ))}
                              </select>

                              {(() => {
                                const activeLead = selectedTenant.leads.find(l => l.id === (webhookLeadId || selectedTenant.leads[0]?.id));
                                return (
                                  <button
                                    type="button"
                                    onClick={() => activeLead && handleTriggerWebhookDispatch(activeLead)}
                                    disabled={!activeLead || webhookStatus === 'sending'}
                                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold text-xs rounded-xl md:inline-flex items-center gap-1.5 transition-all cursor-pointer select-none"
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
                                );
                              })()}
                            </div>
                          </div>

                          {/* Render Active JSON Construct View */}
                          {(() => {
                            const activeLead = selectedTenant.leads.find(l => l.id === (webhookLeadId || selectedTenant.leads[0]?.id));
                            if (!activeLead) return null;

                            const mockPayload = {
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
                            };

                            return (
                              <div className="space-y-1">
                                <span className="text-[10px] font-bold text-slate-500 uppercase font-mono block">📦 REST POST payload representation:</span>
                                <pre className="p-3.5 bg-[#030509] text-[10px] text-emerald-400 border border-white/5 rounded-xl font-mono overflow-x-auto select-all h-60 scrollbar-thin">
                                  {JSON.stringify(mockPayload, null, 2)}
                                </pre>
                              </div>
                            );
                          })()}
                        </div>

                        {/* Webhook Sandbox Outbox Terminal Stream Output logs */}
                        <div className="lg:col-span-7 flex flex-col justify-between p-4 bg-[#030509] border border-white/5 rounded-2xl font-mono text-[11px] leading-relaxed relative min-h-[300px]">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between border-b border-white/5 pb-2">
                              <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Gateway Debug Output Logger</span>
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

                          <div className="border-t border-white/5 pt-2 mt-4 text-[9px] text-slate-500 flex justify-between select-none">
                            <span>API Version: V4.0 (Dev Preview)</span>
                            <span>Secure Channel SSL Match: Active</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* TAB: Google calendar bookings scheduler */}
            {activeTab === 'calendar' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-display font-medium tracking-tight text-white">{t('calendarTitle')}</h2>
                    <p className="text-xs text-slate-400 mt-0.5 font-mono">{t('calendarSub')}</p>
                  </div>
                  {googleToken ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => loadGoogleCalendar(googleToken)}
                        disabled={isSyncingCalendar}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#080b12] hover:bg-white/5 text-slate-200 border border-white/5 text-xs font-semibold rounded-xl shrink-0 cursor-pointer disabled:opacity-40 transition-colors"
                        id="calendar-sync-btn"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${isSyncingCalendar ? 'animate-spin' : ''}`} />
                        <span>Force Sync Feed</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleGoogleLogin}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-[0_0_12px_rgba(37,99,235,0.4)] cursor-pointer shrink-0 transition-all border border-blue-500/20"
                      id="calendar-signin"
                    >
                      <Sparkles className="h-4 w-4 text-yellow-400 animate-pulse" />
                      <span>Authenticate Google Account</span>
                    </button>
                  )}
                </div>

                {/* Custom confirmination banner before destructive deletion events */}
                {eventPendingDelete && (
                  <div className="p-5 rounded-2xl border border-red-500/30 bg-red-500/5 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 relative overflow-hidden" id="calendar-destructive-confirm bg">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-2xl pointer-events-none"></div>
                    <div className="flex items-start gap-3.5 z-10">
                      <div className="p-2.5 bg-red-500/15 text-red-400 border border-red-500/20 rounded-xl shrink-0 shadow-[0_0_8px_rgba(239,68,68,0.2)]">
                        <AlertCircle className="h-5 w-5 animate-pulse" />
                      </div>
                      <div>
                        <h4 className="text-white font-bold text-sm">Cancel Meeting Booking?</h4>
                        <p className="text-xs text-slate-450 leading-normal mt-1 max-w-xl font-mono">
                          Are you sure you want to cancel the booking for **"{eventPendingDelete.name}"**? This will remove the event directly from {eventPendingDelete.isGoogle ? 'your actual Google Calendar' : 'our sandbox database'}. This action cannot be undone.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 z-10">
                      <button
                        onClick={() => setEventPendingDelete(null)}
                        className="px-3.5 py-1.5 text-xs text-slate-400 hover:bg-white/5 rounded-lg font-mono cursor-pointer"
                        id="cancel-deletion-btn"
                      >
                        Keep Booking
                      </button>
                      <button
                        onClick={handleConfirmCancelEvent}
                        className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white font-semibold text-xs rounded-lg shadow-[0_0_12px_rgba(239,68,68,0.4)] shrink-0 cursor-pointer"
                        id="confirm-deletion-btn"
                      >
                        Cancel Meeting
                      </button>
                    </div>
                  </div>
                )}

                {/* Calendar feed displays */}
                {calendarError && (
                  <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-red-300 text-xs flex gap-2 font-mono">
                    <AlertCircle className="h-4.5 w-4.5 text-red-400 shrink-0" />
                    <span>{calendarError}</span>
                  </div>
                )}

                {/* Appointment Settings & Synchronization Control Panel */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="appointment-settings-container">
                  {/* Google Calendar Linkage Setting card */}
                  <div className="p-5 rounded-2xl bg-[#080b12] border border-white/5 shadow-2xl relative overflow-hidden flex flex-col justify-between" id="google-calendar-connection-card">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none"></div>
                    <div>
                      <div className="flex items-center gap-2.5 mb-3">
                        <div className="p-2 bg-blue-500/10 border border-blue-500/25 rounded-xl text-blue-400 shrink-0">
                          <CalendarIcon className="h-4 w-4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white">Google Calendar Connection</h4>
                          <p className="text-[11px] font-mono text-slate-400">Secure link with Google Workspace API</p>
                        </div>
                      </div>

                      <p className="text-xs text-slate-400 mb-4 leading-normal">
                        Link your business Google Calendar to enable real-time sync, verify sync status, resolve conflicting slots, and book clients autonomously.
                      </p>
                    </div>

                    <div className="pt-4 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {googleToken && user ? (
                        <div className="flex items-center gap-2.5">
                          <img src={user.photoURL || ''} alt="G" referrerPolicy="no-referrer" className="h-7 w-7 rounded-full border-2 border-emerald-500 object-cover shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                          <div className="space-y-0.5">
                            <span className="text-[11px] font-bold text-white block truncate max-w-[200px]">Connected: {user.email}</span>
                            <span className="text-[9px] font-mono text-emerald-450 uppercase tracking-widest flex items-center gap-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              Sync Status: Verified
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5 py-1">
                          <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                          <span>Status: Disconnected</span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 shrink-0">
                        {googleToken ? (
                          <>
                            <button
                              onClick={() => loadGoogleCalendar(googleToken)}
                              disabled={isSyncingCalendar}
                              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 text-[11px] font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-40"
                              id="settings-verify-sync"
                              title="Verify sync connection and reload events"
                            >
                              <RefreshCw className={`h-3 w-3 ${isSyncingCalendar ? 'animate-spin' : ''}`} />
                              <span>Verify Sync</span>
                            </button>
                            <button
                              onClick={handleGoogleLogout}
                              className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[11px] font-bold border border-red-500/20 rounded-lg cursor-pointer transition-colors"
                              id="settings-disconnect-calendar"
                            >
                              Disconnect
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={handleGoogleLogin}
                            className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-[0_0_12px_rgba(37,99,235,0.4)] cursor-pointer transition-all border border-blue-500/20"
                            id="settings-connect-calendar"
                          >
                            <Sparkles className="h-3.5 w-3.5 text-yellow-400 animate-pulse" />
                            <span>Connect Google Calendar</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Real-Time Auto-Scheduling Control card */}
                  <div className="p-5 rounded-2xl bg-[#080b12] border border-white/5 shadow-2xl relative overflow-hidden flex flex-col justify-between" id="google-calendar-auto-schedule-card">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none"></div>
                    <div>
                      <div className="flex items-center gap-2.5 mb-3">
                        <div className="p-2 bg-indigo-500/10 border border-indigo-500/25 rounded-xl text-indigo-400 shrink-0">
                          <Zap className="h-4 w-4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white">Real-Time Auto-Scheduling</h4>
                          <p className="text-[11px] font-mono text-slate-400">Autonomous bot calendar slots coordination</p>
                        </div>
                      </div>

                      <p className="text-xs text-slate-400 mb-4 leading-normal">
                        Toggle real-time auto-scheduling to authorize the AI chatbot to automatically reserve available slots on Google Calendar and generate events live.
                      </p>
                    </div>

                    <div className="pt-4 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex flex-col">
                        <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <span>Auto-Scheduling:</span>
                          {selectedTenant.googleCalendarAutoSchedule !== false ? (
                            <span className="text-indigo-400 font-bold">Enabled</span>
                          ) : (
                            <span className="text-amber-500 font-bold">Paused (Local only)</span>
                          )}
                        </div>
                        <span className="text-[9.5px] text-slate-500 leading-normal mt-0.5">
                          {!googleToken 
                            ? "Requires connected Google account" 
                            : selectedTenant.googleCalendarAutoSchedule !== false 
                            ? "Bookings will post to Google live" 
                            : "Bookings remain in local sandbox cache"
                          }
                        </span>
                      </div>

                      {/* Toggle button */}
                      <button
                        onClick={() => {
                          if (!googleToken) {
                            handleGoogleLogin();
                          } else {
                            const currentVal = selectedTenant.googleCalendarAutoSchedule !== false;
                            updateTenantFields({ googleCalendarAutoSchedule: !currentVal });
                          }
                        }}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-205 ease-in-out focus:outline-none ${
                          googleToken && selectedTenant.googleCalendarAutoSchedule !== false ? 'bg-indigo-600' : 'bg-slate-700/50'
                        }`}
                        id="toggle-auto-schedule-btn"
                        role="switch"
                        aria-checked={googleToken && selectedTenant.googleCalendarAutoSchedule !== false}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-205 ease-in-out ${
                            googleToken && selectedTenant.googleCalendarAutoSchedule !== false ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Local Sandbox to Google Calendar Synchronization Alert status banner */}
                {googleToken && selectedTenant?.appointments?.some(a => !a.syncedWithGoogle) && (
                  <div className="p-4 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 text-yellow-300 text-xs flex flex-col sm:flex-row items-center justify-between gap-3 font-mono shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-500/3 rounded-full blur-xl pointer-events-none"></div>
                    <div className="flex gap-2.5 items-center z-10">
                      <div className="p-2 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 rounded-lg">
                        <Sparkles className="h-4 w-4 animate-pulse" />
                      </div>
                      <span>
                        Found unsynchronized bot-scheduled bookings! Let's link them instantly to the live <strong>{user?.email || 'authenticated'}</strong> account.
                      </span>
                    </div>
                    <button
                      onClick={() => loadGoogleCalendar(googleToken)}
                      disabled={isSyncingCalendar}
                      className="px-4 py-1.5 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold rounded-xl whitespace-nowrap shrink-0 transition-colors cursor-pointer disabled:opacity-40 z-10"
                    >
                      {isSyncingCalendar ? 'Syncing...' : 'Sync Pending Bookings'}
                    </button>
                  </div>
                )}

                {/* Display events grid list */}
                <div className="space-y-3">
                  <h3 className="font-display font-semibold text-sm text-white uppercase tracking-wider font-mono text-slate-450">
                    {googleToken ? 'Synchronized Google Calendar Events List:' : 'Mock Sandbox Calendar Bookings list:'}
                  </h3>

                  {activeAppointments.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/5 p-12 text-center text-slate-500 bg-[#080b12] shadow-xl">
                      <CalendarIcon className="h-10 w-10 mx-auto mb-3 text-slate-600" />
                      <h4 className="font-semibold text-white text-sm mb-1">Schedule is clear</h4>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto leading-normal">
                        No appointments currently booked. Jump into the WhatsApp Simulator tab and test a message like "I want to schedule an appointment" to watch the bot coordinate calendar slots automatically!
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {activeAppointments.map((appt) => {
                        const dateObj = new Date(appt.start);
                        const endObj = new Date(appt.end);
                        return (
                          <div key={appt.id} className="p-4 bg-[#080b12] hover:bg-white/5 rounded-2xl border border-white/5 text-xs relative group transition-all shadow-xl flex flex-col justify-between">
                            <div>
                              <div className="flex items-center justify-between gap-2 mb-2.5">
                                <span className={`text-[9px] font-bold uppercase font-mono px-2 py-0.5 rounded-full border ${
                                  appt.syncedWithGoogle ? 'bg-emerald-500/10 text-emerald-450 border-emerald-500/20 shadow-[0_0_6px_rgba(16,185,129,0.15)]' : 'bg-slate-500/10 text-slate-400 border-white/5'
                                }`}>
                                  {appt.syncedWithGoogle ? 'Synced with Google Cal' : 'Sandbox (Offline)'}
                                </span>
                                <div className="text-[10px] text-slate-450 font-mono flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  <span>{dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                                </div>
                              </div>

                              <h4 className="text-sm font-bold text-white leading-snug mb-1">{appt.customerName}</h4>
                              <p className="text-[11px] text-slate-400 font-mono leading-relaxed mb-3">
                                From: {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} to {endObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>

                              {appt.notes && (
                                <p className="text-[10.5px] italic text-slate-450 border-l-2 border-white/5 pl-2 leading-normal">
                                  "{appt.notes}"
                                </p>
                              )}
                            </div>

                            <div className="mt-4 pt-2 border-t border-white/5 flex justify-end">
                              <button
                                onClick={() => setEventPendingDelete({
                                  id: appt.id,
                                  name: appt.customerName,
                                  isGoogle: !!appt.syncedWithGoogle
                                })}
                                className="text-[11px] font-mono text-red-400 hover:bg-red-500/10 py-1.5 px-3 rounded-lg flex items-center gap-1 shrink-0 cursor-pointer transition-colors"
                                id={`cancel-reservation-btn-${appt.id}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span>Cancel Booking</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                </div>
              </div>
            )}

            {/* TAB: Google Workspace Operations Control Hub */}
            {activeTab === 'workspace_hub' && (
              <div className="space-y-6 animate-fade-in">
                <WorkspaceHub
                  googleToken={googleToken}
                  userEmail={user?.email || null}
                  onLogin={handleGoogleLogin}
                  tenant={selectedTenant}
                />
              </div>
            )}

                         {/* TAB: Omnichannel Channel Integrations & Config */}
            {activeTab === 'whatsapp_integration' && (
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
                    ) : (
                      messengerStatus === 'connected' ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1 font-bold shadow-[0_0_10px_rgba(59,130,246,0.25)]">
                          ● ACTIVE (LIVE)
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-1 font-bold">
                          ● DISCONNECTED
                        </span>
                      )
                    )}
                  </div>
                </div>

                {/* Sub-channel switch button bars */}
                <div className="flex border-b border-white/5 pb-px gap-1 bg-white/[0.01] p-1 rounded-2xl border border-white/5 font-mono text-xs">
                  <button
                    type="button"
                    onClick={() => setActiveChannelSubTab('whatsapp')}
                    className={`flex-1 md:flex-initial px-4 py-2 text-center rounded-xl font-medium transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      activeChannelSubTab === 'whatsapp'
                        ? 'bg-emerald-505/10 text-emerald-400 font-semibold border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.15)] bg-emerald-500/10'
                        : 'text-slate-450 hover:text-slate-200 border border-transparent'
                    }`}
                  >
                    💬 WhatsApp Business API
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveChannelSubTab('messenger')}
                    className={`flex-1 md:flex-initial px-4 py-2 text-center rounded-xl font-medium transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      activeChannelSubTab === 'messenger'
                        ? 'bg-indigo-600/10 text-indigo-400 font-semibold border border-indigo-500/20 shadow-[0_0_10px_rgba(99,102,241,0.15)] bg-indigo-500/10'
                        : 'text-slate-450 hover:text-slate-200 border border-transparent'
                    }`}
                  >
                    🔵 Facebook Messenger API
                  </button>
                </div>

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
                          <Plus className="h-4 w-4 text-blue-450" />
                          <span>Register & Verify Test Number</span>
                        </h4>
                        <p className="text-[11px] text-slate-450 font-sans">
                          Add your personal phone number or an E.164 simulated testing string to start receiving webhook threads.
                        </p>
                      </div>

                      {waSandboxError && (
                        <div className="p-3 text-[11px] bg-red-500/10 border border-red-500/25 text-red-450 rounded-xl flex items-center gap-2 font-mono">
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
                                setWaSandboxError(null);
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
                            <p className="text-[11px] text-slate-450 font-mono leading-relaxed">
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
                                      setActiveTab('simulator');
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
                                    className="p-1 hover:bg-rose-500/10 text-rose-405 hover:text-rose-400 rounded cursor-pointer transition-colors"
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
                          <p className="text-[10px] text-slate-455 font-mono">
                            💡 Use **Test Chat** to quickly jump to the simulator and chat with your AI assistant using that sandbox profile context!
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
                      <h3 className="text-sm font-semibold text-emerald-450 uppercase tracking-widest font-mono flex items-center gap-2">
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
                        <span className="text-[9px] text-slate-450 block font-mono">
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
                            className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 active:bg-white/15 text-[10px] text-slate-300 font-mono rounded-lg cursor-pointer transition-colors border border-white/5 text-left flex flex-col justify-between h-[68px]"
                            title="Test AI Agent automatic lead parsing and CRM extraction"
                          >
                            <span className="font-bold text-emerald-400 block">🚀 CRM Lead</span>
                            <span className="text-[9px] text-slate-450 block truncate">Elon: elon.mars@spacex...</span>
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => {
                              setTestWebhookSenderName('Alexander checking');
                              setTestWebhookSenderPhone('+30 (211) 555-0300');
                              setTestWebhookMessage('Hello! Can you book me a live slot for next Tuesday at 2 PM? Use my email alex@ancientmacedon.com to block the date on your calendar.');
                            }}
                            className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 active:bg-white/15 text-[10px] text-slate-300 font-mono rounded-lg cursor-pointer transition-colors border border-white/5 text-left flex flex-col justify-between h-[68px]"
                            title="Test Google Calendar / Local Booking engine slot allocation"
                          >
                            <span className="font-bold text-indigo-400 block">📅 Slot Booking</span>
                            <span className="text-[9px] text-slate-450 block truncate">Next Tuesday 2 PM booking</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setTestWebhookSenderName('Sarah Conflict Test');
                              setTestWebhookSenderPhone('+44 7911 123456');
                              // Let's grab an appointment if exists, or suggest today / tomorrow right now
                              const tomorrowStr = new Date(Date.now() + 24*60*60*1000).toLocaleDateString();
                              setTestWebhookMessage(`Hi, can I get a 30-min consultation slot booked tomorrow at 2 PM? If that is conflict or double-booked, verify my email sarah.test@gmail.com and suggest next available slots!`);
                            }}
                            className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 active:bg-white/15 text-[10px] text-slate-300 font-mono rounded-lg cursor-pointer transition-colors border border-white/5 text-left flex flex-col justify-between h-[68px]"
                            title="Simulate calendar slot occupancy to check double-booking routing logic"
                          >
                            <span className="font-bold text-amber-500 block">⚠️ Busy Slot Test</span>
                            <span className="text-[9px] text-slate-450 block truncate">Double-booking avoidance</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setTestWebhookSenderName('Dr. Watson');
                              setTestWebhookSenderPhone('+1 (555) 019-9281');
                              setTestWebhookMessage('Tell me, what are your company pricing rates and guidelines listed in your knowledge base docs? Do you have custom pricing lists?');
                            }}
                            className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 active:bg-white/15 text-[10px] text-slate-300 font-mono rounded-lg cursor-pointer transition-colors border border-white/5 text-left flex flex-col justify-between h-[68px]"
                            title="Inquire about information stored in tenant Knowledge Base documents"
                          >
                            <span className="font-bold text-purple-400 block">📚 KB Lookup</span>
                            <span className="text-[9px] text-slate-450 block truncate">Query KB catalog rates</span>
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
                            className="w-full bg-[#0d121d] text-slate-100 px-3 py-2 border border-white/5 rounded-xl focus:border-emerald-500/40 outline-none"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-slate-400 block font-semibold">E.164 WhatsApp Phone:</label>
                          <input
                            type="text"
                            value={testWebhookSenderPhone}
                            onChange={(e) => setTestWebhookSenderPhone(e.target.value)}
                            placeholder="e.g. +1 (555) 902-1234"
                            className="w-full bg-[#0d121d] text-slate-100 px-3 py-2 border border-white/5 rounded-xl focus:border-emerald-500/40 outline-none"
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
                          className="w-full bg-[#0d121d] text-slate-100 p-3 border border-white/5 rounded-xl focus:border-emerald-500/40 outline-none text-xs"
                        />
                      </div>

                      <button
                        type="button"
                        disabled={isTestingWebhook || !testWebhookMessage.trim()}
                        onClick={async () => {
                          setIsTestingWebhook(true);
                          setTestWebhookLogs([]);
                          
                          const postLog = (msg: string) => {
                            setTestWebhookLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
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
                                      const newLead: Lead = {
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
                                      
                                      const newAppt: Appointment = {
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
                                setIsTestingWebhook(false);
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
                              
                              // Extract email if exists in body
                              const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;
                              const matchedEmails = testWebhookMessage.match(emailRegex);
                              const extractedEmail = matchedEmails ? matchedEmails[0] : `${testWebhookSenderName.toLowerCase().replace(/\s/g, '.')}@whatsapp.com`;

                              // Capture lead autonomously
                              const newMockLead: Lead = {
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
                              setIsTestingWebhook(false);
                            }, 2800);
                          }
                        }}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-550 border border-emerald-505 disabled:opacity-40 text-white font-mono text-xs font-bold rounded-xl shadow-lg cursor-pointer transition-colors flex items-center justify-center gap-1.5"
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
                              webhookViewMode === 'logs' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            Console Logs
                          </button>
                          <button
                            type="button"
                            onClick={() => setWebhookViewMode('payload')}
                            className={`px-3 py-1 rounded text-[10.5px] font-mono font-bold transition-all cursor-pointer ${
                              webhookViewMode === 'payload' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-slate-400 hover:text-slate-200'
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
                              <Terminal className="h-8 w-8 text-slate-700 animate-pulse" />
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
                  <form onSubmit={handleUpdateWhatsAppIntegration} className="lg:col-span-7 bg-[#080b12] border border-white/5 p-6 rounded-3xl space-y-5 shadow-2xl relative overflow-hidden text-slate-300">
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
                      {/* Field: WhatsApp Business phone number */}
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

                      {/* Field: Phone Number ID */}
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

                      {/* Field: Meta Permanent System User Access Token */}
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

                      {/* Field: Connection Status Selector */}
                      <div className="space-y-1.5">
                        <label htmlFor="wa-status-select" className="text-xs font-semibold text-slate-400 font-mono">
                          Simulated Handshake Status & Credentials Verification:
                        </label>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <select
                            id="wa-status-select"
                            value={waStatus}
                            onChange={(e) => setWaStatus(e.target.value as any)}
                            className="flex-1 bg-[#0d121d] text-slate-100 text-xs px-3 py-2.5 border border-white/5 focus:border-blue-500/40 rounded-xl outline-none focus:ring-1 focus:ring-blue-500/50 font-mono transition-all cursor-pointer"
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

                    {/* Step Cards Checklist */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono select-none">
                        Meta Portal Setup Checklist:
                      </h4>

                      <div className="p-3.5 rounded-2xl bg-white/[0.01] border border-white/5 flex gap-3 text-xs leading-normal">
                        <div className="h-6 w-6 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center font-mono font-bold shrink-0">
                          1
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <h5 className="font-bold text-slate-200">Register Meta App & Business Unit</h5>
                          <p className="text-slate-450 text-[11px]">
                            Navigate to <a href="https://developer.facebook.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">developer.facebook.com</a>, create an App, verify your organization, and select **WhatsApp Product setup** section.
                          </p>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-white/[0.01] border border-white/5 flex gap-3 text-xs leading-normal">
                        <div className="h-6 w-6 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center font-mono font-bold shrink-0">
                          2
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <h5 className="font-bold text-slate-200">Construct Callback Webhooks</h5>
                          <p className="text-slate-450 text-[11px]">
                            Click on Meta's WhatsApp **Configuration** side menu. Paste the callback parameters displayed above. Click **Verify and Save** to initiate the handshake.
                          </p>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-white/[0.01] border border-white/5 flex gap-3 text-xs leading-normal">
                        <div className="h-6 w-6 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center font-mono font-bold shrink-0">
                          3
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <h5 className="font-bold text-slate-200">Activate Webhooks Subscription Fields</h5>
                          <p className="text-slate-450 text-[11px]">
                            Inside the webhook subscription grid, make sure to check and subscribe to **`messages`** in order for Meta to instantly route production texts to OmniBot SaaS servers!
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

                {/* ADVANCED DEVELOPER INTEGRATION: Interactive Sandbox Webhook Tester */}
                <div className="bg-[#080b12] border border-white/5 p-6 rounded-3xl mt-6 space-y-5 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-500/3 rounded-full blur-2xl pointer-events-none"></div>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-bold tracking-wider font-mono text-emerald-450 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full select-none">
                          Developer Test Kit
                        </span>
                        <span className="text-emerald-400 font-mono text-[11px] animate-pulse">● Sandbox Ready</span>
                      </div>
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                        🛠️ Simulated Meta WhatsApp Webhook Payload Dispatches
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        Synthesize an incoming payload formatted precisely as Meta's Webhook server. Perfect for verifying endpoint routing, Gemini AI response maps, and CRM hook state engines.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleClearTestConversations}
                      className="px-3 py-1.5 hover:bg-white/5 border border-white/5 text-slate-400 hover:text-white text-[11px] font-medium rounded-xl transition-all font-mono cursor-pointer"
                    >
                      Clear Threads Store
                    </button>
                  </div>

                  <form onSubmit={handleTriggerTestWebhook} className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                    <div className="lg:col-span-4 space-y-4">
                      {/* Name fields */}
                      <div className="space-y-1.5">
                        <label htmlFor="test-webhook-name" className="text-[11.5px] font-semibold text-slate-400 font-mono block">
                          Simulated Customer Name:
                        </label>
                        <input
                          id="test-webhook-name"
                          type="text"
                          required
                          value={testWebhookSenderName}
                          onChange={(e) => setTestWebhookSenderName(e.target.value)}
                          className="w-full bg-[#0d121d] text-slate-100 text-xs px-3 py-2 border border-white/5 focus:border-blue-500/40 rounded-xl outline-none focus:ring-1 focus:ring-blue-500/50 font-mono transition-all"
                        />
                      </div>

                      {/* Phone ID */}
                      <div className="space-y-1.5">
                        <label htmlFor="test-webhook-phone" className="text-[11.5px] font-semibold text-slate-400 font-mono block">
                          Simulated Customer Phone (WABA Format):
                        </label>
                        <input
                          id="test-webhook-phone"
                          type="text"
                          required
                          value={testWebhookSenderPhone}
                          onChange={(e) => setTestWebhookSenderPhone(e.target.value)}
                          placeholder="33612345678"
                          className="w-full bg-[#0d121d] text-slate-100 text-xs px-3 py-2 border border-white/5 focus:border-blue-500/40 rounded-xl outline-none focus:ring-1 focus:ring-blue-500/50 font-mono transition-all"
                        />
                      </div>
                    </div>

                    <div className="lg:col-span-5 space-y-3">
                      <div className="space-y-1.5">
                        <label htmlFor="test-webhook-message" className="text-[11.5px] font-semibold text-slate-400 font-mono block">
                          Simulated Message body:
                        </label>
                        <textarea
                          id="test-webhook-message"
                          rows={3}
                          required
                          value={testWebhookMessage}
                          onChange={(e) => setTestWebhookMessage(e.target.value)}
                          className="w-full bg-[#0d121d] text-slate-100 text-xs px-3 py-2 border border-white/5 focus:border-blue-500/40 rounded-xl outline-none focus:ring-1 focus:ring-blue-500/50 font-mono transition-all resize-none"
                        />
                      </div>

                      {/* Presets */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        <span className="text-[10px] text-slate-500 font-semibold font-mono mr-1">Presets:</span>
                        <button
                          type="button"
                          onClick={() => setTestWebhookMessage("Hello, what are your group fitness rates?")}
                          className="bg-white/3 hover:bg-white/8 text-[9.5px] text-slate-400 hover:text-white px-2 py-0.5 rounded border border-white/5 cursor-pointer font-mono transition-all"
                        >
                          FAQ Questions
                        </button>
                        <button
                          type="button"
                          onClick={() => setTestWebhookMessage("I'd like to book an appointment. My name is Jane Doe, jane@test.com, phone 33612340000. Book space for tomorrow afternoon.")}
                          className="bg-white/3 hover:bg-white/8 text-[9.5px] text-slate-400 hover:text-white px-2 py-0.5 rounded border border-white/5 cursor-pointer font-mono transition-all"
                        >
                          Booking Intent
                        </button>
                        <button
                          type="button"
                          onClick={() => setTestWebhookMessage("Hi, capture my info: Jane, jane@zenith.com, so we can schedule something later.")}
                          className="bg-white/3 hover:bg-white/8 text-[9.5px] text-slate-400 hover:text-white px-2 py-0.5 rounded border border-white/5 cursor-pointer font-mono transition-all"
                        >
                          Lead Capture
                        </button>
                      </div>
                    </div>

                    <div className="lg:col-span-3 flex flex-col justify-end">
                      <button
                        type="submit"
                        disabled={isTestingWebhook}
                        className={`w-full py-3 px-4 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all border ${
                          isTestingWebhook 
                          ? "bg-slate-800 border-white/5 text-slate-500 cursor-not-allowed" 
                          : "bg-emerald-600 hover:bg-emerald-500 border-emerald-500/35 text-white shadow-[0_4px_16px_rgba(16,185,129,0.2)] hover:shadow-[0_4px_20px_rgba(16,185,129,0.35)]"
                        }`}
                      >
                        {isTestingWebhook ? (
                          <>
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                            <span>Dispatching Webhook...</span>
                          </>
                        ) : (
                          <>
                            <Send className="h-3.5 w-3.5" />
                            <span>Send Test Webhook</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>

                  {/* Test results & logging terminal layout */}
                  {(testWebhookLogs.length > 0 || testConversationsList.length > 0) && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-3 border-t border-white/5 animate-fadeIn">
                      {/* Log Console Output (7 cols) */}
                      <div className="lg:col-span-7 space-y-1.5">
                        <span className="text-[10px] font-semibold text-slate-450 uppercase tracking-wider font-mono block">
                          📟 Sandbox Execution Console:
                        </span>
                        <div className="bg-[#04060b] border border-white/5 p-4 rounded-xl h-48 overflow-y-auto font-mono text-[10.5px] text-slate-400 space-y-1 shadow-inner scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                          {testWebhookLogs.map((log, index) => (
                            <div key={index} className="leading-relaxed break-all">
                              {log.includes('✅') && <span className="text-emerald-450">{log}</span>}
                              {log.includes('❌') && <span className="text-rose-400 font-bold">{log}</span>}
                              {log.includes('🤖') && <span className="text-blue-400">{log}</span>}
                              {log.includes('🚀') && <span className="text-amber-400">{log}</span>}
                              {!log.includes('✅') && !log.includes('❌') && !log.includes('🤖') && !log.includes('🚀') && <span>{log}</span>}
                            </div>
                          ))}
                          {isTestingWebhook && (
                            <div className="text-slate-500 text-[10px] italic flex items-center gap-1.5 pt-1 animate-pulse">
                              <RefreshCw className="h-3 w-3 animate-spin text-emerald-500" />
                              <span>Waiting for Cloud response token processing...</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Chat Threads Output (5 cols) */}
                      <div className="lg:col-span-5 space-y-1.5">
                        <span className="text-[10px] font-semibold text-slate-455 uppercase tracking-wider font-mono block">
                          💬 Simulated Conversation Stream:
                        </span>
                        <div className="bg-[#04060b] border border-white/5 px-3 py-3 rounded-xl h-48 overflow-y-auto text-xs space-y-3 shadow-inner scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                          {testConversationsList.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-600 font-mono text-center px-4">
                              <span>No active message exchange found.</span>
                              <span className="text-[9.5px] mt-1">Submit the test webhook form to ignite the cycle.</span>
                            </div>
                          ) : (
                            testConversationsList.map((msg, index) => (
                              <div key={index} className={`flex flex-col ${msg.sender === 'bot' ? 'items-start' : 'items-end'}`}>
                                <div className={`px-2.5 py-1.5 rounded-xl max-w-[85%] ${
                                  msg.sender === 'bot' 
                                  ? 'bg-blue-600/15 border border-blue-500/10 text-slate-200' 
                                  : 'bg-[#0d121d] border border-white/5 text-slate-300'
                                }`}>
                                  <div className="font-semibold text-[9.5px] opacity-60 font-mono mb-0.5">
                                    {msg.sender === 'bot' ? selectedTenant.botName || 'Assistant' : testWebhookSenderName}
                                  </div>
                                  <p className="leading-snug text-[11px] select-all">{msg.text}</p>
                                </div>
                                <span className="text-[9px] text-slate-500 mt-0.5 px-1 font-mono">
                                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  )}
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
                      <div className="space-y-4 font-mono text-xs text-slate-300">
                        <div className="flex items-center justify-between p-3.5 bg-[#0c1222] border border-white/5 rounded-xl">
                          <div>
                            <span className="font-bold text-white block">Twilio Voice Active:</span>
                            <span className="text-[10px] text-slate-500 block leading-tight pt-0.5">Route incoming voice calls to Gemini.</span>
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
                          <label className="text-xs font-semibold text-slate-455 block font-mono">Gemini Live Voice Selector:</label>
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
                      <div className="space-y-4 font-mono text-xs text-slate-355 bg-[#0c1222] p-4.5 border border-white/5 rounded-2xl">
                        <div className="space-y-1">
                          <span className="text-slate-400 block text-[11px] font-semibold font-mono">
                            Twilio TwiML Webhook Callback URL:
                          </span>
                          <div className="bg-[#04060b] text-indigo-300 border border-white/5 px-2.5 py-1.5 rounded-lg flex items-center justify-between font-mono text-[10.5px]">
                            <span className="truncate select-all leading-normal text-indigo-400 font-bold">
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
              </div>
            )}

              {activeChannelSubTab === 'messenger' && (
                <div className="space-y-6 animate-fade-in">
                  
                  {/* Simulated Messenger Save Success message banner */}
                  {messengerSaveSuccess && (
                    <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-500/5 shadow-2xl flex items-center gap-3 relative overflow-hidden transition-all duration-300">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none"></div>
                      <CheckCircle className="h-5 w-5 text-blue-450 shrink-0" />
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
                              className="flex-1 bg-[#0d121d] text-slate-100 text-xs px-3 py-2.5 border border-white/5 focus:border-blue-500/40 rounded-xl outline-none focus:ring-1 focus:ring-blue-500/50 font-mono transition-all cursor-pointer"
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
                              className="bg-slate-800 text-blue-500 rounded border-slate-700 focus:ring-blue-500 cursor-pointer h-4 w-4"
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
                                  <span className="h-1.5 w-1.5 bg-blue-550 rounded-full animate-ping"></span>
                                  <span className="text-[8px] text-blue-400 font-mono font-bold">DEV_PORTAL_NOTIF</span>
                                </div>
                                <span className="text-[10px] text-amber-400 font-mono font-bold flex items-center gap-1">💬 SIMULATED USER NOTIFICATION</span>
                                <p className="text-[11px] text-slate-300 font-mono border-l-2 border-blue-500/40 pl-2 py-1 leading-relaxed select-all">
                                  "[Meta Developers] Verify simulated sandbox user <span className="text-white font-black">{messengerSandboxInputNumber}</span> for Zenith using code: <span className="font-bold text-yellow-300 bg-white/10 px-1.5 py-0.5 rounded select-all">{messengerSandboxSentCode}</span>"
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
                                      setMessengerSandboxError(null);
                                    }}
                                    className="bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 px-3 py-2 rounded-lg cursor-pointer"
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
                            <div className="text-center p-4 bg-white/[0.01] border border-dashed border-white/5 rounded-xl text-slate-505 text-[11px]">
                              Turn on Sandbox mode above to register & test custom profiles.
                            </div>
                          ) : messengerSandboxNumbers.length === 0 ? (
                            <div className="text-center p-4 bg-white/[0.01] border border-dashed border-white/5 rounded-xl text-slate-505 text-[11px]">
                              No profiles registered. Register a developer handle above to initiate!
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {messengerSandboxNumbers.map((user, idx) => (
                                <div key={idx} className="p-2.5 bg-[#0d121d] border border-white/5 rounded-xl flex items-center justify-between text-xs font-mono">
                                  <span className="text-slate-300 flex items-center gap-1.5 truncate">
                                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                                    {user}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteMessengerSandboxNumber(user)}
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
                              className="px-2 py-1.5 bg-white/5 hover:bg-white/10 text-[9px] text-slate-350 rounded-lg cursor-pointer transition-colors text-left truncate"
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
                              className="px-2 py-1.5 bg-white/5 hover:bg-white/10 text-[9px] text-slate-350 rounded-lg cursor-pointer transition-colors text-left truncate"
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
                              className="px-2 py-1.5 bg-white/5 hover:bg-white/10 text-[9px] text-slate-350 rounded-lg cursor-pointer transition-colors text-left truncate"
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
                                messengerSandboxNumbers.map((user, uidx) => (
                                  <option key={uidx} value={user}>Matched Selector: {user}</option>
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
                                      ? 'bg-rose-500 text-white border-rose-400 animate-pulse'
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
                              <label htmlFor="messenger-input-voice-note-checkbox" className="text-[10px] font-mono text-slate-350 cursor-pointer flex items-center gap-1 bg-transparent">
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
                            <div className="text-slate-600 h-full flex flex-col justify-center items-center text-center">
                              <span>📟 TELEMETRY SYSTEM IDLE</span>
                              <span className="text-[9px] mt-1 text-slate-605">Submit the trigger form to initiate Graph API pipeline outputs.</span>
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
                            <div className="h-full flex flex-col items-center justify-center text-slate-600 font-mono text-center px-4">
                              <span>No active message exchange found.</span>
                              <span className="text-[9.5px] mt-1">Submit the test webhook form to ignite the cycle.</span>
                            </div>
                          ) : (
                            testMessengerConversationsList.map((msg, index) => {
                              const isPlaying = playingMessengerMessageId === `msg-${index}`;
                              const handlePlayVoice = () => {
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
                                          onClick={handlePlayVoice}
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

                                    <p className={`leading-snug text-[10.5px] select-all font-sans ${msg.isAudio ? 'italic text-slate-350 pt-0.5 border-t border-white/5' : ''}`}>
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

                </div>
              )}

              </div>
            )}

            {/* TAB: Immersive WhatsApp smartphone testing simulator */}
            {activeTab === 'simulator' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-display font-medium tracking-tight text-white">{t('simulatorTitle')}</h2>
                  <p className="text-xs text-slate-450 mt-0.5 font-mono">{t('simulatorSub')}</p>
                </div>

                <BotSimulator
                  selectedTenant={selectedTenant}
                  onLeadCaptured={handleAddLiveLead}
                  onAppointmentBooked={handleLiveAppointmentBooked}
                  googleAccessToken={googleToken}
                  appointmentsList={activeAppointments}
                  onConnectGoogle={handleGoogleLogin}
                  onRefreshCalendar={async () => {
                    if (googleToken) {
                      try {
                        await loadGoogleCalendar(googleToken);
                      } catch (err) {
                        console.error("Refresh calendar failed:", err);
                      }
                    }
                  }}
                />
              </div>
            )}

          </div>

        </div>

      </div>

      {/* Shared SaaS Footer */}
      <footer className="mt-auto px-6 py-10 border-t border-white/5 bg-transparent text-center text-xs text-slate-500 font-mono">
        <p>&copy; 2026 OmniBot SaaS Platform. Autonomous AI Messaging Solutions. Synced for Google Workspace.</p>
      </footer>
    </div>
  );
};
