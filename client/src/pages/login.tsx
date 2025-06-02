import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Grid3x3, X } from "lucide-react";

export default function Login() {
  const [, setLocation] = useLocation();
  const { login, register } = useAuth();
  const { toast } = useToast();
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    restaurantName: "",
    rememberMe: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        await login(formData.email, formData.password);
        toast({
          title: "Welcome back!",
          description: "You have successfully logged in."
        });
        setLocation("/dashboard");
      } else {
        await register(formData.email, formData.password, formData.name, formData.restaurantName);
        toast({
          title: "Account created!",
          description: "Your restaurant account has been created successfully."
        });
        setLocation("/dashboard");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Authentication failed",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-5xl overflow-hidden">
        <div className="grid md:grid-cols-2">
          {/* Left side - Restaurant image */}
          <div className="relative h-96 md:h-auto">
            <div 
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: `url('https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600')`
              }}
            />
            <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
              <div className="text-center text-white">
                <div className="flex items-center justify-center mb-4">
                  <Grid3x3 className="text-green-500 text-3xl mr-3" size={32} />
                  <span className="text-3xl font-bold">easyTable</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold leading-tight">
                  BETTER BOOKING.<br />
                  BETTER BUSINESS.
                </h2>
              </div>
            </div>
          </div>

          {/* Right side - Login form */}
          <div className="p-8">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-bold text-gray-900">
                {isLogin ? "Login" : "Sign Up"}
              </h3>
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <X className="h-5 w-5" />
                </Button>
              </Link>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {!isLogin && (
                <>
                  <div>
                    <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                      Full Name:
                    </Label>
                    <Input
                      id="name"
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="mt-1"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="restaurantName" className="text-sm font-medium text-gray-700">
                      Restaurant Name:
                    </Label>
                    <Input
                      id="restaurantName"
                      type="text"
                      value={formData.restaurantName}
                      onChange={(e) => setFormData({ ...formData, restaurantName: e.target.value })}
                      className="mt-1"
                      required
                    />
                  </div>
                </>
              )}
              
              <div>
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                  E-mail:
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="elvis.presley@gmail.com"
                  className="mt-1"
                  required
                />
              </div>

              <div>
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Password:
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="mt-1"
                  required
                />
              </div>

              {isLogin && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="rememberMe"
                      checked={formData.rememberMe}
                      onCheckedChange={(checked) => 
                        setFormData({ ...formData, rememberMe: checked as boolean })
                      }
                    />
                    <Label htmlFor="rememberMe" className="text-sm text-gray-600">
                      Log in automatically from this computer
                    </Label>
                  </div>
                  <Button variant="link" className="text-sm text-green-600 hover:text-green-700 p-0">
                    Forgot password?
                  </Button>
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                disabled={isLoading}
              >
                {isLoading ? "Loading..." : isLogin ? "Log in" : "Create Account"}
              </Button>

              <div className="text-center">
                <span className="text-gray-600">
                  {isLogin ? "New user? " : "Already have an account? "}
                </span>
                <Button
                  type="button"
                  variant="link"
                  className="text-green-600 hover:text-green-700 p-0"
                  onClick={() => setIsLogin(!isLogin)}
                >
                  {isLogin ? "Sign up" : "Log in"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </Card>
    </div>
  );
}
