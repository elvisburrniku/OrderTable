
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
  MapPin,
  Mail,
  Phone,
  User,
  Hash,
} from "lucide-react";
import { StandardLoading } from "@/components/standard-loading";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function BookingDetail() {
  const { id } = useParams();
  const { user, restaurant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isResendingPaymentLink, setIsResendingPaymentLink] = useState(false);
  const [editData, setEditData] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    guestCount: 0,
    startTime: "",
    endTime: "",
    status: "",
    notes: "",
    bookingDate: "",
    tableId: null as number | null,
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

  const { data: tables } = useQuery({
    queryKey: [`/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/tables`],
    queryFn: async () => {
      const response = await fetch(
        `/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/tables`,
      );
      if (!response.ok) throw new Error("Failed to fetch tables");
      return response.json();
    },
    enabled: !!restaurant && !!restaurant.tenantId && !!restaurant.id,
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
        `/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/bookings/${id}`,
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
    return <StandardLoading message="Please log in to view booking details" />;
  }

  if (isLoading) {
    return <StandardLoading message="Loading booking details..." />;
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Booking Not Found</h2>
          <p className="text-gray-600 mb-6">The booking you're looking for doesn't exist or has been removed.</p>
          <Button
            onClick={() =>
              (window.location.href = `/${restaurant.tenantId}/bookings`)
            }
            className="bg-blue-600 hover:bg-blue-700"
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
      bookingDate: new Date(booking.bookingDate).toISOString().split('T')[0] || "",
      tableId: booking.tableId || null,
    });
    setIsEditing(true);
  };

  const handleSave = () => {
    updateMutation.mutate({
      ...editData,
      bookingDate: editData.bookingDate ? new Date(editData.bookingDate) : new Date(booking.bookingDate),
      tableId: editData.tableId,
    });
  };

  const handleDelete = () => {
    setIsDeleteDialogOpen(false);
    deleteMutation.mutate();
  };

  const handleResendPaymentLink = async () => {
    if (!booking?.requiresPayment || !booking?.paymentAmount) {
      toast({
        title: "Payment not required",
        description: "This booking does not require payment",
        variant: "destructive",
      });
      return;
    }

    setIsResendingPaymentLink(true);

    try {
      const response = await fetch(
        `/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/bookings/${booking.id}/resend-payment-link`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        toast({
          title: "Payment link sent",
          description: "A new payment link has been sent to the customer's email",
        });
      } else {
        const errorData = await response.json();
        toast({
          title: "Failed to send payment link",
          description: errorData.message || "Please try again",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error sending payment link",
        description: "Please try again or contact support",
        variant: "destructive",
      });
    } finally {
      setIsResendingPaymentLink(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      confirmed: { 
        className: "bg-emerald-100 text-emerald-800 border-emerald-200", 
        icon: CheckCircle,
        label: "Confirmed" 
      },
      completed: { 
        className: "bg-blue-100 text-blue-800 border-blue-200", 
        icon: CheckCircle,
        label: "Completed" 
      },
      cancelled: { 
        className: "bg-red-100 text-red-800 border-red-200", 
        icon: XCircle,
        label: "Cancelled" 
      },
      pending: { 
        className: "bg-amber-100 text-amber-800 border-amber-200", 
        icon: AlertCircle,
        label: "Pending" 
      },
      waiting_payment: { 
        className: "bg-orange-100 text-orange-800 border-orange-200", 
        icon: AlertCircle,
        label: "Waiting Payment" 
      },
      "no-show": { 
        className: "bg-gray-100 text-gray-800 border-gray-200", 
        icon: XCircle,
        label: "No Show" 
      },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const IconComponent = config.icon;

    return (
      <Badge className={`${config.className} border font-medium px-3 py-1 text-sm`}>
        <IconComponent className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const getChangeRequestStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge className="bg-amber-50 text-amber-700 border-amber-200 border">
            <AlertCircle className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case "approved":
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 border">
            <CheckCircle className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200 border">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Button
              variant="ghost"
              onClick={() => (window.location.href = `/${restaurant.tenantId}/bookings`)}
              className="flex items-center text-gray-600 hover:text-gray-900 -ml-2"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Bookings
            </Button>
            <div className="flex items-center space-x-3">
              <Hash className="w-5 h-5 text-gray-400" />
              <span className="text-lg font-semibold text-gray-900">Booking #{booking.id}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Main Booking Card */}
        <Card className="shadow-lg border-0 mb-8">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-bold text-gray-900 mb-2">
                  {restaurant.name}
                </CardTitle>
                <p className="text-gray-600 flex items-center">
                  <MapPin className="w-4 h-4 mr-2" />
                  {restaurant.address}
                </p>
              </div>
              {getStatusBadge(booking.status)}
            </div>
          </CardHeader>

          <CardContent className="p-8">
            {!isEditing ? (
              <div className="grid lg:grid-cols-3 gap-8">
                {/* Date & Time */}
                <div className="space-y-6">
                  <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <Calendar className="w-5 h-5 mr-2 text-blue-600" />
                      Date & Time
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 text-sm font-medium">Date</span>
                        <span className="font-semibold text-gray-900">
                          {new Date(booking.bookingDate).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 text-sm font-medium">Time</span>
                        <span className="font-semibold text-gray-900 flex items-center">
                          <Clock className="w-4 h-4 mr-1 text-blue-600" />
                          {booking.startTime} - {booking.endTime}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Party Details */}
                  <div className="bg-green-50 rounded-xl p-6 border border-green-100">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <Users className="w-5 h-5 mr-2 text-green-600" />
                      Party Details
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 text-sm font-medium">Guest Count</span>
                        <span className="font-semibold text-gray-900">{booking.guestCount} guests</span>
                      </div>
                      {booking.tableId && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600 text-sm font-medium">Table</span>
                          <span className="font-semibold text-gray-900">Table #{booking.tableId}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Customer Information */}
                <div className="space-y-6">
                  <div className="bg-purple-50 rounded-xl p-6 border border-purple-100">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <User className="w-5 h-5 mr-2 text-purple-600" />
                      Customer Information
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-start">
                        <User className="w-4 h-4 mr-3 mt-1 text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Name</p>
                          <p className="font-semibold text-gray-900">{booking.customerName}</p>
                        </div>
                      </div>
                      <div className="flex items-start">
                        <Mail className="w-4 h-4 mr-3 mt-1 text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Email</p>
                          <p className="font-medium text-gray-900 break-all">{booking.customerEmail}</p>
                        </div>
                      </div>
                      {booking.customerPhone && (
                        <div className="flex items-start">
                          <Phone className="w-4 h-4 mr-3 mt-1 text-gray-400" />
                          <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Phone</p>
                            <p className="font-medium text-gray-900">{booking.customerPhone}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Additional Information */}
                <div className="space-y-6">
                  {booking.notes && (
                    <div className="bg-amber-50 rounded-xl p-6 border border-amber-100">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                        <AlertCircle className="w-5 h-5 mr-2 text-amber-600" />
                        Special Requests
                      </h3>
                      <p className="text-gray-700 leading-relaxed">{booking.notes}</p>
                    </div>
                  )}

                  {/* Booking Metadata */}
                  <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Booking Information</h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Booking ID</span>
                        <span className="font-mono font-semibold text-gray-900">#{booking.id}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Created</span>
                        <span className="font-medium text-gray-900">
                          {new Date(booking.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Edit Form */
              <div className="space-y-8">
                <div className="border-b border-gray-200 pb-4">
                  <h3 className="text-xl font-bold text-gray-900">Edit Booking Details</h3>
                  <p className="text-gray-600">Update the booking information below</p>
                </div>
                
                <div className="grid md:grid-cols-2 gap-8">
                  {/* Customer Information */}
                  <div className="space-y-6">
                    <h4 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">Customer Information</h4>

                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="customerName" className="text-sm font-medium text-gray-700">Full Name</Label>
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
                          placeholder="Enter customer name"
                        />
                      </div>

                      <div>
                        <Label htmlFor="customerEmail" className="text-sm font-medium text-gray-700">Email Address</Label>
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
                          placeholder="Enter email address"
                        />
                      </div>

                      <div>
                        <Label htmlFor="customerPhone" className="text-sm font-medium text-gray-700">Phone Number</Label>
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
                          placeholder="Enter phone number"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Booking Information */}
                  <div className="space-y-6">
                    <h4 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">Booking Information</h4>

                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="startTime" className="text-sm font-medium text-gray-700">Start Time</Label>
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
                          <Label htmlFor="endTime" className="text-sm font-medium text-gray-700">End Time</Label>
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
                        <Label htmlFor="guestCount" className="text-sm font-medium text-gray-700">Number of Guests</Label>
                        <Input
                          id="guestCount"
                          type="number"
                          min="1"
                          value={editData.guestCount}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              guestCount: parseInt(e.target.value) || 0,
                            })
                          }
                          className="mt-1"
                          placeholder="Enter number of guests"
                        />
                      </div>

                      <div>
                        <Label htmlFor="status" className="text-sm font-medium text-gray-700">Booking Status</Label>
                        <Select
                          value={editData.status}
                          onValueChange={(value) =>
                            setEditData({ ...editData, status: value })
                          }
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="confirmed">Confirmed</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="waiting_payment">Waiting Payment</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="no-show">No Show</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="edit-bookingDate" className="text-sm font-medium text-gray-700">Booking Date</Label>
                        <Input
                          id="edit-bookingDate"
                          type="date"
                          value={editData.bookingDate || new Date(booking.bookingDate).toISOString().split('T')[0]}
                          onChange={(e) =>
                            setEditData({ ...editData, bookingDate: e.target.value })
                          }
                          className="mt-1"
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="edit-tableId" className="text-sm font-medium text-gray-700">Available Tables</Label>
                        <Select
                          value={editData.tableId?.toString() || "none"}
                          onValueChange={(value) =>
                            setEditData({ ...editData, tableId: value === "none" ? null : parseInt(value) })
                          }
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select a table" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No table assigned</SelectItem>
                            {Array.isArray(tables) && tables.map((table: any) => (
                              <SelectItem key={table.id} value={table.id.toString()}>
                                Table {table.tableNumber || table.id} (Capacity: {table.capacity})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="notes" className="text-sm font-medium text-gray-700">Special Requests</Label>
                        <Textarea
                          id="notes"
                          value={editData.notes}
                          onChange={(e) =>
                            setEditData({ ...editData, notes: e.target.value })
                          }
                          rows={4}
                          className="mt-1"
                          placeholder="Any special requests or notes..."
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="flex justify-center space-x-4">
                {!isEditing ? (
                  <>
                    <Button 
                      onClick={handleEdit}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 font-medium"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Booking
                    </Button>
                    {booking?.requiresPayment && booking?.paymentAmount && (
                      <Button
                        onClick={handleResendPaymentLink}
                        disabled={isResendingPaymentLink}
                        variant="outline"
                        className="text-green-600 border-green-300 hover:bg-green-50 hover:border-green-400 px-6 py-2.5 font-medium"
                      >
                        {isResendingPaymentLink ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600 mr-2"></div>
                            Sending...
                          </>
                        ) : (
                          <>
                            <Mail className="w-4 h-4 mr-2" />
                            Resend Payment Link
                          </>
                        )}
                      </Button>
                    )}
                    <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          className="text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400 px-6 py-2.5 font-medium"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Booking
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="max-w-lg">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center text-xl">
                            <AlertCircle className="w-6 h-6 mr-2 text-red-600" />
                            Delete Booking Confirmation
                          </AlertDialogTitle>
                          <AlertDialogDescription className="space-y-3 text-base">
                            <p>
                              Are you sure you want to delete the booking for{" "}
                              <span className="font-semibold text-gray-900">{booking.customerName}</span> on{" "}
                              <span className="font-semibold text-gray-900">
                                {new Date(booking.bookingDate).toLocaleDateString('en-US', {
                                  weekday: 'long',
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}
                              </span>{" "}
                              at <span className="font-semibold text-gray-900">{booking.startTime}</span>?
                            </p>
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                              <p className="text-red-800 text-sm font-medium flex items-center">
                                <XCircle className="w-4 h-4 mr-2" />
                                This action cannot be undone and will permanently remove all booking data.
                              </p>
                            </div>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="gap-3">
                          <AlertDialogCancel className="px-6 py-2.5">Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleDelete}
                            disabled={deleteMutation.isPending}
                            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2.5"
                          >
                            {deleteMutation.isPending ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Deleting...
                              </>
                            ) : (
                              <>
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete Booking
                              </>
                            )}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                ) : (
                  <>
                    <Button
                      onClick={handleSave}
                      disabled={updateMutation.isPending}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-2.5 font-medium"
                    >
                      {updateMutation.isPending ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setIsEditing(false)}
                      className="px-8 py-2.5 font-medium"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Change Requests Section */}
        {changeRequests && changeRequests.length > 0 && (
          <Card className="shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-gray-100">
              <CardTitle className="flex items-center text-xl">
                <AlertCircle className="w-6 h-6 mr-2 text-amber-600" />
                Pending Change Requests
              </CardTitle>
              <p className="text-gray-600 text-sm mt-1">
                Customer requests for booking modifications that require your approval
              </p>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
                {changeRequests.map((request: any) => (
                  <div
                    key={request.id}
                    className="border border-gray-200 rounded-xl p-6 bg-white shadow-sm"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <h4 className="font-semibold text-gray-900 text-lg">Change Request #{request.id}</h4>
                        {getChangeRequestStatusBadge(request.status)}
                      </div>
                      <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                        {new Date(request.requestDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>

                    {request.status === "pending" && (
                      <div className="space-y-6">
                        <div className="bg-blue-50 rounded-lg p-6 border border-blue-100">
                          <p className="text-sm font-semibold text-gray-900 mb-3">Requested Changes:</p>
                          <ul className="space-y-2">
                            {formatChangeDetails(request).map((change, index) => (
                              <li key={index} className="flex items-center text-sm text-gray-700">
                                <div className="w-2 h-2 bg-blue-500 rounded-full mr-3 flex-shrink-0"></div>
                                <span className="font-medium">{change}</span>
                              </li>
                            ))}
                          </ul>
                          {request.reason && (
                            <div className="mt-4 pt-4 border-t border-blue-200">
                              <p className="text-sm font-semibold text-gray-900 mb-2">Customer Note:</p>
                              <p className="text-sm text-gray-700 bg-white rounded-lg p-3 border border-blue-200 italic">
                                "{request.reason}"
                              </p>
                            </div>
                          )}
                        </div>
                        <div className="flex space-x-4">
                          <Button
                            onClick={() => handleChangeRequest(request.id, "approve")}
                            disabled={changeRequestMutation.isPending}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 font-medium"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Approve Changes
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => handleChangeRequest(request.id, "reject")}
                            disabled={changeRequestMutation.isPending}
                            className="text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400 px-6 py-2.5 font-medium"
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Reject Changes
                          </Button>
                        </div>
                      </div>
                    )}

                    {request.status !== "pending" && (
                      <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-gray-900 mb-2">Response:</p>
                            <p className="text-sm text-gray-700 mb-3">
                              {request.response || "No response provided"}
                            </p>
                            {request.responseDate && (
                              <p className="text-xs text-gray-500">
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
                        </div>
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
