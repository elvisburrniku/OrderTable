import { useState, useEffect } from 'react';
import { Bell, Clock, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface AnimatedNotificationBadgeProps {
  count: number;
  urgentCount: number;
  className?: string;
}

export default function AnimatedNotificationBadge({ 
  count, 
  urgentCount, 
  className 
}: AnimatedNotificationBadgeProps) {
  const [isPulsing, setIsPulsing] = useState(false);
  const [lastCount, setLastCount] = useState(count);

  useEffect(() => {
    if (count > lastCount) {
      setIsPulsing(true);
      const timer = setTimeout(() => setIsPulsing(false), 1000);
      return () => clearTimeout(timer);
    }
    setLastCount(count);
  }, [count, lastCount]);

  if (count === 0) return null;

  return (
    <div className={cn("relative", className)}>
      <div className={cn(
        "flex items-center gap-2 transition-all duration-300",
        isPulsing && "animate-bounce"
      )}>
        <div className="relative">
          {urgentCount > 0 ? (
            <AlertTriangle className={cn(
              "w-5 h-5 transition-colors duration-300",
              urgentCount > 0 ? "text-red-500" : "text-blue-500"
            )} />
          ) : (
            <Clock className="w-5 h-5 text-blue-500" />
          )}
          
          {urgentCount > 0 && (
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-ping" />
          )}
        </div>

        <Badge 
          variant={urgentCount > 0 ? "destructive" : "default"}
          className={cn(
            "transition-all duration-300 font-semibold",
            urgentCount > 0 && "animate-pulse"
          )}
        >
          {count} upcoming
        </Badge>

        {urgentCount > 0 && (
          <Badge 
            variant="destructive" 
            className="animate-pulse bg-red-500 text-white border-red-600"
          >
            {urgentCount} urgent
          </Badge>
        )}
      </div>

      {isPulsing && (
        <div className="absolute inset-0 bg-blue-200 rounded-full animate-ping opacity-30" />
      )}
    </div>
  );
}