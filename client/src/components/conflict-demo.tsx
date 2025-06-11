import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Zap, 
  Calendar, 
  Users, 
  Clock, 
  MapPin,
  AlertTriangle,
  CheckCircle,
  PlayCircle
} from "lucide-react";

export default function ConflictDemo() {
  const { restaurant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreatingDemo, setIsCreatingDemo] = useState(false);

  const tenantId = restaurant?.tenantId;
  const restaurantId = restaurant?.id;

  // Create demo conflicts mutation
  const createDemoConflictsMutation = useMutation({
    mutationFn: async () => {
      if (!tenantId || !restaurantId) {
        throw new Error('Missing tenant or restaurant ID');
      }

      // Create some demo bookings that will cause conflicts
      const demoBookings = [
        {
          customerName: "John Smith",
          customerEmail: "john.smith@email.com",
          customerPhone: "+1234567890",
          guestCount: 4,
          bookingDate: new Date().toISOString().split('T')[0],
          startTime: "19:00",
          endTime: "21:00",
          tableId: 1,
          status: "confirmed",
          notes: "Anniversary dinner"
        },
        {
          customerName: "Sarah Johnson",
          customerEmail: "sarah.johnson@email.com", 
          customerPhone: "+1234567891",
          guestCount: 2,
          bookingDate: new Date().toISOString().split('T')[0],
          startTime: "19:30",
          endTime: "21:30",
          tableId: 1, // Same table - will create conflict
          status: "confirmed",
          notes: "Date night"
        },
        {
          customerName: "Large Party Inc",
          customerEmail: "events@largeparty.com",
          customerPhone: "+1234567892", 
          guestCount: 12,
          bookingDate: new Date().toISOString().split('T')[0],
          startTime: "18:00",
          endTime: "20:00",
          tableId: 2, // Assuming this table has capacity < 12
          status: "confirmed",
          notes: "Corporate dinner"
        }
      ];

      // Create the demo bookings
      for (const booking of demoBookings) {
        const response = await apiRequest(
          "POST",
          `/api/tenants/${tenantId}/restaurants/${restaurantId}/bookings`,
          booking
        );
        
        if (!response.ok) {
          throw new Error(`Failed to create demo booking for ${booking.customerName}`);
        }
      }

      return { message: "Demo conflicts created successfully" };
    },
    onSuccess: () => {
      toast({
        title: "Demo Conflicts Created",
        description: "Three demo bookings with conflicts have been created. Check the Conflicts tab to see them.",
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ 
        queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/bookings`] 
      });
      queryClient.invalidateQueries({ 
        queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/conflicts`] 
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Create Demo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreateDemo = () => {
    setIsCreatingDemo(true);
    createDemoConflictsMutation.mutate();
    setTimeout(() => setIsCreatingDemo(false), 3000);
  };

  const demoScenarios = [
    {
      id: 1,
      title: "Table Double Booking",
      description: "Two customers book the same table at overlapping times",
      icon: <MapPin className="w-5 h-5" />,
      severity: "high",
      example: "Table 1: 7:00 PM - John Smith (4 guests) & 7:30 PM - Sarah Johnson (2 guests)"
    },
    {
      id: 2,
      title: "Capacity Exceeded", 
      description: "Party size exceeds table capacity",
      icon: <Users className="w-5 h-5" />,
      severity: "medium",
      example: "Table 2 (6-seat): Large Party Inc requesting 12 guests"
    },
    {
      id: 3,
      title: "Time Overlap Rush",
      description: "Too many bookings at the same time slot",
      icon: <Clock className="w-5 h-5" />,
      severity: "low", 
      example: "Multiple parties all requesting 7:00 PM time slot"
    }
  ];

  const resolutionFeatures = [
    {
      title: "AI-Powered Analysis",
      description: "Smart algorithms detect conflicts automatically",
      icon: <Zap className="w-5 h-5 text-yellow-500" />
    },
    {
      title: "Multiple Resolution Options",
      description: "Each conflict gets several resolution suggestions with confidence scores",
      icon: <CheckCircle className="w-5 h-5 text-green-500" />
    },
    {
      title: "Customer Impact Assessment",
      description: "Estimates customer satisfaction for each resolution approach",
      icon: <Users className="w-5 h-5 text-blue-500" />
    },
    {
      title: "Auto-Resolution",
      description: "Low-risk conflicts can be resolved automatically",
      icon: <PlayCircle className="w-5 h-5 text-purple-500" />
    }
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-2">
          <AlertTriangle className="w-8 h-8 text-orange-500" />
          <h2 className="text-3xl font-bold">Smart Conflict Resolution Demo</h2>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Experience our AI-powered system that automatically detects and resolves booking conflicts 
          to ensure smooth restaurant operations.
        </p>
      </div>

      {/* Demo Creation */}
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <PlayCircle className="w-5 h-5 text-orange-600" />
            <span>Try the Demo</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Click below to create sample bookings that will trigger various types of conflicts. 
            This will help you see how the conflict resolution system works in practice.
          </p>
          
          <div className="flex items-center space-x-4">
            <Button 
              onClick={handleCreateDemo}
              disabled={isCreatingDemo || createDemoConflictsMutation.isPending}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isCreatingDemo ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Creating Demo...
                </>
              ) : (
                <>
                  <PlayCircle className="w-4 h-4 mr-2" />
                  Create Demo Conflicts
                </>
              )}
            </Button>
            
            <div className="text-sm text-muted-foreground">
              This will create 3 bookings with intentional conflicts
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Demo Scenarios */}
      <div>
        <h3 className="text-xl font-semibold mb-4">Conflict Scenarios</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {demoScenarios.map((scenario) => (
            <Card key={scenario.id} className="border-l-4 border-l-orange-500">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {scenario.icon}
                    <h4 className="font-medium">{scenario.title}</h4>
                  </div>
                  <Badge className={getSeverityColor(scenario.severity)}>
                    {scenario.severity.toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {scenario.description}
                </p>
                <div className="p-2 bg-gray-50 rounded text-xs">
                  <strong>Example:</strong> {scenario.example}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Resolution Features */}
      <div>
        <h3 className="text-xl font-semibold mb-4">Resolution Features</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {resolutionFeatures.map((feature, index) => (
            <Card key={index}>
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  {feature.icon}
                  <div>
                    <h4 className="font-medium mb-1">{feature.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Resolution Process */}
      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start space-x-4">
              <div className="w-8 h-8 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-sm font-medium">
                1
              </div>
              <div>
                <h4 className="font-medium">Automatic Detection</h4>
                <p className="text-sm text-muted-foreground">
                  System continuously monitors bookings for potential conflicts including table double-bookings, 
                  capacity issues, and scheduling overlaps.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className="w-8 h-8 bg-green-100 text-green-800 rounded-full flex items-center justify-center text-sm font-medium">
                2
              </div>
              <div>
                <h4 className="font-medium">Smart Analysis</h4>
                <p className="text-sm text-muted-foreground">
                  AI algorithms analyze each conflict, considering factors like customer priority, 
                  table availability, and customer satisfaction impact.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className="w-8 h-8 bg-purple-100 text-purple-800 rounded-full flex items-center justify-center text-sm font-medium">
                3
              </div>
              <div>
                <h4 className="font-medium">Resolution Suggestions</h4>
                <p className="text-sm text-muted-foreground">
                  Multiple resolution options are generated with confidence scores and 
                  estimated customer satisfaction ratings.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className="w-8 h-8 bg-orange-100 text-orange-800 rounded-full flex items-center justify-center text-sm font-medium">
                4
              </div>
              <div>
                <h4 className="font-medium">Automated Resolution</h4>
                <p className="text-sm text-muted-foreground">
                  Low-risk conflicts can be automatically resolved, while complex issues 
                  are flagged for manual review with detailed recommendations.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Next Steps */}
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-6">
          <div className="text-center space-y-2">
            <CheckCircle className="w-8 h-8 text-green-600 mx-auto" />
            <h3 className="text-lg font-semibold text-green-800">Ready to Get Started?</h3>
            <p className="text-green-700">
              Create the demo conflicts above, then navigate to the Conflicts page to see the 
              resolution system in action. You'll be able to review detected conflicts and 
              apply AI-suggested resolutions.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}