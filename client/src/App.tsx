import { Switch, Route } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/lib/auth";
import { TenantProvider } from "@/lib/tenant";
import { Toaster } from "@/components/ui/toaster";
import { RouteGuard } from "./components/route-guard";
import { LayoutWrapper } from "./components/layout-wrapper";

// Import only existing components
import Home from "./pages/home";
import Login from "./pages/login";
import Register from "./pages/register";
import Dashboard from "./pages/dashboard";
import Bookings from "./pages/bookings";
import Calendar from "./pages/calendar";
import Tables from "./pages/tables";
import Settings from "./pages/settings";
import NotFound from "./pages/not-found";
import GuestBookingStandalone from "./pages/guest-booking-standalone";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Switch>
        {/* Public guest booking route - no authentication required */}
        <Route path="/guest-booking/:tenantId/:restaurantId" component={GuestBookingStandalone} />
        
        {/* All other routes require authentication */}
        <Route>
          <AuthProvider>
            <TenantProvider>
              <RouteGuard>
                <LayoutWrapper>
                  <Switch>
                    <Route path="/" component={Home} />
                    <Route path="/login" component={Login} />
                    <Route path="/register" component={Register} />
                    <Route path="/:tenantId/dashboard" component={Dashboard} />
                    <Route path="/:tenantId/bookings" component={Bookings} />
                    <Route path="/:tenantId/calendar" component={Calendar} />
                    <Route path="/:tenantId/tables" component={Tables} />
                    <Route path="/:tenantId/settings" component={Settings} />
                    <Route component={NotFound} />
                  </Switch>
                </LayoutWrapper>
              </RouteGuard>
              <Toaster />
            </TenantProvider>
          </AuthProvider>
        </Route>
      </Switch>
    </QueryClientProvider>
  );
}

export default App;