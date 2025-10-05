
"use client";

import * as React from 'react';
import { generateAudio } from '@/ai/flows/generate-audio-direct';
import type { GenerateAudioInput } from '@/ai/schemas/generate-audio-schema';
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
const AUDIO_CACHE_PREFIX = 'tambola-audio-';

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
  
  // Audio Caching Functions
  const getCachedAudio = (number: number): string | null => {
    try {
      return localStorage.getItem(`${AUDIO_CACHE_PREFIX}${number}`);
    } catch (error) {
      console.error("Could not access localStorage for audio cache.", error);
      return null;
    }
  };

  const setCachedAudio = (number: number, audioData: string) => {
    try {
      localStorage.setItem(`${AUDIO_CACHE_PREFIX}${number}`, audioData);
    } catch (error)      {
      console.error("Could not write to localStorage for audio cache.", error);
    }
  };

  const playAudio = (audioData: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    audioRef.current = new Audio(audioData);
    const playPromise = audioRef.current.play();
    if (playPromise !== undefined) {
      playPromise.catch(error => {
        console.error("Audio playback failed:", error);
        setIsCalling(false);
      });
    }
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
      // Generate a new number using a temporary AI call that doesn't do TTS
      const availableNumbers = Array.from({ length: 90 }, (_, i) => i + 1)
        .filter(n => !gameState.calledNumbers.includes(n));
      
      if (availableNumbers.length === 0) {
          setIsCalling(false);
          return;
      }

      const newNumber = availableNumbers[Math.floor(Math.random() * availableNumbers.length)];

      await updateGame(newNumber);

      const cachedAudio = getCachedAudio(newNumber);

      if (cachedAudio) {
        playAudio(cachedAudio);
      } else {
        const result = await generateAudio({
          numberToAnnounce: newNumber,
        } satisfies GenerateAudioInput);

        if (result.audio) {
          setCachedAudio(newNumber, result.audio);
          playAudio(result.audio);
        } else {
          toast({
            variant: 'destructive',
            title: 'Audio Error',
            description: 'Could not generate audio, but the number is updated.',
          });
          setIsCalling(false);
        }
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
        if (currentAudio) {
            currentAudio.removeEventListener('ended', onEnded);
        }
      };
    }
  }, [isCalling]);


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
