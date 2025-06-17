import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit2, Trash2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useTenant } from "@/lib/tenant";

const productGroupSchema = z.object({
  groupName: z.string().min(1, "Group name is required"),
  quantity: z.number().min(0, "Quantity must be 0 or greater"),
  status: z.enum(["active", "inactive"]),
});

type ProductGroupForm = z.infer<typeof productGroupSchema>;

interface ProductGroup {
  id: number;
  groupName: string;
  quantity: number;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

export default function ProductGroups() {
  const { user, restaurant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ProductGroup | null>(null);

  // Get restaurant info from authentication context
  const tenantId = restaurant?.tenantId;
  const restaurantId = restaurant?.id;

  const form = useForm<ProductGroupForm>({
    resolver: zodResolver(productGroupSchema),
    defaultValues: {
      groupName: "",
      quantity: 0,
      status: "active",
    },
  });

  // Fetch product groups
  const { data: productGroups = [], isLoading } = useQuery({
    queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/product-groups`],
    enabled: !!tenantId && !!restaurantId,
  });

  // Create product group mutation
  const createMutation = useMutation({
    mutationFn: async (data: ProductGroupForm) => {
      return await apiRequest("POST", `/api/tenants/${tenantId}/restaurants/${restaurantId}/product-groups`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/product-groups`] 
      });
      toast({
        title: "Success",
        description: "Product group created successfully",
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create product group",
        variant: "destructive",
      });
    },
  });

  // Update product group mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: ProductGroupForm }) => {
      return await apiRequest("PUT", `/api/tenants/${tenantId}/restaurants/${restaurantId}/product-groups/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/product-groups`] 
      });
      toast({
        title: "Success",
        description: "Product group updated successfully",
      });
      setIsDialogOpen(false);
      setEditingGroup(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update product group",
        variant: "destructive",
      });
    },
  });

  // Delete product group mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/tenants/${tenantId}/restaurants/${restaurantId}/product-groups/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/product-groups`] 
      });
      toast({
        title: "Success",
        description: "Product group deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete product group",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProductGroupForm) => {
    if (editingGroup) {
      updateMutation.mutate({ id: editingGroup.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (group: ProductGroup) => {
    setEditingGroup(group);
    form.reset({
      groupName: group.groupName,
      quantity: group.quantity,
      status: group.status,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this product group?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleNewGroup = () => {
    setEditingGroup(null);
    form.reset({
      groupName: "",
      quantity: 0,
      status: "active",
    });
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Product Groups</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your product inventory groups
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleNewGroup}>
              <Plus className="h-4 w-4 mr-2" />
              Add Product Group
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingGroup ? "Edit Product Group" : "Add New Product Group"}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="groupName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Group Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter group name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      setEditingGroup(null);
                      form.reset();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {createMutation.isPending || updateMutation.isPending ? (
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    ) : (
                      editingGroup ? "Update" : "Create"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {productGroups.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No product groups
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-center mb-4">
              Get started by creating your first product group to organize your inventory.
            </p>
            <Button onClick={handleNewGroup}>
              <Plus className="h-4 w-4 mr-2" />
              Add Product Group
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {productGroups.map((group: ProductGroup) => (
            <Card key={group.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{group.groupName}</CardTitle>
                  <Badge variant={group.status === "active" ? "default" : "secondary"}>
                    {group.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Quantity:</span>
                    <span className="font-medium">{group.quantity}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Created:</span>
                    <span className="text-sm">
                      {new Date(group.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 pt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(group)}
                      className="flex-1"
                    >
                      <Edit2 className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(group.id)}
                      disabled={deleteMutation.isPending}
                      className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}