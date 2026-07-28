# Supported Versions

This document describes which versions of LinkPulse are currently supported and what to expect from each.

## Version Status

| Version | Status              | Released   |
| ------- | ------------------- | ---------- |
| 1.1.x   | Active development  | 2026-07-27 |
| 1.0.x   | Security fixes only | 2026-07-27 |
| < 1.0   | End of life         | —          |

## What This Means

**Active development (v1.1.x)**

This is the current major version. It receives new features, bug fixes, and security patches. Always use the latest patch release within this version.

**Security fixes only (v1.0.x)**

This version no longer receives new features or non-critical bug fixes. It will continue to receive security patches for critical vulnerabilities until it reaches end of life. Users are encouraged to upgrade to v1.1.x.

**End of life (below v1.0)**

These versions no longer receive any updates, including security fixes. If you are running an older version, upgrade as soon as possible.

## End of Life Policy

A version reaches end of life when it has been superseded by a newer minor or major release for more than 6 months. After that date:

- No security patches will be provided
- No bug fixes will be issued
- Issues reported against end-of-life versions will be closed

## Runtime Requirements

### Node.js

| Node.js Version | Supported |
| --------------- | --------- |
| 20.x            | Yes       |
| 18.x            | Yes       |
| 16.x and below  | No        |

LinkPulse is tested against Node.js 18.x and 20.x in CI. Use the latest LTS release within a supported major version for best results.

### Browsers

LinkPulse supports the last 2 major versions of the following browsers:

| Browser        | Supported |
| -------------- | --------- |
| Google Chrome  | Yes       |
| Mozilla Firefox| Yes       |
| Apple Safari   | Yes       |
| Microsoft Edge | Yes       |

Older browsers may function but are not tested or guaranteed to work. The frontend uses modern JavaScript features that require ES2020+ support.

## Upgrade Guide

When upgrading between minor versions (e.g., 1.0.x to 1.1.x):

1. Check the CHANGELOG.md for any breaking changes
2. Update your dependencies:
   ```bash
   npm update
   cd frontend && npm update
   ```
3. Run database migrations:
   ```bash
   npx prisma migrate deploy
   ```
4. Review environment variable changes in `.env.example` and update your `.env` accordingly
5. Test your application before deploying to production
