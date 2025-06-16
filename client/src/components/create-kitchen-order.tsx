import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  Minus, 
  ShoppingCart, 
  Clock, 
  AlertTriangle, 
  DollarSign,
  ChefHat,
  Utensils,
  X
} from "lucide-react";

interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  preparationTime: number;
  isAvailable: boolean;
}

interface OrderItem {
  id: number;
  name: string;
  quantity: number;
  price: number;
  preparationTime: number;
  category: string;
  specialInstructions?: string;
}

interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
}

interface Table {
  id: number;
  table_number: string;
  seats: number;
  room_id: number;
}

interface CreateKitchenOrderProps {
  restaurantId: number;
  tenantId: number;
  onOrderCreated?: () => void;
}

export function CreateKitchenOrder({ restaurantId, tenantId, onOrderCreated }: CreateKitchenOrderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [orderNumber, setOrderNumber] = useState("");
  const [selectedTableId, setSelectedTableId] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customCustomerName, setCustomCustomerName] = useState("");
  const [useExistingCustomer, setUseExistingCustomer] = useState(true);
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [specialInstructions, setSpecialInstructions] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch menu items
  const { data: menuItemsData = [], isLoading: menuItemsLoading } = useQuery({
    queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/menu-items`],
    queryFn: async () => {
      const response = await fetch(`/api/tenants/${tenantId}/restaurants/${restaurantId}/menu-items`);
      if (!response.ok) throw new Error('Failed to fetch menu items');
      return response.json();
    },
    enabled: isOpen,
  });

  // Ensure menuItems is always an array
  const menuItems = Array.isArray(menuItemsData) ? menuItemsData : [];

  // Fetch tables
  const { data: tablesData = [] } = useQuery({
    queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/tables`],
    queryFn: async () => {
      const response = await fetch(`/api/tenants/${tenantId}/restaurants/${restaurantId}/tables`);
      if (!response.ok) throw new Error('Failed to fetch tables');
      return response.json();
    },
    enabled: isOpen,
  });

  const tables = Array.isArray(tablesData) ? tablesData : [];

  // Fetch customers
  const { data: customersData = [] } = useQuery({
    queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/customers`],
    queryFn: async () => {
      const response = await fetch(`/api/tenants/${tenantId}/restaurants/${restaurantId}/customers`);
      if (!response.ok) throw new Error('Failed to fetch customers');
      return response.json();
    },
    enabled: isOpen,
  });

  const customers = Array.isArray(customersData) ? customersData : [];

  // Fetch menu categories for proper category names
  const { data: categoriesData = [] } = useQuery({
    queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/menu-categories`],
    queryFn: async () => {
      const response = await fetch(`/api/tenants/${tenantId}/restaurants/${restaurantId}/menu-categories`);
      if (!response.ok) throw new Error('Failed to fetch categories');
      return response.json();
    },
    enabled: isOpen,
  });

  const categories = Array.isArray(categoriesData) ? categoriesData : [];

  // Group menu items by category
  const groupedMenuItems = menuItems.reduce((acc: Record<string, any[]>, item: any) => {
    const category = categories.find(c => c.id === item.categoryId)?.name || 'Uncategorized';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<string, any[]>);

  // Debug logging - remove after verification
  if (isOpen && menuItems.length > 0) {
    console.log('Menu items loaded:', {
      menuItemsCount: menuItems.length,
      categoriesCount: categories.length,
      groupedCount: Object.keys(groupedMenuItems).length
    });
  }

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: (orderData: any) => 
      apiRequest('POST', `/api/tenants/${tenantId}/restaurants/${restaurantId}/kitchen/orders`, orderData),
    onSuccess: () => {
      toast({
        title: "Order Created",
        description: "Kitchen order has been successfully created and sent to the kitchen.",
      });
      // Invalidate all kitchen-related queries to ensure immediate refresh
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0] as string;
          return key.includes(`/api/tenants/${tenantId}/restaurants/${restaurantId}/kitchen`);
        }
      });
      resetForm();
      setIsOpen(false);
      onOrderCreated?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create kitchen order",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setOrderItems([]);
    setOrderNumber("");
    setSelectedTableId("");
    setSelectedCustomerId("");
    setCustomCustomerName("");
    setUseExistingCustomer(true);
    setPriority('medium');
    setSpecialInstructions("");
  };

  const addItemToOrder = (menuItem: any) => {
    const existingItem = orderItems.find(item => item.id === menuItem.id);
    const category = categories.find(c => c.id === menuItem.categoryId)?.name || 'Uncategorized';
    
    if (existingItem) {
      setOrderItems(items => 
        items.map(item => 
          item.id === menuItem.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setOrderItems(items => [...items, {
        id: menuItem.id,
        name: menuItem.name,
        quantity: 1,
        price: menuItem.price / 100, // Convert from cents to dollars
        preparationTime: menuItem.preparationTime,
        category: category,
      }]);
    }
  };

  const updateItemQuantity = (itemId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      setOrderItems(items => items.filter(item => item.id !== itemId));
    } else {
      setOrderItems(items => 
        items.map(item => 
          item.id === itemId 
            ? { ...item, quantity: newQuantity }
            : item
        )
      );
    }
  };

  const updateItemInstructions = (itemId: number, instructions: string) => {
    setOrderItems(items => 
      items.map(item => 
        item.id === itemId 
          ? { ...item, specialInstructions: instructions }
          : item
      )
    );
  };

  const removeItemFromOrder = (itemId: number) => {
    setOrderItems(items => items.filter(item => item.id !== itemId));
  };

  const calculateTotal = () => {
    return orderItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const calculateEstimatedTime = () => {
    if (orderItems.length === 0) return 0;
    
    // Group items by category to simulate parallel preparation
    const categorizedItems = orderItems.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    }, {} as Record<string, OrderItem[]>);

    // Calculate max preparation time per category (parallel within category)
    const categoryTimes = Object.values(categorizedItems).map(categoryItems => {
      return Math.max(...categoryItems.map(item => item.preparationTime));
    });

    // Sum all category times (sequential across categories)
    return categoryTimes.reduce((sum, time) => sum + time, 0);
  };

  const generateOrderNumber = () => {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    return `K${timestamp}${random}`;
  };

  // Auto-generate order number when dialog opens
  const handleDialogOpen = (open: boolean) => {
    setIsOpen(open);
    if (open && !orderNumber) {
      setOrderNumber(generateOrderNumber());
    }
  };

  const handleSubmit = () => {
    const selectedTable = tables.find(t => t.id.toString() === selectedTableId);
    const selectedCustomer = customers.find(c => c.id.toString() === selectedCustomerId);
    
    const tableNumber = selectedTable ? selectedTable.table_number : '';
    const customerName = useExistingCustomer 
      ? (selectedCustomer ? selectedCustomer.name : '')
      : customCustomerName;

    if (!orderNumber || !tableNumber || !customerName || orderItems.length === 0) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields and add at least one item.",
        variant: "destructive",
      });
      return;
    }

    const orderData = {
      orderNumber,
      tableNumber,
      customerName,
      items: orderItems,
      priority,
      estimatedTime: calculateEstimatedTime(),
      totalAmount: Math.round(calculateTotal() * 100), // Convert to cents
      specialInstructions: specialInstructions || null,
    };

    createOrderMutation.mutate(orderData);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-black';
      case 'low': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create New Order
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ChefHat className="h-5 w-5" />
            Create Kitchen Order
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Order Details */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Order Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="orderNumber">Order Number</Label>
                    <div className="flex gap-2">
                      <Input
                        id="orderNumber"
                        value={orderNumber}
                        onChange={(e) => setOrderNumber(e.target.value)}
                        placeholder="Auto-generated"
                        readOnly
                      />
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setOrderNumber(generateOrderNumber())}
                      >
                        New
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="tableSelect">Table</Label>
                    <Select value={selectedTableId} onValueChange={setSelectedTableId}>
                      <SelectTrigger id="tableSelect">
                        <SelectValue placeholder="Select table" />
                      </SelectTrigger>
                      <SelectContent>
                        {tables.map((table) => (
                          <SelectItem key={table.id} value={table.id.toString()}>
                            {table.table_number} ({table.seats} seats)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Customer</Label>
                  <div className="space-y-3">
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          checked={useExistingCustomer}
                          onChange={() => setUseExistingCustomer(true)}
                        />
                        Existing Customer
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          checked={!useExistingCustomer}
                          onChange={() => setUseExistingCustomer(false)}
                        />
                        New Customer
                      </label>
                    </div>
                    
                    {useExistingCustomer ? (
                      <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select customer" />
                        </SelectTrigger>
                        <SelectContent>
                          {customers.map((customer) => (
                            <SelectItem key={customer.id} value={customer.id.toString()}>
                              {customer.name} ({customer.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        value={customCustomerName}
                        onChange={(e) => setCustomCustomerName(e.target.value)}
                        placeholder="Enter customer name"
                      />
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="priority">Priority Level</Label>
                  <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low Priority</SelectItem>
                      <SelectItem value="medium">Medium Priority</SelectItem>
                      <SelectItem value="high">High Priority</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="specialInstructions">Special Instructions</Label>
                  <Textarea
                    id="specialInstructions"
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    placeholder="Any special instructions for the kitchen..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Order Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Order Summary</span>
                  <Badge className={getPriorityColor(priority)}>
                    {priority.toUpperCase()}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {orderItems.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No items added yet</p>
                ) : (
                  <div className="space-y-3">
                    {orderItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium">{item.name}</div>
                          <div className="text-sm text-gray-600">
                            {item.category} • {item.preparationTime} min
                          </div>
                          {item.specialInstructions && (
                            <div className="text-xs text-orange-600 mt-1">
                              Note: {item.specialInstructions}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateItemQuantity(item.id, item.quantity - 1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeItemFromOrder(item.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}

                    <Separator />

                    <div className="flex justify-between items-center font-medium">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Estimated Time: {calculateEstimatedTime()} min
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Total: ${(calculateTotal()).toFixed(2)}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Menu Items */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Utensils className="h-5 w-5" />
                  Menu Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {menuItemsLoading ? (
                    <div className="text-center py-8 text-gray-500">
                      Loading menu items...
                    </div>
                  ) : menuItems.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No menu items available
                    </div>
                  ) : Object.entries(groupedMenuItems).length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      Menu items available but not categorized
                    </div>
                  ) : (
                    Object.entries(groupedMenuItems).map(([category, items]) => (
                      <div key={category}>
                        <h3 className="font-semibold text-sm text-gray-700 mb-2 uppercase tracking-wide">
                          {category}
                        </h3>
                        <div className="space-y-2">
                          {items.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                              onClick={() => addItemToOrder(item)}
                            >
                              <div className="flex-1">
                                <div className="font-medium">{item.name}</div>
                                <div className="text-sm text-gray-600">
                                  {item.description}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {item.preparationTime || 15} min • ${((item.price || 0) / 100).toFixed(2)}
                                </div>
                              </div>
                              <Button size="sm" variant="outline">
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-gray-600">
            {orderItems.length} items • Est. {calculateEstimatedTime()} min • ${calculateTotal().toFixed(2)}
            {selectedTableId && ` • Table ${tables.find(t => t.id.toString() === selectedTableId)?.table_number}`}
            {(selectedCustomerId || customCustomerName) && ` • ${useExistingCustomer 
              ? customers.find(c => c.id.toString() === selectedCustomerId)?.name 
              : customCustomerName}`}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handleDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={createOrderMutation.isPending || orderItems.length === 0}
              className="flex items-center gap-2"
            >
              {createOrderMutation.isPending ? (
                <>Processing...</>
              ) : (
                <>
                  <ShoppingCart className="h-4 w-4" />
                  Send to Kitchen
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}