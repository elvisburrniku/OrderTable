import React from "react";
import { TutorialProvider } from "./TutorialProvider";
import { TooltipProvider } from "@/components/ui/tooltip";

interface TutorialProviderWrapperProps {
  children: React.ReactNode;
}

export function TutorialProviderWrapper({ children }: TutorialProviderWrapperProps) {
  return (
    <TooltipProvider>
      <TutorialProvider>
        {children}
      </TutorialProvider>
    </TooltipProvider>
  );
}