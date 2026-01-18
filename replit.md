# FortiFile

A secure file management web application with multi-level security, end-to-end encryption, and data loss prevention (DLP) scanning.

## User Preferences

Preferred communication style: Simple, everyday language.

## Overview

FortiFile is a full-stack file management application that provides secure file storage with three security levels (Standard, High, Maximum), client-side encryption for maximum security files, DLP scanning before uploads, and integrated secure chat functionality. The application uses a React frontend with an Express backend, storing data in PostgreSQL and files in Google Cloud Storage.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack React Query for server state
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom theme configuration
- **Forms**: React Hook Form with Zod validation
- **File Uploads**: Uppy with AWS S3-compatible presigned URL uploads
- **Animations**: Framer Motion for page transitions

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript compiled with tsx
- **Authentication**: Passport.js with local strategy, express-session for session management
- **Password Hashing**: scrypt with random salt
- **Email**: Nodemailer with Gmail SMTP for sending decryption codes
- **Build Tool**: Vite for frontend, esbuild for backend bundling

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Location**: `shared/schema.ts` - contains users, files, chatRooms, chatMessages, dlpLogs tables
- **Session Store**: connect-pg-simple for PostgreSQL-backed sessions
- **File Storage**: Google Cloud Storage via Replit's object storage integration with presigned URLs

### Security Features
- **DLP Scanning**: Client-side regex pattern matching for sensitive data (emails, phone numbers, credit cards, SSNs) before upload
- **Three Security Levels**: Standard (basic), High (enhanced), Maximum (end-to-end encrypted)
- **Maximum Security Flow**: AES-GCM encryption using Web Crypto API, 6-digit decryption code sent via email
- **Admin DLP Logs**: Tracks sensitive upload attempts with last 100 entries

### API Structure
- **Contract Location**: `shared/routes.ts` - Zod-validated API contract definitions
- **Auth Routes**: `/api/auth/login`, `/api/auth/register`, `/api/auth/logout`, `/api/auth/me`
- **File Routes**: `/api/files` (CRUD operations), `/api/files/stats` (storage statistics)
- **Chat Routes**: `/api/chat/rooms`, `/api/chat/messages/:roomId`
- **DLP Routes**: `/api/dlp/logs` (admin only), `/api/dlp/log`
- **Security Routes**: `/api/send-decryption-code`, `/api/verify-decryption-code`

### Project Structure
```
client/           # React frontend
  src/
    components/   # UI components and layout
    hooks/        # Custom React hooks (auth, files, chat, security)
    lib/          # Utilities (encryption, DLP patterns, query client)
    pages/        # Page components
server/           # Express backend
  routes.ts       # API route handlers
  storage.ts      # Database storage layer
  db.ts           # Database connection
  replit_integrations/  # Object storage integration
shared/           # Shared code between frontend/backend
  schema.ts       # Drizzle database schema
  routes.ts       # API contract definitions
```

## External Dependencies

### Database
- PostgreSQL database (configured via `DATABASE_URL` environment variable)
- Drizzle ORM for type-safe database queries
- Drizzle Kit for schema migrations (`db:push` command)

### File Storage
- Google Cloud Storage via Replit's sidecar service
- Presigned URL upload flow for direct browser-to-storage uploads
- Object ACL policies for access control

### Email Service
- Gmail SMTP via Nodemailer
- Required environment variables: `GMAIL_USER`, `GMAIL_PASS`
- Used for sending 6-digit decryption codes for maximum security files

### Authentication
- express-session with PostgreSQL session store
- Passport.js local strategy for username/password authentication

### Development Tools
- Vite dev server with HMR
- Replit-specific plugins for development (cartographer, dev-banner, error overlay)