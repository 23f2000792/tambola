'use server';
/**
 * Firebase AI Flow: Indianized Tambola Number Announcer
 *
 * Description:
 * - Announces numbers in Indian English style with repetition.
 * - Handles single-digit, double-digit, and special phrasing.
 * - Uses Google Cloud Text-to-Speech (Indian voices).
 * - Provides fallback audio to avoid any errors.
 */

import { TextToSpeechClient } from "@google-cloud/text-to-speech";

// This is a singleton instance, so it's created only once.
const ttsClient = new TextToSpeechClient();

// Base64-encoded fallback beep (a short, simple sine wave beep in WAV format)
const fallbackBeepBase64 = "UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";

/**
 * Convert a number to words (1 → "one", 21 → "twenty one")
 */
function numberToWords(num: number): string {
  const a = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
  const b = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
  const c = ["ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];

  if (num < 10) return a[num];
  if (num < 20) return c[num - 10];
  const tens = Math.floor(num / 10);
  const ones = num % 10;
  return ones === 0 ? b[tens] : `${b[tens]} ${a[ones]}`;
}

/**
 * Generate a spoken announcement string for the number
 */
function generateAnnouncement(num: number): string {
  const digits = num.toString().split("").map(d => numberToWords(parseInt(d, 10))).join(", ");
  const words = numberToWords(num);

  if (num < 10) {
    return `The number is, only number ${words}. I repeat, only number ${words}.`;
  } else {
    return `The number is, ${digits}, ${words}. I repeat, ${digits}, ${words}.`;
  }
}


/**
 * Generate TTS audio and return as a base64 data URI.
 */
export async function generateAnnouncementAudio(num: number): Promise<string> {
  const textToSpeak = generateAnnouncement(num);

  if (!textToSpeak || textToSpeak.trim() === "") {
    console.warn("TTS text empty, using fallback beep");
    return `data:audio/wav;base64,${fallbackBeepBase64}`;
  }

  try {
    const [response] = await ttsClient.synthesizeSpeech({
      input: { text: textToSpeak },
      voice: { languageCode: "en-IN", name: "en-IN-Wavenet-C", ssmlGender: "FEMALE" },
      audioConfig: { audioEncoding: "MP3" },
    });

    if (!response.audioContent) {
      console.warn("No audio returned from TTS, using fallback beep");
      return `data:audio/wav;base64,${fallbackBeepBase64}`;
    }

    const audioBase64 = Buffer.from(response.audioContent).toString("base64");
    return `data:audio/mp3;base64,${audioBase64}`;

  } catch (error) {
    console.error("TTS API error:", error);
    return `data:audio/wav;base64,${fallbackBeepBase64}`;
  }
}
