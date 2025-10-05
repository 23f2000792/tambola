"use client";

import { Play, Pause, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type GameControlsProps = {
  isGameRunning: boolean;
  isGameOver: boolean;
  onStart: () => void;
  onPause: () => void;
  onNewGame: () => void;
};

export default function GameControls({
  isGameRunning,
  isGameOver,
  onStart,
  onPause,
  onNewGame,
}: GameControlsProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {isGameRunning ? (
        <Button size="lg" onClick={onPause} className="col-span-2 text-lg h-14">
          <Pause className="mr-2 h-6 w-6" /> Pause
        </Button>
      ) : (
        <Button
          size="lg"
          onClick={onStart}
          disabled={isGameOver}
          className="col-span-2 text-lg h-14"
        >
          <Play className="mr-2 h-6 w-6" /> {isGameOver ? "Game Over" : "Start"}
        </Button>
      )}

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" className="col-span-2 h-12">
            <RefreshCw className="mr-2 h-4 w-4" /> New Game
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will start a new game and reset the board for everyone. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onNewGame}>
              Start New Game
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
