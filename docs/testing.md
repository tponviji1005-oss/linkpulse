# LinkPulse Testing Guide

## Local Setup

### Prerequisites

1. PostgreSQL running and accessible
2. Redis running (optional, but recommended for full functionality)
3. Node.js 18+

### Backend Setup

```bash
cd backend

# Install dependencies
npm ci

# Configure environment
cp .env.example .env
# Edit .env with your PostgreSQL and Redis connection details

# Generate Prisma Client
npx prisma generate

# Apply database migrations
npx prisma migrate deploy

# Start the development server
npm run dev
```

The server starts on `http://localhost:5000`.

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm ci

# Start the development server
npm run dev
```

The frontend starts on `http://localhost:5173` and calls the backend directly at `http://localhost:5000` (configured via `VITE_API_URL` in `frontend/.env` and `frontend/src/api/client.js`). There is no Vite dev proxy.

### Verify Everything Works

```bash
# Backend health check
curl http://localhost:5000/health
# Expected: {"status":"ok","uptime":...,"redis":"ready"}

# Frontend loads
curl -s http://localhost:5173 | head -5
# Expected: HTML with <div id="root">
```

---

## Manual Testing Checklist

Walk through each of these flows to verify the system works end-to-end.

### 1. User Registration

1. Navigate to `http://localhost:5173/register`
2. Enter name, email, and password (minimum 8 characters)
3. Submit the form
4. Verify: redirected to `/dashboard`, JWT stored in localStorage

### 2. User Login

1. Navigate to `http://localhost:5173/login`
2. Enter the email and password from registration
3. Submit the form
4. Verify: redirected to `/dashboard`

### 3. Create a Short Link

1. On the dashboard, find the link creation form
2. Enter a valid URL (e.g., `https://github.com`)
3. Optionally add a title
4. Click create
5. Verify: link appears in the links table with a generated short code

### 4. Create a Password-Protected Link

1. Create a link with a password set
2. Note the short code
3. Open an incognito window and visit `http://localhost:5000/{shortCode}`
4. Verify: redirected to the password gate page, not the original URL
5. Enter the correct password
6. Verify: redirected to the original URL

### 5. Create an Expiring Link

1. Create a link with `expiresAt` set to a past date
2. Verify: creation fails with "Expiration must be in the future"
3. Create a link with `expiresAt` set to a future date
4. Note the short code
5. Verify: visiting the short code redirects to the original URL

### 6. Redirect Tracking

1. Create a new link
2. Note the short code
3. Visit `http://localhost:5000/{shortCode}` 3-5 times
4. Go to the link's analytics page (`/analytics/{linkId}`)
5. Verify: total click count matches the number of visits
6. Verify: browser, OS, and device data are recorded

### 7. Link Search and Filtering

1. Create multiple links with different titles and URLs
2. Use the search box to filter by title or URL
3. Verify: only matching links are shown
4. Filter by status (active, inactive, protected, public, expired)
5. Verify: correct links appear for each filter
6. Change sort order (newest, oldest, most clicked, least clicked)
7. Verify: links are reordered correctly

### 8. Link Editing

1. Click edit on an existing link
2. Change the title
3. Save changes
4. Verify: title is updated in the table
5. Toggle the link's active state
6. Verify: the link shows as inactive

### 9. Link Deletion

1. Click delete on a link
2. Confirm the deletion in the dialog
3. Verify: link is removed from the table
4. Try visiting the deleted short code
5. Verify: returns 404

### 10. QR Code Generation

1. Click the QR code button on a link
2. Verify: a QR code modal appears with a PNG image
3. Scan the QR code with a phone
4. Verify: it resolves to the short URL

### 11. Dashboard Stats

1. Create several links with different states (active, inactive, password-protected)
2. Visit the dashboard
3. Verify: total links count matches
4. Verify: active/inactive counts are correct
5. Verify: recent links list shows the newest 5
6. Verify: top links chart shows links sorted by click count

### 12. Analytics Page

1. Navigate to `/analytics/{linkId}` for a link with clicks
2. Verify: total clicks and unique clicks are shown
3. Switch between periods (today, 7d, 30d, 90d, all)
4. Verify: daily trend chart updates
5. Verify: browser, OS, device, and referrer breakdowns are shown
6. Verify: hourly distribution chart is displayed
7. Verify: bot vs. human click counts are shown

### 13. Bulk Create (JSON)

1. Navigate to the bulk management page
2. Enter a JSON array of links:
   ```json
   [
     { "originalUrl": "https://example.com/1", "title": "Bulk 1" },
     { "originalUrl": "https://example.com/2", "title": "Bulk 2" },
     { "originalUrl": "https://example.com/3", "title": "Bulk 3" }
   ]
   ```
3. Submit the form
4. Verify: success message shows "3 created, 0 failed"
5. Verify: all 3 links appear in the links table

### 14. CSV Import

1. Create a CSV file:
   ```csv
   url,title,password
   https://csv1.example.com,CSV Link 1,
   https://csv2.example.com,CSV Link 2,secret
   ```
2. Navigate to bulk management
3. Upload the CSV file
4. Verify: success message shows the correct import count
5. Verify: imported links appear in the table

### 15. CSV Export

1. Click the export button on the bulk management page
2. Verify: a CSV file is downloaded
3. Open the file
4. Verify: it contains all your links with columns: shortCode, url, originalUrl, title, isActive, hasPassword, expiresAt, createdAt, clicks

### 16. Bulk Delete

1. Select multiple links in the table
2. Click bulk delete
3. Confirm the action
4. Verify: selected links are removed

### 17. Bulk Activate/Deactivate

1. Select multiple links
2. Click bulk deactivate
3. Verify: links show as inactive
4. Select the same links
5. Click bulk activate
6. Verify: links show as active again

### 18. Rate Limiting

1. Send 101 rapid requests to an API endpoint (e.g. `/api/auth/login`)
2. Verify: the 101st request returns `"Too many requests, please try again later"` with 429 status (API-wide limit is 100 requests/minute per IP)

---

## API Testing with curl

### Register a User

```bash
curl -s -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"password123"}'
```

Expected:
```json
{"token":"eyJ...","user":{"id":"...","name":"Test User","email":"test@example.com"}}
```

### Login

```bash
curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### Get Profile

```bash
TOKEN="eyJ..."  # Use the token from register/login

curl -s http://localhost:5000/api/auth/profile \
  -H "Authorization: Bearer $TOKEN"
```

### Create a Link

```bash
curl -s -X POST http://localhost:5000/api/links \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"originalUrl":"https://github.com","title":"GitHub"}'
```

### List Links

```bash
# Basic listing
curl -s http://localhost:5000/api/links \
  -H "Authorization: Bearer $TOKEN"

# With search and pagination
curl -s "http://localhost:5000/api/links?search=github&page=1&limit=5&sort=newest" \
  -H "Authorization: Bearer $TOKEN"

# Filter by status
curl -s "http://localhost:5000/api/links?status=active" \
  -H "Authorization: Bearer $TOKEN"
```

### Get a Single Link

```bash
LINK_ID="a1b2c3d4-..."  # Use the link ID from creation

curl -s http://localhost:5000/api/links/$LINK_ID \
  -H "Authorization: Bearer $TOKEN"
```

### Update a Link

```bash
curl -s -X PUT http://localhost:5000/api/links/$LINK_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"Updated GitHub Link","isActive":false}'
```

### Delete a Link

```bash
curl -s -X DELETE http://localhost:5000/api/links/$LINK_ID \
  -H "Authorization: Bearer $TOKEN"
```

### Get Link Analytics (Basic)

```bash
curl -s http://localhost:5000/api/links/$LINK_ID/analytics \
  -H "Authorization: Bearer $TOKEN"
```

### Get Advanced Analytics

```bash
# All time
curl -s "http://localhost:5000/api/analytics/$LINK_ID?period=all" \
  -H "Authorization: Bearer $TOKEN"

# Last 7 days
curl -s "http://localhost:5000/api/analytics/$LINK_ID?period=7d" \
  -H "Authorization: Bearer $TOKEN"

# Today
curl -s "http://localhost:5000/api/analytics/$LINK_ID?period=today" \
  -H "Authorization: Bearer $TOKEN"
```

### Generate QR Code

```bash
curl -s -o qrcode.png http://localhost:5000/api/links/$LINK_ID/qrcode \
  -H "Authorization: Bearer $TOKEN"
# Saves a PNG file to qrcode.png
```

### Verify Link Password

```bash
curl -s -X POST http://localhost:5000/api/links/$LINK_ID/verify-password \
  -H "Content-Type: application/json" \
  -d '{"password":"linkpass123"}'
```

Expected:
```json
{"success":true,"redirectUrl":"https://example.com"}
```

### Dashboard

```bash
# Summary
curl -s http://localhost:5000/api/dashboard \
  -H "Authorization: Bearer $TOKEN"

# Top links
curl -s http://localhost:5000/api/dashboard/top-links \
  -H "Authorization: Bearer $TOKEN"
```

### Bulk Create

```bash
curl -s -X POST http://localhost:5000/api/bulk \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "links": [
      {"originalUrl":"https://bulk1.example.com","title":"Bulk 1"},
      {"originalUrl":"https://bulk2.example.com","title":"Bulk 2"}
    ]
  }'
```

### CSV Upload

```bash
curl -s -X POST http://localhost:5000/api/bulk/csv \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@links.csv"
```

### CSV Export

```bash
curl -s -o export.csv http://localhost:5000/api/bulk/export \
  -H "Authorization: Bearer $TOKEN"
```

### Bulk Delete

```bash
curl -s -X DELETE http://localhost:5000/api/bulk \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"ids":["id1","id2"]}'
```

### Bulk Activate / Deactivate

```bash
# Activate
curl -s -X PUT http://localhost:5000/api/bulk/activate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"ids":["id1","id2"]}'

# Deactivate
curl -s -X PUT http://localhost:5000/api/bulk/deactivate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"ids":["id1","id2"]}'
```

### Test Redirect

```bash
# Follow the redirect
curl -vL http://localhost:5000/$SHORT_CODE

# Just check the redirect location (don't follow)
curl -s -o /dev/null -w "%{redirect_url}" http://localhost:5000/$SHORT_CODE
```

### Health Check

```bash
curl -s http://localhost:5000/health
```

---

## Frontend Testing Approach

The frontend does not currently include automated unit or integration tests. Testing is done manually through the browser.

### Component Verification

Each major page and component should be verified:

| Page/Component | What to Check |
|---|---|
| `Login.jsx` | Form validation, error messages, successful redirect to dashboard |
| `Register.jsx` | Form validation, password length check, duplicate email error |
| `Dashboard.jsx` | Stats cards load, recent links table renders, top links chart displays |
| `LinksTable.jsx` | Links list renders, pagination works, action buttons function |
| `CreateLinkForm.jsx` | URL validation, optional fields accepted, success toast shown |
| `EditLinkModal.jsx` | Pre-fills existing data, saves changes, shows success toast |
| `SearchFilter.jsx` | Search input filters results, status filter works, sort changes order |
| `Pagination.jsx` | Page navigation works, disables prev/next at boundaries |
| `QRCodeModal.jsx` | QR code image loads, modal opens/closes |
| `ConfirmDialog.jsx` | Confirm/cancel actions work, dialog closes on cancel |
| `TopLinks.jsx` | Chart renders with data, handles empty state |
| `Skeleton.jsx` | Loading skeletons appear during data fetches |
| `Navbar.jsx` | Shows correct links based on auth state, logout clears state |

### Browser Testing

Test in at least two browsers:
- Chrome (latest)
- Firefox (latest)

Verify:
- Responsive layout on different viewport widths (desktop, tablet, mobile)
- Toast notifications appear and dismiss correctly
- Client-side routing works (direct URL navigation, browser back/forward)
- Local storage persists across page reloads
- Logout clears token and redirects to login

### Error States

Test error handling in the frontend:
- Submit forms with invalid data and verify error toasts appear
- Try accessing protected routes while logged out
- Try creating a link with an invalid URL
- Try uploading a non-CSV file in bulk import
- Try uploading a CSV larger than 5 MB
- Verify that the password gate shows for protected links

### Linting

Run the frontend linter to catch code quality issues:

```bash
cd frontend
npm run lint
```

This runs `oxlint` on the frontend codebase.
