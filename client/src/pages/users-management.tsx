import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useRestaurantAuth } from '@/lib/restaurant-auth';
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
  name: z.string().min(2, 'Role name must be at least 2 characters'),
  displayName: z.string().min(2, 'Display name must be at least 2 characters'),
  permissions: z.array(z.string()).min(1, 'Please select at least one permission'),
});

type InviteUserData = z.infer<typeof inviteUserSchema>;
type EditUserData = z.infer<typeof editUserSchema>;
type CreateRoleData = z.infer<typeof createRoleSchema>;

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

interface Role {
  id: number;
  name: string;
  displayName: string;
  permissions: string;
  isSystem: boolean;
}

const AVAILABLE_PERMISSIONS = [
  { id: 'bookings.view', name: 'View Bookings', category: 'Bookings' },
  { id: 'bookings.create', name: 'Create Bookings', category: 'Bookings' },
  { id: 'bookings.edit', name: 'Edit Bookings', category: 'Bookings' },
  { id: 'bookings.delete', name: 'Delete Bookings', category: 'Bookings' },
  { id: 'orders.view', name: 'View Orders', category: 'Orders' },
  { id: 'orders.create', name: 'Create Orders', category: 'Orders' },
  { id: 'orders.edit', name: 'Edit Orders', category: 'Orders' },
  { id: 'orders.delete', name: 'Delete Orders', category: 'Orders' },
  { id: 'customers.view', name: 'View Customers', category: 'Customers' },
  { id: 'customers.create', name: 'Create Customers', category: 'Customers' },
  { id: 'customers.edit', name: 'Edit Customers', category: 'Customers' },
  { id: 'tables.view', name: 'View Tables', category: 'Tables' },
  { id: 'tables.create', name: 'Create Tables', category: 'Tables' },
  { id: 'tables.edit', name: 'Edit Tables', category: 'Tables' },
  { id: 'users.view', name: 'View Users', category: 'Users' },
  { id: 'users.create', name: 'Invite Users', category: 'Users' },
  { id: 'users.edit', name: 'Edit Users', category: 'Users' },
  { id: 'users.delete', name: 'Remove Users', category: 'Users' },
  { id: 'settings.view', name: 'View Settings', category: 'Settings' },
  { id: 'settings.edit', name: 'Edit Settings', category: 'Settings' },
  { id: 'analytics.view', name: 'View Analytics', category: 'Analytics' },
];

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

const getStatusBadge = (user: User) => {
  if (!user.acceptedAt) {
    return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Pending</Badge>;
  }
  if (!user.isActive) {
    return <Badge variant="destructive">Inactive</Badge>;
  }
  return <Badge variant="default" className="bg-green-600">Active</Badge>;
};

export default function UsersManagement({ restaurantId }: { restaurantId: number }) {
  const { user, hasPermission } = useRestaurantAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  // Forms
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
      const token = localStorage.getItem('restaurant_token');
      const response = await apiRequest('GET', `/api/restaurant/${restaurantId}/users`, undefined, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json();
    },
    enabled: hasPermission('users.view'),
  });

  // Fetch roles
  const { data: roles, isLoading: loadingRoles } = useQuery({
    queryKey: ['/api/restaurant/roles'],
    queryFn: async () => {
      const token = localStorage.getItem('restaurant_token');
      const response = await apiRequest('GET', '/api/restaurant/roles', undefined, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch roles');
      return response.json();
    },
  });

  // Invite user mutation
  const inviteUserMutation = useMutation({
    mutationFn: async (data: InviteUserData) => {
      const token = localStorage.getItem('restaurant_token');
      const response = await apiRequest('POST', `/api/restaurant/${restaurantId}/users/invite`, data, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to invite user');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "User invited successfully" });
      queryClient.invalidateQueries({ queryKey: [`/api/restaurant/${restaurantId}/users`] });
      setIsInviteDialogOpen(false);
      inviteForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async (data: EditUserData & { userId: number }) => {
      const token = localStorage.getItem('restaurant_token');
      const response = await apiRequest('PUT', `/api/restaurant/${restaurantId}/users/${data.userId}`, data, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update user');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "User updated successfully" });
      queryClient.invalidateQueries({ queryKey: [`/api/restaurant/${restaurantId}/users`] });
      setIsEditDialogOpen(false);
      setSelectedUser(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const token = localStorage.getItem('restaurant_token');
      const response = await apiRequest('DELETE', `/api/restaurant/${restaurantId}/users/${userId}`, undefined, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to remove user');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "User removed successfully" });
      queryClient.invalidateQueries({ queryKey: [`/api/restaurant/${restaurantId}/users`] });
      setUserToDelete(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Create role mutation
  const createRoleMutation = useMutation({
    mutationFn: async (data: CreateRoleData) => {
      const token = localStorage.getItem('restaurant_token');
      const response = await apiRequest('POST', '/api/restaurant/roles', {
        ...data,
        permissions: JSON.stringify(data.permissions),
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create role');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Role created successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/restaurant/roles'] });
      setIsRoleDialogOpen(false);
      roleForm.reset();
      setSelectedPermissions([]);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const onInviteUser = (data: InviteUserData) => {
    inviteUserMutation.mutate(data);
  };

  const onEditUser = (data: EditUserData) => {
    if (selectedUser) {
      updateUserMutation.mutate({ ...data, userId: selectedUser.id });
    }
  };

  const onCreateRole = (data: CreateRoleData) => {
    createRoleMutation.mutate({ ...data, permissions: selectedPermissions });
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    editForm.reset({
      name: user.name,
      email: user.email,
      roleId: user.roleId.toString(),
      isActive: user.isActive,
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteUser = (user: User) => {
    setUserToDelete(user);
  };

  const togglePermission = (permissionId: string) => {
    setSelectedPermissions(prev => 
      prev.includes(permissionId) 
        ? prev.filter(p => p !== permissionId)
        : [...prev, permissionId]
    );
  };

  const groupedPermissions = AVAILABLE_PERMISSIONS.reduce((acc, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = [];
    }
    acc[permission.category].push(permission);
    return acc;
  }, {} as Record<string, typeof AVAILABLE_PERMISSIONS>);

  if (!hasPermission('users.view')) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold">Access Denied</h3>
          <p className="text-muted-foreground">You don't have permission to view users.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Team Management</h1>
          <p className="text-muted-foreground">Manage your restaurant team members and their roles</p>
        </div>
        <div className="flex gap-2">
          {hasPermission('users.create') && (
            <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
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
                    Send an invitation to add a new team member to your restaurant.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={inviteForm.handleSubmit(onInviteUser)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      {...inviteForm.register('name')}
                      placeholder="Enter full name"
                    />
                    {inviteForm.formState.errors.name && (
                      <p className="text-sm text-red-500">{inviteForm.formState.errors.name.message}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
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

                  <div className="space-y-2">
                    <Label htmlFor="roleId">Role</Label>
                    <Select value={inviteForm.watch('roleId')} onValueChange={(value) => inviteForm.setValue('roleId', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles?.map((role: Role) => (
                          <SelectItem key={role.id} value={role.id.toString()}>
                            <div className="flex items-center gap-2">
                              {getRoleIcon(role.name)}
                              {role.displayName}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {inviteForm.formState.errors.roleId && (
                      <p className="text-sm text-red-500">{inviteForm.formState.errors.roleId.message}</p>
                    )}
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={inviteUserMutation.isPending}>
                      {inviteUserMutation.isPending ? 'Sending...' : 'Send Invitation'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
          
          <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Create Role
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Custom Role</DialogTitle>
                <DialogDescription>
                  Create a custom role with specific permissions for your team members.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={roleForm.handleSubmit(onCreateRole)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="roleName">Role Name</Label>
                    <Input
                      id="roleName"
                      {...roleForm.register('name')}
                      placeholder="e.g., assistant_manager"
                    />
                    {roleForm.formState.errors.name && (
                      <p className="text-sm text-red-500">{roleForm.formState.errors.name.message}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="displayName">Display Name</Label>
                    <Input
                      id="displayName"
                      {...roleForm.register('displayName')}
                      placeholder="e.g., Assistant Manager"
                    />
                    {roleForm.formState.errors.displayName && (
                      <p className="text-sm text-red-500">{roleForm.formState.errors.displayName.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <Label>Permissions</Label>
                  <div className="grid gap-4">
                    {Object.entries(groupedPermissions).map(([category, permissions]) => (
                      <Card key={category}>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm">{category}</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-2">
                          {permissions.map((permission) => (
                            <div key={permission.id} className="flex items-center space-x-2">
                              <Switch
                                id={permission.id}
                                checked={selectedPermissions.includes(permission.id)}
                                onCheckedChange={() => togglePermission(permission.id)}
                              />
                              <Label htmlFor={permission.id} className="text-sm">
                                {permission.name}
                              </Label>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  {selectedPermissions.length === 0 && (
                    <p className="text-sm text-red-500">Please select at least one permission</p>
                  )}
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsRoleDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createRoleMutation.isPending || selectedPermissions.length === 0}>
                    {createRoleMutation.isPending ? 'Creating...' : 'Create Role'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">Team Members</TabsTrigger>
          <TabsTrigger value="roles">Roles & Permissions</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>
                Manage your restaurant team members and their access levels
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingUsers ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-muted rounded-full animate-pulse" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted rounded animate-pulse" />
                        <div className="h-3 bg-muted rounded w-2/3 animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : users?.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold">No team members yet</h3>
                  <p className="text-muted-foreground mb-4">Start building your team by inviting members</p>
                  {hasPermission('users.create') && (
                    <Button onClick={() => setIsInviteDialogOpen(true)}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Invite First Member
                    </Button>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users?.map((user: User) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-primary/10 rounded-full">
                              {getRoleIcon(user.role?.name)}
                            </div>
                            <div>
                              <div className="font-medium">{user.name}</div>
                              <div className="text-sm text-muted-foreground">{user.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{user.role?.displayName}</Badge>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(user)}
                        </TableCell>
                        <TableCell>
                          {user.acceptedAt 
                            ? new Date(user.acceptedAt).toLocaleDateString()
                            : user.invitedAt 
                              ? `Invited ${new Date(user.invitedAt).toLocaleDateString()}`
                              : 'Not set'
                          }
                        </TableCell>
                        <TableCell className="text-right">
                          {(hasPermission('users.edit') || hasPermission('users.delete')) && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {hasPermission('users.edit') && (
                                  <DropdownMenuItem onClick={() => handleEditUser(user)}>
                                    <Edit2 className="h-4 w-4 mr-2" />
                                    Edit User
                                  </DropdownMenuItem>
                                )}
                                {hasPermission('users.delete') && !user.role?.isSystem && (
                                  <DropdownMenuItem 
                                    onClick={() => handleDeleteUser(user)}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Remove User
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Roles & Permissions</CardTitle>
              <CardDescription>
                Manage roles and their associated permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingRoles ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="space-y-2">
                          <div className="h-4 bg-muted rounded w-32 animate-pulse" />
                          <div className="h-3 bg-muted rounded w-48 animate-pulse" />
                        </div>
                        <div className="h-6 bg-muted rounded w-16 animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {roles?.map((role: Role) => (
                    <Card key={role.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3">
                            <div className="p-2 bg-primary/10 rounded-full">
                              {getRoleIcon(role.name)}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold">{role.displayName}</h3>
                                {role.isSystem && (
                                  <Badge variant="secondary" className="text-xs">System</Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">
                                Role: {role.name}
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {JSON.parse(role.permissions).map((permission: string) => (
                                  <Badge key={permission} variant="outline" className="text-xs">
                                    {permission.split('.')[1]}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                          {!role.isSystem && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                  <Edit2 className="h-4 w-4 mr-2" />
                                  Edit Role
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-red-600">
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete Role
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Team Member</DialogTitle>
            <DialogDescription>
              Update team member information and permissions.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit(onEditUser)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editName">Full Name</Label>
              <Input
                id="editName"
                {...editForm.register('name')}
                placeholder="Enter full name"
              />
              {editForm.formState.errors.name && (
                <p className="text-sm text-red-500">{editForm.formState.errors.name.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="editEmail">Email Address</Label>
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

            <div className="space-y-2">
              <Label htmlFor="editRoleId">Role</Label>
              <Select value={editForm.watch('roleId')} onValueChange={(value) => editForm.setValue('roleId', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {roles?.map((role: Role) => (
                    <SelectItem key={role.id} value={role.id.toString()}>
                      <div className="flex items-center gap-2">
                        {getRoleIcon(role.name)}
                        {role.displayName}
                      </div>
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
              <Label htmlFor="isActive">Active User</Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateUserMutation.isPending}>
                {updateUserMutation.isPending ? 'Updating...' : 'Update User'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {userToDelete?.name} from your team? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => userToDelete && deleteUserMutation.mutate(userToDelete.id)}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteUserMutation.isPending}
            >
              {deleteUserMutation.isPending ? 'Removing...' : 'Remove User'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}