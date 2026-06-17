import React, { useState } from 'react';
import { SaaSLandingPage } from './components/SaaSLandingPage';
import { SaaSAuth } from './components/SaaSAuth';
import { SaaSLayout } from './components/SaaSLayout';
import { SaaSOwnerDashboard } from './components/SaaSOwnerDashboard';
import { Tenant, Lead, Appointment, KnowledgeBaseItem, Agent } from './types';
import { DEFAULT_TENANTS } from './defaultData';

export default function App() {
  // Navigation Routing States
  const [view, setView] = useState<'landing' | 'auth' | 'admin' | 'owner'>('landing');
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  
  // Custom states
  const [tenants, setTenants] = useState<Tenant[]>(DEFAULT_TENANTS);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('zenith-fitness');
  const [newlyRegisteredTenant, setNewlyRegisteredTenant] = useState<Tenant | null>(null);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);

  // Synchronize state with backend
  React.useEffect(() => {
    const fetchTenants = async () => {
      try {
        const res = await fetch('/api/tenants');
        if (res.ok) {
          const store = await res.json();
          const list = Object.values(store) as Tenant[];
          if (list.length > 0) {
            setTenants(list);
          } else {
            // If server store is empty, capture the presets to server
            await fetch('/api/tenants/sync-all', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(DEFAULT_TENANTS)
            });
          }
        }
      } catch (err) {
        console.error('Failed to load tenants from backend:', err);
      }
    };
    fetchTenants();
  }, []);

  React.useEffect(() => {
    const syncTenants = async () => {
      try {
        await fetch('/api/tenants/sync-all', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(tenants)
        });
      } catch (err) {
        console.error('Failed to sync tenants with backend:', err);
      }
    };
    
    // Slight debounce to avoid multi-write timing locks
    const timer = setTimeout(syncTenants, 800);
    return () => clearTimeout(timer);
  }, [tenants]);

  // Quick action: Instant admin login for pre-populated presets
  const handleQuickDemo = (tenantId: string) => {
    setSelectedTenantId(tenantId);
    setSessionEmail('demo.superuser@gmail.com');
    setView('admin');
  };

  // Auth: Navigating inside signin or signup
  const handleNavigateToAuth = (mode: 'signin' | 'signup') => {
    setAuthMode(mode);
    setView('auth');
  };

  // Auth: Logged in successfully
  const handleLoginSuccess = (email: string, tenantId?: string) => {
    setSessionEmail(email);
    if (email === 'owner@saas.com' || tenantId === 'platform-owner-override') {
      setView('owner');
      return;
    }
    if (tenantId) {
      setSelectedTenantId(tenantId);
    } else {
      // Default fallback
      setSelectedTenantId('zenith-fitness');
    }
    setView('admin');
  };

  // Helper to generate descriptive vertical instruction text
  const generateInstruction = (companyName: string, industry: string, botName: string, tone: string) => {
    return `You are ${botName}, the virtual representative for ${companyName}.
Your tone is ${tone} and encouraging.
You operate in the ${industry} niche. 
Your key performance indices are to:
1. Warmly answer FAQs from our Private Knowledge Base.
2. Formulate and record new lead opportunities (name, phone, mail).
3. Securely check availability and book reservations directly on our Google Calendar.
Avoid lecturing the customer. Keep your answers brief and to-the-point layout.`;
  };

  // Auth: Signed up custom company successfully (Dynamic multi-tenant instantiation!)
  const handleSignUpSuccess = (config: {
    companyName: string;
    industry: string;
    botName: string;
    tone: 'professional' | 'friendly' | 'casual' | 'empathetic';
    email: string;
  }) => {
    setSessionEmail(config.email);
    
    const slug = config.companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'custom-tenant';
    const finalId = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`;

    const industryEmoji = config.industry === 'Fitness' ? '💪' : config.industry === 'Healthcare' ? '🥼' : config.industry === 'Legal' ? '⚖️' : '🛒';

    // Tailor starting assets based on vertical selection
    let mockLeads: Lead[] = [];
    let mockKb: KnowledgeBaseItem[] = [];
    let mockAppointments: Appointment[] = [];
    let descriptionText = `Professional multi-agent pipeline for ${config.companyName}.`;

    const nowIso = new Date().toISOString().split('T')[0];

    if (config.industry === 'Fitness') {
      descriptionText = `Bespoke athletics studio focused on private and strength programs.`;
      
      mockLeads = [
        {
          id: `lead-1-${finalId}`,
          name: 'Chris Hemsworth',
          phone: '+1 (555) 732-2391',
          email: 'thor.chris@marvel-train.com',
          status: 'Qualified',
          dateCaptured: `${nowIso}T10:15:30Z`,
          note: 'Interested in advanced power-lifting and bulk programs.'
        },
        {
          id: `lead-2-${finalId}`,
          name: 'Scarlett Johansson',
          phone: '+1 (555) 489-3220',
          email: 'scarlett.j@widow-agility.org',
          status: 'New',
          dateCaptured: `${nowIso}T14:45:00Z`,
          note: 'Inquired about core gymnastics and endurance coaching.'
        }
      ];

      mockKb = [
        {
          id: `kb-1-${finalId}`,
          type: 'faq',
          title: 'Membership Fees & Options',
          content: 'Zenith Elite Plan is priced at $89/month which grants unlimited 24/7 keyless door code access, free recovery locker facilities, and 1 introductory profiling session with Coach Sarah.',
          dateAdded: nowIso
        },
        {
          id: `kb-2-${finalId}`,
          type: 'document',
          title: 'Hours & Access Rules',
          content: 'Staff physical hours are daily 6:00 AM to 10:00 PM. Digital check-ins are recorded automatically via the smartphone scan badge app. Members must clean and racked all bars.',
          dateAdded: nowIso
        }
      ];

      mockAppointments = [
        {
          id: `appt-1-${finalId}`,
          customerName: 'Robert Downey',
          customerPhone: '+1 (555) 939-1020',
          email: 'robert.d@stark-core.com',
          start: `${nowIso}T15:00:00`,
          end: `${nowIso}T16:00:00`,
          summary: '1-on-1 Fitness Assessment',
          syncedWithGoogle: false
        }
      ];
    } else if (config.industry === 'Healthcare') {
      descriptionText = `Compassionate wellness center prioritizing recovery and diagnostics.`;

      mockLeads = [
        {
          id: `lead-1-${finalId}`,
          name: 'Liam Neeson',
          phone: '+1 (555) 302-3921',
          email: 'liam.n@taken-wellness.com',
          status: 'Interested',
          dateCaptured: `${nowIso}T11:20:00Z`,
          note: 'Requires deep-tissue sports orthopedic evaluation.'
        },
        {
          id: `lead-2-${finalId}`,
          name: 'Emma Watson',
          phone: '+1 (555) 782-9912',
          email: 'emma.w@granger-posture.edu',
          status: 'New',
          dateCaptured: `${nowIso}T16:05:00Z`,
          note: 'Wants to schedule persistent neck and ergonomics check.'
        }
      ];

      mockKb = [
        {
          id: `kb-1-${finalId}`,
          type: 'faq',
          title: 'Insurance & Claims Policy',
          content: 'We support all major healthcare network insurances. Direct-billing queries can be routed to bills@wellness.org. Deductibles start at $20 a session depending on tier.',
          dateAdded: nowIso
        },
        {
          id: `kb-2-${finalId}`,
          type: 'document',
          title: 'Clinic Consulting Costs',
          content: 'General postural screening or preliminary physical counseling with certified physicians starts at $120. Customized wellness plan write-ups carry no extra initial premium.',
          dateAdded: nowIso
        }
      ];

      mockAppointments = [
        {
          id: `appt-1-${finalId}`,
          customerName: 'Gwyneth Paltrow',
          customerPhone: '+1 (555) 232-4412',
          email: 'gwyneth@goop-care.com',
          start: `${nowIso}T09:30:00`,
          end: `${nowIso}T10:30:00`,
          summary: 'Orthopedic posture consult',
          syncedWithGoogle: false
        }
      ];
    } else if (config.industry === 'Legal') {
      descriptionText = `Pristine legal advisor group handling commercial and property litigation.`;

      mockLeads = [
        {
          id: `lead-1-${finalId}`,
          name: 'Bruce Wayne',
          phone: '+1 (555) 909-0012',
          email: 'bwayne@wayne-industries.com',
          status: 'Qualified',
          dateCaptured: `${nowIso}T09:15:00Z`,
          note: 'Wants intellectual property portfolio audits and corporate filing.'
        }
      ];

      mockKb = [
        {
          id: `kb-1-${finalId}`,
          type: 'faq',
          title: 'Retainer Rates & Pricing',
          content: 'Standard associate consultation rates start at $250/hour. Senior partner litigation retainers require a flat upfront premium of $5,000 kept in escrow accounts.',
          dateAdded: nowIso
        }
      ];

      mockAppointments = [
        {
          id: `appt-1-${finalId}`,
          customerName: 'Clark Kent',
          customerPhone: '+1 (555) 707-1122',
          email: 'kent.c@dailyplanet-press.org',
          start: `${nowIso}T11:00:00`,
          end: `${nowIso}T12:00:00`,
          summary: 'NDA & Libel review audit',
          syncedWithGoogle: false
        }
      ];
    } else {
      // Custom Shop
      descriptionText = `Bespoke artisanal studio and local dispatch workshop.`;

      mockLeads = [
        {
          id: `lead-1-${finalId}`,
          name: 'Keanu Reeves',
          phone: '+1 (555) 123-9090',
          email: 'wick.k@continental-repair.com',
          status: 'Qualified',
          dateCaptured: `${nowIso}T12:30:00Z`,
          note: 'Demands custom laser metal engraving schedule.'
        }
      ];

      mockKb = [
        {
          id: `kb-1-${finalId}`,
          type: 'faq',
          title: 'Turnaround Timelines & Logistics',
          content: 'General workshop custom estimates are provided in 48 hours. Express parcel deliveries carry a flat rate $15 premium. Custom products are non-refundable after processing starts.',
          dateAdded: nowIso
        }
      ];

      mockAppointments = [
        {
          id: `appt-1-${finalId}`,
          customerName: 'Neo Anderson',
          customerPhone: '+1 (555) 101-0101',
          email: 'anderson@source-code.net',
          start: `${nowIso}T14:00:00`,
          end: `${nowIso}T15:00:00`,
          summary: 'Bespoke item blueprint consult',
          syncedWithGoogle: false
        }
      ];
    }

    const startAgent: Agent = {
      id: `agent-main-${finalId}`,
      name: config.botName,
      role: 'Booking/Sales',
      tone: config.tone,
      avatar: industryEmoji,
      systemInstruction: generateInstruction(config.companyName, config.industry, config.botName, config.tone),
      isCustom: true
    };

    const myTenant: Tenant = {
      id: finalId,
      name: config.companyName,
      industry: config.industry,
      description: descriptionText,
      avatar: industryEmoji,
      botName: config.botName,
      tone: config.tone,
      status: 'active',
      systemInstruction: startAgent.systemInstruction,
      agents: [startAgent],
      activeAgentId: startAgent.id,
      knowledgeBase: mockKb,
      leads: mockLeads,
      appointments: mockAppointments,
      welcomeTemplates: [
        {
          id: 'temp-1',
          name: 'Welcome intro',
          text: `Hi! Welcome to ${config.companyName}. I am ${config.botName}, your autonomous representative. How can I help you book or coordinate with our team today?`
        },
        {
          id: 'temp-2',
          name: 'Direct Pricing inquiry response',
          text: `Hello! I see you are inquiring about our services and prices. I'd love to fetch the information straight from our secure Knowledge Base ledger. What did you want to check?`
        }
      ],
      activeWelcomeTemplateId: 'temp-1',
      whatsAppPhoneNumber: '+1 (555) 000-0000',
      whatsAppStatus: 'connected',
      whatsAppVerifiedSid: `SID${Math.floor(100000 + Math.random() * 900000)}`
    };

    setTenants(prev => {
      if (!prev.some(t => t.id === myTenant.id)) {
        return [myTenant, ...prev];
      }
      return prev;
    });
    setNewlyRegisteredTenant(myTenant);
    setSelectedTenantId(myTenant.id);
    setView('admin');
  };

  const handleLogoutAdmin = () => {
    setView('landing');
    setSessionEmail(null);
  };

  return (
    <>
      {view === 'landing' && (
        <SaaSLandingPage 
          onNavigateToAuth={handleNavigateToAuth}
          onQuickDemo={handleQuickDemo}
        />
      )}

      {view === 'auth' && (
        <SaaSAuth 
          initialMode={authMode}
          onNavigateBack={() => setView('landing')}
          onLoginSuccess={handleLoginSuccess}
          onSignUpSuccess={handleSignUpSuccess}
        />
      )}

      {view === 'owner' && (
        <SaaSOwnerDashboard 
          tenants={tenants}
          onUpdateTenantStatus={(tenantId, status) => {
            setTenants(prev => prev.map(t => t.id === tenantId ? { ...t, status } : t));
          }}
          onDeleteTenant={(tenantId) => {
            setTenants(prev => prev.filter(t => t.id !== tenantId));
          }}
          onImpersonateTenant={(tenantId) => {
            setSelectedTenantId(tenantId);
            setView('admin');
          }}
          onLogout={handleLogoutAdmin}
          onGoToPortal={() => setView('landing')}
        />
      )}

      {view === 'admin' && (
        <SaaSLayout 
          initialTenantId={selectedTenantId}
          newSignUpTenant={newlyRegisteredTenant}
          tenants={tenants}
          setTenants={setTenants}
          sessionEmail={sessionEmail}
          onGoToOwnerConsole={() => setView('owner')}
          onLogoutAdmin={handleLogoutAdmin}
        />
      )}
    </>
  );
}
