"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type CurrentDisplayProps = {
  currentNumber: number | null;
  calledNumbers: number[];
  isCalling: boolean;
};

export default function CurrentDisplay({ currentNumber, calledNumbers, isCalling }: CurrentDisplayProps) {
  const previousNumbers = [...calledNumbers].reverse().slice(1, 6);

  return (
    <Card className="text-center">
      <CardHeader>
        <CardTitle className="font-headline text-xl">Current Number</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center gap-4">
        <div className="flex h-28 w-28 sm:h-36 sm:w-36 items-center justify-center rounded-full bg-primary/20 p-2">
          <div className="flex h-full w-full items-center justify-center rounded-full bg-primary text-primary-foreground">
            <span className="text-6xl sm:text-7xl font-bold">
              {currentNumber ?? "-"}
            </span>
          </div>
        </div>
        <div className="h-10">
            {isCalling ? (
                <p className="text-sm text-primary animate-pulse">Calling number...</p>
            ) : (
                <>
                <p className="text-sm text-muted-foreground mb-2">Last 5 numbers:</p>
                <div className="flex justify-center gap-2">
                    {previousNumbers.length > 0 ? (
                    previousNumbers.map((num, index) => (
                        <Badge
                        key={index}
                        variant="secondary"
                        className="text-base sm:text-lg"
                        >
                        {num}
                        </Badge>
                    ))
                    ) : (
                    <span className="text-sm text-muted-foreground">-</span>
                    )}
                </div>
                </>
            )}
        </div>
      </CardContent>
    </Card>
  );
}
