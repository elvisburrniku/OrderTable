import { Link, useLocation, useParams } from "wouter";
import { Calendar, Settings, Clock, MapPin, Table, Utensils, Grid3x3, FileText, Users, MessageSquare, MessageCircle, CreditCard, BarChart3, Clock4 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { Booking } from "@shared/schema";
import { useTenant } from "@/lib/tenant";

interface DashboardSidebarProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  bookings: Booking[];
}

export default function DashboardSidebar({ selectedDate, bookings }: DashboardSidebarProps) {
  const [location] = useLocation();
  const params = useParams();
  const tenantId = params.tenantId;
  const { tenantId: currentTenantId } = useTenant();

  const todaysBookings = Array.isArray(bookings) ? bookings.filter(booking => {
    if (!booking.bookingDate) return false;

    try {
      const bookingDateStr = booking.bookingDate instanceof Date 
        ? booking.bookingDate.toISOString().split('T')[0]
        : String(booking.bookingDate).split('T')[0];
      return bookingDateStr === format(new Date(), 'yyyy-MM-dd');
    } catch (error) {
      console.error('Error processing booking date:', booking.bookingDate, error);
      return false;
    }
  }) : [];

  const navigationItems = [
    { path: `/${tenantId}/dashboard`, icon: Calendar, label: "Booking" },
    { path: `/${tenantId}/customers`, icon: Users, label: "Customers" },
    { path: `/${tenantId}/bookings`, icon: Calendar, label: "Bookings" },
    { path: `/${tenantId}/sms-messages`, icon: MessageSquare, label: "SMS Messages" },
    { path: `/${tenantId}/waiting-list`, icon: Clock, label: "Waiting List" },
    { path: `/${tenantId}/statistics`, icon: BarChart3, label: "Statistics" },
    { path: `/${tenantId}/feedback-responses`, icon: MessageCircle, label: "Feedback" },
    { path: `/${tenantId}/activity-log`, icon: FileText, label: "Activity Log" },
    { path: `/${tenantId}/subscription`, icon: CreditCard, label: "Subscription" }
  ];

  const settingsItems = [
    { path: `/${tenantId}/opening-hours`, icon: Clock4, label: "Opening Hours" },
    { path: `/${tenantId}/special-periods`, icon: Calendar, label: "Special Periods" },
    { path: `/${tenantId}/cut-off-time`, icon: Clock, label: "Cut-off Time" },
    { path: `/${tenantId}/rooms`, icon: MapPin, label: "Rooms" },
    { path: `/${tenantId}/tables`, icon: Table, label: "Tables" },
    { path: `/${tenantId}/combined-tables`, icon: Utensils, label: "Combined Tables" },
    { path: `/${tenantId}/seating-configurations`, icon: Grid3x3, label: "Seating Configurations" },
    { path: `/${tenantId}/periodic-criteria`, icon: Calendar, label: "Periodic Criteria" },
    { path: `/${tenantId}/custom-fields`, icon: FileText, label: "Custom Fields" },
    { path: `/${tenantId}/booking-agents`, icon: Users, label: "Booking Agents" },
    { path: `/${tenantId}/email-notifications`, icon: MessageSquare, label: "E-mail Notifications" },
    { path: `/${tenantId}/sms-notifications`, icon: MessageSquare, label: "SMS Notifications" },
    { path: `/${tenantId}/feedback-questions`, icon: MessageCircle, label: "Questions" },
    { path: `/${tenantId}/events`, icon: Calendar, label: "Events" },
    { path: `/${tenantId}/payment-setups`, icon: Settings, label: "Payment Setups" },
    { path: `/${tenantId}/payment-gateway`, icon: Settings, label: "Payment Gateway" }
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
            <Link
              to={`/${currentTenantId}/dashboard`}
              className={cn(
                "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                location.pathname === `/${currentTenantId}/dashboard`
                  ? "bg-green-100 text-green-700 border-r-2 border-green-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <Calendar className="mr-3 h-4 w-4" />
              Booking
            </Link>

            <Link
              to={`/${currentTenantId}/bookings`}
              className={cn(
                "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                location.pathname === `/${currentTenantId}/bookings`
                  ? "bg-green-100 text-green-700 border-r-2 border-green-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <Users className="mr-3 h-4 w-4" />
              CRM
            </Link>

            <Link
              to={`/${currentTenantId}/waiting-list`}
              className={cn(
                "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                location.pathname === `/${currentTenantId}/waiting-list`
                  ? "bg-green-100 text-green-700 border-r-2 border-green-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <Clock className="mr-3 h-4 w-4" />
              Waiting List
            </Link>

            <Link
              to={`/${currentTenantId}/statistics`}
              className={cn(
                "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                location.pathname === `/${currentTenantId}/statistics`
                  ? "bg-green-100 text-green-700 border-r-2 border-green-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <BarChart3 className="mr-3 h-4 w-4" />
              Statistics
            </Link>

            <Link
              to={`/${currentTenantId}/activity-log`}
              className={cn(
                "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                location.pathname === `/${currentTenantId}/activity-log`
                  ? "bg-green-100 text-green-700 border-r-2 border-green-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <FileText className="mr-3 h-4 w-4" />
              Log
            </Link>
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