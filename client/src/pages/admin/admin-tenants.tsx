import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TenantTable } from "@/components/admin/tenant-table";
import { 
  Building, 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  Calendar,
  Users,
  CreditCard,
  AlertCircle,
  Pause,
  Play,
  Ban,
  RotateCcw,
  Settings,
  Activity,
  DollarSign
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

// Countdown component for paused tenants
function PauseCountdown({ pauseEndDate }: { pauseEndDate: string }) {
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date().getTime();
      const endTime = new Date(pauseEndDate).getTime();
      const difference = endTime - now;

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        if (days > 0) {
          setTimeLeft(`${days}d ${hours}h ${minutes}m`);
        } else if (hours > 0) {
          setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
        } else if (minutes > 0) {
          setTimeLeft(`${minutes}m ${seconds}s`);
        } else {
          setTimeLeft(`${seconds}s`);
        }
        setIsExpired(false);
      } else {
        setTimeLeft("Expired - Auto unpause pending");
        setIsExpired(true);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [pauseEndDate]);

  return (
    <div className={`text-sm font-mono ${isExpired ? 'text-orange-600' : 'text-blue-600'}`}>
      {timeLeft}
    </div>
  );
}

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
    pauseStartDate?: string;
    pauseEndDate?: string;
    pauseReason?: string;
    suspendReason?: string;
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
  restaurants: Array<{
    id: number;
    name: string;
    address: string;
    phone: string;
    email: string;
    setupCompleted: boolean;
    guestBookingEnabled: boolean;
    createdAt: string;
    userName: string;
    userEmail: string;
  }>;
  users: Array<{
    id: number;
    email: string;
    name: string;
    restaurantName: string;
    ssoProvider: string;
    createdAt: string;
    role: string;
  }>;
  recentBookingsCount: number;
}

interface SubscriptionPlan {
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
}

interface AdminTenantsProps {
  token: string;
}

export function AdminTenants({ token }: AdminTenantsProps) {
  const [tenants, setTenants] = useState<TenantData[]>([]);
  const [filteredTenants, setFilteredTenants] = useState<TenantData[]>([]);
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<TenantDetail | null>(null);
  const [editingTenant, setEditingTenant] = useState<Partial<TenantData> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingTenant, setIsLoadingTenant] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [suspendReason, setSuspendReason] = useState("");
  const [pauseUntil, setPauseUntil] = useState("");
  const [selectedSubscriptionPlan, setSelectedSubscriptionPlan] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchTenants();
    fetchSubscriptionPlans();
  }, []);

  useEffect(() => {
    filterTenants();
  }, [tenants, searchTerm, statusFilter]);

  const fetchTenants = async () => {
    try {
      const response = await fetch("/api/admin/tenants", {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch tenants");
      }

      const data = await response.json();
      setTenants(data);
    } catch (error) {
      console.error("Error fetching tenants:", error);
      toast({
        title: "Error",
        description: "Failed to load tenants",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSubscriptionPlans = async () => {
    try {
      const response = await fetch("/api/admin/subscription-plans", {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSubscriptionPlans(data);
      }
    } catch (error) {
      console.error("Error fetching subscription plans:", error);
    }
  };

  const fetchTenantDetail = async (tenantId: number) => {
    setIsLoadingTenant(true);
    try {
      // Add cache-busting parameter to force fresh data
      const cacheBuster = new Date().getTime();
      const response = await fetch(`/api/admin/tenants/${tenantId}?_cb=${cacheBuster}`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Cache-Control": "no-cache",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch tenant details");
      }

      const data = await response.json();
      console.log("Fetched tenant detail data:", data);
      setSelectedTenant(data);
    } catch (error) {
      console.error("Error fetching tenant details:", error);
      toast({
        title: "Error",
        description: "Failed to load tenant details",
        variant: "destructive",
      });
    } finally {
      setIsLoadingTenant(false);
    }
  };

  const updateTenant = async (tenantId: number, updateData: Partial<TenantData>) => {
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/admin/tenants/${tenantId}`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error("Failed to update tenant");
      }

      const updatedTenant = await response.json();
      
      // Update tenants list
      setTenants(prev => prev.map(t => t.tenant.id === tenantId ? { ...t, ...updatedTenant } : t));
      
      // Update selected tenant if it's the same one
      if (selectedTenant && selectedTenant.tenant.id === tenantId) {
        setSelectedTenant(prev => prev ? { ...prev, ...updatedTenant } : null);
      }

      toast({
        title: "Success",
        description: "Tenant updated successfully",
      });

      setShowEditDialog(false);
      setEditingTenant(null);
    } catch (error) {
      console.error("Error updating tenant:", error);
      toast({
        title: "Error",
        description: "Failed to update tenant",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const suspendTenant = async (tenantId: number, reason: string) => {
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/admin/tenants/${tenantId}/suspend`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason }),
      });

      if (!response.ok) {
        throw new Error("Failed to suspend tenant");
      }

      // Update tenant status
      setTenants(prev => prev.map(t => 
        t.tenant.id === tenantId ? { ...t, tenant: { ...t.tenant, subscriptionStatus: 'suspended' } } : t
      ));
      
      if (selectedTenant && selectedTenant.tenant.id === tenantId) {
        setSelectedTenant(prev => prev ? { ...prev, tenant: { ...prev.tenant, subscriptionStatus: 'suspended' } } : null);
      }

      toast({
        title: "Success",
        description: "Tenant suspended successfully",
      });

      setSuspendReason("");
    } catch (error) {
      console.error("Error suspending tenant:", error);
      toast({
        title: "Error",
        description: "Failed to suspend tenant",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const unsuspendTenant = async (tenantId: number) => {
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/admin/tenants/${tenantId}/unsuspend`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to unsuspend tenant");
      }

      // Refresh tenant data to get the correct status
      await fetchTenants();
      if (selectedTenant && selectedTenant.id === tenantId) {
        await fetchTenantDetail(tenantId);
      }

      toast({
        title: "Success",
        description: "Tenant unsuspended successfully",
      });
    } catch (error) {
      console.error("Error unsuspending tenant:", error);
      toast({
        title: "Error",
        description: "Failed to unsuspend tenant",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const pauseTenant = async (tenantId: number, pauseUntilDate?: string) => {
    setIsUpdating(true);
    try {
      // Validate pause until date
      if (!pauseUntilDate) {
        toast({
          title: "Error",
          description: "Please select a pause end date",
          variant: "destructive",
        });
        return;
      }

      const pauseDate = new Date(pauseUntilDate);
      if (pauseDate <= new Date()) {
        toast({
          title: "Error",
          description: "Pause end date must be in the future",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch(`/api/admin/tenants/${tenantId}/pause`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pauseUntil: pauseUntilDate }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to pause tenant");
      }

      const result = await response.json();

      // Update tenant status
      setTenants(prev => prev.map(t => 
        t.tenant.id === tenantId ? { 
          ...t, 
          tenant: { 
            ...t.tenant, 
            subscriptionStatus: 'paused',
            pauseStartDate: new Date().toISOString(),
            pauseEndDate: pauseUntilDate
          } 
        } : t
      ));
      
      if (selectedTenant && selectedTenant.tenant.id === tenantId) {
        setSelectedTenant(prev => prev ? { 
          ...prev, 
          tenant: { 
            ...prev.tenant, 
            subscriptionStatus: 'paused',
            pauseStartDate: new Date().toISOString(),
            pauseEndDate: pauseUntilDate
          } 
        } : null);
      }

      toast({
        title: "Success",
        description: result.message || "Tenant paused successfully",
      });

      setPauseUntil("");
    } catch (error) {
      console.error("Error pausing tenant:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to pause tenant",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const filterTenants = () => {
    let filtered = tenants;

    if (searchTerm) {
      filtered = filtered.filter(t => 
        t.tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.tenant.slug.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(t => t.tenant.subscriptionStatus === statusFilter);
    }

    setFilteredTenants(filtered);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      active: { variant: "default", label: "Active" },
      trial: { variant: "secondary", label: "Trial" },
      expired: { variant: "destructive", label: "Expired" },
      cancelled: { variant: "outline", label: "Cancelled" },
      suspended: { variant: "destructive", label: "Suspended" },
      paused: { variant: "secondary", label: "Paused" },
    };

    const config = variants[status] || { variant: "outline", label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const handleEditTenant = (tenantData: TenantData) => {
    setEditingTenant({
      tenant: {
        id: tenantData.tenant.id,
        name: tenantData.tenant.name,
        subscriptionStatus: tenantData.tenant.subscriptionStatus,
        subscriptionPlanId: tenantData.tenant.subscriptionPlanId,
        maxRestaurants: tenantData.tenant.maxRestaurants,
        additionalRestaurants: tenantData.tenant.additionalRestaurants,
        additionalRestaurantsCost: tenantData.tenant.additionalRestaurantsCost,
        stripeCustomerId: tenantData.tenant.stripeCustomerId,
        stripeSubscriptionId: tenantData.tenant.stripeSubscriptionId,
        slug: tenantData.tenant.slug,
        trialStartDate: tenantData.tenant.trialStartDate,
        trialEndDate: tenantData.tenant.trialEndDate,
        subscriptionStartDate: tenantData.tenant.subscriptionStartDate,
        subscriptionEndDate: tenantData.tenant.subscriptionEndDate,
        createdAt: tenantData.tenant.createdAt,
      },
      subscriptionPlan: tenantData.subscriptionPlan,
      restaurantCount: tenantData.restaurantCount,
      userCount: tenantData.userCount,
      bookingCount: tenantData.bookingCount,
    });
    setShowEditDialog(true);
  };

  const handleSubscriptionPriceUpdate = async (tenantId: number) => {
    if (!selectedSubscriptionPlan) {
      toast({
        title: "Error",
        description: "Please select a subscription plan",
        variant: "destructive",
      });
      return;
    }

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/admin/tenants/${tenantId}/subscription-price`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planId: parseInt(selectedSubscriptionPlan),
          updateStripe: true,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update subscription pricing");
      }

      const result = await response.json();
      
      // Update tenant in local state
      setTenants(prev => prev.map(t => 
        t.tenant.id === tenantId ? {
          ...t,
          tenant: { ...t.tenant, subscriptionPlanId: parseInt(selectedSubscriptionPlan) },
          subscriptionPlan: subscriptionPlans.find(p => p.id.toString() === selectedSubscriptionPlan) || t.subscriptionPlan
        } : t
      ));

      // Update selected tenant if viewing details
      if (selectedTenant && selectedTenant.tenant.id === tenantId) {
        const updatedPlan = subscriptionPlans.find(p => p.id.toString() === selectedSubscriptionPlan);
        setSelectedTenant(prev => prev ? {
          ...prev,
          tenant: { ...prev.tenant, subscriptionPlanId: parseInt(selectedSubscriptionPlan) },
          subscriptionPlan: updatedPlan || prev.subscriptionPlan
        } : null);
      }

      // Show success message with details
      const successMessage = result.stripe?.success 
        ? `Subscription updated successfully! Stripe billing updated with ${result.pricing?.priceChange > 0 ? 'upgrade' : 'downgrade'} proration.`
        : "Subscription plan updated locally. " + (result.stripe?.error ? `Stripe update failed: ${result.stripe.error}` : "No active Stripe subscription found.");

      toast({
        title: "Success",
        description: successMessage,
      });

      setSelectedSubscriptionPlan("");
    } catch (error) {
      console.error("Error updating subscription pricing:", error);
      toast({
        title: "Error",
        description: "Failed to update subscription pricing",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleViewTenant = async (tenantData: TenantData) => {
    await fetchTenantDetail(tenantData.tenant.id);
    setShowDetailDialog(true);
  };

  const handleSaveEdit = () => {
    if (editingTenant && editingTenant.tenant?.id) {
      const { tenant, ...updateData } = editingTenant;
      updateTenant(tenant.id, { tenant, ...updateData });
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return format(new Date(dateString), "MMM dd, yyyy");
  };

  const getDaysRemaining = (endDate: string | null) => {
    if (!endDate) return null;
    const end = new Date(endDate);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Manage tenants, subscriptions, and system settings
          </p>
        </div>
        <Button onClick={fetchTenants} variant="outline" size="sm">
          <Building className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <TenantTable
        tenants={tenants}
        onViewTenant={fetchTenantDetail}
        onEditTenant={handleEditTenant}
        onPauseTenant={pauseTenant}
        onSuspendTenant={suspendTenant}
        onUnsuspendTenant={unsuspendTenant}
        selectedTenant={selectedTenant}
        isLoadingTenant={isLoadingTenant}
        showDetailDialog={showDetailDialog}
        setShowDetailDialog={setShowDetailDialog}
        isUpdating={isUpdating}
      />



      {/* Edit Tenant Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Tenant</DialogTitle>
            <DialogDescription>
              Update tenant information and subscription details
            </DialogDescription>
          </DialogHeader>
          
          {editingTenant && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tenant-name">Organization Name</Label>
                  <Input
                    id="tenant-name"
                    value={editingTenant.tenant?.name || ""}
                    onChange={(e) => setEditingTenant(prev => prev ? {
                      ...prev, 
                      tenant: { ...prev.tenant!, name: e.target.value }
                    } : null)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="subscription-status">Status</Label>
                  <Select
                    value={editingTenant.tenant?.subscriptionStatus || ""}
                    onValueChange={(value) => setEditingTenant(prev => prev ? {
                      ...prev,
                      tenant: { ...prev.tenant!, subscriptionStatus: value }
                    } : null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="trial">Trial</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="subscription-plan">Subscription Plan</Label>
                  <Select
                    value={editingTenant.tenant?.subscriptionPlanId?.toString() || ""}
                    onValueChange={(value) => setEditingTenant(prev => prev ? {
                      ...prev,
                      tenant: { ...prev.tenant!, subscriptionPlanId: parseInt(value) }
                    } : null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select plan" />
                    </SelectTrigger>
                    <SelectContent>
                      {subscriptionPlans.map((plan) => (
                        <SelectItem key={plan.id} value={plan.id.toString()}>
                          {plan.name} - ${(plan.price / 100).toFixed(2)}/{plan.interval}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="max-restaurants">Max Restaurants</Label>
                  <Input
                    id="max-restaurants"
                    type="number"
                    value={editingTenant.tenant?.maxRestaurants || ""}
                    onChange={(e) => setEditingTenant(prev => prev ? {
                      ...prev,
                      tenant: { ...prev.tenant!, maxRestaurants: parseInt(e.target.value) || 0 }
                    } : null)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="additional-restaurants">Additional Restaurants</Label>
                  <Input
                    id="additional-restaurants"
                    type="number"
                    value={editingTenant.tenant?.additionalRestaurants || ""}
                    onChange={(e) => setEditingTenant(prev => prev ? {
                      ...prev,
                      tenant: { ...prev.tenant!, additionalRestaurants: parseInt(e.target.value) || 0 }
                    } : null)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="additional-cost">Additional Cost (cents)</Label>
                  <Input
                    id="additional-cost"
                    type="number"
                    value={editingTenant.tenant?.additionalRestaurantsCost || ""}
                    onChange={(e) => setEditingTenant(prev => prev ? {
                      ...prev,
                      tenant: { ...prev.tenant!, additionalRestaurantsCost: parseInt(e.target.value) || 0 }
                    } : null)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="stripe-customer">Stripe Customer ID</Label>
                  <Input
                    id="stripe-customer"
                    value={editingTenant.tenant?.stripeCustomerId || ""}
                    onChange={(e) => setEditingTenant(prev => prev ? {
                      ...prev,
                      tenant: { ...prev.tenant!, stripeCustomerId: e.target.value }
                    } : null)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="stripe-subscription">Stripe Subscription ID</Label>
                  <Input
                    id="stripe-subscription"
                    value={editingTenant.tenant?.stripeSubscriptionId || ""}
                    onChange={(e) => setEditingTenant(prev => prev ? {
                      ...prev,
                      tenant: { ...prev.tenant!, stripeSubscriptionId: e.target.value }
                    } : null)}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowEditDialog(false)}
                  disabled={isUpdating}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveEdit}
                  disabled={isUpdating}
                >
                  {isUpdating ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
