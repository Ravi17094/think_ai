# Thinkz AI – Complete Day-by-Day Task Assignment

> **Sprint Duration:** Day 1 – Day 9
> **Team Size:** 5 Active Developers
> **Demo Deadline:** 6:00 PM daily on staging

---

## 1. Karthik – Frontend Developer

### Day 1: Baseline Setup
- [ ] Scaffold React app with Vite + Tailwind CSS
- [ ] Build login page UI with form validation
- [ ] Build admin dashboard shell (sidebar + topbar layout)
- [ ] Create dummy JSON data for users and courses
- [ ] Verify app runs locally without errors

### Day 2: Frontend Integration
- [ ] Connect Admin Dashboard to Auth API
- [ ] Connect Admin Dashboard to Course API
- [ ] Build Create/Edit Course modal with form fields
- [ ] Build Create/Edit User modal with form fields
- [ ] Implement toast notifications for success/error states
- [ ] Add pagination to all admin tables
- [ ] Add search functionality to all admin tables

### Day 3: Core Functionality Completion
- [ ] Add basic required-field validation to all CRUD forms
- [ ] Verify toast notifications fire on every create/update/delete
- [ ] Confirm pagination works with server-side data
- [ ] Test search with special characters and empty results
- [ ] Run local build with zero warnings

### Day 4: Alpha Stabilization
- [ ] Fix all integration gaps between Admin Dashboard and backend APIs
- [ ] Add error boundary components to every page
- [ ] Add loading skeleton states to every async operation
- [ ] Verify responsive layout at 768px breakpoint
- [ ] Write unit tests for all CRUD components
- [ ] Confirm all tests pass in CI pipeline

### Day 5: Frontend Excellence
- [ ] Audit and fix pixel-perfect spacing across all pages
- [ ] Add micro-interactions to buttons, modals, and transitions
- [ ] Build Learner Portal shell (dashboard home, my courses list, upcoming sessions)
- [ ] Implement notification bell with unread count badge
- [ ] Build global search bar across admin + learner views
- [ ] Write unit tests for Learner Portal components
- [ ] Resolve all frontend merge conflicts

### Day 6: Beta Features (Foundation)
- [ ] Build Code Playground page with Monaco Editor integration
- [ ] Add language selector dropdown to Code Playground
- [ ] Build output panel for code execution results
- [ ] Build Assessment Submission UI with question navigation
- [ ] Add timer component to Assessment Submission UI
- [ ] Implement auto-save draft for assessment answers
- [ ] Build Live Class join button with countdown timer on Learner Dashboard
- [ ] Write unit test scaffolding for all three new components

### Day 7: Beta Features (Integration)
- [ ] Connect Code Playground to code execution proxy API
- [ ] Connect Assessment Submission UI to assessment engine API
- [ ] Connect Live Class join flow to session API
- [ ] Polish all loading, error, empty, and success states
- [ ] Verify responsive layout at 375px, 768px, and 1440px
- [ ] Run final unit test pass with ≥80% coverage

### Day 8: Payments + Notifications UI
- [ ] Build payment checkout page (plan selection, card form)
- [ ] Build payment success and failure state pages
- [ ] Build notification center dropdown with unread badge
- [ ] Add mark-as-read functionality to notification center
- [ ] Connect checkout to payment API contract
- [ ] Connect notification center to preferences API
- [ ] Fix all beta bugs from previous demo feedback
- [ ] Verify responsive polish across all new pages

### Day 9: Full Product Push
- [ ] Complete Learner Portal my courses page with progress tracking
- [ ] Build upcoming live sessions list with join links
- [ ] Polish Course Player (video controls, notes panel, lesson navigation)
- [ ] Integrate global search across all learner views
- [ ] Verify responsive layout at all three breakpoints
- [ ] Write unit tests for all Learner Portal + Course Player components
- [ ] Confirm all tests pass and staging deploy succeeds

---

## 2. Janadeep – Backend Developer

### Day 1: Baseline Setup
- [ ] Initialize Express.js project with TypeScript
- [ ] Setup Prisma ORM with PostgreSQL schema
- [ ] Build `/register` endpoint with Bcrypt password hashing
- [ ] Build `/login` endpoint with JWT token generation
- [ ] Build `/me` endpoint with JWT verification middleware
- [ ] Test all three endpoints in Postman

### Day 2: Auth API Hardening
- [ ] Add Zod validation schemas to all auth endpoints
- [ ] Configure CORS for all frontend routes
- [ ] Implement rate limiting on `/login` endpoint
- [ ] Update Swagger docs with request/response examples
- [ ] Document all error codes in Swagger

### Day 3: Core Validation
- [ ] Verify Zod validation rejects malformed input on all endpoints
- [ ] Confirm Swagger reflects all validation rules
- [ ] Test rate limiter blocks excess requests correctly
- [ ] Verify CORS headers present on all responses
- [ ] Run linting with zero warnings

### Day 4: Alpha Stabilization
- [ ] Fix all auth integration issues reported by frontend devs
- [ ] Add missing error response examples to Swagger
- [ ] Write integration tests for register/login/me flows
- [ ] Implement account lockout after 5 failed login attempts
- [ ] Verify lockout resets after cooldown period
- [ ] Confirm all integration tests pass

### Day 5: Notifications + Password Reset
- [ ] Build `GET /notifications` endpoint with pagination
- [ ] Build `PATCH /notifications/:id/read` endpoint
- [ ] Build `POST /forgot-password` endpoint with email token
- [ ] Build `POST /reset-password` endpoint with token verification
- [ ] Build `POST /verify-email` endpoint
- [ ] Write integration tests for all new endpoints
- [ ] Achieve ≥90% test coverage on auth service
- [ ] Update Swagger with all notification + reset flows

### Day 6: Live Session APIs (Foundation)
- [ ] Build `POST /sessions` endpoint (create live session)
- [ ] Build `GET /sessions` endpoint (list/schedule)
- [ ] Build `PATCH /sessions/:id/start` and `/end` endpoints
- [ ] Build Jitsi/Zoom room creation API (generate meeting links)
- [ ] Create attendance tracking schema + API endpoints
- [ ] Build recording metadata storage endpoint
- [ ] Write integration test scaffolding for session lifecycle

### Day 7: Live Session APIs (Hardening)
- [ ] Harden webhook signature verification for payment/session events
- [ ] Add session status broadcasting via WebSocket server
- [ ] Implement recording save callback endpoint
- [ ] Add rate limiting to all live session endpoints
- [ ] Add input validation to all live session endpoints
- [ ] Run final integration test pass
- [ ] Update Swagger with complete live session documentation

### Day 8: Payment Gateway + Communications
- [ ] Build Stripe/Razorpay payment intent creation API
- [ ] Build webhook handler for payment confirmation events
- [ ] Integrate SendGrid email service (welcome, enrollment, certificate templates)
- [ ] Integrate Twilio SMS service (OTP, reminder templates)
- [ ] Write unit tests for payment + email + SMS services
- [ ] Achieve ≥90% test coverage
- [ ] Update Swagger with complete payment + communication docs
- [ ] Ensure payment/comms module has no dependencies on other modules

### Day 9: Final Hardening
- [ ] Load test webhook handler at 100 req/min
- [ ] Verify all email templates render correctly with dynamic data
- [ ] Test OAuth2 Google login flow end-to-end
- [ ] Confirm all SMS templates send successfully
- [ ] Run full test suite with ≥90% coverage maintained
- [ ] Final Swagger review for completeness
- [ ] Ensure payment/comms module remains self-contained

---

## 3. Roopesh – LMS/Core Developer

### Day 1: Baseline Setup
- [ ] Define Course, Batch, and Enrollment Prisma models
- [ ] Create sample Course CRUD API contract (OpenAPI spec)
- [ ] Generate seed/dummy data for courses and batches
- [ ] Verify schema migrations apply cleanly
- [ ] Document API contract in shared `/contracts` folder

### Day 2: Course/Batch Integration
- [ ] Build enrollment list view component
- [ ] Build course publish/archive toggle with instant UI update
- [ ] Add loading skeleton states to course list
- [ ] Add empty state when no courses exist
- [ ] Implement graceful error handling for API failures
- [ ] Connect all components to LMS backend APIs

### Day 3: Stable Module
- [ ] Verify enrollment list displays correct data
- [ ] Confirm publish/archive toggle persists after refresh
- [ ] Test loading skeletons appear during async operations
- [ ] Verify empty state renders when table is empty
- [ ] Test error handling for network failure and 500 responses
- [ ] Run local build with zero errors

### Day 4: Alpha Stabilization
- [ ] Fix all Course/Batch integration gaps reported by QA
- [ ] Add enrollment count display on course cards
- [ ] Write E2E test scenarios for course CRUD flows
- [ ] Verify enrollment count updates after enroll/unenroll
- [ ] Confirm E2E tests pass in CI pipeline
- [ ] Deploy stable module to staging

### Day 5: Content Viewer + Tracking
- [ ] Build `GET /courses/:id/modules` API endpoint
- [ ] Build `GET /modules/:id/lessons` API endpoint
- [ ] Implement enrollment status tracking (in-progress, completed, dropped)
- [ ] Build batch auto-allocation logic per WBS 2.2 rules
- [ ] Write E2E tests for content viewer + enrollment flows
- [ ] Verify auto-allocation assigns learners correctly
- [ ] Own LMS module merge conflicts; escalate if unresolved in 15 min

### Day 6: Assessment Engine (Foundation)
- [ ] Build Assessment Engine backend (create assessment, submit answers)
- [ ] Implement auto-grading logic for MCQ questions
- [ ] Build Code Execution Proxy API (forward to Judge0/Docker)
- [ ] Add timeout handling and output sanitization to proxy
- [ ] Create database schema for assessments + submissions
- [ ] Write E2E test scaffolding for assessment flow

### Day 7: Assessment Engine (Integration)
- [ ] Complete Judge0/Docker integration testing
- [ ] Implement grading result callback to assessment engine
- [ ] Build assessment analytics endpoint (avg score, completion rate)
- [ ] Connect assessment engine to frontend UI
- [ ] Run final E2E test pass for full assessment → grade flow
- [ ] Verify analytics data accuracy against test submissions

### Day 8: Payment → Enrollment Flow
- [ ] Build enrollment payment verification logic
- [ ] Implement auto-certificate issuance on payment confirmation
- [ ] Build course access unlock after successful payment
- [ ] Wire certificate generation to email service contract
- [ ] Test end-to-end: payment → enrollment → certificate → email
- [ ] Fix any LMS beta bugs from previous demo feedback

### Day 9: Final Assessment + Analytics
- [ ] Finalize auto-grading for coding challenges (not just MCQ)
- [ ] Implement certificate PDF generation service
- [ ] Build course analytics API (enrollment trends, completion rates)
- [ ] Write comprehensive E2E tests for grading + certificate + analytics
- [ ] Verify all analytics endpoints return accurate aggregated data
- [ ] Confirm staging deploy includes all Day 9 features

---

## 4. Anand Kishor – Admin/RBAC Developer

### Day 1: Baseline Setup
- [ ] Build `GET /admin/users` endpoint with pagination
- [ ] Build `POST /admin/users/:id/assign-role` endpoint
- [ ] Build `PATCH /admin/users/:id/update-role` endpoint
- [ ] Build `GET /admin/roles` endpoint (list all roles)
- [ ] Document all User/Role API endpoints in Swagger

### Day 2: User/Role Frontend
- [ ] Build user status toggle (active/inactive) with API call
- [ ] Build role assignment dropdown populated from roles API
- [ ] Implement RBAC-based UI visibility guards
- [ ] Add confirmation dialogs for destructive actions (delete, deactivate)
- [ ] Connect all frontend components to User/Role backend APIs

### Day 3: Stable Module
- [ ] Verify status toggle persists after page refresh
- [ ] Confirm role assignment saves correctly to backend
- [ ] Test RBAC guards hide admin menu for non-admin roles
- [ ] Verify confirmation dialogs appear before destructive actions
- [ ] Run local build with zero errors

### Day 4: Alpha Stabilization
- [ ] Fix all User/Role integration gaps from QA feedback
- [ ] Verify RBAC permission matrix loads correctly from backend
- [ ] Write unit tests for role assignment logic
- [ ] Implement session timeout redirect to `/login`
- [ ] Confirm session timeout triggers after configured idle period
- [ ] All unit tests passing in CI

### Day 5: Audit Logs + Inheritance
- [ ] Build `GET /admin/audit-logs` API with filtering (date, actor, action)
- [ ] Implement role permission inheritance (parent-child resolver)
- [ ] Build user profile edit page (frontend + backend)
- [ ] Write unit tests for audit log queries
- [ ] Write unit tests for permission inheritance logic
- [ ] Verify child roles inherit parent permissions correctly

### Day 6: WebSocket Infrastructure (Foundation)
- [ ] Setup Socket.io server with authentication middleware
- [ ] Implement room management logic (session rooms, breakout rooms)
- [ ] Define real-time event schema (session started, chat, poll, breakout)
- [ ] Build connection state API (online/offline status, reconnection)
- [ ] Write load test script for 50+ concurrent WebSocket connections
- [ ] Verify authenticated users can only join authorized rooms

### Day 7: WebSocket Integration
- [ ] Connect WebSocket server to Live Session API
- [ ] Implement all real-time event broadcasting
- [ ] Run full load test with 200+ concurrent connections
- [ ] Verify reconnection handling works after network drop
- [ ] Run smoke test for all WebSocket events
- [ ] Confirm load test passes with <100ms latency

### Day 8: RBAC Matrix Finalization
- [ ] Build RBAC Visual Permission Matrix UI (role × permission grid with toggles)
- [ ] Implement audit log viewer with filtering and export
- [ ] Run WebSocket load test (200+ concurrent) – final verification
- [ ] Build notification preferences API (email/in-app/SMS toggles per user)
- [ ] Connect preferences API to notification center UI
- [ ] Fix all remaining RBAC backend bugs

### Day 9: Final RBAC + WS Stability
- [ ] Finalize RBAC Visual Permission Matrix with all 5 role types
- [ ] Add export functionality to audit log viewer (CSV/JSON)
- [ ] Run final WebSocket load test (200+ concurrent)
- [ ] Fix any remaining RBAC bugs from Day 8 testing
- [ ] Verify all permission changes create audit log entries
- [ ] Confirm staging deploy includes all finalized features

---

## 5. Manjunath – Forum Developer

### Day 1: Baseline Setup
- [ ] Build discussion list page with pagination
- [ ] Build thread detail view with comments section
- [ ] Build post creation form with title + body fields
- [ ] Verify forum shell runs locally with mock data
- [ ] Setup component test scaffolding

### Day 2: Forum Features + Responsive
- [ ] Implement upvote/downvote functionality with optimistic UI
- [ ] Add mark-as-solved toggle on thread detail view
- [ ] Build tag filtering on discussion list
- [ ] Verify responsive layout at 375px breakpoint
- [ ] Test voting persists in mock data layer

### Day 3: Stable Module
- [ ] Verify discussion list renders with mock data
- [ ] Confirm thread detail view displays comments correctly
- [ ] Test post creation adds to discussion list
- [ ] Verify upvote/downvote toggles correctly
- [ ] Confirm mobile responsive layout has no horizontal scroll
- [ ] Run local build with zero errors

### Day 4: Alpha Stabilization
- [ ] Fix all Forum integration gaps from QA feedback
- [ ] Ensure upvote/downvote persists across page reloads
- [ ] Add empty state for "no discussions found"
- [ ] Verify mobile responsive layout at 375px
- [ ] Write component tests for voting + empty state
- [ ] All component tests passing

### Day 5: Categories + Bookmarks + Mentions
- [ ] Build forum category/tag CRUD (create, edit, delete)
- [ ] Implement post bookmarking/favorites feature
- [ ] Add @username mention parsing in post/comment body
- [ ] Trigger notification on @mention (mock/stub)
- [ ] Write component tests for categories, bookmarks, mentions
- [ ] Verify bookmarks persist in mock storage

### Day 6: Live Class Studio Shell (Foundation)
- [ ] Build Live Class Studio frontend shell (video embed placeholder)
- [ ] Build attendee list panel with online/offline indicators
- [ ] Build chat panel with message input + history display
- [ ] Build polls UI (create poll, vote, results display)
- [ ] Build bottom toolbar (mute, camera, screen share, raise hand)
- [ ] Connect chat to WebSocket stub with mock messages
- [ ] Write component test scaffolding for studio components

### Day 7: Live Class Studio Integration
- [ ] Connect Live Studio to session API
- [ ] Connect chat to WebSocket server
- [ ] Implement live poll creation and real-time results display
- [ ] Add screen share toggle UI (placeholder for now)
- [ ] Polish chat with timestamps, user avatars, moderation actions
- [ ] Run final component test pass for all studio features

### Day 8: Moderation Dashboard
- [ ] Build forum moderation dashboard (flagged posts queue)
- [ ] Implement user ban/unban functionality
- [ ] Build content hide/show toggle for flagged posts
- [ ] Build in-app notification toast/popup component
- [ ] Improve rich text editor (formatting toolbar, preview)
- [ ] Write component tests for moderation + notification toast
- [ ] Ensure forum module has no dependencies on payment/comms module

### Day 9: Search Optimization + Preferences
- [ ] Optimize forum search for 1000+ posts (tag + author + date + solved)
- [ ] Implement bookmark sync across devices (mock API)
- [ ] Build notification preferences UI (email/in-app/SMS toggles)
- [ ] Write component tests for search + bookmarks + preferences
- [ ] Verify responsive layout at 375px/768px/1440px
- [ ] Ensure forum module remains self-contained
- [ ] Staging deploy verified

---

## Verification Checklist

- [ ] Exactly 5 active developers included
- [ ] Each person has tasks for all 9 days
- [ ] Even workload distribution per day
- [ ] Janadeep's payment/comms work is self-contained
- [ ] Manjunath's forum work is self-contained
- [ ] No compensation mentions anywhere
- [ ] Tasks align with WBS milestones
- [ ] All sub-tasks have checkboxes
- [ ] No dates referenced — Day numbers only
- [ ] Plain language throughout — no internal process terminology
