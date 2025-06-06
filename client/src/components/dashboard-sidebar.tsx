import { Link, useLocation, useParams } from "wouter";
import { Calendar, Settings, Clock, MapPin, Table, Utensils, Grid3x3, FileText, Users, MessageSquare, MessageCircle, CreditCard, BarChart3, Clock4 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { Booking } from "@shared/schema";
import { useTenant } from "@/lib/tenant";
import { cn } from "@/lib/utils";

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
    { path: `/${tenantId}/dashboard`, icon: Calendar, label: "Dashboard" },
    { path: `/${tenantId}/bookings`, icon: Calendar, label: "Bookings" },
    { path: `/${tenantId}/customers`, icon: Users, label: "Customers" },
    { path: `/${tenantId}/waiting-list`, icon: Clock, label: "Waiting List" },
    { path: `/${tenantId}/statistics`, icon: BarChart3, label: "Statistics" },
    { path: `/${tenantId}/activity-log`, icon: FileText, label: "Activity Log" },
    { path: `/${tenantId}/feedback-responses`, icon: MessageCircle, label: "Feedback" },
    { path: `/${tenantId}/sms-messages`, icon: MessageSquare, label: "SMS Messages" },
    { path: `/${tenantId}/subscription`, icon: CreditCard, label: "Subscription" },
    { path: `/${tenantId}/tenant-settings`, icon: Settings, label: "Tenant Settings" }
  ];

  const settingsItems = [
    { path: `/${tenantId}/opening-hours`, icon: Clock4, label: "Opening Hours" },
    { path: `/${tenantId}/special-periods`, icon: Calendar, label: "Special Periods" },
    { path: `/${tenantId}/cut-off-time`, icon: Clock, label: "Cut-off Time" },
    { path: `/${tenantId}/rooms`, icon: MapPin, label: "Rooms" },
    { path: `/${tenantId}/tables`, icon: Table, label: "Tables" },
    { path: `/${tenantId}/combined-tables`, icon: Utensils, label: "Combined Tables" },
    { path: `/${tenantId}/table-plan`, icon: Grid3x3, label: "Table Plan" },
    { path: `/${tenantId}/seating-configurations`, icon: Grid3x3, label: "Seating Configurations" },
    { path: `/${tenantId}/periodic-criteria`, icon: Calendar, label: "Periodic Criteria" },
    { path: `/${tenantId}/custom-fields`, icon: FileText, label: "Custom Fields" },
    { path: `/${tenantId}/booking-agents`, icon: Users, label: "Booking Agents" },
    { path: `/${tenantId}/email-notifications`, icon: MessageSquare, label: "E-mail Notifications" },
    { path: `/${tenantId}/sms-notifications`, icon: MessageSquare, label: "SMS Notifications" },
    { path: `/${tenantId}/feedback-questions`, icon: MessageCircle, label: "Questions" },
    { path: `/${tenantId}/events`, icon: Calendar, label: "Events" },
    { path: `/${tenantId}/products`, icon: Utensils, label: "Products" },
    { path: `/${tenantId}/product-groups`, icon: Grid3x3, label: "Product Groups" },
    { path: `/${tenantId}/payment-setups`, icon: Settings, label: "Payment Setups" },
    { path: `/${tenantId}/payment-gateway`, icon: CreditCard, label: "Payment Gateway" }
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
      </div>



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