"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type TambolaBoardProps = {
  calledNumbers: number[];
  currentNumber: number | null;
};

export default function TambolaBoard({ calledNumbers, currentNumber }: TambolaBoardProps) {
  const numbers = Array.from({ length: 90 }, (_, i) => i + 1);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-center font-headline text-2xl">Tambola Board</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-10 gap-1.5 sm:gap-2">
          {numbers.map((number) => {
            const isCalled = calledNumbers.includes(number);
            const isCurrent = number === currentNumber;
            return (
              <div
                key={number}
                className={cn(
                  "flex aspect-square items-center justify-center rounded-md border text-sm sm:text-base md:text-lg font-bold transition-all duration-300",
                  "bg-muted/50 text-muted-foreground",
                  isCalled && "bg-accent text-accent-foreground",
                  isCurrent && "bg-primary text-primary-foreground animate-glow ring-2 ring-primary"
                )}
                aria-label={`Number ${number}${isCalled ? ', called' : ''}`}
              >
                {number}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
