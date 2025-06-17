import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Cookie, Settings, Shield, BarChart3, Target } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';

interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
}

export default function CookieSettingsButton() {
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>(() => {
    const saved = localStorage.getItem('cookieConsent');
    return saved ? JSON.parse(saved) : { necessary: true, analytics: false, marketing: false };
  });
  
  const { t } = useLanguage();

  // Fallback text for when translations aren't loaded
  const fallbackText = {
    cookieSettings: "Cookie Settings",
    description: "Manage your cookie preferences. You can update these settings at any time.",
    necessary: "Necessary Cookies",
    necessaryDesc: "These cookies are essential for the website to function properly. They cannot be disabled.",
    analytics: "Analytics Cookies", 
    analyticsDesc: "These cookies help us understand how visitors interact with our website by collecting and reporting information anonymously.",
    marketing: "Marketing Cookies",
    marketingDesc: "These cookies are used to track visitors across websites to display relevant advertisements.",
    savePreferences: "Save Preferences",
    privacyPolicy: "Privacy Policy"
  };

  const cookieText = (t?.cookieConsent) || fallbackText;

  const savePreferences = (prefs: CookiePreferences) => {
    localStorage.setItem('cookieConsent', JSON.stringify(prefs));
    setPreferences(prefs);
    setShowSettings(false);
  };

  const handleSave = () => {
    savePreferences(preferences);
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowSettings(true)}
        className="fixed bottom-4 right-4 z-40 bg-white dark:bg-gray-800 shadow-lg border hover:shadow-xl transition-all duration-200"
      >
        <Cookie className="w-4 h-4 mr-2" />
        {cookieText.cookieSettings}
      </Button>

      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              {cookieText.cookieSettings}
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
                onClick={() => setShowSettings(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
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