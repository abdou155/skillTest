const jwt = require("jsonwebtoken");
const { createHmac } = require("crypto");
const { v4: uuidV4 } = require("uuid");

const generateTestAuth = ({
    userId = 1,
    role = "Admin",
    roleId = 1,
} = {}) => {
    const accessSecret = process.env.JWT_ACCESS_TOKEN_SECRET;
    const refreshSecret = process.env.JWT_REFRESH_TOKEN_SECRET;
    const csrfSecret = process.env.CSRF_TOKEN_SECRET;

    const csrfToken = uuidV4();
    const csrfHmac = createHmac("sha256", csrfSecret)
        .update(csrfToken)
        .digest("hex");

    const accessToken = jwt.sign(
        { id: userId, role, roleId, csrf_hmac: csrfHmac },
        accessSecret,
        { expiresIn: "15m" }
    );

    const refreshToken = jwt.sign(
        { id: userId, role, roleId },
        refreshSecret,
        { expiresIn: "8h" }
    );

    return { accessToken, refreshToken, csrfToken };
};

const applyAuth = (request, auth) => {
    return request
        .set("Cookie", [
            `accessToken=${auth.accessToken}`,
            `refreshToken=${auth.refreshToken}`,
        ])
        .set("x-csrf-token", auth.csrfToken);
};

module.exports = { generateTestAuth, applyAuth };
