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
- **2025-06-26**: Successfully resolved database migration issues and completed restaurant management system integration
- **Database Migration Fix**: Fixed timeout issues with schema push by manually creating missing tables and foreign key constraints
- **Restaurant System**: Fully operational multi-tenant restaurant management with role-based permissions and subscription limits
- **Schema Alignment**: Updated table references to use correct naming conventions and resolved all foreign key relationships
- **Authentication**: JWT-based authentication system working properly for restaurant owners and staff members
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