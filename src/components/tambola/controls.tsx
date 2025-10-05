
"use client";

import { RefreshCw, ChevronRight, Loader2, Pause } from "lucide-react";
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
  onNewGame: () => void;
  onNextNumber: () => void;
  onPause: () => void;
};

export default function GameControls({
  isGameRunning,
  isGameOver,
  onNewGame,
  onNextNumber,
  onPause,
}: GameControlsProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {isGameRunning ? (
        <Button
          variant="outline"
          size="lg"
          onClick={onPause}
          className="text-lg h-14 col-span-2"
        >
          <Pause className="mr-2 h-6 w-6" /> Pause
        </Button>
      ) : (
        <Button
          variant="default"
          size="lg"
          onClick={onNextNumber}
          disabled={isGameOver}
          className="text-lg h-14 col-span-2"
        >
            <>
              <ChevronRight className="mr-2 h-6 w-6" /> {isGameOver ? "Game Over" : "Next Number"}
            </>
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
              This will start a new game and reset the board for everyone. This
              action cannot be undone.
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
