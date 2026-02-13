const { db } = require("../config");
const { ERROR_MESSAGES } = require("../constants");
const { ApiError } = require("./api-error");

const preparedStatementsCache = new Set();

const processDBRequest = async ({ query, queryParams, name, text, values }) => {
    try {
        if (name) {
            const isNew = !preparedStatementsCache.has(name);
            if (isNew) {
                preparedStatementsCache.add(name);
                console.log(`[PS] Preparing: "${name}"`);
            } else {
                console.log(`[PS] Using cached: "${name}"`);
            }
            const result = await db.query({ name, text, values });
            return result;
        }
        const result = await db.query(query, queryParams);
        return result;
    } catch (error) {
        console.log(error);
        // console.error(error.message); //save this error log in db
        throw new ApiError(500, ERROR_MESSAGES.DATABASE_ERROR);
    }
}

module.exports = { processDBRequest };