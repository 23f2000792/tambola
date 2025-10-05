
'use server';

/**
 * @fileOverview Generates and announces a Tambola number using AI.
 * 
 * - generateAndAnnounceNumber - A function that handles the number announcement process.
 */

import { ai } from '@/ai/genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { GenerateAudioInputSchema, GenerateAudioOutputSchema, type GenerateAudioInput, type GenerateAudioOutput } from '@/ai/schemas/generate-audio-schema';
import * as z from 'zod';
import wav from 'wav';

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

    let bufs: any[] = [];
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

// Main exported function that calls the Genkit flow
export async function generateAndAnnounceNumber(input: GenerateAudioInput): Promise<GenerateAudioOutput> {
  return announceFlow(input);
}


const announceFlow = ai.defineFlow(
  {
    name: 'generateAndAnnounceNumberFlow',
    inputSchema: GenerateAudioInputSchema,
    outputSchema: GenerateAudioOutputSchema,
  },
  async (input) => {
    const { numberToAnnounce } = input;
    const announceText = getAnnouncementText(numberToAnnounce);

    if (!announceText) {
      console.error(`Could not generate announcement text for number: ${numberToAnnounce}`);
      return { number: numberToAnnounce, audio: '' };
    }

    try {
      const { media } = await ai.generate({
          model: googleAI.model('gemini-2.5-flash-preview-tts'),
          config: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                  voiceConfig: {
                      prebuiltVoiceConfig: { voiceName: 'en-IN-Wavenet-C' },
                  },
              },
          },
          prompt: announceText,
      });

      if (!media || !media.url) {
        console.error('TTS API call returned no audio content.');
        return { number: numberToAnnounce, audio: '' };
      }
      
      const pcmData = Buffer.from(media.url.substring(media.url.indexOf(',') + 1), 'base64');
      const wavData = await toWav(pcmData);
      const audioUri = `data:audio/wav;base64,${wavData}`;
      
      return { number: numberToAnnounce, audio: audioUri };

    } catch (err) {
      console.error("Error calling TTS API through Genkit:", err);
      return { number: numberToAnnounce, audio: '' };
    }
  }
);
