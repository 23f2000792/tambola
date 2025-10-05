
"use client";

import { useState, useEffect, useCallback } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { useToast } from './use-toast';
import { useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';

interface GameState {
  calledNumbers: number[];
  currentNumber: number | null;
}

const initialState: GameState = {
  calledNumbers: [],
  currentNumber: null,
};

export function useTambolaGame(gameId: string, enabled: boolean = true) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const firestore = useFirestore();

  useEffect(() => {
    if (!gameId || !firestore || !enabled) {
      if (enabled && !firestore) {
        toast({
            variant: "destructive",
            title: "Firebase Error",
            description: "Firestore is not available. Game state cannot be synced.",
        });
      }
      setIsLoading(!enabled);
      return;
    }

    setIsLoading(true);
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
              const permissionError = new FirestorePermissionError({
                path: gameDocRef.path,
                operation: 'create',
                requestResourceData: initialState,
              });
              errorEmitter.emit('permission-error', permissionError);
          });
          setGameState(initialState);
        }
        setIsLoading(false);
      },
      (error) => {
        const permissionError = new FirestorePermissionError({
            path: gameDocRef.path,
            operation: 'get',
        });
        errorEmitter.emit('permission-error', permissionError);
        setIsLoading(false);
      }
    );

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [gameId, toast, firestore, enabled]);

  const updateGame = useCallback(async (newNumber: number) => {
    if (!gameId || !firestore || !gameState) return;

    const gameDocRef = doc(firestore, 'tambolaGames', gameId);
    const newCalledNumbers = [...gameState.calledNumbers, newNumber];
    const newState = {
        calledNumbers: newCalledNumbers,
        currentNumber: newNumber,
    };
    
    setDoc(gameDocRef, newState, { merge: true }).catch(error => {
        const permissionError = new FirestorePermissionError({
            path: gameDocRef.path,
            operation: 'update',
            requestResourceData: newState,
        });
        errorEmitter.emit('permission-error', permissionError);
    });
  }, [gameId, gameState, firestore]);

  const resetGame = useCallback(async () => {
    if (!gameId || !firestore) return;

    const gameDocRef = doc(firestore, 'tambolaGames', gameId);
    setDoc(gameDocRef, initialState).catch(error => {
        const permissionError = new FirestorePermissionError({
            path: gameDocRef.path,
            operation: 'write',
            requestResourceData: initialState,
        });
        errorEmitter.emit('permission-error', permissionError);
    });
  }, [gameId, firestore]);

  return { gameState, updateGame, resetGame, isLoading };
}
