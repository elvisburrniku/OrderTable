import { Bell, User } from "lucide-react";

interface NotificationIndicatorProps {
  className?: string;
}

export function NotificationIndicator({ className = "" }: NotificationIndicatorProps) {
  return (
    <div className={`flex items-center space-x-6 ${className}`}>
      {/* Notification Bell with Green Dot */}
      <div className="relative">
        <div className="flex items-center justify-center w-10 h-10 bg-gray-50 border border-gray-200 rounded-lg shadow-sm hover:bg-gray-100 transition-all cursor-pointer">
          <Bell className="w-5 h-5 text-gray-700" />
        </div>
        {/* Green dot indicator */}
        <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white shadow-sm"></div>
      </div>
      
      {/* User Profile Icon */}
      <div className="flex items-center justify-center w-8 h-8 bg-gray-200 rounded-full hover:bg-gray-300 transition-colors cursor-pointer">
        <User className="w-4 h-4 text-gray-600" />
      </div>
    </div>
  );
}