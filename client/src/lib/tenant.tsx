import React, { createContext, useContext, useEffect, useState } from "react";
import { getCurrentTenant } from "./auth";
import { useParams } from "wouter";
import type { Tenant, TenantUser } from "@db/schema";

interface TenantContextType {
  tenant: Tenant | null;
  tenantUsers: TenantUser[];
  userRole: string | null;
  canManageTenant: boolean;
  canManageUsers: boolean;
  setTenant: (tenant: Tenant | null) => void;
  setTenantUsers: (users: TenantUser[]) => void;
  tenantId?: number | null;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [tenantUsers, setTenantUsers] = useState<TenantUser[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Determine user permissions based on role
  const canManageTenant = userRole === "owner" || userRole === "admin";
  const canManageUsers = userRole === "owner" || userRole === "admin";

  useEffect(() => {
    // Load tenant data from localStorage or API
    const storedTenant = localStorage.getItem("tenant");
    if (storedTenant) {
      setTenant(JSON.parse(storedTenant));
    }
  }, []);

  useEffect(() => {
    // Store tenant in localStorage when it changes
    if (tenant) {
      localStorage.setItem("tenant", JSON.stringify(tenant));
    } else {
      localStorage.removeItem("tenant");
    }
  }, [tenant]);

  return (
    <TenantContext.Provider
      value={{
        tenant,
        tenantUsers,
        userRole,
        canManageTenant,
        canManageUsers,
        setTenant,
        setTenantUsers,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}


export function useTenant() {
  const context = useContext(TenantContext);
  const params = useParams();
  const authTenant = getCurrentTenant();

  if (context === undefined) {
    throw new Error("useTenant must be used within a TenantProvider");
  }

  // Always prioritize URL params over stored tenant
  const tenantId = params.tenantId ? parseInt(params.tenantId) : (authTenant?.id || null);

  return {
    ...context,
    tenantId
  };
}