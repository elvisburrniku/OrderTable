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
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Link } from "wouter";
import { 
  Activity, 
  Globe, 
  Search, 
  Filter, 
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  User,
  Clock,
  Shield,
  Eye
} from "lucide-react";
import { motion } from "framer-motion";

export default function ActivityLog() {
  const {
    isLoading: authLoading,
    isAuthenticated,
    user,
    restaurant,
  } = useAuthGuard();

  const [eventFilter, setEventFilter] = useState("all");
  const [loginFilter, setLoginFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(7);
  const [selectedLogDetails, setSelectedLogDetails] = useState<any>(null);

  const { data: activityLog, isLoading } = useQuery({
    queryKey: [
      `/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/activity-log`,
    ],
    enabled: isAuthenticated && !!restaurant && !!restaurant.tenantId,
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-green-500 border-t-transparent"></div>
          <span className="text-gray-500 font-medium">Loading...</span>
        </div>
      </div>
    );
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
      detailedInfo: {
        method: "GET",
        path: `/api/tenants/${restaurant.tenantId}/restaurants/${restaurant.id}/activity-log`,
        statusCode: 200,
        responseTime: 1050,
        bodySize: 2,
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
        referer: `https://956c0aa1-3133-45f4-91e5-7913f55a3c0d-00-1r4pplstshkhm.riker.replit.dev/${restaurant.tenantId}/activity-log`
      }
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
      detailedInfo: {
        method: "POST",
        path: `/api/tenants/${restaurant.tenantId}/restaurants/${restaurant.id}/bookings`,
        statusCode: 201,
        responseTime: 856,
        bodySize: 145,
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
        referer: `https://956c0aa1-3133-45f4-91e5-7913f55a3c0d-00-1r4pplstshkhm.riker.replit.dev/${restaurant.tenantId}/bookings`
      }
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
      detailedInfo: {
        method: "PATCH",
        path: `/api/tenants/${restaurant.tenantId}/restaurants/${restaurant.id}/bookings/123`,
        statusCode: 200,
        responseTime: 634,
        bodySize: 89,
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
        referer: `https://956c0aa1-3133-45f4-91e5-7913f55a3c0d-00-1r4pplstshkhm.riker.replit.dev/${restaurant.tenantId}/booking-manage/123`
      }
    },
  ];

  // Use actual data if available, otherwise use sample data
  const allLogs =
    Array.isArray(activityLog) && activityLog.length > 0
      ? activityLog
      : sampleLogs;

  // Filter logs
  const filteredLogs = allLogs.filter((log: any) => {
    const matchesSearch = !searchTerm || 
      log.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesEvent = eventFilter === "all" || log.eventType === eventFilter;
    const matchesLogin =
      loginFilter === "all" ||
      (loginFilter === "manual" && log.source === "manual") ||
      (loginFilter === "online" && log.source === "online");
    return matchesSearch && matchesEvent && matchesLogin;
  });

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedLogs = filteredLogs.slice(startIndex, endIndex);

  const getEventBadge = (eventType: string) => {
    const badges = {
      login: "bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-medium",
      booking_created: "bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium",
      booking_confirmed: "bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium",
      password_changed: "bg-orange-500 text-white px-2 py-1 rounded-full text-xs font-medium",
      invalid_login: "bg-red-500 text-white px-2 py-1 rounded-full text-xs font-medium"
    };

    const badgeClass = badges[eventType as keyof typeof badges] || "bg-gray-500 text-white px-2 py-1 rounded-full text-xs font-medium";

    return (
      <span className={badgeClass}>
        {eventType.replace('_', ' ')}
      </span>
    );
  };

  const getSourceBadge = (source: string) => {
    const colors = {
      manual: "bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-medium",
      online: "bg-purple-500 text-white px-2 py-1 rounded-full text-xs font-medium",
      google: "bg-orange-500 text-white px-2 py-1 rounded-full text-xs font-medium"
    };
    return (
      <span className={colors[source as keyof typeof colors] || "bg-gray-500 text-white px-2 py-1 rounded-full text-xs font-medium"}>
        {source}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-lg shadow"
        >
          {/* Header */}
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <motion.h1 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-2xl font-bold text-gray-900 flex items-center gap-2"
              >
                <Activity className="h-6 w-6 text-green-600" />
                Activity Log
              </motion.h1>
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Link href={`/${restaurant.tenantId}/global-activity-log`}>
                  <Button variant="outline" className="flex items-center gap-2 hover:bg-green-50 hover:border-green-500 transition-all duration-200">
                    <Globe className="h-4 w-4" />
                    View All Restaurants
                  </Button>
                </Link>
              </motion.div>
            </div>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-gray-600 mt-2"
            >
              Monitor your restaurant's performance and activity trends for {restaurant.name}
            </motion.p>
          </div>

          {/* Filters Section */}
          <div className="p-6 border-b">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="space-y-6"
            >
              {/* Filter Controls Bar */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Collapsible open={showFilters} onOpenChange={setShowFilters}>
                    <CollapsibleTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="h-10 px-4 border-2 border-gray-200 hover:border-green-500 hover:bg-green-50 transition-all duration-200 flex items-center space-x-2 font-medium"
                      >
                        <Filter className="w-4 h-4" />
                        <span>Filters</span>
                        {(eventFilter !== 'all' || loginFilter !== 'all' || searchTerm) && (
                          <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full ml-1">
                            {[eventFilter !== 'all', loginFilter !== 'all', searchTerm].filter(Boolean).length}
                          </span>
                        )}
                        <ChevronDown className={`w-4 h-4 transform transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`} />
                      </Button>
                    </CollapsibleTrigger>

                    <CollapsibleContent className="mt-4">
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                        className="bg-gray-50 rounded-xl p-6 border-2 border-gray-100"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Search Input */}
                          <div className="relative">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                            <div className="relative">
                              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                              <Input
                                placeholder="Search by user, event, or details..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 h-11 border-2 border-gray-200 focus:border-green-500 focus:ring-0 rounded-lg transition-all duration-200"
                              />
                            </div>
                          </div>

                          {/* Event Filter */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Event Type</label>
                            <Select value={eventFilter} onValueChange={setEventFilter}>
                              <SelectTrigger className="h-11 border-2 border-gray-200 focus:border-green-500 rounded-lg transition-all duration-200">
                                <SelectValue placeholder="All Events" />
                              </SelectTrigger>
                              <SelectContent className="rounded-lg border-2 border-gray-200">
                                <SelectItem value="all" className="rounded-md">All Events</SelectItem>
                                <SelectItem value="login" className="rounded-md">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                    <span>Login</span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="booking_created" className="rounded-md">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    <span>New booking</span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="booking_confirmed" className="rounded-md">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    <span>Booking confirmed</span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="password_changed" className="rounded-md">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                                    <span>Password changed</span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="invalid_login" className="rounded-md">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                    <span>Invalid login</span>
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Login Source Filter */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Source</label>
                            <Select value={loginFilter} onValueChange={setLoginFilter}>
                              <SelectTrigger className="h-11 border-2 border-gray-200 focus:border-green-500 rounded-lg transition-all duration-200">
                                <SelectValue placeholder="All Sources" />
                              </SelectTrigger>
                              <SelectContent className="rounded-lg border-2 border-gray-200">
                                <SelectItem value="all" className="rounded-md">All Sources</SelectItem>
                                <SelectItem value="manual" className="rounded-md">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                    <span>Manual</span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="online" className="rounded-md">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                    <span>Online</span>
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Filter Actions */}
                        {(eventFilter !== 'all' || loginFilter !== 'all' || searchTerm) && (
                          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                              <span>Active filters:</span>
                              {searchTerm && (
                                <span className="bg-green-100 text-green-800 px-2 py-1 rounded-md text-xs font-medium">
                                  Search: "{searchTerm}"
                                </span>
                              )}
                              {eventFilter !== 'all' && (
                                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-xs font-medium">
                                  Event: {eventFilter.replace('_', ' ')}
                                </span>
                              )}
                              {loginFilter !== 'all' && (
                                <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-md text-xs font-medium">
                                  Source: {loginFilter}
                                </span>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSearchTerm("");
                                setEventFilter("all");
                                setLoginFilter("all");
                              }}
                              className="text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                            >
                              Clear all
                            </Button>
                          </div>
                        )}
                      </motion.div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              </div>
            </motion.div>

            {/* Enhanced Table */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="bg-white rounded-xl border-2 border-gray-100 overflow-hidden shadow-sm mt-6"
            >
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left py-4 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Event ID
                      </th>
                      <th className="text-left py-4 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Timestamp
                      </th>
                      <th className="text-left py-4 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Source
                      </th>
                      <th className="text-left py-4 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Event Type
                      </th>
                      <th className="text-left py-4 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="text-center py-4 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {isLoading ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center">
                          <div className="flex flex-col items-center space-y-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-2 border-green-500 border-t-transparent"></div>
                            <span className="text-gray-500 font-medium">Loading activity log...</span>
                          </div>
                        </td>
                      </tr>
                    ) : paginatedLogs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center">
                          <div className="flex flex-col items-center space-y-4">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                              <Activity className="w-8 h-8 text-gray-400" />
                            </div>
                            <div>
                              <h3 className="text-gray-900 font-medium">No activity found</h3>
                              <p className="text-gray-500 text-sm mt-1">Try adjusting your filters or search terms</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      paginatedLogs.map((log: any, index: number) => (
                        <motion.tr 
                          key={log.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                          className={`group hover:bg-blue-50 transition-all duration-200 ${
                            index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                          }`}
                        >
                          <td className="py-4 px-6">
                            <span className="text-blue-600 font-semibold text-sm bg-blue-50 px-3 py-1.5 rounded-md">
                              #{log.id}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center space-x-2">
                              <Clock className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-gray-900">{log.createdAt}</span>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            {getSourceBadge(log.source)}
                          </td>
                          <td className="py-4 px-6">
                            {getEventBadge(log.eventType)}
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
                                <User className="w-4 h-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="font-medium text-gray-900 truncate">{log.userEmail}</div>
                                <div className="text-sm text-gray-500 truncate">{log.description}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  className="h-8 w-8 p-0 hover:bg-blue-100 hover:text-blue-600 transition-colors duration-200"
                                  onClick={() => setSelectedLogDetails(log)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                                <DialogHeader>
                                  <DialogTitle className="flex items-center gap-2">
                                    <Activity className="h-5 w-5 text-green-600" />
                                    Activity Details - #{log.id}
                                  </DialogTitle>
                                </DialogHeader>
                                <div className="space-y-6">
                                  {/* Basic Info */}
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                      <h4 className="font-medium text-gray-900">Basic Information</h4>
                                      <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                                        <div className="flex justify-between">
                                          <span className="text-sm text-gray-600">Event ID:</span>
                                          <span className="text-sm font-medium">#{log.id}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-sm text-gray-600">Timestamp:</span>
                                          <span className="text-sm font-medium">{log.createdAt}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-sm text-gray-600">User:</span>
                                          <span className="text-sm font-medium">{log.userEmail}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-sm text-gray-600">Event Type:</span>
                                          <span className="text-sm">{getEventBadge(log.eventType)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-sm text-gray-600">Source:</span>
                                          <span className="text-sm">{getSourceBadge(log.source)}</span>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <div className="space-y-2">
                                      <h4 className="font-medium text-gray-900">Restaurant Context</h4>
                                      <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                                        <div className="flex justify-between">
                                          <span className="text-sm text-gray-600">Tenant ID:</span>
                                          <span className="text-sm font-medium">{restaurant.tenantId}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-sm text-gray-600">Restaurant ID:</span>
                                          <span className="text-sm font-medium">{restaurant.id}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-sm text-gray-600">Restaurant:</span>
                                          <span className="text-sm font-medium">{restaurant.name}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Technical Details */}
                                  {log.detailedInfo && (
                                    <div className="space-y-2">
                                      <h4 className="font-medium text-gray-900">Technical Details</h4>
                                      <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                                        <pre className="whitespace-pre-wrap">
{JSON.stringify(log.detailedInfo, null, 2)}
                                        </pre>
                                      </div>
                                    </div>
                                  )}

                                  {/* Description */}
                                  <div className="space-y-2">
                                    <h4 className="font-medium text-gray-900">Description</h4>
                                    <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                                      <p className="text-sm text-blue-800">{log.description}</p>
                                      {log.details && (
                                        <p className="text-xs text-blue-600 mt-1">{log.details}</p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </td>
                        </motion.tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>

            {/* Pagination */}
            {totalPages > 1 && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
                className="flex items-center justify-between px-6 py-4 border-t bg-gray-50"
              >
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">Show</span>
                  <Select
                    value={itemsPerPage.toString()}
                    onValueChange={(value) => {
                      setItemsPerPage(parseInt(value));
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="w-16 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-gray-600">entries</span>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="text-sm text-gray-600">
                    {startIndex + 1}-{Math.min(endIndex, filteredLogs.length)} of {filteredLogs.length}
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="px-3 py-1 h-8 text-sm"
                    >
                      First
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="w-8 h-8 p-0"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>

                    {/* Page Numbers */}
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage <= 2) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 1) {
                          pageNum = totalPages - 2 + i;
                        } else {
                          pageNum = currentPage - 1 + i;
                        }

                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(pageNum)}
                            className={`w-8 h-8 p-0 ${
                              currentPage === pageNum 
                                ? "bg-green-600 hover:bg-green-700 text-white" 
                                : "hover:bg-green-50"
                            }`}
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="w-8 h-8 p-0"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 h-8 text-sm"
                    >
                      Last
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}