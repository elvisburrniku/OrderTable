import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { ShoppingCart, Package, Truck, CreditCard, CheckCircle, Star, Award } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface MenuOrderingServiceProps {
  restaurantId: number;
  tenantId: number;
  selectedTheme: string;
  menuLayout: string;
  onOrderCreated?: (clientSecret: string, order: any, savedPaymentMethods?: any[]) => void;
}

interface PrintingOption {
  id: string;
  name: string;
  description: string;
  paperType: string;
  finish: string;
  durability: string;
  pricePerMenu: number;
  minimumOrder: number;
  recommended?: boolean;
}

interface ShippingOption {
  id: string;
  name: string;
  description: string;
  estimatedDays: string;
  price: number;
}

const printingOptions: PrintingOption[] = [
  {
    id: 'standard',
    name: 'Standard Print',
    description: 'High-quality digital printing on premium paper',
    paperType: '24lb Bond Paper',
    finish: 'Matte',
    durability: '3-6 months',
    pricePerMenu: 2.50,
    minimumOrder: 25
  },
  {
    id: 'premium',
    name: 'Premium Print',
    description: 'Professional offset printing with enhanced colors',
    paperType: '32lb Cover Stock',
    finish: 'Satin',
    durability: '6-12 months',
    pricePerMenu: 4.75,
    minimumOrder: 50,
    recommended: true
  },
  {
    id: 'deluxe',
    name: 'Deluxe Laminated',
    description: 'Waterproof laminated menus for heavy use',
    paperType: '14pt Card Stock',
    finish: 'Gloss Lamination',
    durability: '12+ months',
    pricePerMenu: 7.25,
    minimumOrder: 25
  },
  {
    id: 'luxury',
    name: 'Luxury Hardcover',
    description: 'Premium bound menus with leather-like covers',
    paperType: 'Premium Paper + Cover',
    finish: 'Leather-texture Cover',
    durability: '2+ years',
    pricePerMenu: 15.50,
    minimumOrder: 10
  }
];

const shippingOptions: ShippingOption[] = [
  {
    id: 'standard',
    name: 'Standard Shipping',
    description: 'Reliable delivery via ground shipping',
    estimatedDays: '5-7 business days',
    price: 15.99
  },
  {
    id: 'expedited',
    name: 'Expedited Shipping',
    description: 'Faster delivery for urgent orders',
    estimatedDays: '2-3 business days',
    price: 29.99
  },
  {
    id: 'overnight',
    name: 'Overnight Express',
    description: 'Next business day delivery',
    estimatedDays: '1 business day',
    price: 49.99
  }
];

export default function MenuOrderingService({ 
  restaurantId, 
  tenantId, 
  selectedTheme, 
  menuLayout,
  onOrderCreated
}: MenuOrderingServiceProps) {
  const [selectedPrinting, setSelectedPrinting] = useState<string>('premium');
  const [selectedShipping, setSelectedShipping] = useState<string>('standard');
  const [quantity, setQuantity] = useState<number>(50);
  const [orderDetails, setOrderDetails] = useState({
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    shippingAddress: '',
    city: '',
    state: '',
    zipCode: '',
    specialInstructions: ''
  });
  const [showOrderForm, setShowOrderForm] = useState(false);
  const { toast } = useToast();

  const selectedPrintOption = printingOptions.find(opt => opt.id === selectedPrinting);
  const selectedShipOption = shippingOptions.find(opt => opt.id === selectedShipping);

  const subtotal = selectedPrintOption ? selectedPrintOption.pricePerMenu * quantity : 0;
  const shippingCost = selectedShipOption?.price || 0;
  const tax = subtotal * 0.08; // 8% tax
  const total = subtotal + shippingCost + tax;

  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      return apiRequest('POST', `/api/tenants/${tenantId}/restaurants/${restaurantId}/print-orders`, {
        customerName: orderData.contactName,
        customerEmail: orderData.contactEmail,
        customerPhone: orderData.contactPhone,
        printType: 'menu',
        printSize: orderData.menuLayout || 'A4',
        printQuality: orderData.printingOption,
        quantity: orderData.quantity,
        design: `Menu Theme: ${orderData.menuTheme}`,
        specialInstructions: orderData.specialInstructions,
        rushOrder: orderData.shippingOption === 'overnight',
        deliveryMethod: 'delivery',
        deliveryAddress: `${orderData.shippingAddress}, ${orderData.city}, ${orderData.state} ${orderData.zipCode}`,
        useSavedPaymentMethod: false
      });
    },
    onSuccess: (data: any) => {
      if (data.clientSecret && onOrderCreated) {
        onOrderCreated(data.clientSecret, data.printOrder, data.savedPaymentMethods);
      }
      setShowOrderForm(false);
      // Reset form
      setOrderDetails({
        contactName: '',
        contactEmail: '',
        contactPhone: '',
        shippingAddress: '',
        city: '',
        state: '',
        zipCode: '',
        specialInstructions: ''
      });
    },
    onError: (error: any) => {
      toast({
        title: "Order Failed",
        description: error.message || "Failed to create order. Please try again.",
        variant: "destructive"
      });
    },
  });

  const handlePlaceOrder = () => {
    if (!selectedPrintOption || !selectedShipOption) return;

    const orderData = {
      printingOption: selectedPrinting,
      shippingOption: selectedShipping,
      quantity,
      menuTheme: selectedTheme,
      menuLayout,
      subtotal,
      shippingCost,
      tax,
      total,
      ...orderDetails
    };

    createOrderMutation.mutate(orderData);
  };

  const isFormValid = () => {
    return orderDetails.contactName && 
           orderDetails.contactEmail && 
           orderDetails.contactPhone && 
           orderDetails.shippingAddress && 
           orderDetails.city && 
           orderDetails.state && 
           orderDetails.zipCode;
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Professional Menu Printing Service
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Order high-quality printed menus delivered directly to your restaurant
        </p>
      </div>

      {/* Service Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="text-center">
          <CardContent className="pt-6">
            <Award className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <h3 className="font-semibold">Professional Quality</h3>
            <p className="text-sm text-gray-600">Restaurant-grade printing with premium materials</p>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="pt-6">
            <Truck className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <h3 className="font-semibold">Fast Delivery</h3>
            <p className="text-sm text-gray-600">Quick turnaround with multiple shipping options</p>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="pt-6">
            <Star className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
            <h3 className="font-semibold">Custom Design</h3>
            <p className="text-sm text-gray-600">Your menu design with professional formatting</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Printing Options */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Printing Options
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {printingOptions.map((option) => (
              <div
                key={option.id}
                className={`border rounded-lg p-4 cursor-pointer transition-all ${
                  selectedPrinting === option.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedPrinting(option.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold">{option.name}</h4>
                      {option.recommended && (
                        <Badge className="bg-green-100 text-green-800">Recommended</Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{option.description}</p>
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                      <div>Paper: {option.paperType}</div>
                      <div>Finish: {option.finish}</div>
                      <div>Durability: {option.durability}</div>
                      <div>Min Order: {option.minimumOrder}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg">${option.pricePerMenu}</div>
                    <div className="text-xs text-gray-500">per menu</div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Order Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Order Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Quantity */}
            <div>
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                min={selectedPrintOption?.minimumOrder || 1}
                className="mt-1"
              />
              {selectedPrintOption && quantity < selectedPrintOption.minimumOrder && (
                <p className="text-sm text-red-600 mt-1">
                  Minimum order: {selectedPrintOption.minimumOrder} menus
                </p>
              )}
            </div>

            {/* Shipping Options */}
            <div>
              <Label>Shipping Method</Label>
              <div className="mt-2 space-y-2">
                {shippingOptions.map((option) => (
                  <div
                    key={option.id}
                    className={`border rounded-lg p-3 cursor-pointer transition-all ${
                      selectedShipping === option.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedShipping(option.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h5 className="font-medium">{option.name}</h5>
                        <p className="text-sm text-gray-600">{option.description}</p>
                        <p className="text-xs text-gray-500">{option.estimatedDays}</p>
                      </div>
                      <div className="font-semibold">${option.price}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Order Summary */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <h4 className="font-semibold mb-3">Order Summary</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>{quantity} × {selectedPrintOption?.name}</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping ({selectedShipOption?.name})</span>
                  <span>${shippingCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax (8%)</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Order Button */}
            <Dialog open={showOrderForm} onOpenChange={setShowOrderForm}>
              <DialogTrigger asChild>
                <Button 
                  className="w-full" 
                  size="lg"
                  disabled={!selectedPrintOption || (selectedPrintOption && quantity < selectedPrintOption.minimumOrder)}
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Place Order - ${total.toFixed(2)}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Complete Your Order</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="contactName">Contact Name *</Label>
                      <Input
                        id="contactName"
                        value={orderDetails.contactName}
                        onChange={(e) => setOrderDetails({...orderDetails, contactName: e.target.value})}
                        placeholder="Full name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="contactEmail">Email Address *</Label>
                      <Input
                        id="contactEmail"
                        type="email"
                        value={orderDetails.contactEmail}
                        onChange={(e) => setOrderDetails({...orderDetails, contactEmail: e.target.value})}
                        placeholder="email@restaurant.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="contactPhone">Phone Number *</Label>
                      <Input
                        id="contactPhone"
                        type="tel"
                        value={orderDetails.contactPhone}
                        onChange={(e) => setOrderDetails({...orderDetails, contactPhone: e.target.value})}
                        placeholder="(555) 123-4567"
                      />
                    </div>
                    <div>
                      <Label htmlFor="shippingAddress">Shipping Address *</Label>
                      <Input
                        id="shippingAddress"
                        value={orderDetails.shippingAddress}
                        onChange={(e) => setOrderDetails({...orderDetails, shippingAddress: e.target.value})}
                        placeholder="Street address"
                      />
                    </div>
                    <div>
                      <Label htmlFor="city">City *</Label>
                      <Input
                        id="city"
                        value={orderDetails.city}
                        onChange={(e) => setOrderDetails({...orderDetails, city: e.target.value})}
                        placeholder="City"
                      />
                    </div>
                    <div>
                      <Label htmlFor="state">State *</Label>
                      <Input
                        id="state"
                        value={orderDetails.state}
                        onChange={(e) => setOrderDetails({...orderDetails, state: e.target.value})}
                        placeholder="State"
                      />
                    </div>
                    <div>
                      <Label htmlFor="zipCode">ZIP Code *</Label>
                      <Input
                        id="zipCode"
                        value={orderDetails.zipCode}
                        onChange={(e) => setOrderDetails({...orderDetails, zipCode: e.target.value})}
                        placeholder="12345"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="specialInstructions">Special Instructions</Label>
                    <Textarea
                      id="specialInstructions"
                      value={orderDetails.specialInstructions}
                      onChange={(e) => setOrderDetails({...orderDetails, specialInstructions: e.target.value})}
                      placeholder="Any special requests or delivery instructions..."
                      rows={3}
                    />
                  </div>
                </div>
                <div className="flex justify-between items-center pt-4 border-t">
                  <div className="text-lg font-bold">Total: ${total.toFixed(2)}</div>
                  <Button 
                    onClick={handlePlaceOrder}
                    disabled={!isFormValid() || createOrderMutation.isPending}
                    size="lg"
                  >
                    {createOrderMutation.isPending ? (
                      "Processing..."
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Confirm Order
                      </>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}