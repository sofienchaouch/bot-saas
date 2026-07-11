export interface MessageMetadata {
  intent?: string;
  icon?: string;
  sentimentColor?: string;
  sentimentLabel?: string;
  model?: string;
  latency?: string;
  tokens?: number;
  confidence: number;
}

export const getMessageMetadata = (text: string, sender: 'bot' | 'customer'): MessageMetadata => {
  const norm = text.toLowerCase();
  if (sender === 'customer') {
    let intent = 'General Inquiry';
    let icon = '💬';
    let sentimentColor = 'text-slate-400 bg-slate-950/40 border-slate-800';
    let sentimentLabel = 'Neutral Dynamic Intent';

    if (
      norm.includes('hello') ||
      norm.includes('hi') ||
      norm.includes('greetings') ||
      norm.includes('aslema') ||
      norm.includes('ahla') ||
      norm.includes('سلام') ||
      norm.includes('اهلين')
    ) {
      intent = 'Inbound Entry Greeting';
      icon = '👋';
    } else if (
      norm.includes('book') ||
      norm.includes('appointment') ||
      norm.includes('schedule') ||
      norm.includes('reserve') ||
      norm.includes('time') ||
      norm.includes('date') ||
      norm.includes('calendar') ||
      norm.includes('meeting') ||
      norm.includes('slot') ||
      norm.includes('وقتاش') ||
      norm.includes('نحب نقيد') ||
      norm.includes('موعد')
    ) {
      intent = 'Schedule Negotiation';
      icon = '📅';
    } else if (
      norm.includes('name') ||
      norm.includes('email') ||
      norm.includes('phone') ||
      norm.includes('contact') ||
      norm.includes('address') ||
      norm.includes('details') ||
      norm.includes('telephone')
    ) {
      intent = 'Lead Ingest Pipeline';
      icon = '👤';
    } else if (
      norm.includes('price') ||
      norm.includes('cost') ||
      norm.includes('quote') ||
      norm.includes('how much') ||
      norm.includes('subscription') ||
      norm.includes('bsh7al') ||
      norm.includes('قداس') ||
      norm.includes('سوم')
    ) {
      intent = 'Pricing & Commerce Queries';
      icon = '💰';
    }

    if (
      norm.includes('great') ||
      norm.includes('perfect') ||
      norm.includes('awesome') ||
      norm.includes('thank') ||
      norm.includes('happy') ||
      norm.includes('love') ||
      norm.includes('good') ||
      norm.includes('behi') ||
      norm.includes('y3aychek') ||
      norm.includes('يعيشك') ||
      norm.includes('باهي')
    ) {
      sentimentColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      sentimentLabel = 'Positive Sentiment';
    } else if (
      norm.includes('bad') ||
      norm.includes('slow') ||
      norm.includes('angry') ||
      norm.includes('frustrated') ||
      norm.includes('issue') ||
      norm.includes('error') ||
      norm.includes('fail') ||
      norm.includes('stop') ||
      norm.includes('not working') ||
      norm.includes('chbih') ||
      norm.includes('msh behi') ||
      norm.includes('غالي') ||
      norm.includes('مشكل')
    ) {
      sentimentColor = 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      sentimentLabel = 'Frustrated / High Urgency';
    }

    return { intent, icon, sentimentColor, sentimentLabel, confidence: 96 };
  } else {
    // Math to keep tokens and latency clean and stable
    const textLen = text.length;
    const computedLatency = Math.floor(textLen * 1.5 + 120 + (textLen % 13) * 3);
    const computedTokens = Math.floor(textLen * 0.42 + 210);
    return {
      model: 'Gemini 2.5 Flash',
      latency: `${computedLatency}ms`,
      tokens: computedTokens,
      confidence: 99,
    };
  }
};
