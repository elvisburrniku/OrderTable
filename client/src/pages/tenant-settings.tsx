
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Building, Users, Settings, Plus, Trash2, UserPlus, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function TenantSettings() {
  const { user } = useAuth();
  const { tenant, tenantUsers, canManageTenant, canManageUsers, tenantId } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: "",
    role: "member"
  });

  // Use tenantId from URL params if available, otherwise from tenant object
  const currentTenantId = tenantId || tenant?.id;

  const { data: tenantData, isLoading } = useQuery({
    queryKey: ["/api/tenant", currentTenantId],
    enabled: !!currentTenantId,
    queryFn: async () => {
      const res = await fetch(`/api/tenant/${currentTenantId}`);
      if (!res.ok) throw new Error("Failed to fetch tenant");
      return res.json();
    }
  });

  const updateTenantMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/tenant/${currentTenantId}`, {
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
      const res = await fetch(`/api/tenant/${currentTenantId}/invite`, {
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
      const res = await fetch(`/api/tenant/${currentTenantId}/users/${userId}`, {
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

  if (isLoading) {
    return <div className="p-6">Loading tenant settings...</div>;
  }

  if (!currentTenantId || !tenantData?.tenant) {
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

  const currentTenant = tenantData.tenant;
  const currentTenantUsers = tenantData.users || [];

  return (
    <TooltipProvider>
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
                <Label htmlFor="name" className="flex items-center space-x-2">
                  <span>Organization Name</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-gray-400 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>The display name for your organization that will be shown to customers</p>
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Input
                  id="name"
                  value={currentTenant.name || ""}
                  disabled={!canManageTenant}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="subdomain" className="flex items-center space-x-2">
                  <span>Subdomain</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-gray-400 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Your unique subdomain for accessing the booking system (e.g., your-company.readytable.com)</p>
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Input
                  id="subdomain"
                  value={currentTenant.slug || ""}
                  disabled={!canManageTenant}
                  className="mt-1"
                  placeholder="your-company"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="customDomain" className="flex items-center space-x-2">
                <span>Custom Domain</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-gray-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Use your own domain for the booking system (e.g., booking.yourcompany.com)</p>
                  </TooltipContent>
                </Tooltip>
              </Label>
              <Input
                id="customDomain"
                value={currentTenant.customDomain || ""}
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
                      <Label htmlFor="inviteEmail" className="flex items-center space-x-2">
                        <span>Email</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-gray-400 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Enter the email address of the person you want to invite to your organization</p>
                          </TooltipContent>
                        </Tooltip>
                      </Label>
                      <Input
                        id="inviteEmail"
                        type="email"
                        value={inviteForm.email}
                        onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="inviteRole" className="flex items-center space-x-2">
                        <span>Role</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-gray-400 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Choose the role: Admin (full access), Member (standard access), or Viewer (read-only)</p>
                          </TooltipContent>
                        </Tooltip>
                      </Label>
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
              {currentTenantUsers.map((tenantUser: any) => (
                <TableRow key={tenantUser.userId}>
                  <TableCell className="font-medium">{tenantUser.user?.name || "Unknown"}</TableCell>
                  <TableCell>{tenantUser.user?.email || "Unknown"}</TableCell>
                  <TableCell>
                    <Badge variant={tenantUser.role === "owner" ? "default" : "secondary"}>
                      {tenantUser.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="default">
                      Active
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
    </TooltipProvider>
  );
}
