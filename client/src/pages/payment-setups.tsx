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
  const [multiplePrices, setMultiplePrices] = useState([
    { id: 1, name: "", price: 0, serviceFee: 0 }
  ]);
  const [languageDescriptions, setLanguageDescriptions] = useState([
    { id: 1, language: "en", flag: "🇬🇧", code: "EN", description: "" }
  ]);

  const availableLanguages = [
    { code: "en", name: "English (GB)", flag: "🇬🇧", shortCode: "EN" },
    { code: "al", name: "Albanian", flag: "🇦🇱", shortCode: "AL" },
    { code: "cz", name: "Czech", flag: "🇨🇿", shortCode: "CZ" },
    { code: "dk", name: "Danish", flag: "🇩🇰", shortCode: "DK" },
    { code: "de", name: "German", flag: "🇩🇪", shortCode: "DE" },
    { code: "es", name: "Spanish", flag: "🇪🇸", shortCode: "ES" },
    { code: "fi", name: "Finnish", flag: "🇫🇮", shortCode: "FI" },
    { code: "fo", name: "Faroese", flag: "🇫🇴", shortCode: "FO" },
    { code: "fr", name: "French", flag: "🇫🇷", shortCode: "FR" },
    { code: "he", name: "Hebrew", flag: "🇮🇱", shortCode: "HE" },
    { code: "hu", name: "Hungarian", flag: "🇭🇺", shortCode: "HU" },
    { code: "is", name: "Icelandic", flag: "🇮🇸", shortCode: "IS" },
    { code: "it", name: "Italian", flag: "🇮🇹", shortCode: "IT" },
    { code: "nl", name: "Dutch", flag: "🇳🇱", shortCode: "NL" },
    { code: "no", name: "Norwegian", flag: "🇳🇴", shortCode: "NO" },
    { code: "ro", name: "Romanian", flag: "🇷🇴", shortCode: "RO" },
    { code: "se", name: "Swedish", flag: "🇸🇪", shortCode: "SE" },
  ];

  const addLanguageDescription = (languageCode: string) => {
    const language = availableLanguages.find(lang => lang.code === languageCode);
    if (language) {
      const newId = Math.max(...languageDescriptions.map(l => l.id)) + 1;
      setLanguageDescriptions([
        ...languageDescriptions,
        {
          id: newId,
          language: language.code,
          flag: language.flag,
          code: language.shortCode,
          description: ""
        }
      ]);
    }
  };

  const removeLanguageDescription = (id: number) => {
    if (languageDescriptions.length > 1) {
      setLanguageDescriptions(languageDescriptions.filter(l => l.id !== id));
    }
  };

  const updateLanguageDescription = (id: number, description: string) => {
    setLanguageDescriptions(languageDescriptions.map(l => 
      l.id === id ? { ...l, description } : l
    ));
  };

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
                    <FormLabel className="text-sm text-gray-700">Method:</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="grid grid-cols-3 gap-4"
                      >
                        <div className="border rounded-lg p-4 space-y-2 bg-green-50 border-green-200">
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="capture_amount" id="capture" className="text-green-600" />
                            <Label htmlFor="capture" className="font-medium text-green-600">
                              Capture
                            </Label>
                          </div>
                          <div className="font-medium text-green-600">amount</div>
                          <p className="text-xs text-gray-600">
                            The amount is withdrawn immediately.
                          </p>
                        </div>
                        <div className="border rounded-lg p-4 space-y-2 bg-gray-50">
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="reserve_amount" id="reserve" />
                            <Label htmlFor="reserve" className="font-medium text-gray-700">
                              Reserve
                            </Label>
                          </div>
                          <div className="font-medium text-gray-700">amount</div>
                          <p className="text-xs text-gray-600">
                            The amount is reserved and deducted 6 hours before arrival or on late cancellation.
                          </p>
                        </div>
                        <div className="border rounded-lg p-4 space-y-2 bg-gray-50">
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="membership_fee" id="membership" />
                            <Label htmlFor="membership" className="font-medium text-gray-700">
                              No-show fee
                            </Label>
                          </div>
                          <p className="text-xs text-gray-600">
                            Saves credit card information and charges a fee in case of no-show or late cancellation.
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
                    <FormLabel className="text-sm text-gray-700">Type:</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-gray-100">
                          <SelectValue placeholder="Prepayment" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="prepayment">Prepayment</SelectItem>
                        <SelectItem value="deposit">Deposit</SelectItem>
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
                    <FormLabel className="text-sm text-gray-700">Price:</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex space-x-6"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="one_price" id="one_price" className="text-green-600" />
                          <Label htmlFor="one_price" className="text-sm">One price</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="multiple_prices" id="multiple_prices" />
                          <Label htmlFor="multiple_prices" className="text-sm">Multiple prices</Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Conditional Price Fields */}
              {form.watch("priceType") === "one_price" ? (
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
                            placeholder="12"
                            className="bg-gray-100"
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
                            <SelectTrigger className="bg-gray-100">
                              <SelectValue placeholder="EUR" />
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
                            <SelectTrigger className="bg-gray-100">
                              <SelectValue placeholder="Per booking" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="per_booking">Per booking</SelectItem>
                            <SelectItem value="per_guest">Per guest</SelectItem>
                            <SelectItem value="per_table">Per table</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Multiple Prices Table */}
                  <div className="border rounded-lg">
                    <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50 border-b">
                      <div className="font-medium text-sm">Name</div>
                      <div className="font-medium text-sm">Price</div>
                      <div className="font-medium text-sm">Service fee*</div>
                      <div></div>
                    </div>
                    <div className="p-4 space-y-3">
                      {multiplePrices.map((price, index) => (
                        <div key={price.id} className="grid grid-cols-4 gap-4 items-center">
                          <Input 
                            placeholder="Name (e.g. Adult / Child)" 
                            value={price.name}
                            onChange={(e) => {
                              const newPrices = [...multiplePrices];
                              newPrices[index].name = e.target.value;
                              setMultiplePrices(newPrices);
                            }}
                          />
                          <Input 
                            type="number" 
                            step="0.01" 
                            placeholder="0" 
                            value={price.price || ""}
                            onChange={(e) => {
                              const newPrices = [...multiplePrices];
                              newPrices[index].price = parseFloat(e.target.value) || 0;
                              setMultiplePrices(newPrices);
                            }}
                          />
                          <Input 
                            type="number" 
                            step="0.01" 
                            placeholder="0" 
                            value={price.serviceFee || ""}
                            onChange={(e) => {
                              const newPrices = [...multiplePrices];
                              newPrices[index].serviceFee = parseFloat(e.target.value) || 0;
                              setMultiplePrices(newPrices);
                            }}
                          />
                          <div className="flex items-center space-x-2">
                            {multiplePrices.length > 1 && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                type="button"
                                onClick={() => {
                                  const newPrices = multiplePrices.filter((_, i) => i !== index);
                                  setMultiplePrices(newPrices);
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                            <span className="text-sm text-gray-500">=</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => {
                      const newId = Math.max(...multiplePrices.map(p => p.id)) + 1;
                      setMultiplePrices([...multiplePrices, { id: newId, name: "", price: 0, serviceFee: 0 }]);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add price
                  </Button>
                  
                  <div className="grid grid-cols-2 gap-4">
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
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">Currency</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Allow Residual Payment */}
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={form.watch("allowResidual")}
                    onChange={(e) => form.setValue("allowResidual", e.target.checked)}
                    className="h-4 w-4 accent-green-600"
                  />
                  <Label className="text-sm text-gray-700">Allow residual payment:</Label>
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
                              placeholder="12"
                              className="bg-gray-100 w-20"
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
              </div>

              {/* Cancellation Notice */}
              <FormField
                control={form.control}
                name="cancellationNotice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm text-gray-700">Cancellation notice:</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-gray-100">
                          <SelectValue placeholder="24 hours" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="30_min">30 min</SelectItem>
                        <SelectItem value="45_min">45 min</SelectItem>
                        <SelectItem value="1_hour">1 hour</SelectItem>
                        <SelectItem value="1.5_hour">1½ hour</SelectItem>
                        <SelectItem value="2_hours">2 hours</SelectItem>
                        <SelectItem value="2.5_hour">2½ hour</SelectItem>
                        <SelectItem value="3_hours">3 hours</SelectItem>
                        <SelectItem value="4_hours">4 hours</SelectItem>
                        <SelectItem value="5_hours">5 hours</SelectItem>
                        <SelectItem value="6_hours">6 hours</SelectItem>
                        <SelectItem value="8_hours">8 hours</SelectItem>
                        <SelectItem value="12_hours">12 hours</SelectItem>
                        <SelectItem value="24_hours">24 hours</SelectItem>
                        <SelectItem value="36_hours">36 hours</SelectItem>
                        <SelectItem value="48_hours">48 hours</SelectItem>
                        <SelectItem value="3_days">3 days</SelectItem>
                        <SelectItem value="4_days">4 days</SelectItem>
                        <SelectItem value="5_days">5 days</SelectItem>
                        <SelectItem value="6_days">6 days</SelectItem>
                        <SelectItem value="7_days">7 days</SelectItem>
                        <SelectItem value="8_days">8 days</SelectItem>
                        <SelectItem value="9_days">9 days</SelectItem>
                        <SelectItem value="10_days">10 days</SelectItem>
                        <SelectItem value="11_days">11 days</SelectItem>
                        <SelectItem value="12_days">12 days</SelectItem>
                        <SelectItem value="13_days">13 days</SelectItem>
                        <SelectItem value="14_days">14 days</SelectItem>
                        <SelectItem value="15_days">15 days</SelectItem>
                        <SelectItem value="16_days">16 days</SelectItem>
                        <SelectItem value="17_days">17 days</SelectItem>
                        <SelectItem value="18_days">18 days</SelectItem>
                        <SelectItem value="19_days">19 days</SelectItem>
                        <SelectItem value="20_days">20 days</SelectItem>
                        <SelectItem value="21_days">21 days</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Description */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-800">Description (to guest)</h3>
                
                <div className="space-y-3">
                  <div className="text-sm text-gray-700">Description (to guest):</div>
                  
                  {languageDescriptions.map((langDesc, index) => (
                    <div key={langDesc.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="bg-red-100 text-red-600 px-2 py-1 rounded text-xs font-medium">
                            {langDesc.flag} {langDesc.code}
                          </span>
                        </div>
                        {languageDescriptions.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeLanguageDescription(langDesc.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      
                      <Textarea
                        placeholder=""
                        className="min-h-[80px] bg-gray-100"
                        value={langDesc.description}
                        onChange={(e) => updateLanguageDescription(langDesc.id, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
                
                <div>
                  <Label className="text-sm text-gray-700">Add translation:</Label>
                  <Select onValueChange={addLanguageDescription}>
                    <SelectTrigger className="bg-gray-100 mt-1">
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableLanguages
                        .filter(lang => !languageDescriptions.some(ld => ld.language === lang.code))
                        .map(lang => (
                          <SelectItem key={lang.code} value={lang.code}>
                            <div className="flex items-center space-x-2">
                              <span>{lang.flag}</span>
                              <span>{lang.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-start pt-6">
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="bg-green-600 hover:bg-green-700 text-white px-6"
                >
                  {createMutation.isPending || updateMutation.isPending ? (
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  ) : (
                    "Save"
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