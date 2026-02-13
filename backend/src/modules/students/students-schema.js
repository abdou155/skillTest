const { z } = require("zod");

const StudentIdParamSchema = z.object({
    params: z.object({
        id: z.coerce.number().int().positive("Invalid student id"),
    }),
});

const StudentStatusSchema = z.object({
    params: z.object({
        id: z.coerce.number().int().positive("Invalid student id"),
    }),
    body: z.object({
        status: z.boolean(),
    }),
});

const StudentCreateOrUpdateSchema = z.object({
    body: z.object({
        name: z.string().min(1, "Name is required"),
        email: z.string().email("Invalid email"),
        gender: z.string().optional().nullable(),
        phone: z.string().optional().nullable(),
        dob: z.string().optional().nullable(),
        class: z.string().min(1, "Class is required"),
        section: z.string().min(1, "Section is required"),
        roll: z.coerce.number().int().optional().nullable(),
        admissionDate: z.string().optional().nullable(),
        currentAddress: z.string().optional().nullable(),
        permanentAddress: z.string().optional().nullable(),
        fatherName: z.string().optional().nullable(),
        fatherPhone: z.string().optional().nullable(),
        motherName: z.string().optional().nullable(),
        motherPhone: z.string().optional().nullable(),
        guardianName: z.string().optional().nullable(),
        guardianPhone: z.string().optional().nullable(),
        relationOfGuardian: z.string().optional().nullable(),
        systemAccess: z.boolean().optional().nullable(),
    }),
});

const StudentUpdateSchema = StudentCreateOrUpdateSchema.extend({
    params: z.object({
        id: z.coerce.number().int().positive("Invalid student id"),
    }),
});

module.exports = {
    StudentIdParamSchema,
    StudentStatusSchema,
    StudentCreateOrUpdateSchema,
    StudentUpdateSchema,
};
