import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  AlertTriangle, 
  Clock, 
  Users, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  Zap,
  Target,
  TrendingUp
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format, parseISO } from 'date-fns';

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
  const [conflicts, setConflicts] = useState<ConflictType[]>([]);
  const [resolvedConflicts, setResolvedConflicts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvedLoading, setResolvedLoading] = useState(false);
  const [autoResolveEnabled, setAutoResolveEnabled] = useState(false);
  const [selectedConflict, setSelectedConflict] = useState<ConflictType | null>(null);
  const [resolvingConflicts, setResolvingConflicts] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('active');

  // Mock data for demonstration
  useEffect(() => {
    const mockConflicts: ConflictType[] = [
      {
        id: 'conflict-1',
        type: 'table_double_booking',
        severity: 'high',
        autoResolvable: true,
        createdAt: new Date().toISOString(),
        bookings: [
          {
            id: 1,
            customerName: 'John Smith',
            customerEmail: 'john@example.com',
            guestCount: 4,
            bookingDate: '2025-06-26',
            startTime: '19:00',
            endTime: '21:00',
            tableId: 5,
            tableName: 'Table 5',
            status: 'confirmed',
            priority: 1,
            depositPaid: true,
            notes: 'Anniversary dinner'
          },
          {
            id: 2,
            customerName: 'Sarah Johnson',
            customerEmail: 'sarah@example.com',
            guestCount: 2,
            bookingDate: '2025-06-26',
            startTime: '19:30',
            endTime: '21:30',
            tableId: 5,
            tableName: 'Table 5',
            status: 'confirmed',
            priority: 2,
            depositPaid: false
          }
        ],
        suggestedResolutions: [
          {
            id: 'res-1',
            type: 'reassign_table',
            description: 'Move Sarah Johnson to Table 7 (similar capacity and location)',
            impact: 'minimal',
            confidence: 95,
            estimatedCustomerSatisfaction: 85,
            autoExecutable: true,
            details: {
              newTableId: 7,
              compensationSuggested: false
            }
          },
          {
            id: 'res-2',
            type: 'adjust_time',
            description: 'Adjust Sarah Johnson\'s reservation to 18:00-20:00',
            impact: 'moderate',
            confidence: 75,
            estimatedCustomerSatisfaction: 70,
            details: {
              newTime: '18:00-20:00',
              compensationSuggested: true
            }
          }
        ]
      },
      {
        id: 'conflict-2',
        type: 'capacity_exceeded',
        severity: 'medium',
        autoResolvable: false,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        bookings: [
          {
            id: 3,
            customerName: 'Mike Wilson',
            customerEmail: 'mike@example.com',
            guestCount: 8,
            bookingDate: '2025-06-27',
            startTime: '20:00',
            endTime: '22:00',
            status: 'pending',
            priority: 1,
            depositPaid: false,
            notes: 'Corporate dinner'
          }
        ],
        suggestedResolutions: [
          {
            id: 'res-3',
            type: 'split_party',
            description: 'Split party across Tables 3 and 4 (adjacent tables)',
            impact: 'moderate',
            confidence: 80,
            estimatedCustomerSatisfaction: 75,
            details: {
              newTables: [3, 4],
              compensationSuggested: true
            }
          }
        ]
      }
    ];

    const mockResolvedConflicts = [
      {
        id: 'resolved-1',
        conflictId: 'conflict-old-1',
        type: 'table_double_booking',
        severity: 'high',
        resolutionType: 'reassign_table',
        resolutionDetails: 'Successfully moved customer to Table 8 with complimentary appetizer',
        bookingIds: [101, 102],
        resolvedAt: new Date(Date.now() - 3600000).toISOString(),
        createdAt: new Date(Date.now() - 7200000).toISOString()
      }
    ];

    setTimeout(() => {
      setConflicts(mockConflicts);
      setResolvedConflicts(mockResolvedConflicts);
      setLoading(false);
    }, 1000);
  }, [restaurantId, tenantId]);

  const handleAutoResolve = (conflict: ConflictType) => {
    if (!conflict.autoResolvable) return;
    
    const bestResolution = conflict.suggestedResolutions
      .filter(r => r.autoExecutable)
      .sort((a, b) => (b.confidence * b.estimatedCustomerSatisfaction) - (a.confidence * a.estimatedCustomerSatisfaction))[0];
    
    if (bestResolution) {
      handleResolveConflict(conflict.id, bestResolution);
    }
  };

  const handleResolveConflict = async (conflictId: string, resolution: Resolution) => {
    setResolvingConflicts(prev => new Set([...prev, conflictId]));
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Remove from active conflicts
      setConflicts(prev => prev.filter(c => c.id !== conflictId));
      
      // Add to resolved conflicts
      const resolvedConflict = {
        id: `resolved-${Date.now()}`,
        conflictId,
        resolutionType: resolution.type,
        resolutionDetails: resolution.description,
        resolvedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };
      
      setResolvedConflicts(prev => [resolvedConflict, ...prev]);
      setSelectedConflict(null);
      
      if (onConflictResolved) {
        onConflictResolved(conflictId);
      }
    } catch (error) {
      console.error('Error resolving conflict:', error);
    } finally {
      setResolvingConflicts(prev => {
        const newSet = new Set(prev);
        newSet.delete(conflictId);
        return newSet;
      });
    }
  };

  const getConflictTypeIcon = (type: string) => {
    switch (type) {
      case 'table_double_booking': return <Users className="w-5 h-5 text-red-500" />;
      case 'time_overlap': return <Clock className="w-5 h-5 text-orange-500" />;
      case 'capacity_exceeded': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'resource_unavailable': return <XCircle className="w-5 h-5 text-red-500" />;
      default: return <AlertTriangle className="w-5 h-5" />;
    }
  };

  const getConflictTypeLabel = (type: string) => {
    switch (type) {
      case 'table_double_booking': return 'Double Booking';
      case 'time_overlap': return 'Time Overlap';
      case 'capacity_exceeded': return 'Capacity Exceeded';
      case 'resource_unavailable': return 'Resource Unavailable';
      default: return 'Unknown Conflict';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
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
                rotate: [0, 360],
                scale: [1, 1.1, 1]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <Shield className="w-8 h-8 text-blue-600" />
            </motion.div>
            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent">
              Conflict Resolution System
            </span>
          </motion.h2>
          <motion.p 
            className="text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            Intelligent conflict detection and automated resolution for seamless operations
          </motion.p>
        </div>

        {/* Premium Auto-Resolve Toggle */}
        <motion.div 
          className="flex items-center space-x-3 bg-white/60 backdrop-blur-md border border-slate-200 rounded-xl p-4 shadow-lg"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          whileHover={{ scale: 1.02 }}
        >
          <motion.div
            animate={{ 
              rotate: autoResolveEnabled ? [0, 10, -10, 0] : 0,
              color: autoResolveEnabled ? ["#3b82f6", "#8b5cf6", "#3b82f6"] : "#6b7280"
            }}
            transition={{ duration: 0.5 }}
          >
            <Zap className="w-5 h-5" />
          </motion.div>
          <span className="text-sm font-medium">Auto-Resolve</span>
          <Switch
            checked={autoResolveEnabled}
            onCheckedChange={setAutoResolveEnabled}
            className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-blue-500 data-[state=checked]:to-purple-600"
          />
        </motion.div>
      </motion.div>

      {/* Premium Stats Cards */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-4 gap-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.6 }}
      >
        {[
          { 
            title: "Active Conflicts", 
            value: activeConflicts.length.toString(),
            icon: AlertTriangle,
            color: "text-red-500",
            bgColor: "bg-red-50"
          },
          { 
            title: "Auto-Resolvable", 
            value: activeConflicts.filter(c => c.autoResolvable).length.toString(),
            icon: Zap,
            color: "text-blue-500",
            bgColor: "bg-blue-50"
          },
          { 
            title: "High Priority", 
            value: activeConflicts.filter(c => c.severity === 'high' || c.severity === 'critical').length.toString(),
            icon: Target,
            color: "text-orange-500",
            bgColor: "bg-orange-50"
          },
          { 
            title: "Resolved Today", 
            value: resolvedConflicts.length.toString(),
            icon: CheckCircle,
            color: "text-green-500",
            bgColor: "bg-green-50"
          }
        ].map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 + index * 0.1, duration: 0.6 }}
            whileHover={{ scale: 1.02 }}
          >
            <Card className="bg-white/60 backdrop-blur-md border-slate-200 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                    <motion.p 
                      className="text-2xl font-bold"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 1.2 + index * 0.1, type: "spring", stiffness: 200 }}
                    >
                      {stat.value}
                    </motion.p>
                  </div>
                  <motion.div 
                    className={`p-3 rounded-full ${stat.bgColor}`}
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.5 }}
                  >
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </motion.div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
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
                  rotate: activeTab === "resolved" ? [0, 10, -10, 0] : 0,
                  scale: activeTab === "resolved" ? [1, 1.1, 1] : 1
                }}
                transition={{ duration: 0.5 }}
              >
                <CheckCircle className="w-4 h-4" />
              </motion.div>
              <span>Resolved ({resolvedConflicts.length})</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4 mt-6">
            {loading ? (
              <motion.div 
                className="text-center py-12"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                >
                  <RefreshCw className="w-8 h-8 mx-auto mb-4 text-muted-foreground" />
                </motion.div>
                <p className="text-muted-foreground">Scanning for conflicts...</p>
              </motion.div>
            ) : activeConflicts.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6 }}
              >
                <Card className="bg-white/60 backdrop-blur-md border-slate-200 shadow-lg">
                  <CardContent className="text-center py-12">
                    <motion.div
                      animate={{ 
                        scale: [1, 1.1, 1],
                        rotate: [0, 10, -10, 0]
                      }}
                      transition={{ 
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    >
                      <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
                    </motion.div>
                    <h3 className="text-xl font-semibold mb-2 bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                      All Clear!
                    </h3>
                    <p className="text-muted-foreground">
                      No active conflicts detected. Your restaurant is running smoothly.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <AnimatePresence>
                {activeConflicts.map((conflict, index) => (
                  <motion.div
                    key={conflict.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.1, duration: 0.6 }}
                    whileHover={{ scale: 1.01 }}
                  >
                    <Card className="bg-white/60 backdrop-blur-md border-slate-200 shadow-lg hover:shadow-xl transition-all duration-300 border-l-4 border-l-red-500">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              {getConflictTypeIcon(conflict.type)}
                              <CardTitle className="text-lg">
                                {getConflictTypeLabel(conflict.type)}
                              </CardTitle>
                              {conflict.autoResolvable && (
                                <motion.div
                                  animate={{ scale: [1, 1.1, 1] }}
                                  transition={{ duration: 1, repeat: Infinity }}
                                >
                                  <Badge variant="outline" className="text-blue-600 border-blue-600">
                                    <Zap className="w-3 h-3 mr-1" />
                                    Auto-Resolvable
                                  </Badge>
                                </motion.div>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Detected {format(parseISO(conflict.createdAt), 'MMM dd, yyyy HH:mm')}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge className={getSeverityColor(conflict.severity)}>
                              {conflict.severity.toUpperCase()}
                            </Badge>
                            {autoResolveEnabled && conflict.autoResolvable && (
                              <motion.div
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                              >
                                <Button
                                  size="sm"
                                  onClick={() => handleAutoResolve(conflict)}
                                  disabled={resolvingConflicts.has(conflict.id)}
                                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                                >
                                  {resolvingConflicts.has(conflict.id) ? (
                                    <>
                                      <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                                      Resolving...
                                    </>
                                  ) : (
                                    <>
                                      <Zap className="w-3 h-3 mr-1" />
                                      Auto-Resolve
                                    </>
                                  )}
                                </Button>
                              </motion.div>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Bookings Affected:</span>
                            <Badge variant="secondary">{conflict.bookings.length}</Badge>
                          </div>
                          
                          <div className="space-y-2">
                            {conflict.bookings.slice(0, 2).map((booking) => (
                              <motion.div 
                                key={booking.id}
                                className="bg-muted/30 p-3 rounded-lg border"
                                whileHover={{ backgroundColor: "rgba(0,0,0,0.05)" }}
                              >
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="font-medium text-sm">{booking.customerName}</p>
                                    <p className="text-xs text-muted-foreground">{booking.customerEmail}</p>
                                  </div>
                                  <div className="text-right text-xs">
                                    <p>{booking.bookingDate}</p>
                                    <p>{booking.startTime} - {booking.endTime}</p>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between mt-2 pt-2 border-t">
                                  <span className="text-xs text-muted-foreground">
                                    {booking.guestCount} guests • {booking.tableName || 'No table'}
                                  </span>
                                  <Badge 
                                    variant={booking.status === 'confirmed' ? 'default' : 'secondary'}
                                    className="text-xs"
                                  >
                                    {booking.status}
                                  </Badge>
                                </div>
                              </motion.div>
                            ))}
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t">
                            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                              <TrendingUp className="w-4 h-4" />
                              <span>{conflict.suggestedResolutions.length} resolution options</span>
                            </div>
                            <motion.div
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedConflict(conflict)}
                                className="border-slate-300 hover:bg-slate-50"
                              >
                                View Details
                              </Button>
                            </motion.div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
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
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base flex items-center space-x-2">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span>{getConflictTypeLabel(resolvedConflict.type)} - Resolved</span>
                          </CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">
                            Resolved {format(parseISO(resolvedConflict.resolvedAt), 'MMM dd, yyyy HH:mm')}
                          </p>
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
      </motion.div>

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

              {/* Affected Bookings */}
              <div className="space-y-3">
                <h3 className="font-medium">Affected Bookings</h3>
                {selectedConflict.bookings.map((booking: BookingConflict) => (
                  <div key={booking.id} className="border rounded-lg p-3 bg-gray-50">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium">{booking.customerName}</p>
                        <p className="text-sm text-muted-foreground">{booking.customerEmail}</p>
                      </div>
                      <Badge variant={booking.status === 'confirmed' ? 'default' : 'secondary'}>
                        {booking.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="font-medium">Date:</span> {booking.bookingDate}
                      </div>
                      <div>
                        <span className="font-medium">Time:</span> {booking.startTime} - {booking.endTime}
                      </div>
                      <div>
                        <span className="font-medium">Guests:</span> {booking.guestCount}
                      </div>
                      <div>
                        <span className="font-medium">Table:</span> {booking.tableName || 'N/A'}
                      </div>
                    </div>
                    {booking.notes && (
                      <p className="text-sm text-muted-foreground mt-2">
                        <span className="font-medium">Notes:</span> {booking.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Resolution Options */}
              <div className="space-y-3">
                <h3 className="font-medium">Suggested Resolutions</h3>
                {selectedConflict.suggestedResolutions.map((resolution: Resolution) => (
                  <div key={resolution.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-medium capitalize">
                          {resolution.type.replace('_', ' ')}
                        </h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {resolution.description}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant={resolution.impact === 'minimal' ? 'default' : 
                                      resolution.impact === 'moderate' ? 'secondary' : 'destructive'}>
                          {resolution.impact} impact
                        </Badge>
                        <p className="text-sm text-muted-foreground mt-1">
                          {resolution.confidence}% confidence
                        </p>
                      </div>
                    </div>
                    
                    {/* Resolution Details */}
                    {resolution.details && (
                      <div className="bg-blue-50 p-3 rounded-lg mb-3">
                        <p className="text-sm font-medium text-blue-800 mb-1">Resolution Details:</p>
                        <div className="text-sm text-blue-700 space-y-1">
                          {resolution.details.newTableId && (
                            <p>• Reassign to Table #{resolution.details.newTableId}</p>
                          )}
                          {resolution.details.newTime && (
                            <p>• Adjust time to {resolution.details.newTime}</p>
                          )}
                          {resolution.details.newTables && (
                            <p>• Split between Tables: {resolution.details.newTables.join(', ')}</p>
                          )}
                          {resolution.details.waitlistPosition && (
                            <p>• Waitlist position: #{resolution.details.waitlistPosition}</p>
                          )}
                          {resolution.details.compensationSuggested && (
                            <p>• Compensation recommended</p>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-muted-foreground">
                          Customer satisfaction: {resolution.estimatedCustomerSatisfaction}%
                        </span>
                        {resolution.autoExecutable && (
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            Auto-executable
                          </Badge>
                        )}
                      </div>
                      <Button
                        onClick={() => handleResolveConflict(selectedConflict.id, resolution)}
                        disabled={resolvingConflicts.has(selectedConflict.id)}
                        className="ml-2"
                      >
                        {resolvingConflicts.has(selectedConflict.id) ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Applying...
                          </>
                        ) : (
                          'Apply Resolution'
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}