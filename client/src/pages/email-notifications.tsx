import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth.tsx";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

export default function EmailNotifications() {
  const { user, restaurant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [guestSettings, setGuestSettings] = useState({
    emailConfirmation: true,
    sendBookingConfirmation: true,
    reminderHours: "24",
    sendReminder: true,
    confirmationLanguage: "english",
    satisfactionSurvey: false,
    allowRescheduling: false,
    reviewSite: "Google",
  });

  const [placeSettings, setPlaceSettings] = useState({
    sentTo: restaurant?.email || "restaurant@example.com",
    emailBooking: true,
    newBookingsOnly: false,
    satisfactionSurvey: true,
    rating: "3.0",
  });

  // Load email settings
  const { data: emailSettings, isLoading } = useQuery({
    queryKey: ["email-settings", restaurant?.tenantId, restaurant?.id],
    queryFn: async () => {
      if (!restaurant?.tenantId || !restaurant?.id) return null;

      const response = await fetch(
        `/api/tenants/${restaurant.tenantId}/restaurants/${restaurant.id}/email-settings`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch email settings");
      }
      return response.json();
    },
    enabled: !!restaurant?.tenantId && !!restaurant?.id,
  });

  // Load settings when data arrives
  useEffect(() => {
    if (emailSettings) {
      setGuestSettings(emailSettings.guestSettings);
      setPlaceSettings(emailSettings.placeSettings);
    }
  }, [emailSettings]);

  // Save settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async () => {
      if (!restaurant?.tenantId || !restaurant?.id) {
        throw new Error("Restaurant information not available");
      }

      const response = await fetch(
        `/api/tenants/${restaurant.tenantId}/restaurants/${restaurant.id}/email-settings`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            guestSettings,
            placeSettings,
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to save email settings");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Settings saved",
        description:
          "Email notification settings have been updated successfully.",
      });
      // Comprehensive cache invalidation to ensure all components refresh
      queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey as string[];
          return queryKey.some(
            (key) =>
              typeof key === "string" &&
              (key.includes("email-settings") ||
                key.includes("statistics") ||
                key.includes("dashboard") ||
                key.includes("restaurant") ||
                key.includes(`tenants/${restaurant?.tenantId}`)),
          );
        },
      });

      // Force refetch of current page data
      queryClient.refetchQueries({
        queryKey: ["email-settings", restaurant?.tenantId, restaurant?.id],
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

  const handleSave = () => {
    saveSettingsMutation.mutate();
  };

  if (!user || !restaurant) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <div className="p-6 max-w-4xl mx-auto">
        <div className="space-y-8">
          {/* Guest Section */}
          <Card>
            <CardHeader>
              <CardTitle>Guest</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-gray-700">
                    E-mail confirmation
                  </label>
                  <Switch
                    checked={guestSettings.sendBookingConfirmation}
                    onCheckedChange={(checked) =>
                      setGuestSettings((prev) => ({
                        ...prev,
                        sendBookingConfirmation: checked,
                      }))
                    }
                  />
                </div>
                <div className="text-xs text-gray-500 ml-4">
                  Send booking confirmation to the guest
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm text-gray-700">Reminder</label>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={guestSettings.sendReminder}
                      onCheckedChange={(checked) =>
                        setGuestSettings((prev) => ({
                          ...prev,
                          sendReminder: checked,
                        }))
                      }
                    />
                    <span className="text-sm">Send reminder to the guest</span>
                    <Select
                      value={guestSettings.reminderHours}
                      onValueChange={(value) =>
                        setGuestSettings((prev) => ({
                          ...prev,
                          reminderHours: value,
                        }))
                      }
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2">2</SelectItem>
                        <SelectItem value="24">24</SelectItem>
                        <SelectItem value="48">48</SelectItem>
                        <SelectItem value="72">72</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-sm">hours before visit</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm text-gray-700">Rescheduling</label>
                  <Switch
                    checked={guestSettings.allowRescheduling || false}
                    onCheckedChange={(checked) =>
                      setGuestSettings((prev) => ({
                        ...prev,
                        allowRescheduling: checked,
                      }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm text-gray-700">
                    Satisfaction surveys
                  </label>
                  <Switch
                    checked={guestSettings.satisfactionSurvey}
                    onCheckedChange={(checked) =>
                      setGuestSettings((prev) => ({
                        ...prev,
                        satisfactionSurvey: checked,
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-gray-700">
                    Review Site (Google etc)
                  </label>
                  <div className="text-xs text-gray-500">Request review</div>
                  <Select
                    value={guestSettings.reviewSite}
                    onValueChange={(value) =>
                      setGuestSettings((prev) => ({
                        ...prev,
                        reviewSite: value,
                      }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Google">Google</SelectItem>
                      <SelectItem value="TripAdvisor">TripAdvisor</SelectItem>
                      <SelectItem value="Yelp">Yelp</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Place Section */}
          <Card>
            <CardHeader>
              <CardTitle>Place</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-700 block mb-2">
                    Sent to
                  </label>
                  <Input
                    value={placeSettings.sentTo}
                    onChange={(e) =>
                      setPlaceSettings((prev) => ({
                        ...prev,
                        sentTo: e.target.value,
                      }))
                    }
                    className="w-full"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm text-gray-700">
                      E-mail booking
                    </label>
                    <div className="text-xs text-gray-500">
                      All · Only important or new
                    </div>
                  </div>
                  <Switch
                    checked={placeSettings.emailBooking}
                    onCheckedChange={(checked) =>
                      setPlaceSettings((prev) => ({
                        ...prev,
                        emailBooking: checked,
                      }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm text-gray-700">
                      Satisfaction surveys
                    </label>
                    <div className="text-xs text-gray-500">
                      All · Only if overall rating is below
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={placeSettings.satisfactionSurvey}
                      onCheckedChange={(checked) =>
                        setPlaceSettings((prev) => ({
                          ...prev,
                          satisfactionSurvey: checked,
                        }))
                      }
                    />
                    <Select
                      value={placeSettings.rating}
                      onValueChange={(value) =>
                        setPlaceSettings((prev) => ({ ...prev, rating: value }))
                      }
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3.0">3.0</SelectItem>
                        <SelectItem value="3.5">3.5</SelectItem>
                        <SelectItem value="4.0">4.0</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="pt-6">
            <Button
              onClick={handleSave}
              disabled={saveSettingsMutation.isPending}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {saveSettingsMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
