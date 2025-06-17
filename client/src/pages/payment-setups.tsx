import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Edit2, Trash2, Check, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";

const paymentSetupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  method: z.enum(["capture_amount", "reserve_amount", "membership_fee"]),
  type: z.enum(["deposit", "prepayment", "membership"]),
  priceType: z.enum(["one_price", "multiple_prices"]),
  amount: z.number().min(0, "Amount must be 0 or greater"),
  currency: z.enum(["EUR", "USD", "GBP"]),
  priceUnit: z.enum(["per_guest", "per_booking", "per_table"]),
  allowResidual: z.boolean(),
  residualAmount: z.number().min(0).optional(),
  cancellationNotice: z.enum(["24_hours", "48_hours", "72_hours", "1_week"]),
  description: z.string().optional(),
  language: z.enum(["en", "fr", "de", "es", "it"]),
});

type PaymentSetupForm = z.infer<typeof paymentSetupSchema>;

interface PaymentSetup {
  id: number;
  name: string;
  method: string;
  type: string;
  priceType: string;
  amount: number;
  currency: string;
  priceUnit: string;
  allowResidual: boolean;
  residualAmount?: number;
  cancellationNotice: string;
  description?: string;
  language: string;
  createdAt: string;
}

export default function PaymentSetups() {
  const { user, restaurant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSetup, setEditingSetup] = useState<PaymentSetup | null>(null);

  const tenantId = restaurant?.tenantId;
  const restaurantId = restaurant?.id;

  const form = useForm<PaymentSetupForm>({
    resolver: zodResolver(paymentSetupSchema),
    defaultValues: {
      name: "",
      method: "capture_amount",
      type: "deposit",
      priceType: "one_price",
      amount: 0,
      currency: "EUR",
      priceUnit: "per_guest",
      allowResidual: false,
      residualAmount: 0,
      cancellationNotice: "24_hours",
      description: "",
      language: "en",
    },
  });

  // Fetch payment setups
  const { data: paymentSetups = [], isLoading } = useQuery({
    queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/payment-setups`],
    enabled: !!tenantId && !!restaurantId,
  });

  // Create payment setup mutation
  const createMutation = useMutation({
    mutationFn: async (data: PaymentSetupForm) => {
      return await apiRequest("POST", `/api/tenants/${tenantId}/restaurants/${restaurantId}/payment-setups`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/payment-setups`] 
      });
      toast({
        title: "Success",
        description: "Payment setup created successfully",
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create payment setup",
        variant: "destructive",
      });
    },
  });

  // Update payment setup mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: PaymentSetupForm }) => {
      return await apiRequest("PUT", `/api/tenants/${tenantId}/restaurants/${restaurantId}/payment-setups/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/payment-setups`] 
      });
      toast({
        title: "Success",
        description: "Payment setup updated successfully",
      });
      setIsDialogOpen(false);
      setEditingSetup(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update payment setup",
        variant: "destructive",
      });
    },
  });

  // Delete payment setup mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/tenants/${tenantId}/restaurants/${restaurantId}/payment-setups/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/payment-setups`] 
      });
      toast({
        title: "Success",
        description: "Payment setup deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete payment setup",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: PaymentSetupForm) => {
    if (editingSetup) {
      updateMutation.mutate({ id: editingSetup.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (setup: PaymentSetup) => {
    setEditingSetup(setup);
    form.reset({
      name: setup.name,
      method: setup.method as any,
      type: setup.type as any,
      priceType: setup.priceType as any,
      amount: setup.amount,
      currency: setup.currency as any,
      priceUnit: setup.priceUnit as any,
      allowResidual: setup.allowResidual,
      residualAmount: setup.residualAmount || 0,
      cancellationNotice: setup.cancellationNotice as any,
      description: setup.description || "",
      language: setup.language as any,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this payment setup?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleNewSetup = () => {
    setEditingSetup(null);
    form.reset();
    setIsDialogOpen(true);
  };

  const getMethodDisplayName = (method: string) => {
    switch (method) {
      case "capture_amount": return "Capture amount";
      case "reserve_amount": return "Reserve amount";
      case "membership_fee": return "Membership fee";
      default: return method;
    }
  };

  const getCancellationDisplayName = (notice: string) => {
    switch (notice) {
      case "24_hours": return "24 hours";
      case "48_hours": return "48 hours";
      case "72_hours": return "72 hours";
      case "1_week": return "1 week";
      default: return notice;
    }
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
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to the overview
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold mb-2">Payment setups</h1>
        <p className="text-gray-600">
          Do you want to receive prepayments or deposits from your guests, you can create one or more payment setup below.
        </p>
      </div>

      {/* Payment Setup Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button onClick={handleNewSetup} className="bg-green-600 hover:bg-green-700">
            <Plus className="h-4 w-4 mr-2" />
            Add payment setup
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSetup ? "Edit Payment Setup" : "Add Payment Setup"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name:</FormLabel>
                    <FormControl>
                      <Input placeholder="Pre payment" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Method */}
              <FormField
                control={form.control}
                name="method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Method:</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="grid grid-cols-3 gap-4"
                      >
                        <div className="border rounded-lg p-4 space-y-2">
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="capture_amount" id="capture" />
                            <Label htmlFor="capture" className="font-medium text-green-600">
                              Capture amount
                            </Label>
                          </div>
                          <p className="text-xs text-gray-600">
                            The amount is withdrawn immediately
                          </p>
                        </div>
                        <div className="border rounded-lg p-4 space-y-2">
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="reserve_amount" id="reserve" />
                            <Label htmlFor="reserve" className="font-medium">
                              Reserve amount
                            </Label>
                          </div>
                          <p className="text-xs text-gray-600">
                            The amount is reserved. It gets debited 8 hours before arrival or on last cancellation.
                          </p>
                        </div>
                        <div className="border rounded-lg p-4 space-y-2">
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="membership_fee" id="membership" />
                            <Label htmlFor="membership" className="font-medium">
                              Membership fee
                            </Label>
                          </div>
                          <p className="text-xs text-gray-600">
                            Saves credit card information and charges a fee in case of no-show cancellation.
                          </p>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Type */}
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type:</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="deposit">Deposit</SelectItem>
                        <SelectItem value="prepayment">Prepayment</SelectItem>
                        <SelectItem value="membership">Membership</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Price */}
              <FormField
                control={form.control}
                name="priceType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price:</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex space-x-6"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="one_price" id="one_price" />
                          <Label htmlFor="one_price">One price</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="multiple_prices" id="multiple_prices" />
                          <Label htmlFor="multiple_prices">Multiple prices</Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Amount and Currency */}
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="1"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="EUR">EUR</SelectItem>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="GBP">GBP</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="priceUnit"
                  render={({ field }) => (
                    <FormItem>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="per_guest">Per guest</SelectItem>
                          <SelectItem value="per_booking">Per booking</SelectItem>
                          <SelectItem value="per_table">Per table</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Allow Residual Payment */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={form.watch("allowResidual")}
                    onChange={(e) => form.setValue("allowResidual", e.target.checked)}
                    className="h-4 w-4"
                  />
                  <Label>Allow residual payment:</Label>
                </div>
                {form.watch("allowResidual") && (
                  <FormField
                    control={form.control}
                    name="residualAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              {/* Cancellation Notice */}
              <FormField
                control={form.control}
                name="cancellationNotice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cancellation notice:</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="24_hours">24 hours</SelectItem>
                        <SelectItem value="48_hours">48 hours</SelectItem>
                        <SelectItem value="72_hours">72 hours</SelectItem>
                        <SelectItem value="1_week">1 week</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (to guest)</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2 text-xs text-gray-600">
                          <span className="bg-red-100 text-red-600 px-2 py-1 rounded">EN</span>
                          <span>English</span>
                        </div>
                        <Textarea
                          placeholder="Enter description for guests..."
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Language Selection */}
              <FormField
                control={form.control}
                name="language"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Add translation:</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="fr">French</SelectItem>
                        <SelectItem value="de">German</SelectItem>
                        <SelectItem value="es">Spanish</SelectItem>
                        <SelectItem value="it">Italian</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    setEditingSetup(null);
                    form.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {createMutation.isPending || updateMutation.isPending ? (
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Save
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Payment Setups List */}
      <Card>
        <CardContent className="p-0">
          {paymentSetups.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <CreditCard className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No payment setups configured yet</p>
              <p className="text-sm mt-2">Create your first payment setup to start collecting deposits or prepayments</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-4 font-medium text-gray-700">Name</th>
                    <th className="text-left p-4 font-medium text-gray-700">Method</th>
                    <th className="text-left p-4 font-medium text-gray-700">Type</th>
                    <th className="text-left p-4 font-medium text-gray-700">Amount</th>
                    <th className="text-left p-4 font-medium text-gray-700">Cancellation notice</th>
                    <th className="text-left p-4 font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentSetups.map((setup: PaymentSetup) => (
                    <tr key={setup.id} className="border-t hover:bg-gray-50">
                      <td className="p-4 font-medium">{setup.name}</td>
                      <td className="p-4">{getMethodDisplayName(setup.method)}</td>
                      <td className="p-4 capitalize">{setup.type}</td>
                      <td className="p-4">
                        {setup.amount} {setup.currency} {setup.priceUnit.replace('_', ' ')}
                      </td>
                      <td className="p-4">{getCancellationDisplayName(setup.cancellationNotice)}</td>
                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(setup)}
                          >
                            <Edit2 className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(setup.id)}
                            disabled={deleteMutation.isPending}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}