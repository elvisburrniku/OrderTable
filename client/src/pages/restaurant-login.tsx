import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useRestaurantAuth } from '@/lib/restaurant-auth';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useLocation } from 'wouter';

const loginSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(1, 'Password is required'),
});

const registerSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(1, 'Name is required'),
  subscriptionPlanId: z.number().optional(),
});

interface SubscriptionPlan {
  id: number;
  name: string;
  price: number;
  maxRestaurants: number;
  features: string;
}

export default function RestaurantLogin() {
  const [, setLocation] = useLocation();
  const { login, register } = useRestaurantAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [loginType, setLoginType] = useState<'owner' | 'staff'>('owner');
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>('');

  const { data: subscriptionPlans } = useQuery({
    queryKey: ['/api/restaurant/subscription-plans'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/restaurant/subscription-plans');
      if (!response.ok) throw new Error('Failed to fetch plans');
      return response.json();
    },
  });

  const { data: restaurants } = useQuery({
    queryKey: ['/api/restaurant/public-restaurants'],
    queryFn: async () => {
      // For staff login, we'd need a public endpoint to list restaurants
      // For now, we'll handle this with a simple input
      return [];
    },
    enabled: loginType === 'staff',
  });

  const loginForm = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const registerForm = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
      name: '',
      subscriptionPlanId: undefined,
    },
  });

  const onLogin = async (data: z.infer<typeof loginSchema>) => {
    setIsLoading(true);
    try {
      const restaurantId = loginType === 'staff' && selectedRestaurant 
        ? parseInt(selectedRestaurant) 
        : undefined;

      await login(data.email, data.password, restaurantId);
      toast({
        title: 'Login successful',
        description: 'Welcome to your restaurant management system',
      });
      setLocation('/restaurant-dashboard');
    } catch (error: any) {
      toast({
        title: 'Login failed',
        description: error.message || 'Invalid credentials',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onRegister = async (data: z.infer<typeof registerSchema>) => {
    setIsLoading(true);
    try {
      await register(data.email, data.password, data.name, data.subscriptionPlanId);
      toast({
        title: 'Registration successful',
        description: 'Your account has been created successfully',
      });
      setLocation('/restaurant-dashboard');
    } catch (error: any) {
      toast({
        title: 'Registration failed',
        description: error.message || 'Registration failed',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Restaurant Management</CardTitle>
          <CardDescription>
            Manage your restaurants with role-based permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="loginType">Login as</Label>
                <Select value={loginType} onValueChange={(value: 'owner' | 'staff') => setLoginType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owner">Restaurant Owner</SelectItem>
                    <SelectItem value="staff">Staff Member</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {loginType === 'staff' && (
                <div className="space-y-2">
                  <Label htmlFor="restaurant">Restaurant ID</Label>
                  <Input
                    placeholder="Enter restaurant ID"
                    value={selectedRestaurant}
                    onChange={(e) => setSelectedRestaurant(e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground">
                    Ask your manager for the restaurant ID
                  </p>
                </div>
              )}

              <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    {...loginForm.register('email')}
                  />
                  {loginForm.formState.errors.email && (
                    <p className="text-sm text-red-500">{loginForm.formState.errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    {...loginForm.register('password')}
                  />
                  {loginForm.formState.errors.password && (
                    <p className="text-sm text-red-500">{loginForm.formState.errors.password.message}</p>
                  )}
                </div>

                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={isLoading || (loginType === 'staff' && !selectedRestaurant)}
                >
                  {isLoading ? 'Logging in...' : 'Login'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register" className="space-y-4">
              <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    {...registerForm.register('name')}
                  />
                  {registerForm.formState.errors.name && (
                    <p className="text-sm text-red-500">{registerForm.formState.errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    {...registerForm.register('email')}
                  />
                  {registerForm.formState.errors.email && (
                    <p className="text-sm text-red-500">{registerForm.formState.errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    {...registerForm.register('password')}
                  />
                  {registerForm.formState.errors.password && (
                    <p className="text-sm text-red-500">{registerForm.formState.errors.password.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="plan">Subscription Plan</Label>
                  <Select onValueChange={(value) => registerForm.setValue('subscriptionPlanId', parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a plan" />
                    </SelectTrigger>
                    <SelectContent>
                      {subscriptionPlans?.map((plan: SubscriptionPlan) => (
                        <SelectItem key={plan.id} value={plan.id.toString()}>
                          {plan.name} - ${plan.price / 100}/month ({plan.maxRestaurants} {plan.maxRestaurants === 1 ? 'restaurant' : 'restaurants'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Creating account...' : 'Create Account'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}