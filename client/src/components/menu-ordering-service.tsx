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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative overflow-hidden">
      {/* Floating Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute bg-gradient-to-r from-blue-200/20 to-purple-200/20 rounded-full"
            style={{
              width: `${120 + i * 40}px`,
              height: `${120 + i * 40}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              x: [0, 100, 0],
              y: [0, -100, 0],
              rotate: [0, 180, 360],
            }}
            transition={{
              duration: 20 + i * 5,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        ))}
      </div>

      <div className="relative z-10 p-8">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <motion.h1 
            className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4"
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            Professional Menu Printing Service
          </motion.h1>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Order high-quality printed menus delivered directly to your restaurant
          </p>
        </motion.div>

        {/* Service Features */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="grid md:grid-cols-3 gap-8 mb-12"
        >
          {[
            {
              icon: Shield,
              title: "Professional Quality",
              description: "Restaurant-grade printing with premium materials",
              color: "from-blue-500 to-blue-600"
            },
            {
              icon: Zap,
              title: "Fast Delivery",
              description: "Quick turnaround with multiple shipping options",
              color: "from-green-500 to-green-600"
            },
            {
              icon: Palette,
              title: "Custom Design",
              description: "Your menu design with professional formatting",
              color: "from-purple-500 to-purple-600"
            }
          ].map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 + index * 0.1 }}
              whileHover={{ scale: 1.05, y: -5 }}
              className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300"
            >
              <motion.div
                className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 mx-auto`}
                whileHover={{ rotate: 10 }}
                transition={{ duration: 0.3 }}
              >
                <feature.icon className="w-8 h-8 text-white" />
              </motion.div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2 text-center">{feature.title}</h3>
              <p className="text-gray-600 text-center">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Printing Options */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <Card className="bg-white/80 backdrop-blur-xl border-white/20 shadow-2xl">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <motion.div
                    animate={{ rotate: [0, 5, -5, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Package className="w-6 h-6 text-blue-600" />
                  </motion.div>
                  Printing Options
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {printingOptions.map((option) => (
                  <motion.div
                    key={option.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    whileHover={{ scale: 1.02 }}
                    onClick={() => setSelectedPrinting(option.id)}
                    className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 ${
                      selectedPrinting === option.id
                        ? 'border-blue-500 bg-blue-50/50'
                        : 'border-gray-200 hover:border-blue-300 bg-gray-50/50'
                    }`}
                  >
                    {option.recommended && (
                      <Badge className="absolute -top-2 -right-2 bg-gradient-to-r from-green-500 to-green-600 text-white">
                        Recommended
                      </Badge>
                    )}
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-lg">{option.name}</h4>
                      <motion.div
                        className="text-right"
                        animate={{ scale: selectedPrinting === option.id ? [1, 1.1, 1] : 1 }}
                        transition={{ duration: 0.5 }}
                      >
                        <div className="text-2xl font-bold text-blue-600">
                          ${option.pricePerMenu.toFixed(2)}
                        </div>
                        <div className="text-sm text-gray-500">per menu</div>
                      </motion.div>
                    </div>
                    <p className="text-gray-600 text-sm mb-3">{option.description}</p>
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                      <div>Paper: {option.paperType}</div>
                      <div>Finish: {option.finish}</div>
                      <div>Durability: {option.durability}</div>
                      <div>Min Order: {option.minimumOrder}</div>
                    </div>
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          </motion.div>

          {/* Order Configuration */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <Card className="bg-white/80 backdrop-blur-xl border-white/20 shadow-2xl">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <motion.div
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  >
                    <ShoppingCart className="w-6 h-6 text-purple-600" />
                  </motion.div>
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
          </motion.div>
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