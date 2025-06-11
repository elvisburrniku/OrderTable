import { Calendar, Users, BarChart3 } from "lucide-react";

interface SidebarProps {
  tenantId: number;
  restaurantId?: number;
}

export function DashboardSidebar({ tenantId, restaurantId }: SidebarProps) {
  return (
    <div className="w-64 bg-white border-r border-gray-200 min-h-screen">
      <div className="p-6">
        {/* Logo */}
        <div className="flex items-center space-x-2 mb-8">
          <div className="w-8 h-8 bg-green-600 rounded flex items-center justify-center">
            <div className="w-4 h-4 bg-white rounded-full"></div>
          </div>
          <span className="text-xl font-semibold text-gray-900">ReadyTable</span>
        </div>

        {/* Navigation */}
        <nav className="space-y-1">
          <a
            href={`/${tenantId}/dashboard`}
            className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50"
          >
            <BarChart3 className="w-5 h-5 text-green-600" />
            <span>Dashboard</span>
          </a>
          
          <a
            href={`/${tenantId}/bookings`}
            className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50"
          >
            <Calendar className="w-5 h-5 text-blue-600" />
            <span>Bookings</span>
          </a>
          
          <a
            href={`/${tenantId}/customers`}
            className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50"
          >
            <Users className="w-5 h-5 text-purple-600" />
            <span>Customers</span>
          </a>
        </nav>
      </div>
    </div>
  );
}