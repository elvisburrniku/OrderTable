
import { useLanguage } from "@/contexts/language-context";
import { Globe, MapPin, Check, Monitor, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";

interface LocationInfo {
  country?: string;
  region?: string;
  city?: string;
  detectionMethod?: 'location' | 'browser' | 'stored' | 'default';
}

export function LanguageStatus() {
  const { language, isLoading } = useLanguage();
  const [locationInfo, setLocationInfo] = useState<LocationInfo>({});
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Try to get stored detection method
    const stored = localStorage.getItem('readytable-language-detection');
    if (stored) {
      try {
        const info = JSON.parse(stored);
        setLocationInfo(info);
      } catch (error) {
        console.log('Failed to parse stored language detection info');
      }
    }
  }, [language]);

  if (isLoading) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
        <div className="flex items-center gap-2 text-blue-700">
          <Globe className="h-4 w-4 animate-spin" />
          <span className="text-sm">Detecting your location for language preferences...</span>
        </div>
      </div>
    );
  }

  const getDetectionIcon = () => {
    switch (locationInfo.detectionMethod) {
      case 'location':
        return <MapPin className="h-4 w-4" />;
      case 'browser':
        return <Monitor className="h-4 w-4" />;
      case 'stored':
        return <Check className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getDetectionMessage = () => {
    switch (locationInfo.detectionMethod) {
      case 'location':
        return `Language set based on your location${locationInfo.country ? ` (${locationInfo.country})` : ''}`;
      case 'browser':
        return 'Language set based on your browser preferences';
      case 'stored':
        return 'Using your previously selected language preference';
      default:
        return 'Using default language (English)';
    }
  };

  const getBgColor = () => {
    switch (locationInfo.detectionMethod) {
      case 'location':
      case 'stored':
        return 'bg-green-50 border-green-200 text-green-700';
      case 'browser':
        return 'bg-blue-50 border-blue-200 text-blue-700';
      default:
        return 'bg-yellow-50 border-yellow-200 text-yellow-700';
    }
  };

  return (
    <div className={`border rounded-lg p-3 mb-4 ${getBgColor()}`}>
      <div 
        className="flex items-center gap-2 cursor-pointer"
        onClick={() => setShowDetails(!showDetails)}
      >
        {getDetectionIcon()}
        <span className="text-sm">{getDetectionMessage()}</span>
        <Globe className="h-3 w-3 ml-auto" />
      </div>
      
      {showDetails && locationInfo.detectionMethod && (
        <div className="mt-2 pt-2 border-t border-current border-opacity-20">
          <div className="text-xs space-y-1">
            <div>Current language: <strong>{language.toUpperCase()}</strong></div>
            {locationInfo.country && (
              <div>Country: <strong>{locationInfo.country}</strong></div>
            )}
            {locationInfo.region && (
              <div>Region: <strong>{locationInfo.region}</strong></div>
            )}
            {locationInfo.city && (
              <div>City: <strong>{locationInfo.city}</strong></div>
            )}
            <div>Detection method: <strong>{locationInfo.detectionMethod}</strong></div>
          </div>
        </div>
      )}
    </div>
  );
}
