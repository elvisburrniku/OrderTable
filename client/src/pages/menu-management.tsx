import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth.tsx";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Filter,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { MenuManagement } from "@/components/menu-management";
import SeasonalMenuThemes from "@/components/seasonal-menu-themes";
import PrintableMenu from "@/components/printable-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  UtensilsCrossed,
  Sparkles,
  Printer,
  RefreshCw,
  ChefHat,
  Palette,
  FileText,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

export default function MenuManagementPage() {
  const { restaurant } = useAuth();
  const [activeTab, setActiveTab] = useState("menu");

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-500">Restaurant not found</p>
        </div>
      </div>
    );
  }

  const tabOptions = [
    {
      value: "menu",
      label: "Menu Management",
      icon: UtensilsCrossed,
      description: "Manage your menu items and categories",
    },
    {
      value: "themes",
      label: "AI Seasonal Themes",
      icon: Sparkles,
      description: "Create seasonal menu themes with AI",
    },
    {
      value: "print",
      label: "Print Designer",
      icon: Printer,
      description: "Design and print beautiful menus",
    },
  ];

  const currentTab = tabOptions.find((tab) => tab.value === activeTab);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: "", description: "" });
  const [newItem, setNewItem] = useState({
    name: "",
    description: "",
    price: "",
    categoryId: "",
    preparationTime: "",
    isAvailable: true,
  });

  // Filter and pagination state
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [priceRangeFilter, setPriceRangeFilter] = useState("all");
  const [availabilityFilter, setAvailabilityFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const { data: categories = [] } = useQuery({
    queryKey: [
      `/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/menu-categories`,
    ],
    enabled: !!restaurant,
  });

  const { data: items = [] } = useQuery({
    queryKey: [
      `/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/menu-items`,
    ],
    enabled: !!restaurant,
  });

  // Filter items
  const filteredItems = items.filter((item: any) => {
    const matchesSearch =
      !searchTerm ||
      item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      categoryFilter === "all" ||
      item.categoryId?.toString() === categoryFilter;

    const itemPrice = parseFloat(item.price) || 0;
    const matchesPriceRange =
      priceRangeFilter === "all" ||
      (priceRangeFilter === "0-5" && itemPrice <= 5) ||
      (priceRangeFilter === "5-10" && itemPrice > 5 && itemPrice <= 10) ||
      (priceRangeFilter === "10-20" && itemPrice > 10 && itemPrice <= 20) ||
      (priceRangeFilter === "20+" && itemPrice > 20);

    const matchesAvailability =
      availabilityFilter === "all" ||
      (availabilityFilter === "available" && item.isAvailable) ||
      (availabilityFilter === "unavailable" && !item.isAvailable);

    return (
      matchesSearch &&
      matchesCategory &&
      matchesPriceRange &&
      matchesAvailability
    );
  });

  // Pagination
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedItems = filteredItems.slice(startIndex, endIndex);

  // Active filters count
  const activeFiltersCount = [
    searchTerm,
    categoryFilter !== "all" ? categoryFilter : null,
    priceRangeFilter !== "all" ? priceRangeFilter : null,
    availabilityFilter !== "all" ? availabilityFilter : null,
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-slate-50 bg-white">
      {/* Header */}
      <motion.div
        className="bg-white border-b border-slate-200"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold text-slate-900 flex items-center space-x-3">
                {currentTab && (
                  <currentTab.icon className="w-6 h-6 text-slate-700" />
                )}
                <span>{currentTab?.label || "Menu Management"}</span>
              </h1>
              <p className="text-slate-600">
                {currentTab?.description ||
                  "Manage your restaurant menu system"}
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
                className="text-slate-600 border-slate-200"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="p-6">
        <div className="space-y-8">
          {/* Tab Navigation */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              {/* <TabsList className="bg-white border border-slate-200 p-1 rounded-lg shadow-sm">
                {tabOptions.map((tab) => (
                  <TabsTrigger 
                    key={tab.value}
                    value={tab.value} 
                    className="flex items-center gap-2 data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 text-slate-600 px-4 py-2 rounded-md transition-all duration-200"
                  >
                    <tab.icon className="h-4 w-4" />
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList> */}

              <div className="mt-8">
                <TabsContent value="menu" className="space-y-6">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                  >
                    {/* Filters Section */}
                    <div className="space-y-6 mb-8">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <Collapsible
                            open={showFilters}
                            onOpenChange={setShowFilters}
                          >
                            <CollapsibleTrigger asChild>
                              <Button
                                variant="outline"
                                className="h-10 px-4 border-2 border-gray-200 hover:border-green-500 hover:bg-green-50 transition-all duration-200 flex items-center space-x-2"
                              >
                                <Filter className="w-4 h-4" />
                                <span>Filters</span>
                                {activeFiltersCount > 0 && (
                                  <div className="bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center ml-2">
                                    {activeFiltersCount}
                                  </div>
                                )}
                                <ChevronDown
                                  className={`w-4 h-4 transition-transform duration-200 ${showFilters ? "rotate-180" : ""}`}
                                />
                              </Button>
                            </CollapsibleTrigger>

                            <CollapsibleContent className="mt-4">
                              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                  {/* Search */}
                                  <div className="space-y-2">
                                    <Label className="text-sm font-medium text-gray-700">
                                      Search
                                    </Label>
                                    <div className="relative">
                                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                                      <Input
                                        placeholder="Search items..."
                                        value={searchTerm}
                                        onChange={(e) =>
                                          setSearchTerm(e.target.value)
                                        }
                                        className="pl-10 h-10 bg-white border-gray-300 focus:border-green-500 focus:ring-green-500"
                                      />
                                    </div>
                                  </div>

                                  {/* Category Filter */}
                                  <div className="space-y-2">
                                    <Label className="text-sm font-medium text-gray-700">
                                      Category
                                    </Label>
                                    <Select
                                      value={categoryFilter}
                                      onValueChange={setCategoryFilter}
                                    >
                                      <SelectTrigger className="h-10 bg-white border-gray-300 focus:border-green-500 focus:ring-green-500">
                                        <SelectValue placeholder="All categories" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="all">
                                          All categories
                                        </SelectItem>
                                        {categories.map((category: any) => (
                                          <SelectItem
                                            key={category.id}
                                            value={category.id.toString()}
                                          >
                                            {category.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  {/* Price Range Filter */}
                                  <div className="space-y-2">
                                    <Label className="text-sm font-medium text-gray-700">
                                      Price Range
                                    </Label>
                                    <Select
                                      value={priceRangeFilter}
                                      onValueChange={setPriceRangeFilter}
                                    >
                                      <SelectTrigger className="h-10 bg-white border-gray-300 focus:border-green-500 focus:ring-green-500">
                                        <SelectValue placeholder="All prices" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="all">
                                          All prices
                                        </SelectItem>
                                        <SelectItem value="0-5">
                                          €0 - €5
                                        </SelectItem>
                                        <SelectItem value="5-10">
                                          €5 - €10
                                        </SelectItem>
                                        <SelectItem value="10-20">
                                          €10 - €20
                                        </SelectItem>
                                        <SelectItem value="20+">
                                          €20+
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  {/* Availability Filter */}
                                  <div className="space-y-2">
                                    <Label className="text-sm font-medium text-gray-700">
                                      Availability
                                    </Label>
                                    <Select
                                      value={availabilityFilter}
                                      onValueChange={setAvailabilityFilter}
                                    >
                                      <SelectTrigger className="h-10 bg-white border-gray-300 focus:border-green-500 focus:ring-green-500">
                                        <SelectValue placeholder="All items" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="all">
                                          All items
                                        </SelectItem>
                                        <SelectItem value="available">
                                          Available
                                        </SelectItem>
                                        <SelectItem value="unavailable">
                                          Unavailable
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>

                                {/* Active Filters Display */}
                                {activeFiltersCount > 0 && (
                                  <div className="mt-6 pt-4 border-t border-gray-200">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center space-x-2">
                                        <span className="text-sm font-medium text-gray-700">
                                          Active filters:
                                        </span>
                                        <div className="flex items-center space-x-2">
                                          {searchTerm && (
                                            <Badge className="px-2 py-1 text-xs bg-green-100 text-green-800 border-green-200">
                                              Search: {searchTerm}
                                            </Badge>
                                          )}
                                          {categoryFilter !== "all" && (
                                            <Badge className="px-2 py-1 text-xs bg-blue-100 text-blue-800 border-blue-200">
                                              Category:{" "}
                                              {
                                                categories.find(
                                                  (c: any) =>
                                                    c.id.toString() ===
                                                    categoryFilter,
                                                )?.name
                                              }
                                            </Badge>
                                          )}
                                          {priceRangeFilter !== "all" && (
                                            <Badge className="px-2 py-1 text-xs bg-purple-100 text-purple-800 border-purple-200">
                                              Price: {priceRangeFilter}
                                            </Badge>
                                          )}
                                          {availabilityFilter !== "all" && (
                                            <Badge className="px-2 py-1 text-xs bg-orange-100 text-orange-800 border-orange-200">
                                              Status: {availabilityFilter}
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          setSearchTerm("");
                                          setCategoryFilter("all");
                                          setPriceRangeFilter("all");
                                          setAvailabilityFilter("all");
                                          setCurrentPage(1);
                                        }}
                                        className="text-xs px-3 py-1 border-gray-300 hover:bg-gray-50"
                                      >
                                        Clear all
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        </div>
                      </div>
                    </div>

                    <MenuManagement
                      restaurantId={restaurant.id}
                      tenantId={restaurant.tenantId}
                      searchTerm={searchTerm}
                      categoryFilter={categoryFilter}
                      priceRangeFilter={priceRangeFilter}
                      availabilityFilter={availabilityFilter}
                      currentPage={currentPage}
                      itemsPerPage={itemsPerPage}
                      setCurrentPage={setCurrentPage}
                      setItemsPerPage={setItemsPerPage}
                    />
                  </motion.div>
                </TabsContent>

                <TabsContent value="themes" className="space-y-6">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                  >
                    <SeasonalMenuThemes
                      restaurantId={restaurant.id}
                      tenantId={restaurant.tenantId}
                    />
                  </motion.div>
                </TabsContent>

                <TabsContent value="print" className="space-y-6">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                  >
                    <PrintableMenu
                      restaurantId={restaurant.id}
                      tenantId={restaurant.tenantId}
                    />
                  </motion.div>
                </TabsContent>
              </div>
            </Tabs>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
