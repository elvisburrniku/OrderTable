import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { List, Table, Calendar, Users, Plus } from "lucide-react";
import { Booking, Table as TableType } from "@shared/schema";

interface BookingCalendarProps {
  selectedDate: Date;
  bookings: Booking[];
  tables: TableType[];
  isLoading: boolean;
}

export default function BookingCalendar({ selectedDate, bookings, tables, isLoading }: BookingCalendarProps) {
  const { restaurant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeView, setActiveView] = useState("diagram");
  const [activeTimeFilter, setActiveTimeFilter] = useState("all");
  const [isNewBookingOpen, setIsNewBookingOpen] = useState(false);
  const [newBooking, setNewBooking] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    guestCount: 2,
    startTime: "19:00",
    endTime: "21:00",
    tableId: "",
    notes: ""
  });

  const createBookingMutation = useMutation({
    mutationFn: async (bookingData: any) => {
      return apiRequest("POST", `/api/restaurants/${restaurant?.id}/bookings`, bookingData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/restaurants', restaurant?.id, 'bookings']
      });
      toast({
        title: "Booking Created",
        description: "The booking has been successfully created."
      });
      setIsNewBookingOpen(false);
      setNewBooking({
        customerName: "",
        customerEmail: "",
        customerPhone: "",
        guestCount: 2,
        startTime: "19:00",
        endTime: "21:00",
        tableId: "",
        notes: ""
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create booking. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleCreateBooking = (e: React.FormEvent) => {
    e.preventDefault();
    createBookingMutation.mutate({
      ...newBooking,
      bookingDate: selectedDate.toISOString(),
      tableId: newBooking.tableId ? parseInt(newBooking.tableId) : null,
      restaurantId: restaurant?.id
    });
  };

  const timeSlots = [
    "10:00", "11:00", "12:00", "13:00", "14:00", "15:00",
    "16:00", "17:00", "18:00", "19:00", "20:00", "21:00"
  ];

  const getBookingForTableAndTime = (tableId: number, time: string) => {
    return bookings.find(booking => 
      booking.tableId === tableId && booking.startTime === time
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading bookings...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            variant={activeView === "diagram" ? "default" : "ghost"}
            onClick={() => setActiveView("diagram")}
            className={activeView === "diagram" ? "text-green-600 border-b-2 border-green-600" : ""}
          >
            <List className="h-4 w-4 mr-2" />
            Diagram
          </Button>
          <Button 
            variant={activeView === "list" ? "default" : "ghost"}
            onClick={() => setActiveView("list")}
            className={activeView === "list" ? "text-green-600 border-b-2 border-green-600" : ""}
          >
            <Table className="h-4 w-4 mr-2" />
            List
          </Button>
          <Button 
            variant={activeView === "table-plan" ? "default" : "ghost"}
            onClick={() => setActiveView("table-plan")}
            className={activeView === "table-plan" ? "text-green-600 border-b-2 border-green-600" : ""}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Table plan
          </Button>
        </div>
        
        <div className="flex space-x-2">
          {["all", "morning", "lunch", "evening"].map((filter) => (
            <Button
              key={filter}
              variant={activeTimeFilter === filter ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTimeFilter(filter)}
              className={activeTimeFilter === filter ? "bg-gray-100 text-gray-700" : "text-gray-600"}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* New Booking Dialog */}
      <Dialog open={isNewBookingOpen} onOpenChange={setIsNewBookingOpen}>
        <DialogTrigger asChild>
          <Button className="bg-green-600 hover:bg-green-700 text-white mb-4">
            <Plus className="h-4 w-4 mr-2" />
            New Booking
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Booking</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateBooking} className="space-y-4">
            <div>
              <Label htmlFor="customerName">Customer Name</Label>
              <Input
                id="customerName"
                value={newBooking.customerName}
                onChange={(e) => setNewBooking({ ...newBooking, customerName: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="customerEmail">Email</Label>
              <Input
                id="customerEmail"
                type="email"
                value={newBooking.customerEmail}
                onChange={(e) => setNewBooking({ ...newBooking, customerEmail: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="customerPhone">Phone</Label>
              <Input
                id="customerPhone"
                value={newBooking.customerPhone}
                onChange={(e) => setNewBooking({ ...newBooking, customerPhone: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="guestCount">Number of Guests</Label>
              <Input
                id="guestCount"
                type="number"
                min="1"
                max="12"
                value={newBooking.guestCount}
                onChange={(e) => setNewBooking({ ...newBooking, guestCount: parseInt(e.target.value) })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startTime">Start Time</Label>
                <Select value={newBooking.startTime} onValueChange={(value) => setNewBooking({ ...newBooking, startTime: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timeSlots.map((time) => (
                      <SelectItem key={time} value={time}>{time}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="endTime">End Time</Label>
                <Select value={newBooking.endTime} onValueChange={(value) => setNewBooking({ ...newBooking, endTime: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timeSlots.map((time) => (
                      <SelectItem key={time} value={time}>{time}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="tableId">Table (Optional)</Label>
              <Select value={newBooking.tableId} onValueChange={(value) => setNewBooking({ ...newBooking, tableId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Auto-assign" />
                </SelectTrigger>
                <SelectContent>
                  {tables.map((table) => (
                    <SelectItem key={table.id} value={table.id.toString()}>
                      Table {table.tableNumber} ({table.capacity} seats)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full bg-green-600 hover:bg-green-700" disabled={createBookingMutation.isPending}>
              {createBookingMutation.isPending ? "Creating..." : "Create Booking"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Booking Interface */}
      <Card className="bg-white border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200 p-4 bg-gray-50">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-900">The restaurant</h3>
            <span className="text-sm text-gray-500">
              {bookings.length} bookings - {bookings.reduce((sum, b) => sum + b.guestCount, 0)} guests
            </span>
          </div>
        </div>
        
        <CardContent className="p-4">
          {/* Time header */}
          <div className="grid grid-cols-13 gap-2 mb-4 text-sm text-gray-600">
            <div></div>
            {timeSlots.map((time) => (
              <div key={time} className="text-center">{time}</div>
            ))}
          </div>

          {/* Table rows */}
          <div className="space-y-2">
            {tables.slice(0, 8).map((table) => (
              <div key={table.id} className="grid grid-cols-13 gap-2 items-center">
                <div className="text-sm text-gray-600">
                  {table.tableNumber} ({table.capacity})
                </div>
                {timeSlots.map((time) => {
                  const booking = getBookingForTableAndTime(table.id, time);
                  return (
                    <div
                      key={time}
                      className={`h-8 rounded ${
                        booking 
                          ? "bg-blue-200 border border-blue-300" 
                          : "bg-gray-100"
                      }`}
                      title={booking ? `${booking.customerName} - ${booking.guestCount} guests` : "Available"}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="mt-4 flex items-center space-x-4 text-sm text-gray-600">
        <div className="flex items-center">
          <div className="w-4 h-4 bg-green-600 rounded mr-2" />
          <span>Special opening hours and notes</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-blue-500 rounded mr-2" />
          <span>Bookings</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-red-500 rounded mr-2" />
          <span>Print version (PDF)</span>
        </div>
        <div className="ml-auto">
          <Button variant="link" className="text-green-600 hover:text-green-700 p-0">
            Optimize bookings
          </Button>
        </div>
      </div>
    </div>
  );
}
