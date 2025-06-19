import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { SneakPeekModal } from './sneak-peek-modal';
import { Crown, TrendingUp, Users, BarChart3, Eye } from 'lucide-react';

interface SneakPeekWidgetProps {
  variant?: 'sidebar' | 'inline' | 'compact';
  currentPlan?: string;
  className?: string;
}

export function SneakPeekWidget({ 
  variant = 'inline', 
  currentPlan = "basic",
  className = ""
}: SneakPeekWidgetProps) {
  const [, setLocation] = useLocation();

  const { data: subscriptionDetails, isLoading: subscriptionLoading } = useQuery({
    queryKey: ["/api/subscription/details"],
  });

  // Don't show widget if user is on Enterprise or Premium plan
  const isEnterprise = subscriptionDetails?.plan?.name?.toLowerCase().includes('enterprise') || 
                      subscriptionDetails?.plan?.name?.toLowerCase().includes('premium') ||
                      subscriptionDetails?.plan?.name?.toLowerCase().includes('professional');

  // Hide widget while loading or if user has enterprise plan
  if (subscriptionLoading || isEnterprise) {
    return null;
  }
  
  if (variant === 'sidebar') {
    return (
      <Card className={`border-blue-200 bg-gradient-to-br from-blue-50 to-purple-50 ${className}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Crown className="h-4 w-4 text-yellow-500" />
            <CardTitle className="text-sm">Enterprise</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-xs text-gray-600">
            Unlock powerful features for serious restaurant operations
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs">
              <Users className="h-3 w-3 text-blue-500" />
              <span>Multi-Restaurant Management</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <BarChart3 className="h-3 w-3 text-green-500" />
              <span>Advanced Analytics</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <TrendingUp className="h-3 w-3 text-purple-500" />
              <span>Priority Support</span>
            </div>
          </div>
          
          <SneakPeekModal currentPlan={currentPlan}>
            <Button size="sm" className="w-full text-xs">
              <Eye className="h-3 w-3 mr-1" />
              Preview
            </Button>
          </SneakPeekModal>
        </CardContent>
      </Card>
    );
  }
  
  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg ${className}`}>
        <div className="flex items-center gap-2">
          <Crown className="h-4 w-4 text-yellow-500" />
          <span className="text-sm font-medium">Enterprise Features Available</span>
          <Badge variant="secondary" className="text-xs">New</Badge>
        </div>
        <SneakPeekModal currentPlan={currentPlan}>
          <Button size="sm" variant="outline">
            <Eye className="h-4 w-4 mr-1" />
            Preview
          </Button>
        </SneakPeekModal>
      </div>
    );
  }
  
  // Default inline variant
  return (
    <Card className={`border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50 ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <Crown className="h-5 w-5 text-yellow-500" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Enterprise Features</h3>
              <p className="text-sm text-gray-600">
                Scale your restaurant operations with advanced tools
              </p>
            </div>
          </div>
          <SneakPeekModal currentPlan={currentPlan}>
            <Button size="sm">
              <Eye className="h-4 w-4 mr-2" />
              Explore
            </Button>
          </SneakPeekModal>
        </div>
      </CardContent>
    </Card>
  );
}