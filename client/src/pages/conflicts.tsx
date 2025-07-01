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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="flex items-center justify-center h-64">
          <Card className="w-96 shadow-lg border-0 bg-white/70 backdrop-blur-md">
            <CardContent className="text-center py-8">
              <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-amber-500" />
              <p className="text-slate-600 font-medium">Please select a restaurant to view conflicts.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Professional Header Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.05"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-30"></div>
        
        <div className="relative px-6 py-12">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center space-x-4 mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl blur-sm opacity-75"></div>
                <div className="relative bg-gradient-to-r from-red-500 to-orange-500 p-3 rounded-2xl">
                  <AlertTriangle className="w-8 h-8 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-4xl font-bold text-white mb-2">
                  Conflict Management
                </h1>
                <p className="text-slate-300 text-lg max-w-2xl">
                  AI-powered intelligent system to detect, analyze, and resolve booking conflicts 
                  automatically with machine learning precision
                </p>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
              <Card className="bg-white/10 backdrop-blur-md border-white/20 text-white">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <Activity className="w-8 h-8 text-green-400" />
                    <div>
                      <p className="text-2xl font-bold">98.7%</p>
                      <p className="text-sm text-slate-300">Resolution Rate</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-white/10 backdrop-blur-md border-white/20 text-white">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <Zap className="w-8 h-8 text-yellow-400" />
                    <div>
                      <p className="text-2xl font-bold">2.1s</p>
                      <p className="text-sm text-slate-300">Avg Response</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-white/10 backdrop-blur-md border-white/20 text-white">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <Shield className="w-8 h-8 text-blue-400" />
                    <div>
                      <p className="text-2xl font-bold">24/7</p>
                      <p className="text-sm text-slate-300">Monitoring</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-white/10 backdrop-blur-md border-white/20 text-white">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <TrendingUp className="w-8 h-8 text-purple-400" />
                    <div>
                      <p className="text-2xl font-bold">147</p>
                      <p className="text-sm text-slate-300">Conflicts Resolved</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-6xl mx-auto p-6 -mt-8 relative z-10">
        <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur-lg">
          <CardContent className="p-8">

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-14 bg-slate-100/50 p-1 rounded-xl">
                <TabsTrigger 
                  value="system" 
                  className="flex items-center space-x-3 text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg transition-all duration-200"
                >
                  <div className="flex items-center space-x-2">
                    <div className="p-1.5 rounded-md bg-gradient-to-r from-red-500 to-orange-500">
                      <AlertTriangle className="w-4 h-4 text-white" />
                    </div>
                    <span>Active Conflicts</span>
                  </div>
                </TabsTrigger>
                <TabsTrigger 
                  value="demo" 
                  className="flex items-center space-x-3 text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg transition-all duration-200"
                >
                  <div className="flex items-center space-x-2">
                    <div className="p-1.5 rounded-md bg-gradient-to-r from-blue-500 to-purple-500">
                      <PlayCircle className="w-4 h-4 text-white" />
                    </div>
                    <span>Demo & Tutorial</span>
                  </div>
                </TabsTrigger>
              </TabsList>

              <div className="mt-8">
                <TabsContent value="system" className="space-y-6 mt-0">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    {/* Quick Stats */}
                    <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                      <CardContent className="p-6">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-green-100 rounded-lg">
                            <CheckCircle2 className="w-6 h-6 text-green-600" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-green-800">3</p>
                            <p className="text-sm text-green-600">Resolved Today</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200">
                      <CardContent className="p-6">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-amber-100 rounded-lg">
                            <Clock className="w-6 h-6 text-amber-600" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-amber-800">1</p>
                            <p className="text-sm text-amber-600">Pending Review</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                      <CardContent className="p-6">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <Activity className="w-6 h-6 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-blue-800">24h</p>
                            <p className="text-sm text-blue-600">Avg Resolution</p>
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
                  <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
                    <CardHeader>
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-indigo-100 rounded-lg">
                          <PlayCircle className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div>
                          <CardTitle className="text-xl text-indigo-800">Interactive Demo</CardTitle>
                          <CardDescription className="text-indigo-600">
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
              </div>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}