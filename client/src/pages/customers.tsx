import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth.tsx";
import { useQuery } from "@tanstack/react-query";
import DashboardSidebar from "@/components/dashboard-sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Download, X } from "lucide-react";

export default function Customers() {
  const [, setLocation] = useLocation();
  const { user, restaurant, logout } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!user || !restaurant) {
      setLocation("/login");
    }
  }, [user, restaurant, setLocation]);

  const { data: customers, isLoading } = useQuery({
    queryKey: ['/api/restaurants', restaurant?.id, 'customers'],
    enabled: !!restaurant
  });

  const filteredCustomers = customers?.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (!user || !restaurant) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <DashboardSidebar 
        selectedDate={new Date()}
        onDateChange={() => {}}
        bookings={[]}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          </div>
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={logout}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Customer Management */}
        <div className="flex-1 p-6">
          <Card>
            <CardHeader>
              <CardTitle>Customers</CardTitle>
              <p className="text-sm text-gray-600">
                Search by name, phone number or email address
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    type="text"
                    placeholder="Customer search"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button variant="outline">
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
              </div>

              <div className="mb-4">
                <Button className="bg-green-600 hover:bg-green-700 text-white">
                  <Download className="h-4 w-4 mr-2" />
                  Download as CSV
                </Button>
              </div>

              {isLoading ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">Loading customers...</p>
                </div>
              ) : filteredCustomers.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">
                    {searchTerm ? "No customers found matching your search." : "No customers yet."}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Name</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Email</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Phone</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Total Bookings</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Last Visit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCustomers.map((customer) => (
                        <tr key={customer.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4">{customer.name}</td>
                          <td className="py-3 px-4">{customer.email}</td>
                          <td className="py-3 px-4">{customer.phone || "-"}</td>
                          <td className="py-3 px-4">{customer.totalBookings}</td>
                          <td className="py-3 px-4">
                            {customer.lastVisit 
                              ? new Date(customer.lastVisit).toLocaleDateString() 
                              : "-"
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
