import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "./lib/auth.tsx";
import { TenantProvider } from "./lib/tenant";
import Home from "./pages/home";
import Login from "./pages/login";
import Register from "./pages/register";
import Dashboard from "./pages/dashboard";
import Bookings from "./pages/bookings";
import BookingDetail from "./pages/booking-detail";
import Tables from "./pages/tables";
import Customers from "./pages/customers";
import Statistics from "./pages/statistics";
import ActivityLog from "./pages/activity-log";
import WaitingList from "./pages/waiting-list";
import Subscription from "./pages/subscription";
import SmsMessages from "./pages/sms-messages";
import TenantSettings from "./pages/tenant-settings";
import NotFound from "@/pages/not-found";
import BookingManage from "@/pages/booking-manage";
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
import TablePlan from "./pages/table-plan"; //Import the new TablePlan component
import { lazy } from "react";
import Profile from "./pages/profile";
import Settings from "./pages/settings";
import Billing from "./pages/billing";
import Help from "./pages/help";
import CustomerFeedback from "./pages/customer-feedback";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TenantProvider>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/login" component={Login} />
            <Route path="/register" component={Register} />
            <Route path="/:tenantId/dashboard" component={Dashboard} />
            <Route path="/:tenantId/bookings" component={Bookings} />
            <Route path="/:tenantId/bookings/:id" component={BookingDetail} />
            <Route path="/:tenantId/tables" component={Tables} />
            <Route path="/:tenantId/customers" component={Customers} />
            <Route path="/:tenantId/statistics" component={Statistics} />
            <Route path="/:tenantId/activity-log" component={ActivityLog} />
            <Route path="/:tenantId/waiting-list" component={WaitingList} />
            <Route path="/:tenantId/subscription" component={Subscription} />
            <Route path="/:tenantId/sms-messages" component={SmsMessages} />
            <Route path="/:tenantId/tenant-settings" component={TenantSettings} />
            <Route path="/:tenantId/email-notifications" component={EmailNotifications} />
            <Route path="/:tenantId/sms-notifications" component={SmsNotifications} />
            <Route path="/:tenantId/feedback-questions" component={FeedbackQuestions} />
            <Route path="/:tenantId/events" component={Events} />
            <Route path="/:tenantId/payment-setups" component={PaymentSetups} />
            <Route path="/:tenantId/payment-gateway" component={PaymentGateway} />
            <Route path="/:tenantId/products" component={Products} />
            <Route path="/:tenantId/product-groups" component={ProductGroups} />
            <Route path="/:tenantId/feedback-responses" component={FeedbackResponses} />
            <Route path="/:tenantId/opening-hours" component={OpeningHours} />
            <Route path="/:tenantId/special-periods" component={SpecialPeriods} />
            <Route path="/:tenantId/cut-off-time" component={CutOffTime} />
            <Route path="/:tenantId/periodic-criteria" component={PeriodicCriteria} />
            <Route path="/:tenantId/custom-fields" component={CustomFields} />
            <Route path="/:tenantId/seating-configurations" component={SeatingConfigurations} />
            <Route path="/:tenantId/combined-tables" component={CombinedTables} />
            <Route path="/:tenantId/table-plan" component={TablePlan} />
            <Route path="/:tenantId/rooms" component={Rooms} />
            <Route path="/:tenantId/booking-agents" component={BookingAgents} />
            <Route path="/booking-manage/:id" component={BookingManage} />
            <Route path="/feedback/:tenantId/:restaurantId" component={CustomerFeedback} />
            <Route path="/:tenantId/booking/:id" component={lazy(() => import("./pages/booking-detail"))} />
            <Route path="/:tenantId/profile" component={Profile} />
            <Route path="/:tenantId/settings" component={Settings} />
            <Route path="/:tenantId/billing" component={Billing} />
            <Route path="/:tenantId/help" component={Help} />
            <Route component={NotFound} />
          </Switch>
          <Toaster />
        </TenantProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;