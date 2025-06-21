import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Clock, 
  Search, 
  Filter, 
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Save,
  RotateCcw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { motion } from "framer-motion";
import { useScrollToTop } from "@/hooks/use-scroll-to-top";

export default function OpeningHours() {
  const { tenantId } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { restaurant } = useAuth();
  const restaurantId = restaurant?.id;

  // Auto scroll to top when page loads
  useScrollToTop();

  // Filter and pagination states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(7);

  const [hours, setHours] = useState([
    { day: "Sunday", enabled: true, open: "09:00", close: "10:00" },
    { day: "Monday", enabled: true, open: "09:00", close: "10:00" },
    { day: "Tuesday", enabled: true, open: "09:00", close: "10:00" },
    { day: "Wednesday", enabled: true, open: "09:00", close: "10:00" },
    { day: "Thursday", enabled: true, open: "09:00", close: "11:00" },
    { day: "Friday", enabled: true, open: "09:00", close: "11:00" },
    { day: "Saturday", enabled: true, open: "05:00", close: "09:00" }
  ]);

  // Load existing opening hours
  const { data: existingHours } = useQuery({
    queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/opening-hours`],
    enabled: !!tenantId,
  });

  // Load existing hours into state when data is available
  useEffect(() => {
    if (existingHours && Array.isArray(existingHours) && existingHours.length > 0) {
      const formattedHours = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day, index) => {
        const existingHour = existingHours.find((h: any) => h.dayOfWeek === index);
        return {
          day,
          enabled: existingHour ? existingHour.isOpen : true,
          open: existingHour ? existingHour.openTime : "09:00",
          close: existingHour ? existingHour.closeTime : "17:00"
        };
      });
      setHours(formattedHours);
    }
  }, [existingHours]);

  // Save opening hours mutation
  const saveHoursMutation = useMutation({
    mutationFn: async () => {
      console.log('Starting save hours mutation...');
      console.log('tenantId:', tenantId);
      console.log('restaurantId:', restaurantId);
      
      if (!tenantId || !restaurantId) {
        throw new Error('Missing tenant ID or restaurant ID');
      }
      
      const hoursData = hours.map((hour, index) => ({
        dayOfWeek: index,
        isOpen: hour.enabled,
        openTime: hour.open,
        closeTime: hour.close,
      }));
      
      console.log('Hours data to save:', hoursData);
      console.log('API URL:', `/api/tenants/${tenantId}/restaurants/${restaurantId}/opening-hours`);
      
      const response = await apiRequest("POST", `/api/tenants/${tenantId}/restaurants/${restaurantId}/opening-hours`, hoursData);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API response not ok:', response.status, errorText);
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Opening hours saved successfully!" });
      // Comprehensive cache invalidation to ensure all components refresh
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const queryKey = query.queryKey as (string | number)[];
          return queryKey.some(key => 
            (typeof key === 'string' && (
              key.includes('opening-hours') ||
              key.includes('openingHours') ||
              key.includes('statistics') ||
              key.includes('dashboard') ||
              key.includes('restaurant') ||
              key.includes(`tenants/${tenantId}`)
            )) ||
            (typeof key === 'number' && key === restaurantId)
          );
        }
      });
      
      // Force refetch specific query keys used by different components
      queryClient.refetchQueries({ 
        queryKey: [`/api/tenants/${tenantId}/restaurants/${restaurantId}/opening-hours`] 
      });
      queryClient.refetchQueries({ 
        queryKey: ["openingHours", restaurantId, parseInt(tenantId)] 
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error saving opening hours",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleDay = (index: number) => {
    setHours(prev => prev.map((hour, i) => 
      i === index ? { ...hour, enabled: !hour.enabled } : hour
    ));
  };

  const updateTime = (index: number, field: 'open' | 'close', value: string) => {
    setHours(prev => prev.map((hour, i) => 
      i === index ? { ...hour, [field]: value } : hour
    ));
  };

  // Filter and pagination logic
  const filteredHours = hours.filter((hour) => {
    const matchesSearch = searchTerm === "" || 
      hour.day.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "open" && hour.enabled) ||
      (statusFilter === "closed" && !hour.enabled);
    
    return matchesSearch && matchesStatus;
  });

  // Pagination for hours
  const totalPages = Math.ceil(filteredHours.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedHours = filteredHours.slice(startIndex, endIndex);

  const resetToDefaults = () => {
    setHours([
      { day: "Sunday", enabled: true, open: "09:00", close: "10:00" },
      { day: "Monday", enabled: true, open: "09:00", close: "10:00" },
      { day: "Tuesday", enabled: true, open: "09:00", close: "10:00" },
      { day: "Wednesday", enabled: true, open: "09:00", close: "10:00" },
      { day: "Thursday", enabled: true, open: "09:00", close: "11:00" },
      { day: "Friday", enabled: true, open: "09:00", close: "11:00" },
      { day: "Saturday", enabled: true, open: "05:00", close: "09:00" }
    ]);
  };

  const applyToAllDays = () => {
    const firstEnabledDay = hours.find(h => h.enabled);
    if (firstEnabledDay) {
      setHours(prev => prev.map(hour => ({
        ...hour,
        open: firstEnabledDay.open,
        close: firstEnabledDay.close,
        enabled: true
      })));
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Main Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-6 w-6 text-green-600" />
            Restaurant Opening Hours
          </CardTitle>
          <CardDescription>
            Set your restaurant's operating hours for each day of the week
          </CardDescription>
        </CardHeader>
        <CardContent>
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Weekly Schedule</h2>

          {/* Modern Filters Section */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="space-y-6 mb-8"
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
                      {(statusFilter !== 'all' || searchTerm) && (
                        <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full ml-1">
                          {[
                            statusFilter !== 'all' ? 1 : 0,
                            searchTerm ? 1 : 0
                          ].reduce((a, b) => a + b, 0)}
                        </span>
                      )}
                      <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`} />
                    </Button>
                  </CollapsibleTrigger>

                  <CollapsibleContent className="mt-4">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                      className="bg-gray-50 rounded-xl p-6 border-2 border-gray-100"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Search Input */}
                        <div className="relative">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                          <div className="relative">
                            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                            <Input
                              placeholder="Search by day..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="pl-10 h-11 border-2 border-gray-200 focus:border-green-500 focus:ring-0 rounded-lg transition-all duration-200"
                            />
                          </div>
                        </div>

                        {/* Status Filter */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                          <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="h-11 border-2 border-gray-200 focus:border-green-500 rounded-lg transition-all duration-200">
                              <SelectValue placeholder="All Days" />
                            </SelectTrigger>
                            <SelectContent className="rounded-lg border-2 border-gray-200">
                              <SelectItem value="all" className="rounded-md">All Days</SelectItem>
                              <SelectItem value="open" className="rounded-md">
                                <div className="flex items-center space-x-2">
                                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                  <span>Open</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="closed" className="rounded-md">
                                <div className="flex items-center space-x-2">
                                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                  <span>Closed</span>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>


                      </div>

                      {/* Filter Actions */}
                      {(statusFilter !== 'all' || searchTerm) && (
                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <span>Active filters:</span>
                            {searchTerm && (
                              <span className="bg-green-100 text-green-800 px-2 py-1 rounded-md text-xs font-medium">
                                Search: "{searchTerm}"
                              </span>
                            )}
                            {statusFilter !== 'all' && (
                              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-xs font-medium">
                                Status: {statusFilter}
                              </span>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSearchTerm("");
                              setStatusFilter("all");
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
                    <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">DAY</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">STATUS</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">OPENING TIME</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">CLOSING TIME</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">HOURS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedHours.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center">
                        <div className="flex flex-col items-center space-y-4">
                          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                            <Clock className="w-8 h-8 text-gray-400" />
                          </div>
                          <div>
                            <h3 className="text-gray-900 font-medium">No days found</h3>
                            <p className="text-gray-500 text-sm mt-1">Try adjusting your filters</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedHours.map((hour, index) => {
                      const originalIndex = hours.findIndex(h => h.day === hour.day);
                      return (
                        <motion.tr 
                          key={hour.day}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                          className={`group hover:bg-blue-50 transition-all duration-200 ${
                            index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                          }`}
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
                                {hour.day.slice(0, 1)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="font-medium text-gray-900">{hour.day}</div>
                                <div className="text-sm text-gray-500">Day {originalIndex + 1} of week</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-2">
                              <Switch
                                checked={hour.enabled}
                                onCheckedChange={() => toggleDay(originalIndex)}
                                className="data-[state=checked]:bg-green-500"
                              />
                              <span className={`text-sm font-medium ${hour.enabled ? 'text-green-600' : 'text-red-600'}`}>
                                {hour.enabled ? 'Open' : 'Closed'}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <input
                              type="time"
                              value={hour.open}
                              onChange={(e) => updateTime(originalIndex, 'open', e.target.value)}
                              disabled={!hour.enabled}
                              className="border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-0 focus:border-green-500 disabled:bg-gray-100 disabled:text-gray-400 transition-all duration-200"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <input
                              type="time"
                              value={hour.close}
                              onChange={(e) => updateTime(originalIndex, 'close', e.target.value)}
                              disabled={!hour.enabled}
                              className="border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-0 focus:border-green-500 disabled:bg-gray-100 disabled:text-gray-400 transition-all duration-200"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-sm text-gray-600">
                              {hour.enabled ? (
                                <>
                                  {(() => {
                                    const openTime = new Date(`1970-01-01T${hour.open}:00`);
                                    const closeTime = new Date(`1970-01-01T${hour.close}:00`);
                                    const diffMs = closeTime.getTime() - openTime.getTime();
                                    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                                    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                                    return `${diffHours}h ${diffMinutes}m`;
                                  })()}
                                </>
                              ) : (
                                <span className="text-gray-400">Closed</span>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })
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
                  </SelectContent>
                </Select>
                <span className="text-sm text-gray-600">days</span>
              </div>

              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-600">
                  {startIndex + 1}-{Math.min(endIndex, filteredHours.length)} of {filteredHours.length}
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
                          className={currentPage === pageNum ? "w-8 h-8 p-0 bg-green-600 hover:bg-green-700 text-white" : "w-8 h-8 p-0 hover:bg-green-50"}
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

          {/* Save Button */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.7 }}
            className="flex justify-end pt-6 border-t border-gray-200 mt-6"
          >
            <Button 
              onClick={() => saveHoursMutation.mutate()}
              disabled={saveHoursMutation.isPending}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 h-11 flex items-center space-x-2 font-medium transition-all duration-200"
            >
              <Save className="w-4 h-4" />
              <span>{saveHoursMutation.isPending ? "Saving..." : "Save Opening Hours"}</span>
            </Button>
          </motion.div>
        </CardContent>
      </Card>
    </div>
  );
}