import React, { useState } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { SneakPeekModal } from './sneak-peek-modal';
import { Crown, Eye, X, Sparkles } from 'lucide-react';

interface SneakPeekBannerProps {
  currentPlan?: string;
  className?: string;
}

export function SneakPeekBanner({ currentPlan = "basic", className = "" }: SneakPeekBannerProps) {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <Card className={`border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50 ${className}`}>
      <CardContent className="p-4 relative">
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-2 right-2 h-6 w-6 p-0"
          onClick={() => setIsVisible(false)}
        >
          <X className="h-3 w-3" />
        </Button>
        
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white rounded-lg shadow-sm">
            <Crown className="h-5 w-5 text-yellow-500" />
          </div>
          
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900">Unlock Enterprise Features</h3>
              <Badge variant="secondary" className="text-xs">
                <Sparkles className="h-3 w-3 mr-1" />
                New
              </Badge>
            </div>
            <p className="text-sm text-gray-600">
              Manage multiple restaurants, advanced analytics, and priority support
            </p>
          </div>
          
          <SneakPeekModal currentPlan={currentPlan}>
            <Button size="sm" className="shrink-0">
              <Eye className="h-4 w-4 mr-2" />
              Sneak Peek
            </Button>
          </SneakPeekModal>
        </div>
      </CardContent>
    </Card>
  );
}