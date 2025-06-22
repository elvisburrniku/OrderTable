import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth.tsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  DndContext, 
  DragEndEvent, 
  DragOverlay, 
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Plus,
  Settings,
  Type,
  Hash,
  ToggleLeft,
  CheckSquare,
  List,
  Mail,
  Phone,
  Users,
  Clock,
  Calendar,
  StickyNote,
  Grip,
  Trash2,
  Edit,
  Eye,
  EyeOff
} from "lucide-react";
import { motion } from "framer-motion";
import { useScrollToTop } from "@/hooks/use-scroll-to-top";

interface FormField {
  id: string;
  fieldType: "default" | "custom";
  fieldId: string;
  customFieldId?: number;
  label: string;
  inputType: string;
  isRequired: boolean;
  isActive: boolean;
  sortOrder: number;
  placeholder?: string;
  options?: string;
  validation?: string;
  width: "full" | "half" | "third" | "quarter";
}

interface CustomField {
  id: number;
  name: string;
  title: string;
  inputType: string;
  options?: string;
  isRequired: boolean;
  placeholder?: string;
}

const fieldTypes = [
  { id: "text", label: "Text Input", icon: Type, inputType: "text" },
  { id: "number", label: "Number", icon: Hash, inputType: "number" },
  { id: "email", label: "Email", icon: Mail, inputType: "email" },
  { id: "tel", label: "Phone", icon: Phone, inputType: "tel" },
  { id: "select", label: "Select Dropdown", icon: List, inputType: "select" },
  { id: "checkbox", label: "Checkbox", icon: CheckSquare, inputType: "checkbox" },
  { id: "switch", label: "Switch Toggle", icon: ToggleLeft, inputType: "switch" },
  { id: "textarea", label: "Text Area", icon: StickyNote, inputType: "textarea" }
];

const defaultFields: FormField[] = [
  {
    id: "customerName",
    fieldType: "default",
    fieldId: "customerName",
    label: "Customer Name",
    inputType: "text",
    isRequired: true,
    isActive: true,
    sortOrder: 1,
    placeholder: "Enter customer name",
    width: "full"
  },
  {
    id: "customerEmail",
    fieldType: "default",
    fieldId: "customerEmail",
    label: "Email",
    inputType: "email",
    isRequired: true,
    isActive: true,
    sortOrder: 2,
    placeholder: "customer@example.com",
    width: "full"
  },
  {
    id: "customerPhone",
    fieldType: "default",
    fieldId: "customerPhone",
    label: "Phone",
    inputType: "tel",
    isRequired: false,
    isActive: true,
    sortOrder: 3,
    placeholder: "+1 (555) 123-4567",
    width: "full"
  },
  {
    id: "guestCount",
    fieldType: "default",
    fieldId: "guestCount",
    label: "Guest Count",
    inputType: "number",
    isRequired: true,
    isActive: true,
    sortOrder: 4,
    placeholder: "2",
    width: "full"
  },
  {
    id: "startTime",
    fieldType: "default",
    fieldId: "startTime",
    label: "Start Time",
    inputType: "time",
    isRequired: true,
    isActive: true,
    sortOrder: 5,
    placeholder: "10:30 AM",
    width: "half"
  },
  {
    id: "endTime",
    fieldType: "default",
    fieldId: "endTime",
    label: "End Time",
    inputType: "time",
    isRequired: false,
    isActive: true,
    sortOrder: 6,
    placeholder: "11:30 AM",
    width: "half"
  },
  {
    id: "availableTables",
    fieldType: "default",
    fieldId: "availableTables",
    label: "Available Tables",
    inputType: "select",
    isRequired: true,
    isActive: true,
    sortOrder: 7,
    placeholder: "Select an available table",
    width: "full"
  },
  {
    id: "notes",
    fieldType: "default",
    fieldId: "notes",
    label: "Notes",
    inputType: "textarea",
    isRequired: false,
    isActive: true,
    sortOrder: 8,
    placeholder: "Special requests or notes...",
    width: "full"
  }
];

function SortableFieldItem({ field, onEdit, onToggle, onDelete }: {
  field: FormField;
  onEdit: (field: FormField) => void;
  onToggle: (fieldId: string, isActive: boolean) => void;
  onDelete: (fieldId: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getFieldIcon = (inputType: string) => {
    switch (inputType) {
      case "text": return Type;
      case "number": return Hash;
      case "email": return Mail;
      case "tel": return Phone;
      case "select": return List;
      case "checkbox": return CheckSquare;
      case "switch": return ToggleLeft;
      case "textarea": return StickyNote;
      case "time": return Clock;
      default: return Type;
    }
  };

  const Icon = getFieldIcon(field.inputType);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white border-2 border-gray-200 rounded-lg p-4 flex items-center justify-between transition-all duration-200 ${
        field.isActive ? 'opacity-100' : 'opacity-60'
      } ${isDragging ? 'shadow-lg' : 'hover:shadow-md'}`}
    >
      <div className="flex items-center space-x-4">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
        >
          <Grip className="w-5 h-5" />
        </div>
        
        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
          <Icon className="w-4 h-4 text-blue-600" />
        </div>
        
        <div>
          <div className="font-medium text-gray-900">{field.label}</div>
          <div className="text-sm text-gray-500 flex items-center space-x-2">
            <span>Type: {field.inputType}</span>
            {field.isRequired && (
              <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded text-xs font-medium">
                Required
              </span>
            )}
            {field.fieldType === "custom" && (
              <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded text-xs font-medium">
                Custom
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          checked={field.isActive}
          onCheckedChange={(checked) => onToggle(field.id, checked)}
          className="data-[state=checked]:bg-green-600"
        />
        
        {field.fieldType !== "default" && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(field)}
              className="text-blue-600 border-blue-600 hover:bg-blue-50 h-8 w-8 p-0"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(field.id)}
              className="text-red-600 border-red-600 hover:bg-red-50 h-8 w-8 p-0"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function DraggableFieldType({ fieldType }: { fieldType: typeof fieldTypes[0] }) {
  const Icon = fieldType.icon;
  
  return (
    <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-4 cursor-grab active:cursor-grabbing hover:border-blue-400 hover:bg-blue-50 transition-all duration-200">
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
          <Icon className="w-4 h-4 text-gray-600" />
        </div>
        <div>
          <div className="font-medium text-gray-900">{fieldType.label}</div>
          <div className="text-sm text-gray-500">{fieldType.inputType}</div>
        </div>
      </div>
    </div>
  );
}

function BookingFormPreview({ fields }: { fields: FormField[] }) {
  const activeFields = fields
    .filter(field => field.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const renderField = (field: FormField) => {
    const widthClass = {
      full: "col-span-2",
      half: "col-span-1",
      third: "col-span-2 md:col-span-1",
      quarter: "col-span-1"
    }[field.width];

    switch (field.inputType) {
      case "textarea":
        return (
          <div key={field.id} className={widthClass}>
            <Label>{field.label} {field.isRequired && <span className="text-red-500">*</span>}</Label>
            <Textarea placeholder={field.placeholder} className="mt-1" />
          </div>
        );
      
      case "select":
        return (
          <div key={field.id} className={widthClass}>
            <Label>{field.label} {field.isRequired && <span className="text-red-500">*</span>}</Label>
            <Select>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder={field.placeholder} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="option1">Option 1</SelectItem>
                <SelectItem value="option2">Option 2</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );
      
      case "checkbox":
        return (
          <div key={field.id} className={`${widthClass} flex items-center space-x-2 mt-6`}>
            <input type="checkbox" className="rounded" />
            <Label>{field.label} {field.isRequired && <span className="text-red-500">*</span>}</Label>
          </div>
        );
      
      case "switch":
        return (
          <div key={field.id} className={`${widthClass} flex items-center justify-between mt-6`}>
            <Label>{field.label} {field.isRequired && <span className="text-red-500">*</span>}</Label>
            <Switch />
          </div>
        );
      
      default:
        return (
          <div key={field.id} className={widthClass}>
            <Label>{field.label} {field.isRequired && <span className="text-red-500">*</span>}</Label>
            <Input 
              type={field.inputType} 
              placeholder={field.placeholder} 
              className="mt-1"
            />
          </div>
        );
    }
  };

  return (
    <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Create New Booking</h3>
        <p className="text-sm text-gray-600">Preview of your booking form</p>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        {activeFields.map(renderField)}
      </div>
      
      <div className="flex justify-end space-x-2 mt-6 pt-4 border-t">
        <Button variant="outline">Cancel</Button>
        <Button className="bg-green-600 hover:bg-green-700 text-white">
          Create Booking
        </Button>
      </div>
    </div>
  );
}

export default function CustomFields() {
  const { user, restaurant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  useScrollToTop();

  const [fields, setFields] = useState<FormField[]>(defaultFields);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isCustomFieldDialogOpen, setIsCustomFieldDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<FormField | null>(null);
  const [newCustomField, setNewCustomField] = useState({
    name: "",
    title: "",
    inputType: "text",
    placeholder: "",
    isRequired: false,
    options: ""
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Fetch existing form configuration
  const { data: formConfig, isLoading } = useQuery({
    queryKey: [`/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/booking-form-fields`],
    enabled: !!restaurant?.id && !!restaurant?.tenantId,
  });

  // Fetch custom fields
  const { data: customFields = [] } = useQuery({
    queryKey: [`/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/custom-fields`],
    enabled: !!restaurant?.id && !!restaurant?.tenantId,
  });

  // Save form configuration mutation
  const saveFormConfigMutation = useMutation({
    mutationFn: async (fieldsData: FormField[]) => {
      return apiRequest("POST", `/api/tenants/${restaurant.tenantId}/restaurants/${restaurant.id}/booking-form-fields`, {
        fields: fieldsData
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Form configuration saved successfully",
      });
      queryClient.invalidateQueries({ 
        queryKey: [`/api/tenants/${restaurant.tenantId}/restaurants/${restaurant.id}/booking-form-fields`] 
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save form configuration",
        variant: "destructive",
      });
    },
  });

  // Create custom field mutation
  const createCustomFieldMutation = useMutation({
    mutationFn: async (fieldData: any) => {
      return apiRequest("POST", `/api/tenants/${restaurant.tenantId}/restaurants/${restaurant.id}/custom-fields`, fieldData);
    },
    onSuccess: (newField) => {
      toast({
        title: "Success",
        description: "Custom field created successfully",
      });
      queryClient.invalidateQueries({ 
        queryKey: [`/api/tenants/${restaurant.tenantId}/restaurants/${restaurant.id}/custom-fields`] 
      });
      
      // Add the new field to the form
      const newFormField: FormField = {
        id: `custom_${newField.id}`,
        fieldType: "custom",
        fieldId: `custom_${newField.id}`,
        customFieldId: newField.id,
        label: newField.title,
        inputType: newField.inputType,
        isRequired: newField.isRequired || false,
        isActive: true,
        sortOrder: fields.length + 1,
        placeholder: newField.placeholder,
        options: newField.options,
        width: "full"
      };
      
      setFields(prev => [...prev, newFormField]);
      setIsCustomFieldDialogOpen(false);
      resetCustomFieldForm();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create custom field",
        variant: "destructive",
      });
    },
  });

  const resetCustomFieldForm = () => {
    setNewCustomField({
      name: "",
      title: "",
      inputType: "text",
      placeholder: "",
      isRequired: false,
      options: ""
    });
    setEditingField(null);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    if (active.id !== over.id) {
      setFields((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        
        const newItems = arrayMove(items, oldIndex, newIndex);
        // Update sort orders
        return newItems.map((item, index) => ({
          ...item,
          sortOrder: index + 1
        }));
      });
    }
  };

  const handleFieldToggle = (fieldId: string, isActive: boolean) => {
    setFields(prev => prev.map(field => 
      field.id === fieldId ? { ...field, isActive } : field
    ));
  };

  const handleFieldDelete = (fieldId: string) => {
    if (confirm("Are you sure you want to remove this field from the form?")) {
      setFields(prev => prev.filter(field => field.id !== fieldId));
    }
  };

  const handleFieldEdit = (field: FormField) => {
    setEditingField(field);
    // Open appropriate edit dialog based on field type
  };

  const handleAddCustomField = (fieldType: typeof fieldTypes[0]) => {
    setNewCustomField(prev => ({
      ...prev,
      inputType: fieldType.inputType,
      name: fieldType.label.toLowerCase().replace(/\s+/g, '_'),
      title: fieldType.label
    }));
    setIsCustomFieldDialogOpen(true);
  };

  const handleSaveConfiguration = () => {
    saveFormConfigMutation.mutate(fields);
  };

  const handleCreateCustomField = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomField.name.trim() || !newCustomField.title.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    createCustomFieldMutation.mutate(newCustomField);
  };

  if (!user || !restaurant) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6">
        <div className="bg-white rounded-lg shadow">
          {/* Header */}
          <div className="p-6 border-b">
            <motion.h1 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-2xl font-bold text-gray-900 flex items-center gap-2"
            >
              <Settings className="h-6 w-6 text-green-600" />
              Custom Fields & Form Builder
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-sm text-gray-600 mt-2"
            >
              Customize your booking form by adding, removing, and reordering fields. Default fields cannot be removed but can be reordered.
            </motion.p>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Panel - Available Fields */}
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Available Field Types</h2>
                  <div className="space-y-3">
                    {fieldTypes.map((fieldType) => (
                      <div 
                        key={fieldType.id}
                        onClick={() => handleAddCustomField(fieldType)}
                        className="cursor-pointer"
                      >
                        <DraggableFieldType fieldType={fieldType} />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <Button
                    onClick={() => setIsCustomFieldDialogOpen(true)}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Custom Field
                  </Button>
                </div>
              </motion.div>

              {/* Center Panel - Form Fields */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Form Fields</h2>
                  <Button
                    onClick={handleSaveConfiguration}
                    disabled={saveFormConfigMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {saveFormConfigMutation.isPending ? "Saving..." : "Save Configuration"}
                  </Button>
                </div>

                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext items={fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-3">
                      {fields.map((field) => (
                        <SortableFieldItem
                          key={field.id}
                          field={field}
                          onEdit={handleFieldEdit}
                          onToggle={handleFieldToggle}
                          onDelete={handleFieldDelete}
                        />
                      ))}
                    </div>
                  </SortableContext>
                  
                  <DragOverlay>
                    {activeId ? (
                      <div className="bg-white border-2 border-blue-400 rounded-lg p-4 shadow-lg">
                        <div className="font-medium text-gray-900">
                          {fields.find(f => f.id === activeId)?.label}
                        </div>
                      </div>
                    ) : null}
                  </DragOverlay>
                </DndContext>
              </motion.div>

              {/* Right Panel - Form Preview */}
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
                className="space-y-6"
              >
                <h2 className="text-lg font-semibold text-gray-900">Form Preview</h2>
                <BookingFormPreview fields={fields} />
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Field Creation Dialog */}
      <Dialog open={isCustomFieldDialogOpen} onOpenChange={setIsCustomFieldDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Custom Field</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateCustomField} className="space-y-4">
            <div>
              <Label htmlFor="fieldName">Field Name (Internal)</Label>
              <Input
                id="fieldName"
                value={newCustomField.name}
                onChange={(e) => setNewCustomField(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., dietary_requirements"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="fieldTitle">Field Title (Display)</Label>
              <Input
                id="fieldTitle"
                value={newCustomField.title}
                onChange={(e) => setNewCustomField(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Dietary Requirements"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="inputType">Input Type</Label>
              <Select value={newCustomField.inputType} onValueChange={(value) =>
                setNewCustomField(prev => ({ ...prev, inputType: value }))
              }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fieldTypes.map(type => (
                    <SelectItem key={type.id} value={type.inputType}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="placeholder">Placeholder Text</Label>
              <Input
                id="placeholder"
                value={newCustomField.placeholder}
                onChange={(e) => setNewCustomField(prev => ({ ...prev, placeholder: e.target.value }))}
                placeholder="Enter placeholder text..."
              />
            </div>
            
            {newCustomField.inputType === "select" && (
              <div>
                <Label htmlFor="options">Options (one per line)</Label>
                <Textarea
                  id="options"
                  value={newCustomField.options}
                  onChange={(e) => setNewCustomField(prev => ({ ...prev, options: e.target.value }))}
                  placeholder="Option 1&#10;Option 2&#10;Option 3"
                  rows={4}
                />
              </div>
            )}
            
            <div className="flex items-center space-x-2">
              <Switch
                checked={newCustomField.isRequired}
                onCheckedChange={(checked) => setNewCustomField(prev => ({ ...prev, isRequired: checked }))}
              />
              <Label>Required Field</Label>
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCustomFieldDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createCustomFieldMutation.isPending}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {createCustomFieldMutation.isPending ? "Creating..." : "Create Field"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}