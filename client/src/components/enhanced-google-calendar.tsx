import { useState, useMemo, useCallback, useRef, memo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/lib/auth";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/hooks/use-websocket";
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isToday,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  addDays,
  startOfDay,
  parseISO,
  getHours,
  getMinutes,
  setHours,
  setMinutes,
  isSameMonth,
  isWeekend,
  addMinutes,
  parse,
  differenceInMinutes,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar,
  Clock,
  Users,
  Settings,
  Grid,
  List,
} from "lucide-react";
import { Booking, Table as TableType } from "@shared/schema";
import DynamicBookingForm from "@/components/dynamic-booking-form";
import { useSettings } from "@/hooks/use-settings";
import { useDate } from "@/contexts/date-context";

interface EnhancedGoogleCalendarProps {
  selectedDate: Date;
  bookings: Booking[];
  allBookings?: Booking[];
  tables: TableType[];
  isLoading: boolean;
  onDateSelect: (date: Date) => void;
}

type ViewType = "day" | "week" | "month";

interface DraggedBooking {
  booking: Booking;
  dragStart: { x: number; y: number };
  initialDate: Date;
  initialTime: string;
}

export default function EnhancedGoogleCalendar({
  selectedDate,
  bookings,
  allBookings = [],
  tables,
  isLoading,
  onDateSelect,
}: EnhancedGoogleCalendarProps) {
  const { restaurant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { generalSettings } = useSettings();

  const [view, setView] = useState<ViewType>("week");
  const [currentDate, setCurrentDate] = useState(selectedDate);
  const [isNewBookingOpen, setIsNewBookingOpen] = useState(false);
  const [isEditBookingOpen, setIsEditBookingOpen] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<{
    date: Date;
    time: string;
  } | null>(null);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedBooking, setDraggedBooking] = useState<{
    booking: Booking;
    offset: { x: number; y: number };
  } | null>(null);

  const calendarRef = useRef<HTMLDivElement>(null);
  const dragStartTime = useRef<number>(0);
  const dragStartPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const clickTimeout = useRef<NodeJS.Timeout | null>(null);

  // Current time indicator state
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every second for real-time movement
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000); // Update every second

    return () => clearInterval(timer);
  }, []);

  // WebSocket integration for real-time updates
  const { isConnected } = useWebSocket({
    restaurantId: restaurant?.id || 0,
    onMessage: (message) => {
      if (message.type === 'notification' && message.data?.type === 'payment_received') {
        // Payment received notification - refresh bookings
        console.log('Payment received notification - refreshing calendar');
        queryClient.invalidateQueries({
          queryKey: [`/api/tenants/${restaurant?.tenantId}/bookings`]
        });
        
        // Show toast notification
        toast({
          title: "Payment Received",
          description: `Payment received for ${message.data.data?.customerName || 'booking'}`,
        });
      } else if (message.type === 'booking_updated' || message.type === 'booking_created') {
        // Other booking updates - refresh bookings
        console.log('Booking update notification - refreshing calendar');
        queryClient.invalidateQueries({
          queryKey: [`/api/tenants/${restaurant?.tenantId}/bookings`]
        });
      }
    }
  });

  // Fetch opening hours
  const { data: openingHours = [] } = useQuery({
    queryKey: ["openingHours", restaurant?.id, restaurant?.tenantId],
    queryFn: async () => {
      if (!restaurant?.id || !restaurant?.tenantId) return [];
      const response = await fetch(
        `/api/tenants/${restaurant.tenantId}/restaurants/${restaurant.id}/opening-hours`,
      );
      if (!response.ok) throw new Error("Failed to fetch opening hours");
      return response.json();
    },
    enabled: !!restaurant?.id && !!restaurant?.tenantId,
  });

  const [newBooking, setNewBooking] = useState({
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    guestCount: 2,
    specialRequests: "",
    startTime: "",
    endTime: "",
    duration: generalSettings?.defaultBookingDuration ?? 60,
    eventType: "general", // general, birthday, anniversary, business, etc.
    internalNotes: "",
    extraDescription: "",
    tags: [] as string[],
    requiresPayment: false,
    paymentAmount: 0,
    paymentDeadlineHours: 24,
    language: "en",
    attachments: [] as File[],
  });

  // Helper function to get opening hours for a specific date
  const getOpeningHoursForDate = useCallback(
    (date: Date) => {
      if (!openingHours || !Array.isArray(openingHours)) return null;
      const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
      return openingHours.find((h) => h.dayOfWeek === dayOfWeek);
    },
    [openingHours],
  );

  // Time slots for the calendar based on opening hours
  const timeSlots = useMemo(() => {
    const slots = [];

    // Find the earliest opening time and latest closing time across all days
    let earliestOpen = 24;
    let latestClose = 0;

    if (openingHours && Array.isArray(openingHours)) {
      openingHours.forEach((hours) => {
        if (hours.isOpen && hours.openTime && hours.closeTime) {
          const openHour = parseInt(hours.openTime.split(":")[0]);
          const closeHour = parseInt(hours.closeTime.split(":")[0]);

          earliestOpen = Math.min(earliestOpen, openHour);
          latestClose = Math.max(latestClose, closeHour);
        }
      });
    }

    // Fallback to default hours if no opening hours are set
    if (earliestOpen === 24 || latestClose === 0) {
      earliestOpen = 9;
      latestClose = 22;
    }

    // Add 1 hour buffer before and after for flexibility
    const startHour = Math.max(6, earliestOpen - 1);
    const endHour = Math.min(23, latestClose + 1);

    // Generate 15-minute intervals within the working hours range
    for (let hour = startHour; hour <= endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const time = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
        slots.push(time);
      }
    }
    return slots;
  }, [openingHours]);

  // Check if a time slot contains the current time
  const isCurrentTimeSlot = useCallback(
    (timeSlot: string) => {
      if (!timeSlot || typeof timeSlot !== "string") return false;

      const now = currentTime;
      if (!now || !(now instanceof Date)) return false;

      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      const timeParts = timeSlot.split(":");
      if (timeParts.length !== 2) return false;

      const [slotHour, slotMinute] = timeParts.map(Number);

      if (isNaN(slotHour) || isNaN(slotMinute)) return false;

      // Check if current time falls within this 15-minute slot
      return (
        currentHour === slotHour &&
        currentMinute >= slotMinute &&
        currentMinute < slotMinute + 15
      );
    },
    [currentTime],
  );

  // Check if a time slot is within opening hours for a specific date
  const isTimeSlotOpen = useCallback(
    (date: Date, timeSlot: string) => {
      const dayHours = getOpeningHoursForDate(date);
      if (!dayHours || !dayHours.isOpen) return false;

      const openTime = dayHours.openTime || "09:00";
      const closeTime = dayHours.closeTime || "22:00";

      return timeSlot >= openTime && timeSlot <= closeTime;
    },
    [getOpeningHoursForDate],
  );

  // Get visible dates based on view
  const visibleDates = useMemo(() => {
    switch (view) {
      case "day":
        return [currentDate];
      case "week":
        return eachDayOfInterval({
          start: startOfWeek(currentDate, { weekStartsOn: 0 }),
          end: endOfWeek(currentDate, { weekStartsOn: 0 }),
        });
      case "month":
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);
        const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
        const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
        return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
      default:
        return [];
    }
  }, [view, currentDate]);

  // Navigation functions
  const navigatePrevious = useCallback(() => {
    switch (view) {
      case "day":
        setCurrentDate((prev) => addDays(prev, -1));
        break;
      case "week":
        setCurrentDate((prev) => addWeeks(prev, -1));
        break;
      case "month":
        setCurrentDate((prev) => addMonths(prev, -1));
        break;
    }
  }, [view]);

  const navigateNext = useCallback(() => {
    switch (view) {
      case "day":
        setCurrentDate((prev) => addDays(prev, 1));
        break;
      case "week":
        setCurrentDate((prev) => addWeeks(prev, 1));
        break;
      case "month":
        setCurrentDate((prev) => addMonths(prev, 1));
        break;
    }
  }, [view]);

  const navigateToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  // Memoized booking calculations for performance
  const bookingsByDate = useMemo(() => {
    const grouped = new Map<string, Booking[]>();
    allBookings.forEach((booking) => {
      const dateKey = format(new Date(booking.bookingDate), "yyyy-MM-dd");
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey)!.push(booking);
    });
    return grouped;
  }, [allBookings]);

  const bookingsByTimeSlot = useMemo(() => {
    const grouped = new Map<string, Booking[]>();

    allBookings.forEach((booking) => {
      if (!booking.startTime) return;

      const dateKey = format(new Date(booking.bookingDate), "yyyy-MM-dd");

      // Convert booking time to minutes to find the correct slot
      const [hours, minutes] = booking.startTime.split(":").map(Number);
      const bookingMinutes = hours * 60 + minutes;

      // Find the appropriate time slot (round down to nearest 30-minute interval)
      const slotHour = Math.floor(bookingMinutes / 60);
      const slotMinute = Math.floor((bookingMinutes % 60) / 30) * 30;
      const assignedSlot = `${slotHour.toString().padStart(2, "0")}:${slotMinute.toString().padStart(2, "0")}`;

      // Only assign to slots that exist in timeSlots array
      if (timeSlots.includes(assignedSlot)) {
        const timeKey = `${dateKey}-${assignedSlot}`;
        if (!grouped.has(timeKey)) {
          grouped.set(timeKey, []);
        }
        grouped.get(timeKey)!.push(booking);
      }
    });

    return grouped;
  }, [allBookings, timeSlots]);

  const totalCapacity = useMemo(() => {
    return tables.reduce((sum, table) => sum + table.capacity, 0);
  }, [tables]);

  // Get bookings for a specific date and time slot
  const getBookingsForSlot = useCallback(
    (date: Date, timeSlot?: string) => {
      const dateKey = format(date, "yyyy-MM-dd");

      if (timeSlot) {
        const timeKey = `${dateKey}-${timeSlot}`;
        return bookingsByTimeSlot.get(timeKey) || [];
      }

      return bookingsByDate.get(dateKey) || [];
    },
    [bookingsByDate, bookingsByTimeSlot],
  );

  // Calculate availability level for a time slot
  const getAvailabilityLevel = useCallback(
    (date: Date, timeSlot?: string) => {
      // First check if the restaurant is open at this time
      if (timeSlot && !isTimeSlotOpen(date, timeSlot)) {
        return "closed";
      }

      const slotBookings = getBookingsForSlot(date, timeSlot);
      const bookedCapacity = slotBookings.reduce(
        (sum, booking) => sum + booking.guestCount,
        0,
      );

      if (totalCapacity === 0) return "unavailable";

      const availabilityRatio =
        (totalCapacity - bookedCapacity) / totalCapacity;

      if (availabilityRatio >= 0.7) return "high"; // 70%+ available
      if (availabilityRatio >= 0.3) return "medium"; // 30-70% available
      if (availabilityRatio > 0) return "low"; // 1-30% available
      return "full"; // 0% available
    },
    [getBookingsForSlot, totalCapacity, isTimeSlotOpen],
  );

  // Get availability color classes
  const getAvailabilityColor = (level: string) => {
    switch (level) {
      case "high":
        return "bg-green-50 border-l-4 border-green-400";
      case "medium":
        return "bg-yellow-50 border-l-4 border-yellow-400";
      case "low":
        return "bg-orange-50 border-l-4 border-orange-400";
      case "full":
        return "bg-red-100 border-l-4 border-red-500";
      case "closed":
        return "bg-gray-100 border-l-4 border-gray-400 opacity-50";
      default:
        return "bg-gray-50 border-l-4 border-gray-300";
    }
  };

  // Check if a table is conflicted at a specific time slot
  const getTableConflictStatus = useCallback(
    (tableId: number, date: Date, timeSlot: string) => {
      const slotBookings = getBookingsForSlot(date, timeSlot);
      const tableBookings = slotBookings.filter(
        (booking) => booking.tableId === tableId,
      );
      return tableBookings.length > 1; // More than one booking = conflict
    },
    [getBookingsForSlot],
  );

  // Get conflict styling for booking cards
  const getBookingCardStyle = useCallback(
    (booking: Booking, date: Date, timeSlot: string) => {
      // Check if booking is cancelled
      if (booking.status === "cancelled") {
        return "bg-gray-200 text-gray-500 border-l-4 border-gray-400 opacity-60 cursor-default";
      }

      // Check if booking is no-show
      if (booking.status === "no-show") {
        return "bg-red-100 text-red-700 border-l-4 border-red-300 opacity-70 cursor-default";
      }

      if (!booking.tableId)
        return "bg-blue-100 text-blue-800 border-l-4 border-blue-400";

      const hasConflict = getTableConflictStatus(
        booking.tableId,
        date,
        timeSlot,
      );

      if (hasConflict) {
        return "bg-red-200 text-red-900 border-l-4 border-red-600 ring-2 ring-red-300";
      }

      return "bg-blue-100 text-blue-800 border-l-4 border-blue-400";
    },
    [getTableConflictStatus],
  );

  // Get availability indicator dot
  const getAvailabilityDot = (level: string) => {
    if (!level) return "w-2 h-2 bg-gray-300 rounded-full";
    switch (level) {
      case "high":
        return "w-2 h-2 bg-green-400 rounded-full";
      case "medium":
        return "w-2 h-2 bg-yellow-400 rounded-full";
      case "low":
        return "w-2 h-2 bg-orange-400 rounded-full";
      case "full":
        return "w-2 h-2 bg-red-400 rounded-full";
      case "closed":
        return "w-2 h-2 bg-gray-400 rounded-full opacity-50";
      default:
        return "w-2 h-2 bg-gray-300 rounded-full";
    }
  };

  // Get availability text for tooltips
  const getAvailabilityText = (level: string) => {
    if (!level || typeof level !== "string") return "Availability unknown";
    switch (level) {
      case "high":
        return "High availability - Good time to book";
      case "medium":
        return "Moderate availability - Some tables available";
      case "low":
        return "Low availability - Few tables remaining";
      case "full":
        return "Fully booked - No tables available";
      case "closed":
        return "Restaurant closed - No bookings available";
      default:
        return "Availability unknown";
    }
  };

  // Update booking mutation
  const updateBookingMutation = useMutation({
    mutationFn: async ({
      bookingId,
      newDate,
      newTime,
    }: {
      bookingId: number;
      newDate: string;
      newTime: string;
    }) => {
      const response = await apiRequest(
        "PUT",
        `/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/bookings/${bookingId}`,
        {
          bookingDate: newDate,
          startTime: newTime,
        },
      );
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [
          `/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/bookings`,
        ],
      });
      toast({
        title: "Booking Updated",
        description: "Booking has been moved successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update booking",
        variant: "destructive",
      });
    },
  });

  // Edit booking mutation
  const editBookingMutation = useMutation({
    mutationFn: async (updatedData: Partial<Booking>) => {
      if (!editingBooking) throw new Error("No booking selected for editing");
      const response = await apiRequest(
        "PUT",
        `/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/bookings/${editingBooking.id}`,
        updatedData,
      );
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [
          `/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/bookings`,
        ],
      });
      setIsEditBookingOpen(false);
      setEditingBooking(null);
      toast({
        title: "Booking Updated",
        description: "Booking has been updated successfully.",
      });
    },
    onError: (error: any) => {
      console.error("Update booking error:", error);

      // Try to parse the error message to extract the actual conflict message
      let errorMessage = "Failed to update booking";

      if (error.message) {
        try {
          // Check if the error message contains JSON (like "400: {"message":"..."}")
          const match = error.message.match(/400:\s*({.*})/);
          if (match) {
            const jsonError = JSON.parse(match[1]);
            errorMessage = jsonError.message || errorMessage;
          } else {
            // If it's a simple error message, use it directly
            errorMessage = error.message;
          }
        } catch (parseError) {
          // If parsing fails, use the original error message
          errorMessage = error.message;
        }
      }

      toast({
        title: "Update Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Drag update mutation for drag and drop operations
  const dragUpdateMutation = useMutation({
    mutationFn: async (updatedData: {
      id: number;
      bookingDate: string;
      startTime: string;
      endTime?: string;
    }) => {
      console.log("Updating booking via drag:", updatedData);
      const response = await apiRequest(
        "PUT",
        `/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/bookings/${updatedData.id}`,
        {
          bookingDate: updatedData.bookingDate,
          startTime: updatedData.startTime,
          endTime: updatedData.endTime,
        },
      );
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [
          `/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/bookings`,
        ],
      });
      toast({
        title: "Booking Moved",
        description: "Booking has been moved successfully.",
      });
    },
    onError: (error: any) => {
      console.error("Drag update error:", error);

      // Try to parse the error message to extract the actual conflict message
      let errorMessage = "Could not move the booking. Please try again.";

      if (error.message) {
        try {
          // Check if the error message contains JSON (like "400: {"message":"..."}")
          const match = error.message.match(/400:\s*({.*})/);
          if (match) {
            const jsonError = JSON.parse(match[1]);
            errorMessage = jsonError.message || errorMessage;
          } else {
            // If it's a simple error message, use it directly
            errorMessage = error.message;
          }
        } catch (parseError) {
          // If parsing fails, use the original error message
          errorMessage = error.message;
        }
      }

      toast({
        title: "Table Conflict",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Double-click handler for editing bookings
  const handleBookingDoubleClick = useCallback(
    (e: React.MouseEvent, booking: Booking) => {
      e.stopPropagation();
      e.preventDefault();
      setEditingBooking(booking);
      setIsEditBookingOpen(true);
    },
    [],
  );

  // Single click handler - now opens edit dialog
  const handleBookingClick = useCallback(
    (e: React.MouseEvent, booking: Booking) => {
      e.stopPropagation();
      e.preventDefault();
      console.log(
        "Booking clicked, opening edit dialog for:",
        booking.customerName,
      );
      // Open edit dialog on single click
      setEditingBooking(booking);
      setIsEditBookingOpen(true);
      return false; // Ensure no propagation
    },
    [],
  );

  // Drag handlers that work with click-to-edit
  const handleMouseDown = useCallback(
    (e: React.MouseEvent, booking: Booking) => {
      e.preventDefault();

      const startX = e.clientX;
      const startY = e.clientY;
      const startTime = Date.now();
      let hasMoved = false;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - startX;
        const deltaY = moveEvent.clientY - startY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        // If moved more than 5px, start dragging
        if (distance > 5 && !hasMoved) {
          hasMoved = true;
          setIsDragging(true);
          setDraggedBooking({
            booking,
            offset: { x: deltaX, y: deltaY },
          });

          const dragElement = document.querySelector(
            `[data-booking-id="${booking.id}"]`,
          ) as HTMLElement;
          if (dragElement) {
            dragElement.classList.add("dragging");
          }
        }

        // Update drag position if dragging
        if (hasMoved) {
          const dragElement = document.querySelector(
            `[data-booking-id="${booking.id}"]`,
          ) as HTMLElement;
          if (dragElement) {
            dragElement.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(1.05)`;
          }
        }
      };

      const handleMouseUp = (upEvent: MouseEvent) => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);

        const duration = Date.now() - startTime;

        // If it was a quick click without movement, treat as click
        if (!hasMoved && duration < 300) {
          console.log("Click detected, opening edit dialog");
          setEditingBooking(booking);
          setIsEditBookingOpen(true);
        }

        // Reset drag styles completely
        if (hasMoved) {
          console.log("Drag ended, resetting styles");
          const dragElement = document.querySelector(
            `[data-booking-id="${booking.id}"]`,
          ) as HTMLElement;
          if (dragElement) {
            dragElement.classList.remove("dragging");
          }

          // Reset drag state after a short delay to allow drop detection
          setTimeout(() => {
            setIsDragging(false);
            setDraggedBooking(null);
          }, 50);
        }
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [],
  );

  // Global drag cleanup effect
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging && draggedBooking) {
        console.log("Global drag cleanup - resetting drag state");
        // Clean up any remaining drag styles
        const dragElement = document.querySelector(
          `[data-booking-id="${draggedBooking.booking.id}"]`,
        ) as HTMLElement;
        if (dragElement) {
          dragElement.classList.remove("dragging");
        }
        setIsDragging(false);
        setDraggedBooking(null);
      }
    };

    document.addEventListener("mouseup", handleGlobalMouseUp);
    return () => document.removeEventListener("mouseup", handleGlobalMouseUp);
  }, [isDragging, draggedBooking]);

  // Add drop zone detection for proper drag and drop
  const handleDrop = useCallback(
    (targetDate: Date, targetTime?: string) => {
      if (!isDragging || !draggedBooking) return;

      const newDateStr = format(targetDate, "yyyy-MM-dd");
      const currentDateStr = format(
        new Date(draggedBooking.booking.bookingDate),
        "yyyy-MM-dd",
      );

      // Check if anything actually changed
      if (
        newDateStr !== currentDateStr ||
        (targetTime && targetTime !== draggedBooking.booking.startTime)
      ) {
        console.log(
          `Moving booking ${draggedBooking.booking.customerName} to ${newDateStr} at ${targetTime || draggedBooking.booking.startTime}`,
        );

        const newEndTime = targetTime
          ? addMinutes(
              parse(targetTime, "HH:mm", new Date()),
              60,
            ).toLocaleTimeString("en-US", {
              hour12: false,
              hour: "2-digit",
              minute: "2-digit",
            })
          : draggedBooking.booking.endTime || undefined;

        dragUpdateMutation.mutate({
          id: draggedBooking.booking.id,
          bookingDate: newDateStr,
          startTime: targetTime || draggedBooking.booking.startTime,
          endTime: newEndTime || undefined,
        });
      }

      setIsDragging(false);
      setDraggedBooking(null);
    },
    [isDragging, draggedBooking, dragUpdateMutation],
  );

  // Create booking mutation
  const createBookingMutation = useMutation({
    mutationFn: async (bookingData: any) => {
      const response = await apiRequest(
        "POST",
        `/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/bookings`,
        bookingData,
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [
          `/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/bookings`,
        ],
      });
      setIsNewBookingOpen(false);
      setNewBooking({
        customerName: "",
        customerPhone: "",
        customerEmail: "",
        guestCount: 2,
        specialRequests: "",
        startTime: "",
        endTime: "",
        duration: generalSettings?.defaultBookingDuration ?? 60,
      });
      toast({
        title: "Booking Created",
        description: "New booking has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create booking",
        variant: "destructive",
      });
    },
  });

  const handleDurationChange = (duration: number) => {
    setNewBooking((prev) => {
      const [hours, minutes] = prev.startTime.split(":").map(Number);
      const startMinutes = hours * 60 + minutes;
      const endMinutes = startMinutes + duration;
      const endHour = Math.floor(endMinutes / 60);
      const endMin = endMinutes % 60;
      const endTime = `${endHour.toString().padStart(2, "0")}:${endMin.toString().padStart(2, "0")}`;

      return {
        ...prev,
        duration: duration,
        endTime: endTime,
      };
    });
  };

  const handleCreateBooking = () => {
    if (!selectedTimeSlot) return;

    createBookingMutation.mutate({
      ...newBooking,
      tableId: newBooking.tableId ? parseInt(newBooking.tableId, 10) : null,
      bookingDate: format(selectedTimeSlot.date, "yyyy-MM-dd"),
      bookingTime: selectedTimeSlot.time,
      restaurantId: restaurant?.id,
      tenantId: restaurant?.tenantId,
    });
  };

  const openNewBookingDialog = (date: Date, time: string) => {
    // Check if restaurant is open at this time
    if (!isTimeSlotOpen(date, time)) {
      toast({
        title: "Restaurant Closed",
        description:
          "The restaurant is closed at this time. Please select a time during operating hours.",
        variant: "destructive",
      });
      return;
    }

    setSelectedTimeSlot({ date, time });

    // Calculate end time (1 hour later)
    const [hours, minutes] = time.split(":").map(Number);
    const endHour = hours + 1;
    const endTime = `${endHour.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;

    // Update the booking form with the clicked time
    setNewBooking((prev) => ({
      ...prev,
      startTime: time,
      endTime: endTime,
    }));

    setIsNewBookingOpen(true);
  };

  // Function to calculate booking duration in minutes
  const getBookingDurationMinutes = (startTime: string, endTime?: string) => {
    if (!startTime || typeof startTime !== "string") return 60;
    if (!endTime || typeof endTime !== "string") return 60; // Default 1 hour if no end time

    const toMinutes = (timeStr: string) => {
      if (!timeStr || typeof timeStr !== "string") return 0;
      const parts = timeStr.split(":");
      if (parts.length !== 2) return 0;
      const [hours, minutes] = parts.map(Number);
      if (isNaN(hours) || isNaN(minutes)) return 0;
      return hours * 60 + minutes;
    };

    const startMinutes = toMinutes(startTime);
    const endMinutes = toMinutes(endTime);

    if (startMinutes === 0 || endMinutes === 0) return 60;
    const duration = endMinutes - startMinutes;
    return duration > 0 ? duration : 60;
  };

  // Function to get timeline bar width based on duration
  const getTimelineBarWidth = (startTime: string, endTime?: string) => {
    const duration = getBookingDurationMinutes(startTime, endTime);
    const maxDuration = 180; // 3 hours max for scaling
    const percentage = Math.min((duration / maxDuration) * 100, 100);
    return `${percentage}%`;
  };

  // Function to get timeline bar color based on duration
  const getTimelineBarColor = (startTime: string, endTime?: string) => {
    const duration = getBookingDurationMinutes(startTime, endTime);

    if (duration <= 60) return "bg-green-400"; // Short booking (≤1h)
    if (duration <= 120) return "bg-yellow-400"; // Medium booking (≤2h)
    return "bg-red-400"; // Long booking (>2h)
  };

  // Function to get available tables for a specific time slot
  const getAvailableTablesForTimeSlot = (
    date: Date,
    startTime: string,
    endTime: string = startTime,
    excludeBookingId?: number,
  ) => {
    // Validate inputs to prevent RangeError
    if (!date || !startTime) {
      return tables;
    }

    let dateStr: string;
    try {
      dateStr = format(date, "yyyy-MM-dd");
    } catch (error) {
      return tables;
    }

    return tables.filter((table) => {
      // Check if this table has any bookings that overlap with the selected time
      const conflictingBookings = allBookings.filter((booking) => {
        // Skip the booking we're editing
        if (excludeBookingId && booking.id === excludeBookingId) return false;

        if (booking.tableId !== table.id) return false;

        // Convert booking date to string for comparison
        let bookingDateStr: string;
        try {
          if (typeof booking.bookingDate === "string") {
            // If it's already a string, parse it and format it
            bookingDateStr = format(
              new Date(booking.bookingDate),
              "yyyy-MM-dd",
            );
          } else if (booking.bookingDate instanceof Date) {
            return format(booking.bookingDate, "yyyy-MM-dd");
          } else {
            // Fallback - convert to string and parse
            bookingDateStr = format(
              new Date(booking.bookingDate),
              "yyyy-MM-dd",
            );
          }
        } catch (error) {
          return false; // Skip this booking if date is invalid
        }

        if (bookingDateStr !== dateStr) return false;

        // Check for time overlap
        const bookingStart = booking.startTime;
        const bookingEnd = booking.endTime || booking.startTime;

        // Convert times to minutes for easier comparison
        const toMinutes = (timeStr: string) => {
          if (!timeStr || typeof timeStr !== "string") return 0;
          const parts = timeStr.split(":");
          if (parts.length !== 2) return 0;
          const [hours, minutes] = parts.map(Number);
          if (isNaN(hours) || isNaN(minutes)) return 0;
          return hours * 60 + minutes;
        };

        const selectedStart = toMinutes(startTime);
        const selectedEnd = toMinutes(endTime);
        const existingStart = toMinutes(bookingStart);
        const existingEnd = toMinutes(bookingEnd);

        // Check if times overlap (any overlap means conflict)
        const hasOverlap = !(
          selectedEnd <= existingStart || selectedStart >= existingEnd
        );

        return hasOverlap;
      });

      return conflictingBookings.length === 0;
    });
  };

  // Render functions for different views
  const renderDayView = () => {
    const dayBookings = getBookingsForSlot(currentDate);

    return (
      <div className="flex-1 flex flex-col">
        <div className="border rounded-lg overflow-hidden flex-1 flex flex-col">
          <div className="bg-gray-50 p-4 border-b">
            <h3 className="font-semibold text-lg">
              {format(currentDate, "EEEE, MMMM d, yyyy")}
            </h3>
          </div>
          <div className="p-4 space-y-2 flex-1 overflow-y-auto">
            {timeSlots.map((timeSlot) => {
              const slotBookings = getBookingsForSlot(currentDate, timeSlot);
              const availabilityLevel = getAvailabilityLevel(
                currentDate,
                timeSlot,
              );
              const availabilityColor = getAvailabilityColor(availabilityLevel);
              return (
                <div
                  key={timeSlot}
                  className={`flex items-center space-x-4 p-2 border rounded transition-all duration-200 ${availabilityColor} ${
                    availabilityLevel === "closed"
                      ? "cursor-not-allowed"
                      : "cursor-pointer"
                  } ${isDragging ? "hover:border-blue-300" : ""} ${
                    isCurrentTimeSlot(timeSlot)
                      ? "ring-2 ring-blue-400 bg-blue-50"
                      : ""
                  }`}
                  onClick={(e) => {
                    // Only open dialog if clicking directly on the container, not on bookings
                    if (e.target === e.currentTarget) {
                      openNewBookingDialog(currentDate, timeSlot);
                    }
                  }}
                  onMouseUp={(e) => {
                    if (isDragging && draggedBooking) {
                      e.preventDefault();
                      handleDrop(currentDate, timeSlot);
                    }
                  }}
                  title={getAvailabilityText(availabilityLevel)}
                >
                  <div className="w-20 text-sm text-gray-600 flex items-center space-x-2">
                    <span>{timeSlot}</span>
                    <div
                      className={getAvailabilityDot(availabilityLevel)}
                    ></div>
                  </div>
                  <div className="flex-1 space-y-1">
                    {slotBookings.map((booking) => (
                      <div
                        key={booking.id}
                        data-booking-id={booking.id}
                        className={`booking-card flex items-center space-x-2 p-2 rounded text-sm transition-all duration-300 ease-out ${
                          booking.status === "cancelled" ||
                          booking.status === "no-show"
                            ? "cursor-default"
                            : "cursor-pointer hover:shadow-lg hover:scale-105 hover:-translate-y-1 hover:rotate-1 active:scale-95 active:rotate-0"
                        } ${getBookingCardStyle(booking, currentDate, timeSlot)}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          console.log("Day view booking clicked:", booking);
                          setEditingBooking(booking);
                          setIsEditBookingOpen(true);
                          console.log("Day view edit dialog should open");
                        }}
                        onMouseDown={(e) =>
                          booking.status !== "cancelled" &&
                          booking.status !== "no-show" &&
                          handleMouseDown(e, booking)
                        }
                        title={
                          booking.status === "cancelled"
                            ? "Cancelled booking - Click to edit only"
                            : booking.status === "no-show"
                              ? "No-show booking - Click to edit only"
                              : getTableConflictStatus(
                                    booking.tableId || 0,
                                    currentDate,
                                    timeSlot,
                                  )
                                ? "TABLE CONFLICT - Multiple bookings on same table!"
                                : "Click to edit booking"
                        }
                      >
                        <div className="flex flex-col w-full">
                          <div className="flex items-center space-x-2">
                            <Users className="w-4 h-4" />
                            <span className="flex-1">
                              {booking.customerName}{" "}
                              {booking.status === "cancelled" && "(Cancelled)"}{" "}
                              {booking.status === "no-show" && "(No Show)"} (
                              {booking.guestCount} guests) - {booking.startTime}
                              {booking.endTime ? `-${booking.endTime}` : ""}
                            </span>
                            {booking.tableId && (
                              <Badge variant="outline">
                                Table{" "}
                                {
                                  tables.find((t) => t.id === booking.tableId)
                                    ?.tableNumber
                                }
                              </Badge>
                            )}
                          </div>
                          {/* Timeline Preview */}
                          <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-300 ${getTimelineBarColor(booking.startTime, booking.endTime)}`}
                              style={{
                                width: getTimelineBarWidth(
                                  booking.startTime,
                                  booking.endTime,
                                ),
                              }}
                              title={`Duration: ${getBookingDurationMinutes(booking.startTime, booking.endTime)} minutes`}
                            />
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {getBookingDurationMinutes(
                              booking.startTime,
                              booking.endTime,
                            )}{" "}
                            min duration
                          </div>
                        </div>
                      </div>
                    ))}
                    {slotBookings.length === 0 && (
                      <div className="text-xs text-gray-400">
                        Click to add booking
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    return (
      <div className="flex-1 flex flex-col">
        <div className="border rounded-lg overflow-hidden flex-1 flex flex-col">
          {/* Week header */}
          <div className="grid grid-cols-8 bg-gray-50 border-b">
            <div className="p-2 text-sm font-medium">Time</div>
            {visibleDates.map((date) => (
              <div
                key={date.toISOString()}
                className="p-2 text-center border-l"
              >
                <div className="text-sm font-medium">{format(date, "EEE")}</div>
                <div
                  className={`text-xs ${isToday(date) ? "text-blue-600 font-semibold" : "text-gray-600"}`}
                >
                  {format(date, "d")}
                </div>
              </div>
            ))}
          </div>

          {/* Time slots */}
          <div className="flex-1 overflow-y-auto">
            {timeSlots.map((timeSlot) => (
              <div key={timeSlot} className="grid grid-cols-8 border-b">
                <div
                  className={`p-2 text-xs border-r ${
                    isCurrentTimeSlot(timeSlot)
                      ? "bg-blue-100 text-blue-800 font-semibold"
                      : "text-gray-600"
                  }`}
                >
                  {timeSlot}
                </div>
                {visibleDates.map((date) => {
                  const slotBookings = getBookingsForSlot(date, timeSlot);
                  const availabilityLevel = getAvailabilityLevel(
                    date,
                    timeSlot,
                  );
                  const availabilityColor =
                    getAvailabilityColor(availabilityLevel);
                  return (
                    <div
                      key={`${date.toISOString()}-${timeSlot}`}
                      className={`p-1 border-l min-h-[60px] relative ${availabilityColor} ${
                        availabilityLevel === "closed"
                          ? "cursor-not-allowed"
                          : "cursor-pointer"
                      }`}
                      onClick={(e) => {
                        // Only open dialog if clicking directly on the container, not on bookings
                        if (e.target === e.currentTarget) {
                          openNewBookingDialog(date, timeSlot);
                        }
                      }}
                      onMouseUp={(e) => {
                        if (isDragging && draggedBooking) {
                          e.preventDefault();
                          handleDrop(date, timeSlot);
                        }
                      }}
                      title={getAvailabilityText(availabilityLevel)}
                    >
                      {slotBookings.map((booking) => (
                        <div
                          key={booking.id}
                          data-booking-id={booking.id}
                          className={`booking-card p-1 mb-1 rounded text-xs transition-all duration-300 ease-out ${
                            booking.status === "cancelled" ||
                            booking.status === "no-show"
                              ? "cursor-default"
                              : "cursor-pointer hover:shadow-lg hover:scale-110 hover:-translate-y-1 hover:rotate-2 active:scale-95 active:rotate-0"
                          } ${getBookingCardStyle(booking, date, timeSlot)}`}
                          onMouseDown={(e) =>
                            booking.status !== "cancelled" &&
                            booking.status !== "no-show" &&
                            handleMouseDown(e, booking)
                          }
                          title={
                            booking.status === "cancelled"
                              ? "Cancelled booking - Click to edit only"
                              : booking.status === "no-show"
                                ? "No-show booking - Click to edit only"
                                : getTableConflictStatus(
                                      booking.tableId || 0,
                                      date,
                                      timeSlot,
                                    )
                                  ? "TABLE CONFLICT - Multiple bookings on same table!"
                                  : "Click to edit booking"
                          }
                        >
                          <div className="truncate font-medium">
                            {booking.customerName}{" "}
                            {booking.status === "cancelled" && "(Cancelled)"}{" "}
                            {booking.status === "no-show" && "(No Show)"}
                          </div>
                          <div className="text-xs opacity-75">
                            {booking.guestCount} guests
                          </div>
                          <div className="text-xs opacity-75">
                            {booking.startTime}
                            {booking.endTime ? `-${booking.endTime}` : ""}
                          </div>
                          {/* Timeline Preview for Week View */}
                          <div className="mt-1 w-full bg-gray-200 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full transition-all duration-300 ${getTimelineBarColor(booking.startTime, booking.endTime)}`}
                              style={{
                                width: getTimelineBarWidth(
                                  booking.startTime,
                                  booking.endTime,
                                ),
                              }}
                              title={`Duration: ${getBookingDurationMinutes(booking.startTime, booking.endTime)} min`}
                            />
                          </div>
                          {booking.tableId && (
                            <div className="text-xs opacity-75">
                              Table{" "}
                              {
                                tables.find((t) => t.id === booking.tableId)
                                  ?.tableNumber
                              }
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderMonthView = () => {
    const weeks = [];
    for (let i = 0; i < visibleDates.length; i += 7) {
      weeks.push(visibleDates.slice(i, i + 7));
    }

    return (
      <div className="flex-1 flex flex-col">
        <div className="border rounded-lg overflow-hidden flex-1 flex flex-col">
          {/* Month header */}
          <div className="grid grid-cols-7 bg-gray-50 border-b">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div
                key={day}
                className="p-3 text-center text-sm font-medium border-l first:border-l-0"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Month days */}
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7 border-b">
              {week.map((date) => {
                const dayBookings = getBookingsForSlot(date);
                const isCurrentMonth = isSameMonth(date, currentDate);
                const availabilityLevel = getAvailabilityLevel(date);
                const availabilityColor =
                  getAvailabilityColor(availabilityLevel);

                return (
                  <div
                    key={date.toISOString()}
                    className={`p-2 border-l first:border-l-0 min-h-[120px] cursor-pointer transition-all duration-200 ${availabilityColor} ${
                      !isCurrentMonth ? "opacity-50" : ""
                    } ${isToday(date) ? "ring-2 ring-blue-500" : ""} ${
                      isDragging ? "hover:border-blue-300" : ""
                    }`}
                    onClick={(e) => {
                      // Only change view if clicking directly on the container, not on bookings
                      if (e.target === e.currentTarget) {
                        onDateSelect(date);
                        setCurrentDate(date);
                        setView("day");
                      }
                    }}
                    onMouseUp={(e) => {
                      if (isDragging && draggedBooking) {
                        e.preventDefault();
                        handleDrop(date);
                      } else {
                        // Reset drag state if no active drag
                        setIsDragging(false);
                        setDraggedBooking(null);
                      }
                    }}
                    title={getAvailabilityText(availabilityLevel)}
                  >
                    <div
                      className={`text-sm mb-1 flex items-center justify-between ${isToday(date) ? "font-bold text-blue-600" : ""}`}
                    >
                      <span>{format(date, "d")}</span>
                      <div
                        className={getAvailabilityDot(availabilityLevel)}
                      ></div>
                    </div>
                    <div className="space-y-1">
                      {dayBookings.slice(0, 3).map((booking) => (
                        <div
                          key={booking.id}
                          data-booking-id={booking.id}
                          className={`booking-card p-1 bg-blue-100 text-blue-800 rounded text-xs truncate cursor-pointer transition-all duration-300 ease-out hover:bg-blue-200 hover:shadow-lg hover:scale-105 hover:-translate-y-0.5 hover:rotate-1 active:scale-95 active:rotate-0`}
                          onMouseDown={(e) => handleMouseDown(e, booking)}
                          title="Click to edit booking"
                        >
                          <div className="truncate">
                            <div className="font-medium">
                              {booking.customerName}
                            </div>
                            <div className="text-xs opacity-75">
                              {booking.startTime}
                              {booking.endTime ? `-${booking.endTime}` : ""}
                            </div>
                            {/* Timeline Preview for Month View */}
                            <div className="mt-1 w-full bg-blue-200 rounded-full h-1">
                              <div
                                className={`h-1 rounded-full transition-all duration-300 ${getTimelineBarColor(booking.startTime, booking.endTime)} opacity-80`}
                                style={{
                                  width: getTimelineBarWidth(
                                    booking.startTime,
                                    booking.endTime,
                                  ),
                                }}
                                title={`${getBookingDurationMinutes(booking.startTime, booking.endTime)} min`}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                      {dayBookings.length > 3 && (
                        <div className="text-xs text-gray-500">
                          +{dayBookings.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const getViewTitle = () => {
    switch (view) {
      case "day":
        return format(currentDate, "EEEE, MMMM d, yyyy");
      case "week":
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
        const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
        return `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`;
      case "month":
        return format(currentDate, "MMMM yyyy");
      default:
        return "";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div
      ref={calendarRef}
      className={`calendar-container h-full flex flex-col space-y-4 ${isDragging ? "cursor-grabbing" : ""}`}
      style={{ userSelect: isDragging ? "none" : "auto" }}
    >
      {/* Calendar Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={navigatePrevious}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={navigateNext}>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={navigateToday}>
              Today
            </Button>
          </div>
          <h2 className="text-xl font-semibold">{getViewTitle()}</h2>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex border rounded-lg">
            <Button
              variant={view === "day" ? "default" : "ghost"}
              size="sm"
              onClick={() => setView("day")}
              className="rounded-r-none"
            >
              Day
            </Button>
            <Button
              variant={view === "week" ? "default" : "ghost"}
              size="sm"
              onClick={() => setView("week")}
              className="rounded-none border-x-0"
            >
              Week
            </Button>
            <Button
              variant={view === "month" ? "default" : "ghost"}
              size="sm"
              onClick={() => setView("month")}
              className="rounded-l-none"
            >
              Month
            </Button>
          </div>
        </div>
      </div>

      {/* Availability Legend */}
      <div className="px-6 py-3 bg-gray-50 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6 text-sm">
            <span className="font-medium text-gray-700">Availability:</span>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-400 rounded-full"></div>
              <span className="text-gray-600">High (70%+)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
              <span className="text-gray-600">Medium (30-70%)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-orange-400 rounded-full"></div>
              <span className="text-gray-600">Low (1-30%)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-400 rounded-full"></div>
              <span className="text-gray-600">Fully booked</span>
            </div>
          </div>
          <div className="flex items-center space-x-4 text-sm">
            <span className="font-medium text-gray-700">Conflicts:</span>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-red-200 border-l-2 border-red-600 rounded"></div>
              <span className="text-red-700 font-medium">
                Table conflict detected
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar View */}
      {view === "day" && renderDayView()}
      {view === "week" && renderWeekView()}
      {view === "month" && renderMonthView()}

      {/* New Booking Dialog */}
      <Dialog open={isNewBookingOpen} onOpenChange={setIsNewBookingOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Booking</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Event Type */}
            <div>
              <Label htmlFor="eventType">Event Type</Label>
              <Select
                value={newBooking.eventType}
                onValueChange={(value) =>
                  setNewBooking((prev) => ({ ...prev, eventType: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select event type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General Dining</SelectItem>
                  <SelectItem value="birthday">Birthday</SelectItem>
                  <SelectItem value="anniversary">Anniversary</SelectItem>
                  <SelectItem value="business">Business Meeting</SelectItem>
                  <SelectItem value="date">Date Night</SelectItem>
                  <SelectItem value="celebration">Celebration</SelectItem>
                  <SelectItem value="family">Family Gathering</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Customer Details */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customerName">Customer Name</Label>
                <Input
                  id="customerName"
                  value={newBooking.customerName}
                  onChange={(e) =>
                    setNewBooking((prev) => ({
                      ...prev,
                      customerName: e.target.value,
                    }))
                  }
                  placeholder="Enter customer name"
                />
              </div>
              <div>
                <Label htmlFor="customerPhone">Phone</Label>
                <Input
                  id="customerPhone"
                  value={newBooking.customerPhone}
                  onChange={(e) =>
                    setNewBooking((prev) => ({
                      ...prev,
                      customerPhone: e.target.value,
                    }))
                  }
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="customerEmail">Email</Label>
              <Input
                id="customerEmail"
                type="email"
                value={newBooking.customerEmail}
                onChange={(e) =>
                  setNewBooking((prev) => ({
                    ...prev,
                    customerEmail: e.target.value,
                  }))
                }
                placeholder="customer@example.com"
              />
            </div>

            {/* Date, Time, Duration */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="startTime">Start Time</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={newBooking.startTime}
                  onChange={(e) => {
                    const newStartTime = e.target.value;
                    const currentDuration =
                      newBooking.duration ??
                      generalSettings?.defaultBookingDuration ??
                      60;

                    // Recalculate end time when start time changes
                    const [hours, minutes] = newStartTime
                      .split(":")
                      .map(Number);
                    const startMinutes = hours * 60 + minutes;
                    const endMinutes = startMinutes + currentDuration;
                    const endHour = Math.floor(endMinutes / 60);
                    const endMin = endMinutes % 60;
                    const endTime = `${endHour.toString().padStart(2, "0")}:${endMin.toString().padStart(2, "0")}`;

                    setNewBooking((prev) => ({
                      ...prev,
                      startTime: newStartTime,
                      endTime: endTime,
                    }));
                  }}
                  required
                />
              </div>
              <div>
                <Label htmlFor="duration">Duration</Label>
                <Select
                  value={(
                    newBooking.duration ??
                    generalSettings?.defaultBookingDuration ??
                    60
                  ).toString()}
                  onValueChange={(value) =>
                    handleDurationChange(parseInt(value))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 min</SelectItem>
                    <SelectItem value="30">30 min</SelectItem>
                    <SelectItem value="45">45 min</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="90">1.5 hours</SelectItem>
                    <SelectItem value="120">2 hours</SelectItem>
                    <SelectItem value="150">2.5 hours</SelectItem>
                    <SelectItem value="180">3 hours</SelectItem>
                    <SelectItem value="240">4 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="guestCount">Guests</Label>
                <Select
                  value={newBooking.guestCount.toString()}
                  onValueChange={(value) =>
                    setNewBooking((prev) => ({
                      ...prev,
                      guestCount: parseInt(value),
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 20 }, (_, i) => i + 1).map((num) => (
                      <SelectItem key={num} value={num.toString()}>
                        {num} {num === 1 ? "person" : "persons"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Table Selection */}
            <div>
              <Label htmlFor="tableId">Available Tables</Label>
              <Select
                value={newBooking.tableId}
                onValueChange={(value) => {
                  if (value !== "no-tables-available") {
                    setNewBooking((prev) => ({ ...prev, tableId: value }));
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an available table" />
                </SelectTrigger>
                <SelectContent>
                  {(() => {
                    let bookingDate: Date;
                    try {
                      bookingDate =
                        selectedTimeSlot?.date ||
                        (newBooking.bookingDate
                          ? new Date(newBooking.bookingDate)
                          : new Date());
                    } catch (error) {
                      bookingDate = new Date();
                    }

                    const availableTables = getAvailableTablesForTimeSlot(
                      bookingDate,
                      newBooking.startTime,
                      newBooking.endTime,
                    );

                    if (availableTables.length === 0) {
                      return (
                        <SelectItem value="no-tables-available" disabled>
                          No tables available for this time slot
                        </SelectItem>
                      );
                    }

                    return availableTables.map((table) => (
                      <SelectItem key={table.id} value={table.id.toString()}>
                        Table {table.tableNumber} (Capacity: {table.capacity})
                      </SelectItem>
                    ));
                  })()}
                </SelectContent>
              </Select>
            </div>

            {/* Special Requests */}
            <div>
              <Label htmlFor="specialRequests">Special Requests</Label>
              <Textarea
                id="specialRequests"
                value={newBooking.specialRequests}
                onChange={(e) =>
                  setNewBooking((prev) => ({
                    ...prev,
                    specialRequests: e.target.value,
                  }))
                }
                placeholder="Dietary requirements, seating preferences, allergies..."
                className="min-h-[60px]"
              />
            </div>

            {/* Internal Notes */}
            <div>
              <Label htmlFor="internalNotes">Internal Notes</Label>
              <Textarea
                id="internalNotes"
                value={newBooking.internalNotes}
                onChange={(e) =>
                  setNewBooking((prev) => ({
                    ...prev,
                    internalNotes: e.target.value,
                  }))
                }
                placeholder="Staff notes (not visible to customer)..."
                className="min-h-[60px]"
              />
            </div>

            {/* Extra Description */}
            <div>
              <Label htmlFor="extraDescription">Extra Description</Label>
              <Textarea
                id="extraDescription"
                value={newBooking.extraDescription}
                onChange={(e) =>
                  setNewBooking((prev) => ({
                    ...prev,
                    extraDescription: e.target.value,
                  }))
                }
                placeholder="Additional booking details..."
                className="min-h-[60px]"
              />
            </div>

            {/* Tags */}
            <div>
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {[
                  "Birthday",
                  "Anniversary",
                  "VIP",
                  "First Time",
                  "Regular",
                  "Special Diet",
                  "Large Party",
                ].map((tag) => (
                  <Button
                    key={tag}
                    type="button"
                    variant={
                      newBooking.tags?.includes(tag) ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => {
                      setNewBooking((prev) => ({
                        ...prev,
                        tags: prev.tags?.includes(tag)
                          ? prev.tags.filter((t) => t !== tag)
                          : [...(prev.tags || []), tag],
                      }));
                    }}
                  >
                    {tag}
                  </Button>
                ))}
              </div>
            </div>

            {/* Payment Setup */}
            <div className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={newBooking.requiresPayment}
                  onCheckedChange={(checked) =>
                    setNewBooking((prev) => ({
                      ...prev,
                      requiresPayment: checked,
                    }))
                  }
                />
                <Label>Require prepayment</Label>
              </div>

              {newBooking.requiresPayment && (
                <div className="space-y-3 pl-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="paymentAmount">Amount</Label>
                      <Input
                        id="paymentAmount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={newBooking.paymentAmount}
                        onChange={(e) =>
                          setNewBooking((prev) => ({
                            ...prev,
                            paymentAmount: parseFloat(e.target.value) || 0,
                          }))
                        }
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label htmlFor="paymentDeadline">Payment Deadline</Label>
                      <Select
                        value={newBooking.paymentDeadlineHours?.toString()}
                        onValueChange={(value) =>
                          setNewBooking((prev) => ({
                            ...prev,
                            paymentDeadlineHours: parseInt(value),
                          }))
                        }
                      >
                        <SelectTrigger>
                          {" "}
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 hour</SelectItem>
                          <SelectItem value="2">2 hours</SelectItem>
                          <SelectItem value="6">6 hours</SelectItem>
                          <SelectItem value="24">24 hours</SelectItem>
                          <SelectItem value="48">48 hours</SelectItem>
                          <SelectItem value="72">72 hours</SelectItem>
                          <SelectItem value="168">1 week</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Switch checked={true} disabled />
                    <span>Send email with payment link</span>
                  </div>
                </div>
              )}
            </div>

            {/* Language */}
            <div>
              <Label htmlFor="language">Language</Label>
              <Select
                value={newBooking.language}
                onValueChange={(value) =>
                  setNewBooking((prev) => ({ ...prev, language: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English (GB)</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="de">German</SelectItem>
                  <SelectItem value="it">Italian</SelectItem>
                  <SelectItem value="pt">Portuguese</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsNewBookingOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateBooking}
                disabled={
                  createBookingMutation.isPending || !newBooking.customerName
                }
              >
                {createBookingMutation.isPending
                  ? "Creating..."
                  : "Create Booking"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Booking Dialog */}
      <Dialog open={isEditBookingOpen} onOpenChange={setIsEditBookingOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Booking</DialogTitle>
          </DialogHeader>
          {editingBooking ? (
            <EditBookingForm
              booking={editingBooking}
              tables={tables}
              onSave={(updatedData) => editBookingMutation.mutate(updatedData)}
              onCancel={() => {
                setIsEditBookingOpen(false);
                setEditingBooking(null);
              }}
              isLoading={editBookingMutation.isPending}
              allBookings={allBookings}
              getAvailableTablesForTimeSlot={getAvailableTablesForTimeSlot}
            />
          ) : (
            <div>No booking selected for editing</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Edit Booking Form Component
interface EditBookingFormProps {
  booking: Booking;
  tables: TableType[];
  onSave: (data: Partial<Booking>) => void;
  onCancel: () => void;
  isLoading: boolean;
  allBookings: Booking[];
  getAvailableTablesForTimeSlot: (
    date: Date,
    startTime: string,
    endTime?: string,
    excludeBookingId?: number,
  ) => TableType[];
}

function EditBookingForm({
  booking,
  tables,
  onSave,
  onCancel,
  isLoading,
  allBookings,
  getAvailableTablesForTimeSlot,
}: EditBookingFormProps) {
  const [formData, setFormData] = useState({
    customerName: booking.customerName,
    customerEmail: booking.customerEmail || "",
    customerPhone: booking.customerPhone || "",
    guestCount: booking.guestCount,
    bookingDate: (() => {
      try {
        if (typeof booking.bookingDate === "string") {
          // Parse the date string and format as YYYY-MM-DD
          const date = new Date(booking.bookingDate);
          return format(date, "yyyy-MM-dd");
        } else if (booking.bookingDate instanceof Date) {
          return format(booking.bookingDate, "yyyy-MM-dd");
        } else {
          return format(new Date(), "yyyy-MM-dd");
        }
      } catch (error) {
        return format(new Date(), "yyyy-MM-dd");
      }
    })(),
    startTime: booking.startTime,
    tableId: booking.tableId,
    notes: booking.notes || "",
    status: booking.status || "confirmed",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      bookingDate: new Date(formData.bookingDate),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="edit-customerName">Customer Name</Label>
        <Input
          id="edit-customerName"
          value={formData.customerName}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, customerName: e.target.value }))
          }
          placeholder="Enter customer name"
          required
        />
      </div>

      <div>
        <Label htmlFor="edit-customerEmail">Email</Label>
        <Input
          id="edit-customerEmail"
          type="email"
          value={formData.customerEmail}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, customerEmail: e.target.value }))
          }
          placeholder="customer@example.com"
        />
      </div>

      <div>
        <Label htmlFor="edit-customerPhone">Phone</Label>
        <Input
          id="edit-customerPhone"
          value={formData.customerPhone}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, customerPhone: e.target.value }))
          }
          placeholder="Phone number"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="edit-guestCount">Guests</Label>
          <Input
            id="edit-guestCount"
            type="number"
            min="1"
            max="20"
            value={formData.guestCount}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                guestCount: parseInt(e.target.value) || 1,
              }))
            }
          />
        </div>

        <div>
          <Label htmlFor="edit-tableId">Table</Label>
          <Select
            value={formData.tableId?.toString() || "none"}
            onValueChange={(value) =>
              setFormData((prev) => ({
                ...prev,
                tableId: value === "none" ? null : parseInt(value),
              }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select table" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No table assigned</SelectItem>
              {(() => {
                // Get available tables for the selected time slot when editing
                let bookingDate: Date;
                try {
                  bookingDate = new Date(formData.bookingDate);
                } catch (error) {
                  bookingDate = new Date();
                }

                const availableTables = getAvailableTablesForTimeSlot(
                  bookingDate,
                  formData.startTime,
                  formData.startTime, // Using same time for start and end
                  booking.id, // Exclude current booking from conflict check
                );

                const unavailableCount = tables.length - availableTables.length;

                return (
                  <>
                    {availableTables.map((table) => (
                      <SelectItem key={table.id} value={table.id.toString()}>
                        Table {table.tableNumber} ({table.capacity} seats)
                      </SelectItem>
                    ))}
                    {unavailableCount > 0 && (
                      <div className="px-2 py-1 text-xs text-red-600 opacity-60">
                        {unavailableCount} table
                        {unavailableCount !== 1 ? "s" : ""} unavailable at this
                        time
                      </div>
                    )}
                  </>
                );
              })()}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="edit-bookingDate">Date</Label>
          <Input
            id="edit-bookingDate"
            type="date"
            value={formData.bookingDate}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, bookingDate: e.target.value }))
            }
          />
        </div>

        <div>
          <Label htmlFor="edit-startTime">Time</Label>
          <Input
            id="edit-startTime"
            type="time"
            value={formData.startTime}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, startTime: e.target.value }))
            }
          />
        </div>
      </div>

      <div>
        <Label htmlFor="edit-notes">Notes</Label>
        <Textarea
          id="edit-notes"
          value={formData.notes}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, notes: e.target.value }))
          }
          placeholder="Special requests or notes..."
          className="min-h-[80px]"
        />
      </div>

      <div>
        <Label htmlFor="edit-status">Status</Label>
        <Select
          value={formData.status}
          onValueChange={(value) =>
            setFormData((prev) => ({ ...prev, status: value }))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="no-show">No Show</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end space-x-2">
        <Button variant="outline" type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading || !formData.customerName}>
          {isLoading ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
