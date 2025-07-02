import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, DollarSign, Eye, EyeOff, ChefHat, Leaf, Printer } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import PrintableMenu from "./printable-menu";
import SeasonalMenuThemes from "./seasonal-menu-themes";

interface MenuCategory {
  id: number;
  restaurantId: number;
  tenantId: number;
  name: string;
  description?: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface MenuItem {
  id: number;
  restaurantId: number;
  tenantId: number;
  categoryId: number;
  name: string;
  description?: string;
  price?: number;
  currency: string;
  imageUrl?: string;
  isAvailable: boolean;
  allergens?: string[];
  dietary?: string[];
  preparationTime?: number;
  ingredients?: string;
  nutritionalInfo?: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface MenuManagementProps {
  restaurantId: number;
  tenantId: number;
  searchTerm?: string;
  categoryFilter?: string;
  priceRangeFilter?: string;
  availabilityFilter?: string;
  currentPage?: number;
  itemsPerPage?: number;
  setCurrentPage?: (page: number) => void;
  setItemsPerPage?: (size: number) => void;
}

export function MenuManagement({ 
  restaurantId, 
  tenantId, 
  searchTerm = "",
  categoryFilter = "all",
  priceRangeFilter = "all",
  availabilityFilter = "all",
  currentPage = 1,
  itemsPerPage = 10,
  setCurrentPage = () => {},
  setItemsPerPage = () => {}
}: MenuManagementProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  // Fetch menu categories
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['/api/tenants', tenantId, 'restaurants', restaurantId, 'menu-categories'],
    queryFn: async () => {
      const response = await fetch(`/api/tenants/${tenantId}/restaurants/${restaurantId}/menu-categories`);
      if (!response.ok) {
        throw new Error('Failed to fetch menu categories');
      }
      return response.json();
    },
  });

  // Fetch menu items
  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: ['/api/tenants', tenantId, 'restaurants', restaurantId, 'menu-items'],
    queryFn: async () => {
      const response = await fetch(`/api/tenants/${tenantId}/restaurants/${restaurantId}/menu-items`);
      if (!response.ok) {
        throw new Error('Failed to fetch menu items');
      }
      return response.json();
    },
  });

  // Category mutations
  const createCategoryMutation = useMutation({
    mutationFn: (data: Partial<MenuCategory>) =>
      apiRequest('POST', `/api/tenants/${tenantId}/restaurants/${restaurantId}/menu-categories`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tenants', tenantId, 'restaurants', restaurantId, 'menu-categories'] });
      setCategoryDialogOpen(false);
      setEditingCategory(null);
      toast({ title: "Category saved successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error saving category", description: error.message, variant: "destructive" });
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<MenuCategory> }) =>
      apiRequest('PUT', `/api/tenants/${tenantId}/restaurants/${restaurantId}/menu-categories/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tenants', tenantId, 'restaurants', restaurantId, 'menu-categories'] });
      setCategoryDialogOpen(false);
      setEditingCategory(null);
      toast({ title: "Category updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error updating category", description: error.message, variant: "destructive" });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest('DELETE', `/api/tenants/${tenantId}/restaurants/${restaurantId}/menu-categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tenants', tenantId, 'restaurants', restaurantId, 'menu-categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tenants', tenantId, 'restaurants', restaurantId, 'menu-items'] });
      toast({ title: "Category deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error deleting category", description: error.message, variant: "destructive" });
    },
  });

  // Item mutations
  const createItemMutation = useMutation({
    mutationFn: (data: Partial<MenuItem>) =>
      apiRequest('POST', `/api/tenants/${tenantId}/restaurants/${restaurantId}/menu-items`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tenants', tenantId, 'restaurants', restaurantId, 'menu-items'] });
      setItemDialogOpen(false);
      setEditingItem(null);
      toast({ title: "Menu item saved successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error saving menu item", description: error.message, variant: "destructive" });
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<MenuItem> }) =>
      apiRequest('PUT', `/api/tenants/${tenantId}/restaurants/${restaurantId}/menu-items/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tenants', tenantId, 'restaurants', restaurantId, 'menu-items'] });
      setItemDialogOpen(false);
      setEditingItem(null);
      toast({ title: "Menu item updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error updating menu item", description: error.message, variant: "destructive" });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest('DELETE', `/api/tenants/${tenantId}/restaurants/${restaurantId}/menu-items/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tenants', tenantId, 'restaurants', restaurantId, 'menu-items'] });
      toast({ title: "Menu item deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error deleting menu item", description: error.message, variant: "destructive" });
    },
  });

  const handleCategorySubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const data = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      displayOrder: parseInt(formData.get('displayOrder') as string) || 0,
      isActive: formData.get('isActive') === 'on',
    };

    if (editingCategory) {
      updateCategoryMutation.mutate({ id: editingCategory.id, data });
    } else {
      createCategoryMutation.mutate(data);
    }
  };

  const handleItemSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const priceStr = formData.get('price') as string;
    
    // Build dietary flags array
    const dietaryFlags = [];
    if (formData.get('isVegetarian') === 'on') dietaryFlags.push('vegetarian');
    if (formData.get('isVegan') === 'on') dietaryFlags.push('vegan');
    if (formData.get('isGlutenFree') === 'on') dietaryFlags.push('gluten-free');
    
    // Process allergens as array
    const allergensStr = formData.get('allergens') as string;
    const allergensArray = allergensStr ? allergensStr.split(',').map(a => a.trim()).filter(a => a) : [];
    
    // Sanitize text fields to convert empty strings to null
    const ingredients = formData.get('ingredients') as string;
    const nutritionalInfo = formData.get('nutritionalInfo') as string;
    const description = formData.get('description') as string;
    const imageUrl = formData.get('imageUrl') as string;
    
    const data = {
      categoryId: parseInt(formData.get('categoryId') as string),
      name: formData.get('name') as string,
      description: description && description.trim() !== '' ? description : null,
      price: priceStr ? Math.round(parseFloat(priceStr) * 100) : undefined,
      currency: formData.get('currency') as string || 'USD',
      imageUrl: imageUrl && imageUrl.trim() !== '' ? imageUrl : null,
      isAvailable: formData.get('isAvailable') === 'on',
      allergens: allergensArray,
      dietary: dietaryFlags,
      preparationTime: parseInt(formData.get('preparationTime') as string) || undefined,
      ingredients: ingredients && ingredients.trim() !== '' ? ingredients : null,
      nutritionalInfo: nutritionalInfo && nutritionalInfo.trim() !== '' ? nutritionalInfo : null,
      displayOrder: parseInt(formData.get('displayOrder') as string) || 0,
      isActive: formData.get('isActive') === 'on',
    };

    if (editingItem) {
      updateItemMutation.mutate({ id: editingItem.id, data });
    } else {
      createItemMutation.mutate(data);
    }
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(price / 100);
  };

  const getItemsByCategory = (categoryId: number) => {
    return items.filter(item => {
      const matchesCategory = item.categoryId === categoryId;
      
      const matchesSearch = !searchTerm || 
        item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategoryFilter = categoryFilter === "all" || item.categoryId?.toString() === categoryFilter;

      const itemPrice = item.price ? item.price / 100 : 0;
      const matchesPriceRange = priceRangeFilter === "all" || 
        (priceRangeFilter === "0-5" && itemPrice <= 5) ||
        (priceRangeFilter === "5-10" && itemPrice > 5 && itemPrice <= 10) ||
        (priceRangeFilter === "10-20" && itemPrice > 10 && itemPrice <= 20) ||
        (priceRangeFilter === "20+" && itemPrice > 20);

      const matchesAvailability = availabilityFilter === "all" ||
        (availabilityFilter === "available" && item.isAvailable) ||
        (availabilityFilter === "unavailable" && !item.isAvailable);

      return matchesCategory && matchesSearch && matchesCategoryFilter && matchesPriceRange && matchesAvailability;
    });
  };

  if (categoriesLoading || itemsLoading) {
    return <div className="flex items-center justify-center p-8">Loading menu...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Menu Management</h2>
        <div className="flex gap-2">
          <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingCategory(null)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Category
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingCategory ? 'Edit Category' : 'Add New Category'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCategorySubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Category Name</Label>
                  <Input
                    id="name"
                    name="name"
                    defaultValue={editingCategory?.name || ''}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    defaultValue={editingCategory?.description || ''}
                  />
                </div>
                <div>
                  <Label htmlFor="displayOrder">Sort Order</Label>
                  <Input
                    id="displayOrder"
                    name="displayOrder"
                    type="number"
                    defaultValue={editingCategory?.displayOrder || 0}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="isActive"
                    name="isActive"
                    defaultChecked={editingCategory?.isActive !== false}
                  />
                  <Label htmlFor="isActive">Active</Label>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setCategoryDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}>
                    {editingCategory ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" onClick={() => setEditingItem(null)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleItemSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="categoryId">Category</Label>
                    <Select name="categoryId" defaultValue={editingItem?.categoryId?.toString()} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id.toString()}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="name">Item Name</Label>
                    <Input
                      id="name"
                      name="name"
                      defaultValue={editingItem?.name || ''}
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    defaultValue={editingItem?.description || ''}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="price">Price</Label>
                    <Input
                      id="price"
                      name="price"
                      type="number"
                      step="0.01"
                      defaultValue={editingItem?.price ? (editingItem.price / 100).toFixed(2) : ''}
                    />
                  </div>
                  <div>
                    <Label htmlFor="currency">Currency</Label>
                    <Select name="currency" defaultValue={editingItem?.currency || 'USD'}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="preparationTime">Prep Time (min)</Label>
                    <Input
                      id="preparationTime"
                      name="preparationTime"
                      type="number"
                      defaultValue={editingItem?.preparationTime || ''}
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="isAvailable"
                    name="isAvailable"
                    defaultChecked={editingItem?.isAvailable !== false}
                  />
                  <Label htmlFor="isAvailable">Available</Label>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isVegetarian"
                      name="isVegetarian"
                      defaultChecked={editingItem?.dietary?.includes('vegetarian') || false}
                    />
                    <Label htmlFor="isVegetarian">Vegetarian</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isVegan"
                      name="isVegan"
                      defaultChecked={editingItem?.dietary?.includes('vegan') || false}
                    />
                    <Label htmlFor="isVegan">Vegan</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isGlutenFree"
                      name="isGlutenFree"
                      defaultChecked={editingItem?.dietary?.includes('gluten-free') || false}
                    />
                    <Label htmlFor="isGlutenFree">Gluten-Free</Label>
                  </div>
                </div>
                <div>
                  <Label htmlFor="allergens">Allergens</Label>
                  <Input
                    id="allergens"
                    name="allergens"
                    placeholder="e.g., nuts, dairy, eggs"
                    defaultValue={editingItem?.allergens?.join(', ') || ''}
                  />
                </div>
                <div>
                  <Label htmlFor="ingredients">Ingredients</Label>
                  <Textarea
                    id="ingredients"
                    name="ingredients"
                    placeholder="List of ingredients"
                    defaultValue={editingItem?.ingredients || ''}
                  />
                </div>
                <div>
                  <Label htmlFor="nutritionalInfo">Nutritional Information</Label>
                  <Textarea
                    id="nutritionalInfo"
                    name="nutritionalInfo"
                    placeholder="Calories, protein, etc."
                    defaultValue={editingItem?.nutritionalInfo || ''}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="imageUrl">Image URL</Label>
                    <Input
                      id="imageUrl"
                      name="imageUrl"
                      defaultValue={editingItem?.imageUrl || ''}
                    />
                  </div>
                  <div>
                    <Label htmlFor="displayOrder">Sort Order</Label>
                    <Input
                      id="displayOrder"
                      name="displayOrder"
                      type="number"
                      defaultValue={editingItem?.displayOrder || 0}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isActive"
                      name="isActive"
                      defaultChecked={editingItem?.isActive !== false}
                    />
                    <Label htmlFor="isActive">Active</Label>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setItemDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createItemMutation.isPending || updateItemMutation.isPending}>
                    {editingItem ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-6">
        {categories
          .filter((category) => {
            // Show category if it has items after filtering
            const categoryItems = getItemsByCategory(category.id);
            return categoryItems.length > 0;
          })
          .map((category) => (
          <Card key={category.id} className="w-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <ChefHat className="h-5 w-5" />
                    {category.name}
                    {!category.isActive && (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </CardTitle>
                  {category.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {category.description}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingCategory(category);
                      setCategoryDialogOpen(true);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteCategoryMutation.mutate(category.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {getItemsByCategory(category.id).map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{item.name}</h4>
                        <div className="flex gap-1">
                          {item.dietary?.includes('vegetarian') && (
                            <Badge variant="secondary" className="text-xs">
                              <Leaf className="h-3 w-3 mr-1" />
                              Vegetarian
                            </Badge>
                          )}
                          {item.dietary?.includes('vegan') && (
                            <Badge variant="secondary" className="text-xs">
                              <Leaf className="h-3 w-3 mr-1" />
                              Vegan
                            </Badge>
                          )}
                          {item.dietary?.includes('gluten-free') && (
                            <Badge variant="secondary" className="text-xs">
                              GF
                            </Badge>
                          )}
                          {!item.isAvailable && (
                            <Badge variant="destructive" className="text-xs">
                              Unavailable
                            </Badge>
                          )}
                        </div>
                      </div>
                      {item.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {item.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-2">
                        {item.price && (
                          <span className="text-sm font-medium">
                            {formatPrice(item.price, item.currency)}
                          </span>
                        )}
                        {item.preparationTime && (
                          <span className="text-sm text-muted-foreground">
                            {item.preparationTime} min
                          </span>
                        )}
                        {item.allergens && item.allergens.length > 0 && (
                          <span className="text-sm text-muted-foreground">
                            Allergens: {item.allergens.join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingItem(item);
                          setItemDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteItemMutation.mutate(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {categories.length === 0 ? (
        <div className="text-center py-12">
          <ChefHat className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No menu categories yet</h3>
          <p className="text-muted-foreground mb-4">
            Start by creating your first menu category to organize your items.
          </p>
        </div>
      ) : categories.filter((category) => getItemsByCategory(category.id).length > 0).length === 0 && (
        <div className="text-center py-12">
          <ChefHat className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No items match your filters</h3>
          <p className="text-muted-foreground mb-4">
            Try adjusting your search criteria or clear the filters to see all items.
          </p>
        </div>
      )}
    </div>
  );
}