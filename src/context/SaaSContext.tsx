import React, { createContext, useContext, useState, useEffect } from 'react';
import { Tenant, Lead, Appointment, KnowledgeBaseItem, Agent } from '../types';
import { DEFAULT_TENANTS } from '../defaultData';
import { googleSignIn, logout, initAuth } from '../firebase';
import { listGoogleCalendarEvents, createGoogleCalendarEvent, deleteGoogleCalendarEvent } from '../googleCalendar';
import { createGoogleSpreadsheet, appendRowToGoogleSpreadsheet, sendGmailMessage } from '../googleWorkspace';
import { User as FirebaseUser } from 'firebase/auth';
import { useLanguage } from '../LanguageContext';

interface SaaSContextType {
  // Master Tenants list
  tenants: Tenant[];
  setTenants: React.Dispatch<React.SetStateAction<Tenant[]>>;
  selectedTenantId: string;
  setSelectedTenantId: (id: string) => void;
  selectedTenant: Tenant;
  updateTenantFields: (fields: Partial<Tenant>) => void;
  userRole: 'admin' | 'support';
  setUserRole: (role: 'admin' | 'support') => void;
  sessionEmail: string | null;

  // Firebase Auth
  user: FirebaseUser | null;
  googleToken: string | null;
  needsAuth: boolean;
  isLoggingIn: boolean;
  authError: string | null;
  handleGoogleLogin: () => Promise<void>;
  handleGoogleLogout: () => Promise<void>;

  // Calendar
  googleEvents: Appointment[];
  isSyncingCalendar: boolean;
  calendarError: string | null;
  activeAppointments: Appointment[];
  loadGoogleCalendar: (token: string, bypassSync?: boolean) => Promise<void>;
  handleConfirmCancelEvent: () => Promise<void>;
  eventPendingDelete: { id: string; name: string; isGoogle: boolean } | null;
  setEventPendingDelete: (val: { id: string; name: string; isGoogle: boolean } | null) => void;

  // Knowledge Base Form States
  kbTitleInput: string;
  setKbTitleInput: (val: string) => void;
  kbContentInput: string;
  setKbContentInput: (val: string) => void;
  kbTypeInput: 'faq' | 'document' | 'file' | 'url' | 'crawl';
  setKbTypeInput: (val: 'faq' | 'document' | 'file' | 'url' | 'crawl') => void;
  showAddKb: boolean;
  setShowAddKb: (val: boolean) => void;
  kbFileMeta: { name: string; size: string; type: string } | null;
  setKbFileMeta: (val: { name: string; size: string; type: string } | null) => void;
  kbUrlInput: string;
  setKbUrlInput: (val: string) => void;
  kbCrawlSource: 'web' | 'instagram' | 'facebook' | 'linkedin' | 'twitter';
  setKbCrawlSource: (val: 'web' | 'instagram' | 'facebook' | 'linkedin' | 'twitter') => void;
  kbCrawlDepth: number;
  setKbCrawlDepth: (val: number) => void;
  kbCrawlPages: number;
  setKbCrawlPages: (val: number) => void;
  kbCrawlStatus: 'idle' | 'running' | 'completed' | 'failed';
  kbCrawlProgress: number;
  kbCrawlLogs: string[];
  isProcessingKb: boolean;
  kbProcessingStep: string;
  dragActive: boolean;
  setDragActive: (val: boolean) => void;

  // KB Actions
  handleSimulateFileUpload: (fileName: string, fileSize: string, content: string, titleName: string) => void;
  handleDrag: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
  handleManualFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSimulateUrlFetch: () => void;
  handleStartSimulatedCrawl: () => Promise<void>;
  handleAddKbItem: (e: React.FormEvent) => void;

  // Leads CRM
  leadNameInput: string;
  setLeadNameInput: (val: string) => void;
  leadPhoneInput: string;
  setLeadPhoneInput: (val: string) => void;
  leadEmailInput: string;
  setLeadEmailInput: (val: string) => void;
  leadNoteInput: string;
  setLeadNoteInput: (val: string) => void;
  showAddLead: boolean;
  setShowAddLead: (val: boolean) => void;
  leadsSearchQuery: string;
  setLeadsSearchQuery: (val: string) => void;
  leadsStatusFilter: string;
  setLeadsStatusFilter: (val: string) => void;
  handleAddLiveLead: (newLead: Lead) => void;
  handleManualAddLead: (e: React.FormEvent) => void;
  handleExportToCSV: () => void;
  handleLiveAppointmentBooked: (appt: Appointment) => Promise<void>;
  handleAutopilotToggle: (enabled: boolean) => Promise<void>;

  // Live Chat / Takeover
  takeoverConvos: Record<string, { messages: any[]; assignedAgentName?: string }>;
  setTakeoverConvos: React.Dispatch<React.SetStateAction<Record<string, { messages: any[]; assignedAgentName?: string }>>>;
  selectedConvoKey: string | null;
  setSelectedConvoKey: (key: string | null) => void;
  takeoverReplyText: string;
  setTakeoverReplyText: (val: string) => void;
  isSendingTakeoverReply: boolean;
  isFetchingTakeoverConvos: boolean;
  isDialerModalOpen: boolean;
  setIsDialerModalOpen: (val: boolean) => void;
  dialerCustomerNumber: string;
  setDialerCustomerNumber: (val: string) => void;
  dialerCustomerName: string;
  setDialerCustomerName: (val: string) => void;
  dialerState: 'dialing' | 'connected' | 'ended';
  setDialerState: (val: 'dialing' | 'connected' | 'ended') => void;
  dialerTimer: number;
  isInternalNote: boolean;
  setIsInternalNote: (val: boolean) => void;
  handleSendTakeoverReply: (customerId: string) => Promise<void>;

  // Welcome Messages & Agent Settings
  showAddTemplateForm: boolean;
  setShowAddTemplateForm: (val: boolean) => void;
  templateNameInput: string;
  setTemplateNameInput: (val: string) => void;
  templateTextInput: string;
  setTemplateTextInput: (val: string) => void;
  editingTemplateId: string | null;
  handleSaveWelcomeTemplate: (e: React.FormEvent) => void;
  handleDeleteWelcomeTemplate: (templateId: string) => void;
  handleStartEditWelcomeTemplate: (templateId: string) => void;
  handleSetActiveWelcomeTemplate: (templateId: string) => void;

  showAddAgentForm: boolean;
  setShowAddAgentForm: (val: boolean) => void;
  editingAgentId: string | null;
  agentNameInput: string;
  setAgentNameInput: (val: string) => void;
  agentRoleInput: string;
  setAgentRoleInput: (val: string) => void;
  agentToneInput: 'professional' | 'friendly' | 'casual' | 'empathetic';
  setAgentToneInput: (val: 'professional' | 'friendly' | 'casual' | 'empathetic') => void;
  agentSystemInstructionInput: string;
  setAgentSystemInstructionInput: (val: string) => void;
  agentAvatarInput: string;
  setAgentAvatarInput: (val: string) => void;
  agentVoiceEnabledInput: boolean;
  setAgentVoiceEnabledInput: (val: boolean) => void;
  agentActionSuccess: string | null;
  getTenantAgents: (tenant: Tenant) => Agent[];
  handleApplyAgentArchetype: (archetype: 'sales' | 'faq' | 'booking' | 'support' | 'customer_support' | 'retail_sales') => void;
  handleSelectActiveAgent: (agentId: string) => void;
  handleSaveAgent: (e: React.FormEvent) => void;
  handleStartEditAgent: (agentId: string) => void;
  handleDeleteAgent: (agentId: string) => void;

  // Prompt Sandbox Playground
  playgroundMessages: { sender: 'customer' | 'bot'; text: string; timestamp?: string; action?: any }[];
  setPlaygroundMessages: React.Dispatch<React.SetStateAction<{ sender: 'customer' | 'bot'; text: string; timestamp?: string; action?: any }[]>>;
  playgroundInput: string;
  setPlaygroundInput: (val: string) => void;
  playgroundInstruction: string;
  setPlaygroundInstruction: (val: string) => void;
  playgroundIsLoading: boolean;
  playgroundRawResponse: any;
  playgroundSystemPromptUsed: string;
  playgroundSelectedAgentId: string;
  setPlaygroundSelectedAgentId: (val: string) => void;
  playgroundSuccessMsg: string | null;
  handleSendPlaygroundMessage: (e?: React.FormEvent) => Promise<void>;
  handleApplyPlaygroundInstructionsToAgent: () => void;

  // Webhook Integrations
  webhookLeadId: string;
  webhookStatus: 'idle' | 'sending' | 'success' | 'failed';
  webhookLogs: string[];
  handleTriggerWebhookDispatch: (lead: Lead) => void;

  // WhatsApp Config
  waPhone: string;
  setWaPhone: (val: string) => void;
  waSid: string;
  setWaSid: (val: string) => void;
  waToken: string;
  setWaToken: (val: string) => void;
  waStatus: 'connected' | 'disconnected' | 'pending_verification';
  waShowToken: boolean;
  setWaShowToken: (val: boolean) => void;
  waTestMode: boolean;
  setWaTestMode: (val: boolean) => void;
  waSandboxActive: boolean;
  waSandboxNumbers: string[];
  waSandboxInputNumber: string;
  setWaSandboxInputNumber: (val: string) => void;
  waSandboxCode: string;
  setWaSandboxCode: (val: string) => void;
  waSandboxSentCode: string;
  waSandboxStep: 'idle' | 'sending' | 'otp_sent' | 'verified';
  waSandboxError: string | null;
  handleUpdateWhatsAppIntegration: (e: React.FormEvent) => void;
  handleTestConnection: () => void;
  handleToggleSandboxMode: (active: boolean) => void;
  handleRequestSandboxOTP: (e: React.FormEvent) => void;
  handleVerifySandboxOTP: (e: React.FormEvent) => void;
  handleDeleteSandboxNumber: (numberToDelete: string) => void;

  // Messenger Config
  messengerPageId: string;
  setMessengerPageId: (val: string) => void;
  messengerToken: string;
  setMessengerToken: (val: string) => void;
  messengerStatus: 'connected' | 'disconnected' | 'pending_verification';
  messengerShowToken: boolean;
  setMessengerShowToken: (val: boolean) => void;
  messengerSaveSuccess: boolean;
  messengerSandboxActive: boolean;
  messengerSandboxNumbers: string[];
  messengerSandboxInputNumber: string;
  setMessengerSandboxInputNumber: (val: string) => void;
  messengerSandboxCode: string;
  setMessengerSandboxCode: (val: string) => void;
  messengerSandboxSentCode: string;
  messengerSandboxStep: 'idle' | 'sending' | 'otp_sent' | 'verified';
  messengerSandboxError: string | null;
  activeChannelSubTab: 'whatsapp' | 'messenger';
  setActiveChannelSubTab: (val: 'whatsapp' | 'messenger') => void;
  isTestingConnection: boolean;
  connectionFeedback: { type: 'success' | 'error'; text: string } | null;
  setConnectionFeedback: (val: { type: 'success' | 'error'; text: string } | null) => void;
  isTestingMessengerConnection: boolean;
  messengerConnectionFeedback: { type: 'success' | 'error'; text: string } | null;
  setMessengerConnectionFeedback: (val: { type: 'success' | 'error'; text: string } | null) => void;
  handleUpdateMessengerIntegration: (e: React.FormEvent) => void;
  handleTestMessengerConnection: () => void;
  handleToggleMessengerSandboxMode: (active: boolean) => void;
  handleRequestMessengerSandboxOTP: (e: React.FormEvent) => void;
  handleVerifyMessengerSandboxOTP: (e: React.FormEvent) => void;
  handleDeleteMessengerSandboxNumber: (userToDelete: string) => void;

  // Webhook Tester
  testWebhookSenderName: string;
  setTestWebhookSenderName: (val: string) => void;
  testWebhookSenderPhone: string;
  setTestWebhookSenderPhone: (val: string) => void;
  testWebhookMessage: string;
  setTestWebhookMessage: (val: string) => void;
  isTestingWebhook: boolean;
  testWebhookLogs: string[];
  testConversationsList: any[];
  webhookViewMode: 'logs' | 'payload';
  setWebhookViewMode: (val: 'logs' | 'payload') => void;
  payloadCopied: boolean;
  setPayloadCopied: (val: boolean) => void;
  handleTriggerTestWebhook: (e: React.FormEvent) => Promise<void>;
  handleClearTestConversations: () => Promise<void>;

  // Messenger Webhook Tester
  testMessengerWebhookSenderName: string;
  setTestMessengerWebhookSenderName: (val: string) => void;
  testMessengerWebhookSenderPSID: string;
  setTestMessengerWebhookSenderPSID: (val: string) => void;
  testMessengerWebhookMessage: string;
  setTestMessengerWebhookMessage: (val: string) => void;
  isTestingMessengerWebhook: boolean;
  testMessengerWebhookLogs: string[];
  testMessengerConversationsList: any[];
  messengerVoiceEnabled: boolean;
  setMessengerVoiceEnabled: (val: boolean) => void;
  playingMessengerMessageId: string | null;
  setPlayingMessengerMessageId: (val: string | null) => void;
  isMessengerChatMicActive: boolean;
  messengerInputIsVoiceNote: boolean;
  setMessengerInputIsVoiceNote: (val: boolean) => void;
  handleTriggerMessengerWebhook: (e: React.FormEvent) => Promise<void>;
  toggleMessengerChatMic: () => void;
  handleClearMessengerConversations: () => Promise<void>;

  // Workspace Integration & Sheets Lead Export
  exportingToSheets: boolean;
  sheetsExportUrl: string | null;
  sheetsExportError: string | null;
  setSheetsExportError: (val: string | null) => void;
  handleExportToSheets: () => Promise<void>;

  // Email Nurture Settings
  nurtureTriggerActive: boolean;
  setNurtureTriggerActive: (val: boolean) => void;
  nurtureTriggerStage: string;
  setNurtureTriggerStage: (val: string) => void;
  nurtureSubjectTemplate: string;
  setNurtureSubjectTemplate: (val: string) => void;
  nurtureBodyTemplate: string;
  setNurtureBodyTemplate: (val: string) => void;
  nurtureLogs: string[];
  setNurtureLogs: React.Dispatch<React.SetStateAction<string[]>>;
  handleTriggerNurtureEmail: (leadName: string, leadEmail: string, currentStatus: string) => Promise<void>;

  // Speech Recognition / Audio
  isRecordingAgent: boolean;
  isRecordingPlayground: boolean;
  speechError: string | null;
  startVoiceRecording: (target: 'agent' | 'playground') => void;
  stopVoiceRecording: () => void;
  handlePlayVoice: (msgText: string, messageId: string) => void;
}

const SaaSContext = createContext<SaaSContextType | undefined>(undefined);

export const SaaSProvider: React.FC<{
  tenants: Tenant[];
  setTenants: React.Dispatch<React.SetStateAction<Tenant[]>>;
  initialTenantId?: string;
  newSignUpTenant?: Tenant | null;
  sessionEmail: string | null;
  children: React.ReactNode;
}> = ({
  tenants,
  setTenants,
  initialTenantId,
  newSignUpTenant,
  sessionEmail,
  children
}) => {
  const [selectedTenantId, setSelectedTenantId] = useState<string>(initialTenantId || 'zenith-fitness');
  const [userRole, setUserRole] = useState<'admin' | 'support'>('admin');

  // Live Chat Takeover States
  const [takeoverConvos, setTakeoverConvos] = useState<Record<string, { messages: any[]; assignedAgentName?: string }>>({});
  const [selectedConvoKey, setSelectedConvoKey] = useState<string | null>(null);
  const [takeoverReplyText, setTakeoverReplyText] = useState('');
  const [isSendingTakeoverReply, setIsSendingTakeoverReply] = useState(false);
  const [isFetchingTakeoverConvos, setIsFetchingTakeoverConvos] = useState(false);
  const [isDialerModalOpen, setIsDialerModalOpen] = useState(false);
  const [dialerCustomerNumber, setDialerCustomerNumber] = useState('');
  const [dialerCustomerName, setDialerCustomerName] = useState('');
  const [dialerState, setDialerState] = useState<'dialing' | 'connected' | 'ended'>('dialing');
  const [dialerTimer, setDialerTimer] = useState(0);
  const [isInternalNote, setIsInternalNote] = useState(false);

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
  }, [newSignUpTenant, setTenants]);

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

  // Initialize Firebase Auth Listener on load
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setGoogleToken(token);
        setNeedsAuth(false);
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
      const events = await listGoogleCalendarEvents(token);
      setGoogleEvents(events);

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

  // Sync Google Calendar when selected tenant changes or Google auth is configured
  useEffect(() => {
    if (googleToken && selectedTenantId) {
      loadGoogleCalendar(googleToken);
    }
  }, [googleToken, selectedTenantId]);

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
      console.error(err);
      setSheetsExportError(err?.message || 'Sheets Export failed.');
    } finally {
      setExportingToSheets(false);
    }
  };

  const handleTriggerNurtureEmail = async (leadName: string, leadEmail: string, currentStatus: string) => {
    if (!googleToken) {
      setNurtureLogs(prev => [
        `[${new Date().toLocaleTimeString()}] ⚠️ Failed to trigger nurture sequence: Google Authentication credentials missing.`,
        ...prev
      ]);
      return;
    }

    try {
      const subject = nurtureSubjectTemplate
        .replace(/{customer_name}/g, leadName)
        .replace(/{tenant_name}/g, selectedTenant.name)
        .replace(/{status}/g, currentStatus);

      const body = nurtureBodyTemplate
        .replace(/{customer_name}/g, leadName)
        .replace(/{tenant_name}/g, selectedTenant.name)
        .replace(/{status}/g, currentStatus);

      const response = await sendGmailMessage(googleToken, leadEmail, subject, body);
      setNurtureLogs(prev => [
        `[${new Date().toLocaleTimeString()}] ✅ [GMAIL TRANSMITTED] Successfully dispatched nurture sequence to "${leadName}" <${leadEmail}>. Gmail ID: ${response.id}`,
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
      const sizeStr = (file.size / 1024).toFixed(1) + ' KB';
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        handleSimulateFileUpload(file.name, sizeStr, text || "Parsed unstructured metadata content.", file.name.split('.')[0]);
      };
      reader.readAsText(file);
    }
  };

  const handleManualFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const sizeStr = (file.size / 1024).toFixed(1) + ' KB';
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        handleSimulateFileUpload(file.name, sizeStr, text || "Parsed unstructured metadata content.", file.name.split('.')[0]);
      };
      reader.readAsText(file);
    }
  };

  const handleSimulateUrlFetch = () => {
    if (!kbUrlInput.trim()) return;
    setIsProcessingKb(true);
    setKbProcessingStep('Resolving DNS route to host...');
    
    setTimeout(() => {
      setKbProcessingStep('Downloading HTML document hierarchy...');
      setTimeout(() => {
        setKbProcessingStep('Scraping page tags and DOM nodes...');
        setTimeout(() => {
          setIsProcessingKb(false);
          setKbProcessingStep('');
          
          let parsedTitle = kbUrlInput.replace('https://', '').replace('http://', '').split('/')[0] + ' Info';
          parsedTitle = parsedTitle.charAt(0).toUpperCase() + parsedTitle.slice(1);
          
          setKbTitleInput(parsedTitle);
          setKbContentInput(`[Indexed URL Resource: ${kbUrlInput}]
Scraped metadata from dynamic live portal on ${new Date().toLocaleDateString()}.
Service catalog:
- Standard premium offerings starting from $45.
- Multi-channel support options.
- Address: 100 Corporate Parkway.
- Refund Policy: 14 days full moneyback on all digital bookings.`);
        }, 500);
      }, 500);
    }, 500);
  };

  const handleStartSimulatedCrawl = async () => {
    if (!kbUrlInput.trim()) return;
    setKbCrawlStatus('running');
    setKbCrawlProgress(10);
    setKbCrawlLogs([
      `[${new Date().toLocaleTimeString()}] 🚀 Initiating specialized crawler daemon at target: ${kbUrlInput}`,
      `[${new Date().toLocaleTimeString()}] 🔍 Validating SSRF rules (Checking target resolves to non-internal IP)...`
    ]);

    setTimeout(() => {
      setKbCrawlProgress(35);
      setKbCrawlLogs(prev => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] 🔑 SSRF Passed! Target resolved to safe external IP.`,
        `[${new Date().toLocaleTimeString()}] 🌐 Resolving sitemap.xml and depth levels (Depth: ${kbCrawlDepth}, Pages Budget: ${kbCrawlPages})...`,
        `[${new Date().toLocaleTimeString()}] 🕷️ Crawling root entry node: ${kbUrlInput}`
      ]);
    }, 1000);

    setTimeout(() => {
      setKbCrawlProgress(75);
      setKbCrawlLogs(prev => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] 📄 Scraped 3 internal sub-pages successfully.`,
        `[${new Date().toLocaleTimeString()}] ⚙️ Executing text chunking (Fixed 800-token sizes with 100-token overlaps)...`,
        `[${new Date().toLocaleTimeString()}] 🧠 Requesting vector embeddings from Google Gemini API...`
      ]);
    }, 2200);

    setTimeout(async () => {
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

        if (response.ok) {
          const resData = await response.json();
          setKbCrawlProgress(100);
          setKbCrawlStatus('completed');
          setKbCrawlLogs(prev => [
            ...prev,
            `[${new Date().toLocaleTimeString()}] 💾 Writing synchronized vector indexes to local cache stores...`,
            `[${new Date().toLocaleTimeString()}] ✅ Success! Scraping completed. Embedded document "${resData.kbItem.title}" into Private Knowledge Base.`
          ]);

          const freshRes = await fetch('/api/tenants');
          if (freshRes.ok) {
            const data = await freshRes.json();
            const list = Object.values(data) as Tenant[];
            if (list.length > 0) {
              setTenants(list);
            }
          }
          
          setKbUrlInput('');
        } else {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Server rejected crawl process');
        }
      } catch (err: any) {
        console.error("Crawl error:", err);
        setKbCrawlStatus('failed');
        setKbCrawlLogs(prev => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] ❌ Crawl aborted due to network failure: ${err.message}`
        ]);
      }
    }, 3800);
  };

  const handleAddKbItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!kbTitleInput.trim() || !kbContentInput.trim()) return;

    const newItem: KnowledgeBaseItem = {
      id: 'kb-' + Date.now(),
      type: kbTypeInput,
      title: kbTitleInput.trim(),
      content: kbContentInput.trim(),
      dateAdded: new Date().toISOString().split('T')[0]
    };

    const currentKb = selectedTenant.knowledgeBase || [];
    updateTenantFields({
      knowledgeBase: [newItem, ...currentKb]
    });

    setKbTitleInput('');
    setKbContentInput('');
    setKbFileMeta(null);
    setShowAddKb(false);
  };

  const handleAddLiveLead = (newLead: Lead) => {
    const currentLeads = selectedTenant.leads || [];
    updateTenantFields({
      leads: [newLead, ...currentLeads]
    });
  };

  const handleManualAddLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadNameInput.trim() || !leadPhoneInput.trim() || !leadEmailInput.trim()) return;

    const newLead: Lead = {
      id: 'lead-' + Date.now(),
      name: leadNameInput.trim(),
      phone: leadPhoneInput.trim(),
      email: leadEmailInput.trim(),
      status: 'New',
      dateCaptured: new Date().toISOString(),
      note: leadNoteInput.trim() || 'Manually added in dashboard.'
    };

    handleAddLiveLead(newLead);

    if (nurtureTriggerActive && nurtureTriggerStage === 'New') {
      handleTriggerNurtureEmail(newLead.name, newLead.email, 'New');
    }

    setLeadNameInput('');
    setLeadPhoneInput('');
    setLeadEmailInput('');
    setLeadNoteInput('');
    setShowAddLead(false);
  };

  const handleExportToCSV = () => {
    const activeLeads = selectedTenant.leads || [];
    const headers = 'Name,Email,Phone,Status,Date Captured,Notes\n';
    const rows = activeLeads.map(l => 
      `"${l.name}","${l.email}","${l.phone}","${l.status}","${l.dateCaptured}","${l.note}"`
    ).join('\n');
    
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${selectedTenant.id}-leads-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleLiveAppointmentBooked = async (appt: Appointment) => {
    const currentAppts = selectedTenant.appointments || [];
    const updated = [appt, ...currentAppts];

    if (googleToken) {
      try {
        const syncedAppt = await createGoogleCalendarEvent(googleToken, {
          customerName: appt.customerName,
          customerPhone: appt.customerPhone,
          email: appt.email,
          start: appt.start,
          end: appt.end,
          summary: appt.summary,
          notes: appt.notes
        });

        const syncedIndex = updated.findIndex(a => a.id === appt.id);
        if (syncedIndex > -1) {
          updated[syncedIndex] = {
            ...appt,
            id: syncedAppt.id,
            syncedWithGoogle: true,
            googleEventId: syncedAppt.id
          };
        }
        
        loadGoogleCalendar(googleToken, true);
      } catch (err) {
        console.error('[CALENDAR_MANUAL] Failed syncing appt to Google:', err);
      }
    }

    updateTenantFields({
      appointments: updated
    });
  };

  const handleConfirmCancelEvent = async () => {
    if (!eventPendingDelete) return;

    if (eventPendingDelete.isGoogle && googleToken) {
      try {
        await deleteGoogleCalendarEvent(googleToken, eventPendingDelete.id);
        setGoogleEvents(prev => prev.filter(e => e.id !== eventPendingDelete.id));
      } catch (err) {
        console.error('Failed to delete calendar event from Google:', err);
        alert('Could not cancel event from Google Calendar feed.');
      }
    }

    const currentAppts = selectedTenant.appointments || [];
    const updated = currentAppts.filter(a => 
      a.id !== eventPendingDelete.id && a.googleEventId !== eventPendingDelete.id
    );

    updateTenantFields({
      appointments: updated
    });

    setEventPendingDelete(null);
  };

  const handleToggleBotStatus = () => {
    const nextStatus = selectedTenant.status === 'active' ? 'suspended' : 'active';
    updateTenantFields({
      status: nextStatus
    });
  };

  const handleUpdateWhatsAppIntegration = (e: React.FormEvent) => {
    e.preventDefault();
    updateTenantFields({
      whatsAppPhoneNumber: waPhone,
      whatsAppVerifiedSid: waSid,
      whatsAppApiKey: waToken,
      whatsAppStatus: waStatus
    });
  };

  const handleTestConnection = () => {
    if (isTestingConnection) return;
    setIsTestingConnection(true);
    setConnectionFeedback(null);

    setTimeout(() => {
      setIsTestingConnection(false);
      const isTokenPlaceholder = !waToken || waToken === 'dummy' || waToken.includes('...') || waToken.length < 30;
      if (waSid && waToken && !isTokenPlaceholder) {
        setWaStatus('connected');
        updateTenantFields({ whatsAppStatus: 'connected' });
        setConnectionFeedback({ type: 'success', text: 'Connection Established: Meta Graph credentials verified successfully!' });
      } else {
        setWaStatus('pending_verification');
        updateTenantFields({ whatsAppStatus: 'pending_verification' });
        setConnectionFeedback({ type: 'error', text: 'Verification Failed: Please enter authentic SID and active system token.' });
      }
    }, 2000);
  };

  const handleTestMessengerConnection = () => {
    if (isTestingMessengerConnection) return;
    setIsTestingMessengerConnection(true);
    setMessengerConnectionFeedback(null);

    setTimeout(() => {
      setIsTestingMessengerConnection(false);
      const isTokenPlaceholder = !messengerToken || messengerToken === 'dummy' || messengerToken.includes('...') || messengerToken.length < 30;
      if (messengerPageId && messengerToken && !isTokenPlaceholder) {
        setMessengerStatus('connected');
        updateTenantFields({ messengerStatus: 'connected' });
        setMessengerConnectionFeedback({ type: 'success', text: 'Page webhook connected successfully!' });
      } else {
        setMessengerStatus('pending_verification');
        updateTenantFields({ messengerStatus: 'pending_verification' });
        setMessengerConnectionFeedback({ type: 'error', text: 'Verification Failed: Token credentials rejected.' });
      }
    }, 2000);
  };

  const handleToggleSandboxMode = (active: boolean) => {
    setWaSandboxActive(active);
    updateTenantFields({ whatsAppSandboxActive: active });
  };

  const handleRequestSandboxOTP = (e: React.FormEvent) => {
    e.preventDefault();
    if (!waSandboxInputNumber.trim()) return;
    setWaSandboxStep('sending');
    setWaSandboxError(null);

    setTimeout(() => {
      const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
      setWaSandboxSentCode(generatedCode);
      setWaSandboxStep('otp_sent');
      console.log(`[SIMULATOR SMS DEV OTP] Verification Code for ${waSandboxInputNumber}: ${generatedCode}`);
    }, 1800);
  };

  const handleVerifySandboxOTP = (e: React.FormEvent) => {
    e.preventDefault();
    if (waSandboxCode === waSandboxSentCode) {
      setWaSandboxStep('verified');
      const updated = [...waSandboxNumbers, waSandboxInputNumber];
      setWaSandboxNumbers(updated);
      updateTenantFields({ whatsAppSandboxNumbers: updated });
      setTimeout(() => {
        setWaSandboxStep('idle');
        setWaSandboxInputNumber('');
        setWaSandboxCode('');
        setWaSandboxSentCode('');
      }, 1000);
    } else {
      setWaSandboxError('Incorrect OTP code.');
    }
  };

  const handleDeleteSandboxNumber = (numberToDelete: string) => {
    const updated = waSandboxNumbers.filter(n => n !== numberToDelete);
    setWaSandboxNumbers(updated);
    updateTenantFields({ whatsAppSandboxNumbers: updated });
  };

  const handleUpdateMessengerIntegration = (e: React.FormEvent) => {
    e.preventDefault();
    updateTenantFields({
      messengerPageId: messengerPageId,
      messengerToken: messengerToken,
      messengerStatus: messengerStatus
    });
    setMessengerSaveSuccess(true);
    setTimeout(() => setMessengerSaveSuccess(false), 3000);
  };

  const handleToggleMessengerSandboxMode = (active: boolean) => {
    setMessengerSandboxActive(active);
    updateTenantFields({ messengerSandboxActive: active });
  };

  const handleRequestMessengerSandboxOTP = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messengerSandboxInputNumber.trim()) return;
    setMessengerSandboxStep('sending');
    setMessengerSandboxError(null);

    setTimeout(() => {
      const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
      setMessengerSandboxSentCode(generatedCode);
      setMessengerSandboxStep('otp_sent');
      console.log(`[MESSENGER SIMULATOR SMS DEV OTP] Verification Code for Page User: ${generatedCode}`);
    }, 1800);
  };

  const handleVerifyMessengerSandboxOTP = (e: React.FormEvent) => {
    e.preventDefault();
    if (messengerSandboxCode === messengerSandboxSentCode) {
      setMessengerSandboxStep('verified');
      const updated = [...messengerSandboxNumbers, messengerSandboxInputNumber];
      setMessengerSandboxNumbers(updated);
      updateTenantFields({ messengerSandboxNumbers: updated });
      setTimeout(() => {
        setMessengerSandboxStep('idle');
        setMessengerSandboxInputNumber('');
        setMessengerSandboxCode('');
        setMessengerSandboxSentCode('');
      }, 1000);
    } else {
      setMessengerSandboxError('Incorrect OTP code.');
    }
  };

  const handleDeleteMessengerSandboxNumber = (userToDelete: string) => {
    const updated = messengerSandboxNumbers.filter(n => n !== userToDelete);
    setMessengerSandboxNumbers(updated);
    updateTenantFields({ messengerSandboxNumbers: updated });
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
      
      await new Promise(r => setTimeout(r, 2600));
      
      addLog(`🔄 Syncing live conversations database and leads table...`);
      
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

  // Dialer call timer tick hook
  useEffect(() => {
    let interval: any;
    if (isDialerModalOpen && dialerState === 'connected') {
      interval = setInterval(() => {
        setDialerTimer(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isDialerModalOpen, dialerState]);

  // Simulate call progression: dialing -> connected after 2.5 seconds
  useEffect(() => {
    if (isDialerModalOpen && dialerState === 'dialing') {
      const timer = setTimeout(() => {
        setDialerState('connected');
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [isDialerModalOpen, dialerState]);

  const handleSendTakeoverReply = async (customerId: string) => {
    if (!takeoverReplyText.trim() || !selectedTenant) return;
    setIsSendingTakeoverReply(true);
    try {
      const response = await fetch(`/api/conversations/${selectedTenant.id}/${customerId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: takeoverReplyText, isInternal: isInternalNote })
      });
      if (response.ok) {
        setTakeoverReplyText('');
        setIsInternalNote(false);
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
      const updated = currentTemplates.map(t => 
        t.id === editingTemplateId 
          ? { ...t, name: templateNameInput.trim(), text: templateTextInput.trim() } 
          : t
      );
      updateTenantFields({
        welcomeTemplates: updated
      });
    } else {
      const newTemplate = {
        id: 'wt-' + Date.now(),
        name: templateNameInput.trim(),
        text: templateTextInput.trim()
      };
      const updated = [...currentTemplates, newTemplate];
      const nextActiveId = selectedTenant.activeWelcomeTemplateId || newTemplate.id;

      updateTenantFields({
        welcomeTemplates: updated,
        activeWelcomeTemplateId: nextActiveId
      });
    }

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
      agents: agentsList,
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

  const getUnifiedAppointmentsList = (): Appointment[] => {
    if (googleToken) {
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

  const handlePlayVoice = (msgText: string, messageId: string) => {
    if (playingMessengerMessageId === messageId) {
      window.speechSynthesis.cancel();
      setPlayingMessengerMessageId(null);
      return;
    }

    window.speechSynthesis.cancel();
    setPlayingMessengerMessageId(messageId);

    const cleanText = msgText.replace(/[*#]/g, '').trim();
    const utterance = new SpeechSynthesisUtterance(cleanText);

    const voices = window.speechSynthesis.getVoices();
    let selectedVoice = voices.find(voice => voice.lang.includes('en-GB') || voice.lang.includes('en-US'));
    if (selectedVoice) utterance.voice = selectedVoice;

    utterance.onend = () => {
      setPlayingMessengerMessageId(null);
    };

    utterance.onerror = (e) => {
      console.warn("SpeechSynthesis error:", e);
      setPlayingMessengerMessageId(null);
    };

    window.speechSynthesis.speak(utterance);
  };

  const value: SaaSContextType = {
    tenants,
    setTenants,
    selectedTenantId,
    setSelectedTenantId,
    selectedTenant,
    updateTenantFields,
    userRole,
    setUserRole,
    sessionEmail,

    // Firebase Auth
    user,
    googleToken,
    needsAuth,
    isLoggingIn,
    authError,
    handleGoogleLogin,
    handleGoogleLogout,

    // Calendar
    googleEvents,
    isSyncingCalendar,
    calendarError,
    activeAppointments,
    loadGoogleCalendar,
    handleConfirmCancelEvent,
    eventPendingDelete,
    setEventPendingDelete,

    // Knowledge Base Form States
    kbTitleInput,
    setKbTitleInput,
    kbContentInput,
    setKbContentInput,
    kbTypeInput,
    setKbTypeInput,
    showAddKb,
    setShowAddKb,
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
    setDragActive,

    // KB Actions
    handleSimulateFileUpload,
    handleDrag,
    handleDrop,
    handleManualFileSelect,
    handleSimulateUrlFetch,
    handleStartSimulatedCrawl,
    handleAddKbItem,

    // Leads CRM
    leadNameInput,
    setLeadNameInput,
    leadPhoneInput,
    setLeadPhoneInput,
    leadEmailInput,
    setLeadEmailInput,
    leadNoteInput,
    setLeadNoteInput,
    showAddLead,
    setShowAddLead,
    leadsSearchQuery,
    setLeadsSearchQuery,
    leadsStatusFilter,
    setLeadsStatusFilter,
    handleAddLiveLead,
    handleManualAddLead,
    handleExportToCSV,
    handleLiveAppointmentBooked,

    // Live Chat / Takeover
    takeoverConvos,
    setTakeoverConvos,
    selectedConvoKey,
    setSelectedConvoKey,
    takeoverReplyText,
    setTakeoverReplyText,
    isSendingTakeoverReply,
    isFetchingTakeoverConvos,
    isDialerModalOpen,
    setIsDialerModalOpen,
    dialerCustomerNumber,
    setDialerCustomerNumber,
    dialerCustomerName,
    setDialerCustomerName,
    dialerState,
    setDialerState,
    dialerTimer,
    isInternalNote,
    setIsInternalNote,
    handleSendTakeoverReply,

    // Welcome Messages & Agent Settings
    showAddTemplateForm,
    setShowAddTemplateForm,
    templateNameInput,
    setTemplateNameInput,
    templateTextInput,
    setTemplateTextInput,
    editingTemplateId,
    handleSaveWelcomeTemplate,
    handleDeleteWelcomeTemplate,
    handleStartEditWelcomeTemplate,
    handleSetActiveWelcomeTemplate,

    showAddAgentForm,
    setShowAddAgentForm,
    editingAgentId,
    agentNameInput,
    setAgentNameInput,
    agentRoleInput,
    setAgentRoleInput,
    agentToneInput,
    setAgentToneInput,
    agentSystemInstructionInput,
    setAgentSystemInstructionInput,
    agentAvatarInput,
    setAgentAvatarInput,
    agentVoiceEnabledInput,
    setAgentVoiceEnabledInput,
    agentActionSuccess,
    getTenantAgents,
    handleApplyAgentArchetype,
    handleSelectActiveAgent,
    handleSaveAgent,
    handleStartEditAgent,
    handleDeleteAgent,

    // Prompt Sandbox Playground
    playgroundMessages,
    setPlaygroundMessages,
    playgroundInput,
    setPlaygroundInput,
    playgroundInstruction,
    setPlaygroundInstruction,
    playgroundIsLoading,
    playgroundRawResponse,
    playgroundSystemPromptUsed,
    playgroundSelectedAgentId,
    setPlaygroundSelectedAgentId,
    playgroundSuccessMsg,
    handleSendPlaygroundMessage,
    handleApplyPlaygroundInstructionsToAgent,

    // Webhook Integrations
    webhookLeadId,
    webhookStatus,
    webhookLogs,
    handleTriggerWebhookDispatch,

    // WhatsApp Config
    waPhone,
    setWaPhone,
    waSid,
    setWaSid,
    waToken,
    setWaToken,
    waStatus,
    waShowToken,
    setWaShowToken,
    waTestMode,
    setWaTestMode,
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

    // Messenger Config
    messengerPageId,
    setMessengerPageId,
    messengerToken,
    setMessengerToken,
    messengerStatus,
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
    activeChannelSubTab,
    setActiveChannelSubTab,
    isTestingConnection,
    connectionFeedback,
    setConnectionFeedback,
    isTestingMessengerConnection,
    messengerConnectionFeedback,
    setMessengerConnectionFeedback,
    handleUpdateMessengerIntegration,
    handleTestMessengerConnection,
    handleToggleMessengerSandboxMode,
    handleRequestMessengerSandboxOTP,
    handleVerifyMessengerSandboxOTP,
    handleDeleteMessengerSandboxNumber,

    // Webhook Tester
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
    handleTriggerTestWebhook,
    handleClearTestConversations,

    // Messenger Webhook Tester
    testMessengerWebhookSenderName,
    setTestMessengerWebhookSenderName,
    testMessengerWebhookSenderPSID,
    setTestMessengerWebhookSenderPSID,
    testMessengerWebhookMessage,
    setTestMessengerWebhookMessage,
    isTestingMessengerWebhook,
    testMessengerWebhookLogs,
    testMessengerConversationsList,
    messengerVoiceEnabled,
    setMessengerVoiceEnabled,
    playingMessengerMessageId,
    setPlayingMessengerMessageId,
    isMessengerChatMicActive,
    messengerInputIsVoiceNote,
    setMessengerInputIsVoiceNote,
    handleTriggerMessengerWebhook,
    toggleMessengerChatMic,
    handleClearMessengerConversations,

    // Workspace Integration & Sheets Lead Export
    exportingToSheets,
    sheetsExportUrl,
    sheetsExportError,
    setSheetsExportError,
    handleExportToSheets,

    // Email Nurture Settings
    nurtureTriggerActive,
    setNurtureTriggerActive,
    nurtureTriggerStage,
    setNurtureTriggerStage,
    nurtureSubjectTemplate,
    setNurtureSubjectTemplate,
    nurtureBodyTemplate,
    setNurtureBodyTemplate,
    nurtureLogs,
    setNurtureLogs,
    handleTriggerNurtureEmail,

    // Speech Recognition / Audio
    isRecordingAgent,
    isRecordingPlayground,
    speechError,
    startVoiceRecording,
    stopVoiceRecording,
    handlePlayVoice,
    handleAutopilotToggle
  };

  return (
    <SaaSContext.Provider value={value}>
      {children}
    </SaaSContext.Provider>
  );
};

export const useSaaS = () => {
  const context = useContext(SaaSContext);
  if (context === undefined) {
    throw new Error('useSaaS must be used within a SaaSProvider');
  }
  return context;
};
