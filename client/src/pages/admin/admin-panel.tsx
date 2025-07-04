import { useState, useEffect } from "react";
import { AdminLogin } from "./admin-login";
import { AdminLayout } from "./admin-layout";
import { AdminDashboard } from "./admin-dashboard";
import { AdminTenants } from "./admin-tenants";
import { AdminSubscriptions } from "./admin-subscriptions";
import { AdminUsers } from "./admin-users";
import { AdminLogs } from "./admin-logs";
import { AdminSettings } from "./admin-settings";
import ShopManagement from "./shop-management";
import AdminWebhooks from "./admin-webhooks";
import { useToast } from "@/hooks/use-toast";

interface AdminUser {
  id: number;
  email: string;
  name: string;
  role: string;
}

export function AdminPanel() {
  const [token, setToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [activePage, setActivePage] = useState("dashboard");
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Check for existing session on mount
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    try {
      const storedToken = localStorage.getItem('admin_token');
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      const response = await fetch("/api/admin/me", {
        headers: {
          "Authorization": `Bearer ${storedToken}`,
        },
      });

      if (response.ok) {
        const user = await response.json();
        setToken(storedToken);
        setCurrentUser(user);
      } else {
        localStorage.removeItem('admin_token');
      }
    } catch (error) {
      console.error("Session check error:", error);
      localStorage.removeItem('admin_token');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = (newToken: string, user: AdminUser) => {
    localStorage.setItem('admin_token', newToken);
    setToken(newToken);
    setCurrentUser(user);
  };

  const handleLogout = async () => {
    try {
      if (token) {
        await fetch("/api/admin/logout", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      localStorage.removeItem('admin_token');
      setToken(null);
      setCurrentUser(null);
      setActivePage("dashboard");
      toast({
        title: "Logged out",
        description: "You have been successfully logged out",
      });
    }
  };

  const renderActivePage = () => {
    if (!token) return null;

    switch (activePage) {
      case "dashboard":
        return <AdminDashboard token={token} />;
      case "tenants":
        return <AdminTenants token={token} />;
      case "subscriptions":
        return <AdminSubscriptions token={token} />;
      case "users":
        return <AdminUsers token={token} currentUser={currentUser} />;
      case "shop":
        return <ShopManagement />;
      case "webhooks":
        return <AdminWebhooks />;
      case "logs":
        return <AdminLogs token={token} />;
      case "settings":
        return <AdminSettings token={token} />;
      default:
        return <AdminDashboard token={token} />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center space-y-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-600 border-t-transparent mx-auto" />
          <p className="text-slate-600 dark:text-slate-400">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  if (!token || !currentUser) {
    return <AdminLogin onLogin={handleLogin} />;
  }

  return (
    <AdminLayout
      currentUser={currentUser}
      onLogout={handleLogout}
      activePage={activePage}
      onPageChange={setActivePage}
    >
      {renderActivePage()}
    </AdminLayout>
  );
}