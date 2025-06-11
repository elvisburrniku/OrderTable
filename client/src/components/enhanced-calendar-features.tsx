import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Filter, Calendar, Users, Clock, TrendingUp, AlertCircle, CheckCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

interface EnhancedCalendarFeaturesProps {
  bookings: any[];
  onFilterChange: (filters: any) => void;
  onSearch: (query: string) => void;
}

export function EnhancedCalendarFeatures({ bookings, onFilterChange, onSearch }: EnhancedCalendarFeaturesProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    status: "all",
    guestCount: "all",
    timeRange: "all",
    table: "all"
  });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Analytics data
  const totalBookings = bookings.length;
  const confirmedBookings = bookings.filter(b => b.status === 'confirmed').length;
  const pendingBookings = bookings.filter(b => b.status === 'pending').length;
  const cancelledBookings = bookings.filter(b => b.status === 'cancelled').length;
  const avgGuestCount = bookings.length > 0 ? 
    bookings.reduce((sum, b) => sum + b.guestCount, 0) / bookings.length : 0;

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    onSearch(query);
  };

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  return (
    <div className="space-y-4">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Bookings</p>
                <p className="text-2xl font-bold">{totalBookings}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Confirmed</p>
                <p className="text-2xl font-bold">{confirmedBookings}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{pendingBookings}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Avg Guests</p>
                <p className="text-2xl font-bold">{avgGuestCount.toFixed(1)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search bookings by customer name, email, or notes..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2">
          <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={filters.timeRange} onValueChange={(value) => handleFilterChange('timeRange', value)}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Times</SelectItem>
              <SelectItem value="morning">Morning (9-12)</SelectItem>
              <SelectItem value="afternoon">Afternoon (12-17)</SelectItem>
              <SelectItem value="evening">Evening (17-22)</SelectItem>
              <SelectItem value="late">Late (22+)</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            variant="outline"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
        </div>
      </div>

      {/* Advanced Filters */}
      {showAdvancedFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Advanced Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Guest Count</Label>
                <Select value={filters.guestCount} onValueChange={(value) => handleFilterChange('guestCount', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any Size</SelectItem>
                    <SelectItem value="1-2">1-2 guests</SelectItem>
                    <SelectItem value="3-4">3-4 guests</SelectItem>
                    <SelectItem value="5-6">5-6 guests</SelectItem>
                    <SelectItem value="7+">7+ guests</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Table</Label>
                <Select value={filters.table} onValueChange={(value) => handleFilterChange('table', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any table" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any Table</SelectItem>
                    <SelectItem value="window">Window Tables</SelectItem>
                    <SelectItem value="private">Private Rooms</SelectItem>
                    <SelectItem value="bar">Bar Area</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-end">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setFilters({
                      status: "all",
                      guestCount: "all",
                      timeRange: "all",
                      table: "all"
                    });
                    onFilterChange({
                      status: "all",
                      guestCount: "all",
                      timeRange: "all",
                      table: "all"
                    });
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="cursor-pointer hover:bg-primary hover:text-primary-foreground">
          Today's Bookings
        </Badge>
        <Badge variant="outline" className="cursor-pointer hover:bg-primary hover:text-primary-foreground">
          This Week
        </Badge>
        <Badge variant="outline" className="cursor-pointer hover:bg-primary hover:text-primary-foreground">
          Pending Confirmations
        </Badge>
        <Badge variant="outline" className="cursor-pointer hover:bg-primary hover:text-primary-foreground">
          Large Groups (6+)
        </Badge>
        <Badge variant="outline" className="cursor-pointer hover:bg-primary hover:text-primary-foreground">
          VIP Customers
        </Badge>
      </div>
    </div>
  );
}

export function CalendarToolbar({ onViewChange, currentView, onDateChange, currentDate }: {
  onViewChange: (view: string) => void;
  currentView: string;
  onDateChange: (date: Date) => void;
  currentDate: Date;
}) {
  return (
    <div className="flex items-center justify-between border-b pb-4">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold">Restaurant Calendar</h1>
        <div className="flex items-center gap-2">
          <Button
            variant={currentView === 'day' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onViewChange('day')}
          >
            Day
          </Button>
          <Button
            variant={currentView === 'week' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onViewChange('week')}
          >
            Week
          </Button>
          <Button
            variant={currentView === 'month' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onViewChange('month')}
          >
            Month
          </Button>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => onDateChange(new Date())}>
          Today
        </Button>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Calendar className="w-4 h-4 mr-2" />
              Jump to Date
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Jump to Specific Date</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Select Date</Label>
                <Input
                  type="date"
                  onChange={(e) => {
                    if (e.target.value) {
                      onDateChange(new Date(e.target.value));
                    }
                  }}
                />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export function BookingConflictDetector({ bookings, selectedDate, selectedTime }: {
  bookings: any[];
  selectedDate: Date;
  selectedTime: string;
}) {
  const conflicts = bookings.filter(booking => {
    // Logic to detect overlapping bookings
    return booking.bookingDate === selectedDate.toISOString().split('T')[0] &&
           Math.abs(new Date(`1970/01/01 ${booking.startTime}`).getTime() - 
                   new Date(`1970/01/01 ${selectedTime}`).getTime()) < 3600000; // 1 hour
  });

  if (conflicts.length === 0) return null;

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
      <div className="flex items-center gap-2 text-yellow-800">
        <AlertCircle className="w-4 h-4" />
        <span className="font-medium">Potential Conflicts Detected</span>
      </div>
      <div className="mt-2 space-y-1">
        {conflicts.map(conflict => (
          <p key={conflict.id} className="text-sm text-yellow-700">
            {conflict.customerName} at {conflict.startTime}
          </p>
        ))}
      </div>
    </div>
  );
}