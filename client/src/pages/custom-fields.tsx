import { useState } from "react";
import { useAuth } from "@/lib/auth.tsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus } from "lucide-react";
import { useLocation } from "wouter";

export default function CustomFields() {
  const { user, restaurant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingField, setEditingField] = useState<any>(null);
  const [currentField, setCurrentField] = useState({
    name: "",
    title: "",
    inputType: "single_line",
    translations: {} as Record<string, string>,
    isActive: true,
    isOnline: false,
    selectedLanguage: "en"
  });

  // Fetch custom fields
  const { data: customFieldsList, isLoading } = useQuery({
    queryKey: [`/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/custom-fields`],
    enabled: !!restaurant?.id && !!restaurant?.tenantId,
  });

  // Save field mutation
  const saveFieldMutation = useMutation({
    mutationFn: async () => {
      const fieldData = {
        name: currentField.name,
        title: currentField.title,
        inputType: currentField.inputType,
        translations: currentField.translations,
        isActive: currentField.isActive,
        isOnline: currentField.isOnline,
      };

      if (editingField) {
        return apiRequest("PUT", `/api/tenants/${restaurant.tenantId}/restaurants/${restaurant.id}/custom-fields/${editingField.id}`, fieldData);
      } else {
        return apiRequest("POST", `/api/tenants/${restaurant.tenantId}/restaurants/${restaurant.id}/custom-fields`, fieldData);
      }
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: editingField ? "Custom field updated successfully" : "Custom field created successfully",
      });
      queryClient.invalidateQueries({ 
        queryKey: [`/api/tenants/${restaurant.tenantId}/restaurants/${restaurant.id}/custom-fields`] 
      });
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save custom field",
        variant: "destructive",
      });
      console.error("Error saving field:", error);
    },
  });

  // Delete field mutation
  const deleteFieldMutation = useMutation({
    mutationFn: async (fieldId: number) => {
      return apiRequest("DELETE", `/api/tenants/${restaurant.tenantId}/restaurants/${restaurant.id}/custom-fields/${fieldId}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Custom field deleted successfully",
      });
      queryClient.invalidateQueries({ 
        queryKey: [`/api/tenants/${restaurant.tenantId}/restaurants/${restaurant.id}/custom-fields`] 
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete custom field",
        variant: "destructive",
      });
      console.error("Error deleting field:", error);
    },
  });

  if (!user || !restaurant) {
    return null;
  }

  const resetForm = () => {
    setCurrentField({
      name: "",
      title: "",
      inputType: "single_line",
      translations: {},
      isActive: true,
      isOnline: false,
      selectedLanguage: "en"
    });
    setEditingField(null);
    setShowCreateForm(false);
  };

  const handleSave = () => {
    if (!currentField.name.trim() || !currentField.title.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    saveFieldMutation.mutate();
  };

  const handleEdit = (field: any) => {
    setEditingField(field);
    setCurrentField({
      name: field.name,
      title: field.title,
      inputType: field.inputType,
      translations: field.translations ? JSON.parse(field.translations) : {},
      isActive: field.isActive,
      isOnline: field.isOnline,
      selectedLanguage: "en"
    });
    setShowCreateForm(true);
  };

  const handleDelete = (fieldId: number) => {
    if (confirm("Are you sure you want to delete this custom field?")) {
      deleteFieldMutation.mutate(fieldId);
    }
  };

  const updateTranslation = (language: string, value: string) => {
    setCurrentField(prev => ({
      ...prev,
      translations: {
        ...prev.translations,
        [language]: value
      }
    }));
  };

  if (showCreateForm) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="p-6 max-w-2xl mx-auto">
          <div className="mb-6">
            <div className="flex items-center gap-4 mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => resetForm()}
                className="text-blue-600 hover:text-blue-700"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              <div className="text-sm text-gray-600">
                Custom Fields &gt; {editingField ? "Edit" : "Create"} Custom Field
              </div>
            </div>
            <h1 className="text-2xl font-semibold text-gray-900">
              {editingField ? "Edit" : "Create"} Custom Field
            </h1>
          </div>

          <Card>
            <CardContent className="p-6 space-y-6">
              {/* Name Field */}
              <div>
                <Label htmlFor="name">Name:</Label>
                <Input
                  id="name"
                  value={currentField.name}
                  onChange={(e) => setCurrentField(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter field name"
                  className="mt-1"
                />
              </div>

              {/* Title Field */}
              <div>
                <Label htmlFor="title">Title:</Label>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center bg-gray-100 px-3 py-2 rounded border">
                    <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMTQiIHZpZXdCb3g9IjAgMCAyMCAxNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjIwIiBoZWlnaHQ9IjE0IiBmaWxsPSIjMTIzNDU2Ii8+Cjx0ZXh0IHg9IjIiIHk9IjEwIiBmaWxsPSJ3aGl0ZSIgZm9udC1zaXplPSI4cHgiPkVOPC90ZXh0Pgo8L3N2Zz4=" 
                         alt="EN flag" 
                         className="w-5 h-3.5 mr-2" />
                    <span className="text-sm font-medium">EN</span>
                  </div>
                  <Input
                    id="title"
                    value={currentField.title}
                    onChange={(e) => setCurrentField(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter field title"
                    className="flex-1"
                  />
                </div>
              </div>

              {/* Add Translation */}
              <div>
                <Label>Add translation:</Label>
                <Select
                  value={currentField.selectedLanguage}
                  onValueChange={(value) => setCurrentField(prev => ({ ...prev, selectedLanguage: value }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="de">German</SelectItem>
                    <SelectItem value="it">Italian</SelectItem>
                  </SelectContent>
                </Select>
                {currentField.selectedLanguage && currentField.selectedLanguage !== "en" && (
                  <Input
                    value={currentField.translations[currentField.selectedLanguage] || ""}
                    onChange={(e) => updateTranslation(currentField.selectedLanguage, e.target.value)}
                    placeholder={`Enter title in ${currentField.selectedLanguage.toUpperCase()}`}
                    className="mt-2"
                  />
                )}
              </div>

              {/* Input Type */}
              <div>
                <Label>Input type:</Label>
                <RadioGroup
                  value={currentField.inputType}
                  onValueChange={(value) => setCurrentField(prev => ({ ...prev, inputType: value }))}
                  className="mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="single_line" id="single_line" />
                    <Label htmlFor="single_line">Single line text field</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="multi_line" id="multi_line" />
                    <Label htmlFor="multi_line">Multi line text field</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Active Checkbox */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="active"
                  checked={currentField.isActive}
                  onCheckedChange={(checked) => setCurrentField(prev => ({ ...prev, isActive: !!checked }))}
                />
                <Label htmlFor="active">Active:</Label>
              </div>

              {/* Online Checkbox */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="online"
                  checked={currentField.isOnline}
                  onCheckedChange={(checked) => setCurrentField(prev => ({ ...prev, isOnline: !!checked }))}
                />
                <Label htmlFor="online">Online:</Label>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button 
                  onClick={handleSave}
                  disabled={saveFieldMutation.isPending}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {saveFieldMutation.isPending ? "Saving..." : "Save"}
                </Button>
                <Button 
                  variant="outline"
                  onClick={resetForm}
                  className="text-gray-600"
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
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Custom Fields</h1>
          <Button 
            onClick={() => setShowCreateForm(true)}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Custom Field
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : customFieldsList && customFieldsList.length > 0 ? (
          <div className="space-y-4">
            {customFieldsList.map((field: any) => (
              <Card key={field.id}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <h3 className="font-semibold text-lg">{field.name}</h3>
                      <p className="text-gray-600">{field.title}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>Type: {field.inputType === "single_line" ? "Single line" : "Multi line"}</span>
                        <span className={`px-2 py-1 rounded text-xs ${field.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
                          {field.isActive ? "Active" : "Inactive"}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs ${field.isOnline ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-600"}`}>
                          {field.isOnline ? "Online" : "Offline"}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(field)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(field.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-gray-500 mb-4">No custom fields created yet</p>
              <Button 
                onClick={() => setShowCreateForm(true)}
                variant="outline"
              >
                Create your first custom field
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}