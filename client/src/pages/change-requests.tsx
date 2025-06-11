import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { 
  Clock, 
  Calendar, 
  Users, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  MessageSquare,
  History
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";

interface ChangeRequest {
  id: number;
  bookingId: number;
  requestedDate?: string;
  requestedTime?: string;
  requestedGuestCount?: number;
  requestNotes?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  restaurantResponse?: string;
  respondedAt?: string;
  booking?: {
    id: number;
    customerName: string;
    customerEmail: string;
    bookingDate: string;
    startTime: string;
    guestCount: number;
  };
}

export default function ChangeRequestsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<ChangeRequest | null>(null);
  const [responseText, setResponseText] = useState("");

  // Get restaurant info from localStorage or context
  const restaurant = JSON.parse(localStorage.getItem('restaurant') || '{}');
  const tenantId = restaurant?.tenantId;
  const restaurantId = restaurant?.id;

  // Fetch change requests
  const { data: changeRequests = [], isLoading, refetch } = useQuery({
    queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/change-requests`],
    enabled: !!tenantId && !!restaurantId,
  });

  // Handle approve/reject mutations
  const changeRequestMutation = useMutation({
    mutationFn: async ({ requestId, action, response }: { 
      requestId: number; 
      action: 'approve' | 'reject'; 
      response?: string 
    }) => {
      const res = await fetch(`/api/tenants/${tenantId}/restaurants/${restaurantId}/change-requests/${requestId}/${action}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: response || `${action === 'approve' ? 'Approved' : 'Rejected'} by restaurant staff` })
      });
      if (!res.ok) throw new Error(`Failed to ${action} change request`);
      return res.json();
    },
    onSuccess: (data, variables) => {
      refetch();
      queryClient.invalidateQueries({ queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/notifications`] });
      setSelectedRequest(null);
      setResponseText("");
      toast({ 
        title: `Change request ${variables.action === 'approve' ? 'approved' : 'rejected'} successfully`,
        description: variables.action === 'approve' ? 
          "The booking has been updated with the new details." : 
          "The customer has been notified of the rejection."
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

  const formatChangeDetails = (request: ChangeRequest) => {
    const changes = [];
    
    if (request.requestedDate && request.booking) {
      const originalDate = format(new Date(request.booking.bookingDate), 'MMM dd, yyyy');
      const newDate = format(new Date(request.requestedDate), 'MMM dd, yyyy');
      changes.push(`Date: ${originalDate} → ${newDate}`);
    }
    
    if (request.requestedTime && request.booking) {
      changes.push(`Time: ${request.booking.startTime} → ${request.requestedTime}`);
    }
    
    if (request.requestedGuestCount && request.booking) {
      changes.push(`Party Size: ${request.booking.guestCount} → ${request.requestedGuestCount} guests`);
    }
    
    return changes;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
            <AlertCircle className="w-3 h-3 mr-1" />
            Pending Review
          </Badge>
        );
      case 'approved':
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
            <CheckCircle className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return null;
    }
  };

  const pendingRequests = changeRequests.filter((req: ChangeRequest) => req.status === 'pending');
  const processedRequests = changeRequests.filter((req: ChangeRequest) => req.status !== 'pending');

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Change Requests</h1>
            <p className="text-gray-600 mt-1">
              Review and respond to customer booking change requests
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-500">
              {pendingRequests.length} pending • {processedRequests.length} processed
            </div>
          </div>
        </div>

        {/* Pending Requests */}
        {pendingRequests.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-500" />
              Pending Requests ({pendingRequests.length})
            </h2>
            <div className="grid gap-4">
              {pendingRequests.map((request: ChangeRequest) => (
                <Card key={request.id} className="border-l-4 border-l-yellow-400">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold">{request.booking?.customerName}</h3>
                          {getStatusBadge(request.status)}
                        </div>
                        <p className="text-sm text-gray-600">
                          Request #{request.id} • {request.booking?.customerEmail}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Submitted {format(new Date(request.createdAt), 'MMM dd, yyyy • h:mm a')}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedRequest(request)}
                            >
                              <MessageSquare className="w-4 h-4 mr-1" />
                              Review
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Review Change Request #{request.id}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              {/* Original Booking Info */}
                              <div className="bg-gray-50 rounded-lg p-4">
                                <h4 className="font-medium mb-2">Original Booking</h4>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="text-gray-600">Customer:</span>
                                    <p className="font-medium">{request.booking?.customerName}</p>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">Email:</span>
                                    <p className="font-medium">{request.booking?.customerEmail}</p>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">Date:</span>
                                    <p className="font-medium">
                                      {request.booking && format(new Date(request.booking.bookingDate), 'MMM dd, yyyy')}
                                    </p>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">Time:</span>
                                    <p className="font-medium">{request.booking?.startTime}</p>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">Party Size:</span>
                                    <p className="font-medium">{request.booking?.guestCount} guests</p>
                                  </div>
                                </div>
                              </div>

                              {/* Requested Changes */}
                              <div className="bg-orange-50 rounded-lg p-4">
                                <h4 className="font-medium mb-2 flex items-center gap-2">
                                  <Calendar className="w-4 h-4" />
                                  Requested Changes
                                </h4>
                                <div className="space-y-2">
                                  {formatChangeDetails(request).map((change, idx) => (
                                    <div key={idx} className="flex items-center gap-2 text-sm">
                                      <span className="w-1 h-1 bg-orange-400 rounded-full"></span>
                                      {change}
                                    </div>
                                  ))}
                                </div>
                                {request.requestNotes && (
                                  <div className="mt-3 p-3 bg-white rounded border">
                                    <p className="text-sm text-gray-600 mb-1">Customer Note:</p>
                                    <p className="text-sm">{request.requestNotes}</p>
                                  </div>
                                )}
                              </div>

                              {/* Response */}
                              <div>
                                <label className="block text-sm font-medium mb-2">
                                  Response to Customer (Optional)
                                </label>
                                <Textarea
                                  value={responseText}
                                  onChange={(e) => setResponseText(e.target.value)}
                                  placeholder="Add a message for the customer..."
                                  className="min-h-[80px]"
                                />
                              </div>

                              {/* Action Buttons */}
                              <div className="flex gap-3 pt-4">
                                <Button
                                  onClick={() => changeRequestMutation.mutate({
                                    requestId: request.id,
                                    action: 'approve',
                                    response: responseText
                                  })}
                                  disabled={changeRequestMutation.isPending}
                                  className="bg-green-600 hover:bg-green-700 flex-1"
                                >
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Approve Changes
                                </Button>
                                <Button
                                  variant="destructive"
                                  onClick={() => changeRequestMutation.mutate({
                                    requestId: request.id,
                                    action: 'reject',
                                    response: responseText
                                  })}
                                  disabled={changeRequestMutation.isPending}
                                  className="flex-1"
                                >
                                  <XCircle className="w-4 h-4 mr-2" />
                                  Reject Changes
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>

                    {/* Quick preview of changes */}
                    <div className="bg-orange-50 rounded p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-4 h-4 text-orange-600" />
                        <span className="text-sm font-medium text-orange-800">Requested Changes:</span>
                      </div>
                      <div className="grid gap-1">
                        {formatChangeDetails(request).map((change, idx) => (
                          <p key={idx} className="text-sm text-orange-700">{change}</p>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Processed Requests */}
        {processedRequests.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <History className="w-5 h-5 text-gray-500" />
              Recent Activity ({processedRequests.length})
            </h2>
            <div className="grid gap-3">
              {processedRequests.slice(0, 10).map((request: ChangeRequest) => (
                <Card key={request.id} className="border-l-4 border-l-gray-300">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="font-medium">{request.booking?.customerName}</span>
                          {getStatusBadge(request.status)}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          Request #{request.id} • 
                          {request.respondedAt && ` Processed ${format(new Date(request.respondedAt), 'MMM dd, yyyy')}`}
                        </p>
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatChangeDetails(request).join(' • ')}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {changeRequests.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Change Requests</h3>
              <p className="text-gray-600">
                Customer booking change requests will appear here for your review.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}