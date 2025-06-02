import { useState } from "react";
import { useAuth } from "@/lib/auth.tsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SmsNotifications() {
  const { user, restaurant } = useAuth();
  const [guestSettings, setGuestSettings] = useState({
    smsConfirmation: true,
    sendBookingConfirmation: true,
    reminderHours: "2",
    sendReminder: true,
    sendTo: "+45",
    satisfactionSurvey: false
  });

  const [smsBalance, setSmsBalance] = useState({
    currentBalance: "0.00 EUR",
    payment: ""
  });

  if (!user || !restaurant) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <div className="bg-white border-b">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-6">
            <h1 className="text-xl font-semibold">SMS notifications</h1>
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
              <div className="block text-sm text-green-600 font-medium py-1 bg-green-50 px-2 rounded">SMS notifications</div>
              <a href="/feedback-questions" className="block text-sm text-gray-600 hover:text-gray-900 py-1">Feedback questions</a>
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
        <div className="flex-1 p-6 max-w-4xl">
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
            <p className="text-sm text-yellow-800">
              1 to 10 cents per SMS notification (view international SMS prices)
            </p>
          </div>

          <div className="space-y-8">
            {/* Guest Section */}
            <Card>
              <CardHeader>
                <CardTitle>Guest</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-gray-700">SMS confirmation</label>
                    <Switch 
                      checked={guestSettings.sendBookingConfirmation}
                      onCheckedChange={(checked) => 
                        setGuestSettings(prev => ({ ...prev, sendBookingConfirmation: checked }))
                      }
                    />
                  </div>
                  <div className="text-xs text-gray-500 ml-4">Send booking confirmation to the guest</div>

                  <div className="flex items-center justify-between">
                    <label className="text-sm text-gray-700">Reminder</label>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm">Send reminder to the guest</span>
                      <Select value={guestSettings.reminderHours}>
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2">2</SelectItem>
                          <SelectItem value="4">4</SelectItem>
                          <SelectItem value="24">24</SelectItem>
                        </SelectContent>
                      </Select>
                      <span className="text-sm">hours before visit</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm text-gray-700 block mb-2">Send to</label>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm">Send booking in</span>
                      <Input 
                        value={guestSettings.sendTo}
                        onChange={(e) => setGuestSettings(prev => ({ ...prev, sendTo: e.target.value }))}
                        className="w-24"
                      />
                      <span className="text-sm">+351</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-sm text-gray-700">Satisfaction surveys</label>
                    <Switch checked={guestSettings.satisfactionSurvey} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* SMS Balance Section */}
            <Card>
              <CardHeader>
                <CardTitle>SMS balance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-gray-700">Current balance</label>
                    <span className="text-sm font-medium">{smsBalance.currentBalance}</span>
                  </div>

                  <div>
                    <label className="text-sm text-gray-700 block mb-2">Payment</label>
                    <Button className="bg-green-600 hover:bg-green-700 text-white">
                      View setup details
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="pt-6">
              <Button className="bg-green-600 hover:bg-green-700 text-white">Save</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}