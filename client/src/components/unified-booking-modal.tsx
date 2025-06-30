import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Clock, Users, Calendar, MapPin, Phone, Mail, FileText, Tag } from "lucide-react";
import { useAuth } from "@/lib/auth.tsx";
import { useBooking } from "@/contexts/booking-context";
import { useDate } from "@/contexts/date-context";

interface UnifiedBookingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  initialData?: any;
  tables?: any[];
  onSubmit: (data: any) => void;
  isLoading?: boolean;
  submitButtonText?: string;
  mode?: "create" | "edit";
}

export default function UnifiedBookingModal({
  open,
  onOpenChange,
  title = "Create New Booking",
  initialData = {},
  tables = [],
  onSubmit,
  isLoading = false,
  submitButtonText = "Create Booking",
  mode = "create"
}: UnifiedBookingModalProps) {
  const { restaurant } = useAuth();
  const bookingContext = useBooking();
  const { formatDate, formatTime } = useDate();

  const [formData, setFormData] = useState({
    eventType: "General Dining",
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    guestCount: 2,
    bookingDate: "",
    startTime: "12:30",
    duration: 2,
    tableId: "",
    specialRequests: "",
    internalNotes: "",
    extraDescription: "",
    tags: [],
    requirePrePayment: false,
    ...initialData
  });

  const [selectedTags, setSelectedTags] = useState<string[]>(formData.tags || []);

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleTagToggle = (tag: string) => {
    const newTags = selectedTags.includes(tag)
      ? selectedTags.filter(t => t !== tag)
      : [...selectedTags, tag];
    setSelectedTags(newTags);
    handleInputChange('tags', newTags);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Calculate end time based on duration
    const startHour = parseInt(formData.startTime.split(':')[0]);
    const startMinute = parseInt(formData.startTime.split(':')[1]);
    const endHour = startHour + formData.duration;
    const endTime = `${endHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`;
    
    const submissionData = {
      ...formData,
      endTime,
      tags: selectedTags
    };
    
    onSubmit(submissionData);
  };

  const availableTags = [
    "Birthday", "Anniversary", "VIP", "First Time", 
    "Regular", "Special Diet", "Large Party"
  ];

  const durationOptions = [
    { value: 1, label: "1 hour" },
    { value: 1.5, label: "1.5 hours" },
    { value: 2, label: "2 hours" },
    { value: 2.5, label: "2.5 hours" },
    { value: 3, label: "3 hours" },
    { value: 4, label: "4+ hours" }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-green-600" />
            <span>{title}</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Event Type */}
          <div>
            <Label htmlFor="eventType" className="text-sm font-medium text-gray-700">Event Type</Label>
            <Input
              id="eventType"
              value={formData.eventType}
              onChange={(e) => handleInputChange('eventType', e.target.value)}
              placeholder="General Dining"
              className="mt-1"
            />
          </div>

          {/* Customer Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="customerName" className="text-sm font-medium text-gray-700">Customer Name *</Label>
              <div className="relative mt-1">
                <Input
                  id="customerName"
                  value={formData.customerName}
                  onChange={(e) => handleInputChange('customerName', e.target.value)}
                  placeholder="Enter customer name"
                  required
                  className="pl-10"
                />
                <Users className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              </div>
            </div>
            <div>
              <Label htmlFor="customerPhone" className="text-sm font-medium text-gray-700">Phone</Label>
              <div className="relative mt-1">
                <Input
                  id="customerPhone"
                  type="tel"
                  value={formData.customerPhone}
                  onChange={(e) => handleInputChange('customerPhone', e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  className="pl-10"
                />
                <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              </div>
            </div>
          </div>

          {/* Email */}
          <div>
            <Label htmlFor="customerEmail" className="text-sm font-medium text-gray-700">Email *</Label>
            <div className="relative mt-1">
              <Input
                id="customerEmail"
                type="email"
                value={formData.customerEmail}
                onChange={(e) => handleInputChange('customerEmail', e.target.value)}
                placeholder="customer@example.com"
                required
                className="pl-10"
              />
              <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            </div>
          </div>

          {/* Booking Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="startTime" className="text-sm font-medium text-gray-700">Start Time *</Label>
              <div className="relative mt-1">
                <Input
                  id="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => handleInputChange('startTime', e.target.value)}
                  required
                  className="pl-10"
                />
                <Clock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              </div>
            </div>
            <div>
              <Label htmlFor="duration" className="text-sm font-medium text-gray-700">Duration *</Label>
              <Select 
                value={formData.duration.toString()} 
                onValueChange={(value) => handleInputChange('duration', parseFloat(value))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  {durationOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value.toString()}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="guestCount" className="text-sm font-medium text-gray-700">Guests *</Label>
              <div className="relative mt-1">
                <Input
                  id="guestCount"
                  type="number"
                  min="1"
                  max="20"
                  value={formData.guestCount}
                  onChange={(e) => handleInputChange('guestCount', parseInt(e.target.value))}
                  required
                  className="pl-10"
                />
                <Users className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              </div>
            </div>
          </div>

          {/* Available Tables */}
          <div>
            <Label htmlFor="tableId" className="text-sm font-medium text-gray-700">Available Tables</Label>
            <Select 
              value={formData.tableId} 
              onValueChange={(value) => handleInputChange('tableId', value)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select an available table" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Auto-assign table</SelectItem>
                {tables.map((table: any) => (
                  <SelectItem key={table.id} value={table.id.toString()}>
                    Table {table.tableNumber} (Capacity: {table.capacity})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-1">
              Tables displayed based on guest count and time availability
            </p>
          </div>

          {/* Special Requests */}
          <div>
            <Label htmlFor="specialRequests" className="text-sm font-medium text-gray-700">Special Requests</Label>
            <Textarea
              id="specialRequests"
              value={formData.specialRequests}
              onChange={(e) => handleInputChange('specialRequests', e.target.value)}
              placeholder="Dietary requirements, seating preferences, allergies..."
              className="mt-1 min-h-[80px]"
            />
          </div>

          {/* Internal Notes */}
          <div>
            <Label htmlFor="internalNotes" className="text-sm font-medium text-gray-700">Internal Notes</Label>
            <Textarea
              id="internalNotes"
              value={formData.internalNotes}
              onChange={(e) => handleInputChange('internalNotes', e.target.value)}
              placeholder="Staff notes (not visible to customer)..."
              className="mt-1 min-h-[60px]"
            />
          </div>

          {/* Extra Description */}
          <div>
            <Label htmlFor="extraDescription" className="text-sm font-medium text-gray-700">Extra Description</Label>
            <Textarea
              id="extraDescription"
              value={formData.extraDescription}
              onChange={(e) => handleInputChange('extraDescription', e.target.value)}
              placeholder="Additional booking details..."
              className="mt-1 min-h-[60px]"
            />
          </div>

          {/* Tags */}
          <div>
            <Label className="text-sm font-medium text-gray-700">Tags</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {availableTags.map((tag) => (
                <Badge
                  key={tag}
                  variant={selectedTags.includes(tag) ? "default" : "outline"}
                  className={`cursor-pointer transition-all duration-200 ${
                    selectedTags.includes(tag)
                      ? "bg-green-600 text-white hover:bg-green-700"
                      : "hover:bg-green-50 hover:border-green-300"
                  }`}
                  onClick={() => handleTagToggle(tag)}
                >
                  <Tag className="w-3 h-3 mr-1" />
                  {tag}
                </Badge>
              ))}
            </div>
            {selectedTags.includes("Large Party") && (
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Large Party Notice:</strong> Special arrangements may be required for parties of 8 or more guests.
                </p>
              </div>
            )}
          </div>

          {/* Pre-payment Option */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="requirePrePayment"
              checked={formData.requirePrePayment}
              onCheckedChange={(checked) => handleInputChange('requirePrePayment', checked)}
            />
            <Label htmlFor="requirePrePayment" className="text-sm text-gray-700">
              Require prepayment
            </Label>
          </div>

          <p className="text-xs text-gray-500">
            Phone number required for booking confirmation
          </p>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              {isLoading ? "Processing..." : submitButtonText}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}