import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Sparkles, Check } from "lucide-react";

interface SeasonalThemeSelectorProps {
  restaurantId: number;
  tenantId: number;
  selectedTheme?: string;
  onThemeSelect: (themeId: string | null) => void;
  variant?: "card" | "inline";
}

export default function SeasonalThemeSelector({ 
  restaurantId, 
  tenantId, 
  selectedTheme,
  onThemeSelect,
  variant = "card"
}: SeasonalThemeSelectorProps) {
  const { data: themes = [], isLoading } = useQuery({
    queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/seasonal-themes`],
    queryFn: async () => {
      const response = await fetch(`/api/tenants/${tenantId}/restaurants/${restaurantId}/seasonal-themes`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch themes');
      }
      return response.json();
    }
  });

  const getSeasonIcon = (season: string) => {
    const icons = {
      spring: "🌸",
      summer: "☀️",
      autumn: "🍂",
      winter: "❄️"
    };
    return icons[season as keyof typeof icons] || "🍽️";
  };

  const getSeasonColor = (season: string) => {
    const colors = {
      spring: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      summer: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
      autumn: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
      winter: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
    };
    return colors[season as keyof typeof colors] || "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
  };

  if (isLoading || themes.length === 0) {
    return null;
  }

  if (variant === "inline") {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Choose Your Dining Experience
          </h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Select a seasonal theme to enhance your dining experience with specially curated atmosphere and menu recommendations.
        </p>
        
        <RadioGroup value={selectedTheme || ""} onValueChange={onThemeSelect}>
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="" id="no-theme" />
              <Label htmlFor="no-theme" className="cursor-pointer">
                No specific theme preference
              </Label>
            </div>
            
            {themes.map((theme: any) => (
              <div 
                key={theme.id} 
                className={`relative border rounded-lg p-4 cursor-pointer transition-all ${
                  selectedTheme === theme.id.toString() 
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' 
                    : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
                }`}
                onClick={() => onThemeSelect(theme.id.toString())}
              >
                <div className="flex items-center space-x-2 mb-2">
                  <RadioGroupItem value={theme.id.toString()} id={`theme-${theme.id}`} />
                  <div className="flex items-center gap-3 flex-1">
                    <span className="text-xl">{getSeasonIcon(theme.season)}</span>
                    <div className="flex-1">
                      <Label htmlFor={`theme-${theme.id}`} className="cursor-pointer font-medium">
                        {theme.name}
                      </Label>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {theme.description}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge className={getSeasonColor(theme.season)}>
                        {theme.season} {theme.year}
                      </Badge>
                      {theme.isActive && (
                        <Badge variant="outline" className="text-xs">
                          Currently Featured
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                
                {selectedTheme === theme.id.toString() && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                      "{theme.marketingCopy}"
                    </p>
                    
                    {theme.moodKeywords && theme.moodKeywords.length > 0 && (
                      <div className="mt-2">
                        <div className="flex flex-wrap gap-1">
                          {theme.moodKeywords.slice(0, 4).map((keyword: string, index: number) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {keyword}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </RadioGroup>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-600" />
          Seasonal Dining Experience
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Enhance your dining experience by selecting a seasonal theme that matches your mood and preferences.
        </p>
        
        <div className="grid gap-3">
          <Button
            variant={!selectedTheme ? "default" : "outline"}
            className="justify-start h-auto p-3"
            onClick={() => onThemeSelect(null)}
          >
            <div className="text-left">
              <div className="font-medium">Standard Experience</div>
              <div className="text-xs text-gray-500">No specific seasonal theme</div>
            </div>
            {!selectedTheme && <Check className="h-4 w-4 ml-auto" />}
          </Button>
          
          {themes.map((theme: any) => (
            <Button
              key={theme.id}
              variant={selectedTheme === theme.id.toString() ? "default" : "outline"}
              className="justify-start h-auto p-3"
              onClick={() => onThemeSelect(theme.id.toString())}
              style={{
                borderColor: selectedTheme === theme.id.toString() ? theme.color : undefined,
                backgroundColor: selectedTheme === theme.id.toString() ? `${theme.color}15` : undefined
              }}
            >
              <div className="flex items-center gap-3 w-full">
                <span className="text-lg">{getSeasonIcon(theme.season)}</span>
                <div className="text-left flex-1">
                  <div className="font-medium">{theme.name}</div>
                  <div className="text-xs text-gray-500">{theme.description}</div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge className={getSeasonColor(theme.season)} variant="secondary">
                    {theme.season}
                  </Badge>
                  {theme.isActive && (
                    <Badge variant="outline" className="text-xs">
                      Featured
                    </Badge>
                  )}
                </div>
                {selectedTheme === theme.id.toString() && <Check className="h-4 w-4" />}
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}