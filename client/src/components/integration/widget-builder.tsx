import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Copy, Eye, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import { useTenant } from '@/lib/tenant';

interface WidgetConfig {
  type: 'floating-button' | 'inline-card' | 'banner' | 'sidebar';
  theme: 'modern' | 'minimal' | 'elegant' | 'vibrant' | 'dark';
  size: 'compact' | 'standard' | 'large';
  primaryColor: string;
  accentColor: string;
  cornerRadius: 'none' | 'small' | 'medium' | 'large' | 'full';
  shadow: 'none' | 'subtle' | 'medium' | 'strong';
  buttonText: string;
  headerText: string;
  description: string;
  placement: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'center';
  animation: 'none' | 'fade' | 'slide-up' | 'slide-right' | 'scale' | 'bounce';
  showBranding: boolean;
  customCSS: string;
}

export function WidgetBuilder() {
  const { toast } = useToast();
  const { user, restaurant } = useAuth();
  const { tenant } = useTenant();
  const [config, setConfig] = useState<WidgetConfig>({
    type: 'floating-button',
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

  // Helper functions for styling
  const getThemeStyles = (theme: string, primaryColor: string) => {
    const themes = {
      modern: {
        background: `linear-gradient(135deg, ${primaryColor}dd, ${primaryColor}bb)`,
        cardBackground: 'rgba(255, 255, 255, 0.95)',
        color: '#ffffff',
        border: '1px solid rgba(255, 255, 255, 0.2)'
      },
      minimal: {
        background: '#ffffff',
        cardBackground: '#ffffff',
        color: primaryColor,
        border: `2px solid ${primaryColor}`
      },
      elegant: {
        background: `linear-gradient(135deg, #1a1a1a, #2a2a2a)`,
        cardBackground: 'linear-gradient(135deg, #f8f9fa, #ffffff)',
        color: '#ffffff',
        border: '1px solid #333'
      },
      vibrant: {
        background: `linear-gradient(135deg, ${primaryColor}, #ff6b6b, #4ecdc4)`,
        cardBackground: 'linear-gradient(135deg, #fff5f5, #ffffff)',
        color: '#ffffff',
        border: 'none'
      },
      dark: {
        background: 'linear-gradient(135deg, #1a1a1a, #2d3748)',
        cardBackground: 'linear-gradient(135deg, #2d3748, #4a5568)',
        color: '#ffffff',
        border: '1px solid #4a5568'
      }
    };
    return themes[theme] || themes.modern;
  };

  const getCornerRadius = (radius: string) => {
    const radiusMap = {
      none: '0px',
      small: '4px',
      medium: '8px',
      large: '16px',
      full: '9999px'
    };
    return radiusMap[radius] || '8px';
  };

  const getSizePadding = (size: string) => {
    const sizeMap = {
      compact: '8px 16px',
      standard: '12px 24px',
      large: '16px 32px'
    };
    return sizeMap[size] || '12px 24px';
  };

  const getSizeFontSize = (size: string) => {
    const sizeMap = {
      compact: '14px',
      standard: '16px',
      large: '18px'
    };
    return sizeMap[size] || '16px';
  };

  const getShadow = (shadow: string) => {
    const shadowMap = {
      none: 'none',
      subtle: '0 1px 3px rgba(0,0,0,0.1)',
      medium: '0 4px 12px rgba(0,0,0,0.15)',
      strong: '0 10px 25px rgba(0,0,0,0.25)'
    };
    return shadowMap[shadow] || '0 4px 12px rgba(0,0,0,0.15)';
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
                    <SelectItem value="floating-button">🎯 Floating Button</SelectItem>
                    <SelectItem value="inline-card">📋 Inline Card</SelectItem>
                    <SelectItem value="banner">📢 Banner</SelectItem>
                    <SelectItem value="sidebar">📌 Sidebar</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="theme">Theme</Label>
                <Select value={config.theme} onValueChange={(value: any) => updateConfig('theme', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="modern">✨ Modern</SelectItem>
                    <SelectItem value="minimal">⚪ Minimal</SelectItem>
                    <SelectItem value="elegant">💎 Elegant</SelectItem>
                    <SelectItem value="vibrant">🌈 Vibrant</SelectItem>
                    <SelectItem value="dark">🌙 Dark Mode</SelectItem>
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
                    <SelectItem value="compact">📦 Compact</SelectItem>
                    <SelectItem value="standard">📐 Standard</SelectItem>
                    <SelectItem value="large">📏 Large</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primary-color">Primary Color</Label>
                  <Input
                    id="primary-color"
                    type="color"
                    value={config.primaryColor}
                    onChange={(e) => updateConfig('primaryColor', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accent-color">Accent Color</Label>
                  <Input
                    id="accent-color"
                    type="color"
                    value={config.accentColor}
                    onChange={(e) => updateConfig('accentColor', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="corner-radius">Corner Radius</Label>
                <Select value={config.cornerRadius} onValueChange={(value: any) => updateConfig('cornerRadius', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">⬜ None</SelectItem>
                    <SelectItem value="small">▢ Small</SelectItem>
                    <SelectItem value="medium">◻️ Medium</SelectItem>
                    <SelectItem value="large">⬛ Large</SelectItem>
                    <SelectItem value="full">⭕ Full</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="shadow">Shadow</Label>
                <Select value={config.shadow} onValueChange={(value: any) => updateConfig('shadow', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="subtle">Subtle</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="strong">Strong</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {config.type === 'floating-button' && (
                <div className="space-y-2">
                  <Label htmlFor="placement">Placement</Label>
                  <Select value={config.placement} onValueChange={(value: any) => updateConfig('placement', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bottom-right">↘️ Bottom Right</SelectItem>
                      <SelectItem value="bottom-left">↙️ Bottom Left</SelectItem>
                      <SelectItem value="top-right">↗️ Top Right</SelectItem>
                      <SelectItem value="top-left">↖️ Top Left</SelectItem>
                      <SelectItem value="center">🎯 Center</SelectItem>
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
                    <SelectItem value="none">⚪ None</SelectItem>
                    <SelectItem value="fade">🌟 Fade</SelectItem>
                    <SelectItem value="slide-up">⬆️ Slide Up</SelectItem>
                    <SelectItem value="slide-right">➡️ Slide Right</SelectItem>
                    <SelectItem value="scale">🔍 Scale</SelectItem>
                    <SelectItem value="bounce">🏀 Bounce</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Content & Branding</CardTitle>
              <CardDescription>Customize text and branding options</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={config.description}
                  onChange={(e) => updateConfig('description', e.target.value)}
                  placeholder="Brief description shown in the widget"
                  rows={2}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="show-branding">Show Branding</Label>
                  <p className="text-sm text-muted-foreground">Display "Powered by" text</p>
                </div>
                <Switch
                  id="show-branding"
                  checked={config.showBranding}
                  onCheckedChange={(checked) => updateConfig('showBranding', checked)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="custom-css">Custom CSS</Label>
                <Textarea
                  id="custom-css"
                  value={config.customCSS}
                  onChange={(e) => updateConfig('customCSS', e.target.value)}
                  placeholder="Add custom CSS styles"
                  rows={3}
                  className="font-mono text-sm"
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

                {/* Modern Widget Previews */}
                {config.type === 'floating-button' && (
                  <div 
                    className={`fixed ${
                      config.placement.includes('bottom') ? 'bottom-4' : 'top-4'
                    } ${
                      config.placement.includes('right') ? 'right-4' : 'left-4'
                    } ${config.placement === 'center' ? 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2' : ''}`}
                    style={{
                      position: 'absolute',
                      background: getThemeStyles(config.theme, config.primaryColor).background,
                      color: getThemeStyles(config.theme, config.primaryColor).color,
                      borderRadius: getCornerRadius(config.cornerRadius),
                      padding: getSizePadding(config.size),
                      fontSize: getSizeFontSize(config.size),
                      boxShadow: getShadow(config.shadow),
                      cursor: 'pointer',
                      border: getThemeStyles(config.theme, config.primaryColor).border,
                      backdropFilter: config.theme === 'modern' ? 'blur(10px)' : 'none'
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span>🍽️</span>
                      <span className="font-semibold">{config.buttonText}</span>
                    </div>
                  </div>
                )}

                {config.type === 'inline-card' && (
                  <div className="p-4">
                    <div 
                      className="bg-white rounded-lg shadow-lg border overflow-hidden"
                      style={{
                        borderRadius: getCornerRadius(config.cornerRadius),
                        boxShadow: getShadow(config.shadow),
                        background: getThemeStyles(config.theme, config.primaryColor).cardBackground
                      }}
                    >
                      <div className="p-6">
                        <div className="text-center mb-6">
                          <h3 className="text-xl font-bold mb-2" style={{ color: config.primaryColor }}>
                            {config.headerText}
                          </h3>
                          <p className="text-gray-600 text-sm">{config.description}</p>
                        </div>

                        <div className="flex flex-wrap gap-3 items-center justify-center mb-4">
                          <div className="flex items-center gap-2 bg-gray-50 px-4 py-3 rounded-lg border">
                            <span>📅</span>
                            <span className="text-sm font-medium">Jun 25</span>
                          </div>
                          <div className="flex items-center gap-2 bg-gray-50 px-4 py-3 rounded-lg border">
                            <span>🕐</span>
                            <span className="text-sm font-medium">7:00 PM</span>
                          </div>
                          <div className="flex items-center gap-2 bg-gray-50 px-4 py-3 rounded-lg border">
                            <span>👥</span>
                            <span className="text-sm font-medium">2 guests</span>
                          </div>
                        </div>

                        <button
                          className="w-full py-3 rounded-lg text-white font-semibold transition-all hover:scale-105"
                          style={{
                            background: `linear-gradient(135deg, ${config.primaryColor}, ${config.accentColor})`,
                            borderRadius: getCornerRadius(config.cornerRadius)
                          }}
                        >
                          {config.buttonText}
                        </button>

                        {config.showBranding && (
                          <div className="text-center mt-4 pt-4 border-t">
                            <p className="text-xs text-gray-400">Powered by BookingSystem</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {config.type === 'banner' && (
                  <div 
                    className="w-full p-4"
                    style={{
                      background: `linear-gradient(135deg, ${config.primaryColor}20, ${config.accentColor}20)`,
                      borderRadius: getCornerRadius(config.cornerRadius)
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-lg" style={{ color: config.primaryColor }}>
                          {config.headerText}
                        </h4>
                        <p className="text-sm text-gray-600">{config.description}</p>
                      </div>
                      <button
                        className="px-6 py-2 rounded-lg text-white font-semibold"
                        style={{
                          background: config.primaryColor,
                          borderRadius: getCornerRadius(config.cornerRadius)
                        }}
                      >
                        {config.buttonText}
                      </button>
                    </div>
                  </div>
                )}

                {config.type === 'sidebar' && (
                  <div 
                    className="absolute right-0 top-0 h-full w-64 bg-white shadow-lg border-l"
                    style={{
                      background: getThemeStyles(config.theme, config.primaryColor).cardBackground,
                      boxShadow: getShadow(config.shadow)
                    }}
                  >
                    <div className="p-6">
                      <h3 className="text-lg font-bold mb-2" style={{ color: config.primaryColor }}>
                        {config.headerText}
                      </h3>
                      <p className="text-sm text-gray-600 mb-6">{config.description}</p>
                      
                      <div className="space-y-3 mb-6">
                        <div className="border rounded-lg p-3">
                          <span className="text-sm font-medium">📅 Select Date</span>
                        </div>
                        <div className="border rounded-lg p-3">
                          <span className="text-sm font-medium">🕐 Choose Time</span>
                        </div>
                        <div className="border rounded-lg p-3">
                          <span className="text-sm font-medium">👥 Party Size</span>
                        </div>
                      </div>

                      <button
                        className="w-full py-3 rounded-lg text-white font-semibold"
                        style={{
                          background: config.primaryColor,
                          borderRadius: getCornerRadius(config.cornerRadius)
                        }}
                      >
                        {config.buttonText}
                      </button>
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
                <div className="flex gap-2">
                  <Button onClick={copyToClipboard} className="flex-1">
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Code
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => window.open(`/${tenant?.id}/widget-demo`, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Live Demo
                  </Button>
                </div>
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