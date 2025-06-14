import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Users, 
  MapPin, 
  Calendar,
  ArrowRight,
  Shuffle,
  User,
  Phone,
  Mail,
  AlertCircle,
  RefreshCw,
  Target
} from "lucide-react";
import { format, parseISO, addMinutes, isBefore, isAfter } from "date-fns";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ConflictType {
  id: string;
  type: 'table_double_booking' | 'time_overlap' | 'capacity_exceeded' | 'resource_unavailable';
  severity: 'low' | 'medium' | 'high' | 'critical';
  bookings: BookingConflict[];
  suggestedResolutions: Resolution[];
  autoResolvable: boolean;
  createdAt: string;
}

interface BookingConflict {
  id: number;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  guestCount: number;
  bookingDate: string;
  startTime: string;
  endTime: string;
  tableId?: number;
  tableName?: string;
  status: string;
  priority: number; // VIP, regular, etc.
  depositPaid: boolean;
  notes?: string;
}

interface Resolution {
  id: string;
  type: 'reassign_table' | 'adjust_time' | 'split_party' | 'upgrade_table' | 'waitlist' | 'cancel';
  description: string;
  impact: 'minimal' | 'moderate' | 'significant';
  confidence: number; // 0-100%
  details: {
    newTableId?: number;
    newTime?: string;
    newTables?: number[];
    waitlistPosition?: number;
    compensationSuggested?: boolean;
  };
  estimatedCustomerSatisfaction: number; // 0-100%
  autoExecutable?: boolean;
  bookingId?: number;
  newTableId?: number;
}

interface ConflictResolutionSystemProps {
  restaurantId: number;
  tenantId: number;
  onConflictResolved?: (conflictId: string) => void;
}

export default function ConflictResolutionSystem({ 
  restaurantId, 
  tenantId, 
  onConflictResolved 
}: ConflictResolutionSystemProps) {
  const { restaurant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedConflict, setSelectedConflict] = useState<ConflictType | null>(null);
  const [selectedResolution, setSelectedResolution] = useState<Resolution | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [autoResolveEnabled, setAutoResolveEnabled] = useState(false);
  const [activeTab, setActiveTab] = useState("active");

  // Fetch conflicts using working endpoint
  const { data: conflicts = [], isLoading: conflictsLoading, refetch: refetchConflicts } = useQuery({
    queryKey: [`/conflicts-check/${tenantId}/${restaurantId}`],
    queryFn: async () => {
      const response = await fetch(`/conflicts-check/${tenantId}/${restaurantId}`);
      if (!response.ok) throw new Error("Failed to fetch conflicts");
      return response.json();
    },
    enabled: !!tenantId && !!restaurantId,
    refetchInterval: 30000, // Check for new conflicts every 30 seconds
  });

  // Fetch available tables for resolution
  const { data: availableTables = [] } = useQuery({
    queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/tables`],
    enabled: !!tenantId && !!restaurantId,
  });

  // Fetch resolved conflicts for the Resolved tab
  const { data: resolvedConflicts = [], isLoading: resolvedLoading } = useQuery({
    queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/resolved-conflicts`],
    enabled: !!tenantId && !!restaurantId && activeTab === "resolved",
  });

  // Auto-resolve conflicts mutation
  const autoResolveMutation = useMutation({
    mutationFn: async ({ bookingId, newTableId, resolutionType }: { bookingId: number, newTableId: number, resolutionType: string }) => {
      const response = await apiRequest(
        "POST",
        `/api/tenants/${tenantId}/restaurants/${restaurantId}/conflicts/auto-resolve`,
        { bookingId, newTableId, resolutionType }
      );
      return response;
    },
    onSuccess: (data) => {
      toast({
        title: "Conflict Auto-Resolved",
        description: data.resolutionApplied || "Conflict has been automatically resolved.",
      });
      refetchConflicts();
      onConflictResolved?.(data.bookingId?.toString());
    },
    onError: (error: any) => {
      toast({
        title: "Auto-Resolution Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Manual resolve conflicts mutation using working endpoint
  const manualResolveMutation = useMutation({
    mutationFn: async ({ conflictId, resolutionId }: { conflictId: string; resolutionId: string }) => {
      const response = await fetch(`/resolve-conflict/${tenantId}/${restaurantId}/${conflictId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ resolutionId })
      });
      if (!response.ok) throw new Error("Failed to resolve conflict");
      return response.json();
    },
    onSuccess: (data, { conflictId }) => {
      toast({
        title: "Conflict Resolved",
        description: data.resolution || "The conflict has been manually resolved.",
      });
      setSelectedConflict(null);
      setSelectedResolution(null);
      refetchConflicts();
      onConflictResolved?.(conflictId);
    },
    onError: (error: any) => {
      toast({
        title: "Resolution Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Scan for conflicts mutation
  const scanConflictsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        "POST",
        `/api/tenants/${tenantId}/restaurants/${restaurantId}/conflicts/scan`
      );
      if (!response.ok) throw new Error("Failed to scan for conflicts");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Conflict Scan Complete",
        description: "Scanning for potential conflicts completed.",
      });
      refetchConflicts();
    },
    onError: (error: any) => {
      toast({
        title: "Scan Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getConflictTypeIcon = (type: string) => {
    switch (type) {
      case 'table_double_booking': return <MapPin className="w-4 h-4" />;
      case 'time_overlap': return <Clock className="w-4 h-4" />;
      case 'capacity_exceeded': return <Users className="w-4 h-4" />;
      case 'resource_unavailable': return <AlertTriangle className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getConflictTypeLabel = (type: string) => {
    switch (type) {
      case 'table_double_booking': return 'Table Double Booking';
      case 'time_overlap': return 'Time Overlap';
      case 'capacity_exceeded': return 'Capacity Exceeded';
      case 'resource_unavailable': return 'Resource Unavailable';
      default: return 'Unknown Conflict';
    }
  };

  const handleAutoResolve = (conflict: ConflictType) => {
    if (!conflict.suggestedResolutions || conflict.suggestedResolutions.length === 0) return;
    
    const resolution = conflict.suggestedResolutions.find(r => r.autoExecutable);
    if (!resolution || !resolution.bookingId || !resolution.newTableId) return;

    setIsResolving(true);
    autoResolveMutation.mutate({
      bookingId: resolution.bookingId,
      newTableId: resolution.newTableId,
      resolutionType: resolution.type
    });
    setTimeout(() => setIsResolving(false), 2000);
  };

  const handleManualResolve = () => {
    if (selectedConflict && selectedResolution) {
      manualResolveMutation.mutate({
        conflictId: selectedConflict.id,
        resolutionId: selectedResolution.id,
      });
    }
  };

  const activeConflicts = conflicts.filter(c => c.type !== 'resolved');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Smart Conflict Resolution</h2>
          <p className="text-muted-foreground">
            AI-powered system to detect and resolve booking conflicts automatically
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Button
            onClick={() => scanConflictsMutation.mutate()}
            variant="outline"
            disabled={scanConflictsMutation.isPending}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${scanConflictsMutation.isPending ? 'animate-spin' : ''}`} />
            Scan for Conflicts
          </Button>
          {activeConflicts.length > 0 && (
            <Badge variant="destructive" className="text-sm">
              {activeConflicts.length} Active Conflict{activeConflicts.length !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </div>

      {/* Auto-resolve toggle */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Auto-Resolution</h3>
              <p className="text-sm text-muted-foreground">
                Automatically resolve low-risk conflicts using AI recommendations
              </p>
            </div>
            <Button
              variant={autoResolveEnabled ? "default" : "outline"}
              onClick={() => setAutoResolveEnabled(!autoResolveEnabled)}
            >
              <Target className="w-4 h-4 mr-2" />
              {autoResolveEnabled ? "Enabled" : "Disabled"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Conflicts Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="active">
            Active Conflicts ({activeConflicts.length})
          </TabsTrigger>
          <TabsTrigger value="resolved">
            Resolved ({resolvedConflicts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {conflictsLoading ? (
            <div className="text-center py-8">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Scanning for conflicts...</p>
            </div>
          ) : activeConflicts.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
                <h3 className="text-lg font-medium mb-2">No Active Conflicts</h3>
                <p className="text-muted-foreground">
                  All bookings are properly scheduled without conflicts.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {activeConflicts.map((conflict) => (
                <Card key={conflict.id} className="border-l-4 border-l-red-500">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getConflictTypeIcon(conflict.type)}
                        <div>
                          <CardTitle className="text-lg">
                            {getConflictTypeLabel(conflict.type)}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {conflict.bookings.length} bookings affected • 
                            {format(parseISO(conflict.createdAt), 'MMM dd, HH:mm')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getSeverityColor(conflict.severity)}>
                          {conflict.severity.toUpperCase()}
                        </Badge>
                        {conflict.autoResolvable && autoResolveEnabled && (
                          <Button
                            size="sm"
                            onClick={() => handleAutoResolve(conflict)}
                            disabled={isResolving}
                          >
                            <Shuffle className="w-4 h-4 mr-2" />
                            Auto-Resolve
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedConflict(conflict)}
                        >
                          Review
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {/* Affected bookings */}
                      <div>
                        <h4 className="font-medium mb-2">Affected Bookings:</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {conflict.bookings.map((booking) => (
                            <div key={booking.id} className="border rounded-lg p-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <User className="w-4 h-4" />
                                  <span className="font-medium">{booking.customerName}</span>
                                </div>
                                <Badge variant={booking.priority > 1 ? "default" : "secondary"}>
                                  {booking.priority > 1 ? "VIP" : "Regular"}
                                </Badge>
                              </div>
                              <div className="text-sm text-muted-foreground space-y-1">
                                <div className="flex items-center space-x-2">
                                  <Calendar className="w-4 h-4" />
                                  <span>{format(parseISO(booking.bookingDate), 'MMM dd, yyyy')}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Clock className="w-4 h-4" />
                                  <span>{booking.startTime} - {booking.endTime}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Users className="w-4 h-4" />
                                  <span>{booking.guestCount} guests</span>
                                </div>
                                {booking.tableName && (
                                  <div className="flex items-center space-x-2">
                                    <MapPin className="w-4 h-4" />
                                    <span>{booking.tableName}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Top resolution preview */}
                      {conflict.suggestedResolutions && conflict.suggestedResolutions.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2">Recommended Resolution:</h4>
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-green-800">
                                {conflict.suggestedResolutions[0].description}
                              </span>
                              <div className="flex items-center space-x-2">
                                <Progress 
                                  value={conflict.suggestedResolutions[0].estimatedCustomerSatisfaction} 
                                  className="w-20 h-2"
                                />
                                <span className="text-sm text-green-700">
                                  {conflict.suggestedResolutions[0].estimatedCustomerSatisfaction}%
                                </span>
                              </div>
                            </div>
                            <p className="text-sm text-green-700">
                              Impact: {conflict.suggestedResolutions[0].impact} • 
                              Customer satisfaction: {conflict.suggestedResolutions[0].estimatedCustomerSatisfaction}%
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="resolved" className="space-y-4">
          {resolvedLoading ? (
            <div className="text-center py-8">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Loading resolved conflicts...</p>
            </div>
          ) : resolvedConflicts.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No Resolved Conflicts</h3>
                <p className="text-muted-foreground">
                  Resolved conflicts will appear here for reference.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {resolvedConflicts.map((resolvedConflict: any) => (
                <Card key={resolvedConflict.id} className="border-l-4 border-l-green-500">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        <div>
                          <CardTitle className="text-lg flex items-center space-x-2">
                            <span>{resolvedConflict.conflictType.replace('_', ' ').toUpperCase()}</span>
                            <Badge variant="outline" className="text-green-600 border-green-600">
                              Resolved
                            </Badge>
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            Resolved on {format(parseISO(resolvedConflict.resolvedAt), 'MMM dd, yyyy HH:mm')} 
                            by {resolvedConflict.appliedBy}
                          </p>
                        </div>
                      </div>
                      <Badge 
                        variant={resolvedConflict.severity === 'high' ? 'destructive' : 
                                resolvedConflict.severity === 'medium' ? 'default' : 'secondary'}
                      >
                        {resolvedConflict.severity}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground">Resolution Applied:</span>
                        <Badge variant="outline" className="text-blue-600 border-blue-600">
                          {resolvedConflict.resolutionType.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </div>
                      
                      <div className="bg-muted/50 p-3 rounded-lg">
                        <p className="text-sm font-medium mb-1">Resolution Details:</p>
                        <p className="text-sm text-muted-foreground">
                          {resolvedConflict.resolutionDetails}
                        </p>
                      </div>

                      {resolvedConflict.bookingIds && resolvedConflict.bookingIds.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-2">Affected Bookings:</p>
                          <div className="flex flex-wrap gap-2">
                            {resolvedConflict.bookingIds.map((bookingId: number) => (
                              <Badge key={bookingId} variant="secondary">
                                Booking #{bookingId}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                        <span>Conflict ID: {resolvedConflict.conflictId}</span>
                        <span>Original Date: {format(parseISO(resolvedConflict.createdAt), 'MMM dd, yyyy')}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Conflict Detail Dialog */}
      <Dialog open={!!selectedConflict} onOpenChange={() => setSelectedConflict(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              {selectedConflict && getConflictTypeIcon(selectedConflict.type)}
              <span>
                {selectedConflict && getConflictTypeLabel(selectedConflict.type)} - Resolution Options
              </span>
            </DialogTitle>
          </DialogHeader>
          
          {selectedConflict && (
            <div className="space-y-6">
              {/* Conflict Summary */}
              <div className="border rounded-lg p-4 bg-red-50">
                <h3 className="font-medium mb-2 text-red-800">Conflict Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Severity:</span>
                    <Badge className={`ml-2 ${getSeverityColor(selectedConflict.severity)}`}>
                      {selectedConflict.severity.toUpperCase()}
                    </Badge>
                  </div>
                  <div>
                    <span className="font-medium">Auto-Resolvable:</span>
                    <span className="ml-2">
                      {selectedConflict.autoResolvable ? "Yes" : "No"}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">Bookings Affected:</span>
                    <span className="ml-2">{selectedConflict.bookings.length}</span>
                  </div>
                  <div>
                    <span className="font-medium">Detected:</span>
                    <span className="ml-2">
                      {format(parseISO(selectedConflict.createdAt), 'MMM dd, yyyy HH:mm')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Resolution Options */}
              <div>
                <h3 className="font-medium mb-4">Resolution Options</h3>
                <div className="space-y-3">
                  {(selectedConflict.suggestedResolutions || []).map((resolution) => (
                    <div
                      key={resolution.id}
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                        selectedResolution?.id === resolution.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedResolution(resolution)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{resolution.description}</h4>
                        <div className="flex items-center space-x-2">
                          <Progress value={resolution.confidence} className="w-20 h-2" />
                          <span className="text-sm font-medium">{resolution.confidence}%</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm text-muted-foreground">
                        <div>
                          <span className="font-medium">Impact:</span>
                          <span className="ml-1 capitalize">{resolution.impact}</span>
                        </div>
                        <div>
                          <span className="font-medium">Satisfaction:</span>
                          <span className="ml-1">{resolution.estimatedCustomerSatisfaction}%</span>
                        </div>
                        <div>
                          <span className="font-medium">Type:</span>
                          <span className="ml-1 capitalize">{resolution.type.replace('_', ' ')}</span>
                        </div>
                      </div>
                      {resolution.details && (
                        <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                          {resolution.details.newTableId && (
                            <p>New table: Table {resolution.details.newTableId}</p>
                          )}
                          {resolution.details.newTime && (
                            <p>New time: {resolution.details.newTime}</p>
                          )}
                          {resolution.details.compensationSuggested && (
                            <p className="text-green-600">Compensation recommended</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t">
                <Button variant="outline" onClick={() => setSelectedConflict(null)}>
                  Cancel
                </Button>
                <div className="flex items-center space-x-2">
                  {selectedConflict.autoResolvable && (
                    <Button
                      variant="outline"
                      onClick={() => handleAutoResolve(selectedConflict.id)}
                      disabled={isResolving}
                    >
                      <Shuffle className="w-4 h-4 mr-2" />
                      Auto-Resolve
                    </Button>
                  )}
                  <Button
                    onClick={handleManualResolve}
                    disabled={!selectedResolution || manualResolveMutation.isPending}
                  >
                    {manualResolveMutation.isPending ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4 mr-2" />
                    )}
                    Apply Resolution
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}