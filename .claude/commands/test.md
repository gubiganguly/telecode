# /test Command

You are a thorough QA engineer. Your job is to perform a full end-to-end test of the application using the Playwright MCP, catching visual issues, console errors, broken interactions, and server-side problems.

## Arguments Received

`$ARGUMENTS`

## Determine Scope

Parse the arguments to determine what to test:

1. **`<page-or-feature>`** (e.g., `dashboard`, `auth`, `/settings`) → Test only that specific page or feature
2. **No arguments / empty** → Full end-to-end test of the entire application

---

## Step 0: Understand the Application

Before testing anything, you need to know what the app does and what "correct" looks like:

1. **Read the README** — read `README.md` at the project root if it exists. This gives you the high-level picture: what the app is, how to run it, and what it's supposed to do.

2. **Read architecture docs** — read `/codebase-docs/architecture/ARCHITECTURE.md` if it exists. This tells you:
   - What the app does and who it's for
   - What pages/features exist and their purpose
   - Key user flows (auth, core workflows, etc.)
   - How frontend and backend connect
   - If feature-specific docs exist (listed in the Feature Modules table), read those too for the features you're testing

3. **Read API docs** — read `/codebase-docs/api/API_REFERENCE.md` if it exists. This tells you:
   - What API endpoints exist and what they return
   - Expected request/response shapes
   - Auth requirements per endpoint

4. **If no architecture docs exist**, read the codebase directly:
   - Read `frontend/app/layout.tsx` and `frontend/app/page.tsx` for the app shell and home page
   - Read key page components to understand what each page is supposed to render
   - Read backend route files to understand API behavior
   - Read any README.md at the project root for project description

5. **Build a mental model** of:
   - What each page should display and what data it needs
   - What the critical user flows are (e.g., sign up → log in → use feature → log out)
   - What API calls each page makes and what responses are expected
   - What states each page can be in (loading, empty, populated, error)

Use this understanding to inform every test — you're not just checking "does the page load" but "does the page show what it's supposed to show and behave the way it should."

---

## Step 1: Ensure Servers Are Running

Before any testing, make sure both servers are up:

1. **Kill existing processes** on ports 3000 and 8000:
   ```bash
   lsof -ti:3000 | xargs kill -9 2>/dev/null
   lsof -ti:8000 | xargs kill -9 2>/dev/null
   ```

2. **Start the backend** (port 8000):
   ```bash
   cd backend && source venv/bin/activate && uvicorn src.main:app --port 8000
   ```
   Run this in the background. Wait a few seconds and verify it's responding.

3. **Start the frontend** (port 3000):
   ```bash
   cd frontend && npm run dev
   ```
   Run this in the background. Wait for the "Ready" message.

4. **Verify both are running** by checking that `localhost:3000` and `localhost:8000` respond.

---

## Step 2: Discover All Routes

Before testing, build a map of what to test:

1. **Glob for all pages:** `frontend/app/**/page.tsx` — this gives you every route in the app
2. **Glob for API routes:** `frontend/app/api/**/route.ts` and `backend/src/api/**/*.py`
3. **Read the main layout** (`frontend/app/layout.tsx`) to understand navigation structure
4. **Identify key user flows** — auth, main features, navigation between pages

If a specific page/feature argument was provided, filter down to only the relevant routes.

---

## Step 3: Test Each Page

For every page discovered, perform these checks:

### 3a. Navigation & Load
- Use Playwright MCP `browser_navigate` to open the page
- Wait for the page to fully load
- **Take a screenshot** and visually inspect:
  - Does the page render correctly?
  - Is the layout intact (no overlapping elements, no broken grids)?
  - Are fonts, colors, and spacing consistent?
  - Is it clearly usable (not blank, no giant error screens)?

### 3b. Console & Error Check
- **Read browser console logs** — look for:
  - JavaScript errors / exceptions
  - React warnings (hydration mismatches, missing keys, deprecated APIs)
  - Failed network requests (4xx, 5xx, CORS errors)
  - Unhandled promise rejections
- **Check the Next.js dev overlay issues indicator** — look at the bottom-left corner of the page for an "X issues" badge:
  - If the badge is present, **click it** to expand the error details panel
  - **Read every reported issue** — these may include TypeScript errors, hydration mismatches, React errors, or build warnings that don't always appear in the console
  - **Record all issues** in the test report
  - **Fix all issues** — the page must show zero issues before it can pass
  - Take a screenshot after clicking to capture the full error details
- **Check the dev server terminal output** for:
  - Build errors or TypeScript errors
  - Server-side rendering errors
  - API route compilation failures

### 3c. Interactive Elements
- **Identify clickable elements** on the page (buttons, links, nav items, tabs, modals)
- **Click through primary interactions** — open menus, switch tabs, trigger modals
- After each interaction, **take a screenshot** and check for:
  - Correct state changes
  - Animations/transitions working smoothly
  - No layout shifts or visual glitches
  - Console remains error-free

### 3d. Forms (if present)
- **Fill out forms** with sample data
- **Submit the form** and verify:
  - Validation messages appear for invalid input
  - Success states work correctly
  - API calls fire and return expected responses
  - Error states are handled gracefully (show user-friendly messages, not raw errors)

### 3e. Responsive Check
- **Resize the viewport** to mobile dimensions (375x812) using Playwright
- **Take a screenshot** — verify mobile layout:
  - No horizontal overflow
  - Navigation collapses correctly (hamburger menu, etc.)
  - Content is readable and accessible
  - Touch targets are appropriately sized
- **Resize back to desktop** (1280x720)

---

## Step 4: API Health Check

Test backend API endpoints:

1. **Hit key API endpoints** directly via Playwright or the browser:
   - Check that they return correct status codes
   - Verify response shapes match expected schemas
2. **Test error handling** — hit an invalid endpoint and verify it returns a proper error response, not a crash

---

## Step 5: Cross-Page Navigation

Test the full user journey:

1. **Start at the home page** (`/`)
2. **Navigate through the main flows** using the app's own navigation (clicking links/buttons, not direct URL entry)
3. **Verify no broken links** — every nav item should lead somewhere
4. **Check that state persists correctly** between page transitions (auth state, selected items, etc.)

---

## Step 6: Generate Test Report

After all testing is complete, provide a structured report:

```
## Test Report — [DATE]

### Summary
- Pages tested: X
- Issues found: X (Y critical, Z warnings)
- Overall status: PASS / FAIL

### Pages Tested
| Page | URL | Status | Notes |
|------|-----|--------|-------|
| Home | `/` | PASS | - |
| Dashboard | `/dashboard` | FAIL | Console error: ... |

### Issues Found

#### Critical (must fix)
1. [Page] — [Description of issue]
   - Screenshot: [describe what was seen]
   - Console error: `[error message]`

#### Warnings (should fix)
1. [Page] — [Description]

#### Visual Issues
1. [Page] — [Description of visual problem]

### API Health
| Endpoint | Method | Status | Response |
|----------|--------|--------|----------|
| `/api/...` | GET | 200 | OK |

### Next.js Dev Overlay Issues
| Page | Issue Count | Details | Fixed? |
|------|-------------|---------|--------|
| Home | 0 | - | N/A |
| Dashboard | 2 | Hydration mismatch, missing key prop | Yes |

### Responsive Check
| Page | Desktop | Mobile | Issues |
|------|---------|--------|--------|
| Home | PASS | PASS | - |
```

---

## Step 7: Auto-Fix Critical Issues

If any **critical issues** were found:

1. **Fix the code** — address JavaScript errors, broken layouts, failed API calls
2. **Re-test the affected pages** to confirm the fix works
3. **Update the test report** with the resolution

Do NOT report completion until all critical issues are resolved. Warnings can be reported but don't block completion.

---

## Guidelines

- **Be thorough** — test every route, not just the ones that look important
- **Take screenshots liberally** — visual inspection is the whole point
- **Check console after every navigation** — errors can appear at any time
- **Check the Next.js issues indicator on every page** — the "X issues" badge in the bottom-left corner must be checked after every navigation. If it shows any count > 0, click it, read the errors, fix them, and re-test until it's gone
- **Test like a real user** — click things, fill forms, navigate around
- **Don't skip mobile** — responsive issues are real bugs
- **Fix as you go** — if something is broken, fix it and re-test immediately
- If a page requires authentication, note it and test with/without auth state
- If the backend is needed for a page to work, make sure it's running and responding
