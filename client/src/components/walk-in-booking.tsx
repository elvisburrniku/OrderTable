import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth.tsx";
import { UserPlus, Calendar, Clock, Users, Phone, FileText } from "lucide-react";

interface WalkInBookingProps {
  restaurantId: number;
  tenantId: number;
}

interface Table {
  id: number;
  table_number: string;
  capacity: number;
  isActive?: boolean;
}

function WalkInBookingButton() {
  const { restaurant } = useAuth();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    guestCount: 2,
    bookingDate: new Date().toISOString().split('T')[0],
    startTime: new Date().toTimeString().slice(0, 5),
    endTime: "",
    tableId: "auto",
    customerName: "",
    customerPhone: "",
    notes: "",
    specialRequests: ""
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch available tables
  const { data: tables = [], isLoading: tablesLoading } = useQuery<Table[]>({
    queryKey: [`/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/tables`],
    enabled: !!restaurant?.id && !!restaurant?.tenantId
  });

  // Fetch existing bookings to check availability
  const { data: bookings = [] } = useQuery({
    queryKey: [`/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/bookings`],
    enabled: !!restaurant?.id && !!restaurant?.tenantId
  });

  const walkInMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const bookingData = {
        customerName: data.customerName || "Walk-in Customer",
        customerEmail: "",
        customerPhone: data.customerPhone,
        guestCount: data.guestCount,
        bookingDate: data.bookingDate,
        startTime: data.startTime,
        endTime: data.endTime,
        tableId: data.tableId === "auto" ? null : parseInt(data.tableId),
        notes: data.notes,
        specialRequests: data.specialRequests,
        isWalkIn: true
      };

      const response = await fetch(`/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/bookings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bookingData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create walk-in booking");
      }
      
      return response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Walk-in booking created",
        description: `Booking for ${formData.guestCount} guests has been confirmed${data.booking?.tableId ? ` at table ${data.booking.tableId}` : ''}`
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ 
        queryKey: [`/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/bookings`] 
      });
      queryClient.invalidateQueries({ 
        queryKey: [`/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/customers`] 
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/notifications`]
      });
      
      setOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create walk-in booking",
        description: error.message || "Please try again",
        variant: "destructive"
      });
    }
  });

  const resetForm = () => {
    setFormData({
      guestCount: 2,
      bookingDate: new Date().toISOString().split('T')[0],
      startTime: new Date().toTimeString().slice(0, 5),
      endTime: "",
      tableId: "auto",
      customerName: "",
      customerPhone: "",
      notes: "",
      specialRequests: ""
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    walkInMutation.mutate(formData);
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Check if a table is available at the requested time
  const isTableAvailable = (tableId: number, startTime: string, endTime: string, bookingDate: string) => {
    if (!startTime || !endTime) return true; // If no end time specified, assume available

    const requestedStart = timeToMinutes(startTime);
    const requestedEnd = timeToMinutes(endTime);
    
    // Filter bookings for this table on the selected date
    const tableBookings = bookings.filter((booking: any) => 
      booking.tableId === tableId && 
      booking.bookingDate.split('T')[0] === bookingDate &&
      booking.status !== 'cancelled'
    );

    // Check for time conflicts
    return !tableBookings.some((booking: any) => {
      const existingStart = timeToMinutes(booking.startTime);
      const existingEnd = timeToMinutes(booking.endTime || "23:59");
      
      // Add 30-minute buffer for table turnover
      const bufferMinutes = 30;
      const requestedStartWithBuffer = requestedStart - bufferMinutes;
      const requestedEndWithBuffer = requestedEnd + bufferMinutes;
      const existingStartWithBuffer = existingStart - bufferMinutes;
      const existingEndWithBuffer = existingEnd + bufferMinutes;
      
      // Check for overlap: start1 < end2 && start2 < end1
      return requestedStartWithBuffer < existingEndWithBuffer && existingStartWithBuffer < requestedEndWithBuffer;
    });
  };

  // Convert time string to minutes (e.g., "14:30" -> 870)
  const timeToMinutes = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Filter available tables based on guest count and time availability
  const suitableTables = tables.filter(table => {
    // Check capacity
    if (table.capacity < formData.guestCount) return false;
    
    // If no time specified, show all tables with sufficient capacity
    if (!formData.startTime) return true;
    
    // Calculate end time if not provided (default 2 hours)
    let endTime = formData.endTime;
    if (!endTime && formData.startTime) {
      const startMinutes = timeToMinutes(formData.startTime);
      const endMinutes = startMinutes + 120; // 2 hours default
      endTime = `${Math.floor(endMinutes / 60).toString().padStart(2, '0')}:${(endMinutes % 60).toString().padStart(2, '0')}`;
    }
    
    // Check availability
    return isTableAvailable(table.id, formData.startTime, endTime, formData.bookingDate);
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full sm:w-auto">
          <UserPlus className="w-4 h-4 mr-2" />
          Walk-in Booking
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Create Walk-in Booking
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Booking Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Booking Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="guestCount" className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Guest Count
                  </Label>
                  <Input
                    id="guestCount"
                    type="number"
                    min="1"
                    max="20"
                    value={formData.guestCount}
                    onChange={(e) => handleInputChange("guestCount", parseInt(e.target.value))}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="bookingDate">Date</Label>
                  <Input
                    id="bookingDate"
                    type="date"
                    value={formData.bookingDate}
                    onChange={(e) => handleInputChange("bookingDate", e.target.value)}
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startTime" className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Start Time
                  </Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => handleInputChange("startTime", e.target.value)}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="endTime">End Time (Optional)</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => handleInputChange("endTime", e.target.value)}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="tableId">Table (Optional)</Label>
                <Select 
                  value={formData.tableId} 
                  onValueChange={(value) => handleInputChange("tableId", value)}
                  disabled={tablesLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={tablesLoading ? "Loading tables..." : "Auto-assign table"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto-assign table</SelectItem>
                    {!tablesLoading && suitableTables.map((table) => (
                      <SelectItem key={table.id} value={table.id.toString()}>
                        Table {table.table_number} (Capacity: {table.capacity})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!tablesLoading && suitableTables.length === 0 && formData.guestCount > 0 && formData.startTime && (
                  <p className="text-sm text-orange-600 mt-1">
                    No tables available for {formData.guestCount} guests at {formData.startTime}
                  </p>
                )}
                {!tablesLoading && suitableTables.length === 0 && formData.guestCount > 0 && !formData.startTime && (
                  <p className="text-sm text-orange-600 mt-1">
                    No tables available for {formData.guestCount} guests
                  </p>
                )}
                {!tablesLoading && suitableTables.length > 0 && (
                  <p className="text-sm text-green-600 mt-1">
                    {suitableTables.length} table{suitableTables.length !== 1 ? 's' : ''} available
                  </p>
                )}
                {tablesLoading && (
                  <p className="text-sm text-gray-500 mt-1">
                    Loading available tables...
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Customer Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customerName">Name (Optional)</Label>
                  <Input
                    id="customerName"
                    type="text"
                    placeholder="Walk-in Customer"
                    value={formData.customerName}
                    onChange={(e) => handleInputChange("customerName", e.target.value)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="customerPhone" className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Phone (Optional)
                  </Label>
                  <Input
                    id="customerPhone"
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    value={formData.customerPhone}
                    onChange={(e) => handleInputChange("customerPhone", e.target.value)}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="notes" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Notes
                </Label>
                <Textarea
                  id="notes"
                  placeholder="Any additional notes about the customer..."
                  value={formData.notes}
                  onChange={(e) => handleInputChange("notes", e.target.value)}
                  rows={2}
                />
              </div>
              
              <div>
                <Label htmlFor="specialRequests">Special Requests</Label>
                <Textarea
                  id="specialRequests"
                  placeholder="Special dietary requirements, celebrations, etc..."
                  value={formData.specialRequests}
                  onChange={(e) => handleInputChange("specialRequests", e.target.value)}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)}
              disabled={walkInMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={walkInMutation.isPending || suitableTables.length === 0}
            >
              {walkInMutation.isPending ? "Creating..." : "Create Booking"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default WalkInBookingButton;