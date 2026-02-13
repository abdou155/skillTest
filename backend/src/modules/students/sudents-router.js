const express = require("express");
const router = express.Router();
const studentController = require("./students-controller");
const { ApiError } = require("../../utils");
const {
    StudentIdParamSchema,
    StudentStatusSchema,
    StudentCreateOrUpdateSchema,
    StudentUpdateSchema,
} = require("./students-schema");

const validateStudentsRequest = (schema) => (req, res, next) => {
    try {
        schema.parse({
            body: req.body,
            query: req.query,
            params: req.params,
        });
        next();
    } catch (error) {
        const formattedErrors = Array.isArray(error?.errors)
            ? error.errors.map((err) => ({
                path: Array.isArray(err.path) ? err.path.join(".") : String(err.path),
                message: err.message,
            }))
            : [];

        return res.status(400).json({
            success: false,
            error: {
                message: "Validation error",
                detail: formattedErrors,
            },
        });
    }
};

router.get("", studentController.handleGetAllStudents);
router.post("", validateStudentsRequest(StudentCreateOrUpdateSchema), studentController.handleAddStudent);
router.get("/:id", validateStudentsRequest(StudentIdParamSchema), studentController.handleGetStudentDetail);
router.post("/:id/status", validateStudentsRequest(StudentStatusSchema), studentController.handleStudentStatus);
router.put("/:id", validateStudentsRequest(StudentUpdateSchema), studentController.handleUpdateStudent);
router.delete("/:id", validateStudentsRequest(StudentIdParamSchema), studentController.handleDeleteStudent);

router.use((err, req, res, next) => {
    if (err instanceof ApiError) {
        return res.status(err.statusCode).json({
            success: false,
            error: {
                message: err.message,
            }
        });
    }

    return res.status(500).json({
        success: false,
        error: {
            message: "Internal server error",
        }
    });
});

module.exports = { studentsRoutes: router };
