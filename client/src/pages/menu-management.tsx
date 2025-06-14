import { useAuth } from "@/lib/auth";
import { MenuManagement } from "@/components/menu-management";

export default function MenuManagementPage() {
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
    <div className="p-6">
      <MenuManagement 
        restaurantId={restaurant.id} 
        tenantId={restaurant.tenantId} 
      />
    </div>
  );
}