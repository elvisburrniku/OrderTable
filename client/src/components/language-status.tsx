import { useLanguage } from "@/contexts/language-context";
import { Globe, MapPin, Check } from "lucide-react";

export function LanguageStatus() {
  const { language, isLoading } = useLanguage();

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

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
      <div className="flex items-center gap-2 text-green-700">
        <Check className="h-4 w-4" />
        <MapPin className="h-4 w-4" />
        <span className="text-sm">Language automatically set based on your location</span>
      </div>
    </div>
  );
}