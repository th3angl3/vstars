import { MongoClient, ServerApiVersion } from "mongodb";

const client = new MongoClient(process.env.MONGO_URI as string, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});

let connected = false;

async function connectDB(): Promise<void> {
    if (connected) return;

    await client.connect();
    connected = true;

    console.log("Connected to MongoDB");
}

export { client, connectDB };