import { z } from 'zod';

export const GenerateAudioInputSchema = z.object({
  numberToAnnounce: z.number().min(1).max(90),
});
export type GenerateAudioInput = z.infer<typeof GenerateAudioInputSchema>;

export const GenerateAudioOutputSchema = z.object({
  number: z.number(),
  audio: z.string().describe('The base64 encoded audio data as a data URI.'),
});
export type GenerateAudioOutput = z.infer<typeof GenerateAudioOutputSchema>;
