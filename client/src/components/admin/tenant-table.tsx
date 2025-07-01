import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, Edit, Pause, Play, Ban, Building, Users, Calendar, Search, Filter, ExternalLink } from "lucide-react";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface TenantData {
  tenant: {
    id: number;
    name: string;
    slug: string;
    subscriptionStatus: string;
    subscriptionPlanId: number;
    trialStartDate: string;
    trialEndDate: string;
    subscriptionStartDate: string;
    subscriptionEndDate: string;
    stripeCustomerId: string;
    stripeSubscriptionId: string;
    maxRestaurants: number;
    additionalRestaurants: number;
    additionalRestaurantsCost: number;
    createdAt: string;
  };
  subscriptionPlan: {
    id: number;
    name: string;
    price: number;
    interval: string;
    features: string;
    maxTables: number;
    maxBookingsPerMonth: number;
    maxRestaurants: number;
    trialDays: number;
    isActive: boolean;
  } | null;
  restaurantCount: number;
  userCount: number;
  bookingCount: number;
}

interface TenantDetail extends TenantData {
  restaurants?: Array<{
    id: number;
    name: string;
    address: string;
    phone: string;
    email: string;
    setupCompleted: boolean;
    guestBookingEnabled: boolean;
    isActive: boolean;
    createdAt: string;
    userName: string;
    userEmail: string;
  }>;
  users?: Array<{
    id: number;
    email: string;
    name: string;
    restaurantName: string;
    role: string;
    createdAt: string;
  }>;
  recentBookingsCount: number;
}

interface TenantTableProps {
  tenants: TenantData[];
  onViewTenant: (tenantId: number) => void;
  onEditTenant: (tenant: TenantData) => void;
  onPauseTenant: (tenantId: number) => void;
  onSuspendTenant: (tenantId: number, reason?: string) => void;
  onUnsuspendTenant: (tenantId: number) => void;
  selectedTenant: TenantDetail | null;
  isLoadingTenant: boolean;
  showDetailDialog: boolean;
  setShowDetailDialog: (show: boolean) => void;
  isUpdating?: boolean;
}

export function TenantTable({ 
  tenants, 
  onViewTenant, 
  onEditTenant, 
  onPauseTenant,
  onSuspendTenant,
  onUnsuspendTenant, 
  selectedTenant, 
  isLoadingTenant,
  showDetailDialog,
  setShowDetailDialog,
  isUpdating = false
}: TenantTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [suspendReason, setSuspendReason] = useState("");

  const filteredTenants = tenants.filter(tenant => {
    const matchesSearch = tenant.tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tenant.tenant.slug.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || tenant.tenant.subscriptionStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { className: string; label: string }> = {
      active: { className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300", label: "Active" },
      trial: { className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300", label: "Trial" },
      expired: { className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300", label: "Expired" },
      cancelled: { className: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300", label: "Cancelled" },
      suspended: { className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300", label: "Suspended" },
      paused: { className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300", label: "Paused" },
    };

    const config = variants[status] || { className: "bg-gray-100 text-gray-800", label: status };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatPrice = (price: number) => {
    return `$${(price / 100).toFixed(2)}`;
  };

  const handleViewTenant = (tenantId: number) => {
    onViewTenant(tenantId);
    setShowDetailDialog(true);
  };

  return (
    <div className="space-y-6">
      {/* Header with Search and Filters */}
      <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-xl">
              <Building className="h-6 w-6 text-blue-600" />
              Tenant Management
            </span>
            <span className="text-sm font-normal text-muted-foreground px-3 py-1 bg-white dark:bg-gray-800 rounded-full">
              {filteredTenants.length} of {tenants.length} tenants
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tenants by name or slug..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white dark:bg-gray-800"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px] bg-white dark:bg-gray-800">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="trial">Trial</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Main Table */}
      <Card className="shadow-lg">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 dark:bg-gray-800">
                  <TableHead className="font-semibold">Tenant</TableHead>
                  <TableHead className="font-semibold">Subscription</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Resources</TableHead>
                  <TableHead className="font-semibold">Created</TableHead>
                  <TableHead className="font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTenants.map((tenantData) => (
                  <TableRow key={tenantData.tenant.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium text-base">{tenantData.tenant.name}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <span>{tenantData.tenant.slug}</span>
                          <ExternalLink className="h-3 w-3" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">
                          {tenantData.subscriptionPlan?.name || "No Plan"}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {tenantData.subscriptionPlan ? 
                            `${formatPrice(tenantData.subscriptionPlan.price)}/${tenantData.subscriptionPlan.interval}` 
                            : "Free"
                          }
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(tenantData.tenant.subscriptionStatus)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-4 text-sm">
                        <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-900 rounded">
                          <Building className="h-3 w-3 text-blue-600" />
                          <span className="font-medium">{tenantData.restaurantCount}</span>
                        </div>
                        <div className="flex items-center gap-1 px-2 py-1 bg-green-50 dark:bg-green-900 rounded">
                          <Users className="h-3 w-3 text-green-600" />
                          <span className="font-medium">{tenantData.userCount}</span>
                        </div>
                        <div className="flex items-center gap-1 px-2 py-1 bg-purple-50 dark:bg-purple-900 rounded">
                          <Calendar className="h-3 w-3 text-purple-600" />
                          <span className="font-medium">{tenantData.bookingCount}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {formatDate(tenantData.tenant.createdAt)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewTenant(tenantData.tenant.id)}
                          className="hover:bg-blue-50 dark:hover:bg-blue-900"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEditTenant(tenantData)}
                          className="hover:bg-green-50 dark:hover:bg-green-900"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        
                        {tenantData.tenant.subscriptionStatus === 'suspended' ? (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="hover:bg-green-50 dark:hover:bg-green-900">
                                <Play className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Unsuspend Tenant</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to unsuspend {tenantData.tenant.name}? 
                                  Their service will be restored immediately.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => onUnsuspendTenant(tenantData.tenant.id)}
                                  disabled={isUpdating}
                                >
                                  Unsuspend
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        ) : tenantData.tenant.subscriptionStatus === 'paused' ? (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="hover:bg-green-50 dark:hover:bg-green-900">
                                <Play className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Resume Tenant</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to resume {tenantData.tenant.name}? 
                                  Their service will be restored and billing will continue.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => onUnsuspendTenant(tenantData.tenant.id)}
                                  disabled={isUpdating}
                                >
                                  Resume
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        ) : (
                          <>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="hover:bg-red-50 dark:hover:bg-red-900">
                                  <Ban className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Suspend Tenant</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will immediately suspend {tenantData.tenant.name} and block access to their system.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <div className="py-4">
                                  <Label htmlFor="suspend-reason">Reason (optional)</Label>
                                  <Textarea
                                    id="suspend-reason"
                                    placeholder="Enter reason for suspension..."
                                    value={suspendReason}
                                    onChange={(e) => setSuspendReason(e.target.value)}
                                    className="mt-2"
                                  />
                                </div>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => {
                                      onSuspendTenant(tenantData.tenant.id, suspendReason);
                                      setSuspendReason("");
                                    }}
                                    disabled={isUpdating}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Suspend
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onPauseTenant(tenantData.tenant.id)}
                              className="hover:bg-yellow-50 dark:hover:bg-yellow-900"
                            >
                              <Pause className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Tenant Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Building className="h-6 w-6 text-blue-600" />
              {selectedTenant?.tenant.name || "Tenant Details"}
              <Badge className="ml-2">
                ID: {selectedTenant?.tenant.id}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          
          {isLoadingTenant ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : selectedTenant ? (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-6">
                <TabsTrigger value="overview" className="flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="subscription">Subscription</TabsTrigger>
                <TabsTrigger value="restaurants">
                  Restaurants ({selectedTenant.restaurants?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="users">
                  Users ({selectedTenant.users?.length || 0})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="shadow-md">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Building className="h-5 w-5" />
                        Basic Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm font-medium text-muted-foreground">Name</div>
                          <div className="font-medium">{selectedTenant.tenant.name}</div>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-muted-foreground">Slug</div>
                          <div className="font-medium">{selectedTenant.tenant.slug}</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm font-medium text-muted-foreground">Status</div>
                          {getStatusBadge(selectedTenant.tenant.subscriptionStatus)}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-muted-foreground">Created</div>
                          <div className="font-medium">
                            {formatDate(selectedTenant.tenant.createdAt)}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="shadow-md">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Resource Usage
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4 text-blue-600" />
                            <span className="font-medium">Restaurants</span>
                          </div>
                          <span className="font-bold text-lg">
                            {selectedTenant.restaurantCount} / {selectedTenant.tenant.maxRestaurants}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-green-600" />
                            <span className="font-medium">Users</span>
                          </div>
                          <span className="font-bold text-lg">{selectedTenant.userCount}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-purple-50 dark:bg-purple-900 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-purple-600" />
                            <span className="font-medium">Total Bookings</span>
                          </div>
                          <span className="font-bold text-lg">{selectedTenant.bookingCount}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="subscription" className="space-y-6">
                {selectedTenant.subscriptionPlan ? (
                  <Card className="shadow-md">
                    <CardHeader>
                      <CardTitle className="text-lg">Subscription Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div>
                            <div className="text-sm font-medium text-muted-foreground">Plan</div>
                            <div className="text-2xl font-bold text-blue-600">{selectedTenant.subscriptionPlan.name}</div>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-muted-foreground">Price</div>
                            <div className="text-2xl font-bold text-green-600">
                              {formatPrice(selectedTenant.subscriptionPlan.price)}/{selectedTenant.subscriptionPlan.interval}
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <div className="text-sm font-medium text-muted-foreground mb-3">Features</div>
                          <div className="space-y-2">
                            {JSON.parse(selectedTenant.subscriptionPlan.features).map((feature: string, index: number) => (
                              <div key={index} className="flex items-center gap-2 text-sm">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                {feature}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t">
                        <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">
                            {selectedTenant.subscriptionPlan.maxTables}
                          </div>
                          <div className="text-sm text-muted-foreground">Max Tables</div>
                        </div>
                        <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">
                            {selectedTenant.subscriptionPlan.maxBookingsPerMonth}
                          </div>
                          <div className="text-sm text-muted-foreground">Max Bookings/Month</div>
                        </div>
                        <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <div className="text-2xl font-bold text-purple-600">
                            {selectedTenant.subscriptionPlan.maxRestaurants}
                          </div>
                          <div className="text-sm text-muted-foreground">Max Restaurants</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="shadow-md">
                    <CardContent className="py-12 text-center">
                      <div className="text-muted-foreground text-lg">No subscription plan assigned</div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="restaurants" className="space-y-4">
                {selectedTenant.restaurants && selectedTenant.restaurants.length > 0 ? (
                  <div className="grid gap-4">
                    {selectedTenant.restaurants.map((restaurant) => (
                      <Card key={restaurant.id} className="shadow-md hover:shadow-lg transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex justify-between items-start">
                            <div className="space-y-3 flex-1">
                              <div className="flex items-center gap-3">
                                <h3 className="text-lg font-bold">{restaurant.name}</h3>
                                <Badge variant="outline">ID: {restaurant.id}</Badge>
                              </div>
                              <div className="text-muted-foreground">{restaurant.address}</div>
                              <div className="flex gap-4 text-sm text-muted-foreground">
                                <span>{restaurant.phone}</span>
                                <span>{restaurant.email}</span>
                              </div>
                              <div className="text-sm">
                                <span className="font-medium">Owner:</span> {restaurant.userName} ({restaurant.userEmail})
                              </div>
                            </div>
                            <div className="text-right space-y-3">
                              <div className="text-sm text-muted-foreground">
                                Created: {formatDate(restaurant.createdAt)}
                              </div>
                              <div className="flex gap-2">
                                <Badge variant={restaurant.setupCompleted ? "default" : "secondary"}>
                                  {restaurant.setupCompleted ? "Complete" : "Setup Pending"}
                                </Badge>
                                <Badge variant={restaurant.isActive ? "default" : "secondary"}>
                                  {restaurant.isActive ? "Active" : "Inactive"}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="shadow-md">
                    <CardContent className="py-12 text-center">
                      <Building className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                      <div className="text-lg text-muted-foreground">No restaurants found for this tenant</div>
                      <div className="text-sm text-muted-foreground mt-2">
                        This tenant hasn't created any restaurants yet.
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="users" className="space-y-4">
                {selectedTenant.users && selectedTenant.users.length > 0 ? (
                  <div className="grid gap-4">
                    {selectedTenant.users.map((user) => (
                      <Card key={user.id} className="shadow-md hover:shadow-lg transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex justify-between items-start">
                            <div className="space-y-3 flex-1">
                              <div className="flex items-center gap-3">
                                <h3 className="text-lg font-bold">{user.name}</h3>
                                <Badge variant="outline">ID: {user.id}</Badge>
                              </div>
                              <div className="text-muted-foreground">{user.email}</div>
                              {user.restaurantName && (
                                <div className="text-sm">
                                  <span className="font-medium">Restaurant:</span> {user.restaurantName}
                                </div>
                              )}
                            </div>
                            <div className="text-right space-y-3">
                              <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                                {user.role}
                              </Badge>
                              <div className="text-sm text-muted-foreground">
                                Joined: {formatDate(user.createdAt)}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="shadow-md">
                    <CardContent className="py-12 text-center">
                      <Users className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                      <div className="text-lg text-muted-foreground">No users found for this tenant</div>
                      <div className="text-sm text-muted-foreground mt-2">
                        This tenant doesn't have any users yet.
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}