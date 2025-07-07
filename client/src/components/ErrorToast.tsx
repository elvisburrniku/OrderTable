import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

interface ErrorToastProps {
  error: any;
  onDismiss?: () => void;
}

export function ErrorToast({ error, onDismiss }: ErrorToastProps) {
  const { toast } = useToast();

  useEffect(() => {
    if (!error) return;

    // Check if it's our API error format
    if (error.error && error.type && error.message) {
      let title = 'Error';
      let description = error.message;

      // Customize based on error type
      switch (error.type) {
        case 'SUBSCRIPTION_LIMIT':
          title = 'Subscription Limit Reached';
          break;
        case 'TABLE_LIMIT':
          title = 'Table Limit Reached';
          break;
        case 'PAYMENT_ERROR':
          title = 'Payment Issue';
          break;
        case 'VALIDATION_ERROR':
          title = 'Invalid Input';
          break;
        case 'AUTHENTICATION_ERROR':
          title = 'Authentication Failed';
          break;
        case 'PERMISSION_ERROR':
          title = 'Access Denied';
          break;
        case 'EXTERNAL_SERVICE_ERROR':
          title = 'Service Unavailable';
          break;
        case 'DATABASE_ERROR':
        case 'SYSTEM_ERROR':
          title = 'Technical Issue';
          description = 'We encountered a technical issue. Our team has been notified. Please try again in a few moments.';
          break;
      }

      toast({
        title,
        description,
        variant: "destructive",
      });
    } else if (error.message) {
      // Generic error with message
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      // Unknown error
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    }

    if (onDismiss) {
      onDismiss();
    }
  }, [error, toast, onDismiss]);

  return null;
}