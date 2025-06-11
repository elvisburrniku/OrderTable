import React from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface TutorialTooltipProps {
  title: string;
  content: string;
  position?: "top" | "bottom" | "left" | "right";
  onNext?: () => void;
  onPrevious?: () => void;
  onSkip?: () => void;
  isVisible?: boolean;
}

export function TutorialTooltip({
  title,
  content,
  position = "bottom",
  onNext,
  onPrevious,
  onSkip,
  isVisible = true
}: TutorialTooltipProps) {
  if (!isVisible) return null;

  return (
    <Card className="absolute z-50 w-80 shadow-lg">
      <CardHeader className="pb-2">
        <h3 className="font-semibold text-sm">{title}</h3>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-gray-600">{content}</p>
        <div className="flex justify-between items-center">
          <Button variant="ghost" size="sm" onClick={onSkip}>
            Skip Tutorial
          </Button>
          <div className="flex gap-2">
            {onPrevious && (
              <Button variant="outline" size="sm" onClick={onPrevious}>
                Previous
              </Button>
            )}
            {onNext && (
              <Button size="sm" onClick={onNext}>
                Next
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}