import { useState } from "react";
import { useAuth } from "@/lib/auth";
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
  FileText
} from "lucide-react";

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
      description: "Manage your menu items and categories"
    },
    { 
      value: "themes", 
      label: "AI Seasonal Themes", 
      icon: Sparkles,
      description: "Create seasonal menu themes with AI"
    },
    { 
      value: "print", 
      label: "Print Designer", 
      icon: Printer,
      description: "Design and print beautiful menus"
    }
  ];

  const currentTab = tabOptions.find(tab => tab.value === activeTab);

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
                {currentTab && <currentTab.icon className="w-6 h-6 text-slate-700" />}
                <span>{currentTab?.label || "Menu Management"}</span>
              </h1>
              <p className="text-slate-600">
                {currentTab?.description || "Manage your restaurant menu system"}
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
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="bg-white border border-slate-200 p-1 rounded-lg shadow-sm">
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
              </TabsList>
              
              <div className="mt-8">
                <TabsContent value="menu" className="space-y-6">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                  >
                    <MenuManagement 
                      restaurantId={restaurant.id} 
                      tenantId={restaurant.tenantId} 
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