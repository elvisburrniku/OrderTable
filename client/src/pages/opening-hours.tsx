import { useState } from "react";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Clock } from "lucide-react";

export default function OpeningHours() {
  const { tenantId } = useParams();

  const [hours, setHours] = useState([
    { day: "Sunday", enabled: true, open: "09:00", close: "10:00" },
    { day: "Monday", enabled: true, open: "09:00", close: "10:00" },
    { day: "Tuesday", enabled: true, open: "09:00", close: "10:00" },
    { day: "Wednesday", enabled: true, open: "09:00", close: "10:00" },
    { day: "Thursday", enabled: true, open: "09:00", close: "11:00" },
    { day: "Friday", enabled: true, open: "09:00", close: "11:00" },
    { day: "Saturday", enabled: true, open: "05:00", close: "09:00" }
  ]);

  const toggleDay = (index: number) => {
    setHours(prev => prev.map((hour, i) => 
      i === index ? { ...hour, enabled: !hour.enabled } : hour
    ));
  };

  const updateTime = (index: number, field: 'open' | 'close', value: string) => {
    setHours(prev => prev.map((hour, i) => 
      i === index ? { ...hour, [field]: value } : hour
    ));
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 flex items-center mb-2">
          <Clock className="w-6 h-6 mr-2" />
          Restaurant Opening Hours
        </h1>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="space-y-0">
          {hours.map((hour, index) => (
            <div key={hour.day} className="flex items-center justify-between p-4 border-b border-gray-100 last:border-b-0">
              <div className="flex items-center space-x-4">
                <Switch
                  checked={hour.enabled}
                  onCheckedChange={() => toggleDay(index)}
                  className="data-[state=checked]:bg-green-500"
                />
                <span className="font-medium text-gray-900 w-20">{hour.day}</span>
              </div>
              
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">Open:</span>
                  <div className="relative">
                    <input
                      type="time"
                      value={hour.open}
                      onChange={(e) => updateTime(index, 'open', e.target.value)}
                      disabled={!hour.enabled}
                      className="border border-gray-300 rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
                    />
                    <span className="ml-2 text-xs text-gray-500">AM</span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">Close:</span>
                  <div className="relative">
                    <input
                      type="time"
                      value={hour.close}
                      onChange={(e) => updateTime(index, 'close', e.target.value)}
                      disabled={!hour.enabled}
                      className="border border-gray-300 rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
                    />
                    <span className="ml-2 text-xs text-gray-500">PM</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <Button className="bg-green-600 hover:bg-green-700 text-white px-6 py-2">
          Save Opening Hours
        </Button>
      </div>
    </div>
  );
}