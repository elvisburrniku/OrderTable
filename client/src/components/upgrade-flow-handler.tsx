import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Alert, AlertDescription } from './ui/alert';
import { PaymentMethodGuard } from './payment-method-guard';
import { CreditCard, AlertTriangle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';

interface UpgradeFlowHandlerProps {
  children: React.ReactNode;
  targetPlan?: string;
  buttonText?: string;
  className?: string;
}

interface BillingInfo {
  paymentMethods: Array<{
    id: string;
    type: string;
  }>;
}

export function UpgradeFlowHandler({ 
  children, 
  targetPlan = "Enterprise", 
  buttonText = "Upgrade Plan",
  className = ""
}: UpgradeFlowHandlerProps) {
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: billingInfo } = useQuery<BillingInfo>({
    queryKey: ["/api/billing/info"],
  });

  const hasPaymentMethod = billingInfo?.paymentMethods && billingInfo.paymentMethods.length > 0;

  const handleUpgradeClick = () => {
    if (!hasPaymentMethod) {
      setShowUpgradeDialog(true);
    } else {
      // Navigate directly to billing page
      const currentPath = window.location.pathname;
      const tenantId = currentPath.split('/')[1];
      if (tenantId && !isNaN(Number(tenantId))) {
        setLocation(`/${tenantId}/billing`);
      } else {
        setLocation('/billing');
      }
    }
  };

  const handlePaymentMethodAdded = () => {
    setShowUpgradeDialog(false);
    toast({
      title: "Payment Method Added",
      description: "You can now proceed with your upgrade."
    });
    
    // Navigate to billing page after payment method is added
    const currentPath = window.location.pathname;
    const tenantId = currentPath.split('/')[1];
    if (tenantId && !isNaN(Number(tenantId))) {
      setLocation(`/${tenantId}/billing`);
    } else {
      setLocation('/billing');
    }
  };

  const handleAddPaymentLater = () => {
    setShowUpgradeDialog(false);
    // Still navigate to billing page to show the payment requirement
    const currentPath = window.location.pathname;
    const tenantId = currentPath.split('/')[1];
    if (tenantId && !isNaN(Number(tenantId))) {
      setLocation(`/${tenantId}/billing`);
    } else {
      setLocation('/billing');
    }
  };

  return (
    <>
      <div onClick={handleUpgradeClick} className={className}>
        {children}
      </div>

      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Method Required
            </DialogTitle>
            <DialogDescription>
              To upgrade to {targetPlan}, please add a payment method first
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Alert className="border-blue-200 bg-blue-50">
              <AlertTriangle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <strong>Why do we need this?</strong> A payment method ensures uninterrupted service and enables automatic billing for your upgraded plan.
              </AlertDescription>
            </Alert>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                What happens next:
              </h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Add your payment method securely</li>
                <li>• Choose your {targetPlan} plan</li>
                <li>• Start using advanced features immediately</li>
                <li>• No charges until your trial ends</li>
              </ul>
            </div>

            <PaymentMethodGuard 
              onPaymentMethodAdded={handlePaymentMethodAdded}
              requiredFor={`${targetPlan} upgrade`}
            >
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="font-medium text-green-800">Payment method configured!</p>
                <p className="text-sm text-green-600">You can now upgrade to {targetPlan}</p>
              </div>
            </PaymentMethodGuard>

            <div className="flex gap-3 pt-2">
              <Button 
                variant="outline" 
                onClick={handleAddPaymentLater}
                className="flex-1"
              >
                Add Later
              </Button>
              <Button 
                onClick={() => {
                  setShowUpgradeDialog(false);
                  const currentPath = window.location.pathname;
                  const tenantId = currentPath.split('/')[1];
                  if (tenantId && !isNaN(Number(tenantId))) {
                    setLocation(`/${tenantId}/billing`);
                  } else {
                    setLocation('/billing');
                  }
                }}
                className="flex-1"
              >
                Go to Billing
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}