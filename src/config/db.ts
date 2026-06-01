import { MongoClient, ServerApiVersion } from 'mongodb';

const client = new MongoClient(process.env.MONGO_URI as string, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function connectDB(): Promise<void> {
    await client.connect();
    console.log('Connected to MongoDB');
}

export { client, connectDB };