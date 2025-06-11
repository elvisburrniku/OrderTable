import { useState, useEffect } from 'react';
import { useWebSocket } from '@/hooks/use-websocket';
import { useAuth } from '@/lib/auth';
import { useLocation } from 'wouter';
import { Bell, X, User, Calendar, Clock, Users, Phone, Mail, AlertTriangle, CheckCircle, XCircle, MessageSquare, Undo2, Eye, MapPin, ChevronDown, ChevronRight } from 'lucide-react';
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
  bookingId?: number;
  restaurantId: number;
  tenantId: number;
  title: string;
  message: string;
  data?: any; // JSON data containing booking details and changes
  originalData?: any;
  isRead?: boolean;
  isReverted?: boolean;
  canRevert?: boolean;
  revertedBy?: string;
  revertedAt?: string;
  createdAt?: string;
  timestamp?: string;
  
  // Legacy properties for backwards compatibility
  booking?: {
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
  approved?: boolean;
  restaurant?: {
    id: number;
    name?: string;
  };
  read?: boolean;
  reverted?: boolean;
  cancelledBy?: string;
}

export function RealTimeNotifications() {
  const { restaurant, user } = useAuth();
  const [, setLocation] = useLocation();
  const [liveNotifications, setLiveNotifications] = useState<BookingNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedBooking, setSelectedBooking] = useState<BookingNotification | null>(null);
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<string>('all'); // 'all', 'unread', 'high_priority'
  const [sortOrder, setSortOrder] = useState<'priority' | 'time'>('priority');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [processingRequests, setProcessingRequests] = useState<Set<number>>(new Set());

  // Enhanced notification grouping by booking type with sophisticated organization
  const groupNotificationsByType = (notifications: BookingNotification[]) => {
    const groups: Record<string, BookingNotification[]> = {
      // Critical Actions - Requires immediate attention
      'booking_change_request': [],
      
      // Active Operations - Current booking activities
      'new_booking': [],
      'booking_changed': [],
      
      // Responses & Follow-ups - Completed actions
      'change_request_responded': [],
      
      // Cancellations & Issues - Problem notifications
      'booking_cancelled': [],
      
      // General - Other notifications
      'other': []
    };

    // Categorize notifications by booking type
    notifications.forEach(notification => {
      if (notification && notification.type) {
        if (groups[notification.type]) {
          groups[notification.type].push(notification);
        } else {
          groups['other'].push(notification);
        }
      }
    });

    // Advanced sorting within each group
    Object.keys(groups).forEach(groupType => {
      groups[groupType].sort((a, b) => {
        // Priority 1: Unread notifications first
        if (a.isRead !== b.isRead) {
          return (a.isRead ? 1 : 0) - (b.isRead ? 1 : 0);
        }
        
        // Priority 2: Special handling for change requests (by urgency)
        if (groupType === 'booking_change_request') {
          const aUrgent = isUrgentChangeRequest(a);
          const bUrgent = isUrgentChangeRequest(b);
          if (aUrgent !== bUrgent) {
            return bUrgent ? 1 : -1;
          }
        }
        
        // Priority 3: Today's bookings first, then by proximity to booking date
        const aBookingDate = getBookingDate(a);
        const bBookingDate = getBookingDate(b);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (aBookingDate && bBookingDate) {
          const aIsToday = aBookingDate.getTime() === today.getTime();
          const bIsToday = bBookingDate.getTime() === today.getTime();
          
          if (aIsToday !== bIsToday) {
            return bIsToday ? 1 : -1;
          }
          
          // Sort by booking date proximity
          const aDiff = Math.abs(aBookingDate.getTime() - today.getTime());
          const bDiff = Math.abs(bBookingDate.getTime() - today.getTime());
          if (aDiff !== bDiff) {
            return aDiff - bDiff;
          }
        }
        
        // Priority 4: Creation time (newest first)
        const aTime = new Date(a.createdAt || a.timestamp || 0).getTime();
        const bTime = new Date(b.createdAt || b.timestamp || 0).getTime();
        return bTime - aTime;
      });
    });

    return groups;
  };

  // Helper function to determine if a change request is urgent
  const isUrgentChangeRequest = (notification: BookingNotification) => {
    const bookingDate = getBookingDate(notification);
    if (!bookingDate) return false;
    
    const now = new Date();
    const timeDiff = bookingDate.getTime() - now.getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    
    // Urgent if booking is within 24 hours
    return hoursDiff <= 24 && hoursDiff >= 0;
  };

  // Helper function to extract booking date from notification
  const getBookingDate = (notification: BookingNotification): Date | null => {
    try {
      const booking = notification.booking || notification.data?.booking;
      if (booking?.bookingDate) {
        return new Date(booking.bookingDate);
      }
      
      const changeRequest = notification.changeRequest || notification.data?.changeRequest;
      if (changeRequest?.requestedDate) {
        return new Date(changeRequest.requestedDate);
      }
      
      return null;
    } catch {
      return null;
    }
  };

  // Helper function to get group icon based on notification type
  const getGroupIcon = (type: string) => {
    switch (type) {
      case 'new_booking':
        return Calendar;
      case 'booking_changed':
        return Clock;
      case 'booking_cancelled':
        return XCircle;
      case 'booking_change_request':
        return MessageSquare;
      case 'change_request_responded':
        return CheckCircle;
      default:
        return Bell;
    }
  };

  // Helper function to get group display name
  const getGroupDisplayName = (type: string) => {
    switch (type) {
      case 'new_booking':
        return 'New Bookings';
      case 'booking_changed':
        return 'Booking Changes';
      case 'booking_cancelled':
        return 'Cancellations';
      case 'booking_change_request':
        return 'Change Requests';
      case 'change_request_responded':
        return 'Request Responses';
      default:
        return 'Other Notifications';
    }
  };

  // Helper function to get group icon color
  const getGroupIconColor = (type: string) => {
    switch (type) {
      case 'new_booking':
        return 'text-green-600 border-green-200 bg-green-50';
      case 'booking_changed':
        return 'text-blue-600 border-blue-200 bg-blue-50';
      case 'booking_cancelled':
        return 'text-red-600 border-red-200 bg-red-50';
      case 'booking_change_request':
        return 'text-orange-600 border-orange-200 bg-orange-50';
      case 'change_request_responded':
        return 'text-purple-600 border-purple-200 bg-purple-50';
      default:
        return 'text-gray-600 border-gray-200 bg-gray-50';
    }
  };

  // Filter notifications based on selected filter type
  const filterNotifications = (notifications: BookingNotification[]) => {
    switch (filterType) {
      case 'unread':
        return notifications.filter(n => !n.isRead);
      case 'high_priority':
        return notifications.filter(n => {
          const priority = getGroupPriority(n.type);
          return priority.level === 'HIGH' || n.type === 'booking_change_request';
        });
      case 'urgent':
        return notifications.filter(n => 
          n.type === 'booking_change_request' && 
          n.changeRequest?.status === 'pending'
        );
      default:
        return notifications;
    }
  };



  const getGroupPriority = (type: string) => {
    switch (type) {
      case 'booking_change_request': return { level: 'HIGH', badge: 'Action Required' };
      case 'new_booking': return { level: 'MEDIUM', badge: 'New Booking' };
      case 'booking_changed': return { level: 'MEDIUM', badge: 'Updated' };
      case 'change_request_responded': return { level: 'LOW', badge: 'Resolved' };
      case 'booking_cancelled': return { level: 'HIGH', badge: 'Cancelled' };
      case 'other': return { level: 'LOW', badge: 'General' };
      default: return { level: 'LOW', badge: 'General' };
    }
  };



  const getGroupDescription = (type: string, count: number) => {
    switch (type) {
      case 'booking_change_request': 
        return count === 1 ? 'Customer request requiring approval' : `${count} customer requests requiring approval`;
      case 'new_booking': 
        return count === 1 ? 'New reservation received' : `${count} new reservations received`;
      case 'booking_changed': 
        return count === 1 ? 'Booking modification made' : `${count} booking modifications made`;
      case 'change_request_responded': 
        return count === 1 ? 'Request processed and completed' : `${count} requests processed and completed`;
      case 'booking_cancelled': 
        return count === 1 ? 'Reservation cancelled' : `${count} reservations cancelled`;
      case 'other': 
        return count === 1 ? 'General notification' : `${count} general notifications`;
      default: 
        return count === 1 ? 'Notification' : `${count} notifications`;
    }
  };

  const getPriorityBadgeColor = (level: string) => {
    switch (level) {
      case 'HIGH': return 'bg-red-500 text-white';
      case 'MEDIUM': return 'bg-yellow-500 text-white';
      case 'LOW': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const toggleGroupCollapse = (groupType: string) => {
    const newCollapsed = new Set(collapsedGroups);
    if (newCollapsed.has(groupType)) {
      newCollapsed.delete(groupType);
    } else {
      newCollapsed.add(groupType);
    }
    setCollapsedGroups(newCollapsed);
  };

  const collapseAllGroups = () => {
    const groupedNotifications = groupNotificationsByType(
      allNotifications.filter(notification => notification && notification.id)
    );
    const allGroupTypes = Object.keys(groupedNotifications).filter(
      type => groupedNotifications[type].length > 0
    );
    setCollapsedGroups(new Set(allGroupTypes));
  };

  const expandAllGroups = () => {
    setCollapsedGroups(new Set());
  };

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

  // Update unread count when persistent notifications change
  useEffect(() => {
    if (persistentNotifications) {
      const unreadPersistent = persistentNotifications.filter((n: any) => !n.isRead).length;
      const unreadLive = liveNotifications.filter((n: any) => !n.read).length;
      setUnreadCount(unreadPersistent + unreadLive);
    }
  }, [persistentNotifications, liveNotifications]);

  // Mark notification as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: number) => apiRequest(
      `/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/notifications/${notificationId}/read`,
      'PATCH'
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tenants', restaurant?.tenantId, 'restaurants', restaurant?.id, 'notifications'] });
    },
  });

  // Mark all notifications as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: () => {
      console.log('Making mark all as read request to:', `/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/notifications/mark-all-read`);
      return apiRequest(
        `/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/notifications/mark-all-read`,
        'PATCH'
      );
    },
    onSuccess: (data) => {
      console.log('Mark all as read successful:', data);
      queryClient.invalidateQueries({ queryKey: ['/api/tenants', restaurant?.tenantId, 'restaurants', restaurant?.id, 'notifications'] });
      setUnreadCount(0);
    },
    onError: (error) => {
      console.error('Mark all as read failed:', error);
      toast({ 
        title: "Failed to mark notifications as read", 
        description: "Please try again", 
        variant: "destructive" 
      });
    },
  });

  // Revert notification mutation (admin only)
  const revertNotificationMutation = useMutation({
    mutationFn: (notificationId: number) => apiRequest(
      `/api/notifications/${notificationId}/revert`,
      'POST'
    ),
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
      // Skip if already read
      if (notification.isRead) {
        return;
      }
      
      // Persistent notification - update database and optimistically update UI
      markAsReadMutation.mutate(notification.id);
      
      // Optimistically update the local state
      queryClient.setQueryData(
        ['/api/tenants', restaurant?.tenantId, 'restaurants', restaurant?.id, 'notifications'],
        (oldData: any) => {
          if (!oldData) return oldData;
          return oldData.map((notif: any) => 
            notif.id === notification.id ? { ...notif, isRead: true, read: true } : notif
          );
        }
      );
      
      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
    } else {
      // Live notification
      setLiveNotifications(prev => 
        prev.map(notif => 
          notif.id === notification.id ? { ...notif, read: true } : notif
        )
      );
      if (!notification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    }
  };

  const markAllAsRead = () => {
    console.log('markAllAsRead called, unreadCount:', unreadCount);
    console.log('persistentNotifications:', persistentNotifications?.length || 0);
    console.log('liveNotifications:', liveNotifications.length);
    console.log('restaurant:', restaurant?.id, restaurant?.tenantId);
    
    if (!restaurant?.id || !restaurant?.tenantId) {
      console.error('Missing restaurant data');
      toast({ 
        title: "Error", 
        description: "Restaurant information missing", 
        variant: "destructive" 
      });
      return;
    }
    
    // Mark all persistent notifications as read via API
    markAllAsReadMutation.mutate();
    
    // Mark all live notifications as read locally
    setLiveNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
    
    // Optimistically update persistent notifications in the cache
    queryClient.setQueryData(
      ['/api/tenants', restaurant?.tenantId, 'restaurants', restaurant?.id, 'notifications'],
      (oldData: any) => {
        if (!oldData) return oldData;
        return oldData.map((notif: any) => ({ ...notif, isRead: true, read: true }));
      }
    );
    
    // Immediately update unread count
    setUnreadCount(0);
  };

  const revertNotification = (notification: any) => {
    if (typeof notification.id === 'number' && (user as any)?.role === 'admin') {
      revertNotificationMutation.mutate(notification.id);
    }
  };

  // Delete notification mutation
  const deleteNotificationMutation = useMutation({
    mutationFn: (notificationId: number) => apiRequest(
      `/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/notifications/${notificationId}`,
      'DELETE'
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tenants', restaurant?.tenantId, 'restaurants', restaurant?.id, 'notifications'] });
      toast({ 
        title: "Notification removed", 
        description: "The notification has been deleted successfully" 
      });
    },
    onError: (error) => {
      console.error('Delete notification failed:', error);
      toast({ 
        title: "Failed to remove notification", 
        description: "Please try again", 
        variant: "destructive" 
      });
    },
  });

  const removeNotification = (notificationId: string | number) => {
    // Check if it's a live notification (string ID) or persistent notification (number ID)
    const liveNotification = liveNotifications.find((n: any) => n.id === notificationId);
    const persistentNotification = persistentNotifications.find((n: any) => n.id === notificationId);
    
    if (liveNotification) {
      // Remove live notification locally
      setLiveNotifications(prev => prev.filter(notif => notif.id !== notificationId));
      setUnreadCount(prev => {
        return liveNotification && !liveNotification.read ? prev - 1 : prev;
      });
    } else if (persistentNotification && typeof notificationId === 'number') {
      // Remove persistent notification via API
      deleteNotificationMutation.mutate(notificationId);
      
      // Optimistically update the cache
      queryClient.setQueryData(
        ['/api/tenants', restaurant?.tenantId, 'restaurants', restaurant?.id, 'notifications'],
        (oldData: any) => {
          if (!oldData) return oldData;
          const filtered = oldData.filter((notif: any) => notif.id !== notificationId);
          return filtered;
        }
      );
      
      // Update unread count if it was unread
      if (!persistentNotification.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    }
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
        setLiveNotifications(prev => 
          prev.map((n: any) => 
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
          prev.map((n: any) => 
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
        <Card className="absolute right-0 top-12 w-[450px] h-[calc(100vh-5rem)] overflow-hidden z-50 shadow-lg flex flex-col">
          <CardHeader className="pb-2 flex-shrink-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">Notifications</CardTitle>
                {pendingChangeRequests.length > 0 && (
                  <Badge variant="destructive" className="animate-pulse">{pendingChangeRequests.length} pending</Badge>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* Summary and Controls */}
            <div className="flex items-center justify-between text-sm text-gray-600 border-b border-gray-200 pb-2">
              <div className="flex items-center gap-4">
                <span>{allNotifications.length} total</span>
                {unreadCount > 0 && (
                  <span className="text-red-600 font-medium">{unreadCount} unread</span>
                )}
              </div>
              <div className="flex items-center space-x-1">
                {/* Filter Controls */}
                <select 
                  value={filterType} 
                  onChange={(e) => setFilterType(e.target.value)}
                  className="text-xs h-7 px-2 border border-gray-300 rounded-md bg-white"
                >
                  <option value="all">All</option>
                  <option value="unread">Unread</option>
                  <option value="high_priority">High Priority</option>
                  <option value="urgent">Urgent Actions</option>
                </select>
                
                {unreadCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs h-7 px-2">
                    Mark all read
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={expandAllGroups} className="text-xs h-7 px-2">
                  Expand all
                </Button>
                <Button variant="ghost" size="sm" onClick={collapseAllGroups} className="text-xs h-7 px-2">
                  Collapse all
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-0 flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto">
              {allNotifications.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p>No notifications yet</p>
                  <p className="text-sm">You'll see booking updates here</p>
                </div>
              ) : (
                Object.entries(groupNotificationsByType(
                  filterNotifications(allNotifications.filter(notification => notification && notification.id))
                )).map(([groupType, notifications]) => {
                  if (notifications.length === 0) return null;
                  
                  const isCollapsed = collapsedGroups.has(groupType);
                  const GroupIconComponent = getGroupIcon(groupType);
                  const unreadInGroup = notifications.filter((n: any) => !n.isRead).length;
                  
                  return (
                    <div key={groupType} className="border-b border-gray-100">
                      {/* Enhanced Group Header */}
                      <div
                        className={`flex items-center justify-between p-4 hover:bg-opacity-75 cursor-pointer border-l-4 transition-all duration-200 ${getGroupIconColor(groupType as any)}`}
                        onClick={() => toggleGroupCollapse(groupType)}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <div className="flex items-center gap-2">
                            {isCollapsed ? (
                              <ChevronRight className="h-4 w-4 text-gray-500" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-gray-500" />
                            )}
                            <GroupIconComponent className={`h-5 w-5 ${getGroupIconColor(groupType)}`} />
                          </div>
                          
                          <div className="flex flex-col gap-1 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-800">
                                {getGroupDisplayName(groupType as any)}
                              </span>
                              <span className="text-sm text-gray-500">
                                ({notifications.length})
                              </span>
                              {(() => {
                                const priority = getGroupPriority(groupType);
                                return (
                                  <Badge className={`text-xs px-2 py-0.5 ${getPriorityBadgeColor(priority.level)}`}>
                                    {priority.badge}
                                  </Badge>
                                );
                              })()}
                              
                              {/* Urgency indicator for time-sensitive groups */}
                              {groupType === 'booking_change_request' && (() => {
                                const urgentCount = notifications.filter((n: any) => isUrgentChangeRequest(n)).length;
                                return urgentCount > 0 ? (
                                  <Badge className="text-xs px-2 py-0.5 bg-red-600 text-white animate-pulse">
                                    {urgentCount} urgent
                                  </Badge>
                                ) : null;
                              })()}
                              
                              {/* Today's bookings indicator */}
                              {(groupType === 'new_booking' || groupType === 'booking_changed') && (() => {
                                const todayCount = notifications.filter((n: any) => {
                                  const bookingDate = getBookingDate(n);
                                  if (!bookingDate) return false;
                                  const today = new Date();
                                  today.setHours(0, 0, 0, 0);
                                  return bookingDate.getTime() === today.getTime();
                                }).length;
                                return todayCount > 0 ? (
                                  <Badge className="text-xs px-2 py-0.5 bg-blue-600 text-white">
                                    {todayCount} today
                                  </Badge>
                                ) : null;
                              })()}
                            </div>
                            
                            <p className="text-xs text-gray-600">
                              {getGroupDescription(groupType, notifications.length)}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs bg-white/70">
                            {notifications.length}
                          </Badge>
                          {unreadInGroup > 0 && (
                            <Badge variant="destructive" className="text-xs animate-pulse">
                              {unreadInGroup} new
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {groupType === 'booking_change_request' && notifications.some(n => n.changeRequest?.status === 'pending') && (
                            <Badge variant="outline" className="text-xs border-yellow-300 text-yellow-700 bg-yellow-100 animate-pulse">
                              Action Required
                            </Badge>
                          )}
                          {(() => {
                            const priority = getGroupPriority(groupType);
                            if (priority.level === 'HIGH') {
                              return (
                                <div className="flex items-center gap-1">
                                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                  <span className="text-xs text-red-600 font-medium">High Priority</span>
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </div>
                      
                      {/* Group Content */}
                      {!isCollapsed && (
                        <div>
                          {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 border-b border-gray-200 hover:bg-gray-50 cursor-pointer ${
                      !notification.isRead ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
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
                              markAsRead(notification);
                              
                              // Extract booking ID from notification
                              const bookingId = notification.bookingId || 
                                               notification.booking?.id || 
                                               notification.data?.booking?.id ||
                                               notification.data?.bookingId;
                              
                              if (bookingId && restaurant?.tenantId) {
                                // Navigate to booking detail page with tenant ID
                                setLocation(`/${restaurant.tenantId}/bookings/${bookingId}`);
                                setIsOpen(false); // Close notification panel
                              } else {
                                // Fallback to dialog if no booking ID found
                                setSelectedBooking(notification);
                                setIsBookingDialogOpen(true);
                              }
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
                                handleRevertChanges(notification.booking?.id!, notification.originalData);
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
                            format(new Date(notification.timestamp || notification.createdAt || new Date()), 'MMM dd, HH:mm:ss') : 
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
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  }).filter(Boolean)
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Booking Details Dialog */}
      <Dialog open={isBookingDialogOpen} onOpenChange={setIsBookingDialogOpen}>
        <DialogContent className="max-w-full w-screen h-screen m-0 rounded-none overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0 border-b border-gray-200 pb-4">
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Booking Details
            </DialogTitle>
          </DialogHeader>
          
          {selectedBooking && (() => {
            // Extract booking ID for use throughout the dialog
            const bookingId = selectedBooking.bookingId || 
                             selectedBooking.booking?.id || 
                             selectedBooking.data?.booking?.id ||
                             selectedBooking.data?.bookingId;
            
            return (
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-6 max-w-4xl mx-auto">
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
                  {format(new Date(selectedBooking.timestamp || selectedBooking.createdAt || new Date()), 'MMM dd, yyyy HH:mm')}
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
                    if (!bookingId) {
                      return (
                        <div className="p-3 bg-white rounded border-l-4 border-gray-500">
                          <p className="text-sm text-gray-700">No booking history available</p>
                        </div>
                      );
                    }

                    const allBookingNotifications = allNotifications
                      .filter(notif => 
                        notif.bookingId === bookingId || 
                        notif.booking?.id === bookingId || 
                        notif.data?.booking?.id === bookingId ||
                        notif.data?.bookingId === bookingId
                      )
                      .sort((a, b) => new Date(b.timestamp || b.createdAt || 0).getTime() - new Date(a.timestamp || a.createdAt || 0).getTime());

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
                          {(() => {
                            // Get change details from multiple possible locations
                            const changeDetails = notif.changeDetails || notif.data?.changes || notif.changes;
                            return changeDetails && Object.keys(changeDetails).length > 0 && (
                              <div className="mt-2 space-y-1">
                                {Object.entries(changeDetails).map(([key, value]) => {
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
                            );
                          })()}
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
                    This shows the complete timeline of changes made to booking #{bookingId || 'N/A'}
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
            </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}