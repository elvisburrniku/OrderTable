
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import ConflictResolutionSystem from "@/components/conflict-resolution-system";
import ConflictDemo from "@/components/conflict-demo";
import { 
  AlertTriangle, 
  PlayCircle, 
  Activity, 
  Shield, 
  Zap, 
  TrendingUp,
  Clock,
  CheckCircle2
} from "lucide-react";

export default function Conflicts() {
  const { restaurant } = useAuth();
  const [activeTab, setActiveTab] = useState("system");

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center h-64">
          <Card className="w-96 shadow-sm border border-gray-200">
            <CardContent className="text-center py-8">
              <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-amber-500" />
              <p className="text-gray-600 font-medium">Please select a restaurant to view conflicts.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Professional Header Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center space-x-4 mb-8">
            <div className="bg-red-50 p-3 rounded-lg border border-red-100">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold text-gray-900 mb-2">
                Conflict Management
              </h1>
              <p className="text-gray-600 text-lg max-w-2xl">
                Intelligent system to detect, analyze, and resolve booking conflicts 
                automatically with precision and efficiency.
              </p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="border border-gray-200 bg-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-semibold text-gray-900">98.7%</p>
                    <p className="text-sm text-gray-600">Resolution Rate</p>
                  </div>
                  <div className="bg-green-50 p-2 rounded-lg">
                    <Activity className="w-5 h-5 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border border-gray-200 bg-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-semibold text-gray-900">2.1s</p>
                    <p className="text-sm text-gray-600">Avg Response</p>
                  </div>
                  <div className="bg-blue-50 p-2 rounded-lg">
                    <Zap className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border border-gray-200 bg-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-semibold text-gray-900">24/7</p>
                    <p className="text-sm text-gray-600">Monitoring</p>
                  </div>
                  <div className="bg-purple-50 p-2 rounded-lg">
                    <Shield className="w-5 h-5 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border border-gray-200 bg-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-semibold text-gray-900">147</p>
                    <p className="text-sm text-gray-600">Conflicts Resolved</p>
                  </div>
                  <div className="bg-orange-50 p-2 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto p-6">
        <Card className="border border-gray-200 bg-white shadow-sm">
          <CardContent className="p-8">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-12 bg-gray-100 p-1 rounded-lg mb-8">
                <TabsTrigger 
                  value="system" 
                  className="flex items-center space-x-2 text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md transition-colors"
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>Active Conflicts</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="demo" 
                  className="flex items-center space-x-2 text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md transition-colors"
                >
                  <PlayCircle className="w-4 h-4" />
                  <span>Demo & Tutorial</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="system" className="space-y-6 mt-0">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                  {/* Quick Stats */}
                  <Card className="border border-green-200 bg-green-50">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-2xl font-semibold text-green-900">3</p>
                          <p className="text-sm text-green-700">Resolved Today</p>
                        </div>
                        <div className="bg-green-100 p-2 rounded-lg">
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border border-amber-200 bg-amber-50">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-2xl font-semibold text-amber-900">1</p>
                          <p className="text-sm text-amber-700">Pending Review</p>
                        </div>
                        <div className="bg-amber-100 p-2 rounded-lg">
                          <Clock className="w-5 h-5 text-amber-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border border-blue-200 bg-blue-50">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-2xl font-semibold text-blue-900">24h</p>
                          <p className="text-sm text-blue-700">Avg Resolution</p>
                        </div>
                        <div className="bg-blue-100 p-2 rounded-lg">
                          <Activity className="w-5 h-5 text-blue-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <ConflictResolutionSystem
                  restaurantId={restaurant.id}
                  tenantId={restaurant.tenantId}
                  onConflictResolved={(conflictId) => {
                    console.log(`Conflict ${conflictId} resolved`);
                  }}
                />
              </TabsContent>

              <TabsContent value="demo" className="space-y-6 mt-0">
                <Card className="border border-blue-200 bg-blue-50">
                  <CardHeader>
                    <div className="flex items-center space-x-3">
                      <div className="bg-blue-100 p-2 rounded-lg">
                        <PlayCircle className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-xl text-blue-900">Interactive Demo</CardTitle>
                        <CardDescription className="text-blue-700">
                          Learn how our AI conflict resolution system works
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ConflictDemo />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
