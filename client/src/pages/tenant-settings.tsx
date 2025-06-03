
import { useState } from "react";
import { useTenant } from "@/lib/tenant";
import { useAuth } from "@/lib/auth.tsx";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building, Users, Settings, Plus, Trash2, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function TenantSettings() {
  const { user } = useAuth();
  const { tenant, tenantUsers, canManageTenant, canManageUsers } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: "",
    role: "member"
  });

  const { data: tenantSettings, isLoading } = useQuery({
    queryKey: ["/api/tenant", tenant?.id, "settings"],
    enabled: !!tenant && canManageTenant,
  });

  const updateTenantMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/tenant/${tenant?.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update tenant");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenant"] });
      toast({ title: "Tenant updated successfully" });
    },
  });

  const inviteUserMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/tenant/${tenant?.id}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to invite user");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenant"] });
      setIsInviteDialogOpen(false);
      setInviteForm({ email: "", role: "member" });
      toast({ title: "User invited successfully" });
    },
  });

  const removeUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await fetch(`/api/tenant/${tenant?.id}/users/${userId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to remove user");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenant"] });
      toast({ title: "User removed successfully" });
    },
  });

  if (!tenant) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <Building className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900">No tenant selected</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating or joining a tenant.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tenant Settings</h1>
          <p className="text-gray-600">Manage your organization settings and team members.</p>
        </div>
      </div>

      {/* Tenant Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Building className="h-5 w-5" />
            <span>Organization Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Organization Name</Label>
              <Input
                id="name"
                value={tenant.name}
                disabled={!canManageTenant}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="subdomain">Subdomain</Label>
              <Input
                id="subdomain"
                value={tenant.subdomain || ""}
                disabled={!canManageTenant}
                className="mt-1"
                placeholder="your-company"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="customDomain">Custom Domain</Label>
            <Input
              id="customDomain"
              value={tenant.customDomain || ""}
              disabled={!canManageTenant}
              className="mt-1"
              placeholder="booking.yourcompany.com"
            />
          </div>
          {canManageTenant && (
            <Button onClick={() => updateTenantMutation.mutate({})}>
              Save Changes
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Team Members */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Team Members</span>
            </div>
            {canManageUsers && (
              <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Invite User
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Invite Team Member</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="inviteEmail">Email</Label>
                      <Input
                        id="inviteEmail"
                        type="email"
                        value={inviteForm.email}
                        onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="inviteRole">Role</Label>
                      <Select
                        value={inviteForm.role}
                        onValueChange={(value) => setInviteForm(prev => ({ ...prev, role: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="viewer">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button 
                      onClick={() => inviteUserMutation.mutate(inviteForm)}
                      disabled={!inviteForm.email}
                      className="w-full"
                    >
                      Send Invitation
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                {canManageUsers && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenantUsers.map((tenantUser) => (
                <TableRow key={tenantUser.id}>
                  <TableCell className="font-medium">{user?.name}</TableCell>
                  <TableCell>{user?.email}</TableCell>
                  <TableCell>
                    <Badge variant={tenantUser.role === "owner" ? "default" : "secondary"}>
                      {tenantUser.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={tenantUser.isActive ? "default" : "secondary"}>
                      {tenantUser.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  {canManageUsers && (
                    <TableCell>
                      {tenantUser.role !== "owner" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeUserMutation.mutate(tenantUser.userId)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
