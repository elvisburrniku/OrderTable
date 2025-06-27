import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Users,
  UserPlus,
  Edit,
  Trash2,
  Shield,
  Settings,
  ChevronDown,
  ChevronUp,
  Save,
  RotateCcw,
  Grip,
  ArrowRight,
  X,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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

// Types for tenant user management
interface TenantUser {
  tenantId: number;
  userId: number;
  role: string;
  createdAt: string;
  user: {
    id: number;
    email: string;
    name: string;
    restaurantName?: string;
    ssoProvider?: string;
  };
}

interface Role {
  id: number;
  tenantId?: number;
  name: string;
  displayName: string;
  permissions: string;
  isSystem: boolean;
  createdAt: string;
}

// Validation schemas
const inviteUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  role: z.string().min(1, "Role is required"),
});

const updateUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  email: z.string().email("Invalid email address").optional(),
  role: z.string().min(1, "Role is required").optional(),
});

type InviteUserForm = z.infer<typeof inviteUserSchema>;
type UpdateUserForm = z.infer<typeof updateUserSchema>;

// Types for guard management (role permissions)
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
  { value: "menu-management", label: "Menu Management" },
  { value: "tables", label: "Table Management" },
  { value: "kitchen-management", label: "Kitchen Management" },
  { value: "users", label: "User Management" },
  { value: "billing", label: "Billing" },
  { value: "reports", label: "Reports" },
  { value: "notifications", label: "Notifications" },
  { value: "integrations", label: "Integrations" },
  { value: "settings", label: "Settings" },
];

// Draggable Permission Component
interface DraggablePermissionProps {
  permission: Permission;
  isActive?: boolean;
}

function DraggablePermission({
  permission,
  isActive,
}: DraggablePermissionProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: permission.key });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`
        flex items-center justify-between p-3 bg-white border rounded-lg cursor-grab
        hover:shadow-md transition-all duration-200 group
        ${isActive ? "ring-2 ring-blue-500 border-blue-300" : "border-gray-200"}
        ${isDragging ? "shadow-lg z-10" : ""}
      `}
    >
      <div className="flex items-center space-x-3">
        <Grip className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
        <span className="font-medium text-gray-700">{permission.label}</span>
      </div>
      <Badge variant="outline" className="text-xs">
        {permission.key}
      </Badge>
    </div>
  );
}

// Droppable Role Zone Component
interface DroppableRoleZoneProps {
  role: RolePermissions;
  permissions: Permission[];
  onRemovePermission: (role: string, permission: string) => void;
  onUpdateRedirect: (role: string, redirect: string) => void;
}

function DroppableRoleZone({
  role,
  permissions,
  onRemovePermission,
  onUpdateRedirect,
}: DroppableRoleZoneProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `role-${role.role}`,
  });

  const rolePermissions = permissions.filter((p) =>
    role.permissions.includes(p.key),
  );

  return (
    <div
      ref={setNodeRef}
      className={`
        border-2 border-dashed rounded-lg p-4 min-h-[200px] transition-all duration-200
        ${isOver ? "border-blue-500 bg-blue-50" : "border-gray-300"}
      `}
    >
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold text-lg capitalize">{role.role} Role</h4>
        <Badge variant="secondary">{role.permissions.length} permissions</Badge>
      </div>

      <div className="mb-4">
        <label className="text-sm font-medium text-gray-700 mb-2 block">
          Default Redirect Page
        </label>
        <Select
          value={role.redirect}
          onValueChange={(value) => onUpdateRedirect(role.role, value)}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
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

      <div className="space-y-2">
        {rolePermissions.length > 0 ? (
          rolePermissions.map((permission) => (
            <div
              key={permission.key}
              className="flex items-center justify-between p-2 bg-gray-50 rounded border"
            >
              <span className="text-sm font-medium">{permission.label}</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onRemovePermission(role.role, permission.key)}
                className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              Drag permissions here to assign to this role
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

interface TenantUsersManagementProps {
  tenantId: number;
}

export default function TenantUsersManagement({
  tenantId,
}: TenantUsersManagementProps) {
  const { toast } = useToast();
  const [editingUser, setEditingUser] = useState<TenantUser | null>(null);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Guard Management state
  const [guardManagementOpen, setGuardManagementOpen] = useState(false);
  const [activePermission, setActivePermission] = useState<string | null>(null);
  const [localRolePermissions, setLocalRolePermissions] =
    useState<RolePermissionsData | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Drag and Drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  // Fetch tenant users
  const { data: users, isLoading: usersLoading } = useQuery<TenantUser[]>({
    queryKey: [`/api/tenants/${tenantId}/users`],
    enabled: !!tenantId,
  });

  // Fetch available roles
  const {
    data: roles,
    isLoading: rolesLoading,
    error: rolesError,
  } = useQuery<Role[]>({
    queryKey: [`/api/tenants/${tenantId}/roles`],
    enabled: !!tenantId,
  });

  // Fetch role permissions for guard management
  const { data: rolePermissionsData, isLoading: rolePermissionsLoading } =
    useQuery<RolePermissionsData>({
      queryKey: [`/api/tenants/${tenantId}/role-permissions`],
      enabled: !!tenantId && guardManagementOpen,
    });

  // Debug logging
  console.log("TenantUsersManagement Debug:", {
    tenantId,
    rolesLoading,
    rolesError,
    roles,
    rolesLength: roles?.length,
    guardManagementOpen,
    rolePermissionsData,
  });

  // Form setup
  const inviteForm = useForm<InviteUserForm>({
    resolver: zodResolver(inviteUserSchema),
    defaultValues: {
      email: "",
      name: "",
      role: "",
    },
  });

  const updateForm = useForm<UpdateUserForm>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      name: "",
      email: "",
      role: "",
    },
  });

  // Mutations
  const inviteUserMutation = useMutation({
    mutationFn: async (data: InviteUserForm) => {
      return await apiRequest(
        "POST",
        `/api/tenants/${tenantId}/users/invite`,
        data,
      );
    },
    onSuccess: () => {
      toast({
        title: "User Invited",
        description: "User has been successfully invited to the team.",
      });
      inviteForm.reset();
      setInviteDialogOpen(false);
      queryClient.invalidateQueries({
        queryKey: [`/api/tenants/${tenantId}/users`],
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Invitation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async (data: UpdateUserForm & { userId: number }) => {
      const { userId, ...updateData } = data;
      return await apiRequest(
        "PUT",
        `/api/tenants/${tenantId}/users/${userId}`,
        updateData,
      );
    },
    onSuccess: () => {
      toast({
        title: "User Updated",
        description: "User information has been successfully updated.",
      });
      updateForm.reset();
      setEditDialogOpen(false);
      setEditingUser(null);
      queryClient.invalidateQueries({
        queryKey: [`/api/tenants/${tenantId}/users`],
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const removeUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      return await apiRequest(
        "DELETE",
        `/api/tenants/${tenantId}/users/${userId}`,
      );
    },
    onSuccess: () => {
      toast({
        title: "User Removed",
        description: "User has been successfully removed from the team.",
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/tenants/${tenantId}/users`],
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Removal Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Guard Management mutation
  const saveRolePermissionsMutation = useMutation({
    mutationFn: async (data: RolePermissionsData) => {
      return await apiRequest(
        "PUT",
        `/api/tenants/${tenantId}/role-permissions`,
        data,
      );
    },
    onSuccess: () => {
      toast({
        title: "Permissions Saved",
        description: "Role permissions have been successfully updated.",
      });
      setHasUnsavedChanges(false);
      queryClient.invalidateQueries({
        queryKey: [`/api/tenants/${tenantId}/role-permissions`],
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Save Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Initialize local state when data is loaded
  useEffect(() => {
    if (rolePermissionsData && !localRolePermissions) {
      setLocalRolePermissions(rolePermissionsData);
    }
  }, [rolePermissionsData, localRolePermissions]);

  const handleInviteUser = (data: InviteUserForm) => {
    inviteUserMutation.mutate(data);
  };

  const handleUpdateUser = (data: UpdateUserForm) => {
    if (editingUser) {
      updateUserMutation.mutate({ ...data, userId: editingUser.userId });
    }
  };

  const handleEditUser = (user: TenantUser) => {
    setEditingUser(user);
    updateForm.reset({
      name: user.user.name,
      email: user.user.email,
      role: user.role,
    });
    setEditDialogOpen(true);
  };

  const handleRemoveUser = (userId: number) => {
    if (confirm("Are you sure you want to remove this user from the team?")) {
      removeUserMutation.mutate(userId);
    }
  };

  const getRoleDisplayName = (roleName: string) => {
    const role = roles?.find((r) => r.name === roleName);
    return role?.displayName || roleName;
  };

  const getRoleBadgeVariant = (roleName: string) => {
    switch (roleName.toLowerCase()) {
      case "owner":
        return "default";
      case "manager":
        return "secondary";
      case "agent":
        return "outline";
      default:
        return "outline";
    }
  };

  // Guard Management handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActivePermission(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActivePermission(null);

    if (!over || !localRolePermissions) return;

    const permissionKey = active.id as string;
    const overId = over.id as string;

    // Handle dropping on role zones
    if (overId.startsWith("role-")) {
      const targetRole = overId.replace("role-", "");

      if (!localRolePermissions.roles.find((r) => r.role === targetRole))
        return;

      const updatedRoles = localRolePermissions.roles.map((role) => {
        if (role.role === targetRole) {
          // Add permission if not already present
          if (!role.permissions.includes(permissionKey)) {
            return {
              ...role,
              permissions: [...role.permissions, permissionKey],
            };
          }
        }
        return role;
      });

      setLocalRolePermissions({
        ...localRolePermissions,
        roles: updatedRoles,
      });
      setHasUnsavedChanges(true);
    }
  };

  const handleRemovePermission = (roleName: string, permissionKey: string) => {
    if (!localRolePermissions) return;

    const updatedRoles = localRolePermissions.roles.map((role) => {
      if (role.role === roleName) {
        return {
          ...role,
          permissions: role.permissions.filter((p) => p !== permissionKey),
        };
      }
      return role;
    });

    setLocalRolePermissions({
      ...localRolePermissions,
      roles: updatedRoles,
    });
    setHasUnsavedChanges(true);
  };

  const handleUpdateRedirect = (roleName: string, redirect: string) => {
    if (!localRolePermissions) return;

    const updatedRoles = localRolePermissions.roles.map((role) => {
      if (role.role === roleName) {
        return { ...role, redirect };
      }
      return role;
    });

    setLocalRolePermissions({
      ...localRolePermissions,
      roles: updatedRoles,
    });
    setHasUnsavedChanges(true);
  };

  const handleSavePermissions = () => {
    if (localRolePermissions) {
      saveRolePermissionsMutation.mutate(localRolePermissions);
    }
  };

  const handleResetPermissions = () => {
    if (rolePermissionsData) {
      setLocalRolePermissions(rolePermissionsData);
      setHasUnsavedChanges(false);
    }
  };

  const getAllPermissions = () => {
    if (!localRolePermissions) return [];

    return [
      ...localRolePermissions.availablePermissions.pageAccess,
      ...localRolePermissions.availablePermissions.features,
    ];
  };

  const getUnassignedPermissions = () => {
    if (!localRolePermissions) return [];

    const allPermissions = getAllPermissions();
    const assignedPermissions = new Set();

    localRolePermissions.roles.forEach((role) => {
      role.permissions.forEach((permission) => {
        assignedPermissions.add(permission);
      });
    });

    return allPermissions.filter((p) => !assignedPermissions.has(p.key));
  };

  if (usersLoading || rolesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <CardTitle>Team Members</CardTitle>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setGuardManagementOpen(!guardManagementOpen)}
            >
              <Settings className="h-4 w-4 mr-2" />
              Guard Management
              {guardManagementOpen ? (
                <ChevronUp className="h-4 w-4 ml-2" />
              ) : (
                <ChevronDown className="h-4 w-4 ml-2" />
              )}
            </Button>
            <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite New Team Member</DialogTitle>
                </DialogHeader>
                <Form {...inviteForm}>
                  <form
                    onSubmit={inviteForm.handleSubmit(handleInviteUser)}
                    className="space-y-4"
                  >
                    <FormField
                      control={inviteForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input placeholder="user@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={inviteForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={inviteForm.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Role</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a role" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {roles?.map((role) => (
                                <SelectItem key={role.id} value={role.name}>
                                  {role.displayName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setInviteDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={inviteUserMutation.isPending}
                      >
                        {inviteUserMutation.isPending
                          ? "Inviting..."
                          : "Send Invitation"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {users && users.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.userId}>
                    <TableCell className="font-medium">
                      {user.user.name}
                    </TableCell>
                    <TableCell>{user.user.email}</TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(user.role)}>
                        {getRoleDisplayName(user.role)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {user.user.ssoProvider ? (
                        <Badge variant="outline">{user.user.ssoProvider}</Badge>
                      ) : (
                        <Badge variant="secondary">Email</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditUser(user)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveUser(user.userId)}
                          disabled={removeUserMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                No team members yet
              </h3>
              <p className="text-muted-foreground mb-4">
                Start building your team by inviting new members.
              </p>
              <Button onClick={() => setInviteDialogOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Invite First User
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Guard Management Collapsible Section */}
      <Collapsible
        open={guardManagementOpen}
        onOpenChange={setGuardManagementOpen}
      >
        <CollapsibleContent>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Shield className="h-5 w-5" />
                  <CardTitle>Role Permissions Management</CardTitle>
                </div>
                <div className="flex items-center space-x-2">
                  {hasUnsavedChanges && (
                    <Badge variant="outline" className="text-orange-600">
                      Unsaved Changes
                    </Badge>
                  )}
                  <Button
                    onClick={handleResetPermissions}
                    variant="outline"
                    size="sm"
                    disabled={
                      !hasUnsavedChanges ||
                      saveRolePermissionsMutation.isPending
                    }
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset
                  </Button>
                  <Button
                    onClick={handleSavePermissions}
                    disabled={
                      !hasUnsavedChanges ||
                      saveRolePermissionsMutation.isPending
                    }
                    size="sm"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saveRolePermissionsMutation.isPending
                      ? "Saving..."
                      : "Save Changes"}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {rolePermissionsLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                </div>
              ) : localRolePermissions ? (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCorners}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                >
                  <Tabs defaultValue="drag-drop" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="drag-drop">
                        Drag & Drop Interface
                      </TabsTrigger>
                      <TabsTrigger value="overview">
                        Permissions Overview
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="drag-drop" className="space-y-6">
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Available Permissions */}
                        <div className="lg:col-span-1">
                          <h3 className="text-lg font-semibold mb-4 flex items-center">
                            <Grip className="h-5 w-5 mr-2" />
                            Available Permissions
                          </h3>
                          <div className="space-y-4">
                            <div>
                              <h4 className="font-medium text-sm text-gray-600 mb-2">
                                Page Access
                              </h4>
                              <SortableContext
                                items={localRolePermissions.availablePermissions.pageAccess.map(
                                  (p) => p.key,
                                )}
                                strategy={verticalListSortingStrategy}
                              >
                                <div className="space-y-2">
                                  {localRolePermissions.availablePermissions.pageAccess.map(
                                    (permission) => (
                                      <DraggablePermission
                                        key={permission.key}
                                        permission={permission}
                                        isActive={
                                          activePermission === permission.key
                                        }
                                      />
                                    ),
                                  )}
                                </div>
                              </SortableContext>
                            </div>

                            <div>
                              <h4 className="font-medium text-sm text-gray-600 mb-2">
                                Feature Access
                              </h4>
                              <SortableContext
                                items={localRolePermissions.availablePermissions.features.map(
                                  (p) => p.key,
                                )}
                                strategy={verticalListSortingStrategy}
                              >
                                <div className="space-y-2">
                                  {localRolePermissions.availablePermissions.features.map(
                                    (permission) => (
                                      <DraggablePermission
                                        key={permission.key}
                                        permission={permission}
                                        isActive={
                                          activePermission === permission.key
                                        }
                                      />
                                    ),
                                  )}
                                </div>
                              </SortableContext>
                            </div>
                          </div>
                        </div>

                        {/* Role Permission Zones */}
                        <div className="lg:col-span-2">
                          <h3 className="text-lg font-semibold mb-4 flex items-center">
                            <ArrowRight className="h-5 w-5 mr-2" />
                            Role Permission Assignment
                          </h3>
                          <div className="grid gap-6">
                            {localRolePermissions.roles.map((role) => (
                              <DroppableRoleZone
                                key={role.role}
                                role={role}
                                permissions={getAllPermissions()}
                                onRemovePermission={handleRemovePermission}
                                onUpdateRedirect={handleUpdateRedirect}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="overview" className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {localRolePermissions.roles.map((role) => (
                          <Card key={role.role}>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-base capitalize">
                                {role.role}
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium">
                                    Permissions:
                                  </span>
                                  <Badge variant="secondary">
                                    {role.permissions.length}
                                  </Badge>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium">
                                    Default Page:
                                  </span>
                                  <Badge variant="outline">
                                    {role.redirect}
                                  </Badge>
                                </div>
                                <div className="pt-2">
                                  <span className="text-sm font-medium mb-1 block">
                                    Granted Access:
                                  </span>
                                  <div className="flex flex-wrap gap-1">
                                    {role.permissions
                                      .slice(0, 3)
                                      .map((permission) => (
                                        <Badge
                                          key={permission}
                                          variant="outline"
                                          className="text-xs"
                                        >
                                          {permission}
                                        </Badge>
                                      ))}
                                    {role.permissions.length > 3 && (
                                      <Badge
                                        variant="outline"
                                        className="text-xs"
                                      >
                                        +{role.permissions.length - 3} more
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </TabsContent>
                  </Tabs>

                  <DragOverlay>
                    {activePermission ? (
                      <DraggablePermission
                        permission={
                          getAllPermissions().find(
                            (p) => p.key === activePermission,
                          ) || {
                            key: activePermission,
                            label: activePermission,
                          }
                        }
                        isActive
                      />
                    ) : null}
                  </DragOverlay>
                </DndContext>
              ) : (
                <div className="text-center py-8">
                  <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    Guard Management Unavailable
                  </h3>
                  <p className="text-muted-foreground">
                    Unable to load role permissions data.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Team Member</DialogTitle>
          </DialogHeader>
          <Form {...updateForm}>
            <form
              onSubmit={updateForm.handleSubmit(handleUpdateUser)}
              className="space-y-4"
            >
              <FormField
                control={updateForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={updateForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="user@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={updateForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {roles?.map((role) => (
                          <SelectItem key={role.id} value={role.name}>
                            {role.displayName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updateUserMutation.isPending}>
                  {updateUserMutation.isPending ? "Updating..." : "Update User"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Roles Summary Card */}
      {roles && roles.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <CardTitle>Available Roles</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {roles.map((role) => (
                <div key={role.id} className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-2">{role.displayName}</h4>
                  <Badge
                    variant={role.isSystem ? "default" : "secondary"}
                    className="mb-2"
                  >
                    {role.isSystem ? "System Role" : "Custom Role"}
                  </Badge>
                  <p className="text-sm text-muted-foreground">
                    {JSON.parse(role.permissions).length} permissions
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
