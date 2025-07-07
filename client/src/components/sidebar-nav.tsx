import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/language-context";
import {
  LayoutDashboard,
  Calendar,
  Users,
  Utensils,
  TableProperties,
  ChefHat,
  Settings,
  BarChart3,
  MessageSquare,
  CreditCard,
  Store,
  FileText,
  Activity,
  MapPin,
  Bell,
  Users2,
  Shield,
  Palette,
  Globe,
  Calendar as CalendarIcon,
  Target,
  Layers,
  Building2,
  CheckSquare,
} from "lucide-react";

interface SidebarNavProps {
  className?: string;
}

export function SidebarNav({ className }: SidebarNavProps) {
  const [location] = useLocation();
  const { t } = useLanguage();

  const navigationItems = [
    { 
      href: "/dashboard", 
      icon: LayoutDashboard, 
      label: t('nav.dashboard'),
      active: location === "/dashboard" 
    },
    { 
      href: "/bookings", 
      icon: Calendar, 
      label: t('nav.bookings'),
      active: location.startsWith("/bookings") 
    },
    { 
      href: "/customers", 
      icon: Users, 
      label: t('nav.customers'),
      active: location === "/customers" 
    },
    { 
      href: "/menu", 
      icon: Utensils, 
      label: t('nav.menu'),
      active: location === "/menu" 
    },
    { 
      href: "/tables", 
      icon: TableProperties, 
      label: t('nav.tables'),
      active: location === "/tables" 
    },
    { 
      href: "/kitchen", 
      icon: ChefHat, 
      label: t('nav.kitchen'),
      active: location === "/kitchen" 
    },
    { 
      href: "/settings", 
      icon: Settings, 
      label: t('nav.settings'),
      active: location === "/settings" 
    },
  ];

  return (
    <nav className={cn("space-y-2", className)}>
      {navigationItems.map((item) => (
        <Link key={item.href} href={item.href}>
          <div
            className={cn(
              "flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              item.active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <item.icon className="h-4 w-4" />
            <span>{item.label}</span>
          </div>
        </Link>
      ))}
    </nav>
  );
}