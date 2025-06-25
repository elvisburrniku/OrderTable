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
- **2025-06-25**: Completely redesigned widget integration system with modern, professional approach
- **Widget Redesign**: Implemented 4 widget types (floating button, inline card, banner, sidebar) with 5 themes
- **Modern Design System**: Added comprehensive theming with customizable colors, shadows, animations, and responsive design
- **Easy Implementation**: Simplified to single script tag installation with no dependencies
- **Error Resolution**: Fixed Stripe initialization errors and React infinite update loops
- **Database Integration**: Switched from memory storage to PostgreSQL with proper data persistence
- **Security Enhancement**: Improved error handling and implemented graceful fallback patterns

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