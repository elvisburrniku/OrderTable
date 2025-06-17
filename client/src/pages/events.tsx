import { useState } from "react";
import { useAuth } from "@/lib/auth.tsx";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Events() {
  const { user, restaurant } = useAuth();

  if (!user || !restaurant) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Events</CardTitle>
            <p className="text-sm text-gray-600">
              Allow your guests to sign-up for events on specific dates.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <Button className="bg-green-600 hover:bg-green-700 text-white">
              Create Event
            </Button>

            <div className="bg-gray-50 rounded-lg p-6">
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-sm font-medium text-gray-700">Name</div>
                <div className="text-sm font-medium text-gray-700">
                  Start time
                </div>
                <div className="text-sm font-medium text-gray-700">Counted</div>
              </div>

              <div className="text-center py-8 text-gray-500">
                No events created yet
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
