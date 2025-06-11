import { Calendar, Users, Clock, Zap, BarChart3, FileText, MessageSquare, CreditCard, Settings, Cog } from "lucide-react";
import { useLocation } from "wouter";

interface SidebarProps {
  tenantId: number;
  restaurantId?: number;
}

export function DashboardSidebar({ tenantId, restaurantId }: SidebarProps) {
  const [location] = useLocation();

  const menuItems = [
    {
      name: "Dashboard",
      icon: BarChart3,
      href: `/${tenantId}/dashboard`,
      color: "text-green-600"
    },
    {
      name: "Bookings",
      icon: Calendar,
      href: `/${tenantId}/bookings`,
      color: "text-blue-600"
    },
    {
      name: "Customers",
      icon: Users,
      href: `/${tenantId}/customers`,
      color: "text-purple-600"
    },
    {
      name: "Waiting List",
      icon: Clock,
      href: `/${tenantId}/waiting-list`,
      color: "text-orange-600"
    },
    {
      name: "Integrations",
      icon: Zap,
      href: `/${tenantId}/integrations`,
      color: "text-yellow-600"
    },
    {
      name: "Statistics",
      icon: BarChart3,
      href: `/${tenantId}/statistics`,
      color: "text-indigo-600"
    },
    {
      name: "Activity Log",
      icon: FileText,
      href: `/${tenantId}/activity-log`,
      color: "text-gray-600"
    },
    {
      name: "Feedback",
      icon: MessageSquare,
      href: `/${tenantId}/feedback`,
      color: "text-pink-600"
    },
    {
      name: "SMS Messages",
      icon: MessageSquare,
      href: `/${tenantId}/sms-messages`,
      color: "text-teal-600"
    },
    {
      name: "Subscription",
      icon: CreditCard,
      href: `/${tenantId}/subscription`,
      color: "text-emerald-600"
    },
    {
      name: "Tenant Settings",
      icon: Settings,
      href: `/${tenantId}/tenant-settings`,
      color: "text-slate-600"
    },
    {
      name: "Restaurant Settings",
      icon: Cog,
      href: `/${tenantId}/restaurant-settings`,
      color: "text-stone-600"
    }
  ];

  const isActive = (href: string) => {
    return location === href || location.startsWith(href + '/');
  };

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
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            
            return (
              <a
                key={item.name}
                href={item.href}
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? 'text-gray-900' : item.color}`} />
                <span>{item.name}</span>
              </a>
            );
          })}
        </nav>
      </div>
    </div>
  );
}