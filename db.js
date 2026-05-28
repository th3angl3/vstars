const { MongoClient } = require('mongodb');

const client = new MongoClient(process.env.MONGO_URI);

async function connectDB() {
  await client.connect();
  console.log('MongoDB Connected!');
}

module.exports = connectDB;