
import { useState } from "react";
import { useAuth } from "@/lib/auth.tsx";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, Mail, Phone, Calendar, Star } from "lucide-react";
import { format } from "date-fns";

export default function Customers() {
  const { user, restaurant } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    email: "",
    phone: "",
  });

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["/api/tenants", restaurant?.tenantId, "restaurants", restaurant?.id, "customers"],
    enabled: !!restaurant,
    queryFn: async () => {
      const response = await fetch(`/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/customers`, {
        headers: {
          'x-tenant-id': restaurant?.tenantId?.toString() || '1'
        }
      });
      if (!response.ok) throw new Error("Failed to fetch customers");
      return response.json();
    }
  });

  const createCustomerMutation = useMutation({
    mutationFn: async (customerData: any) => {
      const response = await fetch(`/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/customers`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          'x-tenant-id': restaurant?.tenantId?.toString() || '1'
        },
        body: JSON.stringify(customerData),
      });
      if (!response.ok) throw new Error("Failed to create customer");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/tenants", restaurant?.tenantId, "restaurants", restaurant?.id, "customers"],
      });
      setIsDialogOpen(false);
      setNewCustomer({ name: "", email: "", phone: "" });
    },
  });

  const filteredCustomers = customers.filter((customer: any) =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    createCustomerMutation.mutate(newCustomer);
  };

  if (!user || !restaurant) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <div className="bg-white border-b">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-6">
            <h1 className="text-xl font-semibold">Customers</h1>
            <nav className="flex space-x-6">
              <a
                href="/dashboard"
                className="text-gray-600 hover:text-gray-900"
              >
                Booking
              </a>
              <a href="#" className="text-green-600 font-medium">
                CRM
              </a>
              <a href="#" className="text-gray-600 hover:text-gray-900">
                Archive
              </a>
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">{restaurant.name}</span>
            <Button variant="outline" size="sm">
              Profile
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Customer Database</CardTitle>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-green-600 hover:bg-green-700 text-white">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Customer
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Customer</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateCustomer} className="space-y-4">
                    <div>
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        value={newCustomer.name}
                        onChange={(e) =>
                          setNewCustomer({ ...newCustomer, name: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newCustomer.email}
                        onChange={(e) =>
                          setNewCustomer({ ...newCustomer, email: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={newCustomer.phone}
                        onChange={(e) =>
                          setNewCustomer({ ...newCustomer, phone: e.target.value })
                        }
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={createCustomerMutation.isPending}
                    >
                      {createCustomerMutation.isPending ? "Adding..." : "Add Customer"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Loading customers...</div>
            ) : filteredCustomers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {searchTerm ? "No customers found matching your search" : "No customers yet"}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Bookings</TableHead>
                    <TableHead>Last Visit</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer: any) => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-medium">{customer.name}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="h-3 w-3" />
                            {customer.email}
                          </div>
                          {customer.phone && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Phone className="h-3 w-3" />
                              {customer.phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {customer.totalBookings || 0} bookings
                        </div>
                      </TableCell>
                      <TableCell>
                        {customer.lastVisit
                          ? format(new Date(customer.lastVisit), "MMM dd, yyyy")
                          : "Never"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            (customer.totalBookings || 0) > 5
                              ? "default"
                              : (customer.totalBookings || 0) > 2
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {(customer.totalBookings || 0) > 5
                            ? "VIP"
                            : (customer.totalBookings || 0) > 2
                            ? "Regular"
                            : "New"}
                        </Badge>
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
  );
}
