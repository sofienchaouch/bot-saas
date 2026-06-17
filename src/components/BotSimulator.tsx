import React, { useState, useRef, useEffect } from 'react';
import { Tenant, ChatMessage, Lead, Appointment } from '../types';
import {
  Send,
  User,
  Phone,
  Mail,
  Calendar,
  Sparkles,
  Bot,
  HelpCircle,
  FileText,
  Clock,
  Check,
  CheckCheck,
  AlertCircle,
  Users,
  Smartphone,
  Mic,
  MicOff,
  PhoneOff,
  Volume2,
  VolumeX
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

interface MessageMetadata {
  intent?: string;
  icon?: string;
  sentimentColor?: string;
  sentimentLabel?: string;
  model?: string;
  latency?: string;
  tokens?: number;
  confidence: number;
}

const getMessageMetadata = (text: string, sender: 'bot' | 'customer'): MessageMetadata => {
  const norm = text.toLowerCase();
  if (sender === 'customer') {
    let intent = 'General Inquiry';
    let icon = '💬';
    let sentimentColor = 'text-slate-400 bg-slate-950/40 border-slate-800';
    let sentimentLabel = 'Neutral Dynamic Intent';

    if (norm.includes('hello') || norm.includes('hi') || norm.includes('greetings') || norm.includes('aslema') || norm.includes('ahla') || norm.includes('سلام') || norm.includes('اهلين')) {
      intent = 'Inbound Entry Greeting';
      icon = '👋';
    } else if (norm.includes('book') || norm.includes('appointment') || norm.includes('schedule') || norm.includes('reserve') || norm.includes('time') || norm.includes('date') || norm.includes('calendar') || norm.includes('meeting') || norm.includes('slot') || norm.includes('وقتاش') || norm.includes('نحب نقيد') || norm.includes('موعد')) {
      intent = 'Schedule Negotiation';
      icon = '📅';
    } else if (norm.includes('name') || norm.includes('email') || norm.includes('phone') || norm.includes('contact') || norm.includes('address') || norm.includes('details') || norm.includes('telephone')) {
      intent = 'Lead Ingest Pipeline';
      icon = '👤';
    } else if (norm.includes('price') || norm.includes('cost') || norm.includes('quote') || norm.includes('how much') || norm.includes('subscription') || norm.includes('bsh7al') || norm.includes('قداس') || norm.includes('سوم')) {
      intent = 'Pricing & Commerce Queries';
      icon = '💰';
    }

    if (norm.includes('great') || norm.includes('perfect') || norm.includes('awesome') || norm.includes('thank') || norm.includes('happy') || norm.includes('love') || norm.includes('good') || norm.includes('behi') || norm.includes('y3aychek') || norm.includes('يعيشك') || norm.includes('باهي')) {
      sentimentColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      sentimentLabel = 'Positive Sentiment';
    } else if (norm.includes('bad') || norm.includes('slow') || norm.includes('angry') || norm.includes('frustrated') || norm.includes('issue') || norm.includes('error') || norm.includes('fail') || norm.includes('stop') || norm.includes('not working') || norm.includes('chbih') || norm.includes('msh behi') || norm.includes('غالي') || norm.includes('مشكل')) {
      sentimentColor = 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      sentimentLabel = 'Frustrated / High Urgency';
    }

    return { intent, icon, sentimentColor, sentimentLabel, confidence: 96 };
  } else {
    // Math to keep tokens and latency clean and stable
    const textLen = text.length;
    const computedLatency = Math.floor((textLen * 1.5) + 120 + (textLen % 13) * 3);
    const computedTokens = Math.floor(textLen * 0.42 + 210);
    return {
      model: 'Gemini 2.5 Flash',
      latency: `${computedLatency}ms`,
      tokens: computedTokens,
      confidence: 99
    };
  }
};

interface BotSimulatorProps {
  selectedTenant: Tenant;
  onLeadCaptured: (lead: Lead) => void;
  onAppointmentBooked: (appt: Appointment) => void;
  googleAccessToken: string | null;
  appointmentsList: Appointment[];
  onConnectGoogle?: () => void;
  onRefreshCalendar?: () => void;
}

export const BotSimulator: React.FC<BotSimulatorProps> = ({
  selectedTenant,
  onLeadCaptured,
  onAppointmentBooked,
  googleAccessToken,
  appointmentsList,
  onConnectGoogle,
  onRefreshCalendar
}) => {
  const getWelcomeText = (tenant: Tenant): string => {
    if (tenant.welcomeTemplates && tenant.welcomeTemplates.length > 0) {
      const active = tenant.activeWelcomeTemplateId 
        ? tenant.welcomeTemplates.find(t => t.id === tenant.activeWelcomeTemplateId)
        : tenant.welcomeTemplates[0];
      if (active && active.text.trim()) {
        return active.text;
      }
    }
    return `Hello! Welcome to *${tenant.name}*. I'm ${tenant.botName}, your automated customer assistant. How can I help you today? I can share our pricing, tell you about our private guidelines, or help you schedule an appointment directly on our calendar! 🗓️`;
  };

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: getWelcomeText(selectedTenant),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'read'
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [lastNotification, setLastNotification] = useState<{
    type: 'success' | 'info';
    title: string;
    description: string;
  } | null>(null);

  // Human-in-the-Loop Override States
  const [isAutopilot, setIsAutopilot] = useState(true);
  const [simulatorSender, setSimulatorSender] = useState<'customer' | 'bot'>('customer');

  const [simulatorLogs, setSimulatorLogs] = useState<string[]>([
    `[${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}] Polling service initialized. Listening for message delivery notifications...`
  ]);

  // Real-Time Gemini Voice Call States
  const [isVoiceCallActive, setIsVoiceCallActive] = useState(false);
  const [voiceCallStatus, setVoiceCallStatus] = useState<'dialing' | 'connected' | 'listening' | 'speaking' | 'ended'>('dialing');
  const [callDuration, setCallDuration] = useState(0);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [isMicActive, setIsMicActive] = useState(false);
  const [isChatMicActive, setIsChatMicActive] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState<{ sender: 'customer' | 'bot'; text: string }[]>([]);
  const [voiceCallInputText, setVoiceCallInputText] = useState('');
  
  const recognitionRef = useRef<any>(null);
  const chatRecognitionRef = useRef<any>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);

  const liveWsRef = useRef<WebSocket | null>(null);
  const liveAudioCtxRef = useRef<AudioContext | null>(null);
  const nextAudioStartTimeRef = useRef<number>(0);
  const audioQueueRef = useRef<AudioBufferSourceNode[]>([]);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const liveSpeakingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Timer effect for voice calls
  useEffect(() => {
    if (isVoiceCallActive && (voiceCallStatus === 'connected' || voiceCallStatus === 'listening' || voiceCallStatus === 'speaking')) {
      callTimerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
        callTimerRef.current = null;
      }
    }
    return () => {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
    };
  }, [isVoiceCallActive, voiceCallStatus]);

  // Clean up speech synthesis when component unmounts
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (chatRecognitionRef.current) {
        chatRecognitionRef.current.abort();
      }
      if (liveWsRef.current) {
        liveWsRef.current.close();
      }
      if (scriptProcessorRef.current) {
        try { scriptProcessorRef.current.disconnect(); } catch (e) {}
      }
      if (micStreamRef.current) {
        try { micStreamRef.current.getTracks().forEach(t => t.stop()); } catch (e) {}
      }
      if (inputAudioCtxRef.current) {
        try { inputAudioCtxRef.current.close(); } catch (e) {}
      }
      audioQueueRef.current.forEach(source => {
        try { source.stop(); } catch (e) {}
      });
      audioQueueRef.current = [];
      if (liveAudioCtxRef.current) {
        try { liveAudioCtxRef.current.close(); } catch (e) {}
      }
      if (liveSpeakingTimeoutRef.current) {
        clearTimeout(liveSpeakingTimeoutRef.current);
      }
    };
  }, []);

  const formatCallDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startListeningLoop = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    
    if (isMicMuted || !isVoiceCallActive) return;
    
    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';
      
      rec.onstart = () => {
        setIsMicActive(true);
      };
      
      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript.trim()) {
          processVoiceInput(transcript);
        }
      };
      
      rec.onerror = (e: any) => {
        console.warn("SpeechRec error:", e);
        setIsMicActive(false);
      };
      
      rec.onend = () => {
        setIsMicActive(false);
        // Automatically restart speech recognition listener loop if call is active and still listening
        if (isVoiceCallActive && voiceCallStatus === 'listening' && !isMicMuted) {
          try {
            rec.start();
          } catch (err) {}
        }
      };
      
      recognitionRef.current = rec;
      rec.start();
    } catch (e) {
      console.warn("Could not start SpeechRec loop:", e);
    }
  };

  const playLiveAudioResponse = (base64Audio: string) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!liveAudioCtxRef.current) {
        liveAudioCtxRef.current = new AudioCtx({ sampleRate: 24000 });
      }
      const ctx = liveAudioCtxRef.current;
      
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const binary = atob(base64Audio);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      
      const int16Array = new Int16Array(bytes.buffer);
      const float32Array = new Float32Array(int16Array.length);
      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0;
      }
      
      const audioBuffer = ctx.createBuffer(1, float32Array.length, 24000);
      audioBuffer.getChannelData(0).set(float32Array);
      
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      
      const currentTime = ctx.currentTime;
      let startTime = nextAudioStartTimeRef.current;
      if (startTime < currentTime) {
        startTime = currentTime + 0.05;
      }
      
      source.start(startTime);
      nextAudioStartTimeRef.current = startTime + audioBuffer.duration;
      
      audioQueueRef.current.push(source);
      source.onended = () => {
        audioQueueRef.current = audioQueueRef.current.filter(s => s !== source);
      };
    } catch (err) {
      console.error("Playback error:", err);
    }
  };

  const startMicrophoneTracking = async (socket: WebSocket) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx({ sampleRate: 16000 });
      inputAudioCtxRef.current = ctx;
      
      const source = ctx.createMediaStreamSource(stream);
      const processor = ctx.createScriptProcessor(2048, 1, 1);
      scriptProcessorRef.current = processor;
      
      source.connect(processor);
      processor.connect(ctx.destination);
      
      processor.onaudioprocess = (e) => {
        if (isMicMuted) return;
        
        const float32Array = e.inputBuffer.getChannelData(0);
        let l = float32Array.length;
        const int16Array = new Int16Array(l);
        while (l--) {
          const s = Math.max(-1, Math.min(1, float32Array[l]));
          int16Array[l] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        
        let binary = "";
        const bytes = new Uint8Array(int16Array.buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64 = btoa(binary);
        
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: "audio", audio: base64 }));
        }
      };
      
      setIsMicActive(true);
    } catch (err) {
      console.warn("[VOICE CALL] Failed to access real microphone:", err);
      triggerNotification(
        'info',
        'Physical Microphone Blocked',
        'Browser iframe sandbox prevents direct microphone recording inside the app view. REST assured, you can type in the fall-back box below to speak!'
      );
    }
  };

  const cleanupLiveAudioContexts = () => {
    setIsMicActive(false);
    
    if (scriptProcessorRef.current) {
      try { scriptProcessorRef.current.disconnect(); } catch (e) {}
      scriptProcessorRef.current = null;
    }
    if (micStreamRef.current) {
      try { micStreamRef.current.getTracks().forEach(t => t.stop()); } catch (e) {}
      micStreamRef.current = null;
    }
    if (inputAudioCtxRef.current) {
      try { inputAudioCtxRef.current.close(); } catch (e) {}
      inputAudioCtxRef.current = null;
    }
    
    audioQueueRef.current.forEach(source => {
      try { source.stop(); } catch (e) {}
    });
    audioQueueRef.current = [];
    if (liveAudioCtxRef.current) {
      try { liveAudioCtxRef.current.close(); } catch (e) {}
      liveAudioCtxRef.current = null;
    }
    nextAudioStartTimeRef.current = 0;
  };

  const speakText = (text: string, lang: string = 'en-US') => {
    if (liveWsRef.current && liveWsRef.current.readyState === WebSocket.OPEN) {
      return; 
    }

    if (isSpeakerMuted) {
      setVoiceCallStatus('listening');
      startListeningLoop();
      return;
    }

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();
      
      let selectedVoice = null;
      if (lang.startsWith('ar')) {
        selectedVoice = voices.find(v => v.lang.startsWith('ar') || v.lang.includes('AR'));
      } else if (lang.startsWith('fr')) {
        selectedVoice = voices.find(v => v.lang.startsWith('fr') || v.lang.includes('FR'));
      } else {
        selectedVoice = voices.find(v => v.lang.startsWith('en') || v.lang.includes('EN'));
      }
      
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
      utterance.lang = lang;
      utterance.rate = 1.0;
      
      utterance.onstart = () => {
        setVoiceCallStatus('speaking');
      };
      
      utterance.onend = () => {
        setVoiceCallStatus('listening');
        if (isVoiceCallActive && !isMicMuted) {
          startListeningLoop();
        }
      };
      
      utterance.onerror = () => {
        setVoiceCallStatus('listening');
        if (isVoiceCallActive && !isMicMuted) {
          startListeningLoop();
        }
      };
      
      window.speechSynthesis.speak(utterance);
    } else {
      setVoiceCallStatus('listening');
    }
  };

  const processVoiceInput = async (spokenText: string) => {
    if (!spokenText.trim()) return;
    
    setVoiceTranscript(prev => [...prev, { sender: 'customer', text: spokenText }]);
    setVoiceCallStatus('speaking');
    
    setSimulatorLogs(prev => [
      `[${new Date().toLocaleTimeString()}] 👤 Voice Captured: "${spokenText}"`,
      ...prev
    ]);
    
    if (liveWsRef.current && liveWsRef.current.readyState === WebSocket.OPEN) {
      liveWsRef.current.send(JSON.stringify({ type: 'text', text: spokenText }));
      return;
    }
    
    try {
      const kbPayload = selectedTenant.knowledgeBase || [];
      const appointmentsPayload = selectedTenant.appointments || [];
      
      const payload = {
        messages: [
          ...messages.map(m => ({ sender: m.sender, text: m.text })),
          { sender: 'customer', text: spokenText }
        ],
        botName: selectedTenant.botName,
        tone: selectedTenant.tone,
        knowledgeBase: kbPayload,
        appointmentsList: appointmentsPayload,
        tenantName: selectedTenant.name,
        tenantIndustry: selectedTenant.industry,
        tenantDescription: selectedTenant.description,
        systemInstruction: selectedTenant.systemInstruction
      };
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      const botResponseText = data.reply || "I am processing your query, let me check that.";
      
      if (data.actionTriggered) {
        handleAutonomousAction(data.actionTriggered);
      }
      
      setVoiceTranscript(prev => [...prev, { sender: 'bot', text: botResponseText }]);
      
      let ttsLanguage = 'en-US';
      const lowercaseText = botResponseText.toLowerCase();
      if (/[\u0600-\u06FF]/.test(botResponseText)) {
        ttsLanguage = 'ar-TN';
      } else if (lowercaseText.includes('bonjour') || lowercaseText.includes('s\'il vous plaît') || lowercaseText.includes('merci') || lowercaseText.includes('semaine')) {
        ttsLanguage = 'fr-FR';
      }
      
      speakText(botResponseText, ttsLanguage);
      
    } catch (err) {
      console.error("Failed to fetch SaaS response for voice call:", err);
      const errorMsg = "Sorry, I am having a network issue. Please say that again.";
      setVoiceTranscript(prev => [...prev, { sender: 'bot', text: errorMsg }]);
      speakText(errorMsg);
    }
  };

  const handleStartVoiceCall = () => {
    setIsVoiceCallActive(true);
    setVoiceCallStatus('dialing');
    setCallDuration(0);
    setVoiceTranscript([]);
    
    cleanupLiveAudioContexts();
    if (liveWsRef.current) {
      try { liveWsRef.current.close(); } catch (e) {}
    }
    
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/api/live-ws?tenantId=${selectedTenant.id}`;
    
    setSimulatorLogs(prev => [
      `[${new Date().toLocaleTimeString()}] 📞 Dialing VoIP Server (Google Gemini Live)...`,
      ...prev
    ]);
    
    try {
      const ws = new WebSocket(wsUrl);
      liveWsRef.current = ws;
      
      ws.onopen = () => {
        setVoiceCallStatus('connected');
        setSimulatorLogs(prev => [
          `[${new Date().toLocaleTimeString()}] 📞 Channel initialized. Activating low-latency Google Gemini Live voice loop!`,
          ...prev
        ]);
        startMicrophoneTracking(ws);
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'audio' && data.audio) {
            playLiveAudioResponse(data.audio);
            setVoiceCallStatus('speaking');
            
            if (liveSpeakingTimeoutRef.current) {
              clearTimeout(liveSpeakingTimeoutRef.current);
            }
            liveSpeakingTimeoutRef.current = setTimeout(() => {
              setVoiceCallStatus('listening');
            }, 650);
          }
          
          if (data.type === 'text' && data.text) {
            setVoiceTranscript(prev => {
              if (prev.length > 0 && prev[prev.length - 1].sender === 'bot') {
                const last = prev[prev.length - 1];
                const updated = [...prev];
                updated[updated.length - 1] = { sender: 'bot', text: last.text + data.text };
                return updated;
              } else {
                return [...prev, { sender: 'bot', text: data.text }];
              }
            });
            
            setSimulatorLogs(prev => {
              const textChunk = data.text;
              const formatted = `[${new Date().toLocaleTimeString()}] 🤖 Operator speaking: "${textChunk}"`;
              if (prev[0] && prev[0].includes("Operator speaking:") && prev[0].length < 160) {
                return [prev[0] + " " + textChunk, ...prev.slice(1)];
              }
              return [formatted, ...prev];
            });
          }
          
          if (data.type === 'interrupted') {
            setSimulatorLogs(prev => [
              `[${new Date().toLocaleTimeString()}] 🎙️ Gemini Live speech interrupted by caller voice activity.`,
              ...prev
            ]);
            audioQueueRef.current.forEach(source => {
              try { source.stop(); } catch (e) {}
            });
            audioQueueRef.current = [];
            if (liveAudioCtxRef.current) {
              nextAudioStartTimeRef.current = liveAudioCtxRef.current.currentTime;
            }
            setVoiceCallStatus('listening');
          }
          
          if (data.type === 'error') {
            console.error("[LIVE WS ERROR]", data.error);
            setVoiceTranscript(prev => [...prev, { sender: 'bot', text: `[VOIP CONNECT ERROR] ${data.error}` }]);
          }
          
        } catch (msgErr) {
          console.error("Failed to parse WebSocket stream message:", msgErr);
        }
      };
      
      ws.onclose = () => {
        console.log("[LIVE WS] Voice Socket Connection Closed gracefully");
        setSimulatorLogs(prev => [
          `[${new Date().toLocaleTimeString()}] 📞 Handset hook placed. VoIP connection closed.`,
          ...prev
        ]);
        cleanupLiveAudioContexts();
        setVoiceCallStatus('ended');
      };
      
      ws.onerror = (err) => {
        console.error("[LIVE WS] Voice Socket Error:", err);
      };
      
    } catch (wsErr) {
      console.error("Failed to establish WebSocket link:", wsErr);
      setVoiceCallStatus('ended');
    }
  };

  const toggleMuteMic = () => {
    const newMute = !isMicMuted;
    setIsMicMuted(newMute);
    if (newMute) {
      setIsMicActive(false);
      setSimulatorLogs(prev => [
        `[${new Date().toLocaleTimeString()}] 🔇 Microphone Muted (Privacy Block active)`,
        ...prev
      ]);
    } else {
      setIsMicActive(true);
      setSimulatorLogs(prev => [
        `[${new Date().toLocaleTimeString()}] 🎤 Microphone Unmuted (Streaming audio)`,
        ...prev
      ]);
    }
  };

  const handleEndVoiceCall = () => {
    setIsVoiceCallActive(false);
    setVoiceCallStatus('ended');
    
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }
    
    if (liveWsRef.current) {
      liveWsRef.current.close();
      liveWsRef.current = null;
    }
    cleanupLiveAudioContexts();
    
    setSimulatorLogs(prev => [
      `[${new Date().toLocaleTimeString()}] 📞 VoIP connection ended by user.`,
      ...prev
    ]);
  };

  const VOICE_CALL_PRESETS = [
    { label: "💳 What are your prices?", text: "Can you tell me about your subscription or membership prices?" },
    { label: "📅 Book tomorrow afternoon", text: "I would like to schedule an appointment tomorrow afternoon please." },
    { label: "❓ What prep do I need?", text: "Do you have any guidelines or advice for visiting the first session?" },
    { label: "🇹🇳 Ahla, thama rdv bahi?", text: "Ahla, thama rdv bahi lyoum walla ghodwa?" }
  ];

  // Real-time Delivery Status Polling Service to progress message ticks ('sent' -> 'delivered' -> 'read')
  useEffect(() => {
    const interval = setInterval(() => {
      setMessages(prevMessages => {
        let hasChanges = false;
        let loggedAction: string | null = null;
        let targetMsgId = '';
        
        // Find the first message that can transition status is sequential for real-time high fidelity status updates
        const updated = prevMessages.map(msg => {
          if (hasChanges) return msg; 
          
          if (msg.status === 'sent') {
            hasChanges = true;
            targetMsgId = msg.id.slice(0, 8);
            loggedAction = `Message ${targetMsgId} updated status: 'delivered' (Client Network Sync)`;
            return { ...msg, status: 'delivered' as const };
          } else if (msg.status === 'delivered') {
            hasChanges = true;
            targetMsgId = msg.id.slice(0, 8);
            loggedAction = `Message ${targetMsgId} updated status: 'read' (User Read receipt received)`;
            return { ...msg, status: 'read' as const };
          }
          return msg;
        });

        if (loggedAction) {
          const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          setSimulatorLogs(prev => [
            `[${timestamp}] ${loggedAction}`,
            ...prev.slice(0, 8) // List maximum 9 logs
          ]);
        }

        return hasChanges ? updated : prevMessages;
      });
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  // Guided Sandbox Interactive Scenario State Engine
  const [playingScenario, setPlayingScenario] = useState<{
    name: string;
    steps: { text: string }[];
    currentStepIndex: number;
  } | null>(null);

  const INTEGRATED_SCENARIOS = [
    {
      id: 'lead_harvest',
      name: 'Omni-Channel Lead Intake',
      description: 'AI extracts name, phone & email autonomously into your CRM portal',
      icon: <Users className="h-4 w-4 text-blue-400" />,
      steps: [
        { text: "Hello! My name is Marcus Aurelius. I would like to sign up for your private services." },
        { text: "My email address is marcus.philosophy@ancientrome.com and my WhatsApp number is +1 (312) 555-9011. Can you contact me?" },
        { text: "That sounds excellent. Yes please, record my information. I look forward to your callback!" }
      ]
    },
    {
      id: 'calendar_booking',
      name: 'Autonomous Calendar Scheduling',
      description: 'AI audits busy slots, syncs Google Calendar & inserts booking',
      icon: <Calendar className="h-4 w-4 text-emerald-400" />,
      steps: [
        { text: "Hi! I am eager to schedule an appointment with your coordinator for next week." },
        { text: `Is next Tuesday afternoon around 3:00 PM free on your schedule? Summary: "Marcus Private Session". Please secure it.` }
      ]
    },
    {
      id: 'derja_lead_harvest',
      name: 'Tunisian Derja Auto-Detect (تفاصيل الزبون)',
      description: 'AI responds in authentic Tunisian Derja to harvest contact details and tags',
      icon: <Sparkles className="h-4 w-4 text-amber-400" />,
      steps: [
        { text: "عسّلامة، أنا بلحسن وبش نسألكم شنية عروض العيد اللي عندكم للتسجيل؟" },
        { text: "باهي برشة، كلموني في التليفون على 55123456 وإلا إبعثولي إيميل belhassen@gmail.com باش نتفاهمو في البقية" },
        { text: "يعيشك يرحم والديك، نستنى في تلفونكم!" }
      ]
    },
    {
      id: 'derja_latin_booking',
      name: 'Tunisian Derja (Franco-Arab RDV)',
      description: 'AI converses in Franco-Arab script to answer and book interactive appointments',
      icon: <Smartphone className="h-4 w-4 text-pink-400" />,
      steps: [
        { text: "3aslema, n7eb na3mel rdv m3akom dima behi l'ajenda?" },
        { text: "nhar thulatha eijey 3la sbe7 m3a 10h msetfa safe? s'il vous plaît securiha" }
      ]
    }
  ];

  const handleStartScenario = (scenario: typeof INTEGRATED_SCENARIOS[0]) => {
    if (isTyping || playingScenario) return;
    
    setMessages([
      {
        id: 'scenario-init-' + Date.now(),
        sender: 'bot',
        text: `*SYSTEM PORTAL*: Dynamic scenario activated — *${scenario.name}*.\nI will now simulate how custom client messages are processed sequentially by @${selectedTenant.botName}. Keep an eye on the Smartphone Simulator ! 📱`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'read'
      }
    ]);

    setPlayingScenario({
      name: scenario.name,
      steps: scenario.steps,
      currentStepIndex: 0
    });

    // Send the first step after a tiny setup pause
    setTimeout(() => {
      sendMessageToAgent(scenario.steps[0].text);
    }, 1200);
  };

  useEffect(() => {
    if (!playingScenario) return;
    
    // Automatically trigger the next conversation step when the AI has completed typing its last reply
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.sender === 'bot' && !isTyping) {
      const nextIndex = playingScenario.currentStepIndex + 1;
      
      if (nextIndex < playingScenario.steps.length) {
        const timer = setTimeout(() => {
          setPlayingScenario(prev => prev ? { ...prev, currentStepIndex: nextIndex } : null);
          sendMessageToAgent(playingScenario.steps[nextIndex].text);
        }, 3200); // Wait 3.2s so the user can easily read the previous response
        return () => clearTimeout(timer);
      } else {
        const timer = setTimeout(() => {
          setPlayingScenario(null);
          triggerNotification(
            'success',
            'Demo Scenario Completed',
            `The guided demo "${playingScenario.name}" finished successfully! Your CRM & Local Calendar calendars have been populated.`
          );
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [messages, playingScenario, isTyping]);

  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom of WhatsApp chat when new message arrives or bot starts typing
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages.length, isTyping]);

  // Reset chat thread when tenant is switched or active welcome template changes
  useEffect(() => {
    setMessages([
      {
        id: 'welcome-' + Date.now(),
        sender: 'bot',
        text: getWelcomeText(selectedTenant),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'read'
      }
    ]);
  }, [selectedTenant, selectedTenant.activeWelcomeTemplateId]);

  const triggerNotification = (type: 'success' | 'info', title: string, description: string) => {
    setLastNotification({ type, title, description });
    setTimeout(() => {
      setLastNotification(null);
    }, 6000);
  };

  const toggleChatMic = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      triggerNotification(
        'info',
        'Speech Recognition Unavailable',
        'Your browser does not support Speech Recognition or it is restricted inside this viewport.'
      );
      return;
    }

    if (isChatMicActive) {
      if (chatRecognitionRef.current) {
        chatRecognitionRef.current.abort();
      }
      setIsChatMicActive(false);
      return;
    }

    try {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onstart = () => {
        setIsChatMicActive(true);
        triggerNotification(
          'info',
          'Voice Input Active 🎤',
          'Speak clearly into your microphone to type into the chat...'
        );
      };

      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript.trim()) {
          setInputText(transcript);
          triggerNotification(
            'success',
            'Voice Captured',
            `Transcribed: "${transcript}"`
          );
        }
      };

      rec.onerror = (e: any) => {
        console.warn('Chat SpeechRec error:', e);
        setIsChatMicActive(false);
        if (e.error === 'not-allowed') {
          triggerNotification(
            'info',
            'Microphone Locked',
            'Iframe sandboxing blocked microphone. Type text instead or open Development/Shared App in a new tab!'
          );
        }
      };

      rec.onend = () => {
        setIsChatMicActive(false);
      };

      chatRecognitionRef.current = rec;
      rec.start();
    } catch (err) {
      console.warn('Failed to start chat mic:', err);
      setIsChatMicActive(false);
    }
  };

  const sendMessageToAgent = async (textToSend: string) => {
    if (!textToSend.trim() || isTyping) return;

    // Handle Human-in-the-Loop Takeover (Autopilot Off)
    if (!isAutopilot) {
      if (simulatorSender === 'customer') {
        const userMsg: ChatMessage = {
          id: 'user-' + Date.now(),
          sender: 'customer',
          text: textToSend,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'read'
        };
        setMessages(prev => [...prev, userMsg]);
        setInputText('');
        setSimulatorLogs(prev => [
          `[${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}] 👤 [TAKEOVER] Customer uploaded msg: "${textToSend}"`,
          ...prev
        ]);
      } else {
        const botMsg: ChatMessage = {
          id: 'bot-' + Date.now(),
          sender: 'bot',
          text: textToSend,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'sent'
        };
        setMessages(prev => [...prev, botMsg]);
        setInputText('');
        setSimulatorLogs(prev => [
          `[${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}] 🧑‍💼 [TAKEOVER] Human representative drafted/sent: "${textToSend}"`,
          ...prev
        ]);
        triggerNotification('info', 'Manual Reply Dispatched', 'Your live agent answer was transmitted to the customer simulator frame.');
      }
      return;
    }

    // Append user message (Autopilot active - AI model responds)
    const userMsg: ChatMessage = {
      id: 'user-' + Date.now(),
      sender: 'customer',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sent'
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInputText('');
    setIsTyping(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({ sender: m.sender, text: m.text })),
          botName: selectedTenant.botName,
          tone: selectedTenant.tone,
          knowledgeBase: selectedTenant.knowledgeBase,
          appointmentsList: appointmentsList.map(a => ({ start: a.start, end: a.end })),
          tenantName: selectedTenant.name,
          tenantIndustry: selectedTenant.industry,
          tenantDescription: selectedTenant.description,
          systemInstruction: selectedTenant.systemInstruction || ''
        })
      });

      if (!response.ok) {
        throw new Error('API server failed');
      }

      const data = await response.json();

      setIsTyping(false);

      // Save bot response message
      const botMsgId = 'bot-' + Date.now();
      const botMsg: ChatMessage = {
        id: botMsgId,
        sender: 'bot',
        text: data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'sent'
      };

      // Trigger Text-to-Speech if agent voice is enabled
      const agentsList = selectedTenant.agents || [];
      const actAgent = agentsList.find(a => a.id === selectedTenant.activeAgentId) || agentsList[0];
      if (actAgent?.voiceEnabled && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        // Remove markdown-like decoration for text-to-speech engine
        const cleanText = data.reply.replace(/[*#_~`\[\]]/g, '');
        const utterance = new SpeechSynthesisUtterance(cleanText);
        
        const voices = window.speechSynthesis.getVoices();
        const indLower = (selectedTenant.industry || '').toLowerCase();
        let selectedVoice = null;
        if (indLower.includes('ar')) {
          selectedVoice = voices.find(v => v.lang.startsWith('ar') || v.lang.includes('AR'));
        } else if (indLower.includes('fr')) {
          selectedVoice = voices.find(v => v.lang.startsWith('fr') || v.lang.includes('FR'));
        } else {
          selectedVoice = voices.find(v => v.lang.startsWith('en') || v.lang.includes('EN'));
        }
        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }

        utterance.onstart = () => {
          setPlayingMessageId(botMsgId);
        };
        utterance.onend = () => {
          setPlayingMessageId(null);
        };
        utterance.onerror = () => {
          setPlayingMessageId(null);
        };

        window.speechSynthesis.speak(utterance);
      }

      if (data.actionTriggered) {
        botMsg.actionsTriggered = {
          type: data.actionTriggered.type,
          details: data.actionTriggered.details
        };

        // Execute visual action updates
        handleAutonomousAction(data.actionTriggered);
      }

      setMessages(prev => {
        // Mark user message as read
        const withRead = prev.map(m => m.id === userMsg.id ? { ...m, status: 'read' as const } : m);
        return [...withRead, botMsg];
      });

    } catch (err) {
      console.error(err);
      setIsTyping(false);
      // Fallback
      setMessages(prev => [
        ...prev,
        {
          id: 'error-' + Date.now(),
          sender: 'bot',
          text: `I'm currently checking some guidelines and will answer your query directly. Can you clarify that for me?`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'sent'
        }
      ]);
    }
  };

  const handleAutonomousAction = (action: { type: string; details: string }) => {
    try {
      if (action.type === 'capture_lead') {
        const leadData = JSON.parse(action.details);
        const newLead: Lead = {
          id: 'lead-' + Date.now(),
          name: leadData.name || 'Anonymous Client',
          email: leadData.email || 'not-provided@example.com',
          phone: leadData.phone || 'WhatsApp Customer',
          status: 'New',
          dateCaptured: new Date().toISOString().split('T')[0],
          note: `Captured by AI agent ${selectedTenant.botName} via WhatsApp chat.`
        };
        onLeadCaptured(newLead);
        triggerNotification(
          'success',
          'Lead Captured Autonomously',
          `Opportunity verified! ${newLead.name} contact details saved to the CRM.`
        );
      } else if (action.type === 'book_appointment') {
        const apptData = JSON.parse(action.details);

        const newAppt: Appointment = {
          id: 'appt-' + Date.now(),
          customerName: apptData.name || 'WhatsApp Client',
          customerPhone: apptData.phone || 'WhatsApp Client',
          email: apptData.email || '',
          start: apptData.startStr || new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          end: apptData.endStr || new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
          summary: apptData.summary || `Consultation with ${selectedTenant.name}`,
          notes: apptData.notes || 'Autonomous WhatsApp booking.',
          syncedWithGoogle: !!googleAccessToken && selectedTenant.googleCalendarAutoSchedule !== false
        };
        onAppointmentBooked(newAppt);
        triggerNotification(
          'success',
          (googleAccessToken && selectedTenant.googleCalendarAutoSchedule !== false) ? 'Synced to Google Calendar' : 'Seated in Local Scheduler',
          `Meeting booked for ${newAppt.customerName} on ${new Date(newAppt.start).toLocaleDateString()} at ${new Date(newAppt.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`
        );
      } else if (action.type === 'consult_kb') {
        triggerNotification(
          'info',
          'Consulted Private Knowledge Base',
          `AI analyzed: "${action.details}" files to deliver a compliant response.`
        );
      }
    } catch (e) {
      console.error('Failed to execute AI action:', e);
    }
  };

  // Pre-baked templates for quick testing
  const SIMULATED_CUSTOMER_TEMPLATES = [
    {
      label: 'Request Prices',
      text: 'What are your private membership packages and current pricing tiers?',
      icon: <HelpCircle className="h-4 w-4 text-sky-500" />
    },
    {
      label: 'Book Consultation',
      text: `I'd like to book a session for tomorrow afternoon around 3:00 PM if that is open.`,
      icon: <Calendar className="h-4 w-4 text-emerald-500" />
    },
    {
      label: '🇹🇳 Derja (العربية)',
      text: 'عسّلامة، باهي نحب نسألكم شنية أرخص باقة عندكم للتسجيل فيها؟ وشكون يخدم فيها؟',
      icon: <Sparkles className="h-4 w-4 text-amber-500" />
    },
    {
      label: '🇹🇳 Tunis/Latin (RDV)',
      text: 'fama rdv libre demian à 14h? brassmi dima behya l\'agenda',
      icon: <Smartphone className="h-4 w-4 text-red-500" />
    },
    {
      label: '🇺🇸 Submit Lead Info',
      text: 'My name is Sarah Connor, my email is sarah@skynet.com, and phone is +1 (555) 902-8812. Please have someone contact me!',
      icon: <FileText className="h-4 w-4 text-blue-500" />
    },
    {
      label: '🇫🇷 Demander Tarifs',
      text: 'Bonjour, quels sont vos prix et tarifs d\'abonnement s\'il vous plaît?',
      icon: <FileText className="h-4 w-4 text-pink-500" />
    },
    {
      label: 'Technical FAQ Question',
      text: selectedTenant.id === 'elysian-medspa' 
        ? 'Can I apply retinol right before my clinical laser session?'
        : selectedTenant.id === 'gourmet-catering'
          ? 'What dietary accommodations do you support for vegans or nut allergy sufferers?'
          : 'What guidelines do you have for the biological sauna? Can I just walk in?',
      icon: <Sparkles className="h-4 w-4 text-purple-500" />
    }
  ];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
      {/* Simulation Controls Sidebar */}
      <div className="xl:col-span-5 space-y-6">
        <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-xl relative overflow-hidden">
          {/* Ambient glow decoration */}
          <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />

          <div className="flex items-center gap-2 mb-4 bg-teal-500/15 text-teal-300 w-fit px-3 py-1 rounded-full text-xs font-mono">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Interactive sandbox sandbox environment</span>
          </div>

          <h3 className="text-xl font-display font-medium tracking-tight mb-2">
            WhatsApp Business Simulator
          </h3>
          <p className="text-sm text-slate-300 mb-6 font-light leading-relaxed">
            Test how the AI Agent autonomously answers customer queries, consults your custom PDF/FAQ files, captures raw lead details, and updates your calendar. Click a quick testing template below to simulate a customer message!
          </p>

          {/* Real-time Voice Call Banner */}
          <div className="mb-6 p-4 rounded-xl border border-teal-500/30 bg-teal-500/5 hover:border-teal-500/40 transition-all flex items-center justify-between gap-3 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/5 rounded-full blur-xl pointer-events-none" />
            <div className="space-y-1 z-10">
              <span className="text-[10px] font-mono font-extrabold text-teal-400 block uppercase tracking-widest">📞 REAL-TIME AI VOICE CALL</span>
              <h4 className="text-xs font-bold text-white">Call the {selectedTenant.name} Voice Operator</h4>
              <p className="text-[10.5px] text-slate-400 font-mono leading-relaxed mt-0.5">
                Hold low-latency speech conversations backed by Gemini's native voice interaction.
              </p>
            </div>
            <button
              id="voice-call-sidebar-starter"
              type="button"
              onClick={() => handleStartVoiceCall()}
              className="px-3.5 py-2 bg-teal-600 hover:bg-teal-550 text-white border border-teal-500 rounded-xl text-xs font-bold font-mono tracking-wide transition-all shadow-[0_0_12px_rgba(20,184,166,0.3)] shrink-0 cursor-pointer flex items-center gap-1.5"
            >
              <Phone className="h-3.5 w-3.5 animate-pulse" />
              <span>Call Bot</span>
            </button>
          </div>

          {/* Google Calendar Live Sync Dashboard */}
          <div className={`p-4 rounded-xl border mb-6 relative overflow-hidden transition-all ${
            googleAccessToken 
              ? 'bg-emerald-500/5 border-emerald-500/15 text-slate-300' 
              : 'bg-amber-500/5 border-amber-500/15 text-slate-300'
          }`}>
            <div className="absolute top-0 right-0 w-20 h-20 bg-teal-500/2 rounded-full blur-xl pointer-events-none"></div>
            
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-1.5 font-mono text-[10px] font-extrabold tracking-wider uppercase">
                <Calendar className="h-4 w-4 text-sky-400 shrink-0" />
                <span>Google Calendar Sync Engine</span>
              </div>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold font-mono uppercase tracking-wide ${
                (googleAccessToken && selectedTenant.googleCalendarAutoSchedule !== false)
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.1)]' 
                  : googleAccessToken
                  ? 'bg-amber-500/15 text-amber-500 border border-amber-500/20 shadow-[0_0_8px_rgba(245,158,11,0.15)]'
                  : 'bg-slate-500/15 text-slate-400 border border-white/5'
              }`}>
                {googleAccessToken ? (
                  selectedTenant.googleCalendarAutoSchedule !== false ? (
                    <>
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                      </span>
                      <span>Live Connected</span>
                    </>
                  ) : (
                    <>
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
                      </span>
                      <span>Auto-Sync Paused</span>
                    </>
                  )
                ) : (
                  <>
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-slate-500"></span>
                    </span>
                    <span>Offline Sandbox</span>
                  </>
                )}
              </span>
            </div>

            <p className="text-[11px] leading-relaxed text-slate-400 mt-1">
              {googleAccessToken 
                ? selectedTenant.googleCalendarAutoSchedule !== false
                  ? "Autonomous WhatsApp booking triggers are automatically synchronized onto your Google Calendar. Let the AI agent negotiate slots over SMS, and look directly at your main timeline!"
                  : "Google Calendar is linked, but autonomous real-time auto-scheduling is paused in settings. Direct bookings will default to offline sandbox mode until re-enabled."
                : "Simulator is running inside isolated local sandbox fallback. Appointments scheduled by the WhatsApp chatbot will be kept within this local browser cache session instead of syncing."
              }
            </p>

            {googleAccessToken ? (
              <div className="mt-3 pt-3 border-t border-emerald-500/10 space-y-2">
                <div className="flex items-center justify-between text-[10.5px] font-mono">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-slate-500" />
                    <span>Respecting {appointmentsList.length} Busy Slots:</span>
                  </span>
                  {onRefreshCalendar && (
                    <button
                      type="button"
                      onClick={onRefreshCalendar}
                      className="text-sky-400 hover:text-sky-300 font-extrabold cursor-pointer hover:underline flex items-center gap-1 select-none"
                    >
                      <span>🔄 Pull Fresh Slots</span>
                    </button>
                  )}
                </div>
                
                {appointmentsList.length > 0 ? (
                  <div className="max-h-24 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                    {appointmentsList.slice(0, 3).map((appt, i) => {
                      const startTime = new Date(appt.start);
                      return (
                        <div key={appt.id || i} className="flex justify-between items-center bg-slate-950/40 border border-slate-800/60 p-1.5 rounded text-[10px] font-mono text-slate-350">
                          <span className="truncate max-w-[140px] font-medium text-slate-300">{appt.customerName || appt.summary}</span>
                          <span className="text-slate-450 shrink-0 text-[9px] bg-slate-900 px-1 py-0.5 rounded">
                            {startTime.toLocaleDateString([], { month: 'short', day: 'numeric' })} at {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      );
                    })}
                    {appointmentsList.length > 3 && (
                      <p className="text-[9px] text-slate-500 italic text-right">+ {appointmentsList.length - 3} more conflict slots active</p>
                    )}
                  </div>
                ) : (
                  <p className="text-[10px] font-mono text-slate-500 italic bg-slate-950/20 p-2 rounded text-center border border-slate-900/50">
                    No active busy slots on your calendar. Your full timeline is open!
                  </p>
                )}
              </div>
            ) : (
              <div className="mt-3 pt-3 border-t border-amber-500/10 flex flex-col gap-2">
                <span className="text-[10px] font-medium text-slate-400">Experience actual workspace booking sync:</span>
                {onConnectGoogle && (
                  <button
                    type="button"
                    onClick={onConnectGoogle}
                    className="w-full py-2 bg-gradient-to-r from-indigo-600 to-indigo-550 hover:from-indigo-550 hover:to-indigo-500 text-white rounded-lg text-xs font-bold font-mono transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md border border-indigo-500/20"
                  >
                    <Calendar className="h-3.5 w-3.5 shrink-0" />
                    <span>Connect Google Calendar Workspace</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Autopilot Human takeover controller */}
          <div className="bg-slate-850/90 p-4 rounded-xl border border-slate-700/60 mb-6 space-y-3 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] font-mono font-bold text-teal-400 block tracking-wide uppercase">⚡ Human-in-the-Loop Mode</span>
                <span className="text-xs font-bold text-white block">AI Autopilot Status</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAutopilot(!isAutopilot);
                  setSimulatorLogs(prev => [
                    `[${new Date().toLocaleTimeString()}] 🤖 System Autopilot ${!isAutopilot ? 'Enabled (AI bot active)' : 'Paused (Live takeover)'}`,
                    ...prev
                  ]);
                }}
                className={`px-3 py-1 text-[10px] font-bold font-mono rounded-lg border transition-all cursor-pointer ${
                  isAutopilot
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                    : 'bg-amber-500/10 border-amber-500/40 text-amber-400 animate-pulse'
                }`}
              >
                {isAutopilot ? '🟢 AUTOPILOT' : '🟠 LIVE TAKEOVER'}
              </button>
            </div>

            {!isAutopilot && (
              <div className="pt-2.5 border-t border-slate-700/50 space-y-2">
                <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest block">Simulator Sender Role:</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSimulatorSender('customer')}
                    className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg font-mono tracking-wide transition-all cursor-pointer ${
                      simulatorSender === 'customer'
                        ? 'bg-blue-600 border border-blue-500 text-white shadow-md'
                        : 'bg-slate-800 hover:bg-slate-750 text-slate-350 border border-slate-700'
                    }`}
                  >
                    👤 Client
                  </button>
                  <button
                    type="button"
                    onClick={() => setSimulatorSender('bot')}
                    className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg font-mono tracking-wide transition-all cursor-pointer ${
                      simulatorSender === 'bot'
                        ? 'bg-indigo-600 border border-indigo-500 text-white shadow-md'
                        : 'bg-slate-800 hover:bg-slate-750 text-slate-350 border border-slate-700'
                    }`}
                  >
                    🧑‍💼 Agent
                  </button>
                </div>
                <p className="text-[10px] leading-relaxed text-slate-400 font-sans italic">
                  💡 Type messages in the smartphone preview text-box below to simulate conversation as the selected role!
                </p>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
              Simulated Customer Messages:
            </h4>
            <div className="grid grid-cols-1 gap-2.5">
              {SIMULATED_CUSTOMER_TEMPLATES.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => sendMessageToAgent(item.text)}
                  disabled={isTyping}
                  className="flex items-start gap-3 w-full text-left p-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-xs border border-slate-700/50 hover:border-slate-600 cursor-pointer transition-all hover:-translate-y-0.5"
                  id={`simulator-template-${idx}`}
                >
                  <div className="mt-0.5 p-1 bg-slate-700 rounded-lg shrink-0">
                    {item.icon}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-200 block mb-0.5">{item.label}</span>
                    <span className="text-slate-400 leading-normal line-clamp-2">{item.text}</span>
                  </div>
                </button>
              ))}
            </div>
                      {/* Simulated Welcome Greet Injector sandbox */}
            {selectedTenant.welcomeTemplates && selectedTenant.welcomeTemplates.length > 0 && (
              <div className="space-y-3 pt-5 mt-5 border-t border-slate-800">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono flex items-center gap-2">
                  <Bot className="h-4 w-4 text-blue-400" />
                  Test Welcome Message Templates:
                </h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Select any welcome greeting below to instantly reset the simulated WhatsApp viewport and preview how the chatbot initializes conversations with it.
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {selectedTenant.welcomeTemplates.map((wt) => {
                    const isActive = selectedTenant.activeWelcomeTemplateId === wt.id;
                    return (
                      <button
                        key={wt.id}
                        type="button"
                        onClick={() => {
                          setMessages([
                            {
                              id: 'welcome-' + Date.now(),
                              sender: 'bot',
                              text: wt.text,
                              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                              status: 'read'
                            }
                          ]);
                          triggerNotification(
                            'info',
                            'Welcome Greeting Swapped',
                            `Resetting WhatsApp chat with simulated template: "${wt.name}"`
                          );
                        }}
                        className={`flex items-start justify-between gap-3 text-left p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                          isActive 
                            ? 'bg-blue-950/40 border-blue-500/40 hover:border-blue-500/60 text-slate-200 shadow-[0_0_8px_rgba(59,130,246,0.15)] ring-1 ring-blue-500/10' 
                            : 'bg-slate-800/40 border-slate-700/50 hover:border-slate-700 text-slate-300'
                        }`}
                        id={`inject-welcome-wt-${wt.id}`}
                      >
                        <div className="min-w-0 flex-1">
                          <span className="font-semibold block truncate text-[11px] text-white">
                            {wt.name} {isActive && <span className="text-[9px] text-blue-400 font-mono font-bold uppercase ml-1.5">(Active)</span>}
                          </span>
                          <span className="text-slate-400 text-[10.5px] leading-snug line-clamp-1 block mt-0.5 font-mono">{wt.text}</span>
                        </div>
                        <div className="text-[10px] text-slate-350 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 font-mono shrink-0 select-none">
                          Load Text
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Guided Scenario Simulation Player */}
        <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />

          <div className="flex items-center gap-2 mb-4 bg-indigo-500/15 text-indigo-350 w-fit px-3 py-1 rounded-full text-xs font-mono">
            <Sparkles className="h-3.5 w-3.5 text-indigo-400 animate-pulse" />
            <span>Guided Playback Scenarios</span>
          </div>

          <h4 className="text-sm font-semibold text-slate-200 uppercase tracking-wider font-mono mb-2">
            Sequential AI Sandbox Demos:
          </h4>
          <p className="text-xs text-slate-400 leading-relaxed mb-4">
            Don't want to type manually? Trigger sequential automated client-conversation events to verify pipeline integrations in real-time.
          </p>

          <div className="space-y-3">
            {INTEGRATED_SCENARIOS.map((scenario) => {
              const isCurrent = playingScenario?.name === scenario.name;
              return (
                <div 
                  key={scenario.id} 
                  className={`p-3.5 rounded-xl border transition-all ${
                    isCurrent 
                      ? 'bg-indigo-950/40 border-indigo-500/50 shadow-[0_0_12px_rgba(99,102,241,0.2)]'
                      : 'bg-slate-800/50 border-slate-700/60 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 mb-1.5">
                    <span className="font-semibold text-xs text-slate-200 flex items-center gap-1.5 min-w-0">
                      {scenario.icon}
                      <span className="truncate">{scenario.name}</span>
                    </span>
                    {!playingScenario ? (
                      <button
                        type="button"
                        onClick={() => handleStartScenario(scenario)}
                        className="text-[10px] font-mono font-bold bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1 rounded-lg cursor-pointer transition-all shrink-0"
                      >
                        Play Demo
                      </button>
                    ) : isCurrent ? (
                      <span className="text-[9px] font-mono font-bold bg-indigo-500 text-white px-2 py-0.5 rounded-md animate-pulse uppercase select-none">
                        Step {playingScenario.currentStepIndex + 1}/{playingScenario.steps.length}
                      </span>
                    ) : (
                      <span className="text-[9px] font-mono font-bold text-slate-500 select-none">
                        Queued
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">{scenario.description}</p>
                  
                  {isCurrent && (
                    <div className="mt-3 bg-slate-950/60 p-2.5 rounded-lg border border-indigo-500/20 font-mono text-[10px] leading-relaxed space-y-1.5">
                      <p className="text-indigo-400 font-bold uppercase tracking-wider text-[9px] mb-1">Scenario Steps Executed:</p>
                      {scenario.steps.map((step, sIdx) => {
                        const done = sIdx < playingScenario.currentStepIndex;
                        const active = sIdx === playingScenario.currentStepIndex;
                        return (
                          <div key={sIdx} className="flex items-start gap-2 text-[10px]">
                            <span className={done ? 'text-emerald-400 shrink-0' : active ? 'text-indigo-400 animate-pulse shrink-0 font-bold' : 'text-slate-600 shrink-0'}>
                              {done ? '✓' : active ? '▶' : '○'}
                            </span>
                            <span className={done ? 'text-slate-500 line-through' : active ? 'text-slate-200 font-bold animate-pulse' : 'text-slate-500'}>
                              {step.text}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Event Feeds */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-md">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider font-mono mb-3 flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
            </span>
            Agent Operational Monitor log:
          </h4>
          <div className="border border-slate-100 rounded-xl bg-slate-50/50 p-4 font-mono text-xs space-y-2.5 max-h-[160px] overflow-y-auto">
            <div className="text-slate-400 flex justify-between border-b border-slate-100 pb-1.5 mb-1.5">
              <span className="font-bold text-slate-500">REAL-TIME WEBHOOK LOG</span>
              <span className="text-teal-600 animate-pulse font-bold flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-teal-500 inline-block" />
                POLLING ACTIVE
              </span>
            </div>
            {simulatorLogs.map((log, idx) => (
              <div key={idx} className="text-slate-600 text-[10px] sm:text-xs flex items-start gap-1 justify-between bg-slate-100/40 p-1.5 rounded-lg border border-slate-200/20">
                <span className="leading-relaxed">{log}</span>
              </div>
            ))}
            <div className="text-[#3b82f6] border-t border-slate-100 pt-1.5 mt-1.5 flex justify-between">
              <span>[2026-05-23 22:00] Webhook Service initialized</span>
              <span className="text-slate-450">SYSTEM</span>
            </div>
            <div className="text-slate-500">
              <span className="text-slate-400">[{new Date().toLocaleTimeString()}]</span> System instruction bound to <strong className="text-slate-705">@{selectedTenant.botName}</strong> ({selectedTenant.tone} tone).
            </div>
            {isTyping && (
              <div className="text-indigo-600 animate-pulse">
                <span>&gt; AI model parsing with system instructions...</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* High Fidelity Smartphone Replica */}
      <div className="xl:col-span-7 flex justify-center">
        <div className="relative w-full max-w-[390px] aspect-[9/18.5] bg-slate-950 rounded-[50px] p-3.5 border-4 border-slate-800 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.4)] ring-12 ring-slate-900 overflow-hidden flex flex-col">
          
          {/* Smartphone Speaker notch */}
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 h-6 w-36 bg-slate-900 rounded-b-2xl z-30 flex items-center justify-center gap-2">
            <div className="h-1 w-12 bg-slate-700 rounded" />
            <div className="h-2 w-2 bg-slate-800 rounded-full" />
          </div>

          {/* Alert Popups */}
          <AnimatePresence>
            {lastNotification && (
              <motion.div
                initial={{ opacity: 0, y: -50, scale: 0.9 }}
                animate={{ opacity: 1, y: 12, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute left-6 right-6 top-12 z-40 p-3.5 rounded-2xl shadow-xl border select-none glass-dark"
                id="simulator-action-popup"
              >
                <div className="flex gap-2.5 items-start">
                  <div className={`p-1.5 rounded-xl text-white ${
                    lastNotification.type === 'success' ? 'bg-teal-500' : 'bg-indigo-500'
                  }`}>
                    {lastNotification.type === 'success' ? <CheckCheck className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                  </div>
                  <div>
                    <h5 className="text-[11px] font-bold text-white uppercase tracking-wider font-mono">
                      {lastNotification.title}
                    </h5>
                    <p className="text-[11px] text-slate-300 leading-normal mt-0.5">
                      {lastNotification.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {isVoiceCallActive ? (
            <div className="flex-1 rounded-[36px] overflow-hidden flex flex-col bg-slate-950 border border-white/5 relative z-10 pt-6">
              {/* Voice Call Header */}
              <div className="px-4 py-2.5 bg-slate-900 border-b border-white/5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-teal-500 animate-pulse inline-block" />
                  <span className="text-[10px] font-mono text-teal-400 font-bold uppercase tracking-widest">
                    {voiceCallStatus === 'dialing' ? 'Dialing...' : voiceCallStatus === 'ended' ? 'Ended' : 'Live VoIP Session'}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-slate-300 bg-slate-800 px-2.5 py-0.5 rounded border border-white/5 shadow-inner">
                  {formatCallDuration(callDuration)}
                </span>
              </div>

              {/* Bot Persona Hero */}
              <div className="flex-1 flex flex-col items-center justify-center p-4 text-center relative overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />
                
                {/* Pulsating avatar ring effects */}
                <div className="relative mb-6">
                  {voiceCallStatus !== 'dialing' && voiceCallStatus !== 'ended' && (
                    <>
                      <div className="absolute -inset-4 rounded-full bg-teal-500/10 animate-ping opacity-60" style={{ animationDuration: '3s' }} />
                      <div className="absolute -inset-8 rounded-full bg-teal-500/5 animate-ping opacity-30" style={{ animationDuration: '4s' }} />
                    </>
                  )}
                  <div className="h-24 w-24 rounded-full bg-slate-900 border-2 border-teal-500/30 flex items-center justify-center text-4xl relative z-10 shadow-2xl">
                    {selectedTenant.avatar || "🤖"}
                  </div>
                </div>

                <h3 className="text-base font-bold text-white font-sans tracking-tight">
                  @{selectedTenant.botName}
                </h3>
                <p className="text-[10px] text-slate-450 font-mono mt-1">
                  AI Operator for {selectedTenant.name}
                </p>

                {/* Live Audio Visualizer waves */}
                <div className="mt-6 w-full max-w-[200px] h-10 flex flex-col items-center justify-center gap-2">
                  {voiceCallStatus === 'dialing' ? (
                    <div className="flex items-center gap-1.5 text-[11px] text-sky-400 font-mono">
                      <span className="animate-spin h-3 w-3 border border-sky-400 border-t-transparent rounded-full" />
                      <span>Connecting audio...</span>
                    </div>
                  ) : voiceCallStatus === 'speaking' ? (
                    <div className="space-y-1">
                      <div className="flex justify-center items-end gap-1 h-5">
                        <span className="w-1.5 bg-teal-550 rounded-full animate-pulse h-4" style={{ animationDuration: '0.6s' }} />
                        <span className="w-1.5 bg-teal-550 rounded-full animate-pulse h-2.5" style={{ animationDuration: '0.4s' }} />
                        <span className="w-1.5 bg-teal-550 rounded-full animate-pulse h-5" style={{ animationDuration: '0.8s' }} />
                        <span className="w-1.5 bg-teal-550 rounded-full animate-pulse h-3" style={{ animationDuration: '0.5s' }} />
                        <span className="w-1.5 bg-teal-550 rounded-full animate-pulse h-4" style={{ animationDuration: '0.7s' }} />
                      </div>
                      <span className="text-[9px] text-teal-400 font-mono uppercase tracking-wider font-bold block">
                        🎙️ Speaking...
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex justify-center items-end gap-1 h-5">
                        <span className={`w-1.5 bg-indigo-500 rounded-full h-1.5 ${isMicActive ? 'animate-bounce h-4' : ''}`} style={{ animationDelay: '0ms' }} />
                        <span className={`w-1.5 bg-indigo-500 rounded-full h-1.5 ${isMicActive ? 'animate-bounce h-2.5' : ''}`} style={{ animationDelay: '150ms' }} />
                        <span className={`w-1.5 bg-indigo-500 rounded-full h-1.5 ${isMicActive ? 'animate-bounce h-5' : ''}`} style={{ animationDelay: '300ms' }} />
                        <span className={`w-1.5 bg-indigo-500 rounded-full h-1.5 ${isMicActive ? 'animate-bounce h-3' : ''}`} style={{ animationDelay: '450ms' }} />
                        <span className={`w-1.5 bg-indigo-500 rounded-full h-1.5 ${isMicActive ? 'animate-bounce h-4' : ''}`} style={{ animationDelay: '600ms' }} />
                      </div>
                      <span className="text-[9px] text-indigo-400 font-mono uppercase tracking-wider block font-bold">
                        {isMicMuted 
                          ? '🔇 Mic Muted' 
                          : !('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
                            ? '⚠️ Mic restricted inside iframe (Use Type-To-Speak below)'
                            : isMicActive 
                              ? '🎤 listening (speak now)' 
                              : '🎧 standby'
                        }
                      </span>
                    </div>
                  )}
                </div>

                {/* Live transcription bubble */}
                <div className="mt-5 w-full text-left">
                  <div className="bg-slate-900 border border-white/5 rounded-xl p-3 h-28 overflow-y-auto font-mono text-[10.5px] leading-relaxed text-slate-300">
                    {voiceTranscript.length === 0 ? (
                      <div className="text-slate-600 italic text-center h-full flex items-center justify-center text-[10px] flex-col gap-1">
                        <span>Speech transcript feeds here in real-time...</span>
                        <span className="text-[8px] opacity-70">Hint: Try typing a question in the input below!</span>
                      </div>
                    ) : (
                      voiceTranscript.map((t, index) => (
                        <div key={index} className={`mb-2 pb-1.5 border-b border-white/5 last:border-b-0 last:mb-0 ${
                          t.sender === 'customer' ? 'text-indigo-300' : 'text-teal-300'
                        }`}>
                          <strong className="uppercase mr-1">{t.sender === 'customer' ? 'You' : selectedTenant.botName}:</strong>
                          <span>{t.text}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Call preset bypass bar */}
              <div className="p-3 bg-slate-900 border-t border-white/5 space-y-2 shrink-0">
                {/* Fallback Custom Input Textbox */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[8.5px] font-mono text-slate-400">
                    <span className="font-bold text-amber-400 uppercase tracking-widest block flex items-center gap-1">
                      <span>⌨️</span> Speak via Input (Fallback)
                    </span>
                    <span className="text-[7.5px] text-slate-500">Iframe mic block solution</span>
                  </div>
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (voiceCallInputText.trim() && voiceCallStatus !== 'dialing' && voiceCallStatus !== 'speaking') {
                        processVoiceInput(voiceCallInputText.trim());
                        setVoiceCallInputText('');
                      }
                    }} 
                    className="flex gap-1"
                  >
                    <input
                      type="text"
                      value={voiceCallInputText}
                      onChange={(e) => setVoiceCallInputText(e.target.value)}
                      disabled={voiceCallStatus === 'dialing' || voiceCallStatus === 'speaking'}
                      placeholder={voiceCallStatus === 'speaking' ? "Wait for agent to finish..." : "Type text and hit enter to speak..."}
                      className="flex-1 bg-slate-950 border border-white/10 rounded px-2 py-1 text-[10px] text-white focus:outline-none focus:border-indigo-500 font-sans disabled:opacity-50"
                    />
                    <button
                      type="submit"
                      disabled={!voiceCallInputText.trim() || voiceCallStatus === 'dialing' || voiceCallStatus === 'speaking'}
                      className="px-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-850 disabled:text-slate-500 disabled:opacity-45 text-white rounded text-[10px] font-bold font-mono transition-colors cursor-pointer"
                    >
                      Send
                    </button>
                  </form>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-white/5">
                  <span className="text-[8.5px] font-mono font-bold text-slate-400 uppercase tracking-widest block">
                    🗣️ Preset Scenarios
                  </span>
                  <span className="text-[8.5px] font-mono text-slate-500">Quick click</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {VOICE_CALL_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      disabled={voiceCallStatus === 'dialing' || voiceCallStatus === 'speaking'}
                      onClick={() => processVoiceInput(preset.text)}
                      className="px-2 py-1 bg-slate-850 hover:bg-slate-800 text-slate-300 text-[10px] font-mono rounded-lg text-left line-clamp-1 truncate border border-white/5 disabled:opacity-40 cursor-pointer transition-colors"
                      title={preset.text}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Call Controls panel */}
              <div className="p-4 bg-slate-900 border-t border-white/5 flex items-center justify-around shrink-0 rounded-b-[36px]">
                {/* Mute Mic Button */}
                <button
                  type="button"
                  onClick={toggleMuteMic}
                  className={`h-9 w-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                    isMicMuted 
                      ? 'bg-rose-600 border border-rose-500 text-white' 
                      : 'bg-slate-800 hover:bg-slate-750 text-slate-300 border border-white/5'
                  }`}
                  title={isMicMuted ? 'Unmute microphone' : 'Mute microphone'}
                >
                  {isMicMuted ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                </button>

                {/* Hang Up Button */}
                <button
                  type="button"
                  onClick={handleEndVoiceCall}
                  className="h-12 w-12 rounded-full bg-rose-600 hover:bg-rose-550 text-white flex items-center justify-center shadow-lg hover:shadow-rose-600/30 cursor-pointer transition-all hover:scale-105"
                  title="Hang up call"
                >
                  <PhoneOff className="h-4.5 w-4.5" />
                </button>

                {/* Speaker Toggle Button */}
                <button
                  type="button"
                  onClick={() => setIsSpeakerMuted(!isSpeakerMuted)}
                  className={`h-9 w-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                    isSpeakerMuted 
                      ? 'bg-amber-600 border border-amber-500 text-white' 
                      : 'bg-slate-800 hover:bg-slate-750 text-slate-300 border border-white/5'
                  }`}
                  title={isSpeakerMuted ? 'Unmute voice output' : 'Mute voice output'}
                >
                  {isSpeakerMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* WhatsApp Header area inside the phone */}
              <div className="bg-[#075e54] text-white pt-7 pb-3.5 px-4 rounded-t-[36px] flex items-center justify-between shadow-md shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-base text-white border border-white/20 object-cover shadow-inner relative">
                    {selectedTenant.avatar}
                    {/* Active check indicator */}
                    <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-emerald-500 rounded-full border-2 border-[#075e54]" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold leading-tight font-sans tracking-wide">
                      {selectedTenant.name}
                    </h4>
                    <p className="text-[10px] text-[#e0f2f1] flex items-center gap-1 font-mono">
                      <span className={`h-1.5 w-1.5 rounded-full animate-pulse inline-block ${selectedTenant.whatsAppSandboxActive ? 'bg-blue-300' : 'bg-emerald-300'}`} />
                      <span>
                        {selectedTenant.whatsAppSandboxActive && selectedTenant.whatsAppSandboxNumbers && selectedTenant.whatsAppSandboxNumbers.length > 0
                          ? `${selectedTenant.whatsAppSandboxNumbers[0]} (Sandbox)`
                          : selectedTenant.whatsAppPhoneNumber 
                            ? `${selectedTenant.whatsAppPhoneNumber} | @${selectedTenant.botName}` 
                            : `@${selectedTenant.botName} (Sandbox)`
                        }
                      </span>
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2.5 text-slate-200">
                  <button
                    type="button"
                    onClick={() => handleStartVoiceCall()}
                    className="p-1 hover:bg-white/10 rounded-full cursor-pointer transition-colors"
                    title="Initiate voice call with AI Operator"
                  >
                    <Phone className="h-4 w-4 text-emerald-250 animate-pulse" />
                  </button>
                  <div className="flex flex-col gap-0.5">
                    <span className="h-1 w-1 bg-white rounded-full"></span>
                    <span className="h-1 w-1 bg-white rounded-full"></span>
                    <span className="h-1 w-1 bg-white rounded-full"></span>
                  </div>
                </div>
              </div>

              {/* WhatsApp Chat History Grid */}
              <div 
                ref={chatContainerRef}
                className="flex-1 overflow-y-auto px-3.5 py-4 space-y-3 flex flex-col bg-[#ece5dd]"
                style={{ backgroundImage: 'radial-gradient(#dfdcd6 10%, transparent 11%)', backgroundSize: '12px 12px' }}
              >
                {/* Header info badge */}
                <div className="self-center bg-[#ffe0b2] text-[#e65100] text-[10px] py-1 px-3 rounded-lg font-medium shadow-sm border border-[#ffd180]/50 text-center max-w-[85%]">
                  🔒 Messages and calls are end-to-end encrypted under standard client SSL rules.
                </div>

                {messages.map((m) => {
                  const meta = getMessageMetadata(m.text, m.sender);
                  const agentsList = selectedTenant.agents || [];
                  const currentAgent = agentsList.find(a => a.id === selectedTenant.activeAgentId) || agentsList[0];
                  const hasVoice = m.sender === 'bot' && !!currentAgent?.voiceEnabled;
                  const isCurrentPlayingValue = playingMessageId === m.id;

                  return (
                    <div
                      key={m.id}
                      className={`max-w-[80%] rounded-xl px-3 py-2 text-xs shadow-sm flex flex-col relative group ${
                        m.sender === 'bot'
                          ? 'self-start bg-white text-slate-800 rounded-tl-none border-l-3 border-teal-600'
                          : 'self-end bg-[#dcf8c6] text-slate-800 rounded-tr-none border-r-3 border-emerald-500'
                      }`}
                    >
                      {/* Action Trigger Flag */}
                      {m.actionsTriggered && (
                        <div className="flex items-center gap-1.5 text-[10px] text-teal-700 bg-teal-50 border border-teal-100 rounded px-2 py-0.5 mb-1.5 font-bold uppercase tracking-wider font-mono">
                          {m.actionsTriggered.type === 'purchase_item' ? (
                            <span className="animate-pulse">🛒</span>
                          ) : (
                            <Sparkles className="h-3 w-3 animate-bounce" />
                          )}
                          <span>{m.actionsTriggered.type.replace('_', ' ')}: {m.actionsTriggered.details || 'Active'}</span>
                        </div>
                      )}

                      {/* Voice Delivery / Audio Note for Bot Messages */}
                      {hasVoice && (
                        <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-100/80 p-2 rounded-lg mb-2 text-slate-800 select-none min-w-[200px] w-full self-start">
                          <button
                            onClick={() => {
                              if ('speechSynthesis' in window) {
                                if (isCurrentPlayingValue) {
                                  window.speechSynthesis.cancel();
                                  setPlayingMessageId(null);
                                } else {
                                  window.speechSynthesis.cancel();
                                  const cleanText = m.text.replace(/[*#_~`\[\]]/g, '');
                                  const utterance = new SpeechSynthesisUtterance(cleanText);
                                  const voices = window.speechSynthesis.getVoices();
                                  const indLower = (selectedTenant.industry || '').toLowerCase();
                                  let selectedVoice = null;
                                  if (indLower.includes('ar')) {
                                    selectedVoice = voices.find(v => v.lang.startsWith('ar') || v.lang.includes('AR'));
                                  } else if (indLower.includes('fr')) {
                                    selectedVoice = voices.find(v => v.lang.startsWith('fr') || v.lang.includes('FR'));
                                  } else {
                                    selectedVoice = voices.find(v => v.lang.startsWith('en') || v.lang.includes('EN'));
                                  }
                                  if (selectedVoice) {
                                    utterance.voice = selectedVoice;
                                  }
                                  utterance.onstart = () => setPlayingMessageId(m.id);
                                  utterance.onend = () => setPlayingMessageId(null);
                                  utterance.onerror = () => setPlayingMessageId(null);
                                  window.speechSynthesis.speak(utterance);
                                }
                              }
                            }}
                            type="button"
                            className="p-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full flex items-center justify-center shrink-0 cursor-pointer shadow-sm active:scale-95 transition-all text-xs"
                            title={isCurrentPlayingValue ? "Pause vocal speech" : "Replay voice note"}
                          >
                            {isCurrentPlayingValue ? (
                              <VolumeX className="h-3.5 w-3.5 animate-pulse" />
                            ) : (
                              <Volume2 className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1 mb-0.5">
                              <span className="text-[9px] font-bold text-slate-500 font-mono tracking-wide uppercase">🎙️ Voice Note</span>
                              {isCurrentPlayingValue && (
                                <span className="text-[8px] font-mono font-bold text-emerald-600 bg-emerald-100/60 px-1 py-[0.5px] rounded animate-pulse">
                                  PLAYING
                                </span>
                              )}
                            </div>
                            {/* Adaptive wave graphic */}
                            <div className="flex items-center gap-[1.5px] h-3.5 px-0.5 overflow-hidden">
                              {[1.5, 3, 2, 4, 1.5, 3, 4.5, 2, 1.5, 3.5, 5, 3, 1.5, 2, 3.5, 3, 1.5, 3.5, 2, 1.5, 2.5, 3, 2, 4, 1.5].map((h, i) => (
                                <div
                                  key={i}
                                  className={`w-[1.5px] rounded-full transition-all duration-300 ${
                                    isCurrentPlayingValue 
                                      ? 'bg-emerald-500 h-full animate-pulse' 
                                      : 'bg-slate-300'
                                  }`}
                                  style={{
                                    height: `${h * 2}px`,
                                    animationDelay: `${i * 60}ms`,
                                    animationDuration: '0.8s'
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      <p className="whitespace-pre-line leading-relaxed">{m.text}</p>

                      {/* AI NLP & Real-time Telemetry Trace Pill */}
                      <div className="mt-2 pt-1 border-t border-black/5 flex flex-wrap gap-1 items-center justify-between select-none font-mono text-[8.5px]">
                        {m.sender === 'customer' ? (
                          <>
                            <span className="text-slate-500 flex items-center gap-0.5">
                              <span>{meta.icon}</span>
                              <strong className="text-slate-600 uppercase font-black">{meta.intent}</strong>
                            </span>
                            <span className={`px-1 rounded-sm border ${meta.sentimentColor} text-[7.5px] font-bold`}>
                              {meta.sentimentLabel}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="text-slate-450 font-bold flex items-center gap-0.5">
                              <span>🤖</span>
                              <span>{meta.model}</span>
                            </span>
                            <span className="text-[7.5px] font-semibold text-teal-600 bg-teal-500/10 px-1 border border-teal-500/20 rounded-sm">
                              {meta.latency} | {meta.tokens} tokens
                            </span>
                          </>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-end gap-1 text-[9px] text-slate-400 self-end mt-1 font-mono">
                        <span>{m.timestamp}</span>
                        {m.status === 'sent' && (
                          <Check className="h-3 w-3 text-slate-400" title="Sent" />
                        )}
                        {m.status === 'delivered' && (
                          <CheckCheck className="h-3 w-3 text-slate-400" title="Delivered" />
                        )}
                        {(m.status === 'read' || !m.status) && (
                          <CheckCheck className="h-3 w-3 text-sky-500" title="Read" />
                        )}
                      </div>
                    </div>
                  );
                })}

                {isTyping && (
                  <div className="self-start bg-white text-slate-800 rounded-xl rounded-tl-none px-3.5 py-2.5 text-xs shadow-sm flex items-center gap-2">
                    <span className="font-semibold text-[10px] text-teal-600">{selectedTenant.botName} is typing</span>
                    <span className="flex gap-1">
                      <span className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                  </div>
                )}

                <div className="h-0" />
              </div>

              {/* WhatsApp Text Input panel */}
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessageToAgent(inputText);
                }}
                className="p-2.5 bg-[#f0f0f0]/95 backdrop-blur-md flex items-center gap-2 border-t border-slate-200/80 shrink-0"
              >
                <input
                  id="whatsapp-text-input"
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={
                    !isAutopilot
                      ? simulatorSender === 'bot'
                        ? `Reply as ${selectedTenant.botName} (Live Agent takeover)...`
                        : "Simulate typing message as Client..."
                      : "Type message to agent..."
                  }
                  disabled={isTyping}
                  className={`flex-1 bg-white hover:bg-slate-50 focus:bg-white text-xs text-slate-800 font-sans border rounded-full px-3.5 py-2.5 outline-none focus:ring-1 ${
                    !isAutopilot && simulatorSender === 'bot'
                      ? 'border-indigo-400 focus:ring-indigo-500'
                      : 'border-slate-200 focus:ring-teal-500'
                  }`}
                />
                
                {/* Real-time Voice speech recognition button */}
                <button
                  id="whatsapp-mic-btn"
                  type="button"
                  onClick={toggleChatMic}
                  disabled={isTyping}
                  className={`h-10 w-10 flex items-center justify-center rounded-full transition-all cursor-pointer border shrink-0 relative ${
                    isChatMicActive
                      ? 'bg-rose-500 text-white border-rose-400 shadow-[0_0_12px_rgba(239,68,68,0.5)] animate-pulse'
                      : 'bg-white text-slate-500 hover:text-slate-800 border-slate-200 hover:border-slate-350'
                  }`}
                  title={isChatMicActive ? "Stop voice listening" : "Speak to agent (Voice dictionary input)"}
                >
                  <span className={`absolute -inset-0.5 rounded-full bg-rose-500/20 pointer-events-none ${isChatMicActive ? 'animate-ping' : 'hidden'}`} />
                  {isChatMicActive ? (
                    <Mic className="h-4 w-4 text-white" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </button>

                <button
                  id="whatsapp-send-btn"
                  type="submit"
                  disabled={!inputText.trim() || isTyping}
                  className={`h-10 w-10 flex items-center justify-center rounded-full transition-all cursor-pointer shrink-0 disabled:opacity-45 ${
                    !isAutopilot && simulatorSender === 'bot'
                      ? 'bg-indigo-600 text-white hover:bg-indigo-550 disabled:hover:bg-indigo-600'
                      : 'bg-[#075e54] text-white hover:bg-[#128c7e] disabled:hover:bg-[#075e54]'
                  }`}
                  title={
                    !isAutopilot && simulatorSender === 'bot'
                      ? "Send direct human representative agent response"
                      : "Send simulated customer reply"
                  }
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </>
          )}

        </div>
      </div>
    </div>
  );
};
