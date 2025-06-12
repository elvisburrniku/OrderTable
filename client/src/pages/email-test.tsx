import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle, Mail } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function EmailTest() {
  const [testEmail, setTestEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; emailAddress?: string } | null>(null);

  const handleTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmail.trim()) return;

    setIsLoading(true);
    setResult(null);

    try {
      const response = await apiRequest("POST", "/api/test-email", {
        testEmail: testEmail.trim()
      });
      
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        message: error.message || "Failed to send test email"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Email Delivery Test</h1>
        <p className="text-gray-600">
          Test email delivery to diagnose any delivery issues with subscription notifications.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Send Test Email
          </CardTitle>
          <CardDescription>
            Send a test subscription notification email to verify delivery.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleTestEmail} className="space-y-4">
            <div>
              <Label htmlFor="testEmail">Email Address</Label>
              <Input
                id="testEmail"
                type="email"
                placeholder="Enter email address to test"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                required
              />
            </div>
            
            <Button type="submit" disabled={isLoading || !testEmail.trim()}>
              {isLoading ? "Sending..." : "Send Test Email"}
            </Button>
          </form>

          {result && (
            <Alert className={`mt-4 ${result.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
              <div className="flex items-center gap-2">
                {result.success ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <AlertDescription className={result.success ? "text-green-800" : "text-red-800"}>
                  {result.message}
                  {result.emailAddress && (
                    <div className="mt-2 text-sm">
                      Email sent to: <strong>{result.emailAddress}</strong>
                    </div>
                  )}
                </AlertDescription>
              </div>
            </Alert>
          )}

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold mb-2">Troubleshooting Tips:</h3>
            <ul className="text-sm space-y-1 text-gray-600">
              <li>• Check your spam/junk folder first</li>
              <li>• Verify the sender email domain is authenticated in Brevo</li>
              <li>• Ensure SPF and DKIM records are configured for the sender domain</li>
              <li>• Test with different email providers (Gmail, Outlook, etc.)</li>
              <li>• Check the browser console logs for detailed delivery information</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}