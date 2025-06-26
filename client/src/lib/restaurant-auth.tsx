import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiRequest } from './queryClient';

interface User {
  id: number;
  email: string;
  name: string;
  maxRestaurants?: number;
  restaurantId?: number;
  permissions?: string[];
}

interface RestaurantLimit {
  canCreate: boolean;
  currentCount: number;
  maxAllowed: number;
}

interface AuthContextType {
  user: User | null;
  restaurantLimit: RestaurantLimit | null;
  login: (email: string, password: string, restaurantId?: number) => Promise<void>;
  register: (email: string, password: string, name: string, subscriptionPlanId?: number) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function RestaurantAuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [restaurantLimit, setRestaurantLimit] = useState<RestaurantLimit | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('restaurant_token');
      if (!token) {
        setIsLoading(false);
        return;
      }

      const response = await apiRequest('GET', '/api/restaurant/auth/user', undefined, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData.user);
        setRestaurantLimit(userData.restaurantLimit);
      } else {
        localStorage.removeItem('restaurant_token');
      }
    } catch (error) {
      localStorage.removeItem('restaurant_token');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string, restaurantId?: number) => {
    const response = await apiRequest('POST', '/api/restaurant/auth/login', {
      email,
      password,
      restaurantId
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }

    const data = await response.json();
    localStorage.setItem('restaurant_token', data.token);
    setUser(data.user);
    setRestaurantLimit(data.restaurantLimit);
  };

  const register = async (email: string, password: string, name: string, subscriptionPlanId?: number) => {
    const response = await apiRequest('POST', '/api/restaurant/auth/register', {
      email,
      password,
      name,
      subscriptionPlanId
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Registration failed');
    }

    const data = await response.json();
    localStorage.setItem('restaurant_token', data.token);
    setUser(data.user);
    setRestaurantLimit(data.restaurantLimit);
  };

  const logout = () => {
    localStorage.removeItem('restaurant_token');
    setUser(null);
    setRestaurantLimit(null);
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    
    // If user has restaurantId, they are staff with specific permissions
    if (user.restaurantId && user.permissions) {
      return user.permissions.includes(permission);
    }
    
    // If user doesn't have restaurantId, they are an owner with all permissions
    if (!user.restaurantId) {
      return true;
    }
    
    return false;
  };

  const value = {
    user,
    restaurantLimit,
    login,
    register,
    logout,
    isLoading,
    hasPermission,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useRestaurantAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useRestaurantAuth must be used within a RestaurantAuthProvider');
  }
  return context;
}