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
}

let currentUser: AuthUser | null = null;
let currentRestaurant: Restaurant | null = null;

export function setAuth(user: AuthUser, restaurant: Restaurant) {
  currentUser = user;
  currentRestaurant = restaurant;
  localStorage.setItem("auth", JSON.stringify({ user, restaurant }));
}

export function clearAuth() {
  currentUser = null;
  currentRestaurant = null;
  localStorage.removeItem("auth");
}

export function getCurrentUser(): AuthUser | null {
  if (currentUser) return currentUser;
  
  const stored = localStorage.getItem("auth");
  if (stored) {
    const { user, restaurant } = JSON.parse(stored);
    currentUser = user;
    currentRestaurant = restaurant;
    return user;
  }
  
  return null;
}

export function getCurrentRestaurant(): Restaurant | null {
  if (currentRestaurant) return currentRestaurant;
  
  const stored = localStorage.getItem("auth");
  if (stored) {
    const { user, restaurant } = JSON.parse(stored);
    currentUser = user;
    currentRestaurant = restaurant;
    return restaurant;
  }
  
  return null;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const response = await apiRequest("POST", "/api/auth/login", { email, password });
  const data = await response.json();
  setAuth(data.user, data.restaurant);
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
  setAuth(data.user, data.restaurant);
  return data;
}

export function logout() {
  clearAuth();
}

export function isAuthenticated(): boolean {
  return getCurrentUser() !== null;
}
