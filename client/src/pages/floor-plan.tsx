import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Move,
  RotateCw,
  Save,
  Undo,
  Redo,
  Grid,
  Download,
  Upload,
  Square,
  Circle,
  Home,
  DoorOpen,
  Eye,
  PlusCircle,
  Trash2,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";

interface FloorPlanElement {
  id: string;
  type: "table" | "chair" | "wall" | "door" | "window" | "decoration";
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  properties: {
    tableNumber?: string;
    capacity?: number;
    shape?: "rectangle" | "circle" | "square";
    color?: string;
    label?: string;
  };
}

interface FloorPlan {
  id?: number;
  name: string;
  elements: FloorPlanElement[];
  dimensions: {
    width: number;
    height: number;
  };
  gridSize: number;
  scale: number;
}
const ELEMENT_TYPES = [
  { type: "table", icon: Square, label: "Table", color: "#8B4513" },
  { type: "chair", icon: Circle, label: "Chair", color: "#654321" },
  { type: "wall", icon: Home, label: "Wall", color: "#808080" },
  { type: "door", icon: DoorOpen, label: "Door", color: "#8B4513" },
  { type: "window", icon: Eye, label: "Window", color: "#87CEEB" },
  {
    type: "decoration",
    icon: PlusCircle,
    label: "Decoration",
    color: "#90EE90",
  },
];

export default function FloorPlanPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  console.log("User context:", user);

  // Get restaurant from user context - check multiple possible structures
  const restaurant =
    user?.restaurant ||
    user?.restaurants?.[0] ||
    (user?.restaurantId ? user : null);

  const [currentPlan, setCurrentPlan] = useState<FloorPlan>({
    name: "New Floor Plan",
    elements: [],
    dimensions: { width: 800, height: 600 },
    gridSize: 20,
    scale: 1,
  });

  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [selectedTool, setSelectedTool] = useState<string>("select");
  const [showGrid, setShowGrid] = useState(true);

  // Extract restaurant and tenant IDs from different possible structures
  const restaurantId =
    restaurant?.id || restaurant?.restaurantId || user?.restaurantId;
  const tenantId = restaurant?.tenantId || user?.tenantId;

  // Load existing floor plans
  const { data: floorPlans, isLoading } = useQuery({
    queryKey: [
      `/api/tenants/${tenantId}/restaurants/${restaurantId}/floor-plans`,
    ],
    enabled: !!restaurantId && !!tenantId,
  });

  // Save floor plan mutation
  const saveFloorPlan = useMutation({
    mutationFn: async (plan: FloorPlan) => {
      const endpoint = plan.id
        ? `/api/tenants/${tenantId}/restaurants/${restaurantId}/floor-plans/${plan.id}`
        : `/api/tenants/${tenantId}/restaurants/${restaurantId}/floor-plans`;

      return apiRequest(endpoint, plan.id ? "PUT" : "POST", plan);
    },
    onSuccess: () => {
      toast({ title: "Floor plan saved successfully" });
      queryClient.invalidateQueries({
        queryKey: [
          `/api/tenants/${tenantId}/restaurants/${restaurantId}/floor-plans`,
        ],
      });
    },
    onError: () => {
      toast({ title: "Failed to save floor plan", variant: "destructive" });
    },
  });

  const addElement = (type: string) => {
    const newElement: FloorPlanElement = {
      id: `${type}-${Date.now()}`,
      type: type as FloorPlanElement["type"],
      x: 100,
      y: 100,
      width: type === "table" ? 80 : type === "chair" ? 40 : 60,
      height: type === "table" ? 80 : type === "chair" ? 40 : 60,
      rotation: 0,
      properties: {
        color: ELEMENT_TYPES.find((t) => t.type === type)?.color || "#000000",
        label: type === "table" ? "T1" : "",
        capacity: type === "table" ? 4 : undefined,
        shape: type === "table" ? "rectangle" : undefined,
      },
    };

    setCurrentPlan((prev) => ({
      ...prev,
      elements: [...prev.elements, newElement],
    }));
  };

  const updateElement = (id: string, updates: Partial<FloorPlanElement>) => {
    setCurrentPlan((prev) => ({
      ...prev,
      elements: prev.elements.map((el) =>
        el.id === id ? { ...el, ...updates } : el,
      ),
    }));
  };

  const deleteElement = (id: string) => {
    setCurrentPlan((prev) => ({
      ...prev,
      elements: prev.elements.filter((el) => el.id !== id),
    }));
    setSelectedElement(null);
  };

  const handleSave = () => {
    saveFloorPlan.mutate(currentPlan);
  };

  const loadPlan = (plan: FloorPlan) => {
    setCurrentPlan(plan);
    setSelectedElement(null);
  };

  if (!restaurantId || !tenantId) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You need to be associated with a restaurant to access floor plan
              designer.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Floor Plan Designer</h1>
          <p className="text-muted-foreground">
            Design and manage your restaurant layout visually
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={saveFloorPlan.isPending}>
            <Save className="w-4 h-4 mr-2" />
            Save Plan
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Toolbar */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Tools</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Element Types */}
            <div>
              <Label className="text-sm font-medium">Add Elements</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {ELEMENT_TYPES.map(({ type, icon: Icon, label, color }) => (
                  <Button
                    key={type}
                    variant="outline"
                    size="sm"
                    onClick={() => addElement(type)}
                    className="h-12 flex-col gap-1"
                  >
                    <Icon className="w-4 h-4" style={{ color }} />
                    <span className="text-xs">{label}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Grid Settings */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Grid Size</Label>
              <Slider
                value={[currentPlan.gridSize]}
                onValueChange={([value]) =>
                  setCurrentPlan((prev) => ({ ...prev, gridSize: value }))
                }
                min={10}
                max={50}
                step={5}
                className="w-full"
              />
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="showGrid"
                  checked={showGrid}
                  onChange={(e) => setShowGrid(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="showGrid" className="text-sm">
                  Show Grid
                </Label>
              </div>
            </div>

            {/* Element Properties */}
            {selectedElement && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Element Properties
                </Label>
                {(() => {
                  const element = currentPlan.elements.find(
                    (el) => el.id === selectedElement,
                  );
                  if (!element) return null;

                  return (
                    <div className="space-y-2">
                      {element.type === "table" && (
                        <>
                          <div>
                            <Label className="text-xs">Table Number</Label>
                            <Input
                              value={element.properties.tableNumber || ""}
                              onChange={(e) =>
                                updateElement(element.id, {
                                  properties: {
                                    ...element.properties,
                                    tableNumber: e.target.value,
                                  },
                                })
                              }
                              className="h-8"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Capacity</Label>
                            <Input
                              type="number"
                              value={element.properties.capacity || 4}
                              onChange={(e) =>
                                updateElement(element.id, {
                                  properties: {
                                    ...element.properties,
                                    capacity: parseInt(e.target.value),
                                  },
                                })
                              }
                              className="h-8"
                            />
                          </div>
                        </>
                      )}
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteElement(element.id)}
                        className="w-full"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  );
                })()}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Main Design Area */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{currentPlan.name}</CardTitle>
                <CardDescription>
                  {currentPlan.elements.length} elements •{" "}
                  {currentPlan.dimensions.width}×{currentPlan.dimensions.height}
                  px
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Input
                  value={currentPlan.name}
                  onChange={(e) =>
                    setCurrentPlan((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  className="w-48"
                  placeholder="Floor plan name"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div
              className="relative bg-white border border-gray-200 overflow-hidden"
              style={{
                width: currentPlan.dimensions.width,
                height: currentPlan.dimensions.height,
                backgroundImage: showGrid
                  ? `
                  linear-gradient(to right, #f0f0f0 1px, transparent 1px),
                  linear-gradient(to bottom, #f0f0f0 1px, transparent 1px)
                `
                  : "none",
                backgroundSize: showGrid
                  ? `${currentPlan.gridSize}px ${currentPlan.gridSize}px`
                  : "auto",
              }}
            >
              {currentPlan.elements.map((element) => {
                const elementType = ELEMENT_TYPES.find(
                  (t) => t.type === element.type,
                );
                const isSelected = selectedElement === element.id;

                return (
                  <div
                    key={element.id}
                    className={`absolute cursor-pointer border-2 flex items-center justify-center text-xs font-medium ${
                      isSelected
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-300 hover:border-gray-400"
                    }`}
                    style={{
                      left: element.x,
                      top: element.y,
                      width: element.width,
                      height: element.height,
                      backgroundColor:
                        element.properties.color || elementType?.color,
                      transform: `rotate(${element.rotation}deg)`,
                    }}
                    onClick={() => setSelectedElement(element.id)}
                  >
                    {element.properties.tableNumber ||
                      element.properties.label ||
                      element.type}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Existing Plans */}
      {floorPlans && Array.isArray(floorPlans) && floorPlans.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Existing Floor Plans</CardTitle>
            <CardDescription>
              Load and manage your saved floor plans
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {floorPlans.map((plan: FloorPlan) => (
                <Card
                  key={plan.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{plan.name}</CardTitle>
                    <CardDescription className="text-xs">
                      {plan.elements?.length || 0} elements
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => loadPlan(plan)}
                      className="w-full"
                    >
                      Load Plan
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
