import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/auth';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { 
  Square, 
  Circle, 
  RotateCw, 
  Trash2, 
  Plus, 
  Save, 
  Undo, 
  Redo,
  Move,
  Copy,
  Grid3X3,
  ZoomIn,
  ZoomOut,
  Download,
  Upload
} from 'lucide-react';

interface FloorPlanElement {
  id: string;
  type: 'table' | 'chair' | 'wall' | 'door' | 'window' | 'decoration';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  properties: {
    tableNumber?: string;
    capacity?: number;
    shape?: 'rectangle' | 'circle' | 'square';
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

const ELEMENT_TEMPLATES = {
  table: {
    rectangle: { width: 80, height: 40, shape: 'rectangle' },
    square: { width: 60, height: 60, shape: 'square' },
    circle: { width: 60, height: 60, shape: 'circle' },
  },
  chair: { width: 20, height: 20, shape: 'square' },
  wall: { width: 100, height: 10, shape: 'rectangle' },
  door: { width: 30, height: 10, shape: 'rectangle' },
  window: { width: 60, height: 10, shape: 'rectangle' },
  decoration: { width: 40, height: 40, shape: 'square' },
};

export function FloorPlanDesigner() {
  const { restaurant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [floorPlan, setFloorPlan] = useState<FloorPlan>({
    name: 'New Floor Plan',
    elements: [],
    dimensions: { width: 800, height: 600 },
    gridSize: 20,
    scale: 1,
  });

  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [selectedTool, setSelectedTool] = useState<string>('select');
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [history, setHistory] = useState<FloorPlan[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Load existing floor plans
  const { data: existingPlans } = useQuery({
    queryKey: [`/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/floor-plans`],
    enabled: !!restaurant?.id && !!restaurant?.tenantId,
  });

  // Save floor plan mutation
  const saveFloorPlan = useMutation({
    mutationFn: async (plan: FloorPlan) => {
      const endpoint = plan.id
        ? `/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/floor-plans/${plan.id}`
        : `/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/floor-plans`;
      
      return apiRequest(endpoint, {
        method: plan.id ? 'PUT' : 'POST',
        body: JSON.stringify(plan),
      });
    },
    onSuccess: () => {
      toast({ title: 'Floor plan saved successfully' });
      queryClient.invalidateQueries({
        queryKey: [`/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/floor-plans`],
      });
    },
    onError: () => {
      toast({ title: 'Failed to save floor plan', variant: 'destructive' });
    },
  });

  // Canvas drawing functions
  const drawGrid = useCallback((ctx: CanvasRenderingContext2D) => {
    if (!showGrid) return;
    
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 0.5;
    
    const { width, height } = floorPlan.dimensions;
    const gridSize = floorPlan.gridSize * floorPlan.scale;
    
    for (let x = 0; x <= width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    
    for (let y = 0; y <= height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }, [showGrid, floorPlan]);

  const drawElement = useCallback((ctx: CanvasRenderingContext2D, element: FloorPlanElement) => {
    ctx.save();
    
    const centerX = element.x + element.width / 2;
    const centerY = element.y + element.height / 2;
    
    ctx.translate(centerX, centerY);
    ctx.rotate((element.rotation * Math.PI) / 180);
    ctx.translate(-element.width / 2, -element.height / 2);
    
    // Set colors based on element type
    let fillColor = element.properties.color || '#f0f0f0';
    let strokeColor = '#333';
    
    if (element.type === 'table') {
      fillColor = element.properties.color || '#8B4513';
      strokeColor = '#654321';
    } else if (element.type === 'chair') {
      fillColor = '#4169E1';
      strokeColor = '#191970';
    } else if (element.type === 'wall') {
      fillColor = '#696969';
      strokeColor = '#2F4F4F';
    }
    
    ctx.fillStyle = fillColor;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = selectedElement === element.id ? 3 : 1;
    
    if (element.properties.shape === 'circle') {
      const radius = Math.min(element.width, element.height) / 2;
      ctx.beginPath();
      ctx.arc(element.width / 2, element.height / 2, radius, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillRect(0, 0, element.width, element.height);
      ctx.strokeRect(0, 0, element.width, element.height);
    }
    
    // Draw labels
    if (element.properties.label || element.properties.tableNumber) {
      ctx.fillStyle = '#000';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const text = element.properties.tableNumber || element.properties.label || '';
      ctx.fillText(text, element.width / 2, element.height / 2);
    }
    
    // Draw selection handles
    if (selectedElement === element.id) {
      ctx.fillStyle = '#007ACC';
      const handleSize = 6;
      // Corner handles
      ctx.fillRect(-handleSize/2, -handleSize/2, handleSize, handleSize);
      ctx.fillRect(element.width - handleSize/2, -handleSize/2, handleSize, handleSize);
      ctx.fillRect(-handleSize/2, element.height - handleSize/2, handleSize, handleSize);
      ctx.fillRect(element.width - handleSize/2, element.height - handleSize/2, handleSize, handleSize);
      
      // Rotation handle
      ctx.beginPath();
      ctx.arc(element.width / 2, -20, handleSize/2, 0, 2 * Math.PI);
      ctx.fill();
    }
    
    ctx.restore();
  }, [selectedElement]);

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    drawGrid(ctx);
    
    // Draw all elements
    floorPlan.elements.forEach(element => {
      drawElement(ctx, element);
    });
  }, [floorPlan, drawGrid, drawElement]);

  // Handle canvas interactions
  const getMousePosition = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / floorPlan.scale,
      y: (e.clientY - rect.top) / floorPlan.scale,
    };
  }, [floorPlan.scale]);

  const snapToGridPosition = useCallback((x: number, y: number) => {
    if (!snapToGrid) return { x, y };
    
    const gridSize = floorPlan.gridSize;
    return {
      x: Math.round(x / gridSize) * gridSize,
      y: Math.round(y / gridSize) * gridSize,
    };
  }, [snapToGrid, floorPlan.gridSize]);

  const findElementAt = useCallback((x: number, y: number) => {
    for (let i = floorPlan.elements.length - 1; i >= 0; i--) {
      const element = floorPlan.elements[i];
      if (
        x >= element.x &&
        x <= element.x + element.width &&
        y >= element.y &&
        y <= element.y + element.height
      ) {
        return element.id;
      }
    }
    return null;
  }, [floorPlan.elements]);

  const addElement = useCallback((type: keyof typeof ELEMENT_TEMPLATES, subtype?: string) => {
    const template = subtype && type === 'table' 
      ? ELEMENT_TEMPLATES.table[subtype as keyof typeof ELEMENT_TEMPLATES.table]
      : ELEMENT_TEMPLATES[type];
    
    const newElement: FloorPlanElement = {
      id: `${type}_${Date.now()}`,
      type,
      x: 100,
      y: 100,
      width: template.width,
      height: template.height,
      rotation: 0,
      properties: {
        shape: template.shape,
        color: '#f0f0f0',
        ...(type === 'table' && {
          tableNumber: `T${floorPlan.elements.filter(e => e.type === 'table').length + 1}`,
          capacity: 4,
        }),
      },
    };
    
    setFloorPlan(prev => ({
      ...prev,
      elements: [...prev.elements, newElement],
    }));
    
    setSelectedElement(newElement.id);
    addToHistory();
  }, [floorPlan.elements]);

  const deleteElement = useCallback((elementId: string) => {
    setFloorPlan(prev => ({
      ...prev,
      elements: prev.elements.filter(e => e.id !== elementId),
    }));
    setSelectedElement(null);
    addToHistory();
  }, []);

  const updateElement = useCallback((elementId: string, updates: Partial<FloorPlanElement>) => {
    setFloorPlan(prev => ({
      ...prev,
      elements: prev.elements.map(e =>
        e.id === elementId ? { ...e, ...updates } : e
      ),
    }));
  }, []);

  const addToHistory = useCallback(() => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push({ ...floorPlan });
      return newHistory.slice(-50); // Keep last 50 states
    });
    setHistoryIndex(prev => prev + 1);
  }, [floorPlan, historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1);
      setFloorPlan(history[historyIndex - 1]);
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(prev => prev + 1);
      setFloorPlan(history[historyIndex + 1]);
    }
  }, [history, historyIndex]);

  // Mouse event handlers
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePosition(e);
    const elementId = findElementAt(pos.x, pos.y);
    
    if (selectedTool === 'select') {
      if (elementId) {
        setSelectedElement(elementId);
        setIsDragging(true);
        const element = floorPlan.elements.find(e => e.id === elementId);
        if (element) {
          setDragOffset({
            x: pos.x - element.x,
            y: pos.y - element.y,
          });
        }
      } else {
        setSelectedElement(null);
      }
    }
  }, [selectedTool, getMousePosition, findElementAt, floorPlan.elements]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !selectedElement) return;
    
    const pos = getMousePosition(e);
    const snappedPos = snapToGridPosition(pos.x - dragOffset.x, pos.y - dragOffset.y);
    
    updateElement(selectedElement, {
      x: snappedPos.x,
      y: snappedPos.y,
    });
  }, [isDragging, selectedElement, getMousePosition, snapToGridPosition, dragOffset, updateElement]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      addToHistory();
    }
  }, [isDragging, addToHistory]);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    canvas.width = floorPlan.dimensions.width * floorPlan.scale;
    canvas.height = floorPlan.dimensions.height * floorPlan.scale;
    
    redrawCanvas();
  }, [floorPlan, redrawCanvas]);

  const selectedElementData = selectedElement 
    ? floorPlan.elements.find(e => e.id === selectedElement)
    : null;

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Toolbar */}
      <div className="w-64 bg-white border-r p-4 overflow-y-auto">
        <h3 className="font-semibold mb-4">Floor Plan Designer</h3>
        
        <Tabs defaultValue="elements" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="elements">Elements</TabsTrigger>
            <TabsTrigger value="properties">Properties</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          
          <TabsContent value="elements" className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Tools</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <Button
                  variant={selectedTool === 'select' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedTool('select')}
                >
                  <Move className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => addElement('table', 'rectangle')}>
                  <Square className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <div>
              <Label className="text-sm font-medium">Tables</Label>
              <div className="grid grid-cols-1 gap-2 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addElement('table', 'rectangle')}
                  className="justify-start"
                >
                  <Square className="w-4 h-4 mr-2" />
                  Rectangle Table
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addElement('table', 'circle')}
                  className="justify-start"
                >
                  <Circle className="w-4 h-4 mr-2" />
                  Round Table
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addElement('table', 'square')}
                  className="justify-start"
                >
                  <Square className="w-4 h-4 mr-2" />
                  Square Table
                </Button>
              </div>
            </div>
            
            <div>
              <Label className="text-sm font-medium">Furniture</Label>
              <div className="grid grid-cols-1 gap-2 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addElement('chair')}
                  className="justify-start"
                >
                  Chair
                </Button>
              </div>
            </div>
            
            <div>
              <Label className="text-sm font-medium">Structure</Label>
              <div className="grid grid-cols-1 gap-2 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addElement('wall')}
                  className="justify-start"
                >
                  Wall
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addElement('door')}
                  className="justify-start"
                >
                  Door
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addElement('window')}
                  className="justify-start"
                >
                  Window
                </Button>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="properties" className="space-y-4">
            {selectedElementData ? (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="element-x">X Position</Label>
                  <Input
                    id="element-x"
                    type="number"
                    value={selectedElementData.x}
                    onChange={(e) => updateElement(selectedElement!, { x: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label htmlFor="element-y">Y Position</Label>
                  <Input
                    id="element-y"
                    type="number"
                    value={selectedElementData.y}
                    onChange={(e) => updateElement(selectedElement!, { y: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label htmlFor="element-width">Width</Label>
                  <Input
                    id="element-width"
                    type="number"
                    value={selectedElementData.width}
                    onChange={(e) => updateElement(selectedElement!, { width: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label htmlFor="element-height">Height</Label>
                  <Input
                    id="element-height"
                    type="number"
                    value={selectedElementData.height}
                    onChange={(e) => updateElement(selectedElement!, { height: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label htmlFor="element-rotation">Rotation (degrees)</Label>
                  <Input
                    id="element-rotation"
                    type="number"
                    value={selectedElementData.rotation}
                    onChange={(e) => updateElement(selectedElement!, { rotation: parseInt(e.target.value) || 0 })}
                  />
                </div>
                
                {selectedElementData.type === 'table' && (
                  <>
                    <div>
                      <Label htmlFor="table-number">Table Number</Label>
                      <Input
                        id="table-number"
                        value={selectedElementData.properties.tableNumber || ''}
                        onChange={(e) => updateElement(selectedElement!, {
                          properties: { ...selectedElementData.properties, tableNumber: e.target.value }
                        })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="table-capacity">Capacity</Label>
                      <Input
                        id="table-capacity"
                        type="number"
                        value={selectedElementData.properties.capacity || 4}
                        onChange={(e) => updateElement(selectedElement!, {
                          properties: { ...selectedElementData.properties, capacity: parseInt(e.target.value) || 4 }
                        })}
                      />
                    </div>
                  </>
                )}
                
                <div>
                  <Label htmlFor="element-color">Color</Label>
                  <Input
                    id="element-color"
                    type="color"
                    value={selectedElementData.properties.color || '#f0f0f0'}
                    onChange={(e) => updateElement(selectedElement!, {
                      properties: { ...selectedElementData.properties, color: e.target.value }
                    })}
                  />
                </div>
                
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteElement(selectedElement!)}
                  className="w-full"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Element
                </Button>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Select an element to edit properties</p>
            )}
          </TabsContent>
          
          <TabsContent value="settings" className="space-y-4">
            <div>
              <Label htmlFor="plan-name">Floor Plan Name</Label>
              <Input
                id="plan-name"
                value={floorPlan.name}
                onChange={(e) => setFloorPlan(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            
            <div>
              <Label htmlFor="grid-size">Grid Size</Label>
              <Input
                id="grid-size"
                type="number"
                value={floorPlan.gridSize}
                onChange={(e) => setFloorPlan(prev => ({ 
                  ...prev, 
                  gridSize: parseInt(e.target.value) || 20 
                }))}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="show-grid"
                checked={showGrid}
                onChange={(e) => setShowGrid(e.target.checked)}
              />
              <Label htmlFor="show-grid">Show Grid</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="snap-to-grid"
                checked={snapToGrid}
                onChange={(e) => setSnapToGrid(e.target.checked)}
              />
              <Label htmlFor="snap-to-grid">Snap to Grid</Label>
            </div>
            
            <div>
              <Label htmlFor="canvas-width">Canvas Width</Label>
              <Input
                id="canvas-width"
                type="number"
                value={floorPlan.dimensions.width}
                onChange={(e) => setFloorPlan(prev => ({
                  ...prev,
                  dimensions: { ...prev.dimensions, width: parseInt(e.target.value) || 800 }
                }))}
              />
            </div>
            
            <div>
              <Label htmlFor="canvas-height">Canvas Height</Label>
              <Input
                id="canvas-height"
                type="number"
                value={floorPlan.dimensions.height}
                onChange={(e) => setFloorPlan(prev => ({
                  ...prev,
                  dimensions: { ...prev.dimensions, height: parseInt(e.target.value) || 600 }
                }))}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Toolbar */}
        <div className="bg-white border-b p-2 flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={undo} disabled={historyIndex <= 0}>
            <Undo className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={redo} disabled={historyIndex >= history.length - 1}>
            <Redo className="w-4 h-4" />
          </Button>
          
          <div className="mx-4 h-4 w-px bg-gray-300" />
          
          <Button variant="outline" size="sm">
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-sm">{Math.round(floorPlan.scale * 100)}%</span>
          <Button variant="outline" size="sm">
            <ZoomIn className="w-4 h-4" />
          </Button>
          
          <div className="mx-4 h-4 w-px bg-gray-300" />
          
          <Button variant="outline" size="sm">
            <Grid3X3 className="w-4 h-4" />
          </Button>
          
          <div className="flex-1" />
          
          <Button 
            onClick={() => saveFloorPlan.mutate(floorPlan)}
            disabled={saveFloorPlan.isPending}
          >
            <Save className="w-4 h-4 mr-2" />
            Save Floor Plan
          </Button>
        </div>
        
        {/* Canvas Container */}
        <div 
          ref={containerRef}
          className="flex-1 overflow-auto bg-gray-100 p-4"
        >
          <div className="bg-white shadow-lg inline-block">
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              className="border cursor-crosshair"
              style={{
                width: floorPlan.dimensions.width * floorPlan.scale,
                height: floorPlan.dimensions.height * floorPlan.scale,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}