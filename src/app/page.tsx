
"use client";

import * as React from 'react';
import { useToast } from '@/hooks/use-toast';
import { useTambolaGame } from '@/hooks/use-tambola-game';

import GameHeader from '@/components/tambola/header';
import TambolaBoard from '@/components/tambola/board';
import GameControls from '@/components/tambola/controls';
import CurrentDisplay from '@/components/tambola/current-display';
import { Skeleton } from '@/components/ui/skeleton';
import CalledNumbersHistory from '@/components/tambola/called-numbers-history';
import { useAuth, useUser } from '@/firebase';
import { initiateAnonymousSignIn } from '@/firebase/non-blocking-login';
import { generateAnnouncementAudio } from '@/ai/flows/generate-announcement-audio';

const GAME_ID = 'main-game';

// Simple in-memory cache for audio
const audioCache = new Map<number, string>();

export default function Home() {
  const { toast } = useToast();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  React.useEffect(() => {
    if (auth && !user && !isUserLoading) {
      initiateAnonymousSignIn(auth);
    }
  }, [user, isUserLoading, auth]);

  const { gameState, updateGame, resetGame, isLoading: isGameLoading } = useTambolaGame(GAME_ID, !!user);
  const [isCalling, setIsCalling] = React.useState(false);
  
  const playAudio = (audioDataUri: string) => {
    if (audioRef.current) {
        audioRef.current.pause();
    }
    const audio = new Audio(audioDataUri);
    audioRef.current = audio;
    audio.play();

    return new Promise((resolve) => {
      audio.onended = () => {
        audioRef.current = null;
        resolve(null);
      };
    });
  };
  
  const callNextNumber = React.useCallback(async () => {
    if (isCalling || !gameState) return;
    if (gameState.calledNumbers.length >= 90) {
      toast({
        title: 'Game Over!',
        description: 'All numbers have been called.',
      });
      return;
    }

    setIsCalling(true);

    try {
      const availableNumbers = Array.from({ length: 90 }, (_, i) => i + 1)
        .filter(n => !gameState.calledNumbers.includes(n));
      
      if (availableNumbers.length === 0) {
          setIsCalling(false);
          return;
      }

      const newNumber = availableNumbers[Math.floor(Math.random() * availableNumbers.length)];
      
      await updateGame(newNumber);
      
      let audioDataUri = audioCache.get(newNumber);

      if (!audioDataUri) {
        const generatedAudio = await generateAnnouncementAudio(newNumber);
        if (generatedAudio) {
            audioDataUri = generatedAudio;
            audioCache.set(newNumber, audioDataUri);
        }
      }
      
      if (audioDataUri) {
        await playAudio(audioDataUri);
      }

    } catch (error) {
      console.error('Failed to call next number:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not generate the next number.',
      });
    } finally {
      setIsCalling(false);
    }
  }, [isCalling, gameState, toast, updateGame]);

  const handleNextNumber = () => {
    callNextNumber();
  };
  
  const handlePause = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsCalling(false);
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
              isCalling={isCalling}
            />
            <GameControls
              isGameRunning={isCalling}
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
