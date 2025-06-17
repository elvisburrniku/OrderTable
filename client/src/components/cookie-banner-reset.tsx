import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RotateCcw, Cookie } from 'lucide-react';

export default function CookieBannerReset() {
  const resetCookieConsent = () => {
    localStorage.removeItem('cookieConsent');
    localStorage.setItem('cookieDebug', 'true');
    window.location.reload();
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
        
        <Button 
          onClick={resetCookieConsent}
          className="w-full flex items-center gap-2"
          variant="outline"
        >
          <RotateCcw className="w-4 h-4" />
          Reset & Show Cookie Banner
        </Button>
      </CardContent>
    </Card>
  );
}