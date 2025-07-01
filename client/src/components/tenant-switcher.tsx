import { useState } from "react";
import { Building2, Plus, Crown } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const createRestaurantSchema = z.object({
  name: z.string().min(1, "Restaurant name is required"),
  description: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  cuisine: z.string().optional(),
});

type CreateRestaurantData = z.infer<typeof createRestaurantSchema>;

interface Restaurant {
  id: number;
  name: string;
  tenantId: number;
  description?: string;
  address?: string;
  cuisine?: string;
}

interface Tenant {
  id: number;
  name: string;
  subscriptionStatus: string;
  maxRestaurants: number;
  restaurants: Restaurant[];
  isOwner: boolean;
}

interface TenantSwitcherProps {
  currentTenantId?: number;
  currentRestaurantId?: number;
  onTenantChange?: (tenantId: number) => void;
}

export function TenantSwitcher({ currentTenantId, currentRestaurantId, onTenantChange }: TenantSwitcherProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tenants, isLoading } = useQuery<Tenant[]>({
    queryKey: ["/api/user/tenants"],
  });

  const form = useForm<CreateRestaurantData>({
    resolver: zodResolver(createRestaurantSchema),
    defaultValues: {
      name: "",
      description: "",
      address: "",
      phone: "",
      email: "",
      cuisine: "",
    },
  });

  const createRestaurantMutation = useMutation({
    mutationFn: async (data: CreateRestaurantData) => {
      const response = await apiRequest("POST", "/api/restaurants", data);
      return response.json();
    },
    onSuccess: (newRestaurant: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/tenants"] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({
        title: "Restaurant Created",
        description: `${newRestaurant?.name || 'Restaurant'} has been created successfully.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error Creating Restaurant",
        description: error.message || "Failed to create restaurant",
        variant: "destructive",
      });
    },
  });

  const switchTenantMutation = useMutation({
    mutationFn: (tenantId: number) =>
      apiRequest("POST", "/api/user/switch-tenant", { tenantId }),
    onSuccess: () => {
      window.location.reload();
    },
    onError: (error: any) => {
      toast({
        title: "Error Switching Restaurant",
        description: error.message || "Failed to switch restaurant",
        variant: "destructive",
      });
    },
  });

  const switchRestaurantMutation = useMutation({
    mutationFn: (restaurantId: number) =>
      apiRequest("POST", "/api/user/switch-restaurant", { restaurantId }),
    onSuccess: () => {
      window.location.reload();
    },
    onError: (error: any) => {
      toast({
        title: "Error Switching Restaurant",
        description: error.message || "Failed to switch restaurant",
        variant: "destructive",
      });
    },
  });

  const handleSwitchTenant = (tenantId: number) => {
    if (tenantId === currentTenantId) return;
    switchTenantMutation.mutate(tenantId);
  };

  const handleSwitchRestaurant = (restaurantId: number) => {
    if (restaurantId === currentRestaurantId) return;
    switchRestaurantMutation.mutate(restaurantId);
  };

  const onSubmit = (data: CreateRestaurantData) => {
    createRestaurantMutation.mutate(data);
  };

  const currentTenant = tenants?.find(t => t.id === currentTenantId);
  const allRestaurants = tenants?.flatMap(t => t.restaurants || []) || [];
  const currentRestaurant = allRestaurants.find(r => r?.tenantId === currentTenantId);
  
  const canCreateRestaurant = currentTenant && 
    currentTenant.isOwner && 
    currentTenant.restaurants.length < currentTenant.maxRestaurants;

  if (isLoading) {
    return (
      <div className="w-[200px] h-10 bg-muted animate-pulse rounded-md" />
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-start gap-2 bg-white/50 backdrop-blur-sm border-white/20 hover:bg-white/70 transition-all duration-200"
          >
            <Building2 className="h-4 w-4" />
            <span className="truncate">
              {currentRestaurant?.name || "Select Restaurant"}
            </span>
            {currentTenant?.isOwner && (
              <Crown className="h-3 w-3 ml-auto text-amber-500" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[250px]">
          {allRestaurants.length > 0 ? (
            <>
              {allRestaurants.map((restaurant) => (
                <DropdownMenuItem
                  key={restaurant.id}
                  onClick={() => handleSwitchRestaurant(restaurant.id)}
                  className="cursor-pointer"
                >
                  <Building2 className="h-4 w-4 mr-2" />
                  <div className="flex-1">
                    <div className="font-medium">{restaurant.name}</div>
                    {restaurant.description && (
                      <div className="text-xs text-muted-foreground">
                        {restaurant.description}
                      </div>
                    )}
                  </div>
                  {restaurant.id === currentRestaurantId && (
                    <div className="w-2 h-2 bg-green-500 rounded-full ml-2" />
                  )}
                </DropdownMenuItem>
              ))}
              
              {canCreateRestaurant && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setIsCreateDialogOpen(true)}
                    className="cursor-pointer"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Restaurant
                  </DropdownMenuItem>
                </>
              )}
            </>
          ) : (
            <>
              <div className="px-2 py-1.5 text-sm text-muted-foreground">
                No restaurants available
              </div>
              {canCreateRestaurant && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setIsCreateDialogOpen(true)}
                    className="cursor-pointer"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Restaurant
                  </DropdownMenuItem>
                </>
              )}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Restaurant</DialogTitle>
            <DialogDescription>
              Create a new restaurant under your subscription plan.
              {currentTenant && (
                <span className="block mt-2 text-sm">
                  You can create {currentTenant.maxRestaurants - currentTenant.restaurants.length} more restaurant(s).
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Restaurant Name</Label>
              <Input
                id="name"
                {...form.register("name")}
                placeholder="Enter restaurant name"
              />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                {...form.register("description")}
                placeholder="Brief description of your restaurant"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address (optional)</Label>
              <Input
                id="address"
                {...form.register("address")}
                placeholder="Restaurant address"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cuisine">Cuisine Type (optional)</Label>
              <Input
                id="cuisine"
                {...form.register("cuisine")}
                placeholder="e.g., Italian, French, Mexican"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createRestaurantMutation.isPending}
              >
                {createRestaurantMutation.isPending ? "Creating..." : "Create Restaurant"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}