import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  Phone, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Users, 
  CreditCard, 
  PhoneCall,
  MessageSquare,
  Settings,
  Euro,
  Plus
} from "lucide-react";

interface VoiceAgentRequest {
  id: number;
  tenantId: number;
  restaurantId: number;
  tenantName: string;
  restaurantName: string;
  businessPurpose: string;
  expectedCallVolume: string;
  requestedBy: string;
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected' | 'revoked';
  approvedBy?: number;
  rejectedBy?: number;
  adminNotes?: string;
  approvedAt?: string;
  rejectedAt?: string;
  voiceAgentId?: number;
  phoneNumber?: string;
  maxCallsPerMonth?: number;
}

interface PhoneNumber {
  id: number;
  phoneNumber: string;
  isAssigned: boolean;
  assignedTo?: string;
}

interface CreditBalance {
  id: number;
  tenantId: number;
  tenantName: string;
  creditBalance: number;
  lastUsageAt?: string;
}

export function AdminVoiceAgents() {
  const [activeTab, setActiveTab] = useState<'requests' | 'phone-numbers' | 'credits'>('requests');
  const [requests, setRequests] = useState<VoiceAgentRequest[]>([]);
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [creditBalances, setCreditBalances] = useState<CreditBalance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Dialog states
  const [selectedRequest, setSelectedRequest] = useState<VoiceAgentRequest | null>(null);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);
  const [showAddCreditsDialog, setShowAddCreditsDialog] = useState(false);
  const [selectedTenantForCredits, setSelectedTenantForCredits] = useState<number | null>(null);
  
  // Form states
  const [selectedPhoneNumber, setSelectedPhoneNumber] = useState<string>("");
  const [maxCallsPerMonth, setMaxCallsPerMonth] = useState<string>("100");
  const [adminNotes, setAdminNotes] = useState<string>("");
  const [creditAmount, setCreditAmount] = useState<string>("20");
  
  const { toast } = useToast();

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const headers = { "Authorization": `Bearer ${token}` };

      const [requestsRes, phoneNumbersRes, creditsRes] = await Promise.all([
        fetch("/api/admin/voice-agent/requests", { headers }),
        fetch("/api/admin/voice-agent/phone-numbers", { headers }),
        fetch("/api/admin/voice-agent/usage-stats", { headers })
      ]);

      if (requestsRes.ok) {
        const requestsData = await requestsRes.json();
        setRequests(requestsData);
      }

      if (phoneNumbersRes.ok) {
        const phoneData = await phoneNumbersRes.json();
        setPhoneNumbers(phoneData);
      }

      if (creditsRes.ok) {
        const creditsData = await creditsRes.json();
        // Handle the response format {"credits": [...]}
        setCreditBalances(creditsData.credits || []);
      }
    } catch (error) {
      console.error("Error fetching voice agent data:", error);
      toast({
        title: "Error",
        description: "Failed to fetch voice agent data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApproveRequest = async () => {
    if (!selectedRequest || !selectedPhoneNumber) return;

    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`/api/admin/voice-agent/requests/${selectedRequest.id}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          phoneNumberId: parseInt(selectedPhoneNumber),
          adminNotes,
          maxCallsPerMonth: parseInt(maxCallsPerMonth)
        })
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Voice agent request approved successfully"
        });
        setShowApprovalDialog(false);
        setSelectedRequest(null);
        setSelectedPhoneNumber("");
        setMaxCallsPerMonth("100");
        setAdminNotes("");
        fetchData();
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.message || "Failed to approve request",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error approving request:", error);
      toast({
        title: "Error",
        description: "Failed to approve request",
        variant: "destructive"
      });
    }
  };

  const handleRejectRequest = async () => {
    if (!selectedRequest) return;

    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`/api/admin/voice-agent/requests/${selectedRequest.id}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          adminNotes: adminNotes || "Request rejected by admin"
        })
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Voice agent request rejected"
        });
        setShowRejectionDialog(false);
        setSelectedRequest(null);
        setAdminNotes("");
        fetchData();
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.message || "Failed to reject request",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error rejecting request:", error);
      toast({
        title: "Error",
        description: "Failed to reject request",
        variant: "destructive"
      });
    }
  };

  const handleAddCredits = async () => {
    if (!selectedTenantForCredits || !creditAmount) return;

    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch("/api/admin/voice-agent/add-credits", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          tenantId: selectedTenantForCredits,
          amount: parseFloat(creditAmount),
          description: `Admin credit addition: €${creditAmount}`
        })
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: `€${creditAmount} credits added successfully`
        });
        setShowAddCreditsDialog(false);
        setSelectedTenantForCredits(null);
        setCreditAmount("20");
        fetchData();
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.message || "Failed to add credits",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error adding credits:", error);
      toast({
        title: "Error",
        description: "Failed to add credits",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="text-green-600 border-green-600"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="text-red-600 border-red-600"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      case 'revoked':
        return <Badge variant="outline" className="text-gray-600 border-gray-600"><XCircle className="w-3 h-3 mr-1" />Revoked</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const availablePhoneNumbers = phoneNumbers.filter(p => !p.isAssigned);

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Voice Agent Management</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage voice agent requests, phone numbers, and credit balances
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('requests')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'requests' 
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' 
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          <MessageSquare className="w-4 h-4 inline mr-2" />
          Requests
        </button>
        <button
          onClick={() => setActiveTab('phone-numbers')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'phone-numbers' 
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' 
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          <Phone className="w-4 h-4 inline mr-2" />
          Phone Numbers
        </button>
        <button
          onClick={() => setActiveTab('credits')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'credits' 
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' 
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          <CreditCard className="w-4 h-4 inline mr-2" />
          Credits
        </button>
      </div>

      {/* Requests Tab */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          <div className="grid gap-4">
            {requests.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Requests Found</h3>
                  <p className="text-gray-500 dark:text-gray-400">No voice agent requests have been submitted yet.</p>
                </CardContent>
              </Card>
            ) : (
              requests.map((request) => (
                <Card key={request.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">
                          {request.restaurantName} ({request.tenantName})
                        </CardTitle>
                        <CardDescription>
                          Requested by {request.requestedBy} • {new Date(request.requestedAt).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      {getStatusBadge(request.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Business Purpose</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{request.businessPurpose}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Expected Call Volume</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{request.expectedCallVolume}</p>
                      </div>
                    </div>

                    {request.adminNotes && (
                      <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Admin Notes</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{request.adminNotes}</p>
                      </div>
                    )}

                    {request.status === 'approved' && request.phoneNumber && (
                      <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-md">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-green-700 dark:text-green-300">Active Voice Agent</p>
                            <p className="text-sm text-green-600 dark:text-green-400">Phone: {request.phoneNumber}</p>
                            <p className="text-sm text-green-600 dark:text-green-400">Max calls/month: {request.maxCallsPerMonth}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {request.status === 'pending' && (
                      <div className="mt-4 flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedRequest(request);
                            setShowApprovalDialog(true);
                          }}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedRequest(request);
                            setShowRejectionDialog(true);
                          }}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {/* Phone Numbers Tab */}
      {activeTab === 'phone-numbers' && (
        <div className="space-y-4">
          <div className="grid gap-4">
            {phoneNumbers.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Phone className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Phone Numbers</h3>
                  <p className="text-gray-500 dark:text-gray-400">No phone numbers have been configured yet.</p>
                </CardContent>
              </Card>
            ) : (
              phoneNumbers.map((phone) => (
                <Card key={phone.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/20">
                          <Phone className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="font-medium">{phone.phoneNumber}</p>
                          {phone.assignedTo && (
                            <p className="text-sm text-gray-500">Assigned to {phone.assignedTo}</p>
                          )}
                        </div>
                      </div>
                      <Badge variant={phone.isAssigned ? "default" : "secondary"}>
                        {phone.isAssigned ? "Assigned" : "Available"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {/* Credits Tab */}
      {activeTab === 'credits' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Credit Balances</h2>
            <Button onClick={() => setShowAddCreditsDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Credits
            </Button>
          </div>
          
          <div className="grid gap-4">
            {creditBalances.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Credit Data</h3>
                  <p className="text-gray-500 dark:text-gray-400">No credit balances found.</p>
                </CardContent>
              </Card>
            ) : (
              creditBalances.map((credit) => (
                <Card key={credit.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/20">
                          <Euro className="w-4 h-4 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <p className="font-medium">{credit.tenantName}</p>
                          {credit.lastUsageAt && (
                            <p className="text-sm text-gray-500">
                              Last usage: {new Date(credit.lastUsageAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold text-green-600">
                          €{(typeof credit.creditBalance === 'number' ? credit.creditBalance : parseFloat(credit.creditBalance || '0')).toFixed(2)}
                        </p>
                        <p className="text-sm text-gray-500">Available</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {/* Approval Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Approve Voice Agent Request</DialogTitle>
            <DialogDescription>
              Configure the voice agent settings for {selectedRequest?.restaurantName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Assign Phone Number</Label>
              <Select value={selectedPhoneNumber} onValueChange={setSelectedPhoneNumber}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a phone number" />
                </SelectTrigger>
                <SelectContent>
                  {availablePhoneNumbers.map((phone) => (
                    <SelectItem key={phone.id} value={phone.id.toString()}>
                      {phone.phoneNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxCalls">Max Calls Per Month</Label>
              <Input
                id="maxCalls"
                type="number"
                value={maxCallsPerMonth}
                onChange={(e) => setMaxCallsPerMonth(e.target.value)}
                placeholder="100"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Admin Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add any notes or special instructions..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApprovalDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleApproveRequest}
              disabled={!selectedPhoneNumber || !maxCallsPerMonth}
            >
              Approve Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={showRejectionDialog} onOpenChange={setShowRejectionDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Voice Agent Request</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting {selectedRequest?.restaurantName}'s request
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rejectNotes">Reason for Rejection</Label>
              <Textarea
                id="rejectNotes"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Please provide a reason for rejecting this request..."
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectionDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleRejectRequest}
            >
              Reject Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Credits Dialog */}
      <Dialog open={showAddCreditsDialog} onOpenChange={setShowAddCreditsDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Credits</DialogTitle>
            <DialogDescription>
              Add voice agent credits to a tenant's account
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tenant">Select Tenant</Label>
              <Select value={selectedTenantForCredits?.toString() || ""} onValueChange={(value) => setSelectedTenantForCredits(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a tenant" />
                </SelectTrigger>
                <SelectContent>
                  {creditBalances.map((credit) => (
                    <SelectItem key={credit.tenantId} value={credit.tenantId.toString()}>
                      {credit.tenantName} (Current: €{(typeof credit.creditBalance === 'number' ? credit.creditBalance : parseFloat(credit.creditBalance || '0')).toFixed(2)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Credit Amount (€)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
                placeholder="20.00"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddCreditsDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddCredits}
              disabled={!selectedTenantForCredits || !creditAmount}
            >
              Add €{creditAmount} Credits
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}