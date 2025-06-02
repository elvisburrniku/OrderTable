import { Link, useLocation } from "wouter";
import { Calendar, Users, Archive, Grid3x3 } from "lucide-react";
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
    { path: "/customers", icon: Users, label: "CRM" },
    { path: "/archive", icon: Archive, label: "Archive" }
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
