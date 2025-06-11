import { useParams } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Plus } from "lucide-react";

export default function OpeningHours() {
  const { tenantId } = useParams();

  const daysOfWeek = [
    "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Opening Hours</h1>
          <p className="text-gray-600">Configure your restaurant's operating hours</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Special Hours
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="w-5 h-5 mr-2" />
            Regular Opening Hours
          </CardTitle>
          <CardDescription>
            Set your standard operating hours for each day of the week
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {daysOfWeek.map((day) => (
            <div key={day} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="font-medium text-gray-900">{day}</div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="time"
                    defaultValue="09:00"
                    className="border rounded px-2 py-1"
                  />
                  <span className="text-gray-500">to</span>
                  <input
                    type="time"
                    defaultValue="22:00"
                    className="border rounded px-2 py-1"
                  />
                </div>
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2" />
                  Closed
                </label>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button>Save Changes</Button>
      </div>
    </div>
  );
}