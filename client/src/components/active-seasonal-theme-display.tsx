import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Leaf } from "lucide-react";

interface ActiveSeasonalThemeDisplayProps {
  restaurantId: number;
  tenantId: number;
  variant?: "full" | "compact" | "banner";
}

export default function ActiveSeasonalThemeDisplay({ 
  restaurantId, 
  tenantId, 
  variant = "full" 
}: ActiveSeasonalThemeDisplayProps) {
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

  const activeTheme = themes.find((theme: any) => theme.isActive);

  if (isLoading || !activeTheme) {
    return null;
  }

  const getSeasonIcon = (season: string) => {
    const icons = {
      spring: "🌸",
      summer: "☀️",
      autumn: "🍂", 
      winter: "❄️"
    };
    return icons[season as keyof typeof icons] || "🍽️";
  };

  if (variant === "banner") {
    return (
      <div 
        className="relative overflow-hidden rounded-lg p-6 text-white mb-6"
        style={{ backgroundColor: activeTheme.color }}
      >
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">{getSeasonIcon(activeTheme.season)}</span>
            <div>
              <h2 className="text-2xl font-bold">{activeTheme.name}</h2>
              <p className="text-white/90">{activeTheme.description}</p>
            </div>
          </div>
          <p className="text-white/95 italic">"{activeTheme.marketingCopy}"</p>
        </div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-12 -translate-x-12"></div>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <Card className="border-l-4" style={{ borderLeftColor: activeTheme.color }}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <span className="text-xl">{getSeasonIcon(activeTheme.season)}</span>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-white">{activeTheme.name}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{activeTheme.description}</p>
            </div>
            <Badge variant="secondary" className="ml-auto">
              {activeTheme.season} {activeTheme.year}
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="relative overflow-hidden">
      <div 
        className="absolute top-0 left-0 w-full h-2"
        style={{ backgroundColor: activeTheme.color }}
      ></div>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{getSeasonIcon(activeTheme.season)}</span>
            <div>
              <CardTitle className="text-xl text-gray-900 dark:text-white">
                {activeTheme.name}
              </CardTitle>
              <CardDescription className="mt-1">
                {activeTheme.description}
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
              <Sparkles className="h-3 w-3 mr-1" />
              Active Theme
            </Badge>
            <Badge variant="outline">
              {activeTheme.season} {activeTheme.year}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
          <p className="text-gray-700 dark:text-gray-300 italic">
            "{activeTheme.marketingCopy}"
          </p>
        </div>

        {activeTheme.moodKeywords && activeTheme.moodKeywords.length > 0 && (
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
              SEASONAL MOOD
            </p>
            <div className="flex flex-wrap gap-2">
              {activeTheme.moodKeywords.slice(0, 6).map((keyword: string, index: number) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {keyword}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {activeTheme.targetIngredients && activeTheme.targetIngredients.length > 0 && (
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
              FEATURED INGREDIENTS
            </p>
            <div className="flex flex-wrap gap-2">
              {activeTheme.targetIngredients.slice(0, 8).map((ingredient: string, index: number) => (
                <Badge key={index} variant="outline" className="text-xs">
                  <Leaf className="h-3 w-3 mr-1" />
                  {ingredient}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {activeTheme.suggestedMenuItems && activeTheme.suggestedMenuItems.length > 0 && (
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
              SEASONAL HIGHLIGHTS ({activeTheme.suggestedMenuItems.length} items)
            </p>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {activeTheme.suggestedMenuItems.slice(0, 4).map((item: string, index: number) => (
                <p key={index} className="text-sm text-gray-600 dark:text-gray-400">
                  • {item}
                </p>
              ))}
              {activeTheme.suggestedMenuItems.length > 4 && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  +{activeTheme.suggestedMenuItems.length - 4} more seasonal items
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}