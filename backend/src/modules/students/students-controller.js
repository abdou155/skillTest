const asyncHandler = require("express-async-handler");
const { getAllStudents, addNewStudent, getStudentDetail, setStudentStatus, updateStudent } = require("./students-service");

const handleGetAllStudents = asyncHandler(async (req, res) => {
    const payload = req.query;
    const students = await getAllStudents(payload);
    res.json({ success: true, data: { students } });
});

const handleAddStudent = asyncHandler(async (req, res) => {
    const payload = req.body;
    const message = await addNewStudent(payload);
    res.json({ success: true, data: message });
});

const handleUpdateStudent = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const payload = { ...req.body, userId: Number(id) };
    const message = await updateStudent(payload);
    res.json({ success: true, data: message });
});

const handleGetStudentDetail = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const student = await getStudentDetail(Number(id));
    res.json({ success: true, data: student });
});

const handleStudentStatus = asyncHandler(async (req, res) => {
    const { id: userId } = req.params;
    const { id: reviewerId } = req.user;
    const { status } = req.body;
    const message = await setStudentStatus({ userId: Number(userId), reviewerId, status });
    res.json({ success: true, data: message });
});

const handleDeleteStudent = asyncHandler(async (req, res) => {
    const { id: userId } = req.params;
    const { id: reviewerId } = req.user;
    const message = await setStudentStatus({ userId: Number(userId), reviewerId, status: false });
    res.json({ success: true, data: message });
});

module.exports = {
    handleGetAllStudents,
    handleGetStudentDetail,
    handleAddStudent,
    handleStudentStatus,
    handleUpdateStudent,
    handleDeleteStudent,
};
