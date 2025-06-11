import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Clock, 
  Calendar, 
  Scissors, 
  MapPin, 
  Table, 
  Grid3X3, 
  Layout, 
  Armchair,
  Filter,
  FileText,
  Users,
  Mail,
  MessageSquare,
  HelpCircle,
  CalendarDays,
  Package,
  Layers,
  Settings,
  CreditCard,
  Plus,
  Edit,
  Trash2,
  Save
} from "lucide-react";

export default function RestaurantSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Get restaurant info from URL
  const pathParts = window.location.pathname.split('/');
  const tenantId = parseInt(pathParts[1]);
  const restaurantId = parseInt(pathParts[3]) || 12;

  const [activeSection, setActiveSection] = useState("opening-hours");

  // Fetch restaurant data
  const { data: restaurant } = useQuery({
    queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}`],
    enabled: !!tenantId && !!restaurantId
  });

  // Fetch bookings for today's count
  const { data: bookings } = useQuery({
    queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/bookings`],
    enabled: !!tenantId && !!restaurantId
  });

  const settingsSections = [
    {
      id: "opening-hours",
      name: "Opening Hours",
      icon: Clock,
      description: "Set your restaurant's operating hours"
    },
    {
      id: "special-periods",
      name: "Special Periods",
      icon: Calendar,
      description: "Configure holidays and special opening times"
    },
    {
      id: "cut-off-time",
      name: "Cut-off Time",
      icon: Scissors,
      description: "Set booking cut-off times"
    },
    {
      id: "rooms",
      name: "Rooms",
      icon: MapPin,
      description: "Manage dining rooms and areas"
    },
    {
      id: "tables",
      name: "Tables",
      icon: Table,
      description: "Configure individual tables"
    },
    {
      id: "combined-tables",
      name: "Combined Tables",
      icon: Grid3X3,
      description: "Set up table combinations"
    },
    {
      id: "table-plan",
      name: "Table Plan",
      icon: Layout,
      description: "Visual table layout management"
    },
    {
      id: "seating-configurations",
      name: "Seating Configurations",
      icon: Armchair,
      description: "Define seating arrangements"
    },
    {
      id: "periodic-criteria",
      name: "Periodic Criteria",
      icon: Filter,
      description: "Set recurring booking rules"
    },
    {
      id: "custom-fields",
      name: "Custom Fields",
      icon: FileText,
      description: "Add custom booking fields"
    },
    {
      id: "booking-agents",
      name: "Booking Agents",
      icon: Users,
      description: "Manage staff with booking access"
    },
    {
      id: "email-notifications",
      name: "E-mail Notifications",
      icon: Mail,
      description: "Configure email settings"
    },
    {
      id: "sms-notifications",
      name: "SMS Notifications",
      icon: MessageSquare,
      description: "Set up SMS alerts"
    },
    {
      id: "questions",
      name: "Questions",
      icon: HelpCircle,
      description: "Custom booking form questions"
    },
    {
      id: "events",
      name: "Events",
      icon: CalendarDays,
      description: "Manage special events"
    },
    {
      id: "products",
      name: "Products",
      icon: Package,
      description: "Menu items and products"
    },
    {
      id: "product-groups",
      name: "Product Groups",
      icon: Layers,
      description: "Organize products into groups"
    },
    {
      id: "payment-setups",
      name: "Payment Setups",
      icon: Settings,
      description: "Configure payment methods"
    },
    {
      id: "payment-gateway",
      name: "Payment Gateway",
      icon: CreditCard,
      description: "Set up payment processing"
    }
  ];

  const getTodayBookingsCount = () => {
    if (!bookings) return 0;
    const today = new Date().toDateString();
    return (bookings as any[]).filter(booking => 
      new Date(booking.bookingDate).toDateString() === today
    ).length;
  };

  const getRemainingBookingsToday = () => {
    // This would typically come from capacity calculations
    return 17; // Placeholder matching the image
  };

  const renderSectionContent = () => {
    switch (activeSection) {
      case "opening-hours":
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="w-5 h-5" />
                <span>Opening Hours</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-gray-600">Configure your restaurant's operating hours for each day of the week.</p>
              
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                <div key={day} className="flex items-center space-x-4 p-4 border rounded-lg">
                  <div className="w-24 font-medium">{day}</div>
                  <Switch />
                  <div className="flex items-center space-x-2">
                    <Input type="time" defaultValue="09:00" className="w-32" />
                    <span>to</span>
                    <Input type="time" defaultValue="22:00" className="w-32" />
                  </div>
                </div>
              ))}
              
              <Button className="flex items-center space-x-2">
                <Save className="w-4 h-4" />
                <span>Save Opening Hours</span>
              </Button>
            </CardContent>
          </Card>
        );
      
      case "tables":
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Table className="w-5 h-5" />
                  <span>Tables</span>
                </div>
                <Button className="flex items-center space-x-2">
                  <Plus className="w-4 h-4" />
                  <span>Add Table</span>
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((tableNum) => (
                  <div key={tableNum} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Table {tableNum}</h4>
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Capacity:</span>
                        <span>{tableNum + 1} people</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span>Room:</span>
                        <span>Main Dining</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span>Status:</span>
                        <Badge variant="secondary">Active</Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      
      case "rooms":
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <MapPin className="w-5 h-5" />
                  <span>Rooms</span>
                </div>
                <Button className="flex items-center space-x-2">
                  <Plus className="w-4 h-4" />
                  <span>Add Room</span>
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {['Main Dining', 'Private Room', 'Terrace', 'Bar Area'].map((room, index) => (
                <div key={room} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">{room}</h4>
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Tables: </span>
                      <span>{(index + 1) * 3}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Capacity: </span>
                      <span>{(index + 1) * 12} people</span>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        );

      case "email-notifications":
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Mail className="w-5 h-5" />
                <span>E-mail Notifications</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Booking Confirmations</h4>
                    <p className="text-sm text-gray-600">Send confirmation emails to customers</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Booking Reminders</h4>
                    <p className="text-sm text-gray-600">Send reminder emails before visits</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Cancellation Notifications</h4>
                    <p className="text-sm text-gray-600">Notify when bookings are cancelled</p>
                  </div>
                  <Switch />
                </div>
              </div>
              
              <div className="space-y-4">
                <Label>From Email Address</Label>
                <Input 
                  type="email" 
                  placeholder="noreply@restaurant.com"
                  defaultValue="noreply@restaurant.com"
                />
              </div>
              
              <Button className="flex items-center space-x-2">
                <Save className="w-4 h-4" />
                <span>Save Email Settings</span>
              </Button>
            </CardContent>
          </Card>
        );

      case "payment-setups":
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="w-5 h-5" />
                <span>Payment Setups</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Require Deposits</h4>
                    <p className="text-sm text-gray-600">Require payment for reservations</p>
                  </div>
                  <Switch />
                </div>
                
                <div className="space-y-2">
                  <Label>Deposit Amount</Label>
                  <div className="flex items-center space-x-2">
                    <Input type="number" placeholder="20" className="w-24" />
                    <Select defaultValue="per-person">
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="per-person">Per Person</SelectItem>
                        <SelectItem value="per-booking">Per Booking</SelectItem>
                        <SelectItem value="percentage">Percentage</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Cancellation Policy</Label>
                  <Textarea 
                    placeholder="Describe your cancellation policy..."
                    defaultValue="Cancellations must be made at least 24 hours in advance for a full refund."
                    rows={3}
                  />
                </div>
              </div>
              
              <Button className="flex items-center space-x-2">
                <Save className="w-4 h-4" />
                <span>Save Payment Settings</span>
              </Button>
            </CardContent>
          </Card>
        );

      default:
        const section = settingsSections.find(s => s.id === activeSection);
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                {section && <section.icon className="w-5 h-5" />}
                <span>{section?.name}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">{section?.description}</p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-800 text-sm">
                  This section is under development. Click the button below to access the configuration.
                </p>
              </div>
              <Button className="mt-4">Configure {section?.name}</Button>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Settings className="w-6 h-6 text-gray-600" />
            <h1 className="text-2xl font-bold text-gray-900">Restaurant Settings</h1>
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              {restaurant?.name || "Restaurant"}
            </Badge>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Settings Navigation */}
        <div className="w-80 bg-white border-r min-h-screen">
          <div className="p-6">
            <nav className="space-y-2">
              {settingsSections.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;
                
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                      isActive
                        ? 'bg-gray-100 text-gray-900'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'text-gray-900' : 'text-gray-500'}`} />
                    <span>{section.name}</span>
                  </button>
                );
              })}
            </nav>

            {/* Booking Status */}
            <div className="mt-8 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Booking open</h3>
              
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-600">All</span>
              </div>
              
              <div className="text-sm text-gray-600 space-y-1">
                <div>Bookings today: {getTodayBookingsCount()}</div>
                <div>Remaining today: {getRemainingBookingsToday()}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          {renderSectionContent()}
        </div>
      </div>
    </div>
  );
}