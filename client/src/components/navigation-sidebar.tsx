import { useLocation } from "wouter";
import { useTenant } from "@/lib/tenant";
import { Link } from "wouter";

interface NavigationItem {
  href: string;
  label: string;
  isActive?: boolean;
  subItems?: NavigationItem[];
}

export function NavigationSidebar() {
  const [location] = useLocation();
  const { tenant } = useTenant();

  if (!tenant) return null;

  const getNavigationItems = (): NavigationItem[] => {
    const basePath = `/${tenant.id}`;
    
    return [
      {
        href: `${basePath}/dashboard`,
        label: "Dashboard",
        isActive: location === `${basePath}/dashboard`
      },
      {
        href: `${basePath}/bookings`,
        label: "Bookings",
        isActive: location.startsWith(`${basePath}/bookings`)
      },
      {
        href: `${basePath}/change-requests`,
        label: "Change Requests",
        isActive: location === `${basePath}/change-requests`
      },
      {
        href: `${basePath}/calendar`,
        label: "Calendar",
        isActive: location === `${basePath}/calendar`
      },
      {
        href: `${basePath}/tables`,
        label: "Tables",
        isActive: location === `${basePath}/tables`
      },
      {
        href: `${basePath}/qr-menu`,
        label: "QR Menus",
        isActive: location === `${basePath}/qr-menu`
      },
      {
        href: `${basePath}/customers`,
        label: "Customers",
        isActive: location === `${basePath}/customers`
      },
      {
        href: `${basePath}/integrations`,
        label: "Integrations",
        isActive: location.startsWith(`${basePath}/integrations`)
      },
      {
        href: `${basePath}/statistics`,
        label: "Statistics",
        isActive: location === `${basePath}/statistics`
      },
      {
        href: `${basePath}/email-notifications`,
        label: "E-mail notifications",
        isActive: location === `${basePath}/email-notifications`
      },
      {
        href: `${basePath}/sms-notifications`,
        label: "SMS notifications",
        isActive: location === `${basePath}/sms-notifications`
      },
      {
        href: `${basePath}/feedback-questions`,
        label: "Feedback questions",
        isActive: location === `${basePath}/feedback-questions`
      },
      {
        href: `${basePath}/events`,
        label: "Events",
        isActive: location === `${basePath}/events`
      },
      {
        href: `${basePath}/payment-setups`,
        label: "Payment setups",
        isActive: location === `${basePath}/payment-setups`
      },
      {
        href: `${basePath}/payment-gateway`,
        label: "Payment Gateway",
        isActive: location === `${basePath}/payment-gateway`
      },
      {
        href: `${basePath}/products`,
        label: "Products",
        isActive: location === `${basePath}/products`
      },
      {
        href: `${basePath}/product-groups`,
        label: "Groups",
        isActive: location === `${basePath}/product-groups`
      },
      {
        href: `${basePath}/sms-messages`,
        label: "SMS messages",
        isActive: location === `${basePath}/sms-messages`
      },
      {
        href: `${basePath}/feedback-responses`,
        label: "Feedback responses",
        isActive: location === `${basePath}/feedback-responses`,
        subItems: [
          {
            href: `${basePath}/feedback-responses-popup`,
            label: "Popup View",
            isActive: location === `${basePath}/feedback-responses-popup`
          }
        ]
      },
      {
        href: `${basePath}/opening-hours`,
        label: "Opening Hours",
        isActive: location === `${basePath}/opening-hours`
      },
      {
        href: `${basePath}/special-periods`,
        label: "Special Periods",
        isActive: location === `${basePath}/special-periods`
      },
      {
        href: `${basePath}/cut-off-time`,
        label: "Cut-off Time",
        isActive: location === `${basePath}/cut-off-time`
      },
      {
        href: `${basePath}/rooms`,
        label: "Rooms",
        isActive: location === `${basePath}/rooms`
      },
      {
        href: `${basePath}/combined-tables`,
        label: "Combined Tables",
        isActive: location === `${basePath}/combined-tables`
      },
      {
        href: `${basePath}/table-plan`,
        label: "Table Plan",
        isActive: location === `${basePath}/table-plan`
      },
      {
        href: `${basePath}/waiting-list`,
        label: "Waiting List",
        isActive: location === `${basePath}/waiting-list`
      },
      {
        href: `${basePath}/activity-log`,
        label: "Activity Log",
        isActive: location === `${basePath}/activity-log`
      },
      {
        href: `${basePath}/settings`,
        label: "Settings",
        isActive: location === `${basePath}/settings`
      },
      {
        href: `${basePath}/subscription`,
        label: "Subscription",
        isActive: location === `${basePath}/subscription`
      }
    ];
  };

  const navigationItems = getNavigationItems();

  return (
    <div className="w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 min-h-screen">
      <div className="p-6">
        <div className="space-y-2">
          {navigationItems.map((item) => (
            <div key={item.href}>
              <Link href={item.href}>
                <div
                  className={`flex items-center space-x-2 px-3 py-2 rounded cursor-pointer transition-colors ${
                    item.isActive
                      ? "text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/20"
                      : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      item.isActive ? "bg-green-600 dark:bg-green-400" : "bg-gray-400 dark:bg-gray-500"
                    }`}
                  ></span>
                  <span className={item.isActive ? "font-medium" : ""}>{item.label}</span>
                </div>
              </Link>
              {item.subItems && item.isActive && (
                <div className="ml-4 mt-1 space-y-1">
                  {item.subItems.map((subItem) => (
                    <Link key={subItem.href} href={subItem.href}>
                      <div
                        className={`flex items-center space-x-2 px-3 py-2 rounded cursor-pointer transition-colors ${
                          subItem.isActive
                            ? "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20"
                            : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            subItem.isActive ? "bg-blue-600 dark:bg-blue-400" : "bg-gray-400 dark:bg-gray-500"
                          }`}
                        ></span>
                        <span className={subItem.isActive ? "font-medium" : ""}>{subItem.label}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}