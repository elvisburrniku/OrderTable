import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  User,
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
import { motion } from "framer-motion";

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
  { value: "kitchen-dashboard", label: "Kitchen Management" },
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<TenantUser | null>(null);

  // Pagination and filtering state
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(7);
  const [showFilters, setShowFilters] = useState(false);

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
    mutationFn: async (data: {
      role: string;
      permissions: string[];
      redirect: string;
    }) => {
      console.log("🔍 FRONTEND SENDING ROLE UPDATE:", data);
      return await apiRequest(
        "PUT",
        `/api/tenants/${tenantId}/role-permissions`,
        data,
      );
    },
    onSuccess: () => {
      // Individual success handling is done in handleSavePermissions
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
    if (!localRolePermissions) return;

    // Save each role individually since backend expects single role updates
    const savePromises = localRolePermissions.roles.map((role) => {
      if (role.role === "owner") return Promise.resolve(); // Skip owner role

      return saveRolePermissionsMutation.mutateAsync({
        role: role.role,
        permissions: role.permissions,
        redirect: role.redirect,
      });
    });

    Promise.all(savePromises)
      .then(() => {
        toast({
          title: "All Permissions Saved",
          description: "All role permissions have been successfully updated.",
        });
        setHasUnsavedChanges(false);
      })
      .catch((error) => {
        console.error("Error saving permissions:", error);
      });
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

  // Filter and pagination logic
  const filteredUsers = (users || []).filter((user) => {
    const matchesSearch =
      !searchTerm ||
      user.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.user.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === "all" || user.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentUsers = filteredUsers.slice(startIndex, endIndex);

  // Active filters count
  const activeFiltersCount = [
    searchTerm,
    roleFilter !== "all" ? roleFilter : null,
  ].filter(Boolean).length;

  // Helper functions

  const handleDeleteUser = (user: TenantUser) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteUser = () => {
    if (userToDelete) {
      removeUserMutation.mutate(userToDelete.userId);
    }
  };

  if (usersLoading || rolesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6">
        <div className="bg-white rounded-lg shadow">
          {/* Top Header */}
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <motion.h1
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-2xl font-bold text-gray-900 flex items-center space-x-2"
              >
                <Users className="h-6 w-6" />
                <span>Team Members</span>
              </motion.h1>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setGuardManagementOpen(!guardManagementOpen)}
                  className="border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Guard Management
                  {guardManagementOpen ? (
                    <ChevronUp className="h-4 w-4 ml-2" />
                  ) : (
                    <ChevronDown className="h-4 w-4 ml-2" />
                  )}
                </Button>
                <Dialog
                  open={inviteDialogOpen}
                  onOpenChange={setInviteDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button className="bg-green-600 hover:bg-green-700 text-white">
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
                                <Input
                                  placeholder="user@example.com"
                                  {...field}
                                />
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
            </div>
          </div>

          {/* Filters Section */}
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">
              Team Members
            </h2>

            {/* Modern Filters Section */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Collapsible open={showFilters} onOpenChange={setShowFilters}>
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="outline"
                        className="h-10 px-4 border-2 border-gray-200 hover:border-green-500 hover:bg-green-50 transition-all duration-200 flex items-center space-x-2"
                      >
                        <Filter className="w-4 h-4" />
                        <span>Filters</span>
                        {activeFiltersCount > 0 && (
                          <div className="bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center ml-2">
                            {activeFiltersCount}
                          </div>
                        )}
                        <ChevronDown
                          className={`w-4 h-4 transition-transform duration-200 ${showFilters ? "rotate-180" : ""}`}
                        />
                      </Button>
                    </CollapsibleTrigger>

                    <CollapsibleContent className="mt-4">
                      <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Search */}
                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-700">
                              Search
                            </Label>
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                              <Input
                                placeholder="Search by name or email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 h-10 bg-white border-gray-300 focus:border-green-500 focus:ring-green-500"
                              />
                            </div>
                          </div>

                          {/* Role Filter */}
                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-700">
                              Role
                            </Label>
                            <Select
                              value={roleFilter || "all"}
                              onValueChange={setRoleFilter}
                            >
                              <SelectTrigger className="h-10 bg-white border-gray-300 focus:border-green-500 focus:ring-green-500">
                                <SelectValue placeholder="All roles" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All roles</SelectItem>
                                {roles?.map((role) => (
                                  <SelectItem key={role.id} value={role.name}>
                                    {role.displayName}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Active Filters */}
                        {activeFiltersCount > 0 && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium text-gray-700">
                                  Active filters:
                                </span>
                                <div className="flex items-center space-x-2">
                                  {roleFilter !== "all" && (
                                    <Badge className="px-2 py-1 text-xs bg-blue-100 text-blue-800 border-blue-200">
                                      Role: {getRoleDisplayName(roleFilter)}
                                    </Badge>
                                  )}
                                  {searchTerm && (
                                    <Badge className="px-2 py-1 text-xs bg-purple-100 text-purple-800 border-purple-200">
                                      Search: {searchTerm}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSearchTerm("");
                                  setRoleFilter("all");
                                  setCurrentPage(1);
                                }}
                                className="text-xs px-3 py-1 border-gray-300 hover:bg-gray-50"
                              >
                                Clear all
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              </div>
            </div>

            {/* Enhanced Table */}
            <div className="bg-white rounded-xl border-2 border-gray-100 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Joined
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Provider
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {usersLoading ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center">
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                            className="flex flex-col items-center space-y-4"
                          >
                            <div className="animate-spin rounded-full h-8 w-8 border-2 border-green-500 border-t-transparent"></div>
                            <span className="text-gray-500 font-medium">
                              Loading team members...
                            </span>
                          </motion.div>
                        </td>
                      </tr>
                    ) : currentUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center">
                          <div className="flex flex-col items-center space-y-4">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                              <Users className="w-8 h-8 text-gray-400" />
                            </div>
                            <div>
                              <h3 className="text-gray-900 font-medium">
                                No team members found
                              </h3>
                              <p className="text-gray-500 text-sm mt-1">
                                {searchTerm || roleFilter !== "all"
                                  ? "Try adjusting your filters or search terms"
                                  : "No team members yet"}
                              </p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      currentUsers.map((user: TenantUser, index: number) => (
                        <motion.tr
                          key={user.userId}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                          className={`group hover:bg-blue-50 cursor-pointer transition-all duration-200 ${
                            index % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                          }`}
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
                                {user.user.name?.charAt(0)?.toUpperCase() ||
                                  "U"}
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">
                                  {user.user.name}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-gray-700">
                              {user.user.email}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <Badge
                              className={`px-3 py-1 text-xs font-medium rounded-full ${
                                user.role === "owner"
                                  ? "bg-purple-100 text-purple-800 border-purple-200"
                                  : user.role === "manager"
                                    ? "bg-blue-100 text-blue-800 border-blue-200"
                                    : "bg-green-100 text-green-800 border-green-200"
                              }`}
                            >
                              {getRoleDisplayName(user.role)}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-sm text-gray-600">
                              {new Date(user.createdAt).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <Badge className="px-3 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 border-blue-200">
                              {user.user.ssoProvider || "Email"}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditUser(user);
                                }}
                                className="h-8 w-8 p-0"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteUser(user);
                                }}
                                className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600 hover:border-red-300"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </motion.tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {filteredUsers.length > itemsPerPage && (
                <div className="px-6 py-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      {startIndex + 1}-
                      {Math.min(endIndex, filteredUsers.length)} of{" "}
                      {filteredUsers.length}
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                        className="px-3 py-1 h-8 text-sm"
                      >
                        First
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="w-8 h-8 p-0"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>

                      {/* Page Numbers */}
                      <div className="flex items-center space-x-1">
                        {Array.from(
                          { length: Math.min(3, totalPages) },
                          (_, i) => {
                            let pageNum;
                            if (totalPages <= 3) {
                              pageNum = i + 1;
                            } else if (currentPage <= 2) {
                              pageNum = i + 1;
                            } else if (currentPage >= totalPages - 1) {
                              pageNum = totalPages - 2 + i;
                            } else {
                              pageNum = currentPage - 1 + i;
                            }

                            return (
                              <Button
                                key={pageNum}
                                variant={
                                  currentPage === pageNum
                                    ? "default"
                                    : "outline"
                                }
                                size="sm"
                                onClick={() => setCurrentPage(pageNum)}
                                className={`w-8 h-8 p-0 ${
                                  currentPage === pageNum
                                    ? "bg-green-600 hover:bg-green-700 text-white"
                                    : "hover:bg-green-50"
                                }`}
                              >
                                {pageNum}
                              </Button>
                            );
                          },
                        )}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="w-8 h-8 p-0"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 h-8 text-sm"
                      >
                        Last
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Edit User Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-md">
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
                    onClick={() => setEditDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateUserMutation.isPending}>
                    {updateUserMutation.isPending
                      ? "Updating..."
                      : "Update Member"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Remove Team Member</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-gray-600">
                Are you sure you want to remove{" "}
                <strong>{userToDelete?.user.name}</strong> from the team?
              </p>
              <p className="text-red-600 text-sm mt-2">
                This action cannot be undone and will revoke their access
                immediately.
              </p>
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={confirmDeleteUser}
                disabled={removeUserMutation.isPending}
              >
                {removeUserMutation.isPending ? "Removing..." : "Remove Member"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Guard Management Collapsible Section */}
        <Collapsible
          open={guardManagementOpen}
          onOpenChange={setGuardManagementOpen}
          className="pt-3"
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
                            <div className="sticky top-4">
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
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center space-x-2">
                              <Shield className="h-5 w-5" />
                              <span>Available Roles</span>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="bg-white rounded-xl border-2 border-gray-100 overflow-hidden shadow-sm">
                              <div className="overflow-x-auto">
                                <table className="w-full">
                                  <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200">
                                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Role
                                      </th>
                                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Permissions
                                      </th>
                                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Default Page
                                      </th>
                                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Access Level
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100">
                                    {localRolePermissions.roles.map(
                                      (role, index) => (
                                        <motion.tr
                                          key={role.role}
                                          initial={{ opacity: 0, y: 10 }}
                                          animate={{ opacity: 1, y: 0 }}
                                          transition={{
                                            duration: 0.3,
                                            delay: index * 0.05,
                                          }}
                                          className={`group hover:bg-blue-50 transition-all duration-200 ${
                                            index % 2 === 0
                                              ? "bg-white"
                                              : "bg-gray-50/50"
                                          }`}
                                        >
                                          <td className="py-3 px-4">
                                            <div className="flex items-center space-x-3">
                                              <div
                                                className={`w-3 h-3 rounded-full ${
                                                  role.role === "owner"
                                                    ? "bg-purple-500"
                                                    : role.role === "manager"
                                                      ? "bg-blue-500"
                                                      : "bg-green-500"
                                                }`}
                                              ></div>
                                              <div>
                                                <div className="font-medium text-gray-900 capitalize">
                                                  {role.role.replace("_", " ")}
                                                </div>
                                                <Badge
                                                  className={`px-2 py-1 text-xs font-medium rounded-full ${
                                                    role.role === "owner"
                                                      ? "bg-purple-100 text-purple-800 border-purple-200"
                                                      : role.role === "manager"
                                                        ? "bg-blue-100 text-blue-800 border-blue-200"
                                                        : "bg-green-100 text-green-800 border-green-200"
                                                  }`}
                                                >
                                                  System Role
                                                </Badge>
                                              </div>
                                            </div>
                                          </td>
                                          <td className="py-3 px-4">
                                            <div className="flex items-center space-x-2">
                                              <span className="font-medium text-gray-900">
                                                {role.permissions.length}
                                              </span>
                                              <span className="text-sm text-gray-500">
                                                permissions
                                              </span>
                                            </div>
                                          </td>
                                          <td className="py-3 px-4">
                                            <Badge className="px-3 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 border-gray-200">
                                              {role.redirect || "dashboard"}
                                            </Badge>
                                          </td>
                                          <td className="py-3 px-4">
                                            <div className="space-y-1">
                                              <div className="flex flex-wrap gap-1">
                                                {role.permissions
                                                  .slice(0, 2)
                                                  .map((permission) => (
                                                    <Badge
                                                      key={permission}
                                                      variant="outline"
                                                      className="text-xs px-2 py-1"
                                                    >
                                                      {permission
                                                        .replace("access_", "")
                                                        .replace("_", " ")}
                                                    </Badge>
                                                  ))}
                                                {role.permissions.length >
                                                  2 && (
                                                  <Badge
                                                    variant="outline"
                                                    className="text-xs px-2 py-1 bg-blue-50 text-blue-700 border-blue-200"
                                                  >
                                                    +
                                                    {role.permissions.length -
                                                      2}{" "}
                                                    more
                                                  </Badge>
                                                )}
                                              </div>
                                            </div>
                                          </td>
                                        </motion.tr>
                                      ),
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
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
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
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
                    onClick={() => setEditDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateUserMutation.isPending}>
                    {updateUserMutation.isPending
                      ? "Updating..."
                      : "Update User"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
