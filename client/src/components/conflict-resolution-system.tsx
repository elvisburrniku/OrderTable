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
import { motion, AnimatePresence } from "framer-motion";
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
  Target,
  Shield,
  Zap,
  Activity,
  TrendingUp,
  Sparkles,
  Eye,
  BarChart3
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
    <motion.div 
      className="space-y-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      {/* Premium Header */}
      <motion.div 
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="space-y-2">
          <motion.h2 
            className="text-3xl font-bold tracking-tight flex items-center space-x-3"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <motion.div
              animate={{ 
                rotate: [0, 10, -10, 0],
                scale: [1, 1.1, 1]
              }}
              transition={{ 
                duration: 3, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
            >
              <Shield className="w-8 h-8 text-red-600" />
            </motion.div>
            <span className="bg-gradient-to-r from-slate-900 via-red-900 to-slate-900 bg-clip-text text-transparent">
              Smart Conflict Resolution
            </span>
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <Sparkles className="w-6 h-6 text-yellow-500" />
            </motion.div>
          </motion.h2>
          <motion.p 
            className="text-slate-600 flex items-center space-x-2"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            <Activity className="w-4 h-4 text-blue-500" />
            <span>AI-powered system to detect and resolve booking conflicts automatically</span>
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <Zap className="w-4 h-4 text-yellow-500" />
            </motion.div>
          </motion.p>
        </div>
        
        <motion.div 
          className="flex items-center space-x-4"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
        >
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              onClick={() => scanConflictsMutation.mutate()}
              variant="outline"
              disabled={scanConflictsMutation.isPending}
              className="bg-white/80 backdrop-blur-sm border-slate-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:border-blue-300"
            >
              <motion.div
                animate={{ rotate: scanConflictsMutation.isPending ? 360 : 0 }}
                transition={{ duration: 2, repeat: scanConflictsMutation.isPending ? Infinity : 0, ease: "linear" }}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
              </motion.div>
              Scan for Conflicts
            </Button>
          </motion.div>
          
          <AnimatePresence>
            {activeConflicts.length > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.4 }}
                whileHover={{ scale: 1.05 }}
              >
                <Badge 
                  variant="destructive" 
                  className="text-sm shadow-lg bg-gradient-to-r from-red-500 to-red-600 border-red-400 animate-pulse"
                >
                  <motion.span
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    {activeConflicts.length} Active Conflict{activeConflicts.length !== 1 ? 's' : ''}
                  </motion.span>
                </Badge>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>

      {/* Premium Auto-resolve toggle */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.6 }}
      >
        <Card className="bg-white/80 backdrop-blur-lg border-slate-200 shadow-xl hover:shadow-2xl transition-all duration-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <motion.h3 
                  className="font-semibold text-lg flex items-center space-x-2"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1, duration: 0.4 }}
                >
                  <motion.div
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  >
                    <Target className="w-5 h-5 text-blue-600" />
                  </motion.div>
                  <span className="bg-gradient-to-r from-slate-800 to-blue-800 bg-clip-text text-transparent">
                    Auto-Resolution
                  </span>
                </motion.h3>
                <motion.p 
                  className="text-sm text-slate-600 flex items-center space-x-2"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.2, duration: 0.4 }}
                >
                  <Zap className="w-4 h-4 text-yellow-500" />
                  <span>Automatically resolve low-risk conflicts using AI recommendations</span>
                </motion.p>
              </div>
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.4, duration: 0.4 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  variant={autoResolveEnabled ? "default" : "outline"}
                  onClick={() => setAutoResolveEnabled(!autoResolveEnabled)}
                  className={`shadow-lg transition-all duration-300 ${
                    autoResolveEnabled 
                      ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 border-green-400' 
                      : 'bg-white/80 backdrop-blur-sm border-slate-200 hover:border-blue-300'
                  }`}
                >
                  <motion.div
                    animate={{ 
                      rotate: autoResolveEnabled ? [0, 360] : 0,
                      scale: autoResolveEnabled ? [1, 1.1, 1] : 1
                    }}
                    transition={{ 
                      duration: 2, 
                      repeat: autoResolveEnabled ? Infinity : 0, 
                      ease: "easeInOut" 
                    }}
                  >
                    <Target className="w-4 h-4 mr-2" />
                  </motion.div>
                  {autoResolveEnabled ? "Enabled" : "Disabled"}
                </Button>
              </motion.div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Premium Conflicts Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.6, duration: 0.6 }}
      >
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 bg-white/60 backdrop-blur-md border border-slate-200 shadow-lg rounded-xl p-1">
            <TabsTrigger 
              value="active" 
              className="flex items-center space-x-2 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-slate-200 rounded-lg transition-all duration-300"
            >
              <motion.div
                animate={{ 
                  rotate: activeTab === "active" ? [0, 10, -10, 0] : 0,
                  scale: activeTab === "active" ? [1, 1.1, 1] : 1
                }}
                transition={{ duration: 0.5 }}
              >
                <AlertTriangle className="w-4 h-4" />
              </motion.div>
              <span>Active Conflicts ({activeConflicts.length})</span>
            </TabsTrigger>
            <TabsTrigger 
              value="resolved" 
              className="flex items-center space-x-2 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-slate-200 rounded-lg transition-all duration-300"
            >
              <motion.div
                animate={{ 
                  rotate: activeTab === "resolved" ? [0, 360] : 0,
                  scale: activeTab === "resolved" ? [1, 1.1, 1] : 1
                }}
                transition={{ duration: 0.5 }}
              >
                <CheckCircle className="w-4 h-4" />
              </motion.div>
              <span>Resolved ({resolvedConflicts.length})</span>
            </TabsTrigger>
          </TabsList>

        <TabsContent value="active" className="space-y-6">
          <AnimatePresence mode="wait">
            {conflictsLoading ? (
              <motion.div 
                className="text-center py-12"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.4 }}
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                >
                  <RefreshCw className="w-12 h-12 mx-auto mb-6 text-blue-600" />
                </motion.div>
                <motion.p 
                  className="text-slate-600 text-lg font-medium"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  Scanning for conflicts...
                </motion.p>
              </motion.div>
            ) : activeConflicts.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.5 }}
              >
                <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 shadow-xl">
                  <CardContent className="text-center py-12">
                    <motion.div
                      animate={{ 
                        scale: [1, 1.1, 1],
                        rotate: [0, 5, -5, 0]
                      }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <CheckCircle className="w-16 h-16 mx-auto mb-6 text-green-600" />
                    </motion.div>
                    <motion.h3 
                      className="text-xl font-bold mb-3 text-green-800"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2, duration: 0.4 }}
                    >
                      No Active Conflicts
                    </motion.h3>
                    <motion.p 
                      className="text-green-700 flex items-center justify-center space-x-2"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4, duration: 0.4 }}
                    >
                      <Shield className="w-4 h-4" />
                      <span>All bookings are properly scheduled without conflicts.</span>
                    </motion.p>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <motion.div 
                className="space-y-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                {activeConflicts.map((conflict, index) => (
                  <motion.div
                    key={conflict.id}
                    initial={{ opacity: 0, x: -20, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    transition={{ delay: index * 0.1, duration: 0.5 }}
                    whileHover={{ scale: 1.02, y: -5 }}
                  >
                    <Card className="border-l-4 border-l-red-500 bg-white/80 backdrop-blur-lg shadow-xl hover:shadow-2xl transition-all duration-500 overflow-hidden">
                      <CardHeader className="bg-gradient-to-r from-red-50/80 to-orange-50/80 backdrop-blur-sm border-b border-red-200/50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <motion.div
                              animate={{ 
                                rotate: [0, 10, -10, 0],
                                scale: [1, 1.1, 1]
                              }}
                              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                            >
                              {getConflictTypeIcon(conflict.type)}
                            </motion.div>
                            <div>
                              <motion.div
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2, duration: 0.4 }}
                              >
                                <CardTitle className="text-xl font-bold bg-gradient-to-r from-red-800 to-orange-800 bg-clip-text text-transparent">
                                  {getConflictTypeLabel(conflict.type)}
                                </CardTitle>
                              </motion.div>
                              <motion.p 
                                className="text-sm text-red-600 flex items-center space-x-2 mt-1"
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4, duration: 0.4 }}
                              >
                                <Users className="w-4 h-4" />
                                <span>{conflict.bookings.length} bookings affected</span>
                                <Clock className="w-4 h-4 ml-2" />
                                <span>{format(parseISO(conflict.createdAt), 'MMM dd, HH:mm')}</span>
                              </motion.p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <motion.div
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: 0.6, duration: 0.4 }}
                              whileHover={{ scale: 1.05 }}
                            >
                              <Badge className={`${getSeverityColor(conflict.severity)} shadow-lg`}>
                                {conflict.severity.toUpperCase()}
                              </Badge>
                            </motion.div>
                            
                            <AnimatePresence>
                              {conflict.autoResolvable && autoResolveEnabled && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.8 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.8 }}
                                  transition={{ delay: 0.8, duration: 0.3 }}
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                >
                                  <Button
                                    size="sm"
                                    onClick={() => handleAutoResolve(conflict)}
                                    disabled={isResolving}
                                    className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg"
                                  >
                                    <motion.div
                                      animate={{ rotate: isResolving ? 360 : 0 }}
                                      transition={{ duration: 1, repeat: isResolving ? Infinity : 0, ease: "linear" }}
                                    >
                                      <Shuffle className="w-4 h-4 mr-2" />
                                    </motion.div>
                                    Auto-Resolve
                                  </Button>
                                </motion.div>
                              )}
                            </AnimatePresence>
                            
                            <motion.div
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: 1, duration: 0.3 }}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedConflict(conflict)}
                                className="bg-white/80 backdrop-blur-sm border-slate-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:border-blue-300"
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                Review
                              </Button>
                            </motion.div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <motion.div 
                      className="space-y-6"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3, duration: 0.5 }}
                    >
                      {/* Affected bookings */}
                      <div>
                        <motion.h4 
                          className="font-semibold text-lg mb-4 flex items-center space-x-2"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.5, duration: 0.4 }}
                        >
                          <Users className="w-5 h-5 text-red-600" />
                          <span className="bg-gradient-to-r from-red-800 to-orange-800 bg-clip-text text-transparent">
                            Affected Bookings:
                          </span>
                        </motion.h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {conflict.bookings.map((booking, bookingIndex) => (
                            <motion.div 
                              key={booking.id} 
                              className="bg-gradient-to-br from-red-50 to-orange-50 border border-red-200 rounded-lg p-4 space-y-3 shadow-sm hover:shadow-md transition-all duration-300"
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: 0.7 + bookingIndex * 0.1, duration: 0.4 }}
                              whileHover={{ scale: 1.02, y: -2 }}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <motion.div
                                    animate={{ scale: [1, 1.1, 1] }}
                                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: bookingIndex * 0.3 }}
                                  >
                                    <User className="w-5 h-5 text-red-600" />
                                  </motion.div>
                                  <span className="font-semibold text-red-800">{booking.customerName}</span>
                                </div>
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.8 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ delay: 0.9 + bookingIndex * 0.1, duration: 0.3 }}
                                  whileHover={{ scale: 1.05 }}
                                >
                                  <Badge variant={booking.priority > 1 ? "default" : "secondary"} className="shadow-sm">
                                    {booking.priority > 1 ? "VIP" : "Regular"}
                                  </Badge>
                                </motion.div>
                              </div>
                              <div className="text-sm text-red-700 space-y-2">
                                <motion.div 
                                  className="flex items-center space-x-2"
                                  whileHover={{ x: 5 }}
                                >
                                  <Calendar className="w-4 h-4" />
                                  <span>{format(parseISO(booking.bookingDate), 'MMM dd, yyyy')}</span>
                                </motion.div>
                                <motion.div 
                                  className="flex items-center space-x-2"
                                  whileHover={{ x: 5 }}
                                >
                                  <Clock className="w-4 h-4" />
                                  <span>{booking.startTime} - {booking.endTime}</span>
                                </motion.div>
                                <motion.div 
                                  className="flex items-center space-x-2"
                                  whileHover={{ x: 5 }}
                                >
                                  <Users className="w-4 h-4" />
                                  <span>{booking.guestCount} guests</span>
                                </motion.div>
                                {booking.tableName && (
                                  <motion.div 
                                    className="flex items-center space-x-2"
                                    whileHover={{ x: 5 }}
                                  >
                                    <MapPin className="w-4 h-4" />
                                    <span>{booking.tableName}</span>
                                  </motion.div>
                                )}
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>

                      {/* Premium Resolution Preview */}
                      <AnimatePresence>
                        {conflict.suggestedResolutions && conflict.suggestedResolutions.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ delay: 1.2, duration: 0.5 }}
                          >
                            <motion.h4 
                              className="font-semibold text-lg mb-4 flex items-center space-x-2"
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 1.4, duration: 0.4 }}
                            >
                              <motion.div
                                animate={{ rotate: [0, 360] }}
                                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                              >
                                <Target className="w-5 h-5 text-green-600" />
                              </motion.div>
                              <span className="bg-gradient-to-r from-green-800 to-emerald-800 bg-clip-text text-transparent">
                                Recommended Resolution:
                              </span>
                            </motion.h4>
                            <motion.div 
                              className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-300"
                              whileHover={{ scale: 1.01, y: -2 }}
                            >
                              <div className="flex items-center justify-between mb-3">
                                <motion.span 
                                  className="font-semibold text-green-800 text-lg"
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 1.6, duration: 0.4 }}
                                >
                                  {conflict.suggestedResolutions[0].description}
                                </motion.span>
                                <motion.div 
                                  className="flex items-center space-x-3"
                                  initial={{ opacity: 0, scale: 0.8 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ delay: 1.8, duration: 0.4 }}
                                >
                                  <motion.div 
                                    className="w-24 h-3 bg-gray-200 rounded-full overflow-hidden"
                                    whileHover={{ scale: 1.05 }}
                                  >
                                    <motion.div
                                      className="h-full bg-gradient-to-r from-green-500 to-emerald-600 rounded-full"
                                      initial={{ width: 0 }}
                                      animate={{ width: `${conflict.suggestedResolutions[0].estimatedCustomerSatisfaction}%` }}
                                      transition={{ delay: 2, duration: 1, ease: "easeOut" }}
                                    />
                                  </motion.div>
                                  <motion.span 
                                    className="text-sm font-bold text-green-700"
                                    animate={{ scale: [1, 1.1, 1] }}
                                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                  >
                                    {conflict.suggestedResolutions[0].estimatedCustomerSatisfaction}%
                                  </motion.span>
                                </motion.div>
                              </div>
                              <motion.p 
                                className="text-sm text-green-700 flex items-center space-x-2"
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 2.2, duration: 0.4 }}
                              >
                                <TrendingUp className="w-4 h-4" />
                                <span>
                                  Impact: {conflict.suggestedResolutions[0].impact} • 
                                  Customer satisfaction: {conflict.suggestedResolutions[0].estimatedCustomerSatisfaction}%
                                </span>
                              </motion.p>
                            </motion.div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  </CardContent>
                </Card>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
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
      </Tabs>
      </motion.div>
    </motion.div>
  );
}