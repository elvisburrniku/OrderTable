import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { EnterpriseFeatureCard } from '@/components/enterprise-feature-card';
import { SneakPeekWidget } from '@/components/sneak-peek-widget';
import { 
  Building2, 
  BarChart3, 
  Users, 
  Bell, 
  Calendar, 
  CreditCard,
  Crown,
  TrendingUp,
  MessageSquare,
  Shield,
  Zap,
  HeadphonesIcon
} from 'lucide-react';
import { useLocation } from 'wouter';

export default function SneakPeekDemo() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState('overview');

  const enterpriseFeatures = [
    {
      title: "Multi-Restaurant Management",
      description: "Manage up to 3 restaurants from a unified dashboard",
      icon: Building2,
      metrics: {
        restaurants: 3,
        totalBookings: 1247,
        revenue: "$45,620"
      }
    },
    {
      title: "Advanced Analytics",
      description: "Real-time insights and performance tracking",
      icon: BarChart3,
      metrics: {
        occupancyRate: 87,
        customerSatisfaction: 4.8,
        efficiency: "+24%"
      }
    },
    {
      title: "Staff Management",
      description: "Role-based access and performance monitoring",
      icon: Users,
      metrics: {
        activeStaff: 15,
        averageRating: 4.7,
        productivity: "+18%"
      }
    },
    {
      title: "Smart Notifications",
      description: "Automated SMS, email, and push notifications",
      icon: Bell,
      metrics: {
        messagesSent: 2341,
        responseRate: "94%",
        automation: "85%"
      }
    },
    {
      title: "AI Calendar Optimization",
      description: "Intelligent booking optimization and conflict resolution",
      icon: Calendar,
      metrics: {
        conflictsResolved: 23,
        timeSaved: "12 hrs/week",
        satisfaction: "96%"
      }
    },
    {
      title: "Payment Processing",
      description: "Integrated payment gateway with detailed reporting",
      icon: CreditCard,
      metrics: {
        processingFees: "2.9%",
        transactionTime: "3.2s",
        success: "99.8%"
      }
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Crown className="h-8 w-8 text-yellow-500" />
            <h1 className="text-4xl font-bold text-gray-900">Enterprise Features</h1>
          </div>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Discover powerful capabilities designed for serious restaurant operations. 
            See how Enterprise features can transform your business.
          </p>
        </div>

        {/* Widget Demonstrations */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <SneakPeekWidget variant="inline" currentPlan="basic" />
          <SneakPeekWidget variant="compact" currentPlan="basic" />
          <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
            <CardContent className="p-4 text-center">
              <Crown className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
              <h3 className="font-semibold mb-1">Ready to Upgrade?</h3>
              <p className="text-sm text-gray-600 mb-3">
                Join 500+ restaurants already using Enterprise
              </p>
              <Button size="sm" className="w-full">
                Start Free Trial
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {enterpriseFeatures.map((feature, index) => (
            <EnterpriseFeatureCard
              key={index}
              title={feature.title}
              description={feature.description}
              icon={feature.icon}
              isLocked={true}
              currentPlan="basic"
            >
              <div className="space-y-2">
                {Object.entries(feature.metrics).map(([key, value]) => (
                  <div key={key} className="flex justify-between text-sm">
                    <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                    <span className="font-semibold">{value}</span>
                  </div>
                ))}
              </div>
            </EnterpriseFeatureCard>
          ))}
        </div>

        {/* Detailed Feature Showcase */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-6 w-6" />
              Enterprise Impact
            </CardTitle>
            <CardDescription>
              See the real difference Enterprise features make
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
                <TabsTrigger value="efficiency">Efficiency</TabsTrigger>
                <TabsTrigger value="support">Support</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-3xl font-bold text-blue-600">3x</div>
                    <div className="text-sm text-gray-600">More Restaurants</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-3xl font-bold text-green-600">87%</div>
                    <div className="text-sm text-gray-600">Higher Efficiency</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-3xl font-bold text-purple-600">24/7</div>
                    <div className="text-sm text-gray-600">Priority Support</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <div className="text-3xl font-bold text-orange-600">$50K+</div>
                    <div className="text-sm text-gray-600">Avg Revenue</div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="analytics" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-3">Occupancy Rate</h4>
                    <Progress value={87} className="h-3 mb-2" />
                    <p className="text-sm text-gray-600">87% average occupancy across all locations</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-3">Customer Satisfaction</h4>
                    <Progress value={96} className="h-3 mb-2" />
                    <p className="text-sm text-gray-600">4.8/5 average rating from customer feedback</p>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="efficiency" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-green-600">+24%</div>
                      <div className="text-sm text-gray-600">Booking Efficiency</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-blue-600">12hrs</div>
                      <div className="text-sm text-gray-600">Time Saved/Week</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-purple-600">23</div>
                      <div className="text-sm text-gray-600">Conflicts Auto-Resolved</div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="support" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                      <HeadphonesIcon className="h-4 w-4 text-purple-500" />
                      <span className="text-sm font-medium">30-minute Response Time</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm font-medium">Custom Onboarding</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium">Staff Training Sessions</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-medium">Monthly Strategy Calls</span>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Call to Action */}
        <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <CardContent className="p-8 text-center">
            <Crown className="h-12 w-12 text-yellow-300 mx-auto mb-4" />
            <h2 className="text-3xl font-bold mb-4">Ready to Transform Your Restaurant?</h2>
            <p className="text-xl mb-6 text-blue-100">
              Join hundreds of successful restaurants already using Enterprise features
            </p>
            <div className="flex gap-4 justify-center">
              <Button 
                size="lg" 
                variant="secondary"
                onClick={() => setLocation('/dashboard')}
              >
                Back to Dashboard
              </Button>
              <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100">
                Start Enterprise Trial
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}