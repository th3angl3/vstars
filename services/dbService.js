const { client } = require('../config/db');
const { DB_NAME, COLLECTIONS } = require('../config/constants');

// TODO: Add transaction
async function populateDB(acadYr, sem, courseSchedule) {
    try {
        // store acadYr and sem
        let collection = client.db(DB_NAME).collection(COLLECTIONS.YR_SEM);
        await collection.updateOne(
            {},
            { $set: { acadYr: acadYr, sem: sem } },
            { upsert: true }
        );

        // store course schedule
        collection = client.db(DB_NAME).collection(COLLECTIONS.COURSE_SCHEDULE);
        await collection.deleteMany({});
        await collection.insertMany(courseSchedule);
    } catch (err) {
        console.error("Database operation failed:", err.message);
        throw err;
    }
}

module.exports = { populateDB };