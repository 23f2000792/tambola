'use server';

/**
 * @fileOverview Generates audio for a given text using Google Cloud Text-to-Speech directly.
 *
 * - generateAudio - A function that generates the audio.
 * - GenerateAudioInput - The input type for the generateAudio function.
 * - GenerateAudioOutput - The return type for the generateAudio function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';

// Helper function to get announcement text
const numberToWordsMap: { [key: number]: string } = {
    0: 'zero', 1: 'one', 2: 'two', 3: 'three', 4: 'four',
    5: 'five', 6: 'six', 7: 'seven', 8: 'eight', 9: 'nine'
};

function getAnnouncementText(number: number): string {
  if (number < 1 || number > 90) {
    return '';
  }

  const numberWords = (num: number) => num.toString().split('').map(digit => numberToWordsMap[parseInt(digit, 10)]).join(' ');

  if (number >= 1 && number <= 9) {
    return `Single number ${number}.`;
  } else {
    const textPart = `${numberWords(number)}, ${number}`;
    return `${textPart}. I repeat, ${textPart}.`;
  }
}


export const GenerateAudioInputSchema = z.object({
  numberToAnnounce: z.number().min(1).max(90),
});
export type GenerateAudioInput = z.infer<typeof GenerateAudioInputSchema>;

export const GenerateAudioOutputSchema = z.object({
  number: z.number(),
  audio: z.string().describe('The base64 encoded audio data as a data URI.'),
});
export type GenerateAudioOutput = z.infer<typeof GenerateAudioOutputSchema>;


export async function generateAudio(input: GenerateAudioInput): Promise<GenerateAudioOutput> {
    return generateAudioFlow(input);
}

const generateAudioFlow = ai.defineFlow(
  {
    name: 'generateAudioFlow',
    inputSchema: GenerateAudioInputSchema,
    outputSchema: GenerateAudioOutputSchema,
  },
  async (input) => {
    const { numberToAnnounce } = input;
    const text = getAnnouncementText(numberToAnnounce);

    if (!text) {
      console.error(`Could not generate announcement text for number: ${numberToAnnounce}`);
      return { number: numberToAnnounce, audio: '' };
    }
    
    try {
      const client = new TextToSpeechClient();
      
      const request = {
        input: { text: text },
        voice: { languageCode: 'en-IN', name: 'en-IN-Wavenet-C' },
        audioConfig: { audioEncoding: 'MP3' as const },
      };

      const [response] = await client.synthesizeSpeech(request);

      if (!response.audioContent) {
        console.error('Direct TTS API call returned no audio content.');
        return { number: numberToAnnounce, audio: '' };
      }

      const audioData = Buffer.from(response.audioContent).toString('base64');
      const audioUri = `data:audio/mp3;base64,${audioData}`;
      
      return { number: numberToAnnounce, audio: audioUri };

    } catch (err) {
      console.error("Error calling Google Cloud TTS API directly:", err);
      return { number: numberToAnnounce, audio: '' };
    }
  }
);
