import { useState } from "react";
import { useAuth } from "@/lib/auth.tsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function PeriodicCriteria() {
  const { user, restaurant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentCriteria, setCurrentCriteria] = useState({
    name: "",
    capacity: {
      minCapacity: 0,
      maxCapacity: 0,
      fixedCapacity: false
    },
    bookingRequests: {
      acceptDirectBooking: false,
      requestBookingDuration: "",
      bufferBeforeBooking: "",
      bufferAfterBooking: "",
      maxDaysAhead: "",
      maxBookingsPerDay: "",
      maxConcurrentBookings: "",
      maxTimeslotOccupancy: "",
      payment: false,
      bookingRequestsFor: "Default"
    },
    bookingData: {
      bookingNote: "",
      requestEmailRequired: false
    },
    confirmationEmailData: {
      confirmationText: "",
      requestEmailData: false
    }
  });

  // Fetch periodic criteria
  const { data: criteriaList, isLoading } = useQuery({
    queryKey: [`/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/periodic-criteria`],
    enabled: !!restaurant?.id && !!restaurant?.tenantId,
  });

  // Save criteria mutation
  const saveCriteriaMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/tenants/${restaurant.tenantId}/restaurants/${restaurant.id}/periodic-criteria`, {
        name: currentCriteria.name,
        period: "24", // Default period
        guests: currentCriteria.capacity.maxCapacity,
        settings: JSON.stringify(currentCriteria),
        isActive: true,
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Periodic criteria saved successfully",
      });
      queryClient.invalidateQueries({ 
        queryKey: [`/api/tenants/${restaurant.tenantId}/restaurants/${restaurant.id}/periodic-criteria`] 
      });
      // Reset form
      setCurrentCriteria({
        name: "",
        capacity: { minCapacity: 0, maxCapacity: 0, fixedCapacity: false },
        bookingRequests: {
          acceptDirectBooking: false,
          requestBookingDuration: "",
          bufferBeforeBooking: "",
          bufferAfterBooking: "",
          maxDaysAhead: "",
          maxBookingsPerDay: "",
          maxConcurrentBookings: "",
          maxTimeslotOccupancy: "",
          payment: false,
          bookingRequestsFor: "Default"
        },
        bookingData: { bookingNote: "", requestEmailRequired: false },
        confirmationEmailData: { confirmationText: "", requestEmailData: false }
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save periodic criteria",
        variant: "destructive",
      });
      console.error("Error saving criteria:", error);
    },
  });

  if (!user || !restaurant) {
    return null;
  }

  const handleSave = () => {
    if (!currentCriteria.name.trim()) {
      toast({
        title: "Error",
        description: "Please enter a criteria name",
        variant: "destructive",
      });
      return;
    }
    saveCriteriaMutation.mutate();
  };

  const updateCriteria = (section: string, field: string, value: any) => {
    setCurrentCriteria(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6 max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Periodic Criteria</CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Basic Information */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={currentCriteria.name}
                  onChange={(e) => setCurrentCriteria(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter criteria name"
                />
              </div>
            </div>

            {/* Capacity Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Capacity</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="min-capacity">Min capacity</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="min-capacity"
                      type="number"
                      value={currentCriteria.capacity.minCapacity}
                      onChange={(e) => updateCriteria('capacity', 'minCapacity', parseInt(e.target.value) || 0)}
                    />
                    <Checkbox
                      checked={currentCriteria.capacity.fixedCapacity}
                      onCheckedChange={(checked) => updateCriteria('capacity', 'fixedCapacity', checked)}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="max-capacity">Max capacity</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="max-capacity"
                      type="number"
                      value={currentCriteria.capacity.maxCapacity}
                      onChange={(e) => updateCriteria('capacity', 'maxCapacity', parseInt(e.target.value) || 0)}
                    />
                    <Checkbox
                      checked={currentCriteria.capacity.fixedCapacity}
                      onCheckedChange={(checked) => updateCriteria('capacity', 'fixedCapacity', checked)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Booking Requests Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Booking requests</h3>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="accept-direct"
                  checked={currentCriteria.bookingRequests.acceptDirectBooking}
                  onCheckedChange={(checked) => updateCriteria('bookingRequests', 'acceptDirectBooking', checked)}
                />
                <Label htmlFor="accept-direct">Accept direct booking</Label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Request booking duration</Label>
                  <Select
                    value={currentCriteria.bookingRequests.requestBookingDuration}
                    onValueChange={(value) => updateCriteria('bookingRequests', 'requestBookingDuration', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Default" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Default</SelectItem>
                      <SelectItem value="30min">30 minutes</SelectItem>
                      <SelectItem value="1hour">1 hour</SelectItem>
                      <SelectItem value="2hours">2 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Buffer before booking</Label>
                  <Select
                    value={currentCriteria.bookingRequests.bufferBeforeBooking}
                    onValueChange={(value) => updateCriteria('bookingRequests', 'bufferBeforeBooking', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Default" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Default</SelectItem>
                      <SelectItem value="15min">15 minutes</SelectItem>
                      <SelectItem value="30min">30 minutes</SelectItem>
                      <SelectItem value="1hour">1 hour</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Buffer after booking</Label>
                  <Select
                    value={currentCriteria.bookingRequests.bufferAfterBooking}
                    onValueChange={(value) => updateCriteria('bookingRequests', 'bufferAfterBooking', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Default" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Default</SelectItem>
                      <SelectItem value="15min">15 minutes</SelectItem>
                      <SelectItem value="30min">30 minutes</SelectItem>
                      <SelectItem value="1hour">1 hour</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Max days ahead</Label>
                  <Select
                    value={currentCriteria.bookingRequests.maxDaysAhead}
                    onValueChange={(value) => updateCriteria('bookingRequests', 'maxDaysAhead', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Default" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Default</SelectItem>
                      <SelectItem value="7">7 days</SelectItem>
                      <SelectItem value="14">14 days</SelectItem>
                      <SelectItem value="30">30 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Max bookings per day</Label>
                  <Select
                    value={currentCriteria.bookingRequests.maxBookingsPerDay}
                    onValueChange={(value) => updateCriteria('bookingRequests', 'maxBookingsPerDay', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Default" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Default</SelectItem>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Max concurrent bookings</Label>
                  <Select
                    value={currentCriteria.bookingRequests.maxConcurrentBookings}
                    onValueChange={(value) => updateCriteria('bookingRequests', 'maxConcurrentBookings', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Default" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Default</SelectItem>
                      <SelectItem value="1">1</SelectItem>
                      <SelectItem value="2">2</SelectItem>
                      <SelectItem value="5">5</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Max timeslot occupancy</Label>
                  <Select
                    value={currentCriteria.bookingRequests.maxTimeslotOccupancy}
                    onValueChange={(value) => updateCriteria('bookingRequests', 'maxTimeslotOccupancy', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Default" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Default</SelectItem>
                      <SelectItem value="50">50%</SelectItem>
                      <SelectItem value="75">75%</SelectItem>
                      <SelectItem value="100">100%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Payment</Label>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={currentCriteria.bookingRequests.payment}
                      onCheckedChange={(checked) => updateCriteria('bookingRequests', 'payment', checked)}
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label>Booking requests for</Label>
                <div className="flex gap-4 mt-2">
                  <Select
                    value={currentCriteria.bookingRequests.bookingRequestsFor}
                    onValueChange={(value) => updateCriteria('bookingRequests', 'bookingRequestsFor', value)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Default">Default</SelectItem>
                      <SelectItem value="VIP">VIP</SelectItem>
                      <SelectItem value="Regular">Regular</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select defaultValue="Other">
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Other">Other</SelectItem>
                      <SelectItem value="Special">Special</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Booking Data Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Booking Data</h3>
              
              <div>
                <Label htmlFor="booking-note">Booking note</Label>
                <Textarea
                  id="booking-note"
                  value={currentCriteria.bookingData.bookingNote}
                  onChange={(e) => updateCriteria('bookingData', 'bookingNote', e.target.value)}
                  placeholder="Enter booking note"
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="request-email-required"
                  checked={currentCriteria.bookingData.requestEmailRequired}
                  onCheckedChange={(checked) => updateCriteria('bookingData', 'requestEmailRequired', checked)}
                />
                <Label htmlFor="request-email-required">Request email required</Label>
              </div>

              <div>
                <Label>Add instructions</Label>
                <Select defaultValue="Select language">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Select language">Select language</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Confirmation E-mail Data Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Confirmation e-mail data</h3>
              
              <div>
                <Label htmlFor="confirmation-text">Confirmation message text</Label>
                <Textarea
                  id="confirmation-text"
                  value={currentCriteria.confirmationEmailData.confirmationText}
                  onChange={(e) => updateCriteria('confirmationEmailData', 'confirmationText', e.target.value)}
                  placeholder="Enter confirmation message"
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="request-email-data"
                  checked={currentCriteria.confirmationEmailData.requestEmailData}
                  onCheckedChange={(checked) => updateCriteria('confirmationEmailData', 'requestEmailData', checked)}
                />
                <Label htmlFor="request-email-data">Request email data</Label>
              </div>

              <div>
                <Label>Add instructions</Label>
                <Select defaultValue="Select language">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Select language">Select language</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-6">
              <Button 
                onClick={handleSave}
                disabled={saveCriteriaMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {saveCriteriaMutation.isPending ? "Saving..." : "Save changes"}
              </Button>
              <Button 
                variant="outline"
                onClick={() => setCurrentCriteria({
                  name: "",
                  capacity: { minCapacity: 0, maxCapacity: 0, fixedCapacity: false },
                  bookingRequests: {
                    acceptDirectBooking: false,
                    requestBookingDuration: "",
                    bufferBeforeBooking: "",
                    bufferAfterBooking: "",
                    maxDaysAhead: "",
                    maxBookingsPerDay: "",
                    maxConcurrentBookings: "",
                    maxTimeslotOccupancy: "",
                    payment: false,
                    bookingRequestsFor: "Default"
                  },
                  bookingData: { bookingNote: "", requestEmailRequired: false },
                  confirmationEmailData: { confirmationText: "", requestEmailData: false }
                })}
              >
                Reset form
              </Button>
            </div>

            {/* Existing Criteria List */}
            {criteriaList && criteriaList.length > 0 && (
              <div className="space-y-4 pt-8 border-t">
                <h3 className="text-lg font-semibold text-gray-900">Saved Criteria</h3>
                <div className="space-y-2">
                  {criteriaList.map((criteria: any) => (
                    <Card key={criteria.id} className="p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-medium">{criteria.name}</h4>
                          <p className="text-sm text-gray-600">
                            Max guests: {criteria.guests} | Status: {criteria.isActive ? 'Active' : 'Inactive'}
                          </p>
                        </div>
                        <Button variant="outline" size="sm">
                          Edit
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {isLoading && (
              <div className="flex justify-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}