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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
          <p className="text-muted-foreground">
            Configure global system parameters and features
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

      <Card>
        <CardHeader>
          <CardTitle>Configuration Settings ({settings.length})</CardTitle>
          <CardDescription>
            Global system parameters and feature flags
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Key</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {settings.map((setting) => (
                <TableRow key={setting.id}>
                  <TableCell>
                    <code className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-sm">
                      {setting.key}
                    </code>
                  </TableCell>
                  <TableCell>
                    {getTypeBadge(setting.type)}
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs">
                      {setting.type === "json" ? (
                        <pre className="text-xs bg-slate-50 dark:bg-slate-800 p-2 rounded overflow-x-auto">
                          {formatValue(setting.value, setting.type)}
                        </pre>
                      ) : (
                        <span className="font-mono text-sm">
                          {formatValue(setting.value, setting.type)}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs text-sm text-muted-foreground">
                      {setting.description || "No description"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-muted-foreground">
                      {new Date(setting.updatedAt).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleEdit(setting)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {settings.length === 0 && (
            <div className="text-center py-8">
              <Settings className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No system settings found</p>
              <p className="text-sm text-muted-foreground">Create your first setting to get started</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}