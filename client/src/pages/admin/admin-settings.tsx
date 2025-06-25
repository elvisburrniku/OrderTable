import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Settings, Plus, Edit, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SystemSetting {
  id: number;
  key: string;
  value: string | null;
  description: string | null;
  type: string;
  updatedBy: number | null;
  updatedAt: string;
}

const systemSettingSchema = z.object({
  key: z.string().min(2, "Key must be at least 2 characters"),
  value: z.string(),
  description: z.string().optional(),
  type: z.enum(["string", "number", "boolean", "json"]),
});

type SystemSettingForm = z.infer<typeof systemSettingSchema>;

interface AdminSettingsProps {
  token: string;
}

export function AdminSettings({ token }: AdminSettingsProps) {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSetting, setEditingSetting] = useState<SystemSetting | null>(null);
  const { toast } = useToast();

  const form = useForm<SystemSettingForm>({
    resolver: zodResolver(systemSettingSchema),
    defaultValues: {
      key: "",
      value: "",
      description: "",
      type: "string",
    },
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/admin/system-settings", {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch system settings");
      }

      const data = await response.json();
      setSettings(data);
    } catch (error) {
      console.error("Error fetching system settings:", error);
      toast({
        title: "Error",
        description: "Failed to load system settings",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: SystemSettingForm) => {
    try {
      const response = await fetch("/api/admin/system-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to save system setting");
      }

      toast({
        title: "Success",
        description: "System setting saved successfully",
      });

      setIsDialogOpen(false);
      setEditingSetting(null);
      form.reset();
      fetchSettings();
    } catch (error) {
      console.error("Error saving system setting:", error);
      toast({
        title: "Error",
        description: "Failed to save system setting",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (setting: SystemSetting) => {
    setEditingSetting(setting);
    form.reset({
      key: setting.key,
      value: setting.value || "",
      description: setting.description || "",
      type: setting.type as any,
    });
    setIsDialogOpen(true);
  };

  const getTypeBadge = (type: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      string: { variant: "default", label: "Text" },
      number: { variant: "secondary", label: "Number" },
      boolean: { variant: "outline", label: "Boolean" },
      json: { variant: "destructive", label: "JSON" },
    };

    const config = variants[type] || { variant: "outline", label: type };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatValue = (value: string | null, type: string) => {
    if (!value) return "Not set";
    
    if (type === "json") {
      try {
        const parsed = JSON.parse(value);
        return JSON.stringify(parsed, null, 2);
      } catch {
        return value;
      }
    }
    
    if (value.length > 50) {
      return value.substring(0, 50) + "...";
    }
    
    return value;
  };

  // Categorize settings for better organization
  const categorizeSettings = (settings: SystemSetting[]) => {
    const categories = {
      "Platform Identity": ["system_name", "system_version", "support_email"],
      "Tenant Management": ["max_trial_days", "auto_approve_signups", "max_restaurants_per_tenant", "max_users_per_tenant", "default_subscription_plan"],
      "Communication": ["enable_email_notifications", "enable_sms_notifications", "booking_confirmation_emails", "reminder_emails_enabled", "reminder_hours_before"],
      "Billing & Payments": ["default_currency", "enable_stripe_payments", "subscription_grace_period_days"],
      "Booking Settings": ["max_advance_booking_days", "min_advance_booking_hours", "default_booking_duration_minutes", "enable_guest_bookings", "require_phone_for_bookings"],
      "System Operations": ["maintenance_mode", "maintenance_message", "enable_debug_logging", "log_retention_days", "session_timeout_hours"],
      "Features": ["enable_calendar_integration", "enable_widgets", "enable_kitchen_management", "enable_analytics", "enable_multi_language"],
      "API & Integration": ["api_rate_limit_per_minute", "webhook_timeout_seconds", "enable_api_access"]
    };

    const categorized: Record<string, SystemSetting[]> = {};
    const uncategorized: SystemSetting[] = [];

    // Initialize categories
    Object.keys(categories).forEach(category => {
      categorized[category] = [];
    });

    settings.forEach(setting => {
      let foundCategory = false;
      for (const [category, keys] of Object.entries(categories)) {
        if (keys.includes(setting.key)) {
          categorized[category].push(setting);
          foundCategory = true;
          break;
        }
      }
      if (!foundCategory) {
        uncategorized.push(setting);
      }
    });

    // Add uncategorized settings if any
    if (uncategorized.length > 0) {
      categorized["Other Settings"] = uncategorized;
    }

    return categorized;
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const categorizedSettings = categorizeSettings(settings);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
          <p className="text-muted-foreground">
            Configure global system parameters and features ({settings.length} settings)
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingSetting(null);
              form.reset();
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Setting
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingSetting ? 'Edit System Setting' : 'Create System Setting'}
              </DialogTitle>
              <DialogDescription>
                Configure a system-wide setting or parameter
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="key"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Setting Key</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="e.g., max_upload_size, enable_notifications"
                          disabled={!!editingSetting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Value Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select value type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="string">Text</SelectItem>
                          <SelectItem value="number">Number</SelectItem>
                          <SelectItem value="boolean">Boolean</SelectItem>
                          <SelectItem value="json">JSON</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Value</FormLabel>
                      <FormControl>
                        {form.watch("type") === "json" ? (
                          <Textarea 
                            {...field} 
                            placeholder='{"key": "value"}'
                            rows={4}
                          />
                        ) : (
                          <Input 
                            {...field} 
                            placeholder="Setting value"
                            type={form.watch("type") === "number" ? "number" : "text"}
                          />
                        )}
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="Describe what this setting controls..."
                          rows={2}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    <Save className="h-4 w-4 mr-2" />
                    {editingSetting ? 'Update Setting' : 'Create Setting'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Display categorized settings */}
      <div className="space-y-6">
        {Object.entries(categorizedSettings).map(([category, categorySettings]) => {
          if (categorySettings.length === 0) return null;
          
          return (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  {category}
                  <Badge variant="secondary" className="ml-auto">
                    {categorySettings.length} settings
                  </Badge>
                </CardTitle>
                <CardDescription>
                  {category === "Platform Identity" && "Basic platform information and branding"}
                  {category === "Tenant Management" && "Control tenant limits and default settings"}
                  {category === "Communication" && "Email, SMS, and notification preferences"}
                  {category === "Billing & Payments" && "Payment processing and subscription settings"}
                  {category === "Booking Settings" && "Default booking rules and constraints"}
                  {category === "System Operations" && "Maintenance, logging, and session management"}
                  {category === "Features" && "Feature flags and integrations"}
                  {category === "API & Integration" && "API limits and external service settings"}
                  {category === "Other Settings" && "Additional custom settings"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {categorySettings.map((setting) => (
                    <div key={setting.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <code className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-sm font-mono">
                            {setting.key}
                          </code>
                          {getTypeBadge(setting.type)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {setting.description || "No description"}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="font-mono text-sm">
                            {setting.type === "boolean" ? (
                              <Badge variant={setting.value === "true" ? "default" : "secondary"}>
                                {setting.value === "true" ? "Enabled" : "Disabled"}
                              </Badge>
                            ) : (
                              <span className="max-w-[200px] truncate block">
                                {formatValue(setting.value, setting.type)}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Updated {new Date(setting.updatedAt).toLocaleDateString()}
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEdit(setting)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {settings.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No System Settings Found</h3>
              <p className="text-muted-foreground mb-4">
                System settings should be automatically initialized. Try restarting the server.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}