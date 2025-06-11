import { useState } from "react";
import { useAuthGuard } from "@/lib/auth.tsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

export default function CustomFields() {
  const { isLoading: authLoading, isAuthenticated, user, restaurant } = useAuthGuard();

  if (authLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated || !user || !restaurant) {
    return null;
  }
  const [fields, setFields] = useState<Array<{ name: string; active: boolean; validOnline: boolean }>>([]);

  const addField = () => {
    setFields([...fields, { name: "", active: true, validOnline: true }]);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <div className="bg-white border-b">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-6">
            <h1 className="text-xl font-semibold">Custom Fields</h1>
            <nav className="flex space-x-6">
              <a href="/dashboard" className="text-gray-600 hover:text-gray-900">Booking</a>
              <a href="#" className="text-green-600 font-medium">CRM</a>
              <a href="#" className="text-gray-600 hover:text-gray-900">Archive</a>
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">{restaurant.name}</span>
            <Button variant="outline" size="sm">Profile</Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
          <Card>
            <CardHeader>
              <CardTitle>Custom Fields</CardTitle>
              <p className="text-sm text-gray-600">
                Create your own input fields to collect additional information during the booking process. Each field has a 
                name (and optionally also a help shown to guests). The online calendar in Field is visible during online booking, 
                and an admin field is only available to administrators who has got booking rights.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-sm font-medium text-gray-700">Field name</div>
                <div className="text-sm font-medium text-gray-700">Active</div>
                <div className="text-sm font-medium text-gray-700">Valid online</div>
              </div>

              {fields.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No custom fields defined yet
                </div>
              ) : (
                fields.map((field, index) => (
                  <div key={index} className="grid grid-cols-3 gap-4 items-center">
                    <Input
                      placeholder="Field name"
                      value={field.name}
                      onChange={(e) => {
                        const newFields = [...fields];
                        newFields[index].name = e.target.value;
                        setFields(newFields);
                      }}
                    />
                    <Switch 
                      checked={field.active}
                      onCheckedChange={(checked) => {
                        const newFields = [...fields];
                        newFields[index].active = checked;
                        setFields(newFields);
                      }}
                    />
                    <Switch 
                      checked={field.validOnline}
                      onCheckedChange={(checked) => {
                        const newFields = [...fields];
                        newFields[index].validOnline = checked;
                        setFields(newFields);
                      }}
                    />
                  </div>
                ))
              )}

              <Button 
                onClick={addField}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Add custom field
              </Button>
            </CardContent>
          </Card>
      </div>
    </div>
  );
}