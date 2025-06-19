import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Progress } from './ui/progress';
import { 
  Crown, 
  Building2, 
  Calendar, 
  Users, 
  BarChart3, 
  Bell, 
  MessageSquare, 
  CreditCard,
  Zap,
  Shield,
  HeadphonesIcon,
  TrendingUp,
  Eye,
  Lock,
  ArrowRight,
  CheckCircle
} from 'lucide-react';
import { ConsultationBookingForm } from './consultation-booking-form';

interface SneakPeekModalProps {
  children: React.ReactNode;
  currentPlan?: string;
}

export function SneakPeekModal({ children, currentPlan = "basic" }: SneakPeekModalProps) {
  const [activeDemo, setActiveDemo] = useState<string>('overview');
  const [, setLocation] = useLocation();

  const enterpriseFeatures = [
    {
      icon: Building2,
      title: "Multi-Restaurant Management",
      description: "Manage up to 3 restaurants with centralized dashboard",
      demoData: {
        restaurants: ["The Garden Bistro", "Urban Kitchen", "Coastal Cafe"],
        totalBookings: 1247,
        revenue: "$45,620"
      }
    },
    {
      icon: BarChart3,
      title: "Advanced Analytics",
      description: "Real-time insights and performance metrics",
      demoData: {
        occupancyRate: 87,
        peakHours: "7:00 PM - 9:00 PM",
        customerSatisfaction: 4.8
      }
    },
    {
      icon: Calendar,
      title: "Smart Calendar Integration",
      description: "AI-powered booking optimization and conflict resolution",
      demoData: {
        conflictsResolved: 23,
        optimizationSavings: "12 hours/week"
      }
    },
    {
      icon: Bell,
      title: "Automated Notifications",
      description: "SMS, email, and push notifications for staff and customers",
      demoData: {
        notificationsSent: 2341,
        responseRate: "94%"
      }
    },
    {
      icon: Users,
      title: "Staff Management",
      description: "Role-based access control and performance tracking",
      demoData: {
        activeStaff: 15,
        averageRating: 4.7
      }
    },
    {
      icon: CreditCard,
      title: "Payment Processing",
      description: "Integrated payment gateway with detailed reporting",
      demoData: {
        processingFees: "2.9%",
        avgTransactionTime: "3.2s"
      }
    }
  ];

  const renderFeatureDemo = (feature: typeof enterpriseFeatures[0]) => {
    const Icon = feature.icon;
    
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Icon className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold">{feature.title}</h3>
            <p className="text-sm text-gray-600">{feature.description}</p>
          </div>
        </div>
        
        <Card className="border-dashed">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500">Demo Preview</span>
              <Badge variant="outline" className="text-xs">
                <Eye className="h-3 w-3 mr-1" />
                Live Demo
              </Badge>
            </div>
            
            {feature.icon === Building2 && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  {feature.demoData.restaurants.map((name, index) => (
                    <div key={index} className="p-2 bg-gray-50 rounded text-center text-xs">
                      {name}
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-sm">
                  <span>Total Bookings: {feature.demoData.totalBookings}</span>
                  <span className="text-green-600 font-semibold">{feature.demoData.revenue}</span>
                </div>
              </div>
            )}
            
            {feature.icon === BarChart3 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Occupancy Rate</span>
                  <span className="font-semibold">{feature.demoData.occupancyRate}%</span>
                </div>
                <Progress value={feature.demoData.occupancyRate} className="h-2" />
                <div className="text-xs text-gray-500">
                  Peak: {feature.demoData.peakHours} | Rating: ⭐ {feature.demoData.customerSatisfaction}
                </div>
              </div>
            )}
            
            {feature.icon === Calendar && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Conflicts Auto-Resolved</span>
                  <span className="font-semibold text-green-600">{feature.demoData.conflictsResolved}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Time Saved</span>
                  <span className="font-semibold text-blue-600">{feature.demoData.optimizationSavings}</span>
                </div>
              </div>
            )}
            
            {feature.icon === Bell && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Messages Sent</span>
                  <span className="font-semibold">{feature.demoData.notificationsSent}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Response Rate</span>
                  <span className="font-semibold text-green-600">{feature.demoData.responseRate}</span>
                </div>
              </div>
            )}
            
            {feature.icon === Users && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Active Staff</span>
                  <span className="font-semibold">{feature.demoData.activeStaff}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Average Rating</span>
                  <span className="font-semibold">⭐ {feature.demoData.averageRating}</span>
                </div>
              </div>
            )}
            
            {feature.icon === CreditCard && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Processing Fees</span>
                  <span className="font-semibold text-green-600">{feature.demoData.processingFees}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Avg Transaction Time</span>
                  <span className="font-semibold">{feature.demoData.avgTransactionTime}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-500" />
            Enterprise Features Sneak Peek
          </DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeDemo} onValueChange={setActiveDemo} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="features">Features</TabsTrigger>
            <TabsTrigger value="pricing">Pricing</TabsTrigger>
            <TabsTrigger value="support">Support</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-6">
            <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-blue-600" />
                  Unlock Your Restaurant's Full Potential
                </CardTitle>
                <CardDescription>
                  See what's possible with Enterprise features designed for serious restaurant operations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">3x</div>
                    <div className="text-sm text-gray-600">More Restaurants</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">87%</div>
                    <div className="text-sm text-gray-600">Higher Efficiency</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">24/7</div>
                    <div className="text-sm text-gray-600">Priority Support</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">$50K+</div>
                    <div className="text-sm text-gray-600">Avg Revenue</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <div className="grid md:grid-cols-2 gap-4">
              {enterpriseFeatures.slice(0, 4).map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Icon className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm">{feature.title}</h4>
                          <p className="text-xs text-gray-600 mt-1">{feature.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
          
          <TabsContent value="features" className="space-y-4">
            <div className="grid gap-6">
              {enterpriseFeatures.map((feature, index) => (
                <div key={index}>
                  {renderFeatureDemo(feature)}
                </div>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="pricing" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="border-gray-200">
                <CardHeader>
                  <CardTitle className="text-lg">Current Plan</CardTitle>
                  <CardDescription>Your current features and limitations</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">1 Restaurant Only</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">Basic Analytics</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">Email Support</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">Limited Integrations</span>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-blue-500 shadow-lg relative">
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-blue-600 text-white">Recommended</Badge>
                </div>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Crown className="h-5 w-5 text-yellow-500" />
                    Enterprise Plan
                  </CardTitle>
                  <CardDescription>Everything you need to scale your business</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-3xl font-bold">$199<span className="text-lg text-gray-500">/month</span></div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Up to 3 Restaurants</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Advanced Analytics & Reports</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm">24/7 Priority Support</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm">All Integrations Included</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Custom Branding</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm">API Access</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="support" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HeadphonesIcon className="h-5 w-5" />
                  Enterprise Support Benefits
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium">24/7 Priority Support</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-medium">Dedicated Account Manager</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-purple-500" />
                      <span className="text-sm font-medium">Monthly Strategy Calls</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm font-medium">30-minute Response Time</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium">Staff Training Sessions</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-medium">Custom Onboarding</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-blue-50 p-4 rounded-lg mt-6">
                  <h4 className="font-semibold mb-2">Ready to get started?</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Book a free consultation with our restaurant success team to see how Enterprise features 
                    can transform your operations.
                  </p>
                  <ConsultationBookingForm>
                    <Button className="w-full">
                      Schedule Free Consultation
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </ConsultationBookingForm>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        <div className="flex gap-3 pt-4 border-t">
          <Button variant="outline" className="flex-1">
            Maybe Later
          </Button>
          <Button 
            className="flex-1"
            onClick={() => {
              // Navigate to billing page for upgrade
              const currentPath = window.location.pathname;
              const tenantId = currentPath.split('/')[1];
              if (tenantId && !isNaN(Number(tenantId))) {
                setLocation(`/${tenantId}/billing`);
              } else {
                setLocation('/billing');
              }
            }}
          >
            Upgrade to Enterprise
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}