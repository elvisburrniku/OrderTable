import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, AlertTriangle } from "lucide-react";
import { Link } from "wouter";

interface PaymentRequiredGuardProps {
  children: React.ReactNode;
}

export function PaymentRequiredGuard({ children }: PaymentRequiredGuardProps) {
  const { data: subscriptionData } = useQuery({
    queryKey: ["/api/subscription/details"],
    retry: false,
  });

  const tenant = subscriptionData?.tenant;
  const plan = subscriptionData?.plan;

  // Check if payment is required for paid plans
  const requiresPayment = plan?.price > 0 && 
    (tenant?.subscriptionStatus === 'trial' || 
     tenant?.subscriptionStatus === 'unpaid' ||
     tenant?.subscriptionStatus === 'past_due');

  // If no payment required or on free plan, render children
  if (!requiresPayment || plan?.price === 0) {
    return <>{children}</>;
  }

  // Show payment required message for trial/unpaid accounts
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
            {tenant?.subscriptionStatus === 'trial' ? (
              <CreditCard className="w-8 h-8 text-amber-600" />
            ) : (
              <AlertTriangle className="w-8 h-8 text-red-600" />
            )}
          </div>
          <CardTitle>
            {tenant?.subscriptionStatus === 'trial' 
              ? 'Trial Period Active' 
              : 'Payment Required'}
          </CardTitle>
          <CardDescription>
            {tenant?.subscriptionStatus === 'trial' 
              ? `Your ${plan?.trialDays}-day trial for the ${plan?.name} plan is active. Add a payment method to continue after the trial ends.`
              : 'Your subscription requires payment to access premium features. Please add a payment method to continue.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-medium">{plan?.name} Plan</span>
              <span className="text-2xl font-bold">
                ${(plan?.price || 0) / 100}
                <span className="text-sm font-normal text-gray-600">/month</span>
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Billed monthly • Cancel anytime
            </p>
          </div>
          
          <div className="space-y-3">
            <Link href={`/${tenant?.id}/billing`}>
              <Button className="w-full">
                <CreditCard className="w-4 h-4 mr-2" />
                Add Payment Method
              </Button>
            </Link>
            
            <Link href={`/${tenant?.id}/subscription`}>
              <Button variant="outline" className="w-full">
                Change Plan
              </Button>
            </Link>
          </div>

          <div className="text-center">
            <p className="text-xs text-gray-500">
              You can still access basic features while on trial or after payment.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}