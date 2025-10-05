
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
});
export type GenerateAndAnnounceNumberInput = z.infer<
  typeof GenerateAndAnnounceNumberInputSchema
>;

const GenerateAndAnnounceNumberOutputSchema = z.object({
  number: z.number().describe('The randomly generated number.'),
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

const generateNumberTool = ai.defineTool(
  {
    name: 'generateNumber',
    description: 'Generates a random, non-repeating number between 1 and 90.',
    inputSchema: z.object({
      previousNumbers: z
        .array(z.number())
        .describe('The list of previously called numbers.'),
    }),
    outputSchema: z
      .number()
      .describe('A random, non-repeating number between 1 and 90.'),
  },
  async input => {
    let number;
    do {
      number = Math.floor(Math.random() * 90) + 1;
    } while (input.previousNumbers.includes(number));
    return number;
  }
);

const announceNumberPrompt = ai.definePrompt({
  name: 'announceNumberPrompt',
  input: {
    schema: z.object({
      number: z.number().describe('The number to announce.'),
    }),
  },
  prompt: `You are a Tambola (Bingo) caller. Your task is to announce the given number precisely according to the rules below. Do not add any extra words, phrases, or commentary.

- If the number is a single digit (1-9), announce only the number.
  - Example for 7: "Seven."

- If the number is a two-digit number (10-90), announce the individual digits, then the full number, then repeat the phrase "I repeat" followed by the individual digits and the full number.
  - Example for 21: "Two one, 21. I repeat, two one, 21."
  - Example for 44: "Four four, 44. I repeat, four four, 44."
  - Example for 90: "Nine zero, 90. I repeat, nine zero, 90."

Your response must only contain the announcement.

Number to call: {{number}}`,
});

const generateAndAnnounceNumberFlow = ai.defineFlow(
  {
    name: 'generateAndAnnounceNumberFlow',
    inputSchema: GenerateAndAnnounceNumberInputSchema,
    outputSchema: GenerateAndAnnounceNumberOutputSchema,
  },
  async input => {
    const number = await generateNumberTool(input);

    const announceText = (await announceNumberPrompt({number})).text;

    if (!announceText || announceText.trim() === '') {
      console.error('TTS text is empty!');
      throw new Error('Cannot generate audio from empty text.');
    }

    try {
      const {media} = await ai.generate({
        model: googleAI.model('gemini-2.5-flash-preview-tts'),
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Algenib' },
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

      return {number: number, audio: audio};
    } catch (err) {
      console.error("TTS generation failed:", err);
      // As a fallback, we can return the number with no audio.
      // The frontend can handle this by just displaying the number.
      return { number, audio: '' };
    }
  }
);
