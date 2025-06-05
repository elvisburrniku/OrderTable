import { useState, useEffect } from 'react';
import { useWebSocket } from '@/hooks/use-websocket';
import { useAuth } from '@/lib/auth';
import { Bell, X, User, Calendar, Clock, Users, Phone, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface BookingNotification {
  id: string;
  type: 'new_booking';
  booking: {
    id: number;
    customerName: string;
    customerEmail: string;
    customerPhone?: string;
    guestCount: number;
    bookingDate: string;
    startTime: string;
    endTime?: string;
    tableId?: number;
    status: string;
    notes?: string;
    createdAt: string;
  };
  restaurant: {
    id: number;
    name?: string;
  };
  timestamp: string;
  read?: boolean;
}

export function RealTimeNotifications() {
  const { restaurant } = useAuth();
  const [notifications, setNotifications] = useState<BookingNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const { isConnected } = useWebSocket({
    restaurantId: restaurant?.id,
    onMessage: (data) => {
      if (data.type === 'new_booking') {
        const notification: BookingNotification = {
          ...data,
          id: `${data.booking.id}-${Date.now()}`,
          read: false
        };
        
        setNotifications(prev => [notification, ...prev.slice(0, 19)]); // Keep last 20 notifications
        setUnreadCount(prev => prev + 1);
        
        // Show browser notification if permission granted
        if (Notification.permission === 'granted') {
          new Notification(`New Booking - ${data.booking.customerName}`, {
            body: `${data.booking.guestCount} guests for ${data.booking.startTime} on ${format(new Date(data.booking.bookingDate), 'MMM dd, yyyy')}`,
            icon: '/favicon.ico'
          });
        }
      }
    }
  });

  // Request notification permission on mount
  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
    setUnreadCount(0);
  };

  const removeNotification = (notificationId: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
    setUnreadCount(prev => {
      const notification = notifications.find(n => n.id === notificationId);
      return notification && !notification.read ? prev - 1 : prev;
    });
  };

  return (
    <div className="relative">
      {/* Notification Bell */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      {/* Connection Status */}
      <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} 
           title={isConnected ? 'Connected' : 'Disconnected'} />

      {/* Notifications Panel */}
      {isOpen && (
        <Card className="absolute right-0 top-12 w-96 max-h-96 overflow-hidden z-50 shadow-lg">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Live Notifications</CardTitle>
              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                    Mark all read
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  No new booking notifications
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 border-b border-gray-200 hover:bg-gray-50 ${
                      !notification.read ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <User className="h-4 w-4 text-blue-500" />
                          <span className="font-semibold text-sm">
                            {notification.booking.customerName}
                          </span>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full" />
                          )}
                        </div>
                        
                        <div className="space-y-1 text-xs text-gray-600">
                          <div className="flex items-center space-x-2">
                            <Mail className="h-3 w-3" />
                            <span>{notification.booking.customerEmail}</span>
                          </div>
                          
                          {notification.booking.customerPhone && (
                            <div className="flex items-center space-x-2">
                              <Phone className="h-3 w-3" />
                              <span>{notification.booking.customerPhone}</span>
                            </div>
                          )}
                          
                          <div className="flex items-center space-x-2">
                            <Users className="h-3 w-3" />
                            <span>{notification.booking.guestCount} guests</span>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-3 w-3" />
                            <span>{format(new Date(notification.booking.bookingDate), 'MMM dd, yyyy')}</span>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Clock className="h-3 w-3" />
                            <span>{notification.booking.startTime}</span>
                            {notification.booking.endTime && (
                              <span>- {notification.booking.endTime}</span>
                            )}
                          </div>
                          
                          {notification.booking.notes && (
                            <div className="text-xs text-gray-500 mt-1">
                              Note: {notification.booking.notes}
                            </div>
                          )}
                        </div>
                        
                        <div className="text-xs text-gray-400 mt-2">
                          {format(new Date(notification.timestamp), 'HH:mm:ss')}
                        </div>
                      </div>
                      
                      <div className="flex flex-col space-y-1">
                        {!notification.read && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => markAsRead(notification.id)}
                            className="h-6 px-2 text-xs"
                          >
                            Mark read
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => removeNotification(notification.id)}
                          className="h-6 px-2 text-xs text-red-500 hover:text-red-700"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}