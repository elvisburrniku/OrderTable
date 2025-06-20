import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/language-context';
import { Cookie, Shield, BarChart3, Target, Settings, ExternalLink } from 'lucide-react';

interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
}

export default function CookieConsent() {
  const { t } = useLanguage();
  const [isVisible, setIsVisible] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true, // Always true, cannot be disabled
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    // Check if user has already made a choice
    const cookieConsent = localStorage.getItem('cookieConsent');
    const showDebug = localStorage.getItem('cookieDebug');
    
    if (!cookieConsent || showDebug === 'true') {
      // Show banner after a short delay
      const timer = setTimeout(() => setIsVisible(true), 1500);
      return () => clearTimeout(timer);
    }
    
    // Listen for force show banner events
    const handleCookieReset = () => {
      console.log('Cookie reset event received');
      setIsVisible(true);
      console.log('Banner visibility set to true');
    };
    
    window.addEventListener('cookieReset', handleCookieReset);
    return () => window.removeEventListener('cookieReset', handleCookieReset);
  }, []);

  const handleAcceptAll = () => {
    const allPreferences = {
      necessary: true,
      analytics: true,
      marketing: true,
    };
    savePreferences(allPreferences);
  };

  const handleRejectAll = () => {
    const minimalPreferences = {
      necessary: true,
      analytics: false,
      marketing: false,
    };
    savePreferences(minimalPreferences);
  };

  const handleSaveCustom = () => {
    savePreferences(preferences);
    setShowCustomize(false);
  };

  const savePreferences = (prefs: CookiePreferences) => {
    localStorage.setItem('cookieConsent', JSON.stringify({
      preferences: prefs,
      timestamp: new Date().toISOString(),
      version: '1.0'
    }));
    
    // Clear debug flag after saving preferences
    localStorage.removeItem('cookieDebug');
    
    // Set cookie tracking flags
    if (typeof window !== 'undefined') {
      (window as any).gtag = (window as any).gtag || function() {
        ((window as any).dataLayer = (window as any).dataLayer || []).push(arguments);
      };
      
      // Google Analytics consent
      (window as any).gtag('consent', 'update', {
        analytics_storage: prefs.analytics ? 'granted' : 'denied',
        ad_storage: prefs.marketing ? 'granted' : 'denied',
      });
    }
    
    setIsVisible(false);
  };

  // Don't render if banner isn't visible
  if (!isVisible) return null;
  
  // Use fallback English text if translations aren't loaded yet
  const fallbackText = {
    title: "We Value Your Privacy",
    description: "We use cookies to enhance your experience, analyze site traffic, and personalize content. You can customize your preferences or accept all cookies.",
    acceptAll: "Accept All Cookies",
    rejectAll: "Reject All",
    customize: "Customize Settings",
    necessary: "Necessary Cookies",
    analytics: "Analytics Cookies", 
    marketing: "Marketing Cookies",
    necessaryDesc: "Essential cookies required for basic website functionality and security.",
    analyticsDesc: "Help us understand how visitors interact with our website to improve performance.",
    marketingDesc: "Used to deliver personalized advertisements and track marketing campaign effectiveness.",
    savePreferences: "Save My Preferences",
    privacyPolicy: "Privacy Policy",
    learnMore: "Learn More"
  };
  
  const cookieText = (t?.cookieConsent) || fallbackText;

  return (
    <>
      {/* Cookie Banner */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-t border-gray-200 shadow-2xl">
        <div className="max-w-7xl mx-auto p-4 sm:p-6">
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
            <div className="flex items-start gap-3 flex-1">
              <div className="bg-blue-100 p-2 rounded-lg flex-shrink-0">
                <Cookie className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">
                  {cookieText.title}
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {cookieText.description}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <button 
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1"
                    onClick={() => setShowCustomize(true)}
                  >
                    {cookieText.learnMore}
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              <Button
                variant="outline"
                onClick={handleRejectAll}
                className="order-2 sm:order-1"
              >
                {cookieText.rejectAll}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowCustomize(true)}
                className="order-3 sm:order-2"
              >
                <Settings className="w-4 h-4 mr-2" />
                {cookieText.customize}
              </Button>
              <Button
                onClick={handleAcceptAll}
                className="order-1 sm:order-3 bg-blue-600 hover:bg-blue-700"
              >
                {cookieText.acceptAll}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Customization Dialog */}
      <Dialog open={showCustomize} onOpenChange={setShowCustomize}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              {cookieText.customize}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="text-sm text-gray-600">
              {cookieText.description}
            </div>

            {/* Necessary Cookies */}
            <Card className="border-green-200 bg-green-50/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-green-600" />
                    <CardTitle className="text-base">{cookieText.necessary}</CardTitle>
                    <Badge variant="secondary" className="bg-green-100 text-green-700">
                      Required
                    </Badge>
                  </div>
                  <Switch checked={true} disabled />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-gray-600">
                  {cookieText.necessaryDesc}
                </p>
              </CardContent>
            </Card>

            {/* Analytics Cookies */}
            <Card className="border-blue-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-blue-600" />
                    <CardTitle className="text-base">{cookieText.analytics}</CardTitle>
                  </div>
                  <Switch 
                    checked={preferences.analytics}
                    onCheckedChange={(checked) => 
                      setPreferences(prev => ({ ...prev, analytics: checked }))
                    }
                  />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-gray-600">
                  {cookieText.analyticsDesc}
                </p>
              </CardContent>
            </Card>

            {/* Marketing Cookies */}
            <Card className="border-purple-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-purple-600" />
                    <CardTitle className="text-base">{cookieText.marketing}</CardTitle>
                  </div>
                  <Switch 
                    checked={preferences.marketing}
                    onCheckedChange={(checked) => 
                      setPreferences(prev => ({ ...prev, marketing: checked }))
                    }
                  />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-gray-600">
                  {cookieText.marketingDesc}
                </p>
              </CardContent>
            </Card>

            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setShowCustomize(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveCustom}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {cookieText.savePreferences}
              </Button>
            </div>

            <div className="text-xs text-gray-500 text-center">
              <a 
                href="/privacy" 
                className="text-blue-600 hover:text-blue-700"
                target="_blank"
                rel="noopener noreferrer"
              >
                {cookieText.privacyPolicy}
              </a>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}