import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import FloorPlanBuilder from "@/components/floor-plan-builder";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function FloorPlan() {
  const { restaurant } = useAuth();

  // Fetch existing layout
  const { data: existingLayout, isLoading } = useQuery({
    queryKey: [`/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/table-layout`],
    enabled: !!restaurant?.id && !!restaurant.tenantId,
  });

  // Convert existing layout to floor plan items format
  const initialLayout = existingLayout?.positions ? 
    Object.entries(existingLayout.positions).map(([id, position]: [string, any]) => ({
      id,
      type: position.type || 'table',
      x: position.x || 0,
      y: position.y || 0,
      width: position.width || 80,
      height: position.height || 40,
      rotation: position.rotation || 0,
      color: position.color || '#8B4513',
      shape: position.shape || 'rectangle',
      label: position.label,
      capacity: position.capacity,
      tableNumber: position.tableNumber
    })) : [];

  if (!restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Floor Plan Builder</h1>
          <p className="text-gray-600 mt-2">
            Design your restaurant layout with our interactive floor plan builder. 
            Drag and drop tables, chairs, and other elements to create the perfect dining experience.
          </p>
        </div>

        <Card className="h-[calc(100vh-200px)]">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center justify-between">
              <span>Restaurant Layout Designer</span>
              <div className="text-sm text-gray-500">
                {restaurant.name} - Floor Plan
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="h-full p-0">
            {isLoading ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Loading floor plan...</span>
              </div>
            ) : (
              <FloorPlanBuilder
                restaurantId={restaurant.id}
                tenantId={restaurant.tenantId}
                roomId={existingLayout?.room}
                initialLayout={initialLayout}
              />
            )}
          </CardContent>
        </Card>

        {/* Help Section */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>How to Use the Floor Plan Builder</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              <div>
                <h4 className="font-semibold mb-2">Adding Items</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• Select "Add" tool from toolbar</li>
                  <li>• Choose item type (table, chair, wall)</li>
                  <li>• Click on canvas to place items</li>
                  <li>• Use different shapes for variety</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Editing Items</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• Switch to "Select" tool</li>
                  <li>• Click items to select them</li>
                  <li>• Drag to move, use properties panel</li>
                  <li>• Hold Ctrl/Cmd for multi-select</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Keyboard Shortcuts</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• Ctrl+Z / Cmd+Z: Undo</li>
                  <li>• Ctrl+C / Cmd+C: Duplicate</li>
                  <li>• Delete/Backspace: Remove</li>
                  <li>• R: Rotate selected items</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}