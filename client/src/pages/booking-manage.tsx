
import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Calendar, Clock, Users, MapPin, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function BookingManage() {
  const { id } = useParams();
  const { toast } = useToast();
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");

  const { data: booking, isLoading, error, refetch } = useQuery({
    queryKey: [`/api/booking-manage/${id}`],
    queryFn: async () => {
      const response = await fetch(`/api/booking-manage/${id}`);
      if (!response.ok) throw new Error("Booking not found");
      return response.json();
    },
    enabled: !!id
  });

  const { data: availableTables } = useQuery({
    queryKey: [`/api/booking-manage/${id}/available-tables`],
    queryFn: async () => {
      const response = await fetch(`/api/booking-manage/${id}/available-tables`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!booking
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { tableId?: number; status?: string }) => {
      const response = await fetch(`/api/booking-manage/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error("Failed to update booking");
      return response.json();
    },
    onSuccess: () => {
      refetch();
      toast({ title: "Booking updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update booking", variant: "destructive" });
    }
  });

  useEffect(() => {
    if (booking) {
      setSelectedTable(booking.tableId?.toString() || "");
      setSelectedStatus(booking.status || "confirmed");
    }
  }, [booking]);

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
    if (selectedTable && selectedTable !== booking.tableId?.toString()) {
      updateMutation.mutate({ tableId: parseInt(selectedTable) });
    }
  };

  const handleCancelBooking = () => {
    if (confirm("Are you sure you want to cancel this booking?")) {
      updateMutation.mutate({ status: "cancelled" });
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
                <CardTitle>Manage Booking</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Table Selection */}
                {availableTables && availableTables.length > 0 && (
                  <div>
                    <Label htmlFor="table-select">Change Table</Label>
                    <div className="flex gap-4 mt-2">
                      <Select value={selectedTable} onValueChange={setSelectedTable}>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Select a table" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableTables.map((table: any) => (
                            <SelectItem key={table.id} value={table.id.toString()}>
                              Table {table.id} (Seats {table.capacity})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button 
                        onClick={handleUpdateTable}
                        disabled={!selectedTable || selectedTable === booking.tableId?.toString() || updateMutation.isPending}
                      >
                        Update Table
                      </Button>
                    </div>
                  </div>
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
                      disabled={updateMutation.isPending}
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
