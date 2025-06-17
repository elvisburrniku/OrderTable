import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RotateCcw, Cookie } from 'lucide-react';

export default function CookieBannerReset() {
  const resetCookieConsent = () => {
    localStorage.removeItem('cookieConsent');
    localStorage.removeItem('cookieDebug');
    window.location.reload();
  };

  const forceShowBanner = () => {
    console.log('Force show banner clicked');
    localStorage.removeItem('cookieConsent');
    localStorage.setItem('cookieDebug', 'true');
    console.log('Local storage updated');
    // Force immediate display by dispatching a custom event
    window.dispatchEvent(new CustomEvent('cookieReset'));
    console.log('Custom event dispatched');
  };

  const checkCurrentStatus = () => {
    const consent = localStorage.getItem('cookieConsent');
    return consent ? JSON.parse(consent) : null;
  };

  const currentStatus = checkCurrentStatus();

  return (
    <Card className="max-w-md mx-auto mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cookie className="w-5 h-5" />
          Cookie Consent Status
        </CardTitle>
        <CardDescription>
          View current cookie preferences and reset to show banner again
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {currentStatus ? (
          <div className="text-sm space-y-2">
            <p className="font-medium">Current preferences:</p>
            <ul className="space-y-1 text-gray-600">
              <li>• Necessary: {currentStatus.necessary ? 'Accepted' : 'Rejected'}</li>
              <li>• Analytics: {currentStatus.analytics ? 'Accepted' : 'Rejected'}</li>
              <li>• Marketing: {currentStatus.marketing ? 'Accepted' : 'Rejected'}</li>
            </ul>
          </div>
        ) : (
          <p className="text-sm text-gray-600">No cookie preferences set yet</p>
        )}
        
        <div className="flex gap-2">
          <Button 
            onClick={resetCookieConsent}
            className="flex-1 flex items-center gap-2"
            variant="outline"
          >
            <RotateCcw className="w-4 h-4" />
            Reset & Reload
          </Button>
          <Button 
            onClick={forceShowBanner}
            className="flex-1 flex items-center gap-2"
            variant="default"
          >
            <Cookie className="w-4 h-4" />
            Force Show Banner
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}