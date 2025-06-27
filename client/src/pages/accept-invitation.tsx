import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, CheckCircle, AlertCircle } from "lucide-react";

const passwordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(8, "Password must be at least 8 characters"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type PasswordForm = z.infer<typeof passwordSchema>;

interface InvitationData {
  email: string;
  name: string;
  tenantName: string;
  role: string;
  expired: boolean;
}

export default function AcceptInvitation() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [invitationData, setInvitationData] = useState<InvitationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string>("");

  const form = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  // Extract token from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token');
    
    if (!tokenParam) {
      toast({
        title: "Invalid Invitation",
        description: "No invitation token found in the URL.",
        variant: "destructive",
      });
      setLocation("/login");
      return;
    }

    setToken(tokenParam);
    validateInvitation(tokenParam);
  }, []);

  const validateInvitation = async (invitationToken: string) => {
    try {
      const response = await apiRequest("GET", `/api/invitations/validate/${invitationToken}`);
      if (!response.ok) {
        throw new Error("Invalid or expired invitation");
      }
      const data = await response.json();
      setInvitationData(data);
    } catch (error) {
      toast({
        title: "Invalid Invitation",
        description: "This invitation link is invalid or has expired.",
        variant: "destructive",
      });
      setLocation("/login");
    } finally {
      setLoading(false);
    }
  };

  const acceptInvitationMutation = useMutation({
    mutationFn: async (data: PasswordForm) => {
      return await apiRequest("POST", "/api/invitations/accept", {
        token,
        password: data.password,
      });
    },
    onSuccess: () => {
      toast({
        title: "Account Created Successfully",
        description: "Your account has been created. You can now log in.",
      });
      setLocation("/login");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Accept Invitation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: PasswordForm) => {
    acceptInvitationMutation.mutate(data);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!invitationData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Invalid Invitation</h2>
              <p className="text-muted-foreground mb-4">
                This invitation link is invalid or has expired.
              </p>
              <Button onClick={() => setLocation("/login")}>
                Go to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (invitationData.expired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Invitation Expired</h2>
              <p className="text-muted-foreground mb-4">
                This invitation has expired. Please contact your administrator for a new invitation.
              </p>
              <Button onClick={() => setLocation("/login")}>
                Go to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <CardTitle className="text-2xl">Accept Invitation</CardTitle>
          <p className="text-muted-foreground">
            You've been invited to join <strong>{invitationData.tenantName}</strong> as a <strong>{invitationData.role}</strong>
          </p>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <div className="text-sm text-muted-foreground mb-2">Account Details:</div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <div><strong>Name:</strong> {invitationData.name}</div>
              <div><strong>Email:</strong> {invitationData.email}</div>
              <div><strong>Role:</strong> {invitationData.role}</div>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Choose Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Confirm your password"
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button 
                type="submit" 
                className="w-full"
                disabled={acceptInvitationMutation.isPending}
              >
                {acceptInvitationMutation.isPending ? "Creating Account..." : "Create Account & Join Team"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Eye, EyeOff, CheckCircle, XCircle, UserPlus, Shield } from 'lucide-react';

interface InvitationData {
  token: string;
  email: string;
  name: string;
  tenantId: number;
  role: string;
  tenantName: string;
  used: boolean;
  expired: boolean;
}

export default function AcceptInvitation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState('');

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setError('No invitation token provided');
      setIsLoading(false);
      return;
    }

    validateToken();
  }, [token]);

  const validateToken = async () => {
    try {
      const response = await apiRequest('GET', `/api/tenants/invitation/validate/${token}`);
      if (!response.ok) {
        const error = await response.json();
        if (error.expired) {
          setError('This invitation has expired. Please request a new invitation from your restaurant team.');
        } else {
          setError(error.message || 'Invalid invitation token');
        }
        return;
      }

      const data = await response.json();
      setInvitation(data);
    } catch (error) {
      console.error('Error validating token:', error);
      setError('Failed to validate invitation. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptInvitation = async () => {
    if (!invitation) return;

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsAccepting(true);
    setError('');

    try {
      const response = await apiRequest('POST', `/api/tenants/invitation/accept/${token}`, {
        password,
      });

      if (!response.ok) {
        const error = await response.json();
        setError(error.message || 'Failed to accept invitation');
        return;
      }

      toast({
        title: "Welcome to the team!",
        description: "Your account has been created successfully. You can now log in.",
      });

      // Redirect to login page
      navigate('/login', { 
        state: { 
          email: invitation.email,
          message: 'Your account has been created! Please log in with your new password.'
        }
      });

    } catch (error) {
      console.error('Error accepting invitation:', error);
      setError('Failed to accept invitation. Please try again.');
    } finally {
      setIsAccepting(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'administrator':
        return <Shield className="h-5 w-5 text-blue-600" />;
      case 'manager':
        return <UserPlus className="h-5 w-5 text-green-600" />;
      case 'agent':
        return <UserPlus className="h-5 w-5 text-purple-600" />;
      default:
        return <UserPlus className="h-5 w-5 text-gray-600" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'administrator':
        return 'bg-blue-100 text-blue-800';
      case 'manager':
        return 'bg-green-100 text-green-800';
      case 'agent':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-red-900">Invalid Invitation</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => navigate('/login')} 
              className="w-full"
              variant="outline"
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <CheckCircle className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle className="text-gray-900">Accept Invitation</CardTitle>
          <CardDescription>
            Complete your account setup to join {invitation.tenantName}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Invitation Details */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Email:</span>
              <span className="text-sm font-medium">{invitation.email}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Name:</span>
              <span className="text-sm font-medium">{invitation.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Role:</span>
              <div className="flex items-center space-x-2">
                {getRoleIcon(invitation.role)}
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(invitation.role)}`}>
                  {invitation.role.charAt(0).toUpperCase() + invitation.role.slice(1)}
                </span>
              </div>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>

          <Button
            onClick={handleAcceptInvitation}
            disabled={isAccepting || !password || !confirmPassword}
            className="w-full"
          >
            {isAccepting ? 'Creating Account...' : 'Accept Invitation & Create Account'}
          </Button>

          <div className="text-center">
            <Button 
              variant="link" 
              onClick={() => navigate('/login')}
              className="text-sm text-gray-600"
            >
              Already have an account? Sign in
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
