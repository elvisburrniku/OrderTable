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
  login: (email: string, password: string, rememberMe?: boolean) => Promise<any>;
  register: (userData: {
    name: string;
    password: string;
    email: string;
    restaurantName: string;
    subscriptionPlanId: number;
  }) => Promise<any>;
  logout: () => Promise<void>;
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
      try {
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
                // Handle suspended/paused account responses
                if (response.status === 403) {
                  const errorData = await response.json().catch(() => ({}));
                  if (errorData.status === 'suspended' || errorData.status === 'paused') {
                    // Clear session but keep user informed
                    localStorage.removeItem("user");
                    localStorage.removeItem("restaurant");
                    localStorage.removeItem("tenant");
                    // Don't throw error here, let login page handle the display
                    return;
                  }
                }
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
      } catch (error) {
        console.error("Session validation error:", error);
        setIsLoading(false);
      }
    };

    validateSession().catch(error => {
      console.error("Unhandled validation error:", error);
      setIsLoading(false);
    });
  }, []);

  const login = async (email: string, password: string, rememberMe?: boolean) => {
    console.log('Attempting login for email:', email);
    
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        email,
        password,
        rememberMe,
      }),
    });

    console.log('Login response status:', res.status);

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      console.log('Login error data:', errorData);
      
      // Handle specific account status errors
      if (res.status === 403) {
        if (errorData.status === 'suspended') {
          throw new Error(`Account Suspended: ${errorData.details || 'Your account has been suspended. Please contact support for assistance.'}`);
        }
        if (errorData.status === 'paused') {
          const pauseMessage = errorData.pauseEndDate 
            ? `Account Paused: Your account is paused until ${new Date(errorData.pauseEndDate).toLocaleDateString()}. It will be automatically reactivated after this date.`
            : `Account Paused: ${errorData.details || 'Your account is temporarily paused. Please contact support for assistance.'}`;
          throw new Error(pauseMessage);
        }
      }
      
      if (res.status === 401) {
        throw new Error("Invalid email or password. Please check your credentials and try again.");
      }
      
      throw new Error(errorData.message || "Login failed");
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
    
    // Store remember me preference and login credentials if enabled
    if (rememberMe) {
      localStorage.setItem("rememberMe", "true");
      localStorage.setItem("lastLoginEmail", email);
    } else {
      localStorage.removeItem("rememberMe");
      localStorage.removeItem("lastLoginEmail");
    }

    return data;
  };

  const register = async (userData: {
    name: string;
    password: string;
    email: string;
    restaurantName: string;
    subscriptionPlanId: number;
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
        name: userData.name,
        subscriptionPlanId: userData.subscriptionPlanId,
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

  const logout = async () => {
    try {
      // Call server-side logout if SSO is enabled
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.warn("Server logout failed, proceeding with client logout");
    }
    
    // Clear client state
    setUser(null);
    setRestaurant(null);
    localStorage.removeItem("user");
    localStorage.removeItem("restaurant");
    localStorage.removeItem("tenant");
    localStorage.removeItem("rememberMe");
    localStorage.removeItem("lastLoginEmail");
    
    // Redirect to login page
    window.location.href = "/login";
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

  // Team members may not have restaurant ownership but should still be authenticated if they have tenant access
  const isAuthenticated = !!(user && (restaurant || (user && localStorage.getItem("tenant"))));

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