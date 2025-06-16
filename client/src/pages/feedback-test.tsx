import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star } from "lucide-react";

export default function FeedbackTest() {
  const [rating, setRating] = useState(0);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-2xl">
        <CardHeader className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white">
          <CardTitle className="text-2xl font-bold">Feedback Test</CardTitle>
        </CardHeader>
        <CardContent className="p-8">
          <div className="text-center">
            <h2 className="text-xl mb-4">Rate your experience (0-10 stars)</h2>
            <div className="flex justify-center gap-2 mb-4">
              {Array.from({ length: 11 }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setRating(i)}
                  className="focus:outline-none"
                >
                  <div className="flex flex-col items-center space-y-1">
                    <Star
                      className={`w-10 h-10 transition-all duration-200 ${
                        i <= rating
                          ? "fill-yellow-400 text-yellow-400 scale-110"
                          : "text-gray-300 hover:text-yellow-200"
                      }`}
                    />
                    <span className={`text-sm font-medium ${
                      i <= rating ? "text-yellow-600" : "text-gray-400"
                    }`}>
                      {i}
                    </span>
                  </div>
                </button>
              ))}
            </div>
            {rating > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
                <p className="text-yellow-800 font-semibold">
                  You rated: {rating}/10 stars
                </p>
              </div>
            )}
            <Button className="mt-4">Submit Test Feedback</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}