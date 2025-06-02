import { useState } from "react";
import { useAuth } from "@/lib/auth.tsx";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function FeedbackQuestions() {
  const { user, restaurant } = useAuth();
  const [activeQuestions] = useState([
    { topic: "Locale", nps: "●", comments: "●" },
    { topic: "Food", nps: "●", comments: "●" },
    { topic: "Service", nps: "●", comments: "●" },
    { topic: "Atmosphere", nps: "●", comments: "●" },
    { topic: "Recommend", nps: "●", comments: "●" }
  ]);

  if (!user || !restaurant) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <div className="bg-white border-b">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-6">
            <h1 className="text-xl font-semibold">Questions</h1>
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
              <div className="text-sm font-medium text-gray-900 mb-3">E-mail notifications</div>
              <a href="/email-notifications" className="block text-sm text-gray-600 hover:text-gray-900 py-1">E-mail notifications</a>
              <a href="/sms-notifications" className="block text-sm text-gray-600 hover:text-gray-900 py-1">SMS notifications</a>
              <div className="block text-sm text-green-600 font-medium py-1 bg-green-50 px-2 rounded">Feedback questions</div>
              <a href="/events" className="block text-sm text-gray-600 hover:text-gray-900 py-1">Events</a>
              
              <div className="text-sm font-medium text-gray-900 mb-3 mt-6">Guest payments</div>
              <a href="/payment-setups" className="block text-sm text-gray-600 hover:text-gray-900 py-1">Payment setups</a>
              <a href="/payment-gateway" className="block text-sm text-gray-600 hover:text-gray-900 py-1">Payment Gateway</a>
              
              <div className="text-sm font-medium text-gray-900 mb-3 mt-6">Products</div>
              <a href="/products" className="block text-sm text-gray-600 hover:text-gray-900 py-1">Products</a>
              <a href="/product-groups" className="block text-sm text-gray-600 hover:text-gray-900 py-1">Groups</a>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          <Card>
            <CardHeader>
              <CardTitle>Questions</CardTitle>
              <p className="text-sm text-gray-600">
                Do this setup, you can easily create and customize feedback questions for your guests. You have the 
                flexibility to add new questions, edit existing ones, and choose the order in which they will be presented 
                to your guests in the feedback form. This allows you to gather valuable insights from your guests.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-4">Active questions</h3>
                
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-sm font-medium text-gray-700">Name</div>
                  <div className="text-sm font-medium text-gray-700">NPS</div>
                  <div className="text-sm font-medium text-gray-700">Comments</div>
                </div>

                {activeQuestions.map((question, index) => (
                  <div key={index} className="grid grid-cols-3 gap-4 items-center py-2">
                    <span className="text-sm">{question.topic}</span>
                    <span className="text-sm text-green-600">{question.nps}</span>
                    <span className="text-sm text-green-600">{question.comments}</span>
                  </div>
                ))}
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-4">Inactive questions</h3>
                
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-sm font-medium text-gray-700">Name</div>
                  <div className="text-sm font-medium text-gray-700">NPS</div>
                  <div className="text-sm font-medium text-gray-700">Comments</div>
                </div>

                <div className="text-center py-4 text-gray-500">
                  There are no inactive questions
                </div>
              </div>

              <Button className="bg-green-600 hover:bg-green-700 text-white">
                New question
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}