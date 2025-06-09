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
import { ArrowLeft, Edit, Save, X, Trash2, Clock, Calendar, Users, CheckCircle, XCircle, AlertCircle } from "lucide-react";
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

  const { data: changeRequests, refetch: refetchChangeRequests } = useQuery({
    queryKey: [`/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/change-requests`, id],
    queryFn: async () => {
      const response = await fetch(`/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/change-requests`);
      if (!response.ok) throw new Error("Failed to fetch change requests");
      const allRequests = await response.json();
      return allRequests.filter((req: any) => req.bookingId === parseInt(id));
    },
    enabled: !!restaurant && !!restaurant.tenantId && !!restaurant.id && !!id
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

  const changeRequestMutation = useMutation({
    mutationFn: async ({ requestId, action, response }: { requestId: number, action: 'approve' | 'reject', response?: string }) => {
      const res = await fetch(`/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/change-requests/${requestId}/${action}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ response: response || `${action === 'approve' ? 'Approved' : 'Rejected'} via booking details` })
      });
      if (!res.ok) throw new Error(`Failed to ${action} change request`);
      return res.json();
    },
    onSuccess: (data, variables) => {
      refetchChangeRequests();
      queryClient.invalidateQueries({ queryKey: [`/api/tenants/${restaurant?.tenantId}/bookings/${id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/notifications`] });
      toast({ 
        title: `Change request ${variables.action === 'approve' ? 'approved' : 'rejected'} successfully`,
        description: variables.action === 'approve' ? "The booking has been updated with the new details." : "The customer has been notified of the rejection."
      });
    },
    onError: (error, variables) => {
      toast({ 
        title: `Failed to ${variables.action} change request`, 
        variant: "destructive",
        description: "Please try again or contact support if the issue persists."
      });
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

  const getChangeRequestStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
      case "approved":
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatChangeDetails = (changeRequest: any) => {
    const changes = [];
    if (changeRequest?.requestedDate) {
      changes.push(`Date: ${new Date(changeRequest.requestedDate).toLocaleDateString()}`);
    }
    if (changeRequest?.requestedTime) {
      changes.push(`Time: ${changeRequest.requestedTime}`);
    }
    if (changeRequest?.requestedGuestCount) {
      changes.push(`Party Size: ${changeRequest.requestedGuestCount} guests`);
    }
    return changes;
  };

  const handleChangeRequest = (requestId: number, action: 'approve' | 'reject') => {
    changeRequestMutation.mutate({ requestId, action });
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

              {/* Change Requests */}
              {changeRequests && changeRequests.length > 0 && (
                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Change Requests
                  </h3>
                  <div className="space-y-4">
                    {changeRequests.map((request: any) => (
                      <Card key={request.id} className="border-l-4 border-l-orange-400">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-orange-500" />
                              <span className="font-medium text-sm">Request #{request.id}</span>
                              {getChangeRequestStatusBadge(request.status)}
                            </div>
                            <span className="text-xs text-gray-500">
                              {new Date(request.createdAt).toLocaleDateString()} at{" "}
                              {new Date(request.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          
                          {/* Requested Changes */}
                          <div className="bg-orange-50 rounded-lg p-3 mb-3">
                            <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Requested Changes:
                            </h4>
                            <div className="space-y-1">
                              {formatChangeDetails(request).map((change, idx) => (
                                <div key={idx} className="text-sm text-gray-700 flex items-center gap-2">
                                  <span className="w-1 h-1 bg-orange-400 rounded-full"></span>
                                  {change}
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Customer Note */}
                          {request.requestNotes && (
                            <div className="bg-gray-50 rounded-lg p-3 mb-3">
                              <h4 className="font-medium text-sm mb-1">Customer Note:</h4>
                              <p className="text-sm text-gray-700">{request.requestNotes}</p>
                            </div>
                          )}

                          {/* Restaurant Response */}
                          {request.restaurantResponse && (
                            <div className="bg-blue-50 rounded-lg p-3 mb-3">
                              <h4 className="font-medium text-sm mb-1">Restaurant Response:</h4>
                              <p className="text-sm text-gray-700">{request.restaurantResponse}</p>
                              {request.respondedAt && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Responded on {new Date(request.respondedAt).toLocaleDateString()} at{" "}
                                  {new Date(request.respondedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              )}
                            </div>
                          )}

                          {/* Action Buttons for Pending Requests */}
                          {request.status === 'pending' && (
                            <div className="flex gap-2 pt-2">
                              <Button
                                size="sm"
                                onClick={() => handleChangeRequest(request.id, 'approve')}
                                disabled={changeRequestMutation.isPending}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleChangeRequest(request.id, 'reject')}
                                disabled={changeRequestMutation.isPending}
                              >
                                <XCircle className="w-4 h-4 mr-1" />
                                Reject
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

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