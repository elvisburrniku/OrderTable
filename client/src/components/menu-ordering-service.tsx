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
import { ShoppingCart, Package, Truck, CreditCard, CheckCircle, Star, Award, Palette, Clock, Shield, Zap } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { motion } from 'framer-motion';

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
    paperType: '14lb Bond Paper',
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
    paperType: '32lb Cover Stock',
    finish: 'Laminated',
    durability: '12+ months',
    pricePerMenu: 7.25,
    minimumOrder: 50
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

  return (
    <div className="bg-slate-50 min-h-screen">
      <div className="p-6">
        {/* Header Section */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold text-slate-900 mb-2">
            Menu Printing Service
          </h1>
          <p className="text-slate-600 max-w-2xl mx-auto">
            Order high-quality printed menus delivered directly to your restaurant
          </p>
        </div>

        {/* Service Features */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          {[
            {
              icon: Shield,
              title: "Professional Quality",
              description: "Restaurant-grade printing with premium materials"
            },
            {
              icon: Zap,
              title: "Fast Delivery",
              description: "Quick turnaround with multiple shipping options"
            },
            {
              icon: Palette,
              title: "Custom Design",
              description: "Your menu design with professional formatting"
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


        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Printing Options */}
          <Card className="bg-white border border-slate-200 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-xl">
                <Package className="w-5 h-5 text-slate-600" />
                Printing Options
              </CardTitle>
            </CardHeader>
              <CardContent className="space-y-4">
                {printingOptions.map((option) => (
                  <div
                    key={option.id}
                    onClick={() => setSelectedPrinting(option.id)}
                    className={`relative p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                      selectedPrinting === option.id
                        ? 'border-slate-500 bg-slate-50'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    {option.recommended && (
                      <Badge className="absolute -top-2 -right-2 bg-gradient-to-r from-green-500 to-green-600 text-white">
                        Recommended
                      </Badge>
                    )}
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-base">{option.name}</h4>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-slate-900">
                          ${option.pricePerMenu.toFixed(2)}
                        </div>
                        <div className="text-xs text-slate-500">per menu</div>
                      </div>
                    </div>
                    <p className="text-gray-600 text-sm mb-3">{option.description}</p>
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                      <div>Paper: {option.paperType}</div>
                      <div>Finish: {option.finish}</div>
                      <div>Durability: {option.durability}</div>
                      <div>Min Order: {option.minimumOrder}</div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>


          {/* Order Configuration */}
          <Card className="bg-white border border-slate-200 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-xl">
                <ShoppingCart className="w-5 h-5 text-slate-600" />
                Order Configuration
              </CardTitle>
            </CardHeader>
              <CardContent className="space-y-6">
                {/* Quantity */}
                <div>
                  <Label className="text-base font-medium mb-3 block">Quantity</Label>
                  <Input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    min={selectedPrintOption?.minimumOrder}
                    className="text-lg p-3 border-2 focus:border-purple-500"
                  />
                </div>

                {/* Shipping Method */}
                <div>
                  <Label className="text-base font-medium mb-3 block">Shipping Method</Label>
                  <div className="space-y-3">
                    {shippingOptions.map((option) => (
                      <motion.div
                        key={option.id}
                        whileHover={{ scale: 1.02 }}
                        onClick={() => setSelectedShipping(option.id)}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 ${
                          selectedShipping === option.id
                            ? 'border-purple-500 bg-purple-50/50'
                            : 'border-gray-200 hover:border-purple-300 bg-gray-50/50'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="font-semibold">{option.name}</h4>
                            <p className="text-sm text-gray-600">{option.description}</p>
                            <p className="text-xs text-gray-500 mt-1">{option.estimatedDays}</p>
                          </div>
                          <motion.div
                            className="text-right"
                            animate={{ scale: selectedShipping === option.id ? [1, 1.1, 1] : 1 }}
                            transition={{ duration: 0.5 }}
                          >
                            <div className="text-xl font-bold text-purple-600">
                              ${option.price.toFixed(2)}
                            </div>
                          </motion.div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Order Summary */}
                <motion.div
                  className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-200"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 }}
                >
                  <h4 className="font-semibold mb-3 text-lg">Order Summary</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Subtotal ({quantity} menus)</span>
                      <span>${(selectedPrintOption ? selectedPrintOption.pricePerMenu * quantity : 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Shipping</span>
                      <span>${selectedShipOption?.price.toFixed(2)}</span>
                    </div>
                    <Separator />
                    <motion.div 
                      className="flex justify-between font-bold text-lg"
                      animate={{ scale: [1, 1.02, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <span>Total</span>
                      <span className="text-blue-600">
                        ${((selectedPrintOption ? selectedPrintOption.pricePerMenu * quantity : 0) + (selectedShipOption?.price || 0)).toFixed(2)}
                      </span>
                    </motion.div>
                  </div>
                </motion.div>

                {/* Order Button */}
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    onClick={() => setShowOrderForm(true)}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white p-4 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    <CreditCard className="w-5 h-5 mr-2" />
                    Place Order
                  </Button>
                </motion.div>
              </CardContent>
            </Card>
        </div>
      </div>

      {/* Order Form Dialog */}
      <Dialog open={showOrderForm} onOpenChange={setShowOrderForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Complete Your Order
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contactName">Full Name *</Label>
                  <Input
                    id="contactName"
                    value={orderDetails.contactName}
                    onChange={(e) => setOrderDetails(prev => ({ ...prev, contactName: e.target.value }))}
                    placeholder="Enter your full name"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="contactEmail">Email Address *</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={orderDetails.contactEmail}
                    onChange={(e) => setOrderDetails(prev => ({ ...prev, contactEmail: e.target.value }))}
                    placeholder="Enter your email"
                    className="mt-1"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="contactPhone">Phone Number *</Label>
                  <Input
                    id="contactPhone"
                    value={orderDetails.contactPhone}
                    onChange={(e) => setOrderDetails(prev => ({ ...prev, contactPhone: e.target.value }))}
                    placeholder="Enter your phone number"
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Shipping Address */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Shipping Address</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="shippingAddress">Street Address *</Label>
                  <Input
                    id="shippingAddress"
                    value={orderDetails.shippingAddress}
                    onChange={(e) => setOrderDetails(prev => ({ ...prev, shippingAddress: e.target.value }))}
                    placeholder="Enter street address"
                    className="mt-1"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      value={orderDetails.city}
                      onChange={(e) => setOrderDetails(prev => ({ ...prev, city: e.target.value }))}
                      placeholder="City"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">State *</Label>
                    <Input
                      id="state"
                      value={orderDetails.state}
                      onChange={(e) => setOrderDetails(prev => ({ ...prev, state: e.target.value }))}
                      placeholder="State"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="zipCode">ZIP Code *</Label>
                    <Input
                      id="zipCode"
                      value={orderDetails.zipCode}
                      onChange={(e) => setOrderDetails(prev => ({ ...prev, zipCode: e.target.value }))}
                      placeholder="ZIP"
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Special Instructions */}
            <div>
              <Label htmlFor="specialInstructions">Special Instructions (Optional)</Label>
              <Textarea
                id="specialInstructions"
                value={orderDetails.specialInstructions}
                onChange={(e) => setOrderDetails(prev => ({ ...prev, specialInstructions: e.target.value }))}
                placeholder="Any special requirements or notes..."
                rows={3}
                className="mt-1"
              />
            </div>

            {/* Order Summary */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-200">
              <h4 className="font-semibold mb-3">Order Summary</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>{selectedPrintOption?.name} ({quantity} menus)</span>
                  <span>${(selectedPrintOption ? selectedPrintOption.pricePerMenu * quantity : 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{selectedShipOption?.name}</span>
                  <span>${selectedShipOption?.price.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax (8%)</span>
                  <span>${((selectedPrintOption ? selectedPrintOption.pricePerMenu * quantity : 0) * 0.08).toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span className="text-blue-600">
                    ${(
                      (selectedPrintOption ? selectedPrintOption.pricePerMenu * quantity : 0) + 
                      (selectedShipOption?.price || 0) + 
                      ((selectedPrintOption ? selectedPrintOption.pricePerMenu * quantity : 0) * 0.08)
                    ).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => setShowOrderForm(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (!selectedPrintOption || !selectedShipOption) return;

                  const subtotal = selectedPrintOption.pricePerMenu * quantity;
                  const shippingCost = selectedShipOption.price;
                  const tax = subtotal * 0.08;
                  const total = subtotal + shippingCost + tax;

                  try {
                    const response = await apiRequest('POST', `/api/tenants/${tenantId}/restaurants/${restaurantId}/print-orders`, {
                      customerName: orderDetails.contactName,
                      customerEmail: orderDetails.contactEmail,
                      customerPhone: orderDetails.contactPhone,
                      printType: 'menu',
                      printSize: menuLayout || 'A4',
                      printQuality: selectedPrinting,
                      quantity: quantity,
                      design: `Menu Theme: ${selectedTheme}`,
                      specialInstructions: orderDetails.specialInstructions,
                      rushOrder: selectedShipping === 'overnight',
                      deliveryMethod: 'delivery',
                      deliveryAddress: `${orderDetails.shippingAddress}, ${orderDetails.city}, ${orderDetails.state} ${orderDetails.zipCode}`,
                      useSavedPaymentMethod: false
                    });

                    if (response.clientSecret && onOrderCreated) {
                      onOrderCreated(response.clientSecret, response.printOrder, response.savedPaymentMethods);
                    }

                    setShowOrderForm(false);
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

                    toast({
                      title: "Order Created",
                      description: "Your menu printing order has been created successfully!"
                    });
                  } catch (error: any) {
                    toast({
                      title: "Order Failed",
                      description: error.message || "Failed to create order. Please try again.",
                      variant: "destructive"
                    });
                  }
                }}
                disabled={!orderDetails.contactName || !orderDetails.contactEmail || !orderDetails.contactPhone || !orderDetails.shippingAddress || !orderDetails.city || !orderDetails.state || !orderDetails.zipCode}
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Place Order
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}