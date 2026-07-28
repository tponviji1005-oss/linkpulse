# LinkPulse Database

## Schema Overview

LinkPulse uses PostgreSQL as its primary data store, accessed through Prisma ORM with the PrismaPg adapter (`@prisma/adapter-pg`). The schema defines three models: `User`, `Link`, and `Click`.

All tables use UUID primary keys and follow a snake_case naming convention in the database (`users`, `links`, `clicks`), while the Prisma schema uses camelCase.

---

## Models

### User

Mapped to the `users` table.

| Field | Type | Database Type | Constraints | Description |
|---|---|---|---|---|
| id | String (UUID) | `uuid` | Primary key, auto-generated | Unique user identifier |
| name | String | `varchar(100)` | Not null | Display name |
| email | String | `varchar(255)` | Not null, unique | Login email (stored lowercase) |
| password | String | `varchar(255)` | Not null | bcrypt hash (cost factor 10) |
| createdAt | DateTime | `timestamp` | Not null, default `now()` | Account creation time |
| updatedAt | DateTime | `timestamp` | Not null, auto-updated | Last modification time |

**Relations:**
- `links` — One-to-many relationship with `Link`

---

### Link

Mapped to the `links` table.

| Field | Type | Database Type | Constraints | Description |
|---|---|---|---|---|
| id | String (UUID) | `uuid` | Primary key, auto-generated | Unique link identifier |
| shortCode | String | `varchar(10)` | Not null, unique | 8-character nanoid, URL-safe |
| originalUrl | String | `text` | Not null | Destination URL |
| title | String? | `varchar(255)` | Nullable | Optional display title |
| userId | String (UUID) | `uuid` | Not null | Foreign key to `users.id`, cascade delete |
| isActive | Boolean | `boolean` | Not null, default `true` | Whether the link redirects |
| expiresAt | DateTime? | `timestamp` | Nullable | Optional expiration time |
| passwordHash | String? | `varchar(255)` | Nullable | bcrypt hash of link password (cost factor 10) |
| createdAt | DateTime | `timestamp` | Not null, default `now()` | Creation time |
| updatedAt | DateTime | `timestamp` | Not null, auto-updated | Last modification time |

**Relations:**
- `user` — Many-to-one relationship with `User` (cascade delete)
- `clicks` — One-to-many relationship with `Click` (cascade delete)

---

### Click

Mapped to the `clicks` table.

| Field | Type | Database Type | Constraints | Description |
|---|---|---|---|---|
| id | String (UUID) | `uuid` | Primary key, auto-generated | Unique click identifier |
| linkId | String (UUID) | `uuid` | Not null | Foreign key to `links.id`, cascade delete |
| ipAddress | String? | `varchar(45)` | Nullable | Client IP (supports IPv6 length) |
| userAgent | String? | `text` | Nullable | Raw User-Agent header |
| referer | String? | `text` | Nullable | HTTP Referer header |
| country | String? | `varchar(2)` | Nullable | ISO 3166-1 alpha-2 country code |
| city | String? | `varchar(100)` | Nullable | City name |
| device | String? | `varchar(20)` | Nullable | Device type (desktop, mobile, tablet, or other) |
| browser | String? | `varchar(50)` | Nullable | Browser name (Chrome, Firefox, Safari, etc.) |
| os | String? | `varchar(50)` | Nullable | Operating system (Windows, macOS, Linux, etc.) |
| isBot | Boolean | `boolean` | Not null, default `false` | Whether the click came from a known bot |
| createdAt | DateTime | `timestamp` | Not null, default `now()` | Click timestamp |

**Relations:**
- `link` — Many-to-one relationship with `Link` (cascade delete)

**Bot detection patterns:** Googlebot, Bingbot, Facebook External Hit, Twitterbot (matched via regex against User-Agent).

---

## Relations

```
User (1) ──── (many) Link (1) ──── (many) Click
  │                        │                   │
  │ userId (FK)            │ linkId (FK)       │
  │ onDelete: Cascade      │ onDelete: Cascade │
```

- **User → Link**: One user owns many links. Deleting a user cascades to delete all their links.
- **Link → Click**: One link has many clicks. Deleting a link cascades to delete all its clicks.
- Both foreign keys use `onDelete: Cascade`, so removing a parent record automatically removes all children.

---

## Indexes

### Link Table

| Index | Columns | Type | Purpose |
|---|---|---|---|
| `links_pkey` | `id` | Primary key | Unique row identification |
| `links_short_code_key` | `short_code` | Unique | Fast lookup during redirects (`/:shortCode`) |
| `links_user_id_idx` | `user_id` | Non-unique | Fast lookup of a user's links |
| `links_created_at_idx` | `created_at` | Non-unique | Sorting by creation date |

### Click Table

| Index | Columns | Type | Purpose |
|---|---|---|---|
| `clicks_pkey` | `id` | Primary key | Unique row identification |
| `clicks_link_id_idx` | `link_id` | Non-unique | Fast lookup of clicks for a link |
| `clicks_link_id_created_at_idx` | `link_id`, `created_at` | Composite | Analytics queries filtered by link and date range |

---

## Migration Commands

### Development (create new migration)

```bash
cd backend

# After modifying prisma/schema.prisma:
npx prisma migrate dev --name <migration_name>

# Example:
npx prisma migrate dev --name add_link_tags
```

This creates a new migration folder under `prisma/migrations/`, applies it to your development database, and regenerates the Prisma Client.

### Production (apply pending migrations)

```bash
cd backend

# Apply all pending migrations to the production database:
npx prisma migrate deploy
```

This only applies migrations that have not yet been run. It does not generate new migrations.

### Other Useful Commands

```bash
# View the current database schema
npx prisma db pull

# Open Prisma Studio (visual database browser)
npx prisma studio

# Regenerate Prisma Client (after schema changes or dependency updates)
npx prisma generate

# Reset the development database (drops all data)
npx prisma migrate reset
```

### Migration History

The project has the following migration sequence:

```
prisma/migrations/
├── 20260719082946_init/
│   └── migration.sql          # Creates users, links, clicks tables
├── 20260725000000_add_is_bot_to_clicks/
│   └── migration.sql          # Adds is_bot boolean column to clicks
├── 20260726074016_add_link_protection_fields/
│   └── migration.sql          # Adds expires_at and password_hash columns to links
└── migration_lock.toml        # Locks provider to "postgresql"
```

---

## PrismaPg Adapter Setup

LinkPulse uses the `@prisma/adapter-pg` adapter instead of Prisma's built-in connection management. This gives direct control over the PostgreSQL connection via the `pg` driver.

### Configuration

```js
// backend/src/config/prisma.js
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

module.exports = prisma;
```

### Why PrismaPg?

- Uses the `pg` (node-postgres) driver directly, giving more control over connection options
- Allows custom pool configuration and connection handling
- Useful when integrating with connection poolers like PgBouncer
- The `pg` driver is a well-established, battle-tested PostgreSQL client for Node.js

### Dependencies

```
@prisma/adapter-pg@^7.8.0
@prisma/client@^7.8.0
prisma@^7.8.0
pg@^8.22.0
```

All Prisma packages must be the same major version. The `pg` driver version should be compatible with `@prisma/adapter-pg`.

### Schema Configuration

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
}
```

The database URL is supplied at runtime via `DATABASE_URL` environment variable (referenced in `prisma.config.ts`).

---

## Table Creation SQL (for reference)

These are the SQL statements that the initial migration applies:

```sql
-- Users table
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- Links table
CREATE TABLE "links" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "short_code" VARCHAR(10) NOT NULL,
    "original_url" TEXT NOT NULL,
    "title" VARCHAR(255),
    "user_id" UUID NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "expires_at" TIMESTAMP(3),
    "password_hash" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "links_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "links_short_code_key" ON "links"("short_code");
CREATE INDEX "links_user_id_idx" ON "links"("user_id");
CREATE INDEX "links_created_at_idx" ON "links"("created_at");
ALTER TABLE "links" ADD CONSTRAINT "links_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Clicks table
CREATE TABLE "clicks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "link_id" UUID NOT NULL,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "referer" TEXT,
    "country" VARCHAR(2),
    "city" VARCHAR(100),
    "device" VARCHAR(20),
    "browser" VARCHAR(50),
    "os" VARCHAR(50),
    "is_bot" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "clicks_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "clicks_link_id_idx" ON "clicks"("link_id");
CREATE INDEX "clicks_link_id_created_at_idx" ON "clicks"("link_id", "created_at");
ALTER TABLE "clicks" ADD CONSTRAINT "clicks_link_id_fkey"
    FOREIGN KEY ("link_id") REFERENCES "links"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```
