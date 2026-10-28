const test = require("node:test");
const assert = require("node:assert/strict");
const axios = require("axios");

const BASE_URL = (
    process.env.E2E_BASE_URL || "http://127.0.0.1:5001/api"
).replace(/\/$/, "");

const SKIP_REASON = process.env.E2E_BASE_URL
    ? false
    : "Set E2E_BASE_URL to a running backend (e.g. http://127.0.0.1:5001/api) to run the live auth flow.";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || "admin@thinkzai.com";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || "Admin@123";

async function api(method, path, body, token) {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    return axios({
        method,
        url: `${BASE_URL}${path}`,
        data: body,
        headers,
        validateStatus: () => true,
    });
}

test(
    "end-to-end auth, course provisioning, and RBAC flow",
    { skip: SKIP_REASON, timeout: 60000 },
    async () => {
        const stamp = Date.now();
        const studentEmail = `alex_${stamp}@techcity.com`;
        const password = "StudentPassword123!";

        let res = await api("post", "/auth/login", {
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD,
        });
        assert.equal(
            res.status,
            200,
            `admin login failed: ${res.status} ${JSON.stringify(res.data)}. ` +
                "Run `node seedAdmin.js` or set E2E_ADMIN_EMAIL/E2E_ADMIN_PASSWORD."
        );
        const adminToken = res.data.token;
        assert.ok(adminToken, "admin login response must include a token");
        assert.equal(res.data.user?.role, "Admin");

        res = await api(
            "post",
            "/courses",
            {
                title: `Node.js Masterclass ${stamp}`,
                description: "Deep dive validation masterclass",
                price: 4999,
                category: "Web Development",
                duration: "6 Weeks",
            },
            adminToken
        );
        assert.ok(
            [200, 201].includes(res.status),
            `course creation failed: ${res.status} ${JSON.stringify(res.data)}`
        );
        const courseId =
            res.data?.data?.id ?? res.data?.course?.id ?? res.data?.id;
        assert.ok(courseId, "course response must include an id");

        res = await api(
            "post",
            "/batches",
            {
                name: `Cohort Alpha ${stamp}`,
                courseId: Number(courseId),
                instructorName: "Professor Janadeep",
                capacity: 50,
                startDate: "2026-09-20",
                endDate: "2027-03-20",
            },
            adminToken
        );
        assert.ok(
            [200, 201].includes(res.status),
            `batch creation failed: ${res.status} ${JSON.stringify(res.data)}`
        );

        res = await api("post", "/auth/register", {
            name: `Student Alex ${stamp}`,
            email: studentEmail,
            password,
            role: "student",
        });
        assert.ok(
            [200, 201].includes(res.status),
            `student registration failed: ${res.status} ${JSON.stringify(res.data)}`
        );
        assert.equal(res.data.user?.role, "Learner");

        const escalationEmail = `escalation_${stamp}@thinkz.ai`;
        res = await api("post", "/auth/register", {
            name: `Escalation Attempt ${stamp}`,
            email: escalationEmail,
            password,
            role: "Admin",
        });
        assert.ok(
            [200, 201].includes(res.status),
            `escalation registration failed: ${res.status} ${JSON.stringify(res.data)}`
        );
        assert.equal(
            res.data.user?.role,
            "Learner",
            "public registration must not grant privileged roles"
        );
        const escalatedToken = res.data.token;
        assert.ok(escalatedToken, "registration must include a token");

        res = await api(
            "post",
            "/courses",
            {
                title: "Escalated Admin Course Attempt",
                description: "A self-registered Admin must not create courses",
                price: 0,
                category: "Hacking",
                duration: "1 Day",
            },
            escalatedToken
        );
        assert.ok(
            [401, 403].includes(res.status),
            `expected a self-registered Admin to be rejected, got ${res.status}`
        );

        res = await api("post", "/auth/login", {
            email: studentEmail,
            password,
        });
        assert.equal(
            res.status,
            200,
            `student login failed: ${res.status} ${JSON.stringify(res.data)}`
        );
        const studentToken = res.data.token;
        assert.ok(studentToken, "student login response must include a token");

        res = await api(
            "post",
            "/courses",
            {
                title: "Malicious Student Injection Attack Course Attempt",
                description:
                    "This should be blocked by RBAC middleware validation rules",
                price: 0,
                category: "Hacking",
                duration: "1 Day",
            },
            studentToken
        );
        assert.ok(
            [401, 403].includes(res.status),
            `expected the student role to be rejected, got ${res.status}`
        );
    }
);
