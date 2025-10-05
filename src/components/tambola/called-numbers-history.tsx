"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

type CalledNumbersHistoryProps = {
  calledNumbers: number[];
};

export default function CalledNumbersHistory({ calledNumbers }: CalledNumbersHistoryProps) {
  const reversedNumbers = [...calledNumbers].reverse();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline text-xl text-center">Called Numbers</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-24 w-full">
          {reversedNumbers.length > 0 ? (
            <div className="flex flex-wrap gap-2 justify-center">
              {reversedNumbers.map((num, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="text-md font-bold"
                >
                  {num}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground">No numbers called yet.</p>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
