import { useState, useEffect } from 'react';
import { Clock, Users, Calendar, MapPin, Sparkles, Heart, Star } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Reservation {
  id: number;
  customerName: string;
  guestCount: number;
  startTime: string;
  endTime: string;
  tableName?: string;
  notes?: string;
  status: string;
}

interface ReservationCountdownProps {
  reservations: Reservation[];
  className?: string;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMinutes: number;
}

const WhimsicalIcon = ({ index, isUrgent }: { index: number; isUrgent: boolean }) => {
  const icons = [Sparkles, Heart, Star, Clock];
  const IconComponent = icons[index % icons.length];
  
  return (
    <div className={cn(
      "relative transition-all duration-500",
      isUrgent ? "animate-bounce" : "animate-pulse"
    )}>
      <IconComponent className={cn(
        "w-5 h-5 transition-colors duration-300",
        isUrgent ? "text-red-500" : "text-blue-500"
      )} />
      {isUrgent && (
        <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-ping" />
      )}
    </div>
  );
};

const CountdownDigit = ({ value, label, isUrgent }: { value: number; label: string; isUrgent: boolean }) => (
  <div className={cn(
    "flex flex-col items-center transition-all duration-300",
    isUrgent && "animate-pulse"
  )}>
    <div className={cn(
      "bg-gradient-to-br rounded-lg p-2 min-w-[3rem] text-center shadow-lg transition-all duration-300",
      isUrgent 
        ? "from-red-500 to-red-600 text-white scale-110" 
        : "from-blue-500 to-blue-600 text-white"
    )}>
      <span className="text-lg font-bold tabular-nums">
        {value.toString().padStart(2, '0')}
      </span>
    </div>
    <span className={cn(
      "text-xs font-medium mt-1 transition-colors duration-300",
      isUrgent ? "text-red-600" : "text-gray-600"
    )}>
      {label}
    </span>
  </div>
);

const calculateTimeRemaining = (targetTime: string): TimeRemaining => {
  const now = new Date();
  const target = new Date();
  const [hours, minutes] = targetTime.split(':');
  target.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  
  // If target time is earlier today, assume it's tomorrow
  if (target < now) {
    target.setDate(target.getDate() + 1);
  }
  
  const diff = target.getTime() - now.getTime();
  const totalMinutes = Math.max(0, Math.floor(diff / (1000 * 60)));
  
  return {
    days: Math.floor(totalMinutes / (24 * 60)),
    hours: Math.floor((totalMinutes % (24 * 60)) / 60),
    minutes: totalMinutes % 60,
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
    totalMinutes
  };
};

const ReservationCard = ({ reservation, index }: { reservation: Reservation; index: number }) => {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>(
    calculateTimeRemaining(reservation.startTime)
  );
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Stagger the appearance of cards
    const timer = setTimeout(() => setIsVisible(true), index * 150);
    return () => clearTimeout(timer);
  }, [index]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining(reservation.startTime));
    }, 1000);

    return () => clearInterval(interval);
  }, [reservation.startTime]);

  const isUrgent = timeRemaining.totalMinutes <= 30; // Urgent if 30 minutes or less
  const isCritical = timeRemaining.totalMinutes <= 10; // Critical if 10 minutes or less
  const isExpired = timeRemaining.totalMinutes <= 0;

  if (isExpired) return null;

  return (
    <Card className={cn(
      "relative overflow-hidden transition-all duration-500 transform hover:scale-[1.02]",
      "border-2 shadow-lg hover:shadow-xl",
      !isVisible && "opacity-0 translate-y-4",
      isVisible && "opacity-100 translate-y-0",
      isCritical 
        ? "border-red-400 bg-gradient-to-br from-red-50 to-red-100" 
        : isUrgent 
        ? "border-orange-400 bg-gradient-to-br from-orange-50 to-orange-100"
        : "border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100"
    )}>
      {/* Animated background effects */}
      <div className="absolute top-0 right-0 w-20 h-20 opacity-10">
        <div className={cn(
          "w-full h-full rounded-full",
          isCritical 
            ? "bg-red-500 animate-ping" 
            : isUrgent 
            ? "bg-orange-500 animate-pulse"
            : "bg-blue-500 animate-bounce"
        )} />
      </div>

      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <WhimsicalIcon index={index} isUrgent={isUrgent} />
              <h3 className="font-semibold text-gray-900 truncate">
                {reservation.customerName}
              </h3>
              <Badge variant={isCritical ? "destructive" : isUrgent ? "secondary" : "default"}>
                {isCritical ? "Critical" : isUrgent ? "Urgent" : "Upcoming"}
              </Badge>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <span>{reservation.guestCount} guests</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>{reservation.startTime}</span>
              </div>
              {reservation.tableName && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  <span>{reservation.tableName}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Countdown Display */}
        <div className="bg-white/70 rounded-lg p-3 backdrop-blur-sm">
          <div className="flex items-center justify-center gap-1 mb-2">
            <Calendar className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Time until reservation</span>
          </div>
          
          <div className="flex justify-center gap-2">
            {timeRemaining.days > 0 && (
              <>
                <CountdownDigit value={timeRemaining.days} label="days" isUrgent={isUrgent} />
                <div className="flex items-center text-2xl font-bold text-gray-400">:</div>
              </>
            )}
            
            {(timeRemaining.days > 0 || timeRemaining.hours > 0) && (
              <>
                <CountdownDigit value={timeRemaining.hours} label="hours" isUrgent={isUrgent} />
                <div className="flex items-center text-2xl font-bold text-gray-400">:</div>
              </>
            )}
            
            <CountdownDigit value={timeRemaining.minutes} label="min" isUrgent={isUrgent} />
            <div className="flex items-center text-2xl font-bold text-gray-400">:</div>
            <CountdownDigit value={timeRemaining.seconds} label="sec" isUrgent={isUrgent} />
          </div>

          {/* Progress bar */}
          <div className="mt-3">
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div 
                className={cn(
                  "h-2 rounded-full transition-all duration-1000 ease-out",
                  isCritical 
                    ? "bg-gradient-to-r from-red-500 to-red-600" 
                    : isUrgent 
                    ? "bg-gradient-to-r from-orange-500 to-orange-600"
                    : "bg-gradient-to-r from-blue-500 to-blue-600"
                )}
                style={{
                  width: `${Math.max(5, Math.min(100, (120 - timeRemaining.totalMinutes) / 120 * 100))}%`
                }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Now</span>
              <span className={cn(
                "font-medium",
                isCritical ? "text-red-600" : isUrgent ? "text-orange-600" : "text-blue-600"
              )}>
                {timeRemaining.totalMinutes < 60 
                  ? `${timeRemaining.totalMinutes}m left`
                  : `${Math.floor(timeRemaining.totalMinutes / 60)}h ${timeRemaining.totalMinutes % 60}m left`
                }
              </span>
            </div>
          </div>
        </div>

        {/* Notes section */}
        {reservation.notes && (
          <div className="mt-3 p-2 bg-white/50 rounded text-sm text-gray-600">
            <span className="font-medium">Notes:</span> {reservation.notes}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default function ReservationCountdown({ reservations, className }: ReservationCountdownProps) {
  // Filter to only show today's upcoming reservations
  const upcomingReservations = reservations.filter(reservation => {
    const timeRemaining = calculateTimeRemaining(reservation.startTime);
    return timeRemaining.totalMinutes > 0 && timeRemaining.totalMinutes <= 480; // Show reservations within 8 hours
  }).sort((a, b) => {
    // Sort by time remaining (soonest first)
    const timeA = calculateTimeRemaining(a.startTime).totalMinutes;
    const timeB = calculateTimeRemaining(b.startTime).totalMinutes;
    return timeA - timeB;
  });

  if (upcomingReservations.length === 0) {
    return (
      <div className={cn("text-center py-8", className)}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center">
            <Calendar className="w-8 h-8 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-1">All caught up!</h3>
            <p className="text-sm text-gray-600">No upcoming reservations in the next 8 hours</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div>
          <h2 className="font-semibold text-gray-900">Upcoming Reservations</h2>
          <p className="text-sm text-gray-600">
            {upcomingReservations.length} reservation{upcomingReservations.length !== 1 ? 's' : ''} coming up
          </p>
        </div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {upcomingReservations.map((reservation, index) => (
          <ReservationCard key={reservation.id} reservation={reservation} index={index} />
        ))}
      </div>
    </div>
  );
}