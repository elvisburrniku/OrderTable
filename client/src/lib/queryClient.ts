import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  path: string,
  body?: any
): Promise<Response> {
  const options: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(path, options);
  return response;
}

import { getCurrentTenant } from './auth';

// Helper function to get current restaurant from localStorage
function getCurrentRestaurant() {
  try {
    const authData = localStorage.getItem('authData');
    if (authData) {
      const parsed = JSON.parse(authData);
      return parsed.restaurant;
    }
  } catch (error) {
    console.warn('Failed to get current restaurant:', error);
  }
  return null;
}

// Helper function to construct tenant-aware API URLs
export function getTenantApiUrl(path: string, tenantId?: number | null): string {
  const currentTenant = getCurrentTenant();
  const finalTenantId = tenantId || currentTenant?.id;

  if (finalTenantId && path.includes('/restaurants/') && !path.includes('/tenants/')) {
    // Convert non-tenant routes to tenant routes
    const parts = path.split('/restaurants/');
    if (parts.length === 2) {
      const [prefix, suffix] = parts;
      return `${prefix}/tenants/${finalTenantId}/restaurants/${suffix}`;
    }
  }

  // Handle other non-tenant routes that need tenant context
  if (finalTenantId && !path.includes('/tenants/') && !path.includes('/auth/') && !path.includes('/subscription-plans')) {
    // Add tenant prefix to routes that don't have it
    if (path.startsWith('/api/')) {
      const pathWithoutApi = path.substring(4);
      return `/api/tenants/${finalTenantId}${pathWithoutApi}`;
    }
  }

  return path;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});