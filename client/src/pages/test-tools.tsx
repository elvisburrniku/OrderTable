import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Calendar, Settings, TestTube } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function TestTools() {
  const [simulationActive, setSimulationActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<any>(null);
  const { toast } = useToast();

  const enableSimulation = async () => {
    setIsLoading(true);
    try {
      const response = await apiRequest("POST", "/api/test/enable-next-month-simulation");
      const data = await response.json();
      
      if (data.success) {
        setSimulationActive(true);
        toast({
          title: "Simulation Enabled",
          description: "Booking count is now simulated as 0 for testing",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to enable simulation",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const disableSimulation = async () => {
    setIsLoading(true);
    try {
      const response = await apiRequest("POST", "/api/test/disable-next-month-simulation");
      const data = await response.json();
      
      if (data.success) {
        setSimulationActive(false);
        toast({
          title: "Simulation Disabled",
          description: "Normal booking count restored",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to disable simulation",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const checkStatus = async () => {
    setIsLoading(true);
    try {
      const response = await apiRequest("POST", "/api/test/simulate-next-month");
      const data = await response.json();
      setCurrentStatus(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to check status",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <TestTube className="h-6 w-6" />
          Testing Tools
        </h1>
        <p className="text-gray-600">
          Simulate different scenarios for testing subscription downgrades and other features.
        </p>
      </div>

      <div className="grid gap-6">
        {/* Next Month Simulation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Next Month Simulation
              {simulationActive && <Badge variant="destructive">Active</Badge>}
            </CardTitle>
            <CardDescription>
              Simulate next month scenario with 0 bookings to test downgrade functionality.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button 
                onClick={enableSimulation}
                disabled={isLoading || simulationActive}
                variant={simulationActive ? "secondary" : "default"}
              >
                {isLoading ? "Processing..." : "Enable Simulation"}
              </Button>
              
              <Button 
                onClick={disableSimulation}
                disabled={isLoading || !simulationActive}
                variant="outline"
              >
                {isLoading ? "Processing..." : "Disable Simulation"}
              </Button>
              
              <Button 
                onClick={checkStatus}
                disabled={isLoading}
                variant="outline"
              >
                {isLoading ? "Checking..." : "Check Status"}
              </Button>
            </div>

            {currentStatus && (
              <Alert>
                <Settings className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <div><strong>Current Month:</strong> {currentStatus.currentMonth?.month} - {currentStatus.currentMonth?.bookings} bookings</div>
                    <div><strong>Next Month:</strong> {currentStatus.nextMonth?.month} - {currentStatus.nextMonth?.bookings} bookings</div>
                    <div className="text-sm text-gray-600 mt-2">{currentStatus.instructions}</div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <Alert>
              <AlertDescription>
                <div className="space-y-2 text-sm">
                  <div><strong>How to test:</strong></div>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Enable the simulation above</li>
                    <li>Go to the Billing page</li>
                    <li>Try to downgrade to Free plan</li>
                    <li>The system will now use 0 bookings for validation</li>
                    <li>You'll only be blocked by table limits (if you have more than 3 tables)</li>
                    <li>Disable simulation when done testing</li>
                  </ol>
                </div>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Current Usage Display */}
        <Card>
          <CardHeader>
            <CardTitle>Current Usage</CardTitle>
            <CardDescription>
              Your current subscription usage for testing reference.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="font-medium">Tables</div>
                <div className="text-gray-600">5 tables active</div>
              </div>
              <div>
                <div className="font-medium">Bookings This Month</div>
                <div className="text-gray-600">36 bookings</div>
              </div>
            </div>
            
            <div className="mt-4 space-y-2 text-sm text-gray-600">
              <div><strong>Free Plan Limits:</strong> 3 tables, 20 bookings/month</div>
              <div><strong>Starter Plan Limits:</strong> 10 tables, 100 bookings/month</div>
              <div><strong>Professional Plan Limits:</strong> 50 tables, 500 bookings/month</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}