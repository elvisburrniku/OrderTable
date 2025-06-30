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
- **2025-06-30**: Completed Progressive Web App (PWA) implementation with testing interface enabling mobile app installation
- **PWA Features**: Web app manifest with proper icons, service worker for offline functionality, install prompts, and update notifications
- **Mobile Optimization**: Apple touch icons, Microsoft tile configuration, and comprehensive PWA meta tags for all platforms
- **App Installation**: Users can install ReadyTable on mobile devices with install button prompts and app shortcuts for Dashboard, Bookings, and Kitchen
- **Offline Support**: Service worker caches critical resources and API responses for offline functionality with network-first strategy
- **PWA Testing**: Added comprehensive testing interface with status checks, forced install prompts, and service worker verification for debugging
- **2025-06-30**: Implemented database-based role redirects system - user redirects after login now use role redirect settings stored in database instead of static configurations
- **2025-06-30**: Fixed role determination logic in authentication system to properly query tenant_users table with both tenantId and userId filters
- **2025-06-30**: Implemented unified booking modal component ensuring consistent booking interface across dashboard and bookings pages
- **2025-06-30**: Fixed database syntax error in custom fields query to resolve SQL errors during booking form loading
- **2025-06-30**: Fixed React hooks error and removed duplicate notification components from dashboard to eliminate double display
- **2025-06-30**: Added authentication checks to notification indicator - only shows for authenticated users, preventing display on login/register pages
- **2025-06-30**: Implemented functional notification dropdown with real-time notifications and user menu with Profile, Settings, Billing, Help, and Logout options
- **2025-06-30**: Added notification indicator with bell icon and green dot to appear on every page across all layouts
- **2025-06-30**: Implemented role-based sidebar filtering to show only menu items users have permission to access
- **2025-06-30**: Added permission requirements to all sidebar menu items and restaurant settings dropdown
- **2025-06-30**: Fixed role permissions system with complete drag-and-drop functionality, remove buttons, and proper backend validation
- **2025-06-30**: Enhanced role permissions backend with improved request validation and owner role protection
- **2025-06-30**: Added remove functionality to assigned permissions with visual indicators and proper state management
- **2025-06-30**: Fixed React hooks violation in real-time table status component causing "more hooks than during previous render" error
- **2025-06-30**: Resolved database constraint issues by making restaurant_id nullable in activity_log table for proper activity logging
- **2025-06-30**: Successfully migrated to fresh PostgreSQL database instance with all essential tables properly initialized
- **2025-06-27**: Fixed subscription access restrictions for cancelled subscriptions - users can now access all essential features
- **Subscription System**: Modified permission middleware to allow core restaurant management functionality even with cancelled subscriptions
- **Access Control**: Users with cancelled subscriptions can access dashboard, bookings, customers, menu, tables, kitchen, settings, floor plan, user management, and billing features
- **Permission Fix**: Added comprehensive permission list for cancelled subscriptions including MANAGE_BILLING, ACCESS_USERS, VIEW_USERS, MANAGE_USERS
- **Calendar Component**: Fixed JavaScript errors with safety checks for undefined properties in enhanced-google-calendar component
- **Database Schema**: Resolved missing column issues by adding event_type, payment fields, and other required booking columns
- **2025-06-27**: Completed Interactive Restaurant Floor Plan Designer with drag-and-drop functionality
- **Floor Plan Designer**: Implemented comprehensive floor plan system with visual drag-and-drop interface for tables, chairs, walls, doors, windows, and decorations
- **Database Schema**: Added floor_plans and floor_plan_templates tables with complete element positioning and styling support
- **Backend Infrastructure**: Created full API endpoints in server/routes.ts and storage methods in db-storage.ts for floor plan CRUD operations
- **Frontend Implementation**: Built dedicated floor plan page at /floor-plan with SVG-based rendering, element selection, property editing, and grid snapping
- **Element Management**: Support for multiple element types with customizable properties including table numbers, capacity, colors, and positioning
- **Save/Load System**: Floor plans can be saved to database and loaded for editing with proper validation and error handling
- **Visual Interface**: Modern UI with toolbar for element selection, property panels, grid controls, and real-time visual feedback
- **2025-06-27**: Completed comprehensive booking settings implementation with all 7 requested features fully integrated application-wide
- **Booking Feature Implementation**: Successfully implemented duration control (start/end time), empty seats functionality, turnaround time, contact method options, cancellation controls, cancellation notice periods, and group request functionality
- **Application-wide Integration**: All booking features work consistently across dynamic booking form, booking calendar, booking cancellation component, and API endpoints
- **Duration & Time Controls**: UseEndingTime setting toggles between start/end time or duration-based booking, with automatic end time calculation including turnaround time buffer
- **Table Management**: Empty seats setting filters available tables based on required capacity (guest count + empty seats), ensuring proper table allocation
- **Contact Method Validation**: Phone, email, or both options with proper form validation ensuring required contact information is collected
- **Cancellation System**: AllowCancellationAndChanges enables/disables cancellation functionality with notice periods from none to 1 week validation
- **Group Request Feature**: GroupRequest setting displays special notices for large party bookings and enables customized booking workflows
- **API Endpoints**: Added booking cancellation endpoint with proper validation, logging, and status management
- **Booking Context Provider**: Centralized all 7 booking features in BookingProvider context with validation helpers and settings integration
- **Settings Integration**: Implemented CurrencyProvider and BookingProvider contexts for centralized timezone, currency, and booking duration controls
- **Currency System**: All subscription plans, billing, and financial components now use consistent currency formatting based on user settings
- **Timezone Support**: Date formatting respects user timezone settings throughout billing, subscriptions, and booking components
- **Application-wide Consistency**: Settings control entire app behavior - timezone affects all time displays, currency affects all prices including subscriptions
- **2025-06-27**: Successfully migrated from Replit Agent to Replit environment with PostgreSQL database integration
- **Migration Completed**: Fixed React context provider ordering, resolved missing setLocation import, and established secure database connectivity
- **Database Setup**: Created PostgreSQL database with complete schema migration (56 tables) and initialized admin system with default credentials
- **Security Enhancements**: Implemented robust error handling in DateProvider context and maintained client/server separation patterns
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