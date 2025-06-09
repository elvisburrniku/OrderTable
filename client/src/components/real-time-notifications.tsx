import { useState, useEffect } from 'react';
import { useWebSocket } from '@/hooks/use-websocket';
import { useAuth } from '@/lib/auth';
import { Bell, X, User, Calendar, Clock, Users, Phone, Mail, AlertTriangle, CheckCircle, XCircle, MessageSquare, Undo2, Eye, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
  const [selectedBooking, setSelectedBooking] = useState<BookingNotification | null>(null);
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [processingRequests, setProcessingRequests] = useState<Set<number>>(new Set());

  // Fetch persistent notifications from database using tenant-scoped endpoint
  const { data: persistentNotifications = [] } = useQuery({
    queryKey: ['/api/tenants', restaurant?.tenantId, 'restaurants', restaurant?.id, 'notifications'],
    enabled: !!restaurant?.id && !!restaurant?.tenantId,
    refetchInterval: 30000, // Refetch every 30 seconds
    queryFn: () => {
      if (!restaurant?.id || !restaurant?.tenantId) {
        throw new Error('Restaurant ID and Tenant ID are required');
      }
      return fetch(`/api/tenants/${restaurant.tenantId}/restaurants/${restaurant.id}/notifications`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      }).then(res => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        return res.json();
      });
    },
  });

  // Combine live and persistent notifications
  const allNotifications = [...liveNotifications, ...persistentNotifications].sort(
    (a, b) => new Date(b.timestamp || b.createdAt).getTime() - new Date(a.timestamp || a.createdAt).getTime()
  );

  // Mark notification as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: number) => apiRequest(`/api/notifications/${notificationId}/read`, {
      method: 'PATCH',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tenants', restaurant?.tenantId, 'restaurants', restaurant?.id, 'notifications'] });
    },
  });

  // Mark all notifications as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: () => apiRequest('/api/notifications/mark-all-read', {
      method: 'PATCH',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tenants', restaurant?.tenantId, 'restaurants', restaurant?.id, 'notifications'] });
      setUnreadCount(0);
    },
  });

  // Revert notification mutation (admin only)
  const revertNotificationMutation = useMutation({
    mutationFn: (notificationId: number) => apiRequest(`/api/notifications/${notificationId}/revert`, {
      method: 'POST',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tenants', restaurant?.tenantId, 'restaurants', restaurant?.id, 'notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tenants', restaurant?.tenantId, 'restaurants', restaurant?.id, 'bookings'] });
      toast({
        title: "Changes Reverted",
        description: "The booking changes have been successfully reverted.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to revert changes. This action may not be available.",
        variant: "destructive",
      });
    },
  });

  const { isConnected } = useWebSocket({
    restaurantId: restaurant?.id,
    onMessage: (data) => {
      if (data.type === 'notification') {
        // Handle persistent notifications from WebSocket
        queryClient.invalidateQueries({ queryKey: ['/api/tenants', restaurant?.tenantId, 'restaurants', restaurant?.id, 'notifications'] });
        setUnreadCount(prev => prev + 1);
        
        // Show browser notification if permission granted
        if (Notification.permission === 'granted') {
          const title = getNotificationTitle(data.notification);
          const body = getNotificationMessage(data.notification);
          new Notification(title, {
            body,
            icon: '/favicon.ico'
          });
        }
      } else if (data.type === 'new_booking' || data.type === 'booking_changed' || data.type === 'booking_cancelled' || 
          data.type === 'booking_change_request' || data.type === 'change_request_responded') {
        // Handle legacy live notifications
        const notification: BookingNotification = {
          id: `${data.type}-${data.booking?.id || data.changeRequest?.id}-${Date.now()}`,
          ...data,
          timestamp: new Date().toISOString(),
          read: false
        };
        
        setLiveNotifications(prev => [notification, ...prev.slice(0, 29)]);
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

  const markAsRead = (notification: any) => {
    if (typeof notification.id === 'number') {
      // Persistent notification
      markAsReadMutation.mutate(notification.id);
    } else {
      // Live notification
      setLiveNotifications(prev => 
        prev.map(notif => 
          notif.id === notification.id ? { ...notif, read: true } : notif
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const markAllAsRead = () => {
    markAllAsReadMutation.mutate();
    setLiveNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
  };

  const revertNotification = (notification: any) => {
    if (typeof notification.id === 'number' && user?.role === 'admin') {
      revertNotificationMutation.mutate(notification.id);
    }
  };

  const removeNotification = (notificationId: string) => {
    setLiveNotifications(prev => prev.filter(notif => notif.id !== notificationId));
    setUnreadCount(prev => {
      const notification = liveNotifications.find(n => n.id === notificationId);
      return notification && !notification.read ? prev - 1 : prev;
    });
  };

  const handleNotificationClick = (notification: BookingNotification | any) => {
    markAsRead(notification);
    
    // Normalize notification data to handle both new and legacy structures
    const normalizedNotification = {
      ...notification,
      booking: notification.booking || notification.data?.booking,
      changeRequest: notification.changeRequest || notification.data?.changeRequest,
      changes: notification.changes || notification.data?.changes,
      restaurant: notification.restaurant || notification.data?.restaurant
    };
    
    setSelectedBooking(normalizedNotification);
    setIsBookingDialogOpen(true);
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
        setLiveNotifications(prev => 
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

  const getNotificationTitle = (notification: BookingNotification | any) => {
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

  const getNotificationMessage = (notification: BookingNotification | any) => {
    // Handle both new notification structure and legacy database notifications
    const type = notification.type;
    const booking = notification.booking || notification.data?.booking;
    const changeRequest = notification.changeRequest || notification.data?.changeRequest;
    const changes = notification.changes || notification.data?.changes;
    const approved = notification.approved;
    
    switch (type) {
      case 'new_booking':
        if (!booking?.customerName || !booking?.bookingDate) return 'New booking received';
        const newBookingId = booking.id || 'N/A';
        return `Booking #${newBookingId}: ${booking.customerName} booked for ${booking.guestCount || 0} guests on ${(() => {
          try {
            const date = new Date(booking.bookingDate);
            return isNaN(date.getTime()) ? 'TBD' : format(date, 'MMM dd');
          } catch {
            return 'TBD';
          }
        })()} at ${booking.startTime || 'TBD'}`;
      case 'booking_changed':
        const changedBookingId = booking?.id || 'N/A';
        if (!changes || Object.keys(changes).length === 0) {
          return `Booking #${changedBookingId}: ${booking?.customerName || 'Customer'} updated their booking`;
        }
        const changeDetails = Object.entries(changes).map(([key, change]) => {
          // Handle the actual change data structure from the database
          let changeValue = change;
          
          // If change is an object with from/to properties
          if (change && typeof change === 'object' && !Array.isArray(change)) {
            const changeObj = change as any;
            const from = changeObj.from || changeObj.oldValue || changeObj.old || changeObj.previous;
            const to = changeObj.to || changeObj.newValue || changeObj.new || changeObj.current;
            
            if (from !== undefined && to !== undefined) {
              // We have before/after values
              switch (key) {
                case 'bookingDate': 
                  try {
                    return `date from ${format(new Date(from), 'MMM dd')} to ${format(new Date(to), 'MMM dd')}`;
                  } catch {
                    return `booking date updated`;
                  }
                case 'startTime': 
                  return `time from ${from} to ${to}`;
                case 'guestCount': 
                  return `party size from ${from} to ${to} guests`;
                case 'tableId':
                  return `table from ${from || 'unassigned'} to ${to || 'unassigned'}`;
                case 'endTime':
                  return `end time from ${from || 'open'} to ${to || 'open'}`;
                case 'notes':
                  return `special notes updated`;
                default: 
                  return `${key} updated`;
              }
            } else {
              changeValue = to || from || change;
            }
          }
          
          // Handle simple value changes (current database format)
          switch (key) {
            case 'bookingDate': 
              try {
                const dateValue = String(changeValue);
                const date = new Date(dateValue);
                return isNaN(date.getTime()) ? 'booking date updated' : `date changed to ${format(date, 'MMM dd')}`;
              } catch {
                return `booking date updated`;
              }
            case 'startTime': 
              return `time changed to ${changeValue}`;
            case 'guestCount': 
              return `party size changed to ${changeValue} guests`;
            case 'tableId':
              return `table assigned to ${changeValue || 'unassigned'}`;
            case 'notes':
              return `special notes updated`;
            case 'endTime':
              return `end time changed to ${changeValue || 'open'}`;
            default: 
              return `${key} updated`;
          }
        }).filter(detail => detail).join(', ');
        return `Booking #${changedBookingId}: ${booking?.customerName || 'Customer'} changed ${changeDetails}`;
      case 'booking_cancelled':
        if (!booking?.customerName || !booking?.bookingDate) return 'Booking cancelled';
        const cancelledBookingId = booking.id || 'N/A';
        return `Booking #${cancelledBookingId}: ${booking.customerName} cancelled their ${(() => {
          try {
            const date = new Date(booking.bookingDate);
            return isNaN(date.getTime()) ? '' : format(date, 'MMM dd') + ' ';
          } catch {
            return '';
          }
        })()}reservation${booking.startTime ? ` at ${booking.startTime}` : ''}`;
      case 'booking_change_request':
        const requestBookingId = booking?.id || 'N/A';
        const requestedChanges = [];
        if (changeRequest?.requestedDate) {
          try {
            const date = new Date(changeRequest.requestedDate);
            if (!isNaN(date.getTime())) {
              requestedChanges.push(`date to ${format(date, 'MMM dd')}`);
            }
          } catch {
            // Skip if date is invalid
          }
        }
        if (changeRequest?.requestedTime) requestedChanges.push(`time to ${changeRequest.requestedTime}`);
        if (changeRequest?.requestedGuestCount) requestedChanges.push(`party size to ${changeRequest.requestedGuestCount} guests`);
        return `Booking #${requestBookingId}: ${booking?.customerName || 'Customer'} requests to change ${requestedChanges.join(', ') || 'booking details'}`;
      case 'change_request_responded':
        const responseBookingId = booking?.id || 'N/A';
        return `Booking #${responseBookingId}: Change request ${approved ? 'approved' : 'rejected'} for ${booking?.customerName || 'customer'}`;
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

  const pendingChangeRequests = allNotifications.filter(n => 
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
              {allNotifications.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p>No notifications yet</p>
                  <p className="text-sm">You'll see booking updates here</p>
                </div>
              ) : (
                allNotifications.filter(notification => notification && notification.id).map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 border-b border-gray-200 hover:bg-gray-50 ${
                      !notification.read ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                    } ${
                      notification.type === 'booking_change_request' && notification.changeRequest?.status === 'pending' 
                        ? 'bg-yellow-50 border-l-4 border-l-yellow-500' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-3">
                      {getNotificationIcon(
                        notification.type, 
                        notification.type === 'booking_change_request' && notification.changeRequest?.status === 'pending'
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <p className="text-sm font-medium text-gray-900 flex-1">
                            {getNotificationMessage(notification)}
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedBooking(notification);
                              setIsBookingDialogOpen(true);
                            }}
                            className="text-blue-600 border-blue-300 hover:bg-blue-50 flex items-center gap-1 text-xs px-2 py-1 h-auto"
                          >
                            <Eye className="h-3 w-3" />
                            View Details
                          </Button>
                        </div>
                        
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
                         notification.booking?.id &&
                         !processingRequests.has(notification.booking.id) && (
                          <div className="mt-3">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRevertChanges(notification.booking?.id, notification.originalData);
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
                        
                        {processingRequests.has(notification.changeRequest?.id || notification.booking?.id || 0) && (
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
                          {(notification.timestamp || notification.createdAt) ? 
                            format(new Date(notification.timestamp || notification.createdAt), 'MMM dd, HH:mm:ss') : 
                            'Just now'}
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

      {/* Booking Details Dialog */}
      <Dialog open={isBookingDialogOpen} onOpenChange={setIsBookingDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Booking Details
            </DialogTitle>
          </DialogHeader>
          
          {selectedBooking && (
            <div className="space-y-6">
              {/* Notification Type Badge */}
              <div className="flex items-center gap-2">
                {getNotificationIcon(selectedBooking.type, false)}
                <Badge variant={
                  selectedBooking.type === 'new_booking' ? 'default' :
                  selectedBooking.type === 'booking_changed' ? 'secondary' :
                  selectedBooking.type === 'booking_cancelled' ? 'destructive' :
                  selectedBooking.type === 'booking_change_request' ? 'outline' :
                  'default'
                }>
                  {getNotificationTitle(selectedBooking)}
                </Badge>
                <span className="text-sm text-gray-500">
                  {format(new Date(selectedBooking.timestamp || selectedBooking.createdAt), 'MMM dd, yyyy HH:mm')}
                </span>
              </div>

              {/* Customer Information */}
              {selectedBooking.booking && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Customer Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">{selectedBooking.booking.customerName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">{selectedBooking.booking.customerEmail}</span>
                    </div>
                    {selectedBooking.booking.customerPhone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{selectedBooking.booking.customerPhone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">{selectedBooking.booking?.guestCount || 1} guests</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Booking Details */}
              {selectedBooking.booking && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Booking Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">
                        {(() => {
                          try {
                            const date = selectedBooking.booking?.bookingDate ? new Date(selectedBooking.booking.bookingDate) : null;
                            if (!date || isNaN(date.getTime())) {
                              return 'Date not available';
                            }
                            return format(date, 'EEEE, MMM dd, yyyy');
                          } catch {
                            return 'Date not available';
                          }
                        })()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">
                        {selectedBooking.booking?.startTime || 'Time not specified'}
                        {selectedBooking.booking?.endTime && ` - ${selectedBooking.booking.endTime}`}
                      </span>
                    </div>
                    {selectedBooking.booking?.tableId && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">Table {selectedBooking.booking.tableId}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {selectedBooking.booking?.status || 'Pending'}
                      </Badge>
                    </div>
                  </div>
                  {selectedBooking.booking?.notes && (
                    <div className="mt-3 p-3 bg-white rounded border">
                      <p className="text-sm text-gray-600 mb-1">Notes:</p>
                      <p className="text-sm">{selectedBooking.booking.notes}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Change Details (for booking_changed notifications) */}
              {selectedBooking.type === 'booking_changed' && selectedBooking.changes && (
                <div className="bg-yellow-50 rounded-lg p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Changes Made by Customer
                  </h3>
                  <div className="space-y-2">
                    {Object.entries(selectedBooking.changes).map(([key, change]) => {
                      // Handle the actual change data structure from database
                      const changeObj = change as any;
                      const from = changeObj?.from || changeObj?.oldValue || changeObj?.old;
                      const to = changeObj?.to || changeObj?.newValue || changeObj?.new || change;
                      
                      const fieldName = key === 'bookingDate' ? 'Date' : 
                                       key === 'startTime' ? 'Time' : 
                                       key === 'endTime' ? 'End Time' :
                                       key === 'guestCount' ? 'Party Size' : 
                                       key === 'tableId' ? 'Table' :
                                       key === 'notes' ? 'Special Notes' : key;

                      return (
                        <div key={key} className="p-3 bg-white rounded border">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-sm">{fieldName}</span>
                            <Badge variant="outline" className="text-xs">Modified</Badge>
                          </div>
                          
                          {from !== undefined && to !== undefined && from !== to ? (
                            // Show before/after comparison when we have both values
                            <div className="flex items-center gap-2 text-sm">
                              <div className="flex-1 p-2 bg-red-50 rounded">
                                <span className="text-xs text-red-600 font-medium">Previous:</span>
                                <div className="text-red-700">
                                  {key === 'bookingDate' ? (
                                    (() => {
                                      try {
                                        const date = new Date(from);
                                        return isNaN(date.getTime()) ? from : format(date, 'MMM dd, yyyy');
                                      } catch {
                                        return from;
                                      }
                                    })()
                                  ) : String(from)}
                                </div>
                              </div>
                              <div className="text-gray-400">→</div>
                              <div className="flex-1 p-2 bg-green-50 rounded">
                                <span className="text-xs text-green-600 font-medium">New:</span>
                                <div className="text-green-700">
                                  {key === 'bookingDate' ? (
                                    (() => {
                                      try {
                                        const date = new Date(to);
                                        return isNaN(date.getTime()) ? to : format(date, 'MMM dd, yyyy');
                                      } catch {
                                        return to;
                                      }
                                    })()
                                  ) : String(to)}
                                </div>
                              </div>
                            </div>
                          ) : (
                            // Show only the new value when we don't have both
                            <div className="text-sm p-2 bg-green-50 rounded">
                              <span className="text-xs text-green-600 font-medium">Updated to:</span>
                              <div className="text-green-700">
                                {key === 'bookingDate' ? (
                                  (() => {
                                    try {
                                      const date = new Date(to || change);
                                      return isNaN(date.getTime()) ? (to || change) : format(date, 'MMM dd, yyyy');
                                    } catch {
                                      return to || change;
                                    }
                                  })()
                                ) : String(to || change)}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Timestamp when changes were made */}
                  <div className="mt-3 pt-3 border-t border-yellow-200">
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <Clock className="h-3 w-3" />
                      <span>
                        Modified {selectedBooking.timestamp ? 
                          format(new Date(selectedBooking.timestamp), 'MMM dd, yyyy at HH:mm') : 
                          'recently'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Change Request Details */}
              {selectedBooking.changeRequest && (
                <div className="bg-orange-50 rounded-lg p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Change Request
                  </h3>
                  <div className="space-y-2">
                    {formatChangeDetails(selectedBooking.changeRequest).map((change, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 bg-white rounded border">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{change}</span>
                      </div>
                    ))}
                    {selectedBooking.changeRequest.requestNotes && (
                      <div className="p-3 bg-white rounded border">
                        <p className="text-sm text-gray-600 mb-1">Customer Note:</p>
                        <p className="text-sm">{selectedBooking.changeRequest.requestNotes}</p>
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant={
                        selectedBooking.changeRequest.status === 'pending' ? 'outline' :
                        selectedBooking.changeRequest.status === 'approved' ? 'default' :
                        'destructive'
                      }>
                        {selectedBooking.changeRequest.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}

              {/* Complete Change History */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Complete Change History
                </h3>
                <div className="space-y-3">
                  {(() => {
                    // Get all notifications for this booking ID, sorted by timestamp
                    const bookingId = selectedBooking.booking?.id;
                    console.log('Debug - selectedBooking:', selectedBooking);
                    console.log('Debug - bookingId:', bookingId);
                    console.log('Debug - allNotifications:', allNotifications);
                    
                    if (!bookingId) {
                      return (
                        <div className="p-3 bg-white rounded border-l-4 border-gray-500">
                          <p className="text-sm text-gray-700">No booking history available (booking ID: {String(bookingId)})</p>
                          <p className="text-xs text-gray-500 mt-1">Debug: {JSON.stringify(selectedBooking.booking)}</p>
                        </div>
                      );
                    }

                    const allBookingNotifications = allNotifications
                      .filter(notif => notif.booking?.id === bookingId)
                      .sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());

                    const historyItems = [];

                    // Add all notification changes in chronological order (newest first)
                    allBookingNotifications.forEach((notif, index) => {
                      const isCurrentNotification = notif.id === selectedBooking.id;
                      const borderColor = isCurrentNotification ? 'border-blue-500' : 
                                         notif.type === 'booking_cancelled' ? 'border-red-500' :
                                         notif.type === 'booking_changed' ? 'border-orange-500' :
                                         'border-gray-500';
                      const titleColor = isCurrentNotification ? 'text-blue-700' : 
                                        notif.type === 'booking_cancelled' ? 'text-red-700' :
                                        notif.type === 'booking_changed' ? 'text-orange-700' :
                                        'text-gray-700';

                      historyItems.push(
                        <div key={notif.id} className={`p-3 bg-white rounded border-l-4 ${borderColor}`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-sm font-medium ${titleColor}`}>
                              {isCurrentNotification ? 'Latest Change' : 
                               notif.type === 'booking_cancelled' ? 'Booking Cancelled' :
                               notif.type === 'booking_changed' ? 'Booking Modified' :
                               'Notification'}
                              {index === 0 && !isCurrentNotification ? ' (Most Recent)' : ''}
                            </span>
                            <span className="text-xs text-gray-500">
                              {notif.timestamp ? 
                                format(new Date(notif.timestamp), 'MMM dd, HH:mm') : 
                                'Recently'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700">{getNotificationMessage(notif)}</p>
                          {notif.type === 'booking_cancelled' && notif.cancelledBy && (
                            <p className="text-xs text-gray-500 mt-1">
                              Cancelled by: {notif.cancelledBy}
                            </p>
                          )}
                          {notif.changeDetails && Object.keys(notif.changeDetails).length > 0 && (
                            <div className="mt-2 space-y-1">
                              {Object.entries(notif.changeDetails).map(([key, value]) => {
                                const change = value as any;
                                const from = change?.from;
                                const to = change?.to || change;
                                
                                return (
                                  <div key={key} className="text-xs bg-gray-50 p-2 rounded">
                                    <span className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').toLowerCase()}:</span>
                                    {from && to ? (
                                      <span className="ml-1">
                                        <span className="text-red-600">{String(from)}</span>
                                        <span className="mx-1">→</span>
                                        <span className="text-green-600">{String(to)}</span>
                                      </span>
                                    ) : (
                                      <span className="ml-1 text-green-600">{String(to || change)}</span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          {notif.reverted && (
                            <div className="mt-2 p-2 bg-yellow-50 rounded text-xs">
                              <span className="text-yellow-700 font-medium">Note:</span>
                              <span className="text-yellow-600 ml-1">This change was later reverted</span>
                            </div>
                          )}
                        </div>
                      );
                    });

                    // Add original booking creation at the end
                    historyItems.push(
                      <div key="creation" className="p-3 bg-white rounded border-l-4 border-green-500">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-green-700">Booking Created</span>
                          <span className="text-xs text-gray-500">
                            {(() => {
                              try {
                                const createdAt = selectedBooking.booking?.createdAt;
                                if (createdAt) {
                                  return format(new Date(createdAt), 'MMM dd, HH:mm');
                                }
                                return 'Initial booking';
                              } catch {
                                return 'Initial booking';
                              }
                            })()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700">
                          {selectedBooking.booking?.customerName || 'Customer'} made a reservation for {selectedBooking.booking?.guestCount || 1} guests
                          {(() => {
                            try {
                              const date = selectedBooking.booking?.bookingDate ? new Date(selectedBooking.booking.bookingDate) : null;
                              if (date && !isNaN(date.getTime())) {
                                return ` on ${format(date, 'MMM dd, yyyy')}${selectedBooking.booking?.startTime ? ` at ${selectedBooking.booking.startTime}` : ''}`;
                              }
                              return '';
                            } catch {
                              return '';
                            }
                          })()}
                        </p>
                      </div>
                    );

                    return historyItems;
                  })()}
                </div>
                
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <p className="text-xs text-gray-600">
                    This shows the complete timeline of changes made to booking #{selectedBooking.booking?.id || 'N/A'}
                  </p>
                </div>
              </div>

              {/* Restaurant Information */}
              {selectedBooking.restaurant && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Restaurant
                  </h3>
                  <p className="text-sm">{selectedBooking.restaurant.name}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}