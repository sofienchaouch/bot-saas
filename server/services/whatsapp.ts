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
    console.log(`[META OUTBOUND] Bypassing outbound Graph API send because credentials are placeholders.`);
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
    console.error(`[META OUTBOUND ERROR] Failed to send Graph API message to ${to}:`, error);
    throw error;
  }
}
