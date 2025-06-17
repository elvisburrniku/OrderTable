import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth, useAuthGuard } from "@/lib/auth.tsx";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Activity, Globe } from "lucide-react";

export default function ActivityLog() {
  const {
    isLoading: authLoading,
    isAuthenticated,
    user,
    restaurant,
  } = useAuthGuard();
  const [eventFilter, setEventFilter] = useState("all");
  const [loginFilter, setLoginFilter] = useState("all");

  const { data: activityLog, isLoading } = useQuery({
    queryKey: [
      `/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/activity-log`,
    ],
    enabled: isAuthenticated && !!restaurant && !!restaurant.tenantId,
  });

  if (authLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated || !user || !restaurant) {
    return null;
  }

  // Sample data based on restaurant activity - this would come from your backend
  const sampleLogs = [
    {
      id: "13581210",
      createdAt: "02/06/2025 15:40:20",
      source: "manual",
      eventType: "login",
      description: "Login (manual)",
      userEmail: user.email,
      details: "95.91.187.122.150",
      restaurantId: restaurant.id,
    },
    {
      id: "13581297",
      createdAt: "02/06/2025 15:40:13",
      source: "manual",
      eventType: "booking_created",
      description: "New booking created",
      userEmail: user.email,
      details: `Booking for ${restaurant.name}`,
      restaurantId: restaurant.id,
    },
    {
      id: "13581253",
      createdAt: "02/06/2025 15:40:47",
      source: "manual",
      eventType: "booking_confirmed",
      description: "Booking confirmed",
      userEmail: user.email,
      details: `Table booking confirmed for ${restaurant.name}`,
      restaurantId: restaurant.id,
    },
  ];

  // Use actual data if available, otherwise use sample data
  const allLogs =
    Array.isArray(activityLog) && activityLog.length > 0
      ? activityLog
      : sampleLogs;

  const filteredLogs = allLogs.filter((log: any) => {
    const matchesEvent = eventFilter === "all" || log.eventType === eventFilter;
    const matchesLogin =
      loginFilter === "all" ||
      (loginFilter === "manual" && log.source === "manual") ||
      (loginFilter === "online" && log.source === "online");
    return matchesEvent && matchesLogin;
  });

  const getEventBadge = (eventType: string) => {
    switch (eventType) {
      case "login":
        return <Badge className="bg-blue-100 text-blue-800">Login</Badge>;
      case "booking_created":
        return (
          <Badge className="bg-green-100 text-green-800">New booking</Badge>
        );
      case "booking_confirmed":
        return (
          <Badge className="bg-green-100 text-green-800">
            Booking confirmed
          </Badge>
        );
      case "password_changed":
        return (
          <Badge className="bg-orange-100 text-orange-800">
            Password changed
          </Badge>
        );
      case "invalid_login":
        return <Badge className="bg-red-100 text-red-800">Invalid login</Badge>;
      default:
        return <Badge variant="outline">{eventType}</Badge>;
    }
  };

  const displayLogs = filteredLogs;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <div className="p-6">
        <div className="bg-white rounded-lg shadow">
          {/* Header */}
          <div className="p-6 border-b">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                <h2 className="text-lg font-semibold">Activity Log - {restaurant.name}</h2>
              </div>
              <Link href={`/${restaurant.tenantId}/global-activity-log`}>
                <Button variant="outline" className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  View All Restaurants
                </Button>
              </Link>
            </div>

            {/* Filters */}
            <div className="flex items-center space-x-4 mb-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Event:
                </label>
                <Select value={eventFilter} onValueChange={setEventFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="login">Login</SelectItem>
                    <SelectItem value="booking_created">New booking</SelectItem>
                    <SelectItem value="booking_confirmed">
                      Booking confirmed
                    </SelectItem>
                    <SelectItem value="password_changed">
                      Password changed
                    </SelectItem>
                    <SelectItem value="invalid_login">Invalid login</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Booking#:
                </label>
                <Select>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Login:
                </label>
                <Select value={loginFilter} onValueChange={setLoginFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end space-x-2">
                <Button className="bg-green-600 hover:bg-green-700 text-white">
                  Update
                </Button>
                <Button
                  variant="outline"
                  className="flex items-center space-x-1"
                >
                  <span>📄</span>
                  <span>Print</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">
                    Event#
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">
                    Created
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">
                    Source
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">
                    Event
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">
                    Login
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-500">
                      Loading activity log...
                    </td>
                  </tr>
                ) : displayLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-500">
                      No activity found
                    </td>
                  </tr>
                ) : (
                  displayLogs.map((log: any) => (
                    <tr
                      key={log.id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="py-3 px-4 text-sm">{log.id}</td>
                      <td className="py-3 px-4 text-sm">{log.createdAt}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-800">
                          {log.source}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {getEventBadge(log.eventType)}
                      </td>
                      <td className="py-3 px-4">{log.userEmail}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {log.details}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="p-4 border-t flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {displayLogs.length} events
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">1</span>
                <div className="flex space-x-1">
                  <Button variant="outline" size="sm">
                    20
                  </Button>
                  <span className="text-sm text-gray-600">
                    results per page
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
