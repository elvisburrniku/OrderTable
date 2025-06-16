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
```