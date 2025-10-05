
'use server';

/**
 * @fileOverview Generates a random, non-repeating number between 1 and 90 and announces it using Google Cloud Text-to-Speech.
 *
 * - generateAndAnnounceNumber - A function that generates and announces the number.
 * - GenerateAndAnnounceNumberInput - The input type for the generateAndAnnounceNumber function.
 * - GenerateAndAnnounceNumberOutput - The return type for the generateAndAnnounceNumber function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import wav from 'wav';
import { googleAI } from '@genkit-ai/google-genai';

const GenerateAndAnnounceNumberInputSchema = z.object({
  previousNumbers: z
    .array(z.number())
    .describe('The list of previously called numbers.'),
  numberToAnnounce: z.number().describe('The specific number to generate audio for.'),
});
export type GenerateAndAnnounceNumberInput = z.infer<
  typeof GenerateAndAnnounceNumberInputSchema
>;

const GenerateAndAnnounceNumberOutputSchema = z.object({
  number: z.number().describe('The number that was announced.'),
  audio: z.string().describe('The audio data of the announced number.'),
});
export type GenerateAndAnnounceNumberOutput = z.infer<
  typeof GenerateAndAnnounceNumberOutputSchema
>;

export async function generateAndAnnounceNumber(
  input: GenerateAndAnnounceNumberInput
): Promise<GenerateAndAnnounceNumberOutput> {
  return generateAndAnnounceNumberFlow(input);
}

async function toWav(
  pcmData: Buffer,
  channels = 1,
  rate = 24000,
  sampleWidth = 2
): Promise<string> {
  return new Promise((resolve, reject) => {
    const writer = new wav.Writer({
      channels,
      sampleRate: rate,
      bitDepth: sampleWidth * 8,
    });

    let bufs = [] as any[];
    writer.on('error', reject);
    writer.on('data', function (d) {
      bufs.push(d);
    });
    writer.on('end', function () {
      resolve(Buffer.concat(bufs).toString('base64'));
    });

    writer.write(pcmData);
    writer.end();
  });
}

// Helper function to convert number to words for announcement
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
    return `Single number ${numberWords(number)}, ${number}.`;
  } else {
    const textPart = `${numberWords(number)}, ${number}`;
    return `${textPart}. I repeat, ${textPart}.`;
  }
}


const generateAndAnnounceNumberFlow = ai.defineFlow(
  {
    name: 'generateAndAnnounceNumberFlow',
    inputSchema: GenerateAndAnnounceNumberInputSchema,
    outputSchema: GenerateAndAnnounceNumberOutputSchema,
  },
  async input => {
    const numberToAnnounce = input.numberToAnnounce;
    const announceText = getAnnouncementText(numberToAnnounce);

    if (!announceText || announceText.trim() === '') {
      console.error('TTS text is empty!');
      return { number: numberToAnnounce, audio: '' };
    }

    try {
      const {media} = await ai.generate({
        model: googleAI.model('gemini-2.5-flash-preview-tts'),
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
                prebuiltVoiceConfig: { voiceName: 'en-US-News-M' },
            },
          },
        },
        prompt: announceText,
      });

      if (!media || !media.url) {
        throw new Error('no media returned from TTS service');
      }

      const audioBuffer = Buffer.from(
        media.url.substring(media.url.indexOf(',') + 1),
        'base64'
      );

      const audio = 'data:audio/wav;base64,' + (await toWav(audioBuffer));

      return {number: numberToAnnounce, audio: audio};
    } catch (err) {
      console.error("TTS generation failed:", err);
      return { number: numberToAnnounce, audio: '' };
    }
  }
);
