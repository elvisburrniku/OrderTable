import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface ApiError {
  error: boolean;
  type: string;
  message: string;
  timestamp: string;
}

export function useErrorHandler() {
  const [error, setError] = useState<ApiError | null>(null);
  const { toast } = useToast();

  const handleError = useCallback((error: any) => {
    console.error('API Error:', error);

    // Check if it's an API error response
    if (error.response?.data?.error) {
      const apiError = error.response.data as ApiError;
      setError(apiError);
      
      // Show toast with user-friendly message
      toast({
        title: "Error",
        description: apiError.message,
        variant: "destructive",
      });
    } else if (error.message) {
      // Generic error
      const genericError: ApiError = {
        error: true,
        type: 'UNKNOWN_ERROR',
        message: error.message,
        timestamp: new Date().toISOString()
      };
      setError(genericError);
      
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      // Fallback error
      const fallbackError: ApiError = {
        error: true,
        type: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred. Please try again.',
        timestamp: new Date().toISOString()
      };
      setError(fallbackError);
      
      toast({
        title: "Error",
        description: fallbackError.message,
        variant: "destructive",
      });
    }
  }, [toast]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    error,
    handleError,
    clearError
  };
}