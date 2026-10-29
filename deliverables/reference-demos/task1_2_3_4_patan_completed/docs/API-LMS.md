# LMS API reference

All paths below start with `/api`. Send `Authorization: Bearer <login token>` and JSON request bodies. Responses use `{ "success": true, "data": ... }`; errors use `{ "success": false, "message": ... }`. Validation errors may include Zod `issues`.

| Method | Path | Access / body |
|---|---|---|
| GET | `/lms/courses` | Authenticated; course metadata |
| POST | `/lms/courses` | Staff; title, description, category, price, duration; optional media/instructor/status |
| GET | `/lms/courses/:id` | Authenticated; ordered curriculum metadata; no private lesson content |
| PATCH | `/lms/courses/:id` | Staff; partial course fields |
| DELETE | `/lms/courses/:id` | Staff; fails with conflict if batches still reference course |
| POST | `/lms/courses/:id/modules` | Staff; title, optional description; appends in order |
| PUT | `/lms/courses/:id/modules/order` | Staff; `{ "ids": [3, 1, 2] }` |
| PATCH | `/lms/modules/:id` | Staff; title/description |
| DELETE | `/lms/modules/:id` | Staff; deletes children and compacts order |
| POST | `/lms/modules/:id/lessons` | Staff; title, optional description/content/videoUrl/duration |
| PUT | `/lms/modules/:id/lessons/order` | Staff; all lesson IDs exactly once |
| PATCH | `/lms/lessons/:id` | Staff; lesson fields |
| DELETE | `/lms/lessons/:id` | Staff; compacts order |
| GET | `/lms/enrollments` | Learner’s own enrollments; staff sees all |
| GET | `/lms/enrollments/:id/progress` | Owner/staff; completion summary |
| POST | `/lms/enrollments` | Staff; batchId, studentName, studentEmail |
| PATCH | `/lms/enrollments/:id` | Staff; enrollmentStatus and courseAccess |
| GET | `/lms/courses/:id/player` | Enrolled learner; curriculum, enrollmentId, completion |
| GET | `/lms/lessons/:id/content` | Enrolled learner; lesson and personal progress/notes |
| PUT | `/lms/lessons/:id/notes` | Enrolled learner; `{ "notes": "..." }` |
| PUT | `/lms/lessons/:id/progress` | Enrolled learner; positionSeconds, durationSeconds, optional completed |
| POST | `/lms/assessments/:id/attempt` | Enrolled learner; start/restore deadline, draft and safe questions |
| PUT | `/lms/assessments/:id/draft` | Owner; answers map, flags array, currentIndex |
| POST | `/lms/assessments/:id/submit` | Owner; same draft shape; idempotent result |
| POST | `/code/execute` | Authenticated; language, source_code, optional test_cases, timeout |

There are **24 LMS routes plus code execution**. Module and lesson routes each expand from the shared route-building loop.

Enrollment statuses: `ENROLLED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`, `SUSPENDED`. Content access also requires `courseAccess: true`.

Assessment example:

```json
{ "answers": { "12": 47, "13": "console.log('hello')" }, "flags": [13], "currentIndex": 1 }
```

MCQ values are option IDs; coding/written values are strings. Only question IDs and option IDs belonging to the assessment are accepted. The server never sends `isCorrect` or coding test cases through the learner attempt endpoint.

Execution example:

```json
{
  "language": "python",
  "source_code": "a, b = map(int, input().split())\nprint(a + b)",
  "test_cases": [{ "input": "2 3", "expected_output": "5" }],
  "timeout": 30
}
```

`test_cases` defaults to one empty-input run. Maximum 20 cases, 100,000 source characters, 50,000 input characters per case. Each output field is capped at 16,384 UTF-8 bytes including its truncation marker. Language values: `python`, `javascript`, `java`, `cpp` (`c++` is an alias). The route is limited to 10 requests per minute per client IP.

Statuses: 400 invalid input, 401 missing/invalid login, 403 access denied, 404 absent resource, 409 conflicting/closed attempt, 429 execution rate limit, 503 runner unavailable, 504 proxy execution deadline.

Judge0 configuration follows the [Judge0 CE API](https://ce.judge0.com/). The mobile player uses the video API compatible with the project’s Expo SDK 51; see the [Expo SDK 51 video reference](https://docs.expo.dev/versions/v51.0.0/sdk/video-av/).
