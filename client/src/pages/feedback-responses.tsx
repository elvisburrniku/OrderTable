import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth.tsx";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download } from "lucide-react";

export default function FeedbackResponses() {
  const { user, restaurant } = useAuth();
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: feedback, isLoading } = useQuery({
    queryKey: ['/api/restaurants', restaurant?.id, 'feedback'],
    enabled: !!restaurant
  });

  if (!user || !restaurant) {
    return null;
  }

  const filteredFeedback = (feedback as any)?.filter((item: any) => {
    return statusFilter === "all" || item.visited === (statusFilter === "visited");
  }) || [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <div className="bg-white border-b">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-6">
            <h1 className="text-xl font-semibold">Responses</h1>
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
              <a href="/customers" className="flex items-center space-x-2 text-gray-600 hover:bg-gray-50 px-3 py-2 rounded">
                <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                <span>Customers</span>
              </a>
              <a href="/sms-messages" className="flex items-center space-x-2 text-gray-600 hover:bg-gray-50 px-3 py-2 rounded">
                <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                <span>SMS messages</span>
              </a>
              <div className="flex items-center space-x-2 text-green-600 bg-green-50 px-3 py-2 rounded">
                <span className="w-2 h-2 bg-green-600 rounded-full"></span>
                <span className="font-medium">Feedback responses</span>
              </div>
              <a href="/feedback-responses-popup" className="flex items-center space-x-2 text-gray-600 hover:bg-gray-50 px-3 py-2 rounded ml-4">
                <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                <span>Popup View</span>
              </a>
              <a href="#" className="flex items-center space-x-2 text-gray-600 hover:bg-gray-50 px-3 py-2 rounded">
                <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                <span>Newsletter</span>
              </a>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          <div className="bg-white rounded-lg shadow">
            {/* Header */}
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold mb-4">Responses</h2>
              
              {/* Filters */}
              <div className="flex items-center space-x-4 mb-4">
                <Button variant="outline" size="sm">Show filters</Button>
                
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="visited">Visited</SelectItem>
                    <SelectItem value="not-visited">Not Visited</SelectItem>
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
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Customer Name</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Customer Email</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Restaurant ID</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Tenant ID</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Booking ID</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Rating</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">NPS</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Comments</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Visited</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Created At</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={11} className="py-8 text-center text-gray-500">
                        Loading feedback...
                      </td>
                    </tr>
                  ) : filteredFeedback.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-8 text-center text-gray-500">
                        No feedback responses found
                      </td>
                    </tr>
                  ) : (
                    filteredFeedback.map((item: any) => (
                      <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm font-medium">{item.id}</td>
                        <td className="py-3 px-4">
                          <div className="font-medium">{item.customerName}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm text-gray-600">{item.customerEmail}</div>
                        </td>
                        <td className="py-3 px-4 text-sm">{item.restaurantId}</td>
                        <td className="py-3 px-4 text-sm">{item.tenantId}</td>
                        <td className="py-3 px-4 text-sm">{item.bookingId || '-'}</td>
                        <td className="py-3 px-4">
                          {item.rating ? (
                            <div className="flex">
                              {[...Array(5)].map((_, i) => (
                                <span key={i} className={`text-sm ${i < item.rating ? 'text-yellow-400' : 'text-gray-300'}`}>
                                  ★
                                </span>
                              ))}
                            </div>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm">{item.nps || '-'}</td>
                        <td className="py-3 px-4">
                          <div className="max-w-xs truncate" title={item.comments}>
                            {item.comments || '-'}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            item.visited ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {item.visited ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {new Date(item.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="p-4 border-t flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {filteredFeedback.length} responses
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