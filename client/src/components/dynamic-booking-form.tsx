import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth.tsx";
import { useBooking } from "@/contexts/booking-context";
import { useDate } from "@/contexts/date-context";

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

interface DynamicBookingFormProps {
  formData: Record<string, any>;
  onFormDataChange: (data: Record<string, any>) => void;
  tables?: any[];
  combinedTables?: any[];
  onSubmit: (e: React.FormEvent) => void;
  isLoading?: boolean;
  submitButtonText?: string;
  showCancel?: boolean;
  onCancel?: () => void;
}

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

export default function DynamicBookingForm({
  formData,
  onFormDataChange,
  tables = [],
  combinedTables = [],
  onSubmit,
  isLoading = false,
  submitButtonText = "Create Booking",
  showCancel = true,
  onCancel
}: DynamicBookingFormProps) {
  const { restaurant } = useAuth();
  const { 
    defaultBookingDuration, 
    getDefaultEndTime, 
    getEffectiveEndTime,
    validateBookingDate, 
    getMaxBookingDate,
    turnaroundTime,
    useEndingTime,
    emptySeats,
    contactMethod,
    allowCancellationAndChanges,
    groupRequest
  } = useBooking();
  const { formatTime } = useDate();
  const [fields, setFields] = useState<FormField[]>(defaultFields);

  // Fetch form configuration
  const { data: formConfig, isLoading: configLoading } = useQuery({
    queryKey: [`/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/booking-form-fields`],
    enabled: !!restaurant?.id && !!restaurant?.tenantId,
  });

  // Fetch custom fields
  const { data: customFields = [] } = useQuery({
    queryKey: [`/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/custom-fields`],
    enabled: !!restaurant?.id && !!restaurant?.tenantId,
  });

  useEffect(() => {
    if (formConfig && formConfig.fields && Array.isArray(formConfig.fields)) {
      setFields(formConfig.fields);
    }
  }, [formConfig]);

  const handleInputChange = (fieldId: string, value: any) => {
    let updatedData = {
      ...formData,
      [fieldId]: value
    };

    // Auto-calculate end time when start time changes
    if (fieldId === "startTime" && value) {
      const bookingDate = formData.bookingDate || new Date().toISOString().split('T')[0];
      const startDateTime = new Date(`${bookingDate}T${value}`);
      
      // Use effective end time that includes turnaround time if configured
      const endDateTime = useEndingTime 
        ? getEffectiveEndTime(startDateTime, false, defaultBookingDuration)
        : getDefaultEndTime(startDateTime);
        
      const endTimeString = endDateTime.toTimeString().slice(0, 5);
      updatedData.endTime = endTimeString;
    }

    // Handle custom duration changes
    if (fieldId === "customDuration" && value && formData.startTime) {
      const bookingDate = formData.bookingDate || new Date().toISOString().split('T')[0];
      const startDateTime = new Date(`${bookingDate}T${formData.startTime}`);
      const endDateTime = getEffectiveEndTime(startDateTime, true, parseInt(value));
      const endTimeString = endDateTime.toTimeString().slice(0, 5);
      updatedData.endTime = endTimeString;
    }

    // Validate booking date
    if (fieldId === "bookingDate" && value) {
      const selectedDate = new Date(value);
      const validation = validateBookingDate(selectedDate);
      if (!validation.valid) {
        // You could add error handling here
        console.warn("Invalid booking date:", validation.message);
      }
    }

    onFormDataChange(updatedData);
  };

  const renderField = (field: FormField) => {
    const widthClass = {
      full: "col-span-2",
      half: "col-span-1",
      third: "col-span-2 md:col-span-1",
      quarter: "col-span-1"
    }[field.width];

    const fieldValue = formData[field.fieldId] || "";

    switch (field.inputType) {
      case "textarea":
        return (
          <div key={field.id} className={widthClass}>
            <Label htmlFor={field.fieldId}>
              {field.label} {field.isRequired && <span className="text-red-500">*</span>}
            </Label>
            <Textarea
              id={field.fieldId}
              placeholder={field.placeholder}
              value={fieldValue}
              onChange={(e) => handleInputChange(field.fieldId, e.target.value)}
              required={field.isRequired}
              className="mt-1"
            />
          </div>
        );
      
      case "select":
        if (field.fieldId === "availableTables") {
          return (
            <div key={field.id} className={widthClass}>
              <Label htmlFor={field.fieldId}>
                {field.label} {field.isRequired && <span className="text-red-500">*</span>}
              </Label>
              <Select 
                value={fieldValue} 
                onValueChange={(value) => handleInputChange(field.fieldId, value)}
                required={field.isRequired}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={field.placeholder} />
                </SelectTrigger>
                <SelectContent>
                  {tables && tables.length > 0 ? (
                    tables
                      .filter((table) => {
                        // Filter tables based on guest count and empty seats setting
                        const guestCount = parseInt(formData.guestCount) || 1;
                        const requiredCapacity = guestCount + emptySeats;
                        return table.capacity >= requiredCapacity;
                      })
                      .map((table) => (
                        <SelectItem key={`table-${table.id}`} value={table.id.toString()}>
                          Table {table.tableNumber} ({table.capacity} seats)
                          {emptySeats > 0 && ` - ${table.capacity - (parseInt(formData.guestCount) || 1)} empty`}
                        </SelectItem>
                      ))
                  ) : null}
                  {combinedTables && combinedTables.length > 0 ? (
                    combinedTables.map((combinedTable) => (
                      <SelectItem key={`combined-${combinedTable.id}`} value={`combined-${combinedTable.id}`}>
                        Combined Table {combinedTable.name} ({combinedTable.totalCapacity} seats)
                      </SelectItem>
                    ))
                  ) : null}
                </SelectContent>
              </Select>
              {tables && tables.length === 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  No tables configured. Tables will be auto-assigned if available.
                </p>
              )}
            </div>
          );
        } else {
          // Custom select field
          const options = field.options ? field.options.split('\n').filter(opt => opt.trim()) : [];
          return (
            <div key={field.id} className={widthClass}>
              <Label htmlFor={field.fieldId}>
                {field.label} {field.isRequired && <span className="text-red-500">*</span>}
              </Label>
              <Select 
                value={fieldValue} 
                onValueChange={(value) => handleInputChange(field.fieldId, value)}
                required={field.isRequired}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={field.placeholder} />
                </SelectTrigger>
                <SelectContent>
                  {options.map((option, index) => (
                    <SelectItem key={index} value={option.trim()}>
                      {option.trim()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        }
      
      case "checkbox":
        return (
          <div key={field.id} className={`${widthClass} flex items-center space-x-2 mt-6`}>
            <Checkbox
              id={field.fieldId}
              checked={!!fieldValue}
              onCheckedChange={(checked) => handleInputChange(field.fieldId, checked)}
              required={field.isRequired}
            />
            <Label htmlFor={field.fieldId}>
              {field.label} {field.isRequired && <span className="text-red-500">*</span>}
            </Label>
          </div>
        );
      
      case "switch":
        return (
          <div key={field.id} className={`${widthClass} flex items-center justify-between mt-6`}>
            <Label htmlFor={field.fieldId}>
              {field.label} {field.isRequired && <span className="text-red-500">*</span>}
            </Label>
            <Switch
              id={field.fieldId}
              checked={!!fieldValue}
              onCheckedChange={(checked) => handleInputChange(field.fieldId, checked)}
            />
          </div>
        );
      
      case "number":
        return (
          <div key={field.id} className={widthClass}>
            <Label htmlFor={field.fieldId}>
              {field.label} {field.isRequired && <span className="text-red-500">*</span>}
            </Label>
            <Input
              id={field.fieldId}
              type="number"
              placeholder={field.placeholder}
              value={fieldValue}
              onChange={(e) => handleInputChange(field.fieldId, parseInt(e.target.value) || 0)}
              required={field.isRequired}
              className="mt-1"
            />
          </div>
        );
      
      default:
        return (
          <div key={field.id} className={widthClass}>
            <Label htmlFor={field.fieldId}>
              {field.label} {field.isRequired && <span className="text-red-500">*</span>}
            </Label>
            <Input
              id={field.fieldId}
              type={field.inputType}
              placeholder={field.placeholder}
              value={fieldValue}
              onChange={(e) => handleInputChange(field.fieldId, e.target.value)}
              required={field.isRequired}
              className="mt-1"
            />
          </div>
        );
    }
  };

  const activeFields = fields
    .filter(field => field.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  // Contact method validation
  const validateContactInfo = () => {
    const phone = formData.phoneNumber;
    const email = formData.email;
    
    if (contactMethod === 'phone' && !phone) {
      return { valid: false, message: "Phone number is required" };
    }
    if (contactMethod === 'email' && !email) {
      return { valid: false, message: "Email address is required" };
    }
    if (contactMethod === 'both' && (!phone || !email)) {
      return { valid: false, message: "Both phone number and email are required" };
    }
    return { valid: true };
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate contact information based on settings
    const contactValidation = validateContactInfo();
    if (!contactValidation.valid) {
      console.warn("Contact validation failed:", contactValidation.message);
      return;
    }
    
    onSubmit(e);
  };

  return (
    <form onSubmit={handleFormSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {activeFields.map(renderField)}
      </div>

      {/* Group Request Notice */}
      {groupRequest && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Group Bookings Available:</strong> For large parties or special events, 
            please contact us directly for customized arrangements.
          </p>
        </div>
      )}

      {/* Contact Method Requirements */}
      <div className="mt-4 text-xs text-gray-600">
        {contactMethod === 'phone' && "Phone number required for booking confirmation"}
        {contactMethod === 'email' && "Email address required for booking confirmation"}
        {contactMethod === 'both' && "Phone number and email required for booking confirmation"}
      </div>
      
      <div className="flex justify-end space-x-2 pt-4">
        {showCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={isLoading}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          {isLoading ? "Loading..." : submitButtonText}
        </Button>
      </div>
    </form>
  );
}