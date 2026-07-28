# Changelog

All notable changes to LinkPulse are documented here.

Format based on [Keep a Changelog](https://keepachangelog.com/).

## [1.1.0] - 2026-07-27

### Phase 2 — Production Ready

### Added

- Advanced analytics with Recharts visualizations (browser, OS, device, referrer breakdowns)
- Bulk management page for performing actions on multiple links at once
- Search, filter, and sort functionality with pagination across all link lists
- CSV import and export for bulk link operations
- Bulk create, delete, activate, and deactivate operations
- Docker support with multi-stage builds
- CI/CD pipeline configuration
- CONTRIBUTING.md guide
- SECURITY.md policy
- CODE_OF_CONDUCT.md
- SUPPORTED_VERSIONS.md

### Changed

- Improved dashboard layout with responsive grid
- Optimized query performance for analytics endpoints
- Enhanced error handling across API routes

## [1.0.0] - 2026-07-27

### Initial Release

### Features

- JWT-based user authentication (register, login, profile management)
- URL shortening with nanoid-generated short codes
- QR code generation for every shortened link
- Password-protected links with bcrypt-hashed passwords
- Link expiration with configurable time-to-live
- Dashboard with real-time click statistics
- Analytics tracking: browser, OS, device type, and referrer
- Search, filter, and sort with pagination
- Bulk operations: CSV import/export, bulk create, delete, activate, deactivate
- Responsive UI built with React 19 and Vite

### Tech Stack

- **Backend:** Express.js with REST API
- **Database:** PostgreSQL with Prisma ORM
- **Caching:** Redis for frequently accessed links
- **Frontend:** React 19 with Vite, Recharts for charts
- **Build:** Vite for frontend bundling

### Security

- Helmet.js for HTTP security headers
- CORS configuration for allowed origins
- Rate limiting on authentication and link creation endpoints
- bcrypt with cost factor 10 for password hashing
- Input validation using validator.js
- SQL injection prevention through Prisma ORM parameterized queries
- File upload size limits enforced at middleware level
- Bot detection on analytics endpoints
