import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { 
  Save, 
  Undo, 
  Redo, 
  RotateCw, 
  Copy, 
  Trash2, 
  Grid, 
  ZoomIn, 
  ZoomOut, 
  Move,
  Square,
  Circle,
  Plus,
  Settings,
  Palette,
  Eye,
  EyeOff
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface FloorPlanItem {
  id: string;
  type: 'table' | 'chair' | 'wall' | 'door' | 'window' | 'decoration';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  color: string;
  label?: string;
  capacity?: number;
  tableNumber?: string;
  shape: 'rectangle' | 'circle' | 'square';
  isSelected?: boolean;
}

interface FloorPlanBuilderProps {
  restaurantId: number;
  tenantId: number;
  roomId?: number;
  initialLayout?: FloorPlanItem[];
  onSave?: (layout: FloorPlanItem[]) => void;
}

const ITEM_TEMPLATES = {
  table: {
    rectangle: { width: 80, height: 40, color: '#8B4513', shape: 'rectangle' as const },
    circle: { width: 60, height: 60, color: '#8B4513', shape: 'circle' as const },
    square: { width: 60, height: 60, color: '#8B4513', shape: 'square' as const }
  },
  chair: {
    rectangle: { width: 20, height: 20, color: '#654321', shape: 'rectangle' as const }
  },
  wall: {
    rectangle: { width: 100, height: 10, color: '#666666', shape: 'rectangle' as const }
  },
  door: {
    rectangle: { width: 30, height: 8, color: '#8B4513', shape: 'rectangle' as const }
  },
  window: {
    rectangle: { width: 60, height: 8, color: '#87CEEB', shape: 'rectangle' as const }
  },
  decoration: {
    rectangle: { width: 40, height: 40, color: '#228B22', shape: 'rectangle' as const },
    circle: { width: 40, height: 40, color: '#228B22', shape: 'circle' as const }
  }
};

const COLORS = [
  '#8B4513', '#654321', '#D2691E', '#CD853F', // Browns
  '#FF6B6B', '#FF8E53', '#FF6B9D', '#C44569', // Reds/Pinks
  '#4ECDC4', '#45B7D1', '#6C5CE7', '#A29BFE', // Blues/Teals
  '#FFA726', '#FFD54F', '#66BB6A', '#81C784', // Oranges/Greens
  '#78909C', '#90A4AE', '#666666', '#424242'  // Grays
];

export default function FloorPlanBuilder({
  restaurantId,
  tenantId,
  roomId,
  initialLayout = [],
  onSave
}: FloorPlanBuilderProps) {
  const [items, setItems] = useState<FloorPlanItem[]>(initialLayout);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [gridSize, setGridSize] = useState(20);
  const [showGrid, setShowGrid] = useState(true);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [tool, setTool] = useState<'select' | 'add'>('select');
  const [selectedTemplate, setSelectedTemplate] = useState<{
    type: keyof typeof ITEM_TEMPLATES;
    shape: string;
  }>({ type: 'table', shape: 'rectangle' });
  const [history, setHistory] = useState<FloorPlanItem[][]>([initialLayout]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [isPropertiesOpen, setIsPropertiesOpen] = useState(false);
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Save layout mutation
  const saveLayoutMutation = useMutation({
    mutationFn: async (layout: FloorPlanItem[]) => {
      const response = await apiRequest(
        `/api/tenants/${tenantId}/restaurants/${restaurantId}/table-layout`,
        'POST',
        {
          room: roomId?.toString() || 'main',
          positions: layout.reduce((acc, item) => {
            acc[item.id] = {
              x: item.x,
              y: item.y,
              width: item.width,
              height: item.height,
              rotation: item.rotation,
              type: item.type,
              color: item.color,
              shape: item.shape,
              label: item.label,
              capacity: item.capacity,
              tableNumber: item.tableNumber
            };
            return acc;
          }, {} as any)
        }
      );
      if (!response.ok) throw new Error('Failed to save layout');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Floor plan saved successfully",
      });
      if (onSave) onSave(items);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save floor plan",
        variant: "destructive",
      });
    }
  });

  // Add item to history
  const addToHistory = useCallback((newItems: FloorPlanItem[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push([...newItems]);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  // Undo/Redo
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setItems([...history[historyIndex - 1]]);
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setItems([...history[historyIndex + 1]]);
    }
  }, [history, historyIndex]);

  // Generate unique ID
  const generateId = () => `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Add new item
  const addItem = useCallback((x: number, y: number) => {
    const template = ITEM_TEMPLATES[selectedTemplate.type][selectedTemplate.shape];
    if (!template) return;

    const newItem: FloorPlanItem = {
      id: generateId(),
      type: selectedTemplate.type,
      x: Math.round(x / gridSize) * gridSize,
      y: Math.round(y / gridSize) * gridSize,
      width: template.width,
      height: template.height,
      rotation: 0,
      color: template.color,
      shape: template.shape,
      label: selectedTemplate.type === 'table' ? `Table ${items.filter(i => i.type === 'table').length + 1}` : undefined,
      capacity: selectedTemplate.type === 'table' ? 4 : undefined,
      tableNumber: selectedTemplate.type === 'table' ? `${items.filter(i => i.type === 'table').length + 1}` : undefined
    };

    const newItems = [...items, newItem];
    setItems(newItems);
    addToHistory(newItems);
    setSelectedItems([newItem.id]);
  }, [selectedTemplate, items, gridSize, addToHistory]);

  // Handle canvas click
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    if (tool === 'add') {
      addItem(x, y);
    } else {
      // Select tool - check if clicking on an item
      const clickedItem = items.find(item => 
        x >= item.x && x <= item.x + item.width &&
        y >= item.y && y <= item.y + item.height
      );

      if (clickedItem) {
        if (e.ctrlKey || e.metaKey) {
          // Multi-select
          setSelectedItems(prev => 
            prev.includes(clickedItem.id) 
              ? prev.filter(id => id !== clickedItem.id)
              : [...prev, clickedItem.id]
          );
        } else {
          setSelectedItems([clickedItem.id]);
        }
      } else {
        setSelectedItems([]);
      }
    }
  }, [tool, items, zoom, addItem]);

  // Handle item drag
  const handleItemDrag = useCallback((itemId: string, deltaX: number, deltaY: number) => {
    const newItems = items.map(item => {
      if (selectedItems.includes(item.id)) {
        return {
          ...item,
          x: Math.max(0, Math.round((item.x + deltaX) / gridSize) * gridSize),
          y: Math.max(0, Math.round((item.y + deltaY) / gridSize) * gridSize)
        };
      }
      return item;
    });
    setItems(newItems);
  }, [items, selectedItems, gridSize]);

  // Delete selected items
  const deleteSelected = useCallback(() => {
    const newItems = items.filter(item => !selectedItems.includes(item.id));
    setItems(newItems);
    addToHistory(newItems);
    setSelectedItems([]);
  }, [items, selectedItems, addToHistory]);

  // Duplicate selected items
  const duplicateSelected = useCallback(() => {
    const selectedItemsData = items.filter(item => selectedItems.includes(item.id));
    const newItems = selectedItemsData.map(item => ({
      ...item,
      id: generateId(),
      x: item.x + 20,
      y: item.y + 20
    }));
    
    const updatedItems = [...items, ...newItems];
    setItems(updatedItems);
    addToHistory(updatedItems);
    setSelectedItems(newItems.map(item => item.id));
  }, [items, selectedItems, addToHistory]);

  // Rotate selected items
  const rotateSelected = useCallback(() => {
    const newItems = items.map(item => {
      if (selectedItems.includes(item.id)) {
        return { ...item, rotation: (item.rotation + 90) % 360 };
      }
      return item;
    });
    setItems(newItems);
    addToHistory(newItems);
  }, [items, selectedItems, addToHistory]);

  // Update selected item properties
  const updateSelectedProperties = useCallback((updates: Partial<FloorPlanItem>) => {
    const newItems = items.map(item => {
      if (selectedItems.includes(item.id)) {
        return { ...item, ...updates };
      }
      return item;
    });
    setItems(newItems);
    addToHistory(newItems);
  }, [items, selectedItems, addToHistory]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              redo();
            } else {
              undo();
            }
            break;
          case 'c':
            e.preventDefault();
            duplicateSelected();
            break;
          case 's':
            e.preventDefault();
            saveLayoutMutation.mutate(items);
            break;
        }
      } else {
        switch (e.key) {
          case 'Delete':
          case 'Backspace':
            e.preventDefault();
            deleteSelected();
            break;
          case 'r':
            e.preventDefault();
            rotateSelected();
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [undo, redo, duplicateSelected, deleteSelected, rotateSelected, items, saveLayoutMutation]);

  const selectedItem = selectedItems.length === 1 ? items.find(item => item.id === selectedItems[0]) : null;

  return (
    <div className="flex h-full bg-gray-50">
      {/* Toolbar */}
      <div className="w-64 bg-white border-r border-gray-200 p-4 space-y-4">
        <div>
          <h3 className="font-semibold mb-2">Tools</h3>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={tool === 'select' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTool('select')}
            >
              <Move className="h-4 w-4 mr-1" />
              Select
            </Button>
            <Button
              variant={tool === 'add' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTool('add')}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
        </div>

        {tool === 'add' && (
          <div>
            <h3 className="font-semibold mb-2">Add Items</h3>
            <Tabs value={selectedTemplate.type} onValueChange={(value) => 
              setSelectedTemplate({ type: value as keyof typeof ITEM_TEMPLATES, shape: 'rectangle' })
            }>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="table">Tables</TabsTrigger>
                <TabsTrigger value="chair">Chairs</TabsTrigger>
                <TabsTrigger value="wall">Walls</TabsTrigger>
              </TabsList>
              
              <TabsContent value="table" className="space-y-2">
                <div className="grid grid-cols-3 gap-1">
                  {Object.keys(ITEM_TEMPLATES.table).map(shape => (
                    <Button
                      key={shape}
                      variant={selectedTemplate.shape === shape ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedTemplate({ type: 'table', shape })}
                    >
                      {shape === 'rectangle' ? <Square className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                    </Button>
                  ))}
                </div>
              </TabsContent>
              
              <TabsContent value="chair">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setSelectedTemplate({ type: 'chair', shape: 'rectangle' })}
                >
                  <Square className="h-4 w-4 mr-1" />
                  Chair
                </Button>
              </TabsContent>
              
              <TabsContent value="wall">
                <div className="space-y-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setSelectedTemplate({ type: 'wall', shape: 'rectangle' })}
                  >
                    Wall
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setSelectedTemplate({ type: 'door', shape: 'rectangle' })}
                  >
                    Door
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setSelectedTemplate({ type: 'window', shape: 'rectangle' })}
                  >
                    Window
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}

        <div>
          <h3 className="font-semibold mb-2">Actions</h3>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" onClick={undo} disabled={historyIndex <= 0}>
              <Undo className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={redo} disabled={historyIndex >= history.length - 1}>
              <Redo className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={duplicateSelected} disabled={selectedItems.length === 0}>
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={deleteSelected} disabled={selectedItems.length === 0}>
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={rotateSelected} disabled={selectedItems.length === 0}>
              <RotateCw className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsPropertiesOpen(true)}
              disabled={selectedItems.length === 0}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-2">View</h3>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm">{Math.round(zoom * 100)}%</span>
              <Button variant="outline" size="sm" onClick={() => setZoom(Math.min(2, zoom + 0.1))}>
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setShowGrid(!showGrid)}
            >
              {showGrid ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
              Grid
            </Button>
          </div>
        </div>

        <div>
          <Button
            onClick={() => saveLayoutMutation.mutate(items)}
            disabled={saveLayoutMutation.isPending}
            className="w-full"
          >
            <Save className="h-4 w-4 mr-2" />
            {saveLayoutMutation.isPending ? 'Saving...' : 'Save Layout'}
          </Button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative overflow-hidden">
        <div
          ref={canvasRef}
          className="w-full h-full cursor-crosshair relative"
          onClick={handleCanvasClick}
          style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
        >
          {/* Grid */}
          {showGrid && (
            <div className="absolute inset-0 pointer-events-none">
              <svg width="100%" height="100%" className="absolute inset-0">
                <defs>
                  <pattern
                    id="grid"
                    width={gridSize}
                    height={gridSize}
                    patternUnits="userSpaceOnUse"
                  >
                    <path
                      d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`}
                      fill="none"
                      stroke="#e5e7eb"
                      strokeWidth="1"
                    />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>
            </div>
          )}

          {/* Floor plan items */}
          {items.map((item, index) => (
            <div
              key={item.id}
              className={cn(
                "absolute border-2 transition-all duration-300 cursor-move group",
                "hover:scale-105 hover:shadow-md",
                selectedItems.includes(item.id) 
                  ? "border-blue-500 shadow-xl z-10 animate-pulse-ring" 
                  : "border-gray-300 hover:border-blue-400"
              )}
              style={{
                left: item.x,
                top: item.y,
                width: item.width,
                height: item.height,
                backgroundColor: item.color,
                transform: `rotate(${item.rotation}deg)`,
                borderRadius: item.shape === 'circle' ? '50%' : '0',
                animationDelay: `${index * 0.1}s`,
                filter: selectedItems.includes(item.id) ? 'brightness(1.1)' : 'brightness(1)',
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                if (!selectedItems.includes(item.id)) {
                  setSelectedItems([item.id]);
                }
                setIsDragging(true);
                
                const startX = e.clientX;
                const startY = e.clientY;
                
                const handleMouseMove = (e: MouseEvent) => {
                  const deltaX = (e.clientX - startX) / zoom;
                  const deltaY = (e.clientY - startY) / zoom;
                  handleItemDrag(item.id, deltaX, deltaY);
                };
                
                const handleMouseUp = () => {
                  setIsDragging(false);
                  addToHistory(items);
                  document.removeEventListener('mousemove', handleMouseMove);
                  document.removeEventListener('mouseup', handleMouseUp);
                };
                
                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
              }}
            >
              {/* Item label */}
              {item.label && (
                <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-white mix-blend-difference pointer-events-none">
                  {item.label}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Properties Dialog */}
      <Dialog open={isPropertiesOpen} onOpenChange={setIsPropertiesOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Item Properties</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="label">Label</Label>
                <Input
                  id="label"
                  value={selectedItem.label || ''}
                  onChange={(e) => updateSelectedProperties({ label: e.target.value })}
                />
              </div>

              {selectedItem.type === 'table' && (
                <>
                  <div>
                    <Label htmlFor="tableNumber">Table Number</Label>
                    <Input
                      id="tableNumber"
                      value={selectedItem.tableNumber || ''}
                      onChange={(e) => updateSelectedProperties({ tableNumber: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="capacity">Capacity</Label>
                    <Input
                      id="capacity"
                      type="number"
                      value={selectedItem.capacity || 4}
                      onChange={(e) => updateSelectedProperties({ capacity: parseInt(e.target.value) })}
                    />
                  </div>
                </>
              )}

              <div>
                <Label>Color</Label>
                <div className="grid grid-cols-8 gap-1 mt-1">
                  {COLORS.map(color => (
                    <button
                      key={color}
                      className={cn(
                        "w-6 h-6 rounded border-2",
                        selectedItem.color === color ? "border-gray-900" : "border-gray-300"
                      )}
                      style={{ backgroundColor: color }}
                      onClick={() => updateSelectedProperties({ color })}
                    />
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="width">Width</Label>
                  <Input
                    id="width"
                    type="number"
                    value={selectedItem.width}
                    onChange={(e) => updateSelectedProperties({ width: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor="height">Height</Label>
                  <Input
                    id="height"
                    type="number"
                    value={selectedItem.height}
                    onChange={(e) => updateSelectedProperties({ height: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="rotation">Rotation: {selectedItem.rotation}°</Label>
                <Slider
                  id="rotation"
                  min={0}
                  max={360}
                  step={15}
                  value={[selectedItem.rotation]}
                  onValueChange={([value]) => updateSelectedProperties({ rotation: value })}
                  className="mt-2"
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}