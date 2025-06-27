# Restaurant Booking Dashboard

## Project Overview
A comprehensive restaurant booking management system with React frontend and Express backend. Features include table management, booking calendar, special periods configuration, Google Calendar integration, and subscription management.

## Architecture
- **Frontend**: React with Vite, TypeScript, Tailwind CSS
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL (Neon-backed)
- **Authentication**: Passport.js with multiple SSO providers
- **Email**: Brevo API integration
- **Payments**: Stripe integration

## Key Features
- Multi-tenant restaurant management
- Interactive booking calendar (Google Calendar clone)
- Table layout management
- Special periods configuration (holidays, events)
- Email notifications and reminders
- Payment processing
- Activity logging
- Kitchen order management

## Recent Changes
- **2025-06-27**: Database fully operational with complete schema synchronization and table limit system functional
- **Table Limit System**: Subscription-based table creation limits fully implemented with real-time enforcement
- **Database Schema**: All 66 tables properly created including tenants, restaurants, tables, subscription_plans, and booking system
- **Bug Fix Resolution**: Resolved function redeclaration errors that were preventing guest booking system from loading properly
- **Special Periods Smart Logic**: When "Restaurant is open during this period" is enabled, system uses custom opening/closing times from special period configuration instead of blocking dates
- **Dynamic Time Slots**: Guest booking system generates time slots based on special period hours when restaurant is open during configured periods
- **Flexible Configuration**: Special periods now support both closure periods (blocked dates) and modified hours periods (custom times)
- **Comprehensive Booking Restrictions**: Guest booking system prevents bookings based on opening hours, special periods, and cut-off time configurations
- **Calendar Integration**: Calendar view visually disables dates blocked by configuration restrictions while allowing dates with modified hours
- **Enhanced Validation**: Updated time slot validation and generation to prioritize special period hours over regular opening hours
- **System Stability**: Guest booking system now loads without errors and properly handles all configuration scenarios
- **Priority System Implementation**: Established clear booking restriction hierarchy - Special periods override opening hours, cut-off times enforce time buffers
- **Cut-off Time Logic**: Enhanced cut-off validation to handle both hourly (1:00 = 1 hour before) and daily (24:00 = 1 day before) restrictions
- **Cut-off Time Fix**: Fixed hourly cut-off logic - if current time is 11:00 AM and cut-off is 1 hour, blocks bookings until after 12:00 PM
- **Elegant Loading Skeletons**: Implemented comprehensive loading skeletons for async content with shimmer animations and glassmorphism design
- **Skeleton Components**: Added RestaurantInfoSkeleton, CalendarSkeleton, TimeSlotsSkeletonGrid, BookingFormSkeleton, and TableSelectionSkeleton
- **Enhanced UX**: Loading states now show elegant animated placeholders while data loads instead of blank or loading spinners
- **Heat-Map Integration**: Heat-map now uses actual table positions, shapes, and rotations from table-plan page instead of hardcoded positions
- **Enhanced Visualization**: Added animated heat rings for high-performance tables, improved tooltips with detailed metrics, and room backgrounds
- **Bug Fix**: Fixed guest booking error by adding comprehensive null checks to isTimeSlotValid function preventing undefined property access
- **User Experience**: Tables now display exactly where positioned in table-plan with correct visual representation and interactive effects
- **Bug Fix**: Fixed guest booking error by adding comprehensive null checks to isTimeSlotValid function preventing undefined property access
- **User Experience**: Tables now display exactly where positioned in table-plan with correct visual representation and interactive effects
- **2025-06-26**: Completed comprehensive role-based access control system with page-level permissions and role-based redirects
- **Permission System**: Implemented AutoPermissionGuard wrapping all authenticated routes for automatic access control
- **Role Permissions Interface**: Created dedicated role permissions management page accessible via Users → Role Permissions button
- **Access Control Fix**: Added ACCESS_USERS permission to manager role enabling access to user management and role configuration pages
- **Page-Level Security**: Permission guard validates access to each page based on user role and redirects unauthorized users to appropriate pages
- **2025-06-26**: Completed comprehensive role-based access control system with endpoint-level security
- **Security Implementation**: Applied permission middleware to all critical endpoints to enforce role-based access control
- **Agent Restrictions**: Agents now blocked from user management, billing, subscription management, and administrative functions
- **Permission Matrix**: Full enforcement of granular permissions across user operations, financial management, and tenant administration
- **Endpoint Security**: Systematically secured billing, subscription, user invitation, role management, and administrative endpoints
- **2025-06-26**: Completed comprehensive user management system with full CRUD operations and role-based permissions
- **User Management System**: Built complete team member management with invite system, role assignment, and permission matrix
- **Database Structure**: Created proper restaurant management data model with users, roles, and permissions tables
- **API Integration**: Implemented all CRUD endpoints for user operations with proper authentication and validation
- **Role-Based Access**: Predefined roles (Owner, Manager, Agent, Kitchen Staff) with granular permission control system
- **Authentication System**: JWT-based authentication working properly for restaurant management operations
- **Database Migration Fix**: Fixed timeout issues with schema push by manually creating missing tables and foreign key constraints
- **Restaurant System**: Fully operational multi-tenant restaurant management with role-based permissions and subscription limits
- **Schema Alignment**: Updated table references to use correct naming conventions and resolved all foreign key relationships
- **2025-06-25**: Enhanced pause functionality with automatic unpause and smart scheduling system
- **Automatic Unpause**: Implemented scheduled task that checks every 5 minutes for expired pause periods and automatically reactivates accounts
- **Smart Scheduling**: Added automatic schedule creation when pausing tenants, with console logging and admin visibility
- **Enhanced User Experience**: Paused users now see exact pause end dates and automatic reactivation messages
- **Schedule Tracking**: New API endpoint `/api/admin/schedules/unpause` to view upcoming automatic unpause events
- **Database Schema**: Added pause_start_date, pause_end_date, pause_reason, and suspend_reason fields to tenants table
- **Authentication Guards**: Updated all authentication endpoints to handle pause expiration and provide clear user messaging
- **Admin Panel**: Enhanced pause functionality requires end date and reason, with improved validation and logging
- **Console Monitoring**: Server startup shows pending schedules and tracks completion with detailed logging
- **Real-time Countdown**: Admin panel displays live countdown timers showing exactly when each paused tenant will be automatically reactivated
- **Immediate Startup Check**: System runs automatic unpause check on server startup plus every 2 minutes for responsive reactivation
- **Session Management**: Added automatic session cleanup and reactivation for expired pause periods during validation
- **2025-06-25**: Enhanced admin tenant management system with comprehensive CRUD operations
- **Tenant Management**: Added ability to view detailed tenant information, edit tenant data, and manage subscription status
- **Suspend/Pause Features**: Implemented tenant suspension and pause functionality with reason tracking and automatic logging
- **Admin UI Enhancement**: Created detailed tenant view with tabbed interface showing overview, subscription details, restaurants, and users
- **API Enhancements**: Added PUT /api/admin/tenants/:id for editing, POST suspend/unsuspend/pause endpoints with proper audit logging
- **Data Integrity**: Improved tenant data retrieval with comprehensive statistics and related entity information
- **2025-06-25**: Comprehensive admin panel system implemented under /admin
- **Admin System**: Complete separation from tenant system with dedicated authentication
- **Admin Features**: Dashboard with system stats, tenant management, subscription plans, admin users, system logs, and settings
- **Database Schema**: Added admin_users, admin_sessions, system_settings, and system_logs tables
- **Default Admin**: Created super admin account (admin@replit.com) with full system access
- **Security**: Robust authentication middleware and role-based access control
- **Admin UI**: Modern interface with dark theme, responsive design, and comprehensive management tools
- **System Monitoring**: Real-time logs, performance metrics, and health indicators
- **2025-06-25**: Migration from Replit Agent to Replit environment completed successfully
- **Database Integration**: PostgreSQL connection established with proper data persistence
- **Widget Integration**: Implemented embeddable booking widget system with OpenTable-style design
- **Modern Design System**: Added comprehensive theming with customizable colors, shadows, animations, and responsive design
- **Security Enhancement**: Improved error handling and implemented graceful fallback patterns
- **Print orders fixes**: Added missing DELETE endpoint for print orders API, fixed JSON error
- **UI improvements**: Updated Details button to icon-only display, removed Invoice button, and enhanced entire print orders page with premium animations and modern glassmorphism design
- **Sample data**: Added 22+ realistic bookings with past and future dates for testing
- **Product management**: Fixed product category dropdown, creation/update API data mapping, and display issues
- **Security**: Implemented client/server separation and robust security practices

## User Preferences
- Language: English/French (auto-detected)
- Communication: Professional, concise responses without emojis
- Technical approach: Comprehensive solutions with proper error handling

## Development Setup
- Port: 5000 (Express server)
- Development command: `npm run dev`
- Production build: `npm run build`
- Database migrations: `npm run db:push`

## Environment Status
- ✓ Node.js 20 installed
- ✓ All dependencies installed
- ✓ Database connected and configured
- ✓ Email service initialized
- ✓ Google Calendar service active
- ✓ Workflow running successfully