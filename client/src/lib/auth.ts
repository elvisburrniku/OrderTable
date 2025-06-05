import { apiRequest } from "./queryClient";

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  restaurantName: string;
}

export interface Restaurant {
  id: number;
  name: string;
  ownerId: number;
  address: string;
  phone: string;
  email: string;
  description?: string;
  tables: number;
}

export interface AuthResponse {
  user: AuthUser;
  restaurant: Restaurant;
  tenant: {
    id: number;
    name: string;
    slug: string;
  };
}

let currentUser: AuthUser | null = null;
let currentRestaurant: Restaurant | null = null;
let currentTenant: { id: number; name: string; slug: string } | null = null;

export function setAuth(user: AuthUser, restaurant: Restaurant, tenant?: { id: number; name: string; slug: string }) {
  currentUser = user;
  currentRestaurant = restaurant;
  currentTenant = tenant || null;
  localStorage.setItem("auth", JSON.stringify({ user, restaurant, tenant }));
}

export function clearAuth() {
  currentUser = null;
  currentRestaurant = null;
  currentTenant = null;
  localStorage.removeItem("auth");
}

export function getCurrentUser(): AuthUser | null {
  if (currentUser) return currentUser;
  
  const stored = localStorage.getItem("auth");
  if (stored) {
    const { user, restaurant, tenant } = JSON.parse(stored);
    currentUser = user;
    currentRestaurant = restaurant;
    currentTenant = tenant || null;
    return user;
  }
  
  return null;
}

export function getCurrentRestaurant(): Restaurant | null {
  if (currentRestaurant) return currentRestaurant;
  
  const stored = localStorage.getItem("auth");
  if (stored) {
    const { user, restaurant, tenant } = JSON.parse(stored);
    currentUser = user;
    currentRestaurant = restaurant;
    currentTenant = tenant || null;
    return restaurant;
  }
  
  return null;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const response = await apiRequest("POST", "/api/auth/login", { email, password });
  const data = await response.json();
  setAuth(data.user, data.restaurant, data.tenant);
  return data;
}

export async function register(userData: {
  username: string;
  password: string;
  email: string;
  restaurantName: string;
}): Promise<AuthResponse> {
  const response = await apiRequest("POST", "/api/auth/register", userData);
  const data = await response.json();
  setAuth(data.user, data.restaurant, data.tenant);
  return data;
}

export function getCurrentTenant(): { id: number; name: string; slug: string } | null {
  if (currentTenant) return currentTenant;
  
  const stored = localStorage.getItem("auth");
  if (stored) {
    const { user, restaurant, tenant } = JSON.parse(stored);
    currentUser = user;
    currentRestaurant = restaurant;
    currentTenant = tenant || null;
    return tenant || null;
  }
  
  return null;
}

export function logout() {
  clearAuth();
}

export function isAuthenticated(): boolean {
  return getCurrentUser() !== null;
}
