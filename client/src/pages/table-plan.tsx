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
import {
  TABLE_STRUCTURES,
  TableStructurePreview,
  getDraggableTableStructure,
} from "@/components/table-shapes/TableStructures";
import { getTableSVG } from "@/components/table-shapes/TableShapesSVG";

interface TablePosition {
  id: number;
  x: number;
  y: number;
  rotation: number;
  shape:
    | "square"
    | "circle"
    | "rectangle"
    | "oval"
    | "round"
    | "octagon"
    | "hexagon"
    | "long-rectangle"
    | "curved";
  tableNumber?: string;
  capacity?: number;
  isConfigured?: boolean;
  width?: number;
  height?: number;
}

const TABLE_SHAPES = [
  { value: "square", label: "Square" },
  { value: "circle", label: "Circle" },
  { value: "rectangle", label: "Rectangle" },
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
  const [selectedTableForConfig, setSelectedTableForConfig] = useState<number | null>(null);
  const [showTableConfigPopup, setShowTableConfigPopup] = useState(false);
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
      } else if (draggedTable !== null) {
        e.dataTransfer.dropEffect = "move";
      } else {
        e.dataTransfer.dropEffect = "none";
      }
    },
    [draggedStructure, draggedTable],
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
      
      // Calculate exact drop position - center table at cursor position
      const tableHalfSize = 25; // Half of 50px table size
      const x = Math.max(
        tableHalfSize,
        Math.min(e.clientX - rect.left, rect.width - tableHalfSize),
      );
      const y = Math.max(
        tableHalfSize,
        Math.min(e.clientY - rect.top, rect.height - tableHalfSize),
      );

      console.log("Drop position:", { x, y });
      console.log("Current table positions before drop:", tablePositions);

      if (draggedTable !== null) {
        console.log("Moving existing table:", draggedTable, "to position:", { x, y });
        // Moving existing table - use table ID directly as the key
        setTablePositions((prev) => {
          const updated = {
            ...prev,
            [draggedTable]: {
              ...prev[draggedTable],
              x,
              y,
            },
          };
          console.log("Updated table positions:", updated);
          return updated;
        });
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

  // Professional SVG table rendering component
  const SVGTableRenderer = ({
    position,
    tableId,
    table,
  }: {
    position: TablePosition;
    tableId: number;
    table: any;
  }) => {
    const capacity = position.capacity || table?.capacity || 4;
    const tableNumber = position.tableNumber || table?.tableNumber || tableId;
    const shape = position.shape || "square";

    // Standardized table size for consistency - ALL TABLES SAME SIZE
    const tableWidth = 50;
    const tableHeight = 50;

    return (
      <div
        style={{
          position: "absolute",
          left: `${position.x - tableWidth / 2}px`,
          top: `${position.y - tableHeight / 2}px`,
          transform: `rotate(${position.rotation || 0}deg)`,
          transformOrigin: "center",
          cursor: isDragging ? "grabbing" : "grab",
          zIndex: draggedTable === tableId ? 1000 : 10,
          transition: "transform 0.2s ease, box-shadow 0.2s ease",
          width: `${tableWidth}px`,
          height: `${tableHeight}px`,
        }}
        draggable
        onDragStart={(e) => {
          console.log("Starting drag for table:", tableId);
          setDraggedTable(tableId);
          setDraggedStructure(null);
          setIsDragging(true);
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", tableId.toString());
        }}
        onDragEnd={(e) => {
          console.log("Drag ended for table:", tableId);
          // Don't reset draggedTable immediately - let handleDrop process it first
          // The handleDrop function will reset these states
          setTimeout(() => {
            if (draggedTable === tableId) {
              setDraggedTable(null);
              setIsDragging(false);
            }
          }, 50);
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!isDragging) {
            setSelectedTableForConfig(tableId);
            setShowTableConfigPopup(true);
          }
        }}
        className="group"
      >
        {/* SVG Table with professional design - standardized size */}
        <div className="relative w-full h-full">
          {getTableSVG(
            shape,
            capacity,
            tableWidth,
            tableHeight,
            "drop-shadow-lg hover:drop-shadow-xl transition-all w-full h-full",
          )}

          {/* Table number overlay */}
          <div
            className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold pointer-events-none z-15"
            style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.8)" }}
          >
            <div className="text-center">
              <div>{tableNumber}</div>
              <div className="text-[10px] opacity-90">{capacity} pers.</div>
            </div>
          </div>

          {/* Remove button - always visible on hover */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log("Removing table:", tableId);
              if (
                window.confirm(
                  `Remove Table ${tableNumber} from the floor plan?`,
                )
              ) {
                setTablePositions((prev) => {
                  const newPositions = { ...prev };
                  delete newPositions[tableId];
                  return newPositions;
                });
              }
            }}
            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full text-xs font-bold opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center z-20 hover:scale-110 shadow-lg"
            title="Remove table from plan"
          >
            ×
          </button>
        </div>
      </div>
    );
  };

  // Table styling based on shape
  const getTableStyle = (table: any) => {
    const baseStyle = {
      cursor: "grab",
    };
    return baseStyle;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50">
      {/* Professional Header */}
      <div className="flex">
        {/* Professional Sidebar */}
        <div className="w-80 bg-white border-r shadow-lg min-h-screen">
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



            {/* Professional Table Structures */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                Table Shapes
              </h3>
              <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                {TABLE_STRUCTURES.map((structure) => (
                  <div
                    key={structure.id}
                    className="border rounded-lg p-2 hover:bg-gray-50 transition-colors cursor-grab"
                    title={structure.description}
                    draggable
                    onDragStart={(e) => handleStructureDragStart(structure, e)}
                  >
                    <TableStructurePreview structure={structure} />
                    <div className="text-center mt-1">
                      <div className="text-xs font-medium text-gray-700">
                        {structure.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {structure.description}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mb-4">
                <Button
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => {
                    // Save layout and show success message
                    saveLayoutMutation.mutate(tablePositions);
                  }}
                  disabled={saveLayoutMutation.isPending}
                >
                  {saveLayoutMutation.isPending ? "Saving..." : "Done"}
                </Button>
              </div>

              <div className="mb-4">
                <Button
                  variant="outline"
                  className="w-full text-red-600 border-red-600 hover:bg-red-50"
                  onClick={() => {
                    // Clear all positioned tables from floor plan
                    if (Object.keys(tablePositions).length === 0) {
                      alert("No tables positioned on the floor plan to delete.");
                      return;
                    }
                    
                    if (window.confirm("Are you sure you want to remove all tables from the floor plan? This action cannot be undone.")) {
                      setTablePositions({});
                    }
                  }}
                  disabled={Object.keys(tablePositions).length === 0}
                >
                  Clear All Tables
                </Button>
              </div>
            </div>

            {/* Unallocated Tables */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                Unallocated Tables
              </h3>
              <p className="text-xs text-gray-500 mb-3">
                Drag these tables to the floor plan to position them
              </p>
              <div className="grid grid-cols-3 gap-3 mb-4">
                {tables
                  .filter((table: any) => !tablePositions[table.id])
                  .map((table: any, index: number) => {
                    // Determine shape based on capacity for better visual representation
                    let shape = "circle"; // default
                    if (table.capacity <= 2) {
                      shape = index % 2 === 0 ? "square" : "circle";
                    } else if (table.capacity <= 4) {
                      shape = index % 3 === 0 ? "square" : index % 3 === 1 ? "circle" : "rectangle";
                    } else if (table.capacity <= 6) {
                      shape = "long-rectangle";
                    } else {
                      shape = index % 2 === 0 ? "circle" : "long-rectangle";
                    }

                    return (
                      <div
                        key={`unallocated-${table.id}`}
                        className="relative bg-white border-2 border-gray-200 rounded-lg p-2 cursor-grab hover:border-blue-400 hover:shadow-md transition-all duration-200 group"
                        draggable
                        onDragStart={(e) => handleDragStart(table.id, e)}
                        title={`Drag Table ${table.tableNumber} (${table.capacity} persons) to floor plan`}
                      >
                        {/* SVG Table Shape */}
                        <div className="flex items-center justify-center mb-1">
                          {getTableSVG(
                            shape,
                            table.capacity,
                            45,
                            35,
                            "drop-shadow-sm group-hover:drop-shadow-md transition-all"
                          )}
                        </div>
                        
                        {/* Table Info */}
                        <div className="text-center">
                          <div className="font-bold text-xs text-gray-800">
                            {table.tableNumber}
                          </div>
                          <div className="text-[10px] text-gray-500">
                            {table.capacity} pers.
                          </div>
                        </div>

                        {/* Drag Indicator */}
                        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Move className="h-3 w-3 text-gray-400" />
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Priority Legend */}
              <div className="mb-4">
                <h4 className="text-xs font-medium text-gray-700 mb-2">
                  Priority:
                </h4>
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

                {/* Professional Tables */}
                {Object.entries(tablePositions).map(([tableId, position]) => {
                  const dbTable = tables.find(
                    (t: any) => t.id === parseInt(tableId),
                  );
                  const numericTableId = parseInt(tableId);

                  return (
                    <SVGTableRenderer
                      key={`table-renderer-${tableId}`}
                      position={position}
                      tableId={numericTableId}
                      table={dbTable}
                    />
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
          background-color: #a0522d !important;
          transform: scale(1.1) rotate(${isDragging ? "0deg" : "0deg"});
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
                onChange={(e) => {
                  const inputCapacity = parseInt(e.target.value) || 1;
                  setTableConfig((prev) => ({
                    ...prev,
                    capacity: inputCapacity,
                  }));
                }}
              />
              <p className="text-xs text-gray-500 mt-1">
                Maximum number of guests this table can accommodate
                {tableConfig.capacity > 12 && (
                  <span className="text-blue-600 font-medium block">
                    ℹ️ Tables with {tableConfig.capacity}+ guests will display
                    as 12-person table visual (largest available design)
                  </span>
                )}
                {tableConfig.capacity > 16 && (
                  <span className="text-orange-600 font-medium block">
                    ⚠️ For {tableConfig.capacity} guests, consider using
                    multiple tables for better service and guest experience
                  </span>
                )}
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

      {/* Table Configuration Popup */}
      <Dialog open={showTableConfigPopup} onOpenChange={setShowTableConfigPopup}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Configure Table</DialogTitle>
            {selectedTableForConfig && (
              <p className="text-sm text-gray-600">
                Table {tablePositions[selectedTableForConfig]?.tableNumber || 
                       tables.find((t: any) => t.id === selectedTableForConfig)?.tableNumber || 
                       selectedTableForConfig} - {tablePositions[selectedTableForConfig]?.capacity || 
                       tables.find((t: any) => t.id === selectedTableForConfig)?.capacity || 4} persons
              </p>
            )}
          </DialogHeader>
          <div className="space-y-4">
            {selectedTableForConfig && (
              <>
                {/* Seating Capacity */}
                <div>
                  <Label htmlFor="seatingCapacity">Seating Capacity</Label>
                  <Input
                    id="seatingCapacity"
                    type="number"
                    min="1"
                    max="20"
                    value={tablePositions[selectedTableForConfig]?.capacity || 
                           tables.find((t: any) => t.id === selectedTableForConfig)?.capacity || 4}
                    onChange={(e) => {
                      const capacity = parseInt(e.target.value) || 4;
                      setTablePositions((prev) => ({
                        ...prev,
                        [selectedTableForConfig]: {
                          ...prev[selectedTableForConfig],
                          capacity: capacity,
                        },
                      }));
                    }}
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Number of guests this table can accommodate
                  </p>
                </div>

                {/* Table Size Controls */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="tableWidth">Table Width (px)</Label>
                    <Input
                      id="tableWidth"
                      type="number"
                      min="40"
                      max="160"
                      value={tablePositions[selectedTableForConfig]?.width || 70}
                      onChange={(e) => {
                        const width = parseInt(e.target.value) || 70;
                        setTablePositions((prev) => ({
                          ...prev,
                          [selectedTableForConfig]: {
                            ...prev[selectedTableForConfig],
                            width: width,
                          },
                        }));
                      }}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="tableHeight">Table Height (px)</Label>
                    <Input
                      id="tableHeight"
                      type="number"
                      min="40"
                      max="100"
                      value={tablePositions[selectedTableForConfig]?.height || 70}
                      onChange={(e) => {
                        const height = parseInt(e.target.value) || 70;
                        setTablePositions((prev) => ({
                          ...prev,
                          [selectedTableForConfig]: {
                            ...prev[selectedTableForConfig],
                            height: height,
                          },
                        }));
                      }}
                      className="mt-1"
                    />
                  </div>
                </div>

                {/* Shape Selection */}
                <div>
                  <Label htmlFor="tableShape">Table Shape</Label>
                  <Select
                    value={tablePositions[selectedTableForConfig]?.shape || "circle"}
                    onValueChange={(shape: "square" | "circle" | "rectangle") => 
                      changeTableShape(selectedTableForConfig, shape)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="circle">
                        <div className="flex items-center gap-2">
                          <Circle className="h-4 w-4" />
                          Circle
                        </div>
                      </SelectItem>
                      <SelectItem value="square">
                        <div className="flex items-center gap-2">
                          <Square className="h-4 w-4" />
                          Square
                        </div>
                      </SelectItem>
                      <SelectItem value="rectangle">
                        <div className="flex items-center gap-2">
                          <Square className="h-4 w-4" />
                          Rectangle
                        </div>
                      </SelectItem>
                      <SelectItem value="long-rectangle">
                        <div className="flex items-center gap-2">
                          <Square className="h-4 w-4" />
                          Long Rectangle
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Rotation Control */}
                <div>
                  <Label>Table Rotation</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <Button
                      variant="outline"
                      onClick={() => rotateTable(selectedTableForConfig)}
                      className="flex items-center gap-2"
                    >
                      <RotateCw className="h-4 w-4" />
                      Rotate 45°
                    </Button>
                    <span className="text-sm text-gray-500">
                      Current: {tablePositions[selectedTableForConfig]?.rotation || 0}°
                    </span>
                  </div>
                </div>

                {/* Table Preview */}
                <div>
                  <Label>Preview</Label>
                  <div className="mt-2 p-4 border rounded-lg bg-gray-50 flex items-center justify-center">
                    {getTableSVG(
                      tablePositions[selectedTableForConfig]?.shape || "circle",
                      tablePositions[selectedTableForConfig]?.capacity || 
                      tables.find((t: any) => t.id === selectedTableForConfig)?.capacity || 4,
                      tablePositions[selectedTableForConfig]?.width || 80,
                      tablePositions[selectedTableForConfig]?.height || 80,
                      "drop-shadow-lg"
                    )}
                  </div>
                </div>
              </>
            )}
            
            <div className="flex justify-end gap-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowTableConfigPopup(false);
                  setSelectedTableForConfig(null);
                }}
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  setShowTableConfigPopup(false);
                  setSelectedTableForConfig(null);
                }}
                className="bg-green-600 hover:bg-green-700"
              >
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
