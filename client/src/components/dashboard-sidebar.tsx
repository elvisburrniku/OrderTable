import { Link, useLocation, useParams } from "wouter";
import { Calendar, Settings, Clock, MapPin, Table, Utensils, Grid3x3, FileText, Users, MessageSquare, MessageCircle, CreditCard, BarChart3, Clock4, Plug, Layout } from "lucide-react";
import { ReadyTableLogo } from "@/components/ui/ready-table-logo";
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
    { path: `/${tenantId}/floor-plan`, icon: Layout, label: "Floor Plan" },
    { path: `/${tenantId}/customers`, icon: Users, label: "Customers" },
    { path: `/${tenantId}/waiting-list`, icon: Clock, label: "Waiting List" },
    { path: `/${tenantId}/integrations`, icon: Plug, label: "Integrations" },
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
    { path: `/${tenantId}/cut-off-time`, icon: Clock4, label: "Cut-off Time" },
    { path: `/${tenantId}/rooms`, icon: MapPin, label: "Rooms" },
    { path: `/${tenantId}/tables`, icon: Table, label: "Tables" },
    { path: `/${tenantId}/combined-tables`, icon: Grid3x3, label: "Combined Tables" },
  ];

  return (
    <div className="hidden md:flex h-full w-64 flex-col fixed inset-y-0 z-50 bg-white border-r border-gray-200">
      <div className="flex items-center h-16 px-4 border-b border-gray-200">
        <ReadyTableLogo />
      </div>
      
      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path;
            
            return (
              <Link
                key={item.path}
                href={item.path}
                className={cn(
                  "group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors",
                  isActive
                    ? "bg-blue-100 text-blue-900 border-r-2 border-blue-600"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <Icon
                  className={cn(
                    "mr-3 h-5 w-5 flex-shrink-0",
                    isActive ? "text-blue-500" : "text-gray-400 group-hover:text-gray-500"
                  )}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Settings Section */}
        <div className="px-2 py-4 border-t border-gray-200">
          <h3 className="px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Restaurant Settings
          </h3>
          <nav className="space-y-1">
            {settingsItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.path;
              
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={cn(
                    "group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors",
                    isActive
                      ? "bg-blue-100 text-blue-900 border-r-2 border-blue-600"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  <Icon
                    className={cn(
                      "mr-3 h-4 w-4 flex-shrink-0",
                      isActive ? "text-blue-500" : "text-gray-400 group-hover:text-gray-500"
                    )}
                  />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Today's Bookings Summary */}
        <div className="px-2 py-4 border-t border-gray-200">
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-2">Today's Summary</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Total Bookings</span>
                  <span className="font-medium">{todaysBookings.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Selected Date</span>
                  <span className="font-medium">{format(selectedDate, 'MMM d')}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}