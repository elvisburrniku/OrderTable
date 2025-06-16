import { useState } from "react";
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
import { Printer, Clock, Truck, Mail, MapPin, CreditCard } from "lucide-react";

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
  onPaymentRequired?: (clientSecret: string, order: any) => void;
}

export function PrintOrderForm({ 
  restaurantId, 
  tenantId, 
  onOrderCreated, 
  onPaymentRequired 
}: PrintOrderFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [estimatedPrice, setEstimatedPrice] = useState(0);
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

  const onSubmit = async (data: PrintOrderFormData) => {
    setIsSubmitting(true);
    try {
      const endpoint = tenantId 
        ? `/api/tenants/${tenantId}/restaurants/${restaurantId}/print-orders`
        : `/api/restaurants/${restaurantId}/print-orders/public`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
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
        onPaymentRequired(result.clientSecret, result.printOrder);
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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Professional Print Order
          </CardTitle>
          <CardDescription>
            Create high-quality printed materials for your restaurant
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Customer Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Customer Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="customerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} />
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
                        <FormLabel>Email Address *</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="john@example.com" {...field} />
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
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input placeholder="+1 (555) 123-4567" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Separator />

              {/* Print Specifications */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Print Specifications</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="printType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Print Type *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select print type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="menu">Restaurant Menu</SelectItem>
                            <SelectItem value="flyer">Marketing Flyer</SelectItem>
                            <SelectItem value="poster">Poster</SelectItem>
                            <SelectItem value="banner">Banner</SelectItem>
                            <SelectItem value="business_card">Business Cards</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
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
                        <FormLabel>Size *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
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
                        <FormLabel>Quality *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
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
                </div>
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="1" 
                          max="1000" 
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                        />
                      </FormControl>
                      <FormDescription>
                        Number of copies to print (1-1000)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              {/* Design and Instructions */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Design & Instructions</h3>
                <FormField
                  control={form.control}
                  name="design"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Design File URL or Description</FormLabel>
                      <FormControl>
                        <Input placeholder="https://example.com/design.pdf or describe your design" {...field} />
                      </FormControl>
                      <FormDescription>
                        Provide a link to your design file or describe what you want printed
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="specialInstructions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Special Instructions</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Any special requirements, finishing options, or notes..."
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              {/* Delivery Options */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Delivery & Timing</h3>
                <FormField
                  control={form.control}
                  name="rushOrder"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Rush Order (+50% fee)
                        </FormLabel>
                        <FormDescription>
                          Complete within 24 hours instead of 2-3 business days
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="deliveryMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Delivery Method *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select delivery method" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="pickup">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              Pickup (Free)
                            </div>
                          </SelectItem>
                          <SelectItem value="delivery">
                            <div className="flex items-center gap-2">
                              <Truck className="h-4 w-4" />
                              Local Delivery (+$5.00)
                            </div>
                          </SelectItem>
                          <SelectItem value="mail">
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4" />
                              Mail Shipping (+$3.00)
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {(form.watch("deliveryMethod") === "delivery" || form.watch("deliveryMethod") === "mail") && (
                  <FormField
                    control={form.control}
                    name="deliveryAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Delivery Address *</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Enter full delivery address..."
                            className="resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              <Separator />

              {/* Order Summary */}
              <Card className="bg-gray-50 dark:bg-gray-900">
                <CardHeader>
                  <CardTitle className="text-lg">Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span>Print Type:</span>
                    <Badge variant="secondary">{form.watch("printType")}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Size & Quality:</span>
                    <span>{form.watch("printSize")} - {form.watch("printQuality")}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Quantity:</span>
                    <span>{form.watch("quantity")} copies</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Delivery Time:</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {getDeliveryTime(form.watch("rushOrder"))}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center text-lg font-semibold">
                    <span>Estimated Total:</span>
                    <span>${estimatedPrice.toFixed(2)}</span>
                  </div>
                </CardContent>
              </Card>

              <Button 
                type="submit" 
                className="w-full" 
                size="lg"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  "Creating Order..."
                ) : (
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Proceed to Payment
                  </div>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}