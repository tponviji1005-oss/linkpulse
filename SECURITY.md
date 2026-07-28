# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.1.x   | Active development |
| 1.0.x   | Security fixes only|
| < 1.0   | No longer supported|

## Reporting a Vulnerability

If you discover a security vulnerability in LinkPulse, please report it responsibly.

**Do not open a public GitHub issue for security vulnerabilities.**

Instead, use one of the following methods:

1. **GitHub Security Advisory:** Use the "Report a vulnerability" button on the Security tab of the repository.

2. **GitHub Issue:** If a security advisory is not available, open an issue with the `[SECURITY]` prefix in the title. Avoid including exploit details in the issue body — a maintainer will reach out to discuss the issue privately.

You should receive a response within 72 hours. Once the issue is confirmed, a fix will be prioritized and released as a patch version.

## Security Measures

LinkPulse implements the following security practices:

### Authentication

- JWT tokens with a 7-day expiration
- Passwords hashed with bcrypt using a cost factor of 10
- Authenticated routes protected with middleware verification

### API Protection

- Rate limiting applied to authentication endpoints and link creation
- Helmet.js for setting secure HTTP headers (X-Frame-Options, Content-Security-Policy, etc.)
- CORS configured to allow only specified origins
- Input validation and sanitization on all endpoints using validator.js

### Database

- All database queries executed through Prisma ORM, which uses parameterized queries by default
- No raw SQL usage in the application

### File Handling

- Upload size limits enforced at the middleware level
- File type validation on any upload endpoints

### Link Protection

- Optional password protection on individual shortened links
- Configurable link expiration with time-to-live settings
- Bot detection on analytics tracking endpoints to reduce noise and abuse

## Known Limitations and Hardening Recommendations

The following areas should be considered for hardening in future releases:

- **JWT secret rotation:** Currently uses a single static secret. Consider key rotation or asymmetric signing for production deployments.
- **HTTPS enforcement:** Should be handled at the reverse proxy or load balancer level (nginx, Cloudflare, etc.). LinkPulse does not terminate TLS itself.
- **CSRF protection:** Not currently implemented. If LinkPulse adds cookie-based sessions in the future, CSRF tokens should be included.
- **Content Security Policy:** Default Helmet CSP is applied but may need customization depending on deployment context.
- **Audit logging:** Currently not implemented. For compliance requirements, consider adding audit trails for authentication events and link modifications.
- **2FA/MFA:** Not supported in the current version. This is a potential feature for future releases.
- **Redis authentication:** Ensure your Redis instance requires authentication and is not exposed to untrusted networks.
- **Database access:** Restrict PostgreSQL access to application servers only. Use strong credentials and network-level restrictions.
