import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { SneakPeekModal } from './sneak-peek-modal';
import { UpgradeFlowHandler } from './upgrade-flow-handler';
import { Lock, Eye, Crown } from 'lucide-react';

interface EnterpriseFeatureCardProps {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  isLocked?: boolean;
  currentPlan?: string;
  className?: string;
  children?: React.ReactNode;
}

export function EnterpriseFeatureCard({
  title,
  description,
  icon: Icon,
  isLocked = true,
  currentPlan = "basic",
  className = "",
  children
}: EnterpriseFeatureCardProps) {
  const [, setLocation] = useLocation();

  const { data: subscriptionDetails, isLoading: subscriptionLoading } = useQuery({
    queryKey: ["/api/subscription/details"],
  });

  // Check if user is on Enterprise or Premium plan
  const isEnterprise = subscriptionDetails?.plan?.name?.toLowerCase().includes('enterprise') || 
                      subscriptionDetails?.plan?.name?.toLowerCase().includes('premium') ||
                      subscriptionDetails?.plan?.name?.toLowerCase().includes('professional');

  // If user has Enterprise, show the actual content instead of the upgrade card
  if (isEnterprise) {
    return (
      <div className={className}>
        {children}
      </div>
    );
  }

  // Show loading state while checking subscription
  if (subscriptionLoading) {
    return (
      <div className={`animate-pulse bg-gray-100 rounded-lg ${className}`} style={{ height: '200px' }}>
        <div className="p-6 space-y-3">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          <div className="h-8 bg-gray-200 rounded w-full mt-4"></div>
        </div>
      </div>
    );
  }

  return (
    <Card className={`relative ${isLocked ? 'border-gray-200 bg-gray-50/50' : 'border-blue-200'} ${className}`}>
      {isLocked && (
        <div className="absolute top-3 right-3">
          <Badge variant="secondary" className="text-xs">
            <Crown className="h-3 w-3 mr-1" />
            Enterprise
          </Badge>
        </div>
      )}
      
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isLocked ? 'bg-gray-100' : 'bg-blue-100'}`}>
            <Icon className={`h-5 w-5 ${isLocked ? 'text-gray-400' : 'text-blue-600'}`} />
          </div>
          <div className="flex-1">
            <CardTitle className={`text-lg ${isLocked ? 'text-gray-500' : 'text-gray-900'}`}>
              {title}
            </CardTitle>
            <CardDescription className={isLocked ? 'text-gray-400' : 'text-gray-600'}>
              {description}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {isLocked ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Lock className="h-4 w-4" />
              <span>Requires Enterprise Plan</span>
            </div>
            
            <div className="flex gap-2">
              <SneakPeekModal currentPlan={currentPlan}>
                <Button variant="outline" size="sm" className="flex-1">
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>
              </SneakPeekModal>
              <UpgradeFlowHandler targetPlan="Enterprise">
                <Button size="sm" className="flex-1">
                  Upgrade
                </Button>
              </UpgradeFlowHandler>
            </div>
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}