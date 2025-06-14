import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Sparkles, Trash2, Play, Calendar, Palette, ChefHat, Lightbulb } from "lucide-react";

interface SeasonalTheme {
  id: number;
  name: string;
  description: string;
  season: string;
  year: number;
  color: string;
  isActive: boolean;
  aiGenerated: boolean;
  suggestedMenuItems: string[];
  marketingCopy: string;
  targetIngredients: string[];
  moodKeywords: string[];
  createdAt: string;
}

interface SeasonalMenuThemesProps {
  restaurantId: number;
  tenantId: number;
}

export default function SeasonalMenuThemes({ restaurantId, tenantId }: SeasonalMenuThemesProps) {
  const [selectedSeason, setSelectedSeason] = useState<string>("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  const generateThemeMutation = useMutation({
    mutationFn: async ({ season, customPrompt }: { season: string; customPrompt: string }) => {
      const response = await apiRequest('POST', `/api/tenants/${tenantId}/restaurants/${restaurantId}/seasonal-themes/generate`, { season, customPrompt });
      if (!response.ok) {
        throw new Error(`Failed to generate theme: ${response.statusText}`);
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Theme Generated",
        description: "Your seasonal menu theme has been created successfully!"
      });
      queryClient.invalidateQueries({ queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/seasonal-themes`] });
      setShowGenerator(false);
      setSelectedSeason("");
      setCustomPrompt("");
    },
    onError: (error: any) => {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate seasonal theme",
        variant: "destructive"
      });
    }
  });

  const activateThemeMutation = useMutation({
    mutationFn: async (themeId: number) => {
      const response = await apiRequest('PUT', `/api/tenants/${tenantId}/restaurants/${restaurantId}/seasonal-themes/${themeId}/activate`);
      if (!response.ok) {
        throw new Error(`Failed to activate theme: ${response.statusText}`);
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Theme Activated",
        description: "The seasonal theme is now active for your restaurant"
      });
      queryClient.invalidateQueries({ queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/seasonal-themes`] });
    }
  });

  const deleteThemeMutation = useMutation({
    mutationFn: async (themeId: number) => {
      const response = await apiRequest('DELETE', `/api/tenants/${tenantId}/restaurants/${restaurantId}/seasonal-themes/${themeId}`);
      if (!response.ok) {
        throw new Error(`Failed to delete theme: ${response.statusText}`);
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Theme Deleted",
        description: "The seasonal theme has been removed"
      });
      queryClient.invalidateQueries({ queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/seasonal-themes`] });
    }
  });

  const handleGenerateTheme = async () => {
    if (!selectedSeason) return;
    
    setIsGenerating(true);
    try {
      await generateThemeMutation.mutateAsync({
        season: selectedSeason,
        customPrompt: customPrompt.trim()
      });
    } finally {
      setIsGenerating(false);
    }
  };

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

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-purple-600" />
            AI Seasonal Menu Themes
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Generate creative seasonal themes powered by AI to enhance your menu
          </p>
        </div>
        
        <Dialog open={showGenerator} onOpenChange={setShowGenerator}>
          <DialogTrigger asChild>
            <Button className="bg-purple-600 hover:bg-purple-700 text-white">
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Theme
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ChefHat className="h-5 w-5 text-purple-600" />
                Generate Seasonal Theme
              </DialogTitle>
              <DialogDescription>
                Create an AI-powered seasonal menu theme based on your preferences
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Season
                </label>
                <Select value={selectedSeason} onValueChange={setSelectedSeason}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a season" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="spring">🌸 Spring</SelectItem>
                    <SelectItem value="summer">☀️ Summer</SelectItem>
                    <SelectItem value="autumn">🍂 Autumn</SelectItem>
                    <SelectItem value="winter">❄️ Winter</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Custom Instructions (Optional)
                </label>
                <Textarea
                  placeholder="e.g., Focus on Mediterranean flavors, include vegan options, emphasize local ingredients..."
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>

              <Button 
                onClick={handleGenerateTheme}
                disabled={!selectedSeason || isGenerating}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Theme
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {themes.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Lightbulb className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No Seasonal Themes Yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Generate your first AI-powered seasonal menu theme to get started
            </p>
            <Button onClick={() => setShowGenerator(true)} className="bg-purple-600 hover:bg-purple-700">
              <Sparkles className="h-4 w-4 mr-2" />
              Create Your First Theme
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {themes.map((theme: SeasonalTheme) => (
            <Card key={theme.id} className={`relative ${theme.isActive ? 'ring-2 ring-purple-500' : ''}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{getSeasonIcon(theme.season)}</span>
                    <div>
                      <CardTitle className="text-lg">{theme.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={getSeasonColor(theme.season)}>
                          {theme.season} {theme.year}
                        </Badge>
                        {theme.isActive && (
                          <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">
                            Active
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div 
                    className="w-4 h-4 rounded-full border border-gray-300 dark:border-gray-600"
                    style={{ backgroundColor: theme.color }}
                  />
                </div>
                <CardDescription className="mt-2">
                  {theme.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {theme.marketingCopy && (
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                    <p className="text-sm italic text-gray-700 dark:text-gray-300">
                      "{theme.marketingCopy}"
                    </p>
                  </div>
                )}

                {theme.moodKeywords && theme.moodKeywords.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                      MOOD
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {theme.moodKeywords.slice(0, 3).map((keyword, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {theme.targetIngredients && theme.targetIngredients.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                      KEY INGREDIENTS
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {theme.targetIngredients.slice(0, 4).map((ingredient, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {ingredient}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {theme.suggestedMenuItems && theme.suggestedMenuItems.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                      SUGGESTED ITEMS ({theme.suggestedMenuItems.length})
                    </p>
                    <div className="space-y-1 max-h-24 overflow-y-auto">
                      {theme.suggestedMenuItems.slice(0, 3).map((item, index) => (
                        <p key={index} className="text-xs text-gray-600 dark:text-gray-400">
                          • {item}
                        </p>
                      ))}
                      {theme.suggestedMenuItems.length > 3 && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          +{theme.suggestedMenuItems.length - 3} more items
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex gap-2">
                    {!theme.isActive && (
                      <Button
                        size="sm"
                        onClick={() => activateThemeMutation.mutate(theme.id)}
                        disabled={activateThemeMutation.isPending}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Play className="h-3 w-3 mr-1" />
                        Activate
                      </Button>
                    )}
                  </div>
                  
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteThemeMutation.mutate(theme.id)}
                    disabled={deleteThemeMutation.isPending}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}