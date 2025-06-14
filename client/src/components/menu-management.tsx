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
import { Plus, Edit, Trash2, DollarSign, Eye, EyeOff, ChefHat, Leaf } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface MenuCategory {
  id: number;
  restaurantId: number;
  tenantId: number;
  name: string;
  description?: string;
  sortOrder: number;
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
  isPriceVisible: boolean;
  isAvailable: boolean;
  isVegetarian: boolean;
  isVegan: boolean;
  isGlutenFree: boolean;
  allergens?: string;
  preparationTime?: number;
  sortOrder: number;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

interface MenuManagementProps {
  restaurantId: number;
  tenantId: number;
}

export function MenuManagement({ restaurantId, tenantId }: MenuManagementProps) {
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
      apiRequest(`/api/tenants/${tenantId}/restaurants/${restaurantId}/menu-categories`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
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
      apiRequest(`/api/tenants/${tenantId}/restaurants/${restaurantId}/menu-categories/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
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
      apiRequest(`/api/tenants/${tenantId}/restaurants/${restaurantId}/menu-categories/${id}`, {
        method: 'DELETE',
      }),
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
      apiRequest(`/api/tenants/${tenantId}/restaurants/${restaurantId}/menu-items`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
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
      apiRequest(`/api/tenants/${tenantId}/restaurants/${restaurantId}/menu-items/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
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
      apiRequest(`/api/tenants/${tenantId}/restaurants/${restaurantId}/menu-items/${id}`, {
        method: 'DELETE',
      }),
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
      sortOrder: parseInt(formData.get('sortOrder') as string) || 0,
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
    const data = {
      categoryId: parseInt(formData.get('categoryId') as string),
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      price: priceStr ? Math.round(parseFloat(priceStr) * 100) : undefined,
      currency: formData.get('currency') as string || 'USD',
      isPriceVisible: formData.get('isPriceVisible') === 'on',
      isAvailable: formData.get('isAvailable') === 'on',
      isVegetarian: formData.get('isVegetarian') === 'on',
      isVegan: formData.get('isVegan') === 'on',
      isGlutenFree: formData.get('isGlutenFree') === 'on',
      allergens: formData.get('allergens') as string,
      preparationTime: parseInt(formData.get('preparationTime') as string) || undefined,
      sortOrder: parseInt(formData.get('sortOrder') as string) || 0,
      imageUrl: formData.get('imageUrl') as string,
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
    return items.filter(item => item.categoryId === categoryId);
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
                  <Label htmlFor="sortOrder">Sort Order</Label>
                  <Input
                    id="sortOrder"
                    name="sortOrder"
                    type="number"
                    defaultValue={editingCategory?.sortOrder || 0}
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isPriceVisible"
                      name="isPriceVisible"
                      defaultChecked={editingItem?.isPriceVisible !== false}
                    />
                    <Label htmlFor="isPriceVisible">Show Price</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isAvailable"
                      name="isAvailable"
                      defaultChecked={editingItem?.isAvailable !== false}
                    />
                    <Label htmlFor="isAvailable">Available</Label>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isVegetarian"
                      name="isVegetarian"
                      defaultChecked={editingItem?.isVegetarian || false}
                    />
                    <Label htmlFor="isVegetarian">Vegetarian</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isVegan"
                      name="isVegan"
                      defaultChecked={editingItem?.isVegan || false}
                    />
                    <Label htmlFor="isVegan">Vegan</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isGlutenFree"
                      name="isGlutenFree"
                      defaultChecked={editingItem?.isGlutenFree || false}
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
                    defaultValue={editingItem?.allergens || ''}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="imageUrl">Image URL</Label>
                    <Input
                      id="imageUrl"
                      name="imageUrl"
                      defaultValue={editingItem?.imageUrl || ''}
                    />
                  </div>
                  <div>
                    <Label htmlFor="sortOrder">Sort Order</Label>
                    <Input
                      id="sortOrder"
                      name="sortOrder"
                      type="number"
                      defaultValue={editingItem?.sortOrder || 0}
                    />
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
        {categories.map((category) => (
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
                          {item.isVegetarian && (
                            <Badge variant="secondary" className="text-xs">
                              <Leaf className="h-3 w-3 mr-1" />
                              Vegetarian
                            </Badge>
                          )}
                          {item.isVegan && (
                            <Badge variant="secondary" className="text-xs">
                              <Leaf className="h-3 w-3 mr-1" />
                              Vegan
                            </Badge>
                          )}
                          {item.isGlutenFree && (
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
                          <div className="flex items-center gap-1">
                            {item.isPriceVisible ? (
                              <Eye className="h-4 w-4" />
                            ) : (
                              <EyeOff className="h-4 w-4" />
                            )}
                            <span className="text-sm font-medium">
                              {formatPrice(item.price, item.currency)}
                            </span>
                          </div>
                        )}
                        {item.preparationTime && (
                          <span className="text-sm text-muted-foreground">
                            {item.preparationTime} min
                          </span>
                        )}
                        {item.allergens && (
                          <span className="text-sm text-muted-foreground">
                            Allergens: {item.allergens}
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
                {getItemsByCategory(category.id).length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No items in this category yet.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {categories.length === 0 && (
        <div className="text-center py-12">
          <ChefHat className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No menu categories yet</h3>
          <p className="text-muted-foreground mb-4">
            Start by creating your first menu category to organize your items.
          </p>
        </div>
      )}
    </div>
  );
}