import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "./lib/auth.tsx";
import { TenantProvider } from "./lib/tenant";
import { RestaurantAuthProvider } from "./lib/restaurant-auth";
import { RouteGuard } from "./components/route-guard";
import { LayoutWrapper } from "./components/layout-wrapper";
import { SessionTimeoutHandler } from "./components/session-timeout-handler";
import { LanguageProvider } from "./contexts/language-context";
import { LanguageLoading } from "./components/language-loading";
import { useLanguage } from "./contexts/language-context";
import Home from "./pages/home";
import Login from "./pages/login";
import Register from "./pages/register";
import RestaurantLogin from "./pages/restaurant-login";
import RestaurantDashboard from "./pages/restaurant-dashboard";
import Dashboard from "./pages/dashboard";
import Bookings from "./pages/bookings";
import Calendar from "./pages/calendar";
import HeatMap from "./pages/heat-map";
import Conflicts from "./pages/conflicts";
import BookingDetail from "./pages/booking-detail";
import Tables from "./pages/tables";
import Customers from "./pages/customers";
import Statistics from "./pages/statistics";
import ActivityLog from "./pages/activity-log";
import GlobalActivityLog from "./pages/global-activity-log";
import WaitingList from "./pages/waiting-list";
import Subscription from "./pages/subscription";
import Billing from "./pages/billing";
import SmsMessages from "./pages/sms-messages";
import TenantSettings from "./pages/tenant-settings";
import NotFound from "@/pages/not-found";
import BookingManage from "@/pages/booking-manage";
import EmailNotifications from "./pages/email-notifications";
import SmsNotifications from "./pages/sms-notifications";
import FeedbackQuestions from "./pages/feedback-questions";
import FeedbackPublic from "./pages/feedback-public";
import Events from "./pages/events";
import PaymentSetups from "./pages/payment-setups";
import PaymentGateway from "./pages/payment-gateway";
import Products from "./pages/products";
import ProductGroups from "./pages/product-groups";
import FeedbackResponses from "./pages/feedback-responses";
import GuestFeedbackForm from "./pages/guest-feedback-form";
import OpeningHours from "./pages/opening-hours";
import Integrations from "./pages/integrations";
import WidgetIntegration from "./pages/integrations/widget";
import Shop from "./pages/shop";
import WidgetDemo from "./pages/widget-demo";
import ActiveCampaignIntegration from "./pages/integrations/activecampaign";
import GoogleIntegration from "./pages/google-integration";
import KlaviyoIntegration from "./pages/integrations/klaviyo";
import MailchimpIntegration from "./pages/integrations/mailchimp";
import MetaIntegration from "./pages/integrations/meta";
import MichelinIntegration from "./pages/integrations/michelin";
import WebhooksIntegration from "./pages/integrations/webhooks";
import TripAdvisorIntegration from "./pages/integrations/tripadvisor";
import SlackIntegration from "./pages/integrations/slack";
import NotionIntegration from "./pages/integrations/notion";
import SpecialPeriods from "./pages/special-periods";
import CutOffTime from "./pages/cut-off-time";
import PeriodicCriteria from "./pages/periodic-criteria";
import CustomFields from "./pages/custom-fields";
import SeatingConfigurations from "./pages/seating-configurations";
import CombinedTables from "./pages/combined-tables";
import Rooms from "./pages/rooms";
import BookingAgents from "./pages/booking-agents";
import SmsSettings from "./pages/sms-settings";
import Surveys from "./pages/surveys";
import TwilioSettings from "./pages/twilio-settings";
import TablePlan from "./pages/table-plan"; //Import the new TablePlan component
import RestaurantSettings from "./pages/restaurant-settings";
import { lazy } from "react";
import Profile from "./pages/profile";
import Settings from "./pages/settings";
import Help from "./pages/help";
import RestaurantManagement from "./pages/restaurant-management";
import CreateRestaurant from "./pages/create-restaurant";
import CustomerFeedback from "./pages/customer-feedback";
import TableFeedback from "./pages/table-feedback";
import FeedbackResponsesPopup from "./pages/feedback-responses-popup";
import Contact from "./pages/contact";
import GuestBookingNew from "./pages/guest-booking-new";
import GuestBookingResponsive from "./pages/guest-booking-responsive";
import FeedbackTest from "./pages/feedback-test";
import SetupWizard from "./pages/setup-wizard";
import EmailTest from "./pages/email-test";
import TestTools from "./pages/test-tools";
import MenuManagementPage from "./pages/menu-management";
import KitchenDashboardPage from "./pages/kitchen-dashboard";
import PrintOrders from "./pages/print-orders";
import CountdownDemoPage from "./pages/countdown-demo";
import FloorPlan from "./pages/floor-plan";
import { SetupGuard } from "./components/setup-guard";
import { OverduePaymentGuard } from "./components/overdue-payment-guard";
import ErrorBoundary from "./components/error-boundary";
import { AutoPermissionGuard } from "./components/permission-guard";
import { AdminPanel } from "./pages/admin/admin-panel";
import TenantUsersManagement from "./pages/tenant-users-management";
import AcceptInvitation from "./pages/accept-invitation";
import RolePermissions from "./pages/role-permissions";
import { SettingsProvider } from "@/contexts/settings-context";
import { DateProvider } from "@/contexts/date-context";
import { CurrencyProvider } from "@/contexts/currency-context";
import { BookingProvider } from "@/contexts/booking-context";
import { PWAInstallPrompt } from "@/components/pwa-install-prompt";
import SurveyResponse from "./pages/survey-response";
import StripeConnectSettings from "./pages/StripeConnectSettings";
import PaymentPage from "./pages/PaymentPage";
import PrePayment from "./pages/PrePayment";
import PaymentSuccess from "./pages/payment-success";

function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <QueryClientProvider client={queryClient}>
          <Switch>
            {/* Restaurant Management System - role-based permissions */}
            <Route path="/restaurant-login">
              <RestaurantAuthProvider>
                <RestaurantLogin />
              </RestaurantAuthProvider>
            </Route>
            <Route path="/restaurant-dashboard">
              <RestaurantAuthProvider>
                <RestaurantDashboard />
              </RestaurantAuthProvider>
            </Route>

            {/* Admin Panel - completely separate from tenant system */}
            <Route path="/admin" component={AdminPanel} />
            <Route path="/admin/*" component={AdminPanel} />

            {/* Public routes - standalone without guards */}
            <Route
              path="/feedback/:tenantId/:restaurantId"
              component={GuestFeedbackForm}
            />
            <Route path="/feedback-test" component={FeedbackTest} />
            <Route
              path="/guest-booking/:tenantId/:restaurantId"
              component={GuestBookingResponsive}
            />
            <Route
              path="/:tenantId/book/:restaurantId"
              component={GuestBookingResponsive}
            />
            <Route path="/booking-manage/:id" component={BookingManage} />
            <Route path="/manage-booking/:id" component={BookingManage} />
            <Route path="/manage-booking/:id/:hash" component={BookingManage} />
            <Route path="/cancel-booking/:id/:hash" component={BookingManage} />
            <Route path="/accept-invitation" component={AcceptInvitation} />
            <Route path="/survey/:token" component={SurveyResponse} />
            <Route path="/payment" component={PaymentPage} />
            <Route path="/prepayment" component={PrePayment} />
            <Route path="/payment-success" component={PaymentSuccess} />
            <Route path="/shop" component={Shop} />

            {/* Widget demo with auth context */}
            <Route path="/:tenantId/widget-demo">
              <AuthProvider>
                <TenantProvider>
                  <WidgetDemo />
                </TenantProvider>
              </AuthProvider>
            </Route>

            {/* All other routes with authentication */}
            <Route>
              <AuthProvider>
                <TenantProvider>
                  <SettingsProvider>
                    <DateProvider>
                      <CurrencyProvider>
                        <BookingProvider>
                          <RouteGuard>
                            <LayoutWrapper>
                              <SessionTimeoutHandler />
                              <Switch>
                                <Route path="/" component={Home} />
                                <Route path="/login" component={Login} />
                                <Route path="/register" component={Register} />
                                <Route path="/setup" component={SetupWizard} />
                                <SetupGuard>
                                  <OverduePaymentGuard>
                                    <AutoPermissionGuard>
                                      <Route
                                        path="/:tenantId/dashboard"
                                        component={Dashboard}
                                      />
                                      <Route
                                        path="/:tenantId/bookings"
                                        component={Bookings}
                                      />
                                      <Route
                                        path="/:tenantId/calendar"
                                        component={Calendar}
                                      />
                                      <Route
                                        path="/:tenantId/heat-map"
                                        component={HeatMap}
                                      />
                                      <Route
                                        path="/:tenantId/conflicts"
                                        component={Conflicts}
                                      />
                                      <Route
                                        path="/:tenantId/bookings/:id"
                                        component={BookingDetail}
                                      />
                                      <Route
                                        path="/:tenantId/tables"
                                        component={Tables}
                                      />
                                      <Route
                                        path="/:tenantId/floor-plan"
                                        component={FloorPlan}
                                      />
                                      <Route
                                        path="/:tenantId/customers"
                                        component={Customers}
                                      />
                                      <Route
                                        path="/:tenantId/menu"
                                        component={MenuManagementPage}
                                      />
                                      <Route
                                        path="/:tenantId/integrations"
                                        component={Integrations}
                                      />
                                      <Route
                                        path="/:tenantId/integrations/widget"
                                        component={WidgetIntegration}
                                      />
                                      <Route
                                        path="/:tenantId/integrations/google"
                                        component={GoogleIntegration}
                                      />
                                      <Route
                                        path="/:tenantId/integrations/activecampaign"
                                        component={ActiveCampaignIntegration}
                                      />
                                      <Route
                                        path="/:tenantId/integrations/klaviyo"
                                        component={KlaviyoIntegration}
                                      />
                                      <Route
                                        path="/:tenantId/integrations/mailchimp"
                                        component={MailchimpIntegration}
                                      />
                                      <Route
                                        path="/:tenantId/integrations/meta"
                                        component={MetaIntegration}
                                      />
                                      <Route
                                        path="/:tenantId/integrations/michelin"
                                        component={MichelinIntegration}
                                      />
                                      <Route
                                        path="/:tenantId/integrations/webhooks"
                                        component={WebhooksIntegration}
                                      />
                                      <Route
                                        path="/:tenantId/integrations/tripadvisor"
                                        component={TripAdvisorIntegration}
                                      />
                                      <Route
                                        path="/:tenantId/integrations/slack"
                                        component={SlackIntegration}
                                      />
                                      <Route
                                        path="/:tenantId/integrations/notion"
                                        component={NotionIntegration}
                                      />
                                      <Route
                                        path="/:tenantId/statistics"
                                        component={Statistics}
                                      />
                                      <Route
                                        path="/:tenantId/activity-log"
                                        component={ActivityLog}
                                      />
                                      <Route
                                        path="/:tenantId/global-activity-log"
                                        component={GlobalActivityLog}
                                      />
                                      <Route
                                        path="/:tenantId/waiting-list"
                                        component={WaitingList}
                                      />
                                      <Route
                                        path="/:tenantId/subscription"
                                        component={Subscription}
                                      />
                                      <Route
                                        path="/:tenantId/billing"
                                        component={Billing}
                                      />
                                      <Route
                                        path="/:tenantId/sms-messages"
                                        component={SmsMessages}
                                      />
                                      <Route
                                        path="/:tenantId/tenant-settings"
                                        component={TenantSettings}
                                      />
                                      <Route path="/:tenantId/users">
                                        {(params) => (
                                          <TenantUsersManagement
                                            tenantId={parseInt(
                                              params.tenantId || "1",
                                            )}
                                          />
                                        )}
                                      </Route>
                                      <Route
                                        path="/:tenantId/guard-management"
                                        component={RolePermissions}
                                      />
                                    </AutoPermissionGuard>
                                    <AutoPermissionGuard>
                                      <Route
                                        path="/:tenantId/email-notifications"
                                        component={EmailNotifications}
                                      />
                                      <Route
                                        path="/:tenantId/sms-notifications"
                                        component={SmsNotifications}
                                      />
                                      <Route
                                        path="/:tenantId/feedback"
                                        component={FeedbackResponses}
                                      />
                                      <Route
                                        path="/:tenantId/feedback-questions"
                                        component={FeedbackQuestions}
                                      />
                                      <Route
                                        path="/:tenantId/events"
                                        component={Events}
                                      />
                                      <Route
                                        path="/:tenantId/payment-setups"
                                        component={PaymentSetups}
                                      />
                                      <Route
                                        path="/:tenantId/payment-gateway"
                                        component={StripeConnectSettings}
                                      />
                                      <Route
                                        path="/:tenantId/settings/payments"
                                        component={StripeConnectSettings}
                                      />
                                      <Route
                                        path="/:tenantId/products"
                                        component={Products}
                                      />
                                      <Route
                                        path="/:tenantId/product-groups"
                                        component={ProductGroups}
                                      />
                                      <Route
                                        path="/:tenantId/feedback-responses"
                                        component={FeedbackResponses}
                                      />
                                      <Route
                                        path="/:tenantId/opening-hours"
                                        component={OpeningHours}
                                      />
                                      <Route
                                        path="/:tenantId/special-periods"
                                        component={SpecialPeriods}
                                      />
                                      <Route
                                        path="/:tenantId/cut-off-time"
                                        component={CutOffTime}
                                      />
                                      <Route
                                        path="/:tenantId/periodic-criteria"
                                        component={PeriodicCriteria}
                                      />
                                      <Route
                                        path="/:tenantId/custom-fields"
                                        component={CustomFields}
                                      />
                                      <Route
                                        path="/:tenantId/seating-configurations"
                                        component={SeatingConfigurations}
                                      />
                                      <Route
                                        path="/:tenantId/combined-tables"
                                        component={CombinedTables}
                                      />
                                      <Route
                                        path="/:tenantId/table-plan"
                                        component={TablePlan}
                                      />
                                      <Route
                                        path="/:tenantId/rooms"
                                        component={Rooms}
                                      />
                                      <Route
                                        path="/:tenantId/booking-agents"
                                        component={BookingAgents}
                                      />
                                      <Route
                                        path="/:tenantId/sms-settings"
                                        component={SmsSettings}
                                      />
                                      <Route
                                        path="/:tenantId/surveys"
                                        component={Surveys}
                                      />
                                      <Route
                                        path="/:tenantId/twilio-settings"
                                        component={TwilioSettings}
                                      />
                                      <Route
                                        path="/:tenantId/restaurants/:restaurantId/settings"
                                        component={RestaurantSettings}
                                      />

                                      <Route
                                        path="/:tenantId/booking/:id"
                                        component={lazy(
                                          () =>
                                            import("./pages/booking-detail"),
                                        )}
                                      />
                                      <Route
                                        path="/:tenantId/profile"
                                        component={Profile}
                                      />
                                      <Route
                                        path="/:tenantId/settings"
                                        component={Settings}
                                      />
                                      <Route
                                        path="/:tenantId/help"
                                        component={Help}
                                      />
                                      <Route
                                        path="/:tenantId/restaurant-management"
                                        component={RestaurantManagement}
                                      />
                                      <Route
                                        path="/:tenantId/create-restaurant"
                                        component={CreateRestaurant}
                                      />
                                      <Route
                                        path="/:tenantId/menu-management"
                                        component={MenuManagementPage}
                                      />
                                      <Route
                                        path="/:tenantId/kitchen-dashboard"
                                        component={KitchenDashboardPage}
                                      />
                                      <Route
                                        path="/:tenantId/print-orders"
                                        component={PrintOrders}
                                      />
                                      <Route
                                        path="/:tenantId/countdown-demo"
                                        component={CountdownDemoPage}
                                      />
                                      <Route
                                        path="/:tenantId/email-test"
                                        component={EmailTest}
                                      />
                                      <Route
                                        path="/:tenantId/test-tools"
                                        component={TestTools}
                                      />
                                      <Route
                                        path="/:tenantId/feedbacks"
                                        component={FeedbackResponses}
                                      />
                                    </AutoPermissionGuard>
                                  </OverduePaymentGuard>
                                </SetupGuard>

                                {/* Other protected routes */}
                                <Route
                                  path="/feedback-responses-popup"
                                  component={FeedbackResponsesPopup}
                                />
                                <Route path="/contact" component={Contact} />
                                <Route component={NotFound} />
                              </Switch>
                            </LayoutWrapper>
                          </RouteGuard>
                        </BookingProvider>
                      </CurrencyProvider>
                    </DateProvider>
                  </SettingsProvider>
                </TenantProvider>
              </AuthProvider>
            </Route>
          </Switch>
          <Toaster />
          <PWAInstallPrompt />
        </QueryClientProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}

export default App;
