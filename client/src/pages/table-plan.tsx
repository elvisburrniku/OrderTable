import React, { useState, useRef, useCallback } from "react";
import { useAuthGuard } from "@/lib/auth.tsx";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Save,
  RotateCw,
  Move,
  Square,
  Circle,
  Users,
} from "lucide-react";

interface TablePosition {
  id: number;
  x: number;
  y: number;
  rotation: number;
  shape: "square" | "circle" | "rectangle";
  tableNumber?: string;
  capacity?: number;
  isConfigured?: boolean;
}

interface TableStructure {
  id: string;
  name: string;
  shape: "square" | "circle" | "rectangle";
  icon: any;
  defaultCapacity: number;
  description: string;
}

const TABLE_SHAPES = [
  { value: "square", label: "Square", icon: Square },
  { value: "circle", label: "Round", icon: Circle },
  { value: "rectangle", label: "Rectangle", icon: Square },
];

const TABLE_STRUCTURES: TableStructure[] = [
  {
    id: "small-round",
    name: "Small Round",
    shape: "circle",
    icon: Circle,
    defaultCapacity: 2,
    description: "2-person round table",
  },
  {
    id: "medium-round",
    name: "Medium Round",
    shape: "circle",
    icon: Circle,
    defaultCapacity: 4,
    description: "4-person round table",
  },
  {
    id: "large-round",
    name: "Large Round",
    shape: "circle",
    icon: Circle,
    defaultCapacity: 6,
    description: "6-person round table",
  },
  {
    id: "small-square",
    name: "Small Square",
    shape: "square",
    icon: Square,
    defaultCapacity: 2,
    description: "2-person square table",
  },
  {
    id: "medium-square",
    name: "Medium Square",
    shape: "square",
    icon: Square,
    defaultCapacity: 4,
    description: "4-person square table",
  },
  {
    id: "rectangular",
    name: "Rectangular",
    shape: "rectangle",
    icon: Square,
    defaultCapacity: 6,
    description: "6-person rectangular table",
  },
  {
    id: "long-rectangular",
    name: "Long Rectangular",
    shape: "rectangle",
    icon: Square,
    defaultCapacity: 8,
    description: "8-person long table",
  },
];

export default function TablePlan() {
  const {
    isLoading: authLoading,
    isAuthenticated,
    user,
    restaurant,
  } = useAuthGuard();
  const queryClient = useQueryClient();
  const [selectedRoom, setSelectedRoom] = useState<string>("");
  const [tablePositions, setTablePositions] = useState<
    Record<number, TablePosition>
  >({});
  const [draggedTable, setDraggedTable] = useState<number | null>(null);
  const [draggedStructure, setDraggedStructure] =
    useState<TableStructure | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [pendingTablePosition, setPendingTablePosition] = useState<{
    x: number;
    y: number;
    structure: TableStructure;
  } | null>(null);
  const [tableConfig, setTableConfig] = useState({
    tableNumber: "",
    capacity: 2,
  });
  const planRef = useRef<HTMLDivElement>(null);

  const { data: tables = [], isLoading: tablesLoading } = useQuery({
    queryKey: [
      "/api/tenants",
      restaurant?.tenantId,
      "restaurants",
      restaurant?.id,
      "tables",
    ],
    queryFn: async () => {
      const tenantId = restaurant?.tenantId;
      const response = await fetch(
        `/api/tenants/${tenantId}/restaurants/${restaurant?.id}/tables`,
      );
      if (!response.ok) throw new Error("Failed to fetch tables");
      return response.json();
    },
    enabled: !!restaurant && !!restaurant.tenantId,
  });

  const { data: rooms = [] } = useQuery({
    queryKey: [
      "/api/tenants",
      restaurant?.tenantId,
      "restaurants",
      restaurant?.id,
      "rooms",
    ],
    queryFn: async () => {
      const tenantId = restaurant?.tenantId;
      const response = await fetch(
        `/api/tenants/${tenantId}/restaurants/${restaurant?.id}/rooms`,
      );
      if (!response.ok) throw new Error("Failed to fetch rooms");
      return response.json();
    },
    enabled: !!restaurant && !!restaurant.tenantId,
  });

  // Load saved table layout
  const { data: savedLayout } = useQuery({
    queryKey: [
      "/api/tenants",
      restaurant?.tenantId,
      "restaurants",
      restaurant?.id,
      "table-layout",
      selectedRoom,
    ],
    queryFn: async () => {
      const tenantId = restaurant?.tenantId;
      const response = await fetch(
        `/api/tenants/${tenantId}/restaurants/${restaurant?.id}/table-layout?room=${selectedRoom}`,
      );
      if (!response.ok) throw new Error("Failed to fetch table layout");
      return response.json();
    },
    enabled: !!restaurant && !!restaurant.tenantId,
  });

  // Auto-select first room when rooms load
  React.useEffect(() => {
    if (rooms.length > 0 && !selectedRoom) {
      setSelectedRoom(rooms[0].id.toString());
    }
  }, [rooms, selectedRoom]);

  // Apply saved layout when it loads
  React.useEffect(() => {
    if (savedLayout?.positions) {
      setTablePositions(savedLayout.positions);
    }
  }, [savedLayout]);

  const saveLayoutMutation = useMutation({
    mutationFn: async (positions: Record<number, TablePosition>) => {
      const tenantId = restaurant?.tenantId;
      const response = await fetch(
        `/api/tenants/${tenantId}/restaurants/${restaurant?.id}/table-layout`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ room: selectedRoom, positions }),
        },
      );
      if (!response.ok) throw new Error("Failed to save layout");
      return response.json();
    },
    onSuccess: () => {
      alert("Table layout saved successfully!");
    },
  });

  const handleDragStart = useCallback((tableId: number, e: React.DragEvent) => {
    setDraggedTable(tableId);
    setDraggedStructure(null);
    setIsDragging(true);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleStructureDragStart = useCallback(
    (structure: TableStructure, e: React.DragEvent) => {
      console.log("Starting drag for structure:", structure);
      setDraggedStructure(structure);
      setDraggedTable(null);
      setIsDragging(true);
      e.dataTransfer.effectAllowed = "copy";
      e.dataTransfer.setData("text/plain", structure.id);
    },
    [],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (draggedStructure) {
        e.dataTransfer.dropEffect = "copy";
      } else {
        e.dataTransfer.dropEffect = "move";
      }
    },
    [draggedStructure],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      console.log("Drop event fired", { draggedTable, draggedStructure });

      if (!planRef.current) {
        console.log("No plan ref");
        return;
      }

      const rect = planRef.current.getBoundingClientRect();
      const x = Math.max(
        40,
        Math.min(e.clientX - rect.left - 40, rect.width - 80),
      );
      const y = Math.max(
        40,
        Math.min(e.clientY - rect.top - 40, rect.height - 80),
      );

      console.log("Drop position:", { x, y });

      if (draggedTable !== null) {
        console.log("Moving existing table:", draggedTable);
        // Moving existing table - use table ID directly as the key
        setTablePositions((prev) => ({
          ...prev,
          [draggedTable]: {
            ...prev[draggedTable],
            x,
            y,
          },
        }));
        setDraggedTable(null);
        setDraggedStructure(null);
        setIsDragging(false);
      } else if (draggedStructure) {
        console.log("Adding new table from structure:", draggedStructure);
        // Adding new table from structure - store position and structure info
        const currentStructure = draggedStructure;

        // Reset drag states first
        setDraggedTable(null);
        setDraggedStructure(null);
        setIsDragging(false);

        // Then set up the dialog
        console.log("Setting up dialog with structure:", currentStructure);
        setPendingTablePosition({ x, y, structure: currentStructure });
        setTableConfig({
          tableNumber: "",
          capacity: currentStructure.defaultCapacity,
        });

        // Force show dialog with a small delay to ensure state is updated
        setTimeout(() => {
          console.log("Showing config dialog");
          setShowConfigDialog(true);
        }, 100);
      } else {
        console.log("No dragged item found");
        setDraggedTable(null);
        setDraggedStructure(null);
        setIsDragging(false);
      }
    },
    [draggedTable, draggedStructure],
  );

  const rotateTable = (tableId: number) => {
    setTablePositions((prev) => ({
      ...prev,
      [tableId]: {
        ...prev[tableId],
        rotation: (prev[tableId]?.rotation || 0) + 45,
      },
    }));
  };

  const changeTableShape = (
    tableId: number,
    shape: "square" | "circle" | "rectangle",
  ) => {
    setTablePositions((prev) => ({
      ...prev,
      [tableId]: {
        ...prev[tableId],
        shape,
      },
    }));
  };

  const createTableMutation = useMutation({
    mutationFn: async (tableData: any) => {
      const tenantId = restaurant?.tenantId;
      const response = await fetch(
        `/api/tenants/${tenantId}/restaurants/${restaurant?.id}/tables`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...tableData, restaurantId: restaurant?.id }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        if (errorData?.requiresUpgrade) {
          throw new Error(`Table Limit Exceeded: ${errorData.message}`);
        }
        throw new Error(errorData?.message || "Failed to create table");
      }
      return response.json();
    },
    onSuccess: (newTable) => {
      // Add the new table to the layout at the pending position
      if (pendingTablePosition) {
        setTablePositions((prev) => ({
          ...prev,
          [newTable.id]: {
            id: newTable.id,
            x: pendingTablePosition.x,
            y: pendingTablePosition.y,
            rotation: 0,
            shape: pendingTablePosition.structure.shape,
            tableNumber: newTable.tableNumber,
            capacity: newTable.capacity,
            isConfigured: true,
          },
        }));
      }

      // Refresh tables list
      queryClient.invalidateQueries({
        queryKey: [
          "/api/tenants",
          restaurant?.tenantId,
          "restaurants",
          restaurant?.id,
          "tables",
        ],
      });

      setShowConfigDialog(false);
      setPendingTablePosition(null);
      setTableConfig({ tableNumber: "", capacity: 2 });
    },
  });

  const handleConfigSubmit = () => {
    if (!pendingTablePosition || !tableConfig.tableNumber.trim()) {
      alert("Please enter a table number");
      return;
    }

    // Check if table number already exists
    const existingTable = tables.find(
      (table: any) => table.tableNumber === tableConfig.tableNumber,
    );
    if (existingTable) {
      alert(
        "A table with this number already exists. Please choose a different number.",
      );
      return;
    }

    // Create the table in the database
    createTableMutation.mutate({
      tableNumber: tableConfig.tableNumber,
      capacity: tableConfig.capacity,
      isActive: true,
    });
  };

  const handleConfigCancel = () => {
    setShowConfigDialog(false);
    setPendingTablePosition(null);
    setTableConfig({ tableNumber: "", capacity: 2 });
  };

  if (authLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated || !user || !restaurant) {
    return null;
  }

  const getTableStyle = (table, position) => {
    const baseStyle = {
      width: "70px",
      height: "70px",
      position: "absolute",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "12px",
      color: "#fff",
      userSelect: "none",
      zIndex: 1,
      backgroundColor: "#555",
      borderRadius: "12px",
      boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)"
    };

    if (position) {
      return {
        ...baseStyle,
        left: `${position.x}px`,
        top: `${position.y}px`,
      };
    }

    return baseStyle;
  };

  const renderChairsAroundTable = (position, tableId) => {
    const chairs = [];
    const capacity = position.capacity || 4;
    const chairSize = 12;
    const tableWidth = 70;

    for (let i = 0; i < capacity; i++) {
      const angle = (i * 2 * Math.PI) / capacity;
      const radius = 45;

      const chairX = position.x + tableWidth / 2 + Math.cos(angle) * radius - chairSize / 2;
      const chairY = position.y + tableWidth / 2 + Math.sin(angle) * radius - chairSize / 2;

      chairs.push(
        <div
          key={`chair-${tableId}-${i}`}
          style={{
            position: "absolute",
            left: `${chairX}px`,
            top: `${chairY}px`,
            width: `${chairSize}px`,
            height: `${chairSize}px`,
            backgroundColor: "#A0AEC0",
            borderRadius: "50%",
            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)"
          }}
        />
      );
    }

    return chairs;
  };

  const getStructureStyle = (structure: TableStructure) => ({
    width: structure.shape === "rectangle" ? "60px" : "50px",
    height: "50px",
    backgroundColor: "#6b7280",
    borderRadius:
      structure.shape === "circle"
        ? "50%"
        : structure.shape === "rectangle"
          ? "8px"
          : "4px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "grab",
    color: "white",
    fontSize: "10px",
    fontWeight: "bold",
    userSelect: "none" as const,
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white border-r min-h-screen">
          <div className="p-6">
            {/* Room Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Room
              </label>
              <Select value={selectedRoom} onValueChange={setSelectedRoom}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {rooms.map((room: any) => (
                    <SelectItem
                      key={`room-${room.id}`}
                      value={room.id.toString()}
                    >
                      {room.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Available Tables */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                Existing Tables
              </h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {tables.map((table: any) => (
                  <div
                    key={`table-${table.id}`}
                    className="p-2 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">
                          Table {table.tableNumber}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center">
                          <Users className="h-3 w-3 mr-1" />
                          {table.capacity}
                        </div>
                      </div>
                      <div
                        draggable
                        onDragStart={(e) => handleDragStart(table.id, e)}
                        style={getTableStyle(table)}
                        title={`Drag to place Table ${table.tableNumber}`}
                      >
                        {table.tableNumber}
                      </div>
                    </div>

                    {/* Table controls if positioned */}
                    {tablePositions[table.id] && (
                      <div className="mt-2 flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => rotateTable(table.id)}
                          className="h-6 w-6 p-0"
                        >
                          <RotateCw className="h-3 w-3" />
                        </Button>
                        <Select
                          value={tablePositions[table.id]?.shape || "circle"}
                          onValueChange={(
                            shape: "square" | "circle" | "rectangle",
                          ) => changeTableShape(table.id, shape)}
                        >
                          <SelectTrigger className="h-6 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TABLE_SHAPES.map((shape) => (
                              <SelectItem
                                key={`shape-${shape.value}`}
                                value={shape.value}
                              >
                                {shape.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Shape Selector */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Shapes:</h3>
              <div className="grid grid-cols-5 gap-2 mb-4">
                {/* Row 1 */}
                <div
                  className="w-8 h-8 bg-gray-600 cursor-grab hover:bg-gray-700 transition-colors"
                  draggable
                  onDragStart={(e) => handleStructureDragStart({
                    id: "small-square",
                    name: "Small Square",
                    shape: "square",
                    icon: Square,
                    defaultCapacity: 2,
                    description: "2-person square table",
                  }, e)}
                  title="Small Square Table"
                />
                <div
                  className="w-8 h-8 bg-gray-600 rounded-full cursor-grab hover:bg-gray-700 transition-colors"
                  draggable
                  onDragStart={(e) => handleStructureDragStart({
                    id: "small-round",
                    name: "Small Round",
                    shape: "circle",
                    icon: Circle,
                    defaultCapacity: 2,
                    description: "2-person round table",
                  }, e)}
                  title="Small Round Table"
                />
                <div
                  className="w-8 h-8 bg-gray-600 cursor-grab hover:bg-gray-700 transition-colors"
                  draggable
                  onDragStart={(e) => handleStructureDragStart({
                    id: "medium-square",
                    name: "Medium Square",
                    shape: "square",
                    icon: Square,
                    defaultCapacity: 4,
                    description: "4-person square table",
                  }, e)}
                  title="Medium Square Table"
                />
                <div
                  className="w-8 h-8 bg-gray-600 rounded-full cursor-grab hover:bg-gray-700 transition-colors"
                  draggable
                  onDragStart={(e) => handleStructureDragStart({
                    id: "medium-round",
                    name: "Medium Round",
                    shape: "circle",
                    icon: Circle,
                    defaultCapacity: 4,
                    description: "4-person round table",
                  }, e)}
                  title="Medium Round Table"
                />
                <div
                  className="w-8 h-8 bg-gray-600 rounded-full cursor-grab hover:bg-gray-700 transition-colors"
                  draggable
                  onDragStart={(e) => handleStructureDragStart({
                    id: "large-round",
                    name: "Large Round",
                    shape: "circle",
                    icon: Circle,
                    defaultCapacity: 6,
                    description: "6-person round table",
                  }, e)}
                  title="Large Round Table"
                />
                
                {/* Row 2 */}
                <div
                  className="w-10 h-6 bg-gray-600 cursor-grab hover:bg-gray-700 transition-colors"
                  draggable
                  onDragStart={(e) => handleStructureDragStart({
                    id: "rectangular",
                    name: "Rectangular",
                    shape: "rectangle",
                    icon: Square,
                    defaultCapacity: 6,
                    description: "6-person rectangular table",
                  }, e)}
                  title="Rectangular Table"
                />
                <div
                  className="w-8 h-8 bg-gray-600 cursor-grab hover:bg-gray-700 transition-colors"
                  draggable
                  onDragStart={(e) => handleStructureDragStart({
                    id: "large-square",
                    name: "Large Square",
                    shape: "square",
                    icon: Square,
                    defaultCapacity: 6,
                    description: "6-person square table",
                  }, e)}
                  title="Large Square Table"
                />
                <div
                  className="w-8 h-8 bg-gray-600 rounded-full cursor-grab hover:bg-gray-700 transition-colors"
                  draggable
                  onDragStart={(e) => handleStructureDragStart({
                    id: "extra-large-round",
                    name: "Extra Large Round",
                    shape: "circle",
                    icon: Circle,
                    defaultCapacity: 8,
                    description: "8-person round table",
                  }, e)}
                  title="Extra Large Round Table"
                />
                
                {/* Row 3 */}
                <div
                  className="w-8 h-8 bg-gray-600 rounded-full cursor-grab hover:bg-gray-700 transition-colors"
                  draggable
                  onDragStart={(e) => handleStructureDragStart({
                    id: "huge-round-1",
                    name: "Huge Round",
                    shape: "circle",
                    icon: Circle,
                    defaultCapacity: 10,
                    description: "10-person round table",
                  }, e)}
                  title="Huge Round Table"
                />
                <div
                  className="w-10 h-8 bg-gray-600 rounded-full cursor-grab hover:bg-gray-700 transition-colors"
                  draggable
                  onDragStart={(e) => handleStructureDragStart({
                    id: "huge-round-2",
                    name: "Extra Huge Round",
                    shape: "circle",
                    icon: Circle,
                    defaultCapacity: 12,
                    description: "12-person round table",
                  }, e)}
                  title="Extra Huge Round Table"
                />
                <div
                  className="w-12 h-10 bg-gray-600 rounded-full cursor-grab hover:bg-gray-700 transition-colors"
                  draggable
                  onDragStart={(e) => handleStructureDragStart({
                    id: "massive-round",
                    name: "Massive Round",
                    shape: "circle",
                    icon: Circle,
                    defaultCapacity: 16,
                    description: "16-person round table",
                  }, e)}
                  title="Massive Round Table"
                />
                
                {/* Row 4 - Long rectangles */}
                <div
                  className="w-12 h-4 bg-gray-600 cursor-grab hover:bg-gray-700 transition-colors col-span-2"
                  draggable
                  onDragStart={(e) => handleStructureDragStart({
                    id: "long-rectangular-1",
                    name: "Long Rectangular",
                    shape: "rectangle",
                    icon: Square,
                    defaultCapacity: 8,
                    description: "8-person long table",
                  }, e)}
                  title="Long Rectangular Table"
                />
                <div
                  className="w-12 h-4 bg-gray-600 cursor-grab hover:bg-gray-700 transition-colors col-span-2"
                  draggable
                  onDragStart={(e) => handleStructureDragStart({
                    id: "long-rectangular-2",
                    name: "Extra Long Rectangular",
                    shape: "rectangle",
                    icon: Square,
                    defaultCapacity: 12,
                    description: "12-person extra long table",
                  }, e)}
                  title="Extra Long Rectangular Table"
                />
              </div>
              
              <div className="mb-4">
                <Button
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => {/* Handle done */}}
                >
                  Done
                </Button>
              </div>
              
              <div className="mb-4">
                <Button
                  variant="outline"
                  className="w-full text-red-600 border-red-600 hover:bg-red-50"
                  onClick={() => {/* Handle delete table */}}
                >
                  Delete table
                </Button>
              </div>
            </div>
            
            {/* Unallocated Tables */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                Unallocated tables (drag to the white box)
              </h3>
              <div className="flex flex-wrap gap-2 mb-4">
                {tables.filter((table: any) => !tablePositions[table.id]).map((table: any, index: number) => {
                  const priorityColors = [
                    'bg-blue-600', 'bg-blue-500', 'bg-gray-600', 'bg-gray-700', 
                    'bg-gray-800', 'bg-slate-600', 'bg-slate-700'
                  ];
                  const colorClass = priorityColors[index % priorityColors.length];
                  
                  return (
                    <div
                      key={`unallocated-${table.id}`}
                      className={`${colorClass} text-white px-3 py-2 rounded cursor-grab hover:opacity-90 transition-opacity text-xs font-medium`}
                      draggable
                      onDragStart={(e) => handleDragStart(table.id, e)}
                      title={`Table ${table.tableNumber} - ${table.capacity} persons`}
                    >
                      <div className="text-center">
                        <div className="font-bold">{table.tableNumber}</div>
                        <div className="text-[10px] opacity-90">{table.capacity} pers.</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Priority Legend */}
              <div className="mb-4">
                <h4 className="text-xs font-medium text-gray-700 mb-2">Priority:</h4>
                <div className="flex flex-wrap gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                    <span>Highest</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                    <span>High</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-gray-600 rounded-full"></div>
                    <span>Medium</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <span>Low</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span>Lowest</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="border-t pt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Legend</h3>
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-600 rounded-full"></div>
                  <span>Active Table</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-500 rounded-full"></div>
                  <span>Inactive Table</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  Table Plan -{" "}
                  {rooms.find(
                    (room: any) => room.id.toString() === selectedRoom,
                  )?.name || "Select a room"}
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    onClick={() => saveLayoutMutation.mutate(tablePositions)}
                    disabled={saveLayoutMutation.isPending}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saveLayoutMutation.isPending ? "Saving..." : "Save Layout"}
                  </Button>
                </div>
              </div>
              <p className="text-sm text-gray-600">
                Drag tables from the sidebar onto the floor plan to arrange your
                restaurant layout.
              </p>
            </CardHeader>
            <CardContent>
              <div
                ref={planRef}
                className="relative bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg"
                style={{ height: "600px", minHeight: "400px" }}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                {/* Grid pattern */}
                <div
                  className="absolute inset-0 opacity-20"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle, #666 1px, transparent 1px)",
                    backgroundSize: "20px 20px",
                  }}
                />

                {/* Drop zone hint */}
                {Object.keys(tablePositions).length === 0 && !isDragging && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-gray-500">
                      <Move className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p className="text-lg font-medium">
                        Drag tables here to create your floor plan
                      </p>
                      <p className="text-sm">
                        Start by dragging table structures from the sidebar
                      </p>
                    </div>
                  </div>
                )}

                {/* Active drop zone indicator */}
                {isDragging && draggedStructure && (
                  <div className="absolute inset-0 flex items-center justify-center bg-green-50 bg-opacity-50 border-2 border-dashed border-green-300 rounded-lg">
                    <div className="text-center text-green-600">
                      <Plus className="h-16 w-16 mx-auto mb-2" />
                      <p className="text-lg font-medium">
                        Drop here to add {draggedStructure.name}
                      </p>
                      <p className="text-sm">
                        Configuration dialog will appear after drop
                      </p>
                    </div>
                  </div>
                )}

                {/* Placed Tables with Chairs */}
                {Object.entries(tablePositions).map(([tableId, position]) => {
                  // Find corresponding table from database if it exists
                  const dbTable = tables.find(
                    (t: any) => t.id === parseInt(tableId),
                  );
                  const numericTableId = parseInt(tableId);

                  return (
                    <React.Fragment key={`table-group-${tableId}`}>
                      {/* Render chairs around the table */}
                      {renderChairsAroundTable(position, numericTableId)}
                      
                      {/* Render the table */}
                      <div
                        key={`positioned-table-${tableId}`}
                        draggable
                        onDragStart={(e) => handleDragStart(numericTableId, e)}
                        style={getTableStyle(dbTable, position)}
                        className="shadow-lg border-2 border-white hover:shadow-xl transition-shadow"
                        title={
                          dbTable
                            ? `Table ${dbTable.tableNumber} (${dbTable.capacity} seats) - Right click to remove`
                            : position.isConfigured
                              ? `Table ${position.tableNumber} (${position.capacity} seats) - Right click to remove`
                              : "Unconfigured table - Right click to remove"
                        }
                        onContextMenu={(e) => {
                          e.preventDefault();
                          if (
                            window.confirm(
                              `Are you sure you want to remove this table from the floor plan?`,
                            )
                          ) {
                            setTablePositions((prev) => {
                              const newPositions = { ...prev };
                              delete newPositions[numericTableId];
                              return newPositions;
                            });
                          }
                        }}
                      >
                        <div className="text-center relative group">
                          <div className="font-bold">
                            {dbTable
                              ? dbTable.tableNumber
                              : position.isConfigured
                                ? position.tableNumber
                                : "?"}
                          </div>
                          <div className="text-xs opacity-80">
                            {dbTable
                              ? `${dbTable.capacity} seats`
                              : position.isConfigured
                                ? `${position.capacity} seats`
                                : ""}
                          </div>
                          {/* Remove button - shown on hover */}
                          <button
                            className="absolute -top-2 -right-2 w-5 h-5 bg-red-600 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-700"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (
                                window.confirm(
                                  `Are you sure you want to remove this table from the floor plan?`,
                                )
                              ) {
                                setTablePositions((prev) => {
                                  const newPositions = { ...prev };
                                  delete newPositions[numericTableId];
                                  return newPositions;
                                });
                              }
                            }}
                            title="Remove table from floor plan"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Status */}
              <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
                <div>
                  Tables placed: {Object.keys(tablePositions).length} of{" "}
                  {tables.length}
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant="outline">
                    Total Capacity:{" "}
                    {tables.reduce(
                      (sum: number, table: any) =>
                        tablePositions[table.id] ? sum + table.capacity : sum,
                      0,
                    )}{" "}
                    seats
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Table Configuration Dialog */}
      {/* CSS for chair styling */}
      <style jsx>{`
        .chair:hover {
          background-color: #A0522D !important;
          transform: scale(1.1) rotate(${isDragging ? '0deg' : '0deg'});
          transition: all 0.2s ease;
        }
      `}</style>

      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure New Table</DialogTitle>
            <p className="text-sm text-gray-600">
              {pendingTablePosition?.structure &&
                `Adding ${pendingTablePosition.structure.name} (${pendingTablePosition.structure.description})`}
            </p>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="tableNumber">Table Number *</Label>
              <Input
                id="tableNumber"
                value={tableConfig.tableNumber}
                onChange={(e) =>
                  setTableConfig((prev) => ({
                    ...prev,
                    tableNumber: e.target.value,
                  }))
                }
                placeholder="e.g., 1, A1, VIP-1"
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter a unique identifier for this table
              </p>
            </div>
            <div>
              <Label htmlFor="capacity">Seating Capacity</Label>
              <Input
                id="capacity"
                type="number"
                min="1"
                max="20"
                value={tableConfig.capacity}
                onChange={(e) =>
                  setTableConfig((prev) => ({
                    ...prev,
                    capacity: parseInt(e.target.value) || 1,
                  }))
                }
              />
              <p className="text-xs text-gray-500 mt-1">
                Maximum number of guests this table can accommodate
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={handleConfigCancel}>
                Cancel
              </Button>
              <Button
                onClick={handleConfigSubmit}
                className="bg-green-600 hover:bg-green-700"
                disabled={
                  createTableMutation.isPending ||
                  !tableConfig.tableNumber.trim()
                }
              >
                {createTableMutation.isPending ? "Creating..." : "Add Table"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}