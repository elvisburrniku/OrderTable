import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Users,
  Plus,
  MoreHorizontal,
  Edit2,
  Trash2,
  Shield,
  Mail,
  UserPlus,
  Settings,
  Eye,
  EyeOff,
  Crown,
  ChefHat,
  Headphones,
  Briefcase
} from 'lucide-react';

// Form schemas
const inviteUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  roleId: z.string().min(1, 'Please select a role'),
});

const editUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  roleId: z.string().min(1, 'Please select a role'),
  isActive: z.boolean(),
});

const createRoleSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  displayName: z.string().min(2, 'Display name must be at least 2 characters'),
  permissions: z.array(z.string()).min(1, 'At least one permission is required'),
});

type InviteUserData = z.infer<typeof inviteUserSchema>;
type EditUserData = z.infer<typeof editUserSchema>;
type CreateRoleData = z.infer<typeof createRoleSchema>;

// User interface
interface User {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
  roleId: number;
  invitedAt: string | null;
  acceptedAt: string | null;
  role: {
    id: number;
    name: string;
    displayName: string;
    permissions: string;
    isSystem: boolean;
  };
}

// Role interface
interface Role {
  id: number;
  name: string;
  displayName: string;
  permissions: string;
  isSystem: boolean;
}

// Available permissions
const AVAILABLE_PERMISSIONS = [
  'users.view',
  'users.create',
  'users.edit',
  'users.delete',
  'bookings.view',
  'bookings.create',
  'bookings.edit',
  'bookings.delete',
  'orders.view',
  'orders.create',
  'orders.edit',
  'orders.delete',
  'tables.view',
  'tables.create',
  'tables.edit',
  'tables.delete',
  'customers.view',
  'customers.create',
  'customers.edit',
  'customers.delete',
  'settings.view',
  'settings.edit',
];

// Helper functions
const getRoleIcon = (roleName: string) => {
  switch (roleName) {
    case 'owner':
      return <Crown className="h-4 w-4 text-yellow-500" />;
    case 'manager':
      return <Briefcase className="h-4 w-4 text-blue-500" />;
    case 'agent':
      return <Headphones className="h-4 w-4 text-green-500" />;
    case 'kitchen_staff':
      return <ChefHat className="h-4 w-4 text-orange-500" />;
    default:
      return <Shield className="h-4 w-4 text-gray-500" />;
  }
};

const getPermissionBadgeColor = (permission: string) => {
  if (permission.includes('delete')) return 'destructive';
  if (permission.includes('edit') || permission.includes('create')) return 'default';
  return 'secondary';
};

const getStatusBadge = (user: User) => {
  if (!user.acceptedAt) {
    return <Badge variant="outline">Invited</Badge>;
  }
  return user.isActive ? (
    <Badge variant="default">Active</Badge>
  ) : (
    <Badge variant="secondary">Inactive</Badge>
  );
};

export default function UsersManagement({ restaurantId }: { restaurantId: number }) {
  // State
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showCreateRoleDialog, setShowCreateRoleDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showPermissions, setShowPermissions] = useState<{ [key: number]: boolean }>({});

  // Forms
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const inviteForm = useForm<InviteUserData>({
    resolver: zodResolver(inviteUserSchema),
    defaultValues: { name: '', email: '', roleId: '' },
  });

  const editForm = useForm<EditUserData>({
    resolver: zodResolver(editUserSchema),
    defaultValues: { name: '', email: '', roleId: '', isActive: true },
  });

  const roleForm = useForm<CreateRoleData>({
    resolver: zodResolver(createRoleSchema),
    defaultValues: { name: '', displayName: '', permissions: [] },
  });

  // Fetch users
  const { data: users, isLoading: loadingUsers } = useQuery({
    queryKey: [`/api/restaurant/${restaurantId}/users`],
    queryFn: async () => {
      // Use hardcoded JWT token for testing
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImlhdCI6MTc1MDkzNDA1Mn0.nctcgbrgWFMQjPNWAi-rSsrFW09DAln4MlsESkbzLiQ';
      const response = await fetch(`/api/restaurant/${restaurantId}/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json();
    },
  });

  // Fetch roles
  const { data: roles, isLoading: loadingRoles } = useQuery({
    queryKey: ['/api/restaurant/roles'],
    queryFn: async () => {
      // Use hardcoded JWT token for testing
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImlhdCI6MTc1MDkzNDA1Mn0.nctcgbrgWFMQjPNWAi-rSsrFW09DAln4MlsESkbzLiQ';
      const response = await fetch('/api/restaurant/roles', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Failed to fetch roles');
      return response.json();
    },
  });

  // Invite user mutation
  const inviteUserMutation = useMutation({
    mutationFn: async (data: InviteUserData) => {
      const response = await apiRequest('POST', `/api/restaurant/${restaurantId}/users/invite`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User invited successfully",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/restaurant/${restaurantId}/users`] });
      setShowInviteDialog(false);
      inviteForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Edit user mutation
  const editUserMutation = useMutation({
    mutationFn: async (data: EditUserData) => {
      const response = await apiRequest('PUT', `/api/restaurant/${restaurantId}/users/${selectedUser?.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/restaurant/${restaurantId}/users`] });
      setShowEditDialog(false);
      setSelectedUser(null);
      editForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('DELETE', `/api/restaurant/${restaurantId}/users/${selectedUser?.id}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User removed successfully",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/restaurant/${restaurantId}/users`] });
      setShowDeleteDialog(false);
      setSelectedUser(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Create role mutation
  const createRoleMutation = useMutation({
    mutationFn: async (data: CreateRoleData) => {
      const response = await apiRequest('POST', '/api/restaurant/roles', {
        ...data,
        permissions: JSON.stringify(data.permissions),
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Role created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/restaurant/roles'] });
      setShowCreateRoleDialog(false);
      roleForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update role permissions mutation
  const updateRolePermissionsMutation = useMutation({
    mutationFn: async (data: { role: string; permissions: string[]; redirect?: string }) => {
      // Get the current tenant ID from session or props
      const tenantId = 1; // You may need to pass this as a prop or get from context
      
      const response = await apiRequest('PUT', `/api/tenants/${tenantId}/role-permissions`, {
        role: data.role,
        permissions: data.permissions,
        redirect: data.redirect || 'dashboard'
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Role permissions updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/restaurant/roles'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Form handlers
  const onInviteUser = (data: InviteUserData) => {
    inviteUserMutation.mutate(data);
  };

  const onEditUser = (data: EditUserData) => {
    editUserMutation.mutate(data);
  };

  const onCreateRole = (data: CreateRoleData) => {
    createRoleMutation.mutate(data);
  };

  const onUpdateRolePermissions = (role: string, permissions: string[], redirect?: string) => {
    updateRolePermissionsMutation.mutate({
      role,
      permissions,
      redirect
    });
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    editForm.reset({
      name: user.name,
      email: user.email,
      roleId: user.roleId.toString(),
      isActive: user.isActive,
    });
    setShowEditDialog(true);
  };

  const handleDeleteUser = (user: User) => {
    setSelectedUser(user);
    setShowDeleteDialog(true);
  };

  const togglePermissions = (userId: number) => {
    setShowPermissions(prev => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  if (loadingUsers || loadingRoles) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="users">Team Members</TabsTrigger>
          <TabsTrigger value="roles">Roles & Permissions</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Team Members</h3>
              <p className="text-sm text-muted-foreground">
                Manage your restaurant's team members and their roles
              </p>
            </div>
            <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite Team Member</DialogTitle>
                  <DialogDescription>
                    Send an invitation to join your restaurant team
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={inviteForm.handleSubmit(onInviteUser)} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      {...inviteForm.register('name')}
                      placeholder="Enter full name"
                    />
                    {inviteForm.formState.errors.name && (
                      <p className="text-sm text-red-500">{inviteForm.formState.errors.name.message}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      {...inviteForm.register('email')}
                      placeholder="Enter email address"
                    />
                    {inviteForm.formState.errors.email && (
                      <p className="text-sm text-red-500">{inviteForm.formState.errors.email.message}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="roleId">Role</Label>
                    <Select onValueChange={(value) => inviteForm.setValue('roleId', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles?.map((role: Role) => (
                          <SelectItem key={role.id} value={role.id.toString()}>
                            {role.displayName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {inviteForm.formState.errors.roleId && (
                      <p className="text-sm text-red-500">{inviteForm.formState.errors.roleId.message}</p>
                    )}
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setShowInviteDialog(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={inviteUserMutation.isPending}>
                      {inviteUserMutation.isPending ? 'Sending...' : 'Send Invitation'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users?.map((user: User) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-primary/10 rounded-full">
                            {getRoleIcon(user.role.name)}
                          </div>
                          <div>
                            <div className="font-medium">{user.name}</div>
                            <div className="text-sm text-muted-foreground">{user.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{user.role.displayName}</Badge>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(user)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => togglePermissions(user.id)}
                          >
                            {showPermissions[user.id] ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                          {showPermissions[user.id] && (
                            <div className="flex flex-wrap gap-1">
                              {JSON.parse(user.role.permissions).slice(0, 3).map((permission: string) => (
                                <Badge key={permission} variant={getPermissionBadgeColor(permission)} className="text-xs">
                                  {permission.split('.')[1]}
                                </Badge>
                              ))}
                              {JSON.parse(user.role.permissions).length > 3 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{JSON.parse(user.role.permissions).length - 3} more
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditUser(user)}>
                              <Edit2 className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteUser(user)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {users?.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2" />
                  <p>No team members found</p>
                  <p className="text-sm">Invite your first team member to get started</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Roles & Permissions</h3>
              <p className="text-sm text-muted-foreground">
                Manage roles and their permissions for your restaurant
              </p>
            </div>
            <Dialog open={showCreateRoleDialog} onOpenChange={setShowCreateRoleDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Role
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Custom Role</DialogTitle>
                  <DialogDescription>
                    Create a custom role with specific permissions
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={roleForm.handleSubmit(onCreateRole)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="roleName">Role Name</Label>
                      <Input
                        id="roleName"
                        {...roleForm.register('name')}
                        placeholder="e.g., waiter"
                      />
                      {roleForm.formState.errors.name && (
                        <p className="text-sm text-red-500">{roleForm.formState.errors.name.message}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="displayName">Display Name</Label>
                      <Input
                        id="displayName"
                        {...roleForm.register('displayName')}
                        placeholder="e.g., Waiter"
                      />
                      {roleForm.formState.errors.displayName && (
                        <p className="text-sm text-red-500">{roleForm.formState.errors.displayName.message}</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label>Permissions</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2 max-h-40 overflow-y-auto">
                      {AVAILABLE_PERMISSIONS.map((permission) => (
                        <div key={permission} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={permission}
                            onChange={(e) => {
                              const current = roleForm.getValues('permissions');
                              if (e.target.checked) {
                                roleForm.setValue('permissions', [...current, permission]);
                              } else {
                                roleForm.setValue('permissions', current.filter(p => p !== permission));
                              }
                            }}
                          />
                          <Label htmlFor={permission} className="text-sm">
                            {permission.replace('.', ' ')}
                          </Label>
                        </div>
                      ))}
                    </div>
                    {roleForm.formState.errors.permissions && (
                      <p className="text-sm text-red-500">{roleForm.formState.errors.permissions.message}</p>
                    )}
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setShowCreateRoleDialog(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createRoleMutation.isPending}>
                      {createRoleMutation.isPending ? 'Creating...' : 'Create Role'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {roles?.map((role: Role) => (
              <Card key={role.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-primary/10 rounded-full">
                        {getRoleIcon(role.name)}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{role.displayName}</CardTitle>
                        <CardDescription>
                          {role.isSystem ? 'System Role' : 'Custom Role'}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant={role.isSystem ? 'secondary' : 'default'}>
                      {role.isSystem ? 'System' : 'Custom'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Permissions:</Label>
                    <div className="flex flex-wrap gap-1">
                      {JSON.parse(role.permissions).map((permission: string) => (
                        <Badge key={permission} variant={getPermissionBadgeColor(permission)} className="text-xs">
                          {permission.replace('.', ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Team Member</DialogTitle>
            <DialogDescription>
              Update team member information and permissions
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit(onEditUser)} className="space-y-4">
            <div>
              <Label htmlFor="editName">Name</Label>
              <Input
                id="editName"
                {...editForm.register('name')}
                placeholder="Enter full name"
              />
              {editForm.formState.errors.name && (
                <p className="text-sm text-red-500">{editForm.formState.errors.name.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="editEmail">Email</Label>
              <Input
                id="editEmail"
                type="email"
                {...editForm.register('email')}
                placeholder="Enter email address"
              />
              {editForm.formState.errors.email && (
                <p className="text-sm text-red-500">{editForm.formState.errors.email.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="editRoleId">Role</Label>
              <Select onValueChange={(value) => editForm.setValue('roleId', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {roles?.map((role: Role) => (
                    <SelectItem key={role.id} value={role.id.toString()}>
                      {role.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {editForm.formState.errors.roleId && (
                <p className="text-sm text-red-500">{editForm.formState.errors.roleId.message}</p>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={editForm.watch('isActive')}
                onCheckedChange={(checked) => editForm.setValue('isActive', checked)}
              />
              <Label htmlFor="isActive">Active</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={editUserMutation.isPending}>
                {editUserMutation.isPending ? 'Updating...' : 'Update Member'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {selectedUser?.name} from your team? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteUserMutation.mutate()}
              disabled={deleteUserMutation.isPending}
              className="bg-red-500 hover:bg-red-600"
            >
              {deleteUserMutation.isPending ? 'Removing...' : 'Remove Member'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}