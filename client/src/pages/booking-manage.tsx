import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Calendar, Clock, Users, MapPin, CheckCircle, XCircle, AlertCircle, Edit3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, addDays, isBefore, isAfter } from "date-fns";

export default function BookingManage() {
  const { id } = useParams();
  const { toast } = useToast();
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);
  const [newDate, setNewDate] = useState<string>("");
  const [newTime, setNewTime] = useState<string>("");
  const [newGuestCount, setNewGuestCount] = useState<string>("");

  const { data: booking, isLoading, error, refetch } = useQuery({
    queryKey: [`/api/booking-manage/${id}`],
    queryFn: async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const hash = urlParams.get('hash');
      const action = urlParams.get('action');

      if (!hash) {
        throw new Error('Access denied - invalid link');
      }
      
      let url = `/api/booking-manage/${id}?hash=${encodeURIComponent(hash)}`;
      if (action) {
        url += `&action=${encodeURIComponent(action)}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Access denied - invalid or expired link');
        }
        throw new Error("Booking not found");
      }
      return response.json();
    },
    enabled: !!id
  });

  const { data: cutOffTimes } = useQuery({
    queryKey: [`/api/tenants/${booking?.tenantId}/restaurants/${booking?.restaurantId}/cut-off-times`],
    queryFn: async () => {
      const response = await fetch(`/api/tenants/${booking?.tenantId}/restaurants/${booking?.restaurantId}/cut-off-times`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!booking
  });

  const { data: openingHours } = useQuery({
    queryKey: [`/api/tenants/${booking?.tenantId}/restaurants/${booking?.restaurantId}/opening-hours`],
    queryFn: async () => {
      const response = await fetch(`/api/tenants/${booking?.tenantId}/restaurants/${booking?.restaurantId}/opening-hours`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!booking
  });

  const { data: availableTables } = useQuery({
    queryKey: [`/api/booking-manage/${id}/available-tables`, newDate, newTime],
    queryFn: async () => {
      if (!newDate || !newTime || !booking) return [];
      const urlParams = new URLSearchParams(window.location.search);
      const hash = urlParams.get('hash');

      if (!hash) return [];

      const response = await fetch(`/api/booking-manage/${id}/available-tables?hash=${encodeURIComponent(hash)}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!booking && !!newDate && !!newTime && !!isChangeAllowed()
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { 
      tableId?: number; 
      status?: string;
      bookingDate?: string;
      startTime?: string;
      guestCount?: number;
    }) => {
      const urlParams = new URLSearchParams(window.location.search);
      const hash = urlParams.get('hash');

      if (!hash) {
        throw new Error('Access denied - invalid link');
      }

      const response = await fetch(`/api/booking-manage/${id}?hash=${encodeURIComponent(hash)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = "Failed to update booking";
        try {
          const error = JSON.parse(errorText);
          errorMessage = error.message || errorMessage;
        } catch {
          // If response is not JSON, use the status text
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }
      return response.json();
    },
    onSuccess: () => {
      refetch();
      setIsEditing(false);
      toast({ title: "Booking updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: error.message, variant: "destructive" });
    }
  });

  // Function to check if changes are allowed based on backend permissions
  const isChangeAllowed = () => {
    return booking?.canModify ?? false;
  };

  useEffect(() => {
    if (booking) {
      setSelectedTable(booking.tableId?.toString() || "");
      setSelectedStatus(booking.status || "confirmed");
      setNewDate(format(parseISO(booking.bookingDate), 'yyyy-MM-dd'));
      setNewTime(booking.startTime);
      setNewGuestCount(booking.guestCount.toString());
    }
  }, [booking]);

  const getRestrictionMessage = () => {
    if (!booking) return "";

    if (booking.isPastBooking) {
      return "This booking has already finished.";
    }

    if (booking.isBookingStarted) {
      return "This booking has already started and cannot be modified.";
    }

    if (!booking.canModify) {
      const cutOffHours = booking.cutOffHours || 2;
      return `Changes are no longer allowed. Modifications must be made at least ${cutOffHours} hour${cutOffHours > 1 ? 's' : ''} before your reservation time.`;
    }

    const cutOffHours = booking.cutOffHours || 2;
    return `You can modify this booking until ${cutOffHours} hour${cutOffHours > 1 ? 's' : ''} before your reservation time.`;
  };

  const generateTimeSlots = () => {
    if (!openingHours || openingHours.length === 0) return [];

    const selectedDateObj = new Date(newDate);
    const dayOfWeek = selectedDateObj.getDay();

    const dayHours = openingHours.find((oh: any) => oh.dayOfWeek === dayOfWeek);
    if (!dayHours || !dayHours.isOpen) return [];

    const slots = [];
    const startTime = dayHours.openTime;
    const endTime = dayHours.closeTime;

    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);

    let currentHour = startHour;
    let currentMin = startMin;

    while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
      const timeStr = `${currentHour.toString().padStart(2, '0')}:${currentMin.toString().padStart(2, '0')}`;
      slots.push(timeStr);

      currentMin += 30; // 30-minute intervals
      if (currentMin >= 60) {
        currentMin -= 60;
        currentHour += 1;
      }
    }

    return slots;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Loading booking details...</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Booking Not Found</h1>
          <p className="text-gray-600">The booking you're looking for doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  const handleUpdateTable = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const hash = urlParams.get('hash');

    if (!hash) {
      toast({ title: 'Access denied - invalid link', variant: "destructive" });
      return;
    }

    if (selectedTable && selectedTable !== booking.tableId?.toString()) {
      updateMutation.mutate({ tableId: parseInt(selectedTable) });
    }
  };

  const handleCancelBooking = async () => {
    if (!booking?.canCancel) {
      toast({ 
        title: "Cannot cancel booking", 
        description: getRestrictionMessage(),
        variant: "destructive" 
      });
      return;
    }

    if (confirm("Are you sure you want to cancel this booking?")) {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const hash = urlParams.get('hash');

        if (!hash) {
          toast({ title: 'Access denied - invalid link', variant: "destructive" });
          return;
        }

        const response = await fetch(`/api/booking-manage/${id}/cancel`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hash })
        });

        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage = "Failed to cancel booking";
          try {
            const error = JSON.parse(errorText);
            errorMessage = error.message || errorMessage;
          } catch {
            errorMessage = response.statusText || errorMessage;
          }
          throw new Error(errorMessage);
        }

        const result = await response.json();
        refetch();
        toast({ title: "Booking cancelled successfully" });
      } catch (error: any) {
        toast({ title: error.message, variant: "destructive" });
      }
    }
  };

  const handleSaveChanges = () => {
    const changes: any = {};

    if (newDate !== format(parseISO(booking.bookingDate), 'yyyy-MM-dd')) {
      changes.bookingDate = newDate;
    }

    if (newTime !== booking.startTime) {
      changes.startTime = newTime;
    }

    if (parseInt(newGuestCount) !== booking.guestCount) {
      changes.guestCount = parseInt(newGuestCount);
    }

    if (selectedTable && selectedTable !== booking.tableId?.toString()) {
      changes.tableId = parseInt(selectedTable);
    }

    if (Object.keys(changes).length > 0) {
      updateMutation.mutate(changes);
    } else {
      setIsEditing(false);
    }
  };

  const handleStartEdit = () => {
    if (!isChangeAllowed()) {
      toast({ 
        title: "Changes not allowed", 
        description: getRestrictionMessage(),
        variant: "destructive" 
      });
      return;
    }
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    // Reset form to original values
    if (booking) {
      setNewDate(format(parseISO(booking.bookingDate), 'yyyy-MM-dd'));
      setNewTime(booking.startTime);
      setNewGuestCount(booking.guestCount.toString());
      setSelectedTable(booking.tableId?.toString() || "");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-4 h-4 mr-1" />Confirmed</Badge>;
      case "cancelled":
        return <Badge className="bg-red-100 text-red-800"><XCircle className="w-4 h-4 mr-1" />Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const timeDate = new Date();
    timeDate.setHours(parseInt(hours), parseInt(minutes));
    return timeDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Manage Your Booking</h1>
            <p className="text-gray-600">Update your table preference or cancel your reservation</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        <div className="grid gap-6">
          {/* Booking Details Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Booking Details</span>
                {getStatusBadge(booking.status)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="text-sm text-gray-500">Date</p>
                      <p className="font-medium">{formatDate(booking.bookingDate)}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Clock className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="text-sm text-gray-500">Time</p>
                      <p className="font-medium">{formatTime(booking.startTime)} - {formatTime(booking.endTime)}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Users className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="text-sm text-gray-500">Party Size</p>
                      <p className="font-medium">{booking.guestCount} guests</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <MapPin className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="text-sm text-gray-500">Table</p>
                      <p className="font-medium">Table {booking.tableId || 'To be assigned'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t">
                <div>
                  <p className="text-sm text-gray-500">Customer</p>
                  <p className="font-medium">{booking.customerName}</p>
                  <p className="text-sm text-gray-600">{booking.customerEmail}</p>
                  {booking.customerPhone && (
                    <p className="text-sm text-gray-600">{booking.customerPhone}</p>
                  )}
                </div>

                {booking.notes && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-500">Special Requests</p>
                    <p className="text-sm text-gray-700">{booking.notes}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Actions Card */}
          {booking.status !== "cancelled" && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Manage Booking</CardTitle>
                  {!isEditing && (
                    <Button 
                      onClick={handleStartEdit}
                      disabled={!isChangeAllowed()}
                      variant="outline"
                      size="sm"
                    >
                      <Edit3 className="w-4 h-4 mr-2" />
                      Modify Booking
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Cut-off time warning */}
                <div className="flex items-start space-x-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">Modification Policy</p>
                    <p className="text-sm text-blue-700">{getRestrictionMessage() || "You can modify this booking until the scheduled time."}</p>
                    {!isChangeAllowed() && (
                      <p className="text-sm text-red-600 mt-1">Changes are no longer allowed for this booking.</p>
                    )}
                  </div>
                </div>

                {isEditing ? (
                  <div className="space-y-6">
                    {/* Date Selection */}
                    <div>
                      <Label htmlFor="date-select">Booking Date</Label>
                      <Input
                        id="date-select"
                        type="date"
                        value={newDate}
                        onChange={(e) => setNewDate(e.target.value)}
                        min={format(new Date(), 'yyyy-MM-dd')}
                        className="mt-2"
                      />
                    </div>

                    {/* Time Selection */}
                    <div>
                      <Label htmlFor="time-select">Booking Time</Label>
                      <Select value={newTime} onValueChange={setNewTime}>
                        <SelectTrigger className="mt-2">
                          <SelectValue placeholder="Select time" />
                        </SelectTrigger>
                        <SelectContent>
                          {generateTimeSlots().map((time) => (
                            <SelectItem key={time} value={time}>
                              {formatTime(time)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Guest Count */}
                    <div>
                      <Label htmlFor="guest-count">Party Size</Label>
                      <Select value={newGuestCount} onValueChange={setNewGuestCount}>
                        <SelectTrigger className="mt-2">
                          <SelectValue placeholder="Select party size" />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((count) => (
                            <SelectItem key={count} value={count.toString()}>
                              {count} {count === 1 ? 'guest' : 'guests'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Table Selection */}
                    {availableTables && availableTables.length > 0 && (
                      <div>
                        <Label htmlFor="table-select">Table Preference</Label>
                        <Select value={selectedTable} onValueChange={setSelectedTable}>
                          <SelectTrigger className="mt-2">
                            <SelectValue placeholder="Select a table" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">No specific table</SelectItem>
                            {availableTables.map((table: any) => (
                              <SelectItem key={table.id} value={table.id.toString()}>
                                Table {table.tableNumber || table.id} (Seats {table.capacity})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4 border-t">
                      <Button 
                        onClick={handleSaveChanges}
                        disabled={updateMutation.isPending || !isChangeAllowed()}
                        className="flex-1"
                      >
                        Save Changes
                      </Button>
                      <Button 
                        onClick={handleCancelEdit}
                        variant="outline"
                        disabled={updateMutation.isPending}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Quick table change for non-editing mode */}
                    {availableTables && availableTables.length > 0 && booking.tableId && (
                      <div>
                        <Label htmlFor="quick-table-select">Quick Table Change</Label>
                        <div className="flex gap-4 mt-2">
                          <Select value={selectedTable} onValueChange={setSelectedTable}>
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder="Select a table" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableTables.map((table: any) => (
                                <SelectItem key={table.id} value={table.id.toString()}>
                                  Table {table.tableNumber || table.id} (Seats {table.capacity})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button 
                            onClick={handleUpdateTable}
                            disabled={!selectedTable || selectedTable === booking.tableId?.toString() || updateMutation.isPending || !isChangeAllowed()}
                            size="sm"
                          >
                            Update
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Cancel Booking */}
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">Cancel Booking</h3>
                      <p className="text-sm text-gray-500">This action cannot be undone</p>
                    </div>
                    <Button 
                      variant="destructive" 
                      onClick={handleCancelBooking}
                      disabled={updateMutation.isPending || !booking?.canCancel}
                    >
                      Cancel Booking
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Booking Info */}
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-sm text-gray-500">
                <p>Booking ID: #{booking.id}</p>
                <p>Created: {new Date(booking.createdAt).toLocaleDateString()} at {new Date(booking.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}