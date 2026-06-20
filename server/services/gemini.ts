import { GoogleGenAI } from "@google/genai";
import { GEMINI_API_KEY } from "../config";
import { logger } from "../lib/logger";

export let ai: GoogleGenAI | null = null;

if (GEMINI_API_KEY) {
  ai = new GoogleGenAI({
    apiKey: GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
} else {
  logger.warn("GEMINI_API_KEY is not defined in the environment. Chatbot operates in offline simulated mode.");
}
