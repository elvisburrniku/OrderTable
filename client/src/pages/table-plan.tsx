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
  shape: "square" | "circle" | "rectangle" | "oval" | "round" | "octagon" | "hexagon" | "long-rectangle" | "curved";
  tableNumber?: string;
  capacity?: number;
  isConfigured?: boolean;
}

interface TableStructure {
  id: string;
  name: string;
  shape: "square" | "circle" | "rectangle" | "oval" | "round" | "octagon" | "hexagon" | "long-rectangle" | "curved";
  icon: any;
  defaultCapacity: number;
  description: string;
}

const TABLE_SHAPES = [
  { value: "square", label: "Square" },
  { value: "circle", label: "Circle" },
  { value: "rectangle", label: "Rectangle" },
];

const TABLE_STRUCTURES: TableStructure[] = [
  {
    id: "square-2",
    name: "Square 2",
    shape: "square",
    icon: Square,
    defaultCapacity: 2,
    description: "2-person square table",
  },
  {
    id: "circle-2",
    name: "Round 2",
    shape: "circle",
    icon: Circle,
    defaultCapacity: 2,
    description: "2-person round table",
  },
  {
    id: "square-4",
    name: "Square 4",
    shape: "square",
    icon: Square,
    defaultCapacity: 4,
    description: "4-person square table",
  },
  {
    id: "circle-4",
    name: "Round 4",
    shape: "round",
    icon: Circle,
    defaultCapacity: 4,
    description: "4-person round table",
  },
  {
    id: "circle-6",
    name: "Round 6",
    shape: "round",
    icon: Circle,
    defaultCapacity: 6,
    description: "6-person round table",
  },
  {
    id: "curved-6",
    name: "Curved 6",
    shape: "curved",
    icon: Circle,
    defaultCapacity: 6,
    description: "6-person curved table",
  },
  {
    id: "curved-8",
    name: "Curved 8",
    shape: "curved",
    icon: Circle,
    defaultCapacity: 8,
    description: "8-person curved table",
  },
  {
    id: "octagon-8",
    name: "Octagon 8",
    shape: "octagon",
    icon: Circle,
    defaultCapacity: 8,
    description: "8-person octagon table",
  },
  {
    id: "circle-10",
    name: "Round 10",
    shape: "round",
    icon: Circle,
    defaultCapacity: 10,
    description: "10-person round table",
  },
  {
    id: "circle-12",
    name: "Round 12",
    shape: "round",
    icon: Circle,
    defaultCapacity: 12,
    description: "12-person round table",
  },
  {
    id: "circle-16",
    name: "Round 16",
    shape: "round",
    icon: Circle,
    defaultCapacity: 16,
    description: "16-person round table",
  },
  {
    id: "long-rect-8",
    name: "Long 8",
    shape: "long-rectangle",
    icon: Square,
    defaultCapacity: 8,
    description: "8-person long table",
  },
  {
    id: "long-rect-12",
    name: "Long 12",
    shape: "long-rectangle",
    icon: Square,
    defaultCapacity: 12,
    description: "12-person long table",
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
      setDraggedStructure(structure);
      setDraggedTable(null);
      setIsDragging(true);
      e.dataTransfer.effectAllowed = "copy";
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

      if (!planRef.current) return;

      const rect = planRef.current.getBoundingClientRect();
      const x = Math.max(
        40,
        Math.min(e.clientX - rect.left - 40, rect.width - 80),
      );
      const y = Math.max(
        40,
        Math.min(e.clientY - rect.top - 40, rect.height - 80),
      );

      if (draggedTable !== null) {
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
        const currentStructure = draggedStructure;
        setDraggedTable(null);
        setDraggedStructure(null);
        setIsDragging(false);

        setPendingTablePosition({ x, y, structure: currentStructure });
        setTableConfig({
          tableNumber: "",
          capacity: currentStructure.defaultCapacity,
        });

        setTimeout(() => {
          setShowConfigDialog(true);
        }, 100);
      } else {
        setDraggedTable(null);
        setDraggedStructure(null);
        setIsDragging(false);
      }
    },
    [draggedTable, draggedStructure],
  );

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

    const existingTable = tables.find(
      (table: any) => table.tableNumber === tableConfig.tableNumber,
    );
    if (existingTable) {
      alert(
        "A table with this number already exists. Please choose a different number.",
      );
      return;
    }

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

  // Table rendering function
  const renderTable = (position: TablePosition, tableId: number, table: any) => {
    const shape = position.shape || 'square';
    const capacity = position.capacity || table?.capacity || 4;
    const tableNumber = position.tableNumber || table?.tableNumber || tableId;

    const getTableDimensions = () => {
      switch (shape) {
        case 'square':
          return { width: 50, height: 50 };
        case 'circle':
        case 'round':
          return { width: 50, height: 50 };
        case 'long-rectangle':
          return { width: 80, height: 40 };
        default:
          return { width: 50, height: 50 };
      }
    };

    const { width: tableWidth, height: tableHeight } = getTableDimensions();

    const getTableStyle = () => {
      const baseStyle = {
        position: 'absolute' as const,
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${tableWidth}px`,
        height: `${tableHeight}px`,
        backgroundColor: '#64748b',
        border: '2px solid #475569',
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '12px',
        fontWeight: 'bold',
        color: '#fff',
        cursor: 'pointer',
        userSelect: 'none' as const,
        zIndex: 10,
        transform: `rotate(${position.rotation || 0}deg)`,
        transition: 'all 0.2s ease',
      };

      switch (shape) {
        case 'circle':
        case 'round':
          return { ...baseStyle, borderRadius: '50%' };
        case 'long-rectangle':
          return { ...baseStyle, borderRadius: '4px' };
        default:
          return { ...baseStyle, borderRadius: '4px' };
      }
    };

    return (
      <div
        key={`table-${tableId}`}
        style={getTableStyle()}
        draggable
        onDragStart={(e) => handleDragStart(tableId, e)}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#475569';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#64748b';
        }}
      >
        <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
          {tableNumber.toString().padStart(2, '0')}
        </div>
        <div style={{ fontSize: '10px', opacity: 0.8 }}>
          {capacity} pers.
        </div>
      </div>
    );
  };

  // Table shape components for sidebar
  const TableShape = ({ shape, capacity, onClick }: { shape: string, capacity: number, onClick: () => void }) => {
    const getShapeStyle = () => {
      const baseStyle = {
        width: '50px',
        height: '50px',
        backgroundColor: '#64748b',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: '10px',
        fontWeight: 'bold',
        margin: '4px',
        transition: 'all 0.2s ease',
      };

      switch (shape) {
        case 'circle':
          return { ...baseStyle, borderRadius: '50%' };
        case 'long-rectangle':
          return { ...baseStyle, width: '60px', height: '30px', borderRadius: '4px' };
        default:
          return { ...baseStyle, borderRadius: '4px' };
      }
    };

    const structure = TABLE_STRUCTURES.find(s => s.defaultCapacity === capacity && s.shape === shape) || 
                    { defaultCapacity: capacity, shape };

    return (
      <div
        style={getShapeStyle()}
        draggable
        onDragStart={(e) => handleStructureDragStart(structure as TableStructure, e)}
        onClick={onClick}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#475569';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#64748b';
        }}
      >
        <div>{capacity}</div>
        <div style={{ fontSize: '8px' }}>pers.</div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="flex">
        {/* Sidebar - matching the image design */}
        <div className="w-56 bg-white border-r border-gray-300 min-h-screen p-4">
          {/* Header */}
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Table plan</h2>

          {/* Room Selection */}
          <div className="mb-6">
            <div className="bg-gray-200 p-3 rounded">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Room</h3>
              <Select value={selectedRoom} onValueChange={setSelectedRoom}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="The restaurant" />
                </SelectTrigger>
                <SelectContent>
                  {rooms.map((room: any) => (
                    <SelectItem key={room.id} value={room.id.toString()}>
                      {room.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                variant="link" 
                className="text-green-600 text-sm p-0 mt-1"
                onClick={() => window.open(`/${restaurant?.tenantId}/rooms`, '_blank')}
              >
                Manage rooms
              </Button>
            </div>
          </div>

          {/* Add Table Section */}
          <div className="mb-6">
            <div className="bg-gray-200 p-3 rounded">
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Add table <span className="text-gray-500">(drag to the white box)</span>
              </h3>

              {/* Table shapes grid */}
              <div className="grid grid-cols-3 gap-1">
                <TableShape shape="square" capacity={2} onClick={() => {}} />
                <TableShape shape="circle" capacity={2} onClick={() => {}} />
                <TableShape shape="square" capacity={3} onClick={() => {}} />

                <TableShape shape="circle" capacity={4} onClick={() => {}} />
                <TableShape shape="circle" capacity={6} onClick={() => {}} />
                <TableShape shape="long-rectangle" capacity={4} onClick={() => {}} />

                <TableShape shape="long-rectangle" capacity={6} onClick={() => {}} />
                <TableShape shape="circle" capacity={8} onClick={() => {}} />
                <TableShape shape="circle" capacity={10} onClick={() => {}} />

                <TableShape shape="circle" capacity={12} onClick={() => {}} />
                <TableShape shape="circle" capacity={16} onClick={() => {}} />
                <TableShape shape="long-rectangle" capacity={8} onClick={() => {}} />

                <TableShape shape="long-rectangle" capacity={12} onClick={() => {}} />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <Button
            onClick={() => saveLayoutMutation.mutate(tablePositions)}
            disabled={saveLayoutMutation.isPending}
            className="w-full bg-green-600 hover:bg-green-700 text-white mb-4"
          >
            Save table plan
          </Button>

          {/* Unallocated Tables */}
          <div className="mb-4">
            <div className="bg-gray-200 p-3 rounded">
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Unallocated tables <span className="text-gray-500">(drag to the white box)</span>
              </h3>
              <div className="flex flex-wrap gap-2">
                {tables.filter((table: any) => !tablePositions[table.id]).map((table: any, index: number) => {
                  const priorityColors = [
                    '#16a34a', // Highest - Green
                    '#2563eb', // High - Blue  
                    '#64748b', // Medium - Gray
                    '#eab308', // Low - Yellow
                    '#dc2626', // Lowest - Red
                  ];
                  const colorClass = priorityColors[index % priorityColors.length];

                  return (
                    <div
                      key={`unallocated-${table.id}`}
                      style={{
                        backgroundColor: colorClass,
                        color: 'white',
                        padding: '8px 12px',
                        borderRadius: '4px',
                        cursor: 'grab',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        minWidth: '50px'
                      }}
                      draggable
                      onDragStart={(e) => handleDragStart(table.id, e)}
                      title={`Table ${table.tableNumber} - ${table.capacity} persons`}
                    >
                      <div>{table.tableNumber}</div>
                      <div style={{ fontSize: '10px' }}>{table.capacity} pers.</div>
                    </div>
                  );
                })}
              </div>

              {/* Priority Legend */}
              <div className="mt-3">
                <div className="text-xs text-gray-700 mb-1">Priority:</div>
                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                    <span>Highest</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                    <span>High</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
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
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 p-6">
          <div
            ref={planRef}
            className="bg-gray-200 border-2 border-gray-300 rounded"
            style={{ height: "600px", minHeight: "400px", position: "relative" }}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            {/* Drop zone hint */}
            {Object.keys(tablePositions).length === 0 && !isDragging && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <Move className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-lg font-medium">
                    Drag tables here to create your floor plan
                  </p>
                </div>
              </div>
            )}

            {/* Active drop zone indicator */}
            {isDragging && draggedStructure && (
              <div className="absolute inset-0 flex items-center justify-center bg-green-50 bg-opacity-50 border-2 border-dashed border-green-300 rounded">
                <div className="text-center text-green-600">
                  <Plus className="h-16 w-16 mx-auto mb-2" />
                  <p className="text-lg font-medium">
                    Drop here to add {draggedStructure.name}
                  </p>
                </div>
              </div>
            )}

            {/* Render placed tables */}
            {Object.entries(tablePositions).map(([tableId, position]) => {
              const dbTable = tables.find((t: any) => t.id === parseInt(tableId));
              const numericTableId = parseInt(tableId);

              return renderTable(position, numericTableId, dbTable);
            })}
          </div>
        </div>
      </div>

      {/* Table Configuration Dialog */}
      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure New Table</DialogTitle>
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