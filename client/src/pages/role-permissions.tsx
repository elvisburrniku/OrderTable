import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useTenant } from "@/lib/tenant";
import { Settings, Users, Shield, ArrowRight, Save, RotateCcw } from "lucide-react";

interface Permission {
  key: string;
  label: string;
}

interface RolePermissions {
  role: string;
  permissions: string[];
  redirect: string;
}

interface RolePermissionsData {
  roles: RolePermissions[];
  availablePermissions: {
    pageAccess: Permission[];
    features: Permission[];
  };
}

const redirectOptions = [
  { value: "dashboard", label: "Dashboard" },
  { value: "bookings", label: "Bookings" },
  { value: "customers", label: "Customers" },
  { value: "menu", label: "Menu Management" },
  { value: "tables", label: "Table Management" },
  { value: "kitchen", label: "Kitchen Management" },
  { value: "users", label: "User Management" },
  { value: "billing", label: "Billing" },
  { value: "reports", label: "Reports" },
  { value: "notifications", label: "Notifications" },
  { value: "integrations", label: "Integrations" },
  { value: "settings", label: "Settings" },
];

export default function RolePermissions() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();
  const [selectedRole, setSelectedRole] = useState<string>("manager");
  const [rolePermissions, setRolePermissions] = useState<{ [key: string]: string[] }>({});
  const [roleRedirects, setRoleRedirects] = useState<{ [key: string]: string }>({});
  const [hasChanges, setHasChanges] = useState(false);

  const { data: permissionsData, isLoading, error } = useQuery<RolePermissionsData>({
    queryKey: [`/api/tenants/${tenantId}/role-permissions`],
    enabled: !!tenantId,
    retry: false,
  });

  useEffect(() => {
    if (permissionsData) {
      const permissions: { [key: string]: string[] } = {};
      const redirects: { [key: string]: string } = {};
      
      permissionsData.roles.forEach(role => {
        permissions[role.role] = role.permissions;
        redirects[role.role] = role.redirect;
      });
      
      setRolePermissions(permissions);
      setRoleRedirects(redirects);
    }
  }, [permissionsData]);

  const updatePermissionsMutation = useMutation({
    mutationFn: async (data: { role: string; permissions: string[]; redirect: string }) => {
      return apiRequest("PUT", `/api/tenants/${tenantId}/role-permissions`, data);
    },
    onSuccess: () => {
      toast({
        title: "Permissions Updated",
        description: "Role permissions have been updated successfully.",
      });
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: [`/api/tenants/${tenantId}/role-permissions`] });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update role permissions.",
        variant: "destructive",
      });
    },
  });

  const handlePermissionToggle = (role: string, permission: string) => {
    const currentPermissions = rolePermissions[role] || [];
    const newPermissions = currentPermissions.includes(permission)
      ? currentPermissions.filter(p => p !== permission)
      : [...currentPermissions, permission];
    
    setRolePermissions(prev => ({
      ...prev,
      [role]: newPermissions
    }));
    setHasChanges(true);
  };

  const handleRedirectChange = (role: string, redirect: string) => {
    setRoleRedirects(prev => ({
      ...prev,
      [role]: redirect
    }));
    setHasChanges(true);
  };

  const handleSaveChanges = () => {
    if (!selectedRole) return;
    
    updatePermissionsMutation.mutate({
      role: selectedRole,
      permissions: rolePermissions[selectedRole] || [],
      redirect: roleRedirects[selectedRole] || "dashboard"
    });
  };

  const handleResetRole = () => {
    if (!permissionsData || !selectedRole) return;
    
    const originalRole = permissionsData.roles.find(r => r.role === selectedRole);
    if (originalRole) {
      setRolePermissions(prev => ({
        ...prev,
        [selectedRole]: originalRole.permissions
      }));
      setRoleRedirects(prev => ({
        ...prev,
        [selectedRole]: originalRole.redirect
      }));
      setHasChanges(false);
    }
  };

  if (!tenantId) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No tenant context available. Please refresh the page.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    const errorData = error as any;
    if (errorData?.status === 403) {
      return (
        <div className="text-center py-8">
          <div className="max-w-md mx-auto">
            <Shield className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-4">
              You don't have permission to manage role permissions. Contact your administrator for access.
            </p>
            <p className="text-sm text-muted-foreground">
              Required permission: User Management
            </p>
          </div>
        </div>
      );
    }
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Failed to load permissions data.</p>
      </div>
    );
  }

  if (!permissionsData) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Failed to load permissions data.</p>
      </div>
    );
  }

  const availableRoles = permissionsData.roles.filter(r => r.role !== 'owner');
  const currentRolePermissions = rolePermissions[selectedRole] || [];
  const currentRoleRedirect = roleRedirects[selectedRole] || "dashboard";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Role Permissions
          </h1>
          <p className="text-muted-foreground">
            Configure page access and permissions for each user role
          </p>
        </div>
        
        {hasChanges && (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleResetRole} size="sm">
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button onClick={handleSaveChanges} size="sm" disabled={updatePermissionsMutation.isPending}>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Role Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Roles
            </CardTitle>
            <CardDescription>
              Select a role to configure
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {availableRoles.map((role) => (
              <Button
                key={role.role}
                variant={selectedRole === role.role ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setSelectedRole(role.role)}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="capitalize">{role.role.replace('_', ' ')}</span>
                  <Badge variant="secondary" className="ml-2">
                    {(rolePermissions[role.role] || []).filter(p => p.startsWith('access_')).length}
                  </Badge>
                </div>
              </Button>
            ))}
          </CardContent>
        </Card>

        {/* Permission Configuration */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="capitalize">
                {selectedRole.replace('_', ' ')} Permissions
              </CardTitle>
              <CardDescription>
                Configure page access and feature permissions for this role
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="pages" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="pages">Page Access</TabsTrigger>
                  <TabsTrigger value="features">Feature Permissions</TabsTrigger>
                  <TabsTrigger value="redirect">Default Redirect</TabsTrigger>
                </TabsList>

                <TabsContent value="pages" className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {permissionsData.availablePermissions.pageAccess.map((permission) => (
                      <div key={permission.key} className="flex items-center space-x-2">
                        <Switch
                          id={permission.key}
                          checked={currentRolePermissions.includes(permission.key)}
                          onCheckedChange={() => handlePermissionToggle(selectedRole, permission.key)}
                        />
                        <Label htmlFor={permission.key} className="flex-1 cursor-pointer">
                          {permission.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="features" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {permissionsData.availablePermissions.features.map((permission) => (
                      <div key={permission.key} className="flex items-center space-x-2">
                        <Switch
                          id={permission.key}
                          checked={currentRolePermissions.includes(permission.key)}
                          onCheckedChange={() => handlePermissionToggle(selectedRole, permission.key)}
                        />
                        <Label htmlFor={permission.key} className="flex-1 cursor-pointer">
                          {permission.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="redirect" className="space-y-4">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="redirect-select">Default Page Redirect</Label>
                      <p className="text-sm text-muted-foreground mb-2">
                        Choose which page users with this role will be redirected to after login
                      </p>
                      <Select 
                        value={currentRoleRedirect} 
                        onValueChange={(value) => handleRedirectChange(selectedRole, value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select default page" />
                        </SelectTrigger>
                        <SelectContent>
                          {redirectOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="flex items-center gap-2 text-sm">
                        <ArrowRight className="h-4 w-4" />
                        <span className="font-medium">
                          {selectedRole.replace('_', ' ')} users will be redirected to:
                        </span>
                        <Badge variant="outline">
                          {redirectOptions.find(opt => opt.value === currentRoleRedirect)?.label}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Permission Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Permission Summary</CardTitle>
          <CardDescription>
            Overview of page access permissions for all roles
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {availableRoles.map((role) => {
              const permissions = rolePermissions[role.role] || [];
              const pageAccess = permissions.filter(p => p.startsWith('access_'));
              const redirect = roleRedirects[role.role] || "dashboard";
              
              return (
                <div key={role.role} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <div className="font-medium capitalize">
                      {role.role.replace('_', ' ')}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {pageAccess.length} pages accessible • Redirects to {redirect}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {pageAccess.map((permission) => {
                      const label = permissionsData.availablePermissions.pageAccess
                        .find(p => p.key === permission)?.label;
                      return (
                        <Badge key={permission} variant="secondary" className="text-xs">
                          {label}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}