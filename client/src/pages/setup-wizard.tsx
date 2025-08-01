import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { CheckCircle, Circle, ArrowRight, ArrowLeft, Building, Clock, Utensils, Settings, CreditCard, Plus } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";

const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "pk_test_your_publishable_key",
);

const restaurantDetailsSchema = z.object({
  address: z.string().min(1, "Address is required"),
  phone: z.string().min(1, "Phone number is required"),
  email: z.string().email("Valid email is required"),
  description: z.string().optional(),
});

const openingHoursSchema = z.object({
  monday: z.object({
    isOpen: z.boolean(),
    openTime: z.string(),
    closeTime: z.string(),
  }),
  tuesday: z.object({
    isOpen: z.boolean(),
    openTime: z.string(),
    closeTime: z.string(),
  }),
  wednesday: z.object({
    isOpen: z.boolean(),
    openTime: z.string(),
    closeTime: z.string(),
  }),
  thursday: z.object({
    isOpen: z.boolean(),
    openTime: z.string(),
    closeTime: z.string(),
  }),
  friday: z.object({
    isOpen: z.boolean(),
    openTime: z.string(),
    closeTime: z.string(),
  }),
  saturday: z.object({
    isOpen: z.boolean(),
    openTime: z.string(),
    closeTime: z.string(),
  }),
  sunday: z.object({
    isOpen: z.boolean(),
    openTime: z.string(),
    closeTime: z.string(),
  }),
});

const tablesSchema = z.object({
  tables: z.array(z.object({
    tableNumber: z.string().min(1, "Table number is required"),
    capacity: z.number().min(1, "Capacity must be at least 1"),
    room: z.string().optional(),
  })).min(1, "At least one table is required"),
});

type RestaurantDetails = z.infer<typeof restaurantDetailsSchema>;
type OpeningHours = z.infer<typeof openingHoursSchema>;
type Tables = z.infer<typeof tablesSchema>;

// Payment method setup component
const PaymentMethodSetup = ({ onSuccess }: { onSuccess: () => void }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const setupIntentMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/billing/setup-intent");
      return response.json();
    },
    onSuccess: async (data) => {
      if (!stripe || !elements) return;

      const cardElement = elements.getElement(CardElement);
      if (!cardElement) return;

      setIsLoading(true);
      
      const { error } = await stripe.confirmCardSetup(data.clientSecret, {
        payment_method: {
          card: cardElement,
        },
      });

      setIsLoading(false);

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Payment method added successfully",
        });
        onSuccess();
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add payment method",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setupIntentMutation.mutate();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
        <CardElement
          options={{
            style: {
              base: {
                fontSize: "16px",
                color: "#424770",
                "::placeholder": {
                  color: "#aab7c4",
                },
              },
            },
          }}
        />
      </div>
      <Button
        type="submit"
        disabled={!stripe || isLoading || setupIntentMutation.isPending}
        className="w-full"
      >
        {isLoading || setupIntentMutation.isPending
          ? "Adding Payment Method..."
          : "Add Payment Method"}
      </Button>
    </form>
  );
};

const steps = [
  {
    id: 1,
    title: "Restaurant Details",
    description: "Basic information about your restaurant",
    icon: Building,
  },
  {
    id: 2,
    title: "Opening Hours",
    description: "Set your weekly operating hours",
    icon: Clock,
  },
  {
    id: 3,
    title: "Tables & Seating",
    description: "Configure your table layout",
    icon: Utensils,
  },
  {
    id: 4,
    title: "Subscription Plan",
    description: "Choose your billing plan and features",
    icon: CreditCard,
  },
  {
    id: 5,
    title: "Complete Setup",
    description: "Finish and start taking bookings",
    icon: Settings,
  },
];

export default function SetupWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const totalSteps = 5; // Updated to match new step count
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [showPaymentSetup, setShowPaymentSetup] = useState(false);
  const [paymentMethodAdded, setPaymentMethodAdded] = useState(false);

  // Get user session to access tenant and restaurant info
  const { data: session } = useQuery({
    queryKey: ["/api/auth/validate"],
    retry: false,
  });

  const tenantId = (session as any)?.tenant?.id;
  const restaurantId = (session as any)?.restaurant?.id;
  const restaurant = (session as any)?.restaurant;

  // Fetch subscription plans for billing step
  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ["/api/subscription-plans"],
    enabled: currentStep === 4, // Only fetch when on billing step
  });

  // Auto-select current plan or free plan when plans are loaded
  useEffect(() => {
    if (plans && plans.length > 0 && !selectedPlanId) {
      const currentPlan = (session as any)?.tenant?.subscriptionPlanId;
      if (currentPlan) {
        setSelectedPlanId(currentPlan);
        // If current plan is paid and has payment method, mark as added
        setPaymentMethodAdded(true);
      } else {
        const freePlan = plans.find((plan: any) => plan.price === 0);
        if (freePlan) {
          setSelectedPlanId(freePlan.id);
        }
      }
    }
  }, [plans, selectedPlanId, session]);

  // Reset payment setup when plan changes
  useEffect(() => {
    if (selectedPlanId && plans) {
      const selectedPlan = plans.find((plan: any) => plan.id === selectedPlanId);
      if (selectedPlan && selectedPlan.price === 0) {
        // Free plan doesn't need payment method
        setPaymentMethodAdded(true);
        setShowPaymentSetup(false);
      } else if (selectedPlan && selectedPlan.price > 0) {
        // Paid plan needs payment method
        const currentPlan = (session as any)?.tenant?.subscriptionPlanId;
        if (selectedPlanId === currentPlan) {
          // Current paid plan, assume payment method exists
          setPaymentMethodAdded(true);
        } else {
          // New paid plan, need to add payment method
          setPaymentMethodAdded(false);
        }
        setShowPaymentSetup(false);
      }
    }
  }, [selectedPlanId, plans, session]);

  // Form configurations
  const restaurantForm = useForm<RestaurantDetails>({
    resolver: zodResolver(restaurantDetailsSchema),
    defaultValues: {
      address: "",
      phone: "",
      email: "",
      description: "",
    },
  });

  // Update form values when session data becomes available
  useEffect(() => {
    if (restaurant) {
      restaurantForm.reset({
        address: restaurant.address || "",
        phone: restaurant.phone || "",
        email: restaurant.email || "",
        description: restaurant.description || "",
      });
    }
  }, [restaurant, restaurantForm]);

  const hoursForm = useForm<OpeningHours>({
    resolver: zodResolver(openingHoursSchema),
    defaultValues: {
      monday: { isOpen: true, openTime: "09:00", closeTime: "22:00" },
      tuesday: { isOpen: true, openTime: "09:00", closeTime: "22:00" },
      wednesday: { isOpen: true, openTime: "09:00", closeTime: "22:00" },
      thursday: { isOpen: true, openTime: "09:00", closeTime: "22:00" },
      friday: { isOpen: true, openTime: "09:00", closeTime: "23:00" },
      saturday: { isOpen: true, openTime: "09:00", closeTime: "23:00" },
      sunday: { isOpen: true, openTime: "10:00", closeTime: "21:00" },
    },
  });

  // Load existing opening hours
  const { data: existingHours } = useQuery({
    queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/opening-hours`],
    enabled: !!tenantId && !!restaurantId,
    retry: false,
  });

  // Update hours form with existing data
  useEffect(() => {
    if (existingHours && Array.isArray(existingHours) && existingHours.length > 0) {
      const daysMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const hoursData: Partial<OpeningHours> = {};
      
      existingHours.forEach((hour: any) => {
        const dayName = daysMap[hour.dayOfWeek] as keyof OpeningHours;
        if (dayName) {
          hoursData[dayName] = {
            isOpen: hour.isOpen,
            openTime: hour.openTime || "09:00",
            closeTime: hour.closeTime || "22:00",
          };
        }
      });
      
      hoursForm.reset(hoursData as OpeningHours);
    }
  }, [existingHours, hoursForm]);

  const tablesForm = useForm<Tables>({
    resolver: zodResolver(tablesSchema),
    defaultValues: {
      tables: [
        { tableNumber: "1", capacity: 2, room: "Main Dining" },
        { tableNumber: "2", capacity: 4, room: "Main Dining" },
        { tableNumber: "3", capacity: 6, room: "Main Dining" },
      ],
    },
  });

  // Load existing tables
  const { data: existingTables } = useQuery({
    queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/tables`],
    enabled: !!tenantId && !!restaurantId,
    retry: false,
  });

  // Load existing rooms for table room names
  const { data: existingRooms } = useQuery({
    queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/rooms`],
    enabled: !!tenantId && !!restaurantId,
    retry: false,
  });

  // Update tables form with existing data
  useEffect(() => {
    if (existingTables && Array.isArray(existingTables) && existingTables.length > 0) {
      const roomsMap = existingRooms?.reduce((acc: any, room: any) => {
        acc[room.id] = room.name;
        return acc;
      }, {}) || {};

      const tablesData = existingTables.map((table: any) => ({
        tableNumber: table.tableNumber,
        capacity: table.capacity,
        room: roomsMap[table.roomId] || "Main Dining",
      }));
      
      tablesForm.reset({ tables: tablesData });
    }
  }, [existingTables, existingRooms, tablesForm]);

  // Booking Settings Form (Step 4)
  const bookingSettingsSchema = z.object({
    maxAdvanceBookingDays: z.number().min(1).max(365),
    minBookingNotice: z.number().min(0).max(72),
    maxPartySize: z.number().min(1).max(50),
    requirePhoneNumber: z.boolean(),
    requireSpecialRequests: z.boolean(),
    autoConfirmBookings: z.boolean(),
  });

  type BookingSettings = z.infer<typeof bookingSettingsSchema>;

  const bookingForm = useForm<BookingSettings>({
    resolver: zodResolver(bookingSettingsSchema),
    defaultValues: {
      maxAdvanceBookingDays: 60,
      minBookingNotice: 2,
      maxPartySize: 12,
      requirePhoneNumber: true,
      requireSpecialRequests: false,
      autoConfirmBookings: true,
    },
  });

  // Notification Settings Form (Step 5)
  const notificationSettingsSchema = z.object({
    emailNotifications: z.boolean(),
    smsNotifications: z.boolean(),
    newBookingAlert: z.boolean(),
    cancellationAlert: z.boolean(),
    reminderEmails: z.boolean(),
    reminderHours: z.number().min(1).max(72),
  });

  type NotificationSettings = z.infer<typeof notificationSettingsSchema>;

  const notificationForm = useForm<NotificationSettings>({
    resolver: zodResolver(notificationSettingsSchema),
    defaultValues: {
      emailNotifications: true,
      smsNotifications: false,
      newBookingAlert: true,
      cancellationAlert: true,
      reminderEmails: true,
      reminderHours: 24,
    },
  });

  // Mutations
  const updateRestaurantMutation = useMutation({
    mutationFn: async (data: RestaurantDetails) => {
      console.log("Submitting restaurant data:", data);
      const response = await apiRequest("PUT", `/api/tenants/${tenantId}/restaurants/${restaurantId}`, data);
      const result = await response.json();
      console.log("Restaurant update response:", result);
      return result;
    },
    onSuccess: (data) => {
      console.log("Restaurant details saved successfully:", data);
      setCompletedSteps(prev => [...prev, 1]);
      toast({ title: "Restaurant details saved!" });
      setCurrentStep(2);
    },
    onError: (error: any) => {
      console.error("Error saving restaurant details:", error);
      toast({
        title: "Error saving restaurant details",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const saveOpeningHoursMutation = useMutation({
    mutationFn: async (data: OpeningHours) => {
      console.log("Submitting opening hours data:", data);
      const hoursArray = Object.entries(data).map(([day, hours], index) => ({
        dayOfWeek: index,
        isOpen: hours.isOpen,
        openTime: hours.openTime,
        closeTime: hours.closeTime,
      }));
      console.log("Formatted hours array:", hoursArray);
      const response = await apiRequest("POST", `/api/tenants/${tenantId}/restaurants/${restaurantId}/opening-hours`, hoursArray);
      const result = await response.json();
      console.log("Opening hours response:", result);
      return result;
    },
    onSuccess: (data) => {
      console.log("Opening hours saved successfully:", data);
      setCompletedSteps(prev => [...prev, 2]);
      toast({ title: "Opening hours saved!" });
      setCurrentStep(3);
    },
    onError: (error: any) => {
      console.error("Error saving opening hours:", error);
      toast({
        title: "Error saving opening hours",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const saveTablesMutation = useMutation({
    mutationFn: async (data: Tables) => {
      console.log("Submitting tables data:", data);
      // First create rooms if they don't exist
      const uniqueRooms = Array.from(new Set(data.tables.map(t => t.room).filter(Boolean)));
      console.log("Creating rooms:", uniqueRooms);
      
      for (const roomName of uniqueRooms) {
        try {
          const roomResponse = await apiRequest("POST", `/api/tenants/${tenantId}/restaurants/${restaurantId}/rooms`, {
            name: roomName,
            description: `${roomName} seating area`,
          });
          console.log("Room created:", await roomResponse.json());
        } catch (error) {
          console.log("Room creation error (might already exist):", error);
        }
      }

      // Then create tables
      console.log("Creating tables:", data.tables);
      for (const table of data.tables) {
        const tableResponse = await apiRequest("POST", `/api/tenants/${tenantId}/restaurants/${restaurantId}/tables`, {
          tableNumber: table.tableNumber,
          capacity: table.capacity,
          room: table.room || "Main Dining",
        });
        console.log("Table created:", await tableResponse.json());
      }
      return true;
    },
    onSuccess: (data) => {
      console.log("Tables configured successfully:", data);
      setCompletedSteps(prev => [...prev, 3]);
      toast({ title: "Tables configured successfully!" });
      setCurrentStep(4);
    },
    onError: (error: any) => {
      console.error("Error saving tables:", error);
      toast({
        title: "Error saving tables",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const saveBookingSettingsMutation = useMutation({
    mutationFn: async (data: BookingSettings) => {
      // Save booking settings to restaurant configuration
      return apiRequest("PUT", `/api/tenants/${tenantId}/restaurants/${restaurantId}`, {
        bookingSettings: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      setCompletedSteps(prev => [...prev, 4]);
      toast({ title: "Booking settings saved!" });
      setCurrentStep(5);
    },
    onError: (error: any) => {
      toast({
        title: "Error saving booking settings",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const saveNotificationSettingsMutation = useMutation({
    mutationFn: async (data: NotificationSettings) => {
      // Save notification settings to restaurant configuration
      return apiRequest("PUT", `/api/tenants/${tenantId}/restaurants/${restaurantId}`, {
        notificationSettings: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      setCompletedSteps(prev => [...prev, 5]);
      toast({ title: "Notification settings saved!" });
      setCurrentStep(6);
    },
    onError: (error: any) => {
      toast({
        title: "Error saving notification settings",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const completeSetupMutation = useMutation({
    mutationFn: async () => {
      // Update subscription plan if changed
      if (selectedPlanId && selectedPlanId !== (session as any)?.tenant?.subscriptionPlanId) {
        await apiRequest("PUT", `/api/tenants/${tenantId}`, {
          subscriptionPlanId: selectedPlanId,
        });
      }
      
      // Mark setup as complete in restaurant settings
      const response = await apiRequest("PUT", `/api/tenants/${tenantId}/restaurants/${restaurantId}`, {
        setupCompleted: true,
      });
      return response.json();
    },
    onSuccess: async (data) => {
      // Update local storage to reflect setup completion
      const storedRestaurant = localStorage.getItem("restaurant");
      if (storedRestaurant) {
        try {
          const restaurant = JSON.parse(storedRestaurant);
          restaurant.setupCompleted = true;
          localStorage.setItem("restaurant", JSON.stringify(restaurant));
        } catch (error) {
          console.error("Error updating restaurant in localStorage:", error);
        }
      }
      
      // Invalidate and refetch the session query to get updated data
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/validate"] });
      
      toast({
        title: "Setup completed successfully!",
        description: "Your restaurant is ready to accept bookings.",
      });
      
      // Wait a moment for the cache to update, then redirect
      setTimeout(() => {
        window.location.href = `/${tenantId}/dashboard`;
      }, 1000);
    },
    onError: (error: any) => {
      toast({
        title: "Error completing setup",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Add table functionality
  const addTable = () => {
    const currentTables = tablesForm.getValues("tables");
    const nextTableNumber = (currentTables.length + 1).toString();
    tablesForm.setValue("tables", [
      ...currentTables,
      { tableNumber: nextTableNumber, capacity: 2, room: "Main Dining" },
    ]);
  };

  const removeTable = (index: number) => {
    const currentTables = tablesForm.getValues("tables");
    tablesForm.setValue("tables", currentTables.filter((_, i) => i !== index));
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <form onSubmit={restaurantForm.handleSubmit(
            (data) => {
              console.log("Form data being submitted:", data);
              updateRestaurantMutation.mutate(data);
            },
            (errors) => {
              console.log("Form validation errors:", errors);
              toast({
                title: "Please fill in all required fields",
                description: "Address, phone number, and email are required",
                variant: "destructive",
              });
            }
          )} className="space-y-4">
            <div>
              <Label htmlFor="address">Restaurant Address</Label>
              <Textarea
                id="address"
                {...restaurantForm.register("address")}
                placeholder="123 Main Street, City, State, ZIP"
              />
              {restaurantForm.formState.errors.address && (
                <p className="text-sm text-red-600 mt-1">
                  {restaurantForm.formState.errors.address.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  {...restaurantForm.register("phone")}
                  placeholder="+1 (555) 123-4567"
                />
                {restaurantForm.formState.errors.phone && (
                  <p className="text-sm text-red-600 mt-1">
                    {restaurantForm.formState.errors.phone.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="email">Contact Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...restaurantForm.register("email")}
                  placeholder="contact@restaurant.com"
                />
                {restaurantForm.formState.errors.email && (
                  <p className="text-sm text-red-600 mt-1">
                    {restaurantForm.formState.errors.email.message}
                  </p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                {...restaurantForm.register("description")}
                placeholder="Tell customers about your restaurant..."
              />
            </div>

            <Button type="submit" className="w-full" disabled={updateRestaurantMutation.isPending}>
              {updateRestaurantMutation.isPending ? "Saving..." : "Save & Continue"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </form>
        );

      case 2:
        return (
          <form onSubmit={hoursForm.handleSubmit((data) => saveOpeningHoursMutation.mutate(data))} className="space-y-4">
            {Object.entries(hoursForm.getValues()).map(([day, hours]) => (
              <div key={day} className="flex items-center space-x-4 p-4 border rounded-lg">
                <div className="w-24">
                  <Label className="capitalize font-medium">{day}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={hours.isOpen}
                    onCheckedChange={(checked) => 
                      hoursForm.setValue(`${day as keyof OpeningHours}.isOpen`, checked)
                    }
                  />
                  <span className="text-sm">{hours.isOpen ? "Open" : "Closed"}</span>
                </div>
                {hours.isOpen && (
                  <>
                    <Input
                      type="time"
                      value={hours.openTime}
                      onChange={(e) => 
                        hoursForm.setValue(`${day as keyof OpeningHours}.openTime`, e.target.value)
                      }
                      className="w-32"
                    />
                    <span>to</span>
                    <Input
                      type="time"
                      value={hours.closeTime}
                      onChange={(e) => 
                        hoursForm.setValue(`${day as keyof OpeningHours}.closeTime`, e.target.value)
                      }
                      className="w-32"
                    />
                  </>
                )}
              </div>
            ))}

            <div className="flex space-x-4">
              <Button type="button" variant="outline" onClick={() => setCurrentStep(1)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button type="submit" className="flex-1" disabled={saveOpeningHoursMutation.isPending}>
                {saveOpeningHoursMutation.isPending ? "Saving..." : "Save & Continue"}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </form>
        );

      case 3:
        return (
          <form onSubmit={tablesForm.handleSubmit((data) => saveTablesMutation.mutate(data))} className="space-y-4">
            <div className="space-y-4">
              {tablesForm.watch("tables").map((table, index) => (
                <div key={index} className="flex items-center space-x-4 p-4 border rounded-lg">
                  <div className="flex-1">
                    <Label>Table Number</Label>
                    <Input
                      value={table.tableNumber}
                      onChange={(e) => 
                        tablesForm.setValue(`tables.${index}.tableNumber`, e.target.value)
                      }
                      placeholder="1"
                    />
                  </div>
                  <div className="flex-1">
                    <Label>Capacity</Label>
                    <Input
                      type="number"
                      min="1"
                      value={table.capacity}
                      onChange={(e) => 
                        tablesForm.setValue(`tables.${index}.capacity`, parseInt(e.target.value) || 1)
                      }
                      placeholder="4"
                    />
                  </div>
                  <div className="flex-1">
                    <Label>Room/Area</Label>
                    <Input
                      value={table.room || ""}
                      onChange={(e) => 
                        tablesForm.setValue(`tables.${index}.room`, e.target.value)
                      }
                      placeholder="Main Dining"
                    />
                  </div>
                  {tablesForm.watch("tables").length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeTable(index)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <Button type="button" variant="outline" onClick={addTable} className="w-full">
              Add Another Table
            </Button>

            <div className="flex space-x-4">
              <Button type="button" variant="outline" onClick={() => setCurrentStep(2)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button type="submit" className="flex-1" disabled={saveTablesMutation.isPending}>
                {saveTablesMutation.isPending ? "Saving..." : "Save & Continue"}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </form>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold mb-2">Choose Your Subscription Plan</h3>
              <p className="text-gray-600">
                Select the plan that best fits your restaurant's needs. You can change or upgrade anytime.
              </p>
            </div>
            
            {plansLoading ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                <span className="ml-3 text-gray-600">Loading subscription plans...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {plans?.map((plan: any) => (
                  <div
                    key={plan.id}
                    className={`border-2 rounded-lg p-6 cursor-pointer transition-all ${
                      selectedPlanId === plan.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
                    }`}
                    onClick={() => {
                      setSelectedPlanId(plan.id);
                      setShowPaymentSetup(false); // Reset payment setup when switching plans
                    }}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-lg font-semibold">{plan.name}</h4>
                          {plan.price > 0 && (
                            <Badge variant="outline" className="text-xs">
                              <CreditCard className="w-3 h-3 mr-1" />
                              Card Required
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {plan.description}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-blue-600">
                          {plan.price === 0 ? 'Free' : `$${plan.price}`}
                        </div>
                        {plan.price > 0 && (
                          <div className="text-sm text-gray-500">per month</div>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      {JSON.parse(plan.features || '[]').map((feature: string, index: number) => (
                        <div key={index} className="flex items-center text-sm">
                          <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-4 text-xs text-gray-500">
                      <div>Max Tables: {plan.maxTables}</div>
                      <div>Max Bookings/Month: {plan.maxBookingsPerMonth}</div>
                      <div>Max Restaurants: {plan.maxRestaurants}</div>
                      {plan.trialDays > 0 && <div>Trial: {plan.trialDays} days</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Payment Method Setup for Paid Plans */}
            {selectedPlanId && plans && showPaymentSetup && (
              <div className="mt-6 p-6 border rounded-lg bg-blue-50 dark:bg-blue-900/20">
                <h4 className="text-lg font-semibold mb-4 flex items-center">
                  <CreditCard className="w-5 h-5 mr-2" />
                  Add Payment Method
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  This plan requires a payment method. Your card will be charged monthly.
                </p>
                <Elements stripe={stripePromise}>
                  <PaymentMethodSetup 
                    onSuccess={() => {
                      setPaymentMethodAdded(true);
                      setShowPaymentSetup(false);
                      toast({
                        title: "Payment method added!",
                        description: "You can now continue with your subscription.",
                      });
                    }} 
                  />
                </Elements>
              </div>
            )}
            
            <div className="flex justify-center pt-4">
              <Button 
                onClick={() => {
                  if (!selectedPlanId) {
                    toast({
                      title: "Please select a plan",
                      description: "You need to choose a subscription plan to continue.",
                      variant: "destructive",
                    });
                    return;
                  }

                  const selectedPlan = plans?.find((plan: any) => plan.id === selectedPlanId);
                  const isPaidPlan = selectedPlan && selectedPlan.price > 0;

                  // If it's a paid plan and no payment method is added yet
                  if (isPaidPlan && !paymentMethodAdded) {
                    setShowPaymentSetup(true);
                    return;
                  }

                  // Continue to next step
                  setCompletedSteps([...completedSteps, 4]);
                  setCurrentStep(5);
                  toast({
                    title: "Plan configured!",
                    description: "Your subscription plan has been set up successfully.",
                  });
                }}
                className="w-full max-w-md"
                disabled={!selectedPlanId}
              >
                {(() => {
                  if (!selectedPlanId) return "Select a Plan";
                  const selectedPlan = plans?.find((plan: any) => plan.id === selectedPlanId);
                  const isPaidPlan = selectedPlan && selectedPlan.price > 0;
                  
                  if (isPaidPlan && !paymentMethodAdded) {
                    return "Continue & Add Payment Method";
                  }
                  return "Continue with Selected Plan";
                })()}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="text-center space-y-6">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">Setup Complete!</h3>
              <p className="text-gray-600">
                Your restaurant is now configured and ready to accept bookings.
                You can always modify these settings later from your dashboard.
              </p>
            </div>
            <div className="space-y-4">
              <div className="text-left space-y-2">
                <h4 className="font-medium">What's been set up:</h4>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                    Restaurant contact information
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                    Operating hours configured
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                    Tables and seating layout
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                    Subscription plan selected
                  </li>
                </ul>
              </div>
              <Button onClick={() => completeSetupMutation.mutate()} className="w-full" disabled={completeSetupMutation.isPending}>
                {completeSetupMutation.isPending ? "Completing..." : "Go to Dashboard"}
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (!session) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Welcome to Your Restaurant Management System
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Let's get your restaurant set up in just a few steps
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const isCompleted = completedSteps.includes(step.id);
              const isCurrent = currentStep === step.id;
              const Icon = step.icon;

              return (
                <div key={step.id} className="flex items-center">
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                      isCompleted
                        ? "bg-green-600 border-green-600 text-white"
                        : isCurrent
                        ? "border-blue-600 text-blue-600"
                        : "border-gray-300 text-gray-300"
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle className="w-6 h-6" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`w-full h-1 mx-4 ${
                        isCompleted ? "bg-green-600" : "bg-gray-300"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-2">
            {steps.map((step) => (
              <div key={step.id} className="text-center" style={{ width: `calc(100% / ${totalSteps})` }}>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {step.title}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Current Step Content */}
        <Card>
          <CardHeader>
            <CardTitle>{steps[currentStep - 1]?.title}</CardTitle>
            <CardDescription>{steps[currentStep - 1]?.description}</CardDescription>
          </CardHeader>
          <CardContent>{renderStepContent()}</CardContent>
        </Card>

        {/* Skip Setup Option */}
        <div className="mt-6 text-center">
          <Button
            variant="ghost"
            onClick={() => setLocation("/dashboard")}
            className="text-sm text-gray-600 dark:text-gray-400"
          >
            Skip setup and go to dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}