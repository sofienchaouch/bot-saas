import React from 'react';
import { Tenant, ChatMessage } from '../../types';
import { Sparkles, Check, CheckCheck, Volume2, VolumeX } from 'lucide-react';
import { getMessageMetadata } from './messageMetadata';

interface MessageBubbleProps {
  message: ChatMessage;
  selectedTenant: Tenant;
  playingMessageId: string | null;
  setPlayingMessageId: (id: string | null) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message: m,
  selectedTenant,
  playingMessageId,
  setPlayingMessageId,
}) => {
  const meta = getMessageMetadata(m.text, m.sender);
  const agentsList = selectedTenant.agents || [];
  const currentAgent = agentsList.find(a => a.id === selectedTenant.activeAgentId) || agentsList[0];
  const hasVoice = m.sender === 'bot' && !!currentAgent?.voiceEnabled;
  const isCurrentPlayingValue = playingMessageId === m.id;

  return (
    <div
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
          <span>
            {m.actionsTriggered.type.replace('_', ' ')}: {m.actionsTriggered.details || 'Active'}
          </span>
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
                    selectedVoice = voices.find(
                      v => v.lang.startsWith('ar') || v.lang.includes('AR')
                    );
                  } else if (indLower.includes('fr')) {
                    selectedVoice = voices.find(
                      v => v.lang.startsWith('fr') || v.lang.includes('FR')
                    );
                  } else {
                    selectedVoice = voices.find(
                      v => v.lang.startsWith('en') || v.lang.includes('EN')
                    );
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
            title={isCurrentPlayingValue ? 'Pause vocal speech' : 'Replay voice note'}
          >
            {isCurrentPlayingValue ? (
              <VolumeX className="h-3.5 w-3.5 animate-pulse" />
            ) : (
              <Volume2 className="h-3.5 w-3.5" />
            )}
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1 mb-0.5">
              <span className="text-[9px] font-bold text-slate-500 font-mono tracking-wide uppercase">
                🎙️ Voice Note
              </span>
              {isCurrentPlayingValue && (
                <span className="text-[8px] font-mono font-bold text-emerald-600 bg-emerald-100/60 px-1 py-[0.5px] rounded animate-pulse">
                  PLAYING
                </span>
              )}
            </div>
            {/* Adaptive wave graphic */}
            <div className="flex items-center gap-[1.5px] h-3.5 px-0.5 overflow-hidden">
              {[
                1.5, 3, 2, 4, 1.5, 3, 4.5, 2, 1.5, 3.5, 5, 3, 1.5, 2, 3.5, 3, 1.5, 3.5, 2, 1.5, 2.5,
                3, 2, 4, 1.5,
              ].map((h, i) => (
                <div
                  key={i}
                  className={`w-[1.5px] rounded-full transition-all duration-300 ${
                    isCurrentPlayingValue ? 'bg-emerald-500 h-full animate-pulse' : 'bg-slate-300'
                  }`}
                  style={{
                    height: `${h * 2}px`,
                    animationDelay: `${i * 60}ms`,
                    animationDuration: '0.8s',
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      <p className="whitespace-pre-line leading-relaxed">{m.text}</p>
      {m.citations && m.citations.length > 0 && (
        <div className="mt-2 pt-1.5 border-t border-black/5 flex flex-wrap gap-1 items-center text-[9.5px] font-mono text-slate-500">
          <span className="font-bold text-teal-600">Sources:</span>
          {m.citations.map((cite: string, idx: number) => (
            <span
              key={idx}
              className="bg-slate-100 px-1 py-0.2 rounded border border-slate-200 text-slate-650"
            >
              {cite}
            </span>
          ))}
        </div>
      )}

      {/* AI NLP & Real-time Telemetry Trace Pill */}
      <div className="mt-2 pt-1 border-t border-black/5 flex flex-wrap gap-1 items-center justify-between select-none font-mono text-[8.5px]">
        {m.sender === 'customer' ? (
          <>
            <span className="text-slate-500 flex items-center gap-0.5">
              <span>{meta.icon}</span>
              <strong className="text-slate-600 uppercase font-black">{meta.intent}</strong>
            </span>
            <span
              className={`px-1 rounded-sm border ${meta.sentimentColor} text-[7.5px] font-bold`}
            >
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
        {m.status === 'sent' && <Check className="h-3 w-3 text-slate-400" title="Sent" />}
        {m.status === 'delivered' && (
          <CheckCheck className="h-3 w-3 text-slate-400" title="Delivered" />
        )}
        {(m.status === 'read' || !m.status) && (
          <CheckCheck className="h-3 w-3 text-sky-500" title="Read" />
        )}
      </div>
    </div>
  );
};
