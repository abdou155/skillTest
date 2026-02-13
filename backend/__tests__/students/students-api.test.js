jest.mock("axios");

const request = require("supertest");
const { app } = require("../../src/app");
const { db } = require("../../src/config");
const { generateTestAuth, applyAuth } = require("../helpers/auth-helper");

const auth = generateTestAuth({ userId: 1, role: "Admin", roleId: 1 });

let testStudentId;

// ─── DB setup / teardown ─────────────────────────────────────────────
beforeAll(async () => {
    // Ensure test DB has required seed data (roles, classes, sections, admin user)
    await db.query(`
        INSERT INTO roles (name, is_editable)
        VALUES ('Admin', false), ('Teacher', false), ('Student', false)
        ON CONFLICT DO NOTHING
    `);

    await db.query(`
        INSERT INTO classes (name) VALUES ('TestClass')
        ON CONFLICT DO NOTHING
    `);

    await db.query(`
        INSERT INTO sections (name) VALUES ('TestSection')
        ON CONFLICT DO NOTHING
    `);

    // Seed an admin user (id=1) so status_last_reviewer_id FK is satisfied
    await db.query(`
        INSERT INTO users (id, name, email, role_id, created_dt, password, is_active, is_email_verified)
        VALUES (1, 'Test Admin', 'admin@test.com', 1, now(),
            '$argon2id$v=19$m=65536,t=3,p=4$21a+bDbESEI60WO1wRKnvQ$i6OrxqNiHvwtf1Xg3bfU5+AXZG14fegW3p+RSMvq1oU',
            true, true)
        ON CONFLICT (id) DO NOTHING
    `);
});

afterAll(async () => {
    // Clean up test students created during tests
    if (testStudentId) {
        await db.query("DELETE FROM user_profiles WHERE user_id = $1", [testStudentId]);
        await db.query("DELETE FROM users WHERE id = $1", [testStudentId]);
    }
    await db.query("DELETE FROM classes WHERE name = 'TestClass'");
    await db.query("DELETE FROM sections WHERE name = 'TestSection'");
    await db.end();
});

// ─── GET /api/v1/students ────────────────────────────────────────────
describe("GET /api/v1/students", () => {
    it("should return 200 with students array", async () => {
        const res = await applyAuth(
            request(app).get("/api/v1/students"),
            auth
        );

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data.students)).toBe(true);
    });

    it("should return 401 without auth cookies", async () => {
        const res = await request(app).get("/api/v1/students");

        expect(res.status).toBe(401);
    });

    it("should return 400 without csrf token", async () => {
        const res = await request(app)
            .get("/api/v1/students")
            .set("Cookie", [
                `accessToken=${auth.accessToken}`,
                `refreshToken=${auth.refreshToken}`,
            ]);

        expect(res.status).toBe(400);
    });
});

// ─── POST /api/v1/students (Create) ─────────────────────────────────
describe("POST /api/v1/students", () => {
    const validPayload = {
        name: "Integration Test Student",
        email: `int-test-${Date.now()}@example.com`,
        gender: "male",
        phone: "0600000000",
        dob: "2010-01-01",
        class: "TestClass",
        section: "TestSection",
        roll: 99,
        admissionDate: "2024-09-01",
        currentAddress: "Test Address",
        permanentAddress: "Test Permanent",
        fatherName: "Test Father",
        fatherPhone: "0600000001",
        motherName: "Test Mother",
        motherPhone: "0600000002",
        guardianName: "Test Guardian",
        guardianPhone: "0600000003",
        relationOfGuardian: "Uncle",
        systemAccess: true,
    };

    it("should create a student and return success", async () => {
        const res = await applyAuth(
            request(app).post("/api/v1/students").send(validPayload),
            auth
        );

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.message).toBeDefined();

        // Find the created student to use in later tests
        const { rows } = await db.query(
            "SELECT id FROM users WHERE email = $1",
            [validPayload.email]
        );
        if (rows.length > 0) {
            testStudentId = rows[0].id;
            // Activate student so GET tests can find them (stored proc creates with is_active=false)
            await db.query("UPDATE users SET is_active = true WHERE id = $1", [testStudentId]);
        }
    });

    it("should return 400 for missing required fields", async () => {
        const res = await applyAuth(
            request(app).post("/api/v1/students").send({ name: "No Email" }),
            auth
        );

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.error.message).toBe("Validation error");
        expect(Array.isArray(res.body.error.detail)).toBe(true);
    });

    it("should return 400 for invalid email", async () => {
        const res = await applyAuth(
            request(app)
                .post("/api/v1/students")
                .send({ ...validPayload, email: "not-an-email" }),
            auth
        );

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
    });
});

// ─── GET /api/v1/students/:id ────────────────────────────────────────
describe("GET /api/v1/students/:id", () => {
    it("should return student detail for valid student id", async () => {
        if (!testStudentId) return;

        const res = await applyAuth(
            request(app).get(`/api/v1/students/${testStudentId}`),
            auth
        );

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.id).toBe(testStudentId);
        expect(res.body.data.name).toBe("Integration Test Student");
    });

    it("should return 404 for non-existent student", async () => {
        const res = await applyAuth(
            request(app).get("/api/v1/students/99999"),
            auth
        );

        expect(res.status).toBe(404);
        expect(res.body.success).toBe(false);
        expect(res.body.error.message).toBe("Student not found");
    });

    it("should return 400 for invalid id param", async () => {
        const res = await applyAuth(
            request(app).get("/api/v1/students/abc"),
            auth
        );

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
    });
});

// ─── PUT /api/v1/students/:id (Update) ──────────────────────────────
describe("PUT /api/v1/students/:id", () => {
    it("should update student and return success", async () => {
        if (!testStudentId) return;

        const updatePayload = {
            name: "Updated Integration Student",
            email: `int-updated-${Date.now()}@example.com`,
            gender: "female",
            phone: "0611111111",
            dob: "2010-06-15",
            class: "TestClass",
            section: "TestSection",
            roll: 100,
            admissionDate: "2024-09-01",
            currentAddress: "Updated Address",
            permanentAddress: "Updated Permanent",
            fatherName: "Updated Father",
            fatherPhone: "0600000010",
            motherName: "Updated Mother",
            motherPhone: "0600000020",
            guardianName: "Updated Guardian",
            guardianPhone: "0600000030",
            relationOfGuardian: "Aunt",
            systemAccess: true,
        };

        const res = await applyAuth(
            request(app)
                .put(`/api/v1/students/${testStudentId}`)
                .send(updatePayload),
            auth
        );

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.message).toBeDefined();
    });

    it("should return 404 when updating non-existent student", async () => {
        const res = await applyAuth(
            request(app).put("/api/v1/students/99999").send({
                name: "Ghost",
                email: "ghost@test.com",
                class: "TestClass",
                section: "TestSection",
            }),
            auth
        );

        expect(res.status).toBe(404);
    });
});

// ─── POST /api/v1/students/:id/status ────────────────────────────────
describe("POST /api/v1/students/:id/status", () => {
    it("should change student status", async () => {
        if (!testStudentId) return;

        const res = await applyAuth(
            request(app)
                .post(`/api/v1/students/${testStudentId}/status`)
                .send({ status: false }),
            auth
        );

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.message).toBe("Student status changed successfully");
    });

    it("should return 400 for invalid status value", async () => {
        if (!testStudentId) return;

        const res = await applyAuth(
            request(app)
                .post(`/api/v1/students/${testStudentId}/status`)
                .send({ status: "invalid" }),
            auth
        );

        expect(res.status).toBe(400);
    });
});

// ─── DELETE /api/v1/students/:id (Soft delete) ───────────────────────
describe("DELETE /api/v1/students/:id", () => {
    it("should soft-delete (disable) a student", async () => {
        if (!testStudentId) return;

        const res = await applyAuth(
            request(app).delete(`/api/v1/students/${testStudentId}`),
            auth
        );

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);

        // Verify student is disabled in DB
        const { rows } = await db.query(
            "SELECT is_active FROM users WHERE id = $1",
            [testStudentId]
        );
        expect(rows[0].is_active).toBe(false);
    });

    it("should return 404 for non-existent student", async () => {
        const res = await applyAuth(
            request(app).delete("/api/v1/students/99999"),
            auth
        );

        expect(res.status).toBe(404);
    });
});

// ─── Soft-deleted student exclusion ──────────────────────────────────
describe("Soft-deleted student visibility", () => {
    it("GET /students should not include disabled students", async () => {
        if (!testStudentId) return;

        const res = await applyAuth(
            request(app).get("/api/v1/students"),
            auth
        );

        expect(res.status).toBe(200);
        const ids = res.body.data.students.map((s) => s.id);
        expect(ids).not.toContain(testStudentId);
    });

    it("GET /students/:id should return 404 for disabled student", async () => {
        if (!testStudentId) return;

        const res = await applyAuth(
            request(app).get(`/api/v1/students/${testStudentId}`),
            auth
        );

        expect(res.status).toBe(404);
        expect(res.body.success).toBe(false);
        expect(res.body.error.message).toBe("Student not found");
    });
});
