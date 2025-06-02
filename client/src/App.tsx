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
import SeatingConfigurations from "./pages/seating-configurations";
import PeriodicCriteria from "./pages/periodic-criteria";
import CustomFields from "./pages/custom-fields";
import BookingAgents from "./pages/booking-agents";
import EmailNotifications from "./pages/email-notifications";
import SmsNotifications from "./pages/sms-notifications";
import FeedbackQuestions from "./pages/feedback-questions";
import Events from "./pages/events";
import PaymentSetups from "./pages/payment-setups";
import PaymentGateway from "./pages/payment-gateway";
import Products from "./pages/products";
import ProductGroups from "./pages/product-groups";
import NotFound from "./pages/not-found";

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
      <Route path="/opening-hours" component={OpeningHours} />
      <Route path="/special-periods" component={SpecialPeriods} />
      <Route path="/cut-off-time" component={CutOffTime} />
      <Route path="/rooms" component={Rooms} />
      <Route path="/tables" component={Tables} />
      <Route path="/combined-tables" component={CombinedTables} />
      <Route path="/seating-configurations" component={SeatingConfigurations} />
      <Route path="/periodic-criteria" component={PeriodicCriteria} />
      <Route path="/custom-fields" component={CustomFields} />
      <Route path="/booking-agents" component={BookingAgents} />
      <Route path="/email-notifications" component={EmailNotifications} />
      <Route path="/sms-notifications" component={SmsNotifications} />
      <Route path="/feedback-questions" component={FeedbackQuestions} />
      <Route path="/events" component={Events} />
      <Route path="/payment-setups" component={PaymentSetups} />
      <Route path="/payment-gateway" component={PaymentGateway} />
      <Route path="/products" component={Products} />
      <Route path="/product-groups" component={ProductGroups} />
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