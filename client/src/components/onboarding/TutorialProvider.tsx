import { createContext, useContext, useEffect, ReactNode } from 'react';
import { useLocation } from 'wouter';
import { useOnboardingTutorial } from '@/hooks/useOnboardingTutorial';
import { TutorialTooltip } from './TutorialTooltip';
import { TooltipProvider } from '@/components/ui/tooltip';

interface TutorialContextType {
  startTutorial: () => void;
  restartTutorial: () => void;
  skipTutorial: () => void;
  tutorialState: any;
}

const TutorialContext = createContext<TutorialContextType | null>(null);

export function useTutorial() {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error('useTutorial must be used within a TutorialProvider');
  }
  return context;
}

interface TutorialProviderProps {
  children: ReactNode;
  tenantId?: number;
  restaurantId?: number;
}

export function TutorialProvider({ children, tenantId, restaurantId }: TutorialProviderProps) {
  const [location] = useLocation();
  
  const {
    tutorialState,
    startTutorial,
    nextStep,
    previousStep,
    completeStep,
    skipStep,
    skipTutorial,
    restartTutorial,
    getCurrentStep
  } = useOnboardingTutorial(tenantId, restaurantId);

  const currentStep = getCurrentStep();
  const currentPage = location.split('/').pop() || 'dashboard';

  // Auto-advance tutorial when navigating to the correct page
  useEffect(() => {
    if (!currentStep || !tutorialState.isActive) return;

    const stepPage = currentStep.page;
    const isOnCorrectPage = stepPage === 'any' || stepPage === currentPage;

    if (isOnCorrectPage && currentStep.id && !tutorialState.completedSteps.includes(currentStep.id)) {
      // Small delay to ensure the page has rendered
      const timer = setTimeout(() => {
        completeStep(currentStep.id);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [currentPage, currentStep, tutorialState.isActive, tutorialState.completedSteps, completeStep]);

  const handleNext = () => {
    if (currentStep) {
      completeStep(currentStep.id);
    }
    nextStep();
  };

  const handleSkip = () => {
    if (currentStep) {
      skipStep(currentStep.id);
    }
    nextStep();
  };

  const handleComplete = () => {
    if (currentStep) {
      completeStep(currentStep.id);
    }
    skipTutorial();
  };

  const contextValue = {
    startTutorial,
    restartTutorial,
    skipTutorial,
    tutorialState
  };

  return (
    <TutorialContext.Provider value={contextValue}>
      <TooltipProvider>
        {children}
        
        {/* Tutorial Tooltip */}
        {currentStep && tutorialState.isActive && (
          <TutorialTooltip
            step={currentStep}
            isVisible={tutorialState.isActive}
            canGoNext={tutorialState.canGoNext}
            canGoPrevious={tutorialState.canGoPrevious}
            progress={tutorialState.progress}
            onNext={handleNext}
            onPrevious={previousStep}
            onSkip={handleSkip}
            onComplete={handleComplete}
            onClose={skipTutorial}
          />
        )}
      </TooltipProvider>
    </TutorialContext.Provider>
  );
}