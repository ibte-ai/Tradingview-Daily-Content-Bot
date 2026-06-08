# 🧪 Full-Stack QA Testing Script
### Universal End-to-End Verification Protocol
> **Version:** 1.0 | **Format:** Manual + Automated | **Scope:** Frontend · Backend · Database · APIs · Security · Logic

---

## 📋 Table of Contents

1. [Pre-Testing Checklist](#1-pre-testing-checklist)
2. [Environment Setup Verification](#2-environment-setup-verification)
3. [Frontend Testing](#3-frontend-testing)
4. [Backend / API Testing](#4-backend--api-testing)
5. [Database Testing](#5-database-testing)
6. [Authentication & Authorization Testing](#6-authentication--authorization-testing)
7. [API Security Testing](#7-api-security-testing)
8. [Business Logic Testing](#8-business-logic-testing)
9. [End-to-End Flow Testing](#9-end-to-end-flow-testing)
10. [Placeholder & Dummy Data Audit](#10-placeholder--dummy-data-audit)
11. [Performance & Load Testing](#11-performance--load-testing)
12. [Error Handling Testing](#12-error-handling-testing)
13. [Final Sign-Off Checklist](#13-final-sign-off-checklist)

---

## 1. Pre-Testing Checklist

> Complete ALL items before starting any testing. Do not skip.

```
[x] All environment variables are set (.env / .env.local / .env.production)
[x] Database is seeded with test data (not empty)
[x] All third-party services are connected (Stripe, Auth, Storage, etc.)
[x] Local dev server is running without errors
[x] No console errors on app startup
[x] No red/failing CI checks
[x] Postman / Bruno / cURL is ready for API testing
[x] Browser DevTools opened (Network tab + Console tab)
[x] Test user accounts created (admin, standard user, guest)
[x] Git branch is clean (no uncommitted changes)
```

---

## 2. Environment Setup Verification

### 2.1 — Environment Variables

**Test:** Verify every required env variable is loaded and not undefined.

```bash
# Run this in your terminal to check for missing env variables
node -e "
const required = [
  'DATABASE_URL',
  'JWT_SECRET',
  'API_BASE_URL',
  'NEXT_PUBLIC_API_URL',
  // ADD ALL YOUR ENV VARS HERE
];
required.forEach(key => {
  if (!process.env[key]) console.error('❌ MISSING:', key);
  else console.log('✅ FOUND:', key);
});
"
```

**Expected Result:** All variables print `✅ FOUND`. Zero `❌ MISSING`.

---

### 2.2 — Server Startup

| Check | Command / Action | Expected Result |
|---|---|---|
| Frontend starts | `npm run dev` | No errors in terminal |
| Backend starts | `npm run start` / `uvicorn main:app` | `Listening on port XXXX` |
| DB connection | Check server logs on startup | `Database connected` / no connection error |
| Health endpoint | `GET /health` or `/api/health` | `{ "status": "ok" }` with `200` |

---

## 3. Frontend Testing

### 3.1 — Page Load & Routing

For each route in your application, verify:

```
[x] Page loads without blank screen
[x] Page loads without console errors
[x] Page loads without 404 assets (images, fonts, scripts)
[x] Correct page title appears in browser tab
[x] Meta tags are populated (SEO)
[x] Favicon is visible
[x] Protected routes redirect unauthenticated users to /login
[x] Public routes are accessible without login
[x] 404 page renders correctly for invalid routes
[x] Navigating back/forward (browser history) works correctly
```

**Test Each Route Manually:**

| Route | Expected Page | Auth Required? | Status |
|---|---|---|---|
| `/` | Home / Landing | ❌ | `[x]` |
| `/login` | Login Form | ❌ | `[x]` |
| `/register` | Sign Up Form | ❌ | `[x]` |
| `/dashboard` | Dashboard | ✅ | `[x]` |
| `/settings` | Settings | ✅ | `[x]` |
| `/[your-route]` | [Your Page] | [?] | `[x]` |
| `/404` | Not Found Page | ❌ | `[x]` |

---

### 3.2 — UI Components

**Test each interactive element:**

```
[x] All buttons are clickable and trigger correct actions
[x] No button is disabled when it should be active
[x] All forms have proper labels (not placeholder-only)
[x] All dropdowns open and close correctly
[x] All modals/dialogs open and close correctly
[x] All toggles switch state correctly
[x] Tabs switch content correctly
[x] Accordion expands/collapses correctly
[x] Date pickers render and allow date selection
[x] File upload inputs accept correct file types
[x] All links navigate to correct destinations
[x] No dead/broken links exist
```

---

### 3.3 — Forms & Validation

**For every form in the application, run this test matrix:**

| Test Case | Action | Expected Result |
|---|---|---|
| Submit empty form | Click submit with all fields blank | All required fields show error messages |
| Submit partial form | Fill only some fields | Missing required fields show errors |
| Invalid email format | Enter `notanemail` in email field | "Invalid email" error shows |
| Password too short | Enter `abc` in password | "Minimum X characters" error shows |
| Mismatched passwords | Enter different values | "Passwords do not match" error shows |
| XSS in input | Enter `<script>alert(1)</script>` | Input is sanitized, no alert fires |
| SQL injection attempt | Enter `'; DROP TABLE users; --` | Input is sanitized, no DB error |
| Valid submission | Fill all fields correctly | Form submits, success feedback shown |
| Loading state | Submit form | Button shows loading/spinner state |
| Duplicate submission | Click submit twice quickly | Only one request is sent (debounced) |
| Network error | Disable network, submit | User sees error message, not blank crash |

---

### 3.4 — Responsive Design

**Test at these breakpoints:**

```
[x] 320px  — Mobile S (iPhone SE)
[x] 375px  — Mobile M (iPhone 12)
[x] 425px  — Mobile L
[x] 768px  — Tablet
[x] 1024px — Laptop
[x] 1280px — Desktop
[x] 1440px — Large Desktop
```

**For each breakpoint check:**
```
[x] No horizontal overflow / scroll
[x] Navigation is accessible (hamburger menu on mobile?)
[x] Text is readable (not too small)
[x] Buttons are tappable (min 44x44px touch targets)
[x] Images scale correctly
[x] Tables/grids reflow properly
[x] No content is hidden or clipped
```

---

### 3.5 — No Placeholder Content Audit

```
[x] No "Lorem ipsum" text anywhere in the app
[x] No "TODO:" comments visible in rendered UI
[x] No "[PLACEHOLDER]" text visible to users
[x] No "test@test.com" or "dummy@gmail.com" hardcoded
[x] No "123-456-7890" fake phone numbers
[x] No "Example Company" / "ACME Corp" default content
[x] No broken/placeholder images (gray boxes, alt text showing)
[x] No "Coming Soon" sections that should be functional
[x] All icons are intentional and not default/fallback icons
[x] No "undefined" or "null" rendered as visible text
```

---

## 4. Backend / API Testing

### 4.1 — API Endpoint Inventory

> Map every endpoint before testing. Fill this table for your project.

| Method | Endpoint | Auth | Description | Tested |
|---|---|---|---|---|
| GET | `/api/health` | ❌ | Health check | `[x]` |
| POST | `/api/auth/register` | ❌ | Register user | `[x]` |
| POST | `/api/auth/login` | ❌ | Login user | `[x]` |
| POST | `/api/auth/logout` | ✅ | Logout user | `[x]` |
| GET | `/api/auth/me` | ✅ | Get current user | `[x]` |
| GET | `/api/[resource]` | ✅ | List resource | `[x]` |
| POST | `/api/[resource]` | ✅ | Create resource | `[x]` |
| GET | `/api/[resource]/:id` | ✅ | Get single resource | `[x]` |
| PUT | `/api/[resource]/:id` | ✅ | Update resource | `[x]` |
| DELETE | `/api/[resource]/:id` | ✅ | Delete resource | `[x]` |

---

### 4.2 — API Response Contract Testing

**For each endpoint, verify the response shape:**

```bash
# Template cURL test — replace with your actual endpoint and token
curl -X GET http://localhost:3000/api/[endpoint] \
  -H "Authorization: Bearer YOUR_TEST_TOKEN" \
  -H "Content-Type: application/json" \
  | jq .
```

**Checklist for every response:**

```
[x] Correct HTTP status code (200, 201, 400, 401, 403, 404, 500)
[x] Response is valid JSON
[x] Response has consistent structure (not different shapes on success vs error)
[x] Success response includes expected fields (no missing keys)
[x] Error response includes { "error": "...", "message": "..." } structure
[x] No raw database errors exposed in response body
[x] No stack traces exposed in production responses
[x] No sensitive fields returned (passwords, tokens, internal IDs)
[x] Timestamps are in consistent format (ISO 8601 recommended)
[x] Pagination returns: data[], total, page, pageSize, hasMore
```

---

### 4.3 — HTTP Status Code Verification

| Scenario | Expected Status | Verify |
|---|---|---|
| Successful GET | `200 OK` | `[x]` |
| Successful POST (create) | `201 Created` | `[x]` |
| Successful DELETE (no content) | `204 No Content` | `[x]` |
| Bad request / validation fail | `400 Bad Request` | `[x]` |
| No auth token provided | `401 Unauthorized` | `[x]` |
| Valid token, wrong permissions | `403 Forbidden` | `[x]` |
| Resource not found | `404 Not Found` | `[x]` |
| Server-side crash | `500 Internal Server Error` | `[x]` |
| Rate limit exceeded | `429 Too Many Requests` | `[x]` |

---

### 4.4 — Input Validation (Backend)

```
[x] Required fields return 400 if missing
[x] Type mismatches return 400 (string where number expected)
[x] Oversized payloads are rejected (body size limit enforced)
[x] IDs that don't exist return 404 (not 500)
[x] Negative numbers, zero values handled for numeric fields
[x] Empty strings rejected for required string fields
[x] Dates in wrong format return 400
[x] Unknown/extra fields in body are ignored (not cause crashes)
```

---

## 5. Database Testing

### 5.1 — Schema Verification

```sql
-- Run these checks in your DB client (Postgres / MySQL / Supabase SQL editor)

-- 1. Verify all tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public';

-- 2. Check no nullable constraints are violated
SELECT * FROM [your_table] WHERE required_column IS NULL;

-- 3. Verify unique constraints work (attempt duplicate insert)
INSERT INTO users (email) VALUES ('duplicate@test.com');
INSERT INTO users (email) VALUES ('duplicate@test.com'); -- should FAIL

-- 4. Verify foreign key constraints
INSERT INTO [child_table] (foreign_key_id) VALUES (99999); -- should FAIL if parent doesn't exist

-- 5. Check indexes exist on frequently queried columns
SELECT indexname, tablename FROM pg_indexes WHERE schemaname = 'public';
```

---

### 5.2 — CRUD Operations

**Test each operation directly at the database level:**

```
[x] INSERT: Create a record → verify it appears on SELECT
[x] SELECT: Query returns correct data, no extra/missing rows
[x] UPDATE: Modify a field → verify only that field changed
[x] DELETE: Remove a record → verify it no longer appears
[x] Cascade DELETE: Deleting parent removes child records (if configured)
[x] Soft Delete: Deleted records have deleted_at set, not physically removed (if used)
[x] Timestamps: created_at set on INSERT, updated_at changes on UPDATE
[x] Auto-increment IDs: Each new record gets a unique, incrementing ID
```

---

### 5.3 — Data Integrity

```
[x] No orphaned records exist (child rows with no parent)
[x] No duplicate records in tables with unique constraints
[x] All enum columns contain only valid values
[x] Boolean fields contain only true/false (not 1/0 string)
[x] No production/sensitive data appears in test/dev database
[x] All timestamps are stored in UTC
[x] Numeric precision is correct (money fields use DECIMAL, not FLOAT)
```

---

### 5.4 — Connection & Pool Testing

```
[x] App connects to DB on startup without error
[x] DB connection string in env var (not hardcoded anywhere in code)
[x] Connection pool is configured (not creating new connection per request)
[x] App handles DB connection timeout gracefully
[x] App handles DB being temporarily unavailable (retries or clear error)
```

---

## 6. Authentication & Authorization Testing

### 6.1 — Authentication Flow

**Registration:**
```
[x] New user can register with valid details
[x] Duplicate email returns error (not 500)
[x] Password is hashed in database (not plaintext — verify in DB)
[x] Confirmation email sent (if applicable)
[x] User cannot register with invalid email format
[x] Password requirements enforced on backend (not just frontend)
```

**Login:**
```
[x] Valid credentials return JWT/session token
[x] Invalid password returns 401 (not 500)
[x] Non-existent email returns 401 (same message — no user enumeration)
[x] Token expires after configured TTL
[x] Refresh token flow works (if implemented)
[x] Login from new device/IP works correctly
```

**Logout:**
```
[x] Logout invalidates session/token server-side
[x] After logout, old token returns 401
[x] Logout clears auth cookies/localStorage
[x] Redirect to login page after logout
```

---

### 6.2 — Authorization (Role-Based)

> Test every protected route with each role.

| Route / Action | Admin | User | Guest (Unauth) |
|---|---|---|---|
| View dashboard | ✅ | ✅ | 🔴 → /login |
| Create resource | ✅ | ✅ | 🔴 → /login |
| Edit other user's resource | ✅ | 🔴 → 403 | 🔴 → 401 |
| Delete resource | ✅ | ✅ (own only) | 🔴 → 401 |
| Access admin panel | ✅ | 🔴 → 403 | 🔴 → 401 |
| View other user's data | ✅ | 🔴 → 403 | 🔴 → 401 |

```
[x] User A cannot access User B's private data via direct URL manipulation
[x] User A cannot delete User B's resources by guessing resource IDs
[x] Admin routes are completely inaccessible to non-admin tokens
[x] IDOR (Insecure Direct Object Reference) is not possible
```

---

## 7. API Security Testing

### 7.1 — Injection Attacks

```
[x] SQL Injection: Pass `' OR '1'='1` in query params → no DB error exposed
[x] NoSQL Injection: Pass `{"$gt": ""}` in JSON body → handled safely
[x] Command Injection: Pass `; ls -la` in string fields → not executed
[x] Path Traversal: Access `../../etc/passwd` via file endpoints → blocked
[x] XSS via API: Store `<script>alert(1)</script>` → returned escaped on output
```

---

### 7.2 — Authentication Security

```
[x] JWT secret is strong (min 32 chars, random)
[x] JWT is not stored in URL query params
[x] JWT not logged in server logs
[x] Token cannot be tampered with (modify payload → 401)
[x] Expired token returns 401 (not 500)
[x] HTTPS enforced (no HTTP in production)
[x] Cookies set with HttpOnly, Secure, SameSite flags
```

---

### 7.3 — Rate Limiting

```bash
# Test rate limiting — run this in a loop
for i in {1..20}; do
  curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrongpass"}'
  echo "Request $i"
done
```

```
[x] Login endpoint rate-limited (max N attempts per IP per minute)
[x] Register endpoint rate-limited
[x] Password reset endpoint rate-limited
[x] Rate limit response returns 429 with Retry-After header
[x] Rate limiting is per-IP (not global — one user shouldn't block others)
```

---

### 7.4 — CORS & Headers

```bash
# Test CORS from disallowed origin
curl -H "Origin: https://evil-site.com" \
     -I http://localhost:3000/api/users
```

```
[x] CORS only allows configured origins (not *)
[x] Content-Security-Policy header is set
[x] X-Frame-Options: DENY (prevents clickjacking)
[x] X-Content-Type-Options: nosniff
[x] Strict-Transport-Security set in production
[x] Server header does not expose tech stack (e.g., "Express", "nginx/1.x")
[x] No sensitive data in response headers
```

---

### 7.5 — Mass Assignment

```bash
# Try to set admin role via request body
curl -X PUT http://localhost:3000/api/users/me \
  -H "Authorization: Bearer USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "John", "role": "admin", "is_verified": true}'
```

```
[x] Users cannot promote themselves to admin via body params
[x] Users cannot set is_verified: true themselves
[x] Users cannot change another user's ID
[x] Allowlist-based field validation on all update endpoints
```

---

## 8. Business Logic Testing

> Replace these with your actual project's core business rules.

### 8.1 — Core Feature Logic

**For each primary feature, define and test the rule:**

```
FEATURE: [Feature Name]
RULE: [Describe what should happen]
TEST:
  [x] Happy path works correctly
  [x] Edge case: [describe edge case] → [expected result]
  [x] Edge case: [describe edge case] → [expected result]
  [x] Rule is enforced on backend (not just frontend)
```

**Generic Logic Tests:**

```
[x] Free tier limits are enforced (if applicable)
[x] Paid tier unlocks correct features
[x] Quota/usage counters increment correctly
[x] Counter does NOT go below 0 / negative
[x] Date-based logic uses UTC (not local timezone)
[x] Rounding/currency logic is correct (0.1 + 0.2 !== 0.3 bug avoided)
[x] Order of operations in calculations is correct
[x] Deleted resources do not appear in listings
[x] Archived items behave differently from active items
[x] Status transitions follow defined workflow (e.g., draft → published → archived)
[x] You cannot skip a status (e.g., draft cannot jump to archived)
```

---

### 8.2 — State Transitions

> Draw your state machine and test every transition:

```
[x] Every valid state transition works
[x] Every invalid state transition is blocked with clear error
[x] State is persisted to database correctly
[x] State changes trigger correct downstream actions (emails, webhooks, etc.)
```

---

## 9. End-to-End Flow Testing

### 9.1 — Primary User Journey

> Walk through your app's core use case from first visit to completion.

**Template E2E Flow:**

```
STEP 1: User arrives at landing page
  [x] Page loads correctly
  [x] CTA button visible

STEP 2: User clicks Sign Up
  [x] Redirected to /register
  [x] Form is empty (no pre-filled data)

STEP 3: User fills registration form
  [x] Enters name, email, password
  [x] Submits form
  [x] Loading state shown
  [x] Success → redirected to dashboard
  [x] Welcome email received (if configured)
  [x] User record exists in database

STEP 4: User performs core action
  [x] [Your core feature] works correctly
  [x] Data is saved to database
  [x] UI updates to reflect change

STEP 5: User logs out
  [x] Session cleared
  [x] Redirected to /login or /

STEP 6: User logs back in
  [x] Existing data is still there (persistence verified)
  [x] All previously created items still present

STEP 7: User deletes their account (if applicable)
  [x] Account removed from DB
  [x] Old token no longer works
  [x] Data cleaned up per privacy policy
```

---

### 9.2 — Admin Journey

```
[x] Admin can log in to admin panel
[x] Admin can view all users
[x] Admin can view all resources
[x] Admin can perform moderation actions
[x] Admin actions are logged (audit trail)
[x] Admin cannot break the system with destructive actions (confirmation required)
```

---

## 10. Placeholder & Dummy Data Audit

### 10.1 — Code Search

Run these searches in your codebase before go-live:

```bash
# Search for common placeholder patterns
grep -ri "lorem ipsum" ./src
grep -ri "TODO" ./src
grep -ri "FIXME" ./src
grep -ri "PLACEHOLDER" ./src
grep -ri "test@test.com" ./src
grep -ri "example.com" ./src
grep -ri "dummy" ./src
grep -ri "fake" ./src
grep -ri "hardcoded" ./src
grep -ri "change this" ./src
grep -ri "your-api-key" ./src
grep -ri "sk-" ./src         # OpenAI keys
grep -ri "AKIA" ./src        # AWS keys
grep -ri "password123" ./src
```

**Expected Result:** Every search returns 0 results (or only intentional occurrences).

---

### 10.2 — UI Visual Inspection

```
[x] All profile pictures are real or proper default avatars
[x] All product images are real (no stock "gray box" placeholders)
[x] All prices/numbers are real or clearly labeled as demo
[x] All names are intentional (no "John Doe", "Jane Smith" in production)
[x] All company names are real or your own
[x] No "Test Mode" banners visible (unless in test mode intentionally)
[x] Email templates use real company name, logo, address
[x] Footer has real copyright year, company name, real links
[x] Privacy Policy and Terms of Service are real (not template text)
```

---

## 11. Performance & Load Testing

### 11.1 — Frontend Performance

```bash
# Run Lighthouse CLI
npx lighthouse http://localhost:3000 --view

# Or use web vitals in browser:
# DevTools → Performance → Start recording → Load page → Stop
```

**Target Scores:**

| Metric | Target | Your Score |
|---|---|---|
| Lighthouse Performance | ≥ 80 | |
| Lighthouse Accessibility | ≥ 90 | |
| First Contentful Paint | < 1.5s | |
| Largest Contentful Paint | < 2.5s | |
| Cumulative Layout Shift | < 0.1 | |
| Time to Interactive | < 3.5s | |
| Bundle size (JS) | < 500KB initial | |

---

### 11.2 — API Performance

```bash
# Test response time of critical endpoints
# Using httpie (install: pip install httpie)
http --print=Hh GET localhost:3000/api/[endpoint] \
  Authorization:"Bearer TOKEN"

# Using Apache Bench for load testing
ab -n 100 -c 10 http://localhost:3000/api/health
# -n 100 = 100 total requests
# -c 10 = 10 concurrent users
```

**Target API Response Times:**

| Endpoint Type | Target |
|---|---|
| Health check | < 50ms |
| Auth endpoints | < 200ms |
| List endpoints | < 500ms |
| Create/Update | < 300ms |
| Complex queries | < 1000ms |

---

### 11.3 — Database Query Performance

```sql
-- Enable query logging and check for slow queries
-- Postgres: EXPLAIN ANALYZE your_query
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'test@test.com';

-- Look for:
-- [x] Sequential scans on large tables (need index)
-- [x] Nested loop joins on unindexed columns
-- [x] Any query taking > 100ms
```

---

## 12. Error Handling Testing

### 12.1 — Frontend Error Handling

```
[x] Network offline → app shows "No internet connection" (not blank crash)
[x] API returns 500 → user sees friendly error message (not raw JSON)
[x] API returns 404 → appropriate "not found" UI shown
[x] JavaScript runtime error → error boundary catches it (not blank screen)
[x] Form submit fails → error message shown, form not cleared
[x] File upload fails → user notified with retry option
[x] Session expires mid-use → user redirected to login with message
```

---

### 12.2 — Backend Error Handling

```
[x] Unhandled promise rejections are caught globally
[x] Global error handler returns consistent error shape
[x] Database errors are caught and converted to user-friendly messages
[x] Third-party service failures are caught (Stripe, email, storage)
[x] Errors are logged server-side with enough context to debug
[x] Production errors do NOT expose stack traces to client
[x] 500 errors trigger alerts (Sentry, LogRocket, or similar)
```

---

### 12.3 — Edge Cases

```
[x] Empty database returns empty array [] not null or 500
[x] Request with no body returns 400 (not 500)
[x] Extremely long strings don't crash the app (truncated/rejected)
[x] Concurrent requests don't cause race conditions
[x] Two users editing same resource simultaneously is handled
[x] Uploading wrong file type is rejected with clear message
[x] Uploading file that's too large is rejected with clear message
```

---

## 13. Final Sign-Off Checklist

### ✅ Frontend Sign-Off
```
[x] All pages load without errors
[x] All forms validate and submit correctly
[x] Responsive on mobile, tablet, desktop
[x] No placeholder/dummy content
[x] No broken links or images
[x] No console errors in production build
```

### ✅ Backend Sign-Off
```
[x] All API endpoints return correct status codes
[x] All endpoints validated and secured
[x] Rate limiting active on sensitive routes
[x] No sensitive data in responses
[x] Logs configured and working
```

### ✅ Database Sign-Off
```
[x] All tables and relations correct
[x] Migrations applied cleanly
[x] No hardcoded credentials
[x] Backups configured
[x] No data loss on restart
```

### ✅ Security Sign-Off
```
[x] No secrets in codebase (run git-secrets scan)
[x] HTTPS enforced
[x] Auth tested for all roles
[x] No IDOR vulnerabilities
[x] CORS configured correctly
[x] Rate limiting active
```

### ✅ Logic Sign-Off
```
[x] All business rules tested
[x] Edge cases handled
[x] E2E flow completes successfully
[x] No placeholder logic (hardcoded returns)
[x] All TODO/FIXME resolved
```

### ✅ Production Readiness
```
[x] Environment variables set in production
[x] Error monitoring configured (Sentry / Datadog)
[x] Database connection pooling configured
[x] CDN configured for static assets
[x] Domain and SSL configured
[x] Analytics connected (if required)
```

---

> **Testing completed by:** ___________________  
> **Date:** ___________________  
> **Version / Build:** ___________________  
> **Overall Status:** `PASS ✅` / `FAIL ❌` / `CONDITIONAL ⚠️`

---

*Generated for full-stack project quality assurance. Adapt endpoint names, routes, roles, and business logic rules to your specific project.*
