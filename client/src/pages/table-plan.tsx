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
import { TABLE_STRUCTURES, TableStructurePreview, getDraggableTableStructure } from "@/components/table-shapes/TableStructures";
import { TableShapesSVG } from "@/components/table-shapes/TableShapesSVG";

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

const TABLE_SHAPES = [
  { value: "square", label: "Square" },
  { value: "circle", label: "Circle" },
  { value: "rectangle", label: "Rectangle" },
];

// Component for rendering tables with professional SVG shapes on the floor plan
interface TableSVGRendererProps {
  position: TablePosition;
  table: any;
  onDragStart: (e: React.DragEvent) => void;
  onRemove: () => void;
}

const TableSVGRenderer: React.FC<TableSVGRendererProps> = ({ position, table, onDragStart, onRemove }) => {
  // Map table shape to appropriate table structure
  const getTableStructure = () => {
    const baseCapacity = table.capacity || 4;
    
    switch (position.shape) {
      case "circle":
      case "round":
        if (baseCapacity <= 2) return TABLE_STRUCTURES[0]; // Small Round
        if (baseCapacity <= 4) return TABLE_STRUCTURES[1]; // Round 1
        if (baseCapacity <= 6) return TABLE_STRUCTURES[2]; // Round 2
        if (baseCapacity <= 8) return TABLE_STRUCTURES[3]; // Round 3
        return TABLE_STRUCTURES[3]; // Default to Round 3 for large capacity
      
      case "square":
        if (baseCapacity <= 2) return TABLE_STRUCTURES[4]; // Square 1
        if (baseCapacity <= 4) return TABLE_STRUCTURES[5]; // Square 2
        return TABLE_STRUCTURES[6]; // Square 4
      
      case "rectangle":
      case "long-rectangle":
        return TABLE_STRUCTURES[7]; // Rectangular
        
      case "oval":
        return TABLE_STRUCTURES[8]; // Oval
        
      case "octagon":
        return TABLE_STRUCTURES[9]; // Octagon
        
      case "hexagon":
        return TABLE_STRUCTURES[10]; // Hexagon
        
      case "curved":
        return TABLE_STRUCTURES[11]; // Curved
        
      default:
        return TABLE_STRUCTURES[1]; // Default to Round 1
    }
  };

  const structure = getTableStructure();
  
  return (
    <div
      style={{
        position: 'absolute',
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: `rotate(${position.rotation || 0}deg)`,
        transformOrigin: 'center',
        cursor: 'grab',
        zIndex: 10,
      }}
      draggable
      onDragStart={onDragStart}
      className="group"
    >
      {/* Professional SVG Table Shape */}
      <div className="relative">
        <TableShapesSVG
          shape={structure.shape}
          capacity={table.capacity}
          width={80}
          height={80}
          className="hover:scale-105 transition-transform duration-200 drop-shadow-lg"
        />
        
        {/* Table Info Overlay */}
        <div 
          className="absolute inset-0 flex items-center justify-center text-white font-bold text-sm pointer-events-none"
          style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
        >
          <div className="text-center">
            <div>{table.tableNumber}</div>
            <div className="text-xs opacity-90">{table.capacity}p</div>
          </div>
        </div>
        
        {/* Remove Button */}
        <button
          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center z-20"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove();
          }}
          title="Remove table"
        >
          ×
        </button>
      </div>
    </div>
  );
};

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

  // Professional SVG table rendering component
  const SVGTableRenderer = ({ position, tableId, table }: { position: TablePosition, tableId: number, table: any }) => {
    const capacity = position.capacity || table?.capacity || 4;
    const tableNumber = position.tableNumber || table?.tableNumber || tableId;
    const shape = position.shape || 'square';

    // Find the matching table structure to get the SVG component
    const getTableComponent = () => {
      // Map current shape/capacity to our new table structures
      if (shape === 'square' || shape === 'rectangle') {
        if (capacity === 1) return TABLE_STRUCTURES.find(s => s.id === 'square-1');
        if (capacity === 2) return TABLE_STRUCTURES.find(s => s.id === 'square-2');
        if (capacity === 4) return TABLE_STRUCTURES.find(s => s.id === 'square-4');
        if (capacity === 6) return TABLE_STRUCTURES.find(s => s.id === 'square-6');
        if (capacity >= 8) return TABLE_STRUCTURES.find(s => s.id === 'square-8');
      } else if (shape === 'circle' || shape === 'round') {
        if (capacity === 1) return TABLE_STRUCTURES.find(s => s.id === 'circle-1');
        if (capacity === 2) return TABLE_STRUCTURES.find(s => s.id === 'circle-2');
        if (capacity === 3) return TABLE_STRUCTURES.find(s => s.id === 'circle-3');
        if (capacity === 4) return TABLE_STRUCTURES.find(s => s.id === 'circle-4');
        if (capacity === 5) return TABLE_STRUCTURES.find(s => s.id === 'circle-5');
        if (capacity === 6) return TABLE_STRUCTURES.find(s => s.id === 'circle-6');
        if (capacity >= 8) return TABLE_STRUCTURES.find(s => s.id === 'circle-8');
      } else if (shape === 'long-rectangle') {
        if (capacity <= 6) return TABLE_STRUCTURES.find(s => s.id === 'square-6');
        return TABLE_STRUCTURES.find(s => s.id === 'square-8');
      }
      
      // Default fallback
      return TABLE_STRUCTURES.find(s => s.id === 'square-4') || TABLE_STRUCTURES[0];
    };

    const tableStructure = getTableComponent();
    if (!tableStructure) return null;

    const TableSVGComponent = tableStructure.component;
    const tableWidth = tableStructure.width;
    const tableHeight = tableStructure.height;

    return (
      <div
        style={{
          position: 'absolute',
          left: `${position.x}px`,
          top: `${position.y}px`,
          transform: `rotate(${position.rotation || 0}deg)`,
          transformOrigin: 'center',
          cursor: isDragging ? 'grabbing' : 'grab',
          zIndex: draggedTable === tableId ? 1000 : 10,
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        }}
        draggable
        onDragStart={(e) => {
          setDraggedTable(tableId);
          setIsDragging(true);
          e.dataTransfer.effectAllowed = "move";
        }}
        onDrag={() => {}}
        onDragEnd={() => {
          setDraggedTable(null);
          setIsDragging(false);
        }}
        onMouseDown={(e) => e.preventDefault()}
      >
        {/* SVG Table with professional design */}
        <div className="relative group">
          <TableSVGComponent 
            width={tableWidth} 
            height={tableHeight}
            className="drop-shadow-lg hover:drop-shadow-xl transition-all"
          />
          
          {/* Table number overlay */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              color: '#fff',
              fontSize: '12px',
              fontWeight: 'bold',
              textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
              pointerEvents: 'none',
              zIndex: 15,
            }}
          >
            {tableNumber}
          </div>

          {/* Remove button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setTablePositions((prev) => {
                const newPositions = { ...prev };
                delete newPositions[tableId];
                return newPositions;
              });
            }}
            style={{
              position: 'absolute',
              top: '-8px',
              right: '-8px',
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0,
              transition: 'all 0.2s ease',
              zIndex: 20,
            }}
            className="group-hover:opacity-100"
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#dc2626';
              e.currentTarget.style.transform = 'scale(1.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#ef4444';
              e.currentTarget.style.transform = 'scale(1)';
            }}
            title="Remove table from plan"
          >
            ×
          </button>
        </div>
      </div>
    );

    // Chair positioning with even spacing and rotation support
    const getChairPositions = () => {
      const chairs: Array<{ x: number, y: number, rotation: number }> = [];
      const centerX = position.x + tableWidth / 2;
      const centerY = position.y + tableHeight / 2;
      const tableRotation = (position.rotation || 0) * Math.PI / 180; // Convert to radians

      // Helper function to rotate a point around table center
      const rotatePoint = (x: number, y: number) => {
        const dx = x - centerX;
        const dy = y - centerY;
        return {
          x: centerX + dx * Math.cos(tableRotation) - dy * Math.sin(tableRotation),
          y: centerY + dx * Math.sin(tableRotation) + dy * Math.cos(tableRotation)
        };
      };

      if (shape === 'square' || shape === 'rectangle') {
        // Calculate chairs per side evenly
        const perimeter = 2 * (tableWidth + tableHeight);
        const chairDistance = 25; // Fixed distance between chairs
        const maxChairsPerimeter = Math.floor(perimeter / chairDistance);
        const actualCapacity = Math.min(capacity, maxChairsPerimeter);
        
        // Distribute chairs evenly around perimeter
        const topChairs = Math.ceil(actualCapacity * (tableWidth / perimeter));
        const rightChairs = Math.ceil((actualCapacity - topChairs) * (tableHeight / (perimeter - tableWidth)));
        const bottomChairs = Math.ceil((actualCapacity - topChairs - rightChairs) * (tableWidth / (perimeter - tableWidth - tableHeight)));
        const leftChairs = actualCapacity - topChairs - rightChairs - bottomChairs;

        // Top side - evenly spaced
        for (let i = 0; i < topChairs; i++) {
          const spacing = tableWidth / (topChairs + 1);
          const chairX = position.x + spacing * (i + 1) - 8;
          const chairY = position.y - 18;
          const rotatedPos = rotatePoint(chairX, chairY);
          chairs.push({
            x: rotatedPos.x,
            y: rotatedPos.y,
            rotation: (position.rotation || 0) + 0
          });
        }

        // Right side - evenly spaced
        for (let i = 0; i < rightChairs; i++) {
          const spacing = tableHeight / (rightChairs + 1);
          const chairX = position.x + tableWidth + 8;
          const chairY = position.y + spacing * (i + 1) - 8;
          const rotatedPos = rotatePoint(chairX, chairY);
          chairs.push({
            x: rotatedPos.x,
            y: rotatedPos.y,
            rotation: (position.rotation || 0) + 90
          });
        }

        // Bottom side - evenly spaced
        for (let i = 0; i < bottomChairs; i++) {
          const spacing = tableWidth / (bottomChairs + 1);
          const chairX = position.x + tableWidth - spacing * (i + 1) - 8;
          const chairY = position.y + tableHeight + 8;
          const rotatedPos = rotatePoint(chairX, chairY);
          chairs.push({
            x: rotatedPos.x,
            y: rotatedPos.y,
            rotation: (position.rotation || 0) + 180
          });
        }

        // Left side - evenly spaced
        for (let i = 0; i < leftChairs; i++) {
          const spacing = tableHeight / (leftChairs + 1);
          const chairX = position.x - 18;
          const chairY = position.y + tableHeight - spacing * (i + 1) - 8;
          const rotatedPos = rotatePoint(chairX, chairY);
          chairs.push({
            x: rotatedPos.x,
            y: rotatedPos.y,
            rotation: (position.rotation || 0) + 270
          });
        }
      } else if (shape === 'long-rectangle') {
        // For long rectangles, prioritize long sides
        const longSideChairs = Math.ceil(capacity * 0.6);
        const shortSideChairs = Math.floor((capacity - longSideChairs) / 2);
        const topChairs = Math.ceil(longSideChairs / 2);
        const bottomChairs = Math.floor(longSideChairs / 2);

        // Top long side
        for (let i = 0; i < topChairs; i++) {
          const spacing = tableWidth / (topChairs + 1);
          const chairX = position.x + spacing * (i + 1) - 8;
          const chairY = position.y - 25;
          const rotatedPos = rotatePoint(chairX, chairY);
          chairs.push({
            x: rotatedPos.x,
            y: rotatedPos.y,
            rotation: (position.rotation || 0) + 0
          });
        }

        // Bottom long side
        for (let i = 0; i < bottomChairs; i++) {
          const spacing = tableWidth / (bottomChairs + 1);
          const chairX = position.x + spacing * (i + 1) - 8;
          const chairY = position.y + tableHeight + 15;
          const rotatedPos = rotatePoint(chairX, chairY);
          chairs.push({
            x: rotatedPos.x,
            y: rotatedPos.y,
            rotation: (position.rotation || 0) + 180
          });
        }

        // Left short side
        for (let i = 0; i < shortSideChairs; i++) {
          const spacing = tableHeight / (shortSideChairs + 1);
          const chairX = position.x - 18;
          const chairY = position.y + spacing * (i + 1) - 8;
          const rotatedPos = rotatePoint(chairX, chairY);
          chairs.push({
            x: rotatedPos.x,
            y: rotatedPos.y,
            rotation: (position.rotation || 0) + 270
          });
        }

        // Right short side
        for (let i = 0; i < shortSideChairs; i++) {
          const spacing = tableHeight / (shortSideChairs + 1);
          const chairX = position.x + tableWidth + 8;
          const chairY = position.y + spacing * (i + 1) - 8;
          const rotatedPos = rotatePoint(chairX, chairY);
          chairs.push({
            x: rotatedPos.x,
            y: rotatedPos.y,
            rotation: (position.rotation || 0) + 90
          });
        }
      } else {
        // Circular arrangement for round, oval, octagon tables
        const radius = Math.max(tableWidth, tableHeight) / 2 + 20;
        for (let i = 0; i < capacity; i++) {
          const angle = (i * 2 * Math.PI) / capacity - Math.PI / 2; // Start from top
          const adjustedAngle = angle + tableRotation; // Add table rotation
          chairs.push({
            x: centerX + radius * Math.cos(adjustedAngle) - 8,
            y: centerY + radius * Math.sin(adjustedAngle) - 8,
            rotation: (adjustedAngle * 180 / Math.PI) + 90
          });
        }
      }

      return chairs;
    };

    const chairPositions = getChairPositions();

    return (
      <div key={`table-group-${tableId}`}>
        {/* Chairs */}
        {chairPositions.map((chair, index) => (
          <div
            key={`chair-${tableId}-${index}`}
            style={{
              position: 'absolute',
              left: `${chair.x}px`,
              top: `${chair.y}px`,
              width: '12px',
              height: '18px',
              backgroundColor: '#8b4513',
              border: '1px solid #654321',
              borderRadius: '3px 3px 6px 6px',
              transform: `rotate(${chair.rotation}deg)`,
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
              zIndex: 5,
            }}
          >
            {/* Chair back */}
            <div
              style={{
                position: 'absolute',
                top: '-1px',
                left: '1px',
                width: '10px',
                height: '4px',
                backgroundColor: '#654321',
                borderRadius: '1px 1px 0 0',
              }}
            />
          </div>
        ))}

        {/* Table */}
        <div
          style={getTableStyle()}
          draggable
          onDragStart={(e) => handleDragStart(tableId, e)}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = `rotate(${position.rotation || 0}deg) scale(1.05)`;
            e.currentTarget.style.boxShadow = '0 12px 24px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = `rotate(${position.rotation || 0}deg) scale(1)`;
            e.currentTarget.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)';
          }}
        >
          {/* Remove button (X) */}
          <button
            style={{
              position: 'absolute',
              top: '-8px',
              right: '-8px',
              width: '20px',
              height: '20px',
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '50%',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 20,
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (window.confirm(`Remove Table ${tableNumber} from the floor plan?`)) {
                setTablePositions((prev) => {
                  const newPositions = { ...prev };
                  delete newPositions[tableId];
                  return newPositions;
                });
              }
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#dc2626';
              e.currentTarget.style.transform = 'scale(1.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#ef4444';
              e.currentTarget.style.transform = 'scale(1)';
            }}
            title="Remove table from plan"
          >
            ×
          </button>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '10px', opacity: 0.8 }}>T</div>
            <div style={{ fontSize: '12px', fontWeight: 'bold' }}>{tableNumber}</div>
            <div style={{ fontSize: '8px', opacity: 0.7 }}>{capacity}p</div>
          </div>
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
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Table Plan Designer</h1>
              <div className="ml-4 text-sm text-gray-500">
                {restaurant?.name || 'Restaurant Layout'}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={() => {/* Save layout */}}
                className="bg-white hover:bg-gray-50"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Layout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Professional Sidebar */}
        <div className="w-80 bg-white border-r shadow-lg min-h-screen">
          <div className="p-6 bg-gradient-to-b from-gray-50 to-white border-b">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Design Tools</h2>
            <p className="text-sm text-gray-500">Drag tables and shapes to create your layout</p>
          </div>
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
                        style={{cursor: "grab"}}
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

            {/* Professional Table Structures */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Table Shapes</h3>
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
                      <div className="text-xs font-medium text-gray-700">{structure.name}</div>
                      <div className="text-xs text-gray-500">{structure.description}</div>
                    </div>
                  </div>
                ))}

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

                {/* Professional Tables with Chairs */}
                {Object.entries(tablePositions).map(([tableId, position]) => {
                  const dbTable = tables.find((t: any) => t.id === parseInt(tableId));
                  const numericTableId = parseInt(tableId);

                  return (
                    <div
                      key={`table-wrapper-${tableId}`}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        if (window.confirm(`Remove this table from the floor plan?`)) {
                          setTablePositions((prev) => {
                            const newPositions = { ...prev };
                            delete newPositions[numericTableId];
                            return newPositions;
                          });
                        }
                      }}
                    >
                      <TableSVGRenderer
                        position={position}
                        table={dbTable}
                        onDragStart={(e) => handleDragStart(numericTableId, e)}
                        onRemove={() => {
                          if (window.confirm(`Remove Table ${dbTable.tableNumber} from the floor plan?`)) {
                            setTablePositions((prev) => {
                              const newPositions = { ...prev };
                              delete newPositions[numericTableId];
                              return newPositions;
                            });
                          }
                        }}
                      />
                    </div>
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