import { NavigationSidebar } from "./navigation-sidebar";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen">
      <NavigationSidebar />
      <div className="flex-1 bg-gray-50 dark:bg-gray-900">
        {children}
      </div>
    </div>
  );
}