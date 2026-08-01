import express, { type Request, type Response, type NextFunction } from "express";
import scrapeVenueRoute from "./routes/scrapeVenueRoute.js";
import scrapeCourseRoute from "./routes/scrapeCourseRoute.js";
import ttRoute from "./routes/ttRoute.js";
import emptyTrRoute from "./routes/emptyTrRoute.js";
import trTtRoute from "./routes/trTtRoute.js";
import cors from "cors";

const app = express();

app.use(express.json());

app.get("/", (_, res) => {
    res.json({
        status: "ok",
    });
});

const allowedOrigins = new Set([
    "http://localhost:3001",
    process.env.FRONTEND_URL,
    process.env.PREVIEW_URL,
]);

app.use(cors({
    origin(origin, callback) {
        if (!origin) {
            return callback(null, true);
        }

        if (allowedOrigins.has(origin)) {
            return callback(null, true);
        }

        callback(new Error("Not allowed by CORS"));
    },
}));

app.use("/venue", scrapeVenueRoute);
app.use("/scrape", scrapeCourseRoute);
app.use("/tt", ttRoute);
app.use("/empty", emptyTrRoute);
app.use("/tr", trTtRoute);

app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
    const message = err instanceof Error ? err.message : "An unknown error occurred";
    console.error(err);
    res.status(500).json({ success: false, message });
});

export default app;