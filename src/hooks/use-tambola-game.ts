"use client";

import { useState, useEffect, useCallback } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { useToast } from './use-toast';
import { useFirestore } from '@/firebase';

interface GameState {
  calledNumbers: number[];
  currentNumber: number | null;
}

const initialState: GameState = {
  calledNumbers: [],
  currentNumber: null,
};

export function useTambolaGame(gameId: string) {
  const [gameState, setGameState] = useState<GameState>(initialState);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const firestore = useFirestore();

  useEffect(() => {
    if (!gameId || !firestore) {
      if (!firestore) {
        toast({
            variant: "destructive",
            title: "Firebase Error",
            description: "Firestore is not available. Game state cannot be synced.",
        });
      }
      setIsLoading(false);
      return;
    }

    const gameDocRef = doc(firestore, 'tambolaGames', gameId);

    const unsubscribe = onSnapshot(
      gameDocRef,
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const data = docSnapshot.data() as GameState;
          setGameState(data);
        } else {
          // Document doesn't exist, create it with initial state
          setDoc(gameDocRef, initialState).catch(err => {
            console.error("Failed to create initial game document:", err);
            toast({
              variant: "destructive",
              title: "Firestore Error",
              description: "Could not create a new game session.",
            });
          });
          setGameState(initialState);
        }
        setIsLoading(false);
      },
      (error) => {
        console.error("Firestore snapshot error:", error);
        toast({
          variant: "destructive",
          title: "Connection Error",
          description: "Could not connect to the game session. Please check your internet connection.",
        });
        setIsLoading(false);
      }
    );

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [gameId, toast, firestore]);

  const updateGame = useCallback(async (newNumber: number) => {
    if (!gameId || !firestore) return;

    const gameDocRef = doc(firestore, 'tambolaGames', gameId);
    const newCalledNumbers = [...gameState.calledNumbers, newNumber];
    
    try {
        await setDoc(gameDocRef, {
            calledNumbers: newCalledNumbers,
            currentNumber: newNumber,
        }, { merge: true });
    } catch(error) {
        console.error("Failed to update game state:", error);
        toast({
            variant: "destructive",
            title: "Sync Error",
            description: "Failed to save the last number. The game might be out of sync.",
        });
    }
  }, [gameId, gameState.calledNumbers, toast, firestore]);

  const resetGame = useCallback(async () => {
    if (!gameId || !firestore) return;

    const gameDocRef = doc(firestore, 'tambolaGames', gameId);
    try {
        await setDoc(gameDocRef, initialState);
    } catch (error) {
        console.error("Failed to reset game state:", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not start a new game. Please try again.",
        });
    }
  }, [gameId, toast, firestore]);

  return { gameState, updateGame, resetGame, isLoading };
}
