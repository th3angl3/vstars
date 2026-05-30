const { client } = require('../config/db');
const { DB_NAME, COLLECTIONS } = require('../config/constants');

async function populateDB(acadYr, sem, courseSchedule) {
    const session = client.startSession();

    try {
        session.startTransaction();

        // store acadYr and sem
        let collection = client.db(DB_NAME).collection(COLLECTIONS.YR_SEM);
        await collection.updateOne(
            {},
            { $set: { acadYr: acadYr, sem: sem } },
            { upsert: true, session }
        );

        // store course schedule
        collection = client.db(DB_NAME).collection(COLLECTIONS.COURSE_SCHEDULE);

        await collection.deleteMany({}, { session });
        await collection.insertMany(courseSchedule, { session });

        await session.commitTransaction();
    } catch (err) {
        console.error("Database operation failed:", err.message);
        await session.abortTransaction();
        throw err;
    } finally {
        await session.endSession();
    }
}

module.exports = { populateDB };