import { useAuth } from "@/lib/auth";
import ConflictResolutionSystem from "@/components/conflict-resolution-system";

export default function Conflicts() {
  const { restaurant } = useAuth();

  if (!restaurant) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Please select a restaurant to view conflicts.</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <ConflictResolutionSystem
        restaurantId={restaurant.id}
        tenantId={restaurant.tenantId}
        onConflictResolved={(conflictId) => {
          console.log(`Conflict ${conflictId} resolved`);
        }}
      />
    </div>
  );
}