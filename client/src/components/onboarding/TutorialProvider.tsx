import React, { createContext, useContext, useState, ReactNode } from "react";

interface TutorialContextType {
  isActive: boolean;
  currentStep: string | null;
  startTutorial: (step: string) => void;
  endTutorial: () => void;
  nextStep: () => void;
  previousStep: () => void;
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

export function TutorialProvider({ children }: { children: ReactNode }) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState<string | null>(null);

  const startTutorial = (step: string) => {
    setIsActive(true);
    setCurrentStep(step);
  };

  const endTutorial = () => {
    setIsActive(false);
    setCurrentStep(null);
  };

  const nextStep = () => {
    // Implementation for next step logic
  };

  const previousStep = () => {
    // Implementation for previous step logic
  };

  return (
    <TutorialContext.Provider
      value={{
        isActive,
        currentStep,
        startTutorial,
        endTutorial,
        nextStep,
        previousStep,
      }}
    >
      {children}
    </TutorialContext.Provider>
  );
}

export function useTutorial() {
  const context = useContext(TutorialContext);
  if (context === undefined) {
    throw new Error("useTutorial must be used within a TutorialProvider");
  }
  return context;
}