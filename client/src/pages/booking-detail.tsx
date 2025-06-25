import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth.tsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Edit,
  Save,
  X,
  Trash2,
  Clock,
  Calendar,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
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
    notes: "",
  });

  const {
    data: booking,
    isLoading,
    error,
  } = useQuery({
    queryKey: [`/api/tenants/${restaurant?.tenantId}/bookings/${id}`],
    queryFn: async () => {
      const response = await fetch(
        `/api/tenants/${restaurant?.tenantId}/bookings/${id}`,
      );
      if (!response.ok) throw new Error("Failed to fetch booking");
      return response.json();
    },
    enabled: !!restaurant && !!restaurant.tenantId && !!id,
  });

  const { data: changeRequests, refetch: refetchChangeRequests } = useQuery({
    queryKey: [
      `/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/change-requests`,
      id,
    ],
    queryFn: async () => {
      const response = await fetch(
        `/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/change-requests`,
      );
      if (!response.ok) throw new Error("Failed to fetch change requests");
      const allRequests = await response.json();
      return allRequests.filter((req: any) => req.bookingId === parseInt(id));
    },
    enabled: !!restaurant && !!restaurant.tenantId && !!restaurant.id && !!id,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(
        `/api/tenants/${restaurant?.tenantId}/bookings/${id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
      );
      if (!response.ok) throw new Error("Failed to update booking");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/tenants/${restaurant?.tenantId}/bookings/${id}`],
      });
      queryClient.invalidateQueries({
        queryKey: [
          `/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/bookings`,
        ],
      });
      setIsEditing(false);
      toast({ title: "Booking updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update booking", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(
        `/api/tenants/${restaurant?.tenantId}/bookings/${id}`,
        {
          method: "DELETE",
        },
      );
      if (!response.ok) throw new Error("Failed to delete booking");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [
          `/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/bookings`,
        ],
      });
      toast({ title: "Booking deleted successfully" });
      window.location.href = `/${restaurant.tenantId}/bookings`;
    },
    onError: () => {
      toast({ title: "Failed to delete booking", variant: "destructive" });
    },
  });

  const changeRequestMutation = useMutation({
    mutationFn: async ({
      requestId,
      action,
      response,
    }: {
      requestId: number;
      action: "approve" | "reject";
      response?: string;
    }) => {
      const res = await fetch(
        `/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/change-requests/${requestId}/${action}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            response:
              response ||
              `${action === "approve" ? "Approved" : "Rejected"} via booking details`,
          }),
        },
      );
      if (!res.ok) throw new Error(`Failed to ${action} change request`);
      return res.json();
    },
    onSuccess: (data, variables) => {
      refetchChangeRequests();
      queryClient.invalidateQueries({
        queryKey: [`/api/tenants/${restaurant?.tenantId}/bookings/${id}`],
      });
      queryClient.invalidateQueries({
        queryKey: [
          `/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/notifications`,
        ],
      });
      toast({
        title: `Change request ${variables.action === "approve" ? "approved" : "rejected"} successfully`,
        description:
          variables.action === "approve"
            ? "The booking has been updated with the new details."
            : "The customer has been notified of the rejection.",
      });
    },
    onError: (error, variables) => {
      toast({
        title: `Failed to ${variables.action} change request`,
        variant: "destructive",
        description:
          "Please try again or contact support if the issue persists.",
      });
    },
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
          <Button
            className="mt-4"
            onClick={() =>
              (window.location.href = `/${restaurant.tenantId}/bookings`)
            }
          >
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
      notes: booking.notes || "",
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
        return (
          <Badge
            variant="outline"
            className="bg-yellow-50 text-yellow-700 border-yellow-200"
          >
            Pending
          </Badge>
        );
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
      changes.push(
        `Date: ${new Date(changeRequest.requestedDate).toLocaleDateString()}`,
      );
    }
    if (changeRequest?.requestedTime) {
      changes.push(`Time: ${changeRequest.requestedTime}`);
    }
    if (changeRequest?.requestedGuestCount) {
      changes.push(`Party Size: ${changeRequest.requestedGuestCount} guests`);
    }
    return changes;
  };

  const handleChangeRequest = (
    requestId: number,
    action: "approve" | "reject",
  ) => {
    changeRequestMutation.mutate({ requestId, action });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50">
      {/* Header Section */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto p-6">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => (window.location.href = `/${restaurant.tenantId}/bookings`)}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Bookings
            </Button>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900">Booking Confirmation</h1>
              <p className="text-gray-600">Reservation #{booking.id}</p>
            </div>
            <div className="w-20"></div> {/* Spacer for centering */}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        {/* Main Confirmation Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden mb-6">
          {/* Status Banner */}
          <div className={`px-6 py-4 ${
            booking.status === 'confirmed' ? 'bg-gradient-to-r from-green-500 to-emerald-600' :
            booking.status === 'cancelled' ? 'bg-gradient-to-r from-red-500 to-red-600' :
            booking.status === 'completed' ? 'bg-gradient-to-r from-blue-500 to-blue-600' :
            'bg-gradient-to-r from-yellow-500 to-orange-500'
          }`}>
            <div className="flex items-center justify-center text-white">
              {booking.status === 'confirmed' && <CheckCircle className="w-6 h-6 mr-2" />}
              {booking.status === 'cancelled' && <XCircle className="w-6 h-6 mr-2" />}
              {booking.status === 'completed' && <CheckCircle className="w-6 h-6 mr-2" />}
              {booking.status === 'pending' && <AlertCircle className="w-6 h-6 mr-2" />}
              <span className="text-lg font-semibold capitalize">
                {booking.status === 'confirmed' ? 'Reservation Confirmed' :
                 booking.status === 'cancelled' ? 'Reservation Cancelled' :
                 booking.status === 'completed' ? 'Reservation Completed' :
                 'Reservation Pending'}
              </span>
            </div>
          </div>

          <div className="p-8">
            {/* Restaurant Info */}
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">{restaurant.name}</h2>
              <p className="text-gray-600">{restaurant.address}</p>
            </div>

            {/* Booking Details Grid */}
            <div className="grid md:grid-cols-2 gap-8 mb-8">
              {/* Date & Time Section */}
              <div className="space-y-6">
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Calendar className="w-5 h-5 mr-2 text-blue-600" />
                    Date & Time
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Date:</span>
                      <span className="font-semibold text-gray-900">
                        {new Date(booking.bookingDate).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Time:</span>
                      <span className="font-semibold text-gray-900 flex items-center">
                        <Clock className="w-4 h-4 mr-1 text-blue-600" />
                        {booking.startTime} - {booking.endTime}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Party Details */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Users className="w-5 h-5 mr-2 text-blue-600" />
                    Party Details
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Guest Count:</span>
                      <span className="font-semibold text-gray-900">{booking.guestCount} guests</span>
                    </div>
                    {booking.tableId && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Table:</span>
                        <span className="font-semibold text-gray-900">Table #{booking.tableId}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Customer Information */}
              <div className="space-y-6">
                <div className="bg-blue-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Information</h3>
                  <div className="space-y-3">
                    <div>
                      <span className="text-gray-600 text-sm">Name:</span>
                      <p className="font-semibold text-gray-900">{booking.customerName}</p>
                    </div>
                    <div>
                      <span className="text-gray-600 text-sm">Email:</span>
                      <p className="font-medium text-gray-900">{booking.customerEmail}</p>
                    </div>
                    {booking.customerPhone && (
                      <div>
                        <span className="text-gray-600 text-sm">Phone:</span>
                        <p className="font-medium text-gray-900">{booking.customerPhone}</p>
                      </div>
                    )}
                  </div>
                </div>

                {booking.notes && (
                  <div className="bg-amber-50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Special Requests</h3>
                    <p className="text-gray-700">{booking.notes}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center space-x-4 pt-6 border-t border-gray-200">
              {!isEditing ? (
                <>
                  <Button 
                    onClick={handleEdit}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Booking
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleDelete}
                    className="text-red-600 border-red-300 hover:bg-red-50 px-6 py-2"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Cancel Booking
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    onClick={handleSave}
                    disabled={updateMutation.isPending}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-2"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {updateMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                    className="px-6 py-2"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Edit Form Modal Overlay */}
        {isEditing && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Edit Booking Details</h3>
            <div className="grid md:grid-cols-2 gap-6">
              {/* Customer Information */}
              <div className="space-y-4">
                <h4 className="text-lg font-medium text-gray-900">Customer Information</h4>

                <div>
                  <Label htmlFor="customerName">Name</Label>
                  <Input
                    id="customerName"
                    value={editData.customerName}
                    onChange={(e) =>
                      setEditData({
                        ...editData,
                        customerName: e.target.value,
                      })
                    }
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="customerEmail">Email</Label>
                  <Input
                    id="customerEmail"
                    type="email"
                    value={editData.customerEmail}
                    onChange={(e) =>
                      setEditData({
                        ...editData,
                        customerEmail: e.target.value,
                      })
                    }
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="customerPhone">Phone</Label>
                  <Input
                    id="customerPhone"
                    value={editData.customerPhone}
                    onChange={(e) =>
                      setEditData({
                        ...editData,
                        customerPhone: e.target.value,
                      })
                    }
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Booking Information */}
              <div className="space-y-4">
                <h4 className="text-lg font-medium text-gray-900">Booking Information</h4>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startTime">Start Time</Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={editData.startTime}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          startTime: e.target.value,
                        })
                      }
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="endTime">End Time</Label>
                    <Input
                      id="endTime"
                      type="time"
                      value={editData.endTime}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          endTime: e.target.value,
                        })
                      }
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="guestCount">Guest Count</Label>
                  <Input
                    id="guestCount"
                    type="number"
                    value={editData.guestCount}
                    onChange={(e) =>
                      setEditData({
                        ...editData,
                        guestCount: parseInt(e.target.value) || 0,
                      })
                    }
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={editData.status}
                    onValueChange={(value) =>
                      setEditData({ ...editData, status: value })
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
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

                <div>
                  <Label htmlFor="notes">Special Requests</Label>
                  <Textarea
                    id="notes"
                    value={editData.notes}
                    onChange={(e) =>
                      setEditData({ ...editData, notes: e.target.value })
                    }
                    rows={3}
                    className="mt-1"
                    placeholder="Any special requests or notes..."
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Change Requests Section */}
        {changeRequests && changeRequests.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertCircle className="w-5 h-5 mr-2 text-amber-600" />
                Change Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {changeRequests.map((request: any) => (
                  <div
                    key={request.id}
                    className="p-6 border border-gray-200 rounded-xl bg-gray-50 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <h4 className="font-semibold text-gray-900">Change Request #{request.id}</h4>
                        {getChangeRequestStatusBadge(request.status)}
                      </div>
                      <span className="text-sm text-gray-500">
                        {new Date(request.requestDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                    </div>

                    {request.status === "pending" && (
                      <div className="space-y-4">
                        <div className="bg-white rounded-lg p-4">
                          <p className="text-sm font-medium text-gray-700 mb-2">Requested Changes:</p>
                          <ul className="text-sm text-gray-600 space-y-1">
                            {formatChangeDetails(request).map((change, index) => (
                              <li key={index} className="flex items-center">
                                <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                                {change}
                              </li>
                            ))}
                          </ul>
                          {request.reason && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <p className="text-sm font-medium text-gray-700">Reason:</p>
                              <p className="text-sm text-gray-600 mt-1">{request.reason}</p>
                            </div>
                          )}
                        </div>
                        <div className="flex space-x-3">
                          <Button
                            size="sm"
                            onClick={() => handleChangeRequest(request.id, "approve")}
                            disabled={changeRequestMutation.isPending}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Approve Changes
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleChangeRequest(request.id, "reject")}
                            disabled={changeRequestMutation.isPending}
                            className="text-red-600 border-red-300 hover:bg-red-50"
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Reject Changes
                          </Button>
                        </div>
                      </div>
                    )}

                    {request.status !== "pending" && (
                      <div className="bg-white rounded-lg p-4">
                        <p className="text-sm font-medium text-gray-700">Response:</p>
                        <p className="text-sm text-gray-600 mt-1">
                          {request.response || "No response provided"}
                        </p>
                        {request.responseDate && (
                          <p className="text-xs text-gray-500 mt-2">
                            Responded on {new Date(request.responseDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
