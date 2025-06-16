import { useAuth } from "@/lib/auth";
import { KitchenDashboard } from "@/components/kitchen-dashboard";

export default function KitchenDashboardPage() {
  const { restaurant } = useAuth();

  if (!restaurant) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p>Restaurant not found</p>
        </div>
      </div>
    );
  }

  return (
    <KitchenDashboard 
      restaurantId={restaurant.id} 
      tenantId={restaurant.tenantId} 
    />
  );
}