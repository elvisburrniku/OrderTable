import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { apiRequest } from "./queryClient";
import { User, Restaurant } from "@shared/schema";

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

    if (storedUser && storedUser !== "undefined") {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error("Error parsing stored user:", error);
        localStorage.removeItem("user");
      }
    }
    if (storedRestaurant && storedRestaurant !== "undefined") {
      try {
        setRestaurant(JSON.parse(storedRestaurant));
      } catch (error) {
        console.error("Error parsing stored restaurant:", error);
        localStorage.removeItem("restaurant");
      }
    }

    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const res = await apiRequest("POST", "/api/auth/login", {
      email,
      password,
    });
    const data = await res.json();

    setUser(data.user);
    setRestaurant(data.restaurant);

    localStorage.setItem("user", JSON.stringify(data.user));
    if (data.restaurant) {
      localStorage.setItem("restaurant", JSON.stringify(data.restaurant));
    }

    return data;
  };

  const register = async (userData: {
    username: string;
    password: string;
    email: string;
    restaurantName: string;
  }) => {
    const res = await apiRequest("POST", "/api/auth/register", {
      username: userData.email, // Use email as username
      email: userData.email,
      password: userData.password,
      restaurantName: userData.restaurantName,
      name: userData.username, // Map username to name field
    });
    const data = await res.json();

    if (!data.user || !data.restaurant) {
      throw new Error("Invalid registration response");
    }

    setUser(data.user);
    setRestaurant(data.restaurant);

    localStorage.setItem("user", JSON.stringify(data.user));
    localStorage.setItem("restaurant", JSON.stringify(data.restaurant));

    return data;
  };

  const logout = () => {
    setUser(null);
    setRestaurant(null);
    localStorage.removeItem("user");
    localStorage.removeItem("restaurant");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        restaurant,
        login,
        register,
        logout,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function useAuthGuard() {
  const { user, restaurant, isLoading } = useAuth();

  if (isLoading) {
    return {
      isLoading: true,
      isAuthenticated: false,
      user: null,
      restaurant: null,
    };
  }

  const isAuthenticated = !!(user && restaurant);
  return { isLoading: false, isAuthenticated, user, restaurant };
}
