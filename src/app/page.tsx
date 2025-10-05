"use client";

import * as React from 'react';
import { generateAndAnnounceNumber } from '@/ai/flows/generate-and-announce-number';
import { useToast } from '@/hooks/use-toast';
import { useTambolaGame } from '@/hooks/use-tambola-game';

import GameHeader from '@/components/tambola/header';
import TambolaBoard from '@/components/tambola/board';
import GameControls from '@/components/tambola/controls';
import CurrentDisplay from '@/components/tambola/current-display';
import { Skeleton } from '@/components/ui/skeleton';

const GAME_ID = 'main-game';
const CALL_INTERVAL_MS = 5000; // 5 seconds between numbers

export default function Home() {
  const { toast } = useToast();
  const { gameState, updateGame, resetGame, isLoading } = useTambolaGame(GAME_ID);
  const [isGameRunning, setIsGameRunning] = React.useState(false);
  const intervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const isCallingNumberRef = React.useRef(false);

  const callNextNumber = React.useCallback(async () => {
    if (isCallingNumberRef.current) return;
    if (gameState.calledNumbers.length >= 90) {
      setIsGameRunning(false);
      toast({
        title: 'Game Over!',
        description: 'All numbers have been called.',
      });
      return;
    }
    
    isCallingNumberRef.current = true;

    try {
      const result = await generateAndAnnounceNumber({
        previousNumbers: gameState.calledNumbers,
      });

      if (result.number && result.audio) {
        await updateGame(result.number);

        if (audioRef.current) {
          audioRef.current.pause();
        }
        audioRef.current = new Audio(result.audio);
        await audioRef.current.play();
      } else {
        throw new Error('AI did not return a valid number or audio.');
      }
    } catch (error) {
      console.error('Failed to call next number:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not generate the next number. Pausing game.',
      });
      setIsGameRunning(false);
    } finally {
        isCallingNumberRef.current = false;
    }
  }, [gameState.calledNumbers, toast, updateGame]);

  React.useEffect(() => {
    if (isGameRunning) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(callNextNumber, CALL_INTERVAL_MS);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isGameRunning, callNextNumber]);
  
  const handleStart = () => {
    setIsGameRunning(true);
    callNextNumber();
  };
  
  const handleNextNumber = () => {
    if (!isGameRunning) {
      callNextNumber();
    }
  }

  const handlePause = () => {
    setIsGameRunning(false);
  };
  
  const handleNewGame = async () => {
    setIsGameRunning(false);
    await resetGame();
    toast({
      title: 'New Game Started',
      description: 'The board has been cleared.',
    });
    // Call the first number
    callNextNumber();
  };

  const isGameOver = gameState.calledNumbers.length >= 90;

  return (
    <div className="flex flex-col items-center min-h-screen bg-background text-foreground p-2 sm:p-4 font-body">
      <GameHeader />
      {isLoading ? (
        <div className="flex flex-col lg:flex-row gap-8 w-full max-w-7xl mx-auto items-start justify-center mt-8">
            <div className="flex flex-col gap-4 w-full lg:w-96 lg:shrink-0">
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-12 w-full" />
            </div>
            <Skeleton className="h-[30rem] w-full" />
        </div>
      ) : (
        <main className="flex flex-col lg:flex-row gap-4 md:gap-8 w-full max-w-7xl mx-auto items-start justify-center mt-4 sm:mt-8">
          <div className="flex flex-col gap-4 w-full lg:w-80 xl:w-96 lg:shrink-0">
            <CurrentDisplay
              currentNumber={gameState.currentNumber}
              calledNumbers={gameState.calledNumbers}
            />
            <GameControls
              isGameRunning={isGameRunning}
              isGameOver={isGameOver}
              onStart={handleStart}
              onPause={handlePause}
              onNewGame={handleNewGame}
              onNextNumber={handleNextNumber}
            />
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
