import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth.tsx";
import { useQuery } from "@tanstack/react-query";

import BookingCalendar from "@/components/booking-calendar";
import EnhancedGoogleCalendar from "@/components/enhanced-google-calendar";
import WalkInBookingButton from "@/components/walk-in-booking";
import RealTimeTableStatus from "@/components/real-time-table-status";
import UnifiedBookingModal from "@/components/unified-booking-modal";
import WelcomeAnimation from "@/components/welcome-animation";
import ActiveSeasonalThemeDisplay from "@/components/active-seasonal-theme-display";
import ReservationCountdown from "@/components/reservation-countdown";
import AnimatedNotificationBadge from "@/components/animated-notification-badge";
import { SneakPeekBanner } from "@/components/sneak-peek-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  X,
  Users,
  List,
  Map,
  ChevronLeft,
  ChevronRight,
  Filter,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  User,
  Settings,
  CreditCard,
  HelpCircle,
  LogOut,
  Palette,
  RotateCcw,
  Clock,
  TrendingUp,
  Clock4,
  Calendar as CalendarIcon,
  ChefHat,
} from "lucide-react";
import { format } from "date-fns";
import { CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import { safeArray, safeObject } from "@/hooks/use-mobile-safe";
import { MenuManagement } from "@/components/menu-management";
import { useSettings } from "@/hooks/use-settings";
import { useDate } from "@/contexts/date-context";
import { getTableSVG } from "@/components/table-shapes/TableShapesSVG";

export default function Dashboard() {
  const { user, restaurant, isLoading, logout } = useAuth();
  const { generalSettings } = useSettings();
  const { formatDate, formatTime, formatDateTime } = useDate();
  const [, setLocation] = useLocation();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<
    "calendar" | "layout" | "status" | "menu"
  >("calendar");
  const [selectedRoom, setSelectedRoom] = useState<string>("");
  const [isNewBookingOpen, setIsNewBookingOpen] = useState(false);
  const [selectedTableForBooking, setSelectedTableForBooking] =
    useState<any>(null);
  const [newBooking, setNewBooking] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    guestCount: 2,
    startTime: "19:00",
    endTime: "20:00",
    notes: "",
  });
  const today = format(new Date(), "yyyy-MM-dd");
  const [showBookingManager, setShowBookingManager] = useState(false);
  const [selectedTableBookings, setSelectedTableBookings] = useState<any[]>([]);
  const [editingBooking, setEditingBooking] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showWelcomeAnimation, setShowWelcomeAnimation] = useState(() => {
    // Check if user has seen welcome animation today
    const lastWelcomeDate = localStorage.getItem("lastWelcomeDate");
    const today = new Date().toDateString();
    return lastWelcomeDate !== today;
  });

  useEffect(() => {
    if (!isLoading && (!user || !restaurant)) {
      setLocation("/login");
    }
  }, [isLoading, user, restaurant]);

  // Handle welcome animation completion
  const handleWelcomeComplete = () => {
    setShowWelcomeAnimation(false);
    localStorage.setItem("lastWelcomeDate", new Date().toDateString());
  };

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Fetch today's bookings
  const { data: todayBookings = [] } = useQuery({
    queryKey: [
      "/api/tenants",
      restaurant?.tenantId,
      "restaurants",
      restaurant?.id,
      "bookings",
      today,
    ],
    queryFn: async () => {
      const response = await fetch(
        `/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/bookings?date=${today}`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch bookings");
      }
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: !!restaurant && !!restaurant.tenantId,
  });

  // Fetch all bookings for the month (excluding cancelled bookings)
  const { data: allBookings = [], isLoading: allBookingsLoading } = useQuery({
    queryKey: [
      `/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/bookings`,
    ],
    queryFn: async () => {
      const response = await fetch(
        `/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/bookings`,
      );
      if (!response.ok) throw new Error("Failed to fetch all bookings");
      const data = await response.json();
      // Return all bookings including cancelled and no-show for proper calendar display
      return Array.isArray(data) ? data : [];
    },
    enabled: !!restaurant?.id && !!restaurant.tenantId,
  });

  // Fetch tables
  const { data: tables = [], isLoading: tablesLoading } = useQuery({
    queryKey: [
      `/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/tables`,
    ],
    enabled: !!restaurant && !!restaurant.tenantId && !!restaurant.id,
  });

  // Fetch bookings for selected date (excluding cancelled bookings)
  const {
    data: selectedDateBookings = [],
    isLoading: selectedDateBookingsLoading,
  } = useQuery({
    queryKey: [
      `/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/bookings`,
      format(selectedDate, "yyyy-MM-dd"),
    ],
    queryFn: async () => {
      const response = await fetch(
        `/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/bookings?date=${format(selectedDate, "yyyy-MM-dd")}`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch bookings");
      }
      const data = await response.json();
      // Filter out cancelled bookings from calendar display
      const filteredData = Array.isArray(data)
        ? data.filter((booking) => booking.status !== "cancelled")
        : [];
      return filteredData;
    },
    enabled: !!restaurant && !!restaurant.tenantId,
  });

  // Fetch rooms
  const { data: rooms = [] } = useQuery({
    queryKey: [
      "/api/tenants",
      restaurant?.tenantId,
      "restaurants",
      restaurant?.id,
      "rooms",
    ],
    queryFn: async () => {
      const response = await fetch(
        `/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/rooms`,
      );
      if (!response.ok) throw new Error("Failed to fetch rooms");
      return response.json();
    },
    enabled: !!restaurant,
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

  // Fetch special periods
  const { data: specialPeriods = [] } = useQuery({
    queryKey: ["specialPeriods", restaurant?.id, restaurant?.tenantId],
    queryFn: async () => {
      if (!restaurant?.id || !restaurant?.tenantId) return [];
      const response = await fetch(
        `/api/tenants/${restaurant.tenantId}/restaurants/${restaurant.id}/special-periods`,
      );
      if (!response.ok) throw new Error("Failed to fetch special periods");
      return response.json();
    },
    enabled: !!restaurant?.id && !!restaurant?.tenantId,
  });

  // Load saved table layout
  const { data: savedLayout } = useQuery({
    queryKey: [
      "/api/tenants",
      restaurant?.tenantId,
      "restaurants",
      restaurant?.id,
      "table-layout",
      selectedRoom,
    ],
    queryFn: async () => {
      const response = await fetch(
        `/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/table-layout?room=${selectedRoom}`,
      );
      if (!response.ok) throw new Error("Failed to fetch table layout");
      return response.json();
    },
    enabled: !!restaurant && !!selectedRoom,
  });

  // Auto-select first room when rooms load
  useEffect(() => {
    if (rooms.length > 0 && !selectedRoom) {
      setSelectedRoom(rooms[0].id.toString());
    }
  }, [rooms, selectedRoom]);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Helper functions for reservation countdown calculations
  const calculateTimeRemaining = (targetTime: string) => {
    const now = new Date();
    const target = new Date();
    const [hours, minutes] = targetTime.split(":");
    target.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    if (target < now) {
      target.setDate(target.getDate() + 1);
    }

    const diff = target.getTime() - now.getTime();
    return Math.max(0, Math.floor(diff / (1000 * 60)));
  };

  const getUpcomingReservations = () => {
    return selectedDateBookings.filter((booking) => {
      const timeRemaining = calculateTimeRemaining(booking.startTime);
      return timeRemaining > 0 && timeRemaining <= 480; // Within 8 hours
    });
  };

  const getUrgentReservations = () => {
    return selectedDateBookings.filter((booking) => {
      const timeRemaining = calculateTimeRemaining(booking.startTime);
      return timeRemaining > 0 && timeRemaining <= 30; // Within 30 minutes
    });
  };

  const createBookingMutation = useMutation({
    mutationFn: async (bookingData: any) => {
      return apiRequest(
        "POST",
        `/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/bookings`,
        bookingData,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [
          `/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/bookings`,
        ],
      });
      setIsNewBookingOpen(false);
      setSelectedTableForBooking(null);
      setNewBooking({
        customerName: "",
        customerEmail: "",
        customerPhone: "",
        guestCount: 2,
        startTime: "19:00",
        endTime: "21:00",
        notes: "",
      });
      toast({
        title: "Success",
        description: "Booking created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create booking",
        variant: "destructive",
      });
    },
  });

  // Function to find alternative tables when selected table is occupied
  const findAlternativeTable = (
    requestedGuestCount: number,
    requestedTime: string,
    requestedDate: Date,
  ) => {
    if (!tables || !Array.isArray(tables)) return null;

    // Get bookings for the requested date
    const requestedYear = requestedDate.getFullYear();
    const requestedMonth = String(requestedDate.getMonth() + 1).padStart(
      2,
      "0",
    );
    const requestedDay = String(requestedDate.getDate()).padStart(2, "0");
    const requestedDateStr = `${requestedYear}-${requestedMonth}-${requestedDay}`;

    const dateBookings = selectedDateBookings.filter((booking) => {
      const bookingDateStr = booking.bookingDate.split("T")[0]; // Just get date part from stored value
      return bookingDateStr === requestedDateStr;
    });

    // Find tables that can accommodate the guest count and are available at the requested time
    const availableTables = tables.filter((table) => {
      // Check capacity
      if (table.capacity < requestedGuestCount) return false;

      // Check if table is occupied at the requested time
      const tableBookings = dateBookings.filter(
        (booking) => booking.tableId === table.id,
      );

      const isOccupied = tableBookings.some((booking) => {
        const existingStartTime = booking.startTime;
        const existingEndTime = booking.endTime || "23:59";

        // For dashboard, we assume a 2-hour booking duration
        const requestedEndTime =
          String(parseInt(requestedTime.split(":")[0]) + 2).padStart(2, "0") +
          ":" +
          requestedTime.split(":")[1];

        // Convert times to minutes for easier comparison
        const requestedStartMinutes =
          parseInt(requestedTime.split(":")[0]) * 60 +
          parseInt(requestedTime.split(":")[1]);
        const requestedEndMinutes =
          parseInt(requestedEndTime.split(":")[0]) * 60 +
          parseInt(requestedEndTime.split(":")[1]);

        const existingStartMinutes =
          parseInt(existingStartTime.split(":")[0]) * 60 +
          parseInt(existingStartTime.split(":")[1]);
        const existingEndMinutes =
          parseInt(existingEndTime.split(":")[0]) * 60 +
          parseInt(existingEndTime.split(":")[1]);

        // Add 1-hour buffer (60 minutes) for table turnover
        const bufferMinutes = 60;

        // Check for time overlap with buffer
        // Two time ranges overlap if: start1 < end2 && start2 < end1
        const requestedStart = requestedStartMinutes - bufferMinutes;
        const requestedEnd = requestedEndMinutes + bufferMinutes;
        const existingStart = existingStartMinutes - bufferMinutes;
        const existingEnd = existingEndMinutes + bufferMinutes;

        return requestedStart < existingEnd && existingStart < requestedEnd;
      });

      return !isOccupied;
    });

    // Sort by capacity (prefer tables closer to guest count) and table number
    availableTables.sort((a, b) => {
      const capacityDiffA = Math.abs(a.capacity - requestedGuestCount);
      const capacityDiffB = Math.abs(b.capacity - requestedGuestCount);

      if (capacityDiffA !== capacityDiffB) {
        return capacityDiffA - capacityDiffB;
      }

      return a.tableNumber - b.tableNumber;
    });

    return availableTables.length > 0 ? availableTables[0] : null;
  };

  const updateBookingMutation = useMutation({
    mutationFn: async ({
      bookingId,
      updates,
    }: {
      bookingId: number;
      updates: any;
    }) => {
      return apiRequest(
        "PUT",
        `/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/bookings/${bookingId}`,
        updates,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [
          `/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/bookings`,
        ],
      });
      setEditingBooking(null);
      setShowBookingManager(false);
      toast({
        title: "Success",
        description: "Booking updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update booking",
        variant: "destructive",
      });
    },
  });

  const handleCreateBooking = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate guest count against table capacity
    if (
      selectedTableForBooking &&
      newBooking.guestCount > selectedTableForBooking.capacity
    ) {
      toast({
        title: "Error",
        description: `Selected table can only accommodate ${selectedTableForBooking.capacity} guests. You have ${newBooking.guestCount} guests.`,
        variant: "destructive",
      });
      return;
    }

    // Check if selected table is available at the requested time
    if (selectedTableForBooking) {
      const selectedYear = selectedDate.getFullYear();
      const selectedMonth = String(selectedDate.getMonth() + 1).padStart(
        2,
        "0",
      );
      const selectedDay = String(selectedDate.getDate()).padStart(2, "0");
      const selectedDateStr = `${selectedYear}-${selectedMonth}-${selectedDay}`;

      const tableBookings = selectedDateBookings.filter(
        (booking) =>
          booking.tableId === selectedTableForBooking.id &&
          booking.bookingDate.split("T")[0] === selectedDateStr,
      );

      const isTableOccupied = tableBookings.some((booking) => {
        const existingStartTime = booking.startTime;
        const existingEndTime = booking.endTime || "23:59";

        const requestedStartTime = newBooking.startTime;
        const requestedEndTime = newBooking.endTime;

        // Convert times to minutes for easier comparison
        const requestedStartMinutes =
          parseInt(requestedStartTime.split(":")[0]) * 60 +
          parseInt(requestedStartTime.split(":")[1]);
        const requestedEndMinutes =
          parseInt(requestedEndTime.split(":")[0]) * 60 +
          parseInt(requestedEndTime.split(":")[1]);

        const existingStartMinutes =
          parseInt(existingStartTime.split(":")[0]) * 60 +
          parseInt(existingStartTime.split(":")[1]);
        const existingEndMinutes =
          parseInt(existingEndTime.split(":")[0]) * 60 +
          parseInt(existingEndTime.split(":")[1]);

        // Add 1-hour buffer (60 minutes) for table turnover
        const bufferMinutes = 60;

        // Check for time overlap with buffer
        // Two time ranges overlap if: start1 < end2 && start2 < end1
        const requestedStart = requestedStartMinutes - bufferMinutes;
        const requestedEnd = requestedEndMinutes + bufferMinutes;
        const existingStart = existingStartMinutes - bufferMinutes;
        const existingEnd = existingEndMinutes + bufferMinutes;

        return requestedStart < existingEnd && existingStart < requestedEnd;
      });

      if (isTableOccupied) {
        // Find alternative table
        const alternativeTable = findAlternativeTable(
          newBooking.guestCount,
          newBooking.startTime,
          selectedDate,
        );

        if (alternativeTable) {
          toast({
            title: "Table Conflict",
            description: `Table ${selectedTableForBooking.tableNumber} is occupied at ${newBooking.startTime}. Would you like to use Table ${alternativeTable.tableNumber} (${alternativeTable.capacity} seats) instead?`,
            variant: "destructive",
          });

          // Automatically suggest the alternative table
          setSelectedTableForBooking(alternativeTable);
          setNewBooking({
            ...newBooking,
            guestCount: Math.min(
              alternativeTable.capacity,
              newBooking.guestCount,
            ),
          });
          return;
        } else {
          toast({
            title: "No Available Tables",
            description: `Table ${selectedTableForBooking.tableNumber} is occupied at ${newBooking.startTime} and no suitable alternative tables are available for ${newBooking.guestCount} guests.`,
            variant: "destructive",
          });
          return;
        }
      }
    }

    // Format date as YYYY-MM-DD without timezone conversion
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
    const day = String(selectedDate.getDate()).padStart(2, "0");
    const dateString = `${year}-${month}-${day}`;

    createBookingMutation.mutate({
      ...newBooking,
      bookingDate: dateString,
      tableId: selectedTableForBooking?.id,
      restaurantId: restaurant?.id,
    });
  };

  const handleTableClick = (table: any, tableBookings: any[]) => {
    console.log(
      "Table clicked:",
      table.tableNumber,
      "Bookings:",
      tableBookings,
    );

    if (tableBookings.length === 0) {
      // Table is available, open booking dialog
      setSelectedTableForBooking(table);
      setNewBooking({
        ...newBooking,
        guestCount: Math.min(table.capacity, newBooking.guestCount),
      });
      setIsNewBookingOpen(true);
    } else {
      // Real-time availability check for current time
      const currentTime = format(new Date(), "HH:mm");
      const currentConflicts = tableBookings.filter((booking) => {
        const startTime = booking.startTime;
        const endTime = booking.endTime || "23:59";

        const currentHour = parseInt(currentTime.split(":")[0]);
        const currentMinute = parseInt(currentTime.split(":")[1]);
        const currentTotalMinutes = currentHour * 60 + currentMinute;

        const startHour = parseInt(startTime.split(":")[0]);
        const startMinute = parseInt(startTime.split(":")[1]);
        const startTotalMinutes = startHour * 60 + startMinute;

        const endHour = parseInt(endTime.split(":")[0]);
        const endMinute = parseInt(endTime.split(":")[1]);
        const endTotalMinutes = endHour * 60 + endMinute;

        // Check if current time is within booking period (with 15-minute buffer)
        return (
          currentTotalMinutes >= startTotalMinutes - 15 &&
          currentTotalMinutes <= endTotalMinutes + 15
        );
      });

      if (currentConflicts.length > 0) {
        // Show detailed conflict information with alternative suggestions
        const currentBooking = currentConflicts[0];
        const alternativeTable = findAlternativeTable(
          currentBooking.guestCount,
          currentTime,
          selectedDate,
        );

        if (alternativeTable) {
          toast({
            title: "Table Currently Occupied",
            description: `Table ${table.tableNumber} is occupied by ${currentBooking.customerName} (${currentBooking.guestCount} guests, ${currentBooking.startTime}-${currentBooking.endTime}). Alternative: Table ${alternativeTable.tableNumber} (${alternativeTable.capacity} seats).`,
          });
        } else {
          toast({
            title: "Table Currently Occupied",
            description: `Table ${table.tableNumber} is occupied by ${currentBooking.customerName} until ${currentBooking.endTime}. No suitable alternatives available right now.`,
            variant: "destructive",
          });
        }
      } else {
        // Table has bookings but not currently occupied
        const nextBooking = tableBookings
          .filter((booking) => {
            const startHour = parseInt(booking.startTime.split(":")[0]);
            const startMinute = parseInt(booking.startTime.split(":")[1]);
            const startTotalMinutes = startHour * 60 + startMinute;

            const currentHour = parseInt(currentTime.split(":")[0]);
            const currentMinute = parseInt(currentTime.split(":")[1]);
            const currentTotalMinutes = currentHour * 60 + currentMinute;

            return startTotalMinutes > currentTotalMinutes;
          })
          .sort((a, b) => a.startTime.localeCompare(b.startTime))[0];

        if (nextBooking) {
          toast({
            title: "Table Available Now",
            description: `Table ${table.tableNumber} is available until ${nextBooking.startTime} (Next: ${nextBooking.customerName}, ${nextBooking.guestCount} guests).`,
          });
        }
      }

      // Has bookings, show booking manager
      setSelectedTableForBooking(table);
      setSelectedTableBookings(tableBookings);
      setShowBookingManager(true);
    }
  };

  const getAvailableTablesCount = () => {
    const safeTables = safeArray(tables as any[]);
    const safeBookings = safeArray(todayBookings as any[]);

    if (safeTables.length === 0) return 0;

    const currentHour = new Date().getHours();
    const bookedTableIds = safeBookings
      .filter((booking: any) => {
        try {
          const bookingHour = new Date(booking.bookingDate).getHours();
          return Math.abs(bookingHour - currentHour) < 2;
        } catch {
          return false;
        }
      })
      .map((booking: any) => booking.tableId);

    return safeTables.filter((table: any) => !bookedTableIds.includes(table.id))
      .length;
  };

  const getOpeningHoursForDay = (date: Date) => {
    // Check if there's a special period that affects this date
    const dateStr = format(date, "yyyy-MM-dd");
    const specialPeriod = specialPeriods.find((period: any) => {
      const startDateStr = period.startDate;
      const endDateStr = period.endDate;
      return dateStr >= startDateStr && dateStr <= endDateStr;
    });

    // If there's a special period, use its settings
    if (specialPeriod) {
      return {
        isOpen: specialPeriod.isOpen,
        openTime: specialPeriod.openTime || "09:00",
        closeTime: specialPeriod.isOpen
          ? specialPeriod.closeTime || "22:00"
          : "00:00",
        dayOfWeek: date.getDay(),
      };
    }

    // Otherwise, use regular opening hours
    if (!openingHours || !Array.isArray(openingHours)) {
      return null;
    }
    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const hours = openingHours.find((h) => h.dayOfWeek === dayOfWeek);
    return hours;
  };

  const getTodayOpeningHours = () => {
    const today = new Date();
    return getOpeningHoursForDay(today);
  };

  const isQueryLoading =
    selectedDateBookingsLoading || allBookingsLoading || tablesLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!user || !restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p>Please log in to access the dashboard</p>
          <button
            onClick={() => setLocation("/login")}
            className="mt-4 px-4 py-2 bg-green-600 text-white rounded"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // Professional SVG table rendering component matching table-plan design
  const SVGTableRenderer = ({
    position,
    tableId,
    table,
    bookings,
  }: {
    position: any;
    tableId: number;
    table: any;
    bookings: any[];
  }) => {
    const capacity = position.capacity || table?.capacity || 4;
    const tableNumber = position.tableNumber || table?.tableNumber || tableId;
    const shape = position.shape || "square";

    // Standardized table size for consistency - ALL TABLES SAME SIZE
    const tableWidth = 50;
    const tableHeight = 50;

    // Determine if table is booked
    const isBooked = bookings.length > 0;

    return (
      <div
        style={{
          position: "absolute",
          left: `${position.x - tableWidth / 2}px`,
          top: `${position.y - tableHeight / 2}px`,
          transform: `rotate(${position.rotation || 0}deg)`,
          transformOrigin: "center",
          cursor: "pointer",
          zIndex: 10,
          transition: "transform 0.2s ease, box-shadow 0.2s ease",
          width: `${tableWidth}px`,
          height: `${tableHeight}px`,
        }}
        onClick={() => handleTableClick(table, bookings)}
        className="group hover:scale-110"
        title={
          isBooked
            ? `Table ${tableNumber} - ${bookings.length} booking(s): ${bookings.map((b) => `${b.customerName} (${b.guestCount} guests)`).join(", ")}`
            : `Table ${tableNumber} - Available (${capacity} seats) - Click to book`
        }
      >
        {/* SVG Table with professional design - standardized size */}
        <div className="relative w-full h-full">
          {getTableSVG(
            shape,
            capacity,
            tableWidth,
            tableHeight,
            `drop-shadow-lg hover:drop-shadow-xl transition-all w-full h-full ${
              isBooked ? "filter saturate-150" : ""
            }`,
          )}

          {/* Table number overlay */}
          <div
            className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold pointer-events-none z-15"
            style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.8)" }}
          >
            <div className="text-center">
              <div>{tableNumber}</div>
              <div className="text-[10px] opacity-90">{capacity} pers.</div>
            </div>
          </div>

          {/* Booking status indicator */}
          {isBooked && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-white animate-pulse"></div>
          )}

          {/* Booking details tooltip on hover */}
          {isBooked && (
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap z-20 pointer-events-none">
              {bookings.map((booking, index) => (
                <div key={booking.id}>
                  {booking.startTime} - {booking.customerName} (
                  {booking.guestCount}){index < bookings.length - 1 && <br />}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const getTableStyle = (table: any, position: any) => {
    const baseStyle = {
      width: position?.shape === "rectangle" ? "80px" : "60px",
      height: "60px",
      position: "absolute" as const,
      left: `${position?.x}px`,
      top: `${position?.y}px`,
      transform: `rotate(${position?.rotation || 0}deg)`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "12px",
      fontWeight: "bold",
      color: "white",
      userSelect: "none" as const,
      borderRadius:
        position?.shape === "circle"
          ? "50%"
          : position?.shape === "rectangle"
            ? "8px"
            : "4px",
      border: "2px solid white",
      cursor: "pointer",
    };

    // Check if table has bookings for selected date
    const tableBookings = selectedDateBookings.filter(
      (booking) => booking.tableId === table.id,
    );
    const hasBookings = tableBookings.length > 0;

    return {
      ...baseStyle,
      backgroundColor: hasBookings ? "#EF4444" : "#16a34a", // Red if booked, green if available
      boxShadow: hasBookings
        ? "0 4px 12px rgba(239, 68, 68, 0.4)"
        : "0 4px 12px rgba(22, 163, 74, 0.4)",
    };
  };

  const getTableBookings = (tableId: number) => {
    return selectedDateBookings.filter(
      (booking) => booking.tableId === tableId,
    );
  };

  const renderTableLayout = () => {
    const tablePositions = safeObject(savedLayout?.positions, {});
    const safeTables = safeArray(tables);
    const tablesWithPositions = safeTables.filter(
      (table: any) => table && table.id && tablePositions[table.id],
    );

    return (
      <Card className="bg-white border border-gray-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              Table Layout -{" "}
              {rooms.find((room: any) => room.id.toString() === selectedRoom)
                ?.name || "Select a room"}
            </CardTitle>
            <div className="flex items-center gap-4">
              <Select value={selectedRoom} onValueChange={setSelectedRoom}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select Room" />
                </SelectTrigger>
                <SelectContent>
                  {rooms.map((room: any) => (
                    <SelectItem
                      key={`room-${room.id}`}
                      value={room.id.toString()}
                    >
                      {room.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* <Button
                onClick={() => setLocation("/table-plan")}
                variant="outline"
                size="sm"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Layout
              </Button> */}
            </div>
          </div>
          <p className="text-sm text-gray-600">
            {formatDate(selectedDate, "EEEE, MMMM d, yyyy")} - Click on tables
            to make bookings or view existing reservations
          </p>
        </CardHeader>
        <CardContent>
          <div
            className="relative bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg"
            style={{ height: "600px", minHeight: "400px" }}
          >
            {/* Grid pattern matching table-plan design */}
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  "radial-gradient(circle, #666 1px, transparent 1px)",
                backgroundSize: "20px 20px",
              }}
            />

            {tablesWithPositions.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <Map className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-lg font-medium">
                    No table layout configured
                  </p>
                  <p className="text-sm mb-4">
                    Set up your restaurant layout to get started
                  </p>
                  <Button
                    onClick={() => setLocation("/table-plan")}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Configure Layout
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {/* Room background */}
                <div className="absolute inset-4 bg-white bg-opacity-30 rounded-lg border border-gray-300"></div>

                {/* Placed Tables using SVG renderer */}
                {tablesWithPositions.map((table: any) => {
                  const position = tablePositions[table.id];
                  const tableBookings = getTableBookings(table.id);

                  return (
                    <SVGTableRenderer
                      key={`positioned-table-${table.id}`}
                      position={position}
                      tableId={table.id}
                      table={table}
                      bookings={tableBookings}
                    />
                  );
                })}
              </>
            )}
          </div>

          {/* Legend and Status */}
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-600 rounded"></div>
                <span>Available</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-600 rounded"></div>
                <span>Booked</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                <span>Active Booking</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                {tablesWithPositions.length} tables positioned •{" "}
                {selectedDateBookings.length} bookings today
              </div>
              <Button
                onClick={() => setLocation("/table-plan")}
                variant="outline"
                size="sm"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Layout
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Welcome Animation */}
      {showWelcomeAnimation && (
        <WelcomeAnimation
          restaurant={restaurant}
          todayBookings={todayBookings}
          onAnimationComplete={handleWelcomeComplete}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div>
              <div className="flex items-center space-x-4">
                <h1 className="text-2xl font-bold text-gray-900">
                  {formatDate(selectedDate, "EEEE dd MMMM yyyy")}
                </h1>
                <div className="flex items-center gap-3">
                  <div className="flex items-center bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                    <Clock className="h-4 w-4 mr-2 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">
                      {formatTime(
                        currentTime,
                        generalSettings?.timeFormat === "12"
                          ? "hh:mm:ss a"
                          : "HH:mm:ss",
                      )}
                    </span>
                  </div>
                  <AnimatedNotificationBadge
                    count={getUpcomingReservations().length}
                    urgentCount={getUrgentReservations().length}
                  />
                </div>
              </div>
              {(() => {
                const todayHours = getTodayOpeningHours();
                const isTodaySelected =
                  format(selectedDate, "yyyy-MM-dd") ===
                  format(new Date(), "yyyy-MM-dd");

                if (isTodaySelected && todayHours) {
                  return (
                    <div className="text-sm text-gray-600 flex items-center mt-1">
                      <Clock className="h-4 w-4 mr-1" />
                      {todayHours.isOpen ? (
                        <span>
                          Open today: {todayHours.openTime} -{" "}
                          {todayHours.closeTime}
                        </span>
                      ) : (
                        <span className="text-red-600">Closed today</span>
                      )}
                    </div>
                  );
                }
                return null;
              })()}
            </div>
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <Button
                variant={viewMode === "calendar" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("calendar")}
                className={viewMode === "calendar" ? "bg-white shadow-sm" : ""}
              >
                <List className="h-4 w-4 mr-2" />
                Calendar
              </Button>
              <Button
                variant={viewMode === "layout" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("layout")}
                className={viewMode === "layout" ? "bg-white shadow-sm" : ""}
              >
                <Map className="h-4 w-4 mr-2" />
                Layout
              </Button>
              <Button
                variant={viewMode === "status" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("status")}
                className={viewMode === "status" ? "bg-white shadow-sm" : ""}
              >
                <Clock4 className="h-4 w-4 mr-2" />
                Live Status
              </Button>
              <Button
                variant={viewMode === "menu" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("menu")}
                className={viewMode === "menu" ? "bg-white shadow-sm" : ""}
              >
                <ChefHat className="h-4 w-4 mr-2" />
                Menu
              </Button>
            </div>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => {
                // Find the first available table for immediate booking
                const now = new Date();
                const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
                const availableTable = findAlternativeTable(
                  2,
                  currentTime,
                  selectedDate,
                );

                if (availableTable) {
                  setSelectedTableForBooking(availableTable);
                  setNewBooking({
                    customerName: "",
                    customerEmail: "",
                    customerPhone: "",
                    guestCount: 2,
                    startTime: currentTime,
                    endTime:
                      String(parseInt(currentTime.split(":")[0]) + 2).padStart(
                        2,
                        "0",
                      ) +
                      ":" +
                      currentTime.split(":")[1],
                    notes: "",
                  });
                  setIsNewBookingOpen(true);
                } else {
                  toast({
                    title: "No Available Tables",
                    description:
                      "No tables are currently available for immediate booking. Try selecting a different time or date.",
                    variant: "destructive",
                  });
                }
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              New booking
            </Button>
            <WalkInBookingButton />
          </div>
        </div>

        {/* Main Interface */}
        <div className="flex-1 p-6">
          {/* Sneak Peek Banner for non-enterprise users */}
          <SneakPeekBanner currentPlan="basic" className="mb-6" />

          {/* Active Seasonal Theme Banner */}
          <ActiveSeasonalThemeDisplay
            restaurantId={restaurant?.id || 0}
            tenantId={restaurant?.tenantId || 0}
            variant="banner"
          />

          {/* Reservation Countdown - only show in calendar view */}
          {viewMode === "calendar" && (
            <div className="mb-6">
              <ReservationCountdown
                reservations={selectedDateBookings || []}
                className="max-w-6xl mx-auto"
              />
            </div>
          )}

          {viewMode === "layout" ? (
            renderTableLayout()
          ) : viewMode === "status" ? (
            <RealTimeTableStatus
              restaurantId={restaurant?.id || 0}
              tenantId={restaurant?.tenantId || 0}
              showCompactView={false}
              autoRefresh={true}
              refreshInterval={30000}
            />
          ) : viewMode === "menu" ? (
            <MenuManagement
              restaurantId={restaurant?.id || 0}
              tenantId={restaurant?.tenantId || 0}
            />
          ) : (
            <EnhancedGoogleCalendar
              selectedDate={selectedDate}
              bookings={(selectedDateBookings as any) || []}
              allBookings={(allBookings as any) || []}
              tables={(tables as any) || []}
              isLoading={isLoading}
              onDateSelect={setSelectedDate}
            />
          )}
        </div>
      </div>

      {/* New Booking Dialog */}
      <UnifiedBookingModal
        open={isNewBookingOpen}
        onOpenChange={setIsNewBookingOpen}
        title={
          selectedTableForBooking
            ? `Create Booking for Table ${selectedTableForBooking.tableNumber}`
            : "Create New Booking"
        }
        initialData={{
          customerName: newBooking.customerName,
          customerEmail: newBooking.customerEmail,
          customerPhone: newBooking.customerPhone,
          guestCount: newBooking.guestCount,
          startTime: newBooking.startTime,
          specialRequests: newBooking.notes,
        }}
        tables={Array.isArray(tables) ? tables : []}
        onSubmit={handleCreateBooking}
        isLoading={createBookingMutation.isPending}
        submitButtonText={
          createBookingMutation.isPending ? "Creating..." : "Create Booking"
        }
        mode="create"
      />

      {/* Booking Management Dialog */}
      <Dialog open={showBookingManager} onOpenChange={setShowBookingManager}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Manage Bookings - Table {selectedTableForBooking?.tableNumber}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedTableBookings.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No bookings for this table today.
              </p>
            ) : (
              <div className="space-y-3">
                {selectedTableBookings.map((booking) => (
                  <div key={booking.id} className="border rounded-lg p-4">
                    {editingBooking?.id === booking.id ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Customer Name</Label>
                            <Input
                              value={editingBooking.customerName}
                              onChange={(e) =>
                                setEditingBooking({
                                  ...editingBooking,
                                  customerName: e.target.value,
                                })
                              }
                            />
                          </div>
                          <div>
                            <Label>Status</Label>
                            <Select
                              value={editingBooking.status}
                              onValueChange={(value) =>
                                setEditingBooking({
                                  ...editingBooking,
                                  status: value,
                                })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="confirmed">
                                  Confirmed
                                </SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="cancelled">
                                  Cancelled
                                </SelectItem>
                                <SelectItem value="no-show">No Show</SelectItem>
                                <SelectItem value="completed">
                                  Completed
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <Label>Guests</Label>
                            <Select
                              value={editingBooking.guestCount.toString()}
                              onValueChange={(value) =>
                                setEditingBooking({
                                  ...editingBooking,
                                  guestCount: parseInt(value),
                                })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                                  <SelectItem key={num} value={num.toString()}>
                                    {num}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Start Time</Label>
                            <Input
                              type="time"
                              value={editingBooking.startTime}
                              onChange={(e) =>
                                setEditingBooking({
                                  ...editingBooking,
                                  startTime: e.target.value,
                                })
                              }
                            />
                          </div>
                          <div>
                            <Label>End Time</Label>
                            <Input
                              type="time"
                              value={editingBooking.endTime}
                              onChange={(e) =>
                                setEditingBooking({
                                  ...editingBooking,
                                  endTime: e.target.value,
                                })
                              }
                            />
                          </div>
                        </div>
                        <div>
                          <Label>Notes</Label>
                          <Input
                            value={editingBooking.notes || ""}
                            onChange={(e) =>
                              setEditingBooking({
                                ...editingBooking,
                                notes: e.target.value,
                              })
                            }
                            placeholder="Special requests, dietary requirements..."
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => {
                              updateBookingMutation.mutate({
                                bookingId: booking.id,
                                updates: {
                                  customerName: editingBooking.customerName,
                                  status: editingBooking.status,
                                  guestCount: editingBooking.guestCount,
                                  startTime: editingBooking.startTime,
                                  endTime: editingBooking.endTime,
                                  notes: editingBooking.notes,
                                },
                              });
                            }}
                            disabled={updateBookingMutation.isPending}
                          >
                            {updateBookingMutation.isPending
                              ? "Saving..."
                              : "Save"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingBooking(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <div className="flex items-center gap-3">
                            <h4 className="font-medium">
                              {booking.customerName}
                            </h4>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                booking.status === "confirmed"
                                  ? "bg-green-100 text-green-800"
                                  : booking.status === "cancelled"
                                    ? "bg-red-100 text-red-800"
                                    : booking.status === "completed"
                                      ? "bg-blue-100 text-blue-800"
                                      : "bg-yellow-100 text-yellow-800"
                              }`}
                            >
                              {booking.status || "Confirmed"}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600">
                            <span>
                              {booking.startTime} - {booking.endTime}
                            </span>
                            <span className="mx-2">•</span>
                            <span>{booking.guestCount} guests</span>
                          </div>
                          <div className="text-sm text-gray-500">
                            {booking.customerEmail}{" "}
                            {booking.customerPhone &&
                              `• ${booking.customerPhone}`}
                          </div>
                          {booking.notes && (
                            <div className="text-sm text-gray-500">
                              Notes: {booking.notes}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingBooking({ ...booking })}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (
                                confirm(
                                  "Are you sure you want to cancel this booking?",
                                )
                              ) {
                                updateBookingMutation.mutate({
                                  bookingId: booking.id,
                                  updates: { status: "cancelled" },
                                });
                              }
                            }}
                            className="text-red-600 hover:text-red-700"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowBookingManager(false);
                  setEditingBooking(null);
                }}
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
