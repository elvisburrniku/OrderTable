
import React, { useState, useRef, useCallback } from "react";
import { useAuthGuard } from "@/lib/auth.tsx";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Save, RotateCw, Move, Square, Circle, Users } from "lucide-react";

interface TablePosition {
  id: number;
  x: number;
  y: number;
  rotation: number;
  shape: 'square' | 'circle' | 'rectangle';
}

const TABLE_SHAPES = [
  { value: 'square', label: 'Square', icon: Square },
  { value: 'circle', label: 'Round', icon: Circle },
  { value: 'rectangle', label: 'Rectangle', icon: Square }
];

export default function TablePlan() {
  const { isLoading: authLoading, isAuthenticated, user, restaurant } = useAuthGuard();
  const queryClient = useQueryClient();
  const [selectedRoom, setSelectedRoom] = useState<string>("main");
  const [tablePositions, setTablePositions] = useState<Record<number, TablePosition>>({});
  const [draggedTable, setDraggedTable] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const planRef = useRef<HTMLDivElement>(null);

  const { data: tables = [], isLoading: tablesLoading } = useQuery({
    queryKey: ["/api/tenants/1/restaurants", restaurant?.id, "tables"],
    queryFn: async () => {
      const tenantId = 1;
      const response = await fetch(`/api/tenants/${tenantId}/restaurants/${restaurant?.id}/tables`);
      if (!response.ok) throw new Error("Failed to fetch tables");
      return response.json();
    },
    enabled: !!restaurant,
  });

  const { data: rooms = [] } = useQuery({
    queryKey: ["/api/tenants/1/restaurants", restaurant?.id, "rooms"],
    queryFn: async () => {
      const tenantId = 1;
      const response = await fetch(`/api/tenants/${tenantId}/restaurants/${restaurant?.id}/rooms`);
      if (!response.ok) throw new Error("Failed to fetch rooms");
      return response.json();
    },
    enabled: !!restaurant,
  });

  // Load saved table layout
  const { data: savedLayout } = useQuery({
    queryKey: ["/api/tenants/1/restaurants", restaurant?.id, "table-layout", selectedRoom],
    queryFn: async () => {
      const tenantId = 1;
      const response = await fetch(`/api/tenants/${tenantId}/restaurants/${restaurant?.id}/table-layout?room=${selectedRoom}`);
      if (!response.ok) throw new Error("Failed to fetch table layout");
      return response.json();
    },
    enabled: !!restaurant,
  });

  // Apply saved layout when it loads
  React.useEffect(() => {
    if (savedLayout?.positions) {
      setTablePositions(savedLayout.positions);
    }
  }, [savedLayout]);

  const saveLayoutMutation = useMutation({
    mutationFn: async (positions: Record<number, TablePosition>) => {
      const tenantId = 1;
      const response = await fetch(`/api/tenants/${tenantId}/restaurants/${restaurant?.id}/table-layout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room: selectedRoom, positions }),
      });
      if (!response.ok) throw new Error("Failed to save layout");
      return response.json();
    },
    onSuccess: () => {
      alert("Table layout saved successfully!");
    },
  });

  const handleDragStart = useCallback((tableId: number, e: React.DragEvent) => {
    setDraggedTable(tableId);
    setIsDragging(true);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedTable || !planRef.current) return;

    const rect = planRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setTablePositions(prev => ({
      ...prev,
      [draggedTable]: {
        id: draggedTable,
        x: Math.max(30, Math.min(x - 30, rect.width - 60)),
        y: Math.max(30, Math.min(y - 30, rect.height - 60)),
        rotation: prev[draggedTable]?.rotation || 0,
        shape: prev[draggedTable]?.shape || 'circle'
      }
    }));

    setDraggedTable(null);
    setIsDragging(false);
  }, [draggedTable]);

  const rotateTable = (tableId: number) => {
    setTablePositions(prev => ({
      ...prev,
      [tableId]: {
        ...prev[tableId],
        rotation: (prev[tableId]?.rotation || 0) + 45
      }
    }));
  };

  const changeTableShape = (tableId: number, shape: 'square' | 'circle' | 'rectangle') => {
    setTablePositions(prev => ({
      ...prev,
      [tableId]: {
        ...prev[tableId],
        shape
      }
    }));
  };

  if (authLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated || !user || !restaurant) {
    return null;
  }

  const getTableStyle = (table: any, position?: TablePosition) => {
    const baseStyle = {
      width: '60px',
      height: '60px',
      position: 'absolute' as const,
      cursor: 'move',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '12px',
      fontWeight: 'bold',
      color: 'white',
      userSelect: 'none' as const,
      zIndex: isDragging && draggedTable === table.id ? 1000 : 1,
    };

    if (position) {
      return {
        ...baseStyle,
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: `rotate(${position.rotation}deg)`,
        backgroundColor: table.isActive ? '#16a34a' : '#6b7280',
        borderRadius: position.shape === 'circle' ? '50%' : 
                     position.shape === 'rectangle' ? '8px' : '4px',
        width: position.shape === 'rectangle' ? '80px' : '60px',
      };
    }

    return {
      ...baseStyle,
      backgroundColor: table.isActive ? '#16a34a' : '#6b7280',
      borderRadius: '50%',
      position: 'relative' as const,
      margin: '5px',
    };
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <div className="bg-white border-b">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-6">
            <h1 className="text-xl font-semibold">Table Plan</h1>
            <nav className="flex space-x-6">
              <a href="/dashboard" className="text-gray-600 hover:text-gray-900">Booking</a>
              <a href="#" className="text-green-600 font-medium">CRM</a>
              <a href="#" className="text-gray-600 hover:text-gray-900">Archive</a>
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">{restaurant.name}</span>
            <Button variant="outline" size="sm">Profile</Button>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white border-r min-h-screen">
          <div className="p-6">
            {/* Room Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Room</label>
              <Select value={selectedRoom} onValueChange={setSelectedRoom}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="main">Main Dining</SelectItem>
                  {rooms.map((room: any) => (
                    <SelectItem key={room.id} value={room.id.toString()}>
                      {room.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Available Tables */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Available Tables</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {tables.map((table: any) => (
                  <div
                    key={table.id}
                    className="p-2 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">Table {table.tableNumber}</div>
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
                          value={tablePositions[table.id]?.shape || 'circle'}
                          onValueChange={(shape: 'square' | 'circle' | 'rectangle') => 
                            changeTableShape(table.id, shape)
                          }
                        >
                          <SelectTrigger className="h-6 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TABLE_SHAPES.map((shape) => (
                              <SelectItem key={shape.value} value={shape.value}>
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
                <CardTitle>Table Plan - {selectedRoom === "main" ? "Main Dining" : `Room ${selectedRoom}`}</CardTitle>
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
                Drag tables from the sidebar onto the floor plan to arrange your restaurant layout.
              </p>
            </CardHeader>
            <CardContent>
              <div
                ref={planRef}
                className="relative bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg"
                style={{ height: '600px', minHeight: '400px' }}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                {/* Grid pattern */}
                <div 
                  className="absolute inset-0 opacity-20"
                  style={{
                    backgroundImage: 'radial-gradient(circle, #666 1px, transparent 1px)',
                    backgroundSize: '20px 20px'
                  }}
                />

                {/* Drop zone hint */}
                {Object.keys(tablePositions).length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-gray-500">
                      <Move className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p className="text-lg font-medium">Drag tables here to create your floor plan</p>
                      <p className="text-sm">Start by dragging tables from the sidebar</p>
                    </div>
                  </div>
                )}

                {/* Placed Tables */}
                {tables.map((table: any) => {
                  const position = tablePositions[table.id];
                  if (!position) return null;

                  return (
                    <div
                      key={table.id}
                      draggable
                      onDragStart={(e) => handleDragStart(table.id, e)}
                      style={getTableStyle(table, position)}
                      className="shadow-lg border-2 border-white hover:shadow-xl transition-shadow"
                      title={`Table ${table.tableNumber} (${table.capacity} seats)`}
                    >
                      {table.tableNumber}
                    </div>
                  );
                })}
              </div>

              {/* Status */}
              <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
                <div>
                  Tables placed: {Object.keys(tablePositions).length} of {tables.length}
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant="outline">
                    Total Capacity: {tables.reduce((sum: number, table: any) => 
                      tablePositions[table.id] ? sum + table.capacity : sum, 0
                    )} seats
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
