import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ConflictResolutionSystem from "@/components/conflict-resolution-system";
import ConflictDemo from "@/components/conflict-demo";
import { AlertTriangle, PlayCircle } from "lucide-react";

export default function Conflicts() {
  const { restaurant } = useAuth();
  const [activeTab, setActiveTab] = useState("system");

  if (!restaurant) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Please select a restaurant to view conflicts.</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center space-x-2">
            <AlertTriangle className="w-8 h-8 text-orange-500" />
            <span>Conflict Management</span>
          </h1>
          <p className="text-muted-foreground">
            AI-powered system to detect, analyze, and resolve booking conflicts automatically
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="system" className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4" />
              <span>Active Conflicts</span>
            </TabsTrigger>
            <TabsTrigger value="demo" className="flex items-center space-x-2">
              <PlayCircle className="w-4 h-4" />
              <span>Demo & Tutorial</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="system" className="space-y-6">
            <ConflictResolutionSystem
              restaurantId={restaurant.id}
              tenantId={restaurant.tenantId}
              onConflictResolved={(conflictId) => {
                console.log(`Conflict ${conflictId} resolved`);
              }}
            />
          </TabsContent>

          <TabsContent value="demo" className="space-y-6">
            <ConflictDemo />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}