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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Clock, User, MapPin, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function GlobalActivityLog() {
  const {
    isLoading: authLoading,
    isAuthenticated,
    user,
    restaurant,
  } = useAuthGuard();
  const [eventFilter, setEventFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [restaurantFilter, setRestaurantFilter] = useState("all");

  const { data: activityLog, isLoading } = useQuery({
    queryKey: [`/api/tenants/${restaurant?.tenantId}/activity-log`],
    enabled: isAuthenticated && !!restaurant && !!restaurant.tenantId,
  });

  if (authLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated || !user || !restaurant) {
    return null;
  }

  const allLogs = Array.isArray(activityLog) ? activityLog : [];

  // Get unique restaurants for filter
  const uniqueRestaurants = Array.from(
    new Set(allLogs.map((log: any) => log.restaurantName).filter(Boolean))
  );

  const filteredLogs = allLogs.filter((log: any) => {
    const matchesEvent = eventFilter === "all" || log.eventType === eventFilter;
    const matchesSource = sourceFilter === "all" || log.source === sourceFilter;
    const matchesRestaurant = restaurantFilter === "all" || log.restaurantName === restaurantFilter;
    return matchesEvent && matchesSource && matchesRestaurant;
  });

  const displayLogs = filteredLogs.slice(0, 50); // Limit to 50 entries

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
    } catch {
      return dateString;
    }
  };

  const getEventBadgeColor = (eventType: string) => {
    switch (eventType) {
      case "login":
      case "logout":
        return "bg-blue-100 text-blue-800";
      case "booking_created":
      case "booking_updated":
        return "bg-green-100 text-green-800";
      case "guest_feedback_submit":
        return "bg-purple-100 text-purple-800";
      case "conflict_resolved":
        return "bg-orange-100 text-orange-800";
      case "room_created":
      case "table_created":
        return "bg-indigo-100 text-indigo-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getSourceBadgeColor = (source: string) => {
    switch (source) {
      case "manual":
        return "bg-blue-100 text-blue-800";
      case "guest_form":
        return "bg-green-100 text-green-800";
      case "qr_code":
      case "qr_code_guest_form":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Global Activity Log - All Restaurants
              </CardTitle>
              <p className="text-sm text-gray-600">
                View activities across all restaurants in your account
              </p>
            </div>
            <Link href={`/${restaurant.tenantId}/activity-log`}>
              <Button variant="outline" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Restaurant Log
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filter Controls */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Event Type
              </label>
              <Select value={eventFilter} onValueChange={setEventFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Events</SelectItem>
                  <SelectItem value="login">Login</SelectItem>
                  <SelectItem value="logout">Logout</SelectItem>
                  <SelectItem value="booking_created">Booking Created</SelectItem>
                  <SelectItem value="booking_updated">Booking Updated</SelectItem>
                  <SelectItem value="guest_feedback_submit">Guest Feedback</SelectItem>
                  <SelectItem value="conflict_resolved">Conflict Resolved</SelectItem>
                  <SelectItem value="room_created">Room Created</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Source
              </label>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="guest_form">Guest Form</SelectItem>
                  <SelectItem value="qr_code_guest_form">QR Code</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Restaurant
              </label>
              <Select value={restaurantFilter} onValueChange={setRestaurantFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Restaurants</SelectItem>
                  {uniqueRestaurants.map((restaurant) => (
                    <SelectItem key={restaurant} value={restaurant}>
                      {restaurant}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setEventFilter("all");
                  setSourceFilter("all");
                  setRestaurantFilter("all");
                }}
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          </div>

          {/* Statistics */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Total Activities</span>
              </div>
              <p className="text-2xl font-bold text-blue-600">{allLogs.length}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-900">Restaurants</span>
              </div>
              <p className="text-2xl font-bold text-green-600">{uniqueRestaurants.length}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-900">Filtered Results</span>
              </div>
              <p className="text-2xl font-bold text-purple-600">{filteredLogs.length}</p>
            </div>
          </div>

          {/* Activity Table */}
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
                    Restaurant
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">
                    Source
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">
                    Event
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">
                    User/Guest
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-500">
                      Loading global activity log...
                    </td>
                  </tr>
                ) : displayLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-500">
                      No activity found
                    </td>
                  </tr>
                ) : (
                  displayLogs.map((log: any) => (
                    <tr key={log.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm text-gray-900">
                        #{log.id}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(log.createdAt)}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-gray-400" />
                          <span className="font-medium text-gray-900">
                            {log.restaurantName || `Restaurant ${log.restaurantId}`}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={getSourceBadgeColor(log.source)}>
                          {log.source}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={getEventBadgeColor(log.eventType)}>
                          {log.eventType}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {log.userEmail || log.guestEmail || log.userLogin || "System"}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600 max-w-xs truncate">
                        {log.description}
                        {log.ipAddress && (
                          <div className="text-xs text-gray-400 mt-1">
                            IP: {log.ipAddress}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {filteredLogs.length > 50 && (
            <div className="mt-4 text-center text-sm text-gray-500">
              Showing first 50 of {filteredLogs.length} results
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}