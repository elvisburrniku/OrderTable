import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Search, Star, ShoppingCart, ArrowRight, CheckCircle } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface ShopCategory {
  id: number;
  name: string;
  description: string;
  slug: string;
  isActive: boolean;
  sortOrder: number;
}

interface ShopProduct {
  id: number;
  name: string;
  description: string;
  shortDescription: string;
  price: string;
  originalPrice?: string;
  categoryId?: number;
  imageUrl?: string;
  features: string[];
  deliveryTime?: string;
  isFeatured: boolean;
  inStock: boolean;
  slug: string;
}

export default function Shop() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<{ [key: number]: number }>({});

  const { data: categories = [] } = useQuery({
    queryKey: ['/api/shop/categories'],
    queryFn: () => apiRequest('GET', '/api/shop/categories').then(res => res.json()),
  });

  const { data: products = [] } = useQuery({
    queryKey: ['/api/shop/products', selectedCategory],
    queryFn: () => {
      const params = selectedCategory !== 'all' ? `?category=${selectedCategory}` : '';
      return apiRequest('GET', `/api/shop/products${params}`).then(res => res.json());
    },
  });

  const { data: featuredProducts = [] } = useQuery({
    queryKey: ['/api/shop/products', 'featured'],
    queryFn: () => apiRequest('GET', '/api/shop/products?featured=true').then(res => res.json()),
  });

  const filteredProducts = products.filter((product: ShopProduct) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addToCart = (productId: number) => {
    setCart(prev => ({
      ...prev,
      [productId]: (prev[productId] || 0) + 1
    }));
  };

  const getCartTotal = () => {
    return Object.entries(cart).reduce((total, [productId, quantity]) => {
      const product = products.find((p: ShopProduct) => p.id === parseInt(productId));
      return total + (product ? parseFloat(product.price) * quantity : 0);
    }, 0);
  };

  const getCartItemCount = () => {
    return Object.values(cart).reduce((total, quantity) => total + quantity, 0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                ReadyTable Shop
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mt-1">
                Professional services for your business growth
              </p>
            </div>
            
            {getCartItemCount() > 0 && (
              <div className="flex items-center space-x-2 bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-lg">
                <ShoppingCart className="w-5 h-5 text-blue-600" />
                <span className="text-blue-700 dark:text-blue-300 font-medium">
                  {getCartItemCount()} items - ${getCartTotal().toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Search services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white dark:bg-gray-800"
            />
          </div>
        </div>

        {/* Featured Products */}
        {featuredProducts.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Featured Services
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredProducts.map((product: ShopProduct) => (
                <Card key={product.id} className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
                  <Badge className="absolute top-4 left-4 bg-yellow-500 text-yellow-900 z-10">
                    <Star className="w-3 h-3 mr-1" />
                    Featured
                  </Badge>
                  
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{product.name}</CardTitle>
                    <CardDescription className="text-sm">
                      {product.shortDescription}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="pb-2">
                    <div className="flex items-center space-x-2 mb-3">
                      <span className="text-2xl font-bold text-blue-600">
                        ${product.price}
                      </span>
                      {product.originalPrice && (
                        <span className="text-lg text-gray-500 line-through">
                          ${product.originalPrice}
                        </span>
                      )}
                    </div>
                    
                    {product.features.length > 0 && (
                      <div className="space-y-1">
                        {product.features.slice(0, 3).map((feature, index) => (
                          <div key={index} className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                            <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                            {feature}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                  
                  <CardFooter className="pt-2">
                    <Button 
                      onClick={() => addToCart(product.id)}
                      className="w-full group-hover:bg-blue-700 transition-colors"
                      disabled={!product.inStock}
                    >
                      {product.inStock ? 'Add to Cart' : 'Out of Stock'}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Categories and Products */}
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
          <TabsList className="grid w-full grid-cols-auto bg-white dark:bg-gray-800 mb-8">
            <TabsTrigger value="all" className="text-center">All Services</TabsTrigger>
            {categories.map((category: ShopCategory) => (
              <TabsTrigger key={category.id} value={category.id.toString()}>
                {category.name}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={selectedCategory}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product: ShopProduct) => (
                <Card key={product.id} className="group hover:shadow-lg transition-all duration-300">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{product.name}</CardTitle>
                      {product.deliveryTime && (
                        <Badge variant="outline" className="text-xs">
                          {product.deliveryTime}
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="text-sm">
                      {product.shortDescription}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="flex items-center space-x-2 mb-4">
                      <span className="text-2xl font-bold text-blue-600">
                        ${product.price}
                      </span>
                      {product.originalPrice && (
                        <span className="text-lg text-gray-500 line-through">
                          ${product.originalPrice}
                        </span>
                      )}
                    </div>
                    
                    <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 line-clamp-3">
                      {product.description}
                    </p>
                    
                    {product.features.length > 0 && (
                      <div className="space-y-1 mb-4">
                        {product.features.slice(0, 4).map((feature, index) => (
                          <div key={index} className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                            <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                            {feature}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                  
                  <CardFooter>
                    <Button 
                      onClick={() => addToCart(product.id)}
                      className="w-full"
                      disabled={!product.inStock}
                    >
                      {product.inStock ? 'Add to Cart' : 'Out of Stock'}
                      <ShoppingCart className="w-4 h-4 ml-2" />
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
            
            {filteredProducts.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-500 dark:text-gray-400 text-lg">
                  {searchQuery ? 'No services found matching your search.' : 'No services available in this category.'}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}