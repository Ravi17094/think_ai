# Patan: messages to send to your teammates

The Core LMS implementation is ready in the supplied project. The following information is needed for live integration and final acceptance. Configure passwords, JWT signing secrets, AWS credentials and private API keys only in the approved local environment or IAM setup. Share sanitized examples, specifications and source files here.

## Janadeep: authentication, payments and API standards

> Patan's React Native Core LMS changes are ready. Please share the latest backend branch or ZIP and OpenAPI JSON. Confirm the sanitized login success response and JWT claim names (the uploaded project uses id, email and role, with ACCESS_TOKEN_SECRET). Confirm how User.email maps to Enrollment.studentEmail and how confirmed payment enables courseAccess. My POST /api/lms/progress/sync contract is included. If your POST /progress/sync is ready, share request and response examples so we can merge the implementations. Please also share the final API error, caching and cursor pagination conventions, and provide approved learner and Admin test accounts through the local environment.

The new screens call authenticated LMS endpoints. The latest team branches may have changed these contracts. The LMS layer validates the login JWT and database ownership.

## Ravi Teja: attendance, reports and real-time events

> Please share the attendance summary, grading progress, student engagement and session summary API paths, query parameters and sanitized response examples. Confirm the Socket.IO base URL, authentication handshake, namespace, rooms and assessment events. Patan's module currently calculates learning analytics from the LMS database and emits assessment:submitted through the authenticated /lms namespace. We need to align it with the shared contracts.

The required learning KPIs already use LMS tables. Cross-team attendance and engagement widgets need the agreed endpoints and response contracts for integration testing.

## Manjunath: mobile navigation, authentication and design

> Please share the latest mobile navigation and authentication shell, shared theme tokens and learner dashboard branch or ZIP. Patan has added the seven assigned screens plus workspace, downloads, history and settings routes. The default workspace uses live /api/lms data. The existing community dashboard remains available and includes the progress sync indicator. Existing learner clients need to use the protected /api/lms content and assessment contracts. Please confirm the current auth session ownership and deep-link entry flow.

## Team lead, DevOps and content owner

> Please share the approved Judge0 URL and /languages output, and configure its credentials locally. The current language ID defaults are Python 71, JavaScript 63, Java 62 and C++ 54; confirm them against the deployment. Confirm the private S3 certificate bucket, region, IAM role and allowed CORS origins (the assignment mentions client-learning-media-prod/certificates/). Provide the verified SendGrid sender and stable app URL. Share the approved video manifest with S3 keys, actual byte sizes, MD5 hashes and durationSeconds, the module and lesson sequence, the question answer and explanation manifest, and the certificate completion, pass and retake rules. Keep production credentials in the approved environment.

## Remaining live acceptance work

1. Apply the reviewed additive migration to the approved staging database and populate real content metadata.
2. Verify payment unlock and real learner enrollments.
3. Run real Judge0 executions in all four languages, timeout and unavailability checks, and the 20-request stress test. Collect CPU and RAM metrics from the sandbox host.
4. Verify real certificate PDF upload, signed download and delivered email.
5. Run native Android and iOS checks for video, offline download, quota, deletion, draft recovery after force-close, reconnect conflicts, and PDF, PNG and link sharing, including cancellation.
6. Test client videos in Chrome, Firefox, Safari and Edge. Run the content manifest verifier and obtain content approval.
7. Record real-data demonstrations and finish the submission evidence.
