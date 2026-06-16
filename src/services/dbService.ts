import { ClientSession, Collection, type Document } from "mongodb";
import { client } from "../config/db.js";
import { DB_NAME, COLLECTIONS } from "../config/constants.js";
import type { CourseSchedule, VenueData, VenueDocument } from "../types/types.js";

async function populateCourseDB(acadYr: number, sem: number, courseSchedule: CourseSchedule[], venueDoc: VenueDocument): Promise<void> {
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

        // store venue tt
        const bulkOps = Object.entries(venueDoc.records).map(([name, timings]) => ({
            updateOne: {
                filter: { name },
                update: { $set: { timings } },
                upsert: true
            }
        }));

        if (bulkOps.length === 0) {
            throw new Error("No venue operations to write: venueDoc.records is empty.");
        }

        collection = client.db(DB_NAME).collection(COLLECTIONS.VENUE);
        await collection.bulkWrite(bulkOps, { session });


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

async function populateVenueDB(venues: VenueData[]): Promise<void> {
    const session: ClientSession = client.startSession();

    try {
        session.startTransaction();

        const collection = client.db(DB_NAME).collection(COLLECTIONS.VENUE);
        await collection.deleteMany({}, { session });
        await collection.insertMany(venues, { session });

        await session.commitTransaction();
    } catch (err) {
        console.error("Database operation failed:", (err as Error).message);
        throw err;
    } finally {
        await session.endSession();
    }
}

async function fetchVenue(): Promise<string[]> {
    const collection = client.db(DB_NAME).collection(COLLECTIONS.VENUE);
    const venues = await collection.find(
        {},
        { projection: { _id: 0, name: 1 } }
    ).toArray();
    
    return venues.map(v => v.name)
}

export { populateCourseDB, fetchCourseSchedule, populateVenueDB, fetchVenue };
