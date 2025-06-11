import { useAuth } from "@/lib/auth";
import SeatingHeatMap from "@/components/seating-heat-map";

export default function HeatMap() {
  const { restaurant } = useAuth();

  if (!restaurant) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Please select a restaurant to view heat map.</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <SeatingHeatMap
        restaurantId={restaurant.id}
        tenantId={restaurant.tenantId}
      />
    </div>
  );
}