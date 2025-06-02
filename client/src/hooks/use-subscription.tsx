
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth.tsx";

export function useSubscription() {
  const { user } = useAuth();

  const { data: subscription, isLoading } = useQuery({
    queryKey: ['/api/users', user?.id, 'subscription'],
    enabled: !!user
  });

  const { data: plans = [] } = useQuery({
    queryKey: ['/api/subscription-plans'],
    enabled: !!user
  });

  const currentPlan = plans.find((plan: any) => plan.id === subscription?.planId);

  const hasFeature = (feature: string): boolean => {
    if (!currentPlan) return false;
    try {
      const features = JSON.parse(currentPlan.features);
      return features.includes(feature);
    } catch {
      return false;
    }
  };

  const canCreateTable = (currentTableCount: number): boolean => {
    if (!currentPlan) return currentTableCount < 3; // Free tier: 3 tables
    return currentTableCount < currentPlan.maxTables;
  };

  const canCreateBooking = (currentMonthBookings: number): boolean => {
    if (!currentPlan) return currentMonthBookings < 20; // Free tier: 20 bookings
    return currentMonthBookings < currentPlan.maxBookingsPerMonth;
  };

  const isSubscriptionActive = (): boolean => {
    return subscription?.status === 'active';
  };

  const isSubscriptionExpired = (): boolean => {
    if (!subscription) return true;
    return new Date() > new Date(subscription.currentPeriodEnd);
  };

  return {
    subscription,
    currentPlan,
    isLoading,
    hasFeature,
    canCreateTable,
    canCreateBooking,
    isSubscriptionActive,
    isSubscriptionExpired,
    plans
  };
}
