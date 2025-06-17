# ReadyTable - Restaurant Booking & Management Platform

## Overview

ReadyTable is a comprehensive restaurant booking and management platform built with React frontend and Express.js backend. It provides multi-tenant SaaS functionality for restaurants to manage reservations, tables, customers, and operations with integrated payment processing, email notifications, and third-party integrations.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui component library
- **State Management**: TanStack React Query for server state, React Context for auth/tenant state
- **Routing**: Wouter for client-side routing
- **Build Tool**: Vite for fast development and optimized builds

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Authentication**: Session-based auth with SSO support (Google, Apple)
- **Session Management**: Express-session with configurable cookie settings
- **Email Service**: Brevo API integration for transactional emails
- **Payment Processing**: Stripe integration for subscription billing

### Multi-Tenant Design
- Tenant-based data isolation using tenant_id in all database tables
- Dynamic tenant resolution from URL parameters, headers, or request body
- Tenant-specific subscription plans and billing management
- User-tenant associations with role-based access control

## Key Components

### Database Layer
- **ORM**: Drizzle with PostgreSQL driver (Neon serverless)
- **Schema**: Comprehensive schema covering bookings, tables, customers, tenants, subscriptions
- **Storage Interface**: Abstracted storage layer (IStorage) with database and memory implementations
- **Migrations**: Automated database migrations with proper versioning

### Authentication & Authorization
- Multi-provider SSO (Google OAuth, Apple Sign-In)
- Session-based authentication with remember-me functionality
- Tenant-user role management (owner, admin, staff)
- Route guards for protected pages

### Booking Management
- Real-time booking creation, updates, and cancellations
- Table assignment with capacity validation
- Conflict detection and resolution suggestions
- Booking change requests with approval workflow
- Management hash generation for secure booking links

### Notification System
- Email notifications via Brevo service
- SMS capabilities (configured but optional)
- Real-time notifications for booking events
- Template-based email content with calendar attachments

### Integration Services
- **Webhook Service**: Configurable webhooks for booking events
- **Meta Integration**: Facebook/Instagram business integration
- **Google Services**: Calendar sync and Business Profile integration
- **Payment Gateway**: Stripe for subscription management
- **QR Code Generation**: Table-specific QR codes for feedback collection

### Background Services
- **Reminder Service**: Automated booking reminders
- **Auto-Assignment Service**: Intelligent table assignment for unassigned bookings
- **Cancellation Reminder Service**: Subscription expiry notifications
- **Subscription Service**: Trial management and billing status tracking

## Data Flow

### Booking Flow
1. Guest creates booking via public booking form or restaurant staff creates internal booking
2. System validates availability and capacity constraints
3. Booking stored with tenant isolation and management hash generation
4. Email confirmation sent with calendar attachment and management links
5. Optional webhook notifications to external systems
6. Background services handle table assignment and reminders

### Subscription Flow
1. User registers company account with selected plan
2. Free trial initialized with expiry tracking
3. Stripe customer and subscription created for paid plans
4. Subscription status monitored for access control
5. Automatic billing and renewal handling
6. Cancellation reminders for expired subscriptions

### Integration Flow
1. Restaurant configures integration settings in admin panel
2. OAuth flows handle third-party authentication
3. Background services sync data with external platforms
4. Webhook endpoints receive and process external events
5. Error handling and retry logic for failed integrations

## External Dependencies

### Core Services
- **Database**: PostgreSQL (Neon serverless or Supabase)
- **Email**: Brevo API for transactional emails
- **Payments**: Stripe for subscription billing
- **File Storage**: Local file system for generated assets

### Optional Integrations
- **SSO Providers**: Google OAuth, Apple Sign-In
- **Social Media**: Facebook/Instagram Business API
- **Marketing**: Mailchimp, Klaviyo, ActiveCampaign
- **Reviews**: TripAdvisor, Michelin Guide integration
- **Calendar**: Google Calendar API

## Deployment Strategy

### Development Environment
- Replit-based development with hot module replacement
- Vite dev server for frontend with Express proxy
- PostgreSQL module for local development database
- Environment variable configuration for all services

### Production Deployment
- Automated build process with Vite for frontend assets
- esbuild bundling for Node.js backend
- Autoscaling deployment target on Replit
- Session persistence and database connection pooling

### Environment Configuration
- Database URL (PostgreSQL or Supabase)
- Service API keys (Brevo, Stripe, OAuth providers)
- Session secret for secure cookie signing
- Optional feature flags for service integrations

## User Preferences

```
Preferred communication style: Simple, everyday language.
```

## Changelog

```
Changelog:
- June 16, 2025. Initial setup
- June 16, 2025. Fixed table data persistence issue - resolved field mapping between database (snake_case) and frontend (camelCase) by updating Drizzle ORM queries to use explicit field selection. Tables now save and display data correctly.
- June 16, 2025. Fixed table switch cross-switching issue - created isolated TableSwitch component to prevent React reconciliation problems where clicking one switch would toggle a different table's status.
- June 16, 2025. Fixed combined tables JSON parsing error - updated database storage functions to properly serialize tableIds arrays to JSON format before storing, preventing "Expected ':' after property name" errors in the frontend.
- June 16, 2025. Fixed table layout saving 500 error - implemented missing saveTableLayout method in database storage with proper upsert functionality for creating and updating table positions.
- June 16, 2025. Fixed table layout data retrieval issue - implemented missing getTableLayout method to properly fetch saved table positions from database, enabling proper persistence of drag-and-drop table arrangements.
- June 16, 2025. Fixed seating configurations data persistence - implemented complete backend API with database table, CRUD operations, and frontend integration using React Query for real-time save/load functionality.
- June 16, 2025. Implemented complete feedback management system - created feedback questions management with CRUD operations, guest feedback responses viewing system with star ratings and NPS scores, proper routing separation between feedback viewing and question management, and comprehensive database integration with sample data for testing.
- June 16, 2025. Completed full QR code feedback workflow - implemented guest feedback form page accessible via QR codes, integrated with existing feedback questions system, created complete feedback submission flow from table QR codes to management dashboard, and ensured proper data persistence and tenant isolation. Updated system to require authentication for feedback submissions to ensure verified user accounts and better data integrity.
- June 16, 2025. Fixed guest feedback system runtime errors - resolved duplicate route conflicts, added public API endpoints for unauthenticated guest access to restaurant data and feedback questions, implemented proper error handling and loading states, corrected method name mismatches in storage interface, and verified complete QR code to feedback submission workflow is functional with proper JSON responses.
- June 16, 2025. Completed QR code to guest feedback workflow - configured authentication bypass in RouteGuard for public feedback access, verified QR code generation and scanning functionality, confirmed guests can access feedback forms directly without login requirements, and validated complete end-to-end workflow from table QR codes to feedback submission with proper data persistence.
- June 16, 2025. Configured standalone guest feedback interface - updated LayoutWrapper to exclude sidebar and dashboard elements from guest feedback pages, ensuring clean public-facing interface when guests scan table QR codes, with feedback submissions functioning independently from main application navigation.
- June 16, 2025. Implemented dynamic feedback questions in guest form - updated guest feedback form to load and display actual feedback questions from database instead of static fields, supporting multiple question types (rating, text) with NPS and comment options, proper question response tracking, and integration with existing feedback management system.
- June 16, 2025. Migration to Replit completed - successfully migrated from Replit Agent to standard Replit environment with proper security practices and client/server separation. Redesigned homepage to showcase all 30+ implemented features across 6 major categories (Booking Management, Restaurant Operations, Customer Experience, Analytics & Insights, Kitchen Operations, and Integrations). Fixed homepage authentication redirect issue by configuring public routes properly in RouteGuard component.
- June 16, 2025. Implemented comprehensive multi-language support - fixed language switcher functionality in footer, added language context system with localStorage persistence, implemented header/navigation language switcher with dropdown menu and mobile support, added full translation support for 10 languages (English, German, Spanish, French, Italian, Norwegian, Danish, Swedish, Czech, Dutch). All homepage content now properly translates when users switch languages.
- June 17, 2025. Enhanced feedback system with individual question ratings - implemented detailed question response tracking system with separate storage for each question's rating, NPS score, and text responses. Updated guest feedback form to properly handle different question types (star rating 1-5, rating scale 0-10, NPS 0-10, text input). Enhanced feedback details modal to display individual question responses with proper question names, types, and ratings. Fixed feedback submission aggregation logic to properly consolidate individual responses into main feedback record with correct rating and NPS values displayed in management interface.
```