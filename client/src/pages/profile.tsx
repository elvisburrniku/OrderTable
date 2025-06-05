
import { useState } from "react";
import { useAuth } from "@/lib/auth.tsx";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { User, Building, Phone, Mail, MapPin, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Profile() {
  const { user, restaurant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [userForm, setUserForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
  });
  
  const [restaurantForm, setRestaurantForm] = useState({
    name: restaurant?.name || "",
    address: restaurant?.address || "",
    phone: restaurant?.phone || "",
    email: restaurant?.email || "",
    description: restaurant?.description || "",
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const updateUserMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/users/${user?.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update user");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/validate"] });
      toast({ title: "User profile updated successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateRestaurantMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update restaurant");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/validate"] });
      toast({ title: "Restaurant profile updated successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updatePasswordMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/users/${user?.id}/change-password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update password");
      }
      return response.json();
    },
    onSuccess: () => {
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      toast({ title: "Password updated successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateUserMutation.mutate(userForm);
  };

  const handleRestaurantSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateRestaurantMutation.mutate(restaurantForm);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast({
        title: "Error",
        description: "New password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }

    updatePasswordMutation.mutate({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <div className="bg-white border-b">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-6">
            <h1 className="text-xl font-semibold">Profile</h1>
            <nav className="flex space-x-6">
              <a href={`/${restaurant?.tenantId}/dashboard`} className="text-gray-600 hover:text-gray-900">
                Booking
              </a>
              <a href={`/${restaurant?.tenantId}/bookings`} className="text-gray-600 hover:text-gray-900">
                CRM
              </a>
              <a href={`/${restaurant?.tenantId}/activity-log`} className="text-gray-600 hover:text-gray-900">
                Archive
              </a>
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">{restaurant?.name}</span>
            <Button variant="outline" size="sm">
              Profile
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* User Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>User Profile</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUserSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="userName">Full Name</Label>
                  <Input
                    id="userName"
                    value={userForm.name}
                    onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="userEmail">Email</Label>
                  <Input
                    id="userEmail"
                    type="email"
                    value={userForm.email}
                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                    required
                  />
                </div>
              </div>
              <Button type="submit" disabled={updateUserMutation.isPending}>
                <Save className="h-4 w-4 mr-2" />
                {updateUserMutation.isPending ? "Saving..." : "Save User Profile"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Restaurant Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Building className="h-5 w-5" />
              <span>Restaurant Profile</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRestaurantSubmit} className="space-y-4">
              <div>
                <Label htmlFor="restaurantName">Restaurant Name</Label>
                <Input
                  id="restaurantName"
                  value={restaurantForm.name}
                  onChange={(e) => setRestaurantForm({ ...restaurantForm, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="restaurantPhone">Phone</Label>
                  <Input
                    id="restaurantPhone"
                    type="tel"
                    value={restaurantForm.phone}
                    onChange={(e) => setRestaurantForm({ ...restaurantForm, phone: e.target.value })}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                <div>
                  <Label htmlFor="restaurantEmail">Email</Label>
                  <Input
                    id="restaurantEmail"
                    type="email"
                    value={restaurantForm.email}
                    onChange={(e) => setRestaurantForm({ ...restaurantForm, email: e.target.value })}
                    placeholder="info@restaurant.com"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="restaurantAddress">Address</Label>
                <Input
                  id="restaurantAddress"
                  value={restaurantForm.address}
                  onChange={(e) => setRestaurantForm({ ...restaurantForm, address: e.target.value })}
                  placeholder="123 Main St, City, State 12345"
                />
              </div>
              <div>
                <Label htmlFor="restaurantDescription">Description</Label>
                <Textarea
                  id="restaurantDescription"
                  value={restaurantForm.description}
                  onChange={(e) => setRestaurantForm({ ...restaurantForm, description: e.target.value })}
                  placeholder="Tell customers about your restaurant..."
                  rows={4}
                />
              </div>
              <Button type="submit" disabled={updateRestaurantMutation.isPending}>
                <Save className="h-4 w-4 mr-2" />
                {updateRestaurantMutation.isPending ? "Saving..." : "Save Restaurant Profile"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Password Change */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Change Password</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    required
                    minLength={6}
                  />
                </div>
                <div>
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    required
                    minLength={6}
                  />
                </div>
              </div>
              <Button type="submit" disabled={updatePasswordMutation.isPending}>
                <Save className="h-4 w-4 mr-2" />
                {updatePasswordMutation.isPending ? "Updating..." : "Update Password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
