import { useState } from "react";
import { Bell, User, Settings, CreditCard, HelpCircle, LogOut, User as UserIcon } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";

interface NotificationIndicatorProps {
  className?: string;
}

export function NotificationIndicator({ className = "" }: NotificationIndicatorProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();

  // Extract tenant ID from URL
  const location = window.location.pathname;
  const tenantMatch = location.match(/^\/(\d+)/);
  const tenantId = tenantMatch ? parseInt(tenantMatch[1]) : 1;

  // Fetch notifications
  const { data: notifications } = useQuery<any[]>({
    queryKey: [`/api/tenants/${tenantId}/restaurants/1/notifications`],
    enabled: !!tenantId && !!user,
  });

  // Don't render if user is not authenticated
  if (!user) {
    return null;
  }

  const handleLogout = async () => {
    await logout();
    setLocation('/login');
  };

  const handleProfileClick = () => {
    setLocation(`/${tenantId}/profile`);
    setShowUserMenu(false);
  };

  const handleSettingsClick = () => {
    setLocation(`/${tenantId}/settings`);
    setShowUserMenu(false);
  };

  const handleBillingClick = () => {
    setLocation(`/${tenantId}/billing`);
    setShowUserMenu(false);
  };

  return (
    <div className={`flex items-center space-x-6 relative ${className}`}>
      {/* Notification Bell with Green Dot */}
      <div className="relative">
        <button
          onClick={() => setShowNotifications(!showNotifications)}
          className="flex items-center justify-center w-10 h-10 bg-gray-50 border border-gray-200 rounded-lg shadow-sm hover:bg-gray-100 transition-all"
        >
          <Bell className="w-5 h-5 text-gray-700" />
        </button>
        {/* Green dot indicator */}
        <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white shadow-sm"></div>
        
        {/* Notifications Dropdown */}
        {showNotifications && (
          <div className="absolute right-0 top-12 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
                <button
                  onClick={() => setShowNotifications(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {notifications?.length || 0} total
              </p>
            </div>
            <div className="p-4">
              {!notifications || notifications.length === 0 ? (
                <div className="text-center py-8">
                  <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h4 className="text-gray-500 font-medium">No notifications yet</h4>
                  <p className="text-gray-400 text-sm">You'll see booking updates here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.map((notification, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-900">{notification.message}</p>
                      <p className="text-xs text-gray-500 mt-1">{notification.createdAt}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* User Profile Icon */}
      <div className="relative">
        <button
          onClick={() => setShowUserMenu(!showUserMenu)}
          className="flex items-center justify-center w-8 h-8 bg-gray-200 rounded-full hover:bg-gray-300 transition-colors"
        >
          <User className="w-4 h-4 text-gray-600" />
        </button>
        
        {/* User Menu Dropdown */}
        {showUserMenu && (
          <div className="absolute right-0 top-10 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
            <div className="p-3 border-b border-gray-200">
              <p className="font-semibold text-gray-900">{user?.email || 'User'}</p>
            </div>
            <div className="py-2">
              <button
                onClick={handleProfileClick}
                className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <UserIcon className="w-4 h-4 mr-3" />
                Profile
              </button>
              <button
                onClick={handleSettingsClick}
                className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <Settings className="w-4 h-4 mr-3" />
                Settings
              </button>
              <button
                onClick={handleBillingClick}
                className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <CreditCard className="w-4 h-4 mr-3" />
                Billing
              </button>
              <button
                onClick={() => setShowUserMenu(false)}
                className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <HelpCircle className="w-4 h-4 mr-3" />
                Help
              </button>
              <hr className="my-2" />
              <button
                onClick={handleLogout}
                className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <LogOut className="w-4 h-4 mr-3" />
                Log out
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Click outside to close dropdowns */}
      {(showNotifications || showUserMenu) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowNotifications(false);
            setShowUserMenu(false);
          }}
        />
      )}
    </div>
  );
}