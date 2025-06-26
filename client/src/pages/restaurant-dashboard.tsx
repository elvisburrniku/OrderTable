import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRestaurantAuth } from '@/lib/restaurant-auth';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import UsersManagement from './users-management';
import { 
  Plus, 
  Users, 
  Calendar, 
  ShoppingCart, 
  Table, 
  UserPlus,
  Building2,
  Settings,
  LogOut,
  Crown,
  Shield,
  Utensils
} from 'lucide-react';

interface Restaurant {
  id: number;
  name: string;
  address: string;
  phone: string;
  email: string;
  description: string;
}

interface Role {
  id: number;
  name: string;
  displayName: string;
  permissions: string;
  isSystem: boolean;
}

const PERMISSIONS = {
  BOOKINGS_VIEW: 'bookings.view',
  BOOKINGS_CREATE: 'bookings.create',
  ORDERS_VIEW: 'orders.view',
  ORDERS_CREATE: 'orders.create',
  CUSTOMERS_VIEW: 'customers.view',
  TABLES_VIEW: 'tables.view',
  TABLES_CREATE: 'tables.create',
  USERS_VIEW: 'users.view',
  USERS_CREATE: 'users.create',
  SETTINGS_VIEW: 'settings.view',
};

export default function RestaurantDashboard() {
  const { user, logout, hasPermission, restaurantLimit } = useRestaurantAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [selectedRestaurant, setSelectedRestaurant] = useState<number | null>(null);

  // Get user's restaurants (for owners)
  const { data: restaurants, isLoading: loadingRestaurants } = useQuery({
    queryKey: ['/api/restaurant/my-restaurants'],
    queryFn: async () => {
      const token = localStorage.getItem('restaurant_token');
      const response = await apiRequest('GET', '/api/restaurant/my-restaurants', undefined, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch restaurants');
      return response.json();
    },
    enabled: !user?.restaurantId, // Only for owners
  });

  // Get current restaurant data
  const restaurantId = user?.restaurantId || selectedRestaurant;
  const { data: currentRestaurant } = useQuery({
    queryKey: ['/api/restaurant', restaurantId],
    queryFn: async () => {
      const token = localStorage.getItem('restaurant_token');
      const response = await apiRequest('GET', `/api/restaurant/${restaurantId}`, undefined, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch restaurant');
      return response.json();
    },
    enabled: !!restaurantId,
  });

  // Get bookings for current restaurant
  const { data: bookings } = useQuery({
    queryKey: ['/api/restaurant', restaurantId, 'bookings'],
    queryFn: async () => {
      const token = localStorage.getItem('restaurant_token');
      const response = await apiRequest('GET', `/api/restaurant/${restaurantId}/bookings`, undefined, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch bookings');
      return response.json();
    },
    enabled: !!restaurantId && hasPermission(PERMISSIONS.BOOKINGS_VIEW),
  });

  // Get orders for current restaurant
  const { data: orders } = useQuery({
    queryKey: ['/api/restaurant', restaurantId, 'orders'],
    queryFn: async () => {
      const token = localStorage.getItem('restaurant_token');
      const response = await apiRequest('GET', `/api/restaurant/${restaurantId}/orders`, undefined, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch orders');
      return response.json();
    },
    enabled: !!restaurantId && hasPermission(PERMISSIONS.ORDERS_VIEW),
  });

  // Get restaurant users
  const { data: restaurantUsers } = useQuery({
    queryKey: ['/api/restaurant', restaurantId, 'users'],
    queryFn: async () => {
      const token = localStorage.getItem('restaurant_token');
      const response = await apiRequest('GET', `/api/restaurant/${restaurantId}/users`, undefined, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json();
    },
    enabled: !!restaurantId && hasPermission(PERMISSIONS.USERS_VIEW),
  });

  // Get tables
  const { data: tables } = useQuery({
    queryKey: ['/api/restaurant', restaurantId, 'tables'],
    queryFn: async () => {
      const token = localStorage.getItem('restaurant_token');
      const response = await apiRequest('GET', `/api/restaurant/${restaurantId}/tables`, undefined, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch tables');
      return response.json();
    },
    enabled: !!restaurantId && hasPermission(PERMISSIONS.TABLES_VIEW),
  });

  // Get roles for user invitations
  const { data: roles } = useQuery({
    queryKey: ['/api/restaurant/roles'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/restaurant/roles');
      if (!response.ok) throw new Error('Failed to fetch roles');
      return response.json();
    },
    enabled: hasPermission(PERMISSIONS.USERS_CREATE),
  });

  const createRestaurantMutation = useMutation({
    mutationFn: async (data: { name: string; address: string; phone: string; email: string; description: string }) => {
      const token = localStorage.getItem('restaurant_token');
      const response = await apiRequest('POST', '/api/restaurant', data, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create restaurant');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/restaurant/my-restaurants'] });
      toast({
        title: 'Restaurant created',
        description: 'Your new restaurant has been created successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create restaurant',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const inviteUserMutation = useMutation({
    mutationFn: async (data: { email: string; name: string; roleId: number }) => {
      const token = localStorage.getItem('restaurant_token');
      const response = await apiRequest('POST', `/api/restaurant/${restaurantId}/users/invite`, data, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to invite user');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/restaurant', restaurantId, 'users'] });
      toast({
        title: 'User invited',
        description: 'The user has been invited successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to invite user',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const createTableMutation = useMutation({
    mutationFn: async (data: { tableNumber: string; capacity: number }) => {
      const token = localStorage.getItem('restaurant_token');
      const response = await apiRequest('POST', `/api/restaurant/${restaurantId}/tables`, data, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create table');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/restaurant', restaurantId, 'tables'] });
      toast({
        title: 'Table created',
        description: 'The table has been created successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create table',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleLogout = () => {
    logout();
    setLocation('/restaurant-login');
  };

  const getRoleIcon = (roleName: string) => {
    switch (roleName) {
      case 'owner': return <Crown className="h-4 w-4" />;
      case 'manager': return <Shield className="h-4 w-4" />;
      case 'agent': return <Users className="h-4 w-4" />;
      case 'kitchen_staff': return <Utensils className="h-4 w-4" />;
      default: return <Users className="h-4 w-4" />;
    }
  };

  const getPermissionBadgeColor = (permission: string) => {
    if (permission.includes('delete')) return 'destructive';
    if (permission.includes('create') || permission.includes('edit')) return 'default';
    return 'secondary';
  };

  if (loadingRestaurants && !user?.restaurantId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Building2 className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">Restaurant Management</h1>
                <p className="text-muted-foreground">
                  Welcome, {user?.name}
                  {user?.permissions && (
                    <Badge variant="secondary" className="ml-2">
                      Staff Member
                    </Badge>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {!user?.restaurantId && restaurants && (
                <Select value={selectedRestaurant?.toString() || ''} onValueChange={(value) => setSelectedRestaurant(parseInt(value))}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Select a restaurant" />
                  </SelectTrigger>
                  <SelectContent>
                    {restaurants.map((restaurant: Restaurant) => (
                      <SelectItem key={restaurant.id} value={restaurant.id.toString()}>
                        {restaurant.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!restaurantId ? (
          <div className="text-center py-12">
            <Building2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Restaurant Selected</h3>
            <p className="text-muted-foreground mb-6">
              {restaurants?.length === 0 
                ? "You don't have any restaurants yet. Create your first restaurant to get started."
                : "Please select a restaurant from the dropdown above."}
            </p>
            
            {restaurants?.length === 0 && restaurantLimit && (
              <div className="max-w-md mx-auto">
                <Card>
                  <CardHeader>
                    <CardTitle>Create Your First Restaurant</CardTitle>
                    <CardDescription>
                      You can create up to {restaurantLimit.maxAllowed} restaurants with your current plan.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        createRestaurantMutation.mutate({
                          name: formData.get('name') as string,
                          address: formData.get('address') as string,
                          phone: formData.get('phone') as string,
                          email: formData.get('email') as string,
                          description: formData.get('description') as string,
                        });
                      }}
                      className="space-y-4"
                    >
                      <div>
                        <Label htmlFor="name">Restaurant Name</Label>
                        <Input id="name" name="name" required />
                      </div>
                      <div>
                        <Label htmlFor="address">Address</Label>
                        <Input id="address" name="address" />
                      </div>
                      <div>
                        <Label htmlFor="phone">Phone</Label>
                        <Input id="phone" name="phone" type="tel" />
                      </div>
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" name="email" type="email" />
                      </div>
                      <div>
                        <Label htmlFor="description">Description</Label>
                        <Input id="description" name="description" />
                      </div>
                      <Button 
                        type="submit" 
                        className="w-full"
                        disabled={createRestaurantMutation.isPending}
                      >
                        {createRestaurantMutation.isPending ? 'Creating...' : 'Create Restaurant'}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        ) : (
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              {hasPermission(PERMISSIONS.BOOKINGS_VIEW) && (
                <TabsTrigger value="bookings">Bookings</TabsTrigger>
              )}
              {hasPermission(PERMISSIONS.ORDERS_VIEW) && (
                <TabsTrigger value="orders">Orders</TabsTrigger>
              )}
              {hasPermission(PERMISSIONS.TABLES_VIEW) && (
                <TabsTrigger value="tables">Tables</TabsTrigger>
              )}
              {hasPermission(PERMISSIONS.USERS_VIEW) && (
                <TabsTrigger value="users">Users</TabsTrigger>
              )}
              {hasPermission(PERMISSIONS.SETTINGS_VIEW) && (
                <TabsTrigger value="settings">Settings</TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {hasPermission(PERMISSIONS.BOOKINGS_VIEW) && (
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Today's Bookings</CardTitle>
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{bookings?.length || 0}</div>
                    </CardContent>
                  </Card>
                )}

                {hasPermission(PERMISSIONS.ORDERS_VIEW) && (
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
                      <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {orders?.filter((order: any) => order.status === 'pending').length || 0}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {hasPermission(PERMISSIONS.TABLES_VIEW) && (
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Tables</CardTitle>
                      <Table className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{tables?.length || 0}</div>
                    </CardContent>
                  </Card>
                )}

                {hasPermission(PERMISSIONS.USERS_VIEW) && (
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Team Members</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{restaurantUsers?.length || 0}</div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {currentRestaurant && (
                <Card>
                  <CardHeader>
                    <CardTitle>{currentRestaurant.name}</CardTitle>
                    <CardDescription>{currentRestaurant.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">📍 {currentRestaurant.address}</Badge>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">📞 {currentRestaurant.phone}</Badge>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">✉️ {currentRestaurant.email}</Badge>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {hasPermission(PERMISSIONS.BOOKINGS_VIEW) && (
              <TabsContent value="bookings" className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-3xl font-bold">Bookings</h2>
                  {hasPermission(PERMISSIONS.BOOKINGS_CREATE) && (
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      New Booking
                    </Button>
                  )}
                </div>

                <div className="grid gap-4">
                  {bookings?.map((booking: any) => (
                    <Card key={booking.id}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold">{booking.customerName}</h3>
                            <p className="text-sm text-muted-foreground">
                              {new Date(booking.bookingDate).toLocaleDateString()} at {booking.startTime}
                            </p>
                            <p className="text-sm">
                              {booking.guestCount} guests • Table {booking.tableId || 'Not assigned'}
                            </p>
                          </div>
                          <Badge variant={booking.status === 'confirmed' ? 'default' : 'secondary'}>
                            {booking.status}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {bookings?.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      No bookings found
                    </div>
                  )}
                </div>
              </TabsContent>
            )}

            {hasPermission(PERMISSIONS.ORDERS_VIEW) && (
              <TabsContent value="orders" className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-3xl font-bold">Orders</h2>
                  {hasPermission(PERMISSIONS.ORDERS_CREATE) && (
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      New Order
                    </Button>
                  )}
                </div>

                <div className="grid gap-4">
                  {orders?.map((order: any) => (
                    <Card key={order.id}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold">Order #{order.id}</h3>
                            <p className="text-sm text-muted-foreground">
                              ${(order.totalAmount / 100).toFixed(2)}
                            </p>
                            <p className="text-sm">
                              {JSON.parse(order.items).length} items
                            </p>
                          </div>
                          <Badge variant={order.status === 'pending' ? 'destructive' : 'default'}>
                            {order.status}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {orders?.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      No orders found
                    </div>
                  )}
                </div>
              </TabsContent>
            )}

            {hasPermission(PERMISSIONS.TABLES_VIEW) && (
              <TabsContent value="tables" className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-3xl font-bold">Tables</h2>
                  {hasPermission(PERMISSIONS.TABLES_CREATE) && (
                    <Button
                      onClick={() => {
                        const tableNumber = prompt('Table number:');
                        const capacity = prompt('Capacity:');
                        if (tableNumber && capacity) {
                          createTableMutation.mutate({
                            tableNumber,
                            capacity: parseInt(capacity),
                          });
                        }
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Table
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {tables?.map((table: any) => (
                    <Card key={table.id}>
                      <CardContent className="p-4 text-center">
                        <Table className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <h3 className="font-semibold">Table {table.tableNumber}</h3>
                        <p className="text-sm text-muted-foreground">{table.capacity} seats</p>
                        <Badge variant={table.isActive ? 'default' : 'secondary'} className="mt-2">
                          {table.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </CardContent>
                    </Card>
                  ))}

                  {tables?.length === 0 && (
                    <div className="col-span-full text-center py-12 text-muted-foreground">
                      No tables found
                    </div>
                  )}
                </div>
              </TabsContent>
            )}

            <TabsContent value="users" className="space-y-6">
              <UsersManagement restaurantId={1} />
            </TabsContent>

            {hasPermission(PERMISSIONS.SETTINGS_VIEW) && (
              <TabsContent value="settings" className="space-y-6">
                <h2 className="text-3xl font-bold">Settings</h2>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Restaurant Information</CardTitle>
                    <CardDescription>
                      Manage your restaurant's basic information
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">Settings panel coming soon...</p>
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        )}
      </div>
    </div>
  );
}