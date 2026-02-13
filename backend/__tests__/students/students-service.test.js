const { ApiError } = require("../../src/utils/api-error");

jest.mock("../../src/modules/students/students-repository");
jest.mock("../../src/shared/repository");
jest.mock("../../src/utils/send-account-verification-email");

const {
    findAllStudents,
    findStudentDetail,
    findStudentToSetStatus,
    addOrUpdateStudent,
} = require("../../src/modules/students/students-repository");

const { findUserById } = require("../../src/shared/repository");

const {
    getAllStudents,
    getStudentDetail,
    addNewStudent,
    updateStudent,
    setStudentStatus,
} = require("../../src/modules/students/students-service");

const { sendAccountVerificationEmail } = require("../../src/utils/send-account-verification-email");

// ─── getAllStudents ──────────────────────────────────────────────────
describe("getAllStudents", () => {
    afterEach(() => jest.clearAllMocks());

    it("should return an array of students", async () => {
        const mockStudents = [
            { id: 1, name: "Alice", email: "alice@test.com" },
            { id: 2, name: "Bob", email: "bob@test.com" },
        ];
        findAllStudents.mockResolvedValue(mockStudents);

        const result = await getAllStudents({});
        expect(result).toEqual(mockStudents);
        expect(findAllStudents).toHaveBeenCalledWith({});
    });

    it("should return empty array when no students exist", async () => {
        findAllStudents.mockResolvedValue([]);

        const result = await getAllStudents({});
        expect(result).toEqual([]);
    });

    it("should pass filter params to repository", async () => {
        findAllStudents.mockResolvedValue([]);
        const filters = { name: "Alice", className: "Class 1" };

        await getAllStudents(filters);
        expect(findAllStudents).toHaveBeenCalledWith(filters);
    });
});

// ─── getStudentDetail ────────────────────────────────────────────────
describe("getStudentDetail", () => {
    afterEach(() => jest.clearAllMocks());

    it("should return student detail when found", async () => {
        const mockStudent = { id: 10, name: "Alice", email: "alice@test.com", class: "Class 1" };
        findStudentDetail.mockResolvedValue(mockStudent);

        const result = await getStudentDetail(10);
        expect(result).toEqual(mockStudent);
        expect(findStudentDetail).toHaveBeenCalledWith(10);
    });

    it("should throw 404 when student not found", async () => {
        findStudentDetail.mockResolvedValue(undefined);

        await expect(getStudentDetail(999)).rejects.toThrow(ApiError);
        await expect(getStudentDetail(999)).rejects.toMatchObject({
            statusCode: 404,
            message: "Student not found",
        });
    });
});

// ─── addNewStudent ───────────────────────────────────────────────────
describe("addNewStudent", () => {
    afterEach(() => jest.clearAllMocks());

    const validPayload = { name: "New Student", email: "new@test.com", class: "Class 1", section: "A" };

    it("should add student and return success message when email sends", async () => {
        addOrUpdateStudent.mockResolvedValue({ status: true, userId: 5 });
        sendAccountVerificationEmail.mockResolvedValue();

        const result = await addNewStudent(validPayload);
        expect(result.message).toContain("successfully");
        expect(addOrUpdateStudent).toHaveBeenCalledWith(validPayload);
        expect(sendAccountVerificationEmail).toHaveBeenCalledWith({
            userId: 5,
            userEmail: "new@test.com",
        });
    });

    it("should add student and return partial success when email fails", async () => {
        addOrUpdateStudent.mockResolvedValue({ status: true, userId: 5 });
        sendAccountVerificationEmail.mockRejectedValue(new Error("SMTP error"));

        const result = await addNewStudent(validPayload);
        expect(result.message).toContain("failed to send");
    });

    it("should throw 500 when stored procedure returns status=false", async () => {
        addOrUpdateStudent.mockResolvedValue({ status: false, message: "Email already exists" });

        await expect(addNewStudent(validPayload)).rejects.toThrow(ApiError);
        await expect(addNewStudent(validPayload)).rejects.toMatchObject({
            statusCode: 500,
            message: "Email already exists",
        });
    });
});

// ─── updateStudent ───────────────────────────────────────────────────
describe("updateStudent", () => {
    afterEach(() => jest.clearAllMocks());

    const payload = { userId: 10, name: "Updated", email: "u@test.com", class: "Class 1", section: "A" };

    it("should update student and return message", async () => {
        findUserById.mockResolvedValue({ id: 10, role_id: 3 });
        addOrUpdateStudent.mockResolvedValue({ status: true, message: "Student updated successfully" });

        const result = await updateStudent(payload);
        expect(result.message).toBe("Student updated successfully");
        expect(findUserById).toHaveBeenCalledWith(10);
        expect(addOrUpdateStudent).toHaveBeenCalledWith(payload);
    });

    it("should throw 404 when userId does not belong to a student", async () => {
        findUserById.mockResolvedValue({ id: 10, role_id: 1 });

        await expect(updateStudent(payload)).rejects.toMatchObject({
            statusCode: 404,
            message: "Student not found",
        });
        expect(addOrUpdateStudent).not.toHaveBeenCalled();
    });

    it("should throw 404 when userId does not exist", async () => {
        findUserById.mockResolvedValue(undefined);

        await expect(updateStudent(payload)).rejects.toMatchObject({
            statusCode: 404,
            message: "Student not found",
        });
    });

    it("should throw 500 when stored procedure fails", async () => {
        findUserById.mockResolvedValue({ id: 10, role_id: 3 });
        addOrUpdateStudent.mockResolvedValue({ status: false, message: "DB error" });

        await expect(updateStudent(payload)).rejects.toMatchObject({
            statusCode: 500,
            message: "DB error",
        });
    });
});

// ─── setStudentStatus ────────────────────────────────────────────────
describe("setStudentStatus", () => {
    afterEach(() => jest.clearAllMocks());

    it("should change status and return message", async () => {
        findUserById.mockResolvedValue({ id: 10, role_id: 3 });
        findStudentToSetStatus.mockResolvedValue(1);

        const result = await setStudentStatus({ userId: 10, reviewerId: 1, status: false });
        expect(result.message).toBe("Student status changed successfully");
        expect(findStudentToSetStatus).toHaveBeenCalledWith(
            expect.objectContaining({ userId: 10, reviewerId: 1, status: false })
        );
    });

    it("should throw 404 when userId is not a student", async () => {
        findUserById.mockResolvedValue({ id: 10, role_id: 2 });

        await expect(
            setStudentStatus({ userId: 10, reviewerId: 1, status: false })
        ).rejects.toMatchObject({ statusCode: 404 });
        expect(findStudentToSetStatus).not.toHaveBeenCalled();
    });

    it("should throw 500 when update affects 0 rows", async () => {
        findUserById.mockResolvedValue({ id: 10, role_id: 3 });
        findStudentToSetStatus.mockResolvedValue(0);

        await expect(
            setStudentStatus({ userId: 10, reviewerId: 1, status: false })
        ).rejects.toMatchObject({ statusCode: 500 });
    });
});
