import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, ExternalLink, Eye, Code } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useTenant } from '@/lib/tenant';

export default function WidgetDemo() {
  const { restaurant } = useAuth();
  const { tenant } = useTenant();
  const [activeDemo, setActiveDemo] = useState<'floating-button' | 'inline-card' | 'banner' | 'sidebar'>('inline-card');
  
  // For demo purposes, use fallback values
  const demoRestaurant = restaurant || { id: 1, name: 'Demo Restaurant' };
  const demoTenant = tenant || { id: 1 };

  useEffect(() => {
    // Clean up any existing widgets first
    const existingWidgets = document.querySelectorAll('.rbw-widget');
    existingWidgets.forEach(widget => widget.remove());
    
    const existingScripts = document.querySelectorAll('script[src="/widget/booking-widget.js"]');
    existingScripts.forEach(s => s.remove());

    // Load the widget script for demo
    const script = document.createElement('script');
    script.src = '/widget/booking-widget.js';
    script.setAttribute('data-restaurant-id', demoRestaurant.id?.toString() || '1');
    script.setAttribute('data-config', encodeURIComponent(JSON.stringify({
      type: activeDemo,
      theme: 'modern',
      size: 'standard',
      primaryColor: '#2563eb',
      accentColor: '#1d4ed8',
      cornerRadius: 'medium',
      shadow: 'medium',
      buttonText: 'Book Table',
      headerText: 'Reserve Your Table',
      description: 'Quick and easy online reservations',
      placement: 'bottom-right',
      animation: 'slide-up',
      showBranding: true,
      customCSS: ''
    })));
    script.async = true;
    
    document.head.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
      // Clean up any widget elements
      const widgets = document.querySelectorAll('.rbw-widget');
      widgets.forEach(w => w.remove());
    };
  }, [activeDemo, demoRestaurant.id]);

  const demoConfigs = {
    'floating-button': {
      name: 'Floating Button',
      description: 'Sticky button that opens booking form',
      features: ['Non-intrusive', 'Always visible', 'High conversion'],
      icon: '🎯'
    },
    'inline-card': {
      name: 'Inline Card',
      description: 'Embeds directly into your webpage content',
      features: ['Seamless integration', 'Responsive design', 'Custom styling'],
      icon: '📋'
    },
    'banner': {
      name: 'Banner Widget',
      description: 'Horizontal banner for promotions',
      features: ['Eye-catching', 'Call-to-action', 'Promotional display'],
      icon: '📢'
    },
    'sidebar': {
      name: 'Sidebar Panel',
      description: 'Slide-out booking panel',
      features: ['Full-screen experience', 'Focus on booking', 'Professional appearance'],
      icon: '📌'
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto py-8 px-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <a 
              href={`/${demoTenant.id}/integrations/widget`}
              className="flex items-center text-blue-600 hover:text-blue-800 mr-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Widget Builder
            </a>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Widget Demo</h1>
              <p className="text-xl text-gray-600">See your booking widget in action</p>
            </div>
            <Badge variant="secondary" className="text-lg px-4 py-2">
              Live Preview
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Widget Type Selector */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Eye className="w-5 h-5 mr-2" />
                  Widget Types
                </CardTitle>
                <CardDescription>Choose a widget style to preview</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(demoConfigs).map(([type, config]) => (
                  <div
                    key={type}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      activeDemo === type
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setActiveDemo(type as any)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <span className="text-lg mr-2">{config.icon}</span>
                        <h3 className="font-semibold text-gray-900">{config.name}</h3>
                      </div>
                      {activeDemo === type && (
                        <Badge variant="default" className="text-xs">Active</Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{config.description}</p>
                    <div className="space-y-1">
                      {config.features.map((feature, index) => (
                        <div key={index} className="flex items-center text-xs text-gray-500">
                          <span className="w-1 h-1 bg-gray-400 rounded-full mr-2"></span>
                          {feature}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Integration Instructions */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Code className="w-5 h-5 mr-2" />
                  Quick Integration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-gray-900 rounded-lg p-4 text-sm">
                    <code className="text-green-400">
                      {`<!-- Add to your website -->`}<br/>
                      <span className="text-blue-400">{`<div`}</span>
                      <span className="text-yellow-400">{` id=`}</span>
                      <span className="text-green-400">{`"restaurant-booking-widget"`}</span>
                      <span className="text-blue-400">{`></div>`}</span><br/>
                      <span className="text-blue-400">{`<script`}</span>
                      <span className="text-yellow-400">{` src=`}</span>
                      <span className="text-green-400">{`"${window.location.origin}/widget/booking-widget.js"`}</span>
                      <span className="text-blue-400">{`></script>`}</span>
                    </code>
                  </div>
                  <Button className="w-full" size="sm">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Get Full Code
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Demo Preview Area */}
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Live Preview - {demoConfigs[activeDemo].name}</CardTitle>
                <CardDescription>
                  This is how the widget will appear on your website
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Mock Website Container */}
                <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg overflow-hidden">
                  {/* Mock Website Header */}
                  <div className="bg-gray-800 text-white p-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-bold">{demoRestaurant.name || 'Your Restaurant'}</h2>
                      <div className="flex space-x-4 text-sm">
                        <span>Menu</span>
                        <span>About</span>
                        <span>Contact</span>
                        <span>Reservations</span>
                      </div>
                    </div>
                  </div>

                  {/* Mock Website Content */}
                  <div className="p-8 min-h-[500px] relative">
                    <div className="max-w-4xl mx-auto">
                      <h1 className="text-3xl font-bold text-gray-900 mb-4">
                        Welcome to {demoRestaurant.name || 'Your Restaurant'}
                      </h1>
                      <p className="text-lg text-gray-600 mb-8">
                        Experience exceptional dining with our carefully crafted menu and warm atmosphere.
                        Our chefs use only the finest ingredients to create memorable culinary experiences.
                      </p>

                      {/* Inline Widget Demo Area */}
                      {(activeDemo === 'inline-card' || activeDemo === 'banner') && (
                        <div className="mb-8">
                          <h2 className="text-2xl font-semibold mb-4">Make a Reservation</h2>
                          <div id="restaurant-booking-widget"></div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                          <h3 className="text-xl font-semibold mb-3">Our Story</h3>
                          <p className="text-gray-600">
                            Founded with a passion for culinary excellence, we bring together traditional
                            techniques with modern innovation to create an unforgettable dining experience.
                          </p>
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold mb-3">Opening Hours</h3>
                          <div className="space-y-1 text-gray-600">
                            <div className="flex justify-between">
                              <span>Monday - Thursday</span>
                              <span>5:00 PM - 10:00 PM</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Friday - Saturday</span>
                              <span>5:00 PM - 11:00 PM</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Sunday</span>
                              <span>4:00 PM - 9:00 PM</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Widget Preview Indicators */}
                    {activeDemo === 'button' && (
                      <div className="absolute bottom-4 right-4">
                        <div className="bg-blue-100 border-2 border-blue-300 border-dashed rounded-lg p-3">
                          <div className="flex items-center text-blue-700 text-sm">
                            <span className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></span>
                            Floating button will appear here
                          </div>
                        </div>
                      </div>
                    )}

                    {activeDemo === 'popup' && (
                      <div className="absolute inset-0 bg-black bg-opacity-10 flex items-center justify-center">
                        <div className="bg-blue-100 border-2 border-blue-300 border-dashed rounded-lg p-6">
                          <div className="text-center text-blue-700">
                            <span className="w-3 h-3 bg-blue-500 rounded-full inline-block mr-2 animate-pulse"></span>
                            <div className="text-sm font-medium">Popup modal will overlay here</div>
                            <div className="text-xs mt-1">Click the floating button to see it in action</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Mock Website Footer */}
                  <div className="bg-gray-100 p-6 text-center text-gray-600 text-sm">
                    <p>&copy; 2024 {demoRestaurant.name || 'Your Restaurant'}. All rights reserved.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Powerful Features for Your Website
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🎨</span>
                </div>
                <h3 className="font-semibold mb-2">Fully Customizable</h3>
                <p className="text-sm text-gray-600">
                  Match your brand with custom colors, fonts, and styling options
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📱</span>
                </div>
                <h3 className="font-semibold mb-2">Mobile Responsive</h3>
                <p className="text-sm text-gray-600">
                  Works perfectly on all devices and screen sizes
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">⚡</span>
                </div>
                <h3 className="font-semibold mb-2">Lightning Fast</h3>
                <p className="text-sm text-gray-600">
                  Optimized for speed with minimal impact on your site
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}