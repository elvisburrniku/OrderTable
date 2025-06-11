import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { X, ArrowLeft, ArrowRight, SkipForward } from 'lucide-react';
import { TutorialStep } from '@/hooks/useOnboardingTutorial';

interface TutorialTooltipProps {
  step: TutorialStep;
  isVisible: boolean;
  canGoNext: boolean;
  canGoPrevious: boolean;
  progress: number;
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
  onComplete: () => void;
  onClose: () => void;
}

export function TutorialTooltip({
  step,
  isVisible,
  canGoNext,
  canGoPrevious,
  progress,
  onNext,
  onPrevious,
  onSkip,
  onComplete,
  onClose
}: TutorialTooltipProps) {
  const [position, setPosition] = useState<{ top: number; left: number; arrow: string }>({
    top: 0,
    left: 0,
    arrow: 'bottom'
  });
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!isVisible || !step.targetSelector) return;

    const updatePosition = () => {
      const target = document.querySelector(step.targetSelector!) as HTMLElement;
      if (!target || !tooltipRef.current) return;

      setTargetElement(target);
      const targetRect = target.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let top = 0;
      let left = 0;
      let arrow = step.position;

      // Calculate position based on step.position
      switch (step.position) {
        case 'top':
          top = targetRect.top - tooltipRect.height - 16;
          left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
          arrow = 'bottom';
          break;
        case 'bottom':
          top = targetRect.bottom + 16;
          left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
          arrow = 'top';
          break;
        case 'left':
          top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
          left = targetRect.left - tooltipRect.width - 16;
          arrow = 'right';
          break;
        case 'right':
          top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
          left = targetRect.right + 16;
          arrow = 'left';
          break;
      }

      // Adjust for viewport boundaries
      if (left < 16) {
        left = 16;
        arrow = 'left';
      } else if (left + tooltipRect.width > viewportWidth - 16) {
        left = viewportWidth - tooltipRect.width - 16;
        arrow = 'right';
      }

      if (top < 16) {
        top = 16;
        arrow = 'top';
      } else if (top + tooltipRect.height > viewportHeight - 16) {
        top = viewportHeight - tooltipRect.height - 16;
        arrow = 'bottom';
      }

      setPosition({ top, left, arrow });
    };

    // Initial positioning
    setTimeout(updatePosition, 100);

    // Update position on scroll and resize
    const handleUpdate = () => updatePosition();
    window.addEventListener('scroll', handleUpdate, true);
    window.addEventListener('resize', handleUpdate);

    return () => {
      window.removeEventListener('scroll', handleUpdate, true);
      window.removeEventListener('resize', handleUpdate);
    };
  }, [isVisible, step.targetSelector, step.position]);

  // Add highlight effect to target element
  useEffect(() => {
    if (!targetElement || !isVisible) return;

    targetElement.style.position = 'relative';
    targetElement.style.zIndex = '1000';
    targetElement.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.5), 0 0 20px rgba(59, 130, 246, 0.3)';
    targetElement.style.borderRadius = '8px';
    targetElement.style.transition = 'all 0.3s ease';

    return () => {
      targetElement.style.position = '';
      targetElement.style.zIndex = '';
      targetElement.style.boxShadow = '';
      targetElement.style.borderRadius = '';
      targetElement.style.transition = '';
    };
  }, [targetElement, isVisible]);

  if (!isVisible) return null;

  const isLastStep = step.id === 'tutorial-complete';

  return (
    <>
      {/* Backdrop overlay */}
      <div className="fixed inset-0 bg-black/20 z-40 pointer-events-none" />
      
      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="fixed z-50 animate-in fade-in-0 zoom-in-95 duration-200"
        style={{
          top: step.targetSelector ? position.top : '50%',
          left: step.targetSelector ? position.left : '50%',
          transform: step.targetSelector ? 'none' : 'translate(-50%, -50%)'
        }}
      >
        <Card className="w-80 bg-white dark:bg-gray-900 shadow-xl border-blue-200 dark:border-blue-800">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                  {step.title}
                </h3>
                {step.showProgress && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                      <span>Tutorial Progress</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="h-1.5" />
                  </div>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="pt-0">
            <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed mb-4">
              {step.description}
            </p>

            {step.actionText && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
                <p className="text-blue-800 dark:text-blue-200 text-xs font-medium">
                  💡 Try this: {step.actionText}
                </p>
              </div>
            )}

            <div className="flex items-center justify-between gap-2">
              <div className="flex gap-2">
                {canGoPrevious && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onPrevious}
                    className="text-xs"
                  >
                    <ArrowLeft className="h-3 w-3 mr-1" />
                    Back
                  </Button>
                )}
                
                {!isLastStep && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onSkip}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    <SkipForward className="h-3 w-3 mr-1" />
                    {step.skipButtonText || 'Skip'}
                  </Button>
                )}
              </div>

              <Button
                onClick={isLastStep ? onComplete : onNext}
                size="sm"
                className="text-xs bg-blue-600 hover:bg-blue-700"
                disabled={!canGoNext && !isLastStep}
              >
                {isLastStep ? (
                  step.nextButtonText || 'Finish'
                ) : (
                  <>
                    {step.nextButtonText || 'Next'}
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Arrow indicator */}
        {step.targetSelector && (
          <div
            className={`absolute w-3 h-3 bg-white dark:bg-gray-900 border border-blue-200 dark:border-blue-800 rotate-45 ${
              position.arrow === 'top' ? '-bottom-1.5 left-1/2 -translate-x-1/2' :
              position.arrow === 'bottom' ? '-top-1.5 left-1/2 -translate-x-1/2' :
              position.arrow === 'left' ? 'top-1/2 -right-1.5 -translate-y-1/2' :
              'top-1/2 -left-1.5 -translate-y-1/2'
            }`}
          />
        )}
      </div>
    </>
  );
}