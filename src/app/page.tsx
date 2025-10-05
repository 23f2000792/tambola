
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
import CalledNumbersHistory from '@/components/tambola/called-numbers-history';
import { useAuth, useUser } from '@/firebase';
import { initiateAnonymousSignIn } from '@/firebase/non-blocking-login';

const GAME_ID = 'main-game';

export default function Home() {
  const { toast } = useToast();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();

  React.useEffect(() => {
    if (auth && !user && !isUserLoading) {
      initiateAnonymousSignIn(auth);
    }
  }, [user, isUserLoading, auth]);

  const { gameState, updateGame, resetGame, isLoading: isGameLoading } = useTambolaGame(GAME_ID, !!user);
  const [isCalling, setIsCalling] = React.useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

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
      const result = await generateAndAnnounceNumber({
        previousNumbers: gameState.calledNumbers,
      });

      if (result.number) {
        await updateGame(result.number);

        if (result.audio) {
          if (audioRef.current) {
            audioRef.current.pause();
          }
          audioRef.current = new Audio(result.audio);

          const playPromise = audioRef.current.play();
          if (playPromise !== undefined) {
            playPromise.then(_ => {
              // Audio started playing
            }).catch(error => {
              console.error("Audio playback failed:", error);
              setIsCalling(false);
            });
          }
        } else {
          // No audio returned, likely a TTS failure, so just end the "calling" state.
           toast({
            variant: 'destructive',
            title: 'Audio Error',
            description: 'Could not generate audio, but the number is updated.',
          });
          setIsCalling(false);
        }
      } else {
        throw new Error('AI did not return a valid number.');
      }
    } catch (error) {
      console.error('Failed to call next number:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not generate the next number.',
      });
      setIsCalling(false);
    }
  }, [isCalling, gameState, toast, updateGame]);

  const handleNextNumber = () => {
    callNextNumber();
  };
  
  const handlePause = () => {
    setIsCalling(false);
    if (audioRef.current) {
      audioRef.current.pause();
    }
  };

  const handleNewGame = async () => {
    setIsCalling(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    await resetGame();
    toast({
      title: 'New Game Started',
      description: 'The board has been cleared. Ready to start!',
    });
  };
  
  React.useEffect(() => {
    const currentAudio = audioRef.current;
    if (currentAudio) {
      const onEnded = () => setIsCalling(false);
      currentAudio.addEventListener('ended', onEnded);
      return () => {
        currentAudio.removeEventListener('ended', onEnded);
      };
    }
  }, [audioRef.current, isCalling]);


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
