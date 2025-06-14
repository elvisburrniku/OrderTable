import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface SeasonalThemeRequest {
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  year: number;
  restaurantName: string;
  existingMenuItems: Array<{
    name: string;
    description?: string;
    category: string;
    allergens?: string[];
    dietary?: string[];
  }>;
  customPrompt?: string;
}

interface SeasonalThemeResponse {
  name: string;
  description: string;
  color: string;
  marketingCopy: string;
  suggestedMenuItems: string[];
  targetIngredients: string[];
  moodKeywords: string[];
}

export class AISeasonalMenuService {
  async generateSeasonalTheme(request: SeasonalThemeRequest): Promise<SeasonalThemeResponse> {
    const { season, year, restaurantName, existingMenuItems, customPrompt } = request;

    // Force simulation mode until OpenAI quota is restored
    console.log('Using simulation mode for seasonal theme generation');
    return this.generateSimulatedTheme(request);

    // Check if OpenAI API is available
    if (!process.env.OPENAI_API_KEY) {
      console.log('OpenAI API key not available, using simulation mode');
      return this.generateSimulatedTheme(request);
    }

    // Build context about existing menu
    const menuContext = existingMenuItems.map(item => 
      `${item.name} (${item.category})${item.description ? `: ${item.description}` : ''}`
    ).join('\n');

    const dietaryInfo = this.extractDietaryInfo(existingMenuItems);

    const prompt = customPrompt || this.buildDefaultPrompt(season, year, restaurantName, menuContext, dietaryInfo);

    try {
      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a creative culinary consultant specializing in seasonal menu development. 
            Create engaging, authentic seasonal themes that incorporate seasonal ingredients and capture the mood of the season.
            Always respond with valid JSON in the exact format requested.`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.8,
        max_tokens: 1500
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      return this.validateAndFormatResponse(result, season);
    } catch (error) {
      console.error('Error generating seasonal theme:', error);
      // Fall back to simulation if API fails
      console.log('Falling back to simulation mode due to API error');
      return this.generateSimulatedTheme(request);
    }
  }

  private generateSimulatedTheme(request: SeasonalThemeRequest): SeasonalThemeResponse {
    const { season, year, restaurantName, customPrompt } = request;
    
    const seasonalThemes = {
      spring: {
        name: "Spring Awakening",
        description: "Fresh ingredients and vibrant flavors celebrating the renewal of spring",
        color: "#22C55E",
        marketingCopy: "Experience the fresh taste of spring with our garden-inspired menu featuring locally sourced vegetables, tender herbs, and light, energizing dishes that capture the essence of the season.",
        suggestedMenuItems: [
          "Asparagus & Pea Risotto: Creamy arborio rice with fresh spring vegetables",
          "Spring Herb Crusted Salmon: Fresh Atlantic salmon with garden herb crust",
          "Baby Spinach & Strawberry Salad: Mixed greens with seasonal berries",
          "Lemon Thyme Roasted Chicken: Free-range chicken with spring herbs",
          "Fresh Pea & Mint Soup: Smooth soup with garden peas and fresh mint",
          "Spring Vegetable Pasta: Seasonal vegetables with house-made pasta",
          "Artichoke & Goat Cheese Tart: Flaky pastry with spring vegetables",
          "Rhubarb & Strawberry Crumble: Seasonal fruit dessert with oat topping"
        ],
        targetIngredients: ["asparagus", "peas", "spring onions", "fresh herbs", "strawberries", "rhubarb", "artichokes", "baby spinach"],
        moodKeywords: ["fresh", "light", "vibrant", "energizing", "renewal", "garden-fresh"]
      },
      summer: {
        name: "Summer Harvest",
        description: "Bright, refreshing dishes that celebrate the abundance of summer",
        color: "#F59E0B",
        marketingCopy: "Embrace the warmth of summer with our vibrant menu featuring sun-ripened tomatoes, fresh herbs, and grilled specialties that bring the outdoor dining experience to your table.",
        suggestedMenuItems: [
          "Heirloom Tomato Caprese: Fresh mozzarella with garden tomatoes",
          "Grilled Peach & Arugula Salad: Stone fruit with peppery greens",
          "Summer Corn Chowder: Sweet corn soup with fresh herbs",
          "Zucchini Blossom Fritters: Delicate squash blossoms, lightly fried",
          "Watermelon & Feta Salad: Refreshing fruit and cheese combination",
          "Grilled Vegetable Medley: Seasonal vegetables with herb oil",
          "Berry Basil Lemonade Sorbet: Refreshing frozen dessert",
          "Gazpacho with Cucumber: Chilled soup perfect for hot days"
        ],
        targetIngredients: ["tomatoes", "corn", "zucchini", "berries", "stone fruits", "fresh basil", "cucumber", "bell peppers"],
        moodKeywords: ["bright", "refreshing", "sunny", "grilled", "outdoor", "abundant"]
      },
      autumn: {
        name: "Harvest Moon",
        description: "Comfort foods and warming spices that embrace the cozy spirit of fall",
        color: "#EA580C",
        marketingCopy: "Savor the rich, warming flavors of autumn with our hearty menu featuring seasonal squash, root vegetables, and comfort dishes that bring warmth to crisp fall evenings.",
        suggestedMenuItems: [
          "Butternut Squash Soup: Roasted squash with warming spices",
          "Apple Cider Braised Pork: Tender pork with seasonal fruit",
          "Roasted Root Vegetable Medley: Carrots, parsnips, and beets",
          "Pumpkin Risotto: Creamy rice with roasted pumpkin",
          "Wild Mushroom Tart: Savory pastry with forest mushrooms",
          "Maple Glazed Brussels Sprouts: Caramelized with maple syrup",
          "Cranberry Walnut Stuffed Chicken: Holiday-inspired main course",
          "Spiced Pear & Almond Tart: Seasonal fruit dessert with warming spices"
        ],
        targetIngredients: ["pumpkin", "squash", "apples", "root vegetables", "mushrooms", "cranberries", "warming spices", "maple syrup"],
        moodKeywords: ["cozy", "warming", "hearty", "comfort", "rustic", "harvest"]
      },
      winter: {
        name: "Winter Comfort",
        description: "Rich, indulgent dishes that provide warmth and comfort during the cold season",
        color: "#3B82F6",
        marketingCopy: "Find warmth and comfort in our winter menu featuring hearty stews, rich broths, and indulgent dishes that chase away the winter chill with every satisfying bite.",
        suggestedMenuItems: [
          "Beef & Barley Stew: Hearty stew with winter vegetables",
          "Citrus Glazed Duck: Rich duck with bright winter citrus",
          "Roasted Chestnut Soup: Creamy soup with toasted chestnuts",
          "Braised Short Ribs: Slow-cooked beef with red wine",
          "Winter Kale & White Bean Salad: Hearty greens with protein",
          "Pomegranate Glazed Lamb: Festive lamb with jewel-toned glaze",
          "Spiced Hot Chocolate Pot de Crème: Rich chocolate dessert",
          "Mulled Wine Poached Pears: Warm fruit dessert with spices"
        ],
        targetIngredients: ["citrus fruits", "chestnuts", "winter greens", "pomegranate", "root vegetables", "warming spices", "red wine", "chocolate"],
        moodKeywords: ["warm", "rich", "comforting", "indulgent", "hearty", "festive"]
      }
    };

    const themeData = seasonalThemes[season as keyof typeof seasonalThemes];
    
    // Customize based on custom prompt if provided
    if (customPrompt) {
      const customizations = this.applyCustomPrompt(themeData, customPrompt);
      return { ...themeData, ...customizations };
    }
    
    return themeData;
  }

  private applyCustomPrompt(baseTheme: SeasonalThemeResponse, customPrompt: string): Partial<SeasonalThemeResponse> {
    const customizations: Partial<SeasonalThemeResponse> = {};
    
    // Simple customization based on keywords in the prompt
    if (customPrompt.toLowerCase().includes('comfort')) {
      customizations.moodKeywords = [...(baseTheme.moodKeywords || []), 'comfort', 'cozy', 'warming'];
    }
    
    if (customPrompt.toLowerCase().includes('local')) {
      customizations.moodKeywords = [...(baseTheme.moodKeywords || []), 'local', 'artisanal', 'farm-to-table'];
    }
    
    if (customPrompt.toLowerCase().includes('spice')) {
      customizations.targetIngredients = [...(baseTheme.targetIngredients || []), 'warming spices', 'aromatic herbs'];
    }
    
    if (customPrompt.toLowerCase().includes('vegetarian') || customPrompt.toLowerCase().includes('vegan')) {
      customizations.moodKeywords = [...(baseTheme.moodKeywords || []), 'plant-based', 'sustainable'];
    }
    
    return customizations;
  }

  private buildDefaultPrompt(season: string, year: number, restaurantName: string, menuContext: string, dietaryInfo: any): string {
    const seasonalIngredients = this.getSeasonalIngredients(season);
    const seasonalMoods = this.getSeasonalMoods(season);

    return `Create a seasonal menu theme for ${season} ${year} for "${restaurantName}".

Current menu items:
${menuContext}

Dietary considerations from existing menu: ${dietaryInfo.summary}

Requirements:
1. Theme should incorporate seasonal ingredients: ${seasonalIngredients.join(', ')}
2. Capture the mood and feeling of ${season}: ${seasonalMoods.join(', ')}
3. Suggest 8-12 new menu items that complement existing offerings
4. Provide marketing copy that would appeal to customers
5. Choose a color that represents the theme (hex format)

Respond with JSON in this exact format:
{
  "name": "Theme name (2-4 words)",
  "description": "Brief theme description (1-2 sentences)",
  "color": "#hexcolor",
  "marketingCopy": "Compelling marketing description (2-3 sentences)",
  "suggestedMenuItems": ["Item 1: Description", "Item 2: Description", ...],
  "targetIngredients": ["ingredient1", "ingredient2", ...],
  "moodKeywords": ["mood1", "mood2", ...]
}`;
  }

  private extractDietaryInfo(menuItems: any[]) {
    const allDietary = menuItems.flatMap(item => item.dietary || []);
    const allAllergens = menuItems.flatMap(item => item.allergens || []);
    
    const dietaryCount = allDietary.reduce((acc, diet) => {
      acc[diet] = (acc[diet] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const allergenCount = allAllergens.reduce((acc, allergen) => {
      acc[allergen] = (acc[allergen] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const commonDietary = Object.entries(dietaryCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([diet]) => diet);

    const commonAllergens = Object.entries(allergenCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([allergen]) => allergen);

    return {
      commonDietary,
      commonAllergens,
      summary: `Common dietary options: ${commonDietary.join(', ') || 'none specified'}. Common allergens: ${commonAllergens.join(', ') || 'none specified'}`
    };
  }

  private getSeasonalIngredients(season: string): string[] {
    const ingredients = {
      spring: ['asparagus', 'artichokes', 'peas', 'radishes', 'spring onions', 'fresh herbs', 'strawberries', 'rhubarb'],
      summer: ['tomatoes', 'zucchini', 'corn', 'berries', 'stone fruits', 'fresh basil', 'cucumber', 'bell peppers'],
      autumn: ['pumpkin', 'squash', 'apples', 'pears', 'root vegetables', 'mushrooms', 'cranberries', 'sage'],
      winter: ['citrus fruits', 'cabbage', 'potatoes', 'hearty greens', 'pomegranate', 'chestnuts', 'winter herbs', 'warming spices']
    };
    return ingredients[season as keyof typeof ingredients] || [];
  }

  private getSeasonalMoods(season: string): string[] {
    const moods = {
      spring: ['fresh', 'light', 'renewed', 'vibrant', 'clean', 'energizing'],
      summer: ['bright', 'refreshing', 'outdoor', 'grilled', 'tropical', 'cooling'],
      autumn: ['cozy', 'warming', 'harvest', 'rustic', 'comfort', 'earthy'],
      winter: ['hearty', 'warming', 'rich', 'comforting', 'festive', 'indulgent']
    };
    return moods[season as keyof typeof moods] || [];
  }

  private validateAndFormatResponse(result: any, season: string): SeasonalThemeResponse {
    // Ensure all required fields are present with defaults
    return {
      name: result.name || `${season.charAt(0).toUpperCase() + season.slice(1)} Special`,
      description: result.description || `A seasonal theme celebrating ${season}`,
      color: this.validateHexColor(result.color) || this.getDefaultSeasonColor(season),
      marketingCopy: result.marketingCopy || `Experience the flavors of ${season} with our seasonal selections.`,
      suggestedMenuItems: Array.isArray(result.suggestedMenuItems) ? result.suggestedMenuItems : [],
      targetIngredients: Array.isArray(result.targetIngredients) ? result.targetIngredients : this.getSeasonalIngredients(season),
      moodKeywords: Array.isArray(result.moodKeywords) ? result.moodKeywords : this.getSeasonalMoods(season)
    };
  }

  private validateHexColor(color: string): string | null {
    if (typeof color === 'string' && /^#[0-9A-F]{6}$/i.test(color)) {
      return color;
    }
    return null;
  }

  private getDefaultSeasonColor(season: string): string {
    const colors = {
      spring: '#22C55E', // green
      summer: '#F59E0B', // amber
      autumn: '#EA580C', // orange
      winter: '#3B82F6'  // blue
    };
    return colors[season as keyof typeof colors] || '#3B82F6';
  }

  async generateMenuItemSuggestions(existingItems: any[], theme: string, targetIngredients: string[]): Promise<string[]> {
    const prompt = `Based on the theme "${theme}" and seasonal ingredients [${targetIngredients.join(', ')}], suggest 5 specific menu items that would complement these existing items:

${existingItems.map(item => `- ${item.name}: ${item.description || 'No description'}`).join('\n')}

Respond with JSON: {"suggestions": ["Item Name: Brief description", ...]}`;

    try {
      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 800
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      return Array.isArray(result.suggestions) ? result.suggestions : [];
    } catch (error) {
      console.error('Error generating menu suggestions:', error);
      return [];
    }
  }
}