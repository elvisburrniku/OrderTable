import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, Lock } from "lucide-react";
import { useLocation } from "wouter";

interface PaymentRequiredGuardProps {
  children: React.ReactNode;
  feature?: string;
}

export function PaymentRequiredGuard({ children, feature = "this feature" }: PaymentRequiredGuardProps) {
  const [, setLocation] = useLocation();

  // Get subscription details to check payment status
  const { data: subscriptionData, isLoading } = useQuery({
    queryKey: ["/api/subscription/details"],
    retry: false,
  });

  // Show loading while checking subscription
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Check if payment is required for paid plans
  const requiresPayment = subscriptionData?.plan?.price > 0 && 
    (subscriptionData?.tenant?.subscriptionStatus === 'trial' || 
     subscriptionData?.tenant?.subscriptionStatus === 'unpaid');

  // If payment is not required (free plan or paid plan with active subscription), show the feature
  if (!requiresPayment) {
    return <>{children}</>;
  }

  // Show payment required message for paid plans without active subscription
  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-orange-600" />
          </div>
          <CardTitle className="text-xl font-semibold">Payment Required</CardTitle>
          <CardDescription>
            Complete your subscription to access {feature}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-medium">{subscriptionData?.plan?.name} Plan</span>
              <span className="text-2xl font-bold">${(subscriptionData?.plan?.price || 0) / 100}/month</span>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Billed monthly • Cancel anytime
            </p>
          </div>
          
          <div className="space-y-3">
            <Button 
              onClick={() => setLocation('/setup')} 
              className="w-full"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Complete Payment Setup
            </Button>
            
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Need help? <a href="/help" className="text-blue-600 hover:underline">Contact support</a>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}