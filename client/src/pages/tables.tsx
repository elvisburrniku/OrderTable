import { useState } from "react";
import { useAuthGuard } from "@/lib/auth.tsx";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import {
  Plus,
  Users,
  Edit,
  Trash2,
  QrCode,
  Download,
  MessageSquare,
} from "lucide-react";
import { useSubscription } from "@/hooks/use-subscription";
import { FeedbackModal } from "./table-feedback";

export default function Tables() {
  const {
    isLoading: authLoading,
    isAuthenticated,
    user,
    restaurant,
  } = useAuthGuard();
  const { canCreateTable } = useSubscription();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<any>(null);
  const [newTable, setNewTable] = useState({
    tableNumber: "",
    capacity: 4,
    isActive: true,
  });
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [selectedTableQR, setSelectedTableQR] = useState<any>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [selectedTableForFeedback, setSelectedTableForFeedback] =
    useState<any>(null);

  // Function to fetch QR code for a specific table
  const fetchTableQR = async (tableId: number) => {
    const tenantId = restaurant?.tenantId || 1;
    const response = await fetch(
      `/api/tenants/${tenantId}/restaurants/${restaurant?.id}/tables/${tableId}/qr`,
    );
    if (!response.ok) throw new Error("Failed to fetch QR code");
    return response.json();
  };

  // Function to download all QR codes as PDF
  const downloadAllQRCodes = async () => {
    try {
      const jsPDF = (await import("jspdf")).jsPDF;
      const html2canvas = (await import("html2canvas")).default;

      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const qrSize = 60;
      const spacing = 10;

      let currentY = margin;
      let currentX = margin;

      // Add title
      pdf.setFontSize(16);
      pdf.text(
        `QR Codes - ${restaurant?.name || "Restaurant"}`,
        margin,
        currentY,
      );
      currentY += 20;

      for (const table of tables) {
        try {
          const qrData = await fetchTableQR(table.id);

          if (qrData.qrCode) {
            // Check if we need a new page
            if (currentY + qrSize + 30 > pageHeight - margin) {
              pdf.addPage();
              currentY = margin;
            }

            // Add table label
            pdf.setFontSize(12);
            pdf.text(`Table ${table.tableNumber}`, currentX, currentY);
            currentY += 10;

            // Add QR code
            pdf.addImage(
              qrData.qrCode,
              "PNG",
              currentX,
              currentY,
              qrSize,
              qrSize,
            );

            // Add table info
            pdf.setFontSize(8);
            pdf.text(
              `Capacity: ${table.capacity} people`,
              currentX,
              currentY + qrSize + 5,
            );
            pdf.text(
              `Status: ${table.isActive ? "Active" : "Inactive"}`,
              currentX,
              currentY + qrSize + 10,
            );

            currentY += qrSize + spacing + 20;
          }
        } catch (error) {
          console.error(
            `Failed to fetch QR for table ${table.tableNumber}:`,
            error,
          );
        }
      }

      pdf.save(`${restaurant?.name || "Restaurant"}_QR_Codes.pdf`);
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      alert("Failed to generate PDF. Please try again.");
    }
  };

  const { data: tables = [], isLoading } = useQuery({
    queryKey: [
      "/api/tenants",
      restaurant?.tenantId || 1,
      "restaurants",
      restaurant?.id,
      "tables",
    ],
    queryFn: async () => {
      const tenantId = restaurant?.tenantId || 1;
      const response = await fetch(
        `/api/tenants/${tenantId}/restaurants/${restaurant?.id}/tables`,
      );
      if (!response.ok) {
        console.error(
          "Failed to fetch tables:",
          response.status,
          response.statusText,
        );
        throw new Error("Failed to fetch tables");
      }
      return response.json();
    },
    enabled: !!restaurant?.id,
  });

  const createTableMutation = useMutation({
    mutationFn: async (tableData: any) => {
      const tenantId = restaurant?.tenantId || 1;
      const response = await fetch(
        `/api/tenants/${tenantId}/restaurants/${restaurant?.id}/tables`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...tableData, restaurantId: restaurant?.id }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        if (errorData?.requiresUpgrade) {
          throw new Error(`Table Limit Exceeded: ${errorData.message}`);
        }
        throw new Error(errorData?.message || "Failed to create table");
      }
      return response.json();
    },
    onSuccess: () => {
      // Comprehensive cache invalidation to ensure all components refresh
      queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey as string[];
          return queryKey.some(
            (key) =>
              typeof key === "string" &&
              (key.includes("tables") ||
                key.includes("statistics") ||
                key.includes("dashboard") ||
                key.includes("restaurant") ||
                key.includes("rooms") ||
                key.includes(`tenants/${restaurant?.tenantId}`)),
          );
        },
      });

      // Force refetch of current page data
      queryClient.refetchQueries({
        queryKey: [
          "/api/tenants",
          restaurant?.tenantId || 1,
          "restaurants",
          restaurant?.id,
          "tables",
        ],
      });
      setIsDialogOpen(false);
      setNewTable({ tableNumber: "", capacity: 4, isActive: true });
    },
  });

  const updateTableMutation = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const tenantId = restaurant?.tenantId || 1;
      const response = await fetch(`/api/tenants/${tenantId}/tables/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error("Failed to update table");
      return response.json();
    },
    onSuccess: () => {
      // Comprehensive cache invalidation to ensure all components refresh
      queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey as string[];
          return queryKey.some(
            (key) =>
              typeof key === "string" &&
              (key.includes("tables") ||
                key.includes("statistics") ||
                key.includes("dashboard") ||
                key.includes("restaurant") ||
                key.includes("rooms") ||
                key.includes(`tenants/${restaurant?.tenantId}`)),
          );
        },
      });

      // Force refetch of current page data
      queryClient.refetchQueries({
        queryKey: [
          "/api/tenants",
          restaurant?.tenantId || 1,
          "restaurants",
          restaurant?.id,
          "tables",
        ],
      });
    },
  });

  const deleteTableMutation = useMutation({
    mutationFn: async (id: number) => {
      const tenantId = restaurant?.tenantId || 1;
      const response = await fetch(`/api/tenants/${tenantId}/tables/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete table");
      return response.json();
    },
    onSuccess: () => {
      // Comprehensive cache invalidation to ensure all components refresh
      queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey as string[];
          return queryKey.some(
            (key) =>
              typeof key === "string" &&
              (key.includes("tables") ||
                key.includes("statistics") ||
                key.includes("dashboard") ||
                key.includes("restaurant") ||
                key.includes("rooms") ||
                key.includes(`tenants/${restaurant?.tenantId}`)),
          );
        },
      });

      // Force refetch of current page data
      queryClient.refetchQueries({
        queryKey: [
          "/api/tenants",
          restaurant?.tenantId || 1,
          "restaurants",
          restaurant?.id,
          "tables",
        ],
      });
    },
  });

  if (authLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated || !user || !restaurant) {
    return null;
  }

  const handleCreateTable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreateTable(tables.length)) {
      alert(
        "You've reached your table limit. Please upgrade your subscription.",
      );
      return;
    }
    createTableMutation.mutate(newTable);
  };

  const handleToggleActive = (tableId: number, isActive: boolean) => {
    console.log(
      `Handler called for table ID: ${tableId}, setting to: ${isActive}`,
    );
    updateTableMutation.mutate({ id: tableId, isActive });
  };

  // Isolated switch component to prevent cross-switching
  const TableSwitch = ({
    tableId,
    isActive,
    onToggle,
    disabled,
  }: {
    tableId: number;
    isActive: boolean;
    onToggle: (id: number, active: boolean) => void;
    disabled: boolean;
  }) => {
    return (
      <Switch
        checked={Boolean(isActive)}
        onCheckedChange={(checked) => {
          console.log(`Switch for table ${tableId}: ${isActive} -> ${checked}`);
          onToggle(tableId, checked);
        }}
        disabled={disabled}
        className="data-[state=checked]:bg-green-600"
      />
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <div className="p-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Table Management</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => (window.location.href = "/table-plan")}
                  className="border-green-600 text-green-600 hover:bg-green-50"
                >
                  View Table Plan
                </Button>
                <Button
                  variant="outline"
                  onClick={downloadAllQRCodes}
                  className="border-blue-600 text-blue-600 hover:bg-blue-50"
                  disabled={tables.length === 0}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download All QR Codes
                </Button>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      className="bg-green-600 hover:bg-green-700 text-white"
                      disabled={!canCreateTable(tables.length)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Table
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Table</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateTable} className="space-y-4">
                      <div>
                        <Label htmlFor="tableNumber">Table Number</Label>
                        <Input
                          id="tableNumber"
                          value={newTable.tableNumber}
                          onChange={(e) =>
                            setNewTable({
                              ...newTable,
                              tableNumber: e.target.value,
                            })
                          }
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="capacity">Capacity</Label>
                        <Input
                          id="capacity"
                          type="number"
                          min="1"
                          max="20"
                          value={newTable.capacity}
                          onChange={(e) =>
                            setNewTable({
                              ...newTable,
                              capacity: parseInt(e.target.value),
                            })
                          }
                          required
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="isActive"
                          checked={newTable.isActive}
                          onCheckedChange={(checked) =>
                            setNewTable({ ...newTable, isActive: checked })
                          }
                        />
                        <Label htmlFor="isActive">Active</Label>
                      </div>
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={createTableMutation.isPending}
                      >
                        {createTableMutation.isPending
                          ? "Adding..."
                          : "Add Table"}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Loading tables...</div>
            ) : tables.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No tables configured yet. Add your first table to get started.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Table Number</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>QR Code</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tables.map((table: any) => (
                    <TableRow key={table.id}>
                      <TableCell className="font-medium">
                        Table {table.tableNumber}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          {table.capacity} people
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            Boolean(table.isActive) ? "default" : "secondary"
                          }
                        >
                          {Boolean(table.isActive) ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            try {
                              const qrData = await fetchTableQR(table.id);
                              setSelectedTableQR({
                                ...table,
                                qrCode: qrData.qrCode,
                              });
                              setShowQRDialog(true);
                            } catch (error) {
                              console.error("Failed to fetch QR code:", error);
                            }
                          }}
                        >
                          <QrCode className="h-4 w-4 mr-1" />
                          View QR
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <TableSwitch
                              tableId={table.id}
                              isActive={table.isActive}
                              onToggle={handleToggleActive}
                              disabled={updateTableMutation.isPending}
                            />
                            <span className="text-xs text-gray-600">
                              {Boolean(table.isActive) ? "Active" : "Inactive"}
                            </span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedTableForFeedback(table);
                              setShowFeedbackModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-700"
                            title="Test Customer Feedback"
                          >
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteTableMutation.mutate(table.id)}
                            disabled={deleteTableMutation.isPending}
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

        {/* QR Code Display Dialog */}
        <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                QR Code - Table {selectedTableQR?.tableNumber}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {selectedTableQR?.qrCode ? (
                <div className="text-center">
                  <div className="bg-white p-4 rounded-lg border inline-block">
                    <img
                      src={selectedTableQR.qrCode}
                      alt={`QR Code for Table ${selectedTableQR.tableNumber}`}
                      className="w-48 h-48 mx-auto"
                    />
                  </div>
                  <p className="text-sm text-gray-600 mt-4">
                    Customers can scan this QR code to leave feedback for Table{" "}
                    {selectedTableQR.tableNumber}
                  </p>
                  <div className="mt-4 p-3 bg-gray-50 rounded text-sm">
                    <p>
                      <strong>Table:</strong> {selectedTableQR.tableNumber}
                    </p>
                    <p>
                      <strong>Capacity:</strong> {selectedTableQR.capacity}{" "}
                      people
                    </p>
                    <p>
                      <strong>Status:</strong>{" "}
                      {selectedTableQR.isActive ? "Active" : "Inactive"}
                    </p>
                  </div>
                  <Button
                    className="mt-4 w-full"
                    onClick={() => {
                      const link = document.createElement("a");
                      link.href = selectedTableQR.qrCode;
                      link.download = `Table_${selectedTableQR.tableNumber}_QR.png`;
                      link.click();
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download QR Code
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p>Loading QR code...</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Customer Feedback Modal */}
        {selectedTableForFeedback && (
          <FeedbackModal
            isOpen={showFeedbackModal}
            onClose={() => {
              setShowFeedbackModal(false);
              setSelectedTableForFeedback(null);
            }}
            restaurantId={restaurant?.id || 0}
            tenantId={restaurant?.tenantId || 0}
            tableId={selectedTableForFeedback.id}
            restaurantName={restaurant?.name}
            tableNumber={selectedTableForFeedback.tableNumber}
          />
        )}
      </div>
    </div>
  );
}
