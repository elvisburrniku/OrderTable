import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "./lib/auth.tsx";
import { TenantProvider } from "./lib/tenant";
import Home from "./pages/home";
import Login from "./pages/login";
import Dashboard from "./pages/dashboard";
import Bookings from "./pages/bookings";
import Tables from "./pages/tables";
import Customers from "./pages/customers";
import Statistics from "./pages/statistics";
import ActivityLog from "./pages/activity-log";
import WaitingList from "./pages/waiting-list";
import Subscription from "./pages/subscription";
import SmsMessages from "./pages/sms-messages";
import TenantSettings from "./pages/tenant-settings";
import NotFound from "./pages/not-found";
import EmailNotifications from "./pages/email-notifications";
import SmsNotifications from "./pages/sms-notifications";
import FeedbackQuestions from "./pages/feedback-questions";
import Events from "./pages/events";
import PaymentSetups from "./pages/payment-setups";
import PaymentGateway from "./pages/payment-gateway";
import Products from "./pages/products";
import ProductGroups from "./pages/product-groups";
import FeedbackResponses from "./pages/feedback-responses";
import OpeningHours from "./pages/opening-hours";
import SpecialPeriods from "./pages/special-periods";
import CutOffTime from "./pages/cut-off-time";
import PeriodicCriteria from "./pages/periodic-criteria";
import CustomFields from "./pages/custom-fields";
import SeatingConfigurations from "./pages/seating-configurations";
import CombinedTables from "./pages/combined-tables";
import Rooms from "./pages/rooms";
import BookingAgents from "./pages/booking-agents";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TenantProvider>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/login" component={Login} />
            <Route path="/dashboard" component={Dashboard} />
            <Route path="/bookings" component={Bookings} />
            <Route path="/tables" component={Tables} />
            <Route path="/customers" component={Customers} />
            <Route path="/statistics" component={Statistics} />
            <Route path="/activity-log" component={ActivityLog} />
            <Route path="/waiting-list" component={WaitingList} />
            <Route path="/subscription" component={Subscription} />
            <Route path="/sms-messages" component={SmsMessages} />
            <Route path="/tenant-settings" component={TenantSettings} />
            <Route path="/email-notifications" component={EmailNotifications} />
            <Route path="/sms-notifications" component={SmsNotifications} />
            <Route path="/feedback-questions" component={FeedbackQuestions} />
            <Route path="/events" component={Events} />
            <Route path="/payment-setups" component={PaymentSetups} />
            <Route path="/payment-gateway" component={PaymentGateway} />
            <Route path="/products" component={Products} />
            <Route path="/product-groups" component={ProductGroups} />
            <Route path="/feedback-responses" component={FeedbackResponses} />
            <Route path="/opening-hours" component={OpeningHours} />
            <Route path="/special-periods" component={SpecialPeriods} />
            <Route path="/cut-off-time" component={CutOffTime} />
            <Route path="/periodic-criteria" component={PeriodicCriteria} />
            <Route path="/custom-fields" component={CustomFields} />
            <Route path="/seating-configurations" component={SeatingConfigurations} />
            <Route path="/combined-tables" component={CombinedTables} />
            <Route path="/rooms" component={Rooms} />
            <Route path="/booking-agents" component={BookingAgents} />
            <Route component={NotFound} />
          </Switch>
          <Toaster />
        </TenantProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;