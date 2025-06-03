import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth.tsx";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Download } from "lucide-react";

export default function WaitingList() {
  const { user, restaurant } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState("all");

  const [formData, setFormData] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    guestCount: "",
    requestedDate: "",
    requestedTime: "",
    notes: ""
  });

  const { data: waitingList = [], isLoading } = useQuery({
    queryKey: ["/api/restaurants", restaurant?.id, "waiting-list"],
    enabled: !!restaurant?.id,
    queryFn: async () => {
      const response = await fetch(`/api/restaurants/${restaurant?.id}/waiting-list`);
      if (!response.ok) throw new Error("Failed to fetch waiting list");
      return response.json();
    }
  });

  const createEntryMutation = useMutation({
    mutationFn: async (entryData: any) => {
      const response = await fetch(`/api/restaurants/${restaurant?.id}/waiting-list`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entryData),
      });
      if (!response.ok) throw new Error("Failed to create waiting list entry");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/restaurants", restaurant?.id, "waiting-list"],
      });
      setFormData({
        customerName: "",
        customerEmail: "",
        customerPhone: "",
        guestCount: "",
        requestedDate: "",
        requestedTime: "",
        notes: ""
      });
      toast({
        title: "Success",
        description: "Added to waiting list successfully",
      });
    },
  });

  const updateEntryMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: any }) => {
      const response = await fetch(`/api/restaurants/${restaurant?.id}/waiting-list/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error("Failed to update waiting list entry");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/restaurants", restaurant?.id, "waiting-list"],
      });
      toast({
        title: "Success",
        description: "Waiting list entry updated successfully",
      });
    },
  });

  if (!user || !restaurant) {
    return null;
  }

  const filteredWaitingList = (waitingList as any)?.filter((item: any) => {
    return statusFilter === "all" || item.status === statusFilter;
  }) || [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant?.id) return;

    createEntryMutation.mutate({
      ...formData,
      guestCount: parseInt(formData.guestCount)
    });
  };

  const handleStatusUpdate = (id: number, status: string) => {
    updateEntryMutation.mutate({ id, updates: { status } });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <div className="bg-white border-b">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-6">
            <h1 className="text-xl font-semibold">Waiting List</h1>
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
            <div className="space-y-2">
              <a href={`/${restaurant.id}/bookings`} className="flex items-center space-x-2 text-gray-600 hover:bg-gray-50 px-3 py-2 rounded">
                <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                <span>Bookings</span>
              </a>
              <div className="flex items-center space-x-2 text-green-600 bg-green-50 px-3 py-2 rounded">
                <span className="w-2 h-2 bg-green-600 rounded-full"></span>
                <span className="font-medium">Waiting List</span>
              </div>
              <a href={`/${restaurant.id}/statistics`} className="flex items-center space-x-2 text-gray-600 hover:bg-gray-50 px-3 py-2 rounded">
                <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                <span>Statistics</span>
              </a>
              <a href={`/${restaurant.id}/activity-log`} className="flex items-center space-x-2 text-gray-600 hover:bg-gray-50 px-3 py-2 rounded">
                <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                <span>Log</span>
              </a>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          <div className="bg-white rounded-lg shadow">
            {/* Header */}
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold mb-4">Waiting List</h2>

              {/* Filters */}
              <div className="flex items-center space-x-4 mb-4">
                <Button variant="outline" size="sm">Show filters</Button>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="waiting">Waiting</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="booked">Booked</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">ID</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Name</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Arrival</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Guests</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Booking#</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Created</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-gray-500">
                        Loading waiting list...
                      </td>
                    </tr>
                  ) : filteredWaitingList.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-gray-500">
                        No customers on waiting list
                      </td>
                    </tr>
                  ) : (
                    filteredWaitingList.map((item: any) => (
                      <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm">{item.id}</td>
                        <td className="py-3 px-4">
                          <div>
                            <div className="font-medium">{item.customerName}</div>
                            <div className="text-sm text-gray-500">{item.customerEmail}</div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <div className="font-medium">{item.requestedDate} at {item.requestedTime}</div>
                          </div>
                        </td>
                        <td className="py-3 px-4">{item.guestCount}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            item.status === 'waiting' ? 'bg-yellow-100 text-yellow-800' :
                            item.status === 'contacted' ? 'bg-blue-100 text-blue-800' :
                            item.status === 'booked' ? 'bg-green-100 text-green-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">-</td>
                        <td className="py-3 px-4">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">Manual</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="p-4 border-t flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {filteredWaitingList.length} bookings, {filteredWaitingList.reduce((sum: number, item: any) => sum + item.guestCount, 0)} guests
              </div>

              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">1</span>
                  <div className="flex space-x-1">
                    <Button variant="outline" size="sm">20</Button>
                    <span className="text-sm text-gray-600">results per page</span>
                  </div>
                </div>

                <Button className="bg-green-600 hover:bg-green-700 text-white flex items-center space-x-2">
                  <Download className="w-4 h-4" />
                  <span>Download as CSV</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}