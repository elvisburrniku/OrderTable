import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { MenuManagement } from "@/components/menu-management";
import SeasonalMenuThemes from "@/components/seasonal-menu-themes";
import PrintableMenu from "@/components/printable-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UtensilsCrossed, Sparkles, Printer } from "lucide-react";

export default function MenuManagementPage() {
  const { restaurant } = useAuth();

  if (!restaurant) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p>Restaurant not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Tabs defaultValue="menu" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="menu" className="flex items-center gap-2">
            <UtensilsCrossed className="h-4 w-4" />
            Menu Management
          </TabsTrigger>
          <TabsTrigger value="themes" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            AI Seasonal Themes
          </TabsTrigger>
          <TabsTrigger value="print" className="flex items-center gap-2">
            <Printer className="h-4 w-4" />
            Print Designer
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="menu" className="mt-6">
          <MenuManagement 
            restaurantId={restaurant.id} 
            tenantId={restaurant.tenantId} 
          />
        </TabsContent>
        
        <TabsContent value="themes" className="mt-6">
          <SeasonalMenuThemes 
            restaurantId={restaurant.id} 
            tenantId={restaurant.tenantId} 
          />
        </TabsContent>
        
        <TabsContent value="print" className="mt-6">
          <PrintableMenu 
            restaurantId={restaurant.id} 
            tenantId={restaurant.tenantId} 
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}