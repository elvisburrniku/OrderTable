import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Copy, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface WidgetConfig {
  type: 'button' | 'inline' | 'popup';
  size: 'small' | 'medium' | 'large';
  color: string;
  backgroundColor: string;
  borderRadius: number;
  showDate: boolean;
  showTime: boolean;
  showGuests: boolean;
  showSpecialRequests: boolean;
  buttonText: string;
  headerText: string;
  placement: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  animation: 'none' | 'fade' | 'slide' | 'bounce';
}

export function WidgetBuilder() {
  const { toast } = useToast();
  const [config, setConfig] = useState<WidgetConfig>({
    type: 'button',
    size: 'medium',
    color: '#ffffff',
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    showDate: true,
    showTime: true,
    showGuests: true,
    showSpecialRequests: false,
    buttonText: 'Reserve Table',
    headerText: 'Make a Reservation',
    placement: 'bottom-right',
    animation: 'fade'
  });

  const [restaurantId, setRestaurantId] = useState<string>('');
  const [widgetCode, setWidgetCode] = useState<string>('');
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');

  useEffect(() => {
    generateWidgetCode();
  }, [config, restaurantId]);

  const generateWidgetCode = () => {
    const baseUrl = window.location.origin;
    const widgetConfig = encodeURIComponent(JSON.stringify(config));
    
    const code = `<!-- Restaurant Booking Widget -->
<div id="restaurant-booking-widget"></div>
<script>
  (function() {
    var script = document.createElement('script');
    script.src = '${baseUrl}/widget/booking-widget.js';
    script.setAttribute('data-restaurant-id', '${restaurantId}');
    script.setAttribute('data-config', '${widgetConfig}');
    script.async = true;
    document.head.appendChild(script);
  })();
</script>
<!-- End Restaurant Booking Widget -->`;

    setWidgetCode(code);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(widgetCode);
    toast({
      title: "Copied!",
      description: "Widget code copied to clipboard",
    });
  };

  const updateConfig = <K extends keyof WidgetConfig>(key: K, value: WidgetConfig[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Booking Widget Builder</h2>
        <p className="text-muted-foreground">
          Create a customizable booking widget to embed on your website
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration Panel */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Settings</CardTitle>
              <CardDescription>Configure the core widget properties</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="restaurant-id">Restaurant ID</Label>
                <Input
                  id="restaurant-id"
                  value={restaurantId}
                  onChange={(e) => setRestaurantId(e.target.value)}
                  placeholder="Enter your restaurant ID"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="widget-type">Widget Type</Label>
                <Select value={config.type} onValueChange={(value: any) => updateConfig('type', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="button">Floating Button</SelectItem>
                    <SelectItem value="inline">Inline Form</SelectItem>
                    <SelectItem value="popup">Popup Modal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="button-text">Button Text</Label>
                <Input
                  id="button-text"
                  value={config.buttonText}
                  onChange={(e) => updateConfig('buttonText', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="header-text">Header Text</Label>
                <Input
                  id="header-text"
                  value={config.headerText}
                  onChange={(e) => updateConfig('headerText', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Customize the visual appearance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="size">Size</Label>
                <Select value={config.size} onValueChange={(value: any) => updateConfig('size', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Small</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="large">Large</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="color">Text Color</Label>
                  <Input
                    id="color"
                    type="color"
                    value={config.color}
                    onChange={(e) => updateConfig('color', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bg-color">Background Color</Label>
                  <Input
                    id="bg-color"
                    type="color"
                    value={config.backgroundColor}
                    onChange={(e) => updateConfig('backgroundColor', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="border-radius">Border Radius: {config.borderRadius}px</Label>
                <input
                  id="border-radius"
                  type="range"
                  min="0"
                  max="50"
                  value={config.borderRadius}
                  onChange={(e) => updateConfig('borderRadius', parseInt(e.target.value))}
                  className="w-full"
                />
              </div>

              {config.type === 'button' && (
                <div className="space-y-2">
                  <Label htmlFor="placement">Placement</Label>
                  <Select value={config.placement} onValueChange={(value: any) => updateConfig('placement', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bottom-right">Bottom Right</SelectItem>
                      <SelectItem value="bottom-left">Bottom Left</SelectItem>
                      <SelectItem value="top-right">Top Right</SelectItem>
                      <SelectItem value="top-left">Top Left</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="animation">Animation</Label>
                <Select value={config.animation} onValueChange={(value: any) => updateConfig('animation', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="fade">Fade</SelectItem>
                    <SelectItem value="slide">Slide</SelectItem>
                    <SelectItem value="bounce">Bounce</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Form Fields</CardTitle>
              <CardDescription>Choose which fields to display</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="show-date">Show Date Picker</Label>
                <Switch
                  id="show-date"
                  checked={config.showDate}
                  onCheckedChange={(checked) => updateConfig('showDate', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="show-time">Show Time Picker</Label>
                <Switch
                  id="show-time"
                  checked={config.showTime}
                  onCheckedChange={(checked) => updateConfig('showTime', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="show-guests">Show Guest Count</Label>
                <Switch
                  id="show-guests"
                  checked={config.showGuests}
                  onCheckedChange={(checked) => updateConfig('showGuests', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="show-requests">Show Special Requests</Label>
                <Switch
                  id="show-requests"
                  checked={config.showSpecialRequests}
                  onCheckedChange={(checked) => updateConfig('showSpecialRequests', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview and Code Panel */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Widget Preview
                <div className="flex gap-2">
                  <Button
                    variant={previewMode === 'desktop' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPreviewMode('desktop')}
                  >
                    Desktop
                  </Button>
                  <Button
                    variant={previewMode === 'mobile' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPreviewMode('mobile')}
                  >
                    Mobile
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div 
                className={`border rounded-lg bg-gray-50 relative overflow-hidden ${
                  previewMode === 'mobile' ? 'max-w-sm mx-auto' : 'w-full'
                }`}
                style={{ minHeight: '300px' }}
              >
                {/* Preview Content */}
                <div className="p-4 text-center text-gray-500">
                  <Eye className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Widget preview will appear here</p>
                  <p className="text-sm">Configure settings to see changes</p>
                </div>

                {/* Simulated Widget */}
                {config.type === 'button' && (
                  <div 
                    className={`fixed ${
                      config.placement.includes('bottom') ? 'bottom-4' : 'top-4'
                    } ${
                      config.placement.includes('right') ? 'right-4' : 'left-4'
                    }`}
                    style={{
                      position: 'absolute',
                      backgroundColor: config.backgroundColor,
                      color: config.color,
                      borderRadius: `${config.borderRadius}px`,
                      padding: config.size === 'small' ? '8px 16px' : config.size === 'medium' ? '12px 24px' : '16px 32px',
                      fontSize: config.size === 'small' ? '14px' : config.size === 'medium' ? '16px' : '18px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      cursor: 'pointer'
                    }}
                  >
                    {config.buttonText}
                  </div>
                )}

                {config.type === 'inline' && (
                  <div className="p-4">
                    <div 
                      className="border rounded-lg p-4"
                      style={{
                        borderRadius: `${config.borderRadius}px`,
                        backgroundColor: 'white'
                      }}
                    >
                      <h3 className="font-semibold mb-4" style={{ color: config.backgroundColor }}>
                        {config.headerText}
                      </h3>
                      <div className="space-y-3">
                        {config.showDate && (
                          <div>
                            <label className="block text-sm font-medium mb-1">Date</label>
                            <div className="border rounded px-3 py-2 bg-gray-50">Select date</div>
                          </div>
                        )}
                        {config.showTime && (
                          <div>
                            <label className="block text-sm font-medium mb-1">Time</label>
                            <div className="border rounded px-3 py-2 bg-gray-50">Select time</div>
                          </div>
                        )}
                        {config.showGuests && (
                          <div>
                            <label className="block text-sm font-medium mb-1">Guests</label>
                            <div className="border rounded px-3 py-2 bg-gray-50">2 guests</div>
                          </div>
                        )}
                        <button
                          className="w-full py-2 rounded text-white font-medium"
                          style={{
                            backgroundColor: config.backgroundColor,
                            borderRadius: `${config.borderRadius}px`
                          }}
                        >
                          Book Now
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Installation Code</CardTitle>
              <CardDescription>Copy this code to your website</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Textarea
                  value={widgetCode}
                  readOnly
                  className="font-mono text-sm"
                  rows={10}
                />
                <Button onClick={copyToClipboard} className="w-full">
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Widget Code
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Installation Instructions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <h4 className="font-medium mb-2">1. Copy the widget code</h4>
                <p className="text-muted-foreground">
                  Copy the generated code above and paste it into your website's HTML.
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">2. Place the code</h4>
                <p className="text-muted-foreground">
                  For best results, place the code just before the closing &lt;/body&gt; tag.
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">3. Customize (optional)</h4>
                <p className="text-muted-foreground">
                  You can override widget styles with custom CSS using the class names provided.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}