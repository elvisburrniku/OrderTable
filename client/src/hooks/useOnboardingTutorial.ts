import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

export interface TutorialStep {
  id: string;
  category: string;
  title: string;
  description: string;
  targetSelector?: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  page: string;
  order: number;
  icon?: string;
  actionText?: string;
  nextButtonText?: string;
  skipButtonText?: string;
  showProgress?: boolean;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    category: 'basics',
    title: '🎉 Welcome to your Restaurant Dashboard!',
    description: 'Let\'s take a quick tour to help you get started with managing your restaurant bookings.',
    page: 'dashboard',
    order: 1,
    position: 'bottom',
    nextButtonText: 'Let\'s Go!',
    skipButtonText: 'Skip Tour',
    showProgress: true
  },
  {
    id: 'view-today-bookings',
    category: 'basics',
    title: '📅 Today\'s Bookings',
    description: 'Here you can see all your bookings for today. Click on any booking to view details or make changes.',
    targetSelector: '[data-tutorial="today-bookings"]',
    page: 'dashboard',
    order: 2,
    position: 'right',
    actionText: 'View booking details',
    showProgress: true
  },
  {
    id: 'quick-stats',
    category: 'basics',
    title: '📊 Quick Stats',
    description: 'Keep track of your key metrics like total bookings, revenue, and table utilization at a glance.',
    targetSelector: '[data-tutorial="quick-stats"]',
    page: 'dashboard',
    order: 3,
    position: 'bottom',
    showProgress: true
  },
  {
    id: 'navigation',
    category: 'basics',
    title: '🧭 Navigation Menu',
    description: 'Use this sidebar to navigate between different sections: Calendar, Bookings, Tables, and Settings.',
    targetSelector: '[data-tutorial="navigation"]',
    page: 'dashboard',
    order: 4,
    position: 'right',
    actionText: 'Try clicking Calendar',
    showProgress: true
  },
  {
    id: 'calendar-view',
    category: 'bookings',
    title: '📅 Calendar View',
    description: 'This is your main booking calendar. Switch between day, week, and month views to see bookings differently.',
    targetSelector: '[data-tutorial="calendar-view"]',
    page: 'calendar',
    order: 5,
    position: 'top',
    showProgress: true
  },
  {
    id: 'view-mode-selector',
    category: 'bookings',
    title: '👁️ View Modes',
    description: 'Switch between Day, Week, and Month views. Day view shows detailed time slots, while Week and Month give you the bigger picture.',
    targetSelector: '[data-tutorial="view-mode"]',
    page: 'calendar',
    order: 6,
    position: 'bottom',
    actionText: 'Try switching views',
    showProgress: true
  },
  {
    id: 'create-booking',
    category: 'bookings',
    title: '➕ Create New Booking',
    description: 'Click here to create a new booking. You can also click on any time slot in the calendar to quickly add a booking.',
    targetSelector: '[data-tutorial="create-booking"]',
    page: 'calendar',
    order: 7,
    position: 'bottom',
    actionText: 'Create your first booking',
    showProgress: true
  },
  {
    id: 'booking-filters',
    category: 'bookings',
    title: '🔍 Filter & Search',
    description: 'Use these filters to find specific bookings by status, guest count, or search by customer name.',
    targetSelector: '[data-tutorial="booking-filters"]',
    page: 'calendar',
    order: 8,
    position: 'left',
    showProgress: true
  },
  {
    id: 'drag-drop',
    category: 'bookings',
    title: '🖱️ Drag & Drop',
    description: 'You can drag bookings to different time slots or dates to reschedule them easily. Just grab any booking and move it!',
    targetSelector: '[data-tutorial="calendar-grid"]',
    page: 'calendar',
    order: 9,
    position: 'top',
    showProgress: true
  },
  {
    id: 'table-management',
    category: 'tables',
    title: '🪑 Table Management',
    description: 'Manage your restaurant tables here. Add new tables, set capacities, and organize them by rooms or sections.',
    targetSelector: '[data-tutorial="table-list"]',
    page: 'tables',
    order: 10,
    position: 'right',
    showProgress: true
  },
  {
    id: 'settings-overview',
    category: 'settings',
    title: '⚙️ Restaurant Settings',
    description: 'Configure your restaurant details, opening hours, and notification preferences to customize your experience.',
    targetSelector: '[data-tutorial="settings-nav"]',
    page: 'settings',
    order: 11,
    position: 'right',
    showProgress: true
  },
  {
    id: 'tutorial-complete',
    category: 'completion',
    title: '🎊 You\'re All Set!',
    description: 'Congratulations! You\'ve completed the tour. You can always restart this tutorial from the Settings page if you need a refresher.',
    page: 'any',
    order: 12,
    position: 'bottom',
    nextButtonText: 'Start Managing!',
    showProgress: false
  }
];

export interface OnboardingState {
  isActive: boolean;
  currentStepId: string | null;
  currentStepIndex: number;
  completedSteps: string[];
  skippedSteps: string[];
  canGoNext: boolean;
  canGoPrevious: boolean;
  totalSteps: number;
  progress: number;
}

export function useOnboardingTutorial(tenantId?: number, restaurantId?: number) {
  const queryClient = useQueryClient();
  const [tutorialState, setTutorialState] = useState<OnboardingState>({
    isActive: false,
    currentStepId: null,
    currentStepIndex: -1,
    completedSteps: [],
    skippedSteps: [],
    canGoNext: false,
    canGoPrevious: false,
    totalSteps: TUTORIAL_STEPS.length,
    progress: 0
  });

  // Fetch user's onboarding progress
  const { data: userProgress = [], isLoading } = useQuery({
    queryKey: [`/api/tenants/${tenantId}/onboarding-progress`],
    queryFn: async () => {
      if (!tenantId) return [];
      const response = await apiRequest(`/api/tenants/${tenantId}/onboarding-progress`, "GET");
      if (!response.ok) throw new Error('Failed to fetch onboarding progress');
      return response.json();
    },
    enabled: !!tenantId,
  });

  // Update step progress
  const updateProgressMutation = useMutation({
    mutationFn: async (data: { stepId: string; isCompleted: boolean; skipped?: boolean }) => {
      const response = await apiRequest(`/api/tenants/${tenantId}/onboarding-progress`, "POST", {
        stepId: data.stepId,
        stepCategory: TUTORIAL_STEPS.find(s => s.id === data.stepId)?.category || 'general',
        isCompleted: data.isCompleted,
        skipped: data.skipped || false,
        restaurantId
      });
      if (!response.ok) throw new Error('Failed to update progress');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tenants/${tenantId}/onboarding-progress`] });
    }
  });

  // Calculate tutorial state based on user progress
  useEffect(() => {
    if (isLoading || !userProgress) return;

    const completedSteps = userProgress
      .filter((p: any) => p.isCompleted)
      .map((p: any) => p.stepId);
    
    const skippedSteps = userProgress
      .filter((p: any) => p.skipped)
      .map((p: any) => p.stepId);

    const allCompletedOrSkipped = new Set([...completedSteps, ...skippedSteps]);
    const hasCompletedTutorial = TUTORIAL_STEPS.every(step => allCompletedOrSkipped.has(step.id));

    setTutorialState(prev => ({
      ...prev,
      completedSteps,
      skippedSteps,
      progress: (allCompletedOrSkipped.size / TUTORIAL_STEPS.length) * 100
    }));

  }, [userProgress, isLoading]);

  // Auto-start tutorial for new users in a separate effect
  useEffect(() => {
    if (!userProgress || !tenantId) return;
    

    
    // Check if user has completed the tutorial (all steps completed or skipped)
    const completedSteps = userProgress.filter((p: any) => p.isCompleted || p.skipped);
    const hasCompletedTutorial = completedSteps.length >= TUTORIAL_STEPS.length;
    
    // Only auto-start tutorial for completely new users (no progress at all)
    if (userProgress.length === 0 && !tutorialState.isActive && !hasCompletedTutorial) {
      const firstStep = TUTORIAL_STEPS[0];
      setTutorialState(prev => ({
        ...prev,
        isActive: true,
        currentStepId: firstStep.id,
        currentStepIndex: 0,
        canGoNext: true,
        canGoPrevious: false
      }));
    } else if (hasCompletedTutorial && tutorialState.isActive) {
      setTutorialState(prev => ({
        ...prev,
        isActive: false,
        currentStepId: null,
        currentStepIndex: -1
      }));
    }
  }, [userProgress, tutorialState.isActive, tenantId, restaurantId]);

  const startTutorial = useCallback(() => {
    const firstStep = TUTORIAL_STEPS[0];
    setTutorialState(prev => ({
      ...prev,
      isActive: true,
      currentStepId: firstStep.id,
      currentStepIndex: 0,
      canGoNext: true,
      canGoPrevious: false
    }));
  }, []);

  const nextStep = useCallback(() => {
    setTutorialState(prev => {
      const nextIndex = prev.currentStepIndex + 1;
      const nextStep = TUTORIAL_STEPS[nextIndex];
      
      if (!nextStep) {
        // Tutorial completed
        return {
          ...prev,
          isActive: false,
          currentStepId: null,
          currentStepIndex: -1
        };
      }

      return {
        ...prev,
        currentStepId: nextStep.id,
        currentStepIndex: nextIndex,
        canGoNext: nextIndex < TUTORIAL_STEPS.length - 1,
        canGoPrevious: nextIndex > 0
      };
    });
  }, []);

  const previousStep = useCallback(() => {
    setTutorialState(prev => {
      const prevIndex = prev.currentStepIndex - 1;
      const prevStep = TUTORIAL_STEPS[prevIndex];
      
      if (!prevStep || prevIndex < 0) return prev;

      return {
        ...prev,
        currentStepId: prevStep.id,
        currentStepIndex: prevIndex,
        canGoNext: prevIndex < TUTORIAL_STEPS.length - 1,
        canGoPrevious: prevIndex > 0
      };
    });
  }, []);

  const completeStep = useCallback((stepId: string) => {
    updateProgressMutation.mutate({ stepId, isCompleted: true });
    setTutorialState(prev => ({
      ...prev,
      completedSteps: [...prev.completedSteps.filter(id => id !== stepId), stepId]
    }));
  }, [updateProgressMutation]);

  const skipStep = useCallback((stepId: string) => {
    updateProgressMutation.mutate({ stepId, isCompleted: false, skipped: true });
    setTutorialState(prev => ({
      ...prev,
      skippedSteps: [...prev.skippedSteps.filter(id => id !== stepId), stepId]
    }));
  }, [updateProgressMutation]);

  const skipTutorial = useCallback(() => {
    // Mark all remaining steps as skipped
    const remainingSteps = TUTORIAL_STEPS.filter(step => 
      !tutorialState.completedSteps.includes(step.id) && 
      !tutorialState.skippedSteps.includes(step.id)
    );

    remainingSteps.forEach(step => {
      updateProgressMutation.mutate({ stepId: step.id, isCompleted: false, skipped: true });
    });

    setTutorialState(prev => ({
      ...prev,
      isActive: false,
      currentStepId: null,
      currentStepIndex: -1
    }));
  }, [tutorialState.completedSteps, tutorialState.skippedSteps, updateProgressMutation]);

  const restartTutorial = useCallback(() => {
    setTutorialState(prev => ({
      ...prev,
      isActive: true,
      currentStepId: TUTORIAL_STEPS[0].id,
      currentStepIndex: 0,
      canGoNext: true,
      canGoPrevious: false
    }));
  }, []);

  const getCurrentStep = useCallback(() => {
    if (!tutorialState.currentStepId) return null;
    return TUTORIAL_STEPS.find(step => step.id === tutorialState.currentStepId) || null;
  }, [tutorialState.currentStepId]);

  const getStepsForPage = useCallback((page: string) => {
    return TUTORIAL_STEPS.filter(step => step.page === page || step.page === 'any');
  }, []);

  return {
    tutorialState,
    startTutorial,
    nextStep,
    previousStep,
    completeStep,
    skipStep,
    skipTutorial,
    restartTutorial,
    getCurrentStep,
    getStepsForPage,
    isLoading,
    TUTORIAL_STEPS
  };
}