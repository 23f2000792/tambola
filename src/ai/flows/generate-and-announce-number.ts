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
  prompt: `You are a Tambola (Bingo) caller. Announce the number exactly as instructed. Do not add any extra words or pleasantries.
- For single-digit numbers, say "Only number X".
- For two-digit numbers, say the digits individually and then the full number. For example, for 21, say "Two One, Twenty-One".
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

    const {media} = await ai.generate({
      model: googleAI.model('gemini-2.5-flash-preview-tts'),
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {voiceName: 'Algenib'},
          },
        },
      },
      prompt: announceText,
    });

    if (!media) {
      throw new Error('no media returned');
    }

    const audioBuffer = Buffer.from(
      media.url.substring(media.url.indexOf(',') + 1),
      'base64'
    );

    const audio = 'data:audio/wav;base64,' + (await toWav(audioBuffer));

    return {number: number, audio: audio};
  }
);
