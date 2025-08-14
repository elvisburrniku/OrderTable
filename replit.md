# Restaurant Booking Dashboard

## Overview
A comprehensive restaurant booking management system with React frontend and Express backend, designed to streamline restaurant operations. This project aims to provide multi-tenant restaurant management capabilities, including interactive booking calendars, table layout management, special period configurations, and robust payment processing. It offers a complete solution for restaurants to manage bookings efficiently, enhance customer experience, and integrate with essential third-party services. The business vision is to become a leading platform in restaurant management, offering advanced features and high scalability.

## User Preferences
- Language: English/French (auto-detected)
- Communication: Professional, concise responses without emojis
- Technical approach: Comprehensive solutions with proper error handling

## System Architecture
The system is built with a clear separation of concerns, utilizing a modern tech stack for both frontend and backend.
- **Frontend**: Developed with React, Vite, TypeScript, and styled using Tailwind CSS for a modern, responsive user interface. UI/UX decisions emphasize a clean, professional appearance with consistent color schemes (slate/white, green accents), refined typography, and subtle animations (Framer Motion) for enhanced user experience. Key UI/UX improvements include professional redesigns of print orders, kitchen dashboard, menu management, user management tables, and a unified booking modal component. Elegant loading skeletons with shimmer animations and glassmorphism design are implemented for async content.
- **Backend**: Implemented using Express.js with TypeScript, ensuring a robust and scalable API.
- **Database**: PostgreSQL is used as the primary data store, with a Neon-backed setup for scalability and reliability. The system incorporates a multi-tenant architecture, allowing each restaurant to operate independently while being managed centrally.
- **Authentication**: Passport.js is utilized for secure authentication, supporting multiple SSO providers. A comprehensive role-based access control (RBAC) system is implemented, providing page-level and endpoint-level permissions (Owner, Manager, Agent, Kitchen Staff roles). This includes role-based sidebar filtering and dynamic redirects post-login. An admin panel under `/admin` offers dedicated authentication and comprehensive management tools for tenants, subscriptions, and system settings.
- **Key Technical Implementations**:
    - **Booking System**: Features include duration control, empty seats functionality, turnaround time, flexible contact methods, cancellation controls with notice periods, and group request handling. It integrates special periods (holidays, events) that can block dates or modify opening hours, and handles cut-off times for booking restrictions.
    - **Payment System**: Full Stripe Connect integration enables tenants to accept payments through their own Stripe accounts. This includes streamlined onboarding, payment intent creation, webhook handling, and comprehensive transaction tracking with platform fees. The system supports various payment types (deposit, prepayment, no_show_fee) and includes automated invoice generation and secure token-based payment links.
    - **Floor Plan Designer**: An interactive, visual drag-and-drop interface allows creation and management of restaurant floor plans, including tables, chairs, and other elements, with SVG-based rendering and real-time updates.
    - **PWA Configuration**: Route-specific Progressive Web App (PWA) configurations allow different PWA experiences for various sections (Dashboard, Bookings, Kitchen), with smart installation prompts and an offline-first strategy.
    - **Shop System**: A comprehensive e-commerce platform for selling services with admin management (CRUD for categories, products, orders) and a public storefront.
    - **Subscription Management**: Supports subscription-based restaurant creation with limits, tenant switching, and automatic Stripe subscription price updates with prorated billing.
    - **Automated Survey Scheduler**: Automatically schedules and sends post-visit surveys to customers via email and SMS after dining.
    - **Comprehensive Error Handling**: Includes user-friendly error messages, admin notifications for critical errors, and improved error display across the application.
    - **Webhook Logging & Monitoring**: Enhanced webhook processing with duplicate prevention, comprehensive logging, processing time tracking, and admin monitoring pages.
    - **Voice Agent Integration**: Complete AI voice agent system using Synthflow.ai for agent creation and Twilio for phone number management. Enables automated phone-based reservation handling with call logging, transcription, and direct booking creation from voice calls.

## External Dependencies
- **Database**: PostgreSQL (Neon-backed)
- **Authentication**: Passport.js
- **Email Service**: Brevo API
- **SMS Service**: Twilio API
- **Payment Gateway**: Stripe (Connect)
- **Calendar Integration**: Google Calendar API (for interactive booking calendar, potentially for syncing)