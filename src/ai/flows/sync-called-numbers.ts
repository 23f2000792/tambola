'use server';

/**
 * @fileOverview Syncs called numbers using Firebase Firestore to maintain game state across devices.
 *
 * - syncCalledNumbers - A function that updates the called numbers in Firestore.
 * - SyncCalledNumbersInput - The input type for the syncCalledNumbers function.
 * - SyncCalledNumbersOutput - The return type for the syncCalledNumbers function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import {firestore} from 'firebase-admin';

const SyncCalledNumbersInputSchema = z.object({
  gameId: z.string().describe('The unique identifier for the Tambola game.'),
  calledNumbers: z.array(z.number()).describe('The list of numbers that have been called in the game.'),
});
export type SyncCalledNumbersInput = z.infer<typeof SyncCalledNumbersInputSchema>;

const SyncCalledNumbersOutputSchema = z.object({
  success: z.boolean().describe('Indicates whether the synchronization was successful.'),
});
export type SyncCalledNumbersOutput = z.infer<typeof SyncCalledNumbersOutputSchema>;

export async function syncCalledNumbers(input: SyncCalledNumbersInput): Promise<SyncCalledNumbersOutput> {
  return syncCalledNumbersFlow(input);
}

const syncCalledNumbersFlow = ai.defineFlow(
  {
    name: 'syncCalledNumbersFlow',
    inputSchema: SyncCalledNumbersInputSchema,
    outputSchema: SyncCalledNumbersOutputSchema,
  },
  async input => {
    try {
      const db = firestore();
      const gameRef = db.collection('tambolaGames').doc(input.gameId);

      await gameRef.update({calledNumbers: input.calledNumbers});

      return {success: true};
    } catch (error) {
      console.error('Error syncing called numbers:', error);
      return {success: false};
    }
  }
);
