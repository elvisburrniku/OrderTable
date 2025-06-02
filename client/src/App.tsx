import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth.tsx";
import Home from "@/pages/home";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Customers from "@/pages/customers";
import Bookings from "@/pages/bookings";
import SmsMessages from "@/pages/sms-messages";
import WaitingList from "@/pages/waiting-list";
import Statistics from "@/pages/statistics";
import FeedbackResponses from "@/pages/feedback-responses";
import ActivityLog from "@/pages/activity-log";
import OpeningHours from "@/pages/opening-hours";
import SpecialPeriods from "@/pages/special-periods";
import CutOffTime from "@/pages/cut-off-time";
import Rooms from "@/pages/rooms";
import Tables from "@/pages/tables";
import CombinedTables from "@/pages/combined-tables";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/customers" component={Customers} />
      <Route path="/bookings" component={Bookings} />
      <Route path="/sms-messages" component={SmsMessages} />
      <Route path="/waiting-list" component={WaitingList} />
      <Route path="/statistics" component={Statistics} />
      <Route path="/feedback-responses" component={FeedbackResponses} />
      <Route path="/activity-log" component={ActivityLog} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
