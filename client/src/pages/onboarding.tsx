import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { 
  CheckCircle, 
  ArrowRight, 
  ArrowLeft, 
  Building, 
  Clock, 
  Settings, 
  CreditCard, 
  User,
  Palette,
  MessageCircle,
  Mic,
  Volume2,
  Bot
} from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";

const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "pk_test_your_publishable_key",
);

const personalInfoSchema = z.object({
  name: z.string().min(1, "Name is required"),
  birthDay: z.string().min(1, "Day is required"),
  birthMonth: z.string().min(1, "Month is required"),
  birthYear: z.string().min(1, "Year is required"),
  emailOptIn: z.boolean().default(false),
});

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

type PersonalInfo = z.infer<typeof personalInfoSchema>;
type RestaurantDetails = z.infer<typeof restaurantDetailsSchema>;
type OpeningHours = z.infer<typeof openingHoursSchema>;

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
    title: "Choose your style",
    description: "Select your preferred theme",
    icon: Palette,
  },
  {
    id: 2,
    title: "Personal Info",
    description: "Help us personalize your experience",
    icon: User,
  },
  {
    id: 3,
    title: "How did you hear about us?",
    description: "Tell us where you found us",
    icon: MessageCircle,
  },
  {
    id: 4,
    title: "Choose your platform",
    description: "Select the features you need",
    icon: Bot,
  },
  {
    id: 5,
    title: "Restaurant Details",
    description: "Basic information about your restaurant",
    icon: Building,
  },
  {
    id: 6,
    title: "Opening Hours",
    description: "Set your weekly operating hours",
    icon: Clock,
  },
  {
    id: 7,
    title: "Subscription Plan",
    description: "Choose your billing plan and features",
    icon: CreditCard,
  },
  {
    id: 8,
    title: "Complete Setup",
    description: "Finish and start taking bookings",
    icon: Settings,
  },
];

export default function Onboarding() {
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const totalSteps = 8;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [showPaymentSetup, setShowPaymentSetup] = useState(false);
  const [paymentMethodAdded, setPaymentMethodAdded] = useState(false);
  
  // Theme and personal preferences
  const [selectedTheme, setSelectedTheme] = useState<'light' | 'dark'>('light');
  const [selectedSource, setSelectedSource] = useState<string>('');
  const [selectedPlatform, setSelectedPlatform] = useState<'creative' | 'conversational'>('creative');

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
  });

  // Form hooks
  const personalInfoForm = useForm<PersonalInfo>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: {
      name: "",
      birthDay: "",
      birthMonth: "",
      birthYear: "",
      emailOptIn: false,
    },
  });

  const restaurantForm = useForm<RestaurantDetails>({
    resolver: zodResolver(restaurantDetailsSchema),
    defaultValues: {
      address: restaurant?.address || "",
      phone: restaurant?.phone || "",
      email: restaurant?.email || "",
      description: restaurant?.description || "",
    },
  });

  const openingHoursForm = useForm<OpeningHours>({
    resolver: zodResolver(openingHoursSchema),
    defaultValues: {
      monday: { isOpen: true, openTime: "09:00", closeTime: "17:00" },
      tuesday: { isOpen: true, openTime: "09:00", closeTime: "17:00" },
      wednesday: { isOpen: true, openTime: "09:00", closeTime: "17:00" },
      thursday: { isOpen: true, openTime: "09:00", closeTime: "17:00" },
      friday: { isOpen: true, openTime: "09:00", closeTime: "17:00" },
      saturday: { isOpen: true, openTime: "09:00", closeTime: "17:00" },
      sunday: { isOpen: false, openTime: "09:00", closeTime: "17:00" },
    },
  });

  // Mutations
  const savePersonalInfoMutation = useMutation({
    mutationFn: async (data: PersonalInfo) => {
      const response = await apiRequest("POST", "/api/onboarding/personal-info", {
        body: JSON.stringify({ ...data, theme: selectedTheme, source: selectedSource, platform: selectedPlatform }),
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Personal information saved successfully" });
      nextStep();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save personal information",
        variant: "destructive",
      });
    },
  });

  const updateRestaurantMutation = useMutation({
    mutationFn: async (data: RestaurantDetails) => {
      const response = await apiRequest("PUT", `/api/restaurants/${restaurantId}`, {
        body: JSON.stringify(data),
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Restaurant details updated successfully" });
      nextStep();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update restaurant details",
        variant: "destructive",
      });
    },
  });

  const updateOpeningHoursMutation = useMutation({
    mutationFn: async (data: OpeningHours) => {
      const response = await apiRequest("PUT", `/api/restaurants/${restaurantId}/opening-hours`, {
        body: JSON.stringify(data),
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Opening hours updated successfully" });
      nextStep();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update opening hours",
        variant: "destructive",
      });
    },
  });

  const completeOnboardingMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/onboarding/complete");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Onboarding completed successfully!" });
      // Show notification about tables/rooms setup
      setTimeout(() => {
        toast({
          title: "Setup Reminder",
          description: "Don't forget to configure your tables and rooms in the dashboard settings.",
          variant: "default",
        });
      }, 2000);
      setLocation("/dashboard");
    },
  });

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCompletedSteps([...completedSteps, currentStep]);
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = (step: number) => {
    switch (step) {
      case 1:
        nextStep();
        break;
      case 2:
        nextStep();
        break;
      case 3:
        nextStep();
        break;
      case 4:
        nextStep();
        break;
      case 5:
        restaurantForm.handleSubmit((data) => updateRestaurantMutation.mutate(data))();
        break;
      case 6:
        openingHoursForm.handleSubmit((data) => updateOpeningHoursMutation.mutate(data))();
        break;
      case 7:
        if (selectedPlanId) {
          nextStep();
        }
        break;
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="text-center space-y-8">
            <h3 className="text-2xl font-semibold">Choose your style</h3>
            <div className="flex justify-center space-x-6">
              <div
                className={`cursor-pointer border-2 rounded-lg p-4 transition-all ${
                  selectedTheme === 'light' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onClick={() => setSelectedTheme('light')}
              >
                <div className="w-40 h-24 bg-white border rounded-lg flex items-center justify-center mb-2">
                  <div className="text-xs text-gray-800">Aa</div>
                </div>
                <p className="font-medium">Light</p>
              </div>
              <div
                className={`cursor-pointer border-2 rounded-lg p-4 transition-all ${
                  selectedTheme === 'dark' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onClick={() => setSelectedTheme('dark')}
              >
                <div className="w-40 h-24 bg-gray-900 border rounded-lg flex items-center justify-center mb-2">
                  <div className="text-xs text-white">Aa</div>
                </div>
                <p className="font-medium">Dark</p>
              </div>
            </div>
            <Button onClick={() => handleSubmit(1)} className="w-full max-w-xs">
              Continue
            </Button>
          </div>
        );

      case 2:
        return (
          <div className="text-center space-y-6">
            <h3 className="text-2xl font-semibold">Help us personalize your experience</h3>
            <div className="max-w-md mx-auto space-y-4 text-left">
              <div>
                <Label htmlFor="name">What's your name?</Label>
                <Input
                  id="name"
                  {...personalInfoForm.register("name")}
                  placeholder="Enter your name"
                  className="mt-1"
                />
                {personalInfoForm.formState.errors.name && (
                  <p className="text-red-500 text-sm mt-1">{personalInfoForm.formState.errors.name.message}</p>
                )}
              </div>
              <div>
                <Label>What's your date of birth?</Label>
                <div className="flex space-x-2 mt-1">
                  <Select value={personalInfoForm.watch("birthDay")} onValueChange={(value) => personalInfoForm.setValue("birthDay", value)}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Day" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 31 }, (_, i) => (
                        <SelectItem key={i + 1} value={(i + 1).toString()}>
                          {i + 1}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={personalInfoForm.watch("birthMonth")} onValueChange={(value) => personalInfoForm.setValue("birthMonth", value)}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Month" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="January">January</SelectItem>
                      <SelectItem value="February">February</SelectItem>
                      <SelectItem value="March">March</SelectItem>
                      <SelectItem value="April">April</SelectItem>
                      <SelectItem value="May">May</SelectItem>
                      <SelectItem value="June">June</SelectItem>
                      <SelectItem value="July">July</SelectItem>
                      <SelectItem value="August">August</SelectItem>
                      <SelectItem value="September">September</SelectItem>
                      <SelectItem value="October">October</SelectItem>
                      <SelectItem value="November">November</SelectItem>
                      <SelectItem value="December">December</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={personalInfoForm.watch("birthYear")} onValueChange={(value) => personalInfoForm.setValue("birthYear", value)}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 80 }, (_, i) => {
                        const year = new Date().getFullYear() - i;
                        return (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="emailOptIn"
                  checked={personalInfoForm.watch("emailOptIn")}
                  onCheckedChange={(checked) => personalInfoForm.setValue("emailOptIn", !!checked)}
                />
                <Label htmlFor="emailOptIn" className="text-sm">
                  I want to receive updates, special offers, and promotional emails.
                  I understand that I can opt out at any time.
                </Label>
              </div>
            </div>
            <Button onClick={() => handleSubmit(2)} className="w-full max-w-xs">
              Next
            </Button>
          </div>
        );

      case 3:
        const sourceOptions = [
          { id: "work", icon: Building, label: "From work" },
          { id: "news", icon: MessageCircle, label: "In the news" },
          { id: "friends", icon: User, label: "Friends or School" },
          { id: "podcast", icon: Mic, label: "Podcast" },
          { id: "newsletter", icon: MessageCircle, label: "Newsletter or Blog" },
          { id: "facebook", icon: MessageCircle, label: "Facebook" },
          { id: "tiktok", icon: Volume2, label: "TikTok" },
          { id: "linkedin", icon: Building, label: "LinkedIn" },
          { id: "x", icon: MessageCircle, label: "X" },
          { id: "google", icon: MessageCircle, label: "Google" },
          { id: "instagram", icon: MessageCircle, label: "Instagram" },
          { id: "youtube", icon: Volume2, label: "YouTube" },
          { id: "dont-remember", icon: MessageCircle, label: "Don't remember" },
          { id: "other", icon: MessageCircle, label: "Other" },
        ];

        return (
          <div className="text-center space-y-6">
            <h3 className="text-2xl font-semibold">How did you hear about us?</h3>
            <div className="grid grid-cols-2 gap-3 max-w-2xl mx-auto">
              {sourceOptions.map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  type="button"
                  className={`p-4 border rounded-lg text-left flex items-center space-x-3 transition-all ${
                    selectedSource === id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  onClick={() => setSelectedSource(id)}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{label}</span>
                </button>
              ))}
            </div>
            <div className="space-y-2">
              <Button 
                onClick={() => handleSubmit(3)} 
                className="w-full max-w-xs"
                disabled={!selectedSource}
              >
                Continue
              </Button>
              <Button variant="ghost" onClick={() => handleSubmit(3)} className="text-sm">
                Skip
              </Button>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="text-center space-y-6">
            <div>
              <h3 className="text-2xl font-semibold mb-2">Choose your platform</h3>
              <p className="text-gray-600">Switch between platforms at any time</p>
            </div>
            <div className="flex justify-center space-x-6">
              <div
                className={`cursor-pointer border rounded-lg p-6 max-w-sm transition-all ${
                  selectedPlatform === 'creative'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onClick={() => setSelectedPlatform('creative')}
              >
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                    <Mic className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-left">Creative Platform</h4>
                    <p className="text-sm text-gray-600 text-left">Create AI audio</p>
                  </div>
                </div>
                <div className="text-left text-sm space-y-1">
                  <p className="font-medium mb-2">Features:</p>
                  <div className="grid grid-cols-2 gap-1 text-xs text-gray-600">
                    <div>• Text to Speech</div>
                    <div>• Voice Changer</div>
                    <div>• Sound Effects</div>
                    <div>• Voice Isolator</div>
                    <div>• Studio</div>
                    <div>• Dubbing</div>
                    <div>• Speech to Text</div>
                    <div>• Music <Badge className="text-xs">New</Badge></div>
                  </div>
                </div>
              </div>
              <div
                className={`cursor-pointer border rounded-lg p-6 max-w-sm transition-all ${
                  selectedPlatform === 'conversational'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onClick={() => setSelectedPlatform('conversational')}
              >
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-left">Conversational AI</h4>
                    <p className="text-sm text-gray-600 text-left">Build and manage your AI agents</p>
                  </div>
                </div>
                <div className="text-left text-sm space-y-1">
                  <p className="font-medium mb-2">Features:</p>
                  <div className="grid grid-cols-2 gap-1 text-xs text-gray-600">
                    <div>• Agents</div>
                    <div>• Knowledge Base</div>
                    <div>• Tools</div>
                    <div>• Conversations</div>
                    <div>• Integrations</div>
                    <div>• Phone numbers</div>
                    <div>• Outbound</div>
                  </div>
                </div>
              </div>
            </div>
            <Button onClick={() => handleSubmit(4)} className="w-full max-w-xs">
              Continue
            </Button>
          </div>
        );

      case 5:
        return (
          <form onSubmit={restaurantForm.handleSubmit((data) => updateRestaurantMutation.mutate(data))} className="space-y-4">
            <div>
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                {...restaurantForm.register("address")}
                placeholder="Enter restaurant address"
              />
              {restaurantForm.formState.errors.address && (
                <p className="text-red-500 text-sm mt-1">{restaurantForm.formState.errors.address.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                {...restaurantForm.register("phone")}
                placeholder="Enter phone number"
              />
              {restaurantForm.formState.errors.phone && (
                <p className="text-red-500 text-sm mt-1">{restaurantForm.formState.errors.phone.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...restaurantForm.register("email")}
                placeholder="Enter email address"
              />
              {restaurantForm.formState.errors.email && (
                <p className="text-red-500 text-sm mt-1">{restaurantForm.formState.errors.email.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                {...restaurantForm.register("description")}
                placeholder="Brief description of your restaurant"
                rows={3}
              />
            </div>
            <div className="flex space-x-3">
              <Button type="button" variant="outline" onClick={prevStep} className="flex-1">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>
              <Button type="submit" disabled={updateRestaurantMutation.isPending} className="flex-1">
                {updateRestaurantMutation.isPending ? "Saving..." : "Continue"}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </form>
        );

      case 6:
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

        return (
          <form onSubmit={openingHoursForm.handleSubmit((data) => updateOpeningHoursMutation.mutate(data))} className="space-y-4">
            <p className="text-gray-600">Set your weekly operating hours. Customers will only be able to book during these times.</p>
            <div className="space-y-4">
              {days.map((day) => (
                <div key={day} className="flex items-center space-x-4 p-4 border rounded-lg">
                  <div className="min-w-[100px]">
                    <p className="font-medium capitalize">{day}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={openingHoursForm.watch(`${day}.isOpen`)}
                      onCheckedChange={(checked) => openingHoursForm.setValue(`${day}.isOpen`, checked)}
                    />
                    <span className="text-sm">Open</span>
                  </div>
                  {openingHoursForm.watch(`${day}.isOpen`) && (
                    <div className="flex items-center space-x-2">
                      <Input
                        type="time"
                        {...openingHoursForm.register(`${day}.openTime`)}
                        className="w-32"
                      />
                      <span className="text-sm">to</span>
                      <Input
                        type="time"
                        {...openingHoursForm.register(`${day}.closeTime`)}
                        className="w-32"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex space-x-3">
              <Button type="button" variant="outline" onClick={prevStep} className="flex-1">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>
              <Button type="submit" disabled={updateOpeningHoursMutation.isPending} className="flex-1">
                {updateOpeningHoursMutation.isPending ? "Saving..." : "Continue"}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </form>
        );

      case 7:
        if (plansLoading) {
          return <div className="text-center">Loading subscription plans...</div>;
        }

        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-semibold mb-2">Choose Your Subscription Plan</h3>
              <p className="text-gray-600">Select the plan that best fits your restaurant's needs</p>
            </div>
            
            <div className="grid gap-4">
              {plans?.map((plan: any) => (
                <div
                  key={plan.id}
                  className={`border rounded-lg p-6 cursor-pointer transition-all ${
                    selectedPlanId === plan.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  onClick={() => setSelectedPlanId(plan.id)}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-semibold text-lg">{plan.name}</h4>
                      <p className="text-gray-600">{plan.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">${plan.price_per_month}</p>
                      <p className="text-gray-500">/month</p>
                    </div>
                  </div>
                  <ul className="space-y-2 text-sm">
                    {plan.features?.map((feature: string, index: number) => (
                      <li key={index} className="flex items-center">
                        <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="flex space-x-3">
              <Button type="button" variant="outline" onClick={prevStep} className="flex-1">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>
              <Button 
                onClick={() => handleSubmit(7)} 
                disabled={!selectedPlanId}
                className="flex-1"
              >
                Continue with Selected Plan
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        );

      case 8:
        return (
          <div className="text-center space-y-6">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">Onboarding Complete!</h3>
              <p className="text-gray-600">
                Your restaurant is now configured and ready to start. You can always modify
                these settings later from your dashboard.
              </p>
            </div>
            <div className="space-y-4">
              <div className="text-left space-y-2">
                <h4 className="font-medium">What's been set up:</h4>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                    Theme and personal preferences
                  </li>
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
                    Subscription plan selected
                  </li>
                </ul>
              </div>
              <div className="text-left p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Next step:</strong> Configure your tables and rooms in the dashboard settings 
                  to start accepting bookings.
                </p>
              </div>
              <Button 
                onClick={() => completeOnboardingMutation.mutate()} 
                className="w-full" 
                disabled={completeOnboardingMutation.isPending}
              >
                {completeOnboardingMutation.isPending ? "Completing..." : "Go to Dashboard"}
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const progressSteps = Math.min(8, currentStep); // Progress dots

  if (!session) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-black text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Progress Dots */}
        <div className="flex justify-center mb-12">
          {Array.from({ length: progressSteps }, (_, i) => (
            <div key={i} className="flex items-center">
              <div
                className={`w-2 h-2 rounded-full ${
                  i < completedSteps.length
                    ? 'bg-white'
                    : i === currentStep - 1
                    ? 'bg-white'
                    : 'bg-gray-600'
                }`}
              />
              {i < progressSteps - 1 && <div className="w-8 h-px bg-gray-600 mx-2" />}
            </div>
          ))}
        </div>

        {/* Current Step Content */}
        <div className="bg-black min-h-[500px] flex items-center justify-center">
          {renderStepContent()}
        </div>

        {/* Skip Setup Option */}
        {currentStep < 8 && (
          <div className="mt-6 text-center">
            <Button
              variant="ghost"
              onClick={() => setLocation("/dashboard")}
              className="text-sm text-gray-400 hover:text-gray-300"
            >
              Skip onboarding and go to dashboard
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}