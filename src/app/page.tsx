
"use client";

import * as React from 'react';
import { useToast } from '@/hooks/use-toast';
import { useTambolaGame } from '@/hooks/use-tambola-game';
import { useSpeechSynthesis } from '@/hooks/use-speech-synthesis';

import GameHeader from '@/components/tambola/header';
import TambolaBoard from '@/components/tambola/board';
import GameControls from '@/components/tambola/controls';
import CurrentDisplay from '@/components/tambola/current-display';
import { Skeleton } from '@/components/ui/skeleton';
import CalledNumbersHistory from '@/components/tambola/called-numbers-history';
import { useAuth, useUser } from '@/firebase';
import { initiateAnonymousSignIn } from '@/firebase/non-blocking-login';

const GAME_ID = 'main-game';

/**
 * Convert a number to its word representation.
 */
function numberToWords(num: number): string {
  const a = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
  const b = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

  if (num < 20) return a[num];
  const tens = Math.floor(num / 10);
  const ones = num % 10;
  return b[tens] + (ones > 0 ? " " + a[ones] : "");
}

/**
 * Generate a spoken announcement string for the number in an Indian style.
 */
function generateAnnouncement(num: number): string {
    const words = numberToWords(num);

    if (num < 10) {
        return `The number is, only number ${words}. I repeat, only number ${words}.`;
    } else {
        const digits = num.toString().split("").join(" ");
        return `The number is, ${digits}, ${words}. I repeat, ${digits}, ${words}.`;
    }
}


export default function Home() {
  const { toast } = useToast();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const { speak, cancel, isSpeaking } = useSpeechSynthesis();
  
  React.useEffect(() => {
    if (auth && !user && !isUserLoading) {
      initiateAnonymousSignIn(auth);
    }
  }, [user, isUserLoading, auth]);

  const { gameState, updateGame, resetGame, isLoading: isGameLoading } = useTambolaGame(GAME_ID, !!user);
  
  const callNextNumber = React.useCallback(async () => {
    if (isSpeaking || !gameState) return;

    if (gameState.calledNumbers.length >= 90) {
      toast({
        title: 'Game Over!',
        description: 'All numbers have been called.',
      });
      return;
    }

    try {
      const availableNumbers = Array.from({ length: 90 }, (_, i) => i + 1)
        .filter(n => !gameState.calledNumbers.includes(n));
      
      if (availableNumbers.length === 0) {
          return;
      }

      const newNumber = availableNumbers[Math.floor(Math.random() * availableNumbers.length)];
      
      await updateGame(newNumber);
      
      const announcement = generateAnnouncement(newNumber);
      speak(announcement);

    } catch (error) {
      console.error('Failed to call next number:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not call the next number.',
      });
    }
  }, [isSpeaking, gameState, toast, updateGame, speak]);

  const handleNextNumber = () => {
    callNextNumber();
  };
  
  const handlePause = () => {
    cancel();
  };

  const handleNewGame = async () => {
    handlePause();
    await resetGame();
    toast({
      title: 'New Game Started',
      description: 'The board has been cleared. Ready to start!',
    });
  };

  const isLoading = isUserLoading || isGameLoading;
  const isGameOver = !isLoading && gameState && gameState.calledNumbers.length >= 90;

  return (
    <div className="flex flex-col items-center min-h-screen bg-background text-foreground p-2 sm:p-4 font-body">
      <GameHeader />
      {isLoading || !gameState ? (
        <div className="flex flex-col lg:flex-row gap-8 w-full max-w-7xl mx-auto items-start justify-center mt-8">
          <div className="flex flex-col gap-4 w-full lg:w-96 lg:shrink-0">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
          <Skeleton className="h-[30rem] w-full" />
        </div>
      ) : (
        <main className="flex flex-col lg:flex-row gap-4 md:gap-8 w-full max-w-7xl mx-auto items-start justify-center mt-4 sm:mt-8">
          <div className="flex flex-col gap-4 w-full lg:w-80 xl:w-96 lg:shrink-0">
            <CurrentDisplay
              currentNumber={gameState.currentNumber}
              calledNumbers={gameState.calledNumbers}
              isCalling={isSpeaking}
            />
            <GameControls
              isGameRunning={isSpeaking}
              isGameOver={isGameOver}
              onNewGame={handleNewGame}
              onNextNumber={handleNextNumber}
              onPause={handlePause}
            />
             <CalledNumbersHistory calledNumbers={gameState.calledNumbers} />
          </div>
          <TambolaBoard
            calledNumbers={gameState.calledNumbers}
            currentNumber={gameState.currentNumber}
          />
        </main>
      )}
    </div>
  );
}
