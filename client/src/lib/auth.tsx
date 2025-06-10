import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { apiRequest } from "./queryClient";
import { users, restaurants } from "@shared/schema";

type User = typeof users.$inferSelect;
type Restaurant = typeof restaurants.$inferSelect;

interface AuthContextType {
  user: User | null;
  restaurant: Restaurant | null;
  login: (email: string, password: string) => Promise<any>;
  register: (userData: {
    username: string;
    password: string;
    email: string;
    restaurantName: string;
  }) => Promise<any>;
  logout: () => void;
  refreshUserData: () => Promise<any>;
  isLoading: boolean;
  isAuthenticated: boolean;
  authLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored user data on app load and validate session
    const validateSession = async () => {
      const storedUser = localStorage.getItem("user");
      const storedRestaurant = localStorage.getItem("restaurant");

      if (storedUser && storedUser !== "undefined") {
        try {
          const parsedUser = JSON.parse(storedUser);
          
          // Validate session with backend
          try {
            const response = await fetch('/api/auth/validate', {
              method: 'GET',
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json',
              },
            });
            
            if (response.ok) {
              // Session is valid, use stored data
              setUser(parsedUser);
              if (storedRestaurant && storedRestaurant !== "undefined") {
                try {
                  setRestaurant(JSON.parse(storedRestaurant));
                } catch (restaurantError) {
                  console.error("Error parsing stored restaurant:", restaurantError);
                  localStorage.removeItem("restaurant");
                }
              }
            } else {
              // Session invalid, clear stored data
              localStorage.removeItem("user");
              localStorage.removeItem("restaurant");
              localStorage.removeItem("tenant");
            }
          } catch (error) {
            // Network error or server down, use stored data as fallback
            setUser(parsedUser);
            if (storedRestaurant && storedRestaurant !== "undefined") {
              try {
                setRestaurant(JSON.parse(storedRestaurant));
              } catch (restaurantError) {
                console.error("Error parsing stored restaurant:", restaurantError);
                localStorage.removeItem("restaurant");
              }
            }
          }
        } catch (error) {
          console.error("Error parsing stored user:", error);
          localStorage.removeItem("user");
          localStorage.removeItem("restaurant");
          localStorage.removeItem("tenant");
        }
      } else if (storedRestaurant) {
        // Clear orphaned restaurant data
        localStorage.removeItem("restaurant");
        localStorage.removeItem("tenant");
      }

      setIsLoading(false);
    };

    validateSession();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        email,
        password,
      }),
    });

    if (!res.ok) {
      throw new Error("Login failed");
    }

    const data = await res.json();

    setUser(data.user);
    setRestaurant(data.restaurant);

    // Store all authentication data
    localStorage.setItem("user", JSON.stringify(data.user));
    if (data.restaurant) {
      localStorage.setItem("restaurant", JSON.stringify(data.restaurant));
    }
    if (data.tenant) {
      localStorage.setItem("tenant", JSON.stringify(data.tenant));
    }

    return data;
  };

  const register = async (userData: {
    username: string;
    password: string;
    email: string;
    restaurantName: string;
  }) => {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        username: userData.email, // Use email as username
        email: userData.email,
        password: userData.password,
        restaurantName: userData.restaurantName,
        name: userData.username, // Map username to name field
      }),
    });

    if (!res.ok) {
      throw new Error("Registration failed");
    }

    const data = await res.json();

    if (!data.user || !data.restaurant) {
      throw new Error("Invalid registration response");
    }

    setUser(data.user);
    setRestaurant(data.restaurant);

    // Store all authentication data
    localStorage.setItem("user", JSON.stringify(data.user));
    localStorage.setItem("restaurant", JSON.stringify(data.restaurant));
    if (data.tenant) {
      localStorage.setItem("tenant", JSON.stringify(data.tenant));
    }

    return data;
  };

  const logout = () => {
    setUser(null);
    setRestaurant(null);
    localStorage.removeItem("user");
    localStorage.removeItem("restaurant");
  };

  const refreshUserData = async () => {
    try {
      const response = await fetch('/api/auth/validate', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.user) {
          setUser(data.user);
          localStorage.setItem("user", JSON.stringify(data.user));
        }
        if (data.restaurant) {
          setRestaurant(data.restaurant);
          localStorage.setItem("restaurant", JSON.stringify(data.restaurant));
        }
        if (data.tenant) {
          localStorage.setItem("tenant", JSON.stringify(data.tenant));
        }
        return data;
      }
    } catch (error) {
      console.error("Failed to refresh user data:", error);
    }
  };

  const isAuthenticated = !!(user && restaurant);

  return (
    <AuthContext.Provider
      value={{
        user,
        restaurant,
        login,
        register,
        logout,
        refreshUserData,
        isLoading,
        isAuthenticated,
        authLoading: isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function useAuthGuard() {
  const auth = useAuth();

  if (auth.isLoading) {
    return {
      isLoading: true,
      isAuthenticated: false,
      user: null,
      restaurant: null,
    };
  }

  const isAuthenticated = !!(auth.user && auth.restaurant);
  return { isLoading: false, isAuthenticated, user: auth.user, restaurant: auth.restaurant };
}

export function getCurrentTenant() {
  const storedTenant = localStorage.getItem("tenant");
  if (storedTenant && storedTenant !== "undefined") {
    try {
      return JSON.parse(storedTenant);
    } catch (error) {
      console.error("Error parsing stored tenant:", error);
      localStorage.removeItem("tenant");
      return null;
    }
  }
  
  // Fallback: try to extract tenant from restaurant data
  const storedRestaurant = localStorage.getItem("restaurant");
  if (storedRestaurant && storedRestaurant !== "undefined") {
    try {
      const restaurant = JSON.parse(storedRestaurant);
      if (restaurant.tenantId) {
        // Create a basic tenant object from restaurant data
        return {
          id: restaurant.tenantId,
          name: restaurant.name + " Organization", // Fallback name
          slug: restaurant.name?.toLowerCase().replace(/[^a-z0-9]/g, '-') || "tenant"
        };
      }
    } catch (error) {
      console.error("Error parsing stored restaurant:", error);
    }
  }
  
  return null;
}