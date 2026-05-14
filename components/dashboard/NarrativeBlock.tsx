"use client";

import { Card, CardContent } from "@/components/ui/card";

interface Props {
  text: string;
  className?: string;
}

export function NarrativeBlock({ text, className }: Props) {
  return (
    <Card className={className}>
      <CardContent className="pt-5">
        <p className="text-sm leading-relaxed text-foreground">{text}</p>
      </CardContent>
    </Card>
  );
}
