import { ClientSession } from "mongodb";
import { client } from "../config/db.js";
import { DB_NAME, COLLECTIONS } from "../config/constants.js";
import type { CourseSchedule } from "../types/types.js";

async function populateDB(acadYr: Number, sem: Number, courseSchedule: CourseSchedule[]): Promise<void> {
    const session: ClientSession = client.startSession();

    try {
        session.startTransaction();

        // store acadYr and sem
        let collection = client.db(DB_NAME).collection(COLLECTIONS.YR_SEM);
        await collection.updateOne(
            {},
            { $set: { acadYr, sem } },
            { upsert: true, session }
        );

        // store course schedule
        collection = client.db(DB_NAME).collection(COLLECTIONS.COURSE_SCHEDULE);

        await collection.deleteMany({}, { session });
        await collection.insertMany(courseSchedule, { session });

        await session.commitTransaction();
    } catch (err) {
        console.error("Database operation failed:", (err as Error).message);
        await session.abortTransaction();
        throw err;
    } finally {
        await session.endSession();
    }
}

async function fetchCourseSchedule(courseCodeList: string[]): Promise<CourseSchedule[]> {
    const collection = client.db(DB_NAME).collection<CourseSchedule>(COLLECTIONS.COURSE_SCHEDULE);
    const courseSchedules = await collection.find(
        { courseCode: { $in: courseCodeList } },
        { projection: { _id: 0 } }
    ).toArray();

    return courseSchedules;
}

export { populateDB, fetchCourseSchedule };
