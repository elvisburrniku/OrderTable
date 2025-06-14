const { AISeasonalMenuService } = require('./server/ai-seasonal-menu.ts');

async function testAISeasonalTheme() {
  console.log('Testing AI Seasonal Menu Theme Generator...');
  
  const aiService = new AISeasonalMenuService();
  
  const testRequest = {
    season: 'autumn',
    year: 2024,
    restaurantName: 'Test Restaurant',
    existingMenuItems: [
      {
        name: 'Grilled Salmon',
        description: 'Fresh Atlantic salmon with herbs',
        category: 'Main Course',
        allergens: ['fish'],
        dietary: ['gluten-free']
      },
      {
        name: 'Caesar Salad',
        description: 'Classic Caesar with croutons',
        category: 'Appetizer',
        allergens: ['dairy', 'gluten'],
        dietary: ['vegetarian']
      }
    ],
    customPrompt: 'Focus on comfort food with seasonal vegetables'
  };
  
  try {
    const result = await aiService.generateSeasonalTheme(testRequest);
    console.log('✅ AI Theme Generation Successful!');
    console.log('Theme Name:', result.name);
    console.log('Description:', result.description);
    console.log('Color:', result.color);
    console.log('Suggested Items:', result.suggestedMenuItems.length);
    console.log('Marketing Copy:', result.marketingCopy);
    return true;
  } catch (error) {
    console.error('❌ AI Theme Generation Failed:', error.message);
    return false;
  }
}

testAISeasonalTheme();