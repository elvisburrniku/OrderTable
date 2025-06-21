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
- **2025-06-21**: Successfully migrated from Replit Agent to standard Replit environment
- **Migration completed**: All dependencies installed, workflows configured, database connected
- **Special periods**: Fixed all missing React imports and tested complete functionality
- **Component fixes**: Added missing imports for Collapsible, Select, Dialog, Search icons
- **API testing**: Confirmed all CRUD operations working (GET/POST/PUT/DELETE)
- **Security**: Implemented client/server separation and robust security practices
- **Status**: Redesigned special periods page with modern booking-style layout, animations, and enhanced UX

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