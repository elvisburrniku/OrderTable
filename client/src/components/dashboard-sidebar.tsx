import { Link, useLocation } from "wouter";
import { Calendar, Settings, Clock, MapPin, Table, Utensils, Grid3x3, FileText, Users, MessageSquare, MessageCircle, CreditCard, BarChart3, Clock4 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { Booking } from "@shared/schema";

interface DashboardSidebarProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  bookings: Booking[];
}

export default function DashboardSidebar({ selectedDate, bookings }: DashboardSidebarProps) {
  const [location] = useLocation();

  const todaysBookings = bookings.filter(booking => 
    booking.bookingDate.toISOString().split('T')[0] === format(new Date(), 'yyyy-MM-dd')
  );

  const navigationItems = [
    { path: "/dashboard", icon: Calendar, label: "Booking" },
    { path: "/customers", icon: Users, label: "Customers" },
    { path: "/bookings", icon: Calendar, label: "Bookings" },
    { path: "/sms-messages", icon: MessageSquare, label: "SMS Messages" },
    { path: "/waiting-list", icon: Clock, label: "Waiting List" },
    { path: "/statistics", icon: BarChart3, label: "Statistics" },
    { path: "/feedback-responses", icon: MessageCircle, label: "Feedback" },
    { path: "/activity-log", icon: FileText, label: "Activity Log" }
  ];

  const settingsItems = [
    { path: "/opening-hours", icon: Clock4, label: "Opening Hours" },
    { path: "/special-periods", icon: Calendar, label: "Special Periods" },
    { path: "/cut-off-time", icon: Clock, label: "Cut-off Time" },
    { path: "/rooms", icon: MapPin, label: "Rooms" },
    { path: "/tables", icon: Table, label: "Tables" },
    { path: "/combined-tables", icon: Utensils, label: "Combined Tables" },
    { path: "/seating-configurations", icon: Grid3x3, label: "Seating Configurations" },
    { path: "/periodic-criteria", icon: Calendar, label: "Periodic Criteria" },
    { path: "/custom-fields", icon: FileText, label: "Custom Fields" },
    { path: "/booking-agents", icon: Users, label: "Booking Agents" },
    { path: "/email-notifications", icon: MessageSquare, label: "E-mail Notifications" },
    { path: "/sms-notifications", icon: MessageSquare, label: "SMS Notifications" },
    { path: "/feedback-questions", icon: MessageCircle, label: "Questions" },
    { path: "/events", icon: Calendar, label: "Events" },
    { path: "/payment-setups", icon: Settings, label: "Payment Setups" },
    { path: "/payment-gateway", icon: Settings, label: "Payment Gateway" }
  ];

  return (
    <div className="w-64 bg-gray-50 border-r border-gray-200 p-4">
      <div className="flex items-center mb-8">
        <Grid3x3 className="text-green-600 text-xl mr-2" size={20} />
        <span className="text-xl font-bold text-gray-900">easyTable</span>
      </div>

      <nav className="space-y-2 mb-8">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path;

          return (
            <Link key={item.path} href={item.path}>
              <div className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                isActive 
                  ? "text-green-600 bg-green-50" 
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}>
                <Icon className="mr-3" size={16} />
                {item.label}
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="mb-8">
        <div className="flex items-center mb-4">
          <Settings className="mr-2" size={16} />
          <span className="text-sm font-semibold text-gray-900">Restaurant Settings</span>
        </div>
        <nav className="space-y-1">
          {settingsItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path;

            return (
              <Link key={item.path} href={item.path}>
                <div className={`flex items-center px-3 py-2 text-sm rounded-lg transition-colors ${
                  isActive 
                    ? "text-green-600 bg-green-50" 
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}>
                  <Icon className="mr-3" size={14} />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>
      </div>

      <Card className="bg-white border mb-4">
        <CardContent className="p-4">
          <h4 className="font-semibold text-gray-900 mb-2">Calendar</h4>
          <div className="text-sm text-gray-600 mb-2">{format(selectedDate, 'MMMM yyyy')}</div>
          <div className="grid grid-cols-7 gap-1 text-xs">
            {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(day => (
              <div key={day} className="text-center p-1 text-gray-500">{day}</div>
            ))}

            {/* Simple calendar display - showing just a few days */}
            <div className="text-center p-1">1</div>
            <div className={`text-center p-1 rounded ${
              format(selectedDate, 'd') === '2' ? 'bg-green-600 text-white' : ''
            }`}>2</div>
            <div className="text-center p-1">3</div>
            <div className="text-center p-1">4</div>
            <div className="text-center p-1">5</div>
            <div className="text-center p-1">6</div>
            <div className="text-center p-1">7</div>
          </div>
        </CardContent>
      </Card>

      <div>
        <div className="text-sm font-medium text-gray-900 mb-2">Booking open</div>
        <div className="space-y-2 text-sm">
          <div className="flex items-center">
            <div className="w-2 h-2 bg-green-600 rounded-full mr-2" />
            <span>All</span>
          </div>
          <div className="text-gray-600 ml-4">
            <div>Bookings today: {todaysBookings.length}</div>
            <div>Remaining today: {20 - todaysBookings.length}</div>
          </div>
        </div>
      </div>
    </div>
  );
}