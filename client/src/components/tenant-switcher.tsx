import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ChevronDown, Plus, Building2, Crown } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const createRestaurantSchema = z.object({
  name: z.string().min(1, "Restaurant name is required"),
  slug: z.string().min(1, "URL slug is required").regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens"),
});

type CreateRestaurantData = z.infer<typeof createRestaurantSchema>;

interface Tenant {
  id: number;
  name: string;
  slug: string;
  subscriptionStatus: string;
  maxRestaurants: number;
  restaurantCount: number;
  isOwner: boolean;
}

interface TenantSwitcherProps {
  currentTenant?: Tenant;
  onTenantChange?: (tenantId: number) => void;
}

export function TenantSwitcher({ currentTenant, onTenantChange }: TenantSwitcherProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<CreateRestaurantData>({
    resolver: zodResolver(createRestaurantSchema),
    defaultValues: {
      name: "",
      slug: "",
    },
  });

  // Fetch user's tenants
  const { data: tenants = [], isLoading } = useQuery({
    queryKey: ["/api/user/tenants"],
    enabled: true,
  });

  // Generate slug from name
  const watchName = form.watch("name");
  useEffect(() => {
    if (watchName) {
      const slug = watchName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .trim();
      form.setValue("slug", slug);
    }
  }, [watchName, form]);

  const createRestaurantMutation = useMutation({
    mutationFn: (data: CreateRestaurantData) =>
      apiRequest("POST", "/api/tenants/create", data),
    onSuccess: (response: any) => {
      toast({
        title: "Restaurant Created",
        description: `${response.name} has been created successfully!`,
      });
      setIsCreateDialogOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/user/tenants"] });
      
      // Switch to the new tenant
      if (onTenantChange && response.id) {
        onTenantChange(response.id);
      }
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
      // Refresh the page to load the new tenant context
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
    if (tenantId === currentTenant?.id) return;
    switchTenantMutation.mutate(tenantId);
  };

  const onSubmit = (data: CreateRestaurantData) => {
    createRestaurantMutation.mutate(data);
  };

  const canCreateRestaurant = currentTenant && 
    currentTenant.isOwner && 
    currentTenant.restaurantCount < currentTenant.maxRestaurants;

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
            className="w-[200px] justify-between"
            disabled={switchTenantMutation.isPending}
          >
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span className="truncate">
                {currentTenant?.name || "Select Restaurant"}
              </span>
            </div>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[200px]" align="start">
          <DropdownMenuLabel>Your Restaurants</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            {(tenants as Tenant[]).map((tenant: Tenant) => (
              <DropdownMenuItem
                key={tenant.id}
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => handleSwitchTenant(tenant.id)}
              >
                <Building2 className="h-4 w-4" />
                <div className="flex-1">
                  <div className="flex items-center gap-1">
                    {tenant.name}
                    {tenant.isOwner && <Crown className="h-3 w-3 text-yellow-500" />}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {tenant.subscriptionStatus}
                  </div>
                </div>
                {tenant.id === currentTenant?.id && (
                  <div className="w-2 h-2 bg-primary rounded-full" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
          {canCreateRestaurant && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="flex items-center gap-2 cursor-pointer text-primary"
                onClick={() => setIsCreateDialogOpen(true)}
              >
                <Plus className="h-4 w-4" />
                Create New Restaurant
              </DropdownMenuItem>
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
                  You can create {currentTenant.maxRestaurants - currentTenant.restaurantCount} more restaurant(s).
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
              <Label htmlFor="slug">URL Slug</Label>
              <Input
                id="slug"
                {...form.register("slug")}
                placeholder="restaurant-url-slug"
              />
              {form.formState.errors.slug && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.slug.message}
                </p>
              )}
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