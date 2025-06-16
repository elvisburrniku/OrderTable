import { useState } from "react";
import { useAuth } from "@/lib/auth.tsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, UserCheck } from "lucide-react";

export default function BookingAgents() {
  const { user, restaurant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingAgent, setEditingAgent] = useState<any>(null);
  const [currentAgent, setCurrentAgent] = useState({
    name: "",
    email: "",
    phone: "",
    role: "agent",
    isActive: true,
    notes: ""
  });

  // Fetch booking agents
  const { data: agentsList, isLoading } = useQuery({
    queryKey: [`/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/booking-agents`],
    enabled: !!restaurant?.id && !!restaurant?.tenantId,
  });

  // Save agent mutation
  const saveAgentMutation = useMutation({
    mutationFn: async () => {
      const agentData = {
        name: currentAgent.name,
        email: currentAgent.email,
        phone: currentAgent.phone,
        role: currentAgent.role,
        isActive: currentAgent.isActive,
        notes: currentAgent.notes,
      };

      if (editingAgent) {
        return apiRequest("PUT", `/api/tenants/${restaurant.tenantId}/restaurants/${restaurant.id}/booking-agents/${editingAgent.id}`, agentData);
      } else {
        return apiRequest("POST", `/api/tenants/${restaurant.tenantId}/restaurants/${restaurant.id}/booking-agents`, agentData);
      }
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: editingAgent ? "Booking agent updated successfully" : "Booking agent created successfully",
      });
      queryClient.invalidateQueries({ 
        queryKey: [`/api/tenants/${restaurant.tenantId}/restaurants/${restaurant.id}/booking-agents`] 
      });
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save booking agent",
        variant: "destructive",
      });
      console.error("Error saving agent:", error);
    },
  });

  // Delete agent mutation
  const deleteAgentMutation = useMutation({
    mutationFn: async (agentId: number) => {
      return apiRequest("DELETE", `/api/tenants/${restaurant.tenantId}/restaurants/${restaurant.id}/booking-agents/${agentId}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Booking agent deleted successfully",
      });
      queryClient.invalidateQueries({ 
        queryKey: [`/api/tenants/${restaurant.tenantId}/restaurants/${restaurant.id}/booking-agents`] 
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete booking agent",
        variant: "destructive",
      });
      console.error("Error deleting agent:", error);
    },
  });

  if (!user || !restaurant) {
    return null;
  }

  const resetForm = () => {
    setCurrentAgent({
      name: "",
      email: "",
      phone: "",
      role: "agent",
      isActive: true,
      notes: ""
    });
    setEditingAgent(null);
    setShowCreateForm(false);
  };

  const handleSave = () => {
    if (!currentAgent.name.trim() || !currentAgent.email.trim() || !currentAgent.phone.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    saveAgentMutation.mutate();
  };

  const handleEdit = (agent: any) => {
    setEditingAgent(agent);
    setCurrentAgent({
      name: agent.name,
      email: agent.email,
      phone: agent.phone,
      role: agent.role,
      isActive: agent.isActive,
      notes: agent.notes || ""
    });
    setShowCreateForm(true);
  };

  const handleDelete = (agentId: number) => {
    if (confirm("Are you sure you want to delete this booking agent?")) {
      deleteAgentMutation.mutate(agentId);
    }
  };

  if (showCreateForm) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="p-6 max-w-2xl mx-auto">
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={() => resetForm()}
              className="text-blue-600 hover:text-blue-700 mb-4"
            >
              ← Back to Booking Agents
            </Button>
            <h1 className="text-2xl font-semibold text-gray-900">
              {editingAgent ? "Edit" : "Add"} Booking Agent
            </h1>
          </div>

          <Card>
            <CardContent className="p-6 space-y-6">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={currentAgent.name}
                  onChange={(e) => setCurrentAgent(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter agent name"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={currentAgent.email}
                  onChange={(e) => setCurrentAgent(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter email address"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  value={currentAgent.phone}
                  onChange={(e) => setCurrentAgent(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Enter phone number"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="role">Role</Label>
                <Select
                  value={currentAgent.role}
                  onValueChange={(value) => setCurrentAgent(prev => ({ ...prev, role: value }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="agent">Booking Agent</SelectItem>
                    <SelectItem value="concierge">Concierge</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={currentAgent.notes}
                  onChange={(e) => setCurrentAgent(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes about this agent"
                  rows={3}
                  className="mt-1"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="active"
                  checked={currentAgent.isActive}
                  onCheckedChange={(checked) => setCurrentAgent(prev => ({ ...prev, isActive: !!checked }))}
                />
                <Label htmlFor="active">Active (agent can create bookings)</Label>
              </div>

              <div className="flex gap-3 pt-4">
                <Button 
                  onClick={handleSave}
                  disabled={saveAgentMutation.isPending}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {saveAgentMutation.isPending ? "Saving..." : "Save"}
                </Button>
                <Button 
                  variant="outline"
                  onClick={resetForm}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Booking agents</h1>
          <p className="text-gray-600 max-w-4xl">
            Here you have the opportunity to register external booking agents or a concierge who will be able to accept bookings on behalf of guests, but without having a login to easyTable.
          </p>
          <p className="text-gray-600 mt-2 max-w-4xl">
            If the agent uses his own phone number and/or email address to create bookings, the system will automatically update the existing guest profile, and therefore overwrites the guest's name on all previous bookings created with this phone number or email address.
          </p>
          <p className="text-gray-600 mt-2 max-w-4xl">
            To avoid this, booking agents can be registered below. This way, the system knows that new guest profiles must be created for all bookings to avoid guest information to be overwritten.
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Booking agents</CardTitle>
              <Button 
                onClick={() => setShowCreateForm(true)}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add agent
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : agentsList && agentsList.length > 0 ? (
              <div className="space-y-4">
                {agentsList.map((agent: any) => (
                  <div key={agent.id} className="border rounded-lg p-4 bg-white">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <UserCheck className="w-4 h-4 text-green-600" />
                          <h3 className="font-semibold text-lg">{agent.name}</h3>
                          <span className={`px-2 py-1 rounded text-xs ${agent.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
                            {agent.isActive ? "Active" : "Inactive"}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Email:</span> {agent.email}
                          </div>
                          <div>
                            <span className="font-medium">Phone:</span> {agent.phone}
                          </div>
                          <div>
                            <span className="font-medium">Role:</span> {agent.role}
                          </div>
                        </div>
                        {agent.notes && (
                          <div className="text-sm text-gray-600">
                            <span className="font-medium">Notes:</span> {agent.notes}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(agent)}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(agent.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <UserCheck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">No booking agents have been created</p>
                <Button 
                  onClick={() => setShowCreateForm(true)}
                  variant="outline"
                >
                  Add your first booking agent
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}