import { useState } from "react";
import {
  Calendar,
  Users,
  Clock,
  Zap,
  BarChart3,
  FileText,
  MessageSquare,
  CreditCard,
  Settings,
  Cog,
  ChevronDown,
  ChevronRight,
  MapPin,
  Table,
  Grid3X3,
  Layout,
  Armchair,
  Filter,
  Mail,
  HelpCircle,
  CalendarDays,
  Package,
  Layers,
  Scissors,
  AlertTriangle,
  Thermometer,
  TestTube,
  ChefHat,
  Printer,
  BookOpen,
  Phone,
  ExternalLink,
} from "lucide-react";
import { useLocation, Link } from "wouter";

interface SidebarProps {
  tenantId: number;
  restaurantId?: number;
}

export default function DashboardSidebar({
  tenantId,
  restaurantId,
}: SidebarProps) {
  const [location] = useLocation();
  const [isRestaurantSettingsOpen, setIsRestaurantSettingsOpen] =
    useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const restaurantSettingsItems = [
    { name: "Opening Hours", icon: Clock, href: `/${tenantId}/opening-hours` },
    {
      name: "Special Periods",
      icon: CalendarDays,
      href: `/${tenantId}/special-periods`,
    },
    { name: "Cut-off Time", icon: Scissors, href: `/${tenantId}/cut-off-time` },
    { name: "Rooms", icon: MapPin, href: `/${tenantId}/rooms` },
    { name: "Tables", icon: Table, href: `/${tenantId}/tables` },
    {
      name: "Combined Tables",
      icon: Grid3X3,
      href: `/${tenantId}/combined-tables`,
    },
    { name: "Table Plan", icon: Layout, href: `/${tenantId}/table-plan` },
    {
      name: "Seating Configurations",
      icon: Armchair,
      href: `/${tenantId}/seating-configurations`,
    },
    {
      name: "Periodic Criteria",
      icon: Filter,
      href: `/${tenantId}/periodic-criteria`,
    },
    {
      name: "Custom Fields",
      icon: FileText,
      href: `/${tenantId}/custom-fields`,
    },
    {
      name: "Booking Agents",
      icon: Users,
      href: `/${tenantId}/booking-agents`,
    },
    {
      name: "E-mail Notifications",
      icon: Mail,
      href: `/${tenantId}/email-notifications`,
    },
    {
      name: "SMS Notifications",
      icon: MessageSquare,
      href: `/${tenantId}/sms-notifications`,
    },
    {
      name: "Questions",
      icon: HelpCircle,
      href: `/${tenantId}/feedback-questions`,
    },
    { name: "Events", icon: CalendarDays, href: `/${tenantId}/events` },
    { name: "Products", icon: Package, href: `/${tenantId}/products` },
    {
      name: "Product Groups",
      icon: Layers,
      href: `/${tenantId}/product-groups`,
    },
    {
      name: "Payment Setups",
      icon: Settings,
      href: `/${tenantId}/payment-setups`,
    },
    {
      name: "Payment Gateway",
      icon: CreditCard,
      href: `/${tenantId}/payment-gateway`,
    },
  ];

  const menuItems = [
    {
      name: "Dashboard",
      icon: BarChart3,
      href: `/${tenantId}/dashboard`,
      color: "text-green-600",
    },
    {
      name: "Bookings",
      icon: Calendar,
      href: `/${tenantId}/bookings`,
      color: "text-blue-600",
    },
    {
      name: "Calendar",
      icon: CalendarDays,
      href: `/${tenantId}/calendar`,
      color: "text-teal-600",
    },
    {
      name: "Heat Map",
      icon: Thermometer,
      href: `/${tenantId}/heat-map`,
      color: "text-orange-600",
    },
    {
      name: "Conflicts",
      icon: AlertTriangle,
      href: `/${tenantId}/conflicts`,
      color: "text-red-600",
    },
    {
      name: "Customers",
      icon: Users,
      href: `/${tenantId}/customers`,
      color: "text-purple-600",
    },
    {
      name: "Menu Management",
      icon: ChefHat,
      href: `/${tenantId}/menu-management`,
      color: "text-green-600",
    },
    {
      name: "Kitchen Dashboard",
      icon: TestTube,
      href: `/${tenantId}/kitchen-dashboard`,
      color: "text-orange-600",
    },
    {
      name: "Print Orders",
      icon: Printer,
      href: `/${tenantId}/print-orders`,
      color: "text-indigo-600",
    },
    {
      name: "Product Groups",
      icon: Package,
      href: `/${tenantId}/product-groups`,
      color: "text-emerald-600",
    },
    {
      name: "Waiting List",
      icon: Clock,
      href: `/${tenantId}/waiting-list`,
      color: "text-orange-600",
    },
    {
      name: "Integrations",
      icon: Zap,
      href: `/${tenantId}/integrations`,
      color: "text-yellow-600",
    },
    {
      name: "Statistics",
      icon: BarChart3,
      href: `/${tenantId}/statistics`,
      color: "text-indigo-600",
    },
    {
      name: "Activity Log",
      icon: FileText,
      href: `/${tenantId}/activity-log`,
      color: "text-gray-600",
    },
    {
      name: "Feedback",
      icon: MessageSquare,
      href: `/${tenantId}/feedbacks`,
      color: "text-pink-600",
    },
    {
      name: "SMS Messages",
      icon: MessageSquare,
      href: `/${tenantId}/sms-messages`,
      color: "text-teal-600",
    },
    {
      name: "Billing",
      icon: CreditCard,
      href: `/${tenantId}/billing`,
      color: "text-purple-600",
    },
  ];

  const helpItems = [
    {
      name: "Documentation",
      icon: BookOpen,
      action: () => window.open("https://docs.readytable.com", "_blank"),
      description: "Complete user guide and tutorials"
    },
    {
      name: "Video Tutorials",
      icon: Calendar,
      action: () => window.open("https://tutorials.readytable.com", "_blank"),
      description: "Step-by-step video guides"
    },
    {
      name: "Contact Support",
      icon: Phone,
      action: () => window.open("mailto:support@readytable.com", "_blank"),
      description: "Get help from our team"
    },
    {
      name: "Feature Requests",
      icon: MessageSquare,
      action: () => window.open("https://feedback.readytable.com", "_blank"),
      description: "Suggest new features"
    },
    {
      name: "System Status",
      icon: AlertTriangle,
      action: () => window.open("https://status.readytable.com", "_blank"),
      description: "Check service availability"
    },
  ];

  const isActive = (href: string) => {
    return location === href || location.startsWith(href + "/");
  };

  return (
    <div className="w-64 bg-white border-r border-gray-200 min-h-screen">
      <div className="p-6">
        {/* Logo */}
        <div className="flex items-center space-x-2 mb-8">
          <div className="w-8 h-8 bg-green-600 rounded flex items-center justify-center">
            <div className="w-4 h-4 bg-white rounded-full"></div>
          </div>
          <span className="text-xl font-semibold text-gray-900">
            ReadyTable
          </span>
        </div>

        {/* Navigation */}
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                <Icon
                  className={`w-5 h-5 ${active ? "text-gray-900" : item.color}`}
                />
                <span>{item.name}</span>
              </Link>
            );
          })}

          {/* Restaurant Settings Dropdown */}
          <div className="space-y-1">
            <button
              onClick={() =>
                setIsRestaurantSettingsOpen(!isRestaurantSettingsOpen)
              }
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <Cog className="w-5 h-5 text-stone-600" />
                <span>Restaurant Settings</span>
              </div>
              {isRestaurantSettingsOpen ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>

            {isRestaurantSettingsOpen && (
              <div className="ml-6 space-y-1 border-l border-gray-200 pl-4">
                {restaurantSettingsItems.map((subItem) => {
                  const SubIcon = subItem.icon;
                  const subActive = isActive(subItem.href);

                  return (
                    <Link
                      key={subItem.name}
                      href={subItem.href}
                      className={`flex items-center space-x-3 px-2 py-1.5 rounded text-xs transition-colors ${
                        subActive
                          ? "bg-blue-50 text-blue-700"
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                      }`}
                    >
                      <SubIcon className="w-4 h-4" />
                      <span>{subItem.name}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Help Section */}
          <div className="mt-6">
            <button
              onClick={() => setIsHelpOpen(!isHelpOpen)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors text-gray-600 hover:text-gray-900 hover:bg-gray-50`}
            >
              <div className="flex items-center space-x-3">
                <HelpCircle className="w-5 h-5 text-blue-600" />
                <span>Help & Support</span>
              </div>
              {isHelpOpen ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>

            {isHelpOpen && (
              <div className="mt-2 space-y-1 ml-6">
                {helpItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.name}
                      onClick={item.action}
                      className="w-full flex items-start space-x-3 px-2 py-2 rounded text-xs transition-colors text-gray-600 hover:text-gray-900 hover:bg-gray-50 text-left"
                      title={item.description}
                    >
                      <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-gray-500 text-xs mt-0.5">
                          {item.description}
                        </div>
                      </div>
                      <ExternalLink className="w-3 h-3 text-gray-400 ml-auto mt-0.5 flex-shrink-0" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </nav>
      </div>
    </div>
  );
}
