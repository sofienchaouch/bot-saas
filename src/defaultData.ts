import { Tenant } from './types';

export const DEFAULT_TENANTS: Tenant[] = [
  {
    id: 'zenith-fitness',
    name: 'Zenith Elite Fitness',
    industry: 'Health & Wellness',
    description: 'A premium private athletic club offering performance personal training, biological sauna recovery, and performance nutrition coaching.',
    avatar: '🏋️‍♂️',
    botName: 'Aura',
    tone: 'friendly',
    status: 'active',
    systemInstruction: 'You are are Aura, the supportive fitness bot for Zenith Elite Fitness. You focus on scheduling consultations, advising on memberships, and providing class hours.',
    welcomeTemplates: [
      {
        id: 'zf-wt-1',
        name: 'Standard Greeting 👋',
        text: 'Hello! I am Aura, your Zenith Elite assistant. How can I help you achieve your goals today? I can share our pricing, guide you through biological sauna bookings, or help you schedule an elite personal coaching slot!'
      },
      {
        id: 'zf-wt-2',
        name: 'Promo Welcome Offer 🎁',
        text: 'Hey there! Aura here from Zenith Elite Fitness. Welcome! We are currently offering a special 15% discount on your first biological sauna recovery session when you book clean today. Ask me about our "Recovery Only" package to learn more!'
      },
      {
        id: 'zf-wt-3',
        name: 'Weekend / Outside Hours 🌙',
        text: 'Hello, thank you for reaching out to Zenith Elite! Our trainers are currently offline training clients or getting some quality biological sleep, but I am Aura, your AI assistant, and I can answer your membership questions and book appointments 24/7!'
      }
    ],
    activeWelcomeTemplateId: 'zf-wt-1',
    agents: [
      {
        id: 'zenith-agent-support',
        name: 'Aura',
        role: 'Membership FAQ & Sauna Support',
        tone: 'friendly',
        avatar: '🌸',
        systemInstruction: 'You are Aura, the supportive fitness bot for Zenith Elite Fitness. You focus on scheduling sauna recovery slots, advising on memberships, and providing class hours.'
      },
      {
        id: 'zenith-agent-sales',
        name: 'Coach Hulk',
        role: 'High-Ticket PT Sales Trainer',
        tone: 'casual',
        avatar: '💪',
        systemInstruction: 'You are Coach Hulk, an energetic, highly motivating PT sales coach. You are casual, energetic, and punchy. Your sole objective is selling personal training packs ($85/hr starting) and the $350 Private Athlete package. Push hard with motivational quotes!'
      },
      {
        id: 'zenith-agent-concierge',
        name: 'Zenith Concierge',
        role: 'Elite Corporate Retreats & B2B',
        tone: 'professional',
        avatar: '🕶️',
        systemInstruction: 'You are the Zenith Corporate Concierge. You are highly professional, polite, and elegant. You discuss B2B wellness packages, corporate biological health retreats, and high-end executive memberships.'
      }
    ],
    activeAgentId: 'zenith-agent-support',
    whatsAppPhoneNumber: '+1 (555) 321-7222',
    whatsAppVerifiedSid: 'phone_3217222_prod',
    whatsAppStatus: 'connected',
    whatsAppApiKey: 'waba_live_zenith_7x9p3q1v8m5a2k4y',
    whatsAppSandboxActive: true,
    whatsAppSandboxNumbers: ['+1 (555) 019-2831', '+44 7911 123456'],
    messengerPageId: 'page_102983749201923',
    messengerToken: 'fb_live_eaag_zenith_9876251',
    messengerStatus: 'connected',
    messengerSandboxActive: true,
    messengerSandboxNumbers: ['user_scope_1029', 'user_scope_4021'],
    knowledgeBase: [
      {
        id: 'zf-kb-1',
        type: 'faq',
        title: 'Membership Tiers & Pricing',
        content: `membership packages:
- Elite Performance: $180/month. Unlimited gym access, 2 biological sauna bookings/week, 1 fitness evaluation.
- Private Athlete: $350/month. Unlimited access, 4 biological sauna sessions, 2 1-on-1 personal training hours, nutrition coaching.
- Recovery Only: $110/month. biological sauna access only (up to 4 times a week).`,
        dateAdded: '2026-04-10'
      },
      {
        id: 'zf-kb-2',
        type: 'document',
        title: 'Biological Sauna Recovery Guidelines',
        content: `Standard biological sauna sessions are booked in 45-minute slots. 
Temperature is set between 175°F to 190°F. Clients must bring clean towels. Cold plunges are available adjacent to the sauna room and can be used on a first-come, first-served basis during the 45-minute block.
Appointments must be booked at least 2 hours in advance.`,
        dateAdded: '2026-04-15'
      },
      {
        id: 'zf-kb-3',
        type: 'faq',
        title: 'Personal Training Sessions',
        content: 'Personal workouts are booked in 60-minute windows. Packages start at $85/hour if purchased in blocks of 10. Individual assessments are $120. Cancellations require a 24-hour advance notice to prevent loss of the session credit.',
        dateAdded: '2026-05-01'
      }
    ],
    leads: [
      {
        id: 'zf-l-1',
        name: 'Sarah Jenkins',
        phone: '+1 (555) 382-9901',
        email: 'sarah.j@gmail.com',
        status: 'Interested',
        dateCaptured: '2026-05-21',
        note: 'Wants to sign up for biological sauna and private training.'
      },
      {
        id: 'zf-l-2',
        name: 'Marcus Brody',
        phone: '+1 (555) 722-1082',
        email: 'brody.m@gmail.com',
        status: 'New',
        dateCaptured: '2026-05-23',
        note: 'Enquired about Elite Performance package hours.'
      }
    ],
    appointments: [
      {
        id: 'zf-a-1',
        customerName: 'Derrick Vance',
        customerPhone: '+1 (555) 492-3021',
        email: 'derrickv@hotmail.com',
        start: '2026-05-24T10:00:00Z',
        end: '2026-05-24T11:00:00Z',
        summary: 'Zenith Elite: 1-on-1 Personal Coaching Block',
        notes: 'Introductory biometric review and initial squat form assessment.',
        syncedWithGoogle: false
      },
      {
        id: 'zf-a-2',
        customerName: 'Sarah Jenkins',
        customerPhone: '+1 (555) 382-9901',
        email: 'sarah.j@gmail.com',
        start: '2026-05-25T14:30:00Z',
        end: '2026-05-25T15:15:00Z',
        summary: 'Zenith Elite: 45-min Biological Sauna & Cold Plunge',
        notes: 'Client requested warm organic tea pre-session.',
        syncedWithGoogle: false
      }
    ]
  },
  {
    id: 'gourmet-catering',
    name: 'Gourmet Craft Catering',
    industry: 'Food & Beverage',
    description: 'A bespoke corporate and wedding fine dining caterer offering custom molecular gastronomy menus and professional event staffing.',
    avatar: '🍽️',
    botName: 'Chef Celeste',
    tone: 'professional',
    status: 'active',
    systemInstruction: 'You are Chef Celeste, the digital event planner representing Gourmet Craft Catering. Be warm, accurate, professional, and guide clients towards requesting a booking.',
    welcomeTemplates: [
      {
        id: 'gc-wt-1',
        name: 'Fine Dining Welcome 🍽️',
        text: 'Welcome to Gourmet Craft Catering. I am Chef Celeste, your digital coordinator. Are you planning a wedding banquet, corporate bistros, or standard cocktail gastronomy? Let me assist you in finalizing a menu and scheduling a tasting session.'
      },
      {
        id: 'gc-wt-2',
        name: 'Urgent Consultation Hotline ⚠️',
        text: 'Thank you for contacting Gourmet Craft Catering! Chef Celeste here. If you have an event under 14 days away, please ask me about our urgent dietary accommodations and standard bistros right now so we can secure your booking!'
      }
    ],
    activeWelcomeTemplateId: 'gc-wt-1',
    agents: [
      {
        id: 'gourmet-agent-celeste',
        name: 'Chef Celeste',
        role: 'Culinary Curator & Sommelier',
        tone: 'professional',
        avatar: '👩‍🍳',
        systemInstruction: 'You are Chef Celeste, the digital event planner representing Gourmet Craft Catering. Be warm, accurate, professional, and guide clients towards requesting custom molecular menus and wine pairings.'
      },
      {
        id: 'gourmet-agent-billie',
        name: 'Bistro Billie',
        role: 'Logistics & Quick Estimates',
        tone: 'casual',
        avatar: '🚛',
        systemInstruction: 'You are Bistro Billie, the practical logistics lead. You are casual, transparent, and quick. You handle buffet line logistics, corporate bistro delivery estimates ($65/guest), and setups.'
      },
      {
        id: 'gourmet-agent-ethan',
        name: 'Coordinator Ethan',
        role: 'Wedding & Social Event Planner',
        tone: 'empathetic',
        avatar: '🤵',
        systemInstruction: 'You are Coordinator Ethan, an empathetic, warm wedding and anniversary planner. You listen carefully to couples details, offer reassurance, and help design beautiful custom banquets ($110/guest).'
      }
    ],
    activeAgentId: 'gourmet-agent-celeste',
    whatsAppPhoneNumber: '+1 (555) 909-5432',
    whatsAppVerifiedSid: 'phone_9095432_prod',
    whatsAppStatus: 'connected',
    whatsAppApiKey: 'waba_live_gourmet_a2b3c4d5e6f7g8h9',
    whatsAppSandboxActive: false,
    whatsAppSandboxNumbers: ['+1 (555) 444-1234'],
    messengerPageId: 'page_409182740192837',
    messengerToken: 'fb_live_eaag_gourmet_1028347',
    messengerStatus: 'disconnected',
    messengerSandboxActive: false,
    messengerSandboxNumbers: [],
    knowledgeBase: [
      {
        id: 'gc-kb-1',
        type: 'faq',
        title: 'Catering Packages per Guest',
        content: `Our visual catering packages:
- Grand Banquet: $110 per guest. Welcome cocktails, 3-course sit-down dinner, premium wine pairing, full cleanup.
- Corporate Bistro: $65 per guest. Gourmet hot buffet line, fresh artisan pastries, soft beverage station, disposable dinnerware.
- Cocktail Gastronomy: $80 per guest. Strolling hot canapés, live oyster shucking bar, interactive dessert display.`,
        dateAdded: '2026-03-20'
      },
      {
        id: 'gc-kb-2',
        type: 'document',
        title: 'Dietary Restrictions and Custom Menus',
        content: 'We can easily accommodate Vegan, Gluten-Free, Halal, and Nut-Free diets. All dietary adjustments must be submitted to our culinary team at least 14 days before the scheduled event. Any late modifications might incur an additional surcharge of $12 per edited plate.',
        dateAdded: '2026-04-02'
      }
    ],
    leads: [
      {
        id: 'gc-l-1',
        name: 'Olivia Martinez',
        phone: '+1 (555) 203-8821',
        email: 'olivia@martinezwedding.com',
        status: 'Qualified',
        dateCaptured: '2026-05-18',
        note: 'Wedding of 140 guests scheduled next August. Pre-vetted Grand Banquet.'
      }
    ],
    appointments: [
      {
        id: 'gc-a-1',
        customerName: 'Aiden Vance (Oracle Events)',
        customerPhone: '+1 (555) 902-1143',
        email: 'aiden.vance@oracle.com',
        start: '2026-05-26T11:00:00Z',
        end: '2026-05-26T12:00:00Z',
        summary: 'Gourmet Craft: Corporate Menu Tasting Selection',
        notes: 'Tasting for 3 executive decision makers at our primary test kitchen.',
        syncedWithGoogle: false
      }
    ]
  },
  {
    id: 'elysian-medspa',
    name: 'Elysian Oasis MedSpa',
    industry: 'Beauty & Skincare',
    description: 'A clinical medical spa specializing in advanced body contours, micro-needling, laser skin resurfacing, and botanical wellness facial therapies.',
    avatar: '🌸',
    botName: 'Elysia',
    tone: 'empathetic',
    status: 'active',
    systemInstruction: 'You are Elysia, the empathetic skincare assistant at Elysian Oasis MedSpa. Help customers select treatments, share clinical guidelines, and coordinate therapist hours.',
    welcomeTemplates: [
      {
        id: 'em-wt-1',
        name: 'Oasis Welcome & Glow 🌸',
        text: 'Welcome to Elysian Oasis MedSpa. 🌸 I am Elysia, your skincare support. How may I refresh your day? We offer facial treatments, clinical microneedling, and laser genesis. What kind of care does your skin desire?'
      },
      {
        id: 'em-wt-2',
        name: 'Pre-Care Prep Reminder ℹ️',
        text: 'Welcome! Elysia here from Elysian Oasis. If you are already scheduled for a microneedling or laser resurfacing session, let me remind you about our pre-treatment guidelines (like avoiding retinols and UV sun exposure). Would you like to review them?'
      }
    ],
    activeWelcomeTemplateId: 'em-wt-1',
    agents: [
      {
        id: 'elysian-agent-elysia',
        name: 'Elysia',
        role: 'Skin Expert & Care Advisor',
        tone: 'empathetic',
        avatar: '🌸',
        systemInstruction: 'You are Elysia, the empathetic skincare assistant at Elysian Oasis MedSpa. Help customers select treatments, share clinical guidelines, and coordinate therapist hours.'
      },
      {
        id: 'elysian-agent-glow',
        name: 'GlowBot',
        role: 'Commercial Laser & Bundle Specialist',
        tone: 'friendly',
        avatar: '✨',
        systemInstruction: 'You are GlowBot, a friendly and enthusiastic clinical advisor. You excel at suggesting micro-needling and laser packages, cross-selling bundle offers, and answering FAQ with an upbeat marketing attitude!'
      }
    ],
    activeAgentId: 'elysian-agent-elysia',
    whatsAppPhoneNumber: '',
    whatsAppVerifiedSid: '',
    whatsAppStatus: 'disconnected',
    whatsAppApiKey: '',
    whatsAppSandboxActive: false,
    whatsAppSandboxNumbers: [],
    knowledgeBase: [
      {
        id: 'em-kb-1',
        type: 'faq',
        title: 'Popular Laser and Facial Menu',
        content: `Our clinical face solutions:
- Elysian Glow Facial: $135 (60 mins). Hydra-infusion, peptide mist, lymphatic neck massage.
- Clinical Microneedling: $280. Advanced skin resurfacing, topical numbing cream, collagen matrix booster.
- Laser Genesis Toning: $250. Diffuse redness cure, pore tightening therapy, non-ablative recovery.`,
        dateAdded: '2026-05-10'
      },
      {
        id: 'em-kb-2',
        type: 'document',
        title: 'Pre-Treatment Clinical Guidance',
        content: `For Micro-needling and Laser treatments:
- Avoid direct UV/Sun exposure for 48 hours prior.
- Do not apply Retinol, Glycolic acids, or harsh exfoliants for 4 days before the appointment.
- Arrive with a clean, makeup-free face. If your session is scheduled in the afternoon, please arrive 15 minutes early to allow numbing gel to properly activate.`,
        dateAdded: '2026-05-12'
      }
    ],
    leads: [],
    appointments: []
  },
  {
    id: 'pearly-smiles-dental',
    name: 'Pearly Smiles Dental Care',
    industry: 'Dental & Healthcare',
    description: 'A modern state-of-the-art clinic specializing in advanced family dentistry, pain-free laser cleanings, porcelain veneers, and dental implants.',
    avatar: '🦷',
    botName: 'Dr. Pearl',
    tone: 'empathetic',
    status: 'active',
    systemInstruction: 'You are Dr. Pearl, the friendly, highly reassuring patient coordinator for Pearly Smiles Dental Care. You answer questions about teeth whitening, implants, braces, and guide patients to book or confirm dental consults.',
    welcomeTemplates: [
      {
        id: 'psd-wt-1',
        name: 'Standard Care Greeting 👋',
        text: 'Hello & Welcome to Pearly Smiles! 🦷 I am Dr. Pearl, your virtual patient coordinator. Are you checking in for a routine hygiene visit, asking about cosmetic whitening/veneers, or needing to schedule an exam?'
      },
      {
        id: 'psd-wt-2',
        name: 'Painless Laser Cleanings ✨',
        text: 'Hi there! Dr. Pearl here. Did you know we offer clinical dental hygiene using state-of-the-art water laser tools that are virtually silent and pain-free? Perfect if you experience dental anxiety. Ask me how it works or book your session today!'
      },
      {
        id: 'psd-wt-3',
        name: 'Dental Emergency Hotline 🚨',
        text: 'Hello, if you are experiencing severe toothache, swelling, or a broken tooth, please let me know immediately. I can check our emergency dental slots or details immediately so we can get your smile taken care of!'
      }
    ],
    activeWelcomeTemplateId: 'psd-wt-1',
    agents: [
      {
        id: 'dentist-agent-pearl',
        name: 'Dr. Pearl',
        role: 'Patient Coordinator & Hygiene FAQ',
        tone: 'empathetic',
        avatar: '🦷',
        systemInstruction: 'You are Dr. Pearl, the supportive dental assistant for Pearly Smiles. You answer general FAQs, schedule cleanings, and reassure nervous patients.'
      },
      {
        id: 'dentist-agent-implants',
        name: 'Dr. Crest',
        role: 'Implant & Ortho Specialist',
        tone: 'professional',
        avatar: '🔬',
        systemInstruction: 'You are Dr. Crest, the dental implant and cosmetic orthodontics specialist bot. You focus on high-value cosmetic consults, explaining customized porcelain veneers and full-mouth restorations. Be professional and detail-oriented.'
      }
    ],
    whatsAppPhoneNumber: '',
    whatsAppVerifiedSid: '',
    whatsAppStatus: 'disconnected',
    whatsAppApiKey: '',
    whatsAppSandboxActive: false,
    whatsAppSandboxNumbers: [],
    knowledgeBase: [
      {
        id: 'psd-kb-1',
        type: 'faq',
        title: 'Dental Services & Fee Schedule',
        content: `Our healthcare/dental services:
- Routine Hygiene & Cleaning: $120. Standard scaling, soft laser stain removal, clinical fluoride varnish.
- Professional Laser Teeth Whitening: $350. Active laser whitening with clinical grade gel (up to 8 shades lighter in 1 hour).
- Porcelain Veneer Consultation: Free assessment. Custom restorations start at $950 per tooth.
- Standard Tooth Fillings: $150 to $250 depending on cavity size. Composite white-tooth resin only.`,
        dateAdded: '2026-06-01'
      },
      {
        id: 'psd-kb-2',
        type: 'document',
        title: 'Painless Gentle Water Laser Hygiene',
        content: 'We utilize state-of-the-art WaterLase technology which combines water under high-pressure with laser energy. This eliminates the vibration and heat of standard mechanical metal probes. Most cleanings do not require local anesthetic. Highly recommended for children and adult dental-phobic patients.',
        dateAdded: '2026-06-02'
      },
      {
        id: 'psd-kb-3',
        type: 'faq',
        title: 'Post-Op Extraction Recovery Care',
        content: 'After standard dental extractions: Avoid using straws or rinsing vigorously for 24 hours. Keep gauze firmly placed with light pressure for 45 minutes block. Rest is recommended. Take prescribed painkillers as directed. Apply an ice pack on cheeks to minimize standard clinical swelling.',
        dateAdded: '2026-06-05'
      }
    ],
    leads: [
      {
        id: 'psd-l-1',
        name: 'Belhassen Trabelsi',
        phone: '+216 55123456',
        email: 'belhassen.trab@gmail.com',
        status: 'Interested',
        dateCaptured: '2026-06-11',
        note: 'Interested in clinical painless water laser teeth whitening.'
      }
    ],
    appointments: [
      {
        id: 'psd-a-1',
        customerName: 'Marcus Miller',
        customerPhone: '+1 (555) 711-2093',
        email: 'm.miller@yahoo.com',
        start: '2026-06-15T09:30:00Z',
        end: '2026-06-15T10:15:00Z',
        summary: 'Pearly Smiles: 45-min Painless Water Laser Clean',
        notes: 'High dental anxiety passenger. Dr. Pearl requested extra soft cushions and laser settings.',
        syncedWithGoogle: false
      }
    ]
  }
];
