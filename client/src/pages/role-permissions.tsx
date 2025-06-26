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
import { Settings, Users, Shield, ArrowRight, Save, RotateCcw, Grip, Plus, X } from "lucide-react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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

// Draggable Permission Item Component
interface DraggablePermissionProps {
  permission: Permission;
  isActive?: boolean;
}

function DraggablePermission({ permission, isActive }: DraggablePermissionProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: permission.key,
    data: {
      type: "permission",
      permission,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`
        flex items-center gap-2 p-2 rounded-lg border cursor-grab
        ${isDragging ? 'opacity-50' : ''}
        ${isActive ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted border-border'}
        transition-colors duration-200
      `}
    >
      <Grip className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm font-medium">{permission.label}</span>
    </div>
  );
}

// Droppable Zone Component
interface DroppableZoneProps {
  id: string;
  title: string;
  permissions: Permission[];
  children: React.ReactNode;
  className?: string;
}

function DroppableZone({ id, title, permissions, children, className = "" }: DroppableZoneProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: id,
  });

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm text-muted-foreground">{title}</h4>
        <Badge variant="secondary" className="text-xs">
          {permissions.length}
        </Badge>
      </div>
      <div
        ref={setNodeRef}
        className={`
          min-h-[200px] p-4 border-2 border-dashed rounded-lg transition-all duration-200
          ${isOver 
            ? 'border-primary bg-primary/10 border-solid' 
            : 'border-muted-foreground/25 bg-muted/10'
          }
        `}
      >
        <div className="space-y-2">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function RolePermissions() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();
  const [selectedRole, setSelectedRole] = useState<string>("manager");
  const [rolePermissions, setRolePermissions] = useState<{ [key: string]: string[] }>({});
  const [roleRedirects, setRoleRedirects] = useState<{ [key: string]: string }>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Debug state
  console.log("🔍 ROLE PERMISSIONS DEBUG:", {
    tenantId,
    selectedRole,
    rolePermissions,
    roleRedirects,
    hasChanges
  });

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const { data: permissionsData, isLoading, error } = useQuery<RolePermissionsData>({
    queryKey: [`/api/tenants/${tenantId}/role-permissions`],
    enabled: !!tenantId,
    retry: false,
  });

  // Debug API response
  console.log("🔍 API RESPONSE DEBUG:", {
    permissionsData,
    isLoading,
    error: error?.message,
    enabled: !!tenantId,
    queryKey: [`/api/tenants/${tenantId}/role-permissions`]
  });

  useEffect(() => {
    console.log("🔍 USE_EFFECT PERMISSIONS DATA:", permissionsData);
    if (permissionsData) {
      const permissions: { [key: string]: string[] } = {};
      const redirects: { [key: string]: string } = {};
      
      permissionsData.roles.forEach(role => {
        permissions[role.role] = role.permissions;
        redirects[role.role] = role.redirect;
      });
      
      console.log("🔍 SETTING ROLE PERMISSIONS:", permissions);
      console.log("🔍 SETTING ROLE REDIRECTS:", redirects);
      
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

  // Drag and drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || !permissionsData) return;

    const activePermission = active.data.current?.permission as Permission;
    const overId = over.id as string;

    if (!activePermission) return;

    const currentRolePermissions = rolePermissions[selectedRole] || [];
    const isCurrentlyAssigned = currentRolePermissions.includes(activePermission.key);

    // Handle dropping on assigned permissions zones (both pages and features)
    if (overId === `assigned-${selectedRole}` || overId === `assigned-features-${selectedRole}`) {
      if (!isCurrentlyAssigned) {
        setRolePermissions(prev => ({
          ...prev,
          [selectedRole]: [...currentRolePermissions, activePermission.key]
        }));
        setHasChanges(true);
      }
    }
    // Handle dropping on available permissions zones (both pages and features)
    else if (overId === `available-${selectedRole}` || overId === `available-features-${selectedRole}`) {
      if (isCurrentlyAssigned) {
        setRolePermissions(prev => ({
          ...prev,
          [selectedRole]: currentRolePermissions.filter(p => p !== activePermission.key)
        }));
        setHasChanges(true);
      }
    }
  };

  if (!tenantId) {
    console.log("🚨 NO TENANT ID - Will show error");
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No tenant context available. Please refresh the page.</p>
      </div>
    );
  }

  if (isLoading) {
    console.log("🔄 ROLE PERMISSIONS: Loading data...");
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        <span className="ml-2">Loading role permissions...</span>
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
    console.log("🚨 NO PERMISSIONS DATA - Component will show error");
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Failed to load permissions data.</p>
      </div>
    );
  }

  const availableRoles = permissionsData.roles.filter(r => r.role !== 'owner');
  
  // Debug roles
  console.log("🔍 ROLES DEBUG:", {
    allRoles: permissionsData.roles,
    availableRoles,
    filteredCount: availableRoles.length,
    selectedRole
  });
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
                  <DndContext
                    sensors={sensors}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    collisionDetection={closestCorners}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Available Permissions */}
                      <DroppableZone
                        id={`available-${selectedRole}`}
                        title="Available Permissions"
                        permissions={permissionsData.availablePermissions.pageAccess.filter(p => 
                          !currentRolePermissions.includes(p.key)
                        )}
                      >
                        <SortableContext
                          items={permissionsData.availablePermissions.pageAccess
                            .filter(p => !currentRolePermissions.includes(p.key))
                            .map(p => p.key)}
                          strategy={verticalListSortingStrategy}
                        >
                          {permissionsData.availablePermissions.pageAccess
                            .filter(p => !currentRolePermissions.includes(p.key))
                            .map((permission) => (
                              <DraggablePermission
                                key={permission.key}
                                permission={permission}
                                isActive={false}
                              />
                            ))}
                        </SortableContext>
                        
                        {permissionsData.availablePermissions.pageAccess.filter(p => 
                          !currentRolePermissions.includes(p.key)
                        ).length === 0 && (
                          <div className="text-center py-8 text-muted-foreground">
                            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">All permissions assigned</p>
                          </div>
                        )}
                      </DroppableZone>

                      {/* Assigned Permissions */}
                      <DroppableZone
                        id={`assigned-${selectedRole}`}
                        title="Assigned Permissions"
                        permissions={permissionsData.availablePermissions.pageAccess.filter(p => 
                          currentRolePermissions.includes(p.key)
                        )}
                      >
                        <SortableContext
                          items={currentRolePermissions}
                          strategy={verticalListSortingStrategy}
                        >
                          {permissionsData.availablePermissions.pageAccess
                            .filter(p => currentRolePermissions.includes(p.key))
                            .map((permission) => (
                              <DraggablePermission
                                key={permission.key}
                                permission={permission}
                                isActive={true}
                              />
                            ))}
                        </SortableContext>
                        
                        {currentRolePermissions.filter(p => p.startsWith('access_')).length === 0 && (
                          <div className="text-center py-8 text-muted-foreground">
                            <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No permissions assigned</p>
                            <p className="text-xs mt-1">Drag permissions here</p>
                          </div>
                        )}
                      </DroppableZone>
                    </div>

                    <DragOverlay>
                      {activeId ? (
                        <DraggablePermission
                          permission={
                            [...permissionsData.availablePermissions.pageAccess, ...permissionsData.availablePermissions.features]
                              .find(p => p.key === activeId)!
                          }
                          isActive={false}
                        />
                      ) : null}
                    </DragOverlay>
                  </DndContext>

                  {/* Quick Actions */}
                  <div className="flex items-center gap-2 pt-4 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Assign all page permissions
                        const allPagePermissions = permissionsData.availablePermissions.pageAccess.map(p => p.key);
                        setRolePermissions(prev => ({
                          ...prev,
                          [selectedRole]: [...new Set([...currentRolePermissions, ...allPagePermissions])]
                        }));
                        setHasChanges(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Assign All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Remove all page permissions
                        const pagePermissions = permissionsData.availablePermissions.pageAccess.map(p => p.key);
                        setRolePermissions(prev => ({
                          ...prev,
                          [selectedRole]: currentRolePermissions.filter(p => !pagePermissions.includes(p))
                        }));
                        setHasChanges(true);
                      }}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Remove All
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="features" className="space-y-4">
                  <DndContext
                    sensors={sensors}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    collisionDetection={closestCorners}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Available Feature Permissions */}
                      <DroppableZone
                        id={`available-features-${selectedRole}`}
                        title="Available Features"
                        permissions={permissionsData.availablePermissions.features.filter(p => 
                          !currentRolePermissions.includes(p.key)
                        )}
                      >
                        <SortableContext
                          items={permissionsData.availablePermissions.features
                            .filter(p => !currentRolePermissions.includes(p.key))
                            .map(p => p.key)}
                          strategy={verticalListSortingStrategy}
                        >
                          {permissionsData.availablePermissions.features
                            .filter(p => !currentRolePermissions.includes(p.key))
                            .map((permission) => (
                              <DraggablePermission
                                key={permission.key}
                                permission={permission}
                                isActive={false}
                              />
                            ))}
                        </SortableContext>
                        
                        {permissionsData.availablePermissions.features.filter(p => 
                          !currentRolePermissions.includes(p.key)
                        ).length === 0 && (
                          <div className="text-center py-8 text-muted-foreground">
                            <Settings className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">All features assigned</p>
                          </div>
                        )}
                      </DroppableZone>

                      {/* Assigned Feature Permissions */}
                      <DroppableZone
                        id={`assigned-features-${selectedRole}`}
                        title="Assigned Features"
                        permissions={permissionsData.availablePermissions.features.filter(p => 
                          currentRolePermissions.includes(p.key)
                        )}
                      >
                        <SortableContext
                          items={currentRolePermissions.filter(p => 
                            permissionsData.availablePermissions.features.some(f => f.key === p)
                          )}
                          strategy={verticalListSortingStrategy}
                        >
                          {permissionsData.availablePermissions.features
                            .filter(p => currentRolePermissions.includes(p.key))
                            .map((permission) => (
                              <DraggablePermission
                                key={permission.key}
                                permission={permission}
                                isActive={true}
                              />
                            ))}
                        </SortableContext>
                        
                        {currentRolePermissions.filter(p => 
                          permissionsData.availablePermissions.features.some(f => f.key === p)
                        ).length === 0 && (
                          <div className="text-center py-8 text-muted-foreground">
                            <Settings className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No features assigned</p>
                            <p className="text-xs mt-1">Drag features here</p>
                          </div>
                        )}
                      </DroppableZone>
                    </div>

                    <DragOverlay>
                      {activeId ? (
                        <DraggablePermission
                          permission={
                            [...permissionsData.availablePermissions.pageAccess, ...permissionsData.availablePermissions.features]
                              .find(p => p.key === activeId)!
                          }
                          isActive={false}
                        />
                      ) : null}
                    </DragOverlay>
                  </DndContext>

                  {/* Quick Actions for Features */}
                  <div className="flex items-center gap-2 pt-4 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Assign all feature permissions
                        const allFeaturePermissions = permissionsData.availablePermissions.features.map(p => p.key);
                        setRolePermissions(prev => ({
                          ...prev,
                          [selectedRole]: [...new Set([...currentRolePermissions, ...allFeaturePermissions])]
                        }));
                        setHasChanges(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Assign All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Remove all feature permissions
                        const featurePermissions = permissionsData.availablePermissions.features.map(p => p.key);
                        setRolePermissions(prev => ({
                          ...prev,
                          [selectedRole]: currentRolePermissions.filter(p => !featurePermissions.includes(p))
                        }));
                        setHasChanges(true);
                      }}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Remove All
                    </Button>
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