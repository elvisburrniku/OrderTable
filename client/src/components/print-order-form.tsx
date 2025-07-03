import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { PaymentMethodSelector } from "@/components/payment-method-selector";
import { Printer, Clock, Truck, Mail, MapPin, CreditCard, Zap, Shield, Star, Palette, Package, User, Phone, FileText, Settings } from "lucide-react";


const printOrderSchema = z.object({
  customerName: z.string().min(2, "Name must be at least 2 characters"),
  customerEmail: z.string().email("Please enter a valid email address"),
  customerPhone: z.string().optional(),
  printType: z.enum(["menu", "flyer", "poster", "banner", "business_card"]),
  printSize: z.enum(["A4", "A3", "A2", "A1", "custom"]),
  printQuality: z.enum(["draft", "standard", "high", "premium"]),
  quantity: z.number().min(1, "Quantity must be at least 1").max(1000, "Maximum quantity is 1000"),
  design: z.string().optional(),
  specialInstructions: z.string().optional(),
  rushOrder: z.boolean().default(false),
  deliveryMethod: z.enum(["pickup", "delivery", "mail"]),
  deliveryAddress: z.string().optional(),
});

type PrintOrderFormData = z.infer<typeof printOrderSchema>;

interface PrintOrderFormProps {
  restaurantId: number;
  tenantId?: number;
  onOrderCreated?: (order: any) => void;
  onPaymentRequired?: (clientSecret: string, order: any, savedPaymentMethods?: any[]) => void;
}

export function PrintOrderForm({ 
  restaurantId, 
  tenantId, 
  onOrderCreated, 
  onPaymentRequired 
}: PrintOrderFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [estimatedPrice, setEstimatedPrice] = useState(0);
  const [useSavedPaymentMethod, setUseSavedPaymentMethod] = useState(false);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string>("");
  const { toast } = useToast();

  const form = useForm<PrintOrderFormData>({
    resolver: zodResolver(printOrderSchema),
    defaultValues: {
      customerName: "",
      customerEmail: "",
      customerPhone: "",
      printType: "menu",
      printSize: "A4",
      printQuality: "standard",
      quantity: 1,
      design: "",
      specialInstructions: "",
      rushOrder: false,
      deliveryMethod: "pickup",
      deliveryAddress: "",
    },
  });

  // Calculate estimated price based on form values
  const calculatePrice = (values: Partial<PrintOrderFormData>) => {
    const basePrices = {
      menu: { A4: 5.00, A3: 8.00, A2: 12.00, A1: 18.00, custom: 10.00 },
      flyer: { A4: 3.00, A3: 5.00, A2: 8.00, A1: 12.00, custom: 6.00 },
      poster: { A4: 8.00, A3: 12.00, A2: 18.00, A1: 25.00, custom: 15.00 },
      banner: { A4: 12.00, A3: 18.00, A2: 25.00, A1: 35.00, custom: 20.00 },
      business_card: { A4: 2.00, A3: 3.00, A2: 4.00, A1: 5.00, custom: 2.50 }
    };

    const qualityMultipliers = {
      draft: 0.8,
      standard: 1.0,
      high: 1.3,
      premium: 1.6
    };

    const basePrice = basePrices[values.printType || "menu"]?.[values.printSize || "A4"] || 10.00;
    const qualityMultiplier = qualityMultipliers[values.printQuality || "standard"];
    const rushMultiplier = values.rushOrder ? 1.5 : 1.0;
    const deliveryFee = values.deliveryMethod === "delivery" ? 5.00 : values.deliveryMethod === "mail" ? 3.00 : 0;
    const quantity = values.quantity || 1;

    return basePrice * qualityMultiplier * rushMultiplier * quantity + deliveryFee;
  };

  // Watch form values to update price estimate
  const watchedValues = form.watch();
  React.useEffect(() => {
    const price = calculatePrice(watchedValues);
    setEstimatedPrice(price);
  }, [watchedValues]);

  const handlePaymentMethodChange = (useSaved: boolean, methodId?: string) => {
    setUseSavedPaymentMethod(useSaved);
    setSelectedPaymentMethodId(methodId || "");
  };

  const onSubmit = async (data: PrintOrderFormData) => {
    setIsSubmitting(true);
    try {
      const endpoint = tenantId 
        ? `/api/tenants/${tenantId}/restaurants/${restaurantId}/print-orders`
        : `/api/restaurants/${restaurantId}/print-orders/public`;

      const submitData = {
        ...data,
        useSavedPaymentMethod,
        selectedPaymentMethodId: useSavedPaymentMethod ? selectedPaymentMethodId : undefined
      };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        throw new Error("Failed to create print order");
      }

      const result = await response.json();
      


      toast({
        title: "Print Order Created",
        description: `Order ${result.printOrder.orderNumber} has been created successfully.`,
      });

      if (onPaymentRequired && result.clientSecret) {
        onPaymentRequired(result.clientSecret, result.printOrder, result.savedPaymentMethods);
      } else if (onOrderCreated) {
        onOrderCreated(result.printOrder);
      }

    } catch (error) {
      console.error("Error creating print order:", error);
      toast({
        title: "Error",
        description: "Failed to create print order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPrintTypeDescription = (type: string) => {
    const descriptions = {
      menu: "Professional restaurant menus with premium paper and finishes",
      flyer: "Eye-catching promotional flyers for events and specials",
      poster: "Large format posters for advertising and decoration",
      banner: "Durable banners for outdoor and indoor displays",
      business_card: "Professional business cards with various finishes"
    };
    return descriptions[type] || "";
  };

  const getDeliveryTime = (rushOrder: boolean) => {
    return rushOrder ? "24 hours" : "2-3 business days";
  };

  return (
    <div className="bg-slate-50 min-h-screen">
      <div className="p-6">
        {/* Header Section */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold text-slate-900 mb-2">
            Create Print Order
          </h1>
          <p className="text-slate-600 max-w-2xl mx-auto">
            Design and order custom printed materials for your restaurant with professional quality and fast delivery
          </p>
        </div>

        {/* Service Features */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          {[
            {
              icon: Zap,
              title: "Fast Turnaround",
              description: "2-3 business days standard"
            },
            {
              icon: Shield,
              title: "Premium Quality",
              description: "Professional-grade materials"
            },
            {
              icon: Star,
              title: "Custom Design",
              description: "Tailored to your brand"
            },
            {
              icon: Truck,
              title: "Fast Delivery",
              description: "Multiple shipping options"
            }
          ].map((feature, index) => (
            <div
              key={index}
              className="bg-white rounded-lg border border-slate-200 p-4"
            >
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center mb-3 mx-auto">
                <feature.icon className="w-5 h-5 text-slate-600" />
              </div>
              <h3 className="text-sm font-medium text-slate-900 mb-1 text-center">{feature.title}</h3>
              <p className="text-xs text-slate-600 text-center">{feature.description}</p>
            </div>
          ))}
        </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Customer Information Section */}
          <Card className="bg-white border border-slate-200 shadow-sm mb-6">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-xl">
                <User className="w-5 h-5 text-slate-600" />
                Customer Information
              </CardTitle>
              <CardDescription>
                Enter your contact details and delivery preferences
              </CardDescription>
            </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="customerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 text-sm font-medium">
                        <User className="w-4 h-4 text-slate-600" />
                        Full Name
                      </FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter your full name" className="h-10 border border-slate-300 focus:border-slate-500" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="customerEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 text-sm font-medium">
                        <Mail className="w-4 h-4 text-slate-600" />
                        Email Address
                      </FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder="your.email@restaurant.com" className="h-10 border border-slate-300 focus:border-slate-500" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="customerPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 text-sm font-medium">
                        <Phone className="w-4 h-4 text-slate-600" />
                        Phone Number
                      </FormLabel>
                      <FormControl>
                        <Input {...field} type="tel" placeholder="(555) 123-4567" className="h-10 border border-slate-300 focus:border-slate-500" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="deliveryMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 text-sm font-medium">
                        <Truck className="w-4 h-4 text-slate-600" />
                        Delivery Method
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-10 border border-slate-300 focus:border-slate-500">
                            <SelectValue placeholder="Select delivery method" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="pickup">Store Pickup (Free)</SelectItem>
                          <SelectItem value="delivery">Home Delivery (+$5.00)</SelectItem>
                          <SelectItem value="mail">Mail Shipping (+$3.00)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.watch("deliveryMethod") !== "pickup" && (
                  <div className="md:col-span-2">
                    <FormField
                      control={form.control}
                      name="deliveryAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2 text-sm font-medium">
                            <MapPin className="w-4 h-4 text-slate-600" />
                            Delivery Address
                          </FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              placeholder="Enter your complete delivery address including street, city, state, and zip code"
                              className="border border-slate-300 focus:border-slate-500"
                              rows={3}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

          {/* Print Specifications Section */}
          <Card className="bg-white border border-slate-200 shadow-sm mb-6">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <Settings className="w-5 h-5 text-slate-600" />
                  Print Specifications
                </CardTitle>
                <CardDescription>
                  Configure your print job details and quality preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="printType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 text-base font-medium">
                        <Package className="w-4 h-4 text-cyan-600" />
                        Print Type
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-12 border-2 focus:border-cyan-500">
                            <SelectValue placeholder="Select print type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="menu">Restaurant Menu</SelectItem>
                          <SelectItem value="flyer">Promotional Flyer</SelectItem>
                          <SelectItem value="poster">Event Poster</SelectItem>
                          <SelectItem value="banner">Display Banner</SelectItem>
                          <SelectItem value="business_card">Business Cards</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription className="text-sm text-gray-600">
                        {getPrintTypeDescription(field.value)}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="printSize"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 text-base font-medium">
                        <FileText className="w-4 h-4 text-cyan-600" />
                        Print Size
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-12 border-2 focus:border-cyan-500">
                            <SelectValue placeholder="Select size" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="A4">A4 (8.3" × 11.7")</SelectItem>
                          <SelectItem value="A3">A3 (11.7" × 16.5")</SelectItem>
                          <SelectItem value="A2">A2 (16.5" × 23.4")</SelectItem>
                          <SelectItem value="A1">A1 (23.4" × 33.1")</SelectItem>
                          <SelectItem value="custom">Custom Size</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="printQuality"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 text-base font-medium">
                        <Star className="w-4 h-4 text-cyan-600" />
                        Print Quality
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-12 border-2 focus:border-cyan-500">
                            <SelectValue placeholder="Select quality" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="draft">Draft Quality</SelectItem>
                          <SelectItem value="standard">Standard Quality</SelectItem>
                          <SelectItem value="high">High Quality</SelectItem>
                          <SelectItem value="premium">Premium Quality</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 text-base font-medium">
                        <Package className="w-4 h-4 text-cyan-600" />
                        Quantity
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                          placeholder="Enter quantity"
                          className="h-12 border-2 focus:border-cyan-500"
                          min={1}
                          max={1000}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="rushOrder"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border-2 border-orange-200 p-4 bg-orange-50/50">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="flex items-center gap-2 text-base font-medium text-orange-700">
                          <Clock className="w-4 h-4" />
                          Rush Order (+50%)
                        </FormLabel>
                        <FormDescription className="text-orange-600">
                          Delivery in {getDeliveryTime(field.value)}
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="design"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2 lg:col-span-3">
                      <FormLabel className="flex items-center gap-2 text-base font-medium">
                        <Palette className="w-4 h-4 text-cyan-600" />
                        Design Requirements
                      </FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="Describe your design requirements, brand colors, logos, specific text, etc."
                          className="border-2 focus:border-cyan-500"
                          rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="specialInstructions"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2 lg:col-span-3">
                      <FormLabel className="flex items-center gap-2 text-base font-medium">
                        <FileText className="w-4 h-4 text-cyan-600" />
                        Special Instructions
                      </FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="Any additional notes, special handling requirements, or specific deadlines..."
                          className="border-2 focus:border-cyan-500"
                          rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

          {/* Price Estimate and Payment Section */}
          <Card className="bg-white border border-slate-200 shadow-sm mb-6">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <CreditCard className="w-5 h-5 text-slate-600" />
                  Order Summary & Payment
                </CardTitle>
                <CardDescription>
                  Review your order details and payment information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Price Estimate */}
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-base font-medium text-slate-900">Estimated Price</h4>
                    <div className="text-2xl font-semibold text-slate-900">
                      ${estimatedPrice.toFixed(2)}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm text-slate-600">
                    <div>Type: {form.watch("printType")}</div>
                    <div>Size: {form.watch("printSize")}</div>
                    <div>Quality: {form.watch("printQuality")}</div>
                    <div>Quantity: {form.watch("quantity")}</div>
                    <div>Rush: {form.watch("rushOrder") ? "Yes (+50%)" : "No"}</div>
                    <div>Delivery: {form.watch("deliveryMethod")}</div>
                  </div>
                </div>

                {/* Payment Method Selection */}
                <div>
                  <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-green-600" />
                    Payment Method
                  </h4>
                  <PaymentMethodSelector
                    onSelectionChange={handlePaymentMethodChange}
                  />
                </div>

                {/* Submit Button */}
                <div className="pt-4">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-14 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    {isSubmitting ? (
                      <>
                        <Settings className="w-6 h-6 mr-3" />
                        Creating Order...
                      </>
                    ) : (
                      <>
                        <Printer className="w-6 h-6 mr-3" />
                        Create Order - ${estimatedPrice.toFixed(2)}
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          
        </form>
      </Form>
      </div>
    </div>
  );
}