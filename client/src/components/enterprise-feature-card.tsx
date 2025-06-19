import React from 'react';
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