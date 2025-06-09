import { useState, useEffect } from 'react';
import { useWebSocket } from '@/hooks/use-websocket';
import { useAuth } from '@/lib/auth';
import { Bell, X, User, Calendar, Clock, Users, Phone, Mail, AlertTriangle, CheckCircle, XCircle, MessageSquare, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface BookingNotification {
  id: string;
  type: 'new_booking' | 'booking_changed' | 'booking_cancelled' | 'booking_change_request' | 'change_request_responded';
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
    tenantId: number;
    restaurantId: number;
  };
  changeRequest?: {
    id: number;
    requestedDate?: string;
    requestedTime?: string;
    requestedGuestCount?: number;
    requestNotes?: string;
    status: string;
  };
  changes?: any;
  originalData?: any;
  approved?: boolean;
  restaurant?: {
    id: number;
    name?: string;
  };
  timestamp: string;
  read?: boolean;
  reverted?: boolean;
  cancelledBy?: string;
}

export function RealTimeNotifications() {
  const { restaurant, user } = useAuth();
  const [liveNotifications, setLiveNotifications] = useState<BookingNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [processingRequests, setProcessingRequests] = useState<Set<number>>(new Set());

  // Fetch persistent notifications from database
  const { data: persistentNotifications = [] } = useQuery({
    queryKey: ['/api/notifications'],
    enabled: !!restaurant?.id,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Combine live and persistent notifications
  const allNotifications = [...liveNotifications, ...persistentNotifications].sort(
    (a, b) => new Date(b.timestamp || b.createdAt).getTime() - new Date(a.timestamp || a.createdAt).getTime()
  );

  const { isConnected } = useWebSocket({
    restaurantId: restaurant?.id,
    onMessage: (data) => {
      if (data.type === 'notification') {
        const notification: BookingNotification = {
          ...data.notification,
          id: `${data.notification.type}-${data.notification.booking?.id || data.notification.changeRequest?.id}-${Date.now()}`,
          read: false
        };
        
        setNotifications(prev => [notification, ...prev.slice(0, 29)]); // Keep last 30 notifications
        setUnreadCount(prev => prev + 1);
        
        // Show browser notification if permission granted
        if (Notification.permission === 'granted') {
          const title = getNotificationTitle(notification);
          const body = getNotificationMessage(notification);
          new Notification(title, {
            body,
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

  const handleChangeRequest = async (requestId: number, action: 'approve' | 'reject', response?: string) => {
    setProcessingRequests(prev => new Set(prev).add(requestId));
    
    try {
      const res = await fetch(`/api/booking-change-response/${requestId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action,
          response
        })
      });

      if (res.ok) {
        // Update notification to show it's been processed
        setNotifications(prev => 
          prev.map(n => 
            n.changeRequest?.id === requestId 
              ? { ...n, changeRequest: { ...n.changeRequest, status: action === 'approve' ? 'approved' : 'rejected' } }
              : n
          )
        );
      } else {
        console.error('Failed to process change request');
      }
    } catch (error) {
      console.error('Error processing change request:', error);
    } finally {
      setProcessingRequests(prev => {
        const next = new Set(prev);
        next.delete(requestId);
        return next;
      });
    }
  };

  const handleRevertChanges = async (bookingId: number, originalData: any) => {
    setProcessingRequests(prev => new Set(prev).add(bookingId));
    
    try {
      const res = await fetch(`/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/bookings/${bookingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          bookingDate: originalData.bookingDate,
          startTime: originalData.startTime,
          endTime: originalData.endTime,
          guestCount: originalData.guestCount,
          tableId: originalData.tableId,
          notes: originalData.notes
        })
      });

      if (res.ok) {
        // Mark notification as processed/reverted
        setNotifications(prev => 
          prev.map(n => 
            n.booking?.id === bookingId && n.type === 'booking_changed'
              ? { ...n, reverted: true }
              : n
          )
        );
      } else {
        console.error('Failed to revert booking changes');
      }
    } catch (error) {
      console.error('Error reverting booking changes:', error);
    } finally {
      setProcessingRequests(prev => {
        const next = new Set(prev);
        next.delete(bookingId);
        return next;
      });
    }
  };

  const getNotificationIcon = (type: string, urgent = false) => {
    const className = `h-4 w-4 ${urgent ? 'animate-pulse' : ''}`;
    
    switch (type) {
      case 'new_booking':
        return <CheckCircle className={`${className} text-green-500`} />;
      case 'booking_changed':
        return <Clock className={`${className} text-blue-500`} />;
      case 'booking_cancelled':
        return <XCircle className={`${className} text-red-500`} />;
      case 'booking_change_request':
        return <AlertTriangle className={`${className} text-yellow-500`} />;
      case 'change_request_responded':
        return <CheckCircle className={`${className} text-green-500`} />;
      default:
        return <Bell className={`${className} text-gray-500`} />;
    }
  };

  const getNotificationTitle = (notification: BookingNotification) => {
    switch (notification.type) {
      case 'new_booking':
        return 'New Booking';
      case 'booking_changed':
        return 'Booking Updated';
      case 'booking_cancelled':
        return 'Booking Cancelled';
      case 'booking_change_request':
        return 'Change Request';
      case 'change_request_responded':
        return 'Request Processed';
      default:
        return 'Notification';
    }
  };

  const getNotificationMessage = (notification: BookingNotification) => {
    const { type, booking, changeRequest, changes, approved } = notification;
    
    switch (type) {
      case 'new_booking':
        return `${booking?.customerName} - ${booking?.guestCount} guests on ${format(new Date(booking?.bookingDate), 'MMM dd')} at ${booking?.startTime}`;
      case 'booking_changed':
        const changedFields = Object.keys(changes || {}).map(key => {
          switch (key) {
            case 'bookingDate': return 'date';
            case 'startTime': return 'time';
            case 'guestCount': return 'party size';
            default: return key;
          }
        }).join(', ');
        return `${booking?.customerName} changed ${changedFields}`;
      case 'booking_cancelled':
        return `${booking?.customerName} cancelled their ${format(new Date(booking?.bookingDate), 'MMM dd')} booking`;
      case 'booking_change_request':
        const requestedChanges = [];
        if (changeRequest?.requestedDate) requestedChanges.push(`date to ${format(new Date(changeRequest.requestedDate), 'MMM dd')}`);
        if (changeRequest?.requestedTime) requestedChanges.push(`time to ${changeRequest.requestedTime}`);
        if (changeRequest?.requestedGuestCount) requestedChanges.push(`party size to ${changeRequest.requestedGuestCount}`);
        return `${booking?.customerName} wants to change ${requestedChanges.join(', ')}`;
      case 'change_request_responded':
        return `Change request ${approved ? 'approved' : 'rejected'} for ${booking?.customerName}`;
      default:
        return 'New notification';
    }
  };

  const formatChangeDetails = (changeRequest: any) => {
    const changes = [];
    if (changeRequest?.requestedDate) {
      changes.push(`Date: ${format(new Date(changeRequest.requestedDate), 'MMM dd, yyyy')}`);
    }
    if (changeRequest?.requestedTime) {
      changes.push(`Time: ${changeRequest.requestedTime}`);
    }
    if (changeRequest?.requestedGuestCount) {
      changes.push(`Party Size: ${changeRequest.requestedGuestCount} guests`);
    }
    return changes;
  };

  const pendingChangeRequests = notifications.filter(n => 
    n.type === 'booking_change_request' && 
    n.changeRequest?.status === 'pending' && 
    !processingRequests.has(n.changeRequest?.id)
  );

  return (
    <div className="relative">
      {/* Notification Bell */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
      >
        <Bell className={`h-4 w-4 ${pendingChangeRequests.length > 0 ? 'animate-pulse text-yellow-500' : ''}`} />
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
        <Card className="absolute right-0 top-12 w-[450px] max-h-[80vh] overflow-hidden z-50 shadow-lg">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">Live Notifications</CardTitle>
                {pendingChangeRequests.length > 0 && (
                  <Badge variant="destructive">{pendingChangeRequests.length} pending</Badge>
                )}
              </div>
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
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p>No notifications yet</p>
                  <p className="text-sm">You'll see booking updates here</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 border-b border-gray-200 hover:bg-gray-50 ${
                      !notification.read ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                    } ${
                      notification.type === 'booking_change_request' && notification.changeRequest?.status === 'pending' 
                        ? 'bg-yellow-50 border-l-4 border-l-yellow-500' : ''
                    }`}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="flex items-start gap-3">
                      {getNotificationIcon(
                        notification.type, 
                        notification.type === 'booking_change_request' && notification.changeRequest?.status === 'pending'
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 mb-1">
                          {getNotificationMessage(notification)}
                        </p>
                        
                        {notification.changeRequest?.requestNotes && (
                          <div className="bg-gray-100 rounded p-2 mb-2">
                            <p className="text-xs text-gray-600 flex items-center gap-1">
                              <MessageSquare className="h-3 w-3" />
                              Customer note:
                            </p>
                            <p className="text-sm text-gray-800">{notification.changeRequest.requestNotes}</p>
                          </div>
                        )}
                        
                        {notification.type === 'booking_change_request' && 
                         notification.changeRequest?.status === 'pending' &&
                         !processingRequests.has(notification.changeRequest.id) && (
                          <div className="mt-3 space-y-2">
                            <div className="text-xs text-gray-600 space-y-1">
                              {formatChangeDetails(notification.changeRequest).map((change, idx) => (
                                <div key={idx} className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {change}
                                </div>
                              ))}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleChangeRequest(notification.changeRequest!.id, 'approve');
                                }}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleChangeRequest(notification.changeRequest!.id, 'reject');
                                }}
                              >
                                Reject
                              </Button>
                            </div>
                          </div>
                        )}
                        
                        {notification.type === 'booking_changed' && 
                         notification.originalData && 
                         !notification.reverted &&
                         !processingRequests.has(notification.booking.id) && (
                          <div className="mt-3">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRevertChanges(notification.booking.id, notification.originalData);
                              }}
                              className="text-orange-600 border-orange-300 hover:bg-orange-50"
                            >
                              Revert Changes
                            </Button>
                          </div>
                        )}
                        
                        {notification.reverted && (
                          <Badge variant="secondary" className="mt-2">
                            Changes Reverted
                          </Badge>
                        )}
                        
                        {processingRequests.has(notification.changeRequest?.id || notification.booking.id) && (
                          <div className="mt-2 text-sm text-gray-500">
                            Processing...
                          </div>
                        )}
                        
                        {notification.changeRequest?.status && notification.changeRequest.status !== 'pending' && (
                          <Badge 
                            variant={notification.changeRequest.status === 'approved' ? 'default' : 'destructive'}
                            className="mt-2"
                          >
                            {notification.changeRequest.status}
                          </Badge>
                        )}
                        
                        <p className="text-xs text-gray-500 mt-2">
                          {format(new Date(notification.timestamp), 'MMM dd, HH:mm:ss')}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeNotification(notification.id);
                        }}
                        className="text-gray-400 hover:text-gray-600 ml-2"
                      >
                        <X className="h-4 w-4" />
                      </button>
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