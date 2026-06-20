import crypto from "crypto";
import { ENCRYPTION_KEY } from "../config";

const ENCRYPTION_SECRET = ENCRYPTION_KEY;

export function encryptText(text: string): string {
  if (!text) return "";
  try {
    const iv = crypto.randomBytes(12);
    const key = crypto.scryptSync(ENCRYPTION_SECRET, "aura-salt", 32);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    const tag = cipher.getAuthTag().toString("hex");
    return `${iv.toString("hex")}:${encrypted}:${tag}`;
  } catch (err) {
    console.error("Encryption error:", err);
    throw new Error("Encryption failed: PII leaks prevented.");
  }
}

export function decryptText(encryptedText: string): string {
  if (!encryptedText) return "";
  if (!encryptedText.includes(":")) return encryptedText;
  try {
    const parts = encryptedText.split(":");
    if (parts.length !== 3) throw new Error("Invalid cipher format");
    const iv = Buffer.from(parts[0], "hex");
    const encrypted = parts[1];
    const tag = Buffer.from(parts[2], "hex");
    const key = crypto.scryptSync(ENCRYPTION_SECRET, "aura-salt", 32);
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (err) {
    console.error("Decryption error:", err);
    throw new Error("Decryption failed: PII integrity mismatch.");
  }
}

export function encryptTenant(tenant: any): any {
  if (!tenant) return tenant;
  const copy = JSON.parse(JSON.stringify(tenant));
  
  if (copy.whatsAppApiKey) copy.whatsAppApiKey = encryptText(copy.whatsAppApiKey);
  if (copy.messengerToken) copy.messengerToken = encryptText(copy.messengerToken);
  
  if (Array.isArray(copy.leads)) {
    copy.leads = copy.leads.map((l: any) => ({
      ...l,
      email: encryptText(l.email),
      phone: encryptText(l.phone)
    }));
  }
  
  if (Array.isArray(copy.appointments)) {
    copy.appointments = copy.appointments.map((a: any) => ({
      ...a,
      email: encryptText(a.email),
      customerPhone: encryptText(a.customerPhone)
    }));
  }
  
  return copy;
}

export function decryptTenant(tenant: any): any {
  if (!tenant) return tenant;
  const copy = JSON.parse(JSON.stringify(tenant));
  
  if (copy.whatsAppApiKey) copy.whatsAppApiKey = decryptText(copy.whatsAppApiKey);
  if (copy.messengerToken) copy.messengerToken = decryptText(copy.messengerToken);
  
  if (Array.isArray(copy.leads)) {
    copy.leads = copy.leads.map((l: any) => ({
      ...l,
      email: decryptText(l.email),
      phone: decryptText(l.phone)
    }));
  }
  
  if (Array.isArray(copy.appointments)) {
    copy.appointments = copy.appointments.map((a: any) => ({
      ...a,
      email: decryptText(a.email),
      customerPhone: decryptText(a.customerPhone)
    }));
  }
  
  return copy;
}
