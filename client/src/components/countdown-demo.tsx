import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ReservationCountdown from './reservation-countdown';
import { Plus, RefreshCw, Play, Pause } from 'lucide-react';

interface DemoReservation {
  id: number;
  customerName: string;
  guestCount: number;
  startTime: string;
  endTime: string;
  tableName?: string;
  notes?: string;
  status: string;
}

export default function CountdownDemo() {
  const [demoReservations, setDemoReservations] = useState<DemoReservation[]>([]);
  const [isRunning, setIsRunning] = useState(true);

  // Generate realistic demo reservations at various time intervals
  const generateDemoReservations = () => {
    const now = new Date();
    const reservations: DemoReservation[] = [
      {
        id: 1,
        customerName: "Sarah Johnson",
        guestCount: 4,
        startTime: new Date(now.getTime() + 5 * 60000).toTimeString().slice(0, 5), // 5 minutes
        endTime: new Date(now.getTime() + 125 * 60000).toTimeString().slice(0, 5),
        tableName: "Table 12",
        notes: "Birthday celebration - cake required",
        status: "confirmed"
      },
      {
        id: 2,
        customerName: "Michael Chen",
        guestCount: 2,
        startTime: new Date(now.getTime() + 15 * 60000).toTimeString().slice(0, 5), // 15 minutes
        endTime: new Date(now.getTime() + 135 * 60000).toTimeString().slice(0, 5),
        tableName: "Table 8",
        notes: "Anniversary dinner",
        status: "confirmed"
      },
      {
        id: 3,
        customerName: "Emma Rodriguez",
        guestCount: 6,
        startTime: new Date(now.getTime() + 25 * 60000).toTimeString().slice(0, 5), // 25 minutes
        endTime: new Date(now.getTime() + 145 * 60000).toTimeString().slice(0, 5),
        tableName: "Table 15",
        notes: "Business meeting",
        status: "confirmed"
      },
      {
        id: 4,
        customerName: "David Park",
        guestCount: 3,
        startTime: new Date(now.getTime() + 45 * 60000).toTimeString().slice(0, 5), // 45 minutes
        endTime: new Date(now.getTime() + 165 * 60000).toTimeString().slice(0, 5),
        tableName: "Table 5",
        status: "confirmed"
      },
      {
        id: 5,
        customerName: "Lisa Thompson",
        guestCount: 8,
        startTime: new Date(now.getTime() + 90 * 60000).toTimeString().slice(0, 5), // 1.5 hours
        endTime: new Date(now.getTime() + 210 * 60000).toTimeString().slice(0, 5),
        tableName: "Table 20",
        notes: "Family reunion",
        status: "confirmed"
      },
      {
        id: 6,
        customerName: "James Wilson",
        guestCount: 2,
        startTime: new Date(now.getTime() + 120 * 60000).toTimeString().slice(0, 5), // 2 hours
        endTime: new Date(now.getTime() + 240 * 60000).toTimeString().slice(0, 5),
        tableName: "Table 3",
        notes: "Romantic dinner",
        status: "confirmed"
      }
    ];
    
    setDemoReservations(reservations);
  };

  // Add a new urgent reservation for demo purposes
  const addUrgentReservation = () => {
    const now = new Date();
    const urgentNames = ["Alex Turner", "Sophie Adams", "Ryan Mitchell", "Grace Lee"];
    const urgentReservation: DemoReservation = {
      id: Date.now(),
      customerName: urgentNames[Math.floor(Math.random() * urgentNames.length)],
      guestCount: Math.floor(Math.random() * 4) + 2,
      startTime: new Date(now.getTime() + Math.random() * 8 * 60000).toTimeString().slice(0, 5), // 0-8 minutes
      endTime: new Date(now.getTime() + 120 * 60000).toTimeString().slice(0, 5),
      tableName: `Table ${Math.floor(Math.random() * 20) + 1}`,
      notes: Math.random() > 0.5 ? "Walk-in booking" : "Last minute reservation",
      status: "confirmed"
    };
    
    setDemoReservations(prev => [urgentReservation, ...prev]);
  };

  // Auto-refresh reservations every 30 seconds when running
  useEffect(() => {
    if (!isRunning) return;
    
    generateDemoReservations();
    const interval = setInterval(generateDemoReservations, 30000);
    return () => clearInterval(interval);
  }, [isRunning]);

  const urgentCount = demoReservations.filter(r => {
    const now = new Date();
    const reservationTime = new Date();
    const [hours, minutes] = r.startTime.split(':');
    reservationTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    if (reservationTime < now) {
      reservationTime.setDate(reservationTime.getDate() + 1);
    }
    
    const diff = reservationTime.getTime() - now.getTime();
    const minutesUntil = Math.floor(diff / (1000 * 60));
    return minutesUntil > 0 && minutesUntil <= 30;
  }).length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <Play className="w-4 h-4 text-white" />
              </div>
              Whimsical Countdown Demo
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant={urgentCount > 0 ? "destructive" : "secondary"}>
                {urgentCount} urgent reservations
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsRunning(!isRunning)}
                className="flex items-center gap-2"
              >
                {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {isRunning ? "Pause" : "Start"} Demo
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={generateDemoReservations}
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={addUrgentReservation}
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Urgent
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-600 mb-4">
            This demo showcases the whimsical reservation countdown animations with live timers, 
            floating particles, and urgency indicators. Reservations automatically update every 30 seconds.
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span>Normal reservations (30+ minutes)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
              <span>Urgent reservations (10-30 minutes)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span>Critical reservations (0-10 minutes)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <ReservationCountdown 
        reservations={demoReservations}
        className="max-w-7xl mx-auto"
      />
    </div>
  );
}