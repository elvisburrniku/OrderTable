import { useState } from "react";
import { useAuth } from "@/lib/auth.tsx";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  HelpCircle,
  Mail,
  Bug,
  MessageSquare,
  Send,
  ExternalLink,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Help() {
  const { user, restaurant } = useAuth();
  const { toast } = useToast();

  const [supportForm, setSupportForm] = useState({
    type: "general",
    subject: "",
    message: "",
    priority: "medium",
  });

  const [bugForm, setBugForm] = useState({
    title: "",
    description: "",
    stepsToReproduce: "",
    expectedBehavior: "",
    actualBehavior: "",
    browserInfo: navigator.userAgent,
    severity: "medium",
  });

  const submitSupportMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/support/ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          userId: user?.id,
          restaurantId: restaurant?.id,
          userEmail: user?.email,
          restaurantName: restaurant?.name,
        }),
      });
      if (!response.ok) throw new Error("Failed to submit support ticket");
      return response.json();
    },
    onSuccess: () => {
      setSupportForm({
        type: "general",
        subject: "",
        message: "",
        priority: "medium",
      });
      toast({
        title: "Support ticket submitted",
        description: "We'll get back to you within 24 hours",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const submitBugMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/support/bug-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          userId: user?.id,
          restaurantId: restaurant?.id,
          userEmail: user?.email,
          restaurantName: restaurant?.name,
        }),
      });
      if (!response.ok) throw new Error("Failed to submit bug report");
      return response.json();
    },
    onSuccess: () => {
      setBugForm({
        title: "",
        description: "",
        stepsToReproduce: "",
        expectedBehavior: "",
        actualBehavior: "",
        browserInfo: navigator.userAgent,
        severity: "medium",
      });
      toast({
        title: "Bug report submitted",
        description: "Thank you for helping us improve the platform",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSupportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitSupportMutation.mutate(supportForm);
  };

  const handleBugSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitBugMutation.mutate(bugForm);
  };

  const handleEmailSupport = () => {
    window.location.href = `mailto:support@yourapp.com?subject=Support Request - ${restaurant?.name}&body=Hello Support Team,%0A%0ARestaurant: ${restaurant?.name}%0AUser: ${user?.name} (${user?.email})%0A%0AMessage:%0A`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={handleEmailSupport}
            >
              <CardContent className="p-6 text-center">
                <Mail className="h-8 w-8 text-blue-500 mx-auto mb-3" />
                <h3 className="font-semibold mb-2">Email Support</h3>
                <p className="text-sm text-gray-600">
                  Send us an email directly
                </p>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-6 text-center">
                <ExternalLink className="h-8 w-8 text-green-500 mx-auto mb-3" />
                <h3 className="font-semibold mb-2">Documentation</h3>
                <p className="text-sm text-gray-600">View our help articles</p>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-6 text-center">
                <MessageSquare className="h-8 w-8 text-purple-500 mx-auto mb-3" />
                <h3 className="font-semibold mb-2">Live Chat</h3>
                <p className="text-sm text-gray-600">
                  Chat with our support team
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Support Forms */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <HelpCircle className="h-5 w-5" />
                <span>Get Help</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="support" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="support">Support Request</TabsTrigger>
                  <TabsTrigger value="bug">Bug Report</TabsTrigger>
                </TabsList>

                <TabsContent value="support" className="mt-6">
                  <form onSubmit={handleSupportSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="type">Request Type</Label>
                        <Select
                          value={supportForm.type}
                          onValueChange={(value) =>
                            setSupportForm({ ...supportForm, type: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="general">
                              General Question
                            </SelectItem>
                            <SelectItem value="billing">
                              Billing Issue
                            </SelectItem>
                            <SelectItem value="technical">
                              Technical Problem
                            </SelectItem>
                            <SelectItem value="feature">
                              Feature Request
                            </SelectItem>
                            <SelectItem value="account">
                              Account Issue
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="priority">Priority</Label>
                        <Select
                          value={supportForm.priority}
                          onValueChange={(value) =>
                            setSupportForm({ ...supportForm, priority: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="subject">Subject</Label>
                      <Input
                        id="subject"
                        value={supportForm.subject}
                        onChange={(e) =>
                          setSupportForm({
                            ...supportForm,
                            subject: e.target.value,
                          })
                        }
                        placeholder="Brief description of your issue"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="message">Message</Label>
                      <Textarea
                        id="message"
                        value={supportForm.message}
                        onChange={(e) =>
                          setSupportForm({
                            ...supportForm,
                            message: e.target.value,
                          })
                        }
                        placeholder="Please describe your issue or question in detail..."
                        rows={6}
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={submitSupportMutation.isPending}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {submitSupportMutation.isPending
                        ? "Submitting..."
                        : "Submit Support Request"}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="bug" className="mt-6">
                  <form onSubmit={handleBugSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="bugTitle">Bug Title</Label>
                        <Input
                          id="bugTitle"
                          value={bugForm.title}
                          onChange={(e) =>
                            setBugForm({ ...bugForm, title: e.target.value })
                          }
                          placeholder="Short description of the bug"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="severity">Severity</Label>
                        <Select
                          value={bugForm.severity}
                          onValueChange={(value) =>
                            setBugForm({ ...bugForm, severity: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">
                              Low - Minor inconvenience
                            </SelectItem>
                            <SelectItem value="medium">
                              Medium - Affects functionality
                            </SelectItem>
                            <SelectItem value="high">
                              High - Major feature broken
                            </SelectItem>
                            <SelectItem value="critical">
                              Critical - App unusable
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="bugDescription">Description</Label>
                      <Textarea
                        id="bugDescription"
                        value={bugForm.description}
                        onChange={(e) =>
                          setBugForm({
                            ...bugForm,
                            description: e.target.value,
                          })
                        }
                        placeholder="Describe the bug in detail..."
                        rows={4}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="stepsToReproduce">
                        Steps to Reproduce
                      </Label>
                      <Textarea
                        id="stepsToReproduce"
                        value={bugForm.stepsToReproduce}
                        onChange={(e) =>
                          setBugForm({
                            ...bugForm,
                            stepsToReproduce: e.target.value,
                          })
                        }
                        placeholder="1. Go to...&#10;2. Click on...&#10;3. See error..."
                        rows={4}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="expectedBehavior">
                          Expected Behavior
                        </Label>
                        <Textarea
                          id="expectedBehavior"
                          value={bugForm.expectedBehavior}
                          onChange={(e) =>
                            setBugForm({
                              ...bugForm,
                              expectedBehavior: e.target.value,
                            })
                          }
                          placeholder="What should happen?"
                          rows={3}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="actualBehavior">Actual Behavior</Label>
                        <Textarea
                          id="actualBehavior"
                          value={bugForm.actualBehavior}
                          onChange={(e) =>
                            setBugForm({
                              ...bugForm,
                              actualBehavior: e.target.value,
                            })
                          }
                          placeholder="What actually happens?"
                          rows={3}
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="browserInfo">Browser Information</Label>
                      <Input
                        id="browserInfo"
                        value={bugForm.browserInfo}
                        onChange={(e) =>
                          setBugForm({
                            ...bugForm,
                            browserInfo: e.target.value,
                          })
                        }
                        placeholder="Browser and version"
                        readOnly
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={submitBugMutation.isPending}
                    >
                      <Bug className="h-4 w-4 mr-2" />
                      {submitBugMutation.isPending
                        ? "Submitting..."
                        : "Submit Bug Report"}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* FAQ Section */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Frequently Asked Questions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">
                    How do I add new tables to my restaurant?
                  </h4>
                  <p className="text-gray-600 text-sm">
                    Go to the Table Plan page and use the table management tools
                    to add new tables to your layout.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">
                    How can I modify my subscription?
                  </h4>
                  <p className="text-gray-600 text-sm">
                    Visit the Subscription page to upgrade, downgrade, or cancel
                    your subscription at any time.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">
                    How do I set up email notifications?
                  </h4>
                  <p className="text-gray-600 text-sm">
                    Configure email settings in the Settings page under Email
                    Notifications section.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">
                    Can I export my booking data?
                  </h4>
                  <p className="text-gray-600 text-sm">
                    Yes, you can export booking data from the Bookings page
                    using the export functionality.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
