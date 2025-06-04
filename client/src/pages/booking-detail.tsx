import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth.tsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Edit, Save, X, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function BookingDetail() {
  const { id } = useParams();
  const { user, restaurant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    guestCount: 0,
    startTime: "",
    endTime: "",
    status: "",
    notes: ""
  });

  const { data: booking, isLoading, error } = useQuery({
    queryKey: [`/api/tenants/${restaurant?.tenantId}/bookings/${id}`],
    queryFn: async () => {
      const response = await fetch(`/api/tenants/${restaurant?.tenantId}/bookings/${id}`);
      if (!response.ok) throw new Error("Failed to fetch booking");
      return response.json();
    },
    enabled: !!restaurant && !!restaurant.tenantId && !!id
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/tenants/${restaurant?.tenantId}/bookings/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error("Failed to update booking");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tenants/${restaurant?.tenantId}/bookings/${id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/bookings`] });
      setIsEditing(false);
      toast({ title: "Booking updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update booking", variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/tenants/${restaurant?.tenantId}/bookings/${id}`, {
        method: "DELETE"
      });
      if (!response.ok) throw new Error("Failed to delete booking");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/bookings`] });
      toast({ title: "Booking deleted successfully" });
      window.location.href = `/${restaurant.tenantId}/bookings`;
    },
    onError: () => {
      toast({ title: "Failed to delete booking", variant: "destructive" });
    }
  });

  if (!user || !restaurant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Please log in to view booking details</p>
        </div>
      </div>
    );
  }

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
          <p className="text-gray-600">Booking not found</p>
          <Button className="mt-4" onClick={() => window.location.href = `/${restaurant.tenantId}/bookings`}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Bookings
          </Button>
        </div>
      </div>
    );
  }

  const handleEdit = () => {
    setEditData({
      customerName: booking.customerName || "",
      customerEmail: booking.customerEmail || "",
      customerPhone: booking.customerPhone || "",
      guestCount: booking.guestCount || 0,
      startTime: booking.startTime || "",
      endTime: booking.endTime || "",
      status: booking.status || "",
      notes: booking.notes || ""
    });
    setIsEditing(true);
  };

  const handleSave = () => {
    updateMutation.mutate(editData);
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this booking?")) {
      deleteMutation.mutate();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case "completed":
        return <Badge className="bg-blue-100 text-blue-800">Completed</Badge>;
      case "cancelled":
        return <Badge className="bg-red-100 text-red-800">Cancelled</Badge>;
      case "no-show":
        return <Badge className="bg-gray-100 text-gray-800">No Show</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <div className="bg-white border-b">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-6">
            <Button
              variant="ghost"
              onClick={() => window.location.href = `/${restaurant.tenantId}/bookings`}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Bookings</span>
            </Button>
            <h1 className="text-xl font-semibold">Booking #{booking.id}</h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">{restaurant.name}</span>
            <Button variant="outline" size="sm">Profile</Button>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Booking Details</CardTitle>
              <div className="flex items-center space-x-2">
                {!isEditing ? (
                  <>
                    <Button variant="outline" size="sm" onClick={handleEdit}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleDelete} className="text-red-600 hover:text-red-700">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </>
                ) : (
                  <>
                    <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending}>
                      <Save className="w-4 h-4 mr-2" />
                      Save
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                  </>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Customer Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Customer Information</h3>

                  <div>
                    <Label htmlFor="customerName">Name</Label>
                    {isEditing ? (
                      <Input
                        id="customerName"
                        value={editData.customerName}
                        onChange={(e) => setEditData({ ...editData, customerName: e.target.value })}
                      />
                    ) : (
                      <p className="mt-1 text-sm text-gray-900">{booking.customerName}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="customerEmail">Email</Label>
                    {isEditing ? (
                      <Input
                        id="customerEmail"
                        type="email"
                        value={editData.customerEmail}
                        onChange={(e) => setEditData({ ...editData, customerEmail: e.target.value })}
                      />
                    ) : (
                      <p className="mt-1 text-sm text-gray-900">{booking.customerEmail}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="customerPhone">Phone</Label>
                    {isEditing ? (
                      <Input
                        id="customerPhone"
                        value={editData.customerPhone}
                        onChange={(e) => setEditData({ ...editData, customerPhone: e.target.value })}
                      />
                    ) : (
                      <p className="mt-1 text-sm text-gray-900">{booking.customerPhone || "Not provided"}</p>
                    )}
                  </div>
                </div>

                {/* Booking Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Booking Information</h3>

                  <div>
                    <Label>Date</Label>
                    <p className="mt-1 text-sm text-gray-900">
                      {new Date(booking.bookingDate).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="startTime">Start Time</Label>
                      {isEditing ? (
                        <Input
                          id="startTime"
                          value={editData.startTime}
                          onChange={(e) => setEditData({ ...editData, startTime: e.target.value })}
                        />
                      ) : (
                        <p className="mt-1 text-sm text-gray-900">{booking.startTime}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="endTime">End Time</Label>
                      {isEditing ? (
                        <Input
                          id="endTime"
                          value={editData.endTime}
                          onChange={(e) => setEditData({ ...editData, endTime: e.target.value })}
                        />
                      ) : (
                        <p className="mt-1 text-sm text-gray-900">{booking.endTime}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="guestCount">Guest Count</Label>
                    {isEditing ? (
                      <Input
                        id="guestCount"
                        type="number"
                        value={editData.guestCount}
                        onChange={(e) => setEditData({ ...editData, guestCount: parseInt(e.target.value) || 0 })}
                      />
                    ) : (
                      <p className="mt-1 text-sm text-gray-900">{booking.guestCount} guests</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="status">Status</Label>
                    {isEditing ? (
                      <Select value={editData.status} onValueChange={(value) => setEditData({ ...editData, status: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="confirmed">Active</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                          <SelectItem value="no-show">No Show</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="mt-1">{getStatusBadge(booking.status)}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <Label htmlFor="notes">Notes</Label>
                {isEditing ? (
                  <Textarea
                    id="notes"
                    value={editData.notes}
                    onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                    rows={4}
                  />
                ) : (
                  <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
                    {booking.notes || "No notes"}
                  </p>
                )}
              </div>

              {/* Metadata */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-medium mb-4">Booking Metadata</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <Label>Created</Label>
                    <p className="text-gray-900">
                      {new Date(booking.createdAt).toLocaleDateString()} at{" "}
                      {new Date(booking.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div>
                    <Label>Source</Label>
                    <p className="text-gray-900">{booking.source || "Manual"}</p>
                  </div>
                  <div>
                    <Label>Booking ID</Label>
                    <p className="text-gray-900">#{booking.id}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}