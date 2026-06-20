import { logger } from '../lib/logger';

export function isPlaceholderToken(token: string | undefined): boolean {
  if (!token) return true;
  return (
    token === "dummy" ||
    token.includes("...") ||
    token.startsWith("waba_live_") ||
    token.length < 30
  );
}

export async function sendWhatsAppMessage(
  targetPhoneNumberId: string,
  accessToken: string,
  to: string,
  text: string
): Promise<any> {
  if (isPlaceholderToken(accessToken)) {
    logger.info({ targetPhoneNumberId, to }, 'Bypassing outbound send: placeholder credentials');
    return { status: "bypassed" };
  }

  const url = `https://graph.facebook.com/v20.0/${targetPhoneNumberId}/messages`;
  
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: to,
        type: "text",
        text: {
          preview_url: false,
          body: text
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Meta Graph API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    logger.error({ to, err: error }, 'Meta Graph API send failed');
    throw error;
  }
}
