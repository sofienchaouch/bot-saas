import React, { createContext, useContext, useState, ReactNode } from 'react';

export type LanguageType = 'en' | 'fr' | 'ar' | 'derja';

export interface TranslationDictionary {
  [language: string]: {
    [key: string]: string;
  };
}

export const TRANSLATIONS: TranslationDictionary = {
  en: {
    // Header
    activeTenant: 'Active Tenant',
    connectCalendar: 'Connect Google Calendar',
    calendarLive: 'Google Calendar Live',
    signOut: 'Sign Out',
    enterprise: 'Enterprise',
    controlHub: 'WhatsApp Business Agent Control Hub',
    
    // Sidebar Tabs
    insights: 'Performance Dashboard',
    bot_config: 'Agent Customization',
    knowledge_base: 'Private Knowledge Base',
    leads: 'CRM Leads Directory',
    calendar: 'Appointments Calendar',
    simulator: 'WhatsApp Simulator',
    whatsapp_integration: 'API Gateway Credentials',
    workspace_hub: 'Workspace Integration Hub',

    // Tab Headers & Subheaders
    insightsTitle: 'Business Analytics & Conversational Funnel',
    insightsSub: 'Monitor message volume, response times, lead conversion, and real-time CRM performance.',
    botConfigTitle: 'WhatsApp AI Agent Behavioral Matrix',
    botConfigSub: 'Calibrate the identity, tone directives, specific vertical instructions, and team capabilities for your tenant bot.',
    knowledgeBaseTitle: 'Corporate Cognitive Store',
    knowledgeBaseSub: 'Ingest specific corporate documentation, FAQs, and web crawls to empower the AI agent with ground truths.',
    leadsTitle: 'Autonomous Lead Generation CRM',
    leadsSub: 'Leads extracted from raw end-user messages using generative AI semantics.',
    calendarTitle: 'Smart Multi-Tenant Scheduling System',
    calendarSub: 'Bookings negotiated and committed autonomously on free slots.',
    simulatorTitle: 'High-Fidelity Interactive Sandbox',
    simulatorSub: 'Interact with the agent in real-time using built-in realistic business test scenarios.',
    whatsappTitle: 'Production Meta Cloud API credentials',
    whatsappSub: 'Configure native Graph API keys and webhooks to deploy the AI agent to your real customer-facing phone number.',
    workspaceTitle: 'Google Workspace Integration Port',
    workspaceSub: 'Connect Google Sheets and Google Calendar to automatically synchronize leads and appointments.',

    // Common Buttons & Labels
    searchPlaceholder: 'Search items...',
    filterAll: 'All Categories',
    addDocument: 'Add Document',
    addLead: 'Add Lead Manually',
    saving: 'Saving Changes...',
    saveChanges: 'Save Changes',
    loading: 'Loading system assets...',
    statusActive: 'Active',
    statusPaused: 'Paused',
    edit: 'Edit',
    delete: 'Delete',
    cancel: 'Cancel',
    confirm: 'Confirm',
    success: 'Success',
    error: 'Error',
    languageName: 'Language',
    
    // Auth & Landing
    backToHome: 'Back to Homepage',
    demoConsole: 'Demo Owner Console',
    quickDemo: 'Quick Demo Access',
    headline: 'Autonomous Webhook Bots for WhatsApp Businesses'
  },
  fr: {
    // Header
    activeTenant: 'Client Actif',
    connectCalendar: 'Associer Google Calendar',
    calendarLive: 'Google Calendar Connecté',
    signOut: 'Se Déconnecter',
    enterprise: 'Entreprise',
    controlHub: 'Pôle de Contrôle des Agents WhatsApp',
    
    // Sidebar Tabs
    insights: 'Tableau de Performance',
    bot_config: 'Configuration de l’Agent',
    knowledge_base: 'Base de Connaissances',
    leads: 'Répertoire CRM (Leads)',
    calendar: 'Calendrier des Rdv',
    simulator: 'Simulateur WhatsApp',
    whatsapp_integration: 'Intégration API Meta',
    workspace_hub: 'Espace Google Workspace',

    // Tab Headers & Subheaders
    insightsTitle: 'Analytiques Commerciales et Entonnoir de Conversion',
    insightsSub: 'Suivez le volume des messages, les temps de réponse et la conversion des prospects en temps réel.',
    botConfigTitle: 'Matrice de Comportement de l’Agent IA WhatsApp',
    botConfigSub: 'Calibrez l’identité de l’agent, les consignes de tonalité et les consignes métier de votre bot.',
    knowledgeBaseTitle: 'Magasin Cognitif d’Entreprise',
    knowledgeBaseSub: 'Importez des documents d’entreprise, des FAQ et des sites web pour alimenter l’agent d’instructions fiables.',
    leadsTitle: 'Base CRM Automatique de Capture de Prospects',
    leadsSub: 'Prospects extraits automatiquement des messages clients par l’intelligence artificielle générative.',
    calendarTitle: 'Planification Intelligente Multi-Locataire',
    calendarSub: 'Rendez-vous négociés et enregistrés automatiquement sur les créneaux disponibles.',
    simulatorTitle: 'Bac à Sable d’Interaction Réaliste',
    simulatorSub: 'Interagissez avec l’agent en temps réel avec des scénarios de test pré-configurés.',
    whatsappTitle: 'Identifiants de Production Meta Cloud API',
    whatsappSub: 'Configurez vos clés d’API Meta Graph et de webhook pour associer votre bot à votre vrai numéro.',
    workspaceTitle: 'Port d’Intégration Google Workspace',
    workspaceSub: 'Connectez Google Sheets et Google Calendar pour synchroniser automatiquement vos données.',

    // Common Buttons & Labels
    searchPlaceholder: 'Rechercher un élément...',
    filterAll: 'Toutes les catégories',
    addDocument: 'Ajouter un Document',
    addLead: 'Créer un Prospect',
    saving: 'Enregistrement en cours...',
    saveChanges: 'Enregistrer les Modifications',
    loading: 'Chargement des bases...',
    statusActive: 'Actif',
    statusPaused: 'En pause',
    edit: 'Modifier',
    delete: 'Supprimer',
    cancel: 'Annuler',
    confirm: 'Confirmer',
    success: 'Succès',
    error: 'Erreur',
    languageName: 'Langue',
    
    // Auth & Landing
    backToHome: 'Retour à l’accueil',
    demoConsole: 'Console Démo Propriétaire',
    quickDemo: 'Accès Démo Rapide',
    headline: 'Bots WhatsApp Autonomes pour Entreprises Modernes'
  },
  ar: {
    // Header
    activeTenant: 'حساب الشركة النشط',
    connectCalendar: 'ربط تقويم جوجل',
    calendarLive: 'تقويم جوجل متصل',
    signOut: 'تسجيل الخروج',
    enterprise: 'مؤسسات',
    controlHub: 'مركز التحكم الشامل في وكيل واتساب',
    
    // Sidebar Tabs
    insights: 'لوحة الأداء العام',
    bot_config: 'تعديل هوية الوكيل',
    knowledge_base: 'قاعدة المعرفة الخاصة',
    leads: 'قائمة العملاء المحتملين',
    calendar: 'سجل المواعيد والتقويم',
    simulator: 'محاكي واتساب للتجربة',
    whatsapp_integration: 'واجهة الربط المباشر مع ميتا',
    workspace_hub: 'مركز دمج خدمات جوجل',

    // Tab Headers & Subheaders
    insightsTitle: 'تحليلات الأعمال ومسار المحادثات التحويلية',
    insightsSub: 'راقب حجم الرسائل الواردة، أوقات الاستجابة، ونسب تحويل العملاء المهتمين لحظة بلحظة.',
    botConfigTitle: 'مصفوفة سلوك وكيل الذكاء الاصطناعي لواتساب',
    botConfigSub: 'حدد اسم الوكيل، أسلوب التحدث، واختصاصات وسيناريوهات العمل الافتراضية الخاصة بشركتك.',
    knowledgeBaseTitle: 'مخزن المعرفة الشامل للمؤسسة',
    knowledgeBaseSub: 'تغذية الوكيل بالوثائق المهمة، والأسئلة الشائعة، ومسح المواقع لضمان دقة إجاباته.',
    leadsTitle: 'سجل إدارة العلاقات مع العملاء المستخلص تلقائياً',
    leadsSub: 'عملاء مهتمون تم استخراج بياناتهم بذكاء من نصوص الدردشة المباشرة وبدون تدخل بشري.',
    calendarTitle: 'نظام المواعيد والحجز الذكي المتعدد الحسابات',
    calendarSub: 'مواعيد مستخرجة وتأكيد حجزها تلقائياً بالاعتماد على المربعات الزمنية الفارغة.',
    simulatorTitle: 'محيط تجربة المحاكاة التفاعلية',
    simulatorSub: 'تفاعل مع البوت مباشرة وجرب طرق معالجة الأفكار والمهام عبر سيناريوهات تجريبية واقعية.',
    whatsappTitle: 'بيانات اعتماد واجهة السحاب الرسمية لواتساب ميتا',
    whatsappSub: 'أدخل مفاتيح الربط وتوطيد الروابط لنشر الوكيل على رقم الواتساب الحقيقي لزبائنك.',
    workspaceTitle: 'منفذ تكامل خدمات Google Workspace',
    workspaceSub: 'اربط خدمات Google Sheets وتقويم Google لمزامنة العملاء والمواعيد المحجوزة تلقائياً.',

    // Common Buttons & Labels
    searchPlaceholder: 'بحث في العناصر...',
    filterAll: 'جميع الأقسام',
    addDocument: 'إضافة مستند جديد',
    addLead: 'إضافة عميل مهتم يدوياً',
    saving: 'جاري الحفظ والتخزين...',
    saveChanges: 'حفظ التعديلات',
    loading: 'جاري تحميل موارد المنصة...',
    statusActive: 'نشط ويعمل',
    statusPaused: 'موقوف مؤقتاً',
    edit: 'تعديل',
    delete: 'حذف',
    cancel: 'إلغاء الأمر',
    confirm: 'تأكيد الحفظ',
    success: 'تمت العملية بنجاح',
    error: 'فشل الإجراء',
    languageName: 'اللغة المعتمدة',
    
    // Auth & Landing
    backToHome: 'العودة للصفحة الرئيسية',
    demoConsole: 'لوحة التحكم التجريبية',
    quickDemo: 'دخول تجريبي سريع',
    headline: 'وكلاء واتساب ذاتية التشغيل للشركات الذكية والمؤسسات'
  },
  derja: {
    // Header
    activeTenant: 'الشركة اللي تخدم',
    connectCalendar: 'اربط الـ Google Calendar',
    calendarLive: 'الروزنامة متاعك تمشي مريغلة',
    signOut: 'اخرج من المنصة',
    enterprise: 'مؤسسات الكبار',
    controlHub: 'بلاصة ركلاج وكيل واتساب المباشر',
    
    // Sidebar Tabs
    insights: 'إحصائيات وقوة الخدمة',
    bot_config: 'تعديل وركلاج البوت',
    knowledge_base: 'الأوراق ومعلومات الوكيل',
    leads: 'الكليونات الجدد والفرص',
    calendar: 'جدول المواعيد والروزنامة',
    simulator: 'تيست وتجريب البوت',
    whatsapp_integration: 'ربط واتساب الأصلي',
    workspace_hub: 'ربط خدمات Workspace',

    // Tab Headers & Subheaders
    insightsTitle: 'إحصائيات الخدمة ومسار كليوناتك',
    insightsSub: 'تبع قداش من مساج يوصل، سرعة الإجابة، والكليونات الجدد في الوقت الحاضر.',
    botConfigTitle: 'رgلاج مخ وعقل وكيل الـ AI متاع المانجر',
    botConfigSub: 'بدل اسم البوت، طريقة الكلام والتعليمات الخاصة اللي تعطيهم للعملاء متاعك.',
    knowledgeBaseTitle: 'المعلومات الصحيحة متاع شركتك',
    knowledgeBaseSub: 'صوبلو الفايلات، الاسئلة الشائعة، ولا لم المراجع مالموقع باش يجاوب بكل كفاءة وما يغلطش.',
    leadsTitle: 'الكليونات الجدد اللي لمهم البوت وحده بلحظة',
    leadsSub: 'ناس مهتمين لم البوت أساميهم وإيميلاتهم من وسط الميساجات بالـ AI.',
    calendarTitle: 'روزنامة ذكية متاع مواعيد منظمة',
    calendarSub: 'حجوزات تفاهم عليها البوت وقيدها ديركت لروحو في البلايص الفاضية اللي عندك.',
    simulatorTitle: 'بلاصة تجريب التيست الحقيقي',
    simulatorSub: 'احكي مع البوت متاعك مباشرة وجرب سيناريوهات بيع وتنسيق واضحة ومسجلة.',
    whatsappTitle: 'بيانات ربط الوتساب الرسمي Meta Cloud API',
    whatsappSub: 'دخل كودات الـ API والسرية باش تطلق البوت متاعك على نمرتك الحقيقية لعموم الزبائن.',
    workspaceTitle: 'منفذ ربط Google Workspace بالسيستم',
    workspaceSub: 'اربط Google Sheets وجدول المواعيد باش تصب المعطيات والحجوزات مريغلة بلاش وفي ثواني.',

    // Common Buttons & Labels
    searchPlaceholder: 'عوم ودور هوني باش تلوج...',
    filterAll: 'الأصناف الكل',
    addDocument: 'زيد معلومات ولا ورقة جديدة',
    addLead: 'قيد كليون مهتم جديد بيدك',
    saving: 'قاعدين نقيدو في المعلومات...',
    saveChanges: 'سجل التغييرات',
    loading: 'قاعدين نحضرولك في المنصة متاعك...',
    statusActive: 'يخدم مريغل',
    statusPaused: 'واقف توة',
    edit: 'بدل وحسن',
    delete: 'طير وافسخ',
    cancel: 'بطل والغ المأمورية',
    confirm: 'أوكد مريغل',
    success: 'تمت بنجاح ويعطيك الصحة',
    error: 'فما حاجة مشات غلطة',
    languageName: 'اللغة اللي تحبها',
    
    // Auth & Landing
    backToHome: 'رجعني للصفحة الرئيسية',
    demoConsole: 'لوحة تحكم التجريب',
    quickDemo: 'أدخل جرب ديركت',
    headline: 'بوتات واتساب تخدم وتجاوب وحدها من غير تعب لشركتك وخدمتك'
  }
};

interface LanguageContextProps {
  language: LanguageType;
  setLanguage: (lang: LanguageType) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<LanguageType>(() => {
    // Try to get saved language from localStorage
    try {
      const saved = localStorage.getItem('saas_platform_lang') as LanguageType;
      if (saved === 'en' || saved === 'fr' || saved === 'ar' || saved === 'derja') {
        return saved;
      }
    } catch (_) {}
    return 'en'; // Default is English
  });

  const setLanguage = (lang: LanguageType) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('saas_platform_lang', lang);
    } catch (_) {}
  };

  const t = (key: string): string => {
    const dict = TRANSLATIONS[language] || TRANSLATIONS.en;
    return dict[key] || TRANSLATIONS.en[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextProps => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
