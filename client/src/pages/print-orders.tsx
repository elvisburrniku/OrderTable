import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { PrintOrderForm } from '@/components/print-order-form';
import { Printer, Award, Truck, Star, Settings, Package, Info, Plus, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { apiRequest } from '@/lib/queryClient';

interface PrintOrder {
  id: number;
  restaurantId: number;
  tenantId?: number;
  menuType: string;
  quantity: number;
  paperSize: string;
  printOptions: any;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  orderDate: string;
  estimatedDelivery?: string;
  totalCost: number;
  notes?: string;
}

interface Restaurant {
  id: number;
  name: string;
  tenantId: number;
}

export default function PrintOrders() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  // Get current restaurant from session
  const { data: restaurant } = useQuery<Restaurant>({
    queryKey: ['/api/auth/validate'],
    select: (data: any) => data?.user?.restaurant
  });

  // Fetch print orders
  const { data: printOrders = [], isLoading } = useQuery<PrintOrder[]>({
    queryKey: [`/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/print-orders`],
    enabled: !!restaurant?.id && !!restaurant?.tenantId
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (orderId: number) => 
      apiRequest(`/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/print-orders/${orderId}`, {
        method: 'DELETE'
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/print-orders`]
      });
      toast({
        title: "Order deleted",
        description: "Print order has been successfully deleted.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete print order",
        variant: "destructive",
      });
    }
  });

  const handleOrderCreated = () => {
    queryClient.invalidateQueries({
      queryKey: [`/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/print-orders`]
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Pending', variant: 'outline' as const },
      in_progress: { label: 'In Progress', variant: 'default' as const },
      completed: { label: 'Completed', variant: 'secondary' as const },
      cancelled: { label: 'Cancelled', variant: 'destructive' as const }
    };
    
    return statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-green-100 p-2 rounded-lg">
                <Printer className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Print Orders</h1>
                <p className="text-gray-600">Manage your printing requests and orders</p>
              </div>
            </div>
            <Button className="bg-green-600 hover:bg-green-700 text-white">
              <Plus className="h-4 w-4 mr-2" />
              New Print Order
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="print-orders" className="space-y-8">
          <TabsList className="grid w-fit grid-cols-3 bg-gray-100">
            <TabsTrigger value="print-orders" className="px-6">Print Orders</TabsTrigger>
            <TabsTrigger value="create-order" className="px-6">Create Order</TabsTrigger>
            <TabsTrigger value="menu-printing" className="px-6">Menu Printing</TabsTrigger>
          </TabsList>

          <TabsContent value="print-orders" className="space-y-6">
            {/* Orders Table */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Orders</CardTitle>
                <CardDescription>View and manage your print orders</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
                      <p className="text-gray-600">Loading orders...</p>
                    </div>
                  </div>
                ) : printOrders.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No orders yet</h3>
                    <p className="text-gray-600">Start by creating your first print order</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 font-medium text-gray-900">Order ID</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900">Menu Type</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900">Quantity</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900">Cost</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900">Order Date</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {printOrders.map((order) => {
                          const statusConfig = getStatusBadge(order.status);
                          return (
                            <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-3 px-4 text-gray-900">#{order.id}</td>
                              <td className="py-3 px-4 text-gray-900">{order.menuType}</td>
                              <td className="py-3 px-4 text-gray-600">{order.quantity}</td>
                              <td className="py-3 px-4">
                                <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                              </td>
                              <td className="py-3 px-4 text-gray-900">${order.totalCost.toFixed(2)}</td>
                              <td className="py-3 px-4 text-gray-600">
                                {new Date(order.orderDate).toLocaleDateString()}
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center space-x-2">
                                  <Button variant="ghost" size="sm">
                                    <Info className="h-4 w-4" />
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete Order</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to delete order #{order.id}? This action cannot be undone.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => deleteMutation.mutate(order.id)}
                                          className="bg-red-600 hover:bg-red-700"
                                        >
                                          Delete
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="create-order" className="space-y-6">
            <PrintOrderForm
              restaurantId={restaurant?.id || 1}
              tenantId={restaurant?.tenantId}
              onOrderCreated={handleOrderCreated}
            />
          </TabsContent>

          <TabsContent value="menu-printing" className="space-y-6">
            {/* Professional Menu Printing Service */}
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Professional Menu Printing Service</h2>
              <p className="text-gray-600">Order high-quality printed menus delivered directly to your restaurant</p>
            </div>

            {/* Service Features */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <Card className="text-center">
                <CardContent className="pt-6">
                  <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Award className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Professional Quality</h3>
                  <p className="text-gray-600 text-sm">Restaurant-grade printing with premium materials</p>
                </CardContent>
              </Card>

              <Card className="text-center">
                <CardContent className="pt-6">
                  <div className="bg-green-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Truck className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Fast Delivery</h3>
                  <p className="text-gray-600 text-sm">Quick turnaround with multiple shipping options</p>
                </CardContent>
              </Card>

              <Card className="text-center">
                <CardContent className="pt-6">
                  <div className="bg-yellow-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Star className="h-6 w-6 text-yellow-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Custom Design</h3>
                  <p className="text-gray-600 text-sm">Your menu design with professional formatting</p>
                </CardContent>
              </Card>
            </div>

            {/* Printing Options and Order Configuration */}
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Printing Options */}
              <Card>
                <CardHeader className="flex flex-row items-center space-y-0">
                  <Settings className="h-5 w-5 mr-2" />
                  <CardTitle>Printing Options</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Standard Print */}
                  <div className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-medium text-gray-900">Standard Print</h4>
                        <p className="text-sm text-gray-600">High-quality digital printing on premium paper</p>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-gray-900">$2.5</div>
                        <div className="text-sm text-gray-600">per menu</div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 space-y-1">
                      <div>Paper: 24lb Bond Paper</div>
                      <div>Finish: Matte</div>
                      <div>Durability: 3-6 months</div>
                      <div>Min Order: 25</div>
                    </div>
                  </div>

                  {/* Premium Print */}
                  <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
                    <div className="flex items-center mb-2">
                      <Badge className="bg-blue-600 text-white mr-2">Recommended</Badge>
                    </div>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-medium text-gray-900">Premium Print</h4>
                        <p className="text-sm text-gray-600">Professional offset printing with enhanced colors</p>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-gray-900">$4.75</div>
                        <div className="text-sm text-gray-600">per menu</div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 space-y-1">
                      <div>Paper: 32lb Cover Stock</div>
                      <div>Finish: Satin</div>
                      <div>Durability: 6-12 months</div>
                      <div>Min Order: 50</div>
                    </div>
                  </div>

                  {/* Deluxe Laminated */}
                  <div className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-medium text-gray-900">Deluxe Laminated</h4>
                        <p className="text-sm text-gray-600">Waterproof laminated menus for heavy use</p>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-gray-900">$7.25</div>
                        <div className="text-sm text-gray-600">per menu</div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 space-y-1">
                      <div>Paper: Laminated</div>
                      <div>Finish: Gloss</div>
                      <div>Durability: 12+ months</div>
                      <div>Min Order: 25</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Order Configuration */}
              <Card>
                <CardHeader className="flex flex-row items-center space-y-0">
                  <Package className="h-5 w-5 mr-2" />
                  <CardTitle>Order Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">Quantity</label>
                    <input 
                      type="number" 
                      defaultValue="50" 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-3">Shipping Method</label>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 border rounded-lg bg-blue-50 border-blue-200">
                        <div>
                          <div className="font-medium text-gray-900">Standard Shipping</div>
                          <div className="text-sm text-gray-600">Reliable delivery via ground shipping</div>
                          <div className="text-xs text-gray-500">5-7 business days</div>
                        </div>
                        <div className="text-lg font-bold text-gray-900">$15.99</div>
                      </div>

                      <div className="flex justify-between items-center p-3 border rounded-lg">
                        <div>
                          <div className="font-medium text-gray-900">Expedited Shipping</div>
                          <div className="text-sm text-gray-600">Faster delivery for urgent orders</div>
                          <div className="text-xs text-gray-500">2-3 business days</div>
                        </div>
                        <div className="text-lg font-bold text-gray-900">$29.99</div>
                      </div>

                      <div className="flex justify-between items-center p-3 border rounded-lg">
                        <div>
                          <div className="font-medium text-gray-900">Overnight Express</div>
                          <div className="text-sm text-gray-600">Next business day delivery</div>
                          <div className="text-xs text-gray-500">1 business day</div>
                        </div>
                        <div className="text-lg font-bold text-gray-900">$49.95</div>
                      </div>
                    </div>
                  </div>

                  <Button className="w-full bg-green-600 hover:bg-green-700 text-white py-3">
                    Place Order - $252.49
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}