import { Globe } from "lucide-react";

export function LanguageLoading() {
  return (
    <div className="fixed top-0 left-0 right-0 bg-blue-50 border-b border-blue-200 z-50">
      <div className="max-w-7xl mx-auto px-4 py-2">
        <div className="flex items-center justify-center gap-2 text-blue-700 text-sm">
          <Globe className="h-4 w-4 animate-spin" />
          <span>Detecting your location for language preferences...</span>
        </div>
      </div>
    </div>
  );
}