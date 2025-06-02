import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { apiRequest } from "./queryClient";
import { User, Restaurant } from "@shared/schema";

interface AuthContextType {
  user: User | null;
  restaurant: Restaurant | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, restaurantName?: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored user data on app load
    const storedUser = localStorage.getItem("user");
    const storedRestaurant = localStorage.getItem("restaurant");
    
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    if (storedRestaurant) {
      setRestaurant(JSON.parse(storedRestaurant));
    }
    
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const res = await apiRequest("POST", "/api/auth/login", { email, password });
    const data = await res.json();
    
    setUser(data.user);
    setRestaurant(data.restaurant);
    
    localStorage.setItem("user", JSON.stringify(data.user));
    if (data.restaurant) {
      localStorage.setItem("restaurant", JSON.stringify(data.restaurant));
    }
  };

  const register = async (email: string, password: string, name: string, restaurantName?: string) => {
    const res = await apiRequest("POST", "/api/auth/register", { 
      email, 
      password, 
      name, 
      restaurantName 
    });
    const data = await res.json();
    
    setUser(data.user);
    setRestaurant(data.restaurant);
    
    localStorage.setItem("user", JSON.stringify(data.user));
    if (data.restaurant) {
      localStorage.setItem("restaurant", JSON.stringify(data.restaurant));
    }
  };

  const logout = () => {
    setUser(null);
    setRestaurant(null);
    localStorage.removeItem("user");
    localStorage.removeItem("restaurant");
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      restaurant, 
      login, 
      register, 
      logout, 
      isLoading 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
