export interface KBChunk {
  text: string;
  embedding?: number[];
}

export interface KnowledgeBaseItem {
  id: string;
  type: 'faq' | 'document' | 'file' | 'url' | 'crawl';
  title: string;
  content: string;
  dateAdded: string;
  fileType?: 'pdf' | 'md' | 'docx' | 'txt' | 'csv' | 'other';
  fileSize?: string;
  url?: string;
  crawlDepth?: number;
  crawlStatus?: 'pending' | 'crawling' | 'synced' | 'failed';
  crawlPagesCount?: number;
  socialNetwork?: 'instagram' | 'facebook' | 'linkedin' | 'twitter' | 'web';
  chunks?: KBChunk[];
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
  status: 'New' | 'Interested' | 'Qualified' | 'Contacted';
  dateCaptured: string;
  note?: string;
}

export interface Appointment {
  id: string;
  customerName: string;
  customerPhone: string;
  email: string;
  start: string; // ISO string
  end: string;   // ISO string
  summary: string;
  notes?: string;
  syncedWithGoogle: boolean;
  googleEventId?: string;
}

export interface Agent {
  id: string;
  name: string;
  role: string; // e.g., 'Support', 'Sales', 'Booking'
  tone: 'professional' | 'friendly' | 'casual' | 'empathetic';
  systemInstruction: string;
  avatar: string;
  isCustom?: boolean;
  voiceEnabled?: boolean;
}

export interface WelcomeTemplate {
  id: string;
  name: string;
  text: string;
}

export interface Tenant {
  id: string;
  name: string;
  industry: string;
  description: string;
  avatar: string;
  botName: string;
  tone: 'professional' | 'friendly' | 'casual' | 'empathetic';
  status: 'active' | 'paused';
  systemInstruction?: string;
  welcomeTemplates?: WelcomeTemplate[];
  activeWelcomeTemplateId?: string;
  knowledgeBase: KnowledgeBaseItem[];
  leads: Lead[];
  appointments: Appointment[];
  whatsAppPhoneNumber?: string;
  whatsAppVerifiedSid?: string;
  whatsAppStatus?: 'connected' | 'disconnected' | 'pending_verification';
  whatsAppApiKey?: string;
  whatsAppSandboxActive?: boolean;
  whatsAppSandboxNumbers?: string[];
  whatsAppTestMode?: boolean;
  messengerPageId?: string;
  messengerToken?: string;
  messengerStatus?: 'connected' | 'disconnected' | 'pending_verification';
  messengerSandboxActive?: boolean;
  messengerSandboxNumbers?: string[];
  messengerVoiceEnabled?: boolean;
  agents?: Agent[];
  activeAgentId?: string;
  googleCalendarAutoSchedule?: boolean;
  twilioVoiceActive?: boolean;
  twilioVoiceName?: string;
  crawlSchedule?: 'none' | 'daily' | 'weekly';
  lastCrawlTime?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'bot' | 'customer' | 'system';
  text: string;
  timestamp: string;
  status?: 'sent' | 'delivered' | 'read';
  actionsTriggered?: {
    type: 'capture_lead' | 'book_appointment' | 'consult_kb' | 'purchase_item';
    details: string;
  };
  isInternal?: boolean;
  assignedAgentName?: string;
}

export interface SimulationSession {
  id: string;
  customerName: string;
  customerPhone: string;
  messages: ChatMessage[];
  isTyping: boolean;
  status: 'active' | 'completed';
  assignedAgentName?: string;
}
