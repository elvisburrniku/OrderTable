import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth.tsx";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Plus, ArrowLeft, CalendarIcon, Send } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

export default function SmsMessages() {
  const { user, restaurant } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    messageType: "information",
    content: "",
    receivers: "",
    bookingDateFrom: "",
    bookingDateTo: "",
    language: "english"
  });

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["/api/restaurants", restaurant?.id, "sms-messages"],
    enabled: !!restaurant?.id,
  });

  const createMessageMutation = useMutation({
    mutationFn: async (messageData: any) => {
      const response = await fetch(`/api/restaurants/${restaurant?.id}/sms-messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(messageData),
      });
      if (!response.ok) throw new Error("Failed to create message");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/restaurants", restaurant?.id, "sms-messages"],
      });
      setFormData({
        name: "",
        messageType: "information",
        content: "",
        receivers: "",
        bookingDateFrom: "",
        bookingDateTo: "",
        language: "english"
      });
      toast({
        title: "Success",
        description: "SMS message created successfully",
      });
    },
  });

  const [showCompose, setShowCompose] = useState(false);
  const [messageName, setMessageName] = useState("");
  const [messageType, setMessageType] = useState("information");
  const [messageContent, setMessageContent] = useState("");
  const [receiverType, setReceiverType] = useState("all");
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();
  const [language, setLanguage] = useState("english");
  const { data: customers } = useQuery({
    queryKey: ['/api/restaurants', restaurant?.id, 'customers'],
    enabled: !!restaurant
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: any) => {
      const response = await fetch('/api/sms-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageData)
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants', restaurant?.id, 'sms-messages'] });
      setShowCompose(false);
      resetForm();
    }
  });

  const resetForm = () => {
    setMessageName("");
    setMessageContent("");
    setReceiverType("all");
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const handleSendMessage = () => {
    if (!restaurant || !messageName || !messageContent) return;

    const receivers = receiverType === "all" 
      ? (customers as any)?.map((c: any) => c.phone).filter(Boolean) || []
      : [];

    sendMessageMutation.mutate({
      restaurantId: restaurant.id,
      name: messageName,
      messageType,
      content: messageContent,
      receivers: JSON.stringify(receivers),
      bookingDateFrom: dateFrom ? format(dateFrom, 'yyyy-MM-dd') : null,
      bookingDateTo: dateTo ? format(dateTo, 'yyyy-MM-dd') : null,
      language
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant?.id) return;

    createMessageMutation.mutate({
      ...formData,
      receivers: formData.receivers.split(',').map(r => r.trim())
    });
  };

  if (!user || !restaurant) {
    return null;
  }

  if (showCompose) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Navigation */}
        <div className="bg-white border-b">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center space-x-6">
              <Button 
                variant="ghost" 
                onClick={() => setShowCompose(false)}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to messages</span>
              </Button>
              <h1 className="text-xl font-semibold">SMS messages - New message</h1>
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
                <div className="flex items-center space-x-2 text-green-600 bg-green-50 px-3 py-2 rounded">
                  <span className="w-2 h-2 bg-green-600 rounded-full"></span>
                  <span className="font-medium">SMS messages</span>
                </div>
                <a href="/feedback-responses" className="flex items-center space-x-2 text-gray-600 hover:bg-gray-50 px-3 py-2 rounded">
                  <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                  <span>Feedback responses</span>
                </a>
                <a href="#" className="flex items-center space-x-2 text-gray-600 hover:bg-gray-50 px-3 py-2 rounded">
                  <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                  <span>Newsletter</span>
                </a>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 p-6 max-w-4xl">
            <Card>
              <CardHeader>
                <CardTitle>New Message</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Message Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                  <Input
                    value={messageName}
                    onChange={(e) => setMessageName(e.target.value)}
                    placeholder="Enter message name"
                  />
                </div>

                {/* Message Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Message type</label>
                  <div className="flex items-center space-x-4 p-4 border rounded-lg bg-green-50">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <div>
                      <div className="font-medium text-green-800">Information</div>
                      <div className="text-sm text-green-600">Information can be sent back a maximum of 1 week in time</div>
                    </div>
                  </div>
                </div>

                {/* Receivers */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Receivers</label>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Type</label>
                      <Select value={receiverType} onValueChange={setReceiverType}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select receiver type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="recent">Recent customers</SelectItem>
                          <SelectItem value="frequent">Frequent visitors</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">From</label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start text-left">
                              <CalendarIcon className="w-4 h-4 mr-2" />
                              {dateFrom ? format(dateFrom, "dd/MM/yyyy") : "Select date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} />
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div>
                        <label className="block text-sm text-gray-600 mb-1">To</label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start text-left">
                              <CalendarIcon className="w-4 h-4 mr-2" />
                              {dateTo ? format(dateTo, "dd/MM/yyyy") : "Select date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar mode="single" selected={dateTo} onSelect={setDateTo} />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Language</label>
                      <Select value={language} onValueChange={setLanguage}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="english">English</SelectItem>
                          <SelectItem value="spanish">Spanish</SelectItem>
                          <SelectItem value="french">French</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="bg-gray-50 p-4 rounded">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-sm font-medium">🇬🇧 English</span>
                        <Badge>1 SMS</Badge>
                        <Badge variant="outline">Recipients: {(customers as any)?.length || 0}</Badge>
                      </div>

                      <div className="bg-white p-3 rounded border">
                        <div className="text-sm text-gray-600 mb-2">Placeholders:</div>
                        <Textarea
                          value={messageContent}
                          onChange={(e) => setMessageContent(e.target.value)}
                          placeholder="Enter your message content here..."
                          className="min-h-24"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <Button variant="outline">Save draft</Button>
                  <Button 
                    onClick={handleSendMessage}
                    disabled={sendMessageMutation.isPending || !messageName || !messageContent}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Send message
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <div className="bg-white border-b">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-6">
            <h1 className="text-xl font-semibold">SMS Messages</h1>
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
              <div className="flex items-center space-x-2 text-green-600 bg-green-50 px-3 py-2 rounded">
                <span className="w-2 h-2 bg-green-600 rounded-full"></span>
                <span className="font-medium">SMS messages</span>
              </div>
              <a href="/feedback-responses" className="flex items-center space-x-2 text-gray-600 hover:bg-gray-50 px-3 py-2 rounded">
                <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                <span>Feedback responses</span>
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
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">SMS Messages</h2>
              <Button 
                onClick={() => setShowCompose(true)}
                className="bg-green-600 hover:bg-green-700 text-white flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>New Message</span>
              </Button>
            </div>

            <div className="p-6">
              <div className="bg-gray-50 rounded-lg p-6">
                {isLoading ? (
                  <div className="text-center text-gray-500">Loading...</div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-gray-500">
                    No SMS messages sent yet
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((message: any) => (
                      <div key={message.id} className="bg-white p-4 rounded-lg border">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-medium">{message.name}</h3>
                          <Badge variant="secondary">{message.messageType}</Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{message.content}</p>
                        <div className="text-xs text-gray-500">
                          Sent: {format(new Date(message.createdAt), "MMM dd, yyyy HH:mm")} | 
                          Language: {message.language} | 
                          Recipients: {JSON.parse(message.receivers).length}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}