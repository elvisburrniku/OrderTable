import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth.tsx";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Settings as SettingsIcon,
  Clock,
  Bell,
  Palette,
  Mail,
  Save,
  Globe,
  Shield,
  CreditCard,
  MessageSquare,
  Calendar,
  Users,
  AlertCircle,
  DollarSign,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function Settings() {
  const { user, restaurant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [emailSettings, setEmailSettings] = useState({
    enableBookingConfirmation: true,
    enableBookingReminders: true,
    enableCancellationNotice: true,
    reminderHoursBefore: 24,
    fromEmail: restaurant?.email || "",
    fromName: restaurant?.name || "",
  });

  const [appSettings, setAppSettings] = useState({
    timeZone: "America/New_York",
    dateFormat: "MM/dd/yyyy",
    timeFormat: "12h",
    defaultBookingDuration: 120,
    maxAdvanceBookingDays: 30,
    enableWalkIns: true,
    enableWaitingList: true,
    autoConfirmBookings: false,
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(
        `/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/settings`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
      );
      if (!response.ok) throw new Error("Failed to update settings");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/validate"] });
      toast({ title: "Settings updated successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSaveSettings = () => {
    updateSettingsMutation.mutate({
      emailSettings,
      appSettings,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6 space-y-6">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <SettingsIcon className="h-5 w-5" />
              <span>General Settings</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="timeZone">Time Zone</Label>
                <Select
                  value={appSettings.timeZone}
                  onValueChange={(value) =>
                    setAppSettings({ ...appSettings, timeZone: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="America/New_York">
                      Eastern Time
                    </SelectItem>
                    <SelectItem value="America/Chicago">
                      Central Time
                    </SelectItem>
                    <SelectItem value="America/Denver">
                      Mountain Time
                    </SelectItem>
                    <SelectItem value="America/Los_Angeles">
                      Pacific Time
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="dateFormat">Date Format</Label>
                <Select
                  value={appSettings.dateFormat}
                  onValueChange={(value) =>
                    setAppSettings({ ...appSettings, dateFormat: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MM/dd/yyyy">MM/DD/YYYY</SelectItem>
                    <SelectItem value="dd/MM/yyyy">DD/MM/YYYY</SelectItem>
                    <SelectItem value="yyyy-MM-dd">YYYY-MM-DD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="timeFormat">Time Format</Label>
                <Select
                  value={appSettings.timeFormat}
                  onValueChange={(value) =>
                    setAppSettings({ ...appSettings, timeFormat: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12h">12 Hour (AM/PM)</SelectItem>
                    <SelectItem value="24h">24 Hour</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="defaultDuration">
                  Default Booking Duration (minutes)
                </Label>
                <Input
                  id="defaultDuration"
                  type="number"
                  value={appSettings.defaultBookingDuration}
                  onChange={(e) =>
                    setAppSettings({
                      ...appSettings,
                      defaultBookingDuration: parseInt(e.target.value),
                    })
                  }
                />
              </div>
            </div>
            <div>
              <Label htmlFor="maxAdvance">Maximum Advance Booking Days</Label>
              <Input
                id="maxAdvance"
                type="number"
                value={appSettings.maxAdvanceBookingDays}
                onChange={(e) =>
                  setAppSettings({
                    ...appSettings,
                    maxAdvanceBookingDays: parseInt(e.target.value),
                  })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Booking Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Booking Settings</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Enable Walk-ins</Label>
                <p className="text-sm text-gray-600">
                  Allow walk-in customers without reservations
                </p>
              </div>
              <Switch
                checked={appSettings.enableWalkIns}
                onCheckedChange={(checked) =>
                  setAppSettings({ ...appSettings, enableWalkIns: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Enable Waiting List</Label>
                <p className="text-sm text-gray-600">
                  Allow customers to join waiting list when fully booked
                </p>
              </div>
              <Switch
                checked={appSettings.enableWaitingList}
                onCheckedChange={(checked) =>
                  setAppSettings({ ...appSettings, enableWaitingList: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Auto-confirm Bookings</Label>
                <p className="text-sm text-gray-600">
                  Automatically confirm bookings without manual approval
                </p>
              </div>
              <Switch
                checked={appSettings.autoConfirmBookings}
                onCheckedChange={(checked) =>
                  setAppSettings({
                    ...appSettings,
                    autoConfirmBookings: checked,
                  })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Email Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Mail className="h-5 w-5" />
              <span>Email Notifications</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fromName">From Name</Label>
                <Input
                  id="fromName"
                  value={emailSettings.fromName}
                  onChange={(e) =>
                    setEmailSettings({
                      ...emailSettings,
                      fromName: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="fromEmail">From Email</Label>
                <Input
                  id="fromEmail"
                  type="email"
                  value={emailSettings.fromEmail}
                  onChange={(e) =>
                    setEmailSettings({
                      ...emailSettings,
                      fromEmail: e.target.value,
                    })
                  }
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Booking Confirmation Emails</Label>
                <p className="text-sm text-gray-600">
                  Send confirmation email when booking is made
                </p>
              </div>
              <Switch
                checked={emailSettings.enableBookingConfirmation}
                onCheckedChange={(checked) =>
                  setEmailSettings({
                    ...emailSettings,
                    enableBookingConfirmation: checked,
                  })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Booking Reminder Emails</Label>
                <p className="text-sm text-gray-600">
                  Send reminder email before booking
                </p>
              </div>
              <Switch
                checked={emailSettings.enableBookingReminders}
                onCheckedChange={(checked) =>
                  setEmailSettings({
                    ...emailSettings,
                    enableBookingReminders: checked,
                  })
                }
              />
            </div>
            <div>
              <Label htmlFor="reminderHours">
                Reminder Hours Before Booking
              </Label>
              <Input
                id="reminderHours"
                type="number"
                value={emailSettings.reminderHoursBefore}
                onChange={(e) =>
                  setEmailSettings({
                    ...emailSettings,
                    reminderHoursBefore: parseInt(e.target.value),
                  })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSaveSettings}
            disabled={updateSettingsMutation.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            {updateSettingsMutation.isPending
              ? "Saving..."
              : "Save All Settings"}
          </Button>
        </div>
      </div>
    </div>
  );
}
