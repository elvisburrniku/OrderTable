import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Plus, QrCode, Eye, Edit, Trash2, Download, Share, Settings, Users, ShoppingCart, Clock } from 'lucide-react';
import QRCodeGenerator from 'qrcode';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';

interface MenuCategory {
  id: number;
  name: string;
  description?: string;
  displayOrder: number;
  isActive: boolean;
}

interface MenuItem {
  id: number;
  categoryId: number;
  name: string;
  description?: string;
  price: number;
  currency: string;
  imageUrl?: string;
  isAvailable: boolean;
  allergens?: string[];
  dietary?: string[];
  preparationTime?: number;
  ingredients?: string;
  displayOrder: number;
}

interface QrMenu {
  id: number;
  name: string;
  description?: string;
  qrCode: string;
  menuUrl: string;
  tableId?: number;
  roomId?: number;
  isActive: boolean;
  viewCount: number;
  scanCount: number;
  lastScanned?: string;
  createdAt: string;
}

interface Table {
  id: number;
  tableNumber: string;
  capacity: number;
}

const categoryFormSchema = z.object({
  name: z.string().min(1, "Category name is required"),
  description: z.string().optional(),
  displayOrder: z.number().min(0),
});

const menuItemFormSchema = z.object({
  categoryId: z.number().min(1, "Category is required"),
  name: z.string().min(1, "Item name is required"),
  description: z.string().optional(),
  price: z.number().min(0, "Price must be positive"),
  imageUrl: z.string().url().optional().or(z.literal("")),
  isAvailable: z.boolean().default(true),
  allergens: z.string().optional(),
  dietary: z.string().optional(),
  preparationTime: z.number().min(0).optional(),
  ingredients: z.string().optional(),
  displayOrder: z.number().min(0).default(0),
});

const qrMenuFormSchema = z.object({
  name: z.string().min(1, "Menu name is required"),
  description: z.string().optional(),
  tableId: z.number().optional(),
  roomId: z.number().optional(),
});

type CategoryFormData = z.infer<typeof categoryFormSchema>;
type MenuItemFormData = z.infer<typeof menuItemFormSchema>;
type QrMenuFormData = z.infer<typeof qrMenuFormSchema>;

export default function QrMenuPage() {
  const { tenantId } = useParams();
  const [activeTab, setActiveTab] = useState("menus");
  const [selectedQrMenu, setSelectedQrMenu] = useState<QrMenu | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<MenuCategory | null>(null);
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isMenuItemDialogOpen, setIsMenuItemDialogOpen] = useState(false);
  const [isQrMenuDialogOpen, setIsQrMenuDialogOpen] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch QR menus
  const { data: qrMenus = [] } = useQuery<QrMenu[]>({
    queryKey: [`/api/tenants/${tenantId}/restaurants/22/qr-menus`],
  });

  // Fetch menu categories
  const { data: categories = [] } = useQuery<MenuCategory[]>({
    queryKey: [`/api/tenants/${tenantId}/restaurants/22/menu-categories`],
  });

  // Fetch menu items
  const { data: menuItems = [] } = useQuery<MenuItem[]>({
    queryKey: [`/api/tenants/${tenantId}/restaurants/22/menu-items`],
  });

  // Fetch tables
  const { data: tables = [] } = useQuery<Table[]>({
    queryKey: [`/api/tenants/${tenantId}/restaurants/22/tables`],
  });

  const categoryForm = useForm<CategoryFormData>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: "",
      description: "",
      displayOrder: 0,
    },
  });

  const menuItemForm = useForm<MenuItemFormData>({
    resolver: zodResolver(menuItemFormSchema),
    defaultValues: {
      categoryId: 0,
      name: "",
      description: "",
      price: 0,
      imageUrl: "",
      isAvailable: true,
      allergens: "",
      dietary: "",
      preparationTime: 0,
      ingredients: "",
      displayOrder: 0,
    },
  });

  const qrMenuForm = useForm<QrMenuFormData>({
    resolver: zodResolver(qrMenuFormSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  // Create category mutation
  const createCategoryMutation = useMutation({
    mutationFn: async (data: CategoryFormData) => {
      const response = await apiRequest(`/api/tenants/${tenantId}/restaurants/22/menu-categories`, "POST", {
        ...data,
        restaurantId: 22,
        tenantId: parseInt(tenantId!),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tenants/${tenantId}/restaurants/22/menu-categories`] });
      setIsCategoryDialogOpen(false);
      toast({ title: "Category created successfully" });
      categoryForm.reset();
    },
    onError: () => {
      toast({ title: "Failed to create category", variant: "destructive" });
    },
  });

  // Create menu item mutation
  const createMenuItemMutation = useMutation({
    mutationFn: async (data: MenuItemFormData) => {
      const allergens = data.allergens ? data.allergens.split(',').map(a => a.trim()) : [];
      const dietary = data.dietary ? data.dietary.split(',').map(d => d.trim()) : [];
      
      const response = await apiRequest(`/api/tenants/${tenantId}/restaurants/22/menu-items`, "POST", {
        ...data,
        allergens,
        dietary,
        price: Math.round(data.price * 100), // Convert to cents
        restaurantId: 22,
        tenantId: parseInt(tenantId!),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tenants/${tenantId}/restaurants/22/menu-items`] });
      setIsMenuItemDialogOpen(false);
      toast({ title: "Menu item created successfully" });
      menuItemForm.reset();
    },
    onError: () => {
      toast({ title: "Failed to create menu item", variant: "destructive" });
    },
  });

  // Create QR menu mutation
  const createQrMenuMutation = useMutation({
    mutationFn: async (data: QrMenuFormData) => {
      const response = await apiRequest(`/api/tenants/${tenantId}/restaurants/22/qr-menus`, "POST", {
        ...data,
        restaurantId: 22,
        tenantId: parseInt(tenantId!),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tenants/${tenantId}/restaurants/22/qr-menus`] });
      setIsQrMenuDialogOpen(false);
      toast({ title: "QR menu created successfully" });
      qrMenuForm.reset();
    },
    onError: () => {
      toast({ title: "Failed to create QR menu", variant: "destructive" });
    },
  });

  // Generate QR code
  const generateQrCode = async (menuUrl: string) => {
    try {
      const qrCodeDataUrl = await QRCodeGenerator.toDataURL(menuUrl, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      setQrCodeDataUrl(qrCodeDataUrl);
      return qrCodeDataUrl;
    } catch (error) {
      console.error('Error generating QR code:', error);
      return '';
    }
  };

  // Download QR code
  const downloadQrCode = (qrMenu: QrMenu) => {
    generateQrCode(qrMenu.menuUrl).then(dataUrl => {
      if (dataUrl) {
        const link = document.createElement('a');
        link.download = `qr-menu-${qrMenu.name.toLowerCase().replace(/\s+/g, '-')}.png`;
        link.href = dataUrl;
        link.click();
      }
    });
  };

  // Format price
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price / 100);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">QR Code Menus</h1>
          <p className="text-muted-foreground">
            Create interactive digital menus with QR codes for contactless ordering
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="menus">QR Menus</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="items">Menu Items</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
        </TabsList>

        <TabsContent value="menus" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">QR Code Menus</h2>
            <Dialog open={isQrMenuDialogOpen} onOpenChange={setIsQrMenuDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create QR Menu
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create QR Code Menu</DialogTitle>
                </DialogHeader>
                <Form {...qrMenuForm}>
                  <form onSubmit={qrMenuForm.handleSubmit((data) => createQrMenuMutation.mutate(data))} className="space-y-4">
                    <FormField
                      control={qrMenuForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Menu Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Main Menu" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={qrMenuForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea {...field} placeholder="Menu description..." />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={qrMenuForm.control}
                      name="tableId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Assign to Table (Optional)</FormLabel>
                          <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a table" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {tables.map((table) => (
                                <SelectItem key={table.id} value={table.id.toString()}>
                                  Table {table.tableNumber}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setIsQrMenuDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createQrMenuMutation.isPending}>
                        {createQrMenuMutation.isPending ? "Creating..." : "Create Menu"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {qrMenus.map((qrMenu) => (
              <Card key={qrMenu.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{qrMenu.name}</CardTitle>
                    <Badge variant={qrMenu.isActive ? "default" : "secondary"}>
                      {qrMenu.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  {qrMenu.description && (
                    <p className="text-sm text-muted-foreground">{qrMenu.description}</p>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-center p-4 bg-gray-50 rounded-lg">
                    <QrCode className="w-16 h-16 text-gray-600" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      <span>{qrMenu.viewCount} views</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <QrCode className="w-4 h-4" />
                      <span>{qrMenu.scanCount} scans</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadQrCode(qrMenu)}
                      className="flex-1"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Download
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(qrMenu.menuUrl);
                        toast({ title: "Menu URL copied to clipboard" });
                      }}
                      className="flex-1"
                    >
                      <Share className="w-4 h-4 mr-1" />
                      Share
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Menu Categories</h2>
            <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Category
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Menu Category</DialogTitle>
                </DialogHeader>
                <Form {...categoryForm}>
                  <form onSubmit={categoryForm.handleSubmit((data) => createCategoryMutation.mutate(data))} className="space-y-4">
                    <FormField
                      control={categoryForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Appetizers, Main Courses, etc." />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={categoryForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea {...field} placeholder="Category description..." />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={categoryForm.control}
                      name="displayOrder"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Display Order</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createCategoryMutation.isPending}>
                        {createCategoryMutation.isPending ? "Creating..." : "Create Category"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((category) => (
              <Card key={category.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{category.name}</CardTitle>
                    <Badge variant={category.isActive ? "default" : "secondary"}>
                      {category.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  {category.description && (
                    <p className="text-sm text-muted-foreground">{category.description}</p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Order: {category.displayOrder}</span>
                    <span>•</span>
                    <span>{menuItems.filter(item => item.categoryId === category.id).length} items</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="items" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Menu Items</h2>
            <Dialog open={isMenuItemDialogOpen} onOpenChange={setIsMenuItemDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Menu Item
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Menu Item</DialogTitle>
                </DialogHeader>
                <Form {...menuItemForm}>
                  <form onSubmit={menuItemForm.handleSubmit((data) => createMenuItemMutation.mutate(data))} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={menuItemForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Item Name</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Grilled Salmon" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={menuItemForm.control}
                        name="price"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Price ($)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.01"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={menuItemForm.control}
                      name="categoryId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {categories.map((category) => (
                                <SelectItem key={category.id} value={category.id.toString()}>
                                  {category.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={menuItemForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea {...field} placeholder="Fresh Atlantic salmon grilled to perfection..." />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={menuItemForm.control}
                        name="preparationTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Prep Time (minutes)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={menuItemForm.control}
                        name="displayOrder"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Display Order</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={menuItemForm.control}
                        name="allergens"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Allergens (comma separated)</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="nuts, dairy, gluten" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={menuItemForm.control}
                        name="dietary"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Dietary (comma separated)</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="vegetarian, vegan, gluten-free" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={menuItemForm.control}
                      name="imageUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Image URL (optional)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="https://example.com/image.jpg" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={menuItemForm.control}
                      name="ingredients"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ingredients</FormLabel>
                          <FormControl>
                            <Textarea {...field} placeholder="Fresh salmon, olive oil, herbs..." />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setIsMenuItemDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createMenuItemMutation.isPending}>
                        {createMenuItemMutation.isPending ? "Creating..." : "Create Item"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {menuItems.map((item) => (
              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{item.name}</CardTitle>
                    <Badge variant={item.isAvailable ? "default" : "secondary"}>
                      {item.isAvailable ? "Available" : "Unavailable"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold text-green-600">
                      {formatPrice(item.price)}
                    </span>
                    {item.preparationTime && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span>{item.preparationTime}m</span>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {item.description && (
                    <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                  )}
                  
                  {(item.allergens?.length || item.dietary?.length) && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {item.dietary?.map((diet, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {diet}
                        </Badge>
                      ))}
                      {item.allergens?.map((allergen, index) => (
                        <Badge key={index} variant="destructive" className="text-xs">
                          {allergen}
                        </Badge>
                      ))}
                    </div>
                  )}
                  
                  <div className="text-xs text-muted-foreground">
                    Category: {categories.find(c => c.id === item.categoryId)?.name}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">QR Menu Orders</h2>
          </div>
          
          <Card>
            <CardContent className="p-6">
              <div className="text-center text-muted-foreground">
                <ShoppingCart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No orders yet. Orders will appear here when customers place them through QR menus.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}