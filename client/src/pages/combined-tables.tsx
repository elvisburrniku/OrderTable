
import { useState } from "react";
import { useAuthGuard } from "@/lib/auth.tsx";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Trash2, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CombinedTable {
  id: number;
  name: string;
  tableIds: number[] | string;
  totalCapacity: number;
  isActive: boolean;
  createdAt: string;
}

interface Table {
  id: number;
  tableNumber: string;
  capacity: number;
  isActive: boolean;
}

export default function CombinedTables() {
  const { isLoading: authLoading, isAuthenticated, user, restaurant } = useAuthGuard();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCombination, setEditingCombination] = useState<CombinedTable | null>(null);
  const [newCombination, setNewCombination] = useState({
    name: "",
    tableIds: [] as number[],
  });

  // Fetch tables
  const { data: tables = [], isLoading: tablesLoading } = useQuery({
    queryKey: ["tables", restaurant?.id, restaurant?.tenantId],
    queryFn: async () => {
      if (!restaurant?.id || !restaurant?.tenantId) {
        console.log("Missing restaurant ID or tenant ID:", { restaurantId: restaurant?.id, tenantId: restaurant?.tenantId });
        return [];
      }
      const response = await fetch(`/api/tenants/${restaurant.tenantId}/restaurants/${restaurant.id}/tables`);
      if (!response.ok) {
        console.error("Failed to fetch tables:", response.status, response.statusText);
        throw new Error("Failed to fetch tables");
      }
      const data = await response.json();
      console.log("Fetched tables:", data);
      return data;
    },
    enabled: !!restaurant?.id && !!restaurant?.tenantId,
  });

  // Fetch combined tables
  const { data: combinedTables = [], isLoading: combinedTablesLoading } = useQuery({
    queryKey: ["combinedTables", restaurant?.id],
    queryFn: async () => {
      if (!restaurant?.id || !restaurant?.tenantId) return [];
      const response = await fetch(`/api/tenants/${restaurant.tenantId}/restaurants/${restaurant.id}/combined-tables`);
      if (!response.ok) throw new Error("Failed to fetch combined tables");
      return response.json();
    },
    enabled: !!restaurant?.id && !!restaurant?.tenantId,
  });

  // Create combined table mutation
  const createCombinedTableMutation = useMutation({
    mutationFn: async (combinedTableData: any) => {
      if (!restaurant?.id || !restaurant?.tenantId) throw new Error("Missing restaurant or tenant ID");
      const response = await fetch(`/api/tenants/${restaurant.tenantId}/restaurants/${restaurant.id}/combined-tables`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(combinedTableData),
      });
      if (!response.ok) throw new Error("Failed to create combined table");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["combinedTables"] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "Success",
        description: "Combined table created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create combined table",
        variant: "destructive",
      });
    },
  });

  // Update combined table mutation
  const updateCombinedTableMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: any }) => {
      if (!restaurant?.tenantId) throw new Error("Missing tenant ID");
      const response = await fetch(`/api/tenants/${restaurant.tenantId}/combined-tables/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error("Failed to update combined table");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["combinedTables"] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "Success",
        description: "Combined table updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update combined table",
        variant: "destructive",
      });
    },
  });

  // Delete combined table mutation
  const deleteCombinedTableMutation = useMutation({
    mutationFn: async (id: number) => {
      if (!restaurant?.tenantId) throw new Error("Missing tenant ID");
      const response = await fetch(`/api/tenants/${restaurant.tenantId}/combined-tables/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete combined table");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["combinedTables"] });
      toast({
        title: "Success",
        description: "Combined table deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete combined table",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setNewCombination({ name: "", tableIds: [] });
    setEditingCombination(null);
  };

  const handleTableToggle = (tableId: number) => {
    setNewCombination(prev => ({
      ...prev,
      tableIds: prev.tableIds.includes(tableId)
        ? prev.tableIds.filter(id => id !== tableId)
        : [...prev.tableIds, tableId]
    }));
  };

  const handleSubmit = () => {
    if (!newCombination.name.trim() || newCombination.tableIds.length === 0) {
      toast({
        title: "Error",
        description: "Please provide a name and select at least one table",
        variant: "destructive",
      });
      return;
    }

    const totalCapacity = newCombination.tableIds.reduce((sum, tableId) => {
      const table = tables.find(t => t.id === tableId);
      return sum + (table?.capacity || 0);
    }, 0);

    const combinedTableData = {
      name: newCombination.name,
      tableIds: newCombination.tableIds,
      totalCapacity,
    };

    if (editingCombination) {
      updateCombinedTableMutation.mutate({
        id: editingCombination.id,
        updates: combinedTableData
      });
    } else {
      createCombinedTableMutation.mutate(combinedTableData);
    }
  };

  const handleEdit = (combination: CombinedTable) => {
    setEditingCombination(combination);
    const parsedTableIds = typeof combination.tableIds === 'string' 
      ? JSON.parse(combination.tableIds) 
      : combination.tableIds;
    setNewCombination({
      name: combination.name,
      tableIds: parsedTableIds,
    });
    setIsDialogOpen(true);
  };

  const getTableNumbers = (tableIds: number[] | string) => {
    // Parse tableIds if it's a string (from database)
    const ids = typeof tableIds === 'string' ? JSON.parse(tableIds) : tableIds;
    return ids.map((id: number) => {
      const table = tables.find(t => t.id === id);
      return table?.tableNumber || `Table ${id}`;
    }).join(", ");
  };

  if (authLoading || tablesLoading || combinedTablesLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated || !user || !restaurant) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <div className="bg-white border-b">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-6">
            <h1 className="text-xl font-semibold">Combined tables</h1>
            <nav className="flex space-x-6">
              <a href="/dashboard" className="text-gray-600 hover:text-gray-900">Booking</a>
              <a href="#" className="text-green-600 font-medium">CRM</a>
              <a href="#" className="text-gray-600 hover:text-gray-900">Archive</a>
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">{restaurant.name}</span>
            <Button variant="outline" size="sm">Profile</Button>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white border-r min-h-screen">
          <div className="p-6">
            <div className="space-y-1">
              <div className="text-sm font-medium text-gray-900 mb-3">General</div>
              <a href="#" className="block text-sm text-gray-600 hover:text-gray-900 py-1">The place</a>
              <a href="/opening-hours" className="block text-sm text-gray-600 hover:text-gray-900 py-1">Opening hours</a>
              <a href="#" className="block text-sm text-gray-600 hover:text-gray-900 py-1">General opening hours</a>
              <a href="/special-periods" className="block text-sm text-gray-600 hover:text-gray-900 py-1">Special periods</a>
              <a href="/cut-off-time" className="block text-sm text-gray-600 hover:text-gray-900 py-1">Cut-off time</a>

              <div className="text-sm font-medium text-gray-900 mb-3 mt-6">Tables and rooms</div>
              <a href="/rooms" className="block text-sm text-gray-600 hover:text-gray-900 py-1">Rooms</a>
              <a href="/tables" className="block text-sm text-gray-600 hover:text-gray-900 py-1">Tables</a>
              <div className="block text-sm text-green-600 font-medium py-1 bg-green-50 px-2 rounded">Combined tables</div>
              <a href="/table-plan" className="block text-sm text-gray-600 hover:text-gray-900 py-1">Table plan</a>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Combined tables</CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    Create table combinations to accommodate larger parties.
                  </p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      className="bg-green-600 hover:bg-green-700 text-white"
                      onClick={resetForm}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Combination
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>
                        {editingCombination ? "Edit" : "Create"} Table Combination
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="name">Combination Name</Label>
                        <Input
                          id="name"
                          value={newCombination.name}
                          onChange={(e) => setNewCombination(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="e.g., VIP Section, Family Area"
                        />
                      </div>
                      <div>
                        <Label>Select Tables</Label>
                        {tables.length === 0 ? (
                          <div className="text-sm text-gray-500 mt-2">
                            {tablesLoading ? "Loading tables..." : "No tables available. Please create tables first."}
                          </div>
                        ) : (
                          <div className="grid grid-cols-3 gap-2 mt-2">
                            {tables
                              .filter(table => table.isActive)
                              .map((table) => (
                                <Button
                                  key={table.id}
                                  variant={newCombination.tableIds.includes(table.id) ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => handleTableToggle(table.id)}
                                  className="h-12 flex flex-col"
                                >
                                  <span className="text-xs">Table {table.tableNumber}</span>
                                  <span className="text-xs opacity-70">{table.capacity} seats</span>
                                </Button>
                              ))}
                          </div>
                        )}
                        {tables.length > 0 && tables.filter(table => table.isActive).length === 0 && (
                          <div className="text-sm text-gray-500 mt-2">
                            No active tables available. Please activate tables first.
                          </div>
                        )}
                      </div>
                      {newCombination.tableIds.length > 0 && (
                        <div className="text-sm text-gray-600">
                          Total capacity: {newCombination.tableIds.reduce((sum, tableId) => {
                            const table = tables.find(t => t.id === tableId);
                            return sum + (table?.capacity || 0);
                          }, 0)} seats
                        </div>
                      )}
                      <div className="flex justify-end space-x-2 pt-4">
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleSubmit}
                          className="bg-green-600 hover:bg-green-700 text-white"
                          disabled={createCombinedTableMutation.isPending || updateCombinedTableMutation.isPending}
                        >
                          {editingCombination ? "Update" : "Create"}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {combinedTables.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No table combinations</h3>
                  <p className="text-gray-500 mb-4">Create your first table combination to get started.</p>
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={resetForm}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Combination
                      </Button>
                    </DialogTrigger>
                  </Dialog>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Tables</TableHead>
                      <TableHead>Total Capacity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {combinedTables.map((combination: CombinedTable) => (
                      <TableRow key={combination.id}>
                        <TableCell className="font-medium">{combination.name}</TableCell>
                        <TableCell>{getTableNumbers(combination.tableIds)}</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Users className="h-4 w-4 mr-1" />
                            {combination.totalCapacity}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={combination.isActive ? "default" : "secondary"}>
                            {combination.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(combination)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteCombinedTableMutation.mutate(combination.id)}
                              className="text-red-600 hover:text-red-700"
                              disabled={deleteCombinedTableMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
