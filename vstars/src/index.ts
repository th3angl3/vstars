import "dotenv/config";
import app from "./app.js";
import { connectDB, client } from "./config/db.js";

const PORT: number = Number(process.env.PORT) || 3000;

await connectDB();

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

process.on("SIGINT", async () => {
    console.log("Closing server...");
    await client.close();
    process.exit(0);
});



